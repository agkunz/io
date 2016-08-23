(function ()
{
    var host = 'mongodb://localhost:27017/chat';
    
    var client = require('mongodb').MongoClient;

    var co = require('co');
    var bcrypt = require('bcrypt');

    function Controller (connection, params)
    {
        var response = require (script_root+message.route+'.js')(message);

        Promise.resolve (response)
            .then (success)
            .catch (fail);

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


