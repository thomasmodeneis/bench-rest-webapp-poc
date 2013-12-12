var benchrest = require('bench-rest');

var worker = process.on('message', function(m) {

	tryParseJson(m, function(ex, json) {

		console.log('parsed json ' + json);

		var flow = {
			before : [], // operations to do before anything
			beforeMain : [], // operations to do before each iteration
			main : [ // the main flow for each iteration, #{INDEX} is
			// unique iteration counter token
			// { put: 'http://localhost:8000/foo_#{INDEX}', json:
			// 'mydata_#{INDEX}' },
			{
				get : json.site
			} ],
			afterMain : [], // operations to do after each iteration
			after : []
		// operations to do after everything is done
		};
		var runOptions = {
			progress : 1000,
			limit : json.limit, // concurrent connections
			iterations : json.iterations, // number of iterations to
			// perform
			prealloc : json.prealloc
		// only preallocate up to 100
		// before starting
		};
		var errors = [];
		benchrest(flow, runOptions).on('error', function(err, ctxName) {
			console.error('Failed in %s with err: ', ctxName, err);
		})

		.on('progress', function(stats, percent, concurrent, ips) {
			console.log('Progress: %s complete', percent);
			if (percent === 0) {
				errors.push(percent);
			}
		})

		.on('end', function(stats, errorCount) {
			console.log('stats', stats);

			tryStringifyJson(stats, function(ex, json) {
				process.send(json);
			});

		});
	});

	// Pass results back to parent process

});

function tryParseJson(str, callback) {
	process.nextTick(function() {
		try {
			console.log(JSON.parse(str));
			callback(null, JSON.parse(str));
		} catch (ex) {
			console.log(ex);
			callback(ex);
		}
	});
}

function tryStringifyJson(str, callback) {
	process.nextTick(function() {
		try {
			console.log(JSON.stringify(str));
			callback(null, JSON.stringify(str));
		} catch (ex) {
			console.log(ex);
			callback(ex);
		}
	});
}

module.exports = worker;