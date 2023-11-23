// Minion constants
const FROZEN_STATUS_ATTRIBUTE = "frozen";
const FROZEN_MINION_SPEED = 1;
const STUN_STATUS_ATTRIBUTE = "stunned";
const STUNNED_MINION_SPEED = 0;

// Minion status related functions
function freezeMinion(minionElement, duration) {
	minionElement.setAttribute(FROZEN_STATUS_ATTRIBUTE, duration);
}

function stunMinion(minionElement, duration) {
	minionElement.setAttribute(STUN_STATUS_ATTRIBUTE, duration);
}

function applyDebuff(debuff, minionElement, duration) {
	minionElement.setAttribute(debuff, duration);
}

function hasDebuff(debuff, minionElement) {
	return minionElement.hasAttribute(debuff);
}

function applyDebuffVisual(debuff, hpBarElement){
	if (!hpBarElement.classList.contains(debuff)) {
		hpBarElement.classList.add(debuff);
	}
}

function removeDebuff(debuff, minionElement, hpBarElement) {
	minionElement.removeAttribute(debuff);
	hpBarElement.classList.remove(debuff);
}

function addToDebuffDuration(debuff, minionElement, hpBarElement, quantity) {
	if (hasDebuff(debuff, minionElement)) {
		let debuffDuration = +minionElement.getAttribute(debuff) + quantity;
		if (debuffDuration < 1) {
			removeDebuff(debuff, minionElement, hpBarElement);
		} else {
			minionElement.setAttribute(debuff, debuffDuration);
			applyDebuffVisual(debuff, hpBarElement);
		}
	}
}

function tickDownMinionDebuffs(minionElement, hpBarElement){
	addToDebuffDuration(FROZEN_STATUS_ATTRIBUTE, minionElement, hpBarElement, -1);
	addToDebuffDuration(STUN_STATUS_ATTRIBUTE, minionElement, hpBarElement, -1);
}

function removeDebuffs(minionElement, hpBarElement) {
	removeDebuff(FROZEN_STATUS_ATTRIBUTE, minionElement, hpBarElement);
	removeDebuff(STUN_STATUS_ATTRIBUTE, minionElement, hpBarElement);
}

function getMinionSpeed(minionElement) {
	let speed = 1.5;
	if (hasDebuff(STUN_STATUS_ATTRIBUTE, minionElement)) {
		speed = STUNNED_MINION_SPEED;
	} else if (hasDebuff(FROZEN_STATUS_ATTRIBUTE, minionElement)) {
		speed = FROZEN_MINION_SPEED;
	}
	return speed;
}