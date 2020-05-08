const { baseUrl } = require('./config')

const extractCourseTitle = async ({ page }) => {
    return await page.evaluate(() => {
        return document.querySelector('h1.course-header-banner-title strong').innerText
    })
}

const extractLessons = async ({ page }) => {
    return await page.evaluate(({ baseUrl }) => {
        const lessons = []
        document.querySelectorAll('li.courseSection-listItem').forEach(lessonContainerElement => {
            const link = lessonContainerElement.getElementsByTagName('a')[0].getAttribute("href")
            lessons.push({
                link: link ? baseUrl.concat(link) : null,
                title: lessonContainerElement.getElementsByClassName('courseSectionList-sectionTitle')[0].innerText,
            })
        })
      return lessons
    }, { baseUrl })
}

const extractTasks = async ({ page }) => {
    return await page.evaluate(({ baseUrl }) => {

        const getTypeTaskByAnchorElement = (element) => {
            const elementClasses = element.classList
            switch(true) {
                case elementClasses.contains("task-menu-nav-item-link-VIDEO"):
                    return 'video'
                default:
                    return undefined
            }
        }
        
        const tasks = []
        document.querySelectorAll('.task-menu-nav-item ').forEach(taskContainerElement => {
            const firstAnchorElement = taskContainerElement.getElementsByTagName('a')[0]
            const link = firstAnchorElement.getAttribute("href")
            tasks.push({ 
                link: link ? baseUrl.concat(link) : null,
                title: taskContainerElement.getElementsByClassName('task-menu-nav-item-title')[0].innerText,
                type: getTypeTaskByAnchorElement(firstAnchorElement)
            })
        })
      return tasks
    }, { baseUrl })
}

module.exports = {
    extractLessons,
    extractTasks,
    extractCourseTitle
}