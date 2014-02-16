// web.js
var express = require("express");
var logfmt = require("logfmt");
var app = express();
var port = Number(process.env.PORT || 5000);
var WebSocketServer = require('ws').Server
	, http = require('http');
var rooms = {};
var users = {};

app.use(logfmt.requestLogger());
app.use(express.static(__dirname + '/'));

/** 
 * user's prototype class
 */
function user(){
	var socket;
	this.name;
	this.room;
	this.logined;
	function setSocket(nSocket){
		if(nSocket == null) return;
		socket = nSocket;
		logined = true;
	}
	function getSocket(){
		return socket;
	}
}

var roomNames = [
	"b/",
	"irc",
	"Mofongo"
];

for(var i=1;i<=20;i++){
	var room = {
		"maxSize":10,
		"name":roomNames[(i-1)%roomNames.length]+Math.floor(((i-1)/roomNames.length)),
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
		debugger;
		var room = req.body.room;
		var username = req.body.name;
		var roomObj = rooms[room];
		if(roomObj){
			if(roomObj.users.length<roomObj.maxSize){
				var userObject = new user()
				user.name = username;
				user.room = roomObj;
				roomObj.users.push(userObject);
				roomObj.users[username] = userObject;
				users[username] = userObject;
				res.send(JSON.stringify(
				{
					"room":"Exists",
					"name":room,
					"numUsers": rooms[room].users.length,
					"registeredAs":username,
					"success": true
				}));
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
			var userObj = roomObj.users[username];
			if(userObj){
				roomObj.users[username] = null
				users[username] = null;
				roomObj.users.splice(roomObj.users.indexOf(userObj),1); // remove user
				
				res.send(JSON.stringify(
				{
					"room":"Exists",
					"name":room,
					"users": roomObj.users.length,
					"success": true,
					"user":username,
					"userList":roomObj.users
				}));
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
		try{
			console.log("Messaged received"+message);
			var messageObj = JSON.parse(message);
			var user = users[messageObj.name];
			if(user){
				if(!user.logined){
					user.logined = true;
					user.setSocket(ws);
				} else {
					var roomObj = user.room;
					for(user in roomObj.users){
						user.getSocket().send(
							message
						,function(){});
					}
				}
			} else {
				ws.send(JSON.stringigy({
					"success":false,
					"description":"User not registered"
				}));
			}
			
		} catch(exeception){
			ws.send(JSON.stringigy({
				"success":false,
				"description":"Malformed JSON!"
			}));
		}
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