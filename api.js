"use strict";

var shellapi = require('./shellapi');
var gmodapi = require('./gmodapi');
var moment = require('moment');

function simpleMatch(str, regex){
	let m;
	if((m = regex.exec(str)) !== null) {
		if(m.length == 0) return null;

		return m[1];
	}

	return null;
}

function parseCmdLine(serverobj){
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

function timeStrToUnixtime(str){
	var obj = moment(str, 'HH:mm::ss');
	return obj.unix();
}

const chatParseRegex = /L \d\d\/\d\d\/\d\d\d\d - (\d\d:\d\d:\d\d): "([^<]+)<(\d+)>(?:<([A-Za-z_0-9:]+)>)?(?:<Team>|<Console>)?" (say|say_team) "(.+)"[ \t]*[\n]/g
const errorParseRegex = /\[ERROR\] (.+):(\d+): (.+)[\r\n]+([\w\W.]+?)[\r\n]{2}/g
const stackParseRegex = /\s\d\. (\S+) - (.+):([-\d]+)/g

module.exports = {
	sanitizeServerID: function(id){
		return id.replace(/[^A-Za-z0-9\-]/, '');
	},

	parseChatHistory: function(consoleHistory){
		let chat = [];

		let m;
		while((m = chatParseRegex.exec(consoleHistory)) !== null){
			// This is necessary to avoid infinite loops with zero-width matches
			if (m.index === chatParseRegex.lastIndex) {
				chatParseRegex.lastIndex++;
			}

			chat.push({
				time: timeStrToUnixtime(m[1]),
				nick: m[2],
				userid: m[3],
				steamid: m[4],
				chatType: m[5],
				message: m[6],
			});
		};

		return chat;
	},

	parseLuaErrorHistory: function(consoleHistory){
		let errors = [];

		let m;
		while((m = errorParseRegex.exec(consoleHistory)) !== null){
			// This is necessary to avoid infinite loops with zero-width matches
			if (m.index === errorParseRegex.lastIndex) {
				errorParseRegex.lastIndex++;
			}

			let stack = [];
			let m2;
			while((m2 = stackParseRegex.exec(m[4])) !== null){
				// This is necessary to avoid infinite loops with zero-width matches
				if (m2.index === stackParseRegex.lastIndex) {
					stackParseRegex.lastIndex++;
				}

				stack.push({
					function: m2[1],
					file: m2[2],
					line: parseInt(m2[3]),
				})
			}

			errors.push({
				file: m[1],
				line: parseInt(m[2]),
				error: m[3],
				stack: stack,
			});
		};

		return errors;
	},

	getServer: function(serverid){
		let serverobj = {id: serverid, status: 'down'};

		return shellapi.loadServerPID(serverobj)
			.then(shellapi.loadServerCmdLine)
			.then(parseCmdLine)
			.then(serverobj => {
				serverobj.status = 'up';
				return serverobj;
			}, err => {
				serverobj.error = err;
				return serverobj;
			});
	},

	serverCommand: function(serverobj, cmd){
		return shellapi.runSourceCommand(serverobj, cmd);
	},

	serverChat: function(serverobj, msg){
		let cmd = "say " + msg;

		return shellapi.runSourceCommand(serverobj, cmd);
	},

	lgsmCommand: function(serverobj, cmd){
		return shellapi.runLGSMCommand(serverobj, cmd);
	},

	getServerHistory: function(serverobj){
		return shellapi.getServerHistory(serverobj);
	}
}
