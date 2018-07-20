/*
SYNOPSIS: casperjs whoscall_crawler.js [OPTION]
DESCRIPTION:
	--max=[MAXIMUM_NUMBER_OF_ELEMENTS]
*/
var fs = require('fs');
console.log(fs.workingDirectory);
var crawler = require('casper').create({
	verbose: true,
	logLevel: 'warning'
});

var max_num_of_elements = crawler.cli.has('max')?crawler.cli.get('max'):50;
var sources = [
	{
		url: 'http://cybercrime.whoscall.com/', 
		selector: 'div.list-group p.listUrl',
		more_btn: 'div.inner > a.more-btn'
	}
];

var website_fake = [];

main();
function main(){
	initialize();
	getUrls();
	start();
}

function initialize(){
	crawler.start(sources[0].url, function(){
		try{
			console.log(this.getCurrentUrl());
			if(this.exists(sources[0].more_btn)){
				scrollToBottom(0);
			}
			else{
				throw new Error("more_btn doesn't exist");
			}
		}
		catch(e){
			crawler.log("[initialize]: "+e.message ,'error');
		}
	});
}

function scrollToBottom(num_of_elements){
	console.log(num_of_elements);
	crawler.then(function(){
		crawler.evaluate(function(more_btn_selector){
			try{
				var more_btn = document.querySelector(more_btn_selector);
				more_btn.click();
			}
			catch(e){
				crawler.log("[scrollToBottom]: "+e.message, 'error');
				crawler.exit();
			}
		}, sources[0].more_btn);
		
		var timeout = (num_of_elements == 0)?5*1000:1*1000;
		crawler.wait(timeout, function(){
			try{
				var elements_info = this.getElementsInfo(sources[0].selector);
				
				if((elements_info.length > num_of_elements) && 
					(elements_info.length < max_num_of_elements)){
					num_of_elements = elements_info.length;
					scrollToBottom(num_of_elements);
				}
				else {
					console.log("!!!Reach Page Bottom!!!");
					console.log(elements_info.length+' urls get');
				}
			}
			catch(e){
				crawler.log("[scrollToBottom]: "+e.message, 'error');
				crawler.exit();
			}
		});
	});
}

function getUrls(){ 
	crawler.then(function(){
		try{
			var urls = this.getElementsInfo(sources[0].selector);
			urls = urls.map(function(ary_ele){
				return ary_ele.text;
			});
			urls = urls.filter(function(ary_ele){
				return (ary_ele.indexOf("facebook") == -1);
			});
			
			var file_path = fs.workingDirectory+"/url_counterfeit_new.txt";
			for(var i = 0 ; i < urls.length; i++){
				//console.log(urls[i]);
				fs.write(file_path, urls[i]+'\n', 'a');
			}
			console.log(urls.length + " websites get");
		}
		catch(e){
			crawler.log("[getUrls]: "+e.message ,'error');
		}
	});
}

function start(){
	crawler.run();
}
