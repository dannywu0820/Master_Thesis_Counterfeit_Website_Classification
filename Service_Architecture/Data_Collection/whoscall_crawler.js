/*
SYNOPSIS: casperjs whoscall_crawler.js [OPTION]
DESCRIPTION:
	--max=[MAXIMUM_NUMBER_OF_ELEMENTS]
*/
var fs = require('fs');
fs.changeWorkingDirectory("/home/danny/public_html/Counterfeit_Website_Classifier/Data_Collection");
console.log(fs.workingDirectory);
var crawler = require('casper').create({
	verbose: true,
	logLevel: 'warning'
});

var max_num_of_elements = crawler.cli.has('max')?crawler.cli.get('max'):50;
var sources = [
	{
		url: "http://cybercrime.whoscall.com/", 
		selector: "div.list-group p.listUrl",
		more_btn: "a.more-btn"
	}
];

var website_fake = [];

function scrollToBottom(num_of_elements){
	crawler.then(function(){
		crawler.evaluate(function(){
			var more_btn = document.querySelectorAll('a.more-btn');
			if(more_btn && more_btn.length == 2){
				more_btn = more_btn[1];
				more_btn.click();
			}
		});
		
		crawler.wait(5*1000, function(){
			try{
				var elements_info = this.getElementsInfo(sources[0].selector);
				
				if((elements_info.length > num_of_elements) && 
					elements_info.length < max_num_of_elements){
					num_of_elements = elements_info.length;
					scrollToBottom(num_of_elements);
				}
				else {
					console.log("!!!Reach Page Bottom!!!");
				}
			}
			catch(e){
				crawler.log("[Get Elements Info] "+e.message, 'error');
			}
		});
	});
}

crawler.start(sources[0].url, function(){
	try{
		console.log(this.getCurrentUrl());
		if(this.exists(sources[0].more_btn)){
			scrollToBottom(0);
		}
		else{
			console.log(sources[0].more_btn+" doesn't exist");
			crawler.exit();
		}
	}
	catch(e){
		crawler.log("[Scroll to Bottom] "+e.message ,'error');
	}
});

crawler.then(function(){
	try{
		var url_fake_websites = this.getElementsInfo(sources[0].selector);
		url_fake_websites = url_fake_websites.map(function(ary_ele){
			return ary_ele.text;
		});
		
		var file_path = fs.workingDirectory+"/Output/url_whoscall.txt";
		for(var i = 0 ; i < url_fake_websites.length; i++){
			console.log(url_fake_websites[i]);
			fs.write(file_path, url_fake_websites[i]+'\n', 'a');
		}
		console.log(url_fake_websites.length + " websites get");
	}
	catch(e){
		crawler.log("[] "+e.message ,'error');
	}
});

crawler.run();