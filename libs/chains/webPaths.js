module.exports = (s,config,lang,app,io) => {
    const {
        getChains,
    } = require('./chains/core.js')(s,config)
    /**
    * API : Get Logs
     */
    app.get([
        config.webPaths.apiPrefix+':auth/chains/:ke',
        config.webPaths.apiPrefix+':auth/chains/:ke/:id'
    ], function (req,res){
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            const groupKey = req.params.ke
            const monitorId = req.params.id
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
            getChains(groupKey).then((response) => {
                s.closeJsonResponse(res,{
                    ok: true,
                    chains: response,
                })
            })
        },res,req)
    })
}
