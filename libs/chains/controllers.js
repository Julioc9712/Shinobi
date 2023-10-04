module.exports = function(s,config,lang){
    const {
        addChainControllerToExtender,
    } = require('./core.js')(s,config)
    s.allExtensions.forEach((nameOfExtension) => {
        addChainControllerToExtender(nameOfExtension)
    })
}
