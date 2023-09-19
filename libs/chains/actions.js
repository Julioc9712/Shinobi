const moment = require('moment')
module.exports = function(s,config,lang){
    const {
        findMonitorsAssociatedToTags,
        createEventBasedRecording,
    } = require('../events/utils.js')(s,config,lang)
    const {
        addExtenderAction,
        getMonitorIdFromData,
        doMonitorActionForItem,
    } = require('./utils.js')(s,config)
    // static actions
    addExtenderAction('forceRecord',(groupKey,item,data) => {
        function beginRecording(monitorId){
            const monitorConfig = s.group[groupKey].rawMonitorConfigurations[monitorId]
            const monitorDetails = monitorConfig.details
            const secondBefore = (parseInt(monitorDetails.detector_buffer_seconds_before) || 5) + 1
            createEventBasedRecording(monitorConfig,moment(eventTime).subtract(secondBefore,'seconds').format('YYYY-MM-DDTHH-mm-ss'))
        }
        doMonitorActionForItem(groupKey,item,data,beginRecording)
    });
    addExtenderAction('createLog',(groupKey,item,data) => {
        const monitorId = item.monitorId || item.monitorIdFromData ? getMonitorIdFromData(data) : '$USER';
        s.userLog({
            ke: groupKey,
            mid: monitorId,
        },{
            type: item.title,
            text: item.text
        });
    });
}
