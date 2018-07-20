<?php
class Website extends MysqlEntity{
	public static function addNewWebsite($url){
		try{
			$website_record = self::create(array(
				"url" => $url,
				"status" => "backend: processing"
			));
			$website_record->save();
			$websiteID = $website_record->toArray()["websiteID"];
			
			return $websiteID;
		}
		catch(Exception $e){
			throw $e;
		}
	}
	
	public static function getWebsite($url){
		try{
			$query_parameters = [
				'select' => [ '*' ],
				'from' => [ 'Website' ],
				'condition' => [
					['url = ?', $url]
					//['url = ?', $url]
				]
			];
			$result = self::findOne($query_parameters);
			
			if(is_null($result)){
				return $result;
			}
			return $result->toArray();
		}
		catch(Exception $e){
			throw $e;
		}
	}
	
	public static function updateStatus($websiteID, $phase, $state){
		try{
			$status = $phase.": ".$state;
			$website_record = self::create(array(
				"websiteID" => $websiteID,
				"status" => $status
			));
			$website_record->update();
			
			return $website_record;
		}
		catch(Exception $e){
			throw $e;
		}
	}
	
	public static function updateFeedback($websiteID, $feedback){
		try{
			$query_parameters = [
				'select' => [ 'feedback_yes', 'feedback_no' ],
				'from' => [ 'Website' ],
				'condition' => [
					['websiteID = ?', $websiteID]
				]
			];
			$statistic = self::findOne($query_parameters)->toArray();
			$statistic[("feedback_".strtolower($feedback))] += 1;
			
			$website_record = self::create(array(
				"websiteID" => $websiteID,
				"feedback" => $feedback,
				"feedback_yes" => $statistic["feedback_yes"],
				"feedback_no" => $statistic["feedback_no"]
			));
			$website_record->update();
			
			return $website_record;
		}
		catch(Exception $e){
			throw $e;
		}
	}
	
	public static function updateFeature($websiteID, $new_feature){
		try{
			$new_feature_json = json_decode($new_feature, true);
			$ary = array(
				"websiteID" => $websiteID,
				"feature" => $new_feature
			);
			foreach($new_feature_json as $key => $value){
				$ary[$key] = $value;
			};
			
			$website_record = self::create($ary);
			$website_record->update();
			
			return $website_record;
		}
		catch(Exception $e){
			throw $e;
		}
	}
}

?>