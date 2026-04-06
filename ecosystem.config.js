module.exports = {
	  apps: [
		      {
			            name: 'vakolat',
			            script: 'node',
			            args: 'server.js',
			            exec_mode: 'fork',
			            instances: 1
			          }
		    ]
}
