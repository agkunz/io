#!/usr/bin/env node
var WebSocketServer = require('websocket').server;
var http = require('http');
var https = require('https');
var fs = require('fs');

var moment = require('moment');
var colors = require('colors');

/////////////////////////////////////////////////

global.env = require(__dirname + '/../../env.js');
global.log = log;

// listen for spotify requests
var web = require(env.SERVER_ROOT + '/spotify.js');

var server = null;
var connections = [];

__construct();

/////////////////////////////////////////////////

function __construct ()
{
    // configure ssl if we need it
    if (env.SOCKET_PROTOCOL === 'wss') {

        var options = {
          key: fs.readFileSync(env.SSL_KEY, 'utf8'),
          cert: fs.readFileSync(env.SSL_CERTIFICATE, 'utf8'),
          ca: fs.readFileSync(env.SSL_CA, 'utf8')
        };

        server = https.createServer(options).listen(env.SOCKET_PORT, startAlert);;

    } else {
        
        server = http.createServer().listen(env.SOCKET_PORT, startAlert);
    }

    function startAlert () { log(('Listening for WS on port %p'.cyan).replace('%p', env.SOCKET_PORT)); }

    // start up a socket server, use the http server
    wsServer = new WebSocketServer({
        httpServer: server,
        autoAcceptConnections: false
    });

    // process requests
    wsServer.on('request', request);

    // do stuff on quit
    process.on('SIGINT', shutdown);

    function shutdown()
    {
        broadcast ({ 
            message : 'Going down for maintenance.',
            command : 'disconnect'
        });

        for (var key in connections) {
            connections[key].close(4000, 'Going down for maintenance.');
        }

        process.exit();
    }

    function request (request)
    {
        if (!originIsAllowed(request.origin)) {
            // Make sure we only accept requests from an allowed origin
            request.reject();
            log(('Connection from %o %s.')
                .replace('%o', request.remoteAddress)
                .replace('%s', 'rejected'.bold));
            return;
        }

        log(('Connection from %o %s.')
            .replace('%o', request.remoteAddress)
            .replace('%s', 'accepted'.bold));

        var connection = request.accept('echo-protocol', request.origin);

        connections.push(connection);

        connection.on('message', respond);
        connection.on('close', cleanup);
        
        function respond (message)
        {
            try {

                message = JSON.parse(message.utf8Data);

                if (!message.route) {
                    return send({ 
                        from : '@system',
                        to : '#system',
                        message : 'You must supply an endpoint'
                    });
                }

                var action = env.SERVER_ROOT + '/controllers/' + message.route + '.js';

                var response = require (action)(message, connection);

                Promise.resolve (response)
                    .then (success)
                    .catch (error);
            } 

            catch (ex) {
                error (ex);
            }

            function send (object) { connection.send(JSON.stringify(object)); }

            function success (response)
            {
                if (!response.to) {
                    return broadcast (response);
                }

                if (response.to === '#system') {
                    return send (response);
                }

                if (response.to.startsWith('#')) {
                    return sendToChannel (response.to, response);
                }

                if (response.to.startsWith('@')) {
                    return sendToSession (response.to, response);
                }
            }

            function error (ex)
            {
                log(('ERROR:  '+ message).red);

                if (ex.code === 'MODULE_NOT_FOUND') {
                    return send({ 
                        from : '@system', 
                        to : '#system',
                        status : false, 
                        message : 'That\'s not a real command.' 
                    });
                }

                if (typeof ex === 'string') {
                    message = ex;
                } else {
                    message = ex.code;
                }

                send({ 
                    from : '@system',
                    to : '#system',
                    message : message 
                });
            }
        }

        function cleanup (reasonCode, description)
        {
            var index = connections.indexOf(connection);

            var action = env.SERVER_ROOT + '/controllers/part.js';

            if (index === -1) return;

            //  remove from all channels
            if (connection.user && connection.user.channels.length) {
                for (var key in connection.user.channels) {
                    require(action)({ channel : connection.user.channels[key] }, connection);
                }
            }

            log(('Connection from %o %s, code %c.')
                .replace ('%o', connection.remoteAddress)
                .replace ('%s', 'disconnected'.bold)
                .replace ('%c', reasonCode));

            connections.splice(index, 1);
        }

        function originIsAllowed (origin)
        {
          // put logic here to detect whether the specified origin is allowed.
          return true;
        }
    }
}

function sendSystemMessage (connection, message)
{
    connection.send(JSON.stringify({
        from : 'system',
        to : connection.user.username,
        command : 'sendSystemMessage',
        message : message,
    }));
}

function broadcast (response)
{
    log (('%from : %to > %message'.red)
        .replace('%from', 'broadcast')
        .replace('%to', '#system')
        .replace ('%message', response.message.white));

    for (var key in connections) {
        connections[key].send(JSON.stringify(response));
    }
}

function sendToChannel (channel, response)
{
    log(('%to : %from > %message'.red)
        .replace ('%from', response.from)
        .replace ('%to', response.to)
        .replace ('%message', response.message.white));

    var cons = connections
        .filter(function (con)
        {
            return con.user.channels
                .filter(function (cha) { return cha === channel; })
                .length;
        });

    for (var key in cons)
    {
        cons[key].send(JSON.stringify(response));
    }
}

function sendToSession (username, response)
{
    var cons = connections.filter(function (con) { connection.user.username === username; });

    if (!cons.length) return false;

    var con = cons.shift();
    
    con.send(JSON.stringify(response));
}

function log (message)
{
    var date = moment().format('YYYY-MM-DD h:mm:ssa');
    var message = '[%d] '.replace('%d', date).cyan + message;

    console.log(message);
}