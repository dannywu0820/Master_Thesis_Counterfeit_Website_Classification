/*
SYNOPSIS: casperjs feature_extractor.js [OPTION]
DESCRIPTION:
	--url=[INPUT_URL]
	--test=[TRUE/FALSE]
*/
const fs = require('fs');
const crawler = require('casper').create({
	verbose: true,
	logLevel: 'warning'
});

var url = (crawler.cli.has("url"))?crawler.cli.get("url"):"http://www.xuyzl.com/prstw"; //
var test = (crawler.cli.has("test"))?crawler.cli.get("test"):false;
var features_get = new Object();
var times = 5;
var input_urls = [];
var output_features = [];

var whois_lookup = [
	{
		url: "https://www.whois.com/whois/",
		selector: "form[action='/search.php']",
		input_name: "query"
	},
	{
		url: "https://www.name.com/whois-lookup",
		selector: "form[action='/whois-lookup']",
		input_name: "whois"
	}
];

var UrlFeature = function(url){
	this.url = url;
	this.features = {};
};

UrlFeature.prototype.getHostname = function(){
	try{
		var pattern_hostname = /(?:https|http):\/\/([0-9a-zA-Z.-]*)/gm;
		var result = pattern_hostname.exec(this.url);
		return result[1];
	}
	catch(e){
		return null;
	}
}

UrlFeature.prototype.getLengthOfFQDN = function(){
	try{
		return this.getHostname().length;
	}
	catch(e){
		return null;
	}
}

UrlFeature.prototype.hasStringOf = function(array_of_strings){
	try{
		var fqdn = this.getHostname();
		var result = false;
		for(str in array_of_strings){
			if(fqdn.indexOf(str) != -1) result = true;
		}
		
		return result;
	}
	catch(e){
		crawler.log("[Has String of] "+e.message, 'error');
	}
}

UrlFeature.prototype.inTopOneMillion = function(){
	try{
		var my_domain = this.getHostname();
		var in_rank = false;
		
		for(var i = 0; i < majestic_million_ranking.length; i++){
			if(my_domain == majestic_million_ranking[i]){
				in_rank = true;
				break;
			}
		}
		
		return in_rank;
	}
	catch(e){
		crawler.log("[in Top One Million] "+e.message, 'error');
	}
}

UrlFeature.prototype.getFeatures = function(){
	try{
		this.features.length_of_fqdn = this.getLengthOfFQDN();
		if(this.features.length_of_fqdn == null){
			this.features.length_of_fqdn = 0;
			throw new Error("[Missing Value]: length_of_fqdn");
		}
		//this.features.url = this.url;
		//this.features.hostname = this.getHostname();
		//this.features.replica_in_fqdn = this.hasStringOf(["replica", "Replica"]);
		//this.features.in_top_one_million = this.inTopOneMillion();
		
		return this.features;
	}
	catch(e){
		crawler.log(e.message, 'warning');
		return this.features;
	}
}

var PageFeature = function(url){
	this.url = url;
	this.features = {};
}

PageFeature.prototype.getPrices = function(){
	try{
		var all_text = document.querySelector("body").innerText;
		var pattern_price = /(NT)?(\$|¥)[ ]*(\d,?)*/gm;
		var prices = all_text.match(pattern_price);
		if(!prices){
			throw new Error("prices is null");
		}
		
		var prices_int = [];
		for(var i = 0; i < prices.length; i++){
			var char_index = 0;
			var price_int = "";
			while(char_index < prices[i].length){
				if(prices[i][char_index]>='0' && prices[i][char_index]<='9'){
					price_int+=prices[i][char_index];
				}
				
				if(prices[i][char_index] == '.') break;
				char_index++;
			}
			prices_int.push(price_int);
		}
		prices = prices_int;
		/*if(prices){
			var prices_int = [];
			for(var i = 0; i < prices.length; i++){
				var char_index = 0;
				var price_int = "";
				while(char_index < prices[i].length){
					if(prices[i][char_index]>='0' && prices[i][char_index]<='9'){
						price_int+=prices[i][char_index];
					}
					
					if(prices[i][char_index] == '.') break;
					char_index++;
				}
				prices_int.push(price_int);
			}
			prices = prices_int;
		}
		else{
			prices = [];
		}*/
		
		return prices;
	}
	catch(e){
		crawler.log("[Get Prices] "+e.message, 'error');
		return null;
	}
}

