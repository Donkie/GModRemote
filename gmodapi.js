
// API
var shellapi = require('./shellapi');

module.exports = {
	isUp: function(serverobj){
		return shellapi.runSourceCommand(serverobj, "echo heartbeat")
			.then(ret => {
				if(ret == "heartbeat")
					serverobj.status = 'up';

				return serverobj;
			}, err => {
				console.log("isUp Error: ", err)
				serverobj.status = 'down';
				return serverobj;
			});
	}
}
