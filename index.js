const Puppeteer = require('puppeteer');
const cliProgress = require('cli-progress');
const _colors = require("cli-color");
const fs = require('fs-extra')

const { chunkPromise, PromiseFlavor } = require('chunk-promise');

const { extractLessons, extractTasks, extractCourseTitle } = require('./alura-scrapper')
const { getPath } = require('./helpers')
const { getPlaylist, downloadVideo, compileVideos } = require('./hls-download')
const { doLogin } = require('./auth')
const { tmpPath } = require('./config')

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

const downloadVideos = async (playlist, pathToSave) => {

    deleteTmpDir()

    const downloads = playlist.map((link, index) => {
        return () => downloadVideo(link, `./${tmpPath}/file-${index}.ts`)
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
        callback: async (chunkResults, index, allResults) => {
            
            progressBar.update((index + 1) * concurrentSize)

            // if (chunkResults.some(p => p.status === 'fulfilled')) {
                // console.log(`chunk (${index}): has success results`);
            // } else {
                // console.log(`chunk (${index}): has no success results`);
            // }
        }
    })

    console.log(_colors.cyan('\n-> Video downloaded'))

    progressBar.stop()

    await compileVideos({
        files: response.map(file => file.value),
        output: `${pathToSave}.mp4`
    })

    deleteTmpDir()

    _colors.cyan('Vídeo processado!')
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
            `[LESSONS] - Found ${lessons.length} lessons`
        )

        for(const [indexLesson, lesson] of lessons.entries()) {
            await page.goto(lesson.link)
            const tasks = await extractTasks({ page })

            for(const [indexTask, task] of tasks.entries()) {
                console.log(
                    `[LESSON] - Working ${_colors.yellow(task.title)}`,
                    '\n',
                    `[TASKS] - Found ${tasks.length} tasks`,
                    '\n'
                )

                const pathToSave = getPath(['downloads', courseTitle, `Aula ${indexLesson + 1} - ${lesson.title}`, `Atividade ${indexTask + 1} - ${task.title}`])

                await Promise.all([
                    page.goto(task.link),
                    page.waitForNavigation({ waitUntil: 'networkidle0' }),
                ])

                try {
                    // Click when have the button.
                    // Prevent break inside this block
                    await page.$eval('button.transcription-toggle', button => button.click())
                } catch {}

                await page.screenshot({ path: `${pathToSave}.png`, fullPage: true });
                switch(task.type) {
                    case 'video':
                        const playlist = await getPlaylist(
                            await getM3u8Url({ page, taskLink: task.link })
                        )
                        await downloadVideos(playlist, pathToSave)
                        break;
                }
            }
        }

        console.log(
            _colors.green('Finished!')
        )

        await browser.close()
    } catch(err) {
        console.warn('Error ===>', err)
    }
})()