#!/usr/bin/env nodejs
/*******************************************************************
* Server Code
*******************************************************************/
var express = require('express');
var exphbs = require('express-handlebars');
var path = require('path');
var app = express();
var serv = require('http').Server(app);

app.use('/client', express.static(path.join(__dirname, '/client')));

app.get('/', function (req, res) {
   res.sendFile(path.join(__dirname, '/client/index.html'));
});

app.get('/twitch/:name', function (req, res) {
    var hbs = exphbs.create({helpers: {streamer : req.params.name,}});
    
    app.engine('handlebars', hbs.engine);
    app.set('view engine', 'handlebars');
    
    res.render('twitch-stream');
});

app.get('/beam/:name', function (req, res) {
    var hbs = exphbs.create({helpers: {streamer : req.params.name,}});
    
    app.engine('handlebars', hbs.engine);
    app.set('view engine', 'handlebars');
    
    res.render('beam-stream');
});

var server = serv.listen(8080, function () {
   var host = server.address().address;
   var port = server.address().port;

   console.log("Example app listening at http://%s:%s", host, port);

});

var io = require('socket.io').listen(server);
console.log("Server started.");

/*************************************************************************
* Game code
*************************************************************************/

var SOCKET_LIST = {};
var LEFT = "left";
var RIGHT = "right";
var UP = "up";
var DOWN = "down";
var SHOOT = "shoot";
var MOUSEANGLE = "mouseAngle";
var ROOM_SIZE_DEFAULT = 7;
var ROOM_START = "start";
var ROOM_DEAD_END = "dead";
var ROOM_PATH = "path";
var MAX_NUM_OF_PATH_ROOMS = 5;
var SCORE_LOWER_LIMIT = 10;

var createArray = function(length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while (i--) {
            arr[length-1 - i] = createArray.apply(this, args);
        }
    }

    return arr;
}

var Entity = function(param){
    var self = {
        x:250,
        y:250,
        spdX:0,
        spdY:0,
        id:"",
        streamKey:"",
        roomNum:0,
    }
    if(param) {
        if(undefined !== param.x) {
            self.x = param.x;
        }
        if(undefined !== param.y) {
            self.y = param.y;
        }
        if(undefined !== param.spdX) {
            self.spdX = param.spdX;
        }
        if(undefined !== param.spdY) {
            self.spdY = param.spdY;
        }
        if(undefined !== param.id) {
            self.id = param.id;
        }
        if(undefined !== param.streamKey) {
            self.streamKey = param.streamKey;
        }
        if(undefined !== param.roomNum) {
            self.roomNum = param.roomNum;
        }
    }
    self.update = function() {
        self.updatePosition();
    }
    self.updatePosition = function() {
        self.x += self.spdX;
        self.y += self.spdY;
    }
	self.getDistance = function(pt) {
		return Math.sqrt(Math.pow(self.x-pt.x,2) + Math.pow(self.y-pt.y,2));
	}
    return self;
}

