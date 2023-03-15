const movingThings = require('shinobi-node-moving-things-tracker').Tracker
module.exports = (s,config,lang) => {
    const objectTrackers = {}
    const objectTrackerTimeouts = {}
    function resetObjectTracker(trackerId,matrices){
        const Tracker = movingThings.newTracker();
        objectTrackers[trackerId] = {
            frameCount: 1,
            tracker: Tracker,
            lastPositions: []
        }
        return objectTrackers[trackerId]
    }
    function setLastTracked(trackerId, trackedMatrices){
        const theTracker = objectTrackers[trackerId]
        theTracker.lastPositions = trackedMatrices
    }
    function getTracked(trackerId){
        const theTracker = objectTrackers[trackerId]
        const frameCount = theTracker.frameCount
        const trackedObjects = theTracker.tracker.getJSONOfTrackedItems().map((matrix) => {
            return {
                id: matrix.id,
                tag: matrix.name,
                x: matrix.x,
                y: matrix.y,
                width: matrix.w,
                height: matrix.h,
                confidence: matrix.confidence,
                isZombie: matrix.isZombie,
            }
        })
        return trackedObjects;
    }
    function trackObject(trackerId,matrices){
        if(!objectTrackers[trackerId]){
            resetObjectTracker(trackerId)
        }
        const mappedMatrices = matrices.map((matrix) => {
            return {
                x: matrix.x,
                y: matrix.y,
                w: matrix.width,
                h: matrix.height,
                confidence: matrix.confidence,
                name: matrix.tag,
            }
        });
        const theTracker = objectTrackers[trackerId]
        theTracker.tracker.updateTrackedItemsWithNewFrame(mappedMatrices, theTracker.frameCount);
        ++theTracker.frameCount
    }
    function trackObjectWithTimeout(trackerId,matrices){
        clearTimeout(objectTrackerTimeouts[trackerId]);
        objectTrackerTimeouts[trackerId] = setTimeout(() => {
            objectTrackers[trackerId].tracker.reset()
            delete(objectTrackers[trackerId])
            delete(objectTrackerTimeouts[trackerId])
        },1000 * 60);
        trackObject(trackerId,matrices);
    }
    function objectHasMoved(matrices, options = {}) {
      const { imgHeight = 1, imgWidth = 1, threshold = 0 } = options;
      for (let i = 0; i < matrices.length; i++) {
        const current = matrices[i];
        if (i < matrices.length - 1) {
          const next = matrices[i + 1];
          let totalDistanceMoved = 0;
          let numPointsCompared = 0;
          if (next) {
            // Compare each corner of the matrices
            const currentCorners = [
              { x: current.x, y: current.y },
              { x: current.x + current.width, y: current.y },
              { x: current.x, y: current.y + current.height },
              { x: current.x + current.width, y: current.y + current.height }
            ];
            const nextCorners = [
              { x: next.x, y: next.y },
              { x: next.x + next.width, y: next.y },
              { x: next.x, y: next.y + next.height },
              { x: next.x + next.width, y: next.y + next.height }
            ];
            for (let j = 0; j < currentCorners.length; j++) {
              const currentCorner = currentCorners[j];
              const nextCorner = nextCorners[j];
              const dx = nextCorner.x - currentCorner.x;
              const dy = nextCorner.y - currentCorner.y;
              const distanceMoved = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
              const distanceMovedPercent =
                (100 * distanceMoved) / Math.max(current.width, current.height);
              totalDistanceMoved += distanceMovedPercent;
              numPointsCompared++;
            }
            const averageDistanceMoved = totalDistanceMoved / numPointsCompared;
            if (averageDistanceMoved < threshold) {
              continue;
            } else {
              return true;
            }
          }
        }
      }
      return false;
    }
    function groupMatricesById(matrices) {
      const matrixById = {};
      const matrixTags = {};

      matrices.forEach(matrix => {
        const id = matrix.id;
        const tag = matrix.tag;
        if (!matrixById[id]) {
          matrixById[id] = [];
        }
        matrixTags[tag] = id;
        matrixById[id].push(matrix);
      });

      return matrixById
    }
    function getAllMatricesThatMoved(monitorConfig,matrices){
        const monitorDetails = monitorConfig.details
        const imgWidth = parseInt(monitorDetails.detector_scale_x_object) || 1280
        const imgHeight = parseInt(monitorDetails.detector_scale_y_object) || 720
        const objectMovePercent = parseInt(monitorDetails.detector_object_move_percent) || 5
        const groupKey = monitorConfig.ke
        const monitorId = monitorConfig.mid
        const trackerId = `${groupKey}${monitorId}`
        const theTracker = objectTrackers[trackerId]
        const lastPositions = theTracker.lastPositions
        const sortedById = groupMatricesById([...lastPositions,...matrices])
        const movedMatrices = []
        for (const objectId in sortedById) {
            const sortedList = sortedById[objectId]
            if(sortedList[1]){
                const matrixHasMoved = objectHasMoved(sortedList,{
                    threshold: objectMovePercent,
                    imgWidth: imgWidth,
                    imgHeight: imgHeight,
                });
                if(matrixHasMoved){
                    movedMatrices.push(sortedList[1])
                }
            }
        }
        return movedMatrices
    }
    return {
        trackObjectWithTimeout,
        resetObjectTracker,
        trackObject,
        getTracked,
        setLastTracked,
        getAllMatricesThatMoved,
    }
}
