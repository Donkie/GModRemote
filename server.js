
// Modules
var express = require('express');
var fs = require('fs');
var https = require('https');
var username = require('username');
var glob = require('glob');
var path = require('path');

// API
var api = require('./api');

// Config
var config = require('./config');

// Start up web server
var app = express();

var options = {
  dhparam: fs.readFileSync('ssl/dhparam.pem'),
  key: fs.readFileSync('ssl/gmodremote.key'),
  cert: fs.readFileSync('ssl/gmodremote.crt')
};

https.createServer(options, app).listen(config.port);

console.log('Started GModRemote server as user ' + username.sync() + ' on port ' + config.port);

process.on('unhandledRejection', (reason) => {
    console.log('Reason: ' + reason);
});

// Listen to requests
app.route("/getservers")
	.get(function(req, res){
		glob(config.lgsmglob, {}, function(err, files){
			if(err !== null){
				res.json({
					status: "error",
					error: "glob error"
				});

				return
			}

			let promise = Promise.resolve();

			let servers = [];

			files.forEach(function(fullpath){
				// Remove extension
				let filename = path.basename(fullpath, path.extname(fullpath));

				// Remove non-allowed characters
				let serverid = api.sanitizeServerID(filename);

				promise = promise
					.then(() => {
						return api.getServer(serverid)
					})
					.then(serverobj => {
						servers.push(serverobj);
					}, err => {
						console.log("Failed to get server.", err);
						servers.push(serverobj);
					})
			});

			promise.then(() => {
				res.json({
					status: "success",
					servers: servers
				});
			});
		});
	});

app.route("/server/:serverid/start")
	.post(function(req, res){
		console.log('oshit post');
		console.log('serverid: ' + req.params['serverid']);

		res.json({
			status: "success"
		});
	});

// Fallback
app.all('*', function(req, res){
	res.sendStatus(404);
});
