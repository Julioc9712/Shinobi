//
// Shinobi - Tensorflow Plugin
// Copyright (C) 2016-2025 Elad Bar, Moe Alam
//
// Base Init >>
const fs = require('fs');
const config = require('./conf.json')
const request = require("request")
var s
const {
		workerData
	} = require('worker_threads');

if(workerData && workerData.ok === true){
	try{
		s = require('../pluginWorkerBase.js')(__dirname,config)
	}catch(err){
		console.log(err)
		try{
			s = require('./pluginWorkerBase.js')(__dirname,config)
		}catch(err){
			console.log(err)
			return console.log(config.plug,'WORKER : Plugin start has failed. pluginBase.js was not found.')
		}
	}
}else{
	try{
		s = require('../pluginBase.js')(__dirname,config)
	}catch(err){
		console.log(err)
		try{
			s = require('./pluginBase.js')(__dirname,config)
		}catch(err){
			console.log(err)
			return console.log(config.plug,'Plugin start has failed. pluginBase.js was not found.')
		}
	}
	try{
		s = require('../pluginBase.js')(__dirname,config)
	}catch(err){
		console.log(err)
		try{
			const {
				haltMessage,
				checkStartTime,
				setStartTime,
			} = require('../pluginCheck.js')

			if(!checkStartTime()){
				console.log(haltMessage,new Date())
				s.disconnectWebSocket()
				return
			}
			setStartTime()
		}catch(err){
			console.log(`pluginCheck failed`)
		}
	}

}
// Base Init />>

const deepStackHost = config.deepStack["host"]
const deepStackPort = config.deepStack["port"]
const deepStackIsSSL = config.deepStack["isSSL"]
const deepStackApiKey = config.deepStack["apiKey"]
const deepStackProtocol = deepStackIsSSL ? "https" : "http"

const baseUrl = `${deepStackProtocol}://${deepStackHost}:${deepStackPort}/v1`

function deepStackRequest(requestEndpoint,frameBuffer){
	const fullEndPointUrl = `${baseUrl}${requestEndpoint || `/vision/detection`}`
	return new Promise((resolve,reject) => {
		try{
			const form = {
				"image": {
					value: frameBuffer,
					options: {
					  filename: 'frame.jpg'
					}
				}
			}
			if(deepStackApiKey) {
				form["api_key"] = deepStackApiKey
			}
			request.post({url:fullEndPointUrl, formData:form}, function(err,res,body){
				let predictions = []
				try{
					const response = JSON.parse(body || {predictions: []})
					predictions = response["predictions"] || []
				}catch(err){
					console.log(res)
					console.log(err)
					console.log(body)
				}
				resolve(predictions);
			})
		}catch(err){
			resolve([])
			console.log(err)
		}
	})
}

s.detectObject = async function(frameBuffer,d,tx,frameLocation,callback){
	const timeStart = new Date()
	const predictions = await deepStackRequest(`/vision/detection`,frameBuffer)
	if(predictions.length > 0) {
		const mats = []
		predictions.forEach(function(v){
			const label = v["label"]
			const confidence = v["confidence"]
			const y_min = v["y_min"]
			const x_min = v["x_min"]
			const y_max = v["y_max"]
			const x_max = v["x_max"]
			const width = x_max - x_min
			const height = y_max - y_min
			mats.push({
				x: x_min,
				y: y_min,
				width: width,
				height: height,
				tag: label,
				confidence: confidence,
			})
		})
		const isObjectDetectionSeparate = d.mon.detector_pam === '1' && d.mon.detector_use_detect_object === '1'
		const width = parseFloat(isObjectDetectionSeparate  && d.mon.detector_scale_y_object ? d.mon.detector_scale_y_object : d.mon.detector_scale_y)
		const height = parseFloat(isObjectDetectionSeparate  && d.mon.detector_scale_x_object ? d.mon.detector_scale_x_object : d.mon.detector_scale_x)

		tx({
			f:'trigger',
			id:d.id,
			ke:d.ke,
			details:{
				plug: config.plug,
				name: `DeepStack-Object`,
				reason: 'object',
				matrices: mats,
				imgHeight: width,
				imgWidth: height,
			},
			frame: frameBuffer
		})
	}
	callback()
}
