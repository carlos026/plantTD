// global state
var turretCounter = 0;
var isRunning = false;
var isPaused = false;
var rangeIndicator = null;
var isDraggingNewTurret = false;
var minion_count = 16;
var currentWaveEnemyCount = 12;
var interval_id = null;
var currentWave = 0;
var isBossWave = 0;
var currentLevel = 6;
var currentLives = 15;
var currentCash = 20;
var currentScore = 0;
var turretPos = new Array();
var timeLapsesSinceLastShot = 1;
var blizzardPendingDamage = {};
var pendingMissileHits = {};
var soundtrack = new Audio("sound/map1Soundtrack.mp3");

// enemy info dialog state
var selectedMinionIdx = -1;
var selectedMinionEl = null;
var selectedHpBarEl = null;

// damage stats panel state
var damageStatsTick = 0;

////////////////////// RANGE INDICATOR
function hexToRgba(hex, alpha) {
	var r = parseInt(hex.slice(1, 3), 16);
	var g = parseInt(hex.slice(3, 5), 16);
	var b = parseInt(hex.slice(5, 7), 16);
	return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
}

function showRangeIndicator(cx, cy, range, color) {
	hideRangeIndicator();
	var el = document.createElement("div");
	el.id = "rangeIndicator";
	el.className = "range-indicator";
	var diameter = range * 2;
	el.style.width           = diameter + "px";
	el.style.height          = diameter + "px";
	el.style.left            = cx + "px";
	el.style.top             = cy + "px";
	el.style.borderColor     = color;
	el.style.backgroundColor = hexToRgba(color, 0.07);
	el.style.boxShadow       = "0 0 8px " + hexToRgba(color, 0.35) + ", inset 0 0 16px " + hexToRgba(color, 0.1);
	document.body.appendChild(el);
	rangeIndicator = el;
}

function hideRangeIndicator() {
	if (rangeIndicator && rangeIndicator.parentNode) {
		document.body.removeChild(rangeIndicator);
	}
	rangeIndicator = null;
}
////////////////////// END RANGE INDICATOR

////////////////////// ENEMY INFO DIALOG
function showEnemyInfoDialog(idx, minionEl, hpBarEl) {
	var dialog = document.getElementById("enemyInfoDialog");
	if (selectedMinionIdx === idx && dialog.style.display !== "none") {
		dialog.style.display = "none";
		selectedMinionIdx = -1;
		selectedMinionEl = null;
		selectedHpBarEl = null;
		return;
	}
	selectedMinionIdx = idx;
	selectedMinionEl = minionEl;
	selectedHpBarEl = hpBarEl;
	updateEnemyInfoDialog();
	dialog.style.display = "block";
}

function updateEnemyInfoDialog() {
	if (selectedMinionIdx < 0 || !selectedMinionEl || !selectedHpBarEl) return;
	var dialog = document.getElementById("enemyInfoDialog");
	if (selectedMinionEl.style.display === "none") {
		dialog.style.display = "none";
		selectedMinionIdx = -1;
		selectedMinionEl = null;
		selectedHpBarEl = null;
		return;
	}
	var currentHp = Math.max(0, parseFloat(selectedHpBarEl.getAttribute("value")) || 0);
	var maxHp = parseFloat(selectedHpBarEl.getAttribute("max")) || 1;
	var speed = getMinionSpeed(selectedMinionEl);
	var isPlane = isPlaneMinion(selectedMinionEl);
	var name = isBossWave ? "Boss" : isPlane ? "Airplane" : "Minion";

	document.getElementById("enemyName").innerText = name;
	var hpBar = document.getElementById("enemyHpBar");
	hpBar.value = currentHp;
	hpBar.max = maxHp;
	document.getElementById("enemyHpText").innerText = Math.ceil(currentHp) + " / " + Math.ceil(maxHp);

	var speedLabel;
	if (speed === 0) {
		speedLabel = "0 (Stunned)";
	} else if (speed === 0.5) {
		speedLabel = "0.5 (Frozen)";
	} else if (isPlane && speed === PLANE_FROZEN_SPEED) {
		speedLabel = PLANE_FROZEN_SPEED.toFixed(1) + " (Frozen)";
	} else {
		speedLabel = speed.toFixed(1);
	}
	document.getElementById("enemySpeed").innerText = speedLabel;
}

function hideEnemyInfoDialog() {
	document.getElementById("enemyInfoDialog").style.display = "none";
	selectedMinionIdx = -1;
	selectedMinionEl = null;
	selectedHpBarEl = null;
}
////////////////////// END ENEMY INFO DIALOG

////////////////////// TURRET SHOP INFO DIALOG
var shopInfoOpenType = null;

