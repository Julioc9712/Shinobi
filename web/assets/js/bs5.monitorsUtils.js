var availableMonitorGroups = {}
var monitorGroupSelections = $('#monitor-group-selections')
function humanReadableModeLabel(mode){
    var humanMode = lang['Disabled']
    switch(mode){
        case'idle':
            humanMode = lang['Idle']
        break;
        case'stop':
            humanMode = lang['Disabled']
        break;
        case'record':
            humanMode = lang['Record']
        break;
        case'start':
            humanMode = lang['Watch Only']
        break;
    }
    return humanMode
}
function setCosmeticMonitorInfo(monitorConfig){
    var monitorId = monitorConfig.mid
    var monitorElements = $('.glM' + monitorId)
    if(safeJsonParse(monitorConfig.details).vcodec !=='copy' && monitorConfig.mode == 'record'){
        monitorElements.find('.monitor_not_record_copy').show()
    }else{
        monitorElements.find('.monitor_not_record_copy').hide()
    }
    var humanReadableMode = humanReadableModeLabel(monitorConfig.mode)
    monitorElements.find('.monitor_name').text(monitorConfig.name)
    monitorElements.find('.monitor_mid').text(monitorId)
    monitorElements.find('.monitor_ext').text(monitorConfig.ext)
    monitorElements.find('.monitor_mode').text(humanReadableMode)
    monitorElements.find('.monitor_status').html(monitorConfig.status || '<i class="fa fa-spinner fa-pulse"></i>')
    monitorElements.attr('mode',humanReadableMode)
    monitorElements.find('.lamp').attr('title',humanReadableMode)
    if(monitorConfig.details.control=="1"){
        monitorElements.find('[monitor="control_toggle"]').show()
    }else{
        monitorElements.find('.pad').remove()
        monitorElements.find('[monitor="control_toggle"]').hide()
    }
}

function getSnapshot(options,cb){
    var image_data
    var url
    var monitor = options.mon || options.monitor || options
    var targetElement = $(options.targetElement || `[data-mid="${monitor.mid}"].monitor_item .stream-element`)
    var details = safeJsonParse(monitor.details)
    if(window.jpegModeOn !== true){
        function completeAction(image_data,width,height){
            var len = image_data.length
            var arraybuffer = new Uint8Array( len )
            for (var i = 0; i < len; i++)        {
                arraybuffer[i] = image_data.charCodeAt(i)
            }
            try {
                var blob = new Blob([arraybuffer], {type: 'application/octet-stream'})
            } catch (e) {
                var bb = new (window.WebKitBlobBuilder || window.MozBlobBuilder)
                bb.append(arraybuffer);
                var blob = bb.getBlob('application/octet-stream');
            }
            url = (window.URL || window.webkitURL).createObjectURL(blob)
            cb(url,image_data,width,height)
            try{
                setTimeout(function(){
                    URL.revokeObjectURL(url)
                },10000)
            }catch(er){}
        }
        switch(details.stream_type){
            case'hls':
            case'flv':
            case'mp4':
                getVideoSnapshot(targetElement[0],function(base64,video_data,width,height){
                    completeAction(video_data,width,height)
                })
            break;
            case'mjpeg':
                $('#temp').html('<canvas></canvas>')
                var c = $('#temp canvas')[0]
                var img = $('img',targetElement.contents())[0]
                c.width = img.width
                c.height = img.height
                var ctx = c.getContext('2d')
                ctx.drawImage(img, 0, 0,c.width,c.height)
                completeAction(atob(c.toDataURL('image/jpeg').split(',')[1]),c.width,c.height)
            break;
            case'b64':
            case'h265':
                var c = targetElement[0]
                var ctx = c.getContext('2d')
                completeAction(atob(c.toDataURL('image/jpeg').split(',')[1]),c.width,c.height)
            break;
            case'jpeg':
                url = targetElement.attr('src')
                image_data = new Image()
                image_data.src = url
                cb(url,image_data,image_data.width,image_data.height)
            break;
        }
    }else{
        url = targetElement.attr('src')
        image_data = new Image()
        image_data.src = url
        cb(url,image_data,image_data.width,image_data.height)
    }
}
function getVideoSnapshot(videoElement,cb){
    var image_data
    var base64
    $('#temp').html('<canvas></canvas>')
    var c = $('#temp canvas')[0]
    var img = videoElement
    c.width = img.videoWidth
    c.height = img.videoHeight
    var ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0,c.width,c.height)
    base64=c.toDataURL('image/jpeg')
    image_data=atob(base64.split(',')[1])
    var arraybuffer = new ArrayBuffer(image_data.length)
    var view = new Uint8Array(arraybuffer)
    for (var i=0; i<image_data.length; i++) {
        view[i] = image_data.charCodeAt(i) & 0xff
    }
    try {
        var blob = new Blob([arraybuffer], {type: 'application/octet-stream'})
    } catch (e) {
        var bb = new (window.WebKitBlobBuilder || window.MozBlobBuilder)
        bb.append(arraybuffer)
        var blob = bb.getBlob('application/octet-stream')
    }
    cb(base64,image_data,c.width,c.height)
}

