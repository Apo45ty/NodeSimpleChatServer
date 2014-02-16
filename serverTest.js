// web.js
var express = require("express");
var logfmt = require("logfmt");
var app = express();
var port = Number(process.env.PORT || 5000);
var WebSocketServer = require('ws').Server
	, http = require('http');
var rooms = {};
var usersNotconnected = [];

app.use(logfmt.requestLogger());
app.use(express.static(__dirname + '/'));

/** 
 * user's prototype class
 */
function user(){
	var socket;
	this.name;
	this.room;
	function setSocket(nSocket){
		socket = nSocket;
	}
	function getSocket(){
		return socket;
	}
}

for(var i=1;i<=20;i++){
	var room = {
		"maxSize":10,
		"name":""+i,
		"users":new Array()
	}
	rooms[i+""]=room;
}

app.get('/chat/checkRoom', function(req, res){
		var room =req.query.room;
		debugger;
		res.send(JSON.stringify(
		{
			"room":
				(rooms[room] ?
				(rooms[room].name == room ? "Exists":"hasErrors")
				:"DoesNotExist."),
			"name":room,
			"numUsers":
				(rooms[room] ? 
				rooms[room].users.length:
				0),
			"success": (rooms[room] ? rooms[room].users.length <= rooms[room].maxSize:false)
		}));
});

app.post('/chat/registerRoom', function(req, res){
		var room = req.body.room;
		var name = req.body.name;
		var roomObj = rooms[room];
		if(roomObj){
			if(roomObj.users.length<roomObj.maxSize){
				var userObject = new user()
				user.name = name;
				user.push(name);
				user.room = roomObj;
				roomObj.users.push(user);
				//do web socket stuff
			} else {
				res.send(JSON.stringify(
				{
					"room":"Exists",
					"name":room,
					"numUsers": rooms[room].users.length,
					"success": false
				}));
			}
		}
		
});

app.post('/chat/unregisterRoom', function(req, res){
		var room = req.body.room;
		var username = req.body.username;
		var roomObj = rooms[room];
		if(roomObj){
			if(roomObj.users.length<roomObj.maxSize){
				var userObj = roomObj.users[username];
				roomObj.users.splice(roomObj.users.indexOf(userObj),1); // remove user
				//do web socket stuff
			} else {
				res.send(JSON.stringify(
				{
					"room":"Exists",
					"name":room,
					"users": roomObj.users.length,
					"success": false,
					"user":username,
					"userList":roomObj.users
				}));
			}
		}
});

app.get('/chat', function(req, res){
	res.send(JSON.stringify(rooms));
});

var server = http.createServer(app);
server.listen(port);

console.log('http server listening on %d', port);

var wss = new WebSocketServer({server: server});
console.log('websocket server created');



wss.on('connection', function(ws) {
	//wait for user name 
	ws.on('message',function(message){
		var messageObj = JSON.parse(message);
	});
    var id = setInterval(function() {
        ws.send(JSON.stringify(new Date()), function() { });
    }, 1000);

    console.log('websocket connection open');

    ws.on('close', function() {
        console.log('websocket connection close');
        clearInterval(id);
    });
});