function showShopTurretInfo(type) {
	var dialog = document.getElementById("turretShopInfoDialog");
	if (shopInfoOpenType === type && dialog.style.display !== "none") {
		dialog.style.display = "none";
		shopInfoOpenType = null;
		return;
	}
	shopInfoOpenType = type;
	document.getElementById("shopInfoName").innerText = turretName(type);
	document.getElementById("shopInfoDesc").innerText = turretDescription(type);
	document.getElementById("shopInfoDamage").innerText = turretDamage(type);
	document.getElementById("shopInfoRange").innerText = (turretRange(type) / 15) + " tiles";
	document.getElementById("shopInfoCooldown").innerText = (getTurretShotCooldown(type, 1) / 100).toFixed(2) + " s";
	document.getElementById("shopInfoCost").innerText = "$" + turretValue(type);
	dialog.style.display = "block";
}
////////////////////// END TURRET SHOP INFO DIALOG

////////////////////// STORM CANNON OVERHEAT
function destroyOverheatedStormCannon(idx) {
	document.getElementById("registrationForm").style.display = "none";
	hideRangeIndicator();
	document.body.removeChild(turretPos[idx].overheatBar);
	document.body.removeChild(turretPos[idx].htmlElement);
	turretPos.splice(idx, 1);
}
////////////////////// END STORM CANNON OVERHEAT

////////////////////// DAMAGE STATS PANEL
function showDamageStatsPanel() {
	var panel = document.getElementById("damageStatsPanel");
	if (panel.style.display === "none") {
		updateDamageStatsPanel(true);
		panel.style.display = "block";
	} else {
		panel.style.display = "none";
	}
}

function updateDamageStatsPanel(force) {
	var panel = document.getElementById("damageStatsPanel");
	if (panel.style.display === "none") return;
	damageStatsTick++;
	if (!force && damageStatsTick % 30 !== 0) return;

	// aggregate totalDamage by tower type
	var byType = {};
	for (var i = 0; i < turretPos.length; i++) {
		var type = turretPos[i].type;
		byType[type] = (byType[type] || 0) + turretPos[i].totalDamage;
	}

	var entries = [];
	for (var type in byType) {
		entries.push({ type: type, totalDamage: byType[type] });
	}
	entries.sort(function(a, b) { return b.totalDamage - a.totalDamage; });

	var list = document.getElementById("damageStatsList");
	list.innerHTML = "";

	if (entries.length === 0) {
		list.innerHTML = '<div class="dmg-empty">No turrets placed yet.</div>';
		return;
	}

	var maxDmg = entries[0].totalDamage || 0;
	for (var i = 0; i < entries.length; i++) {
		var e = entries[i];
		var pct = maxDmg > 0 ? Math.round(e.totalDamage / maxDmg * 100) : 0;
		var entry = document.createElement("div");
		entry.className = "dmg-entry" + (i === 0 && maxDmg > 0 ? " dmg-top" : "");
		entry.innerHTML =
			'<div class="dmg-rank">#' + (i + 1) + '</div>' +
			'<div class="dmg-info">' +
				'<span class="dmg-name">' + turretName(e.type) + '</span>' +
				'<div class="dmg-bar-wrap">' +
					'<div class="dmg-bar" style="width:' + pct + '%;background:' + turretColor(e.type) + '"></div>' +
				'</div>' +
				'<span class="dmg-value">' + formatDamage(e.totalDamage) + '</span>' +
			'</div>';
		list.appendChild(entry);
	}
}

function formatDamage(n) {
	if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
	if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
	return Math.round(n).toString();
}
////////////////////// END DAMAGE STATS PANEL

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

		var scale = getMobileScale();
		if (evt.pageX) {
			x = evt.pageX / scale;
			y = evt.pageY / scale;
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
			x = (evt.clientX + offsetX) / scale;
			y = (evt.clientY + offsetY) / scale;
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

		// mostra range indicator durante o drag
		isDraggingNewTurret = true;
		showRangeIndicator(x, y, turretRange(turretType), turretColor(turretType));

		// ao soltar (com ou sem drop válido), limpa o indicator
		listenEvent(turretD, "dragend", function() {
			isDraggingNewTurret = false;
			hideRangeIndicator();
		});

		// reduce our available cash by what we just spent
		currentCash -= turretValue(turretType);
	}
	return tclick;
}

