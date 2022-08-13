const fs = require('fs');
const url = require('url');
const http = require('http');
const https = require('https');
const express = require('express');
const { createWebSocketServer, createWebSocketClient } = require('./basic/websocketTools.js')
module.exports = function(s,config,lang,app,io){
    const {
        roundToDigits
    } = require('./basic/utils')(process.cwd(),config)
    //setup Master for childNodes
    if(
        config.childNodes.enabled === true &&
        config.childNodes.mode === 'master'
    ){
        const {
            getIpAddress,
            initiateDataConnection,
            initiateVideoTransferConnection,
            onWebSocketDataFromChildNode,
            onDataConnectionDisconnect,
            initiateVideoWriteFromChildNode,
            initiateTimelapseFrameWriteFromChildNode,
        } = require('./childNode/utils.js')(s,config,lang,app,io)
        s.childNodes = {};
        const childNodesConnectionIndex = {};
        const childNodeHTTP = express();
        const childNodeServer = http.createServer(app);
        const childNodeWebsocket = createWebSocketServer();
        const childNodeFileRelay = createWebSocketServer();
        childNodeServer.on('upgrade', function upgrade(request, socket, head) {
            const pathname = url.parse(request.url).pathname;
            if (pathname === '/childNode') {
                childNodeWebsocket.handleUpgrade(request, socket, head, function done(ws) {
                    childNodeWebsocket.emit('connection', ws, request)
                })
            } else if (pathname === '/childNodeFileRelay') {
                childNodeFileRelay.handleUpgrade(request, socket, head, function done(ws) {
                    childNodeFileRelay.emit('connection', ws, request)
                })
            } else {
                socket.destroy();
            }
        });
        const buildActiveMonitorDetails = function(monitor) {
            return {
                id: monitor.mid,
                group: monitor.ke,
                name: monitor.name,
                details: {
                    accelerator: monitor.details.accelerator,
                    auto_host: monitor.details.auto_host,
                }
            }
        }
        const getMasterNodeInfo = async function(schedulableConfig) {
            const masterActiveCameras = []

            for (const groupId in s.group) {
                const group = s.group[groupId]

                for (const monitorId in group.activeMonitors) {
                    const activeMonitor = group.activeMonitors[monitorId]

                    // if there is a childNode property on the monitor means it's
                    // running in a child node so skip it here
                    if ('childNode' in activeMonitor) {
                        continue;
                    }

                    masterActiveCameras.push(buildActiveMonitorDetails(activeMonitor))
                }
            }

            let masterCpuUsage = -1
            let masterMemUsage = {}

            try {
                [masterCpuUsage, masterMemUsage] = await Promise.all([s.cpuUsage(), s.ramUsage()])
            } catch (e) {
                s.log('Failed to get cpu and mem usage for master node', e)
            }

            const masterSchedulable = masterCpuUsage < schedulableConfig.maxCpuPercent &&
                masterMemUsage.percent < schedulableConfig.maxRamPercent

            return {
                mode: 'master',
                dead: false,
                schedulable: masterSchedulable,
                platform: s.platform || 'Unknown',
                memory: {
                    totalInMb: s.totalmem ? Math.floor(s.totalmem) : -1,
                    percentUsed: masterMemUsage.percent ? roundToDigits(masterMemUsage.percent, 2) : -1
                },
                cpu: {
                    total: s.coreCount || -1,
                    percentUsed: masterCpuUsage
                },
                activeCameras: masterActiveCameras
            }
        }
        const getChildNodeInfo = function(schedulableConfig, skipDead) {
            const nodes = []

            for (const childNodeIp in s.childNodes) {
                const childNode = s.childNodes[childNodeIp]

                if (childNode.dead === true && skipDead) {
                    continue
                }

                const activeCameras = []
                for (const cameraId in childNode.activeCameras) {
                    const camera = childNode.activeCameras[cameraId]
                    activeCameras.push(buildActiveMonitorDetails(camera))
                }

                const schedulable = !childNode.dead &&
                    childNode.cpuPercent < schedulableConfig.maxCpuPercent &&
                    childNode.ramPercent < schedulableConfig.maxRamPercent

                nodes.push({
                    id: childNode.cnid,
                    ip: childNodeIp,
                    mode: 'child',
                    dead: childNode.dead,
                    schedulable,
                    platform: childNode.platform || 'Unknown',
                    memory: {
                        totalInMb: childNode.totalmem ? Math.floor(childNode.totalmem) : -1,
                        percentUsed: childNode.ramPercent ? roundToDigits(childNode.ramPercent, 2) : -1
                    },
                    cpu: {
                        total: childNode.coreCount || -1,
                        percentUsed: childNode.cpuPercent ? roundToDigits(childNode.cpuPercent, 2) : -1
                    },
                    activeCameras
                })
            }

            return nodes
        }
        /**
         * Super API to get information about the children, where each stream is running and resource usage
         */
        app.get(config.webPaths.superApiPrefix+':auth/child-nodes', async function (req, res) {
            s.superAuth(req.params,async function(resp){
                const skipDead = req.query.skipDead === "true"

                let schedulableConfig = {
                    maxCpuPercent: config.childNodes.maxCpuPercent || 75,
                    maxRamPercent: config.childNodes.maxRamPercent || 75
                }

                const nodes = [
                    await getMasterNodeInfo(schedulableConfig),
                    ...getChildNodeInfo(schedulableConfig, skipDead)
                ]

                s.closeJsonResponse(res, {
                    ok: true,
                    options: {
                        port: config.childNodes.port,
                        masterDoWorkToo: config.childNodes.masterDoWorkToo,
                        maxCpuPercent: schedulableConfig.maxCpuPercent,
                        maxRamPercent: schedulableConfig.maxRamPercent
                    },
                    nodes
                })
            }, res, req);
        })
        const childNodeBindIP = config.childNodes.ip || config.bindip;
        childNodeServer.listen(config.childNodes.port,childNodeBindIP,function(){
            console.log(lang.Shinobi+' - CHILD NODE SERVER : ' + config.childNodes.port);
        });
        //send data to child node function
        s.cx = function(data,connectionId){
            childNodesConnectionIndex[connectionId].sendJson(data)
        }
        //child Node Websocket
        childNodeWebsocket.on('connection', function (client, req) {
            //functions for dispersing work to child servers;
            const ipAddress = getIpAddress(req)
            const connectionId = s.gid(10);
            s.debugLog('Child Node Connection!',new Date(),ipAddress)
            client.id = connectionId;
            function onAuthenticate(d){
                const data = JSON.parse(d);
                const childNodeKeyAccepted = config.childNodes.key.indexOf(data.socketKey) > -1;
                if(!client.shinobiChildAlreadyRegistered && data.f === 'init' && childNodeKeyAccepted){
                    initiateDataConnection(client,req,data,connectionId);
                    childNodesConnectionIndex[connectionId] = client;
                    client.removeListener('message',onAuthenticate)
                    client.on('message',(d) => {
                        const data = JSON.parse(d);
                        onWebSocketDataFromChildNode(client,data)
                    })
                }else{
                    s.debugLog('Child Node Force Disconnected!',new Date(),ipAddress)
                    client.destroy()
                }
            }
            client.on('message',onAuthenticate)
            client.on('close',() => {
                onDataConnectionDisconnect(client, req)
            })
        })
        childNodeFileRelay.on('connection', function (client, req) {
            function onAuthenticate(d){
                const data = JSON.parse(d);
                const childNodeKeyAccepted = config.childNodes.key.indexOf(data.socketKey) > -1;
                if(!client.alreadyInitiated && data.fileType && childNodeKeyAccepted){
                    client.alreadyInitiated = true;
                    client.removeListener('message',onAuthenticate)
                    switch(data.fileType){
                        case'video':
                            initiateVideoWriteFromChildNode(client,data.options,data.connectionId)
                        break;
                        case'timelapseFrame':
                            initiateTimelapseFrameWriteFromChildNode(client,data.options,data.connectionId)
                        break;
                    }
                }else{
                    client.destroy()
                }
            }
            client.on('message',onAuthenticate)
        })
    }else
    //setup Child for childNodes
    if(
        config.childNodes.enabled === true &&
        config.childNodes.mode === 'child' &&
        config.childNodes.host
    ){
        const {
            initiateConnectionToMasterNode,
            onDisconnectFromMasterNode,
            onDataFromMasterNode,
        } = require('./childNode/childUtils.js')(s,config,lang,app,io)
        s.connectedToMasterNode = false;
        let childIO;
        function createChildNodeConnection(){
            childIO = createWebSocketClient('ws://'+config.childNodes.host + '/childNode',{
                onMessage: onDataFromMasterNode
            })
            childIO.on('open', function(){
                console.error(new Date(),'Child Nodes : Connected to Master Node! Authenticating...');
                initiateConnectionToMasterNode()
            })
            childIO.on('close',function(){
                onDisconnectFromMasterNode()
                setTimeout(() => {
                    console.error(new Date(),'Child Nodes : Connection to Master Node Closed. Attempting Reconnect...');
                    createChildNodeConnection()
                },3000)
            })
            childIO.on('error',function(err){
                console.error(new Date(),'Child Nodes ERROR : ', err.message);
                childIO.close()
            })
        }
        createChildNodeConnection()
        function sendDataToMasterNode(data){
            childIO.send(JSON.stringify(data))
        }
        s.cx = sendDataToMasterNode;
        // replace internal functions with bridges to master node
        s.tx = function(x,y){
            sendDataToMasterNode({f:'s.tx',data:x,to:y})
        }
        s.userLog = function(x,y){
            sendDataToMasterNode({f:'s.userLog',mon:x,data:y})
        }
        s.queuedSqlCallbacks = {}
        s.sqlQuery = function(query,values,onMoveOn){
            var callbackId = s.gid()
            if(!values){values=[]}
            if(typeof values === 'function'){
                var onMoveOn = values;
                var values = [];
            }
            if(typeof onMoveOn === 'function')s.queuedSqlCallbacks[callbackId] = onMoveOn;
            sendDataToMasterNode({f:'sql',query:query,values:values,callbackId:callbackId});
        }
        s.knexQuery = function(options,onMoveOn){
            var callbackId = s.gid()
            if(typeof onMoveOn === 'function')s.queuedSqlCallbacks[callbackId] = onMoveOn;
            sendDataToMasterNode({f:'knex',options:options,callbackId:callbackId});
        }
    }
}
