module.exports = function(s,config){
    const {
        getMonitorIdFromData,
    } = require('./utils.js')(s,config)
    var loadedChains = s.loadedChains
    async function loadChains(){
        const selectResponse = await s.knexQueryPromise({
            action: "select",
            columns: "*",
            table: "Chains"
        });
        const foundChains = selectResponse.rows
        foundChains.forEach(loadChain);
    }
    function loadChain(item){
        const name = item.name
        const groupKey = item.ke
        const extenderThatStartsThis = item.ignitor
        item.conditions = JSON.parse(item.conditions)
        item.next = JSON.parse(item.next)
        if(!loadedChains[extenderThatStartsThis])loadedChains[extenderThatStartsThis] = {}
        if(!loadedChains[extenderThatStartsThis][groupKey])loadedChains[extenderThatStartsThis][groupKey] = {}
        loadedChains[extenderThatStartsThis][groupKey][name] = item
    }
    function unloadChain(item){
        const name = item.name
        const groupKey = item.ke
        const extenderThatStartsThis = item.ignitor
        delete(loadedChains[extenderThatStartsThis][groupKey][name])
    }
    function saveChain(item){
        await loadChain(item)
        return s.knexQueryPromise({
            action: "insert",
            table: "Chains",
            insert: Object.assign({},item,{
                conditions: JSON.stringify(item.conditions),
                next: JSON.stringify(item.next),
            })
        })
    }
    function deleteChain(item){
        await unloadChain(item)
        return s.knexQueryPromise({
            action: "delete",
            table: "Chains",
            where: {
                ke: item.ke,
                name: item.name,
                ignitor: item.ignitor,
            }
        })
    }
    function evaluateCondition(condition,toCheck){
        var param = toCheck[condition.p1]
        switch(condition.p2){
            case'includes':
                if(param.indexOf(condition.p3) > -1){
                    return true
                }
            break;
            case'notIncludes':
                if(param.indexOf(condition.p3) === -1){
                    return true
                }
            break;
            case'===':
            case'!==':
            case'>=':
            case'>':
            case'<':
            case'<=':
                if(eval('param '+condition.p2+' "'+condition.p3.replace(/"/g,'\\"')+'"')){
                    return true
                }
            break;
        }
        return false
    }
    function checkChainItemConditions(conditions,data){
        if(conditions.length === 0)return true;
        const conditionChain = {}
        const validationString = []
        let numberOfOpenAndCloseBrackets = 0
        for (let i = 0; i < conditions.length; i++) {
            // "condition" same structure as event filter "where" item.
            const place = i + 0;
            const condition = conditions[i]
            const hasOpenBracket = condition.openBracket === '1';
            const hasCloseBracket = condition.closeBracket === '1';
            conditionChain[place] = {
                ok: false,
                nextOp: condition.p4,
                matrixCount: 0,
                openBracket: hasOpenBracket,
                closeBracket: hasCloseBracket,
            }
            if(hasOpenBracket)++numberOfOpenAndCloseBrackets;
            if(hasCloseBracket)++numberOfOpenAndCloseBrackets;
            // if(matrices)conditionChain[place].matrixCount = matrices.length
            switch(condition.p1){
                case'tag':
                case'x':
                case'y':
                case'height':
                case'width':
                case'confidence':
                    if(matrices){
                        let hasAtleastOneMatrixPass;
                        matrices.forEach(function(matrix,position){
                            hasAtleastOneMatrixPass = hasAtleastOneMatrixPass || evaluateCondition(condition,matrix);
                        })
                        conditionChain[place].ok = hasAtleastOneMatrixPass
                    }
                break;
                case'time':
                    var timeNow = new Date()
                    var timeCondition = new Date()
                    var doAtTime = condition.p3.split(':')
                    var atHour = parseInt(doAtTime[0]) - 1
                    var atHourNow = timeNow.getHours()
                    var atMinuteNow = timeNow.getMinutes()
                    var atSecondNow = timeNow.getSeconds()
                    if(atHour){
                        var atMinute = parseInt(doAtTime[1]) - 1 || timeNow.getMinutes()
                        var atSecond = parseInt(doAtTime[2]) - 1 || timeNow.getSeconds()
                        var nowAddedInSeconds = atHourNow * 60 * 60 + atMinuteNow * 60 + atSecondNow
                        var conditionAddedInSeconds = atHour * 60 * 60 + atMinute * 60 + atSecond
                        if(acceptableOperators.indexOf(condition.p2) > -1 && eval('nowAddedInSeconds '+condition.p2+' conditionAddedInSeconds')){
                            conditionChain[place].ok = true
                        }
                    }
                break;
                case'mid':
                    var requiredMonitorId = getMonitorIdFromData(data);
                    var monitorId = condition.p3;
                    conditionChain[place].ok = monitorId === requiredMonitorId;
                break;
                // default:
                //     conditionChain[place].ok = evaluateCondition(condition,d.details)
                // break;
            }
        }
        const allowBrackets = numberOfOpenAndCloseBrackets === 0 || isEven(numberOfOpenAndCloseBrackets);
        const conditionArray = Object.values(conditionChain)
        conditionArray.forEach(function(condition,number){
            validationString.push(`${allowBrackets && condition.openBracket ? '(' : ''}${condition.ok}${allowBrackets && condition.closeBracket ? ')' : ''}`);
            if(conditionArray.length-1 !== number){
                validationString.push(condition.nextOp)
            }
        })
        const hasPassed = eval(validationString.join(' '));
        return hasPassed;
    }
    async function executeChainItem(groupKey,item,data){
        let conditionsPassed = [];
        const conditions = item.conditions || [];
        const hasPassed = checkChainItemConditions(conditions,data)
        if(hasPassed){
            if(item.action){
                const currentAction = item.action
                const runAction = s.loadedChainActions[currentAction]
                if(runAction)await runAction(groupKey,item,data);
            }
            const nextItems = item.next;
            for (let i = 0; i < nextItem.length; i++) {
                const nextItem = nextItems[i]
                executeChainItem(groupKey,nextItem,data);
            }
        }
        return hasPassed;
    }
    function addChainControllerToExtender(extender){
        // extender = extenderThatStartsThis
        s[extender]((...data) => {
            const theChain = loadedChains[extender]
            if(theChain){
                for (const groupKey in theChain) {
                    const items = theChain[groupKey]
                    for (const name in items) {
                        const item = items[name];
                        executeChainItem(groupKey,item,data);
                    }
                }
            }
        })
    }
    return {
        loadChains,
        loadChain,
        unloadChain,
        saveChain,
        deleteChain,
        evaluateCondition,
        checkChainItemConditions,
        executeChainItem,
        addChainControllerToExtender,
        getMonitorIdFromData,
    }
}
