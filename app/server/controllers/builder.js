(function ()
{
	function Controller (message)
	{
		var data = {
			from : '@system',
		};

		if (message.position == 'start') {
			data.message = 'Please stand by, maintenance under way.';
			data.command = 'buildStart';
		}

		if (message.position == 'end') {
			data.message = 'All done, refreshing.';
			data.command = 'buildEnd';
		}

		return data;
	}

	module.exports = Controller;

})();