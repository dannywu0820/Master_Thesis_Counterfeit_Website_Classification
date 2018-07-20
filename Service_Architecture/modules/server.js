const serverObject = function(){
	const queue_to_subscribe = process.argv[2];
	const queue_to_publish = process.argv[3];
	
	const cluster = require('cluster');
	const num_of_cpus = require('os').cpus().length;
	const mq = require('./MQ.js');
	const db = require('./DB.js');
	let task = null;
	
	function getQueueToPublish(){
		return queue_to_publish;
	}
	
	function getMQ(){
		return mq;
	}
	
	function getDB(){
		return db;
	}
	
	function assignTask(new_task){
		task = new_task;
	}
	
	function start(){
		if(cluster.isMaster){
			console.log("-----[Master Pid: " + process.pid + "]-----");
			console.log("Subscribe from: " + queue_to_subscribe);
			console.log("Publish to: " + queue_to_publish);
			
			for(let i = 0; i < num_of_cpus; i++){
				cluster.fork();
			}
			
			cluster.on('exit', (worker, code, signal) => {
				console.log('Worker '+worker.process.pid+' died');
			});
		}
		else{
			console.log("-----[Worker Pid: " + process.pid + "]-----");
			
			mq.initialize();
			db.initialize();
			setTimeout(executeTask, 3*1000);
		}
	}
	
	function executeTask(){
		if(mq.isReady() && db.isReady()){
			console.log("ready to execute task");
			mq.subscribe(queue_to_subscribe, task);
		}
		else{
			process.exit();
		}
	}
	
	return {
		getQueueToPublish: function(){
			return getQueueToPublish();
		},
		getMQ: function(){
			return getMQ();
		},
		getDB: function(){
			return getDB();
		},
		assignTask: function(new_task){
			assignTask(new_task);
		},
		start: function(){
			start();
		}
		
	}
}

module.exports = serverObject();