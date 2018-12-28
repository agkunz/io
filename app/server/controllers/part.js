(function ()
{
    var client = require('mongodb').MongoClient;

    var co = require('co');

    function Response (request, connection)
    {
        var params = request.params;

        return co (part)
            .then (success)
            .catch (fail);

        function* part ()
        {
            if (!connection.user) {
                throw 'You must be logged in to chat.';
            }
            
            if (params.channel.startsWith('@'))
                throw 'Not implemented yet';

            if (!params.channel.startsWith('#'))
                params.channel = '#' + params.channel;

            var db = yield client.connect (global.env.MONGO_URL);

            var channels = yield db.collection ('channels')
                .find ({ name : params.channel })
                .toArray();

            if (!channels.length) {

                throw 'You\'re not in that channel.';
            
            }

            var channel = channels.shift();

            if (channel.users
                .filter(function(user) { 
                    user.username = connection.user.username; 
                })
                .length) {

                throw 'You\'re not in that channel.';
            }

            channel.users = channel.users
                .filter (function (user) { return user !== connection.user.username; });

            connection.user.channels = connection.user.channels
                .filter (function (channel) { return channel !== params.channel; });

            yield db.collection ('channels')
                .updateOne (
                    { _id : channel._id },
                    { $set : { users : channel.users } }
                );

            return channel;
        }

        function success (result)
        {
            var response = { 
                success : true,
                from : '@system',
                message : '%u has parted from channel %c'
                    .replace('%u', connection.user.username)
                    .replace('%c', params.channel),
                command : 'parted',
                data : result
            }

            connection.send(JSON.stringify(response));
            
            delete response.command;
            delete response.data;

            response.to = params.channel;

            return response;
        }

        function fail (result)
        {
            return {
                success : false,
                from : 'system',
                to : '#system',
                message : result,
            }
        }

    }

    module.exports = Response;

})();