const fs = require('fs').promises
module.exports = function(s,config,lang,app,io){
    const {
        getPartsFromPath,
        zipFolder,
        copyFile,
    } = require('./basic/utils.js')(process.cwd(), config)
    const {
        getStreamDirectory,
    } = require('./monitor/utils.js')(s,config,lang)
    async function copyFilesToReportFolder(folder,targetDirectory,filePaths){
        for (let i = 0; i < filePaths.length; i++) {
            var filePath = filePaths[i]
            const {
                monitorId,
                filename,
            } = getPartsFromPath(filePath)
            const parentFolder = `${targetDirectory}/${folder}`
            const newPath = `${parentFolder}/${monitorId}-${filename}`
            try{
                await fs.mkdir(parentFolder,{recursive: true})
            }catch(err){
                s.debugLog(err)
            }
            s.debugLog(filePath, '---->', newPath)
            await copyFile(filePath, newPath)
        }
    }
    async function getReports(groupKey, monitorId, reportId){
        const whereQuery = [
            ['ke','=', groupKey],
        ]
        if(monitorId)whereQuery.push(['mid','=', monitorId]);
        if(reportId)whereQuery.push(['id','=', reportId]);
        const selectResponse = await s.knexQueryPromise({
            action: "select",
            columns: "*",
            table: "Reports",
            where: whereQuery,
        })
        return selectResponse
    }
    async function getNewReportId(groupKey, monitorId){
        const newReportId = s.gid(25)
        const reports = await getReports(groupKey,monitorId,newReportId)
        if(reports[0]){
            return await getNewReportId(groupKey, monitorId)
        }else{
            return newReportId
        }
    }
    async function moveZipToFileBin({
        ke,
        mid,
        zipName,
        newReportId,
        currentTime,
        outputZipPath,
        moveZipToPath,
    }){
        await copyFile(outputZipPath, moveZipToPath)
        await fs.rm(outputZipPath)
        const fileStats = await fs.stat(moveZipToPath)
        const fileBinInsertQuery = {
            ke,
            mid,
            name: `${zipName}.zip`,
            size: fileStats.size,
            details: JSON.stringify({
                reportId: newReportId
            }),
            archive: 1,
            status: 1,
            time: currentTime,
            type: 'report'
        }
        await s.insertFileBinEntry(fileBinInsertQuery)
    }
    async function saveReport(options){
        const {
            ke,
            mid = '_USER',
            name,
            tags,
            notes,
            details,
            incidentTime,
            snapPaths,
            videoPaths,
            videoSnapLegend,
        } = options;
        try{
            const currentTime = new Date()
            s.debugLog(`Getting new ID...`,currentTime)
            const newReportId = await getNewReportId(ke,mid)
            s.debugLog(`New Report ID`,newReportId)
            const zipName = `Report-${currentTime.getTime()}`
            s.debugLog(`zipName`,zipName)
            const tempDirectory = `${getStreamDirectory({ke})}${zipName}`
            const moveZipToDirectory = `${await s.createFileBinDirectory({ke, mid})}${zipName}`
            s.debugLog(`Copying Files...`)
            try{
                await fs.mkdir(tempDirectory, {recursive: true})
            }catch(err){
                s.debugLog('saveReport fs.mkdir error',err)
            }
            if(snapPaths)await copyFilesToReportFolder('images', tempDirectory,snapPaths);
            if(videoPaths)await copyFilesToReportFolder('videos', tempDirectory,videoPaths);
            s.debugLog(`Copied Files!`)
            const outputZipPath = `${tempDirectory}.zip`
            const moveZipToPath = `${moveZipToDirectory}.zip`
            s.debugLog(`outputZipPath`,outputZipPath)
            s.debugLog(`Zipping...`,moveZipToPath)
            // save files to zip
            await zipFolder(tempDirectory,outputZipPath)
            s.debugLog(`Zipped! Cleaning up...`)
            await fs.rm(tempDirectory, { recursive: true })
            s.debugLog(`Archiving in FileBin...`)
            await moveZipToFileBin({
                ke,
                mid,
                zipName,
                newReportId,
                currentTime,
                outputZipPath,
                moveZipToPath,
            })
            s.debugLog(`Archived!`)
            // added info
            details.videoSource = details.videoSource || `${lang.videoSourcePlaceholder}`
            // save database row
            const insertQuery = {
                id: newReportId,
                ke,
                mid,
                name,
                tags,
                notes,
                details: JSON.stringify(details),
                time: currentTime,
                incidentTime: new Date(incidentTime),
            }
            s.debugLog(`Inserting Report...`)
            const insertResponse = await s.knexQueryPromise({
                action: "insert",
                table: "Reports",
                insert: insertQuery
            })
            s.debugLog(`Inserted Report!`)
            // toggle check for archiving associated videos
            return {
                insertQuery,
                insertResponse,
            }
        }catch(err){
            s.debugLog('saveReport error',err)
        }
    }
    async function updateReport(options){
        const groupKey = `${options.ke}`
        const monitorId = `${options.mid}`
        const reportId = `${options.id}`
        delete(options.ke)
        delete(options.mid)
        delete(options.id)
        return await s.knexQueryPromise({
            action: "update",
            table: "Reports",
            update: options,
            where: [
                ['ke','=',groupKey],
                ['mid','=',monitorId],
                ['id','=',reportId],
            ]
        })
    }
    async function deleteReport(groupKey,monitorId,reportId){
        return await s.knexQueryPromise({
            action: "delete",
            table: "Reports",
            where: [
                ['ke','=',groupKey],
                ['mid','=',monitorId],
                ['id','=',reportId],
            ]
        })
    }
    async function emailReport(report,sendTo){
        // from configured email settings to specified email
    }
    async function uploadReport(){
        // to cloud storage backup location
    }
    function getVideoPaths(videoList){
        videoList.map((item) => {
            const ext = item.ext || 'mp4'
            const filename = `${s.formattedTime(item.time)}.${ext}`
            return s.getVideoDirectory(item) + filename
        })
    }
    function getVideoPaths(theList){
        theList.map((item) => {
            const ext = item.ext || 'mp4'
            const filename = `${s.formattedTime(item.time)}.${ext}`
            return s.getVideoDirectory(item) + filename
        })
    }
    function getTimelapseFramesPaths(theList){
        theList.map((item) => {
            const filename = item.path
            return s.getTimelapseFrameDirectory(item) + filename
        })
    }
    function getTimelapseFramesPaths(theList){
        theList.map((item) => {
            const filename = item.filename
            return s.getFileBinDirectory(item) + filename
        })
    }
    function hasApiPermission(user,groupKey,monitorId){
        const {
            monitorPermissions,
            monitorRestrictions,
        } = s.getMonitorsPermitted(user.details,monitorId)
        const {
            isRestricted,
            isRestrictedApiKey,
            apiKeyPermissions,
        } = s.checkPermission(user);
        if(
            isRestrictedApiKey && apiKeyPermissions.watch_videos_disallowed ||
            isRestricted && (
                monitorId && !monitorPermissions[`${monitorId}_video_view`] ||
                monitorRestrictions.length === 0
            )
        ){
            return false
        }
        return true
    }
    function getSnapPathsFromVideos(videos){
        var videoPaths = []
        var snapPaths = []
        var videoSnapLegend = {}
        videos.forEach((video) => {
            var videoPath = s.getVideoDirectory(video) + video.filename
            var frames = video.timelapseFrames || []
            videoPaths.push(videoPath)
            videoSnapLegend[`${videoPath}`] = []
            frames.forEach((frame) => {
                var selectedDate = frame.filename.split('T')[0]
                var snapPath = `${s.getTimelapseFrameDirectory(frame)}${selectedDate}/${frame.filename}`
                snapPaths.push(snapPath)
                videoSnapLegend[`${videoPath}`].push(snapPath)
            })
        })
        return {
            videoPaths,
            snapPaths,
            videoSnapLegend,
        }
    }
    /**
    * API : Get Reports
     */
    app.get([
        config.webPaths.apiPrefix+':auth/reports/:ke',
        config.webPaths.apiPrefix+':auth/reports/:ke/:id',
        config.webPaths.apiPrefix+':auth/reports/:ke/:id/:reportId',
    ], function (req,res){
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params, async function(user){
            const response = {ok: true}
            const monitorId = req.params.id
            const groupKey = req.params.ke
            const reportId = req.params.reportId
            const canDoAction = hasApiPermission(user,groupKey,monitorId)
            if(canDoAction){
                try{
                    const reports = await getReports(groupKey,monitorId,reportId)
                    response.reports = reports
                }catch(err){
                    response.ok = false
                    response.err = err
                }
            }else{
                response.ok = false
                response.msg = lang['Not Authorized']
            }
            s.closeJsonResponse(res,response)
        },res,req);
    });
    /**
    * API : Save/Update Report
     */
    app.post(config.webPaths.apiPrefix+':auth/reports/:ke', function (req,res){
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params, async function(user){
            const response = {ok: true}
            const monitorId = req.body.mid
            const groupKey = req.params.ke
            // const canDoAction = hasApiPermission(user,groupKey,monitorId)
            // if(canDoAction){
                const reportId = req.body.id
                const name = req.body.name
                const tags = req.body.tags
                const notes = req.body.notes
                const incidentTime = req.body.incidentTime
                const details = s.getPostData(req, 'details', true) || {}
                try{
                    if(reportId){
                        const updateResponse = await updateReport({
                            id: reportId,
                            ke: groupKey,
                            mid: monitorId,
                            name,
                            tags,
                            notes,
                            details,
                            incidentTime,
                        })
                        response.updateResponse = updateResponse
                    }else{
                        const videosSelected = s.getPostData(req, 'videos', true) || []
                        const {
                            snapPaths,
                            videoPaths,
                            videoSnapLegend,
                        } = getSnapPathsFromVideos(videosSelected)
                        const fileBinPaths = []
                        s.debugLog('saving report')
                        const saveResponse = await saveReport({
                            ke: groupKey,
                            mid: monitorId,
                            name,
                            tags,
                            notes,
                            details,
                            incidentTime,
                            snapPaths,
                            videoPaths,
                            videoSnapLegend,
                        })
                        s.debugLog(`saveResponse`,saveResponse)
                        response.saveResponse = saveResponse
                    }
                }catch(err){
                    response.ok = false
                    response.err = err
                }
            // }else{
            //     response.ok = false
            //     response.msg = lang['Not Authorized']
            // }
            s.closeJsonResponse(res,response)
        },res,req);
    });
    /**
    * API : Delete Report
     */
    app.get(config.webPaths.apiPrefix+':auth/reports/:ke/:id/:reportId/delete', function (req,res){
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params, async function(user){
            const response = {ok: true}
            const monitorId = req.params.id
            const groupKey = req.params.ke
            const reportId = req.params.reportId
            const canDoAction = hasApiPermission(user,groupKey,monitorId)
            if(canDoAction){
                try{
                    const deleteResponse = await deleteReport(groupKey,monitorId,reportId)
                    response.deleteResponse = deleteResponse
                }catch(err){
                    response.ok = false
                    response.err = err
                }
            }else{
                response.ok = false
                response.msg = lang['Not Authorized']
            }
            s.closeJsonResponse(res,response)
        },res,req);
    });
}
