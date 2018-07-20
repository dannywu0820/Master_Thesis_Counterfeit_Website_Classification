/*
SYNOPSIS: node service_evaluation.js [OPTION]
DESCRIPTION:
	--request=[NUMBER_OF_REQUESTS]
	--latency=[LATENCY_IN_SECONDS]
	--shuffle=[TRUE_OR_FALSE]
*/
var request = require('request');
var fs = require('fs');

var num_of_requests = process.argv[2] || 10;
var latency_in_seconds = process.argv[3] || 10;
var shuffle_urls = process.argv[4] || false;
var num_of_responses = 0;
var num_of_success = 0;
var num_of_timeout = 0;
var proportion = [];

myRead('./url_counterfeit.txt').then(function(content){
	urls = content.split("\n");
	urls.pop();
	if(shuffle_urls){
		urls = shuffle(urls);
	}
	/*console.log(urls);
	console.log(urls.length);*/
	
	sendRequests(num_of_requests, latency_in_seconds, urls);
}).catch(function(json_obj){
	console.log(json_obj.error.message);
});

function myRead(file_path){
	return new Promise(function(resolve, reject){
		fs.readFile(file_path, function(error, buffer){
			if(error){
				reject({error: error});
			}
			else{
				resolve(buffer.toString());
			}
		});
	});
}

function sendRequests(num_of_requests, latency_in_seconds, urls){
	let api_url = "http://dev3.pushfun.com/~danny/Counterfeit_Website_Classifier_FFF/?predict";
	let i = 0;
	
	let interval = setInterval(function(){
		console.log(urls[i]);
		
		request({
			url: api_url,
			method: "POST",
			json: true,
			body: {
				url: urls[i]
			}
		}, request_cb);
		
		i++;
		if(i == num_of_requests){
			clearInterval(interval);
		}
	}, latency_in_seconds * 1000);
}

function request_cb(error, res, body){
	num_of_responses+=1;
	console.log(num_of_responses+".");
	if(error){
		console.log(error);
	}
	else{
		if(body.success){
			console.log("websiteID: "+body.items.websiteID);
			console.log("success: "+body.success);
			console.log("label: "+body.items.label);
			console.log("proba: "+body.items.probability);
			if(Number(body.items.label) == 1) num_of_success += 1;
			console.log("num_of_success: "+num_of_success);
		}
		else{
			console.log(body);
			num_of_timeout+= 1;
		}
	}
	
	if(num_of_responses % 10 == 0){
		let percent = (num_of_success*100/num_of_responses)
		console.log(percent+"%");
		proportion.push(percent);
	}
	
	if(num_of_responses == num_of_requests){
		console.log(proportion.toString());
		console.log("num_of_responses: "+num_of_responses);
		console.log("num_of_success: "+num_of_success);
		console.log("num_of_timeout: "+num_of_timeout);
	}
	console.log("----------");
}

function shuffle(array){
	for(let curr_index = array.length - 1; curr_index > 0; curr_index--){
		let new_index = Math.floor(Math.random() * (curr_index + 1));
		let temp = array[new_index];
		array[new_index] = array[curr_index];
		array[curr_index] = temp;
	}
	
	return array;
}