function placeTurretAtMapzone(mapzone, x, y, turretEl) {
	if (isRoad(currentLevel, x, y)) return false;

	turretEl.style.left = mapzone.style.left;
	turretEl.style.top  = mapzone.style.top;

	var xPos = mapzone.style.left.replace(/\D/g, "");
	var yPos = mapzone.style.top.replace(/\D/g, "");
	var turretType = turretEl.id.substring(0, turretEl.id.indexOf(":"));

	var turretObj = {
		range:     turretRange(turretType),
		damage:    turretDamage(turretType),
		type:      turretType,
		x:         xPos,
		y:         yPos,
		htmlElement: turretEl,
		level:     1,
		shotCd:    0,
		audioCd:   0,
		audioFile: turretSoundEffect(turretType),
		totalDamage: 0
	};
	if (turretType === "missile") {
		turretObj.audioFileImpact = new Audio("sound/missileImpact.mp3");
		turretObj.pendingMissiles = [];
		turretObj.planeInRange = false;
		turretObj.ammo = getMissileMaxAmmo(1);
		turretObj.ammoLoading = false;
		turretObj.ammoLoadTick = 0;
		turretObj.ammoLoadBar = null;
	}
	if (turretType === "stormCannon") {
		turretObj.active = true;
		turretObj.overheat = 0;
		turretObj.overheatCoolTick = 0;
		turretObj.firedThisTurn = false;
		var overheatBar = document.createElement("progress");
		overheatBar.setAttribute("class", "overheat-bar");
		overheatBar.setAttribute("value", 0);
		overheatBar.setAttribute("max", STORM_OVERHEAT_MAX);
		overheatBar.style.left = xPos + "px";
		overheatBar.style.top  = (parseInt(yPos) + 16) + "px";
		document.body.appendChild(overheatBar);
		turretObj.overheatBar = overheatBar;
	}
	turretPos[turretPos.length] = turretObj;
	listenEvent(turretEl, "click", showTurretInfo(turretPos[turretPos.length - 1]));
	turretEl.setAttribute("draggable", "false");
	listenEvent(turretEl, "dragstart", nodrag);
	isDraggingNewTurret = false;
	hideRangeIndicator();
	return true;
}

