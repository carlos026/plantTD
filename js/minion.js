// Minion constants
const FROZEN_STATUS_ATTRIBUTE = "frozen";
const FROZEN_MINION_SPEED = 0.5;
const STUN_STATUS_ATTRIBUTE = "stunned";
const STUNNED_MINION_SPEED = 0;
const TOXIC_STATUS_ATTRIBUTE = "toxic";
const TOXIC_MINION_DAMAGE = 40;
const BURNING_STATUS_ATTRIBUTE = "burning";
const PLANE_STATUS_ATTRIBUTE = "miniontype";
const PLANE_TYPE_VALUE = "plane";
const PLANE_SPEED = 3.0;
const PLANE_FROZEN_SPEED = 1.0;

const DARK_SHIELD_DAMAGE_MULT = 2;
const DARK_SHIELD_REGEN_TICKS = 1000; // 10s at 10ms per tick

// Debuff state is stored as JS properties on the element (_frozen, _stunned, _toxic, _isPlane)
// to avoid the DOM getAttribute/setAttribute overhead on every tick.

// Special enemy of each map, spawned from wave 20 on. Keyed by map id.
//   speed / frozenSpeed: movement per tick (frozenSpeed omitted = immune or default)
//   damageMult: multiplier for every turret; turretMult overrides it per turret type
//   livesCost: lives lost when it escapes
//   shield: starts with a shield equal to its HP (see absorbWithShield)
//   sprite: own "up" image (rotated like every minion); without it the generic
//           sp-min sprite is used, tinted via cssClass
const SPECIAL_ENEMIES = {
	1: { name: "Special Tank", cssClass: "enemy-special-tank", speed: 1.5, hpMult: 1, livesCost: 1,
	     immuneFreeze: true, immuneStun: true, damageMult: 2 },
	2: { name: "Mecha", cssClass: "enemy-mecha", speed: 0.5, frozenSpeed: 0.25, hpMult: 2, livesCost: 1,
	     immuneFreeze: false, immuneStun: true, damageMult: 1, sprite: "img/min-lv1/mechaw-up.png" },
	3: { name: "Forest Tank", cssClass: "enemy-forest-tank", speed: 1.0, hpMult: 1, livesCost: 1,
	     immuneFreeze: false, immuneStun: false, damageMult: 0.5, turretMult: { flamethrower: 4 } },
	4: { name: "Fire Tank", cssClass: "enemy-fire-tank", speed: 1.0, hpMult: 1, livesCost: 2,
	     immuneFreeze: false, immuneStun: false, damageMult: 1, turretMult: { flamethrower: 0, blizzard: 200 } },
	5: { name: "Dark Tank", cssClass: "enemy-dark-tank", speed: 1.0, hpMult: 1, livesCost: 1,
	     immuneFreeze: true, immuneStun: true, damageMult: 1, shield: true },
	6: { name: "Ice Mecha", cssClass: "enemy-ice-mecha", speed: 0.5, hpMult: 2, livesCost: 1,
	     immuneFreeze: true, immuneStun: true, damageMult: 1, sprite: "img/min-lv1/mecha-up.png" }
};

// Medic Truck: appears from wave 11 on (every map). Periodically heals nearby enemies
// and cleanses their debuffs (see medicPulse in tower-defense.js).
const MEDIC_MIN_WAVE = 11;
const MEDIC_SPAWN_CHANCE = 0.2;      // of the non-jet enemies
const MEDIC_PULSE_TICKS = 150;       // 1.5s at 10ms per tick (1x speed)
const MEDIC_HEAL_PCT = 0.10;         // of the healed enemy's max HP
// Enemies leave the gate 40-160 ticks apart (~2.7-10.7 tiles at speed 1.0), so the range must be wide
const MEDIC_RANGE_TILES = 6;
const MEDIC_HEAL_SOUND = "sound/healing.wav";
const MEDIC_ENEMY = {
	name: "Medic Truck", cssClass: "enemy-medic", speed: 1.25, hpMult: 0.5, livesCost: 1,
	immuneFreeze: false, immuneStun: false, damageMult: 1, sprite: "img/min-lv1/medic-truck.png", medic: true
};

