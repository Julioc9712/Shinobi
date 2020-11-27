var fs = require('fs');
module.exports = function(s,config,lang){
  // MinIO S3 Compatible Storage
  var beforeAccountSaveForMinio = function(d){
    //d = save event
    d.formDetails.minio_use_global=d.d.minio_use_global
    d.formDetails.use_minio=d.d.use_minio
  }
  var cloudDiskUseStartupForMinio = function(group,userDetails){
    group.cloudDiskUse['minio'].name = 'MinIO'
    group.cloudDiskUse['minio'].sizeLimitCheck = (userDetails.use_minio_size_limit === '1')
    if(!userDetails.minio_size_limit || userDetails.minio_size_limit === ''){
      group.cloudDiskUse['minio'].sizeLimit = 10000
    }else{
      group.cloudDiskUse['minio'].sizeLimit = parseFloat(userDetails.minio_size_limit)
    }
  }
  var loadMinioForUser = function(e){
    // e = user
    var userDetails = JSON.parse(e.details)
    if(userDetails.minio_use_global === '1' && config.cloudUploaders && config.cloudUploaders.Minio){
      userDetails = Object.assign(userDetails,config.cloudUploaders.Minio)
    }
    //Amazon S3
    if(!s.group[e.ke].minio &&
      !s.group[e.ke].minio &&
      userDetails.minio !== '0' &&
      userDetails.minio_accessKeyId !== ''&&
      userDetails.minio_secretAccessKey &&
      userDetails.minio_secretAccessKey !== ''&&
      userDetails.minio_bucket !== ''
    ){
      if(!userDetails.minio_dir || userDetails.minio_dir === '/'){
        userDetails.minio_dir = ''
      }
      if(userDetails.minio_dir !== ''){
        userDetails.minio_dir = s.checkCorrectPathEnding(userDetails.minio_dir)
      }
      s.group[e.ke].minio = new require("aws-sdk")
      s.group[e.ke].minio.config = new s.group[e.ke].minio.Config({
        accessKeyId: userDetails.minio_accessKeyId,
        secretAccessKey: userDetails.minio_secretAccessKey,
        endpoint: userDetails.minio_endpoint,
        s3ForcePathStyle: true,
        signatureVersion: 'v4'
      })
      s.group[e.ke].minio_s3 = new s.group[e.ke].minio.S3();
    }
  }
  var unloadMinioForUser = function(user){
    s.group[user.ke].minio = null
    s.group[user.ke].minio_s3 = null
  }
  var deleteVideoFromMinio = function(e,video,callback){
    // e = user
    try{
      var videoDetails = JSON.parse(video.details)
    }catch(err){
      var videoDetails = video.details
    }
    if(!videoDetails.location){
      videoDetails.location = video.href.split('.amazonaws.com')[1]
    }
    s.group[e.ke].minio_s3.deleteObject({
      Bucket: s.group[e.ke].init.minio_bucket,
      Key: videoDetails.location,
    }, function(err, data) {
      if (err) console.log(err);
      callback()
    });
  }
  var getVideoFromMinio = async (video) => {
    // e = user
    var videoDetails = s.parseJSON(video.details)
    if(videoDetails.type !== 'minio'){
      return
    }
    return new Promise((resolve, reject) => {
      var videoStream = s.group[video.ke].minio_s3.getObject({
        Bucket: s.group[video.ke].init.minio_bucket,
        Key: videoDetails.location,
      }).createReadStream();
      resolve(videoStream);
    })
  }
  var uploadVideoToMinio = function(e,k){
    //e = video object
    //k = temporary values
    if(!k)k={};
    //cloud saver - minio
    if(s.group[e.ke].minio_s3 && s.group[e.ke].init.use_minio !== '0' && s.group[e.ke].init.minio_save === '1'){
      var ext = k.filename.split('.')
      ext = ext[ext.length - 1]
      var fileStream = fs.createReadStream(k.dir+k.filename);
      fileStream.on('error', function (err) {
        console.error(err)
      })
      var saveLocation = s.group[e.ke].init.minio_dir+e.ke+'/'+e.mid+'/'+k.filename
      s.group[e.ke].minio_s3.upload({
        Bucket: s.group[e.ke].init.minio_bucket,
        Key: saveLocation,
        Body: fileStream,
        ContentType:'video/'+ext
      },function(err,data){
        if(err){
          s.userLog(e,{type:lang['MinIO Upload Error'],msg:err})
        }
        if(s.group[e.ke].init.minio_log === '1' && data && data.Location){
          s.knexQuery({
            action: "insert",
            table: "Cloud Videos",
            insert: {
              mid: e.mid,
              ke: e.ke,
              time: k.startTime,
              status: 1,
              details: s.s({
                type : 'minio',
                location : saveLocation
              }),
              size: k.filesize,
              end: k.endTime,
              href: data.Location
            }
          })
          s.setCloudDiskUsedForGroup(e.ke,{
            amount: k.filesizeMB,
            storageType: 'minio'
          })
          s.purgeCloudDiskForGroup(e,'minio')
        }
      })
    }
  }
  var onInsertTimelapseFrame = function(monitorObject,queryInfo,filePath){
    var e = monitorObject
    if(s.group[e.ke].minio_s3 && s.group[e.ke].init.use_minio !== '0' && s.group[e.ke].init.minio_save === '1'){
      var fileStream = fs.createReadStream(filePath)
      fileStream.on('error', function (err) {
        console.error(err)
      })
      var saveLocation = s.group[e.ke].init.minio_dir + e.ke + '/' + e.mid + '_timelapse/' + queryInfo.filename
      s.group[e.ke].minio_s3.upload({
        Bucket: s.group[e.ke].init.minio_bucket,
        Key: saveLocation,
        Body: fileStream,
        ContentType:'image/jpeg'
      },function(err,data){
        if(err){
          s.userLog(e,{type:lang['MinIO Upload Error'],msg:err})
        }
        if(s.group[e.ke].init.minio_log === '1' && data && data.Location){
          s.knexQuery({
            action: "insert",
            table: "Cloud Timelapse Frames",
            insert: {
              mid: queryInfo.mid,
              ke: queryInfo.ke,
              time: queryInfo.time,
              details: s.s({
                type : 'minio',
                location : saveLocation
              }),
              size: queryInfo.size,
              href: data.Location
            }
          })
          s.setCloudDiskUsedForGroup(e.ke,{
            amount : s.kilobyteToMegabyte(queryInfo.size),
            storageType : 'minio'
          },'timelapseFrames')
          s.purgeCloudDiskForGroup(e,'minio','timelapseFrames')
        }
      })
    }
  }
  var onDeleteTimelapseFrameFromCloud = function(e,frame,callback){
    // e = user
    try{
      var frameDetails = JSON.parse(frame.details)
    }catch(err){
      var frameDetails = frame.details
    }
    if(frameDetails.type !== 'minio'){
      return
    }
    if(!frameDetails.location){
      frameDetails.location = frame.href.split(locationUrl)[1]
    }
    s.group[e.ke].minio_s3.deleteObject({
      Bucket: s.group[e.ke].init.minio_bucket,
      Key: frameDetails.location,
    }, function(err, data) {
      if (err) console.log(err);
      callback()
    });
  }
  //MinIO
  s.addCloudUploader({
    name: 'minio',
    loadGroupAppExtender: loadMinioForUser,
    unloadGroupAppExtender: unloadMinioForUser,
    insertCompletedVideoExtender: uploadVideoToMinio,
    deleteVideoFromCloudExtensions: deleteVideoFromMinio,
    cloudDiskUseStartupExtensions: cloudDiskUseStartupForMinio,
    beforeAccountSave: beforeAccountSaveForMinio,
    onAccountSave: cloudDiskUseStartupForMinio,
    onInsertTimelapseFrame: onInsertTimelapseFrame,
    onDeleteTimelapseFrameFromCloud: onDeleteTimelapseFrameFromCloud,
    onGetVideoData: getVideoFromMinio
  })
  //return fields that will appear in settings
  return {
    "evaluation": "details.use_minio !== '0'",
    "name": lang["MinIO"],
    "color": "forestgreen",
    "info": [
      {
        "name": "detail=minio_save",
        "selector":"autosave_minio",
        "field": lang.Autosave,
        "description": "",
        "default": lang.No,
        "example": "",
        "fieldType": "select",
        "possible": [
          {
            "name": lang.No,
            "value": "0"
          },
          {
            "name": lang.Yes,
            "value": "1"
          }
        ]
      },
      {
        "hidden": true,
        "field": lang['Endpoint Address'],
        "name": "detail=minio_endpoint",
        "placeholder": "http://127.0.0.1:9000",
        "form-group-class": "autosave_minio_input autosave_minio_1",
        "description": "",
        "default": "",
        "example": "",
        "possible": ""
      },
      {
        "hidden": true,
        "field": lang.Bucket,
        "name": "detail=minio_bucket",
        "placeholder": "Example : slippery-seal",
        "form-group-class": "autosave_minio_input autosave_minio_1",
        "description": "",
        "default": "",
        "example": "",
        "possible": ""
      },
      {
        "hidden": true,
        "field": lang.aws_accessKeyId,
        "name": "detail=minio_accessKeyId",
        "form-group-class": "autosave_minio_input autosave_minio_1",
        "description": "",
        "default": "",
        "example": "",
        "possible": ""
      },
      {
        "hidden": true,
        "name": "detail=minio_secretAccessKey",
        "fieldType":"password",
        "placeholder": "",
        "field": lang.aws_secretAccessKey,
        "form-group-class":"autosave_minio_input autosave_minio_1",
        "description": "",
        "default": "",
        "example": "",
        "possible": ""
      },
      {
        "hidden": true,
        "name": "detail=minio_log",
        "field": lang['Save Links to Database'],
        "fieldType": "select",
        "selector": "h_s3sld",
        "form-group-class":"autosave_minio_input autosave_minio_1",
        "description": "",
        "default": "",
        "example": "",
        "possible": [
          {
            "name": lang.No,
            "value": "0"
          },
          {
            "name": lang.Yes,
            "value": "1"
          }
        ]
      },
      {
        "hidden": true,
        "name": "detail=use_minio_size_limit",
        "field": lang['Use Max Storage Amount'],
        "fieldType": "select",
        "selector": "h_s3zl",
        "form-group-class":"autosave_minio_input autosave_minio_1",
        "form-group-class-pre-layer":"h_s3sld_input h_s3sld_1",
        "description": "",
        "default": "",
        "example": "",
        "possible":  [
          {
            "name": lang.No,
            "value": "0"
          },
          {
            "name": lang.Yes,
            "value": "1"
          }
        ]
      },
      {
        "hidden": true,
        "name": "detail=minio_size_limit",
        "field": lang['Max Storage Amount'],
        "form-group-class":"autosave_minio_input autosave_minio_1",
        "form-group-class-pre-layer":"h_s3sld_input h_s3sld_1",
        "description": "",
        "default": "10000",
        "example": "",
        "possible": ""
      },
      {
        "hidden": true,
        "name": "detail=minio_dir",
        "field": lang['Save Directory'],
        "form-group-class":"autosave_minio_input autosave_minio_1",
        "description": "",
        "default": "/",
        "example": "",
        "possible": ""
      },
    ]
  }
}
