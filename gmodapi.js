"use strict";

// API
var shellapi = require('./shellapi');

function simpleMatch(str, regex){
	let m;
	if((m = regex.exec(str)) !== null) {
		if(m.length == 0) return null;

		return m[1];
	}

	return null;
}

const statusPlayerRegex = /^#\s+(\d+)\s+"([^"]+)"\s+(STEAM_\d:\d:\d+)\s+([\d:]+)\s+(\d+)\s+(\d+)\s+(\w+)\s+([\d\.]+):\d+$/gm;
function parseStatus(serverobj, status){
	serverobj.hostname = simpleMatch(status, /hostname\s*:\s*(.+)/);
	serverobj.playerCount = parseInt(simpleMatch(status, /players\s:\s(\d+)/));

	serverobj.players = [];

	let m;
	while((m = statusPlayerRegex.exec(status)) !== null){
		// This is necessary to avoid infinite loops with zero-width matches
		if (m.index === statusPlayerRegex.lastIndex) {
			statusPlayerRegex.lastIndex++;
		}

		//var unicodeHex = /\\u([\d\w]{4})/gi;
		//let decodedNick = m[2].replace(unicodeHex, function (match, grp) {
		//	return String.fromCharCode(parseInt(grp, 16));
		//});

		serverobj.players.push({
			userid: parseInt(m[1]),
			nick: m[2],
			steamid: m[3],
			time: m[4],
			ping: parseInt(m[5]),
			loss: parseInt(m[6]),
			state: m[7],
			ip: m[8],
		});
	}
}

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

module.exports = {
	loadStatus: function(serverobj){
		return shellapi.runSourceCommand(serverobj, "status")
			.then(ret => {
				parseStatus(serverobj, ret);

				if(serverobj.playerCount)
					serverobj.status = 'up';

				return serverobj;
			}, err => {
				serverobj.status = 'down';
				return serverobj;
			});
	},

	loadGMStatus: function(serverobj){
		let gm = serverobj.gamemode;

		if(gm.indexOf('flood') > -1){
			let lua = 'print(GAMEMODE:GetPhase() .. " " .. TimeToStr(math.Round(GAMEMODE:GetTime())))'

			return shellapi.runSourceCommand(serverobj, "lua_run " + lua)
				.then(ret => {
					ret = ret.split(/\r?\n/).pop();

					let a = ret.split(' ');
					let phase = parseFloodPhase(parseInt(a[0]));

					serverobj.gmstatus = phase + ' ' + a[1];

					return serverobj;
				}, err => {
					return serverobj;
				});
		}
		else if(gm == "gmbr"){
			let lua = 'print(GAMEMODE:GetPhaseName(GAMEMODE:GetPhase()) .. " " .. TimeToStr(math.Round(GAMEMODE:GetTimeElapsed())))'

			return shellapi.runSourceCommand(serverobj, "lua_run " + lua)
				.then(ret => {
					serverobj.gmstatus = ret.split(/\r?\n/).pop();

					return serverobj;
				}, err => {
					return serverobj;
				});
		}
		else {
			serverobj.gmstatus = 'Unknown';
			return serverobj;
		}
	}
}
