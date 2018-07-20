<?php

class IndexController extends FacebookController {
	private $rabbitmq_connection;
	private $rabbitmq_channel;
	private $queue_for_feature_crawler = "test_queue";
	private $queue_for_model_caller = "test2_queue";
	
	public function __check(){
        parent::__check();
    }
	
	public function index() {
		return new PageView(array(
		));
	}

	public function test(){
		try{
			sleep(3); //test up to 200 seconds
			
			return new JsonView([
				"success" => true,
				"items" => $this->args["url"]
			]);
		}
		catch(Exception $e){
			return new JsonView([
				"success" => false,
				"error" => [
					"message" => $e->getMessage()
				]
			]);
		}
	}
	
	public function feedbackByUser(){
		try{
			require_once("vendor/autoload.php");
			
			$url = $this->args["url"];
			$website_record = Website::getWebsite($url);
			$feedback = $this->args["feedback_value"];
			Website::updateFeedback($website_record["websiteID"], $feedback);
			
			if(strcmp($feedback, "No") == 0){
				/*
				insert consumers' adjusted features
				into another table to keep a record
				*/
			}
			
			return new JsonView([
				"success" => true,
				"items" => $feedback
			]);
		}
		catch(Exception $e){
			return new JsonView([
				"success" => false,
				"error" => [
					"message" => $e->getMessage()
				]
			]);
		}
	}
	
	public function feedbackByAdmin(){
		try{
			require_once("vendor/autoload.php");
			
			$url = $this->args["url"];
			$website_record = Website::getWebsite($url);
			$prediction = null;
			
			$original_features = json_decode($website_record["feature"], true);
			$adjusted_features = json_decode($this->args["feature"], true);
			foreach($adjusted_features as $key => $value){
				$original_features[$key] = $value;
			}
				
			Website::updateFeature(
				$website_record["websiteID"],
				json_encode($original_features)
			);
				
			$prediction = $this->runModelCaller($website_record);
			
			return new JsonView([
				"success" => true,
				"items" => $prediction
			]);
		}
		catch(Exception $e){
			return new JsonView([
				"success" => false,
				"error" => [
					"message" => $e->getMessage()
				]
			]);
		}
	}
	
	public function predict(){
		try{
			require_once("vendor/autoload.php");
			
			define(URL_EXIST_FEEDBACK_YES, 0);
			define(URL_EXIST_FEEDBACK_NO, 1);
			define(URL_NOT_EXIST, 2);
			define(URL_EXIST, 3);
			
			$situation = -1;
			$url = trim($this->args['url'], "\'\r");
			$website_record = Website::getWebsite($url);
			$url_not_in_database = is_null($website_record);
			
			if($url_not_in_database){
				$situation = URL_NOT_EXIST;
			}
			else{
				/*$feedback_is_yes = (strcmp($website_record["feedback"], "Yes") == 0);
				if($feedback_is_yes){
					$situation = URL_EXIST_FEEDBACK_YES;
				}
				else{
					$situation = URL_EXIST_FEEDBACK_NO;
				}*/
				$situation = URL_EXIST;
			}
			//$situation = 2;
			
			switch($situation){
				case URL_EXIST_FEEDBACK_YES:
					$prediction = $this->getDatabaseResult($website_record);
					break;
				case URL_EXIST_FEEDBACK_NO:
					$prediction = $this->runModelCaller($website_record);
					break;
				case URL_NOT_EXIST:
					$prediction = $this->runFeatureCrawler($this->args['url']);
					break;
				case URL_EXIST:
					$prediction = $this->getDatabaseResult($website_record);
					break;
				default:
					throw new Exception("Situation not defined");
					break;
			}
			
			return new JsonView([
				"success" => true,
				"items" => $prediction
			]);
		}
		catch(Exception $e){
			Website::updateStatus($website_record["websiteID"], "backend", "failure");
			
			return new JsonView([
				"success" => false,
				"items" => $e->getMessage()
			]);
		}
	}
	
