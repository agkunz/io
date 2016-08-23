#!/usr/bin/env node
var WebSocketServer = require('websocket').server;
var http = require('http');

var env = require(__dirname + '/env.js')();

/////////////////////////////////////////////////

var server = http.createServer(begin);

server.listen(8082, startAlert);

wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

wsServer.on('request', request);

/////////////////////////////////////////////////

var connections = [];
var script_root = './';

function request (request)
{
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }

    console.log((new Date()) + ' Connection accepted.');

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
            console.log (script_root+message.route+'.js');
            
            var response = require (env.SCRIPT_ROOT+message.route+'.js')(message);
            
            Promise.resolve (response)
                .then (broadcast)
                .catch (broadcast);
        } 

        catch (ex) {

            console.log('ERROR: '+ex.code);
            console.log(ex);

            broadcast({ success : false, message : ex.code });
        }
    }

    function send (object)
    {
        connection.send(JSON.stringify(object));
    }

    function cleanup (reasonCode, description)
    {
        var index = connections.indexOf(connection);

        if (index !== -1) {
            console.log((new Date()) + ' lws-mirror-protocol peer ' + connection.remoteAddress + ' disconnected, code: ' + reasonCode + '.');
            connections.splice(index, 1);
        }
    }
}

function broadcast (object)
{
    console.log('b: '+object.message);

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
    console.log((new Date()) + ' Server is listening on port 8082');
}

function begin (request, response)
{
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
}