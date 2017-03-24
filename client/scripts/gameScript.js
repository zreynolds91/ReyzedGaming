var LEFT = "left";
var RIGHT = "right";
var UP = "up";
var DOWN = "down";
var SHOOT = "shoot";
var MOUSEANGLE = "mouseAngle";
var socket = io();
var selfId = null;
var WIDTH = 576;
var HEIGHT = 576;
var CURRENCY_NAME = "Score";
var SPRITE_FRONT = '/client/images/64bit/WizardSpriteFront.png';
var SPRITE_BACK = '/client/images/64bit/WizardSpriteBack.png';
var SPRITE_LEFT = '/client/images/64bit/WizardSpriteLeft.png';
var SPRITE_RIGHT = '/client/images/64bit/WizardSpriteRight.png';
var PROJECTILE = '/client/images/64bit/Projectile.png';

var canvas = document.getElementById("ctx");
var ctx = document.getElementById("ctx").getContext("2d");
ctx.font = '30px Arial';

var Img = {};
Img.players = {};
Img.projectiles = {};
Img.floor = new Image();
Img.floor.src = '/client/images/64bit/floor.png';
Img.door = new Image();
Img.door.src = '/client/images/64bit/door.png';
Img.finalDoor = new Image();
Img.finalDoor.src = '/client/images/64bit/doorFinal.png';

var Player = function(initPack) {
    var self = {};
    self.id = initPack.id;
    self.number = initPack.number;
    self.x = initPack.x;
    self.y = initPack.y;
    self.name = initPack.name;
    self.hp = initPack.hp;
    self.hpMax = initPack.hpMax;
    self.score = initPack.score;
    Player.list[self.id] = self;
    self.attacking = false;
    self.facing = DOWN;
    self.map = initPack.map;
    self.streamKey = initPack.streamKey;
    self.room = initPack.room;
    self.isGameOver = false;
    
    Img.players[self.id] = new Image();
    Img.players[self.id].src = SPRITE_FRONT;
    
    self.draw = function() {
        var x = self.x - Player.list[selfId].x + WIDTH/2;
        var y = self.y - Player.list[selfId].y + HEIGHT/2;
    
        var hpWidth = 50 * self.hp / self.hpMax;			
        var width = Img.players[self.id].width;
        var height = Img.players[self.id].height;
        
        ctx.fillStyle = 'red';
        ctx.fillRect(x - hpWidth/2, y - 40, hpWidth,4);
        
        if(DOWN == self.facing) {
            Img.players[self.id].src = SPRITE_FRONT;
        }
        else if (UP == self.facing) {
            Img.players[self.id].src = SPRITE_BACK;
        }
        else if (RIGHT == self.facing) {
            Img.players[self.id].src = SPRITE_RIGHT;
        }
        else if (LEFT == self.facing) {
            Img.players[self.id].src = SPRITE_LEFT;
        }
        else {
            Img.players[self.id].src = SPRITE_FRONT;
        }
        
        ctx.drawImage(Img.players[self.id], 0, 0, Img.players[self.id].width, Img.players[self.id].height, x-width/2, 
            y-height/2,width,height);
    }
    
    return self;
}
Player.list = {};

var Projectile = function(initPack){
    var self = {};
    self.id = initPack.id;
    self.x = initPack.x;
    self.y = initPack.y;
    self.streamKey = initPack.streamKey;
    self.room = initPack.room;
    
    Img.projectiles[self.id] = new Image();
    Img.projectiles[self.id].src = PROJECTILE;
    
    self.draw = function() {
        var x = self.x - Player.list[selfId].x + WIDTH/2;
        var y = self.y - Player.list[selfId].y + HEIGHT/2;
        
        var width = Img.projectiles[self.id].width;
        var height = Img.projectiles[self.id].height;
        
        ctx.fillStyle = "rgba(0, 0, 200, 0)";
        ctx.fillRect(x-width/2, y-height/2, 10, 10);
        
        ctx.drawImage(Img.projectiles[self.id], 0, 0, Img.projectiles[self.id].width, 
            Img.projectiles[self.id].height, x-width/2, y-height/2, width, height);
    }
    
    Projectile.list[self.id] = self;
    return self;
}
Projectile.list = {};

socket.on('init',function(data) {
    if(data.selfId) {
        selfId = data.selfId;
    }
    for(var i = 0; i <data.player.length; i++) {
        new Player(data.player[i]);
    }
    for(var i = 0; i<data.projectile.length; i++) {
        new Projectile(data.projectile[i]);
    }
});

