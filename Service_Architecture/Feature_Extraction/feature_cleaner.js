/*
SYNOPSIS: node feature_cleaner.js [OPTION]
DESCRIPTION:
	[INPUT_PATH]
	[OUTPUT_NAME]
*/
var fs = require('fs');
process.chdir("/home/danny/public_html/Counterfeit_Website_Classifier/Feature_Extraction");
console.log(process.cwd());

const INTEGER = 0;
const FLOAT = 1;
const BOOLEAN = 2;
const CATEGORICAL = 3;
const STRING = 4;

var Feature_Cleaner = function(file_path){
	try{
		if(fs.existsSync(file_path)){
			var content_json = JSON.parse(fs.readFileSync(file_path, 'utf8'));
			this.label = content_json["label"];
			this.features = content_json["features"];
			this.fields = {
				url: STRING,
				hostname: STRING,
				length_of_fqdn: INTEGER,
				replica_in_fqdn: BOOLEAN,
				in_top_one_million: BOOLEAN,
				num_of_currencies_seen: INTEGER,
				num_of_duplicate_prices_seen: INTEGER,
				percent_savings: FLOAT,
				contain_emails: BOOLEAN,
				large_iframes: BOOLEAN,
				china_registered: BOOLEAN,
				under_a_year: BOOLEAN
			}
			this.missing_value_statistics = {};
		}
		else{
			throw new Error("file doesn't exist");
		}
	}
	catch(e){
		console.log("[Constructor] "+e.message);
		process.exit();
	}
}

function isMissing(feature_value){
	if(feature_value == undefined || feature_value == null || feature_value == NaN){
		return true;
	}
	return false;
}

Feature_Cleaner.prototype.showStatistics = function(){
	this.missing_value_statistics = new Object();
	var statistics = this.missing_value_statistics;
	var num_of_records = this.features.length;
	
	for(var key in this.fields){
		statistics[key] = 0;
	}
	
	this.features.forEach(function(element){
		for(var key in statistics){
			statistics[key]+=(isMissing(element[key]))?1:0;
		}
	});
	
	console.log("-----[Missing Value Statistics]-----");
	for(var key in statistics){
		var missing_percentage = (100*statistics[key]/num_of_records).toFixed(2);
		console.log(key+": "+statistics[key]+"/"+num_of_records+"("+missing_percentage+"%)");
	}
}

Feature_Cleaner.prototype.fillMissingNumerical = function(feature_name){
	try{
		if(this.fields[feature_name] == INTEGER || this.fields[feature_name] == FLOAT){
			var sum_and_num = this.features.reduce(function(return_object, array_element){
				if(!isMissing(array_element[feature_name])){
					return_object.sum+=array_element[feature_name];
					return_object.num+=1;
				}
				
				return return_object;
			}, {sum:0, num:0});
			
			var mean = sum_and_num.sum/sum_and_num.num;
			
			this.features.map(function(array_element){
				if(isMissing(array_element[feature_name])){
					array_element[feature_name] = mean;
				}
				return array_element;
			});
			
			console.log("-----[Fill Missing Numerical]-----");
			console.log("'"+feature_name+"'"+" filled by mean: " + mean);
		}
		else{
			throw new Error("feature is not type 'INTEGER' or 'FLOAT'");
		}
	}
	catch(e){
		console.log("[Fill Missing Numerical] "+e.message);
		process.exit();
	}
}

Feature_Cleaner.prototype.fillMissingBoolean = function(feature_name){
	try{
		if(this.fields[feature_name] == BOOLEAN){
			var feature_name_dummy = feature_name+"_dummy";
			this.fields[feature_name_dummy] = BOOLEAN;
			
			this.features.map(function(val){
				if(isMissing(val[feature_name])){
					val[feature_name] = false;
					val[feature_name_dummy] = true;
				}
				else{
					val[feature_name_dummy] = false;
				}
				
				return val;
			});
			
			console.log("-----[Fill Missing Boolean]-----");
			console.log("add field '"+feature_name_dummy+"'");
		}
		else{
			throw new Error("feature is not type 'BOOLEAN'");
		}
	}
	catch(e){
		console.log("[Fill Missing Boolean] "+e.message);
		process.exit();
	}
}

Feature_Cleaner.prototype.fillMissingCategorical = function(feature_name){
	try{
		if(this.fields[feature_name] == CATEGORICAL){
			
		}
		else{
			throw new Error("Type is not categorical");
		}
	}
	catch(e){
		console.log("[Fill Missing Categorical] " + e.message);
		process.exit();
	}
}

