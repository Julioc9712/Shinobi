$(document).ready(function(){
    var theTab = $('#tab-reportManagerForm')
    var theForm = theTab.find('form')
    var videoSelectContainer = $('#report-manager-video-select')
    var selectedContainer = $('#report-manager-video-selected')
    var monitorsList = theTab.find('.monitors_list')
    var dateSelector = theTab.find('.date_selector')
    var searchField = $('#report-manager-search-tag')
    function getFormDetails(form){
        var theObject = {}
        form.find('[detail]').each(function(n,v){
            var el = $(this)
            var key = el.attr('detail')
            var value = el.val()
            theObject[key] = value
        })
        return theObject
    }
    function saveReport(){
        var form = theForm.serializeObject()
        var videos = getAllSelectedVideos()
        var details = getFormDetails(theForm)
        var postData = Object.assign({
            videos,
            details,
        },form);
        $.post(getApiPrefix('reports'),postData,function(data){
            console.log('reports response',data)
        })
    }
    function emailReport(){}
    function uploadReport(){}
    function createVideoCard(video,classOverride){
        var monitorId = video.mid
        var startTime = video.time
        var endTime = video.end
        var {
            day,
            month,
            year,
        } = getDayPartsFromTime(startTime)
        var firstFrame = video.timelapseFrames && video.timelapseFrames[0] ? video.timelapseFrames[0] : {href:''}
        console.log(firstFrame,video.timelapseFrames)
        var eventMatrixHtml = ``
        eventMatrixHtml += `<div class="video-day-slice" data-mid="${video.mid}" data-time="${video.time}" style="width:100%;position:relative">`
        if(video.events && video.events.length > 0){
            $.each(video.events,function(n,theEvent){
                var leftPercent = getPercentOfTimePositionFromVideo(video,theEvent)
                eventMatrixHtml += `<div class="video-time-needle video-time-needle-event" style="margin-left:${leftPercent}%"></div>`
            })
        }
        eventMatrixHtml += `</div>`
        eventMatrixHtml += `<div class="video-day-slice-spacer"></div>`

        var html = `
        <div class="video-row video-time-card-container ${classOverride ? classOverride : `col-md-12 col-lg-6 mb-3`} search-row">
            <div data-ke="${video.ke}" data-mid="${video.mid}" data-time="${video.time}" class="video-time-card shadow-sm px-0 ${definitions.Theme.isDark ? 'bg-dark' : 'bg-light'}">
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
                    <div class="px-3 pb-3">
                        <a class="btn btn-sm btn-success play-video" title="${lang.Play}"><i class=" fa fa-play-circle"></i></a>
                    </div>
                </div>
                <div class="text-center video-card-playback-view" style="position:relative">
                    <img class="video-time-img" src="${firstFrame.href}">
                </div>
                <div class="video-time-strip card-footer p-0">
                    <div class="flex-row d-flex" style="height:30px">${eventMatrixHtml}</div>
                </div>
            </div>
        </div>`
        return html
    }
    function loadVideoCards(videos){
        var dateRange = getSelectedTime(dateSelector)
        var startDate = dateRange.startDate
        var endDate = dateRange.endDate
        var monitorId = monitorsList.val()
        var searchQuery = searchField.val()
        getVideos({
            monitorId,
            startDate,
            endDate,
            searchQuery,
            archived: false,
        },function(data){
            var html = ''
            var videos = data.videos
            loadedReportVideos = {}
            $.each(videos,function(n,video){
                loadedReportVideos[`${video.ke}${video.mid}${video.time}`] = video;
                html += createVideoCard(video)
            })
            videoSelectContainer.html(html)
        })
    }
    function getAllSelectedVideos(){
        var selected = []
        videoSelectContainer.find('.video-time-card.selected').each(function(){
            var el = $(this)
            var ke = el.attr('data-ke')
            var mid = el.attr('data-mid')
            var time = el.attr('data-time')
            var video = loadedReportVideos[`${ke}${mid}${time}`]
            selected.push({
                ke,
                mid,
                time: video.time,
                filename: video.filename,
                details: video.details,
                frames: video.timelapseFrames.map(item => {
                    return {
                        ke: item.ke,
                        mid: item.mid,
                        time: item.time,
                        filename: item.filename,
                    }
                }),
                events: video.events,
            })
        })
        return selected
    }
    function loadVideoIntoVideoCard(playButton){
        var timeCard = playButton.parents('.video-time-card')
        var playBackContainer = timeCard.find('.video-card-playback-view')
        var groupKey = timeCard.attr('data-ke')
        var monitorId = timeCard.attr('data-mid')
        var time = timeCard.attr('data-time')
        var video = loadedReportVideos[`${groupKey}${monitorId}${time}`]
        playBackContainer.html(`<video controls autoplay src="${video.href}"></video>`)
    }
    addOnTabOpen('reportManagerForm', function () {
        loadVideoCards()
    })
    addOnTabAway('reportManagerForm', function () {

    })
    loadDateRangePicker(dateSelector,{
        onChange: function(start, end, label) {
            loadVideoCards()
        }
    })
    loadDateRangePicker(theForm.find('[name="incidentTime"]'),{
        singleDatePicker: true,
    })
    drawMonitorListToSelector(monitorsList.find('optgroup'))
    videoSelectContainer.on('click','.video-time-card',function(){
        var el = $(this)
        el.toggleClass('selected')
    })
    videoSelectContainer.on('click','.play-video',function(){
        var el = $(this)
        loadVideoIntoVideoCard(el)
    })
    theForm.submit(function(e){
        e.preventDefault()
        saveReport()
        return false;
    })
})
