// global state
var turretCounter = 0;
var isRunning = false;
var isPaused = false;
var minion_count = 12;
var interval_id = null;
var currentWave = 0;
var isBossWave = 0;
var currentLevel = 1;
var currentLives = 10;
var currentCash = 20;
var currentScore = 0;
var turretPos = new Array();
var timeLapsesSinceLastShot = 1;
var soundtrack = new Audio("sound/map1Soundtrack.mp3");

////////////////////// TURRET FUNCTIONS that requires global values (others declared on object/turret.js)
function turretClick(turret) {
	function tclick(evt) {
		if (!isRunning || isPaused) {
			return;
		}

		// do we have enough money to make a tower?
		if (currentCash < turretValue(turret.getAttribute("type"))) {
			return;
		}

		evt = evt || window.evt;

		// find out the window coordinates
		var x = 0;
		var y = 0;

		if (evt.pageX) {
			x = evt.pageX;
			y = evt.pageY;
		} else if (evt.clientX) {
			var offsetX = 0;
			var offsetY = 0;
			if (document.documentElement.scrollLeft) {
				offsetX = document.documentElement.scrollLeft;
				offsetY = document.documentElement.scrollTop;
			} else if (document.body) {
				offsetX = document.body.scrollLeft;
				offsetY = document.body.scrollTop;
			}
			x = evt.clientX + offsetX;
			y = evt.clientY + offsetY;
		}

		// create a new shaped turret at the mouse coords	
		var turretD = document.createElement("div");
		var turretType = turret.getAttribute("type");
		turretD.setAttribute("id", turretType + ":" + turretCounter++);
		turretD.setAttribute("class", "turretdrag");
		turretD.style.left = x + "px";
		turretD.style.top = y + "px";
		//turretD.style.backgroundColor = turretColor(turretType);
		turretD.style.backgroundImage = turretImage(turretType);
		turretD.setAttribute("draggable", "true");
		listenEvent(turretD, "dragstart", turretDrag(turretD));
		document.body.appendChild(turretD);
		// reduce our available cash by what we just spent
		currentCash -= turretValue(turretType);
	}
	return tclick;
}

function mapDrop(mapzone, x, y) {
	function drop(evt) {
		// get the drop coordinates
		if(!isRoad(currentLevel, x, y)) {
			cancelPropogation(evt);
			evt = evt || window.event;
			evt.dataTransfer.dropEffect = 'copy';
			var id = evt.dataTransfer.getData("Text");
			var turret = document.getElementById(id);
			turret.style.left = mapzone.style.left;
			turret.style.top = mapzone.style.top;
			let xPos = mapzone.style.left.replace(/\D/g, "");
			let yPos = mapzone.style.top.replace(/\D/g, "");
			// the id is up to the colon in the string
			var turretType = turret.id.substring(0, turret.id.indexOf(":"));

			// store an entry in the turret position array
			const turretObj = {
				range:turretRange(turretType),
				damage:turretDamage(turretType),
				type:turretType,
				x:xPos,
				y:yPos,
				htmlElement:turret,
				level:1,
				shotCd:0,
				audioCd:0,
				audioFile:turretSoundEffect(turretType)
			};
			turretPos[turretPos.length] = turretObj;
			// once created it is possible to see the turret upgrade info.
			listenEvent(turret, "click", showTurretInfo(turretPos[turretPos.length - 1]));
			// once its droppable, you can't move it anymore		
			turret.setAttribute("draggable", "false");
			listenEvent(turret, "dragstart", nodrag);
		}
	}
	return drop;
}
////////////////////// END TURRET FUNCTIONS

///////////////////// EVENT HANDLER WRAPPERS
function listenEvent(eventTarget, eventType, eventHandler) {
	if (eventTarget.addEventListener) {
		eventTarget.addEventListener(eventType, eventHandler, false);
	} else if (eventTarget.attachEvent) {
		eventType = "on" + eventType;
		eventTarget.attachEvent(eventType, eventHandler);
	} else {
		eventTarget["on" + eventType] = eventHandler;
	}
}