var Room = function(param) {
    var self = Entity();
    self.height = ROOM_SIZE_DEFAULT;
    self.width = ROOM_SIZE_DEFAULT;
    self.roomType = ROOM_START;
    self.grid = [];
    self.doors = {
        up: undefined,
        down: undefined,
        left: undefined,
        right: undefined,
    };
    
    if(undefined !== param.height) {
        self.height = param.height;
    }
    if(undefined !== param.width) {
        self.width = param.width;
    }
    if(undefined !== param.roomType) {
        self.roomType = param.roomType;
        if(ROOM_START == self.roomType) {
            self.height = ROOM_SIZE_DEFAULT;
            self.width = ROOM_SIZE_DEFAULT;
        }
    }
    if(undefined !== param.parent) {
        self.parent = param.parent;
    }
    if(undefined !== param.previousRoom) {
        self.previousRoom = param.previousRoom;
        if(LEFT == self.previousRoom) {
            self.doors.left = self.parent;
        }
        else if (RIGHT == self.previousRoom) {
            self.doors.right = self.parent;
        }
        else if (UP == self.previousRoom) {
            self.doors.up = self.parent;
        }
        else if (DOWN == self.previousRoom) {
            self.doors.down = self.parent;
        }
    }
    
    /**
    * TODO: shorten this method somehow. Look at the door placement if/else statements and shorten,
    * they are all pretty much doing the same thing.
    */
    self.generateRoomGrid = function() {
        
        var hasPathDoorYet = false;
        var remainingDoors = 3;
        var isLastRoom = false;
        
        if(ROOM_DEAD_END == self.roomType || ROOM_START == self.roomType) {
            remainingDoors = 0;
        }
        else if (ROOM_PATH == self.roomType && 0 == param.roomsLeft) {
            isLastRoom = true;
        }
        
        for(var w = 0; w < self.width; w++) {
            var row = [];
            for(var h = 0; h < self.height; h++) {
                
                if(Math.floor(self.height / 2) == h && self.width - 1 == w) {
                    
                    if(RIGHT == self.previousRoom) {
                        row.push(2);
                    }
                    else if(remainingDoors > 0) {
                        if(Math.random() < 1/remainingDoors && !hasPathDoorYet) {
                            if(isLastRoom){
                                row.push(5);
                            }
                            else {
                                row.push(2);
                            }
                            hasPathDoorYet = true;
                            remainingDoors--;
                        }
                        else {
                            row.push(0);
                            remainingDoors--;
                        }
                    }
                    else {
                        row.push(1);
                    }
                }
                else if (Math.floor(self.height / 2) == h && 0 == w) {
                    
                    if (LEFT == self.previousRoom) {
                        row.push(2);
                    }
                    else if(remainingDoors > 0) {
                        if(Math.random() < 1/remainingDoors && !hasPathDoorYet) {
                            if(isLastRoom){
                                row.push(5);
                            }
                            else {
                                row.push(2);
                            }
                            hasPathDoorYet = true;
                            remainingDoors--;
                        }
                        else {
                            row.push(0);
                            remainingDoors--;
                        }
                    }
                    else {
                        row.push(1);
                    }
                }
                else if(Math.floor(self.width / 2) == w  && self.height - 1 == h) {
                    
                    if (DOWN == self.previousRoom) {
                        row.push(2);
                    }
                    else if(remainingDoors > 0) {
                        if(Math.random() < 1/remainingDoors && !hasPathDoorYet) {
                            if(isLastRoom){
                                row.push(5);
                            }
                            else {
                                row.push(2);
                            }
                            hasPathDoorYet = true;
                            remainingDoors--;
                        }
                        else {
                            row.push(0);
                            remainingDoors--;
                        }
                    }
                    else {
                        row.push(1);
                    }
                }
                else if (Math.floor(self.width / 2) == w  && 0 == h) {
                    
                    if (ROOM_START == self.roomType) {
                        row.push(2);
                    }
                    else if (UP == self.previousRoom) {
                        row.push(2);
                    }
                    else if(remainingDoors > 0) {
                        
                        if(Math.random() < 1/remainingDoors && !hasPathDoorYet) {
                            if(isLastRoom){
                                row.push(5);
                            }
                            else {
                                row.push(2);
                            }
                            hasPathDoorYet = true;
                            remainingDoors--;
                        }
                        else {
                            row.push(0);
                            remainingDoors--;
                        }
                    }
                    else {
                        row.push(1);
                    }
                }
                else if(0 == h || self.height - 1 == h) {
                    row.push(1);
                }
                else if (0 == w || self.width - 1 == w) {
                    row.push(1);
                }
                else {
                    row.push(3);
                }
            }
            self.grid.push(row);
        }
    }
    
    self.generateRoomGrid();
    
    return self;
}

