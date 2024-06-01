
module.exports = function(s,config,lang,app,io){
    /**
    * API : Get Available Plugins
    */
    app.get(config.webPaths.apiPrefix+':auth/plugins/:ke',function (req,res){
        var response = {ok: true};
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            response.plugins = [
                ...s.detectorPluginArray.map(item => {
                    return {
                       "name": item,
                       "value": item
                    }
                })
            ];
            res.end(s.prettyPrint(response));
        },res,req);
    })
}
