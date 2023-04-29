var liveGridCycleTimer = null;
var currentCycleLoaded = []
function getListOfMonitorsToCycleOnLiveGrid(chosenTags,useMonitorIds){
    var monitors = []
    if(useMonitorIds){
        monitors = getMonitorsFromIds(chosenTags)
    }else if(chosenTags){
        var tags = sanitizeTagList(chosenTags)
        monitors = getMonitorsFromTags(tags)
    }else{
        monitors = getRunningMonitors(true)
    }

    return monitors;
}
function getPartForCycleOnLiveGrid(fullList, afterMonitorId, numberOfMonitors) {
    const startIndex = afterMonitorId ? fullList.findIndex(monitor => monitor.mid === afterMonitorId) : -1;
    const result = [];
    for (let i = 1; i <= numberOfMonitors; i++) {
        const index = (startIndex + i) % fullList.length;
        result.push(fullList[index]);
    }
    return result;
}
function displayCycleSetOnLiveGrid(monitorsList){
    currentCycleLoaded = [].concat(monitorsList)
    closeAllLiveGridPlayers()
    monitorsWatchOnLiveGrid(monitorsList.map(monitor => monitor.mid))
}
// rotator
function stopCycleOnLiveGrid(){
    clearInterval(liveGridCycleTimer)
}
function beginCycleOnLiveGrid({
    chosenTags,
    useMonitorIds,
    numberOfMonitors
}){
    var fullList = getListOfMonitorsToCycleOnLiveGrid(chosenTags,useMonitorIds)
    var partForCycle = getPartForCycleOnLiveGrid(fullList,null,numberOfMonitors)
    displayCycleSetOnLiveGrid(partForCycle)
    stopCycleOnLiveGrid()
    liveGridCycleTimer = setInterval(function(){
        var afterMonitorId = partForCycle.slice(-1)[0].mid;
        partForCycle = getPartForCycleOnLiveGrid(fullList,afterMonitorId,numberOfMonitors)
        displayCycleSetOnLiveGrid(partForCycle)
    },30000)
}
dashboardSwitchCallbacks.cycleLiveGrid = function(toggleState){
    if(toggleState !== 1){
        stopCycleOnLiveGrid()
    }else{
        beginCycleOnLiveGrid({
            chosenTags: null,
            useMonitorIds: null,
            numberOfMonitors: 4
        })
    }
}
