const fs = require('fs');
const _colors = require("cli-color");

const pageDownload = async ({ page, directory, fileName }) => {
    try {
        const cdp = await page.target().createCDPSession();

        const { data } = await cdp.send('Page.captureSnapshot', { format: 'mhtml' });

        fs.writeFileSync(`${directory}/${fileName}.mhtml`, data);

        
    } catch(err) {
        console.log(
            _colors.red(`[ERROR][DOWNLOAD PAGE]`),
            '\n',
            _colors.red(err)
        )
    }
}

module.exports = {
    pageDownload
}