(function ()
{
    var env = require(__dirname + '/env.js')();
    var client = require('mongodb').MongoClient;

    var co = require('co');
    var bcrypt = require('bcrypt');

    function Controller (request)
    {
        var db = client.connect (env.MONGO_URL);

        var params = request.params;

        return co (login)
            .then (success)
            .catch (fail);
        
        function* login ()
        {
            // get the user
            var user = process (params);

            // start the session

            // transform the response
            user.password = null;

            return user;
        }

        function process (params)
        {
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
            
            return user;
        }

        function success (result)
        {
            db.close();

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
            db.close();

            return {
                status : false,
                from : 'system',
                message : result,
            }
        }
    }

    module.exports = Controller;

})();


