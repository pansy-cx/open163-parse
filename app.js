const superagent = require('superagent')
require('superagent-charset')(superagent)
const cheerio = require('cheerio')
const fs = require('fs')
const path = require('path')
const request = require('request')
const argv = require('yargs').argv
const slog = require('single-line-log').stdout

let absPath = path.join(process.cwd())
let saveDir = ''
let flvcdUrl = 'http://www.flvcd.com/parse.php'

// 下载进度条
const ProgressBar = (description = 'Progress', len = '25') => {
	return (opts) => {
		let percent = (opts.completed / opts.total).toFixed(4)
		var cellNum = Math.floor(percent * len)

		// 以下载
		let cell = '';
		for (let i = 0; i < cellNum; i++) {
			cell += '█'
		}

		// 未下载
		var empty = '';
		for (let i = 0; i < len - cellNum; i++) {
			empty += '░'
		}

		let cmdText = description + (100 * percent).toFixed(2) + '% ' + cell + empty + ' ' + opts.completed + '/' + opts.total + '\n'
		// 在单行输出文本
		slog(cmdText)
	}
}

// 下载字幕
const getSrt = (url, name) => {
	let stream = fs.createWriteStream(saveDir + '/' + name)
	request.get(url)
		.on('err', () => {
			console.log('err')
		})
		.pipe(stream)
}

// 下载视频
const getVideo = (url, name) => {
	return new Promise((resolve, reject) => {
		let stream = fs.createWriteStream(saveDir + '/' + name + '.flv')
		let receiveSize = 0
		let totalSize = 0

		// 初始化进度条
		let consoleBar = ProgressBar('视频下载 ' + name + '\n', 50)
		request.get(url)
			.on('err', () => {
				console.log('err')
			})
			.on('response', data => {
				// 文件大小
				totalSize = parseInt(data.headers['content-length'])
			})
			.on('data', chunk => {
				// 以下载大小
				receiveSize += chunk.length
				// 进度条
				consoleBar({
					completed: receiveSize,
					total: totalSize
				})
			})
			.on('end', () => {
				console.log('下载完成')
				resolve()
			})
			.pipe(stream)
	})
}

// 获取链接
const getLink = (url, name) => {
	return new Promise((resolve, reject) => {
		let payload = {
			"kw": url,
		}
		superagent.get(flvcdUrl, params = payload)
			.charset('gbk')
			.end((err, res) => {
				let $ = cheerio.load(res.text)
				let videoUrl = $('.link').attr('href')

				// 字幕
				let srtLink = $('a font')
				for (let i = 0, len = srtLink.length; i < len; i++) {
					let srtUrl = srtLink[i].parent.attribs['href']
					let srtName = srtLink[i].children[0].data
					if (/字幕/.test(srtName)) {
						srtName = name + ' [' + srtName + ']' + '.srt'
						getSrt(srtUrl, srtName)
					}
				}

				;(async function() {
					await getVideo(videoUrl, name)
					resolve()
				})()
			})
	})
}

const init = () => {
	let url = argv.l
	superagent.get(url)
		.charset('gbk')
		.end(function(err, res) {
			let $ = cheerio.load(res.text)
			// 将课程名作为文件夹
			saveDir = $('.m-cdes h2').text()
			if (!fs.existsSync(saveDir)) {
				fs.mkdirSync(saveDir)
			}

			// 获取视频地址
			let courseList = $('#list2 .u-ctitle a')

			;(async function() {
				for (let i = 0, len = courseList.length; i < len; i++) {
					let courseUrl = courseList[i].attribs['href']
					let courseName = (i + 1) + '. ' + courseList[i].children[0]['data']
					await getLink(courseUrl, courseName)
				}
			})()
		})
}

init()