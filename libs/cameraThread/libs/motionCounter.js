module.exports = (detectorUtils) => {
    let intrusionCounters = {}
    let intrusionCounterTimeouts = {}
    let lastRegionsActivated = {}
    let lastRegionsActivatedDidTrigger = {}
    let lockForInState = null;
    const {
        // see SHINOBI_ROOT/libs/cameraThread/libs/detectorUtils.js for more parameters and functions
        config,
        groupKey,
        monitorId,
        monitorDetails,
        completeMonitorConfig,
        pamDetectorIsEnabled,
        regionJson,
        width,
        height,
        globalSensitivity,
        //
        attachPamPipeDrivers,
        //
        getAcceptedTriggers,
        getRegionsWithMinimumChange,
        getRegionsBelowMaximumChange,
        getRegionsWithThresholdMet,
        filterTheNoise,
        filterTheNoiseFromMultipleRegions,
        mergePamTriggers,
        buildDetectorObject,
        //
        buildTriggerEvent,
        sendDetectedData,
        logData,
        originalCords,
    } = detectorUtils;
    function initiateController(){
        Object.values(regionJson).forEach(function(region){
            if(region.name === 'FULL_FRAME')return;
            intrusionCounters[region.name] = 0;
            if(regionsAvailable.indexOf(region.name) === -1)regionsAvailable.push(region.name);
            regionConfidenceMinimums[region.name] = parseFloat(region.sensitivity_2) || globalSensitivity;
            bigMatrixConfidence[region.name] = parseFloat(region.big_matrix_confidence) || 1
            bigMatrixAverageConfidence[region.name] = parseFloat(region.big_matrix_average_confidence) || 1
            bigMatrixTilesCounted[region.name] = parseFloat(region.big_matrix_tiles_counted) || 1
            poolMinPercentsByZone[region.name] = parseInt(region.pool_percent) || poolMinPercent
            poolIntrusionOnly[region.name] = globalPoolIntrusionOnly || region.pool_only === '1'
            poolTimeout[region.name] = parseInt(region.pool_timeout) || 10
            watchDogReset[region.name] = parseInt(region.watchdog_reset) || 0
        });
    }
    function onMotionData(data){
        const acceptedTriggers = getAcceptedTriggers(data.trigger)
        const mergedTriggers = mergePamTriggers(acceptedTriggers)
        if(!mergedTriggers.percent)return;
        mergedTriggers.percent = mergedTriggers.percent || 0;
        mergedTriggers.matrices.forEach(function(matrix){
            matrix.confidence = matrix.confidence || 0;
        })
        const copyOfMatrices = ([]).concat(mergedTriggers.matrices || [])
        const intrusionMatrices = getAllIntrusionMatrices(copyOfMatrices)
        mergedTriggers.matrices = weightedScoreFilter(makeBigMatricesFromSmallOnes(intrusionMatrices))
        const detectorObject = buildDetectorObject(mergedTriggers)
        if(intrusionMatrices.length === 0){
            detectorObject.details.matrices = getActivePixelMatrices(copyOfMatrices)
            detectorObject.f = 'detector_trigger'
            sendDetectedData({
                f: 's.tx',
                data: detectorObject,
                to: `DETECTOR_${groupKey}${monitorId}`,
            })
        }
        // logData(intrusionMatrices.length)
        countIntrusionsInMatrices(intrusionMatrices,
            // on 7th intrusion within 15 seconds (alert)
            (regionName,newCount) => {
                detectorObject.details.alert = true
                detectorObject.details.count = true
                detectorObject.details.counted = newCount
                detectorObject.details.regionName = regionName
                detectorObject.details.matrices = makeBigMatricesFromSmallOnes(detectorObject.details.matrices,true)
                sendDetectedData({
                    f: 's.tx',
                    data: detectorObject,
                    to: `DETECTOR_${groupKey}${monitorId}`,
                })
                doWebhook(detectorObject,regionName)
            },
            // onCount, the intrusion
            (regionName,newCount) => {
                detectorObject.details.count = true
                detectorObject.details.counted = newCount
                detectorObject.details.regionName = regionName
                detectorObject.details.matrices = makeBigMatricesFromSmallOnes(detectorObject.details.matrices,true)
                sendDetectedData(detectorObject)
                doWebhook(detectorObject,regionName)
            },
            // onNotIntrusion, just a matrix display
            () => {
                detectorObject.f = 'detector_trigger'
                detectorObject.details.matrices = makeBigMatricesFromSmallOnes(detectorObject.details.matrices,true)
                sendDetectedData(detectorObject)
                doWebhookForOnlyDisplay(detectorObject)
            },
            //pool_intrusion
            (regionName,poolsTriggered) => {
                detectorObject.details.regionName = regionName
                sendDetectedData(detectorObject)
                doWebhookForPool(regionName)
            },
        );
        if(intrusionMatrices.length > 0)setTimeoutForStaleMotion();
    }
    initiateController()
    return {
        onMotionData,
    }
}
