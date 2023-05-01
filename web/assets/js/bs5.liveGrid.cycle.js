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
    numberOfMonitors,
    monitorHeight,
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
            const theLocalStorage = dashboardOptions()
            const cycleLivePerRow = parseInt(theLocalStorage.cycleLivePerRow) || 2
            const cycleLiveNumberOfMonitors = parseInt(theLocalStorage.cycleLiveNumberOfMonitors) || 4
            const cycleLiveMonitorHeight = parseInt(theLocalStorage.cycleLiveMonitorHeight) || 4
            cycleOnLiveGridOptions = {
                chosenTags: null,
                useMonitorIds: null,
                monitorsPerRow: cycleLivePerRow,
                numberOfMonitors: cycleLiveNumberOfMonitors,
                monitorHeight: cycleLiveMonitorHeight,
            }
            beginCycleOnLiveGrid(cycleOnLiveGridOptions)
        },1000)
    }
}
function keyShortcutsForCycleOnLiveGrid(enable) {
    function cleanup(){
        console.error('REMOVE LISTENERS',keyShortcuts['cycleOnLiveGrid'])
        document.removeEventListener('keydown', keyShortcuts['cycleOnLiveGrid'].keydown);
        document.removeEventListener('keyup', keyShortcuts['cycleOnLiveGrid'].keyup);
        delete(keyShortcuts['cycleOnLiveGrid'])
    }
    if(enable){
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
        keyShortcuts['cycleOnLiveGrid'] = {
            keydown: handleKeyboard,
            keyup: handleKeyup,
        }
        document.addEventListener('keydown', keyShortcuts['cycleOnLiveGrid'].keydown);
        document.addEventListener('keyup', keyShortcuts['cycleOnLiveGrid'].keyup);
    }else{
        cleanup()
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
