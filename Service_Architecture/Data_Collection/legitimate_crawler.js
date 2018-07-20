/*
SYNOPSIS: casperjs legitimate_crawler.js [OPTION]
DESCRIPTION:
	--output=[OUTPUT_NAME]
	--test=[TRUE/FALSE]
*/
var fs = require('fs');
fs.changeWorkingDirectory("/home/danny/public_html/Counterfeit_Website_Classifier/Data_Collection");
console.log(fs.workingDirectory);
var crawler = require('casper').create({
	verbose: true,
	logLevel: 'warning'
});

crawler.options.onError = function(msg, backtrace){
	crawler.log(msg);
}

var platform = {};
var shop_names = [];
var shop_urls = [];
var test = (crawler.cli.has("test"))?crawler.cli.get("test"):false;
var output = (crawler.cli.has("output"))?crawler.cli.get("output"):"url_legitimate";

function getShopNames(name_selector){
	var names = crawler.evaluate(function(selector){
		var name_elements = document.querySelectorAll(selector);
		var name_texts = [];
		for(var i = 0; i < name_elements.length; i++){
			name_texts.push(name_elements[i].innerText.replace(/(\r\n|\n|\r)/gm,""));
		}
		name_texts.pop();
		
		return name_texts;
	}, name_selector);
	
	return names;
}

function search(query){
	var selector = "form[action='/search']";
	var timeout = 5*1000;
	
	crawler.then(function(){
		console.log("Search for \"" + query + "\"");
		this.waitForSelector(selector, function(){
			this.fill(selector, {'q': query}, true);
			this.wait(timeout, function(){
				console.log("wait " + timeout/1000 + " seconds");
			});
			console.log("-----[Get Official URL]-----");
		});
	});
}

function getOnePageLinks(){
	var links = document.querySelectorAll('h3.r a');
	
	if(links){
		return Array.prototype.map.call(links, function(e){
			return e.getAttribute('href');
		});
	}
	return [];
}

function notPlatformURL(url){
	var platforms = ["yahoo", "momo", "pchome", "shopee", "rakuten", "ruten", "pcstore"];
	var notInPlatform = true;
	
	for(var i = 0; i < platforms.length; i++){
		if(url.indexOf(platforms[i]) != -1){
			notInPlatform = false;
			break;
		}
	}
			
	return notInPlatform;
}

function getHostname(url){
	var pattern_hostname = /(?:https|http):\/\/([0-9a-zA-Z.-]*)/gm;
	var result = pattern_hostname.exec(url);
			
	if(result){
		return result[0];
	}
	return "";
}

function getShopURLs(){
	crawler.then(function(){
		var one_page_urls = crawler.evaluate(getOnePageLinks);
		
		filtered = one_page_urls.filter(notPlatformURL);
		
		filtered = filtered.map(getHostname);
		
		filtered = filtered.filter(function(ary_ele){
			return ary_ele != "";
		});
		
		if(filtered.length > 0){
			console.log(filtered[0]);
			shop_urls.push(filtered[0]);
		}
	});
}

//get famous shop names
crawler.start("http://google.com.tw", function(){
	try{
		platform = JSON.parse(fs.read('./legitimate_platform.json'));
		
		var index = 0;
		var selector = platform.momo.shop_name_selector; //platform.yahoo.shop_name_selector;
		var sources = platform.momo.sources;
		var times = (test==true)?1:platform.momo.sources.length;
		
		this.repeat(times, function(){
			crawler.thenOpen(sources[index], function(){
				try{
					console.log((index+1)+". "+this.getCurrentUrl());
					var new_shop_names = getShopNames(selector);
					shop_names = shop_names.concat(new_shop_names);
					index++;
					
					console.log(new_shop_names);
				}
				catch(e){
					crawler.log(e.message, 'error');
				}
			});
		});
	}
	catch(e){
		crawler.log("[Get Shop Names] "+e.message, 'error');
	}
});

//get famous shops urls
crawler.thenOpen("http://google.com.tw", function(){
	try{
		var index = 0;
		var times = (test && shop_names.length>10)?10:shop_names.length;
		console.log(times+" shops to search");
		
		this.repeat(times, function(){
			search(shop_names[index]);
			getShopURLs();
			index++;
		});
	}
	catch(e){
		crawler.log("[Get Shop URLs] "+e.message, 'error');
	}
});

crawler.then(function(){
	try{	
		var file_path = fs.workingDirectory+"/Output/"+output+".txt";
			
		for(var i = 0; i < shop_urls.length; i++){
			console.log((i+1).toString()+". "+shop_urls[i]);
			fs.write(file_path, shop_urls[i]+'\n', 'a');
		}
	}
	catch(e){
		crawler.log(e.message, 'error');
	}
});

crawler.run();