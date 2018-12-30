#!/usr/bin/env node
var WebSocketServer = require('websocket').server;
var http = require('http');
var tls = require('tls');
var fs = require('fs');

var moment = require('moment');
var colors = require('colors');

/////////////////////////////////////////////////

global.env = require(__dirname + '/../../env.js');
global.log = log;

var server = null;
var connections = [];

__construct();

/////////////////////////////////////////////////

function __construct ()
{
    // configure ssl if we need it
    if (env.LISTEN_PROTOCOL === 'wss') {

        var options = {
          key: fs.readFileSync(env.SSL_KEY),
          cert: fs.readFileSync(env.SSL_CERTIFICATE)
        };

        server = tls.createServer(options);

    } else {
        
        server = http.createServer();
    }

    // start listening for http requests
    server.listen(env.LISTEN_PORT, startAlert);
    function startAlert () { log(('Server is listening on port %p'.cyan).replace('%p', env.LISTEN_PORT)); }

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
            log(
                ('Connection from origin %o '
                + 'rejected'.bold
                + '.'.replace('%o', request.origin))
            );
            return;
        }

        log(
            ('Connection from %o '
            + 'accepted'.bold
            + '.')
            .replace('%o', request.remoteAddress)
        );

        var connection = request.accept('echo-protocol', request.origin);

        connections.push(connection);

        // sendSystemMessage (connection, 'Connected.');

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
                console.log(ex);
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

        function send (object) { connection.send(JSON.stringify(object)); }

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

            log((
                'Connection from %o ' 
                + 'disconnected'.bold
                + ', code %c.')
                .replace ('%o', connection.remoteAddress)
                .replace ('%c', reasonCode)
            );

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
    var object = {
        from : 'system',
        to : connection.user.username,
        command : 'sendSystemMessage',
        message : message,
    }

    connection.send(JSON.stringify(object));
}

function broadcast (response)
{
    response.from = '@system';

    var m = ('broadcast : @system >'.red + ' %message')
        .replace ('%message', response.message);

    log (m);

    for (var key in connections) {
        connections[key].send(JSON.stringify(response));
    }
}

function sendToChannel (channel, response)
{
    var m = ('%to : %from >'.red + ' %message')
        .replace ('%from', response.from)
        .replace ('%to', response.to)
        .replace ('%message', response.message);

    log (m);

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