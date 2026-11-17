// global state
var turretCounter = 0;
var isRunning = false;
var isPaused = false;
var branchTurret = null; // turret waiting for its branch choice; the game loop is halted while set
var rangeIndicator = null;
var isDraggingNewTurret = false;
var draggedTurretEl = null; // turret being dragged from the shop (set on dragstart)
var minion_count = MAX_WAVE_ENEMIES;
var currentWaveEnemyCount = 12;
var interval_id = null;
// game speed multiplier: 1 = normal, 2 = double speed
var gameSpeed = 1;
var GAME_SPEEDS = [1, 2];
var currentWave = 0;
var isBossWave = 0;
var currentLevel = 5;
var currentLives = 15;
var currentCash = 100;
var currentScore = 0;
var currentGoldSeed = 0;
var turretPos = new Array();
var timeLapsesSinceLastShot = 1;
var blizzardPendingDamage = {};
var pendingMissileHits = {};
var soundtrack = new Audio("sound/map1Soundtrack.mp3");
soundtrack.loop = true;

// enemy info dialog state
var selectedMinionIdx = -1;
var selectedMinionEl = null;
var selectedHpBarEl = null;

// damage stats panel state
var damageStatsTick = 0;

// post game stats (reset on every map start)
var mapKills = 0;
var placedTurrets = []; // every turret placed on this map, sold ones included
var endlessSeedsEarned = 0; // Golden Seeds won from Endless bosses this map

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
	var profile = getEnemyProfile(selectedMinionEl);
	var name = profile ? profile.name : isBossWave ? "Destroyer" : isPlane ? "Jet" : "Tank";

	document.getElementById("enemyName").innerText = name;
	var hpBar = document.getElementById("enemyHpBar");
	hpBar.value = currentHp;
	hpBar.max = maxHp;
	var hpText = Math.ceil(currentHp) + " / " + Math.ceil(maxHp);
	if (selectedMinionEl._shield > 0) hpText += " (+" + Math.ceil(selectedMinionEl._shield) + " shield)";
	document.getElementById("enemyHpText").innerText = hpText;

	var speedLabel;
	if (hasDebuff(STUN_STATUS_ATTRIBUTE, selectedMinionEl) && !isPlane) {
		speedLabel = "0 (Stunned)";
	} else if (hasDebuff(FROZEN_STATUS_ATTRIBUTE, selectedMinionEl)) {
		speedLabel = speed + " (Frozen)";
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
	// only one turret dialog at a time: close the upgrade panel
	document.getElementById("registrationForm").style.display = "none";
	hideRangeIndicator();
	shopInfoOpenType = type;
	document.getElementById("shopInfoName").innerText = turretName(type);
	document.getElementById("shopInfoDesc").innerText = turretDescription(type);
	document.getElementById("shopInfoDamageRow").style.display = TURRET_DEFS[type].support ? "none" : "flex";
	document.getElementById("shopInfoDamage").innerText = turretDamage(type);
	document.getElementById("shopInfoRange").innerText = (turretRange(type) / TILE_W) + " tiles";
	document.getElementById("shopInfoCooldown").innerText = (getTurretShotCooldown(type, 1) / 100).toFixed(2) + " s";
	if (turretCritChance(type) !== undefined && turretCritChance(type) > 0) {
		document.getElementById("shopInfoCritChance").innerText = turretCritChance(type) + "%";
		document.getElementById("shopInfoCritChanceRow").style.display = "flex";
	} else {
		document.getElementById("shopInfoCritChanceRow").style.display = "none";
	}
	var specialsEl = document.getElementById("shopInfoSpecials");
	specialsEl.innerHTML = "";
	turretSpecials(type).forEach(function(line) {
		var li = document.createElement("li");
		li.textContent = line;
		specialsEl.appendChild(li);
	});
	var branches = turretBranchSummaries(type);
	var branchList = document.getElementById("shopInfoBranchList");
	branchList.innerHTML = "";
	branches.forEach(function(branch) {
		var row = document.createElement("div");
		row.className = "shop-info-branch";
		var name = document.createElement("b");
		name.textContent = branch.name;
		row.appendChild(name);
		row.appendChild(document.createTextNode(" - " + branch.summary));
		branchList.appendChild(row);
	});
	document.getElementById("shopInfoBranches").style.display = branches.length ? "block" : "none";
	dialog.style.display = "block";
}

function hideShopTurretInfo() {
	document.getElementById("turretShopInfoDialog").style.display = "none";
	shopInfoOpenType = null;
}
////////////////////// END TURRET SHOP INFO DIALOG

////////////////////// STORM CANNON OVERHEAT
// At max overheat the cannon shuts down and only comes back once it fully cools (0%)
function setStormOverheated(turret, overheated) {
	turret.overheated = overheated;
	turret.htmlElement.classList.toggle("storm-overheated", overheated);
	turret.overheatBar.classList.toggle("storm-overheated", overheated);
	if (overheated) {
		rotate(0, turret.htmlElement);
		resetShotEffect(turret.htmlElement);
	}
	// keep the upgrade panel in sync if this turret is selected
	if (document.getElementById("upgTurretId").value === turret.htmlElement.id &&
		document.getElementById("registrationForm").style.display !== "none") {
		updateTurretInfo(turret);
	}
}
////////////////////// END STORM CANNON OVERHEAT

////////////////////// DAMAGE STATS PANEL
// DMG Stats and Wave Preview share the same slot: opening one closes the other
function showDamageStatsPanel() {
	var panel = document.getElementById("damageStatsPanel");
	if (panel.style.display === "none") {
		hideWavePreviewPanel();
		hideEnemyInfoDialog();
		updateDamageStatsPanel(true);
		panel.style.display = "block";
	} else {
		panel.style.display = "none";
	}
}

