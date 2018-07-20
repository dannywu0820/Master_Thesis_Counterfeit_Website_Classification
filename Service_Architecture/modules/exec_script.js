const child_process = require('child_process');
const executeScript = function(){
	
	function execute(cmd){
		return new Promise(function(resolve, reject){
			child_process.exec(cmd, function(error, stdout, stderr){
				if(error){
					reject({error: error});
				}
				else{
					resolve(stdout);
				}
			});
		});
	}
	
	return {
		execute: function(cmd){
			return execute(cmd);
		}
	}
}

module.exports = executeScript();