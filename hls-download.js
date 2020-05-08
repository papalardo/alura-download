const axios = require('axios');
const fs = require('fs');
const parseM3u8 = require('parse-m3u8');
const ffmpeg = require('fluent-ffmpeg');
const cliProgress = require('cli-progress');
const _colors = require("cli-color");

const { getPath } = require('./helpers')

const getBaseUri = url => new URL(url).origin

const getPlaylist = async (m3u8Url) => {
    const response = await axios({
        url: m3u8Url,
        method: 'GET',
    })

    const playlist = parseM3u8(response.data, { baseUri: getBaseUri(m3u8Url) }).segments
    return playlist.map(file => file.uri)
}

const downloadVideo = async (url, fileName) => {  
    const pathFile = getPath(fileName)
    const writer = fs.createWriteStream(pathFile)
  
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    })
  
    response.data.pipe(writer)
  
    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(pathFile))
      writer.on('error', reject)
    })
}

const compileVideos = async ({ files = [], output = ''}) => {
    let inputNamesFormatted = 'concat:' + files.join('|')

    const progressBar = new cliProgress.SingleBar({
        format: 'Processando vídeo |' + _colors.green('{bar}') + '| {percentage}%',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
    });

    return new Promise(resolve => {
        ffmpeg()
        .on('start', function(cmdline) {
            progressBar.start(100, 0)
        })
        .on('progress', function(progress) {
            progressBar.update(progress.percent)
            // console.info(`Processing ${progress.percent} % done`);
        })
        .on('end', function() {
            progressBar.stop()
            resolve()
        })
        .input(inputNamesFormatted)
        .output(output)
        .outputOption('-strict -2')     // I have an issue with experimental codecs, it is a solution
        .outputOption('-bsf:a aac_adtstoasc')
        .videoCodec('copy')
        .run();
    })
}

module.exports = {
    getPlaylist,
    downloadVideo,
    compileVideos,
}