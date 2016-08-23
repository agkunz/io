(function ()
{
    var host = 'mongodb://localhost:27017/chat';
    
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
            var db = yield client.connect (host);

            var users = yield db.collection ('users')
                .find ({ username : 'adam' })
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


