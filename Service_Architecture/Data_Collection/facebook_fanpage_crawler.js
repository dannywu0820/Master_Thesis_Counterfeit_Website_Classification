/*
SYNOPSIS: casperjs facebook_fanpage_crawler.js [OPTION]
DESCRIPTION:
*/
const ONE_SECOND = 1000;
const ONE_MINUTE = 60*1000;

var fs = require('fs');
fs.changeWorkingDirectory("/home/danny/public_html/Counterfeit_Website_Classifier/Data_Collection");
console.log(fs.workingDirectory);
var crawler = require('casper').create({
	verbose: true,
	logLevel: 'warning'
});

crawler.on('page.error', function(){
	casper.log("[Page Error] "+msg,'error');
});

var ranking_list = [];

var website_used = {
	ranking: {
		url: "http://page.board.tw/rank.php?tagid=74"
	},
	facebook: {
		url: "https://www.facebook.com/login.php"
	}
};

var fanpage_used = [
	{url:"https://www.facebook.com/%E9%AD%85%E5%8A%9B%E7%94%B7%E4%BA%BA-779998882162456/", selector:"div.story_body_container span > p > a"},
	{url:"https://www.facebook.com/Connection-Technology-CoLtd-121078545147838/", selector:"div.story_body_container span > p > a"},
	{url:"https://www.facebook.com/Fashion-store%E9%9E%8B%E5%8C%85%E6%9C%8D%E9%A3%BE-271600626641806/", selector:"a._4o50.touchable"}
];

var website_fake = [];

var timeout_used = {
	loginFB: 10*ONE_SECOND
}

function getRankingList(){
	var links = [];
	$('div.sixteen.wide.column > table > tbody > tr').each(function(){ 
		//links.push($(this).find('td').eq(1).text());
		links.push($(this).find('td > a').eq(0).attr('href'));
	});
	
	return links;
}

function loginFB(email, paswd){
	var timeout = timeout_used.loginFB;
	
	crawler.page.evaluate(function(account, password) {
		document.getElementById("email").value = account;
		document.getElementById("pass").value = password;
		document.querySelector("#login_form").submit();	
	}, email, paswd);
	
	//used for checking whether login is successful
	/*crawler.wait(timeout, function(){
		var img_setting = {top: 0, left: 0, width: 980, height: 600};
		var img_path = fs.workingDirectory+"/img/login.png";
		this.capture(img_path, img_setting);
	});*/
}

function getLinks(selector){
	var links = document.querySelectorAll(selector);
	return Array.prototype.map.call(links, function(e){
		return e.getAttribute('href');
	});
}

function scrollToBottom(height, test){
	crawler.then(function(){
		var new_height = crawler.evaluate(function(ori_height){
			window.scrollTo(0, ori_height+5000);
			return document.body.scrollHeight;
		}, height);
		crawler.wait(10*1000, function(){
			if(new_height > height){
				if(!test) scrollToBottom(new_height);
				else if(new_height < 6000){
					scrollToBottom(new_height);
				}
				else{
					console.log("!!!Reach Page Bottom!!! document.body.scollHeight = " + height);
				}
			}
			else {
				console.log("!!!Reach Page Bottom!!! document.body.scollHeight = " + height);
			}
		});
	});
}

function openFanpage(url){
	crawler.thenOpen(url, function(){
		try{
			console.log("-----[Open Fanpage]-----");
			console.log("title: "+this.getTitle());
			console.log("url: "+this.getCurrentUrl());
			scrollToBottom(0, true);
		}
		catch(e){
			crawler.log("[Open Fanpage] "+e.message, 'error');
		}
	});
}

function getFanpageLinks(link_selector){
	crawler.then(function(){
		try{
			if(this.exists(link_selector)){
				var fake_links = this.evaluate(function(selector){
					var elements = document.querySelectorAll(selector);
					var result = [];
					for(var i = 0; i < elements.length; i++){
						result.push(elements[i].href);
					}
					
					return result;
				}, link_selector);
				
				website_fake = website_fake.concat(fake_links);
			}
			else{
				crawler.log(link_selector + " doesn't exist", 'warning');
			}
		}
		catch(e){
			crawler.log("[Get Fanpage Links] "+e.message, 'error');
		}
	});
}

/*crawler.start(website_used.ranking.url, function(){
	try{
		ranking_list = this.evaluate(getRankingList);
		for(var i = 0; i < ranking_list.length; i++){
			console.log(ranking_list[i]);
		}
	}
	catch(e){
		crawler.log(e.message,'error');
	}
});*/

//login FB
crawler.start(website_used.facebook.url, function(){
	try{
		var email = "livebetterlife0820@gmail.com";
		var paswd = "livebetterlife08201005";
		
		loginFB(email, paswd);
	}
	catch(e){
		crawler.log("[Login FB] "+e.message,'error');
	}
});

//open each fanpage and get counterfeit websites' urls
crawler.then(function(){
	var index = 0;
	var num_of_fanpages = 1; //fanpage_used.length;
	
	this.repeat(num_of_fanpages, function(){
		var url = fanpage_used[index].url;
		var href_selector = fanpage_used[index].selector;
		index++;

		openFanpage(url);
		getFanpageLinks(href_selector);
	});
});

//open each counterfeit website
crawler.then(function(){
	var index = 0;
	var times = website_fake.length;
	var file_path = fs.workingDirectory+"/Output/url_fb.txt"
	console.log(website_fake.length + " websites get");
	
	this.repeat(times, function(){
		this.thenOpen(website_fake[index], function(){
			var url = this.getCurrentUrl();
			console.log((index+1).toString()+". "+url);
			fs.write(file_path, url+'\n', 'a');
			index++;
		});
	});
});

crawler.run();