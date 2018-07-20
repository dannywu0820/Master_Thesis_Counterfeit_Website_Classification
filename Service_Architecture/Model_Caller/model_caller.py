import sys
import json
import pickle
import numpy as np
import traceback
from collections import OrderedDict

class Model:
	def __init__(self, file_path):
		self.model = None
		with open(file_path, 'rb') as f:
			self.model = pickle.load(f)

class Scaler(Model):
	def __init__(self, file_path):
		super(Scaler, self).__init__(file_path)
	
	def getFeatureArray(self, feature_json_str):
		feature_json = json.loads(feature_json_str)
		order = [
			"length_of_fqdn",
			"num_of_duplicate_prices_seen",
			"percent_savings",
			"under_a_year",
			"under_a_year_dummy",
			"has_mobile_app",
			"has_social_media",
			"node_counts",
			"dom_height"
		]
		one_sample = []
		for feature_name in order:
			one_sample.append(feature_json[feature_name])
		
		return one_sample 
	
	def scaleFeature(self, sample_list):
		try:
			self.model.partial_fit(sample_list)
			scaled_sample_list = self.model.transform(sample_list)
			#print(self.model.data_max_)
			#print(self.model.data_min_)
			return scaled_sample_list
		except:
			traceback.print_exc()
	
class Classifier(Model):
	def __init__(self, file_path):
		super(Classifier, self).__init__(file_path)
		
	def predictLabelAndProba(self, sample_list):
		try:
			label = self.model.predict(sample_list)[0]
			label = np.asscalar(label)
			proba = self.model.predict_proba(sample_list)[0][1]
			proba = np.asscalar(proba)
			
			return {
				'label': label,
				'probability': proba
			}
		except:
			traceback.print_exc()

if __name__ == "__main__":
	#current directory is Service_Architecture
	model_path = './model/'
	file_names = ['MinMaxScaler.sav', 'LR.sav', 'DT.sav', 'SVM.sav']
	models = [
		{
			'file': 'MinMaxScaler.sav',
			'model': None
		},
		{
			'file': 'LR.sav',
			'model': None
		},
		{
			'file': 'DT.sav',
			'model': None
		},
		{
			'file': 'SVM.sav',
			'model': None
		}
	]
	
	for i in range(0, len(models)):
		file_path = model_path+models[i]["file"]
		models[i]["model"] = Scaler(file_path) if i == 0 else Classifier(file_path)
	
	test_json_str = [
		'{"length_of_fqdn":11,"num_of_duplicate_prices_seen":5,"percent_savings":1,"has_mobile_app":true,"has_social_media":true,"node_counts":972,"dom_height":18,"under_a_year":0,"under_a_year_dummy":0}',
		'{"length_of_fqdn":9,"num_of_duplicate_prices_seen":1,"percent_savings":0.6302334197851056,"has_mobile_app":false,"has_social_media":false,"node_counts":696,"dom_height":12,"under_a_year":1,"under_a_year_dummy":0}'
	]
	
	feature_json_str = sys.argv[1] if len(sys.argv) > 1 else test_json_str[0]
	scaler = models[0]["model"]
	one_sample = scaler.getFeatureArray(feature_json_str)
	scaled_sample = scaler.scaleFeature([one_sample])[0]
	#print(scaled_sample)
	
	final_prediction = {
		"label": 0,
		"probability": 0
	}
	for i in range(1, len(models)):
		models[i]["prediction"] = models[i]["model"].predictLabelAndProba([scaled_sample])
		final_prediction["probability"] = final_prediction["probability"]+models[i]["prediction"]["label"]
		#final_prediction["probability"] = final_prediction["probability"]+models[i]["prediction"]["probability"]
	#print(models)
		
	final_prediction["probability"] = final_prediction["probability"]/(len(models)-1)
	final_prediction["label"] = 1 if final_prediction["probability"] >= 0.5 else 0
	print('<here>' + json.dumps(final_prediction) + '</here>')
		
	