PageFeature.prototype.getPercentSavings = function(){
	try{
		var list_of_prices = crawler.evaluate(this.getPrices);
		if(!list_of_prices){
			throw new Error("list_of_prices is null");
		}
		else if(list_of_prices.length == 1){
			return 0;
		}
		else{
			var ori_price = 1;
			var sale_price = 0;
			
			if(Number(list_of_prices[0]) > Number(list_of_prices[1])){
				ori_price = Number(list_of_prices[0]);
				sale_price = Number(list_of_prices[1]);
			}
			else{
				ori_price = Number(list_of_prices[1]);
				sale_price = Number(list_of_prices[0]);
			}
			return ((ori_price-sale_price)/ori_price);
		}
	}
	catch(e){
		crawler.log('[getPercentSavings]'+e.message, 'error');
		return null;
	}
}

PageFeature.prototype.getDuplicatePrices = function(){
	try{
		var list_of_prices = crawler.evaluate(this.getPrices);
		if(!list_of_prices){
			throw new Error("list_of_prices is null");
		}
		var prices_seen = list_of_prices.reduce(function(prev, curr){
			prev[curr] = (prev[curr] || 0)+1;
			return prev;
		}, {});
		
		var values = Object.keys(prices_seen).map(function(key){return prices_seen[key];});
		if(values.length == 0){
			return 0;
		}
		else{
			return Math.max.apply(null, values);
		}
	}
	catch(e){
		crawler.log('[getDuplicatePrices]'+e.message, 'error');
		return null;
	}
}

PageFeature.prototype.getNumberOfCurrencies = function(){
	try{
		var possible_currencies = ["$", "¥"];
		var all_text = document.querySelector("body").innerText;
		var number_of_currencies_seen = 0;
		
		for(var i = 0; i < possible_currencies.length; i++){
			if(all_text.indexOf(possible_currencies[i]) != -1){
				number_of_currencies_seen+=1;
			}
		}
		
		return number_of_currencies_seen;
	}
	catch(e){
		crawler.log("[Get Number of Currencies] "+e.message, 'error');
	}
}

PageFeature.prototype.hasLargeIframes = function(){
	try{
		var iframe_elements = document.querySelectorAll("iframe");
		if(iframe_elements){
			var max_area = 0;
			var threshold = 30;
			for(var i = 0; i < iframe_elements.length; i++){
				var area = Number(iframe_elements[i].height)*Number(iframe_elements[i].width);
				if(area > max_area) max_area = area;
			}
			
			if(max_area > threshold){
				return true;
			}
			else{
				return false;
			}
		}
		else{
			return false;
		}
	}
	catch(e){
		crawler.log("[Has Large Iframe] "+e.message, 'error');
	}
}

