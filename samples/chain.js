// example chain
module.exports = {
    name: 'Sample Chain',
    ke: 'groupKey',
    ignitor: 'onEventTrigger',
    conditions: [
        {p1: 'time', p2: '>', p3: '05:00:00', p4: '&&'},
        {p1: 'time', p2: '<', p3: '13:00:00', p4: '&&'},
        {p1: 'mid', p2: '===', p3: 'monitorId', p4: '&&'},
    ],
    next: [
        {
            action: 'forceRecord',
            allMonitors: false,
            monitorIdFromData: true,
            monitorIds: [],
            monitorTags: [],
            next: [
                {
                    action: 'createLog',
                    monitorIdFromData: true,
                    // monitorId: '$USER', //actual monitor id or $USER for user level log
                    title: "Text Log on Recording After Event",
                    text: "Recording has Started"
                },
            ]
        },
        {
            action: 'notifyDiscord',
            text: '${OBJECT_TAGS} detected in ${MONITOR_NAME}',
            timeoutUntilAllowAgain: 1000 * 60 * 10, // 10 minutes
            sendSnapshot: true,
            sendVideo: true,
            monitorIdFromData: true,
            monitorIds: [],
            monitorTags: [],
            next: [
                {
                    action: 'createLog',
                    monitorIdFromData: true,
                    // monitorId: '$USER', //actual monitor id or $USER for user level log
                    title: "Discord Note",
                    text: 'Person detected in Back-1'
                },
            ]
        },
        {
            action: 'notifyTelegram',
            sendSnapshot: true,
            sendVideo: true,
            allMonitors: false,
            monitorIdFromData: true,
            monitorIds: [],
            monitorTags: [],
        },
        {
            action: 'scanAndNewCameras',
        },
    ],
}