// DRAG AND DROP
function dragOver(xPos, yPos){
	function dragover(evt) {
		if(!isRoad(currentLevel, xPos, yPos)) {
			if (evt.preventDefault) evt.preventDefault();
				evt = evt || window.event;
				evt.dataTransfer.dropEffect = 'copy';
				return false;
			}
		}
	return dragover;
}

function cancelEvent(xPos, yPos){
	function dragenter(event) {
		if(!isRoad(currentLevel, xPos, yPos)){
			if (event.preventDefault) {
				event.preventDefault();
			} else {
				event.returnValue = false;
			}
		}
	}
	return dragenter;
}

function cancelPropogation(event) {
	if (event.stopPropogation) {
		event.stopPropogation();
	} else {
		event.cancelBubble = true;
	}
}
///////////////////// END EVENT HANDLER WRAPPERS

////////////////////// MAP CREATION
function drawMap() {
	// create the map zone
	for (var j = 0; j < MAP_H; j++) {
		for (var i = 0; i < MAP_W; i++) {
			var mapzone = document.createElement("div");
			mapzone.setAttribute("id", "mapzone" + i);
			mapzone.setAttribute("class", "mapzone");
			mapzone.style.left = TILE_H * i + "px";
			mapzone.style.top = TILE_W * j + "px";
			listenEvent(mapzone, "drop", mapDrop(mapzone, i, j));
			listenEvent(mapzone, "dragenter", cancelEvent(i, j));
			listenEvent(mapzone, "dragover", dragOver(i, j));
			if (isRoad(currentLevel, i, j)) {
				mapzone.style.backgroundColor = "#1E90FF";
			} 
			document.body.appendChild(mapzone);
		}
	}

	// create the turrets
	var turretTypes = getTurretTypes();
	for (var k = 0; k < turretTypes.length; k++) {
		var turret = document.createElement("div");
		turret.setAttribute("type", turretTypes[k]);
		turret.setAttribute("class", "turret");
		turret.style.left = TURRET_OFFSET + (TURRET_D + TURRET_GAP) * k + "px";
		turret.style.borderColor = turretColor(turret.getAttribute("type"));
		turret.innerHTML = "<p>" + k + "<br /><br />$" + turretValue(turret.getAttribute("type")) + "</p>";

		// turrets are draggable
		listenEvent(turret, "click", turretClick(turret));
		document.body.appendChild(turret);
	}

	// put a start button on
	var startbutton = document.createElement("div");
	startbutton.setAttribute("id", "startbutton");
	startbutton.setAttribute("class", "startbutton");
	startbutton.innerHTML = "<p> Start! </p>";
	listenEvent(startbutton, "click", startwave);
	document.body.appendChild(startbutton);

	// reset button
	var resetbutton = document.createElement("div");
	resetbutton.setAttribute("id", "resetbutton");
	resetbutton.setAttribute("class", "resetbutton");
	resetbutton.innerHTML = "<p> Reset </p>";
	listenEvent(resetbutton, "click", resetwave);
	document.body.appendChild(resetbutton);

	// status  bar
	var statusbar = document.createElement("div");
	statusbar.setAttribute("id", "statusbar");
	statusbar.setAttribute("class", "statusbar");
	statusbar.innerHTML = '<p> Cash: <span id="cash">$0</span> Score: <span id="score">0</span> Wave: <span id="wave">0</span> Lives: <span id="lives">0</span></p>';
	document.body.appendChild(statusbar);

	//Play map Soundtrack
	playMapSoundtrack();
}

function playMapSoundtrack(){
	switch(currentLevel){
		//@TODO Soundtrack to others maps.
		case 1:
		break;
	}
}

function playAudio() {
    soundtrack.play();
	document.getElementById("play").style.display = "none";
	document.getElementById("pause").style.display = "block";
}

function pauseAudio() {
    soundtrack.pause();
	document.getElementById("play").style.display = "block";
	document.getElementById("pause").style.display = "none";
}

