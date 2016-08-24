(function ()
{
	function Controller (message)
	{
		var data = {
			status : 'success',
			from : 'system',
		};

		if (message.position == 'start') {
			data.message = 'Please stand by, maintenance under way.';
			data.command = 'build-start';
		}

		if (message.position == 'end') {
			data.message = 'All done, refreshing.';
			data.command = 'build-end';
		}

		console.log(data.message);

		return data;
	}

	module.exports = Controller;

})();