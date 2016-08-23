(function ()
{
    function Response (request)
    {
        return { 
            success : true,
            message : request.params.message
        }
    }

    module.exports = Response;

})();