// Base Init
var fs = require('fs');
var config = require('./conf.json')
var exec = require('child_process').exec;

var s
try{
    s = require('../pluginBase.js')(__dirname,config)
}catch(err){
    console.log(err)
    try{
        s = require('./pluginBase.js')(__dirname,config)
    }catch(err){
        console.log(err)
        return console.log(config.plug,'Plugin start has failed. This may be because you started this plugin on another machine. Just copy the pluginBase.js file into this (plugin) directory.')
        return console.log(config.plug,'pluginBase.js was not found.')
    }
}


// Main Function
s.detectObject = function(buffer,d,tx){

  try{

    // trigger and draw square
    tx({
        f: 'trigger',
        id:  d.id,
        ke: d.ke,
        details: {
          plug: config.plug,
          name: 'detection',
          reason: 'object',
          matrices: [{
              x: 150,
              y: 100,
              width: 100.0,
              height: 100.0,
              tag: 'Mr square'   
          }],
          imgHeight: d.mon.detector_scale_y,
          imgWidth: d.mon.detector_scale_x,
          frame: d.base64
        }
    })

  }catch(err){
    console.log(err)
  }
}