// Stealth Tank: appears from wave 11 on (every map). Camouflaged (see CAMOUFLAGE below): no turret can
// target it until a Pulse Scanner reveals it. Its sprites are crossfaded by CSS (.enemy-stealth in board.css):
// sprite while hidden, revealedSprite once a scanner detects it. STEALTH_SPAWN_CHANCE is a share of the non-jet enemies.
const STEALTH_MIN_WAVE = 11;
const STEALTH_SPAWN_CHANCE = 0.2;
const STEALTH_HIDE_SOUND = "sound/hide.wav";
const STEALTH_ENEMY = {
	name: "Stealth Tank", cssClass: "enemy-stealth", speed: 1.10, hpMult: 1, livesCost: 1,
	immuneFreeze: false, immuneStun: false, damageMult: 1, stealth: true,
	sprite: "img/min-lv1/stealth-tank-onstealth.png", revealedSprite: "img/min-lv1/stealth-tank.png"
};

function getSpecialEnemy(mapId) {
	return SPECIAL_ENEMIES[mapId] || SPECIAL_ENEMIES[1];
}

// Endless mode: any map's special enemy / boss can show up
function randomEnemyMapId() {
	var ids = Object.keys(SPECIAL_ENEMIES);
	return parseInt(ids[Math.floor(Math.random() * ids.length)], 10);
}

// Wave 30 boss: the map's special enemy with all its traits, just bigger and named "Boss"
var _bossProfiles = {};
function getBossProfile(mapId) {
	if (!_bossProfiles[mapId]) {
		var base = getSpecialEnemy(mapId);
		var boss = {};
		for (var k in base) boss[k] = base[k];
		boss.name = base.name + " Boss";
		_bossProfiles[mapId] = boss;
	}
	return _bossProfiles[mapId];
}

// CAMOUFLAGE
// An enemy whose profile has stealth: true is camouflaged: no turret can target or hit it until a
// Pulse Scanner reveals it (_revealed = ticks left). The "stealthed" class is on the element while it is hidden.
function isStealthEnemy(minionElement) {
	var p = getEnemyProfile(minionElement);
	return !!(p && p.stealth);
}

// true while the enemy is camouflaged and not detected
function isMinionHidden(minionElement) {
	return isStealthEnemy(minionElement) && !(minionElement._revealed > 0);
}

// Pulse Scanner detection: keeps a camouflaged enemy revealed for at least `ticks` more ticks
function revealMinion(minionElement, ticks) {
	if (!isStealthEnemy(minionElement)) return;
	if (!(minionElement._revealed >= ticks)) minionElement._revealed = ticks;
	minionElement.classList.remove("stealthed");
}

// Every tick: the detection wears off and the camouflage comes back
function tickStealth(minionElement) {
	if (!isStealthEnemy(minionElement)) return;
	if (minionElement._revealed > 0) minionElement._revealed--;
	minionElement.classList.toggle("stealthed", minionElement._revealed <= 0);
}
// END CAMOUFLAGE

function getEnemyProfile(minionElement) {
	return minionElement._enemy || null;
}

function isSpMinion(minionElement) {
	return getEnemyProfile(minionElement) !== null;
}

// Turns a minion element into a regular minion (profile = null) or a special enemy.
function setEnemyProfile(minionElement, profile, hp) {
	minionElement._enemy = profile;
	minionElement._shieldMax = profile && profile.shield ? hp : 0;
	minionElement._shield = minionElement._shieldMax;
	minionElement._shieldRegen = 0;
	minionElement._revealed = 0;
	minionElement._spawnSoundPlayed = false;
	minionElement.className = "minion" + (profile && profile.cssClass ? " " + profile.cssClass : "") + (profile && profile.stealth ? " stealthed" : "");
}

function getEnemyHpMult(minionElement) {
	var p = getEnemyProfile(minionElement);
	return p ? p.hpMult : 1;
}

function getEnemyLivesCost(minionElement) {
	var p = getEnemyProfile(minionElement);
	return p ? p.livesCost : 1;
}

// Damage multiplier of a turret type against this minion (0 = immune).
function getDamageMultiplier(minionElement, turretType) {
	var p = getEnemyProfile(minionElement);
	if (!p) return 1;
	if (p.turretMult && p.turretMult[turretType] !== undefined) return p.turretMult[turretType];
	return p.damageMult;
}

