var liveGridCycleTimer = null;
var currentCycleLoaded = [];
var cycleOnLiveGridOptions = null;
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
    liveGridCycleTimer = null
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
    if(tabTree.name === 'liveGrid'){
        if(toggleState !== 1){
            cycleOnLiveGridOptions = null
            stopCycleOnLiveGrid()
        }else{
            cycleOnLiveGridOptions = {
                chosenTags: null,
                useMonitorIds: null,
                monitorsPerRow: 2,
                numberOfMonitors: 4,
            }
            beginCycleOnLiveGrid(cycleOnLiveGridOptions)
        }
    }
}
function keyShortcutsForCycleOnLiveGrid(enable) {
    function handleSpacebar(event){
        if(event.code === 'Space'){
            event.preventDefault();
            dashboardSwitch('cycleLiveGrid');
        }
    }
    if(enable){
        document.addEventListener('keydown', handleSpacebar);
    }else{
        document.removeEventListener('keydown', handleSpacebar);
    }
}
addOnTabOpen('liveGrid', function () {
    keyShortcutsForCycleOnLiveGrid(true)
})
addOnTabReopen('liveGrid', function () {
    if(cycleOnLiveGridOptions){
        beginCycleOnLiveGrid(cycleOnLiveGridOptions)
    }
    keyShortcutsForCycleOnLiveGrid(true)
})
addOnTabAway('liveGrid', function () {
    stopCycleOnLiveGrid()
    keyShortcutsForCycleOnLiveGrid(false)
})
