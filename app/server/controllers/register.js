(function ()
{
    var client = require('mongodb').MongoClient;

    var co = require('co');
    var bcrypt = require('bcrypt');

    function Controller (request)
    {
        var params = request.params;

        return co (register)
            .then (success)
            .catch (fail);
        
        function* register ()
        {
            var db = yield client.connect (global.env.MONGO_URL);

            var users = yield db.collection ('users')
                .find ({ username : params.username })
                .toArray();

            if (users.length) {
                throw 'That user already exists';
            }

            params.password = bcrypt.hashSync(params.password, 10);

            var result = yield db.collection ('users')
                .insertOne (params);

            db.close();

            return result;
        }

        function success (result)
        {
            return { 
                success : true, 
                from : '@system',
                to : '#system',
                data: params,
                message : '%u has been registered.'
                    .replace ('%u', params.username),
            }
        }

        function fail (result)
        {
            return {
                status : false,
                from : '@system',
                to : '#system',
                message : result,
            }
        }
    }

    module.exports = Controller;

})();


