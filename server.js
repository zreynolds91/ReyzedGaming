var express = require('express');
var path = require('path');
var app = express();
var serv = require('http').Server(app);

app.get('/', function(req, res) {
	res.sendFile(path.join(__dirname, '/client/index.html'));
});
app.use('/client', express.static(path.join(__dirname, '/client')));

serv.listen(3000);
console.log("Server started.");

var SOCKET_LIST = {};
var LEFT = "left";
var RIGHT = "right";
var UP = "up";
var DOWN = "down";
var ATTACK = "attack";

var createArray = function(length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = createArray.apply(this, args);
    }

    return arr;
}

var Entity = function(){
	var self = {
		x:250,
		y:250,
		spdX:0,
		spdY:0,
		id:"",
	}
	self.update = function(){
		self.updatePosition();
	}
	self.updatePosition = function() {
		self.x += self.spdX;
		self.y += self.spdY;
	}
	return self;
}



var Map = function(size) {
	var self = Entity();
	self.grid = 
	[[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
	[1, 3, 3, 3, 3, 3, 3, 3, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1],
	[1, 3, 3, 3, 3, 3, 3, 3, 1, 3, 1, 1, 1, 1, 1, 1, 1, 3, 1],
	[1, 3, 3, 3, 3, 3, 3, 3, 1, 3, 1, 3, 3, 3, 3, 3, 1, 3, 1],
	[1, 3, 3, 3, 3, 3, 3, 3, 1, 3, 1, 3, 3, 3, 3, 3, 1, 3, 1],
	[1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 3, 3, 3, 3, 3, 1, 3, 1],
	[1, 3, 1, 3, 3, 3, 1, 1, 1, 3, 1, 1, 1, 3, 3, 3, 1, 3, 1],
	[1, 3, 1, 3, 3, 3, 1, 3, 3, 3, 1, 1, 1, 3, 3, 3, 1, 3, 1],
	[1, 3, 1, 1, 1, 1, 1, 1, 1, 3, 1, 1, 1, 3, 3, 3, 1, 3, 1],
	[1, 3, 3, 3, 3, 3, 1, 3, 3, 3, 1, 3, 3, 3, 3, 3, 1, 3, 1],
	[1, 3, 3, 3, 3, 3, 1, 1, 1, 3, 1, 3, 3, 3, 3, 3, 1, 3, 1],
	[1, 3, 3, 3, 3, 3, 3, 3, 1, 3, 1, 3, 3, 3, 3, 3, 1, 3, 1],
	[1, 3, 3, 3, 3, 3, 3, 3, 1, 3, 1, 3, 3, 3, 3, 3, 1, 3, 1],
	[1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 3, 3, 3, 3, 3, 1, 3, 1],
	[1, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 1, 1, 1, 3, 1],
	[1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1],
	[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]];
	self.height = self.grid.length;
	self.width = self.grid[0].length;
	
	return self;
}

var Player = function(id){
	var self = Entity();
	self.x = 64;
	self.y = 64;
	self.id = id;
	self.number = "" + Math.floor(10*Math.random());
	self.name = "Player";
	self.pressingRight = false;
	self.pressingLeft = false;
	self.pressingUp = false;
	self.pressingDown = false;
	self.maxSpeed = 5;
	self.hp = 10;
	self.hpMax = 10;
	self.score = 0;
	self.facing = "";
	self.attacking = false;
	self.shouldAttack = false;
	self.attackAnimation = 0;
	self.map = Map(0);
	self.playerMap = createArray(9,9);
	
	var super_update = self.update;
	
	self.update = function() {
		self.updateSpd();
		self.updateFacing();
		self.updateAttacking();
		super_update();
	}
	
	//TODO: Update to only show the portion of the map that actually gets displayed.
	self.updateMap = function() {
		/*var playerX = self.x / 64;
		var playerY = self.y / 64;
		var playerMapDimension = 9;
		
		for(var x = 0; x < self.map.grid.width; x++) {
			for(var y = 0; y < self.map.grid.height; y++) {
				if( playerX-4+x > 0 && playerX-4+x < self.map.grid.width
						&& playerY-4+y > 0 && playerY-4+y < self.map.grid.height) {
					self.playerMap[x][y] = self.map.grid[playerX-4+x][playerY-4+y];
				}
				else {
					self.playerMap[x][y] = 0;
				}
			}
		}*/
		self.playerMap = self.map.grid;
	}
	
	self .updateAttacking = function() {
		if(self.attacking && 0 >= self.attackAnimation) {
			self.shouldAttack = true;
			self.attackAnimation = 10;
			self.attacking = false;
		}
		else {
			if(0 >= self.attackAnimation) {
				self.shouldAttack = false;
			}
			else if (5 <= self.attackAnimation) {
				self.shouldAttack = true;
				self.attackAnimation--;
			}
			else if (0 < self.attackAnimation) {
				self.attackAnimation--;
				self.shouldAttack = false;
			}
			else {
				self.attackAnimation = 0;
				self.shouldAttack = false;
			}
		}
	}
	
	self.updateSpd = function(){
		self.spdX = 0;
		self.spdY = 0;

		if(self.pressingRight) {
			if(self.map.grid[Math.floor((self.x + self.maxSpeed + 32)/64)][Math.floor(self.y/64)] == 3) {
				self.spdX += self.maxSpeed;
			}
		}
		if(self.pressingLeft) {
			if(self.map.grid[Math.floor((self.x - self.maxSpeed - 32)/64)][Math.floor(self.y/64)] == 3) {
				self.spdX -= self.maxSpeed;
			}
		}
		if(self.pressingUp) {
			if(self.map.grid[Math.floor(self.x/64)][Math.floor((self.y - self.maxSpeed - 32)/64)] == 3) {
				self.spdY -= self.maxSpeed;
			}
		}
		if(self.pressingDown) {
			if(self.map.grid[Math.floor(self.x/64)][Math.floor((self.y + self.maxSpeed + 32)/64)] == 3) {
				self.spdY += self.maxSpeed;
			}
		}
	}
	
	self.getInitPack = function() {
		self.updateMap();
		return {
		id:self.id,
		x:self.x,
		y:self.y,
		number:self.number,
		name:self.name,
		hp:self.hp = 10,
		hpMax:self.hpMax = 10,
		score:self.score = 0,
		map:self.playerMap,
		};
	}
	
	self.updateFacing = function() {
		if (self.pressingRight && !self.pressingLeft) {
			self.facing = RIGHT;
		}
		else if (self.pressingLeft && !self.pressingRight) {
			self.facing = LEFT;
		}
		else if (self.pressingUp && !self.pressingDown) {
			self.facing = UP;
		}
		else if (self.pressingDown && !self.pressingUp) {
			self.facing = DOWN;
		}
	}
	
	self.getUpdatePack = function() {
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			name:self.name+self.number,
			hp:self.hp,
			score:self.score,
			facing:self.facing,
			attacking:self.shouldAttack,
			map:self.playerMap,
		}
	}
	
	Player.list[id] = self;
	
	initPack.player.push(self.getInitPack());
	return self;
}
Player.list = {};