function drawTargetMap(targetLevel) {
	var pixels = document.getElementsByClassName('mapzone');
	for (var i = 0; i < pixels.length; i++) {
		var mapzone = pixels[i];
		var x = mapzone.style.left.replace("px", "") / TILE_H;
		var y = mapzone.style.top.replace("px", "") / TILE_W;
		if (isRoad(targetLevel, x, y)) {
			var roadColor = "#FFFFFF";
			switch(targetLevel) {
				case 1:
					roadColor = "#1E90FF";
				break;
				case 2:
					roadColor = "#614821";
				break;
			}
			mapzone.style.backgroundColor = roadColor;
		} else {
			mapzone.style.backgroundColor = '#C98D26';
		}
	}
}
/////////////////////// END MAP CREATION

//////////////////////// WAVE HANDLING
function startwave(evt) {
	if (isRunning) return;
	isRunning = true;

	if(soundtrack.paused){
		playAudio();
	}

	// make the pause button visible
	var sb = document.getElementById("startbutton");
	sb.innerHTML = "<p> Pause </p>";
	listenEvent(sb, "click", pausewave);
	// reset globals	
	currentWave = 0;
	currentLives = 11;
	currentCash = 3000;
	currentScore = 0;
	turretPos = new Array();

	// increase the wave count
	currentWave++;
	console.log("Wave: " + currentWave);

	// remove all the placed turrets
	var turrets = document.querySelectorAll(".turretdrag");
	for (var i = 0; i < turrets.length; i++) {
		document.body.removeChild(turrets[i]);
	}

	// create all our minions
	for (var i = 0; i < minion_count; i++) {
		var minion = document.createElement("div");
		var hpBarMinion = document.createElement("progress");
		minion.setAttribute("id", "minion" + i);
		minion.setAttribute("class", "minion");
		hpBarMinion.setAttribute("id", "hpBar" + i);
		hpBarMinion.setAttribute("class", "hpBar");
		hpBarMinion.setAttribute("value", 0);
		hpBarMinion.setAttribute("max", minionhp());
		document.body.appendChild(minion);
		document.body.appendChild(hpBarMinion);
	}

	// set up the timers to run
	var movex = new Array();
	var movey = new Array();
	// what direction are we going?
	var currentDir = new Array();
	var minion_c = 1;
	var minion_release = new Array();
	var minion_hp = new Array();
	var first_kill = new Array();
	var minions_killed = 0;
	var lives_lost = 0;
	var wave_over = false;
	// get all the minions available
	var minions = document.getElementsByClassName("minion");
	var hpBarMinions = document.getElementsByClassName("hpBar");
	for (var i = 0; i < minions.length; i++) {
		movex[i] = 0;
		movey[i] = 0;
		currentDir[i] = MOVE_S;
		minion_release[i] = 0;
		minions[i].style.display = "none";
		hpBarMinions[i].style.display = "none";
		hpBarMinions[i].setAttribute("max", minionhp());
		minion_hp[i] = minionhp();
		first_kill[i] = true;
	}

	interval_id = setInterval(function () {
		if (!isPaused) {
			//timeLapsesSinceLastShot++;
			for (var i = 0; i < minion_c; i++) {
				// what direction do we want to go?
				currentDir[i] = whereToMove(movex[i], movey[i], currentDir[i], minions[i], isBossWave);
				if (currentDir[i] == MOVE_END) {
					// lose a life, one escaped!
					if (minions[i].style.display != "none") {
						currentLives--;
						lives_lost++;
						minions_killed++;
					}
					// we have reached the end of the map
					minions[i].style.display = "none";
					hpBarMinions[i].style.display = "none";
					//deleteProjectilesTargetingMinion(minions[i].id);
					if (currentLives == 0) {
						// game over
						wave_over = true;
						break;
					}
					// do we have minions killed?
					if (minions_killed == minions.length || (isBossWave && minions_killed == 1)) {
						// wave over!
						console.log("Wave Over!");
						wave_over = true;
					}
					continue;
				}

				//Projectile's creation happens once every 50 times the common interval.
				if (timeLapsesSinceLastShot == SHOOT_COOLDOWN && minions[i].style.display != 'none') {
					//shoot(minions[i], movex[i], movey[i]);
				}

				// are there any turrets in range? @TODO status
				var damage = 0;
				if(minions[i].style.display != 'none'){
					damage = anyTurretsInRange(minions[i], movex[i], movey[i]);
				}
				let speed = getMinionSpeed(minions[i]);
				switch (currentDir[i]) {
				case MOVE_N:
					movey[i] -= speed;
					break;
				case MOVE_S:
					movey[i] += speed;
					break;
				case MOVE_E:
					movex[i] += speed;
					break;
				case MOVE_W:
					movex[i] -= speed;
					break;
				}
				minions[i].style.display = "block";
				minions[i].style.top = movey[i] + "px";
				minions[i].style.left = movex[i] + "px";
				hpBarMinions[i].style.display = "block";
				hpBarMinions[i].style.top = movey[i] + "px";
				hpBarMinions[i].style.left = movex[i] + "px";
				if (isBossWave) {
					hpBarMinions[i].setAttribute("max", bossHp());
				} else {
					hpBarMinions[i].setAttribute("max", minionhp());
				}
				// reduce the minion's hit points by the damage
				minion_hp[i] -= damage;
				hpBarMinions[i].setAttribute("value", minion_hp[i]);
				if (minion_hp[i] <= 0) {
					// goodbye minion!
					hpBarMinions[i].setAttribute("value", 0);
					removeDebuffs(minions[i], hpBarMinions[i]);
					if (first_kill[i]) {
						first_kill[i] = false;
						minions_killed++;
						// increase your cash a little bit  
						if (isBossWave) {
							currentCash += bossReward();
							currentScore += 8;
						} else {
							currentCash += minionreward();
							currentScore++;
						}
						if (minions_killed == minions.length || (isBossWave && minions_killed == 1)) {
							// wave over!
							console.log("wave over!")
							wave_over = true;
						}
					}
					minions[i].style.display = "none";
					hpBarMinions[i].style.display = "none";
					//deleteProjectilesTargetingMinion(minions[i].id);
				} else {
					tickDownMinionDebuffs(minions[i], hpBarMinions[i]);
				}
				// stagger the minions coming out, release one every 15 pixels
				if ((minion_release[i] == 100 * minion_c) && minion_c < minions.length) {
					minion_c++;
				}
				minion_release[i]++;
			}
			updateTurretCooldownPostTurn(turretPos);
			//moveProjectiles();
			//Reset count since last shot (projectile related)
			if (timeLapsesSinceLastShot == SHOOT_COOLDOWN) {
				timeLapsesSinceLastShot = 0;
			}
		  
			// update the status
			updateStatus();

			// is the wave over?
			if (wave_over) {
				if (currentLives == 0) {
					var lives = document.getElementById("lives");
					console.log("FF")
					lives.innerHTML = "Game Over";
					resetwave(null);
				}
				// reset for the next wave!
				minion_c = 1;
				minions_killed = 0;
				wave_over = false;
				currentWave++;
				isBossWave = currentWave % 10 == 0;
				//Move to next level if current wave = 20
				if (currentWave > 20) {
					startNextLevel();
				}

				//Boss wave
				if (isBossWave) {
					for (var i = 0; i < 1; i++) {
						movex[i] = 0;
						movey[i] = 0;
						currentDir[i] = MOVE_S;
						minion_release[i] = 0;
						minions[i].style.display = "none";
						hpBarMinions[i].style.display = "none";
						hpBarMinions[i].style.width = "30px"
						minions[i].style.backgroundImage = "url('img/min-lv1/boss-up.png')"
						minions[i].style.width = "30px";
						minions[i].style.height = "30px";
						minion_hp[i] = bossHp();
						console.log("Boss Hp: " + minion_hp[i]);
						first_kill[i] = true;
					}
				} else {
					minions[0].style.backgroundImage = "url('img/min-lv1/min-up.png')"
					for (var i = 0; i < minions.length; i++) {
						movex[i] = 0;
						movey[i] = 0;
						currentDir[i] = MOVE_S;
						minion_release[i] = 0;
						minions[i].style.display = "none";
						hpBarMinions[i].style.display = "none";
						hpBarMinions[i].style.width = "20px"
						minions[i].style.backgroundImage = "url('img/min-lv1/min-up.png')"
						minions[i].style.width = "16px";
						minions[i].style.height = "16px";
						minion_hp[i] = minionhp();
						console.log("Minion Hp: " + minion_hp[i]);
						first_kill[i] = true;
					}
				}
			}
		}
	}, 10);
}

