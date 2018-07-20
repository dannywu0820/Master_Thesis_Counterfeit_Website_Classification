/*
SYNOPSIS: casperjs google_search_crawler.js [OPTION]
DESCRIPTION:
	--query_index=[]
*/
console.log(phantom.outputEncoding);

const ONE_SECOND = 1000;
const ONE_MINUTE = 60*1000;

var fs = require('fs');
fs.changeWorkingDirectory("/home/danny/public_html/Counterfeit_Website_Classifier/Data_Collection");
console.log(fs.workingDirectory);
var crawler = require('casper').create({
	verbose: true,
	logLevel: 'warning'
});

var query_index = crawler.cli.get("query_index");

crawler.on('page.error', function(msg, trace) {
	casper.log("[Page Error] "+msg,'error');
});

var website_used = {
	search_engine: {
		url: "http://google.com.tw/",
		selector: "form[action='/search']",
		input_name: "q"
	},
	whois_lookup: [
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
	]
};

var timeout_used = {
	search: 10*ONE_SECOND,
	getLinks: 20*ONE_SECOND,
	getWHOIS: 15*ONE_SECOND
};

var queries = [];
var links_per_page = [];
var website_info = [];

function testLogging(){
	crawler.log('This is a debug message', 'debug');
	crawler.log('and an informative one', 'info');
	crawler.log('and a warning', 'warning');
	crawler.log('and an error', 'error');
	crawler.exit();
}

function buildQueries(brands, keywords){
	console.log("-----[Build Queries]-----");
	
	for(var i = 0; i < brands.length; i++){
		for(var j = 0; j < keywords.length; j++){
			queries.push(brands[i] + " " + keywords[j]);
		}
	}
	
	console.log(queries);
}

function search(query){
	var selector = website_used.search_engine.selector;
	var timeout = timeout_used.search;
	
	crawler.then(function(){
		console.log("Search for \"" + query + "\"");
		this.waitForSelector(selector, function(){
			this.fill(selector, {'q': query}, true);
			this.wait(timeout, function(){
				console.log("fill in \""+query+"\"(wait " + timeout/1000 + " seconds)");
			});
			console.log("-----[Get URLs]-----");
		});
	});
}

function getOnePageLinks(){
	var links = document.querySelectorAll('h3.r a');
	return Array.prototype.map.call(links, function(e){
		return e.getAttribute('href');
	});
}

function getLinks(page_start, pages_per_query){
	var page_index = page_start;
	var timeout = timeout_used.getLinks;
	
	crawler.repeat(pages_per_query, function(){
		this.clickLabel(page_index);
		this.wait(timeout, function(){
			console.log("click page "+page_index+"(wait " + timeout/1000 + " seconds)");
			
			links_per_page.push(this.evaluate(getOnePageLinks));
			console.log("get " + links_per_page[links_per_page.length-1].length + " links from");
			console.log(this.getCurrentUrl());
			page_index++;
		});
		
		/*console.log(this.getCurrentUrl());
		links_per_page.push(this.evaluate(getOnePageLinks));
		console.log("get " + links_per_page[links_per_page.length-1].length + " links");
		this.clickLabel(page_index+1);
		page_index++;
		this.wait(timeout, function(){
			console.log("wait " + timeout/1000 + " seconds");
		});*/
	});
}

function filterLinks(){
	console.log("-----[Filter URLs]-----")
	
	for(var i = 0; i < links_per_page.length; i++){
		console.log("page "+(i+1).toString()+" deletes");
		for(var j = 0; j < links_per_page[i].length; j++){
			if(links_per_page[i][j].indexOf("http") != -1){
				var website_item = new Object();
				website_item["url"] = links_per_page[i][j].substring(links_per_page[i][j].indexOf("http"));
				website_info.push(website_item);
			}
			else{
				console.log(links_per_page[i][j]);
			}
		}
	}
	
	console.log(website_info.length+" urls retained");
	for(var i = 0; i < website_info.length; i++){
		console.log((i+1) + ". " + website_info[i].url);
	}
}

function parseHostnames(){
	console.log("-----[Parse Hostnames]-----");
	
	for(var i = 0; i < website_info.length; i++){
		var regex_pattern = /(?:https|http):\/\/([0-9a-zA-Z.-]*)/gm;
		var result = regex_pattern.exec(website_info[i].url);
		website_info[i].hostname = result[1];
	}
	
	for(var i = 0; i < website_info.length; i++){
		console.log((i+1) + ". " + website_info[i].hostname);
	}
}

function getRawWHOIS(){
	try{
		var possible_selectors = ["div.df-block", "div.df-block > div.df-row", "div.raw_data"];
		
		if(crawler.exists(possible_selectors[1])){
			var elements_info = crawler.getElementsInfo(possible_selectors[1]);
			return [elements_info[0].text, elements_info[2].text];
		}
		else if(crawler.exists(possible_selectors[0])){
			return crawler.getElementInfo(possible_selectors[0]).text;
		}
		else if(crawler.exists(possible_selectors[2])){
			return crawler.getElementInfo(possible_selectors[2]).text;
		}
		else{
			return undefined;
		}
	}
	catch(e){
		crawler.log("[Get Raw WHOIS] "+e.message, 'error');
	}
}

