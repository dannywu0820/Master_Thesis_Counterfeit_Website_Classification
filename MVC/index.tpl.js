const api_url = "http://dev3.pushfun.com/~danny/Counterfeit_Website_Classifier_FFF/";
const error_information = document.querySelector(".error_information");
const donuts = document.querySelectorAll(".donut");

const btn_predict = document.querySelector("#btn_predict");
const result_predict = document.querySelector("#result_predict");
const text_url = document.querySelector("#text_url");
btn_predict.onclick = function(){
	predictTrustinessOfWebsite(text_url.value);
}

const btn_feedback = document.querySelector("#btn_feedback");
const result_feedback = document.querySelector("#result_feedback");
btn_feedback.onclick = function(){
	feedbackByUser(text_url.value);
}

const btn_feedback_admin = document.querySelector("#btn_feedback_admin");
btn_feedback_admin.onclick = function(){
	feedbackByAdmin(text_url.value);
}

function isValidUrl(url){ //try to use RegExp instead
	if(typeof(url) != 'string'){
		return false;
	}
	
	if(url.startsWith("http") != true){
		return false;
	}
	
	return true;
}

function predictTrustinessOfWebsite(url){
	try{
		console.log(url);
		if(!isValidUrl(url)){
			throw new Error("[predictTrustinessOfWebsite]: invalid url");
		}
		
		let http_request_elements = {
			request_url: api_url+"?predict",
			header: ["Content-Type", "application/json"],
			body_content: JSON.stringify({
				url: url
			})
		}
		console.log(JSON.stringify(http_request_elements));
		donuts[0].style.display = "inline-block";
		
		let renderResult = function(responseText){
			console.log(responseText);
			donuts[0].style.display = "none";
			let response_json = JSON.parse(responseText);
			if(response_json.success){
				renderPredictionResult(response_json);
			}
			else{
				error_information.innerHTML = "<p>" + responseText + "</p>";
			}
		}
		
		sendHttpPostRequest(http_request_elements, renderResult);
	}
	catch(error){
		console.log(error.message);
		error_information.innerHTML = "<p>" + error.message + "</p>";
	}
}

function isValidFeedback(){
	let feedback_checked = document.querySelector("input[name=feedback]:checked");
	if(!feedback_checked){
		return false;
	}
	
	return true;
}

function feedbackByUser(url){
	try{
		if(!isValidUrl(url)){
			throw new Error("[feedbackByUser]: invalid url");
		}
		
		if(!isValidFeedback()){
			throw new Error("[feedbackByUser]: invalid feedback");
		}
		
		donuts[1].style.display = "inline-block";
		
		let adjusted_features = getAdjustedFeatures();
		console.log(JSON.stringify(adjusted_features));
		
		let http_request_elements = {
			request_url: api_url+"?feedbackByUser",
			header: ["Content-Type", "application/json"],
			body_content: JSON.stringify({
				feedback_value: document.querySelector("input[name=feedback]:checked").value,
				url: url,
				feature: JSON.stringify(adjusted_features)
			})
		}
		
		let renderResult = function(responseText){
			console.log(responseText);
			let response_json = JSON.parse(responseText);
			if(response_json.success){
				renderFeedbackByUserResult(response_json);
			}
			else{
				error_information.innerHTML = "<p>" + responseText + "</p>";
			}
		}
		
		sendHttpPostRequest(http_request_elements, renderResult);
	}
	catch(error){
		console.log(error.message);
		error_information.innerHTML = "<p>" + error.message + "</p>";
	}
}

function feedbackByAdmin(url){
	try{
		if(!isValidUrl(url)){
			throw new Error("[feedbackByAdmin]: invalid url");
		}
		
		donuts[1].style.display = "inline-block";
		
		let adjusted_features = getAdjustedFeatures();
		
		let http_request_elements = {
			request_url: api_url+"?feedbackByAdmin",
			header: ["Content-Type", "application/json"],
			body_content: JSON.stringify({
				url: url,
				feature: JSON.stringify(adjusted_features)
			})
		}
		
		let renderResult = function(responseText){
			console.log(responseText);
			let response_json = JSON.parse(responseText);
			if(response_json.success){
				renderFeedbackByAdminResult(response_json);
			}
			else{
				error_information.innerHTML = "<p>" + responseText + "</p>";
			}
		}
		
		sendHttpPostRequest(http_request_elements, renderResult);
	}
	catch(error){
		console.log(error.message);
		error_information.innerHTML = "<p>" + error.message + "</p>";
	}
}

function sendHttpPostRequest(json_obj, callback){
	let request = new XMLHttpRequest();
	request.open('POST', json_obj.request_url);
	request.setRequestHeader(json_obj.header[0], json_obj.header[1]);
	request.onreadystatechange = function(){
		if(request.readyState == 4){
			if(request.status == 200){
				callback(request.responseText);
			}
			else{
				error_information.innerHTML = "<p>"+request.status+" "+request.statusText+"</p>";
			}
		}
	}
	request.send(json_obj.body_content);
}

function renderPredictionResult(response_json){
	let label = response_json.items.label;
	let probability = response_json.items.probability;
	let reason = JSON.parse(response_json.items.reason);
	let order = [
		"num_of_duplicate_prices_seen",
		"percent_savings",
		"under_a_year",
		"has_mobile_app",
		"has_social_media"
	];
	
	result_predict.innerHTML = "<p> Label: " + label + "</p>" + "<p> Probability: " + probability + "</p>";
	result_predict.innerHTML += "<p> Reason: </br><ul>";
	for(let i = 0; i < order.length; i++){
		result_predict.innerHTML += ("<li>" + order[i] + ": " + reason[order[i]] + "</li>");
	}
	result_predict.innerHTML += "</ul></p>";
}

function renderFeedbackByUserResult(response_json){
	donuts[1].style.display = "none";
	
	if(response_json.items == "Yes"){
		result_feedback.innerHTML = "<p>[+]: Thanks for your positive feedback</p>";
	}
	else{
		result_feedback.innerHTML = "<p>[-]: Thanks, we wiil work on improving</p>";
	}
}

function renderFeedbackByAdminResult(response_json){
	donuts[1].style.display = "none";
	
	if(response_json.items){
		let label = response_json.items.label;
		let probability = response_json.items.probability;
		let reason = JSON.parse(response_json.items.reason);
		result_feedback.innerHTML = ("<p> Label: " + label + "</p>" + "<p> Probability: " + probability + "</p>");
	}
}

function getAdjustedFeatures(){
	let feature_selectors = [
		"#num_of_duplicate_prices_seen",
		"#percent_savings",
		"input[name=under_a_year]:checked",
		"input[name=has_mobile_app]:checked",
		"input[name=has_social_media]:checked"
	];
	let feature_names = [
		"num_of_duplicate_prices_seen",
		"percent_savings",
		"under_a_year",
		"has_mobile_app",
		"has_social_media"
	];
	let feature_obj = new Object();
	
	for(let index in feature_selectors){
		let ele = document.querySelector(feature_selectors[index]);
		if(ele){
			if((ele.value != '') && (ele.value != -1)){
				feature_obj[feature_names[index]] = Number(ele.value);
				if(feature_names[index] == "under_a_year"){
					feature_obj["under_a_year_dummy"] = 0;
				}
			}
		}
	}
	
	return feature_obj;
}

$(document).ready(function(){
    $("#btn_describe").click(function(){
		$("table[name=description]").toggle(1000);
        $("ul#description").toggle(1000);
    });
});