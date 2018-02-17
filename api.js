
var shellapi = require('./shellapi');
var gmodapi = require('./gmodapi');

function simpleMatch(str, regex){
	let m;
	if((m = regex.exec(str)) !== null) {
		if(m.length == 0) return null;

		return m[1];
	}

	return null;
}

function parseCmdLine(cmdline){
	return {
		ip: simpleMatch(cmdline, /-ip ([\d\.]+)/),
		port: simpleMatch(cmdline, /-port ([\d]+)/),
		tickrate: simpleMatch(cmdline, /-tickrate ([\d]+)/),
		slots: simpleMatch(cmdline, /-maxplayers ([\d]+)/),
		gamemode: simpleMatch(cmdline, /\+gamemode ([\w]+)/),
		map: simpleMatch(cmdline, /\+map ([\w]+)/),
	}
}

function parseCmdLineasync(serverobj){
	return new Promise((resolve, reject) => {
		serverobj.ip       = simpleMatch(serverobj.cmdline, /-ip ([\d\.]+)/),
		serverobj.port     = simpleMatch(serverobj.cmdline, /-port ([\d]+)/),
		serverobj.tickrate = simpleMatch(serverobj.cmdline, /-tickrate ([\d]+)/),
		serverobj.slots    = simpleMatch(serverobj.cmdline, /-maxplayers ([\d]+)/),
		serverobj.gamemode = simpleMatch(serverobj.cmdline, /\+gamemode ([\w]+)/),
		serverobj.map      = simpleMatch(serverobj.cmdline, /\+map ([\w]+)/),

		resolve(serverobj);
	});
}

module.exports = {
	sanitizeServerID: function(id){
		return id.replace(/[^A-Za-z0-9\-]/, '');
	},

	getServer: function(serverid){
		let serverobj = {id: serverid, status: 'down'};

		return shellapi.loadServerPID(serverobj)
			.then(shellapi.loadServerCmdLine)
			.then(parseCmdLineasync)
			.then(gmodapi.isUp);
	},
}
