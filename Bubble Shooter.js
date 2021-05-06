window.onload = function() {
	
    var canvas = document.getElementById("canvas");
    var context = canvas.getContext("2d");
    
    var lastframe = 0;     
	
    var initialized = false;
    
    var level = {
        x: 4, y: 4,          	
        width: 0,       
        height: 0,      
        columns: 15,   
        rows: 14,       
        tilewidth: 40,  
        tileheight: 40, 
        rowheight: 34,  
        radius: 20,     
        tiles: []     
    };

    var Tile = function(x, y, type, shift) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.removed = false;
        this.shift = shift;  
        this.alpha = 1;
        this.processed = false;
    };

    var player = {
        x: 0,
        y: 0,
        angle: 0,
        tiletype: 0,
        bubble: {
                    x: 0,
                    y: 0,
                    angle: 0,
                    speed: 1000,
                    dropspeed: 900,
                    tiletype: 0,
                    visible: false
                },
        nextbubble: {
                        x: 0,
                        y: 0,
                        tiletype: 0
                    }
    };
    
    var neighborsoffsets = [[[1, 0], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1]], // чётные строки
                            [[1, 0], [1, 1], [0, 1], [-1, 0], [0, -1], [1, -1]]];  // нечётные строки
    
    var bubblecolors = 7;
    
    var gamestates = { init: 0, ready: 1, shootbubble: 2, removecluster: 3, gameover: 4, congratulations: 5};
    var gamestate = gamestates.init;
    
    var score = 0;
    
    var turncounter = 0; 
    var rowoffset = 0;  
    
    var animationstate = 0;   
    var animationtime = 0;  
   
    var showcluster = false;  
    var cluster = [];
    var floatingclusters = [];
    
    var images = [];
    var bubbleimage;
    
    var loadcount = 0;
    var loadtotal = 0;
    var preloaded = false;
    
	
	//вспомогательные функции
	
	function getMouseCoords(canvas, e) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
	
	function onMouseMove(e) {
        var coords = getMouseCoords(canvas, e);
        var mouseangle = radToDeg(Math.atan2((player.y+level.tileheight/2) - coords.y, coords.x - (player.x+level.tilewidth/2)));

        if (mouseangle < 0) {
            mouseangle = 180 + (180 + mouseangle);
        }

        var lbound = 8;
        var ubound = 172;
        if (mouseangle > 90 && mouseangle < 270) {
            if (mouseangle > ubound) {
                mouseangle = ubound;
            }
        } else {
            if (mouseangle < lbound || mouseangle >= 270) {
                mouseangle = lbound;
            }
        }

        player.angle = mouseangle;
    }
    
    function onMouseDown(e) {
        var coords = getMouseCoords(canvas, e);
        
        if (gamestate == gamestates.ready) {
            shootBubble();
        } else if (gamestate == gamestates.gameover) {
            newGame();
        } else if (gamestate == gamestates.congratulations) {
            newGame();
        }
    }
	
	function radToDeg(angle) {
        return angle * (180 / Math.PI);
    }

    function degToRad(angle) {
        return angle * (Math.PI / 180);
    }
	
	function circleIntersection(x1, y1, r1, x2, y2, r2) {
        var dx = x1 - x2;
        var dy = y1 - y2;
        var len = Math.sqrt(dx * dx + dy * dy);
        
        if (len < r1 + r2) {
            return true;
        }
        return false;
    }
	
	function drawCenterText(text, x, y, width) {
        var textdim = context.measureText(text);
        context.fillText(text, x + (width-textdim.width)/2, y);
    }
	
	function randRange(low, high) {
        return Math.floor(low + Math.random()*(high-low+1));
    }
	
	function getTileCoordinate(column, row) { 
        var tilex = level.x + column * level.tilewidth;
        
        if ((row + rowoffset) % 2) {
            tilex += level.tilewidth/2;
        }
        
        var tiley = level.y + row * level.rowheight;
        return { tilex: tilex, tiley: tiley };
    }
    
    function getGridPosition(x, y) {   
        var gridy = Math.floor((y - level.y) / level.rowheight);
        
        var xoffset = 0;
        if ((gridy + rowoffset) % 2) {
            xoffset = level.tilewidth / 2;
        }
        var gridx = Math.floor(((x - xoffset) - level.x) / level.tilewidth);
        
        return { x: gridx, y: gridy };
    }
	
	function resetProcessed() {
        for (var i=0; i<level.columns; i++) {
            for (var j=0; j<level.rows; j++) {
                level.tiles[i][j].processed = false;
            }
        }
    }
    
    function resetRemoved() {
        for (var i=0; i<level.columns; i++) {
            for (var j=0; j<level.rows; j++) {
                level.tiles[i][j].removed = false;
            }
        }
    }
	
	function getNeighbors(tile) {
        var tilerow = (tile.y + rowoffset) % 2; 
        var neighbors = [];
        
        var n = neighborsoffsets[tilerow];
        
        for (var i=0; i<n.length; i++) {
            var nx = tile.x + n[i][0];
            var ny = tile.y + n[i][1];
            
            if (nx >= 0 && nx < level.columns && ny >= 0 && ny < level.rows) {
                neighbors.push(level.tiles[nx][ny]);
            }
        }
        
        return neighbors;
    }
	
	
	//Основные функции:
	
	//Начало игры
	
    function loadImages(imagefiles) {
        loadcount = 0;
        loadtotal = imagefiles.length;
        preloaded = false;
        
        var loadedimages = [];
        for (var i=0; i<imagefiles.length; i++) {
            var image = new Image();
            
            image.onload = function () {
                loadcount++;
                if (loadcount == loadtotal) {
                    preloaded = true;
                }
            };
            
            image.src = imagefiles[i];
            
            loadedimages[i] = image;
        }
        
        return loadedimages;
    }
    
	function newGame() {
        score = 0;
        
        turncounter = 0;
        rowoffset = 0;
        
        setGameState(gamestates.ready);
        
        createLevel();

        nextBubble();
        nextBubble();
    }
	
	function createLevel() {
        for (var j=0; j<level.rows; j++) {
            var randomtile = randRange(0, bubblecolors-1);
            var count = 0;
            for (var i=0; i<level.columns; i++) {
                if (count >= 1) {
                    var newtile = randRange(0, bubblecolors-1);
                    
                    if (newtile == randomtile) {
                        newtile = (newtile + 1) % bubblecolors;
                    }
                    randomtile = newtile;
                    count = 0;
                }
                count++;
                
                if (j < level.rows/2) {
                    level.tiles[i][j].type = randomtile;
                } else {
                    level.tiles[i][j].type = -1;
                }
            }
        }
    }
	
    function init() {
        images = loadImages(["colours.png"]);
        bubbleimage = images[0];
    
        canvas.addEventListener("mousemove", onMouseMove);
        canvas.addEventListener("mousedown", onMouseDown);
        
        for (var i=0; i<level.columns; i++) {
            level.tiles[i] = [];
            for (var j=0; j<level.rows; j++) {
                level.tiles[i][j] = new Tile(i, j, 0, 0);
            }
        }
        
        level.width = level.columns * level.tilewidth + level.tilewidth/2;
        level.height = (level.rows-1) * level.rowheight + level.tileheight;
        
        player.x = level.x + level.width/2 - level.tilewidth/2;
        player.y = level.y + level.height;
        player.angle = 90;
        player.tiletype = 0;
        
        player.nextbubble.x = player.x - 2 * level.tilewidth;
        player.nextbubble.y = player.y;
        
        newGame();
        
        main(0);
    }
    
    function main(tframe) {
        window.requestAnimationFrame(main);
    
        if (!initialized) {
            if (preloaded) {
               initialized = true;
            }
        } else {
            update(tframe);
            render();
        }
    }
    
    function update(tframe) { 
        var dt = (tframe - lastframe) / 1000;
        lastframe = tframe;
         
        if (gamestate == gamestates.ready) {
        } else if (gamestate == gamestates.shootbubble) {
            stateShootBubble(dt);
        } else if (gamestate == gamestates.removecluster) {
            stateRemoveCluster(dt);
        }
    }
    
    function setGameState(newgamestate) {
        gamestate = newgamestate;
        
        animationstate = 0;
        animationtime = 0;
    }
	
	
	//Полёт и закрепление шариков
	
    function stateShootBubble(dt) {
        player.bubble.x += dt * player.bubble.speed * Math.cos(degToRad(player.bubble.angle));
        player.bubble.y += dt * player.bubble.speed * -1*Math.sin(degToRad(player.bubble.angle));
        
        if (player.bubble.x <= level.x) {
            player.bubble.angle = 180 - player.bubble.angle;
            player.bubble.x = level.x;
        } else if (player.bubble.x + level.tilewidth >= level.x + level.width) {
            player.bubble.angle = 180 - player.bubble.angle;
            player.bubble.x = level.x + level.width - level.tilewidth;
        }
 
        if (player.bubble.y <= level.y) {
            player.bubble.y = level.y;
            snapBubble();
            return;
        }
        
        for (var i=0; i<level.columns; i++) {
            for (var j=0; j<level.rows; j++) {
                var tile = level.tiles[i][j];
                
                if (tile.type < 0) {
                    continue;
                }
                
                var coord = getTileCoordinate(i, j);
                if (circleIntersection(player.bubble.x + level.tilewidth/2, player.bubble.y + level.tileheight/2, level.radius,
                                       coord.tilex + level.tilewidth/2, coord.tiley + level.tileheight/2, level.radius)) {
                    snapBubble();
                    return;
                }
            }
        }
    }
    
	function snapBubble() {
        var centerx = player.bubble.x + level.tilewidth/2;
        var centery = player.bubble.y + level.tileheight/2;
        var gridpos = getGridPosition(centerx, centery);

        if (gridpos.x < 0) {
            gridpos.x = 0;
        }
            
        if (gridpos.x >= level.columns) {
            gridpos.x = level.columns;    
        }

        if (gridpos.y < 0) {
            gridpos.y = 0;
        }
            
        if (gridpos.y >= level.rows) {
            gridpos.y = level.rows;   
        }

        var addtile = false;
        if (level.tiles[gridpos.x][gridpos.y].type != -1) {
            for (var newrow=gridpos.y+1; newrow<level.rows; newrow++) {
                if (level.tiles[gridpos.x][newrow].type == -1) {
                    gridpos.y = newrow;
                    addtile = true;
                    break;
                }
            }
        } else {
            addtile = true;
        }

        if (addtile) {
            player.bubble.visible = false;
        
            level.tiles[gridpos.x][gridpos.y].type = player.bubble.tiletype;
            
            if (checkGameOver()) {
                return;
            }
            
            cluster = findCluster(gridpos.x, gridpos.y, true, true, false);
            
            if (cluster.length >= 3) {
                setGameState(gamestates.removecluster);
                return;
            }
        }
        
        turncounter++;
        if (turncounter >= 8) {
            addBubbles();
            turncounter = 0;
            rowoffset = (rowoffset + 1) % 2;
            
            if (checkGameOver()) {
                return;
            }
        }

        nextBubble();
        setGameState(gamestates.ready);
    }
	
	function shootBubble() {
        player.bubble.x = player.x;
        player.bubble.y = player.y;
        player.bubble.angle = player.angle;
        player.bubble.tiletype = player.tiletype;

        setGameState(gamestates.shootbubble);
    }
	
	
	//Работа со скоплениями
	
	function findCluster(tx, ty, matchtype, reset, skipremoved) {
        if (reset) {
            resetProcessed();
        }
        
        var targettile = level.tiles[tx][ty];
        
        var toprocess = [targettile];
        targettile.processed = true;
        var foundcluster = [];

        while (toprocess.length > 0) {
            var currenttile = toprocess.pop();
	    
            if (currenttile.type == -1) {
                continue;
            }
            
            if (skipremoved && currenttile.removed) {
                continue;
            }
            
            if (!matchtype || (currenttile.type == targettile.type)) {
                foundcluster.push(currenttile);
                
                var neighbors = getNeighbors(currenttile);
                
                for (var i=0; i<neighbors.length; i++) {
                    if (!neighbors[i].processed) {
                        toprocess.push(neighbors[i]);
                        neighbors[i].processed = true;
                    }
                }
            }
        }
        
        return foundcluster;
    }
    
    function findFloatingClusters() {
        resetProcessed();
        
        var foundclusters = [];
        
        for (var i=0; i<level.columns; i++) {
            for (var j=0; j<level.rows; j++) {
                var tile = level.tiles[i][j];
                if (!tile.processed) {
                    var foundcluster = findCluster(i, j, false, false, true);
                    
                    if (foundcluster.length <= 0) {
                        continue;
                    }
                    
                    var floating = true;
                    for (var k=0; k<foundcluster.length; k++) {
                        if (foundcluster[k].y == 0) {
                            floating = false;
                            break;
                        }
                    }
                    
                    if (floating) {
                        foundclusters.push(foundcluster);
                    }
                }
            }
        }
        
        return foundclusters;
    }
	
    function stateRemoveCluster(dt) {
        if (animationstate == 0) {
            resetRemoved();
            
            for (var i=0; i<cluster.length; i++) {
                cluster[i].removed = true;
            }
            
            score += cluster.length * 100;
            
            floatingclusters = findFloatingClusters();
            
            if (floatingclusters.length > 0) {
                score += 500;
            }
            
            animationstate = 1;
        }
        
        if (animationstate == 1) {
            var tilesleft = false;
            for (var i=0; i<cluster.length; i++) {
                var tile = cluster[i];
                
                if (tile.type >= 0) {
                    tilesleft = true;
                    tile.type = -1;
                }                
            }
            
            for (var i=0; i<floatingclusters.length; i++) {
                for (var j=0; j<floatingclusters[i].length; j++) {
                    var tile = floatingclusters[i][j];
                    
                    if (tile.type >= 0) {
                        tilesleft = true;
                            
                        tile.alpha -= dt * 2;
                        if (tile.alpha < 0) {
                            tile.alpha = 0;
                        }

                        if (tile.alpha == 0) {
                            tile.type = -1;
                            tile.alpha = 1;
                        }
                    }
                }
            }
            
            if (!tilesleft) {
                nextBubble();
                
                var tilefound = false
                for (var i=0; i<level.columns; i++) {
                    for (var j=0; j<level.rows; j++) {
                        if (level.tiles[i][j].type != -1) {
                            tilefound = true;
                            break;
                        }
                    }
                }
                
                if (tilefound) {
                    setGameState(gamestates.ready);
                } else {
                    setGameState(gamestates.congratulations);
                }
            }
        }
    }
    
	
    //Работа с цветом
    
	function getExistingColor() {
        existingcolors = findColors();
        
        var bubbletype = 0;
        if (existingcolors.length > 0) {
            bubbletype = existingcolors[randRange(0, existingcolors.length-1)];
        }
        
        return bubbletype;
    }
	
	function findColors() {
        var foundcolors = [];
        var colortable = [];
        for (var i=0; i<bubblecolors; i++) {
            colortable.push(false);
        }
        
        for (var i=0; i<level.columns; i++) {
            for (var j=0; j<level.rows; j++) {
                var tile = level.tiles[i][j];
                if (tile.type >= 0) {
                    if (!colortable[tile.type]) {
                        colortable[tile.type] = true;
                        foundcolors.push(tile.type);
                    }
                }
            }
        }
        
        return foundcolors;
    }
	
	
	//Отображение
	
    function render() {
        var yoffset =  level.tileheight/2;
        
        context.fillStyle = "#000000";    
        context.fillRect(level.x - 4, level.y - 4, level.width + 8, level.height + 4 - yoffset); 
        
        renderTiles();
        
        context.fillStyle = "#202020";
        context.fillRect(level.x - 4, level.y - 4 + level.height + 4 - yoffset, level.width + 8, 2*level.tileheight);
        
        context.fillStyle = "#ffffff";
        context.font = "18px Algerian";
        var scorex = level.x + level.width - 130;
        var scorey = level.y+level.height + level.tileheight - yoffset - 8;
        drawCenterText("Score:", scorex, scorey, 130);
        context.font = "24px Algerian";
        drawCenterText(score, scorex, scorey+30, 130);
        
        renderPlayer();
        
        if (gamestate == gamestates.gameover) {
            context.fillStyle = "rgba(0, 0, 0, 0.8)";
            context.fillRect(level.x - 4, level.y - 4, level.width + 8, level.height + 2 * level.tileheight + 8 - yoffset);
            
            context.fillStyle = "#ff0000";
            context.font = "36px Algerian";
            drawCenterText("Game Over!", level.x, level.y + level.height / 2 + 10, level.width);
            drawCenterText("Click to start", level.x, level.y + level.height / 2 + 40, level.width);
		}
		
		if (gamestate == gamestates.congratulations) {
            context.fillStyle = "rgba(0, 0, 0, 0.8)";
            context.fillRect(level.x - 4, level.y - 4, level.width + 8, level.height + 2 * level.tileheight + 8 - yoffset);
            
            context.fillStyle = "#ff9700";
            context.font = "36px Algerian";
            drawCenterText("Congratulations!", level.x, level.y + level.height / 2 + 10, level.width);
			context.font = "24px Algerian";
            drawCenterText("Click to start", level.x, level.y + level.height / 2 + 40, level.width);
        }
    }
    
    function renderTiles() {
        for (var j=0; j<level.rows; j++) {
            for (var i=0; i<level.columns; i++) {
                var tile = level.tiles[i][j];
            
                var shift = tile.shift;
                
                var coord = getTileCoordinate(i, j);
                
                if (tile.type >= 0) {
                    context.save();
                    context.globalAlpha = tile.alpha;
                    
                    drawBubble(coord.tilex, coord.tiley + shift, tile.type);
                    
                    context.restore();
                }
            }
        }
    }
    
    function renderPlayer() {
        var centerx = player.x + level.tilewidth/2;
        var centery = player.y + level.tileheight/2;
        
        context.fillStyle = "#000000";
        context.beginPath();
        context.arc(centerx, centery, level.radius+12, 0, 2*Math.PI);
        context.fill();
        context.strokeStyle = "#000000";
        context.stroke();

        context.lineWidth = 2;
        context.strokeStyle = "#ffffff";
        context.beginPath();
        context.moveTo(centerx, centery);
        context.lineTo(centerx + 2*level.tilewidth * Math.cos(degToRad(player.angle)), centery - 2*level.tileheight * Math.sin(degToRad(player.angle)));
        context.stroke();
        
        drawBubble(player.nextbubble.x, player.nextbubble.y, player.nextbubble.tiletype);
        
        if (player.bubble.visible) {
            drawBubble(player.bubble.x, player.bubble.y, player.bubble.tiletype);
        }
        
    }
    
    function drawBubble(x, y, index) {  
        if (index < 0 || index >= bubblecolors)
            return;
        
        context.drawImage(bubbleimage, index * 40, 0, 40, 40, x, y, level.tilewidth, level.tileheight);
    }
    
    function nextBubble() {
        player.tiletype = player.nextbubble.tiletype;
        player.bubble.tiletype = player.nextbubble.tiletype;
        player.bubble.x = player.x;
        player.bubble.y = player.y;
        player.bubble.visible = true;
        
        var nextcolor = getExistingColor();
        
        player.nextbubble.tiletype = nextcolor;
    }
    
	function addBubbles() {
        for (var i=0; i<level.columns; i++) {
            for (var j=0; j<level.rows-1; j++) {
                level.tiles[i][level.rows-1-j].type = level.tiles[i][level.rows-1-j-1].type;
            }
        }
        
        for (var i=0; i<level.columns; i++) {
            level.tiles[i][0].type = getExistingColor();
        }
    }
	
	
	//Конец игры
	
	function checkGameOver() {
        for (var i=0; i<level.columns; i++) {
            if (level.tiles[i][level.rows-1].type != -1) {
                nextBubble();
                setGameState(gamestates.gameover);
                return true;
            }
        }
        
        return false;
    }
	
	init();
};