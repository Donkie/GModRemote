"use strict";

// API
var net = require('net');

function parseFloodPhase(phase){
	switch(phase){
		case 1:
			return 'Build';
		case 2:
			return 'Prepare';
		case 4:
			return 'Flood';
		case 8:
			return 'Fight';
		case 16:
			return 'Reflect';
	}
}

function timeToStr(seconds){
	let hours = Math.floor(seconds / 3600);
	let minutes = Math.floor(seconds / 60) % 60;
	seconds = seconds % 60;

	let hourstxt, minutestxt;
	if(hours > 0){
		hourstxt = hours + ":";
		minutestxt = minutes.toString().padStart(2, '0');
	}else{
		hourstxt = "";
		minutestxt = minutes.toString();
	}

	let secondstxt = seconds.toString().padStart(2, '0');
	return hourstxt + minutestxt + ":" + secondstxt;
}

function promiseTimeout(ms){
	return new Promise((resolve, reject) => {
		let id = setTimeout(() => {
			clearTimeout(id);
			reject('Timed out in ' + ms + 'ms.')
		}, ms)
	});
}

module.exports = {
	openSocket: function(serverobj){
		return new Promise((resolve, reject) => {
			if(!serverobj.port){
				reject("Process not running");
				return;
			}
			let port = parseInt(serverobj.port) + 100;

			// console.log("Opening socket to port " + port);
			serverobj.socket = new net.Socket();
			serverobj.socket.connect(port, serverobj.ip);
			serverobj.socket.setTimeout(1000);

			serverobj.socket.on('connect', () => {
				// console.log("Connected");
				resolve(serverobj);
			});
			serverobj.socket.on('error', (err) => {
				console.log("Error");
				console.log(err);
				reject(err.name + ": " + err.message);
			});
			serverobj.socket.on('timeout', () => {
				console.log('Socket timeout on ' + serverobj.socket.remotePort);
				serverobj.socket.end();
			});
		});
	},

	closeSocket: function(serverobj){
		return new Promise((resolve, reject) => {
			if('socket' in serverobj)
				serverobj.socket.end();
			resolve(serverobj);
		});
	},

	loadStatusNew: function(serverobj){
		return Promise.race([
			new Promise((resolve, reject) => {
				serverobj.socket.write("GetInfo\r\n");
				serverobj.socket.on('data', function(data){
					data = JSON.parse(data.toString('utf8'));

					serverobj.hostname = data.hostname;
					serverobj.playerCount = data.players;
					serverobj.uptime = data.uptime;
					serverobj.uptimestr = timeToStr(data.uptime);
					serverobj.status = 'up';
					serverobj.players = data.playerinfo;
					serverobj.gmodversionstr = data.gmodversionstr;
					//serverobj.gamemode = data.gm; // Is set earlier but the one from this data might be more accurate

					//serverobj.allData = data;

					let gm = serverobj.gamemode;
					if(gm.indexOf('flood') > -1){
						serverobj.gmstatus = parseFloodPhase(data.phase) + " " + timeToStr(data.time);
					}
					else if(gm == "gmbr"){
						serverobj.gmstatus = data.phase + " " + timeToStr(Math.floor(data.time));
					}
					else{
						serverobj.gmstatus = 'Unknown';
					}

					resolve(serverobj);
				});
			}),
			promiseTimeout(200)
		]);
	}
}