function hideDamageStatsPanel() {
	document.getElementById("damageStatsPanel").style.display = "none";
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
		if (TURRET_DEFS[type].support) continue; // support towers deal no damage
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

////////////////////// WAVE PREVIEW PANEL
// Shows what the next wave will bring. The wave's exact enemy mix is only rolled when
// it starts, so Jets / special enemies are listed with their chance of showing up.
var wavePreviewShownWave = -1;

function showWavePreviewPanel() {
	var panel = document.getElementById("wavePreviewPanel");
	if (panel.style.display === "none") {
		hideDamageStatsPanel();
		hideEnemyInfoDialog();
		renderWavePreview();
		panel.style.display = "block";
	} else {
		panel.style.display = "none";
	}
}

function hideWavePreviewPanel() {
	document.getElementById("wavePreviewPanel").style.display = "none";
}

// Wave that starts after the one in progress (wave 1 before the game starts)
function getPreviewWave() {
	return isRunning ? currentWave + 1 : 1;
}

// Keeps an open panel in sync when the wave changes
function updateWavePreviewPanel() {
	var panel = document.getElementById("wavePreviewPanel");
	if (panel.style.display === "none") return;
	if (getPreviewWave() !== wavePreviewShownWave) renderWavePreview();
}

// HP and speed scale with currentWave, so evaluate fn as if `wave` were the current one
function atWave(wave, fn) {
	var saved = currentWave;
	currentWave = wave;
	try { return fn(); } finally { currentWave = saved; }
}

function formatRange(min, max, format) {
	return min === max ? format(min) : format(min) + "-" + format(max);
}

function enemyTraitLines(profile) {
	var lines = [];
	if (profile.immuneFreeze && profile.immuneStun) lines.push("Immune to freeze & stun");
	else if (profile.immuneFreeze) lines.push("Immune to freeze");
	else if (profile.immuneStun) lines.push("Immune to stun");
	if (profile.shield) lines.push("Shielded");
	if (profile.damageMult !== 1) lines.push("Takes x" + profile.damageMult + " damage");
	if (profile.turretMult) {
		for (var type in profile.turretMult) {
			var m = profile.turretMult[type];
			lines.push(m === 0 ? turretName(type) + ": immune" : turretName(type) + " x" + m);
		}
	}
	return lines;
}

// Special enemy profiles that can show up on the previewed wave (every map's in Endless)
function previewSpecialProfiles(boss) {
	var profiles = [];
	if (isEndlessMode()) {
		for (var id in SPECIAL_ENEMIES) {
			profiles.push(boss ? getBossProfile(parseInt(id, 10)) : SPECIAL_ENEMIES[id]);
		}
	} else {
		profiles.push(boss ? getBossProfile(currentLevel) : getSpecialEnemy(currentLevel));
	}
	return profiles;
}

// One preview entry for an enemy kind. profiles = special profiles it can be (null = regular)
function previewEntry(wave, name, chance, baseHp, baseSpeed, profiles, extraTraits) {
	var hpMults = [1], speeds = [baseSpeed], traits = extraTraits.slice();
	if (profiles) {
		hpMults = profiles.map(function(p) { return p.hpMult; });
		speeds = profiles.map(function(p) { return p.speed; });
		// traits only make sense when a single profile is possible
		if (profiles.length === 1) traits = traits.concat(enemyTraitLines(profiles[0]));
	}
	traits = traits.filter(function(t, i) { return traits.indexOf(t) === i; }); // no duplicates
	var speedMult = atWave(wave, enemySpeedMult);
	var hpMin = baseHp * Math.min.apply(null, hpMults), hpMax = baseHp * Math.max.apply(null, hpMults);
	var spMin = Math.min.apply(null, speeds) * speedMult, spMax = Math.max.apply(null, speeds) * speedMult;
	return {
		name: name,
		chance: chance,
		hp: formatRange(hpMin, hpMax, formatDamage),
		speed: formatRange(spMin, spMax, function(v) { return v.toFixed(1); }),
		traits: traits
	};
}

function buildWavePreview(wave) {
	var d = getDifficulty();
	var isBoss = wave % 10 === 0;
	var entries = [];
	var count;

	if (isBoss) {
		count = "1 boss";
		var special = wave % ENDLESS_BOSS_WAVES === 0;
		var hp = atWave(wave, bossHp);
		var profiles = special ? previewSpecialProfiles(true) : null;
		var name = !special ? "Destroyer"
			: profiles.length === 1 ? profiles[0].name : "Random special boss";
		var entry = previewEntry(wave, name, null, hp, 1.0, profiles, ["Immune to stun"]);
		// escaping costs BOSS_LIVES_COST x the enemy's own cost
		var costs = (profiles || [{ livesCost: 1 }]).map(function(p) { return p.livesCost * BOSS_LIVES_COST; });
		entry.traits.push("Costs " + formatRange(Math.min.apply(null, costs), Math.max.apply(null, costs), String) + " lives if it escapes");
		entries.push(entry);
	} else {
		count = formatRange(d.enemiesMin, d.enemiesMax, String);
		var minionHp = atWave(wave, minionhp);
		var jetChance = wave >= 11 ? 0.5 : 0;                        // see the wave start in startwave()
		var medicChance = wave >= MEDIC_MIN_WAVE ? (1 - jetChance) * MEDIC_SPAWN_CHANCE : 0;
		var stealthChance = wave >= STEALTH_MIN_WAVE ? (1 - jetChance) * STEALTH_SPAWN_CHANCE : 0;
		var specialChance = wave >= 20 ? (1 - jetChance - medicChance - stealthChance) * 0.3 : 0;
		var tankChance = 1 - jetChance - medicChance - stealthChance - specialChance;
		entries.push(previewEntry(wave, "Tank", tankChance, minionHp, 1.0, null, []));
		if (jetChance > 0) {
			entries.push(previewEntry(wave, "Jet", jetChance, minionHp, PLANE_SPEED, null, ["Immune to stun"]));
		}
		if (medicChance > 0) {
			entries.push(previewEntry(wave, MEDIC_ENEMY.name, medicChance, minionHp, 1.0, [MEDIC_ENEMY],
				["Heals nearby enemies 10% HP and removes their debuffs"]));
		}
		if (stealthChance > 0) {
			entries.push(previewEntry(wave, STEALTH_ENEMY.name, stealthChance, minionHp, 1.0, [STEALTH_ENEMY],
				["Camouflaged: only a Pulse Scanner can reveal it"]));
		}
		if (specialChance > 0) {
			var specials = previewSpecialProfiles(false);
			var spName = specials.length === 1 ? specials[0].name : "Random special";
			var spEntry = previewEntry(wave, spName, specialChance, minionHp, 1.0, specials, []);
			var spCosts = specials.map(function(p) { return p.livesCost; });
			var maxCost = Math.max.apply(null, spCosts);
			if (maxCost > 1) {
				spEntry.traits.push("Costs " + formatRange(Math.min.apply(null, spCosts), maxCost, String) + " lives if it escapes");
			}
			entries.push(spEntry);
		}
	}
	return { wave: wave, isBoss: isBoss, count: count, entries: entries };
}

function renderWavePreview() {
	var wave = getPreviewWave();
	wavePreviewShownWave = wave;
	var body = document.getElementById("wavePreviewBody");

	// regular maps end after wave 30
	if (!isEndlessMode() && wave > 30) {
		body.innerHTML = '<div class="dmg-empty">No more waves. Clear wave 30 to finish the map.</div>';
		return;
	}

	var preview = buildWavePreview(wave);
	var html =
		'<div class="info-item"><span>Wave ' + preview.wave +
			(preview.isBoss ? ' <b class="wave-boss-tag">BOSS</b>' : '') + '</span><span>' +
			preview.count + (preview.isBoss ? '' : ' enemies') + '</span></div>';
	preview.entries.forEach(function(e) {
		// a single short trait (e.g. a Jet's stun immunity) shares the stats line to save height
		var inlineTrait = e.traits.length === 1 && e.traits[0].length <= 16;
		html += '<div class="wave-enemy">' +
			'<div class="wave-enemy-head"><span class="wave-enemy-name">' + e.name + '</span>' +
				(e.chance !== null ? '<span class="wave-enemy-chance">' + Math.round(e.chance * 100) + '%</span>' : '') +
			'</div>' +
			'<div class="wave-enemy-stats">HP ' + e.hp + ' &middot; Speed ' + e.speed +
				(inlineTrait ? ' &middot; ' + e.traits[0] : '') + '</div>' +
			(e.traits.length && !inlineTrait ? '<div class="wave-enemy-traits">' + e.traits.join(' &middot; ') + '</div>' : '') +
			'</div>';
	});
	body.innerHTML = html;
}
////////////////////// END WAVE PREVIEW PANEL

////////////////////// TURRET FUNCTIONS that requires global values (others declared on object/turret.js)
function turretClick(turret) {
	function tclick(evt) {
		// buying is allowed while paused, but only once the game has started
		if (!isRunning) {
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

		spawnPurchasedTurret(turret.getAttribute("type"), x, y);
	}
	return tclick;
}

// Small tag showing the keyboard shortcut of a HUD button / shop card
function addHotkeyBadge(el, key) {
	var badge = document.createElement("span");
	badge.className = "hotkey-badge";
	badge.textContent = key;
	el.appendChild(badge);
}

// Changes a HUD button's text without dropping its hotkey badge
function setButtonLabel(btn, html) {
	btn.querySelector(".btn-label").innerHTML = html;
}

// Buys a turret: creates the draggable turret at (x, y) (game coords) and charges its cost
function spawnPurchasedTurret(turretType, x, y) {
	// create a new shaped turret at the given coords
	var turretD = document.createElement("div");
	turretD.setAttribute("id", turretType + ":" + turretCounter++);
	turretD.setAttribute("class", "turretdrag");
	turretD.style.left = x + "px";
	turretD.style.top = y + "px";
	//turretD.style.backgroundColor = turretColor(turretType);
	turretD.style.backgroundImage = turretImage(turretType);
	turretD.setAttribute("draggable", "true");
	listenEvent(turretD, "dragstart", turretDrag(turretD));
	addTurretOverlay(turretD, turretType);
	document.body.appendChild(turretD);

	// mostra range indicator durante o drag
	isDraggingNewTurret = true;
	showRangeIndicator(x, y, turretRange(turretType), turretColor(turretType));

	// ao soltar (com ou sem drop válido), limpa o indicator
	listenEvent(turretD, "dragend", function() {
		isDraggingNewTurret = false;
		draggedTurretEl = null;
		hideRangeIndicator();
	});

	// reduce our available cash by what we just spent
	currentCash -= turretValue(turretType);
	updateStatus(); // the game loop doesn't refresh the HUD while paused
}

// Hotkey purchase: the Nth shop card (0-based, same order as the shop). The turret appears
// under the mouse cursor, like clicking the card, ready to be dragged onto the map.
// A turret bought earlier but not placed yet is refunded and swapped for the new one.
function buyTurretByHotkey(index, mouseX, mouseY) {
	if (!isRunning || draggedTurretEl) return;
	var cards = document.querySelectorAll("#gameHud .turret");
	var card = cards[index];
	if (!card) return;
	var turretType = card.getAttribute("type");

	var pending = document.querySelector('.turretdrag[draggable="true"]');
	var refund = pending ? turretValue(pending.id.substring(0, pending.id.indexOf(":"))) : 0;
	if (currentCash + refund < turretValue(turretType)) return;
	if (pending) {
		currentCash += refund;
		document.body.removeChild(pending);
		isDraggingNewTurret = false;
		hideRangeIndicator();
	}

	var scale = getMobileScale();
	var x, y;
	if (mouseX === null || mouseY === null) {
		// no mouse movement seen yet: fall back to the shop card
		var r = card.getBoundingClientRect();
		x = (r.left + r.width / 2 + window.pageXOffset) / scale;
		y = (r.top + r.height / 2 + window.pageYOffset) / scale;
	} else {
		x = mouseX / scale;
		y = mouseY / scale;
	}
	spawnPurchasedTurret(turretType, x, y);
}

function placeTurretAtMapzone(mapzone, x, y, turretEl) {
	if (isRoad(currentLevel, x, y)) return false;
	//if (isBlockedTile(x, y)) return false;

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
		audioFile: applyEffectsVolume(turretSoundEffect(turretType)),
		totalDamage: 0,
		targetMode: "first",
		target:    null,
		volley:    [], // enemies this turret hits this tick (more than one for multi-target branches)
		branch:    null
	};
	if (turretType === "missile") {
		turretObj.audioFileImpact = applyEffectsVolume(new Audio("sound/missileImpact.mp3"));
		turretObj.pendingMissiles = [];
		turretObj.planeInRange = false;
		turretObj.ammo = getMissileMaxAmmo(1);
		turretObj.ammoQueue = 0;
		turretObj.ammoLoadTick = 0;
		turretObj.ammoLoadBar = null;
	}
	if (turretType === "archery") {
		turretObj.pendingMissiles = [];
	}
	if (turretType === "stormCannon") {
		turretObj.active = true;
		turretObj.overheat = 0;
		turretObj.overheatCoolTick = 0;
		turretObj.overheated = false;
		turretObj.firedThisTurn = false;
		var overheatBar = document.createElement("progress");
		overheatBar.setAttribute("class", "overheat-bar");
		overheatBar.setAttribute("value", 0);
		overheatBar.setAttribute("max", STORM_OVERHEAT_MAX);
		overheatBar.style.left = xPos + "px";
		overheatBar.style.top  = (parseInt(yPos) + 30) + "px";
		document.body.appendChild(overheatBar);
		turretObj.overheatBar = overheatBar;
	}
	// the Pulse Scanner antenna keeps spinning from the moment it is placed
	if (turretType === "pulseScanner") turretEl.classList.add("turret-spinning");
	turretPos[turretPos.length] = turretObj;
	placedTurrets.push(turretObj);
	listenEvent(turretEl, "click", showTurretInfo(turretPos[turretPos.length - 1]));
	turretEl.setAttribute("draggable", "false");
	listenEvent(turretEl, "dragstart", nodrag);
	isDraggingNewTurret = false;
	hideRangeIndicator();
	refreshPulseAuras();
	syncOpenTurretPanel();
	return true;
}

// Redraws the open turret panel and its range circle (a Pulse Scanner placed, upgraded or sold can change another turret's stats)
function syncOpenTurretPanel() {
	if (document.getElementById("registrationForm").style.display === "none") return;
	var turretId = document.getElementById("upgTurretId").value;
	for (var i = 0; i < turretPos.length; i++) {
		if (turretPos[i].htmlElement.id === turretId) {
			updateTurretInfo(turretPos[i]);
			showRangeIndicator(
				parseInt(turretPos[i].x) + TURRET_CENTER,
				parseInt(turretPos[i].y) + TURRET_CENTER,
				getTurretRange(turretPos[i]),
				turretColor(turretPos[i].type)
			);
			return;
		}
	}
}

function mapDrop(mapzone, x, y) {
	function drop(evt) {
		evt = evt || window.event;
		// stop the browser from treating the drop as a navigation
		if (evt.preventDefault) evt.preventDefault();
		cancelPropogation(evt);
		evt.dataTransfer.dropEffect = 'copy';
		// prefer the tracked element; dataTransfer can arrive empty (e.g. file:// pages)
		var turretEl = draggedTurretEl || document.getElementById(evt.dataTransfer.getData("Text"));
		draggedTurretEl = null;
		// ignore drops that don't carry a turret still waiting to be placed
		if (!turretEl || turretEl.getAttribute("draggable") !== "true") return;
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
//var BLOCKED_TILES = [{x: 29, y: 4, lv: 1}]; // boat.png position

/*function isBlockedTile(xPos, yPos) {
	for (var i = 0; i < BLOCKED_TILES.length; i++) {
		if (BLOCKED_TILES[i].x === xPos && BLOCKED_TILES[i].y === yPos && currentLevel == BLOCKED_TILES[i].lv) return true;
	}
	return false;
}*/

function dragOver(xPos, yPos){
	function dragover(evt) {
		if(!isRoad(currentLevel, xPos, yPos) /*&& !isBlockedTile(xPos, yPos)*/) {
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
		if(!isRoad(currentLevel, xPos, yPos) /*&& !isBlockedTile(xPos, yPos)*/){
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
	// This prevents minion position changes from triggering repaints of the map tiles.
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
			mapzone.style.width = TILE_W + "px";
			mapzone.style.height = TILE_H + "px";
			mapzone.dataset.mapX = i;
			mapzone.dataset.mapY = j;
			listenEvent(mapzone, "drop", mapDrop(mapzone, i, j));
			listenEvent(mapzone, "dragenter", cancelEvent(i, j));
			listenEvent(mapzone, "dragover", dragOver(i, j));
			mapContainer.appendChild(mapzone);
		}
	}
	drawTargetMap(currentLevel);

	// shop, buttons and status bar live in the scaled HUD strip below the map
	var hud = document.getElementById("gameHud");

	// create the turrets (only those the player has unlocked)
	// shop lists turrets from cheapest to most expensive
	var turretTypes = UnlockManager.getUnlockedTowers().slice().sort(function(a, b) {
		return turretValue(a) - turretValue(b);
	});
	for (var k = 0; k < turretTypes.length; k++) {
		var turret = document.createElement("div");
		turret.setAttribute("type", turretTypes[k]);
		turret.setAttribute("class", "turret");
		turret.style.left = TURRET_OFFSET + (TURRET_D + TURRET_GAP) * k + "px";
		turret.style.borderColor = turretColor(turret.getAttribute("type"));
		turret.innerHTML = '<div class="turret-icon" style="background-image:' + turretImage(turretTypes[k]) + ';"></div><span class="turret-cost">$' + turretValue(turretTypes[k]) + '</span>';
		addTurretOverlay(turret.querySelector(".turret-icon"), turretTypes[k]);

		if (k < HOTKEY_TURRET_COUNT) addHotkeyBadge(turret, String((k + 1) % 10));

		// turrets are draggable (desktop: click; mobile: touch)
		listenEvent(turret, "click", turretClick(turret));
		initTouchDragForCard(turret);
		hud.appendChild(turret);

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
		hud.appendChild(infoBtn);
	}

	// put a start button on
	var startbutton = document.createElement("div");
	startbutton.setAttribute("id", "startbutton");
	startbutton.setAttribute("class", "startbutton");
	startbutton.innerHTML = '<span class="btn-label">&#9654; START</span>';
	addHotkeyBadge(startbutton, "Space");
	listenEvent(startbutton, "click", startOrPauseWave);
	hud.appendChild(startbutton);

	// game speed button (1x / 2x), only visible once the wave has started
	var speedbutton = document.createElement("div");
	speedbutton.setAttribute("id", "speedbutton");
	speedbutton.setAttribute("class", "speedbutton");
	speedbutton.style.display = "none";
	speedbutton.innerHTML = '<span class="btn-label"></span>';
	addHotkeyBadge(speedbutton, "Q");
	listenEvent(speedbutton, "click", toggleGameSpeed);
	hud.appendChild(speedbutton);
	updateSpeedButton();

	// reset button
	var resetbutton = document.createElement("div");
	resetbutton.setAttribute("id", "resetbutton");
	resetbutton.setAttribute("class", "resetbutton");
	resetbutton.innerHTML = '<span class="btn-label">&#8635; RESET</span>';
	addHotkeyBadge(resetbutton, "L");
	// asks for confirmation first (same dialog as the L hotkey)
	listenEvent(resetbutton, "click", function () { Hotkeys.showResetDialog(); });
	hud.appendChild(resetbutton);

	// damage stats button
	var statsbutton = document.createElement("div");
	statsbutton.setAttribute("id", "statsbutton");
	statsbutton.setAttribute("class", "statsbutton");
	statsbutton.innerHTML = '<span class="btn-label">&#9881; DMG STATS</span>';
	addHotkeyBadge(statsbutton, "W");
	listenEvent(statsbutton, "click", showDamageStatsPanel);
	hud.appendChild(statsbutton);

	// wave preview button
	var wavebutton = document.createElement("div");
	wavebutton.setAttribute("id", "wavebutton");
	wavebutton.setAttribute("class", "wavebutton");
	wavebutton.innerHTML = '<span class="btn-label">&#9873; WAVE PREVIEW</span>';
	addHotkeyBadge(wavebutton, "G");
	listenEvent(wavebutton, "click", showWavePreviewPanel);
	hud.appendChild(wavebutton);

	// config (settings) button
	var configbutton = document.createElement("div");
	configbutton.setAttribute("id", "configbutton");
	configbutton.setAttribute("class", "configbutton");
	configbutton.innerHTML = '<span class="btn-label">&#9881;&#65039; CONFIG</span>';
	addHotkeyBadge(configbutton, "Esc");
	listenEvent(configbutton, "click", openSettings);
	hud.appendChild(configbutton);

	// status  bar
	var statusbar = document.createElement("div");
	statusbar.setAttribute("id", "statusbar");
	statusbar.setAttribute("class", "statusbar");
	statusbar.innerHTML =
		'<div class="stat-block"><span class="stat-label">Cash</span><span class="stat-value gold" id="cash">$0</span></div>' +
		'<div class="stat-block"><span class="stat-label">Score</span><span class="stat-value score" id="score">0</span></div>' +
		'<div class="stat-block"><span class="stat-label">Wave</span><span class="stat-value wave" id="wave">0</span></div>' +
		'<div class="stat-block"><span class="stat-label">Lives</span><span class="stat-value lives" id="lives">0</span></div>';
	hud.appendChild(statusbar);

	//Play map Soundtrack
	playMapSoundtrack();
}

function playMapSoundtrack(){
	soundtrack.pause();
	switch(currentLevel){
		case 2: soundtrack.src = "sound/map2Soundtrack.mp3"; break;
		case 3: soundtrack.src = "sound/map3Soundtrack.mp3"; break;
		case 4: soundtrack.src = "sound/map4Soundtrack.mp3"; break;
		case 5: soundtrack.src = "sound/map5Soundtrack.mp3"; break;
		case 6: soundtrack.src = "sound/map6Soundtrack.mp3"; break;
		default: soundtrack.src = "sound/map1Soundtrack.mp3"; break;
	}
	soundtrack.loop = true;
	soundtrack.play().catch(function() {});
}

function playAudio() {
	applyMusicVolume();
	soundtrack.play().catch(function() {});
}

function pauseAudio() {
	soundtrack.pause();
}

// Map visuals are painted on a canvas behind the transparent .mapzone tiles
function drawTargetMap(targetLevel) {
	MapRenderer.render(document.getElementById("mapContainer"), targetLevel);
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
	setButtonLabel(sb, "&#9646;&#9646; PAUSE");
	// START shrinks to make room for the speed button beside it
	sb.classList.add("startbutton-compact");
	gameSpeed = 1;
	updateSpeedButton();
	document.getElementById("speedbutton").style.display = "flex";
	// reset globals
	currentWave = 0;
	currentLives = 15;
	currentCash = 100;
	// Endless is a standalone challenge: its score doesn't join the run
	currentScore = isEndlessMode() ? 0 : RunSession.getScore();
	difficultyKillCount = 0;
	currentWaveEnemyCount = randomWaveEnemyCount();
	turretPos = new Array();
	mapKills = 0;
	placedTurrets = [];
	endlessSeedsEarned = 0;

	// increase the wave count
	currentWave++;

	// remove all the placed turrets, projectiles and Bars
	var turrets = document.querySelectorAll(".turretdrag");
	var overHeatBar = document.querySelectorAll(".overheat-bar");
	var ammoLoadBar = document.querySelectorAll(".ammo-load-bar");
	var projectiles = document.querySelectorAll(".missile-projectile, .arrow-projectile");
	for (var i = 0; i < turrets.length; i++) {
		document.body.removeChild(turrets[i]);
	}
	for (var i = 0; i < overHeatBar.length; i++) {
		document.body.removeChild(overHeatBar[i]);
	}
	for (var i = 0; i < projectiles.length; i++) {
		document.body.removeChild(projectiles[i]);
	}
	for (var i = 0; i < ammoLoadBar.length; i++) {
		document.body.removeChild(ammoLoadBar[i]);
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
		setMinionSize(minion, hpBarMinion, MINION_SIZE);
		// shield bar shown on top of the HP bar (only for shielded enemies)
		var shieldBar = document.createElement("progress");
		shieldBar.setAttribute("class", "shieldBar");
		shieldBar.setAttribute("value", 0);
		minion._shieldBar = shieldBar;
		document.body.appendChild(minion);
		document.body.appendChild(hpBarMinion);
		document.body.appendChild(shieldBar);
		listenEvent(minion, "click", (function(idx, mEl, hEl) {
			return function() {
				if (!isRunning) return; // also works while paused
				showEnemyInfoDialog(idx, mEl, hEl);
			};
		})(i, minion, hpBarMinion));
	}

	// set up the timers to run
	var movex = new Array();
	var movey = new Array();
	// what direction are we going?
	var currentDir = new Array();
	var prevDir = new Array();
	var minion_c = 1;
	var spawnCountdown = randomSpawnInterval();
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
		prevDir[i] = MOVE_S;
		minions[i].style.display = "none";
		hpBarMinions[i].style.display = "none";
		hpBarMinions[i].setAttribute("max", minionhp());
		minion_hp[i] = minionhp();
		first_kill[i] = true;
		minions[i]._progress = 0;
	}

	var gameTick = function () {
		syncPauseState();
		if (!isPaused && !branchTurret) {
			blizzardPendingDamage = {};
			processPendingMissiles();
			updateMissileTurretPlaneFlags(minions, movex, movey);
			updatePulseScanners(minions); // before the targets are picked: revealed enemies can be targeted this tick
			updateTurretTargets(minions);
			//timeLapsesSinceLastShot++;
			for (var i = 0; i < minion_c; i++) {
				// what direction do we want to go?
				currentDir[i] = whereToMove(movex[i], movey[i], currentDir[i], minions[i], isBossWave);
				if (currentDir[i] == MOVE_END) {
					// lose a life, one escaped!
					if (minions[i].style.display != "none") {
						// bosses cost BOSS_LIVES_COST, scaled by the enemy's own cost (Fire Tank Boss = 10)
						var livesCost = getEnemyLivesCost(minions[i]) * (isBossWave ? BOSS_LIVES_COST : 1);
						currentLives = Math.max(0, currentLives - livesCost);
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
				// speeds are defined in base (15px) tile units
				let speed = getMinionSpeed(minions[i]) * MAP_SCALE;
				if (currentDir[i] !== prevDir[i]) {
					if (currentDir[i] === MOVE_E || currentDir[i] === MOVE_W) {
						movey[i] = Math.floor((movey[i] + TILE_H / 2) / TILE_H + TILE_EPSILON) * TILE_H - MAP_SCALE;
					} else if (currentDir[i] === MOVE_N || currentDir[i] === MOVE_S) {
						movex[i] = Math.floor((movex[i] + TILE_W / 2) / TILE_W + TILE_EPSILON) * TILE_W - MAP_SCALE;
					}
					prevDir[i] = currentDir[i];
				}
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
				// distance walked along the path, used by the first/last targeting modes
				minions[i]._progress += speed;
				// the Stealth Tank announces itself with a sound when it leaves the gate
				if (isStealthEnemy(minions[i]) && !minions[i]._spawnSoundPlayed) {
					minions[i]._spawnSoundPlayed = true;
					playStealthSpawnSound();
				}
				minions[i].style.display = "block";
				minions[i].style.top = movey[i] + "px";
				minions[i].style.left = movex[i] + "px";
				hpBarMinions[i].style.display = "block";
				hpBarMinions[i].style.top = movey[i] + "px";
				hpBarMinions[i].style.left = movex[i] + "px";
				if (isBossWave) {
					hpBarMinions[i].setAttribute("max", bossHp() * getEnemyHpMult(minions[i]));
				} else {
					hpBarMinions[i].setAttribute("max", minionhp() * getEnemyHpMult(minions[i]));
				}
				// reduce the minion's hit points by the damage (per-turret multipliers
				// were already applied at each damage source; the shield absorbs first)
				var burnDamage = getBurnDamage(minions[i], parseFloat(hpBarMinions[i].getAttribute("max")));
				if (burnDamage > 0) {
					damage += burnDamage;
					if (minions[i]._burnSource) minions[i]._burnSource.totalDamage += burnDamage;
				}
				damage = absorbWithShield(minions[i], damage);
				minion_hp[i] -= damage;
				minions[i]._hp = minion_hp[i];
				hpBarMinions[i].setAttribute("value", minion_hp[i]);
				if (minion_hp[i] <= 0) {
					// goodbye minion!
					hpBarMinions[i].setAttribute("value", 0);
					removeDebuffs(minions[i], hpBarMinions[i]);
					if (first_kill[i]) {
						first_kill[i] = false;
						minions_killed++;
						mapKills++;
						// increase your cash a little bit  
						if (isBossWave) {
							currentCash += bossReward();
							currentScore += difficultyScore(8);
							if (isEndlessMode() && currentWave >= ENDLESS_SEED_START_WAVE &&
								Math.random() < ENDLESS_SEED_CHANCE) {
								awardEndlessSeed();
							}
						} else {
							currentCash += minionreward();
							currentScore += regularKillScore();
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
					tickShield(minions[i]);
				tickStealth(minions[i]);
				}
			}
			// Medic Trucks: heal and cleanse nearby enemies every MEDIC_PULSE_TICKS
			for (var mi = 0; mi < minion_c; mi++) {
				var medic = minions[mi];
				if (!medic._enemy || !medic._enemy.medic || medic.style.display === "none") continue;
				if (--medic._medicTimer > 0) continue;
				medic._medicTimer = MEDIC_PULSE_TICKS;
				var mx = parseFloat(medic.style.left) || 0, my = parseFloat(medic.style.top) || 0;
				var mRange = MEDIC_RANGE_TILES * TILE_W;
				createProjectileImpact(medic, "medic-pulse", 600, mRange * 2);
				try {
					applyEffectsVolume(new Audio(MEDIC_HEAL_SOUND)).play().catch(function () {});
				} catch (e) {}
				for (var t = 0; t < minion_c; t++) {
					if (minions[t].style.display === "none" || minion_hp[t] <= 0) continue;
					if (euclidDistance(mx, parseFloat(minions[t].style.left) || 0, my, parseFloat(minions[t].style.top) || 0) > mRange) continue;
					var tMax = parseFloat(hpBarMinions[t].getAttribute("max")) || 0;
					minion_hp[t] = Math.min(tMax, minion_hp[t] + tMax * MEDIC_HEAL_PCT);
					minions[t]._hp = minion_hp[t];
					hpBarMinions[t].setAttribute("value", minion_hp[t]);
					removeDebuffs(minions[t], hpBarMinions[t]);
				}
			}
			for (var s = 0; s < minions.length; s++) {
				updateShieldBar(minions[s], hpBarMinions[s]);
			}
			// stagger the minions coming out at random intervals
			spawnCountdown--;
			if (spawnCountdown <= 0 && minion_c < currentWaveEnemyCount) {
				minion_c++;
				spawnCountdown = randomSpawnInterval();
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
			updateWavePreviewPanel();

			// is the wave over?
			if (wave_over) {
				if (currentLives == 0) {
					var lives = document.getElementById("lives");
					lives.innerHTML = "Game Over";
					PlayerData.updateScore(currentScore);
					PlayerData.savePlayer();
					updatePlayerHud();
					resetwave(null);
					// Endless only ends on defeat: show the results of the run
					if (isEndlessMode()) {
						pauseAudio();
						showPostGameStats(true);
					}
					// stop here: a game over (even on wave 30) must never complete the map
					return;
				}
				// reset for the next wave!
				minion_c = 1;
				spawnCountdown = randomSpawnInterval();
				minions_killed = 0;
				wave_over = false;
				currentWave++;
				isBossWave = currentWave % 10 == 0;
				if (!isBossWave) {
					currentWaveEnemyCount = randomWaveEnemyCount();
				}
				// the wave 10 boss is over: warn about the new enemies of wave 11 (Stealth Tank needs a Pulse Scanner)
				if (currentWave === STEALTH_MIN_WAVE) {
					showNewEnemiesDialog();
				}
				// Map finished after wave 30 — back to map selection (Endless never finishes)
				if (currentWave > 30 && !isEndlessMode()) {
					finishMap();
					return;
				}

				//Boss wave
				if (isBossWave) {
					for (var i = 0; i < 1; i++) {
						movex[i] = 0;
						movey[i] = 0;
						currentDir[i] = MOVE_S;
						prevDir[i] = MOVE_S;
						minions[i].style.display = "none";
						hpBarMinions[i].style.display = "none";
						// wave 30 (every 30 waves in Endless) brings a special boss
						var isSPBossWave = currentWave % ENDLESS_BOSS_WAVES === 0;
						minions[i].style.backgroundImage = isSPBossWave
							? "url('img/min-lv1/sp-boss-up.png')"
							: "url('img/min-lv1/boss-up.png')";
						setMinionSize(minions[i], hpBarMinions[i], BOSS_SIZE);
						var bossMapId = isEndlessMode() ? randomEnemyMapId() : currentLevel;
						var bossProfile = isSPBossWave ? getBossProfile(bossMapId) : null;
						minion_hp[i] = bossHp() * (bossProfile ? bossProfile.hpMult : 1);
						first_kill[i] = true;
						minions[i]._progress = 0;
						minions[i]._isPlane = false;
						minions[i]._isBoss = true;
						setEnemyProfile(minions[i], bossProfile, minion_hp[i]);
						if (bossProfile && bossProfile.sprite) {
							minions[i].style.backgroundImage = "url('" + bossProfile.sprite + "')";
						}
						removeDebuffs(minions[i], hpBarMinions[i]);
					}
				} else {
					for (var i = 0; i < minions.length; i++) {
						movex[i] = 0;
						movey[i] = 0;
						currentDir[i] = MOVE_S;
						prevDir[i] = MOVE_S;
						minions[i].style.display = "none";
						hpBarMinions[i].style.display = "none";
						setMinionSize(minions[i], hpBarMinions[i], MINION_SIZE);
						minion_hp[i] = minionhp();
						first_kill[i] = true;
						minions[i]._progress = 0;
						minions[i]._isBoss = false;
						removeDebuffs(minions[i], hpBarMinions[i]);
						var usePlane = currentWave >= 11 && currentWave != 20 && Math.random() < 0.5;
						// one roll shared by the wave 11+ support enemies: Medic Truck, then Stealth Tank (each a share of the non-jets)
						var supportRoll = Math.random();
						var useMedic = !usePlane && currentWave >= MEDIC_MIN_WAVE && supportRoll < MEDIC_SPAWN_CHANCE;
						var useStealth = !usePlane && !useMedic && currentWave >= STEALTH_MIN_WAVE &&
							supportRoll < MEDIC_SPAWN_CHANCE + STEALTH_SPAWN_CHANCE;
						var useSpMin = !usePlane && !useMedic && !useStealth && currentWave >= 20 && Math.random() < 0.3;
						minions[i]._medicTimer = Math.floor(Math.random() * MEDIC_PULSE_TICKS);
						if (useMedic) {
							minions[i]._isPlane = false;
							minion_hp[i] = minionhp() * MEDIC_ENEMY.hpMult;
							setEnemyProfile(minions[i], MEDIC_ENEMY, minion_hp[i]);
							minions[i].style.backgroundImage = "url('" + MEDIC_ENEMY.sprite + "')";
						} else if (useStealth) {
							minions[i]._isPlane = false;
							minion_hp[i] = minionhp() * STEALTH_ENEMY.hpMult;
							setEnemyProfile(minions[i], STEALTH_ENEMY, minion_hp[i]);
							// both sprites are drawn (and crossfaded) by the .enemy-stealth CSS
							minions[i].style.backgroundImage = "none";
						} else if (usePlane) {
							minions[i]._isPlane = true;
							setEnemyProfile(minions[i], null, minion_hp[i]);
							minions[i].style.backgroundImage = "url('img/pla-lv2/pla-up.png')";
						} else if (useSpMin) {
							// each map has its own special enemy (tinted via CSS class)
							// Endless mixes the special enemies of every map
							var special = getSpecialEnemy(isEndlessMode() ? randomEnemyMapId() : currentLevel);
							minions[i]._isPlane = false;
							minion_hp[i] = minionhp() * special.hpMult;
							setEnemyProfile(minions[i], special, minion_hp[i]);
							minions[i].style.backgroundImage = "url('" + (special.sprite || "img/min-lv1/sp-min-up.png") + "')";
						} else {
							minions[i]._isPlane = false;
							setEnemyProfile(minions[i], null, minion_hp[i]);
							minions[i].style.backgroundImage = "url('img/min-lv1/min-up.png')";
						}
					}
				}
			}
		}
	};

	// the whole simulation is tick based, so game speed = ticks run per interval
	interval_id = setInterval(function () {
		for (var s = 0; s < gameSpeed && isRunning; s++) {
			gameTick();
		}
	}, 10);
}

function finishMap() {
	resetwave(null);
	pauseAudio();
	var seedReward = getDifficulty().seedReward;
	currentGoldSeed += seedReward;
	currentScore += difficultyScore(100);
	PlayerData.updateScore(currentScore);
	PlayerData.addGoldenSeeds(seedReward);
	RunSession.completeMap(currentLevel, currentScore);
	updatePlayerHud();
	showPostGameStats();
}

// Endless: a lucky boss kill (wave 30 onwards) grants a Golden Seed on the spot
function awardEndlessSeed() {
	endlessSeedsEarned++;
	currentGoldSeed++;
	PlayerData.addGoldenSeeds(1);
	updatePlayerHud();
	showSeedNotification("Wave " + currentWave + " boss defeated! +1 Golden Seed");
}

var seedNotificationTimer = null;
function showSeedNotification(text) {
	var el = document.getElementById("seedNotification");
	document.getElementById("seedNotificationText").textContent = text;
	el.style.display = "flex";
	// restart the animation if a notification is already showing
	el.classList.remove("seed-notification-show");
	void el.offsetWidth;
	el.classList.add("seed-notification-show");
	clearTimeout(seedNotificationTimer);
	seedNotificationTimer = setTimeout(function () {
		el.style.display = "none";
		el.classList.remove("seed-notification-show");
	}, 4000);
}

////////////////////// POST GAME STATS SCREEN
// isDefeat: Endless results after a game over (a regular map only shows this on victory)
function showPostGameStats(isDefeat) {
	var totalDamage = 0;
	var best = null;
	for (var i = 0; i < placedTurrets.length; i++) {
		totalDamage += placedTurrets[i].totalDamage;
		if (!best || placedTurrets[i].totalDamage > best.totalDamage) best = placedTurrets[i];
	}

	var map = UnlockCatalog.getMaps().filter(function (m) { return m.id === currentLevel; })[0];
	document.getElementById("postGameMap").textContent =
		(map ? map.name : "Map " + currentLevel) + " • " + getDifficulty().name;

	var bestEl = document.getElementById("postGameBestTurret");
	if (best && best.totalDamage > 0) {
		bestEl.innerHTML =
			'<div class="postgame-turret-icon" style="background-image:' + turretImage(best.type) + ';border-color:' + turretColor(best.type) + '"></div>' +
			'<div class="postgame-turret-info">' +
				'<span class="postgame-turret-name">' + turretName(best.type) + '</span>' +
				'<span class="postgame-turret-sub">Level ' + best.level + ' • ' +
					Math.round(best.totalDamage / totalDamage * 100) + '% of total damage</span>' +
			'</div>' +
			'<span class="postgame-turret-dmg">' + formatDamage(best.totalDamage) + '</span>';
	} else {
		bestEl.innerHTML = '<span class="postgame-turret-sub">No turret dealt damage.</span>';
	}

	var title = document.getElementById("postGameTitle");
	title.textContent = isDefeat ? "GAME OVER" : "VICTORY";
	title.classList.toggle("postgame-defeat", !!isDefeat);
	var endless = isEndlessMode();
	document.getElementById("postGameEndless").style.display = endless ? "grid" : "none";

	document.getElementById("damageStatsPanel").style.display = "none";
	hideShopTurretInfo();
	document.getElementById("postGameScreen").style.display = "flex";

	if (endless) {
		countUp(document.getElementById("postGameWave"), currentWave, String);
		countUp(document.getElementById("postGameSeeds"), endlessSeedsEarned, String);
	}

	countUp(document.getElementById("postGameScore"), currentScore, String);
	countUp(document.getElementById("postGameKills"), mapKills, String);
	countUp(document.getElementById("postGameDamage"), totalDamage, formatDamage);
}

// Animates a stat from 0 to its final value, like strategy-game score screens
function countUp(el, target, format) {
	var duration = 1200;
	var start = null;
	function step(ts) {
		if (start === null) start = ts;
		var t = Math.min(1, (ts - start) / duration);
		var eased = 1 - Math.pow(1 - t, 3);
		el.textContent = format(Math.round(target * eased));
		if (t < 1) requestAnimationFrame(step);
	}
	el.textContent = format(0);
	requestAnimationFrame(step);
}

function closePostGameStats() {
	// back to map selection
	window.location.href = "index.html";
}
////////////////////// END POST GAME STATS SCREEN

function whereToMove(xpos, ypos, currentDir, minion, c) {
	//Get direction from the minion asset.
	var directionAngle = 0;
	// convert the xpos and ypos to block coordinates
	// (TILE_EPSILON absorbs float error from MAP_SCALE so exact tile edges floor the same way)
	xpos = (xpos + TILE_W / 2) / TILE_W + TILE_EPSILON;
	ypos = (ypos + TILE_H / 2) / TILE_H + TILE_EPSILON;

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

// Mirrors the pause state on <body> so CSS can freeze animations (the Pulse Scanner antenna).
// isPaused has many writers (pause button, dialogs, tutorial), so it is synced from the game loop.
function syncPauseState() {
	var paused = isRunning && (isPaused || !!branchTurret);
	if (document.body.classList.contains("game-paused") !== paused) {
		document.body.classList.toggle("game-paused", paused);
	}
}

function pausewave(evt) {
	if (!isRunning) return;
	isPaused = !isPaused;
}

// The same button starts the wave and, once running, pauses/resumes it
function startOrPauseWave(evt) {
	if (isRunning) {
		pausewave(evt);
	} else {
		startwave(evt);
	}
}

function toggleGameSpeed() {
	if (!isRunning) return;
	var idx = GAME_SPEEDS.indexOf(gameSpeed);
	gameSpeed = GAME_SPEEDS[(idx + 1) % GAME_SPEEDS.length];
	updateSpeedButton();
}

function updateSpeedButton() {
	var btn = document.getElementById("speedbutton");
	if (!btn) return;
	setButtonLabel(btn, gameSpeed + "x");
	btn.classList.toggle("speedbutton-active", gameSpeed > 1);
}

function resetwave(evt) {
	if (!isRunning) return;
	isRunning = false;

	// make the start button visible
	var sb = document.getElementById("startbutton");
	setButtonLabel(sb, "&#9654; START");
	sb.classList.remove("startbutton-compact");
	isPaused = false;
	syncPauseState();

	// hide the speed button and go back to normal speed
	gameSpeed = 1;
	updateSpeedButton();
	document.getElementById("speedbutton").style.display = "none";

	// stop the timers
	clearInterval(interval_id);

	//Hide upgrade info screen
	document.getElementById("registrationForm").style.display = "none";
	closeBranchChoice();
	hideRangeIndicator();
	hideEnemyInfoDialog();
	closeNewEnemiesDialog();

	// remove all the minions
	var minions = document.querySelectorAll(".minion");
	var hpBarMinions = document.querySelectorAll(".hpBar");
	var shieldBars = document.querySelectorAll(".shieldBar");
	for (var i = 0; i < minions.length; i++) {
		document.body.removeChild(minions[i]);
		document.body.removeChild(hpBarMinions[i]);
	}
	for (var i = 0; i < shieldBars.length; i++) {
		document.body.removeChild(shieldBars[i]);
	}

	// an open Wave Preview goes back to wave 1
	updateWavePreviewPanel();
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
		if (!turretPos[i].pendingMissiles) continue;
		var isArrow = turretPos[i].type === "archery";
		var remaining = [];
		for (var j = 0; j < turretPos[i].pendingMissiles.length; j++) {
			var missile = turretPos[i].pendingMissiles[j];
			missile.timer--;
			if (missile.projectileEl) {
				var progress = 1 - missile.timer / missile.duration;
				var tgtX = parseFloat(missile.minionElement.style.left) + MINION_CENTER;
				var tgtY = parseFloat(missile.minionElement.style.top)  + MINION_CENTER;
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
				if (missile.critical) showCriticalPopup(missile.minionElement, missile.damage);
				if (isArrow) {
					createProjectileImpact(missile.minionElement, "arrow-impact", 300);
				} else {
					turretPos[i].audioFileImpact.currentTime = 0;
					turretPos[i].audioFileImpact.play();
					if (missile.splashRadius) applyMissileSplash(turretPos[i], missile);
					// the explosion graphic is as big as the blast radius
					createProjectileImpact(missile.minionElement, "missile-impact", 600, missile.splashRadius ? missile.splashRadius * 2 : 0);
				}
			} else {
				remaining.push(missile);
			}
		}
		turretPos[i].pendingMissiles = remaining;
	}
}

// NEW ENEMIES NOTICE
// Shown once the wave 10 boss is over: freezes the game until the player closes it
var newEnemiesPausedGame = false;

function showNewEnemiesDialog() {
	document.getElementById("newEnemiesScannerCost").textContent = "$" + turretValue("pulseScanner");
	if (!isPaused) {
		isPaused = true;
		newEnemiesPausedGame = true;
	}
	document.getElementById("newEnemiesScreen").style.display = "flex";
}

function isNewEnemiesDialogOpen() {
	return document.getElementById("newEnemiesScreen").style.display !== "none";
}

function closeNewEnemiesDialog() {
	document.getElementById("newEnemiesScreen").style.display = "none";
	if (newEnemiesPausedGame) {
		isPaused = false;
		newEnemiesPausedGame = false;
	}
}
// END NEW ENEMIES NOTICE

function playStealthSpawnSound() {
	try {
		applyEffectsVolume(new Audio(STEALTH_HIDE_SOUND)).play().catch(function () {});
	} catch (e) {}
}

// Floating "Critical!" text above a minion; throttled per minion so fast turrets don't spam it
function showCriticalPopup(minionEl, shotTotal) {
	if (!GameSettings.get("showCritical")) return;
	if (minionEl.style.display === "none") return;
	var now = Date.now();
	if (minionEl._lastCritPopup && now - minionEl._lastCritPopup < CRIT_POPUP_THROTTLE_MS) return;
	minionEl._lastCritPopup = now;

	var popup = document.createElement("div");
	popup.className = "crit-popup";
	popup.textContent = Math.round(shotTotal) + " Critical!";
	var halfSize = (parseFloat(minionEl.style.height) || MINION_SIZE) / 2;
	popup.style.left = ((parseFloat(minionEl.style.left) || 0) + MINION_CENTER) + "px";
	popup.style.top  = ((parseFloat(minionEl.style.top)  || 0) + MINION_CENTER - halfSize - 4) + "px";
	document.body.appendChild(popup);
	setTimeout(function() {
		if (popup.parentNode) document.body.removeChild(popup);
	}, 900);
}

// Offset from a minion's logical position (style.left/top = tile top-left - MAP_SCALE)
// to the center of the tile it walks on
const MINION_CENTER = MAP_SCALE + TILE_W / 2;

// Sizes a minion and its HP bar and centers both on the tile. The offset uses the
// `translate` property, so style.left/top (read by range checks) stay unchanged.
function setMinionSize(minionEl, hpBarEl, size) {
	var offset = (MINION_CENTER - size / 2) + "px";
	minionEl.style.width = size + "px";
	minionEl.style.height = size + "px";
	minionEl.style.translate = offset + " " + offset;
	hpBarEl.style.width = size + "px";
	hpBarEl.style.translate = offset + " " + offset;
}

// Protoss-style shield: a bar stacked on top of the HP bar, following it while the
// enemy has a shield (it stays visible, empty, while the shield regenerates)
function updateShieldBar(minionEl, hpBarEl) {
	var bar = minionEl._shieldBar;
	if (!bar) return;
	var show = minionEl._shieldMax > 0 && hpBarEl.style.display !== "none";
	bar.style.display = show ? "block" : "none";
	if (!show) return;
	bar.style.left = hpBarEl.style.left;
	bar.style.top = hpBarEl.style.top;
	bar.style.width = hpBarEl.style.width;
	bar.style.translate = hpBarEl.style.translate;
	bar.max = minionEl._shieldMax;
	bar.value = Math.max(0, minionEl._shield);
}

// Heavy Payload: every other enemy inside the blast takes the turret's plain damage
function applyMissileSplash(turret, missile) {
	var center = missile.minionElement;
	var cx = parseFloat(center.style.left) || 0;
	var cy = parseFloat(center.style.top) || 0;
	var minions = document.getElementsByClassName("minion");
	for (var m = 0; m < minions.length; m++) {
		var el = minions[m];
		if (el === center || el.style.display === "none") continue;
		if (euclidDistance(cx, parseFloat(el.style.left) || 0, cy, parseFloat(el.style.top) || 0) > missile.splashRadius) continue;
		var splashDmg = missile.splashDamage * getDamageMultiplier(el, "missile");
		if (splashDmg <= 0) continue;
		pendingMissileHits[el.id] = (pendingMissileHits[el.id] || 0) + splashDmg;
		turret.totalDamage += splashDmg;
	}
}

// sizePx (optional): diameter of the impact graphic
function createProjectileImpact(minionEl, className, lifetimeMs, sizePx) {
	var x = parseFloat(minionEl.style.left) || 0;
	var y = parseFloat(minionEl.style.top)  || 0;
	var impact = document.createElement("div");
	impact.className = className;
	impact.style.left = (x + MINION_CENTER) + "px";
	impact.style.top  = (y + MINION_CENTER) + "px";
	if (sizePx) {
		impact.style.width = sizePx + "px";
		impact.style.height = sizePx + "px";
	}
	document.body.appendChild(impact);
	setTimeout(function() {
		if (impact.parentNode) document.body.removeChild(impact);
	}, lifetimeMs);
}

function createProjectileEl(className, startX, startY) {
	var projEl = document.createElement("div");
	projEl.className = className;
	projEl.style.left = startX + "px";
	projEl.style.top  = startY + "px";
	projEl.style.transform = "translate(-50%, -50%)";
	document.body.appendChild(projEl);
	return projEl;
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
			if (euclidDistance(movex[j], turretPos[i].x, movey[j], turretPos[i].y) <= getTurretRange(turretPos[i])) {
				turretPos[i].planeInRange = true;
			}
		}
	}
}

// Minions the turret can hit right now, sorted by its targeting mode (preferred first)
function getTurretCandidates(turret, minions) {
	var candidates = [];
	for (var m = 0; m < minions.length; m++) {
		var el = minions[m];
		if (el.style.display === "none") continue;
		if (isMinionHidden(el)) continue; // camouflaged: only a Pulse Scanner can reveal it
		if (getDamageMultiplier(el, turret.type) === 0) continue;
		if (turret.type === "flamethrower" && isPlaneMinion(el)) continue;
		if (turret.type === "missile" && turret.planeInRange && !isPlaneMinion(el)) continue;
		var mx = parseFloat(el.style.left) || 0;
		var my = parseFloat(el.style.top)  || 0;
		if (euclidDistance(mx, turret.x, my, turret.y) > getTurretRange(turret)) continue;
		candidates.push({ el: el, x: mx, y: my, progress: el._progress || 0, hp: el._hp || 0 });
	}
	return sortByTargetMode(candidates, turret.targetMode);
}

// Picks, once per tick, the minion each single-target turret will shoot
function updateTurretTargets(minions) {
	for (var i = 0; i < turretPos.length; i++) {
		turretPos[i].target = null;
		turretPos[i].volley = [];
		turretPos[i].volleyHeated = false;
		if (!turretHasTargeting(turretPos[i].type) || turretPos[i].type === "archery") continue;
		if (turretPos[i].shotCd > 0) continue;
		if (turretPos[i].type === "stormCannon" && (turretPos[i].active === false || turretPos[i].overheated)) continue;
		var candidates = getTurretCandidates(turretPos[i], minions);
		if (candidates.length > 0) {
			turretPos[i].target = candidates[0].el;
			var volleySize = Math.min(getTurretTargetCount(turretPos[i]), candidates.length);
			for (var v = 0; v < volleySize; v++) turretPos[i].volley.push(candidates[v].el);
		}
	}
}

function setTurretTargetMode(mode) {
	if (TARGET_MODES.indexOf(mode) < 0) return;
	var turretId = document.getElementById("upgTurretId").value;
	for (var i = 0; i < turretPos.length; i++) {
		if (turretPos[i].htmlElement.id === turretId) {
			turretPos[i].targetMode = mode;
			updateTargetModeUI(turretPos[i]);
			break;
		}
	}
}

// Pulse Scanners: every pulse reveals the camouflaged enemies in range (no damage, so they have no target).
// A scanner only pulses (and plays its sound) while a camouflaged enemy is in range: ordinary enemies don't trigger it.
// A camouflaged enemy keeps triggering it while it is revealed, so the detection never lapses between pulses.
function updatePulseScanners(minions) {
	for (var i = 0; i < turretPos.length; i++) {
		var scanner = turretPos[i];
		if (scanner.type !== "pulseScanner" || scanner.shotCd > 0) continue;
		var range = getTurretRange(scanner);
		var detected = false;
		for (var m = 0; m < minions.length; m++) {
			var el = minions[m];
			if (el.style.display === "none" || !isStealthEnemy(el)) continue;
			if (euclidDistance(parseFloat(el.style.left) || 0, scanner.x, parseFloat(el.style.top) || 0, scanner.y) > range) continue;
			detected = true;
			revealMinion(el, PULSE_REVEAL_TICKS);
		}
		if (detected) {
			createPulseBurst(scanner);
			scanner.audioFile.currentTime = 0;
			scanner.audioFile.play().catch(function () {});
			scanner.shotCd = getTurretShotCooldown(scanner.type, scanner.level, scanner);
		}
	}
}

function anyTurretsInRange(minion, x, y) {
	var damage = 0;
	var hidden = isMinionHidden(minion);
	for (var i = 0; i < turretPos.length; i++) {
		var xt = turretPos[i].x;
		var yt = turretPos[i].y;

		// the Pulse Scanner deals no damage (see updatePulseScanners); camouflaged enemies can't be hit
		if (turretPos[i].type === "pulseScanner" || hidden) continue;

		// Blizzard dispara em área — trata separado para não re-disparar por minion
		if (turretPos[i].type == "blizzard") {
			var inRange = euclidDistance(x, xt, y, yt) <= getTurretRange(turretPos[i]);
			if (inRange && turretPos[i].shotCd === 0) {
				var aoeMinions = document.getElementsByClassName("minion");
				var aoeDamage = 0;
				for (var m = 0; m < aoeMinions.length; m++) {
					if (aoeMinions[m].style.display === "none" || isMinionHidden(aoeMinions[m])) continue;
					var mx = parseFloat(aoeMinions[m].style.left) || 0;
					var my = parseFloat(aoeMinions[m].style.top)  || 0;
					if (euclidDistance(mx, xt, my, yt) <= getTurretRange(turretPos[i])) {
						var wasFrozen = hasDebuff(FROZEN_STATUS_ATTRIBUTE, aoeMinions[m]);
						freezeMinion(aoeMinions[m], 100 + turretPos[i].level);
						var blizzBranch = getTurretBranch(turretPos[i]);
						if (blizzBranch && blizzBranch.freezeStacks) addFreezeStack(aoeMinions[m], wasFrozen);
						var blizzDmg = turretPos[i].damage * getDamageMultiplier(aoeMinions[m], "blizzard");
						blizzardPendingDamage[aoeMinions[m].id] = (blizzardPendingDamage[aoeMinions[m].id] || 0) + blizzDmg;
						aoeDamage += blizzDmg;
					}
				}
				createFrostBurst(turretPos[i]);
				turretPos[i].htmlElement.classList.add("blizzard-firing");
				(function(el) {
					setTimeout(function() { el.classList.remove("blizzard-firing"); }, 650);
				})(turretPos[i].htmlElement);
				updateTurretSoundPostShooting(turretPos[i]);
				turretPos[i].totalDamage += aoeDamage;
				turretPos[i].shotCd = getTurretShotCooldown(turretPos[i].type, turretPos[i].level, turretPos[i]);
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

		// immune to this turret (e.g. Fire Tank vs flamethrower): let it pick another target
		if (getDamageMultiplier(minion, turretPos[i].type) === 0) {
			continue;
		}

		if (turretPos[i].type === "stormCannon" && (turretPos[i].active === false || turretPos[i].overheated) && turretPos[i].volley.indexOf(minion) < 0) {
			continue;
		}

		// targeting priority: only shoot the minion picked for this tick
		if (turretPos[i].target && turretPos[i].volley.indexOf(minion) < 0) {
			continue;
		}
		// multi-target volley: the shot cooldown starts with the first hit, the rest of the volley still fires this tick
		var inVolley = getTurretTargetCount(turretPos[i]) > 1 && turretPos[i].volley.indexOf(minion) >= 0;

		if (turretPos[i].type === "missile") {
			if (!isPlaneMinion(minion) && turretPos[i].planeInRange) continue;
			if (turretPos[i].ammo <= 0) continue;
			if (euclidDistance(x, xt, y, yt) <= getTurretRange(turretPos[i]) && turretPos[i].shotCd <= 0) {
				rotateToTarget(x, y, parseInt(turretPos[i].x), parseInt(turretPos[i].y), turretPos[i].htmlElement);
				//turretPos[i].htmlElement.style.borderTop = "3px solid #FFD700";
				turretPos[i].htmlElement.style.borderRadius = "20px/20px";
				// base damage on a normal hit, 2x on a critical (shown on impact)
				var missileDmg = calculateCriticalHitDamage(MISSILE_CRIT_CHANCE + getCritBonus(turretPos[i]), turretPos[i].damage);
				var missileCrit = lastHitCritical;
				if (isPlaneMinion(minion)) missileDmg *= 5;
				missileDmg *= getDamageMultiplier(minion, "missile");
				var missileBranch = getTurretBranch(turretPos[i]);
				if (missileBranch && missileBranch.mainDamageMult) missileDmg *= missileBranch.mainDamageMult;
				turretPos[i].audioFile.currentTime = 0;
				turretPos[i].audioFile.play();
				turretPos[i].ammo--;
				var projStartX = parseInt(turretPos[i].x) + TURRET_CENTER;
				var projStartY = parseInt(turretPos[i].y) + TURRET_CENTER;
				var projEl = createProjectileEl("missile-projectile", projStartX, projStartY);
				turretPos[i].pendingMissiles.push({ minionElement: minion, damage: missileDmg, timer: 80, duration: 80, projectileEl: projEl, startX: projStartX, startY: projStartY, critical: missileCrit, splashRadius: getMissileSplashRadius(turretPos[i]), splashDamage: turretPos[i].damage });
				updateTurretCooldownPostShooting(turretPos[i]);
			} else if (turretPos[i].shotCd === 0) {
				rotate(0, turretPos[i].htmlElement);
				resetShotEffect(turretPos[i].htmlElement);
			}
			continue;
		}

		if (turretPos[i].type === "archery") {
			var inRangeArchery = euclidDistance(x, xt, y, yt) <= getTurretRange(turretPos[i]);
			if (inRangeArchery && turretPos[i].shotCd <= 0) {
				var maxTargets = getTurretTargetCount(turretPos[i]);
				var candidates = getTurretCandidates(turretPos[i], document.getElementsByClassName("minion"));
				if (candidates.length > 0) {
					rotateToTarget(candidates[0].x, candidates[0].y, parseInt(turretPos[i].x), parseInt(turretPos[i].y), turretPos[i].htmlElement);
					turretPos[i].htmlElement.style.borderTop = "1px solid #c08a3e";
					turretPos[i].htmlElement.style.borderRadius = "20px/20px";
					turretPos[i].audioFile.currentTime = 0;
					turretPos[i].audioFile.play();
					var hits = Math.min(maxTargets, candidates.length);
					var arrowStartX = parseInt(turretPos[i].x) + TURRET_CENTER;
					var arrowStartY = parseInt(turretPos[i].y) + TURRET_CENTER;
					for (var ti = 0; ti < hits; ti++) {
						var arrowDmg = (calculateCriticalHitDamage(getArcheryCritChance(turretPos[i]), turretPos[i].damage) + turretPos[i].damage)
							* getDamageMultiplier(candidates[ti].el, "archery");
						var arrowEl = createProjectileEl("arrow-projectile", arrowStartX, arrowStartY);
						turretPos[i].pendingMissiles.push({ minionElement: candidates[ti].el, damage: arrowDmg, timer: 20, duration: 20, projectileEl: arrowEl, startX: arrowStartX, startY: arrowStartY, critical: lastHitCritical });
					}
					updateTurretCooldownPostShooting(turretPos[i]);
				}
			} else if (turretPos[i].shotCd === 0) {
				rotate(0, turretPos[i].htmlElement);
				resetShotEffect(turretPos[i].htmlElement);
			}
			continue;
		}

		if ((euclidDistance(x, xt, y, yt) <= getTurretRange(turretPos[i])) && (turretPos[i].shotCd <= 0 || inVolley)) {
			if (inVolley) turretPos[i].volley.splice(turretPos[i].volley.indexOf(minion), 1);
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
			lastHitCritical = false; // turrets without crit chance don't roll at all
			var triggerDmg = shootingTrigger(turretPos[i], minion, turretPos[i].htmlElement.style);
			var isCrit = lastHitCritical;
			var shotTotal = triggerDmg + turretPos[i].damage;
			if (isPlaneMinion(minion) &&
				(turretPos[i].type === "machineGun" || turretPos[i].type === "laser" || turretPos[i].type === "railCannon")) {
				shotTotal *= 2;
			}
			shotTotal *= getDamageMultiplier(minion, turretPos[i].type);
			if (isCrit) showCriticalPopup(minion, shotTotal);
			turretPos[i].totalDamage += shotTotal;
			damage += shotTotal;
			updateTurretSoundPostShooting(turretPos[i]);
			updateTurretCooldownPostShooting(turretPos[i]);
			if (turretPos[i].type === "stormCannon") {
				turretPos[i].firedThisTurn = true;
				// overheat is added once per volley, not per enemy hit
				if (!turretPos[i].volleyHeated) {
					turretPos[i].volleyHeated = true;
					turretPos[i].overheat += getStormHeatPerShot(turretPos[i]);
				}
				turretPos[i].overheatCoolTick = getTurretShotCooldown("stormCannon", 1);
				turretPos[i].overheatBar.setAttribute("value", turretPos[i].overheat);
				if (turretPos[i].overheat >= STORM_OVERHEAT_MAX) {
					turretPos[i].overheat = STORM_OVERHEAT_MAX;
					setStormOverheated(turretPos[i], true);
				}
			}
		} else if(turretPos[i].shotCd == 0) {
			rotate(0, turretPos[i].htmlElement);
			resetShotEffect(turretPos[i].htmlElement);
		} else if(turretPos[i].type == "railCannon" && turretPos[i].shotCd < (getTurretShotCooldown(turretPos[i].type, turretPos[i].level, turretPos[i])-50)){
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
	var toxicDmg = getToxicDamage(minion) * getDamageMultiplier(minion, "toxic");
	if (toxicDmg > 0 && minion._toxicSource && turretPos.indexOf(minion._toxicSource) >= 0) {
		minion._toxicSource.totalDamage += toxicDmg;
	} else if (toxicDmg > 0) {
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
	var diameter = getTurretRange(turretObj) * 2;
	var centerX = parseInt(turretObj.x) + TURRET_CENTER;
	var centerY = parseInt(turretObj.y) + TURRET_CENTER;
	burst.style.width  = diameter + "px";
	burst.style.height = diameter + "px";
	burst.style.left   = centerX + "px";
	burst.style.top    = centerY + "px";
	document.body.appendChild(burst);
	setTimeout(function() {
		if (burst.parentNode) document.body.removeChild(burst);
	}, 680);
}

// Radar ring of a Pulse Scanner: as big as its range (same animation idea as the frost wave)
function createPulseBurst(turretObj) {
	var burst = document.createElement("div");
	burst.className = "pulse-burst";
	var diameter = getTurretRange(turretObj) * 2;
	burst.style.width  = diameter + "px";
	burst.style.height = diameter + "px";
	burst.style.left   = (parseInt(turretObj.x) + TURRET_CENTER) + "px";
	burst.style.top    = (parseInt(turretObj.y) + TURRET_CENTER) + "px";
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

// ticks until the next minion leaves the spawn (1 tick = 10ms)
function randomSpawnInterval() {
	return MIN_SPAWN_INTERVAL + Math.floor(Math.random() * (MAX_SPAWN_INTERVAL - MIN_SPAWN_INTERVAL + 1));
}

function minionreward() {
	return Math.pow(currentWave + 1, 2);
}

function bossReward() {
	return Math.pow(currentWave + 1, 3);
}
////////////////////////// END WAVE HANDLING

function submitNickname() {
	var input = document.getElementById('nicknameInput');
	var msg   = document.getElementById('nicknameMessage');
	var nickname = input.value.trim();

	if (!nickname) {
		msg.textContent = 'Nickname is required.';
		msg.className = 'nickname-message error';
		msg.style.display = 'block';
		return;
	}

	var isReturning = !!PlayerData.loadPlayer(nickname);
	if (!isReturning) PlayerData.createPlayer(nickname);

	var player = PlayerData.getPlayer();
	RunSession.start(player.nickname);
	if (isReturning) {
		msg.textContent = 'Welcome back, ' + player.nickname + '! Record: ' + player.highestScore;
		msg.className = 'nickname-message info';
		msg.style.display = 'block';
	}

	document.getElementById('playerHud').style.display = 'flex';
	updatePlayerHud();

	setTimeout(function() {
		document.getElementById('nicknameScreen').style.display = 'none';
		showMapSelectScreen();
	}, isReturning ? 1200 : 0);
}

function updatePlayerHud() {
	var player = PlayerData.getPlayer();
	if (!player) return;
	document.getElementById('hudNickname').textContent = player.nickname;
	document.getElementById('hudRecord').textContent   = player.highestScore;
	document.getElementById('hudSeeds').textContent    = player.goldenSeeds;
}

////////////////////// MAP SELECTION SCREEN
function showMapSelectScreen() {
	renderMapGrid();
	document.getElementById('mapSelectScreen').style.display = 'flex';
}

function renderMapGrid() {
	var grid = document.getElementById('mapGrid');
	grid.innerHTML = '';
	var maps = UnlockCatalog.getMaps();
	for (var i = 0; i < maps.length; i++) {
		var m = maps[i];
		var unlocked = UnlockManager.isMapUnlocked(m.id);
		var played   = RunSession.isMapPlayed(m.id);
		var card = document.createElement('div');
		card.className = 'map-card' + (unlocked && !played ? '' : ' map-card-locked');

		var numEl = document.createElement('div');
		numEl.className = 'map-card-num';
		numEl.textContent = 'Map ' + m.id;

		var nameEl = document.createElement('div');
		nameEl.className = 'map-card-name';
		nameEl.textContent = m.name;

		card.appendChild(numEl);
		card.appendChild(nameEl);

		if (played) {
			var doneEl = document.createElement('div');
			doneEl.className = 'map-card-done';
			doneEl.textContent = '✔ Completed';
			card.appendChild(doneEl);
		} else if (unlocked) {
			var btn = document.createElement('button');
			btn.className = 'map-card-btn';
			btn.textContent = 'PLAY';
			(function (mapId) {
				btn.addEventListener('click', function (e) {
					e.stopPropagation();
					startGameOnMap(mapId);
				});
			})(m.id);
			card.appendChild(btn);
		} else {
			var lockEl = document.createElement('div');
			lockEl.className = 'map-card-lock';
			lockEl.textContent = '🌿 ' + m.cost + ' Seeds';
			card.appendChild(lockEl);
		}

		grid.appendChild(card);
	}

	var run = RunSession.get();
	document.getElementById('runScore').textContent = run ? run.score : 0;
	document.getElementById('newRunBtn').style.display =
		run && run.playedMaps.length > 0 ? 'inline-block' : 'none';
}

function startNewRun() {
	RunSession.reset();
	renderMapGrid();
}

// PLAY on a map card asks for the difficulty first; the map starts on confirmDifficulty()
var pendingMapId = null;

function startGameOnMap(mapId) {
	if (RunSession.isMapPlayed(mapId) || !UnlockManager.isMapUnlocked(mapId)) return;
	pendingMapId = mapId;
	renderDifficultyLocks();
	document.getElementById('difficultyScreen').style.display = 'flex';
}

// Locked difficulties (e.g. Very Hard) stay disabled until bought in Progression
function renderDifficultyLocks() {
	var locked = UnlockCatalog.getDifficulties();
	for (var i = 0; i < locked.length; i++) {
		var btn = document.getElementById('difficultyBtn-' + locked[i].id);
		if (!btn) continue;
		var unlocked = UnlockManager.isDifficultyUnlocked(locked[i].id);
		btn.disabled = !unlocked;
		btn.classList.toggle('difficulty-locked', !unlocked);
	}
}

function closeDifficultySelect() {
	pendingMapId = null;
	document.getElementById('difficultyScreen').style.display = 'none';
}

function confirmDifficulty(difficultyId) {
	if (pendingMapId === null) return;
	if (!UnlockManager.isDifficultyUnlocked(difficultyId)) return;
	setDifficulty(difficultyId);
	currentLevel = pendingMapId;
	closeDifficultySelect();
	document.getElementById('mapSelectScreen').style.display = 'none';
	drawMap();
	Tutorial.startIfNeeded();
}
////////////////////// END MAP SELECTION SCREEN

////////////////////// PROGRESSION SCREEN
function showProgressionScreen() {
	renderProgressionScreen();
	document.getElementById('progressionScreen').style.display = 'flex';
}

function hideProgressionScreen() {
	document.getElementById('progressionScreen').style.display = 'none';
}

function renderProgressionScreen() {
	var player = PlayerData.getPlayer();
	document.getElementById('progressionSeeds').textContent = player ? player.goldenSeeds : 0;
	var lockableMaps   = UnlockCatalog.getMaps().filter(function (m) { return m.locked; });
	var lockableTowers = UnlockCatalog.getTowers().filter(function (t) { return t.locked; });
	renderProgressionItems('maps',   lockableMaps,   'progressionMaps');
	renderProgressionItems('towers', lockableTowers, 'progressionTowers');
	var lockableDifficulties = UnlockCatalog.getDifficulties().filter(function (d) { return d.locked; });
	renderProgressionItems('difficulties', lockableDifficulties, 'progressionDifficulties');
}

function renderProgressionItems(category, items, containerId) {
	var container = document.getElementById(containerId);
	container.innerHTML = '';
	var player = PlayerData.getPlayer();
	var seeds  = player ? player.goldenSeeds : 0;

	for (var i = 0; i < items.length; i++) {
		var item  = items[i];
		var owned = UnlockManager.isOwned(category, item.id);

		var row = document.createElement('div');
		row.className = 'prog-item';

		var info = document.createElement('div');
		info.className = 'prog-item-info';
		var nameSpan = document.createElement('span');
		nameSpan.className = 'prog-item-name';
		nameSpan.textContent = item.name;
		var costSpan = document.createElement('span');
		costSpan.className = 'prog-item-cost';
		costSpan.textContent = '🌿 ' + item.cost + ' Seeds';
		info.appendChild(nameSpan);
		info.appendChild(costSpan);

		var btn = document.createElement('button');
		btn.className = 'prog-btn';
		if (owned) {
			btn.className += ' prog-btn-owned';
			btn.textContent = 'Owned';
			btn.disabled = true;
		} else if (seeds >= item.cost) {
			btn.className += ' prog-btn-buy';
			btn.textContent = 'Unlock';
			(function (cat, itemId) {
				btn.addEventListener('click', function () { progressionPurchase(cat, itemId); });
			})(category, item.id);
		} else {
			btn.className += ' prog-btn-locked';
			btn.textContent = 'Need ' + item.cost + ' Seeds';
			btn.disabled = true;
		}

		row.appendChild(info);
		row.appendChild(btn);
		container.appendChild(row);
	}
}

function progressionPurchase(category, id) {
	var result = UnlockManager.purchase(category, id);
	if (result.ok) {
		updatePlayerHud();
		renderProgressionScreen();
		renderMapGrid();
	}
}
////////////////////// END PROGRESSION SCREEN

window.onload = function () {
	applyGameScale();
	window.addEventListener('resize', applyGameScale);

	// Returning from a finished map: resume the run straight on map selection
	var run = RunSession.get();
	if (run && PlayerData.loadPlayer(run.nickname)) {
		document.getElementById('nicknameScreen').style.display = 'none';
		document.getElementById('playerHud').style.display = 'flex';
		updatePlayerHud();
		showMapSelectScreen();
	} else {
		document.getElementById('nicknameInput').focus();
	}

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
	if (!isRunning || branchTurret) {
		return;
	}

	// do we have enough money to make a upgrade?
	for (var i = 0; i < turretPos.length; i++) {
		if(turretPos[i].htmlElement.id == document.getElementById("upgTurretId").value) {
			// no further upgrades before the branch is picked
			if (turretNeedsBranchChoice(turretPos[i])) {
				openBranchChoice(turretPos[i]);
				break;
			}
			//Get Current turret upgrade cost.
			var turretUpgradeCost = turretUpgradeCosts(turretPos[i].type, turretPos[i].level);
			if (currentCash > turretUpgradeCost) {
				if(turretPos[i].level <= 7){
					//Level up before upgrade the turret.
					turretPos[i].level++;
					upgradeTurretData(turretPos[i]);
					refreshPulseAuras(); // a scanner's aura (and range) grows with its level
					//Money reduce
					currentCash = currentCash - turretUpgradeCost;
					updateStatus();
					
					//Update inteface upgrade info.
					updateTurretInfo(turretPos[i]);
					showRangeIndicator(
						parseInt(turretPos[i].x) + TURRET_CENTER,
						parseInt(turretPos[i].y) + TURRET_CENTER,
						getTurretRange(turretPos[i]),
						turretColor(turretPos[i].type)
					);
					if (turretNeedsBranchChoice(turretPos[i])) {
						openBranchChoice(turretPos[i]);
					}
				}
			} else {
				//TODO: ALERT USER
				console.log("Not enough cash: " +  currentCash + ", upgrade: " + turretUpgradeCost);
			}
			break;
		}
	}
}

// BRANCH CHOICE MODAL
// Halts the game loop (separately from the manual pause, which is left untouched) until a branch is picked
function openBranchChoice(turret) {
	var def = TURRET_DEFS[turret.type];
	branchTurret = turret;
	document.getElementById("branchSubtitle").innerText = turretName(turret.type) + " reached level " + def.branchLevel + ". This choice is permanent for this turret.";
	var options = document.getElementById("branchOptions");
	options.innerHTML = "";
	Object.keys(def.branches).forEach(function(branchId) {
		var branch = def.branches[branchId];
		var preview = previewTurretBranch(turret, branchId);
		var crit = branch.critChance ? branch.critChance + "%" : "None";
		// support towers deal no damage: only their range and the branch's own stats matter
		var attackStats = def.support ? "" :
			'<span><b>Damage</b> ' + turret.damage + ' &rarr; ' + preview.damage + '</span>';
		var targetStats = def.support ? "" :
			'<span><b>Targets</b> ' + formatTargetCount(branch.targets) + '</span>' +
			'<span><b>Crit chance</b> ' + crit + '</span>';
		var btn = document.createElement("button");
		btn.type = "button";
		btn.className = "difficulty-btn branch-btn branch-" + branchId;
		btn.innerHTML =
			'<span class="difficulty-name">' + branch.name.toUpperCase() + '</span>' +
			'<span class="difficulty-desc">' + branch.description + '</span>' +
			'<span class="branch-stats">' +
				attackStats +
				'<span><b>Range</b> ' + Math.round(turret.range / MAP_SCALE) + ' &rarr; ' + Math.round(preview.range / MAP_SCALE) + '</span>' +
				(branch.cooldownMult ? '<span><b>Cooldown</b> ' + (getTurretShotCooldown(turret.type, turret.level, turret) / 100).toFixed(2) + ' s &rarr; ' + (preview.cooldown / 100).toFixed(2) + ' s</span>' : '') +
				targetStats +
				(branch.extraStats || []).map(function(line) { return '<span>' + line + '</span>'; }).join('') +
			'</span>';
		btn.onclick = function() { confirmBranchChoice(branchId); };
		options.appendChild(btn);
	});
	document.getElementById("branchScreen").style.display = "flex";
}

function confirmBranchChoice(branchId) {
	var turret = branchTurret;
	if (!turret || !TURRET_DEFS[turret.type].branches[branchId]) return;
	applyTurretBranch(turret, branchId);
	refreshPulseAuras();
	closeBranchChoice();
	// refresh the info panel and range circle for the new stats
	if (document.getElementById("upgTurretId").value === turret.htmlElement.id) {
		updateTurretInfo(turret);
		showRangeIndicator(
			parseInt(turret.x) + TURRET_CENTER,
			parseInt(turret.y) + TURRET_CENTER,
			getTurretRange(turret),
			turretColor(turret.type)
		);
	}
}

function closeBranchChoice() {
	branchTurret = null;
	document.getElementById("branchScreen").style.display = "none";
}
// END BRANCH CHOICE MODAL

function btnBuyAmmoClick() {
	if (!isRunning) return;
	var turretId = document.getElementById("upgTurretId").value;
	for (var i = 0; i < turretPos.length; i++) {
		if (turretPos[i].htmlElement.id !== turretId || turretPos[i].type !== "missile") continue;
		if (turretPos[i].ammoQueue >= 5) return;
		var maxAmmo = getMissileMaxAmmo(turretPos[i].level, turretPos[i]);
		if (turretPos[i].ammo + turretPos[i].ammoQueue >= maxAmmo) return;
		if (currentCash < MISSILE_AMMO_COST) return;
		currentCash -= MISSILE_AMMO_COST;
		turretPos[i].ammoQueue++;
		updateTurretInfo(turretPos[i]);
		updateStatus();
		break;
	}
}

function toggleAutoReload() {
	var turretId = document.getElementById("upgTurretId").value;
	for (var i = 0; i < turretPos.length; i++) {
		if (turretPos[i].htmlElement.id === turretId && turretPos[i].type === "missile") {
			turretPos[i].autoReload = !turretPos[i].autoReload;
			updateTurretInfo(turretPos[i]);
			break;
		}
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
	if (!isRunning) {
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
			refreshPulseAuras(); // towers it was boosting lose the bonus
			//Increases money.
			currentCash += turretSellPrice;
			updateStatus();
			break;
		}
	}
}