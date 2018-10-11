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
});