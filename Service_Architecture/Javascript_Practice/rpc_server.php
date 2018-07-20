<?php
	require("../vendor/autoload.php");

	use PhpAmqpLib\Connection\AMQPStreamConnection;
	use PhpAmqpLib\Message\AMQPMessage;

	$connection = new AMQPStreamConnection('140.113.207.206', 5672, 'danny', 'livebetterlife');
	$channel = $connection->channel();

	$rpc_queue = 'test_queue';
	$channel->queue_declare($rpc_queue, false, true, false, false);
	$channel->basic_qos(null, 1, null);

	$callback = function($msg){
		echo "Server get ".$msg->body;
		
		$new_msg = new AMQPMessage(
			$msg->body,
			array('correlation_id' => $msg->get('correlation_id'))
		);
		sleep(10);
		echo "Send back";
		$msg->delivery_info['channel']->basic_publish($new_msg, '', $msg->get('reply_to'));
		$msg->delivery_info['channel']->basic_ack($msg->delivery_info['delivery_tag']);
	};

	$channel->basic_consume($rpc_queue, '', false, false, false, false, $callback);

	while(true){
		$channel->wait();
	}

	$channel->close();
	$connection->close();
?>