// Dark Tank: the shield takes damage first (at DARK_SHIELD_DAMAGE_MULT).
// Returns the damage that reaches HP. When the shield breaks, a regen timer starts.
function absorbWithShield(minionElement, damage) {
	if (!minionElement._shieldMax || damage <= 0 || minionElement._shield <= 0) return damage;
	var shieldDmg = damage * DARK_SHIELD_DAMAGE_MULT;
	if (shieldDmg < minionElement._shield) {
		minionElement._shield -= shieldDmg;
		return 0;
	}
	var overflow = (shieldDmg - minionElement._shield) / DARK_SHIELD_DAMAGE_MULT;
	minionElement._shield = 0;
	minionElement._shieldRegen = DARK_SHIELD_REGEN_TICKS;
	return overflow;
}

// Restores the full shield if the minion survived DARK_SHIELD_REGEN_TICKS without it.
function tickShield(minionElement) {
	if (!minionElement._shieldMax) return;
	if (minionElement._shield <= 0 && minionElement._shieldRegen > 0) {
		minionElement._shieldRegen--;
		if (minionElement._shieldRegen === 0) minionElement._shield = minionElement._shieldMax;
	}
}

function freezeMinion(minionElement, duration) {
	var p = getEnemyProfile(minionElement);
	if (p && p.immuneFreeze) return;
	minionElement._frozen = duration;
}

function isPlaneMinion(minionElement) {
	return minionElement._isPlane === true;
}

function stunMinion(minionElement, duration) {
	if (isPlaneMinion(minionElement)) return;
	if (minionElement._isBoss) return; // every boss is stun immune
	var p = getEnemyProfile(minionElement);
	if (p && p.immuneStun) return;
	minionElement._stunned = duration;
}

// damage (per tick) and sourceTurret are optional: without them the base poison damage is used
function toxicMinion(minionElement, duration, damage, sourceTurret) {
	minionElement._toxic = duration;
	minionElement._toxicDamage = damage || TOXIC_MINION_DAMAGE;
	minionElement._toxicSource = sourceTurret || null;
}

// Contamination: poisons the other enemies within radius px of the hit one.
// An enemy already poisoned keeps its poison unless the new one lasts longer.
function spreadToxic(sourceMinion, duration, radius, sourceTurret) {
	var minions = document.getElementsByClassName("minion");
	var sx = parseFloat(sourceMinion.style.left) || 0;
	var sy = parseFloat(sourceMinion.style.top) || 0;
	for (var m = 0; m < minions.length; m++) {
		var el = minions[m];
		if (el === sourceMinion || el.style.display === "none") continue;
		if (euclidDistance(sx, parseFloat(el.style.left) || 0, sy, parseFloat(el.style.top) || 0) > radius) continue;
		if (hasDebuff(TOXIC_STATUS_ATTRIBUTE, el) && el._toxic >= duration) continue;
		toxicMinion(el, duration, getToxicPoisonDamage(sourceTurret), sourceTurret);
	}
}

// Snow King: adds a freeze stack; the stacks are lost once the freeze wears off.
// At BLIZZARD_STUN_STACKS the enemy is stunned and the stacks restart (stun immune enemies just restart them).
// Call right after freezeMinion; wasFrozen is whether the enemy was already frozen before that call.
function addFreezeStack(minionElement, wasFrozen) {
	if (!wasFrozen) minionElement._freezeStacks = 0;
	if (!hasDebuff(FROZEN_STATUS_ATTRIBUTE, minionElement)) return; // freeze immune: nothing to stack
	minionElement._freezeStacks = (minionElement._freezeStacks || 0) + 1;
	if (minionElement._freezeStacks >= BLIZZARD_STUN_STACKS) {
		minionElement._freezeStacks = 0;
		stunMinion(minionElement, BLIZZARD_STUN_DURATION);
	}
}

// Burning is not refreshed while active, otherwise a turret hitting every tick would never let it finish.
// sourceTurret is credited with the damage when it triggers.
function burnMinion(minionElement, sourceTurret) {
	if (hasDebuff(BURNING_STATUS_ATTRIBUTE, minionElement)) return;
	minionElement._burning = BURN_DURATION;
	minionElement._burnSource = sourceTurret;
}

