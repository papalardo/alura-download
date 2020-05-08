require('dotenv').config()

const { baseUrl } = require('./config')

const doLogin = async ({ browser }) => {
    try {
        console.log('[LOGIN PROCESSS] - Authenticating')

        const page = await browser.newPage();
        await page.goto(`${baseUrl}/loginForm`);

        await page.type('#login-email', process.env.USERNAME);
        await page.type('#password', process.env.PASSWORD);

        await page.$eval('form.signin-form', form => form.submit());

        console.log('[LOGIN PROCESSS] - Authenticated')

        await page.close()
    } catch (err) {
        console.log('[LOGIN PROCESSS] - Failed')
    }
}

module.exports = {
    doLogin
}