#!/usr/bin/env node
var WebSocketServer = require('websocket').server;
var http = require('http');

/////////////////////////////////////////////////

var server = http.createServer(begin);

server.listen(8082, startAlert);

wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

wsServer.on('request', respond);

/////////////////////////////////////////////////

var connections = [];

function respond (request)
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

    connection.on('message', digest);
    connection.on('close', cleanup);

    function digest (message)
    {
        message = JSON.parse(message.utf8Data);

        if (!message.route) {
            send({ error : 'You must supply an endpoint' });
        }

        try {

            var response = require('/var/www/engage/io/'+message.route+'.js')(message);

            send(response);

        } catch (ex) {
            send({ error : ex[0] });
        }

    }

    function send (object)
    {
        for (var key in connections) {
            connections[key].sendUTF(JSON.stringify(object));
        }
    }

    function cleanup (reasonCode, description)
    {
        var index = connections.indexOf(connection);

        if (index !== -1) {
            console.log((new Date()) + ' lws-mirror-protocol peer ' + connection.remoteAddress + ' disconnected, code: ' + reasonCode + '.');
            connections.splice(index, 1);
        }
    }
    
    function originIsAllowed (origin)
    {
      // put logic here to detect whether the specified origin is allowed.
      return true;
    }
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