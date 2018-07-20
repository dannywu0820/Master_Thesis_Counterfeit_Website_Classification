const mysql = require('mysql');
const config = {
		host: 'localhost',
		user: 'danny',
		password: 'livebetterlife',
		database: 'auto_sql_tool',
		multipleStatements: true
};

main();

//How to handle synchronous function
function main(){
	try{
		//throw exceptions in sync function you defined
		//catch them in a function that calls the sync function
		connectToMysql(function(err, conn){
			if(err){
				console.log(err.message);
				return;
			}
			getUsername(conn, 76, function(err, rows){
				if(err){
					console.log(err.message);
					return;
				}
				let username = rows[0]["username"];
				getCommands(conn, username, function(err, rows){
					if(err){
						console.log(err.message);
						return;
					}
					console.log(rows);
					conn.end();
				});
			});
		});
	}
	catch(error){
		console.log("[Catch Error]: "+error.message);
	}
}

//How to handle asynchronous function
function connectToMysql(callback){
	let conn = mysql.createConnection(config);
	conn.connect(function(err){
		if(err){
			callback(err, conn);
		}
		else{
			callback(null, conn);
		}
	});
}

function query(connection, sql, callback){
	connection.query(sql, function(err, rows){
		if(err){
			callback(err, rows);
		}
		else{
			callback(null, rows);
		}
	});
}

function getUsername(connection, id, callback){
	let sql = 'SELECT username FROM Users WHERE usersID='+id.toString();
	query(connection, sql, callback);
}

function getCommands(connection, username, callback){
	let sql = 'SELECT * FROM Commands WHERE username="'+username+'"';
	query(connection, sql, callback);
}