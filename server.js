var fs = require('fs');

var express = require('express');

var Firebase = require('firebase');
var myRootRef = new Firebase('https://bench-rest-webapp.firebaseio.com/');
var benchrest = require('bench-rest');

var SampleApp = function() {

	// Scope.
	var self = this;

	var express = require('express');

	var app = express();

	app.use(express.bodyParser());

	/* ================================================================ */
	/* Helper functions. */
	/* ================================================================ */

	/**
	 * Set up server IP address and port # using env variables/defaults.
	 */
	self.setupVariables = function() {
		// // Set the environment variables we need.
		self.ipaddress = process.env.OPENSHIFT_NODEJS_IP;
		self.port = process.env.OPENSHIFT_NODEJS_PORT || 3000;
		//
		if (typeof self.ipaddress === "undefined") {
			// Log errors on OpenShift but continue w/ 127.0.0.1 - this
			// allows us to run/test the app locally.
			console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
			self.ipaddress = "127.0.0.1";
		}
	};

	/**
	 * Populate the cache.
	 */
	self.populateCache = function() {
		if (typeof self.zcache === "undefined") {
			app.zcache = {
				'index.html' : ''
			};
		}

		// Local cache for static content.
		app.zcache['index.html'] = fs.readFileSync('./index.html');
	};

	/**
	 * Retrieve entry (content) from cache.
	 * 
	 * @param {string}
	 *            key Key identifying content to retrieve from cache.
	 */
	self.cache_get = function(key) {
		return app.zcache[key];
	};

	/**
	 * terminator === the termination handler Terminate server on receipt of the
	 * specified signal.
	 * 
	 * @param {string}
	 *            sig Signal to terminate on.
	 */
	self.terminator = function(sig) {
		if (typeof sig === "string") {
			console.log('%s: Received %s - terminating sample app ...',
					Date(Date.now()), sig);
			process.exit(1);
		}
		console.log('%s: Node server stopped.', Date(Date.now()));
	};

	/**
	 * Setup termination handlers (for exit and a list of signals).
	 */
	self.setupTerminationHandlers = function() {
		// Process on exit and signals.
		process.on('exit', function() {
			self.terminator();
		});

		// Removed 'SIGPIPE' from the list - bugz 852598.
		[ 'SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
				'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM' ]
				.forEach(function(element, index, array) {
					process.on(element, function() {
						self.terminator(element);
					});
				});
	};

	/* ================================================================ */
	/* App server functions (main app logic here). */
	/* ================================================================ */

	/**
	 * Create the routing table entries + handlers for the application.
	 */
	self.createRoutes = function() {
		app.get('/', function(req, res) {
			res.setHeader('Content-Type', 'text/html');
			res.send(self.cache_get('index.html'));
		});

		app.get('/benchtest', function(req, res) {
			console.log('running benchmark test for site:');
			console.log('site: ' + req.query.site);
			console.log('limit: ' + req.query.limit);
			console.log('iterations: ' + req.query.iterations);
			console.log('prealloc: ' + req.query.prealloc);

			var flow = {
				before : [], // operations to do before anything
				beforeMain : [], // operations to do before each iteration
				main : [ // the main flow for each iteration, #{INDEX} is
							// unique iteration counter token
				// { put: 'http://localhost:8000/foo_#{INDEX}', json:
				// 'mydata_#{INDEX}' },
				{
					get : req.query.site
				} ],
				afterMain : [], // operations to do after each iteration
				after : []
			// operations to do after everything is done
			};
			var runOptions = {
				progress : 1000,
				limit : req.query.limit, // concurrent connections
				iterations : req.query.iterations, // number of iterations to
													// perform
				 prealloc: req.query.prealloc // only preallocate up to 100
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
				if (errors.length > 10) {
					res.send({
						result : {
							stats : null,
							errorCount : 1
						}
					});
				}
			})

			.on('end', function(stats, errorCount) {
				console.log('error count: ', errorCount);
				console.log('stats', stats);

				res.send({
					result : {
						stats : stats,
						errorCount : errorCount
					}
				});
			});

		});

	};

	/**
	 * Initialize the server (express) and create the routes and register the
	 * handlers.
	 */
	self.initializeServer = function() {
		self.createRoutes();

		app.use(express.static(__dirname + '/assets'));

		// Add handlers for the app (from the routes).
		for ( var r in self.routes) {
			app.get(r, self.routes[r]);
		}
	};

	/**
	 * Initializes the sample application.
	 */
	self.initialize = function() {
		self.setupVariables();
		self.populateCache();
		self.setupTerminationHandlers();

		// Create the express server and routes.
		self.initializeServer();
	};

	/**
	 * Start the server (starts up the sample application).
	 */
	self.start = function() {
		// Start the app on the specific interface (and port).
		app.listen(self.port, self.ipaddress, function() {
			console.log('%s: Node server started on %s:%d ...',
					Date(Date.now()), self.ipaddress, self.port);
		});
	};

};

/**
 * main(): Main code.
 */
var zapp = new SampleApp();
zapp.initialize();
zapp.start();
