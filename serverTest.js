// web.js
var express = require("express");
var logfmt = require("logfmt");
var app = express();
var port = Number(process.env.PORT || 5001);
var WebSocketServer = require('ws').Server
	, http = require('http');
var rooms = {};
var users = [];
var appVer = "v1"; // app version
app.use(logfmt.requestLogger());
app.use(express.static(__dirname + '/'));
app.use(express.bodyParser()); // parse POST request bodies

/** 
 * user's prototype class
 */
function User(){
	var socket;
	this.name;
	var room;
	this.logined;
	this.setSocket = function (nSocket){
		if(nSocket == null) return;
		socket = nSocket;
		logined = true;
	}
	this.getSocket=function(){
		return socket;
	}
	this.setRoom=function(newRoom){
		room = newRoom;
	}
	this.getRoom= function(){
		return room;
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
	rooms[room.name]=room;
}

app.get("/"+appVer+'/chat/checkRoom', function(req, res){
		var room =req.query.room;
		if(room.length > 10){
			room = room.substring(0,10);
		}
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

app.post("/"+appVer+'/chat/registerUser', function(req, res){
		debugger;
		var room = req.body.room;
		var username = req.body.name;
		
		//Check the input to be clean
		if(room.length > 10){
			room = room.substring(0,10);
		}
		
		//Check the input to be clean
		if(username.length > 10){
			username = username.substring(0,10);
		}
		
		var roomObj = rooms[room];
		if(roomObj){
			if(roomObj.users.length<roomObj.maxSize){
				if(username){
					if(!users[username]){//username is unique
						var userObject = new User();
						userObject.name = username;
						userObject.setRoom(roomObj);
						
						roomObj.users.push(userObject);
						roomObj.users[username] = userObject;
						users[username] = userObject;
						users.push(userObject);
						res.send(JSON.stringify(
						{
							"room":"Exists",
							"name":room,
							"numUsers": roomObj.users.length,
							"description":"registered as "+username,
							"success": true
						}));
					} else {
					res.send(JSON.stringify(
					{
						"room":"Exists",
						"name":room,
						"numUsers": roomObj.users.length,
						"description":"Username in use, user can't be registered.",
						"success": false
					}));
					}
				} else {
					res.send(JSON.stringify(
					{
						"room":"Exists",
						"name":room,
						"numUsers": roomObj.users.length,
						"description":"No username, user can't be registered.",
						"success": false
					}));
				}
			} else {
				res.send(JSON.stringify(
				{
					"room":"DoesNotExist.",
					"name":room,
					"numUsers": roomObj.users.length,
					"success": false
				}));
			}
		}
		
});

app.post("/"+appVer+'/chat/unregisterUser', function(req, res){
		debugger;
		var room = req.body.room;
		var username = req.body.name;
		
		//Check the input to be clean
		if(room.length > 10){
			room = room.substring(0,10);
		}
		
		//Check the input to be clean
		if(username.length > 10){
			username = username.substring(0,10);
		}
		
		var roomObj = rooms[room];
		if(roomObj){
			var userObj = roomObj.users[username];
			if(userObj){
				userObj.logined = false; // really dont matter
				roomObj.users[username] = null
				users[username] = null;
				users.splice(roomObj.users.indexOf(userObj),1);
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

app.get("/"+appVer+'/chat', function(req, res){
	res.send(JSON.stringify(rooms));
});

var server = http.createServer(app);
server.listen(port);

console.log('http server listening on %d', port);

var wss = new WebSocketServer({server: server});
console.log('websocket server created');

wss.broadcast = function(roomObj,user,message){
	debugger;
	for(var i=0;i<roomObj.users.length;i++){
		var tUser = users[i];
		if(user == tUser) continue; // don't send it to himself
		tUser.getSocket().send(
			message
		,function(){});
	}
}

wss.on('connection', function(ws) {
	//wait for user name 
	debugger;
	var closeRefs = {};
	ws.on('close', function() {
		debugger;
		try{
			wss.broadcast(closeRefs.roomObj,closeRefs.user,JSON.stringify({
				"name":closeRefs.user.name,
				"left":true
			}),function(){});
			console.log('Closed socket:' + closeRefs.user);
		}catch(exception){
			console.log("Someone disconnected"+exception);
		}
	});
	ws.on('message',function(message){
		debugger;
		console.log("message send "+message);
		try{
			console.log("Messaged received"+message);
			var messageObj = JSON.parse(message);
			var user = users[messageObj.name];
			if(user){
				var roomObj = user.getRoom();
				
				if(!user.logined){
					console.log("User "+messageObj.name+" connected.")
					user.logined = true;
					user.setSocket(ws);
					messageObj['loggedIn'] = true;
					wss.broadcast(roomObj,user,JSON.stringify(messageObj));
					closeRefs.roomObj = roomObj;
					closeRefs.user = user;
				} else {
				
					wss.broadcast(roomObj,user,message);
				}
				
				//Acknowledge user message received
				if(messageObj.acknowledge){
					user.getSocket().send(JSON.stringify({
						"success":true,
						"acknowledgement":true
					}));
				}
			} else {
				ws.send(JSON.stringify({
					"success":false,
					"description":"User not registered."
				}));
				ws.close();
			}
			
		} catch(exception){
			ws.send(JSON.stringify({
				"success":false,
				"description":"Malformed JSON!"+exception
			}));
			ws.close();
		}
	});

    console.log('Connection Detected');
});