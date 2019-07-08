var os = require('os');

// s = Shinobi
const s = {
    //Total Memory
    coreCount : os.cpus().length,
    //Total Memory
    totalmem : os.totalmem(),
    //Check Platform
    platform : os.platform(),
    //JSON stringify short-hand
    s : JSON.stringify,
    //Pretty Print JSON
    prettyPrint : function(obj){return JSON.stringify(obj,null,3)},
    //Check if Windows
    isWin : (process.platform === 'win32' || process.platform === 'win64'),
    //UTC Offset
    utcOffset : require('moment')().utcOffset(),
    //directory path for this file
    mainDirectory : __dirname
};

const init = (process) => {
    var packageJson = require('../package.json')
    process.send = process.send || function () {};
    process.on('uncaughtException', function (err) {
        console.error('Uncaught Exception occured!');
        console.error(err.stack);
    });
    // [CTRL] + [C] = exit
    process.on('SIGINT', function() {
        s.onProcessExitExtensions.forEach(function(extender){
            extender()
        })
        console.log('Shinobi is Exiting...')
        process.exit();
    });
    s.packageJson = packageJson
    if(packageJson.mainDirectory){
        s.mainDirectory = require('path').resolve('.')
        console.log(s.mainDirectory)
    }
    return s
};

const getS = () => s;

module.exports = {
    getS: getS,
    init: init,
};
