// Minion constants
const FROZEN_STATUS_ATTRIBUTE = "frozen";
const FROZEN_MINION_SPEED = 0.5;
const STUN_STATUS_ATTRIBUTE = "stunned";
const STUNNED_MINION_SPEED = 0;
const TOXIC_STATUS_ATTRIBUTE = "toxic";
const TOXIC_MINION_DAMAGE = 40;
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

function getSpecialEnemy(mapId) {
	return SPECIAL_ENEMIES[mapId] || SPECIAL_ENEMIES[1];
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
	minionElement.className = "minion" + (profile && profile.cssClass ? " " + profile.cssClass : "");
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

function toxicMinion(minionElement, duration) {
	minionElement._toxic = duration;
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
}

function removeDebuffs(minionElement, hpBarElement) {
	removeDebuff(FROZEN_STATUS_ATTRIBUTE, minionElement, hpBarElement);
	removeDebuff(STUN_STATUS_ATTRIBUTE, minionElement, hpBarElement);
	removeDebuff(TOXIC_STATUS_ATTRIBUTE, minionElement, hpBarElement);
}

function getMinionSpeed(minionElement) {
	if (isPlaneMinion(minionElement)) {
		if (hasDebuff(FROZEN_STATUS_ATTRIBUTE, minionElement)) {
			return PLANE_FROZEN_SPEED * getDifficulty().speedMult;
		}
		return PLANE_SPEED * getDifficulty().speedMult;
	}
	var p = getEnemyProfile(minionElement);
	if (hasDebuff(STUN_STATUS_ATTRIBUTE, minionElement)) {
		return STUNNED_MINION_SPEED;
	}
	if (hasDebuff(FROZEN_STATUS_ATTRIBUTE, minionElement)) {
		return (p && p.frozenSpeed !== undefined ? p.frozenSpeed : FROZEN_MINION_SPEED) * getDifficulty().speedMult;
	}
	return (p ? p.speed : 1.0) * getDifficulty().speedMult;
}


function getToxicDamage(minionElement) {
	let damage = 0;
	if (hasDebuff(TOXIC_STATUS_ATTRIBUTE, minionElement)) {
		damage = TOXIC_MINION_DAMAGE;
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
	return hpMax * getDifficulty().hpMult;
}

function bossHp() {
	var hp;
	if (currentWave == 10){
		hp = Math.pow(2, currentWave) * 15;
	} else if (currentWave == 20) {
		hp = Math.pow(2, currentWave);
	} else if (currentWave == 30) {
		hp = 2500000;
	}
	return hp * getDifficulty().hpMult;
}
