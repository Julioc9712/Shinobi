function saveReport(){
    // Icon : simple identifier with font awesome
    // Report ID: A unique identifier for each report.
    // Date and Time of Submission: The date and time when the report is submitted.
    // Submitted By: The name and contact information of the person or organization submitting the report.
    // Case Reference Number: If the video is related to a specific case, include the case number for easy reference.
    // Video Title: A brief title or description of the video.
    // Video Source: Information about where the video was sourced from (e.g., CCTV, personal device, etc.).
    // Location of Incident: The specific location where the incident in the video took place.
    // Date and Time of Incident: The exact date and time when the incident occurred.
    // Duration of Video: The length of the video.
    // Video Format: The format of the video file (e.g., MP4, AVI, etc.).
    // Description of Incident: A detailed description of the incident captured in the video.
    // Involved Parties: Information about the individuals or entities involved in the incident, if known.
    // Key Timestamps: Specific timestamps in the video where important events occur.
    // Attached Video File: The actual video file or a secure link to the video file.
    // Additional Notes: Any additional information or context that might be relevant to the incident.
    // Verification: A statement by the person submitting the report that the information provided is accurate to the best of their knowledge.
}
function emailReport(){}
function uploadReport(){}
function createVideoCard(video){
    var monitorId = video.mid
    var startTime = video.time
    var endTime = video.end
    var {
        day,
        month,
        year,
    } = getDayPartsFromTime(startTime)
    var eventMatrixHtml = ``
    eventMatrixHtml += `<div class="video-day-slice" data-mid="${video.mid}" data-time="${video.time}" style="width:${getVideoPercentWidthForDay(video,[video],frames)}%;position:relative">`
    if(video.events && video.events.length > 0){
        $.each(video.events,function(n,theEvent){
            var leftPercent = getPercentOfTimePositionFromVideo(video,theEvent)
            eventMatrixHtml += `<div class="video-time-needle video-time-needle-event" style="margin-left:${leftPercent}%"></div>`
        })
    }
    eventMatrixHtml += `</div>`
    eventMatrixHtml += `<div class="video-day-slice-spacer" style="width: ${marginRight}%"></div>`

    var html += `
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
                <div class="video-time-needle video-time-needle-seeker" video-time-seeked-video-position="${startTime}" data-mid="${monitorId}"></div>
            </div>
        </div>
    </div>`
    return html
}