PageFeature.prototype.containEmails = function(){
	try{
		var all_text = document.querySelector("body").innerText;
		var pattern_email = /^\w+((-\w+)|(\.\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z]+$/gm;
		var emails = all_text.match(pattern_email);
		
		if(emails){
			return true;
		}
		else{
			return false;
		}
	}
	catch(e){
		crawler.log("[Contain Emails] "+e.message, 'error');
	}
}

PageFeature.prototype.containPhoneNumbers = function(){
	try{
		var all_text = document.querySelector("body").innerText;
		var pattern_phone_number = /^\(?\d{2}\)?[\s\-]?\d{4}-?\d{4}$/gm;
		var phone_numbers = all_text.match(pattern_phone_number);
		
		if(phone_numbers){
			return true;
		}
		else{
			return false;
		}
	}
	catch(e){
		crawler.log("[Contain Phone Numbers] "+e.message, 'error');
	}
}

PageFeature.prototype.hasLinksToMobileApp = function(){
	try{
		var links = Array.prototype.slice.call(document.querySelectorAll('a')); //NodeList to Array
		var indexes = ['Google', 'Apple'];
		var keywords = ['play.google.com', 'itunes.apple.com'];
		var result = {};
		
		for(var i = 0; i < keywords.length; i++){
			var num_of_satisfied = links.filter(function(ele){
				return (ele.href.indexOf(keywords[i]) != -1);
			}).length;
			if(num_of_satisfied > 0) result[indexes[i]] = true;
			else result[indexes[i]] = false;
		}
		
		return JSON.stringify(result);
	}
	catch(e){
		crawler.log("[Has Links To Mobile App] "+e.message, 'error');
	}
}

PageFeature.prototype.hasLinksToSocialMedia = function(){
	try{
		var links = Array.prototype.slice.call(document.querySelectorAll('a')); //NodeList to Array
		var indexes = ['fb', 'ig', 'line'];
		var keywords = ['facebook.com', 'instagram.com', 'line'];
		var result = {};
		
		for(var i = 0; i < keywords.length; i++){
			var num_of_satisfied = links.filter(function(ele){
				return (ele.href.indexOf(keywords[i]) != -1);
			}).length;
			if(num_of_satisfied > 0) result[indexes[i]] = true;
			else result[indexes[i]] = false;
		}
		
		return JSON.stringify(result);
	}
	catch(e){
		crawler.log("[Has Links To Social Media] "+e.message, 'error');
	}
}

PageFeature.prototype.hasPaymentOption = function(){
	try{
		var keywords = ["付款方式"];
		var all_text = document.querySelector("body").innerText;
		
		if(all_text.indexOf(keywords[0]) != -1) return true;
		return false;
		
	}
	catch(e){
		crawler.log("[Has Payment Option] "+e.message, 'error');
	}
}

PageFeature.prototype.getDOMNodeCounts = function(){
	try{
		return document.getElementsByTagName('*').length;
	}
	catch(e){
		crawler.log("[Get DOM Node Counts]"+e.message, 'error');
	}
}

PageFeature.prototype.getTextToTagRatio = function(){
	try{
		var length_of_text = document.querySelector("body").innerText.length;
		var num_of_nodes = document.getElementsByTagName('*').length;
		
		return length_of_text;
		//return (length_of_text/num_of_nodes);
	}
	catch(e){
		crawler.log("[Get Text To Tag Ratio]"+e.message, 'error');
	}
}

PageFeature.prototype.getDOMTreeHeight = function(){
	try{
		var all_nodes = Array.prototype.slice.call(document.getElementsByTagName('*'),0);
		var leaf_nodes = all_nodes.filter(function(elem){
			return !elem.hasChildNodes();
		});
		
		var max_height = 0;
		for(var i = 0; i < leaf_nodes.length; i++){
			var height = 0;
			var curr_node = leaf_nodes[i];
			
			while(curr_node.parentElement){
				curr_node = curr_node.parentElement;
				height++;
			}
			
			if(height > max_height){
				max_height = height;
			}
		}
		
		return max_height;
	}
	catch(e){
		crawler.log("[Get DOM Height]"+e.message, 'error');
	}
}

PageFeature.prototype.getFeatures = function(){
	try{
		var missings = [];
		
		//[from first paper]
		this.features.num_of_duplicate_prices_seen = this.getDuplicatePrices();
		if(this.features.num_of_duplicate_prices_seen == null){
			this.features.num_of_duplicate_prices_seen = 0;
			missings.push("num_of_duplicate_prices_seen");
		}
		this.features.percent_savings = this.getPercentSavings();
		if(this.features.percent_savings == null){
			this.features.percent_savings = 0;
			missings.push("percent_savings");
		}
		
		//[from second paper]
		var has_mobile_app = JSON.parse(crawler.evaluate(this.hasLinksToMobileApp));
		this.features.has_mobile_app = (has_mobile_app['Google'] || has_mobile_app['Apple']);
		var has_social_media = JSON.parse(crawler.evaluate(this.hasLinksToSocialMedia));
		this.features.has_social_media = (has_social_media['fb'] || has_social_media['ig'] || has_social_media['line']);
		
		//[self-defined]
		this.features.node_counts = crawler.evaluate(this.getDOMNodeCounts);
		this.features.dom_height = crawler.evaluate(this.getDOMTreeHeight);
		
		if(missings.length > 0){
			throw new Error("[Missing Value]: "+missings.toString());
		}
		
		return this.features;
	}
	catch(e){
		crawler.log(e.message, 'warning');
		return this.features;
	}
}

var WebsiteFeature = function(url){
	this.url = url;
	this.raw_data = null;
	this.features = new Object();
};

WebsiteFeature.prototype.getHostname = function(){
	try{
		var pattern_hostname = /(?:https|http):\/\/([0-9a-zA-Z.-]*)/gm;
		var result = pattern_hostname.exec(this.url);
		
		return result[1];
	}
	catch(e){
		return null;
	}
}

WebsiteFeature.prototype.getRawWHOIS = function(){
	try{
		var possible_selectors = ["div.df-block-raw", "div.df-block", "div.raw_data"];
		this.raw_data = "";
		
		for(var i = 0; i < possible_selectors.length; i++){
			if(crawler.exists(possible_selectors[i])){
				text_get = crawler.getElementInfo(possible_selectors[1]).text;
				this.raw_data = this.raw_data.concat(text_get + "\n");
			}
		}
		//console.log(this.raw_data);
	}
	catch(e){
		crawler.log("[Get Raw WHOIS] "+e.message, 'error');
	}
}

WebsiteFeature.prototype.parseRawWHOIS = function(){
	try{
		if((this.raw_data != undefined) && (this.raw_data != null)){
			//china_registered(boolean)
			//under_a_year(boolean)
			
			/*var reg_country = this.getRegistrationCountry();
			if(reg_country == null){
				this.features.china_registered = undefined;
			}
			else if(reg_country == "CN"){
				this.features.china_registered = true;
			}
			else{
				this.features.china_registered = false;
			}*/
			
			var reg_date = this.getRegistrationDate();
			if(reg_date == null){
				this.features.under_a_year = 0;
				this.features.under_a_year_dummy = 1;
			}
			else if(getMonthDiff(reg_date) <= 12){
				this.features.under_a_year = 1;
				this.features.under_a_year_dummy = 0;
			}
			else{
				this.features.under_a_year = 0;
				this.features.under_a_year_dummy = 0;
			}
			
			return this.features;
		}
	}
	catch(e){
		crawler.log("[Parse Raw WHOIS] "+e.message, 'error');
	}
}

WebsiteFeature.prototype.getRegistrationDate = function(){
	try{
		var pattern_date = /\d{4}-\d{2}-\d{2}/gm;
		var date = this.raw_data.match(pattern_date);
		if(date){
			date = (new Date(date[0]) < new Date(date[1]))?date[0]:date[1];
		}
		else{
			date = null;
		}
		
		return date;
	}
	catch(e){
		crawler.log("[Get Reg Date] "+e.message, 'error');
	}
}

WebsiteFeature.prototype.getRegistrationCountry = function(){
	try{
		var pattern_country = /Registrant Country:\s?(\w{2})/gm;
		var country = this.raw_data.match(pattern_country);
		if(country){
			country = country[0].slice(-2);
		}
		else{
			country = null;
		}
		
		return country;
	}
	catch(e){
		crawler.log("[Get Reg Country] "+e.message, 'error');
	}
}

function mergeObjects(target, source){
	for(var key in source){
		console.log(key+":"+source[key]);
		target[key] = source[key];
	}
}

function getMonthDiff(date){
	var today = new Date();
	var past = new Date(date);
	var months;
	months = (today.getFullYear() - past.getFullYear()) * 12;
	months -= past.getMonth();
	months += today.getMonth();
	//console.log(today + " " + past);
	//console.log("Diff = " + months);
	return months;
}

function readRanking(file_name){
	var content = fs.read(file_name);
	var records = content.split('\n');
	var domains = [];
	for(var i = 1; i < records.length-1; i++){
		var domain = records[i].split(',')[2];
		domains.push(domain);
		//console.log(i.toString()+". "+domain);
	}
	
	return domains;
}

main();

function main(){
	initialize();
	getUrlLevelFeatures();
	getPageLevelFeatures();
	getWebsiteLevelFeatures();
	start();
}

function initialize(){
	crawler.start(url, function(){
		console.log("[1. initialization]");
		console.log(url);
	});
}

function getUrlLevelFeatures(){
	crawler.then(function(){
		console.log("[2. get url-level features]");
		var url_obj = new UrlFeature(url);
		mergeObjects(features_get, url_obj.getFeatures());
		//console.log(JSON.stringify(features_get));
	});
}

function getPageLevelFeatures(){
	crawler.then(function(){
		console.log("[3. get page-level features]");
		var page_obj = new PageFeature(url);
		mergeObjects(features_get, page_obj.getFeatures());
		//console.log(JSON.stringify(features_get));
	});
}

function getWebsiteLevelFeatures(){
	var whois_lookup_index = 0; //(Math.round(Math.random()));
	
	crawler.thenOpen(whois_lookup[whois_lookup_index].url, function(){
		console.log("[4. get website-level features]");
		console.log(whois_lookup[whois_lookup_index].url);
		var website_obj = new WebsiteFeature(url);
		var domain_name = website_obj.getHostname();
		var selector = whois_lookup[whois_lookup_index].selector;
		
		//fill in the domain name to search
		crawler.then(function(){
			if(whois_lookup_index == 0){
				this.fill(selector, {'query': domain_name}, true);
			}
			else{
				this.fill(selector, {'whois': domain_name}, true);
			}
		});
		
		//get whois raw text
		crawler.then(function(){
			this.wait(10*1000, function(){
				website_obj.getRawWHOIS();
			});
		});
		
		//parse whois we need
		crawler.then(function(){
			mergeObjects(features_get, website_obj.parseRawWHOIS());
			console.log("<here>" + JSON.stringify(features_get) + "</here>");
		});
	});
}

function start(){
	crawler.run();
}