function runPtzCommand(monitorId,switchChosen){
    switch(switchChosen){
        case'setHome':
            $.get(getApiPrefix(`control`) + '/' + monitorId + '/setHome',function(data){
                console.log(data)
            })
        break;
        default:
            mainSocket.f({
                f: 'monitor',
                ff: 'control',
                direction: switchChosen,
                id: monitorId,
                ke: $user.ke
            })
        break;
    }
}
function runTestDetectionTrigger(monitorId,callback){
    $.getJSON(getApiPrefix() + '/motion/'+$user.ke+'/'+monitorId+'/?data={"plug":"manual_trigger","name":"Manual Trigger","reason":"Manual","confidence":100}',function(d){
        debugLog(d)
        if(callback)callback()
    })
}

function playAudioAlert(){
    var fileName = $user.details.audio_alert
    if(fileName && window.soundAlarmed !== true){
        window.soundAlarmed = true
        var audio = new Audio(`libs/audio/${fileName}`)
        var audioDelay = !isNaN($user.details.audio_delay) ? parseFloat($user.details.audio_delay) : 1
        audio.onended = function(){
            setTimeout(function(){
                window.soundAlarmed = false
            },audioDelay * 1000)
        }
        if(windowFocus === true){
            audio.play()
        }else{
            clearInterval(window.soundAlarmInterval)
            window.soundAlarmInterval = setInterval(function(){
                audio.play()
            },audioDelay * 1000)
        }
    }
}

function buildStreamUrl(monitorId){
    var monitor = loadedMonitors[monitorId]
    var streamURL
    switch(safeJsonParse(monitor.details).stream_type){
        case'jpeg':
            streamURL = getApiPrefix(`jpeg`) + '/' + monitorId + '/s.jpg'
        break;
        case'mjpeg':
            streamURL = getApiPrefix(`mjpeg`) + '/' + monitorId
        break;
        case'hls':
            streamURL = getApiPrefix(`hls`) + '/' + monitorId + '/s.m3u8'
        break;
        case'flv':
            streamURL = getApiPrefix(`flv`) + '/' + monitorId + '/s.flv'
        break;
        case'h265':
            streamURL = getApiPrefix(`h265`) + '/' + monitorId + '/s.hevc'
        break;
        case'mp4':
            streamURL = getApiPrefix(`mp4`) + '/' + monitorId + '/s.mp4'
        break;
        case'b64':
            streamURL = 'Websocket'
        break;
    }
    return streamURL
}

function getDbColumnsForMonitor(monitor){
    var acceptedFields = [
        'mid',
        'ke',
        'name',
        'shto',
        'shfr',
        'details',
        'type',
        'ext',
        'protocol',
        'host',
        'path',
        'port',
        'fps',
        'mode',
        'width',
        'height'
    ]
    var row = {};
    $.each(monitor,function(m,b){
        if(acceptedFields.indexOf(m)>-1){
            row[m]=b;
        }
    })
    return row
}

