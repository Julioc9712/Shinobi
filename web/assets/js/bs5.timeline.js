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
    var isPlaying = false
    var earliestStart = null
    var latestEnd = null
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
                html += `<div class="timeline-video col-md-6 p-0 m-0" data-mid="${monitorId}" data-ke="${video.ke}" data-filename="${video.filename}"><video src="${href}"></video></div>`
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
        console.log(timeStripVis,items)
        // make tick
        timeStripVisTick = timeStripVis.addCustomTime(new Date(), `${lang.Time}`);
        timeStripVis.on('click', function(properties) {
            if(!timeChanging){
                var clickTime = properties.time;
                getAndDrawVideos(clickTime,true)
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
                getAndDrawVideos(clickTime)
            },300)
        })
        setTimeout(function(){
            timeStripEl.find('.vis-timeline').resize()
        },2000)
    }
    function setTickDate(newDate){
        console.log(newDate)
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
        getAndDrawVideos(theTime,true)
    }
    async function getAndDrawVideos(theTime,redrawVideos){
        await getVideosByTime()
        var selectedVideosForTime = selectVideosForCanvas(theTime,loadedVideosOnTimeStrip)
        loadedVideosOnCanvas = selectedVideosForTime;
        if(redrawVideos){
            drawVideosToCanvas(selectedVideosForTime)
        }
        resetTimelineItems(loadedVideosOnTimeStrip)
    }
    function getVideoElInCanvas(video){
        return timeStripVideoCanvas.find(`[data-mid="${video.mid}"][data-ke="${video.ke}"][data-filename="${video.filename}"] video`)
    }
    function setTimeOfCanvasVideos(newTime){
        $.each(loadedVideosOnCanvas,function(n,video){
            if(!video)return;
            var monitorId = video.mid
            var timeAfterStart = (newTime - new Date(video.time)) / 1000;
            var videoEl = loadedVideoElsOnCanvas[monitorId][0]
            try{
                videoEl.play()
            }catch(err){
                console.log(err,videoEl)
            }
            console.log(videoEl,timeAfterStart)
            videoEl.currentTime = timeAfterStart
            try{
                videoEl.pause()
            }catch(err){
                console.log(err,videoEl)
            }
        })
    }
    function timeStripPlay(){
        if(!isPlaying){
            isPlaying = true
            var currentDate = getTickDate().getTime();
            var numberOfAddition = 100
            var addition = numberOfAddition + 0
            timeStripVisTickMovementInterval = setInterval(function() {
                var newTime = new Date(currentDate + addition)
                setTickDate(newTime);
                setTimeOfCanvasVideos(newTime)
                addition += numberOfAddition;
            }, numberOfAddition)
        }else{
            isPlaying = false
            clearInterval(timeStripVisTickMovementInterval)
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
