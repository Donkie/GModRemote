"use strict";

// Modules
var express = require('express');
var basicAuth = require('express-basic-auth');
var fs = require('fs');
var https = require('https');
var username = require('username');
var glob = require('glob');
var path = require('path');
var bodyParser = require("body-parser");

// API
var api = require('./api');
var gmodapi = require('./gmodapi');

// Config
var config = require('./config');

// Start up web server
var app = express();

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

var options = {
  dhparam: fs.readFileSync('ssl/dhparam.pem'),
  key: fs.readFileSync('ssl/gmodremote.key'),
  cert: fs.readFileSync('ssl/gmodremote.crt')
};

https.createServer(options, app).listen(config.port);

console.log('Started GModRemote server as user ' + username.sync() + ' on port ' + config.port);

process.on('unhandledRejection', (reason) => {
	console.log('Unhandled Rejection: ' + reason);
});

function exiterror(res, err){
	res.json({
		status: "error",
		error: err
	});
}

// Authentication
app.use(basicAuth({
	users: {
		'admin': config.password,
	}
}))

// Listen to requests
app.route("/getservers")
	.get(function(req, res){
		glob(config.lgsmglob, {}, function(err, files){
			if(err !== null){
				exiterror(res, "glob error");
				return
			}

			let serverPromises = [];

			files.forEach(function(fullpath){
				// Remove extension
				let filename = path.basename(fullpath, path.extname(fullpath));

				// Remove non-allowed characters
				let serverid = api.sanitizeServerID(filename);

				serverPromises.push(
					api.getServer(serverid)
						.then(gmodapi.loadStatus)
						.then(gmodapi.loadGMStatus)
						.then(undefined, err => {
							return {id: serverid, status: 'failed', error: err}
						})
				);
			});

			Promise.all(serverPromises)
				.then(serverobjs => {
					for (var i = serverobjs.length - 1; i >= 0; i--) {
						delete serverobjs[i].cmdline;
						delete serverobjs[i].pid;
					}

					return serverobjs;
				})
				.then(serverobjs => {
					res.json({
						status: "success",
						servers: serverobjs
					});
				}, err => {
					exiterror(res, err);
				});
		});
	});

app.route("/server/cmd")
	.post(function(req, res){
		var serverid = req.query.serverid
		if(!serverid){
			exiterror(res, "serverid not specified");
			return;
		}

		serverid = api.sanitizeServerID(serverid);

		var body = req.body.body;
		if(!body){
			exiterror(res, "body not specified");
			return;
		}

		api.getServer(serverid)
			.then(serverobj => {
				return api.serverCommand(serverobj, body);
			})
			.then(ret => {
				res.json({
					status: "success",
					message: ret
				});
			}, err => {
				exiterror(res, err);
			})
	});

app.route("/server/chat")
	.post(function(req, res){
		var serverid = req.query.serverid
		if(!serverid){
			exiterror(res, "serverid not specified");
			return;
		}

		serverid = api.sanitizeServerID(serverid);

		var body = req.body.body;
		if(!body){
			exiterror(res, "body not specified");
			return;
		}

		api.getServer(serverid)
			.then(serverobj => {
				return api.serverChat(serverobj, body);
			})
			.then(ret => {
				res.json({
					status: "success",
					message: ret
				});
			}, err => {
				exiterror(res, err);
			})
	});

var validLGSMCommands = ["start", "stop", "restart", "update", "validate"];
app.route("/server/:cmd")
	.post(function(req, res){
		var serverid = req.query.serverid
		if(!serverid){
			exiterror(res, "serverid not specified");
			return;
		}

		var cmd = req.params.cmd
		if(validLGSMCommands.indexOf(cmd) == -1){
			exiterror(res, 'Invalid command ' + cmd);
			return;
		}

		serverid = api.sanitizeServerID(serverid);

		api.getServer(serverid)
			.then(serverobj => {
				return api.lgsmCommand(serverobj, cmd);
			})
			.then(log => {
				res.json({
					status: "success",
					message: log
				});
			}, err => {
				exiterror(res, err);
			})
	});

app.route("/server/history")
	.get(function(req, res){
		var serverid = req.query.serverid
		if(!serverid){
			exiterror(res, "serverid not specified");
			return;
		}

		serverid = api.sanitizeServerID(serverid);

		let serverobj;
		api.getServer(serverid)
			.then(gmodapi.loadStatus)
			.then(obj => {
				serverobj = obj;
				return api.getServerHistory(serverobj);
			})
			.then(history => {
				res.json({
					status: "success",
					console: history,
					chat: api.parseChatHistory(history),
					errors: api.parseLuaErrorHistory(history),
					players: serverobj.players,
				});
			}, err => {
				exiterror(res, err);
			})
	});

// Fallback
app.all('*', function(req, res){
	res.sendStatus(404);
});