function startNextLevel() {
	currentLevel++;
	console.log("Current wave: " + currentWave);
	var oldScore = currentScore;
	//Reset the Level
	resetwave(null);
	startwave(null);
	currentScore = oldScore + 100;

	drawTargetMap(currentLevel);
}

function whereToMove(xpos, ypos, currentDir, minion, c) {
	//Get direction from the minion asset.
	var directionAngle = 0;
	// convert the xpos and ypos to block coordinates
	xpos = (xpos + TILE_W / 2) / TILE_W;
	ypos = (ypos + TILE_H / 2) / TILE_H;

	var xnewpos = Math.floor(xpos);
	var ynewpos = Math.floor(ypos);

	// test out some possible move locations
	switch (currentDir) {
	case MOVE_N:
		directionAngle = 0;
		ynewpos -= 1;
		break;
	case MOVE_S:
		directionAngle = 180;
		ynewpos += 1;
		break;
	case MOVE_E:
		directionAngle = 90;
		xnewpos += 1;
		break;
	case MOVE_W:
		directionAngle = 270;
		xnewpos -= 1;
		break;
	}
	minion.style.transform = "rotate(" + directionAngle + "deg)";

	// are we still on the map?
	if (isRoad(currentLevel, Math.floor(xnewpos), Math.floor(ynewpos))) {
		// ok! keep going in the same direction
		return currentDir;
	}

	// we have fallen off the map! Find out where to go...
	if (isRoad(currentLevel, Math.floor(xpos) + 1, Math.floor(ypos)) && currentDir != -MOVE_E) {
		return MOVE_E;
	}
	if (isRoad(currentLevel, Math.floor(xpos) - 1, Math.floor(ypos)) && currentDir != -MOVE_W) {
		return MOVE_W;
	}
	if (isRoad(currentLevel, Math.floor(xpos), Math.floor(ypos) + 1) && currentDir != -MOVE_S) {
		return MOVE_S;
	}
	if (isRoad(currentLevel, Math.floor(xpos), Math.floor(ypos) - 1) && currentDir != -MOVE_N) {
		return MOVE_N;
	}

	// if all fails, we have reached the end of the map
	return MOVE_END;
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function pausewave(evt) {
	isPaused = !isPaused;
}

function resetwave(evt) {
	if (!isRunning) return;
	isRunning = false;

	// make the start button visible
	var sb = document.getElementById("startbutton");
	sb.innerHTML = "<p> Start! </p>";
	listenEvent(sb, "click", startwave);

	// stop the timers
	clearInterval(interval_id);

	//Hide upgrade info screen
	document.getElementById("registrationForm").style.display = "none";

	// remove all the minions	
	var minions = document.querySelectorAll(".minion");
	var hpBarMinions = document.querySelectorAll(".hpBar");
	for (var i = 0; i < minions.length; i++) {
		document.body.removeChild(minions[i]);
		document.body.removeChild(hpBarMinions[i]);
	}
}

function updateStatus() {
	// update all the status variables
	var cash = document.getElementById("cash");
	cash.innerHTML = "$" + currentCash;

	var score = document.getElementById("score");
	score.innerHTML = currentScore;

	var wave = document.getElementById("wave");
	wave.innerHTML = currentWave;

	var lives = document.getElementById("lives");
	lives.innerHTML = currentLives;

	// highlight turrets we can purchase
	var turrets = document.getElementsByClassName("turret");
	for (var i = 0; i < turrets.length; i++) {
		if (currentCash >= turretValue(turrets[i].getAttribute("type"))) {
			turrets[i].style.opacity = 1;
		} else {
			turrets[i].style.opacity = 0.5;
		}
	}
}

function anyTurretsInRange(minion, x, y) {
	var score = document.getElementById("score");
	var damage = 0;
	for (var i = 0; i < turretPos.length; i++) {
		// get the x and y positions of the turret
		var xt = turretPos[i].x;
		var yt = turretPos[i].y;
		if ((euclidDistance(x, xt, y, yt) <= turretPos[i].range) && turretPos[i].shotCd <= 0) {
			// Check tower id and apply status
			if (turretPos[i].type == "blizzard") {
				// Slow down the enemy
				turretPos[i].htmlElement.style.border = "2px solid rgba(0, 153, 255, 0.5)";
				freezeMinion(minion, 100 + turretPos[i].level);
			} else {
				//Rotate turret to aim the target
				rotateToTarget(minion, turretPos[i].htmlElement);
				if(turretPos[i].type == "machineGun"){
					turretPos[i].htmlElement.style.borderTop = "1px solid #cdfb00";
					turretPos[i].htmlElement.style.borderRadius = "20px/20px";
				}
				if(turretPos[i].type == "laser"){
					turretPos[i].htmlElement.style.borderTop = "1px solid #ff0000";
					turretPos[i].htmlElement.style.borderRadius = "10px/10px";
				}
				if(turretPos[i].type == "flamethrower"){
					turretPos[i].htmlElement.style.borderTop = "8px solid #b00101";
					turretPos[i].htmlElement.style.borderRadius = "10px/10px";
				}
				if(turretPos[i].type == "stormCannon"){
					turretPos[i].htmlElement.style.borderTop = "3px solid #0905eb";
					turretPos[i].htmlElement.style.borderRadius = "20px/20px";
				}
				if (turretPos[i].type == "railCannon") {
					turretPos[i].htmlElement.style.borderTop = "3px solid #6600ff";
					turretPos[i].htmlElement.style.borderRadius = "20px/20px";
					stunMinion(minion, 150 + (turretPos[i].level * 10));
				}
			}
			updateTurretSoundPostShooting(turretPos[i]);
			updateTurretCooldownPostShooting(turretPos[i]);
			damage += turretPos[i].damage; // return the damage
		} else if(turretPos[i].shotCd == 0) {
			rotate(0, turretPos[i].htmlElement);
			resetShotEffect(turretPos[i].htmlElement);
		} else if(turretPos[i].type == "railCannon" && turretPos[i].shotCd < (getTurretShotCooldown(turretPos[i].type, turretPos[i].level)-50)){
			resetShotEffect(turretPos[i].htmlElement);
		}
	}
	if (damage == 0) {
		// nothing in range (@TODO fix this: rotate(0) to move back to initial position)
		//window.addEventListener("resize", rotateToTarget);
		for (var j = 0; j < turretPos.length; j++) {
			if(turretPos[j].shotCd == 0){
				rotate(0, turretPos[j].htmlElement);
			}
		}
	}
	return damage;
}

function resetShotEffect(turret){
	turret.style.borderTop = "1px solid #000000";
	turret.style.border = "1px solid #000000";
	turret.style.borderRadius = "20px/20px";
}

function shoot(minion, x, y) {
	for (var i = 0; i < turretPos.length; i++) {
		// get the x and y positions of the source turret
		var turretX = turretPos[i].x;
		var turretY = turretPos[i].y;

		if (euclidDistance(x, turretX, y, turretY) <= turretPos[i].range) {
			//create projectile
			var projectile = document.createElement("div");
			//projectile.setAttribute("id", turret.id + ":" + turretCounter++);
			projectile.setAttribute("class", "projectile");

			projectile.setAttribute("targetMinionId", minion.getAttribute("id"));
			projectile.style.left = turretX + "px";
			projectile.style.top = turretY + "px";
			//projectile.style.backgroundColor = turretColor("machineGun");
			//projectile.style.backgroundImage = turretImage("machineGun");
			document.body.appendChild(projectile);
		}
	}
}

// Function to calculate the angle between turret and minion
function getAngle(target, looker) {
	var targetRect = target.getBoundingClientRect();
	var lookerRect = looker.getBoundingClientRect();

	var x =  lookerRect.left - targetRect.left;
	var y =  lookerRect.top - targetRect.top;
	var radians = Math.atan2(y, x);
	var angle = (radians * (180 / Math.PI)) - 90;

	return angle;
}

// Function to rotate the turret div to face the minion div
function rotateToTarget(minion, turret) {
	var angle = getAngle(minion, turret);
	turret.style.transform = "rotate(" + angle + "deg)";
}

function rotate(angle, turret){
	turret.style.transform = "rotate(" + angle + "deg)";
}

function euclidDistance(x1, x2, y1, y2) {
	return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

function minionhp() {
	var hpMax = 64 + Math.pow(2, currentWave + 4);
	if (currentWave > 5) {
		hpMax = Math.pow(2, currentWave + 2) * 1.3;
	}
	if (currentWave > 10) {
		hpMax = Math.pow(2, currentWave);
	}
	if (currentWave > 15) {
		hpMax = Math.pow(2, currentWave) * 0.60;
	}
	return hpMax;
}

function bossHp() {
	if (currentWave == 20) {
		return Math.pow(2, currentWave) * 1.5;
	} else {
		return Math.pow(2, currentWave) * 10;
	}
}

function minionreward() {
	return Math.pow(currentWave + 1, 2);
}

function bossReward() {
	return Math.pow(currentWave + 1, 3);
}
////////////////////////// END WAVE HANDLING

window.onload = function () {
	drawMap();
}

//Identify which turret should be upgraded.
function btnUpgradeTurretClick() {
	if (!isRunning || isPaused) {
		return;
	}
	// do we have enough money to make a upgrade?
	for (var i = 0; i < turretPos.length; i++) {
		if(turretPos[i].htmlElement.id == document.getElementById("upgTurretId").value) {
			//Get Current turret upgrade cost.
			var turretUpgradeCost = turretUpgradeCosts(turretPos[i].type, turretPos[i].level);
			if (currentCash > turretUpgradeCost) {
				if(turretPos[i].level <= 4){
					//Level up before upgrade the turret.
					turretPos[i].level++;
					upgradeTurretData(turretPos[i]);
					//Money reduce
					currentCash = currentCash - turretUpgradeCost;
					
					//Update inteface upgrade info.
					updateTurretInfo(turretPos[i]);
					console.log("Turret " + turretName(turretPos[i].type) + " upgraded to Lv " + turretPos[i].level + ".");
					console.log("New damage is " + turretPos[i].damage + " and range is " + turretPos[i].range);
				} 
			} else {
				console.log("Not enough cash: " +  currentCash + ", upgrade: " + turretUpgradeCost);
			}
			break;
		}
	}
}

//Identify which turret should be sold.
function btnSellTurretClick(){
	if (!isRunning || isPaused) {
		return;
	}
	for (var i = 0; i < turretPos.length; i++) {
		if(turretPos[i].htmlElement.id == document.getElementById("upgTurretId").value) {
			//Get Current turret upgrade sell price.
			var turretSellPrice = getTurretSellPrice(turretPos[i].type, turretUpgradeCosts(turretPos[i].type, turretPos[i].level - 1));
		  
			console.log("Turret " + turretName(turretPos[i].type) + " sold for " + turretSellPrice + ".");
			//Hide upgrade info screen
			document.getElementById("registrationForm").style.display = "none";
			//Remove selected turret.
			document.body.removeChild(turretPos[i].htmlElement);
			turretPos.splice(i, 1);
			//Increases money.
			currentCash += turretSellPrice;
		}
	}
}