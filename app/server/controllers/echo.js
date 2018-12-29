(function ()
{
    var client = require('mongodb').MongoClient;

    var co = require('co');

    function Response (request, connection)
    {
        var params = request.params;

        return co (send)
            .then (success)
            .catch (fail);

        function* send ()
        {
            if (!connection.user) {
                throw 'You must be logged in to chat.';
            }

            var db = yield client.connect (global.env.MONGO_URL);

            var result = yield db.collection ('messages')
                .insert({
                    text : params.message,
                    to : params.to,
                    from : connection.user._id
                });

            return true;
        }

        function success (result)
        {
            return { 
                success : true,
                from : '@' + connection.user.username,
                to : params.to,
                message : params.message
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