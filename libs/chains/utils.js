module.exports = function(s,config){
    function addExtenderAction(name,theAction){
        s.loadedChainActions[name] = theAction
    }
    return {
        addExtenderAction,
    }
}
