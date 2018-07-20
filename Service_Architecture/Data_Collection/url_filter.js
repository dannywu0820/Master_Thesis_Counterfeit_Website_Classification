/*
SYNOPSIS: casperjs url_filter.js [OPTION]
DESCRIPTION:
	--output=[OUTPUT_NAME]
	--type=[LEGITIMATE/COUNTERFEIT]
*/
var fs = require('fs');
fs.changeWorkingDirectory("/home/danny/public_html/Counterfeit_Website_Classifier/Data_Collection");
console.log(fs.workingDirectory);
var crawler = require('casper').create({
	verbose: true,
	logLevel: 'warning',
	pageSettings:{
		resourceTimeout: 10*1000
	}
});

var output = crawler.cli.has("output")?crawler.cli.get("output"):"url_filtered";
var type = crawler.cli.has("type")?crawler.cli.get("type"):"counterfeit";
var urls_retained = [];

crawler.on('page.resource.received', function(response_data){
	console.log(response_data.url+": "+response_data.status);
	var file_path = fs.workingDirectory+"/Output/"+output+".txt";
	if(response_data.status == 200){
		fs.write(file_path, response_data.url+'\n', 'a');
	}
});

crawler.on('error', function(msg, backtrace){
	crawler.log("[onError] "+msg, error);
});

crawler.start("http://google.com.tw/", function(){
	try{
		console.log("-----[Read in URLs]-----");
		var file_names = JSON.parse(fs.read('./url_filter.json'))[type];
		
		for(var i = 0; i < file_names.length; i++){
			var file_path = fs.workingDirectory+"/Output/"+file_names[i];
			if(fs.exists(file_path)){
				urls_retained = urls_retained.concat(fs.read(file_path).split('\n'));
				urls_retained.pop();
			}
			else{
				crawler.log(file_path+" doesn't exist", 'warning');
			}
		}
		
		console.log(urls_retained.length+' urls in total');
	}
	catch(e){
		crawler.log("[Read in URLs] "+e.message, 'error');
	}
});

//remove repeated urls
crawler.then(function(){
	try{
		console.log("-----[Remove Repeated URLs]-----");
		urls_retained = urls_retained.filter(function(element, index){
			return index == urls_retained.indexOf(element);
		});
		
		console.log(urls_retained.length+" urls retained");
	}
	catch(e){
		crawler.log("[Remove Repeated URLs] "+e.message, 'error');
	}
});

//remove urls from famous domain name
crawler.then(function(){
	try{
		console.log("-----[Remove Famous-Domain URLs]-----");
		var famous_domains = ["youtube.com", "facebook.com", "shopee", "pchome", "momo", "ruten", "rakuten"];
		
		urls_retained = urls_retained.filter(function(element){
			var notFamous = true;
			for(var i = 0; i < famous_domains.length; i++){
				if(element.indexOf(famous_domains[i]) != -1){
					notFamous = false;
					break;
				}
			}
			return notFamous;
		});
		
		console.log(urls_retained.length+" urls retained");
	}
	catch(e){
		crawler.log("[Remove Famous-Domain URLs] "+e.message, 'error');
	}
});

//remove urls that failed to open
crawler.then(function(){
	try{
		console.log("-----[Remove Failed-to-Open URLs]-----");
		var index = 0;
		var times = urls_retained.length;
		
		this.repeat(times, function(){
			this.thenOpen(urls_retained[index], function(){
				index++;
			});
		});
	}
	catch(e){
		crawler.log("[Open Each URL]"+e.message, 'error');
	}
});

crawler.run(function(){
	this.exit();
});