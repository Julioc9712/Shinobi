const moment = require('moment')
module.exports = function(s,config,lang){
    const {
        createEventBasedRecording,
    } = require('../events/utils.js')(s,config,lang)
    const {
        addExtenderAction,
    } = require('./utils.js')(s,config)
    // static actions
    addExtenderAction('forceRecord',(groupKey,item,data) => {
        function beginRecording(monitorId){
            const monitorConfig = s.group[groupKey].rawMonitorConfigurations[monitorId]
            const monitorDetails = monitorConfig.details
            const secondBefore = (parseInt(monitorDetails.detector_buffer_seconds_before) || 5) + 1
            createEventBasedRecording(monitor,moment(eventTime).subtract(secondBefore,'seconds').format('YYYY-MM-DDTHH-mm-ss'))
        }
        function recurseMonitorIds(monitorIds){
            for (let i = 0; i < monitorIds.length; i++) {
                const monitorId = item[i]
                beginRecording(monitorId)
            }
        }
        if(item.allMonitors){
            const monitorIds = Object.keys(s.group[groupKey].rawMonitorConfigurations)
            recurseMonitorIds(monitorIds)
        }else{
            if(item.monitorIds)recurseMonitorIds(item.monitorIds);
            // for (let i = 0; i < item.monitorTags.length; i++) {
            //     const monitorIds = someHowGetMonitorIdsFromTag(item[i])
            //     recurseMonitorIds(monitorIds)
            // }
        }
    })
    addExtenderAction('createLog',(groupKey,item,data) => {
        s.userLog({
            ke: groupKey,
            mid: monitorId,
        },{
            type: item.title,
            text: item.text
        });
    })
}
