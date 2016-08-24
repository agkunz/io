#!/usr/bin/env node
var WebSocketServer = require('websocket').server;
var http = require('http');


var moment = require('moment');
var colors = require('colors');

/////////////////////////////////////////////////

global.env = require(__dirname + '/env.js')();
global.log = log;

var server = http.createServer(begin);
var connections = [];

__construct();

/////////////////////////////////////////////////

function __construct ()
{
    server.listen(8082, startAlert);

    wsServer = new WebSocketServer({
        httpServer: server,
        autoAcceptConnections: false
    });

    wsServer.on('request', request);
}

function log (message)
{
    var date = moment().format('YYYY-MM-DD h:mm:ssa');
    var message = '[%d] '.replace('%d', date).cyan + message;

    console.log(message);
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

    connection.on('message', respond);
    connection.on('close', cleanup);
    
    function respond (message)
    {
        message = JSON.parse(message.utf8Data);

        if (!message.route) {
            return broadcast({ success : false, error : 'You must supply an endpoint' });
        }

        try {

            var response = require (global.env.SCRIPT_ROOT+message.route+'.js')(message, connection);
            
            Promise.resolve (response)
                .then (broadcast)
                .catch (broadcast);
        } 

        catch (ex) {

            if (ex.code === 'MODULE_NOT_FOUND') {
                return send({ 
                    from : 'system', 
                    status : false, 
                    message : 'That\'s not a real command.' 
                });
            }

            if (typeof ex === 'string') {
                message = ex;
            } else {
                message = ex.code;
            }

            console.log(ex);

            log(('ERROR:  '+ message).red);

            broadcast({ 
                success : false,
                from : 'system',
                message : message 
            });
        }
    }

    function send (object)
    {
        connection.send(JSON.stringify(object));
    }

    function cleanup (reasonCode, description)
    {
        var index = connections.indexOf(connection);

        if (index === -1) return;
            
        log((
            'Connection from %o ' 
            + 'disconnected'.bold
            + ', code %c.')
            .replace ('%o', connection.remoteAddress)
            .replace ('%c', reasonCode)
        );

        connections.splice(index, 1);
    }
}

function broadcast (object)
{
    log(('b: ' + object.message).yellow);

    for (var key in connections) {
        connections[key].send(JSON.stringify(object));
    }
}

function originIsAllowed (origin)
{
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

function startAlert ()
{
    log('Server is listening on port 8082'.cyan);
}

function begin (request, response)
{
    log('Received request for ' + request.url);
    response.writeHead(404);
    response.end();
}