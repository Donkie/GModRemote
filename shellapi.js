"use strict";

var rcon = require('srcds-rcon');
var child_process = require('child_process');
var crypto = require('crypto');

let delay = (time) => (result) => new Promise(resolve => setTimeout(() => resolve(result), time));

function exec(cmd) {
	return new Promise((resolve, reject) => {
		child_process.exec(cmd, (error, stdout, stderr) => {
			if(error){
				stderr = stderr.toString().trim();

				if(stderr.length < 2)
					stderr = stdout;

				reject(stderr);
				return;
			}

			resolve(stdout.toString().trim());
		});
	});
}

function promiseTimeout(ms){
	return new Promise((resolve, reject) => {
		let id = setTimeout(() => {
			clearTimeout(id);
			reject('Timed out in ' + ms + 'ms.')
		}, ms)
	});
}

function sendServerCmd(serverid, cmd){
	return Promise.race([
		//exec('tmux send-keys -t ' + serverid + ' C-z "' + cmd + '" Enter'),
		exec('tmux send-keys -t ' + serverid + ' "' + cmd + '" Enter'),
		promiseTimeout(50),
	]);
}

function getServerHistory(serverid, lines){
	lines = lines || 1000;
	let linesbackbuffer = 23 - lines;

	let task = new Promise((resolve, reject) => {
		exec('tmux resize-pane -t ' + serverid + ' -x 500 -y ' + lines)
			.then(() => {
				return exec('tmux capture-pane -J -t ' + serverid + ' -S ' + linesbackbuffer);
			})
			.then(() => {
				return exec('tmux show-buffer');
			})
			.then(buffer => {
				resolve(buffer);
			}, err => {
				reject(err);
			})
	});

	return Promise.race([
		task,
		promiseTimeout(200),
	]);
}

function rconConnectTimeout(ip, port, pass){
	let task = new Promise((resolve, reject) => {
		let sess = rcon({
			address: ip + ':' + port,
			password: pass,
		})

		sess.connect()
			.then(() => {
				resolve(sess);
			}, err => {
				reject(err);
			})
	});

	return Promise.race([
		task,
		promiseTimeout(200),
	]);
}

module.exports = {
	runSourceCommand: function(serverobj, cmd){
		let pass = crypto.randomBytes(16).toString('hex');

		var rconsession;

		/*
		IF NO WORKS, CHECK IF IP IS BANNED

		listip
		removeip 164.132.207.182
		*/

		return sendServerCmd(serverobj.id, "removeip " + serverobj.ip)
			.then(sendServerCmd(serverobj.id, "rcon_password " + pass))
			.then(delay(150))
			.then(() => {
				return rconConnectTimeout(serverobj.ip, serverobj.port, pass);
			}).then(sess => {
				rconsession = sess
				return sess.command(cmd);
			}).then(cmdreturn => {
				return sendServerCmd(serverobj.id, "rcon_password ''")
					.then(() => rconsession.disconnect)
					.then(() => {
						return cmdreturn.trim();
					});
			});
	},
	runLGSMCommand: function(serverobj, cmd){
		let shellfile = 'bash /home/steam/' + serverobj.id;

		return exec(shellfile + " " + cmd)
			.then(out => {
				return out;
			}, err => {
				if(err.indexOf("already running") !== -1)
					throw "Already running";

				throw err;
			});
	},
	runUpdateCommand: function(cmd){
		let shellcmd;
		switch(cmd){
			case 'updatebattleroyale':
				shellcmd = 'bash /home/steam/serverfiles/battleroyale/updatebattleroyale';
				break;
			case 'updateflood':
				shellcmd = 'bash /home/steam/serverfiles/battleroyale/updateflood';
				break;
			case 'updatefloodweapons':
				shellcmd = 'bash /home/steam/serverfiles/battleroyale/updatefloodweapons';
				break;
			default:
				return Promise.reject("Invalid update command");
		}

		return exec(shellcmd);
	},
	getServerHistory: function(serverobj){
		return getServerHistory(serverobj.id);
	},
	loadServerPID: function(serverobj){
		return exec('tmux list-panes -a -F "#{pane_pid} #{session_name}" | grep ' + serverobj.id)
			.then(out => {
				let a = out.split(' ');
				let pid = parseInt(a[0]);

				if(isNaN(pid))
					throw 'Process not running';

				serverobj.pid = pid;

				return serverobj;
			}, err => {
				throw 'Process not running';
			});
	},
	loadServerCmdLine: function(serverobj){
		return exec('xargs -0 < /proc/' + serverobj.pid + '/cmdline')
			.then(cmdline => {
				if(cmdline.length < 10)
					throw 'No command line found';

				serverobj.cmdline = cmdline;
				serverobj.status = 'up';

				return serverobj;
			});
	},
}
