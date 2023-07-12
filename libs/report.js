module.exports = function(s,config,lang){
    const {
        getPartsFromPath,
        zipFolder,
        copyFile,
    } = require('../basic/utils.js')(process.cwd(), config)
    const {
        getStreamDirectory,
    } = require('../../monitor/utils.js')(s,app,config,lang)
    async function copyFilesToReportFolder(folder,targetDirectory,filePaths){
        for (let i = 0; i < filePaths.length; i++) {
            var filePath = filePaths[i]
            const {
                monitorId,
                filename,
            } = getPartsFromPath(videoPath)
            const newPath = `${targetDirectory}/${folder}/${monitorId}-${filename}`
            await copyFile(videoPath, newPath)
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
    async function saveReport(options){
        const {
            ke,
            mid,
            name,
            tags,
            notes,
            details,
            snapPaths,
            videoPaths,
            fileBinPaths,
        } = options;
        const currentTime = new Date()
        const newReportId = await getNewReportId(ke,mid)
        // save files to zip
        const zipName = `Report-${currentTime.getTime()}`
        const tempDirectory = `${getStreamDirectory({ke, mid})}${zipName}`
        if(snapPaths)await copyFilesToReportFolder('images', tempDirectory,snapPaths);
        if(videoPaths)await copyFilesToReportFolder('videos', tempDirectory,videoPaths);
        if(fileBinPaths)await copyFilesToReportFolder('fileBin', tempDirectory,fileBinPaths);
        // finish zip move!!!!!!
        const outputZipPath = `${tempDirectory}.zip`
        const moveZipToPath = `${tempDirectory}.zip`
        await zipFolder(tempDirectory,outputZipPath)
        await copyFile(outputZipPath, moveZipToPath)
        // put added information about video
        // - length of videos
        // - format of videos
        // - source of videos
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
        }
        const insertResponse = await s.knexQueryPromise({
            action: "insert",
            table: "Reports",
            insert: insertQuery
        })
        // toggle check for archiving associated videos
        return {
            insertQuery,
            insertResponse,
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
    app.post(config.webPaths.apiPrefix+':auth/reports/:ke/:id', function (req,res){
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params, async function(user){
            const response = {ok: true}
            const monitorId = req.params.id
            const groupKey = req.params.ke
            const reportId = req.body.id
            const name = req.body.name
            const tags = req.body.tags
            const notes = req.body.notes
            const details = s.getPostData(req, 'details', true) || {}
            const snapPaths = s.getPostData(req, 'snapPaths', true) || []
            const videoPaths = s.getPostData(req, 'videoPaths', true) || []
            const fileBinPaths = s.getPostData(req, 'fileBinPaths', true) || []
            const canDoAction = hasApiPermission(user,groupKey,monitorId)
            if(canDoAction){
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
                            snapPaths,
                            videoPaths,
                            fileBinPaths,
                        })
                        response.updateResponse = updateResponse
                    }else{
                        const saveResponse = await saveReport({
                            ke: groupKey,
                            mid: monitorId,
                            name,
                            tags,
                            notes,
                            details,
                            snapPaths,
                            videoPaths,
                            fileBinPaths,
                        })
                        response.saveResponse = saveResponse
                    }
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
    /**
    * API : Save Report
     */
    app.post(config.webPaths.apiPrefix+':auth/reports/:ke/:id', function (req,res){
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params, async function(user){
            const response = {ok: true}
            const monitorId = req.params.id
            const groupKey = req.params.ke
            const name = req.body.name
            const tags = req.body.tags
            const notes = req.body.notes
            const details = s.getPostData(req, 'details', true) || {}
            const snapPaths = s.getPostData(req, 'snapPaths', true) || []
            const videoPaths = s.getPostData(req, 'videoPaths', true) || []
            const fileBinPaths = s.getPostData(req, 'fileBinPaths', true) || []
            const canDoAction = hasApiPermission(user,groupKey,monitorId)
            if(canDoAction){
                try{
                    const updateResponse = await updateReport({
                        ke: groupKey,
                        mid: monitorId,
                        name,
                        tags,
                        notes,
                        details,
                        snapPaths,
                        videoPaths,
                        fileBinPaths,
                    })
                    response.updateResponse = updateResponse
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
    s.definitions["Report Manager"] = {
         "section": "Report Manager",
         "blocks": {
             "Created Reports": {
                "name": lang["Created Reports"],
                "color": "green",
                "info": [
                    {
                        "field": lang.Monitor,
                        "fieldType": "select",
                        "class": "monitors_list",
                        "possible": [
                            {
                               "name": lang['All'],
                               "value": ""
                            },
                        ]
                    },
                    {
                        "fieldType": "div",
                        "id": "report-manager-created-list",
                    }
               ]
             },
             "Report Display": {
                "color": "green",
                "noHeader": true,
                "noDefaultSectionClasses": true,
                "info": [
                    {
                        "fieldType": "div",
                        "id": "report-manager-display",
                    }
               ]
             }
        }
    }
    s.definitions["Report Manager Submission Form"] = {
        "section": "Report Manager Submission Form",
        blocks: {
            "Form": {
               "name": "Report Manager Submission Form",
               "color": "grey",
               "info": [
                   {
                       "name": "name",
                       "field": "Name",
                       "description": "A unique identifier for each report",
                       "fieldType": "text"
                   },
                   {
                       "name": "detail=submittedBy",
                       "field": "Submitted By",
                       "description": "The name and contact information of the person or organization submitting the report",
                       "fieldType": "text"
                   },
                   {
                       "name": "detail=caseReferenceNumber",
                       "field": "Case Reference Number",
                       "description": "The case number for easy reference",
                       "fieldType": "text"
                   },
                   {
                       "name": "detail=videoTitle",
                       "field": "Video Title",
                       "description": "A brief title or description of the video",
                       "fieldType": "text"
                   },
                   {
                       "name": "detail=videoSource",
                       "field": "Video Source",
                       "description": "Information about where the video was sourced from",
                       "fieldType": "textarea"
                   },
                   {
                       "name": "detail=locationOfIncident",
                       "field": "Location of Incident",
                       "description": "The specific location where the incident in the video took place",
                       "fieldType": "text"
                   },
                   {
                       "name": "incidentTime",
                       "field": "Date and Time of Incident",
                       "description": "The exact date and time when the incident occurred",
                       "fieldType": "text"
                   },
                   {
                       "name": "detail=descriptionOfIncident",
                       "field": "Description of Incident",
                       "description": "A detailed description of the incident captured in the video",
                       "fieldType": "textarea"
                   },
                   {
                       "name": "detail=involvedParties",
                       "field": "Involved Parties",
                       "description": "Information about the individuals or entities involved in the incident, if known",
                       "fieldType": "textarea"
                   },
                   {
                       "name": "detail=keyTimestamps",
                       "field": "Key Timestamps",
                       "description": "Specific timestamps in the video where important events occur",
                       "fieldType": "textarea"
                   },
                   {
                       "name": "detail=attachedVideoFile",
                       "field": "Attached Video File",
                       "description": "The actual video file or a secure link to the video file",
                       "fieldType": "text"
                   },
                   {
                       "name": "detail=additionalNotes",
                       "field": "Additional Notes",
                       "description": "Any additional information or context that might be relevant to the incident",
                       "fieldType": "textarea"
                   },
                   {
                       "name": "detail=verification",
                       "field": "Verification",
                       "description": "A statement by the person submitting the report that the information provided is accurate to the best of their knowledge",
                       "fieldType": "textarea"
                   }
               ]
           }
        }
    }
}
