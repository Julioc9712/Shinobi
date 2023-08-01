$(document).ready(function(){
    var timeStripVideoCanvas = $('#timeline-video-canvas');
    var timeStripEl = $('#timeline-bottom-strip');
    var timeStripControls = $('#timeline-controls');
    var timeStripInfo = $('#timeline-info');
    var timeStripPreBuffers = $('#timeline-pre-buffers');
    var playToggles = timeStripControls.find('[timeline-action="playpause"]')
    var speedButtons = timeStripControls.find('[timeline-action="speed"]')
    var gridSizeButtons = timeStripControls.find('[timeline-action="gridSize"]')
    var currentTimeLabel = timeStripInfo.find('.current-time')
    var timelineActionButtons = timeStripControls.find('[timeline-action]')
    var timelineSpeed = 1;
    var timelineGridSizing = `md-6`;
    var timeStripVis = null;
    var timeStripVisTick = null;
    var timeStripVisItems = null;
    var timeStripCurrentStart = null;
    var timeStripCurrentEnd = new Date();
    var timeStripVisTickMovementInterval = null;
    var timeStripHollowClickQueue = {}
    var timeStripTickPosition = new Date()
    var timeStripPreBuffersEls = {}
    var timeStripListOfQueries = []
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
    function findGapsInSearchRanges(timeRanges, range) {
        timeRanges.sort((a, b) => a[0] - b[0]);
        let gaps = [];
        let currentEnd = new Date(range[0]);
        for (let i = 0; i < timeRanges.length; i++) {
            let [start, end] = timeRanges[i];
            if (start > currentEnd) {
                gaps.push([currentEnd, start]);
            }
            if (end > currentEnd) {
                currentEnd = end;
            }
        }
        if (currentEnd < range[1]) {
            gaps.push([currentEnd, range[1]]);
        }
        return gaps;
    }
    async function getVideosInGaps(gaps){
        var videos = []
        for (let i = 0; i < gaps.length; i++) {
            var range = gaps[i]
            videos.push(...(await getVideos({
                startDate: range[0],
                endDate: range[1],
                // searchQuery,
                // archived: false,
                // customVideoSet: wantCloudVideo ? 'cloudVideos' : null,
            },null,true)).videos);
        }
        return videos;
    }
    async function getVideosByTimeStripRange(addOrOverWrite){
        var stripDate = getTimestripDate()
        var startDate = stripDate.start
        var endDate = stripDate.end
        var gaps = findGapsInSearchRanges(timeStripListOfQueries, [startDate,endDate])
        timeStripListOfQueries.push(...gaps)
        var videos = await getVideosInGaps(gaps);
        videos = addVideoBeforeAndAfter(videos);
        loadedVideosOnTimeStrip.push(...videos)
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
        var preBufferHtml = ''
        $.each(loadedMonitors,function(monitorId,monitor){
            html += `<div class="timeline-video col-${timelineGridSizing} p-0 m-0 no-video" data-mid="${monitorId}" data-ke="${monitor.ke}"></div>`
            preBufferHtml += `<div class="timeline-video-buffer" data-mid="${monitorId}" data-ke="${monitor.ke}"></div>`
        })
        timeStripVideoCanvas.html(html)
        timeStripPreBuffers.html(preBufferHtml)
        $.each(selectedVideosByMonitorId,function(monitorId,video){
            if(!video)return;
            setVideoInCanvas(video)
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
        var dateNow = new Date()
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
        timeStripVisTick = timeStripVis.addCustomTime(dateNow, `${lang.Time}`);
        timeStripVis.on('click', async function(properties) {
            var currentlyPlaying = !!isPlaying;
            timeStripPlay(true)
            if(!timeChanging){
                var clickTime = properties.time;
                await resetTimeline(clickTime)
            }
            if(currentlyPlaying){
                setTimeout(() => {
                    timeStripPlay()
                },500)
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
        timeStripTickPosition = new Date(newDate)
        currentTimeLabel.text(`${timeAgo(newDate)}, ${formattedTime(newDate)}`)
        return timeStripVis.setCustomTime(newDate, timeStripVisTick);
    }
    function getTickDate() {
        return timeStripTickPosition;
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
        await getVideosByTimeStripRange()
        selectAndDrawVideosToCanvas(theTime,redrawVideos)
    }
    function getVideoContainerInCanvas(video){
        return timeStripVideoCanvas.find(`[data-mid="${video.mid}"][data-ke="${video.ke}"]`)
    }
    function getVideoElInCanvas(video){
        return getVideoContainerInCanvas(video).find('video')[0]
    }
    function getVideoContainerPreBufferEl(video){
        return timeStripPreBuffers.find(`[data-mid="${video.mid}"][data-ke="${video.ke}"]`)
    }
    function getWaitTimeUntilNextVideo(endTimeOfFirstVideo,startTimeOfNextVideo){
        return (new Date(startTimeOfNextVideo).getTime() - new Date(endTimeOfFirstVideo).getTime()) / timelineSpeed
    }
    function clearVideoInCanvas(oldVideo){
        var monitorId = oldVideo.mid
        loadedVideosOnCanvas[monitorId] = null
        loadedVideoElsOnCanvas[monitorId] = null
        var container = getVideoContainerInCanvas(oldVideo).addClass('no-video')
        var videoEl = container.find('video')
        videoEl.attr('src','')
        try{
            videoEl[0].pause()
        }catch(err){
            console.log(err)
        }
        container.empty()
    }
    function setVideoInCanvas(newVideo){
        var monitorId = newVideo.mid
        getVideoContainerInCanvas(newVideo).removeClass('no-video').html(`<video muted src="${newVideo.href}"></video>`)
        var vidEl = getVideoElInCanvas(newVideo)
        vidEl.playbackRate = timelineSpeed
        if(isPlaying)playVideo(vidEl)
        loadedVideoElsOnCanvas[monitorId] = vidEl
        loadedVideosOnCanvas[monitorId] = newVideo
        timeStripPreBuffersEls[monitorId] = getVideoContainerPreBufferEl(newVideo)
        queueNextVideo(newVideo)
    }
    function setTimeOfCanvasVideos(newTime){
        $.each(loadedVideosOnCanvas,function(n,video){
            if(!video)return;
            var monitorId = video.mid
            var timeAfterStart = (newTime - new Date(video.time)) / 1000;
            var videoEl = loadedVideoElsOnCanvas[monitorId]
            videoEl.currentTime = timeAfterStart
            // playVideo(videoEl)
            // pauseVideo(videoEl)
        })
    }
    function queueNextVideo(video){
        if(!video)return;
        var monitorId = video.mid
        var videoEl = loadedVideoElsOnCanvas[monitorId]
        var videoAfter = video.videoAfter
        videoEl.onerror = function(err){
            err.preventDefault()
            console.error(`video error`)
            console.error(err)
        }
        videoEl.ontimeupdate = function(){
            if(videoEl.currentTime >= videoEl.duration){
                clearVideoInCanvas(video)
                if(videoAfter){
                    var waitTimeTimeTillNext = getWaitTimeUntilNextVideo(video.end,videoAfter.time)
                    // console.log('End of Video',video)
                    // console.log('Video After',videoAfter)
                    // console.log('Starting in ',waitTimeTimeTillNext / 1000, 'seconds')
                    loadedVideoElsOnCanvasNextVideoTimeout[monitorId] = setTimeout(() => {
                        setVideoInCanvas(videoAfter)
                    },waitTimeTimeTillNext)
                // }else{
                    // console.log('End of Timeline for Monitor',loadedMonitors[monitorId].name)
                }
            }
        }
        // pre-buffer it
        timeStripPreBuffersEls[monitorId].html(videoAfter ? `<video preload="auto" muted src="${videoAfter.href}"></video>` : '')
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
                clearTimeout(loadedVideoElsOnCanvasNextVideoTimeout[monitorId])
                if(foundVideo){
                    var waitTimeTimeTillNext = getWaitTimeUntilNextVideo(tickTime,foundVideo.time)
                    // console.log('Found Video',foundVideo)
                    // console.log('Video Starts in ',waitTimeTimeTillNext / 1000, 'seconds after Play')
                    timeStripHollowClickQueue[monitorId] = () => {
                        // console.log('Hollow Start Point for',loadedMonitors[monitorId].name)
                        loadedVideoElsOnCanvasNextVideoTimeout[monitorId] = setTimeout(() => {
                            // console.log('Hollow Replace')
                            setVideoInCanvas(foundVideo)
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
            videoEl.playbackRate = timelineSpeed
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
    function timeStripPlay(forcePause){
        if(!forcePause && !isPlaying){
            isPlaying = true
            var currentDate = getTickDate().getTime();
            var msSpeed = 50
            var addition = (msSpeed * timelineSpeed) + 0
            runHollowClickQueues()
            playAllVideos()
            timeStripVisTickMovementInterval = setInterval(function() {
                var newTime = new Date(currentDate + addition)
                setTickDate(newTime);
                // setTimeOfCanvasVideos(newTime)
                addition += (msSpeed * timelineSpeed);
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
        timeStripPlay(true)
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
        var currentlyPlaying = !!isPlaying;
        if(currentlyPlaying)timeStripPlay(true);
        timelineSpeed = newSpeed + 0
        setHollowClickQueue()
        if(currentlyPlaying)timeStripPlay();
    }
    function adjustTimelineGridSize(newCol){
        timelineGridSizing = `${newCol}`
        var containerEls = timeStripVideoCanvas.find('.timeline-video')
        containerEls.removeClass (function (index, className) {
            return (className.match (/(^|\s)col-\S+/g) || []).join(' ');
        }).addClass(`col-${newCol}`)
    }
    function refreshTimeline(){
        timeStripListOfQueries = []
        loadedVideosOnTimeStrip = []
        createTimeline()
        reloadTimeline()
    }
    timelineActionButtons.click(function(){
        var el = $(this)
        var type = el.attr('timeline-action')
        switch(type){
            case'playpause':
                timeStripPlay()
            break;
            case'downloadAll':
                if(featureIsActivated(true)){
                    downloadAllPlayingVideos()
                }
            break;
            case'jumpLeft':
                jumpTimeline(5000,'left')
            break;
            case'jumpRight':
                jumpTimeline(5000,'right')
            break;
            case'speed':
                var speed = parseInt(el.attr('speed'))
                if(featureIsActivated(true)){
                    adjustTimelineSpeed(speed)
                    speedButtons.removeClass('btn-success')
                    el.addClass('btn-success')
                }
            break;
            case'gridSize':
                var size = `md-${parseInt(el.attr('size'))}`
                adjustTimelineGridSize(size)
                gridSizeButtons.removeClass('btn-success')
                el.addClass('btn-success')
            break;
            case'refresh':
                refreshTimeline()
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
        timeStripPlay(true)
    })
    if(isChromiumBased){
        [ 7, 10 ].forEach((speed) => {
            timeStripControls.find(`[timeline-action="speed"][speed="${speed}"]`).remove()
        });
    }
})
