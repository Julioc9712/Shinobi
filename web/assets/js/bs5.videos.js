var loadedVideosInMemory = {}
var loadedFramesMemory = {}
var loadedFramesMemoryTimeout = {}
var loadedFramesLock = {}
function getLocalTimelapseImageLink(imageUrl){
    if(loadedFramesLock[imageUrl]){
        return null;
    }else if(loadedFramesMemory[imageUrl]){
        return loadedFramesMemory[imageUrl]
    }else{
        loadedFramesLock[imageUrl] = true
        return new Promise((resolve,reject) => {
            fetch(imageUrl)
              .then(res => res.blob()) // Gets the response and returns it as a blob
              .then(blob => {
                var objectURL = URL.createObjectURL(blob);
                loadedFramesMemory[imageUrl] = objectURL
                clearTimeout(loadedFramesMemoryTimeout[imageUrl])
                loadedFramesMemoryTimeout[imageUrl] = setTimeout(function(){
                    URL.revokeObjectURL(objectURL)
                    delete(loadedFramesMemory[imageUrl])
                    delete(loadedFramesMemoryTimeout[imageUrl])
                },1000 * 60 * 10);
                loadedFramesLock[imageUrl] = false;
                resolve(objectURL);
            }).catch((err) => {
                resolve()
            });
        })
    }
}
async function preloadAllTimelapseFramesToMemoryFromVideoList(framesSortedByDays){
    async function syncWait(waitTime){
        return new Promise((resolve,reject) => {
            setTimeout(function(){
                resolve()
            },waitTime)
        })
    }
    for (let ii = 0; ii < framesSortedByDays.length; ii++) {
        var frame = framesSortedByDays[ii]
        console.log ('Loading... ',frame.href)
        await syncWait(50)
        await getLocalTimelapseImageLink(frame.href)
        console.log ('Loaded! ',frame.href)
    }
}
function createVideoLinks(video,options){
    var details = safeJsonParse(video.details)
    var queryString = []
    // if(details.isUTC === true){
    //     queryString.push('isUTC=true')
    // }else{
    //     video.time = s.utcToLocal(video.time)
    //     video.end = s.utcToLocal(video.end)
    // }
    if(queryString.length > 0){
        queryString = '?' + queryString.join('&')
    }else{
        queryString = ''
    }
    video.ext = video.ext ? video.ext : 'mp4'
    if(details.type === 'googd'){
        video.href = undefined
    }else if(!video.ext && video.href){
        video.ext = video.href.split('.')
        video.ext = video.ext[video.ext.length - 1]
    }
    video.filename = formattedTimeForFilename(video.time,null,`YYYY-MM-DDTHH-mm-ss`) + '.' + video.ext;
    var href = getApiPrefix('videos') + '/'+video.mid+'/'+video.filename;
    video.actionUrl = href
    video.links = {
        deleteVideo : href+'/delete' + queryString,
        changeToUnread : href+'/status/1' + queryString,
        changeToRead : href+'/status/2' + queryString
    }
    if(!video.href || options.hideRemote === true)video.href = href + queryString
    video.details = details
    return video
}
function applyDataListToVideos(videos,events,keyName,reverseList){
    var updatedVideos = videos.concat([])
    var currentEvents = events.concat([])
    updatedVideos.forEach(function(video){
        var videoEvents = []
        currentEvents.forEach(function(theEvent,index){
            var startTime = new Date(video.time)
            var endTime = new Date(video.end)
            var eventTime = new Date(theEvent.time)
            if(theEvent.mid === video.mid && eventTime >= startTime && eventTime <= endTime){
                videoEvents.push(theEvent)
                currentEvents.splice(index, 1)
            }
        })
        if(reverseList)videoEvents = videoEvents.reverse()
        video[keyName || 'events'] = videoEvents
    })
    return updatedVideos
}
function applyTimelapseFramesListToVideos(videos,events,keyName,reverseList){
    var thisApiPrefix = getApiPrefix() + '/timelapse/' + $user.ke + '/'
    var newVideos = applyDataListToVideos(videos,events,keyName,reverseList)
    newVideos.forEach(function(video){
        video.timelapseFrames.forEach(function(row){
            var apiURL = thisApiPrefix + row.mid
            row.href = libURL + apiURL + '/' + row.filename.split('T')[0] + '/' + row.filename
        })
    })
    return newVideos
}
function getFrameOnVideoRow(percentageInward,video){
    var startTime = video.time
    var endTime = video.end
    var timeDifference = endTime - startTime
    var timeInward = timeDifference / (100 / percentageInward)
    var timeAdded = new Date(startTime.getTime() + timeInward) // ms
    var frames = video.timelapseFrames || []
    var foundFrame = frames.length === 1 ? frames[0] : frames.find(function(row){
        return new Date(row.time) >= timeAdded
    });
    return {
        timeInward: timeInward,
        foundFrame: foundFrame,
        timeAdded: timeAdded,
    }
}
function getVideoFromDay(percentageInward,reversedVideos,startTime,endTime){
    var timeDifference = endTime - startTime
    var timeInward = timeDifference / (100 / percentageInward)
    var timeAdded = new Date(startTime.getTime() + timeInward) // ms
    var foundVideoIndex = reversedVideos.findIndex(function(row){
        return new Date(timeAdded) >= new Date(row.time)
    });
    var foundVideo = reversedVideos[foundVideoIndex - 1] || reversedVideos[foundVideoIndex] || reversedVideos[0]
    return foundVideo
}
// function bindFrameFindingByMouseMove(createdCardCarrier,video){
//     var createdCardElement = createdCardCarrier.find('.video-time-card').first()
//     var timeImg = createdCardElement.find('.video-time-img')
//     var timeStrip = createdCardElement.find('.video-time-strip')
//     var timeNeedleSeeker = createdCardElement.find('.video-time-needle-seeker')
//     if(video.timelapseFrames.length > 0){
//         createdCardElement.on('mousemove',function(evt){
//             var offest = createdCardElement.offset()
//             var elementWidth = createdCardElement.width() + 2
//             var amountMoved = evt.pageX - offest.left
//             var percentMoved = amountMoved / elementWidth * 100
//             percentMoved = percentMoved > 100 ? 100 : percentMoved < 0 ? 0 : percentMoved
//             var frameFound = getFrameOnVideoRow(percentMoved,video).frameFound
//             if(frameFound){
//                 timeImg.css('background-image',`url(${frameFound.href})`)
//             }
//             timeNeedleSeeker.css('left',`${amountMoved}px`)
//         })
//         timeImg.css('background-image',`url(${getFrameOnVideoRow(1,video).frameFound.href})`)
//     }else{
//         if(video.events.length === 0){
//             timeStrip.hide()
//         }else{
//             var eventMatrixHtml = ``
//             var objectsFound = {}
//             eventMatrixHtml += `
//                     <table class="table table-striped mb-0">
//                     <tr>
//                       <th scope="col" class="${definitions.Theme.isDark ? 'text-white' : ''} text-epic">${lang.Events}</th>
//                       <th scope="col" class="text-end"><span class="badge bg-light text-dark rounded-pill">${video.events.length}</span></th>
//                     </tr>`
//                 $.each(([]).concat(video.events).splice(0,11),function(n,theEvent){
//                     var imagePath = `${formattedTimeForFilename(theEvent.time,false,'YYYY-MM-DD')}/${formattedTimeForFilename(theEvent.time,false,'YYYY-MM-DDTHH-mm-ss')}.jpg`
//                     possibleEventFrames += `<div class="col-4 mb-2"><img class="rounded pop-image cursor-pointer" style="max-width:100%;" src="${getApiPrefix('timelapse')}/${theEvent.mid}/${imagePath}" onerror="$(this).parent().remove()"></div>`
//                 })
//                 $.each(video.events,function(n,theEvent){
//                     $.each(theEvent.details.matrices,function(n,matrix){
//                         if(!objectsFound[matrix.tag])objectsFound[matrix.tag] = 1
//                         ++objectsFound[matrix.tag]
//                     })
//                 })
//                 $.each(objectsFound,function(tag,count){
//                     eventMatrixHtml += `<tr>
//                         <td class="${definitions.Theme.isDark ? 'text-white' : ''}" style="text-transform:capitalize">${tag}</td>
//                         <td class="text-end"><span class="badge badge-dark text-white rounded-pill">${count}</span></td>
//                     </tr>`
//                 })
//                 eventMatrixHtml += `</table>`
//                 timeStrip.append(eventMatrixHtml)
//         }
//         timeImg.remove()
//     }
// }
function bindFrameFindingByMouseMoveForDay(createdCardCarrier,dayKey,videos,allFrames){
    var stripTimes = getStripStartAndEnd(videos,allFrames)
    var dayStart = stripTimes.start
    var dayEnd = stripTimes.end
    var createdCardElement = createdCardCarrier.find('.video-time-card')
    var timeImg = createdCardElement.find('.video-time-img')
    var rowHeader = createdCardElement.find('.video-time-header')
    var timeStrip = createdCardElement.find('.video-time-strip')
    var timeNeedleSeeker = createdCardElement.find('.video-time-needle-seeker')
    var firstFrameOfDay = allFrames[0] || null
    $.each(videos,function(day,video){
        $.each(video.timelapseFrames,function(day,frame){
            if(!firstFrameOfDay)firstFrameOfDay = frame;
        })
    })
    if(!firstFrameOfDay){
        timeImg.remove()
        rowHeader.css('position','initial')
    }else{
        timeImg.attr('src',firstFrameOfDay.href)
    }
    var videoSlices = createdCardElement.find('.video-day-slice')
    var videoTimeLabel = createdCardElement.find('.video-time-label')
    var currentlySelected = videos[0]
    var currentlySelectedFrame = null
    var reversedVideos = ([]).concat(videos).reverse();
    createdCardElement.on('mousemove',function(evt){
        var offest = createdCardElement.offset()
        var elementWidth = createdCardElement.width() + 2
        var amountMoved = evt.pageX - offest.left
        var percentMoved = amountMoved / elementWidth * 100
        percentMoved = percentMoved > 100 ? 100 : percentMoved < 0 ? 0 : percentMoved
        var videoFound = videos[0] ? getVideoFromDay(percentMoved,reversedVideos,dayStart,dayEnd) : null
        createdCardElement.find(`[data-time]`).css('background-color','')
        if(videoFound){
            // var videoSlice = createdCardElement.find(`[data-time="${videoFound.time}"]`).css('background-color','rgba(255,255,255,0.3)')
            // var videoSliceOffest = videoSlice.offset()
            // var videoSliceElementWidth = videoSlice.width()
            // var videoSliceAmountMoved = evt.pageX - videoSliceOffest.left
            // var videoSlicePercentMoved = videoSliceAmountMoved / videoSliceElementWidth * 100
            // videoSlicePercentMoved = videoSlicePercentMoved > 100 ? 100 : videoSlicePercentMoved < 0 ? 0 : videoSlicePercentMoved

            if(currentlySelected && currentlySelected.time !== videoFound.time){
                timeNeedleSeeker.attr('video-time-seeked-video-position',videoFound.time)
            }
            currentlySelected = Object.assign({},videoFound)
        }
        // draw frame
        var result = getFrameOnVideoRow(percentMoved,{
            time: dayStart,
            end: dayEnd,
            timelapseFrames: allFrames,
        })
        var frameFound = result.foundFrame
        videoTimeLabel.text(formattedTime(result.timeAdded,'hh:mm:ss AA, DD-MM-YYYY'))
        if(frameFound){
            currentlySelectedFrame = Object.assign({},frameFound)
            setTimeout(async function(){
                var frameUrl = await getLocalTimelapseImageLink(frameFound.href)
                if(frameUrl && currentlySelectedFrame.time === frameFound.time)timeImg.attr('src',frameUrl);
            },1)
        }
        timeNeedleSeeker.attr('video-slice-seeked',result.timeInward).css('left',`${percentMoved}%`)
    })
}
function getPercentOfTimePositionFromVideo(video,theEvent){
    var startTime = new Date(video.time)
    var endTime = new Date(video.end)
    var eventTime = new Date(theEvent.time)
    var rangeMax = endTime - startTime
    var eventMs = eventTime - startTime
    var percentChanged = eventMs / rangeMax * 100
    return percentChanged
}
function createVideoRow(row,classOverride){
    var eventMatrixHtml = ``
    if(row.events && row.events.length > 0){
        $.each(row.events,function(n,theEvent){
            var leftPercent = getPercentOfTimePositionFromVideo(row,theEvent)
            eventMatrixHtml += `<div class="video-time-needle video-time-needle-event" style="left:${leftPercent}%"></div>`
        })
    }
    var videoEndpoint = getApiPrefix(`videos`) + '/' + row.mid + '/' + row.filename
    return `
    <div class="video-row ${classOverride ? classOverride : `col-md-12 col-lg-6 mb-3`} search-row" data-mid="${row.mid}" data-time="${row.time}" data-time-formed="${new Date(row.time)}">
        <div class="video-time-card shadow-lg px-0 btn-default">
            <div class="card-header d-flex flex-row">
                <div class="flex-grow-1 ${definitions.Theme.isDark ? 'text-white' : ''}">
                    ${loadedMonitors[row.mid] ? loadedMonitors[row.mid].name : row.mid}
                </div>
                <div>
                    <a class="badge btn btn-primary open-video mr-1" title="${lang['Watch']}"><i class="fa fa-play-circle"></i></a>
                    <a class="badge btn btn-success" download href="${videoEndpoint}" title="${lang['Download']}"><i class="fa fa-download"></i></a>
                    <a class="badge btn btn-danger delete-video" title="${lang['Delete']}"><i class="fa fa-trash-o"></i></a>
                </div>
            </div>
            <div class="video-time-img">
                <div class="card-body">
                    <div title="${row.time}" class="d-flex flex-row">
                        <div class="flex-grow-1">
                            ${moment(row.time).fromNow()}
                        </div>
                        <div>
                            <small class="text-muted">~${durationBetweenTimes(row.time,row.end)} ${lang.Minutes}</small>
                        </div>
                    </div>
                    <div title="${row.time}" class="d-flex flex-row border-bottom-dotted border-bottom-dark mb-2">
                        <div>
                            <div title="${row.time}"><small class="text-muted">${lang.Started} : ${formattedTime(row.time,true)}</small></div>
                            <div title="${row.end}"><small class="text-muted">${lang.Ended} : ${formattedTime(row.end,true)}</small></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="video-time-strip card-footer p-0">
                ${eventMatrixHtml}
                <div class="video-time-needle video-time-needle-seeker" style="z-index: 2"></div>
            </div>
        </div>
    </div>`
}
function sortVideosByDays(videos){
    var days = {}
    videos.forEach(function(video){
        var videoTime = new Date(video.time)
        var theDayKey = `${videoTime.getDate()}-${videoTime.getMonth()}-${videoTime.getFullYear()}`
        if(!days[video.mid])days[video.mid] = {};
        if(!days[video.mid][theDayKey])days[video.mid][theDayKey] = [];
        days[video.mid][theDayKey].push(video)
    })
    return days
}
function sortFramesByDays(frames){
    var days = {}
    var thisApiPrefix = getApiPrefix() + '/timelapse/' + $user.ke + '/'
    frames.forEach(function(frame){
        var frameTime = new Date(frame.time)
        var theDayKey = `${frameTime.getDate()}-${frameTime.getMonth()}-${frameTime.getFullYear()}`
        if(!days[frame.mid])days[frame.mid] = {};
        if(!days[frame.mid][theDayKey])days[frame.mid][theDayKey] = [];
        var apiURL = thisApiPrefix + frame.mid
        frame.href = libURL + apiURL + '/' + frame.filename.split('T')[0] + '/' + frame.filename
        days[frame.mid][theDayKey].push(frame)
    })
    return days
}
function getAllDays(videos,frames){
    var listOfDays = {}
    $.each(loadedMonitors,function(monitorId){
        if(!listOfDays[monitorId])listOfDays[monitorId] = {}
    })
    videos.forEach(function(video){
        var videoTime = new Date(video.time)
        var theDayKey = `${videoTime.getDate()}-${videoTime.getMonth()}-${videoTime.getFullYear()}`
        listOfDays[video.mid][theDayKey] = []
    })
    frames.forEach(function(frame){
        var frameTime = new Date(frame.time)
        var theDayKey = `${frameTime.getDate()}-${frameTime.getMonth()}-${frameTime.getFullYear()}`
        listOfDays[frame.mid][theDayKey] = []
    })
    return listOfDays
}
function getStripStartAndEnd(videos,frames){
    var stripStartTimeByVideos = videos[0] ? new Date(videos[0].time) : null
    var stripEndTimeByVideos = videos[0] ? new Date(videos[videos.length - 1].end) : null
    var stripStartTimeByFrames = frames[0] ? new Date(frames[0].time) : stripStartTimeByVideos
    var stripEndTimeByFrames = frames[0] ? new Date(frames[frames.length - 1].time) : stripEndTimeByVideos
    var stripStartTime = stripStartTimeByVideos && stripStartTimeByVideos < stripStartTimeByFrames ? stripStartTimeByVideos : stripStartTimeByFrames
    var stripEndTime = stripEndTimeByVideos && stripEndTimeByVideos > stripEndTimeByFrames ? stripEndTimeByVideos : stripEndTimeByFrames
    return {
        start: new Date(stripStartTime),
        end: new Date(stripEndTime),
    }
}
function getVideoPercentWidthForDay(row,videos,frames){
    var startTime = new Date(row.time)
    var endTime = new Date(row.end)
    var timeDifference = endTime - startTime
    var stripTimes = getStripStartAndEnd(videos,frames)
    var stripTimeDifference = stripTimes.end - stripTimes.start
    var percent = (timeDifference / stripTimeDifference) * 100
    return percent
}
function createDayCard(videos,frames,dayKey,monitorId,classOverride){
    var html = ''
    var eventMatrixHtml = ``
    var stripTimes = getStripStartAndEnd(videos,frames)
    var startTime = stripTimes.start
    var endTime = stripTimes.end
    var firstVideoTime = videos[0] ? videos[0].time : null
    var dayParts = formattedTime(startTime).split(' ')[1].split('-')
    var day = dayParts[2]
    var month = dayParts[1]
    var year = dayParts[0]
    $.each(videos,function(n,row){
        var nextRow = videos[n + 1]
        var marginRight = !!nextRow ? getVideoPercentWidthForDay({time: row.end, end: nextRow.time},videos,frames) : 0;
        eventMatrixHtml += `<div class="video-day-slice" data-mid="${row.mid}" data-time="${row.time}" style="width:${getVideoPercentWidthForDay(row,videos,frames)}%;position:relative">`
        if(row.events && row.events.length > 0){
            $.each(row.events,function(n,theEvent){
                var leftPercent = getPercentOfTimePositionFromVideo(row,theEvent)
                eventMatrixHtml += `<div class="video-time-needle video-time-needle-event" style="margin-left:${leftPercent}%"></div>`
            })
        }
        eventMatrixHtml += `</div>`
        eventMatrixHtml += `<div class="video-day-slice-spacer" style="width: ${marginRight}%"></div>`
    })
    html += `
    <div class="video-row ${classOverride ? classOverride : `col-md-12 col-lg-6 mb-3`} search-row">
        <div class="video-time-card shadow-sm px-0 ${definitions.Theme.isDark ? 'bg-dark' : 'bg-light'}">
            <div class="video-time-header">
                <div class="d-flex flex-row vertical-center ${definitions.Theme.isDark ? 'text-white' : ''}">
                    <div class="flex-grow-1 p-3">
                        <b>${loadedMonitors[monitorId] ? loadedMonitors[monitorId].name : monitorId}</b>
                        <div class="${definitions.Theme.isDark ? 'text-white' : ''}">
                            <span class="video-time-label">${formattedTime(startTime)} to ${formattedTime(endTime)}</span>
                        </div>
                    </div>
                    <div class="text-right p-3" style="background:rgba(0,0,0,0.5)">
                        <div class="text-center" style="font-size:20pt;font-weight:bold">${day}</div>
                        <div>${month}, ${year}</div>
                    </div>
                </div>
            </div>
            <div class="text-center">
                <img class="video-time-img">
            </div>
            <div class="video-time-strip card-footer p-0">
                <div class="flex-row d-flex" style="height:30px">${eventMatrixHtml}</div>
                <div class="video-time-needle video-time-needle-seeker" ${firstVideoTime ? `video-time-seeked-video-position="${firstVideoTime}"` : ''} data-mid="${monitorId}" style="z-index: 2"></div>
            </div>
        </div>
    </div>`
    return html
}
function drawVideoRowsToList(targetElement,rows){
    var theVideoList = $(targetElement)
    theVideoList.empty()
    $.each(rows,function(n,row){
        theVideoList.append(createVideoRow(row))
    })
    liveStamp()
}
function loadVideoData(video){
    delete(video.f)
    loadedVideosInMemory[`${video.mid}${video.time}`] = video
}
function getVideos(options,callback){
    return new Promise((resolve,reject) => {
        options = options ? options : {}
        var searchQuery = options.searchQuery
        var requestQueries = []
        var monitorId = options.monitorId
        var limit = options.limit || 300
        var eventStartTime
        var eventEndTime
        // var startDate = options.startDate
        // var endDate = options.endDate
        if(options.startDate){
            eventStartTime = formattedTimeForFilename(options.startDate,false)
            requestQueries.push(`start=${eventStartTime}`)
        }
        if(options.endDate){
            eventEndTime = formattedTimeForFilename(options.endDate,false)
            requestQueries.push(`end=${eventEndTime}`)
        }
        if(searchQuery){
            requestQueries.push(`search=${searchQuery}`)
        }
        $.getJSON(`${getApiPrefix(searchQuery ? `videosByEventTag` : `videos`)}${monitorId ? `/${monitorId}` : ''}?${requestQueries.concat([`noLimit=1`]).join('&')}`,function(data){
            var videos = data.videos
            $.getJSON(`${getApiPrefix(`timelapse`)}${monitorId ? `/${monitorId}` : ''}?${requestQueries.concat([`noLimit=1`]).join('&')}`,function(timelapseFrames){
                $.getJSON(`${getApiPrefix(`events`)}${monitorId ? `/${monitorId}` : ''}?${requestQueries.concat([`limit=${limit}`]).join('&')}`,function(eventData){
                    var newVideos = applyDataListToVideos(videos,eventData)
                    newVideos = applyTimelapseFramesListToVideos(newVideos,timelapseFrames,'timelapseFrames',true)
                    $.each(newVideos,function(n,video){
                        loadVideoData(video)
                    })
                    if(callback)callback({videos: newVideos, frames: timelapseFrames});
                    resolve({videos: newVideos, frames: timelapseFrames})
                })
            })
        })
    })
}
function getEvents(options,callback){
    options = options ? options : {}
    var requestQueries = []
    var monitorId = options.monitorId
    var limit = options.limit || 5000
    var eventStartTime
    var eventEndTime
    // var startDate = options.startDate
    // var endDate = options.endDate
    if(options.startDate){
        eventStartTime = formattedTimeForFilename(options.startDate,false)
        requestQueries.push(`start=${eventStartTime}`)
    }
    if(options.endDate){
        eventEndTime = formattedTimeForFilename(options.endDate,false)
        requestQueries.push(`end=${eventEndTime}`)
    }
    if(options.onlyCount){
        requestQueries.push(`onlyCount=1`)
    }
    $.getJSON(`${getApiPrefix(`events`)}${monitorId ? `/${monitorId}` : ''}?${requestQueries.join('&')}`,function(eventData){
        callback(eventData)
    })
}
function deleteVideo(video,callback){
    return new Promise((resolve,reject) => {
        var videoEndpoint = getApiPrefix(`videos`) + '/' + video.mid + '/' + video.filename
        $.getJSON(videoEndpoint + '/delete',function(data){
            if(callback)callback(data)
            resolve(data)
        })
    })
}
async function deleteVideos(videos){
    for (let i = 0; i < videos.length; i++) {
        var video = videos[i];
        await deleteVideo(video)
    }
}
function downloadVideo(video){
    var videoEndpoint = getApiPrefix(`videos`) + '/' + video.mid + '/' + video.filename
    downloadFile(videoEndpoint,video.filename)
}
async function downloadVideos(videos){
    for (let i = 0; i < videos.length; i++) {
        var video = videos[i];
        await downloadVideo(video)
    }
}
onWebSocketEvent(function(d){
    switch(d.f){
        case'video_delete':
            $('[file="'+d.filename+'"][mid="'+d.mid+'"]:not(.modal)').remove();
            $('[data-file="'+d.filename+'"][data-mid="'+d.mid+'"]:not(.modal)').remove();
            $('[data-time-formed="'+(new Date(d.time))+'"][data-mid="'+d.mid+'"]:not(.modal)').remove();
            var videoPlayerId = getVideoPlayerTabId(d)
            if(tabTree.name === videoPlayerId){
                goBackOneTab()
            }
            deleteTab(videoPlayerId)
            // if($.powerVideoWindow.currentDataObject&&$.powerVideoWindow.currentDataObject[d.filename]){
            //     delete($.timelapse.currentVideos[$.powerVideoWindow.currentDataObject[d.filename].position])
            //     $.powerVideoWindow.drawTimeline(false)
            // }
            // if($.timelapse.currentVideos&&$.timelapse.currentVideos[d.filename]){
            //     delete($.timelapse.currentVideosArray.videos[$.timelapse.currentVideos[d.filename].position])
            //     $.timelapse.drawTimeline(false)
            // }
            // if($.vidview.loadedVideos && $.vidview.loadedVideos[d.filename])delete($.vidview.loadedVideos[d.filename])
        break;
    }
})
$(document).ready(function(){
    $('body')
    .on('click','.open-video',function(e){
        e.preventDefault()
        var el = $(this).parents('[data-mid]')
        var monitorId = el.attr('data-mid')
        var videoTime = el.attr('data-time')
        var video = loadedVideosInMemory[`${monitorId}${videoTime}`]
        createVideoPlayerTab(video)
        return false;
    })
    .on('click','[video-time-seeked-video-position]',function(){
        var el = $(this)
        var monitorId = el.attr('data-mid')
        var videoTime = el.attr('video-time-seeked-video-position')
        var timeInward = (parseInt(el.attr('video-slice-seeked')) / 1000) - 2
        var video = loadedVideosInMemory[`${monitorId}${videoTime}`]
        timeInward = timeInward < 0 ? 0 : timeInward
        createVideoPlayerTab(video,timeInward)
    })
    .on('click','.delete-video',function(e){
        e.preventDefault()
        var el = $(this).parents('[data-mid]')
        var monitorId = el.attr('data-mid')
        var videoTime = el.attr('data-time')
        var video = loadedVideosInMemory[`${monitorId}${videoTime}`]
        var ext = video.filename.split('.')
        ext = ext[ext.length - 1]
        var videoEndpoint = getApiPrefix(`videos`) + '/' + video.mid + '/' + video.filename
        $.confirm.create({
            title: lang["Delete Video"] + ' : ' + video.filename,
            body: `${lang.DeleteVideoMsg}<br><br><div class="row"><video class="video_video" autoplay loop controls><source src="${videoEndpoint}" type="video/${ext}"></video></div>`,
            clickOptions: {
                title: '<i class="fa fa-trash-o"></i> ' + lang.Delete,
                class: 'btn-danger btn-sm'
            },
            clickCallback: function(){
                $.getJSON(videoEndpoint + '/delete',function(data){
                    if(data.ok){
                        console.log('Video Deleted')
                    }else{
                        console.log('Video Not Deleted',data,videoEndpoint)
                    }
                })
            }
        });
        return false;
    })
    .on('click','.fix-video',function(e){
        e.preventDefault()
        var el = $(this).parents('[data-mid]')
        var monitorId = el.attr('data-mid')
        var videoTime = el.attr('data-time')
        var video = loadedVideosInMemory[`${monitorId}${videoTime}`]
        var ext = video.filename.split('.')
        ext = ext[ext.length - 1]
        var videoEndpoint = getApiPrefix(`videos`) + '/' + video.mid + '/' + video.filename
        $.confirm.create({
            title: lang["Fix Video"] + ' : ' + video.filename,
            body: `${lang.FixVideoMsg}<br><br><div class="row"><video class="video_video" autoplay loop controls><source src="${videoEndpoint}" type="video/${ext}"></video></div>`,
            clickOptions: {
                title: '<i class="fa fa-wrench"></i> ' + lang.Fix,
                class: 'btn-danger btn-sm'
            },
            clickCallback: function(){
                $.getJSON(videoEndpoint + '/fix',function(data){
                    if(data.ok){
                        console.log('Video Fixed')
                    }else{
                        console.log('Video Not Fixed',data,videoEndpoint)
                    }
                })
            }
        });
        return false;
    })
})