var Map = function(param) {
    var self = Entity(param);
    
    self.numOfRooms = 0;
    self.roomsLeft = MAX_NUM_OF_PATH_ROOMS;
    self.roomList = {};
    
    if(undefined !== param.streamKey) {
        if(Map.list[param.streamKey]) {
            return Map.list[param.streamKey];
        }
    }
    // This should never happen.
    else {
        console.log("Map being created without a streamKey.");
        return undefined;
    }
    
    self.addRoom = function(room) {        
        room.roomNum = self.numOfRooms;
        self.roomList[self.numOfRooms] = room;
        self.numOfRooms++;
    }
    
    self.createRoom = function(param) {
        var roomWidth, roomHeight;
        if(undefined !== param && undefined !== param.width && undefined !== param.width != 0) {
            roomWidth = width;
        }
        else {
            roomWidth = ROOM_SIZE_DEFAULT + Math.floor(Math.random() * 15);
        }
        
        if(undefined != param && param.height != undefined && param.height != 0) {
            roomHeight = height;
        }
        else {
            roomHeight = ROOM_SIZE_DEFAULT + Math.floor(Math.random() * 15);
        }
        
        if(0 == roomWidth % 2) {
            roomWidth--;
        }
        if(0 == roomHeight % 2) {
            roomHeight--;
        }
        
        var roomType = ROOM_START;
        if(undefined == param) {}
        else if(0 == param.doorType) {
            roomType = ROOM_DEAD_END;
        }
        else if (2 == param.doorType) {
            roomType = ROOM_PATH;
            self.roomsLeft--;
        }
        
        var parent;
        var previousRoom;
        if(undefined !== param) {
            parent = param.parent;
            previousRoom = param.previousRoom;
        }
        
        var roomParam = {
            width: roomWidth,
            height: roomHeight,
            roomsLeft: self.roomsLeft,
            roomType: roomType,
            previousRoom, previousRoom,
            parent: parent,
        };
        
        var room = Room(roomParam);
        self.addRoom(room);
        return room;
    }
    
    self.moveRight = function(paramIn) {
        
        if(undefined == self.roomList[paramIn.roomNum].doors.right) {
            var paramOut = {
                previousRoom: LEFT,
                doorType: paramIn.doorType,
                parent: paramIn.roomNum,
            };
            var room = self.createRoom(paramOut);
            self.roomList[paramIn.roomNum].doors.right = room.roomNum;
            return room.roomNum;
        }
        else {
            return self.roomList[paramIn.roomNum].doors.right;
        }
    }
    
    self.moveLeft = function(paramIn) {
        
        if(undefined == self.roomList[paramIn.roomNum].doors.left) {
            var paramOut = {
                previousRoom: RIGHT,
                doorType: paramIn.doorType,
                parent: paramIn.roomNum,
            };
            var room = self.createRoom(paramOut);
            self.roomList[paramIn.roomNum].doors.left = room.roomNum;
            return room.roomNum;
        }
        else {
            return self.roomList[paramIn.roomNum].doors.left;
        }
    }
    
    self.moveDown = function(paramIn) {
        
        if(undefined == self.roomList[paramIn.roomNum].doors.down) {
            var paramOut = {
                previousRoom: UP,
                doorType: paramIn.doorType,
                parent: paramIn.roomNum,
            };
            var room = self.createRoom(paramOut);
            self.roomList[paramIn.roomNum].doors.down = room.roomNum;
            return room.roomNum;
        }
        else {
            return self.roomList[paramIn.roomNum].doors.down;
        }
    }
    
    self.moveUp = function(paramIn) {
        
        if(undefined == self.roomList[paramIn.roomNum].doors.up) {
            var paramOut = {
                previousRoom: DOWN,
                doorType: paramIn.doorType,
                parent: paramIn.roomNum,
            };
            var room = self.createRoom(paramOut);
            self.roomList[paramIn.roomNum].doors.up = room.roomNum;
            return room.roomNum;
        }
        else {
            return self.roomList[paramIn.roomNum].doors.up;
        }
    }
    
    self.createRoom();
    
    Map.list[self.streamKey] = self;
    
    return self;
}
Map.list = {}