function parseRawWHOIS(raw_data, index){
	try{
		//console.log(raw_data);
		if(typeof(raw_data) == "object"){
			website_info[index].registration_date = raw_data[1].split(':')[1];
		}
		else if(typeof(raw_data) == "string"){
			var pattern = /\d{4}-\d{2}-\d{2}/gm;
			var date = raw_data.match(pattern);
			
			if(date){
				if(new Date(date[0]) < new Date(date[1])){
					website_info[index].registration_date = date[0];
				}
				else{
					website_info[index].registration_date = date[1];
				}
			}
		}
		else{ //undefined
			crawler.log("get raw whois failed", 'warning');
		}
		console.log(JSON.stringify(website_info[index]));
	}
	catch(e){
		crawler.log("[Parse Raw WHOIS] "+e.message, 'error');
	}
}

function getWHOIS(){
	console.log("-----[Get Whois]-----");
	
	var index = 0;
	var times = website_info.length;
	var Timeout = timeout_used.getWHOIS;
	
	crawler.repeat(times, function(){
		try{
			var raw_data = null;
			var whois_index = index%2;
			var selector = website_used.whois_lookup[whois_index].selector;
			
			crawler.thenOpen(website_used.whois_lookup[whois_index].url, function(){
				console.log("use " + this.getCurrentUrl());
			});
			
			//fill in the hostname
			crawler.then(function(){
				console.log((index+1) + ". " + website_info[index].hostname);
				if(this.exists(selector)){console.log("found form");}
				if(whois_index == 0){
					this.fill(selector, {'query': website_info[index].hostname}, true);
				}
				else{
					this.fill(selector, {'whois': website_info[index].hostname}, true);
				}
				
				//index++;
			});
			
			//get raw whois
			crawler.then(function(){
				console.log("->get raw whois");
				this.wait(Timeout, function(){
					raw_data = getRawWHOIS();
				});
			});
			
			//parse raw whois
			crawler.then(function(){
				parseRawWHOIS(raw_data, index);
				index++
			});
		}
		catch(e){
			crawler.log("[Get WHOIS] "+e.message, 'error');
		}
	});
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

function findRecentSites(recent_month){
	console.log("-----[Find Recent Sites]-----");
	
	var num_of_success = 0;
	var failure_index = [];
	
	var file_path = fs.workingDirectory+"/Output/url_gs.txt";
	/*var csv_path = "./csv/"+query_index+"_"+queries[query_index]+".csv";
	if(query_index == undefined || query_index == null){
		csv_path = "./csv/filtered.csv";
	}*/
	
	for(var i = 0; i < website_info.length; i++){
		if(website_info[i].registration_date != undefined){
			if(getMonthDiff(website_info[i].registration_date) <= recent_month){
				num_of_success++;
				console.log(JSON.stringify(website_info[i]));
				fs.write(file_path, website_info[i].url+'\n', 'a');
				//writeCSV(csv_path, website_info[i]);
			}
		}
		else{
			failure_index.push(i);
		}
	}
	
	console.log(num_of_success + " websites are registered in " + recent_month + " months");
	crawler.log(failure_index.length + " websites failed to get whois", 'warning');
	crawler.log(failure_index, 'warning');
}

function writeCSV(path, info_obj){
	try{
		var record = '';
	
		for(var key in info_obj){
			record+=('"' + info_obj[key] + '",');
		}
		record = record.replace(/,$/, '\n');
	
		fs.write(path, record, 'a');
	}
	catch(e){
		crawler.log('[Write CSV] '+e.message, 'error');
	}
}

function readInput(path){
	var content = fs.read(path);
	var data = content.split('\n');
	for(var i = 0; i < data.length; i++){
		//console.log(data[i]);
		var new_item = new Object();
		new_item.url = data[i];
		website_info.push(new_item);
	}
}

//Stage 1. construct queries
crawler.start(website_used.search_engine.url, function(){
	try{
		var content = JSON.parse(fs.read("./google_search_query.json", {charset: 'big5'}));

		var brands = content.brands; 
		var keywords = content.keywords;
	
		buildQueries(brands, keywords);
	}
	catch(e){
		crawler.log(e.message, 'error');
		crawler.exit();
	}
});

//Stage 2. get links
crawler.then(function(){
	try{
		search(queries[query_index]);
		getLinks(page_start=1, pages_per_query=1);
	}
	catch(e){
		crawler.log("[Get Links] "+e.message, 'error');
		crawler.exit();
	}
});

//Stage 3. filter links 
crawler.then(function(){
	try{
		filterLinks();
	}
	catch(e){
		crawler.log("[Filter Links] "+e.message, 'error');
		crawler.exit();
	}
});

//Stage 4. parse hostnames from links
crawler.then(function(){
	try{
		//readInput('./csv/filtered.txt');
		parseHostnames();
	}
	catch(e){
		crawler.log("[Parse Hostnames] "+e.message, 'error');
		crawler.exit();
	}
});


//Stage 5. get and parse whois information
crawler.then(function(){
	try{
		getWHOIS();
	}
	catch(e){
		crawler.log("[Get WHOIS] "+e.message, 'error');
		crawler.exit();
	}
});

//Stage 6. find websites registered recently
crawler.then(function(){
	try{
		findRecentSites(recent_month=6);
	}
	catch(e){
		crawler.log("[Find Recent Sites] "+e.message, 'error');
		crawler.exit();
	}
});

crawler.run();