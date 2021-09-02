module.exports = function(jsonData,pamDiffResponder){
    const {
        // see libs/detectorUtils.js for more parameters and functions
        //
        config,
        groupKey,
        monitorId,
        monitorDetails,
        completeMonitorConfig,
        pamDetectorIsEnabled,
        //
        attachPamPipeDrivers,
        //
        getAcceptedTriggers,
        getRegionsWithMinimumChange,
        getRegionsBelowMaximumChange,
        getRegionsWithThresholdMet,
        filterTheNoise,
        filterTheNoiseFromMultipleRegions,
        //
        buildDetectorObject,
        buildTriggerEvent,
        sendDetectedData,
    } = require('./libs/detectorUtils.js')(jsonData,pamDiffResponder)
    return function(cameraProcess){
        if(pamDetectorIsEnabled){
            attachPamPipeDrivers(cameraProcess)
        }
    }
}
