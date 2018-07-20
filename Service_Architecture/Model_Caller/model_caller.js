const myServer = require('../modules/server.js');
const ex = require('../modules/exec_script.js');
var mq = myServer.getMQ();
var db = myServer.getDB();
myServer.assignTask(callbackModelCaller);
myServer.start();

function callbackModelCaller(msg){
	let msg_json = JSON.parse(msg.content.toString());
	let websiteID = msg_json.websiteID_list[0];
	
	db.save({
		table: 'Website',
		fields: ['websiteID', 'status'],
		values: [websiteID, '\'model_caller: processing\'']
	}).then(function(query_result){
		return db.find({
			table: 'Website',
			fields: ['feature'],
			condition: 'websiteID = ' + websiteID
		});
	}).then(function(query_result){
		console.log(query_result[0]['feature']);
		let cmd = 'python3 ./model_caller.py ' + '\'' + query_result[0]['feature'] + '\'';
		return ex.execute(cmd);
	}).then(function(stdout_result){
		let prediction = stdout_result.split("<here>")[1].split("</here>")[0];
		console.log(prediction);
		prediction = JSON.parse(prediction);
		return db.save({
			table: 'Website',
			fields: ['websiteID', 'label', 'probability', 'status'], 
			values: [websiteID, prediction['label'], prediction['probability'], '\'model_caller: success\'']
		});
	}).then(function(query_result){
		let queue_to_publish = myServer.getQueueToPublish();
		mq.publish(queue_to_publish, msg);
		mq.acknowledge(msg);
	}).catch(function(json_obj){
		if(json_obj.error.message){
			console.log(json_obj.error.message);
		}
		else{
			console.log("Unknown Error");
		}
		
		db.save({
			table: 'Website',
			fields: ['websiteID', 'status'],
			values: [websiteID, '\'model_caller: failure\'']
		}).then(function(query_result){
			mq.publish("rpc", msg);
			mq.acknowledge(msg);
		});
	});
}