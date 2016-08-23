(function ()
{
    var env = require(__dirname + '/env.js')();
    var client = require('mongodb').MongoClient;

    var co = require('co');
    var bcrypt = require('bcrypt');

    function Controller (request)
    {
        var params = request.params;

        return co (login)
            .then (success)
            .catch (fail);
        
        function* login ()
        {
            var db = yield client.connect (env.MONGO_URL);

            var users = yield db.collection ('users')
                .find ({ username : params.username })
                .toArray();

            if (!users.length) {
                throw "User not found.";
            }

            var user = users.shift();

            if (!bcrypt.compareSync(params.password, user.password)) {
                throw "Invalid credentials.";
            }

            user.password = null;

            db.close();

            return user;
        }

        function success (result)
        {
            return { 
                status : true,
                from : 'system',
                message : 'Welcome, %u!'.replace('%u', result.username),
                command : 'loggedIn',
                data: result,
            }
        }


        function fail (result)
        {
            return {
                status : false,
                from : 'system',
                message : result,
            }
        }
    }

    module.exports = Controller;

})();


