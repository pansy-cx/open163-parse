const superagent = require('superagent')
require('superagent-charset')(superagent)
const cheerio = require('cheerio')
const fs = require('fs')
const path = require('path')
const fse = require('fs-extra')
const request = require('request')
const parseXml = require('xml2js').parseString
const slog = require('single-line-log').stdout

let absPath = path.join(process.cwd())
let config = fse.readJsonSync(absPath + '/config.json')
let saveDir = ''

// 下载进度条
const ProgressBar = (description = 'Progress', len = '25') =>{
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

const getSrt = (url, name) => {
	return new Promise((resolve, reject) => {
		// 下载字幕
  	let srtre = /([^\/]+)\/([^\/]+)\/([^\/]+).html$/.exec(url)
  	let srtxml = 'http://live.ws.126.net/movie/' + srtre[1] + '/' + srtre[2] + '/2_' + srtre[3] + '.xml'
  	superagent.get(srtxml)
  		.charset('gbk')
  		.end((err, res) => {
  			parseXml(res.text, (err, res) => {
  				if (Object.prototype.toString.call(res.all.subs[0].sub) === '[object Array]') {
  					for (let i = 0, len = res.all.subs[0].sub.length; i < len; i++) {
  						let sub = res.all.subs[0].sub[i]
  						let srtname = name + ' [' + sub.name[0] + ']'
  						let stream = fs.createWriteStream(saveDir + '/' + srtname + '.srt')
  						request.get(sub.url[0])
						  	.on('err', () => {
						  		console.log('err')
						  	})
						  	.on('end', () => {
						  		if (i === len - 1)	resolve()
						  	})
						  	.pipe(stream)
  					}
  				} else {
  					// 没有字幕地址
  					resolve()
  				}
  			})
  		})
	})
}

const getVideo = (url, name) => {
	return new Promise((resolve, reject) => {
		superagent.get(url)
		  .charset('gbk')
		  .end((err, res) => {
		  	let re = /appsrc.*com(.*)\-/.exec(res.text)
		  	let videoUrl
		  	if (re[1]) {
		  		videoUrl = 'https://mov.bn.netease.com' + re[1] + '.flv'
		  	} else {
		  		console.log('未找到视频地址')
		  		return
		  	}
		  	let stream = fs.createWriteStream(saveDir + '/' + name + '.flv')
		    let receiveSize = 0
		    let totalSize = 0

		    // 初始化进度条
		    let consoleBar = ProgressBar('视频下载 ' + name + '\n', 50)
		  	request.get(videoUrl)
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
		
	})
}

const init = () => {
	superagent.get(config.url)
	  .charset('gbk')
	  .end(function(err, res) {
	  	let $ = cheerio.load(res.text)
	  	// 将课程名作为文件夹
	  	saveDir = $('.m-cdes h2').text()
	  	if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir);
      }

      // 获取视频地址
	  	let courseList = $('#list2 .u-ctitle a');
	  	(async function () {
		  	for (let i = 0, len = courseList.length; i < len; i++) {
		  		// 文件名和地址
		  		let videoUrl = courseList[i].attribs['href']
		  		let videoName = (i+1) + '. ' + courseList[i].children[0]['data']
		  		await getVideo(videoUrl, videoName)
		  		await getSrt(videoUrl, videoName)
		  	}
		  })()
	  })
}

init()

		

