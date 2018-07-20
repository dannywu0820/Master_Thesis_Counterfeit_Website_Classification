const mysql = require('mysql');

main();

function main(){
	connectToMysql().then(function(resolve_argv){
		let conn = resolve_argv.connection;
		let sql = makeSelectQuery(['username'], 'Users', 'usersID=76'); //"SELECT * FROM Users WHERE usersID=76";
		console.log(sql);
		return query(conn, sql);
	}).then(function(resolve_argv){
		let conn = resolve_argv.connection;
		let username = resolve_argv.rows[0]["username"];
		let sql = makeSelectQuery(['*'], 'Commands', 'username=\"'+username+'\"');
		return query(conn, sql);
	}).then(function(resolve_argv){
		let conn = resolve_argv.connection;
		conn.end();
		console.log(resolve_argv.rows);
	}).catch(failureCallback);
}

function failureCallback(reject_argv){
	if(reject_argv.error){
		console.log(reject_argv.error.message);
	}
	
	if(reject_argv.connection){
		reject_argv.connection.end();
	}
}

function connectToMysql(){
	let config = {
		host: 'localhost',
		user: 'danny',
		password: 'livebetterlife',
		database: 'auto_sql_tool',
		multipleStatements: true
	};
	let connection = null; 
	connection = mysql.createConnection(config);
	if(!connection){
		let err = new Error("[connectToMysql]: createConnection failure");
		return Promise.reject({error: err}); //static function, Promise.resolve
	}
	
	let promise_obj = new Promise(function(resolve, reject){
		connection.connect(function(err){
			if(err){
				reject({error: err});
			}
			else{
				resolve({connection: connection});
			}
		});
	});
	return promise_obj;
}

function query(connection, sql){
	return new Promise(function(resolve, reject){
		connection.query(sql, function(err, rows){
			if(err){
				reject({error: err, connection: connection});
			}
			else{
				resolve({rows: rows, connection: connection});
			}
		})
	});
}

function makeSelectQuery(fields, table, condition){
	let sql = 'SELECT ';
	for(let i=0; i < fields.length; i++){
		sql+=fields[i];
		if(i != fields.length-1){
			sql+=',';
		}
		sql+=' ';
	}
	
	sql+=('FROM '+table+' ');
	
	if(condition){
		sql+=('WHERE '+condition)
	}
	
	return sql;
}