const cluster = require('cluster');
const http = require('http');
const num_of_cpus = require('os').cpus().length;
const amqp = require('amqplib/callback_api');
const config = {
	host: '140.113.207.206',
	user: 'danny',
	password: 'livebetterlife'
};

const do_master_job = (process.argv[2] == "true");
const do_worker_job = (process.argv[3] == "true");

if(cluster.isMaster){
	console.log('Master '+process.pid+' stared as producer');
	
	for(let i = 0; i < num_of_cpus; i++){
		cluster.fork();
	}
	
	cluster.on('exit', (worker, code, signal) => {
		console.log('Worker '+worker.process.pid+' died');
	});
	
	if(do_master_job){
		doMasterJob();
	}
}
else{
	console.log('Worker '+process.pid+' started as consumer');
	
	/*http.createServer((req, res) => {
		res.writeHead(200);
		res.end('hello world\n');
	}).listen(8880);*/
	
	if(do_worker_job){
		doWorkerJob();
	}
	else{
		process.exit();
	}
}

function doMasterJob(){
	connect(config).then(function(resolve_parameters){
		return createChannel(resolve_parameters);
	}).then(function(resolve_parameters){
		resolve_parameters.queue_name = 'test_queue';
		publishMessage(resolve_parameters);
	}).catch(function(reject_parameters){
		console.log('[Master catched error]');
		failureCallback(reject_parameters);
	});
}

function doWorkerJob(){
	connect(config).then(function(resolve_parameters){
		return createChannel(resolve_parameters);
	}).then(function(resolve_parameters){
		resolve_parameters.queue_name = 'test3_queue';
		subscribeMessage(resolve_parameters);
	}).catch(function(reject_parameters){
		console.log('[Worker catched error]');
		failureCallback(reject_parameters);
	});
}

function connect(config){
	let url = 'amqp://' + config.user + ':' + config.password + '@' + config.host;
	
	return new Promise(function(resolve, reject){
		amqp.connect(url, function(err, conn){
			if(err){
				let reject_parameters = {error: err};
				reject(reject_parameters);
			}
			else{
				let resolve_parameters = {connection: conn};
				resolve(resolve_parameters);
			}
		});
	});
}

function createChannel(resolve_parameters){
	let connection = resolve_parameters.connection;
	
	return new Promise(function(resolve, reject){
		connection.createChannel(function(err, channel){
			if(err){
				let reject_parameters = {error: err, connection: connection};
				reject(reject_parameters);
			}
			else{
				resolve_parameters.channel = channel;
				resolve(resolve_parameters);
			}
		});
	});
}

function publishMessage(resolve_parameters){
	let channel = resolve_parameters.channel;
	let queue_name = resolve_parameters.queue_name;
	
	channel.assertQueue(queue_name, {durable: true});
	
	let j = 801
	let interval_id = setInterval(function(){
		let content = JSON.stringify({
			'workflow_type': 'predict',
			'websiteID_list': [j]
		});
		console.log("Master sent " + content);
		j++;
		channel.sendToQueue(queue_name, new Buffer(content), {persistent: false});
		
		if(j > 801){
			clearInterval(interval_id);
		}
	}, 1*1000);
}

function subscribeMessage(resolve_parameters){
	let channel = resolve_parameters.channel;
	let queue_name = resolve_parameters.queue_name;
	
	channel.assertQueue(queue_name, {durable: true});
	channel.prefetch(1);
	
	channel.consume(queue_name, function(msg){
		console.log('Worker ' + process.pid + ' gets ' + msg.content.toString());
		test(channel, msg);
		/*setTimeout(function(){
			console.log(process.pid + ' handle msg done');
			channel.ack(msg);
		}, 1*1000);*/
	}, {noAck: false});
}

function failureCallback(reject_parameters){
	let error = reject_parameters.error;
	console.log("Name: " + error.name);
	console.log("Message: " + error.message);
	
	let connection = reject_parameters.connection;
	if(connection){
		console.log("remember to close connection after shit happened");
		connection.close();
	}
}

function doSomething(){
	let job = 'first job';
	
	return new Promise(function(resolve, reject){
		setTimeout(function(job_done){
			resolve(job_done);
		}, 5*1000, job);
	});
}

function doSecondJob(first_job){
	let job = 'second job '+first_job;
	
	return new Promise(function(resolve, reject){
		setTimeout(function(job_done){
			resolve(job_done);
		}, 3*1000, job);
	});
}

function test(channel, msg){
	doSomething().then(function(first_job){
		//throw new Error('job failure');
		console.log(first_job);
		return doSecondJob(first_job);
	}).then(function(two_jobs){
		console.log(two_jobs);
		channel.ack(msg);
	}).catch(function(error){
		console.log(error);
		channel.ack(msg);
	});
}