(function ()
{
    function Controller ()
    {
        return {
            APP_ENV : 'production',
            SCRIPT_ROOT : '/var/www/adamkunz/io',
            MONGO_URL : 'mongodb://localhost:27017/chat',
        };
    }

    module.exports = Controller;

})();