Feature_Cleaner.prototype.fillByDeleting = function(feature_name){
	try{
		var keys = Object.keys(this.fields);
		var num_of_ori = this.features.length;
		var report = "'"+feature_name+"'";
		
		this.features = this.features.filter(function(array_element){
			var no_undefined_value = true;
			for(var i = 0; i < keys.length; i++){
				if(isMissing(array_element[keys[i]])){
					no_undefined_value = false;
				}
			}
			return no_undefined_value;
		});
		
		console.log("-----[Fill By Deleting]-----");
		report+=(" got "+(num_of_ori-this.features.length).toString()+" records removed");
		report+=(" and "+this.features.length+" records retained")
		console.log(report);
	}
	catch(e){
		console.log("[Fill By Deleting] "+e.message);
		process.exit();
	}
}

Feature_Cleaner.prototype.fillMissingValues = function(test=false, output_name){
	try{
		this.showStatistics();
		var statistics = this.missing_value_statistics;
		var filling_order = Object.keys(statistics).sort(function(a,b){
			return statistics[b]-statistics[a];
		});
		console.log(filling_order);
		
		for(var i = 0; i < filling_order.length; i++){
			var missing_percentage = 100*statistics[filling_order[i]]/this.features.length;
			
			if(missing_percentage == 0){}
			else if(missing_percentage < 1){
				this.fillByDeleting(filling_order[i]);
				this.showStatistics();
				statistics = this.missing_value_statistics;
			}
			else{
				if(this.fields[filling_order[i]] == BOOLEAN){
					this.fillMissingBoolean(filling_order[i]);
				}
				else{
					this.fillMissingNumerical(filling_order[i]);
				}
				this.showStatistics();
				statistics = this.missing_value_statistics;
			}
		}
		
		/*this.fillMissingNumerical("percent_savings");
		this.fillMissingBoolean("under_a_year");
		this.fillMissingBoolean("china_registered");
		this.fillByDeleting("num_of_currencies_seen");*/
		
		if(!test){
			//this.writeJSON(output_name);
			this.writeCSV(output_name);
		}
	}
	catch(e){
		console.log("[Fill Missing Values] "+e.message);
		process.exit();
	}
}

Feature_Cleaner.prototype.writeCSV = function(file_name = 'feature_clean'){
	try{
		var file_path = process.cwd()+'/Output/'+file_name+'.csv';
		var fields = 'label,';
		for(var key in this.fields){
			fields+=(key+',');
		}
		fields = fields.slice(0,-1)+"\n";
		
		if(fs.existsSync(file_path)){
			var old_file_path = file_path.replace('.csv', '.old.csv');
			fs.renameSync(file_path, old_file_path);
		}
		fs.writeFileSync(file_path, fields);
		
		for(var i = 0; i < this.features.length; i++){ 
			var record = this.label.toString()+',';
			for(var key in this.fields){
				if(this.fields[key] == BOOLEAN){
					record+=(Number(this.features[i][key])+',');
				}
				else{
					record+=(this.features[i][key]+',');
				}
			}
			record = record.slice(0,-1)+"\n";
			fs.appendFileSync(file_path, record);
		}
		
		console.log("-----[Write CSV]-----");
		console.log("write to '"+file_path+"'");
	}
	catch(e){
		console.log("[Write CSV] "+e.message);
		process.exit();
	}
}

Feature_Cleaner.prototype.writeJSON = function(file_name = 'feature_clean'){
	try{
		var file_path = process.cwd()+'/Output/'+file_name+'.json';
		var dataset = {features: this.features, label: this.label};
		
		if(fs.existsSync(file_path)){
			var old_file_path = file_path.replace('.json', '.old.json');
			fs.renameSync(file_path, old_file_path);
		}
		
		fs.writeFileSync(file_path, JSON.stringify(dataset));
		
		console.log("-----[Write JSON]-----");
		console.log("write to '"+file_path+"'");
	}
	catch(e){
		console.log("[Write JSON] "+e.message);
		process.exit();
	}
}

Feature_Cleaner.prototype.tail = function(times = 5){
	try{
		var last = this.features.length-1;
		
		for(var i = 0; i < times; i++){
			console.log(JSON.stringify(this.features[last-i]));
		}
	}
	catch(e){
		console.log("[Tail] "+e.message);
	}
}

var input_path = process.argv[2] || './Output/feature_dirty.json';
var output_name = process.argv[3] || 'feature_clean';
var cleaner = new Feature_Cleaner(input_path);
//cleaner.showStatistics();
cleaner.fillMissingValues(false, output_name);
//cleaner.showStatistics();
