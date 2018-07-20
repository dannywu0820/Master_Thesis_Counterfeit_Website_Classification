/*
SYNOPSIS: casperjs feature_extractor.js [OPTION]
DESCRIPTION:
	--input=[INPUT_NAME]
	--output=[OUTPUT_NAME]
	--test=[TRUE/FALSE]
	--label=[LABEL_OF_DATASET]
*/
var fs = require('fs');
fs.changeWorkingDirectory("/home/danny/public_html/Counterfeit_Website_Classifier/Feature_Extraction");
console.log(fs.workingDirectory);
var crawler = require('casper').create({
	verbose: true,
	logLevel: 'warning'
});

var test = (crawler.cli.has("test"))?crawler.cli.get("test"):false;
var input = (crawler.cli.has("input"))?crawler.cli.get("input"):"url_filtered";
var output = (crawler.cli.has("output"))?crawler.cli.get("output"):"feature_dirty";
var label = (crawler.cli.has("label"))?Number(crawler.cli.get("label")):1;
var times = 5;
var input_urls = [];
var output_features = [];
var majestic_million_ranking = readRanking('./majestic_million.csv');

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
		//throw an exception?
	}
	catch(e){
		//add the thrown exception to stack?
	}
}

UrlFeature.prototype.getLengthOfFQDN = function(){
	try{
		return this.getHostname().length;
	}
	catch(e){
		crawler.log("[Get Length of FQDN] "+e.message, 'error');
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
		//length_of_fqdn(boolean)
		//replica_in_fqdn(boolean)
		//in_top_one_million(boolean)
		
		this.features.url = this.url;
		this.features.hostname = this.getHostname();
		this.features.length_of_fqdn = this.getLengthOfFQDN();
		this.features.replica_in_fqdn = this.hasStringOf(["replica", "Replica"]);
		this.features.in_top_one_million = this.inTopOneMillion();
		
		return this.features;
	}
	catch(e){
		
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
		if(prices){
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
		}
		
		return prices;
	}
	catch(e){
		crawler.log("[Get Prices] "+e.message, 'error');
	}
}

PageFeature.prototype.getPercentSavings = function(){
	try{
		var list_of_prices = crawler.evaluate(this.getPrices);
		
		if(list_of_prices.length <= 1){
			return 0;
		}
		else{
			var ori_price = 1;
			var sale_price = 0;
			
			if(Number(list_of_prices[0]) > Number(list_of_prices[1])){
				var ori_price = Number(list_of_prices[0]);
				var sale_price = Number(list_of_prices[1]);
			}
			else{
				var ori_price = Number(list_of_prices[1]);
				var sale_price = Number(list_of_prices[0]);
			}
			return ((ori_price-sale_price)/ori_price);
		}
	}
	catch(e){
		crawler.log("[Get Percent Savings] "+e.message, 'error');
	}
}

PageFeature.prototype.getDuplicatePrices = function(){
	try{
		var list_of_prices = crawler.evaluate(this.getPrices);
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
		crawler.log("[Get Duplicate Prices] "+e.message, 'error');
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
		//num_of_currencies_seen(integer)
		//num_of_duplicate_prices_seen(integer)
		//percent_savings(float)
		//contain_emails(boolean)
		//large_iframes(boolean)
		
		//features that are from first paper
		/*this.features.num_of_currencies_seen = crawler.evaluate(this.getNumberOfCurrencies);
		this.features.num_of_duplicate_prices_seen = this.getDuplicatePrices();
		this.features.percent_savings = this.getPercentSavings();
		this.features.contain_emails = crawler.evaluate(this.containEmails);
		this.features.large_iframes = crawler.evaluate(this.hasLargeIframes);*/
		
		//features that are from second paper
		/*this.features.contain_phone_numbers = crawler.evaluate(this.containPhoneNumbers);
		
		var has_mobile_app = JSON.parse(crawler.evaluate(this.hasLinksToMobileApp));
		this.features.google_play = has_mobile_app['Google'];
		this.features.apple_store = has_mobile_app['Apple'];
		
		var has_social_media = JSON.parse(crawler.evaluate(this.hasLinksToSocialMedia));
		this.features.fb = has_social_media['fb'];
		this.features.ig = has_social_media['ig'];
		this.features.line = has_social_media['line'];
		
		this.features.has_payment_option = crawler.evaluate(this.hasPaymentOption);*/
		
		//features that are self-defined
		/*this.features.node_counts = crawler.evaluate(this.getDOMNodeCounts);
		this.features.dom_height = crawler.evaluate(this.getDOMTreeHeight);
		this.features.text_tag_ratio = crawler.evaluate(this.getTextToTagRatio);*/
		this.features.text_length = crawler.evaluate(this.getTextToTagRatio);
		
		return this.features;
	}
	catch(e){
		
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
		//throw an exception?
	}
	catch(e){
		//add the thrown exception to stack?
	}
}

