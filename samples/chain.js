// example chain
module.exports = {
    ke: 'groupKey',
    mid: 'monitorId',
    ignitor: 'onEventTrigger',
    conditions: [
        {p1: 'time', p2: '>', p3: '05:00:00', p4: '&&'},
        {p1: 'time', p2: '<', p3: '13:00:00', p4: '&&'}
    ],
    next: [
        {
            action: 'forceRecord',
            allMonitors: false,
            monitorIds: [],
            monitorTags: [],
        },
        {
            action: 'notifyDiscord',
            sendSnapshot: true,
            sendVideo: true,
        },
        {
            action: 'notifyTelegram',
            sendSnapshot: true,
            sendVideo: true,
        },
        {
            action: 'scanAndNewCameras',
        },
    ],
}
