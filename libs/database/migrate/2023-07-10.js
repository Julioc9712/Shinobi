module.exports = async function(s,config){
    s.debugLog('Updating database to 2023-03-11')
    const {
        alterColumn,
    } = require('../utils.js')(s,config)
    await createTable('Reports',[
        isMySQL ? {name: 'utf8', type: 'charset'} : null,
        isMySQL ? {name: 'utf8_general_ci', type: 'collate'} : null,
        {name: 'id', length: 25, type: 'string'},
        {name: 'ke', length: 50, type: 'string'},
        {name: 'mid', length: 100, type: 'string'},
        {name: 'name', length: 100, type: 'string'},
        {name: 'tags', length: 500, type: 'string'},
        {name: 'notes', length: 6000, type: 'string'},
        {name: 'location', length: 100, type: 'string'},
        {name: 'details', type: 'text'},
        {name: 'time', type: 'timestamp', defaultTo: currentTimestamp()},
        {name: 'incidentTime', type: 'timestamp', defaultTo: currentTimestamp()},
    ]);
}
