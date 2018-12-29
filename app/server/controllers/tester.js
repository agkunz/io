(function ()
{
	function Controller (message, connection)
	{
		return { 
			success : true,
			message : 'This is a test.',
			response : 'dotest',
			data : { test: true },
		}
	}

	module.exports = Controller;

})();