require('dotenv').config()

const { baseUrl } = require('./config')

const doLogin = async ({ browser }) => {
    try {
        console.log('[LOGIN PROCESSS] - Authenticating')

        const page = await browser.newPage();
        await page.goto(`${baseUrl}/loginForm`);

        await page.type('#login-email', process.env.USERNAME);
        await page.type('#password', process.env.PASSWORD);

        await Promise.all([
            page.$eval('form.signin-form', form => form.submit()),
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
        ])

        const error = await page.evaluate(() => document.querySelector('.alert-message').innerText);
        if(error == "Usuário ou senha inválida") {
            throw new Error("Usuário ou senha inválida")
        }
        
        console.log('[LOGIN PROCESSS] - Authenticated')

        await page.close()
    } catch (err) {
        console.log('[LOGIN PROCESSS] - Failed, stopping process.')
        await browser.close();
    }
}

module.exports = {
    doLogin
}