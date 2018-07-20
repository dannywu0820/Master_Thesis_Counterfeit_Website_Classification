const amqp = require('amqplib/callback_api');
const rabbitmqUtility = function(){
	let config = {
		protocol: "amqp",
		host: "140.113.207.206",
		user: "danny",
		password: "livebetterlife",
		vhost: "/"
	}
	let connection = null;
	let channel = null;
	let ready = false;
	
	function connect(){
		let url = config.protocol + "://" + 
			config.user + ":" + 
			config.password + "@" + 
			config.host + config.vhost;

		return new Promise(function(resolve, reject){
			amqp.connect(url, function(err, conn){
				if(err){
					reject({error: err, name: "connect"});
				}
				else{
					resolve({connection: conn});
				}
			})
		});
	}
	
	function createChannel(json_obj){
		let connection = json_obj.connection;
		
		return new Promise(function(resolve, reject){
			connection.createChannel(function(err, channel){
				if(err){
					reject({error: err, name: "createChannel"});
				}
				else{
					json_obj.channel = channel;
					resolve(json_obj);
				}
			});
		});
	}
	
	function initialize(){
		connect().then(function(json_obj){ //connect to rabbitmq
			console.log("create rabbitmq connection");
			return createChannel(json_obj); //create channel
		}).then(function(json_obj){
			console.log("create rabbitmq channel");
			connection = json_obj.connection;
			channel = json_obj.channel;
			ready = true;
		}).catch(function(json_obj){
			console.log("-----[MQ.js Error]-----");
			console.log("Function: " + json_obj.name);
			console.log("Message: " + json_obj.error.message);
		});
	}
	
	function isReady(){
		return ready;
	}
	
	function subscribe(queue_name, callback){
		channel.assertQueue(queue_name, {durable: true});
		channel.prefetch(1);
		
		channel.consume(queue_name, function(msg){
			console.log('Worker ' + process.pid + ' gets ' + msg.content.toString());
			callback(msg);
		}, {noAck: false});
	}
	
	/*function publish(queue_name, content){
		let msg = new Buffer(content);
		channel.sendToQueue(queue_name, msg, {persistent: true});
	}*/
	
	function publish(queue_name, msg){
		console.log(JSON.stringify(msg.properties));
		let new_msg = new Buffer(
			msg.content.toString()
		);
		
		if(queue_name == "rpc"){
			channel.sendToQueue(
				msg.properties.replyTo, 
				new_msg, 
				{correlationId: msg.properties.correlationId}
			);
		}
		else{
			channel.sendToQueue(
				queue_name,
				new_msg,
				msg.properties
			)
		}
	}
	
	function acknowledge(msg){
		channel.ack(msg);
	}
	
	function close(){
		channel.close();
		connection.close();
	}
	
	return {
		initialize: function(){
			initialize();
		},
		isReady: function(){
			return isReady();
		},
		subscribe: function(queue_name, callback){
			subscribe(queue_name, callback);
		},
		publish: function(queue_name, msg){
			publish(queue_name, msg);
		},
		acknowledge: function(msg){
			console.log(process.pid + " handled msg done");
			acknowledge(msg);
		}
	}
}

module.exports = rabbitmqUtility();