// Burning damage for this tick: a percentage of the enemy's max HP, dealt on its last tick.
// Enemies weak to the flamethrower (damage multiplier above 1) take the higher percentage.
function getBurnDamage(minionElement, maxHp) {
	if (minionElement._burning !== 1) return 0;
	var pct = getDamageMultiplier(minionElement, "flamethrower") > 1 ? BURN_WEAK_HP_PCT : BURN_HP_PCT;
	return maxHp * pct / 100;
}

function applyDebuff(debuff, minionElement, duration) {
	minionElement["_" + debuff] = duration;
}

function hasDebuff(debuff, minionElement) {
	var val = minionElement["_" + debuff];
	return val != null && val > 0;
}

function applyDebuffVisual(debuff, hpBarElement){
	if (!hpBarElement.classList.contains(debuff)) {
		hpBarElement.classList.add(debuff);
	}
}

function removeDebuff(debuff, minionElement, hpBarElement) {
	minionElement["_" + debuff] = undefined;
	hpBarElement.classList.remove(debuff);
}

function addToDebuffDuration(debuff, minionElement, hpBarElement, quantity) {
	var key = "_" + debuff;
	var val = minionElement[key];
	if (val != null && val > 0) {
		var newDuration = val + quantity;
		if (newDuration < 1) {
			minionElement[key] = undefined;
			hpBarElement.classList.remove(debuff);
		} else {
			minionElement[key] = newDuration;
			applyDebuffVisual(debuff, hpBarElement);
		}
	}
}

function tickDownMinionDebuffs(minionElement, hpBarElement){
	addToDebuffDuration(FROZEN_STATUS_ATTRIBUTE, minionElement, hpBarElement, -1);
	addToDebuffDuration(STUN_STATUS_ATTRIBUTE, minionElement, hpBarElement, -1);
	addToDebuffDuration(TOXIC_STATUS_ATTRIBUTE, minionElement, hpBarElement, -1);
	addToDebuffDuration(BURNING_STATUS_ATTRIBUTE, minionElement, hpBarElement, -1);
}

function removeDebuffs(minionElement, hpBarElement) {
	removeDebuff(FROZEN_STATUS_ATTRIBUTE, minionElement, hpBarElement);
	removeDebuff(STUN_STATUS_ATTRIBUTE, minionElement, hpBarElement);
	removeDebuff(TOXIC_STATUS_ATTRIBUTE, minionElement, hpBarElement);
	removeDebuff(BURNING_STATUS_ATTRIBUTE, minionElement, hpBarElement);
	minionElement._burnSource = null;
	minionElement._freezeStacks = 0;
}

function getMinionSpeed(minionElement) {
	if (isPlaneMinion(minionElement)) {
		if (hasDebuff(FROZEN_STATUS_ATTRIBUTE, minionElement)) {
			return PLANE_FROZEN_SPEED * enemySpeedMult();
		}
		return PLANE_SPEED * enemySpeedMult();
	}
	var p = getEnemyProfile(minionElement);
	if (hasDebuff(STUN_STATUS_ATTRIBUTE, minionElement)) {
		return STUNNED_MINION_SPEED;
	}
	if (hasDebuff(FROZEN_STATUS_ATTRIBUTE, minionElement)) {
		return (p && p.frozenSpeed !== undefined ? p.frozenSpeed : FROZEN_MINION_SPEED) * enemySpeedMult();
	}
	return (p ? p.speed : 1.0) * enemySpeedMult();
}


function getToxicDamage(minionElement) {
	let damage = 0;
	if (hasDebuff(TOXIC_STATUS_ATTRIBUTE, minionElement)) {
		damage = minionElement._toxicDamage || TOXIC_MINION_DAMAGE;
	}
	return damage;
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
	if(currentWave > 20) {
		hpMax = 200000 * Math.pow(1.09, currentWave - 21);
	}
	return hpMax * enemyHpMult();
}

function bossHp() {
	var hp;
	if (currentWave == 10){
		hp = Math.pow(2, currentWave) * 20;
	} else if (currentWave == 20) {
		hp = Math.pow(2, currentWave);
	} else if (currentWave == 30) {
		hp = 2500000;
	} else {
		// Endless bosses after wave 30 grow at the same rate as late-game minions
		hp = 2500000 * Math.pow(1.09, currentWave - 30);
	}
	return hp * enemyHpMult();
}
