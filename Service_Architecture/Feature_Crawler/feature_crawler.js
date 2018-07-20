const myServer = require('../modules/server.js');
const ex = require('../modules/exec_script.js');
var mq = myServer.getMQ();
var db = myServer.getDB();
myServer.assignTask(callbackFeatureCrawler);
myServer.start();

function callbackFeatureCrawler(msg){
	let msg_json = JSON.parse(msg.content.toString());
	let websiteID = msg_json.websiteID_list[0];
	
	db.save({
		table: 'Website',
		fields: ['websiteID', 'status'],
		values: [websiteID, '\'feature_crawler: processing\'']
	}).then(function(query_result){
		return db.find({
			table: 'Website',
			fields: ['url'],
			condition: 'websiteID = ' + websiteID
		});
	}).then(function(query_result){
		console.log(query_result[0]['url']);
		let cmd = "casperjs ./feature_extractor.js --test=false --url="+query_result[0]['url'];
		return ex.execute(cmd);
	}).then(function(stdout_result){
		let feature_json_str = stdout_result.split("<here>")[1].split("</here>")[0];
		let feature_json = JSON.parse(feature_json_str);
		console.log(feature_json_str);
		return db.save({
			table: 'Website',
			fields: [
				'websiteID', 
				'feature', 
				'status',
				'length_of_fqdn',
				'num_of_duplicate_prices_seen',
				'percent_savings',
				'under_a_year',
				'under_a_year_dummy',
				'has_mobile_app',
				'has_social_media',
				'node_counts',
				'dom_height'
			],
			values: [
				websiteID, 
				'\'' + feature_json_str + '\'', 
				'\'feature_crawler: success\'',
				feature_json['length_of_fqdn'],
				feature_json['num_of_duplicate_prices_seen'],
				feature_json['percent_savings'],
				feature_json['under_a_year'],
				feature_json['under_a_year_dummy'],
				feature_json['has_mobile_app'],
				feature_json['has_social_media'],
				feature_json['node_counts'],
				feature_json['dom_height']
			]
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
			values: [websiteID, '\'feature_crawler: failure\'']
		}).then(function(query_result){
			mq.publish("rpc", msg);
			mq.acknowledge(msg);
		});
		
	});
}