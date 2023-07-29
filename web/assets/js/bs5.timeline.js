$(document).ready(function(){
    var timeStripVideoCanvas = $('#timeline-video-canvas');
    var timeStripEl = $('#timeline-bottom-strip');
    var timeStripControls = $('#timeline-controls');
    var timeStripVis = null;
    var timeStripVisTick = null;
    var timeStripVisTickMovementInterval = null;
    var loadedVideosOnTimeStrip = []
    var loadedVideosOnCanvas = {}
    var loadedVideoElsOnCanvas = {}
    var isPlaying = false
    async function getVideosByTime(addOrOverWrite){
        var startDate = getTickDate()
        var endDate = getTimestripDate().end
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
          return date >= startTime && date <= endTime;
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
    function createTimeline(){
        var timeChanging = false
        try{
            timeStripVis.destroy()
        }catch(err){
            console.log(err)
        }
        //empty items
        var items = new vis.DataSet([]);
        // make chart
        timeStripVis = new vis.Timeline(timeStripEl[0], items, {
            showCurrentTime: false
        });
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
            setTimeout(function(){
                timeChanging = false
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
        var startDateInView = visibleWindow.start;
        var endDateInView = visibleWindow.end;
        return endDateInView;
    }
    function reloadTimeline(){
        var theTime = new Date()
        getAndDrawVideos(theTime,true)
    }
    async function getAndDrawVideos(theTime,redrawVideos){
        var videos = await getVideosByTime()
        var selectedVideosForTime = selectVideosForCanvas(theTime,videos)
        loadedVideosOnCanvas = selectedVideosForTime;
        if(redrawVideos)drawVideosToCanvas(selectedVideosForTime);
    }
    function getVideoElInCanvas(video){
        return timeStripVideoCanvas.find(`[data-mid="${video.mid}"][data-ke="${video.ke}"][data-filename="${video.filename}"]`)
    }
    function setTimeOfCanvasVideos(newTime){
        $.each(loadedVideosOnCanvas,function(n,video){
            if(!video)return;
            var timeAfterStart = (newTime - new Date(video.time)) / 1000;
            loadedVideoElsOnCanvas[monitorId][0].currentTime = timeAfterStart
        })
    }
    function timeStripPlay(){
        if(!isPlaying){
            isPlaying = true
            var currentDate = getTickDate().getTime();
            var addition = 50
            timeStripVisTickMovementInterval = setInterval(function() {
                var newTime = new Date(currentDate + addition)
                setTickDate(newTime);
                setTimeOfCanvasVideos(newTime)
                addition += 50;
                console.log(newTime,addition)
            }, 50)
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

    })
    addOnTabAway('timeline', function () {

    })
})
