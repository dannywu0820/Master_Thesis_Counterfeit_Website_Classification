const mysql = require('mysql');
const mysqlUtility = function(){
	let config = {
		host: 'localhost',
		user: 'danny',
		password: 'livebetterlife',
		database: 'auto_sql_tool',
		multipleStatements: true
	};
	let connection = null;
	let ready = false;
	
	function connect(){
		let connection = mysql.createConnection(config);
		
		return new Promise(function(resolve, reject){
			connection.connect(function(err){
				if(err){
					reject({error: err, name: "connect"})
				}
				else{
					resolve({connection: connection});
				}
			});
		});
	}
	
	function initialize(){
		connect().then(function(json_obj){
			console.log("create mysql connection");
			ready = true;
			connection = json_obj.connection;
		}).catch(function(json_obj){
			console.log("-----[DB.js Error]-----");
			console.log("Function: " + json_obj.name);
			console.log("Message: " + json_obj.error.message);
		});
	}
	
	function isReady(){
		return ready;
	}
	
	function query(sql){
		return new Promise(function(resolve, reject){
			connection.query(sql, function(err, rows){
				if(err){
					reject({error: err});
				}
				else{
					resolve(rows);
				}
			}); 
		});
	}
	
	function find(sql_parameters){
		let sql = '';
		sql += 'SELECT ' + sql_parameters.fields.toString() + ' ';
		sql += 'FROM ' + sql_parameters.table + ' ';
		if(sql_parameters.condition){
			sql += 'WHERE ' + sql_parameters.condition;
		}
		
		return query(sql);
	}
	
	function save(sql_parameters){
		//first field should be primary key
		let table = sql_parameters.table;
		let fields = sql_parameters.fields;
		let values = sql_parameters.values;
		let sql = '';
		sql += 'INSERT INTO ' + table + ' ';
		sql += '(' + fields.toString() + ') ';
		sql += 'VALUES (' + values.toString() + ') ';
		sql += 'ON DUPLICATE KEY UPDATE ';
		for(let i = 1; i < sql_parameters.fields.length; i++){
			sql += fields[i] + ' = ' + values[i];
			if(i != sql_parameters.fields.length-1){
				sql += ',';
			}
		}
		//console.log(sql);
		
		return query(sql);
	}
	
	function close(){
		connection.end();
	}
	
	return {
		initialize: function(){
			initialize();
		},
		isReady: function(){
			return isReady();
		},
		query: function(sql){
			return query(sql);
		},
		find: function(sql_parameters){
			return find(sql_parameters);
		},
		save: function(sql_parameters){
			return save(sql_parameters);
		}
	}
}

module.exports = mysqlUtility();