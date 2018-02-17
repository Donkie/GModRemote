
var rcon = require('srcds-rcon');
var child_process = require('child_process');
var crypto = require('crypto');

function execasync(cmd) {
	return new Promise((resolve, reject) => {
		child_process.exec(cmd, (error, stdout, stderr) => {
			if(error){
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
		execasync('tmux send-keys -t ' + serverid + ' C-z "' + cmd + '" Enter'),
		promiseTimeout(50),
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
		promiseTimeout(1000),
	]);
}

module.exports = {
	runSourceCommand: function(serverobj, cmd){
		let pass = crypto.randomBytes(16).toString('hex');

		var sess;

		return sendServerCmd(serverobj.id, "rcon_password " + pass)
			.then(() => {
				console.log("b")
				return rconConnectTimeout(serverobj.ip, serverobj.port, pass);
			}).then(sess => {
				console.log("c")
				return sess.command(cmd);
			}).then(cmdreturn => {
				console.log("d")
				return sendServerCmd(serverobj.id, "rcon_password ''")
					.then(() => {
						return cmdreturn.trim();
					});
			});
	},
	loadServerPID: function(serverobj){
		return execasync('tmux list-panes -a -F "#{pane_pid} #{session_name}" | grep ' + serverobj.id)
			.then(out => {
				let a = out.split(' ');
				let pid = parseInt(a[0]);

				if(isNaN(pid))
					throw 'No PID found';

				serverobj.pid = pid;

				return serverobj;
			});
	},
	loadServerCmdLine: function(serverobj){
		return execasync('xargs -0 < /proc/' + serverobj.pid + '/cmdline')
			.then(cmdline => {
				if(cmdline.length < 10)
					throw 'No command line found';

				serverobj.cmdline = cmdline;

				return serverobj;
			});
	},
}