function downloadMonitorConfigurationsToDisk(monitorIds){
    var selectedMonitors = []
    $.each(monitorIds,function(n,monitorId){
        var monitor = monitorId instanceof Object ? monitorId : loadedMonitors[monitorId]
        if(monitor)selectedMonitors.push(monitor)
    })
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedMonitors));
    $('#temp').html('<a></a>')
        .find('a')
        .attr('href',dataStr)
        .attr('download',`Shinobi_Monitors_${$user.ke}_${new Date()}.json`)
        [0].click()
}

function importShinobiMonitor(monitor){

}

function importM3u8Playlist(textData){
    var m3u8List = textData.replace('#EXTM3U','').trim().split('\n')
    var parsedList = {}
    var currentName
    m3u8List.forEach(function(line){
        if(line.indexOf('#EXTINF:-1,') > -1){
            currentName = line.replace('#EXTINF:-1,','').trim()
        }else{
            parsedList[currentName] = line.trim()
        }
    })
    $.each(parsedList,function(name,url){
        var link = getUrlPieces(url)
        var newMon = $.aM.generateDefaultMonitorSettings()
        newMon.details = JSON.parse(newMon.details)
        newMon.mid = 'HLS' + name.toLowerCase()
        newMon.name = name
        newMon.port = link.port
        newMon.host = link.hostname
        newMon.path = link.pathname
        newMon.details.tv_channel = '1'
        newMon.details.tv_channel_id = name
        newMon.details.auto_host_enable = '1'
        newMon.details.auto_host = url
        newMon.details.stream_quality = '1'
        newMon.details.stream_fps = ''
        newMon.details.stream_vcodec = 'libx264'
        newMon.details.stream_acodec = 'aac'
        newMon.details.stream_type = 'hls'
        newMon.details.hls_time = '10'
        newMon.type = 'mp4'
        newMon.details = JSON.stringify(newMon.details)
        postMonitor(newMon)
    })
}

function importZoneMinderMonitor(Monitor){
    var newMon = generateDefaultMonitorSettings()
    newMon.details = JSON.parse(newMon.details)
    newMon.details.stream_type = 'jpeg'
    switch(Monitor.Type.toLowerCase()){
        case'ffmpeg':case'libvlc':
            newMon.details.auto_host_enable = '1'
            newMon.details.auto_host = Monitor.Path
            if(newMon.auto_host.indexOf('rtsp://') > -1 || newMon.auto_host.indexOf('rtmp://') > -1 || newMon.auto_host.indexOf('rtmps://') > -1){
                newMon.type = 'h264'
            }else{
                $.ccio.init('note',{title:lang['Please Check Your Settings'],text:lang.migrateText1,type:'error'})
            }
        break;
        case'local':
            newMon.details.auto_host = Monitor.Device
        break;
        case'remote':

        break;
    }
    newMon.details = JSON.stringify(newMon.details)
    return newMon
}

