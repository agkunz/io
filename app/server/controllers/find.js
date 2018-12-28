(function ()
{
    var client = require('mongodb').MongoClient;

    var co = require('co');

    function Controller (request)
    {
        var params = request.params;

        return co (find)
            .then (success)
            .catch (fail);
        
        function* find ()
        {
            var db = yield client.connect (global.env.MONGO_URL);

            var users = yield db.collection ('users')
                .find ({ username : params.username })
                .toArray();

            db.close();

            return users;
        }

        function success (result)
        {
            return { 
                success : true, 
                data : result,
            }
        }


        function fail (result)
        {
            return { success : false, message : result }
        }
    }

    module.exports = Controller;

})();


