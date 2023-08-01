$(document).ready(function(){
    var timeStripVideoCanvas = $('#timeline-video-canvas');
    var timeStripEl = $('#timeline-bottom-strip');
    var timeStripControls = $('#timeline-controls');
    var timeStripInfo = $('#timeline-info');
    var playToggles = timeStripControls.find('[timeline-action="playpause"]')
    var currentTimeLabel = timeStripInfo.find('.current-time')
    var timelineActionButtons = timeStripControls.find('[timeline-action]')
    var timelineSpeed = 1;
    var timeStripVis = null;
    var timeStripVisTick = null;
    var timeStripVisItems = null;
    var timeStripVisTickMovementInterval = null;
    var timeStripHollowClickQueue = {}
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
        // addOrOverWrite ? loadedVideosOnTimeStrip.push(...videos) :
        loadedVideosOnTimeStrip = videos;
        resetTimelineItems(loadedVideosOnTimeStrip)
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
        $.each(loadedMonitors,function(monitorId,monitor){
            var video = selectedVideosByMonitorId[monitorId]
            if(video){
                var href = video.href;
                html += `<div class="timeline-video col-md-6 p-0 m-0" data-mid="${monitorId}" data-ke="${monitor.ke}"><video src="${href}"></video></div>`
            }else{
                html += `<div class="timeline-video col-md-6 p-0 m-0 no-video" data-mid="${monitorId}" data-ke="${monitor.ke}"></div>`
            }
        })
        timeStripVideoCanvas.html(html)
        $.each(selectedVideosByMonitorId,function(monitorId,video){
            if(!video)return;
            loadedVideoElsOnCanvas[monitorId] = getVideoElInCanvas(video)
            queueNextVideo(video)
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
    async function resetTimeline(clickTime){
        await getAndDrawVideosToTimeline(clickTime,true)
        setTickDate(clickTime)
        setTimeOfCanvasVideos(clickTime)
        setHollowClickQueue()
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
                await resetTimeline(clickTime)
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
            },1000)
        })
        setTimeout(function(){
            timeStripEl.find('.vis-timeline').resize()
        },2000)
    }
    function setTickDate(newDate){
        // console.log(newDate)
        currentTimeLabel.text(newDate)
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
            var container = getVideoContainerInCanvas(oldVideo).addClass('no-video')
            var videoEl = container.find('video')
            videoEl.attr('src','')
            try{
                videoEl.pause()
            }catch(err){

            }
            container.empty()
        }else{
            getVideoContainerInCanvas(newVideo).removeClass('no-video').html(`<video ${isPlaying ? `autoplay` : ''} src="${newVideo.href}"></video>`)
            loadedVideoElsOnCanvas[monitorId] = getVideoElInCanvas(newVideo)
            loadedVideosOnCanvas[monitorId] = newVideo
            queueNextVideo(newVideo)
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
            playVideo()
            pauseVideo()
        })
    }
    function queueNextVideo(video){
        if(!video)return;
        var monitorId = video.mid
        var videoEl = loadedVideoElsOnCanvas[monitorId][0]
        var videoAfter = video.videoAfter
        videoEl.ontimeupdate = function(){
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
                // }else{
                    // console.log('End of Timeline for Monitor',loadedMonitors[monitorId].name)
                }
            }
        }
    }
    function findVideoAfterTime(time, monitorId) {
        let inputTime = new Date(time);
        let matchingVideos = loadedVideosOnTimeStrip.filter(video => {
            let videoTime = new Date(video.time);
            return video.mid === monitorId && videoTime > inputTime;
        });
        matchingVideos.sort((a, b) => new Date(a.time) - new Date(b.time));
        return matchingVideos.length > 0 ? matchingVideos[0] : null;
    }
    function setHollowClickQueue(){
        $.each(loadedVideosOnCanvas,function(monitorId,video){
            if(!video){
                // console.log(`Add Hollow Action`, loadedMonitors[monitorId].name)
                var tickTime = getTickDate()
                var foundVideo = findVideoAfterTime(tickTime,monitorId)
                if(foundVideo){
                    var waitTimeTimeTillNext = getWaitTimeUntilNextVideo(tickTime,foundVideo.time)
                    // console.log('Found Video',foundVideo)
                    // console.log('Video Starts in ',waitTimeTimeTillNext / 1000, 'seconds after Play')
                    timeStripHollowClickQueue[monitorId] = () => {
                        // console.log('Hollow Start Point for',loadedMonitors[monitorId].name)
                        loadedVideoElsOnCanvasNextVideoTimeout[monitorId] = setTimeout(() => {
                            // console.log('Hollow Replace')
                            replaceVideoInCanvas(foundVideo,foundVideo)
                        },waitTimeTimeTillNext)
                    }
                }else{
                    // console.log('End of Timeline for Monitor',loadedMonitors[monitorId].name)
                    timeStripHollowClickQueue[monitorId] = () => {}
                }
            }else{
                timeStripHollowClickQueue[monitorId] = () => {}
            }
        })
    }
    function runHollowClickQueues(){
        $.each(timeStripHollowClickQueue,function(monitorId,theAction){
            theAction()
        })
    }
    function getAllActiveVideosInSlots(){
        return timeStripVideoCanvas.find('video')
    }
    function playVideo(videoEl){
        try{
            videoEl.play()
        }catch(err){
            console.log(err)
        }
    }
    function pauseVideo(videoEl){
        try{
            videoEl.pause()
        }catch(err){
            console.log(err)
        }
    }
    function playAllVideos(){
        getAllActiveVideosInSlots().each(function(n,video){
            playVideo(video)
        })
    }
    function pauseAllVideos(){
        getAllActiveVideosInSlots().each(function(n,video){
            pauseVideo(video)
        })
    }
    function setPlayToggleUI(icon){
        playToggles.html(`<i class="fa fa-${icon}"></i>`)
    }
    function timeStripPlay(){
        if(!isPlaying){
            isPlaying = true
            var currentDate = getTickDate().getTime();
            var msSpeed = 50
            var addition = msSpeed + 0
            runHollowClickQueues()
            playAllVideos()
            timeStripVisTickMovementInterval = setInterval(function() {
                var newTime = new Date(currentDate + addition)
                setTickDate(newTime);
                // setTimeOfCanvasVideos(newTime)
                addition += msSpeed;
            }, msSpeed)
            setPlayToggleUI(`pause-circle-o`)
        }else{
            isPlaying = false
            pauseAllVideos()
            clearInterval(timeStripVisTickMovementInterval)
            $.each(loadedVideoElsOnCanvasNextVideoTimeout,function(n,timeout){
                clearTimeout(timeout)
            })
            setPlayToggleUI(`play-circle-o`)
        }
    }
    function downloadPlayingVideo(video){
        if(video.currentSrc){
            var filename = getFilenameFromUrl(video.currentSrc)
            downloadFile(video.currentSrc,filename)
        }
    }
    function downloadAllPlayingVideos(){
        getAllActiveVideosInSlots().each(function(n,video){
            downloadPlayingVideo(video)
        })
    }
    async function jumpTimeline(amountInMs,direction){
        if(isPlaying){
            timeStripPlay()
        }
        var tickTime = getTickDate().getTime()
        var newTime = 0;
        if(direction === 'right'){
            newTime = tickTime + amountInMs
        }else{
            newTime = tickTime - amountInMs
        }
        newTime = new Date(newTime)
        await resetTimeline(newTime)
    }
    function adjustTimelineSpeed(newSpeed){
        timelineSpeed = newSpeed + 0
    }
    timelineActionButtons.click(function(){
        var el = $(this)
        var type = el.attr('timeline-action')
        switch(type){
            case'playpause':
                timeStripPlay()
            break;
            case'downloadAll':
                downloadAllPlayingVideos()
            break;
            case'jumpLeft':
                jumpTimeline(5000,'left')
            break;
            case'jumpRight':
                jumpTimeline(5000,'right')
            break;
            case'speed':
                var speed = parseInt(el.attr('speed'))
                adjustTimelineSpeed(speed)
            break;
        }
    })
    addOnTabOpen('timeline', function () {
        createTimeline()
        reloadTimeline()
    })
    addOnTabReopen('timeline', function () {
        // createTimeline()
        // reloadTimeline()
    })
    addOnTabAway('timeline', function () {
        // destroyTimeline()
        if(!isPlaying){
            timeStripPlay()
        }
    })
})