function importMonitor(textData){
    try{
        var parsedData = textData instanceof Object ? textData : safeJsonParse(textData)
        function postMonitor(v){
            var monitorId = v.mid
            $.post(`${getApiPrefix('configureMonitor')}/${monitorId}`,{
                data: JSON.stringify(v,null,3)
            },function(d){
                $.ccio.log(d)
            })
        }
        //zoneminder one monitor
        if(parsedData.monitor){
            postMonitor(importZoneMinderMonitor(parsedData.monitor.Monitor))
        }else
        //zoneminder multiple monitors
        if(parsedData.monitors){
            $.each(parsedData.monitors,function(n,v){
                postMonitor(importZoneMinderMonitor(v.Monitor))
            })
        }else
        //shinobi one monitor
        if(parsedData.mid){
            postMonitor(parsedData)
        }else
        //shinobi multiple monitors
        if(parsedData[0] && parsedData[0].mid){
            $.each(parsedData,function(n,v){
                postMonitor(v)
            })
        }
    }catch(err){
        //#EXTM3U
        if(textData instanceof String && textData.indexOf('#EXTM3U') > -1 && textData.indexOf('{"') === -1){
            importM3u8Playlist(textData)
        }else{
            debugLog(err)
            new PNotify({
                title: lang['Invalid JSON'],
                text: lang.InvalidJSONText,
                type: 'error'
            })
        }
    }
}
function deleteMonitors(monitorsSelected){
    $.confirm.create({
        title: lang['Delete']+' '+lang['Monitors'],
        body: '<p>'+lang.DeleteMonitorsText+'</p>',
        clickOptions: [
            {
                title:lang['Delete']+' '+lang['Monitors'],
                class:'btn-danger',
                callback:function(){
                    $.each(monitorsSelected,function(n,monitor){
                        $.get(`${getApiPrefix(`configureMonitor`)}/${monitor.mid}/delete`,function(data){
                            console.log(data)
                        })
                    })
                }
            },
            {
                title:lang['Delete Monitors and Files'],
                class:'btn-danger',
                callback:function(){
                    $.each(monitorsSelected,function(n,monitor){
                        $.get(`${getApiPrefix(`configureMonitor`)}/${monitor.mid}/delete?deleteFiles=true`,function(data){
                            console.log(data)
                        })
                    })
                }
            }
        ]
    })
}
function launchImportMonitorWindow(callback){
    var html = `${lang.ImportMultiMonitorConfigurationText}
    <div style="margin-top: 15px;">
        <div class="form-group">
            <textarea placeholder="${lang['Paste JSON here.']}" class="form-control"></textarea>
        </div>
        <label class="upload_file btn btn-primary btn-block">${lang['Upload File']}<input class="upload" type="file" name="files[]" /></label>
    </div>`
    $.confirm.create({
        title: lang['Import Monitor Configuration'],
        body: html,
        clickOptions: [
            {
                title: lang['Import'],
                class: 'btn-primary',
                callback: function(){
                    var textData = safeJsonParse($.confirm.e.find('textarea').val())
                    if(callback){
                        callback(textData)
                    }else{
                        importMonitor(textData)
                    }
                }
            },
            // {
            //     title: lang['Upload'],
            //     class: 'btn-primary',
            //     callback: function(e){
            //         var files = e.target.files; // FileList object
            //         f = files[0];
            //         var reader = new FileReader();
            //         reader.onload = function(ee) {
            //             $.confirm.e.find('textarea').val(ee.target.result);
            //         }
            //         reader.readAsText(f);
            //     }
            // }
        ],
    })
    $.confirm.e.find('.upload').change(function(e){
        var files = e.target.files; // FileList object
        f = files[0];
        var reader = new FileReader();
        reader.onload = function(ee) {
            $.confirm.e.find('textarea').val(ee.target.result);
        }
        reader.readAsText(f);
    });
}
function drawMatrices(event,options){
    var theContainer = options.theContainer
    var height = options.height
    var width = options.width
    var widthRatio = width / event.details.imgWidth
    var heightRatio = height / event.details.imgHeight
    var objectTagGroup = event.details.reason === 'motion' ? 'motion' : event.details.name
    theContainer.find(`.stream-detected-object[name="${objectTagGroup}"]`).remove()
    var html = ''
    $.each(event.details.matrices,function(n,matrix){
        html += `<div class="stream-detected-object" name="${objectTagGroup}" style="height:${heightRatio * matrix.height}px;width:${widthRatio * matrix.width}px;top:${heightRatio * matrix.y}px;left:${widthRatio * matrix.x}px;">`
        if(matrix.tag)html += `<span class="tag">${matrix.tag}</span>`
        html += '</div>'
    })
    theContainer.append(html)
}
function setMonitorCountOnUI(){
    $('.cameraCount').text(Object.keys(loadedMonitors).length)
}
function muteMonitorAudio(monitorId){
    var masterMute = dashboardOptions().switches.monitorMuteAudio
    var monitorMutes = dashboardOptions().monitorMutes || {}
    monitorMutes[monitorId] = monitorMutes[monitorId] === 1 ? 0 : 1
    dashboardOptions('monitorMutes',monitorMutes)
    var vidEl = $('.monitor_item[mid="' + monitorId + '"] video')[0]
    if(monitorMutes[monitorId] === 1){
        vidEl.muted = true
    }else{
        if(masterMute !== 1){
            if($.ccio.windowFocus && hadFocus){
                vidEl.muted = false
            }else{
                console.error('User must have window active to unmute.')
            }
        }
    }
    var volumeIcon = monitorMutes[monitorId] !== 1 ? 'volume-up' : 'volume-off'
    $(this).find('i').removeClass('fa-volume-up fa-volume-off').addClass('fa-' + volumeIcon)
}
function getAvailableMonitorGroups(){
    var theGroups = {}
    $.each(loadedMonitors,function(n,monitor){
        var monitorsGroups = safeJsonParse(monitor.details.groups)
        $.each(monitorsGroups,function(m,groupId){
            if(!theGroups[groupId])theGroups[groupId]={}
            theGroups[groupId][monitor.mid] = monitor
        })
    })
    availableMonitorGroups = theGroups
    return theGroups;
}
function drawMonitorGroupList(){
    var html = ''
    getAvailableMonitorGroups()
    $.each(availableMonitorGroups,function(groupId,v){
        if($user.mon_groups[groupId]){
           html += `<li class="cursor-pointer"><a class="dropdown-item" monitor-group="${groupId}">${$user.mon_groups[groupId].name}</a></li>`
        }
    })
    monitorGroupSelections.html(html)
}
function loadMonitorGroup(groupId){
    $.each(dashboardOptions().watch_on,function(groupKey,groupData){
      $.each(groupData,function(monitorId,isOn){
          if(isOn)mainSocket.f({
              f: 'monitor',
              ff: 'watch_off',
              id: monitorId,
              ke: $user.ke
          })
      })
    })
    $.each(availableMonitorGroups[groupId],function(n,monitor){
      mainSocket.f({
          f: 'monitor',
          ff: 'watch_on',
          id: monitor.mid,
          ke: $user.ke
      })
    })
}
function buildDefaultMonitorMenuItems(){
    return `
    <li><a class="dropdown-item launch-live-grid-monitor cursor-pointer">${lang['Live Grid']}</a></li>
    <li><a class="dropdown-item run-live-grid-monitor-pop cursor-pointer">${lang['Pop']}</a></li>
    <li><hr class="dropdown-divider"></li>
    <li><a class="dropdown-item open-videos cursor-pointer">${lang['Videos List']}</a></li>
    <!-- <li><a class="dropdown-item cursor-pointer" monitor-action="pvv">${lang['Power Viewer']}</a></li> -->
    <li><a class="dropdown-item open-timelapse-viewer cursor-pointer">${lang['Time-lapse']}</a></li>
    <li><hr class="dropdown-divider"></li>
    <li><a class="dropdown-item open-monitor-settings cursor-pointer">${lang['Monitor Settings']}</a></li>
    <li><a class="dropdown-item export-this-monitor-settings cursor-pointer">${lang['Export']}</a></li>
    <li><hr class="dropdown-divider"></li>
    <li class="pl-4"><small class="text-muted">${lang['Set Mode']}</small></li>
    <li><a class="dropdown-item cursor-pointer" set-mode="stop">${lang.Disable}</a></li>
    <li><a class="dropdown-item cursor-pointer" set-mode="start">${lang['Watch-Only']}</a></li>
    <li><a class="dropdown-item cursor-pointer" set-mode="record">${lang.Record}</a></li>`
}
$(document).ready(function(){
    $('body')
    .on('click','[system]',function(){
        var e = {};
        var el = $(this)
        switch(el.attr('system')){
            case'monitorMuteAudioSingle':
                var monitorId = el.attr('mid')
                muteMonitorAudio(monitorId)
            break;
        }
    })
    .on('click','[shinobi-switch]',function(){
        var el = $(this)
        var systemSwitch = el.attr('shinobi-switch');
        dashboardSwitch(systemSwitch)
    })
    monitorGroupSelections
    .on('click','[monitor-group]',function(){
        var groupId = $(this).attr('monitor-group');
        loadMonitorGroup(groupId)
        openLiveGrid()
    })
})