socket.on('update', function(data) {
    for(var i =0; i < data.player.length; i++) {
        var pack = data.player[i];
        var p = Player.list[pack.id];
        if(p) {
            if(pack.x !== undefined) {
                p.x = pack.x;
            }
            if(pack.y !== undefined) {
                p.y = pack.y;
            }
            if(pack.hp !== undefined) {
                p.hp = pack.hp;
            }
            if(pack.score !== undefined) {
                p.score = pack.score;
            }
            if(pack.facing !== undefined) {
                p.facing = pack.facing;
            }
            if(pack.map !== undefined) {
                p.map = pack.map;
            }
            if(pack.room !== undefined) {
                p.room = pack.room;
            }
            if(pack.isGameOver !== undefined) {
                p.isGameOver = pack.isGameOver;
            }
        }
    }
    for(var i = 0; i<data.projectile.length; i++) {
        var pack = data.projectile[i];
        var p = Projectile.list[data.projectile[i].id];
        if(p) {
            if(pack.x !== undefined) {
                p.x = pack.x;
            }
            if(pack.y !== undefined) {
                p.y = pack.y;
            }
        }
    }
});

socket.on('remove', function(data) {
    for(var i = 0; i < data.player.length; i++) {
        delete Player.list[data.player[i]];
    }
    
    for(var i = 0; i < data.projectile.length; i++) {
        delete Projectile.list[data.projectile[i]];
    }
});

var drawMap = function(map) {
    var playerX = WIDTH/2 - Player.list[selfId].x;
    var playerY = HEIGHT/2 - Player.list[selfId].y;

    for(var x = 0; x < map.length; x++) {
        for(var y = 0; y < map[x].length; y++) {
            if(map[x][y] == 3) {
                var xPos = x*64+playerX;
                var yPos = y*64+playerY;
                ctx.drawImage(Img.floor,xPos,yPos);
            }
            else if (2 == map[x][y] || 0 == map[x][y]) {
                var xPos = x*64+playerX;
                var yPos = y*64+playerY;
                ctx.drawImage(Img.door,xPos,yPos);
            }
            else if (5 == map[x][y]) {
                var xPos = x*64+playerX;
                var yPos = y*64+playerY;
                ctx.drawImage(Img.finalDoor,xPos,yPos);
            }
        }
    }
}

var drawScore = function() {
    ctx.fillStyle = 'white';
    ctx.fillText(CURRENCY_NAME + ": " + Player.list[selfId].score,30,50);
}

document.onkeydown = function(event) {
    // Player holding up arrow or w
    if (38 == event.keyCode || 87 == event.keyCode) {
        socket.emit('keyPress',{inputId:'up', state:true});
    }
    // Player holding down arrow or s
    else if (40 == event.keyCode || 83 == event.keyCode) {
        socket.emit('keyPress',{inputId:DOWN, state:true});
    }
    // Player holding left arrow or a
    else if (37 == event.keyCode || 65 == event.keyCode) {
        socket.emit('keyPress',{inputId:LEFT, state:true});
    }
    // Player holding right arrow or d
    else if (39 == event.keyCode || 68 == event.keyCode) {
        socket.emit('keyPress',{inputId:RIGHT, state:true});
    }
    event.preventDefault();
}

document.onkeyup = function(event) {
    // Player let go of up arrow or w
    if (38 == event.keyCode || 87 == event.keyCode) {
        socket.emit('keyPress',{inputId:UP, state:false});
    }
    // Player let go of down arrow or s
    else if (40 == event.keyCode || 83 == event.keyCode) {
        socket.emit('keyPress',{inputId:DOWN, state:false});
    }
    // Player let go of left arrow or a
    else if (37 == event.keyCode || 65 == event.keyCode) {
        socket.emit('keyPress',{inputId:LEFT, state:false});
    }
    // Player let go of right arrow or d
    else if (39 == event.keyCode || 68 == event.keyCode) {
        socket.emit('keyPress',{inputId:RIGHT, state:false});
    }
    event.preventDefault();
}

document.onmousedown = function(event) {
    socket.emit('keyPress',{inputId:SHOOT,state:true});
}

document.onmouseup = function(event) {
    socket.emit('keyPress',{inputId:SHOOT,state:false});
}

document.onmousemove = function(event) {
    var rect = canvas.getBoundingClientRect();
    var x = -1*(WIDTH/2) + (event.clientX - rect.left);
    var y = -1*(HEIGHT/2) + (event.clientY - rect.top);
    var angle = Math.atan2(y,x) / Math.PI * 180;
    socket.emit('keyPress',{inputID:MOUSEANGLE, state:angle});
}

setInterval(function() {
    if(!selfId) {
        return;
    }
    ctx.clearRect(0,0,576,576);
    ctx.fillStyle = 'black';
    ctx.fillRect(0,0,WIDTH,HEIGHT);
    drawMap(Player.list[selfId].map);
    drawScore();
    
    var selfStreamKey = Player.list[selfId].streamKey;
    var selfRoom = Player.list[selfId].room;
    
    if(Player.list[selfId].isGameOver) {
        console.log("Game Over");
        socket.emit('restart');
    }
    else {
        for(var i in Player.list) {        
            if(selfStreamKey == Player.list[i].streamKey
                    && selfRoom == Player.list[i].room) {
                Player.list[i].draw();
            }
        }
        for(var i in Projectile.list) {
            if(selfStreamKey == Projectile.list[i].streamKey
                    && selfRoom == Projectile.list[i].room) {
                Projectile.list[i].draw();
            }
        }
    }
}, 1000/60);

