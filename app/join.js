(function ()
{
    var client = require('mongodb').MongoClient;

    var co = require('co');

    function Response (request, connection)
    {
        var params = request.params;

        return co (join)
            .then (success)
            .catch (fail);

        function* join ()
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

                var channel = { 
                    name : params.channel,
                    users : ['system', connection.user.username]
                }

                yield db.collection ('channels')
                    .insertOne (channel);
            
            }

            else {

                var channel = channels.shift();

                if (channel.users
                    .filter(function(user) { 
                        user.username = connection.user.username; 
                    })
                    .length) {

                    return channel;
                }

                channel.users.push (connection.user.username);

                yield db.collection ('channels')
                    .updateOne (
                        { _id : channel._id },
                        { $set : { users : channel.users } }
                    );
            }

            if (!connection.user.channels) {
                connection.user.channels = [params.channel];
            } else {
                connection.user.channels.push(params.channel);
            }

            return channel;
        }

        function success (result)
        {
            Object.assign (result, { inbox : [], outbox : [] });

            return { 
                success : true,
                from : '@system',
                to : params.channel,

                message : '%u has joined the channel %c'
                    .replace('%u', connection.user.username)
                    .replace('%c', params.channel),

                command : 'joined',
                data : result
            }
        }

        function fail (result)
        {
            return {
                success : false,
                from : '@system',
                to : '#system',
                message : result,
            }
        }

    }

    module.exports = Response;

})();