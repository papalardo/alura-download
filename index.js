const Puppeteer = require('puppeteer');
const cliProgress = require('cli-progress');
const _colors = require("cli-color");
const fs = require('fs-extra')
const Path = require('path')

const { chunkPromise, PromiseFlavor } = require('chunk-promise');

const { extractLessons, extractTasks, extractCourseTitle } = require('./alura-scrapper')
const { getPath } = require('./helpers')
const { getPlaylist, downloadVideo, compileVideos } = require('./hls-download')
const { doLogin } = require('./auth')
const { tmpPath } = require('./config')
const { pageDownload } = require('./page-download')

const courseUrl = process.argv.slice(2)[0]

if(! courseUrl) {
    console.warn('URL do curso não enviada');
    return;
}

const getM3u8Url = async ({ page, taskLink }) => {
    await page.goto(`${taskLink}/video`)
    const jsonContent = await page.evaluate(() => JSON.parse(document.querySelector("body").innerText)); 

    if(! jsonContent) {
        return null
    }
    
    return jsonContent[0].link
}

const deleteTmpDir = () => fs.rmdirSync(tmpPath, { recursive: true })


const downloadVideos = async ({ playlist, directory, fileName }) => {

    deleteTmpDir()

    const downloads = playlist.map((link, index) => {
        return () => downloadVideo(link, getPath(tmpPath) + `/file-${index}.ts`)
    })

    const progressBar = new cliProgress.SingleBar({
        format: 'Downloading video fragments |' + _colors.cyan('{bar}') + '| {percentage}% || {value}/{total} fragments',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
    });

    progressBar.start(downloads.length, 0)

    const concurrentSize = 10;

    const response = await chunkPromise(downloads, {
        concurrent: concurrentSize,
        promiseFlavor: PromiseFlavor.PromiseAll,
        promiseFlavor: PromiseFlavor.PromiseAllSettled,
        callback: async (chunkResults, index, allResults) => 
            progressBar.update((index + 1) * concurrentSize)
    })

    console.log(_colors.cyan('\n-> Video downloaded'))

    progressBar.stop()

    await compileVideos({
        files: response.map(file => file.value),
        output: `${directory}/${fileName}.mp4`
    })

    deleteTmpDir()
}

const createBrowser = async () => {
    return Puppeteer.launch({
        // headless: false,
        args: [
            '--start-maximized',
            '--window-size=1920,1080',
        ],
        defaultViewport: null,
    });
}

const handleTask = async ({ task, indexTask , page, tasks, courseTitle, indexLesson, lesson }) => {
    console.log(
        `\n[TASK ${indexTask + 1}/${tasks.length}] - Working ${_colors.yellow(task.title)}`
    )

    const taskName = `Atividade ${indexTask + 1} - ${task.title}`;
    
    const pathArr = ['downloads', courseTitle, `Aula ${indexLesson + 1} - ${lesson.title}`, taskName]
    
    if (fs.existsSync(Path.join(...pathArr))) {
        console.log(
            `\n[TASK ${indexTask + 1}/${tasks.length}] - Skipping..`
        )
        return;
    }

    const directoryToSave = getPath(pathArr)

    await Promise.all([
        page.goto(task.link),
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ])

    await pageDownload({ 
        page,
        directory: directoryToSave,
        fileName: taskName
    })

    try {
        // Click when have the button.
        // Prevent break inside this block
        await page.$eval('button.transcription-toggle', button => button.click())
    } catch {}

    await page.screenshot({ path: `${directoryToSave}/${taskName}.png`, fullPage: true });

    switch(task.type) {
        case 'video':
            console.log(
                `\n[TASK] [${_colors.yellow(task.title)}] ${_colors.blue('Video found')}`
            )
            const playlist = await getPlaylist(
                await getM3u8Url({ page, taskLink: task.link })
            )
            await downloadVideos({ 
                playlist, 
                directory: directoryToSave,
                fileName: taskName
            })
            break;
    }

    console.log(
        `\n[TASK] - ${_colors.yellow(task.title)} ${_colors.green('[OK]')}`
    )
}

(async () => {
    try {
        const browser = await createBrowser()

        await doLogin({ browser })

        const page = await browser.newPage();

        await page.goto(courseUrl);

        const courseTitle = await extractCourseTitle({ page })

        console.log(
            `[COURSE] - Found ${_colors.yellow(courseTitle)}`
        )

        const lessons = await extractLessons({ page })

        console.log(
            `\n[LESSONS] - Found ${lessons.length} lessons`
        )

        for(const [indexLesson, lesson] of lessons.entries()) {
            await page.goto(lesson.link)
            const tasks = await extractTasks({ page })

            console.log(
                `\n[LESSON ${indexLesson + 1}/${lessons.length}] - Working ${_colors.yellow(lesson.title)}`,
                '\n',
                `\n[TASKS] - Found ${tasks.length} tasks`,
            )
            
            for(const [indexTask, task] of tasks.entries()) {
                await handleTask({ indexTask, task, page, tasks, courseTitle, indexLesson, lesson })
            }
            
            console.log(
                `\n[LESSON] - ${_colors.yellow(lesson.title)} ${_colors.green('[OK]')}`
            )
        }

        console.log(
            _colors.green('Finished!')
        )

        await browser.close()
    } catch(err) {
        console.log(
            _colors.red(`[ERROR] \n ${err}`)
        )
    }
})()