function mapDrop(mapzone, x, y) {
	function drop(evt) {
		cancelPropogation(evt);
		evt = evt || window.event;
		evt.dataTransfer.dropEffect = 'copy';
		var id = evt.dataTransfer.getData("Text");
		var turretEl = document.getElementById(id);
		placeTurretAtMapzone(mapzone, x, y, turretEl);
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
	// Isolate all map tiles in their own GPU compositor layer.
	// This prevents minion position changes from triggering repaints of the 2400 map tiles.
	var mapContainer = document.createElement("div");
	mapContainer.id = "mapContainer";
	mapContainer.style.position = "absolute";
	mapContainer.style.top = "0";
	mapContainer.style.left = "0";
	mapContainer.style.willChange = "transform";
	document.body.appendChild(mapContainer);

	// create the map zone
	for (var j = 0; j < MAP_H; j++) {
		for (var i = 0; i < MAP_W; i++) {
			var mapzone = document.createElement("div");
			mapzone.setAttribute("id", "mapzone" + i);
			mapzone.setAttribute("class", "mapzone");
			mapzone.style.left = TILE_H * i + "px";
			mapzone.style.top = TILE_W * j + "px";
			mapzone.dataset.mapX = i;
			mapzone.dataset.mapY = j;
			listenEvent(mapzone, "drop", mapDrop(mapzone, i, j));
			listenEvent(mapzone, "dragenter", cancelEvent(i, j));
			listenEvent(mapzone, "dragover", dragOver(i, j));
			mapContainer.appendChild(mapzone);
		}
	}
	drawTargetMap(currentLevel);

	// create the turrets
	var turretTypes = getTurretTypes();
	for (var k = 0; k < turretTypes.length; k++) {
		var turret = document.createElement("div");
		turret.setAttribute("type", turretTypes[k]);
		turret.setAttribute("class", "turret");
		turret.style.left = TURRET_OFFSET + (TURRET_D + TURRET_GAP) * k + "px";
		turret.style.borderColor = turretColor(turret.getAttribute("type"));
		turret.innerHTML = '<div class="turret-icon" style="background-image:' + turretImage(turretTypes[k]) + ';"></div><span class="turret-cost">$' + turretValue(turretTypes[k]) + '</span>';

		// turrets are draggable (desktop: click; mobile: touch)
		listenEvent(turret, "click", turretClick(turret));
		initTouchDragForCard(turret);
		document.body.appendChild(turret);

		// info button below each turret card
		var infoBtn = document.createElement("button");
		infoBtn.setAttribute("class", "turret-shop-info-btn");
		infoBtn.style.left = turret.style.left;
		infoBtn.innerHTML = "&#9432;";
		listenEvent(infoBtn, "click", (function(t) {
			return function(e) {
				e.stopPropagation();
				showShopTurretInfo(t);
			};
		})(turretTypes[k]));
		document.body.appendChild(infoBtn);
	}

	// put a start button on
	var startbutton = document.createElement("div");
	startbutton.setAttribute("id", "startbutton");
	startbutton.setAttribute("class", "startbutton");
	startbutton.innerHTML = "&#9654; START";
	listenEvent(startbutton, "click", startwave);
	document.body.appendChild(startbutton);

	// reset button
	var resetbutton = document.createElement("div");
	resetbutton.setAttribute("id", "resetbutton");
	resetbutton.setAttribute("class", "resetbutton");
	resetbutton.innerHTML = "&#8635; RESET";
	listenEvent(resetbutton, "click", resetwave);
	document.body.appendChild(resetbutton);

	// damage stats button
	var statsbutton = document.createElement("div");
	statsbutton.setAttribute("id", "statsbutton");
	statsbutton.setAttribute("class", "statsbutton");
	statsbutton.innerHTML = "&#9881; DMG STATS";
	listenEvent(statsbutton, "click", showDamageStatsPanel);
	document.body.appendChild(statsbutton);

	// status  bar
	var statusbar = document.createElement("div");
	statusbar.setAttribute("id", "statusbar");
	statusbar.setAttribute("class", "statusbar");
	statusbar.innerHTML =
		'<div class="stat-block"><span class="stat-label">Cash</span><span class="stat-value gold" id="cash">$0</span></div>' +
		'<div class="stat-block"><span class="stat-label">Score</span><span class="stat-value score" id="score">0</span></div>' +
		'<div class="stat-block"><span class="stat-label">Wave</span><span class="stat-value wave" id="wave">0</span></div>' +
		'<div class="stat-block"><span class="stat-label">Lives</span><span class="stat-value lives" id="lives">0</span></div>';
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
		var x = Math.floor(mapzone.style.left.replace("px", "") / TILE_H);
		var y = Math.floor(mapzone.style.top.replace("px", "") / TILE_W);

		if (isRoad(targetLevel, x, y)) {
			var roadColor = "#2a3b5c";
			var roadGrad = "linear-gradient(45deg, rgba(255,255,255,0.02) 25%, transparent 25%)";
			
			switch(targetLevel) {
				case 1: roadColor = "#3d5585"; break;
				case 2: roadColor = "#3d2b1f"; break; // Caminho de terra escura
				case 3: roadColor = "#0f4938"; break;
				case 4: roadColor = "#222222"; break;
				case 5: roadColor = "#19191a"; break;
				case 6: roadColor = "#8dc0f0"; break;
			}
			mapzone.style.backgroundColor = roadColor;
			mapzone.style.backgroundImage = roadGrad;
			mapzone.style.boxShadow = "inset 0 0 5px rgba(0,0,0,0.3)";
		} else {
			var groundColor = "#0b1035";
			var groundGrad = "radial-gradient(circle, #101644 0%, #0b1035 100%)"; // Tema Level 1

			switch(targetLevel) {
				case 2:
					groundColor = "#8b6b43"; // Desert/Wasteland
					groundGrad = "radial-gradient(circle, #a68555 0%, #8b6b43 100%)";
				break;
				case 3:
					groundColor = "#0b2410"; // Swamp/Forest
					groundGrad = "radial-gradient(circle, #153d1b 0%, #0b2410 100%)";
				break;
				case 4:
					groundColor = "#5a1202"; // Inferno
					groundGrad = "radial-gradient(circle, #7a1a05 0%, #5a1202 100%)";
				break;
				case 5:
					groundColor = "#45534c"; // Void
					groundGrad = "radial-gradient(circle, #232725 0%, #434444 100%)";
				break;
				case 6:
					groundColor = "#86e7ff"; // Blizzard
					groundGrad = "radial-gradient(circle, #d1fdfd 0%, #acf1ff 100%)";
				break;
			}
			mapzone.style.backgroundColor = groundColor;
			mapzone.style.backgroundImage = groundGrad;
			mapzone.style.boxShadow = "inset 0 0 1px rgba(255,255,255,0.05)";
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
	sb.innerHTML = "&#9646;&#9646; PAUSE";
	listenEvent(sb, "click", pausewave);
	// reset globals	
	currentWave = 0;
	currentLives = 15;
	currentCash = 20;
	currentScore = 0;
	turretPos = new Array();

	// increase the wave count
	currentWave++;

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
		listenEvent(minion, "click", (function(idx, mEl, hEl) {
			return function() {
				if (!isRunning || isPaused) return;
				showEnemyInfoDialog(idx, mEl, hEl);
			};
		})(i, minion, hpBarMinion));
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
	var tickCount = 0;
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
			blizzardPendingDamage = {};
			processPendingMissiles();
			updateMissileTurretPlaneFlags(minions, movex, movey);
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
					if (minions_killed == currentWaveEnemyCount || (isBossWave && minions_killed == 1)) {
						// wave over!
						wave_over = true;
					}
					continue;
				}

				//Projectile's creation happens once every 50 times the common interval.
				//if (timeLapsesSinceLastShot == SHOOT_COOLDOWN && minions[i].style.display != 'none') {
					//shoot(minions[i], movex[i], movey[i]);
				//}

				// are there any turrets in range? @TODO status
				var damage = 0;
				if(minions[i].style.display != 'none'){
					damage = anyTurretsInRange(minions[i], movex[i], movey[i]);
				}
				var blizzAoe = blizzardPendingDamage[minions[i].id] || 0;
				if (blizzAoe > 0) {
					damage += blizzAoe;
					delete blizzardPendingDamage[minions[i].id];
				}
				var missileHit = pendingMissileHits[minions[i].id] || 0;
				if (missileHit > 0) {
					damage += missileHit;
					delete pendingMissileHits[minions[i].id];
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
						if (minions_killed == currentWaveEnemyCount || (isBossWave && minions_killed == 1)) {
							// wave over!
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
				if ((minion_release[i] == 100 * minion_c) && minion_c < currentWaveEnemyCount) {
					minion_c++;
				}
				minion_release[i]++;
			}
			updateTurretCooldownPostTurn(turretPos);
			//moveProjectiles();
			//Reset count since last shot (projectile related)
			/*if (timeLapsesSinceLastShot == SHOOT_COOLDOWN) {
				timeLapsesSinceLastShot = 0;
			}*/
		  
			// update the status — throttled to 1x per 6 ticks (~60ms)
			tickCount++;
			if (tickCount >= 6) {
				updateStatus();
				tickCount = 0;
			}
			updateEnemyInfoDialog();
			updateDamageStatsPanel(false);

			// is the wave over?
			if (wave_over) {
				if (currentLives == 0) {
					var lives = document.getElementById("lives");
					lives.innerHTML = "Game Over";
					resetwave(null);
				}
				// reset for the next wave!
				minion_c = 1;
				minions_killed = 0;
				wave_over = false;
				currentWave++;
				isBossWave = currentWave % 10 == 0;
				if (!isBossWave) {
					currentWaveEnemyCount = currentWave >= 10
						? Math.floor(Math.random() * 7) + 10
						: 12;
				}
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
						first_kill[i] = true;
						minions[i]._isPlane = false;
						removeDebuffs(minions[i], hpBarMinions[i]);
					}
				} else {
					for (var i = 0; i < minions.length; i++) {
						movex[i] = 0;
						movey[i] = 0;
						currentDir[i] = MOVE_S;
						minion_release[i] = 0;
						minions[i].style.display = "none";
						hpBarMinions[i].style.display = "none";
						hpBarMinions[i].style.width = "20px";
						minions[i].style.width = "16px";
						minions[i].style.height = "16px";
						minion_hp[i] = minionhp();
						first_kill[i] = true;
						removeDebuffs(minions[i], hpBarMinions[i]);
						var usePlane = currentWave >= 11 && Math.random() < 0.5;
						if (usePlane) {
							minions[i]._isPlane = true;
							minions[i].style.backgroundImage = "url('img/pla-lv2/pla-up.png')";
						} else {
							minions[i]._isPlane = false;
							minions[i].style.backgroundImage = "url('img/min-lv1/min-up.png')";
						}
					}
				}
			}
		}
	}, 10);
}