	private function runFeatureCrawler($url){
		$published_websiteID = Website::addNewWebsite($url);
		
		$this->setupRabbitmq();
		$queue_to_subscribe = $this->generate_temporary_queue();
		$this->publish($this->queue_for_feature_crawler, $published_websiteID, $queue_to_subscribe);
		$res = $this->subscribe($published_websiteID, $queue_to_subscribe);
		$this->closeRabbitmq();
		
		$website_record = Website::getWebsite($url);
		if(strcmp($website_record["status"], "model_caller: success") == 0){
			Website::updateStatus($published_websiteID, "backend", "success");
		}
		else{
			throw new Exception(json_encode(array(
				"websiteID" => $website_record["websiteID"],
				"status" => $website_record["status"]
			)));
		}
		
		return array(
			"response" => $res, //websiteID in $res == $published_websiteID
			"websiteID" => $published_websiteID,
			"label" => $website_record["label"],
			"probability" => $website_record["probability"],
			"reason" => $website_record["feature"]
		);
	}
	
	private function runModelCaller($website_record){
		//remember to update status to 'backend: processing'
		$published_websiteID = $website_record["websiteID"];
		
		$this->setupRabbitmq();
		$queue_to_subscribe = $this->generate_temporary_queue();
		$this->publish($this->queue_for_model_caller, $published_websiteID, $queue_to_subscribe);
		$res = $this->subscribe($published_websiteID, $queue_to_subscribe);
		$this->closeRabbitmq();
		
		$website_record = Website::getWebsite($website_record['url']);
		if(strcmp($website_record["status"], "model_caller: success") == 0){
			Website::updateStatus($published_websiteID, "backend", "success");
		}
		else{
			throw new Exception(json_encode(array(
				"websiteID" => $website_record["websiteID"],
				"status" => $website_record["status"]
			)));
		}
		
		return array(
			"websiteID" => $published_websiteID,
			"label" => $website_record["label"],
			"probability" => $website_record["probability"],
			"reason" => $website_record["feature"]
		);
	}
	
	private function getDatabaseResult($website_record){
		return array(
			"websiteID" => $website_record["websiteID"],
			"label" => $website_record["label"],
			"probability" => $website_record["probability"],
			"reason" => $website_record["feature"]
		);
	}
	
	private function setupRabbitmq(){
		try{
			$setting = Config::envget("rabbitmq");
			$this->rabbitmq_connection = new PhpAmqpLib\Connection\AMQPStreamConnection(
				$setting['host'],
				$setting['port'],
				$setting['user'],
				$setting['password']
			);
			
			$this->rabbitmq_channel = $this->rabbitmq_connection->channel();
			$this->rabbitmq_channel->basic_qos(
				$prefetch_size=null,
				$prefetch_count=1,
				$a_global=null
			);
		}
		catch(Exception $e){
			throw $e;
		}
	}
	
	private function generate_temporary_queue(){
		try{
			list($reply_queue, ,) = $this->rabbitmq_channel->queue_declare(
				$queue="", 
				$passive=false, 
				$durable=false, 
				$exclusive=true, 
				$auto_delete=true
			);
			
			return $reply_queue;
		}
		catch(Exception $e){
			throw $e;
		}
	}
	
	private function publish($queue_name, $published_websiteID, $reply_queue){
		try{
			$msg_body = json_encode(array(
				"workflow_type" => "predict",
				"websiteID_list" => array($published_websiteID)
			));
			$msg_property = array(
				"correlation_id" => $published_websiteID,
				"reply_to" => $reply_queue
			);
			$msg = new PhpAmqpLib\Message\AMQPMessage($msg_body, $msg_property); 
			$this->rabbitmq_channel->basic_publish($msg, '', $queue_name);
		}
		catch(Exception $e){
			throw $e;
		}
	}
	
	private function subscribe($published_websiteID, $reply_queue){
		try{
			$response = null;
			$callback = function($msg) use (&$published_websiteID, &$response){
				if($msg->get('correlation_id') == $published_websiteID){
					$response = $msg->body;
				}
			};
			
			$this->rabbitmq_channel->basic_consume(
				$reply_queue,
				'',
				false,
				false,
				false,
				false,
				$callback
			);
			
			$timeout_count = 0;
			while(!$response){
				try{
					//$this->rabbitmq_channel->wait(null, false, 100);
					$this->rabbitmq_channel->wait();
				}
				catch(Exception $e){
					$timeout_count++;
					if($timeout_count == 3){
						throw $e;
					}
				}
			}
			
			return $response;
		}
		catch(Exception $e){
			throw $e;
		}
	}
	
	private function closeRabbitmq(){
		try{
			$this->rabbitmq_channel->close();
			$this->rabbitmq_connection->close();
		}
		catch(Exception $e){
			throw $e;
		}
	}
}

?>
