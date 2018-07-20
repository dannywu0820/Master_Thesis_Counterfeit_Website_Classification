<?php
	require("../vendor/autoload.php");

	use PhpAmqpLib\Connection\AMQPStreamConnection;
	use PhpAmqpLib\Message\AMQPMessage;
			
	$connection = new AMQPStreamConnection('140.113.207.206', 5672, 'danny', 'livebetterlife');
	$channel = $connection->channel();

	call(5, $channel);

	$channel->close();
	$connection->close();
	
	function call($websiteID, &$channel){
		$response = null;
		
		//subscribe
		list($reply_queue, ,) = $channel->queue_declare(
			$queue="", 
			$passive=false, 
			$durable=false, 
			$exclusive=true, 
			$auto_delete=true
		);
		echo $reply_queue."\n";
		$callback = function($msg) use (&$response, &$websiteID){
			if($msg->get('correlation_id') == $websiteID){
				$response = $msg->body;
			}
		};
		$channel->basic_consume(
			$reply_queue,
			'',
			false,
			false,
			false,
			false,
			$callback
		);
		
		//publish
		$rpc_queue = 'test_queue';		
		$msg_body = json_encode(array(
			"workflow_type" => "predict",
			"websiteID_list" => array($websiteID)
		));
		$msg_property = array(
			"correlation_id" => $websiteID,
			"reply_to" => $reply_queue
		);
		$msg = new AMQPMessage(
			$msg_body,
			$msg_property
		);
			
		$channel->basic_publish($msg, '', $rpc_queue);
		
		//wait for response
		while(!$response){
			$channel->wait();
		}
		echo "Finally get: ".$response."\n";
	}
?>