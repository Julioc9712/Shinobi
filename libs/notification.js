var fs = require("fs")
module.exports = function(s,config,lang){
    async function getSnapshot(d,monitorConfig){
        d.screenshotBuffer = d.screenshotBuffer || d.frame
        if(!d.screenshotBuffer || (monitorConfig.details.notify_useRawSnapshot === '1' && !d.usingRawSnapshotBuffer)){
            d.usingRawSnapshotBuffer = true
            const { screenShot, isStaticFile } = await s.getRawSnapshotFromMonitor(monitorConfig,{
                secondsInward: monitorConfig.details.snap_seconds_inward
            })
            d.screenshotBuffer = screenShot
        }
    }
    require('./notifications/email.js')(s,config,lang,getSnapshot)
    require('./notifications/discordBot.js')(s,config,lang,getSnapshot)
    require('./notifications/telegram.js')(s,config,lang,getSnapshot)
}
