
// Base Init
var fs = require('fs');
var config = require('./conf.json')
var exec = require('child_process').exec;
var cv = require('opencv4nodejs');

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
s.detectObject = function(buffer,d,tx,frameLocation){
  //Create detector function
  var detectStuff = function(frameBuffer,callback){
    cv.imdecodeAsync(frameBuffer,(err,im) => {
        if(err){
          console.log(err)
          return
        }

        //CODE TO RUN ON EACH FRAME HERE
        console.log("Frame is now stored in 'im'")


    })
  }


  //Run detector function
  if(frameLocation){
      fs.readFile(frameLocation,function(err,buffer){
          if(!err){
              detectStuff(buffer)
          }
          fs.unlink(frameLocation,function(){

          })
      })
  }else{
    detectStuff(buffer)
  }
}
