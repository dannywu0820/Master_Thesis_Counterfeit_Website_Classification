/*

My Customized JS
============

Author:  Danny
Updated: October 2018
Notes:

*/

$(function(){
	$('.click_me').click(function(e){
		e.preventDefault();
		$('#callout_alert').slideDown();
	});

	$('a.pop').click(function(e){
		e.preventDefault(); //avoid refreshing the page(href="") or skipping to top(href="#")
	});

	$('a.pop').popover();

	$('[data-toggle="tooltip"]').tooltip();
});