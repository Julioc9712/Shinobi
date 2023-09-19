module.exports = function(s,config,lang,app,io){
    s.loadedChains = {}
    s.recentSnapshots = {}
    s.loadedChainActions = {}
    const {
        loadChains,
    } = require('./chains/core.js')(s,config)
    require('./chains/controllers.js')(s,config,lang)
    require('./chains/actions.js')(s,config,lang)
    s.onProcessReady(async () => {
        await loadChains()
    })
}
