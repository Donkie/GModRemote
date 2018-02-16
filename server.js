
// Modules
var express = require('express');
var fs = require('fs');
var https = require('https');
var username = require('username');

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

// Listen to requests
app.route("/getservers")
	.get(function(req, res){
		fs.readdirSync(config.lgsmfolder).forEach(file => {
			console.log(file)
		});

		res.json({
			status: "success"
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
