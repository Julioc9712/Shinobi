$(document).ready(function(){
    var timeStripVideoCanvas = $('#timeline-video-canvas');
    var timeStripEl = $('#timeline-bottom-strip');
    var timeStripControls = $('#timeline-controls');
    var timeStripVis = null;
    var timeStripVisTick = null;
    var timeStripVisItems = null;
    var timeStripVisTickMovementInterval = null;
    var loadedVideosOnTimeStrip = []
    var loadedVideosOnCanvas = {}
    var loadedVideoElsOnCanvas = {}
    var loadedVideoElsOnCanvasNextVideoTimeout = {}
    var isPlaying = false
    var earliestStart = null
    var latestEnd = null
    function addVideoBeforeAndAfter(videos) {
        videos.sort((a, b) => {
            if (a.mid === b.mid) {
                return new Date(a.time) - new Date(b.time);
            }
            return a.mid.localeCompare(b.mid);
        });
        for (let i = 0; i < videos.length; i++) {
            if (i > 0 && videos[i].mid === videos[i - 1].mid) {
                videos[i].videoBefore = videos[i - 1];
            } else {
                videos[i].videoBefore = null;
            }
            if (i < videos.length - 1 && videos[i].mid === videos[i + 1].mid) {
                videos[i].videoAfter = videos[i + 1];
            } else {
                videos[i].videoAfter = null;
            }
        }
        return videos;
    }
    async function getVideosByTime(addOrOverWrite){
        var stripDate = getTimestripDate()
        var startDate = stripDate.start
        var endDate = stripDate.end
        if(!earliestStart || startDate < earliestStart){
            earliestStart = startDate
        }
        if(!latestEnd || endDate > latestEnd){
            latestEnd = endDate
        }
        if(latestEnd > endDate && earliestStart < startDate){
            //inside a previously larger query, do nothing
            // console.log(`Using data in memory`)
            return [];
        // }else{
            // console.log(`New TimeFrame`)
        }
        // console.log(`earliestStart < startDate`,earliestStart < startDate)
        // console.log(`latestEnd > endDate`,latestEnd > endDate)
        // console.log(`earliestStart`,earliestStart)
        // console.log(`startDate`,startDate)
        // console.log(`latestEnd`,latestEnd)
        // console.log(`endDate`,endDate)
        var videos = (await getVideos({
            startDate,
            endDate,
            // searchQuery,
            // archived: false,
            // customVideoSet: wantCloudVideo ? 'cloudVideos' : null,
        })).videos;
        videos = addVideoBeforeAndAfter(videos);
        addOrOverWrite ? loadedVideosOnTimeStrip.push(...videos) : loadedVideosOnTimeStrip = videos;
        return loadedVideosOnTimeStrip
    }
    function selectVideosForCanvas(time, videos){
        var selectedVideosByMonitorId = {}
        $.each(loadedMonitors,function(n,monitor){
            selectedVideosByMonitorId[monitor.mid] = null
        })
        var filteredVideos = videos.filter(video => {
          var startTime = new Date(video.time);
          var endTime = new Date(video.end);
          return time >= startTime && time <= endTime;
        });
        $.each(filteredVideos,function(n,video){
            selectedVideosByMonitorId[video.mid] = video;
        })
        return selectedVideosByMonitorId;
    }
    function drawVideosToCanvas(selectedVideosByMonitorId){
        var html = ''
        $.each(selectedVideosByMonitorId,function(monitorId,video){
            if(video){
                var href = video.href;
                html += `<div class="timeline-video col-md-6 p-0 m-0" data-mid="${monitorId}" data-ke="${video.ke}"><video src="${href}"></video></div>`
            }else{
                html += `<div class="timeline-video col-md-6 p-0 m-0 no-video"></div>`
            }
        })
        timeStripVideoCanvas.html(html)
        $.each(selectedVideosByMonitorId,function(monitorId,video){
            if(!video)return;
            loadedVideoElsOnCanvas[monitorId] = getVideoElInCanvas(video)
        })
    }
    function destroyTimeline(){
        try{
            timeStripVis.destroy()
        }catch(err){
            console.log(err)
        }
    }
    function formatVideosForTimeline(videos){
        var i = 0;
        var formattedVideos = (videos || []).map((item) => {
            ++i;
            return {
                id: i,
                content: item.objectTags || '',
                start: item.time,
                end: item.end,
                group: 1
            }
        });
        return formattedVideos
    }
    function createTimelineItems(videos){
        var items = new vis.DataSet(formatVideosForTimeline(videos));
        var groups = new vis.DataSet([
          {id: 1, content: ''}
        ]);
        timeStripVisItems = items
        return {
            items,
            groups,
        }
    }
    function resetTimelineItems(videos){
        var newVideos = formatVideosForTimeline(videos)
        timeStripVisItems.clear();
        timeStripVisItems.add(newVideos);
    }
    function createTimeline(videos){
        var timeChanging = false
        var timeChangingTimeout = null
        destroyTimeline()
        var {
            items,
            groups,
        } = createTimelineItems(videos)
        // make chart
        timeStripVis = new vis.Timeline(timeStripEl[0], items, groups, {
            showCurrentTime: false,
            stack: false,
        });
        // make tick
        timeStripVisTick = timeStripVis.addCustomTime(new Date(), `${lang.Time}`);
        timeStripVis.on('click', async function(properties) {
            if(!timeChanging){
                var clickTime = properties.time;
                await getAndDrawVideosToTimeline(clickTime,true)
                setTickDate(clickTime)
                setTimeOfCanvasVideos(clickTime)
            }
            if(isPlaying){
                timeStripPlay()
            }
        });
        timeStripVis.on('rangechange', function(properties){
            timeChanging = true
        })
        timeStripVis.on('rangechanged', function(properties){
            clearTimeout(timeChangingTimeout)
            timeChangingTimeout = setTimeout(function(){
                var clickTime = properties.time;
                timeChanging = false
                getAndDrawVideosToTimeline(clickTime)
            },300)
        })
        setTimeout(function(){
            timeStripEl.find('.vis-timeline').resize()
        },2000)
    }
    function setTickDate(newDate){
        // console.log(newDate)
        return timeStripVis.setCustomTime(newDate, timeStripVisTick);
    }
    function getTickDate() {
        return timeStripVis.getCustomTime(timeStripVisTick);
    }
    function getTimestripDate() {
        var visibleWindow = timeStripVis.getWindow();
        var start = visibleWindow.start;
        var end = visibleWindow.end;
        return {
            start,
            end
        };
    }
    function reloadTimeline(){
        var theTime = new Date()
        getAndDrawVideosToTimeline(theTime,true)
    }
    function selectAndDrawVideosToCanvas(theTime,redrawVideos){
        var selectedVideosForTime = selectVideosForCanvas(theTime,loadedVideosOnTimeStrip)
        loadedVideosOnCanvas = selectedVideosForTime;
        if(redrawVideos){
            drawVideosToCanvas(selectedVideosForTime)
        }
    }
    async function getAndDrawVideosToTimeline(theTime,redrawVideos){
        await getVideosByTime()
        resetTimelineItems(loadedVideosOnTimeStrip)
        selectAndDrawVideosToCanvas(theTime,redrawVideos)
    }
    function getVideoContainerInCanvas(video){
        return timeStripVideoCanvas.find(`[data-mid="${video.mid}"][data-ke="${video.ke}"]`)
    }
    function getVideoElInCanvas(video){
        return getVideoContainerInCanvas(video).find('video')
    }
    function getWaitTimeUntilNextVideo(endTimeOfFirstVideo,startTimeOfNextVideo){
        return new Date(startTimeOfNextVideo).getTime() - new Date(endTimeOfFirstVideo).getTime()
    }
    function replaceVideoInCanvas(oldVideo,newVideo){
        var monitorId = oldVideo.mid
        if(!newVideo){
            loadedVideosOnCanvas[monitorId] = null
            loadedVideoElsOnCanvas[monitorId] = null
            var container = getVideoContainerInCanvas(oldVideo)
            var videoEl = container.find('video')
            videoEl.attr('src','')
            try{
                videoEl.pause()
            }catch(err){

            }
            container.empty()
        }else{
            loadedVideosOnCanvas[monitorId] = newVideo
            getVideoContainerInCanvas(oldVideo).html(`<video src="${newVideo.href}"></video>`)
            loadedVideoElsOnCanvas[monitorId] = getVideoElInCanvas(newVideo)
        }
    }
    function setTimeOfCanvasVideos(newTime){
        $.each(loadedVideosOnCanvas,function(n,video){
            if(!video)return;
            var monitorId = video.mid
            var timeAfterStart = (newTime - new Date(video.time)) / 1000;
            var videoEl = loadedVideoElsOnCanvas[monitorId][0]
            var videoAfter = video.videoAfter
            videoEl.currentTime = timeAfterStart
            try{
                videoEl.play()
            }catch(err){
                console.log(err,videoEl)
            }
            try{
                videoEl.pause()
            }catch(err){
                console.log(err,videoEl)
            }
            if(videoEl.currentTime >= videoEl.duration){
                replaceVideoInCanvas(video)
                if(videoAfter){
                    var waitTimeTimeTillNext = getWaitTimeUntilNextVideo(video.end,videoAfter.time)
                    // console.log('End of Video',video)
                    // console.log('Video After',videoAfter)
                    // console.log('Starting in ',waitTimeTimeTillNext / 1000, 'seconds')
                    loadedVideoElsOnCanvasNextVideoTimeout[monitorId] = setTimeout(() => {
                        replaceVideoInCanvas(video,videoAfter)
                    },waitTimeTimeTillNext)
                }else{
                    console.log('End of Timeline for Monitor',loadedMonitors[monitorId].name)
                }
            }
        })
    }
    function timeStripPlay(){
        if(!isPlaying){
            isPlaying = true
            var currentDate = getTickDate().getTime();
            var msSpeed = 50
            var addition = msSpeed + 0
            timeStripVisTickMovementInterval = setInterval(function() {
                var newTime = new Date(currentDate + addition)
                setTickDate(newTime);
                setTimeOfCanvasVideos(newTime)
                addition += msSpeed;
            }, msSpeed)
        }else{
            isPlaying = false
            clearInterval(timeStripVisTickMovementInterval)
            $.each(loadedVideoElsOnCanvasNextVideoTimeout,function(n,timeout){
                clearTimeout(timeout)
            })
        }
    }
    timeStripControls.find('.play-toggle').click(function(){
        timeStripPlay()
    })
    addOnTabOpen('timeline', function () {
        createTimeline()
        reloadTimeline()
    })
    addOnTabReopen('timeline', function () {
        createTimeline()
        reloadTimeline()
    })
    addOnTabAway('timeline', function () {
        destroyTimeline()
    })
})
