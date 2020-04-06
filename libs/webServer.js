var fs = require('fs');
var http = require('http');
var https = require('https');
var express = require('express');
var app = express();

module.exports = function (s, config, lang, io) {

    var standardOptions = {
        baseUrl: '',
        useUWebsocketJs: true,
        webPaths: {
            admin: '/admin',    // Admin uri
            home: '/',          // Main access uri
            libs: '/libs',      // Libraries uri
            super: '/super',    // Super User uri
            apiPrefix: this.webPaths.home,
            adminApiPrefix: this.webPaths.admin,
            superApiPrefix: this.webPaths.super,
        },
        renderPaths: {
            index: 'pages/index',
            home: 'pages/home',
            admin: 'pages/admin',
            super: 'pages/super',
            factorAuth: 'pages/factor',
            streamer: 'pages/streamer',
            dashcam: 'pages/dashcam',
            embed: 'pages/embed',
            timelapse: 'pages/timelapse',
            mpjeg: 'pages/mjpeg',
            grid: 'pages/grid',
            cycle: 'pages/cycle',
        }
    }

    // Combine objects
    config = Object.assign(config, standardOptions);

    // Get page URL
    config.baseURL = s.checkCorrectPathEnding(config.baseURL)

    // API Prefix
    config.webPaths.apiPrefix = s.checkCorrectPathEnding(config.webPaths.apiPrefix)

    // Admin API Prefix
    config.webPaths.adminApiPrefix = s.checkCorrectPathEnding(config.webPaths.adminApiPrefix)

    // Super API Prefix
    config.webPaths.superApiPrefix = s.checkCorrectPathEnding(config.webPaths.superApiPrefix)

    // SSL options
    var wellKnownDirectory = s.mainDirectory + '/web/.well-known'
    if (fs.existsSync(wellKnownDirectory)) app.use('/.well-known', express.static(wellKnownDirectory))
    if (config.ssl && config.ssl.key && config.ssl.cert) {
        config.ssl.key = fs.readFileSync(s.checkRelativePath(config.ssl.key), 'utf8')
        config.ssl.cert = fs.readFileSync(s.checkRelativePath(config.ssl.cert), 'utf8')
        if (config.ssl.port === undefined) {
            config.ssl.port = 443
        }
        if (config.ssl.bindip === undefined) {
            config.ssl.bindip = config.bindip
        }
        if (config.ssl.ca && config.ssl.ca instanceof Array) {
            config.ssl.ca.forEach(function (v, n) {
                config.ssl.ca[n] = fs.readFileSync(s.checkRelativePath(v), 'utf8')
            })
        }
        var serverHTTPS = https.createServer(config.ssl, app);
        serverHTTPS.listen(config.ssl.port, config.bindip, function () {
            console.log('SSL ' + lang.Shinobi + ' : SSL Web Server Listening on ' + config.ssl.port);
        });
        if (config.webPaths.home !== '/') {
            io.attach(serverHTTPS, {
                path: '/socket.io',
                transports: ['websocket']
            })
        }
        io.attach(serverHTTPS, {
            path: s.checkCorrectPathEnding(config.webPaths.home) + 'socket.io',
            transports: ['websocket']
        })
        io.attach(serverHTTPS, {
            path: s.checkCorrectPathEnding(config.webPaths.admin) + 'socket.io',
            transports: ['websocket']
        })
        io.attach(serverHTTPS, {
            path: s.checkCorrectPathEnding(config.webPaths.super) + 'socket.io',
            transports: ['websocket']
        })
    }
    // Start HTTP
    var server = http.createServer(app);
    server.listen(config.port, config.bindip, function () {
        console.log(lang.Shinobi + ' : Web Server Listening on ' + config.port);
    });
    if (config.webPaths.home !== '/') {
        io.attach(server, {
            path: '/socket.io',
            transports: ['websocket']
        })
    }
    io.attach(server, {
        path: s.checkCorrectPathEnding(config.webPaths.home) + 'socket.io',
        transports: ['websocket']
    })
    io.attach(server, {
        path: s.checkCorrectPathEnding(config.webPaths.admin) + 'socket.io',
        transports: ['websocket']
    })
    io.attach(server, {
        path: s.checkCorrectPathEnding(config.webPaths.super) + 'socket.io',
        transports: ['websocket']
    })
    if (config.useUWebsocketJs === true) {
        io.engine.ws = new (require('cws').Server)({
            noServer: true,
            perMessageDeflate: false
        })
    }
    return app
}