function startNextLevel() {
	currentLevel++;
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
	sb.innerHTML = "&#9654; START";
	listenEvent(sb, "click", startwave);

	// stop the timers
	clearInterval(interval_id);

	//Hide upgrade info screen
	document.getElementById("registrationForm").style.display = "none";
	hideRangeIndicator();
	hideEnemyInfoDialog();

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

function processPendingMissiles() {
	for (var i = 0; i < turretPos.length; i++) {
		if (turretPos[i].type !== "missile" || !turretPos[i].pendingMissiles) continue;
		var remaining = [];
		for (var j = 0; j < turretPos[i].pendingMissiles.length; j++) {
			var missile = turretPos[i].pendingMissiles[j];
			missile.timer--;
			if (missile.projectileEl) {
				var progress = 1 - missile.timer / 80;
				var tgtX = parseFloat(missile.minionElement.style.left) + 8;
				var tgtY = parseFloat(missile.minionElement.style.top)  + 8;
				var curX = missile.startX + (tgtX - missile.startX) * progress;
				var curY = missile.startY + (tgtY - missile.startY) * progress;
				missile.projectileEl.style.left = curX + "px";
				missile.projectileEl.style.top  = curY + "px";
				var angle = Math.atan2(tgtY - curY, tgtX - curX) * 180 / Math.PI - 90;
				missile.projectileEl.style.transform = "translate(-50%, -50%) rotate(" + angle + "deg)";
			}
			if (missile.timer <= 0) {
				if (missile.projectileEl && missile.projectileEl.parentNode) {
					document.body.removeChild(missile.projectileEl);
				}
				pendingMissileHits[missile.minionElement.id] = (pendingMissileHits[missile.minionElement.id] || 0) + missile.damage;
				turretPos[i].totalDamage += missile.damage;
				turretPos[i].audioFileImpact.currentTime = 0;
				turretPos[i].audioFileImpact.play();
				createMissileImpact(missile.minionElement);
			} else {
				remaining.push(missile);
			}
		}
		turretPos[i].pendingMissiles = remaining;
	}
}

function createMissileImpact(minionEl) {
	var x = parseFloat(minionEl.style.left) || 0;
	var y = parseFloat(minionEl.style.top)  || 0;
	var impact = document.createElement("div");
	impact.className = "missile-impact";
	impact.style.left = (x + 8) + "px";
	impact.style.top  = (y + 8) + "px";
	document.body.appendChild(impact);
	setTimeout(function() {
		if (impact.parentNode) document.body.removeChild(impact);
	}, 600);
}

function updateMissileTurretPlaneFlags(minions, movex, movey) {
	for (var i = 0; i < turretPos.length; i++) {
		if (turretPos[i].type === "missile") turretPos[i].planeInRange = false;
	}
	for (var j = 0; j < minions.length; j++) {
		if (minions[j].style.display === "none") continue;
		if (!isPlaneMinion(minions[j])) continue;
		for (var i = 0; i < turretPos.length; i++) {
			if (turretPos[i].type !== "missile" || turretPos[i].shotCd > 0) continue;
			if (euclidDistance(movex[j], turretPos[i].x, movey[j], turretPos[i].y) <= turretPos[i].range) {
				turretPos[i].planeInRange = true;
			}
		}
	}
}

function anyTurretsInRange(minion, x, y) {
	var damage = 0;
	for (var i = 0; i < turretPos.length; i++) {
		var xt = turretPos[i].x;
		var yt = turretPos[i].y;

		// Blizzard dispara em área — trata separado para não re-disparar por minion
		if (turretPos[i].type == "blizzard") {
			var inRange = euclidDistance(x, xt, y, yt) <= turretPos[i].range;
			if (inRange && turretPos[i].shotCd === 0) {
				var aoeMinions = document.getElementsByClassName("minion");
				var aoeHits = 0;
				for (var m = 0; m < aoeMinions.length; m++) {
					if (aoeMinions[m].style.display === "none") continue;
					var mx = parseFloat(aoeMinions[m].style.left) || 0;
					var my = parseFloat(aoeMinions[m].style.top)  || 0;
					if (euclidDistance(mx, xt, my, yt) <= turretPos[i].range) {
						freezeMinion(aoeMinions[m], 100 + turretPos[i].level);
						blizzardPendingDamage[aoeMinions[m].id] = (blizzardPendingDamage[aoeMinions[m].id] || 0) + turretPos[i].damage;
						aoeHits++;
					}
				}
				createFrostBurst(turretPos[i]);
				turretPos[i].htmlElement.classList.add("blizzard-firing");
				(function(el) {
					setTimeout(function() { el.classList.remove("blizzard-firing"); }, 650);
				})(turretPos[i].htmlElement);
				updateTurretSoundPostShooting(turretPos[i]);
				turretPos[i].totalDamage += turretPos[i].damage * Math.max(1, aoeHits);
				turretPos[i].shotCd = getTurretShotCooldown(turretPos[i].type, turretPos[i].level);
			}
			if (inRange) {
				turretPos[i].htmlElement.style.border = "2px solid rgba(0, 153, 255, 0.5)";
			} else if (turretPos[i].shotCd === 0) {
				resetShotEffect(turretPos[i].htmlElement);
			}
			continue;
		}

		if (turretPos[i].type === "flamethrower" && isPlaneMinion(minion)) {
			continue;
		}

		if (turretPos[i].type === "stormCannon" && turretPos[i].active === false) {
			continue;
		}

		if (turretPos[i].type === "missile") {
			if (!isPlaneMinion(minion) && turretPos[i].planeInRange) continue;
			if (turretPos[i].ammo <= 0) continue;
			if (euclidDistance(x, xt, y, yt) <= turretPos[i].range && turretPos[i].shotCd <= 0) {
				rotateToTarget(x, y, parseInt(turretPos[i].x), parseInt(turretPos[i].y), turretPos[i].htmlElement);
				//turretPos[i].htmlElement.style.borderTop = "3px solid #FFD700";
				turretPos[i].htmlElement.style.borderRadius = "20px/20px";
				var missileDmg = turretPos[i].damage;
				if (isPlaneMinion(minion)) missileDmg *= 5;
				turretPos[i].audioFile.currentTime = 0;
				turretPos[i].audioFile.play();
				turretPos[i].ammo--;
				var projStartX = parseInt(turretPos[i].x) + 8;
				var projStartY = parseInt(turretPos[i].y) + 8;
				var projEl = document.createElement("div");
				projEl.className = "missile-projectile";
				projEl.style.left = projStartX + "px";
				projEl.style.top  = projStartY + "px";
				projEl.style.transform = "translate(-50%, -50%)";
				document.body.appendChild(projEl);
				turretPos[i].pendingMissiles.push({ minionElement: minion, damage: missileDmg, timer: 80, projectileEl: projEl, startX: projStartX, startY: projStartY });
				updateTurretCooldownPostShooting(turretPos[i]);
			} else if (turretPos[i].shotCd === 0) {
				rotate(0, turretPos[i].htmlElement);
				resetShotEffect(turretPos[i].htmlElement);
			}
			continue;
		}

		if ((euclidDistance(x, xt, y, yt) <= turretPos[i].range) && turretPos[i].shotCd <= 0) {
			rotateToTarget(x, y, parseInt(turretPos[i].x), parseInt(turretPos[i].y), turretPos[i].htmlElement);
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
			if(turretPos[i].type == "toxic"){
				turretPos[i].htmlElement.style.borderTop = "3px solid #4CAF50";
				turretPos[i].htmlElement.style.borderRadius = "20px/20px";
			}
			if (turretPos[i].type == "railCannon") {
				turretPos[i].htmlElement.style.borderTop = "3px solid #6600ff";
				turretPos[i].htmlElement.style.borderRadius = "20px/20px";
				stunMinion(minion, 150 + (turretPos[i].level * 10));
			}
			var triggerDmg = shootingTrigger(turretPos[i], minion, turretPos[i].htmlElement.style);
			var shotTotal = triggerDmg + turretPos[i].damage;
			if (isPlaneMinion(minion) &&
				(turretPos[i].type === "machineGun" || turretPos[i].type === "laser" || turretPos[i].type === "railCannon")) {
				shotTotal *= 2;
			}
			turretPos[i].totalDamage += shotTotal;
			damage = shotTotal;
			updateTurretSoundPostShooting(turretPos[i]);
			updateTurretCooldownPostShooting(turretPos[i]);
			if (turretPos[i].type === "stormCannon") {
				turretPos[i].firedThisTurn = true;
				turretPos[i].overheat += STORM_OVERHEAT_PER_SHOT;
				turretPos[i].overheatCoolTick = getTurretShotCooldown("stormCannon", 1);
				turretPos[i].overheatBar.setAttribute("value", turretPos[i].overheat);
				if (turretPos[i].overheat >= STORM_OVERHEAT_MAX) {
					destroyOverheatedStormCannon(i);
					i--;
					continue;
				}
			}
		} else if(turretPos[i].shotCd == 0) {
			rotate(0, turretPos[i].htmlElement);
			resetShotEffect(turretPos[i].htmlElement);
		} else if(turretPos[i].type == "railCannon" && turretPos[i].shotCd < (getTurretShotCooldown(turretPos[i].type, turretPos[i].level)-50)){
			resetShotEffect(turretPos[i].htmlElement);
		}
	}
	if (damage == 0) {
		for (var j = 0; j < turretPos.length; j++) {
			if(turretPos[j].shotCd == 0){
				rotate(0, turretPos[j].htmlElement);
			}
		}
	}
	var toxicDmg = getToxicDamage(minion);
	if (toxicDmg > 0) {
		for (var t = 0; t < turretPos.length; t++) {
			if (turretPos[t].type === "toxic") {
				turretPos[t].totalDamage += toxicDmg;
				break;
			}
		}
	}
	return damage + toxicDmg;
}

function createFrostBurst(turretObj) {
	var burst = document.createElement("div");
	burst.className = "frost-burst";
	var diameter = turretObj.range * 2;
	var centerX = parseInt(turretObj.x) + 8;
	var centerY = parseInt(turretObj.y) + 8;
	burst.style.width  = diameter + "px";
	burst.style.height = diameter + "px";
	burst.style.left   = centerX + "px";
	burst.style.top    = centerY + "px";
	document.body.appendChild(burst);
	setTimeout(function() {
		if (burst.parentNode) document.body.removeChild(burst);
	}, 680);
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

function rotateToTarget(minionX, minionY, turretX, turretY, turretEl) {
	var dx = turretX - minionX;
	var dy = turretY - minionY;
	var angle = (Math.atan2(dy, dx) * (180 / Math.PI)) - 90;
	turretEl.style.transform = "rotate(" + angle + "deg)";
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
	if (currentWave > 17) {
		hpMax = Math.pow(2, currentWave) * 0.40;
	}
	return hpMax;
}

function bossHp() {
	if (currentWave == 20) {
		return Math.pow(2, currentWave);
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
	applyGameScale();
	window.addEventListener('resize', applyGameScale);

	drawMap();

	// atualiza posição do range indicator enquanto arrasta uma nova torre (desktop)
	document.addEventListener("dragover", function(e) {
		if (isDraggingNewTurret && rangeIndicator) {
			var scale = getMobileScale();
			var px = (e.pageX || e.clientX) / scale;
			var py = (e.pageY || e.clientY) / scale;
			if (px > 0 || py > 0) {
				rangeIndicator.style.left = px + "px";
				rangeIndicator.style.top  = py + "px";
			}
		}
	});
}

//Identify which turret should be upgraded.
function btnUpgradeTurretClick() {
	if (!isRunning || isPaused) {
		return;
	}
	
	// do we have enough money to make a upgrade?
	for (var i = 0; i < turretPos.length; i++) {
		document.getElementById("upgBtn").style.display = turretPos[i].level <= 3 ? "block" : "none";
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
					showRangeIndicator(
						parseInt(turretPos[i].x) + 8,
						parseInt(turretPos[i].y) + 8,
						turretPos[i].range,
						turretColor(turretPos[i].type)
					);
				} 
			} else {
				//TODO: ALERT USER
				console.log("Not enough cash: " +  currentCash + ", upgrade: " + turretUpgradeCost);
			}
			break;
		}
	}
}

