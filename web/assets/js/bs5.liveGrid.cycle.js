var liveGridCycleTimer = null;
var cycleOnLiveGridOptionsBefore = null;
var cycleOnLiveGridOptions = null;
var cycleOnLiveGridMoveNext = function(){}
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
    closeAllLiveGridPlayers()
    monitorsWatchOnLiveGrid(monitorsList.map(monitor => monitor.mid))
}
// rotator
function stopCycleOnLiveGrid(){
    clearTimeout(liveGridCycleTimer)
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
    function next(){
        var afterMonitorId = partForCycle.slice(-1)[0].mid;
        partForCycle = getPartForCycleOnLiveGrid(fullList,afterMonitorId,numberOfMonitors)
        displayCycleSetOnLiveGrid(partForCycle)
        clearTimeout(liveGridCycleTimer)
        liveGridCycleTimer = setTimeout(function(){
            next()
        },30000)
    }
    liveGridCycleTimer = setTimeout(function(){
        next()
    },30000)
    cycleOnLiveGridMoveNext = next
}
dashboardSwitchCallbacks.cycleLiveGrid = function(toggleState){
    if(toggleState !== 1){
        cycleOnLiveGridOptions = null
        stopCycleOnLiveGrid()
    }else{
        setTimeout(function(){
            openTab('liveGrid')
            cycleOnLiveGridOptionsBefore = cycleOnLiveGridOptions ? Object.assign({},cycleOnLiveGridOptions) : null
            cycleOnLiveGridOptions = {
                chosenTags: null,
                useMonitorIds: null,
                monitorsPerRow: 2,
                numberOfMonitors: 4,
            }
            beginCycleOnLiveGrid(cycleOnLiveGridOptions)
        },1000)
    }
}
function keyShortcutsForCycleOnLiveGrid(enable) {
    let isKeyPressed = false;
    function handleKeyboard(event){
        if (isKeyPressed) {
            return;
        }
        console.log('Key Press!',event.code)
        event.preventDefault();
        switch(event.code){
            case 'Space':
                isKeyPressed = true;
                dashboardSwitch('cycleLiveGrid');
            break;
            // case 'ArrowLeft':
            //     isKeyPressed = true;
            //     if(cycleOnLiveGridOptions && cycleOnLiveGridOptionsBefore)beginCycleOnLiveGrid(cycleOnLiveGridOptionsBefore);
            // break;
            case 'ArrowRight':
                isKeyPressed = true;
                if(cycleOnLiveGridOptions)cycleOnLiveGridMoveNext();
            break;
        }
    }
    function handleKeyup(event) {
        isKeyPressed = false;
    }
    if(enable){
        document.addEventListener('keydown', handleKeyboard);
        document.addEventListener('keyup', handleKeyup);
    }else{
        document.removeEventListener('keydown', handleKeyboard);
        document.removeEventListener('keyup', handleKeyup);
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
