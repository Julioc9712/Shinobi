var liveGridCycleTimer = null;
var cycleLiveOptionsBefore = null;
var cycleLiveOptions = null;
var cycleLiveMoveNext = function(){}
var cycleLiveMovePrev = function(){}
var cycleLiveFullList = null
var cycleLiveCurrentPart = null
function getListOfMonitorsToCycleLive(chosenTags,useMonitorIds){
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
function getPartForCycleLive(fullList, afterMonitorId, numberOfMonitors) {
    const startIndex = afterMonitorId ? fullList.findIndex(monitor => monitor.mid === afterMonitorId) : -1;
    const result = [];
    for (let i = 1; i <= numberOfMonitors; i++) {
        const index = (startIndex + i) % fullList.length;
        result.push(fullList[index]);
    }
    return result;
}
function displayCycleSetOnLiveGrid(monitorsList){
    cycleLiveCurrentPart = [].concat(monitorsList)
    closeAllLiveGridPlayers()
    monitorsWatchOnLiveGrid(monitorsList.map(monitor => monitor.mid))
}
// rotator
function stopCycleLive(){
    clearTimeout(liveGridCycleTimer)
    liveGridCycleTimer = null
}
function resumeCycleLive(fullList,partForCycle,numberOfMonitors){
    const cycleLiveTimerAmount = parseInt(theLocalStorage.cycleLiveTimerAmount) || 30000
    function next(){
        var afterMonitorId = partForCycle.slice(-1)[0].mid;
        partForCycle = getPartForCycleLive(fullList,afterMonitorId,numberOfMonitors)
        displayCycleSetOnLiveGrid(partForCycle)
        reset()
    }
    function prev(){
        var firstInPart = partForCycle[0].mid;
        var firstPartIndex = fullList.findIndex(monitor => monitor.mid === firstInPart)
        var backedToIndex = (firstPartIndex - (numberOfMonitors + 1) + fullList.length) % fullList.length;
        var beforeMonitorId = fullList[backedToIndex].mid
        partForCycle = getPartForCycleLive(fullList,beforeMonitorId,numberOfMonitors, true)
        displayCycleSetOnLiveGrid(partForCycle)
        reset()
    }
    function reset(){
        clearTimeout(liveGridCycleTimer)
        liveGridCycleTimer = setTimeout(function(){
            next()
        },cycleLiveTimerAmount)
    }
    reset()
    cycleLiveMoveNext = next
    cycleLiveMovePrev = prev
}
function beginCycleLive({
    chosenTags,
    useMonitorIds,
    numberOfMonitors,
    monitorHeight,
}){
    var fullList = getListOfMonitorsToCycleLive(chosenTags,useMonitorIds)
    var partForCycle = getPartForCycleLive(fullList,null,numberOfMonitors)
    cycleLiveFullList = [].concat(fullList)
    displayCycleSetOnLiveGrid(partForCycle)
    stopCycleLive()
    resumeCycleLive(fullList,partForCycle,numberOfMonitors)
}
dashboardSwitchCallbacks.cycleLiveGrid = function(toggleState){
    if(toggleState !== 1){
        cycleLiveOptions = null
        cycleLiveOptionsBefore = null
        stopCycleLive()
    }else{
        openTab('liveGrid')
        cycleLiveOptionsBefore = cycleLiveOptions ? Object.assign({},cycleLiveOptions) : null
        const theLocalStorage = dashboardOptions()
        const cycleLivePerRow = parseInt(theLocalStorage.cycleLivePerRow) || 2
        const cycleLiveNumberOfMonitors = parseInt(theLocalStorage.cycleLiveNumberOfMonitors) || 4
        const cycleLiveMonitorHeight = parseInt(theLocalStorage.cycleLiveMonitorHeight) || 4
        cycleLiveOptions = {
            chosenTags: null,
            useMonitorIds: null,
            monitorsPerRow: cycleLivePerRow,
            numberOfMonitors: cycleLiveNumberOfMonitors,
            monitorHeight: cycleLiveMonitorHeight,
        }
        beginCycleLive(cycleLiveOptions)
    }
}
function keyShortcutsForCycleLive(enable) {
    function cleanup(){
        document.removeEventListener('keydown', keyShortcuts['cycleLive'].keydown);
        document.removeEventListener('keyup', keyShortcuts['cycleLive'].keyup);
        delete(keyShortcuts['cycleLive'])
    }
    if(enable){
        let isKeyPressed = false;
        function handleKeyboard(event){
            if (isKeyPressed) {
                return;
            }
            event.preventDefault();
            switch(event.code){
                case 'Space':
                    isKeyPressed = true;
                    if(liveGridCycleTimer){
                        stopCycleLive()
                    }else{
                        resumeCycleLive(
                            cycleLiveFullList,
                            cycleLiveCurrentPart,
                            cycleLiveOptions.numberOfMonitors
                        )
                    }
                break;
                case 'ArrowLeft':
                    isKeyPressed = true;
                    cycleLiveMovePrev();
                break;
                case 'ArrowRight':
                    isKeyPressed = true;
                    cycleLiveMoveNext();
                break;
            }
        }
        function handleKeyup(event) {
            isKeyPressed = false;
        }
        keyShortcuts['cycleLive'] = {
            keydown: handleKeyboard,
            keyup: handleKeyup,
        }
        document.addEventListener('keydown', keyShortcuts['cycleLive'].keydown);
        document.addEventListener('keyup', keyShortcuts['cycleLive'].keyup);
    }else{
        cleanup()
    }
}
addOnTabOpen('liveGrid', function () {
    keyShortcutsForCycleLive(true)
})
addOnTabReopen('liveGrid', function () {
    if(cycleLiveOptions){
        beginCycleLive(cycleLiveOptions)
    }
    keyShortcutsForCycleLive(true)
})
addOnTabAway('liveGrid', function () {
    stopCycleLive()
    keyShortcutsForCycleLive(false)
})
