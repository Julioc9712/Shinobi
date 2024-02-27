module.exports = function(s,config,lang){
    require('./events/onvif.js')(s,config,lang)
    require('./events/noEventsDetector.js')(s,config,lang)
    const { bindTagLegendForMonitors } = require('./events/utils.js')(s,config,lang)
    const { initMonitorOnPlugin, initAllMonitorsOnPlugins } = require('./plugins/utils.js')(s,config,lang)
    s.onAccountSave(function(theGroup,formDetails,user){
        const groupKey = user.ke
        bindTagLegendForMonitors(groupKey)
    })
    s.onMonitorSave(function(monitorConfig){
        const groupKey = monitorConfig.ke
        bindTagLegendForMonitors(groupKey)
        // init in plugins
        s.ocvTx({
            f : 'init_monitor',
            mon : s.group[groupKey].rawMonitorConfigurations[monitorId],
            ke : groupKey,
            id : monitorId,
            time : s.formattedTime(),
        });
    })
    s.onMonitorStop(function(monitorConfig){
        const groupKey = monitorConfig.ke
        bindTagLegendForMonitors(groupKey)
    });
    s.onPluginChanged(function(){
        initAllMonitorsOnPlugins(groupKey)
    });
    s.onProcessReady(function(){
        Object.keys(s.group).forEach((groupKey) => {
            bindTagLegendForMonitors(groupKey)
        })
    });
}