WebsiteFeature.prototype.getRawWHOIS = function(){
	try{
		var possible_selectors = ["div.df-block-raw", "div.df-block", "div.raw_data"];
		
		if(crawler.exists(possible_selectors[0])){
			var all_text = "";
			var elements_info = crawler.getElementsInfo(possible_selectors[0]);
			
			for(var i = 0; i < elements_info.length; i++){
				all_text= all_text.concat(elements_info[i].text+"\n");
			}
			this.raw_data = all_text;
		}
		else if(crawler.exists(possible_selectors[1])){
			this.raw_data = crawler.getElementInfo(possible_selectors[1]).text;
		}
		else if(crawler.exists(possible_selectors[2])){
			this.raw_data = crawler.getElementInfo(possible_selectors[2]).text;
		}
		else{
			crawler.log("get raw whois failed", 'warning');
			this.raw_data = undefined;
		}
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
			
			var reg_country = this.getRegistrationCountry();
			if(reg_country == null){
				this.features.china_registered = undefined;
			}
			else if(reg_country == "CN"){
				this.features.china_registered = true;
			}
			else{
				this.features.china_registered = false;
			}
			
			var reg_date = this.getRegistrationDate();
			if(reg_date == null){
				this.features.under_a_year = undefined;
			}
			else if(getMonthDiff(reg_date) <= 12){
				this.features.under_a_year = true;
			}
			else{
				this.features.under_a_year = false;
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

//initialization
crawler.start('http://google.com.tw/', function(){
	try{
		console.log("-----[Initialization]-----");
		var dataset_path = '../Data_Collection/Output/'+input+'.txt';
		input_urls = fs.read(dataset_path).split('\n');
		input_urls.pop();
		
		for(var i = 0; i < input_urls.length; i++){
			output_features.push(new Object());
		}
		
		if(!test) times = input_urls.length;
		console.log(times+" websites to extract features");
	}
	catch(e){
		crawler.log("[Initialization] "+e.message, 'error');
	}
});

//get url-level features
crawler.then(function(){
	try{
		console.log("-----[Get URL-Level Features]-----");
		var index = 0;
		
		this.repeat(times, function(){
			var url_obj = new UrlFeature(input_urls[index]);
			mergeObjects(output_features[index], url_obj.getFeatures());
			
			index++;
		});
	}
	catch(e){
		crawler.log("[Get Url-level Features] "+e.message, 'error');
	}
});

//get page-level features
crawler.then(function(){
	try{
		console.log("-----[Get Page-Level Features]-----");
		var index = 0;
		
		this.repeat(times, function(){
			this.thenOpen(input_urls[index], function(){
				console.log((index+1).toString()+". "+this.getTitle());
				console.log(input_urls[index]);
				
				var page_obj = new PageFeature(input_urls[index]);
				mergeObjects(output_features[index], page_obj.getFeatures());
				
				index++;
			});
		});
	}
	catch(e){
		crawler.log("[Get Page-level Features] "+e.message, 'error');
	}
});

//get website-level features
/*crawler.thenOpen(whois_lookup[0].url, function(){
	try{
		console.log("-----[Get Website-Level Features]-----");
		var index = 0;
		var timeout = 10*1000;
		
		this.repeat(times, function(){
			var whois_lookup_index = index%2;
			var website_obj = new WebsiteFeature(input_urls[index]);
			var domain_name = website_obj.getHostname();
			var selector = whois_lookup[whois_lookup_index].selector;
			
			//open whois lookup website
			crawler.thenOpen(whois_lookup[whois_lookup_index].url, function(){
				console.log("Use "+whois_lookup[whois_lookup_index].url);
			});
			
			//fill in the domain name to search
			crawler.then(function(){
				console.log((index+1) + ". " + domain_name);
				if(whois_lookup_index == 0){
					this.fill(selector, {'query': domain_name}, true);
				}
				else{
					this.fill(selector, {'whois': domain_name}, true);
				}
			});
			
			crawler.then(function(){
				this.wait(timeout, function(){
					website_obj.getRawWHOIS();
				});
			});
			
			crawler.then(function(){
				mergeObjects(output_features[index], website_obj.parseRawWHOIS());
				index++;
			});
		});
	}
	catch(e){
		crawler.log("[Get Website-level Features] "+e.message, 'error');
	}
});*/

//save features
crawler.then(function(){
	try{
		var output_path = fs.workingDirectory+"/Output/"+output+'.json';
		var dataset = new Object();
		
		for(var i = 0; i < times; i++){
			output_features[i].label = label;
			console.log((i+1).toString()+". "+JSON.stringify(output_features[i]));
		}
		
		dataset.features = output_features;
		dataset.label = label;
		
		//fs.write(output_path, JSON.stringify(dataset), 'w');
		fs.write(output_path, JSON.stringify(output_features), 'w');
		console.log("Output Path: "+output_path);
	}
	catch(e){
		crawler.log("[Save Features] "+e.message ,'error');
	}
});

crawler.run();