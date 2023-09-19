module.exports = function(s,config){
    var recentSnapshots = s.recentSnapshots
    function addExtenderAction(name,theAction){
        s.loadedChainActions[name] = theAction
    }
    function getMonitorIdFromData(data){
        let monitorId = null
        data.forEach((obj) => {
            if(obj.mid || obj.id)monitorId = monitorId || obj.mid || obj.id;
        })
        return monitorId;
    }
    async function getRecentSnapshot(monitorConfig){
        const monitorId = monitorConfig.mid
        const groupKey = monitorConfig.ke
        if(recentSnapshots[`${groupKey}${monitorId}`]){
            return recentSnapshots[`${groupKey}${monitorId}`]
        }
        const { screenShot, isStaticFile } = await s.getRawSnapshotFromMonitor(monitorConfig,{
            secondsInward: monitorConfig.details.snap_seconds_inward
        });
        recentSnapshots[`${groupKey}${monitorId}`] = screenShot;
        setTimeout(() => {
            delete(recentSnapshots[`${groupKey}${monitorId}`]);
        }, 20 * 1000)
        return screenShot
    }
    async function getRecentRecording(monitorConfig){
        const monitorId = monitorConfig.mid
        const groupKey = monitorConfig.ke
        let videoPath = null
        let videoName = null
        const eventBasedRecording = await getEventBasedRecordingUponCompletion({
            ke: groupKey,
            mid: monitorId
        })
        if(eventBasedRecording.filePath){
            videoPath = eventBasedRecording.filePath
            videoName = eventBasedRecording.filename
        }else{
            const siftedVideoFileFromRam = await s.mergeDetectorBufferChunks(monitorConfig)
            videoPath = siftedVideoFileFromRam.filePath
            videoName = siftedVideoFileFromRam.filename
        }
        return {
            path: videoPath,
            name: videoName
        }
    }
    function recurseMonitorIds(monitorIds,someFunction){
        for (let i = 0; i < monitorIds.length; i++) {
            const monitorId = item[i]
            someFunction(monitorId)
        }
    }
    function doMonitorActionForItem(groupKey,item,data,someFunction){
        if(item.monitorIdFromData){
            const monitorId = getMonitorIdFromData(data)
            if(monitorId)someFunction(monitorId)
        }else if(item.allMonitors){
            const monitorIds = Object.keys(s.group[groupKey].rawMonitorConfigurations)
            recurseMonitorIds(monitorIds,someFunction)
        }else{
            if(item.monitorIds)recurseMonitorIds(item.monitorIds,someFunction);
            const monitorTags = item.monitorTags || []
            const monitorIdsFromTags = findMonitorsAssociatedToTags(groupKey,monitorTags)
            recurseMonitorIds(monitorIdsFromTags,someFunction)
        }
    }
    return {
        addExtenderAction,
        getMonitorIdFromData,
        getRecentSnapshot,
        doMonitorActionForItem,
    }
}
