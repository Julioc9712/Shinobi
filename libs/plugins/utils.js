module.exports = (s,config,lang) => {
    const initializeClientPlugin = (moduleConfig) => {
        const modulePlugName = moduleConfig.plug
        s.connectedPlugins[modulePlugName] = {
            plug: moduleConfig.plug,
            type: moduleConfig.type,
            plugged: true,
        }
    }
    const activateClientPlugin = (pluginConfig,sendDataToPlugin) => {
        s.connectedPlugins[pluginConfig.plug].tx = sendDataToPlugin
        //is in client mode (camera.js is client)
        // cn.pluginEngine = pluginConfig.plug
        s.systemLog('Connected to plugin : Detector - '+pluginConfig.plug+' - '+pluginConfig.type)
        switch(pluginConfig.type){
            default:
            case'detector':
                // if(config.oldPluginConnectionMethod)cn.ocv = 1
                // cn.detectorPlugin = pluginConfig.plug;
                s.addDetectorPlugin(pluginConfig.plug,{
                    id: s.gid(20),
                    plug: pluginConfig.plug,
                    notice: pluginConfig.notice,
                    isClientPlugin: true,
                    connectionType: pluginConfig.connectionType
                });
                s.tx({
                    f: 'detector_plugged',
                    plug: pluginConfig.plug,
                    notice: pluginConfig.notice
                },'CPU');
            break;
        }
    }
    const deactivateClientPlugin = (modulePlugName) => {
        s.connectedPlugins[modulePlugName].plugged = false
        s.tx({f:'plugin_engine_unplugged',plug:modulePlugName},'CPU')
        s.tx({f:'detector_unplugged',plug:modulePlugName},'CPU')
        s.removeDetectorPlugin(modulePlugName)
        // s.sendDetectorInfoToClient({f:'detector_plugged'},function(data){
        //     s.tx(data,'CPU')
        // })
    }
    function initMonitorOnPlugins(groupKey,monitorId){
        s.ocvTx({
            f : 'init_monitor',
            monitorConfig : s.group[groupKey].rawMonitorConfigurations[monitorId],
            groupKey,
            monitorId,
            time : s.formattedTime(),
        });
    }
    function initMonitorsOnPlugins(groupKey){
        const monitors = s.group[groupKey].rawMonitorConfigurations;
        Object.keys(monitors).forEach((monitorId) => {
            initMonitorOnPlugins(groupKey, monitorId)
        })
    }
    function initAllMonitorsOnPlugins(){
        Object.keys(s.group).forEach((groupKey) => {
            initMonitorsOnPlugins(groupKey)
        })
    }
    return {
        initMonitorOnPlugin,
        initMonitorsOnPlugins,
        initAllMonitorsOnPlugins,
        activateClientPlugin: activateClientPlugin,
        initializeClientPlugin: initializeClientPlugin,
        deactivateClientPlugin: deactivateClientPlugin,
    }
}
