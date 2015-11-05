(function ()
{
	function Controller (message)
	{
		var data = {
			success : true
		};

		if (message.position == 'start') {
			data.message = 'Please stand by, maintenance under way.';
			data.code = 'build-start';
		}

		if (message.position == 'end') {
			data.message = 'All done, refreshing.';
			data.code = 'build-end';
		}

		console.log(data.message);

		return data;
	}

	module.exports = Controller;

})();