module.exports = (s,config,lang,app,io) => {
    const {
        getChains,
        saveChain,
        deleteChain,
    } = require('./core.js')(s,config)
    /**
    * API : Save Chain (Add New)
     */
    app.post([
        config.webPaths.apiPrefix+':auth/chains/:ke'
    ], function (req,res){
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            const groupKey = req.params.ke
            const chainName = req.params.name
            const {
                isRestricted,
                isRestrictedApiKey,
                apiKeyPermissions,
                userPermissions,
            } = s.checkPermission(user)
            if(
                userPermissions.edit_chains_disallowed ||
                isRestrictedApiKey && apiKeyPermissions.edit_chains_disallowed
            ){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized'], chains: []});
                return
            }
            const form = req.body
            form.ke = groupKey
            form.name = form.name || s.gid(5)
            form.next = s.parseJSON(form.next)
            form.conditions = s.parseJSON(form.conditions)
            saveChain(form).then((response) => {
                s.closeJsonResponse(res,{
                    ok: true,
                    chains: response,
                })
            })
        },res,req)
    })
    /**
    * API : Update Chain
     */
    app.post([
        config.webPaths.apiPrefix+':auth/chains/:ke'
    ], function (req,res){
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            const groupKey = req.params.ke
            const chainName = req.params.name
            const {
                isRestricted,
                isRestrictedApiKey,
                apiKeyPermissions,
                userPermissions,
            } = s.checkPermission(user)
            if(
                userPermissions.edit_chains_disallowed ||
                isRestrictedApiKey && apiKeyPermissions.edit_chains_disallowed
            ){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized'], chains: []});
                return
            }
            const form = req.body
            form.ke = groupKey
            form.name = form.name || s.gid(5)
            form.next = s.parseJSON(form.next)
            form.conditions = s.parseJSON(form.conditions)
            updateChain(form).then((response) => {
                s.closeJsonResponse(res,{
                    ok: true,
                    chains: response,
                })
            })
        },res,req)
    })
    /**
    * API : Delete Chain
     */
    app.post(config.webPaths.apiPrefix+':auth/chains/:ke/delete', function (req,res){
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            const groupKey = req.params.ke
            const chainName = req.params.name
            const {
                isRestricted,
                isRestrictedApiKey,
                apiKeyPermissions,
                userPermissions,
            } = s.checkPermission(user)
            if(
                userPermissions.edit_chains_disallowed ||
                isRestrictedApiKey && apiKeyPermissions.edit_chains_disallowed
            ){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized'], chains: []});
                return
            }
            const form = req.body
            form.ke = groupKey
            deleteChain(form).then((response) => {
                s.closeJsonResponse(res,{
                    ok: true,
                    chains: response,
                })
            })
        },res,req)
    })
    /**
    * API : Get Chain(s)
     */
    app.get([
        config.webPaths.apiPrefix+':auth/chains/:ke',
        config.webPaths.apiPrefix+':auth/chains/:ke/:name'
    ], function (req,res){
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            const groupKey = req.params.ke
            const chainName = req.params.name
            const {
                isRestricted,
                isRestrictedApiKey,
                apiKeyPermissions,
                userPermissions,
            } = s.checkPermission(user)
            if(
                userPermissions.view_chains_disallowed ||
                isRestrictedApiKey && apiKeyPermissions.view_chains_disallowed
            ){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized'], chains: []});
                return
            }
            getChains(groupKey,chainName).then((response) => {
                s.closeJsonResponse(res,{
                    ok: true,
                    chains: response,
                })
            })
        },res,req)
    })
}
