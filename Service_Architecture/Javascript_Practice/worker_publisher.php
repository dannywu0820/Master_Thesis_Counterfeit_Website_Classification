<?php
	require("../vendor/autoload.php");

	use PhpAmqpLib\Connection\AMQPStreamConnection;
	use PhpAmqpLib\Message\AMQPMessage;
		
	$connection = new AMQPStreamConnection('140.113.207.206', 5672, 'danny', 'livebetterlife');
	$channel = $connection->channel();

	worker($channel);

	$channel->close();
	$connection->close();
		
	function worker(&$channel){	
		$queue_name = 'test_queue';
		$channel->queue_declare(
			$queue=$queue_name, 
			$passive=false, 
			$durable=true, 
			$exclusive=false, 
			$auto_delete=false
		);
		
		$message_count = 5;
		$id = 11;
		$time_interval = 1;
		for($i = 0; $i < $message_count; $i++){
			$msg_body = json_encode(array(
				'workflow_type' => 'predict', 
				'websiteID_list' => array($id)
			));
			$id++;
			$msg = new AMQPMessage(
				$msg_body,
				array('delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT)
			);
			echo "Publish: ".$msg_body."\n";
			$channel->basic_publish($msg, '', $queue_name);
			
			sleep($time_interval);
		}
	}	
?>