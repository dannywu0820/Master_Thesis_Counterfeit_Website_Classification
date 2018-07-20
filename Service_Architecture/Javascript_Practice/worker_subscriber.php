<?php
	require("../vendor/autoload.php");
	
	$queue_name = 'test_queue';
	$connection = new PhpAmqpLib\Connection\AMQPStreamConnection('140.113.207.206', 5672, 'danny', 'livebetterlife');
	$channel = $connection->channel();
	$channel->queue_declare(
		$queue=$queue_name, 
		$passive=false, 
		$durable=true, 
		$exclusive=false, 
		$auto_delete=false
	);
	
	$channel->basic_qos(
		$prefetch_size=null,
		$prefetch_count=1,
		$a_global=null
	);
	
	$get_wanted_msg = false;
	$wanted_websiteID = 15;
	$callback = function($msg) use (&$channel, &$get_wanted_msg, &$queue_name, &$wanted_websiteID){
		echo "Subscribe: ".$msg->body."\n";
		$subscribed_websiteID = json_decode($msg->body, true)["websiteID_list"][0];
		sleep(2);
		echo "Process Done\n";
		
		//$msg->delivery_info['channel']->basic_ack($msg->delivery_info['delivery_tag']);
		
		if($subscribed_websiteID == $wanted_websiteID){
			$msg->delivery_info['channel']->basic_ack($msg->delivery_info['delivery_tag']);
			$get_wanted_msg = true;
		}
		else{
			if($get_wanted_msg){
				$msg->delivery_info['channel']->basic_ack($msg->delivery_info['delivery_tag']);
			}
			else{
				$msg->delivery_info['channel']->basic_nack($msg->delivery_info['delivery_tag'], $multiple=false, $requeue=false);
				$resent_msg = new PhpAmqpLib\Message\AMQPMessage($msg->body, array('delivery_mode' => PhpAmqpLib\Message\AMQPMessage::DELIVERY_MODE_PERSISTENT));
				$channel->basic_publish($resent_msg, '', $queue_name);
			}
		}
		
	};
	$channel->basic_consume($queue_name, '', false, false, false, false, $callback);
		
	$timeout_count = 0;
	while(true){
		try{
			//if($get_wanted_msg) break;
			if($timeout_count == 3) break;
			$channel->wait(null, false, 5);
		}
		catch(Exception $e){
			$timeout_count++;
			echo $e->getMessage()."\n";
		}
	}
	
	echo "close\n";
	$channel->close();
	$connection->close();
?>