Player.onConnect = function(socket){
	var player = Player(socket.id);
	player.attacking = false;
	socket.on('keyPress', function(data) {
		if(LEFT == data.inputId) {
			player.pressingLeft = data.state;
		}
		else if(RIGHT == data.inputId) {
			player.pressingRight = data.state;
		}
		else if(UP == data.inputId) {
			player.pressingUp = data.state;
		}
		else if(DOWN == data.inputId) {
			player.pressingDown = data.state;
		}
		if(ATTACK == data.inputId) {
			player.attacking = data.state;
		}
	});

	socket.emit('init', {
		selfId:socket.id,
		player:Player.getAllInitPack(),
	});
}

Player.getAllInitPack = function(){
	var players = [];
	for(var i in Player.list) {
		players.push(Player.list[i].getInitPack());
	}
	return players;
}

Player.onDisconnect = function(socket) {
	delete Player.list[socket.id];
	removePack.player.push(socket.id);
}

Player.update = function() {
	var pack = [];
	for(var i in Player.list) {
		var player = Player.list[i];
		player.update();
		pack.push(player.getUpdatePack());
	}
	return pack;
}

var io = require('socket.io')(serv,{});

io.sockets.on('connection', function(socket) {
	socket.id=Math.random();
	SOCKET_LIST[socket.id] = socket;
	
	Player.onConnect(socket);
	
	socket.on('disconnect', function() {
		delete SOCKET_LIST[socket.id];
		Player.onDisconnect(socket);
	});
	
	
	
});

io.sockets.on('disconnect', function(socket){
	
});

var initPack = {player:[]};
var removePack = {player:[]};

setInterval(function (){
	var pack = {
		player:Player.update(),
		
	}

	for (var i in SOCKET_LIST) {
		var socket = SOCKET_LIST[i];
		socket.emit('init',initPack);
		socket.emit('update',pack);
		socket.emit('remove',removePack);
	}
	initPack.player = [];
	removePack.player = [];
	
},1000/60);