function btnBuyAmmoClick() {
	if (!isRunning || isPaused) return;
	var turretId = document.getElementById("upgTurretId").value;
	for (var i = 0; i < turretPos.length; i++) {
		if (turretPos[i].htmlElement.id !== turretId || turretPos[i].type !== "missile") continue;
		if (turretPos[i].ammoLoading) return;
		if (currentCash < 50) return;
		if (turretPos[i].ammo >= getMissileMaxAmmo(turretPos[i].level)) return;
		currentCash -= 50;
		turretPos[i].ammoLoading = true;
		turretPos[i].ammoLoadTick = 500;
		var loadBar = document.createElement("progress");
		loadBar.setAttribute("class", "ammo-load-bar");
		loadBar.setAttribute("value", 0);
		loadBar.setAttribute("max", 500);
		loadBar.style.left = turretPos[i].x + "px";
		loadBar.style.top  = (parseInt(turretPos[i].y) + 22) + "px";
		document.body.appendChild(loadBar);
		turretPos[i].ammoLoadBar = loadBar;
		updateTurretInfo(turretPos[i]);
		break;
	}
}

function toggleStormCannon() {
	var turretId = document.getElementById("upgTurretId").value;
	for (var i = 0; i < turretPos.length; i++) {
		if (turretPos[i].htmlElement.id === turretId && turretPos[i].type === "stormCannon") {
			turretPos[i].active = !turretPos[i].active;
			var btn = document.getElementById("stormToggleBtn");
			if (turretPos[i].active) {
				btn.textContent = "On";
				btn.className = "storm-toggle-btn storm-toggle-on";
			} else {
				btn.textContent = "Off";
				btn.className = "storm-toggle-btn storm-toggle-off";
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
			hideRangeIndicator();
			//Remove selected turret.
			if (turretPos[i].overheatBar) {
				document.body.removeChild(turretPos[i].overheatBar);
			}
			if (turretPos[i].ammoLoadBar) {
				document.body.removeChild(turretPos[i].ammoLoadBar);
			}
			if (turretPos[i].pendingMissiles) {
				for (var p = 0; p < turretPos[i].pendingMissiles.length; p++) {
					var pm = turretPos[i].pendingMissiles[p];
					if (pm.projectileEl && pm.projectileEl.parentNode) {
						document.body.removeChild(pm.projectileEl);
					}
				}
			}
			document.body.removeChild(turretPos[i].htmlElement);
			turretPos.splice(i, 1);
			//Increases money.
			currentCash += turretSellPrice;
		}
	}
}