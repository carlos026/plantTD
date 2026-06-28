// Minion constants
const FROZEN_STATUS_ATTRIBUTE = "frozen";
const FROZEN_MINION_SPEED = 0.5;
const STUN_STATUS_ATTRIBUTE = "stunned";
const STUNNED_MINION_SPEED = 0;
const TOXIC_STATUS_ATTRIBUTE = "toxic";
const TOXIC_MINION_DAMAGE = 20;
const PLANE_STATUS_ATTRIBUTE = "miniontype";
const PLANE_TYPE_VALUE = "plane";
const PLANE_SPEED = 3.0;
const PLANE_FROZEN_SPEED = 1.0;

// Debuff state is stored as JS properties on the element (_frozen, _stunned, _toxic, _isPlane)
// to avoid the DOM getAttribute/setAttribute overhead on every tick.

function isSpMinion(minionElement) {
	return minionElement._isSpMinion === true;
}

function freezeMinion(minionElement, duration) {
	if (isSpMinion(minionElement)) return;
	minionElement._frozen = duration;
}

function isPlaneMinion(minionElement) {
	return minionElement._isPlane === true;
}

function stunMinion(minionElement, duration) {
	if (isPlaneMinion(minionElement)) return;
	if (isSpMinion(minionElement)) return;
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
			return PLANE_FROZEN_SPEED;
		}
		return PLANE_SPEED;
	}
	if (hasDebuff(STUN_STATUS_ATTRIBUTE, minionElement)) {
		return STUNNED_MINION_SPEED;
	}
	if (hasDebuff(FROZEN_STATUS_ATTRIBUTE, minionElement)) {
		return FROZEN_MINION_SPEED;
	}
	if (isSpMinion(minionElement)) {
		return 1.5;
	}
	return 1.0;
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
	return hpMax;
}

function bossHp() {
	if (currentWave == 10){
		return Math.pow(2, currentWave) * 10;
	} else if (currentWave == 20) {
		return Math.pow(2, currentWave);
	} else if (currentWave == 30) {
		return 2500000;
	}
}
