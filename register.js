(function ()
{
    var host = 'mongodb://localhost:27017/chat';
    
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
            var db = yield client.connect (host);

            var users = yield db.collection ('users')
                .find ({ username : params.username })
                .toArray();

            if (users.length)
                throw 'That user already exists';

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
                data: params,
                message : '%u has been registered.'
                    .replace ('%u', params.username),
            }
        }


        function fail (result)
        {
            return { success : false, message : result }
        }
    }

    module.exports = Controller;

})();