var Player = function(param){
    var self = Entity(param);
    self.x = 64;
    self.y = 64;
    self.id = param.id;
    self.number = "" + Math.floor(10*Math.random());
    self.name = "Player";
    self.pressingRight = false;
    self.pressingLeft = false;
    self.pressingUp = false;
    self.pressingDown = false;
    self.pressingShoot = false;
    self.mouseAngle = 0;
    self.maxSpeed = 5;
    self.hp = 100;
    self.hpMax = 100;
    self.score = 0;
    self.facing = "";
    self.map;
    self.playerMap;
    self.streamKey = param.streamKey;
    self.isGameOver = false;
    
    if(Map.list[self.streamKey]) {
        self.map = Map.list[self.streamKey];
    }
    else {
        self.map = Map({streamKey: self.streamKey});
    }
    
    var super_update = self.update;
    
    self.update = function() {
        self.updateSpd();
        self.updateMap();
        self.updateFacing();
        self.updateProjectiles(self.mouseAngle);
        super_update();
    }
	
	self.updateMap = function() {
		self.playerMap = self.map.roomList[self.roomNum].grid;
	}
    
    self.playerMap = self.map.roomList[self.roomNum].grid;
    
    self.updateSpd = function(){
        self.spdX = 0;
        self.spdY = 0;

        if(self.pressingRight) {
            var tileType = self.map.roomList[self.roomNum].grid[Math.floor((self.x + self.maxSpeed + 32)/64)][Math.floor(self.y/64)];
            if(tileType == 3) {
                self.spdX += self.maxSpeed;
            }
            else if(tileType == 5 && self.score <= SCORE_LOWER_LIMIT) {
                self.score +=5;
                Player.gameOver({streamKey: self.streamKey,});
            }
            else if(tileType == 2 || tileType == 0) {
                
                var previousYRatio = self.y / self.map.height;
                var paramOut = {
                    doorType: self.map.roomList[self.roomNum].grid[Math.floor(
                        (self.x + self.maxSpeed + 32)/64)][Math.floor(self.y/64)],
                    roomNum: self.roomNum,
                };
                
                self.roomNum = self.map.moveRight(paramOut);
                //left most x position for the room.
                self.x = 64;
                // Get the middle y position for the room being moved to.
                self.y = (Math.ceil(self.map.roomList[self.roomNum].height/2) * 64) - 32;
                
                return;
            }
        }
        if(self.pressingLeft) {
            var tileType = self.map.roomList[self.roomNum].grid[Math.floor((self.x - self.maxSpeed - 32)/64)][Math.floor(self.y/64)];
            if(tileType == 3) {
                self.spdX -= self.maxSpeed;
            }
            else if(tileType == 5 && self.score <= SCORE_LOWER_LIMIT) {
                self.score +=5;
                Player.gameOver({streamKey: self.streamKey,});
            }
            else if(tileType == 2 || tileType == 0) {
                            
                var previousYRatio = self.y / self.map.height;
                var paramOut = {
                    doorType: self.map.roomList[self.roomNum].grid[Math.floor(
                        (self.x - self.maxSpeed - 32)/64)][Math.floor(self.y/64)],
                    roomNum: self.roomNum,
                };
                self.roomNum = self.map.moveLeft(paramOut);
                // Right most tile of the room to be entered.
                self.x = 64 * (self.map.roomList[self.roomNum].width - 1);
                // Get the middle y position for the room being moved to.
                self.y = (Math.ceil(self.map.roomList[self.roomNum].height/2) * 64) - 32;
                return;
            }
        }
        if(self.pressingUp) {
            var tileType = self.map.roomList[self.roomNum].grid[Math.floor(self.x/64)][Math.floor((self.y - self.maxSpeed - 32)/64)];
            if(tileType == 3) {
                self.spdY -= self.maxSpeed;
            }
            else if(tileType == 5 && self.score <= SCORE_LOWER_LIMIT) {
                self.score +=5;
                Player.gameOver({streamKey: self.streamKey,});
            }
            else if(tileType == 2 || tileType == 0) {
                var paramOut = {
                    doorType: tileType,
                    roomNum: self.roomNum,
                };
                self.roomNum = self.map.moveUp(paramOut);
                // Get the middle x position for the room being moved to.
                self.x = (Math.ceil(self.map.roomList[self.roomNum].width/2) * 64) - 32;
                // Get the bottom most tile of the room being moved to.
                self.y = 64 * (self.map.roomList[self.roomNum].height - 1);
                return;
            }
        }
        if(self.pressingDown) {
            var tileType = self.map.roomList[self.roomNum].grid[Math.floor(self.x/64)][Math.floor((self.y + self.maxSpeed + 32)/64)];
            if(tileType == 3) {
                self.spdY += self.maxSpeed;
            }
            else if(tileType == 5 && self.score <= SCORE_LOWER_LIMIT) {
                self.score +=5;
                Player.gameOver({streamKey: self.streamKey,});
            }
            else if(tileType == 2 || tileType == 0) {
                var paramOut = {
                    doorType: tileType,
                    roomNum: self.roomNum,
                };
                self.roomNum = self.map.moveDown(paramOut);
                // Get the middle x position for the room being moved to.
                self.x = (Math.ceil(self.map.roomList[self.roomNum].width/2) * 64) - 32;
                // top most tile for the room being moved to.
                self.y = 64;
                return;
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
        hp:self.hp = 100,
        hpMax:self.hpMax = 100,
        score:self.score = 0,
        map:self.playerMap,
        streamKey:self.streamKey,
        room:self.roomNum,
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
    
    self.updateProjectiles = function(angle) {
        if(true == self.pressingShoot) {
            var param = {
                parent:self.id,
                angle:angle,
                x:self.x,
                y:self.y,
                streamKey:self.streamKey,
                roomNum:self.roomNum,
            };
            var projectile = Projectile(param);
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
            map:self.playerMap,
            room:self.roomNum,
            isGameOver:self.isGameOver,
        }
    }
    
    Player.list[self.id] = self;
    
    initPack.player.push(self.getInitPack());
    return self;
}
Player.list = {};

Player.onConnect = function(socket){
    var referer = socket.request.headers.referer;
    var urlArray = referer.split('/');
    var urlLength = urlArray.length;
    var streamKey = urlArray[urlLength-2] + '-' + urlArray[urlLength-1];
    
    var param = {
        id:socket.id,
        streamKey:streamKey,
    };
    
    var player = Player(param);
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
        else if(SHOOT == data.inputId) {
            player.pressingShoot = data.state;
        }
        else if(MOUSEANGLE == data.inputID) {
            player.mouseAngle = data.state;
        }
    });

    socket.emit('init', {
        selfId:socket.id,
        player:Player.getAllInitPack(),
        projectile:[],
    });
    
    socket.on('restart', function() {
        player.isGameOver = false;
        player.roomNum = 0;
        player.x = 64;
        player.y = 64;
        player.score = 0;
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
        if(player.toRemove) {
            delete Player.list[i];
            removePack.player.push(player.id);
        }
        else {
            player.update();
            pack.push(player.getUpdatePack());
        }
    }
    return pack;
}

Player.gameOver = function(param) {
    for(var i in Player.list) {
        var p = Player.list[i];
        
        if(param.streamKey == p.streamKey) {
            p.isGameOver = true;
        }
    }
}

var Projectile = function(param) {
    var self = Entity(param);
    self.id = Math.random();
    self.angle = param.angle;
    self.spdX = Math.cos(param.angle/180*Math.PI)*10;
    self.spdY = Math.sin(param.angle/180*Math.PI)*10;
    self.parent = param.parent;
    
    self.timer = 0;
    self.toRemove = false;
    
    var super_update = self.update;
    self.update = function() {
        if(self.timer > 100) {
            self.toRemove = true;
        }
        self.timer++;
        super_update();
        
        for(var i in Player.list) {
            var p = Player.list[i];
            if(p.streamKey != self.streamKey
                || p.roomNum != self.roomNum
                || 0 == p.roomNum) {
                continue;
            }
            var shooter = Player.list[self.parent];
            if(self.getDistance(p) < 32 && self.parent !== p.id) {
                p.hp--;
                if(0 == p.hp) {
                    shooter.score++;
                    p.score -=1;
                    p.hp = p.hpMax;
                    p.x = 64;
                    p.y = 64;
                    p.roomNum = 0;
                    if(shooter.hp < shooter.hpMax) {
                        shooter.hp+=10;
                    }
                }
                
                self.toRemove = true;
            }
        }
    }
    
    self.getInitPack = function() {
        return {
            id:self.id,
            x:self.x,
            y:self.y,
            streamKey:self.streamKey,
            room:self.roomNum,
        };
    }
    
    self.getUpdatePack = function() {
        return {
            id:self.id,
            x:self.x,
            y:self.y,
        };
    }
    
    Projectile.list[self.id] = self;
    initPack.projectile.push(self.getInitPack());
    return self;
}
Projectile.list = {};

Projectile.update = function() {
    var pack = [];
    for(var i in Projectile.list) {
        var projectile = Projectile.list[i];
        projectile.update();
        if(projectile.toRemove) {
            delete Projectile.list[i];
            removePack.projectile.push(projectile.id);
        }
        else {
            pack.push(projectile.getUpdatePack());
        }
    }
    return pack;
}

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
var initPack ={player:[], projectile:[]};

var removePack = {player:[], projectile:[]};

setInterval(function (){
    var pack = {
        player:Player.update(),
        projectile:Projectile.update(),
    }

    for (var i in SOCKET_LIST) {
        var socket = SOCKET_LIST[i];
        socket.emit('init',initPack);
        socket.emit('update',pack);
        socket.emit('remove',removePack);
    }
    initPack.player = [];
    initPack.projectile = [];
    removePack.player = [];
    removePack.projectile = [];
    
},1000/60);
