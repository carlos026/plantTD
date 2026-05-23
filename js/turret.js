// Turret functions
function getTurretTypes(){
	const types = ["machineGun", "laser", "flamethrower", "blizzard", "toxic", "stormCannon", "railCannon"];
	return types;
}

function turretColor(type) {
	switch (type) {
	case "machineGun":
		return "#DDA0DD";
	case "laser":
		return "#8c00ff";
	case "flamethrower":
		return "#ff00ea";
	case "blizzard":
		return "#00bcbc";
	case "toxic":
		return "#27752b";
	case "stormCannon":
		return "#FF4500";
	case "railCannon":
		return "#fff700";
	}
}

function getTurretShotCooldown(type, level){
	switch (type) {
	case "machineGun":
		return 10;
	case "laser":
		return 152 - (level * 10);
	case "flamethrower":
		return 25;
	case "blizzard":
		return 202 - (level * 20);
	case "toxic":
		return 201 - (level * 10);
	case "stormCannon":
		return 10;
	case "railCannon":
		return 601 - (level * 30);
	}
}

function getTurretAnimationCooldown(type, level){
	switch (type) {
	case "machineGun":
		return 0;
	case "laser":
		return 0;
	case "flamethrower":
		return 0;
	case "blizzard":
		return 0;
	case "toxic":
		return 0;
	case "stormCannon":
		return 0;
	case "railCannon":
		return 0;
	}
}

function updateTurretCooldownPostShooting(turret) {
	if (turret.shotCd > 0) {
		console.log("Turret should not shoot! -> " + turret.htmlElement.id);
	} else {
		switch (turret.type) {
		//case "machineGun":
			//break;
		//case "laser":
			//break;
		case "flamethrower":
			if (turret.shotCd < -49) {
				turret.shotCd = getTurretShotCooldown(turret.type, turret.level);
			} else {
				turret.shotCd--;
			}
			break;
		case "blizzard":
			break; // cooldown gerenciado diretamente no disparo AoE
		//case "stormCannon":
			//break;
		//case "railCannon":
			//break;
		default:
			turret.shotCd = getTurretShotCooldown(turret.type, turret.level);
			break;
		}
	}
}

// Reduces turret cooldown on every tick and deals with specific behaviors too
function updateTurretCooldownPostTurn(turrets){
	for (var i = 0; i < turrets.length; i++) {
		if (turrets[i].shotCd > 0) {
			turrets[i].shotCd--;
		} else {
			switch (turrets[i].type) {
			case "machineGun":
				break;
			case "laser":
				break;
			case "flamethrower":
				if (turrets[i].shotCd < 0) {
					turrets[i].shotCd++;
				}
				break;
			case "blizzard":
				if (turrets[i].shotCd == -1) {
					turrets[i].shotCd = getTurretShotCooldown(turrets[i].type, turrets[i].level);
				}
				break;
			case "toxic":
				break;
			case "stormCannon":
				break;
			case "railCannon":
				break;
			}
		}
	}
}

// It plays the sound effect while the turret is firing.
function updateTurretSoundPostShooting(turrets){
		if (turrets.audioCd < 0) {
			turrets.audioFile.play();
			turrets.audioCd = getTurretShotCooldown(turrets.type, turrets.level);
		} else {
			turrets.audioCd--;
			turrets.audioFile.play();
		}
}

function turretSoundEffect(type){
	switch (type) {
		case "machineGun":
			return new Audio("sound/MachineGun.wav");
		case "laser":
			return new Audio("sound/Laser.wav");
		case "flamethrower":
			return new Audio("sound/Flamethrower.wav");
		case "blizzard":
			return new Audio("sound/Blizzard.wav");
		case "toxic":
			return new Audio("sound/Toxic.wav");
		case "stormCannon":
			return new Audio("sound/StormCannon.wav");
		case "railCannon":
			return new Audio("sound/RailCannon.wav");
		}
}

function turretImage(type) {
	switch (type) {
	case "machineGun":
		return "url('img/tw/tower0.png')";
	case "laser":
		return "url('img/tw/tower1.png')";
	case "flamethrower":
		return "url('img/tw/tower2.png')";
	case "blizzard":
		return "url('img/tw/tower3.png')";
	case "toxic":
		return "url('img/tw/Toxic.png')";
	case "stormCannon":
		return "url('img/tw/tower4.png')";
	case "railCannon":
		return "url('img/tw/tower5.png')";
	}
}

function turretValue(type) {
	switch (type) {
	case "machineGun":
		return 20;
	case "laser":
		return 100;
	case "flamethrower":
		return 400;
	case "blizzard":
		return 600;
	case "toxic":
		return 800;
	case "railCannon":
		return 1500;
	case "stormCannon":
		return 2000;
	}
}

function turretRange(type) {
	switch (type) {
	case "machineGun":
		return 3 * TILE_W;
	case "laser":
		return 7 * TILE_W;
	case "flamethrower":
		return 2 * TILE_W;
	case "blizzard":
		return 5 * TILE_W;
	case "toxic":
		return 7 * TILE_W;
	case "stormCannon":
		return 15 * TILE_W;
	case "railCannon":
		return 5 * TILE_W;
	}
}

function turretDamage(type) {
	switch (type) {
	case "machineGun":
		return 20;
	case "laser":
		return 120;
	case "flamethrower":
		return 60;
	case "blizzard":
		return 10;
	case "toxic":
		return 300;
	case "stormCannon":
		return 220;
	case "railCannon":
		return 3000;
	}
}

function turretName(type) {
	switch (type) {
	case "machineGun":
		return "Machine Gun";
	case "laser":
		return "Laser";
	case "flamethrower":
		return "Flamethrower";
	case "blizzard":
		return "Blizzard Tower";
	case "stormCannon":
		return "Storm Cannon";
	case "toxic":
		return "Toxic Tower";
	case "railCannon":
		return "Rail Cannon";
	}
}

function turretUpgradeCosts(type, turretLvl) {
	var upgradeCost = turretLvl * turretValue(type);
	switch(type) {
	case "machineGun":
		upgradeCost = upgradeCost * 5;
		break;
	case "laser":
		upgradeCost = upgradeCost * 0.8;
		break;
	case "flamethrower":
		upgradeCost = upgradeCost * 0.3;
		break;
	case "blizzard":
		upgradeCost = upgradeCost * 0.15;
		break;
	case "toxic":
		upgradeCost = upgradeCost * 0.15;
		break;
	case "stormCannon":
		upgradeCost = upgradeCost * 0.15;
		break;
	case "railCannon":
		upgradeCost = upgradeCost * 0.2;
		break;
	}
	return upgradeCost;
}

function getTurretSellPrice(type, upgradeTotalValue) {
	return (turretValue(type) * (0.2)) + (upgradeTotalValue * 0.2);
}

// DRAG AND DROP
function turretDrag(turretElement) {
	function drag(evt) {
		evt = evt || window.event;
		evt.dataTransfer.effectAllowed = 'copy';
		evt.dataTransfer.setData("Text", turretElement.id);
	}
	return drag;
}

function nodrag(evt) { }
// END DRAG AND DROP

function moveProjectiles() {
	var projectiles = document.getElementsByClassName("projectile");
	for (var index = 0; index < projectiles.length; index++) {
		var projectile =  projectiles[index];
		var currentX = parseInt(projectile.style.left.split("px")[0]);
		var currentY = parseInt(projectile.style.top.split("px")[0]);
		var targetMinion = document.getElementById(projectile.getAttribute("targetMinionId"));
		var targetX = parseInt(targetMinion.style.left.split("px")[0]);
		var targetY = parseInt(targetMinion.style.top.split("px")[0]);
		var xToTarget = Math.abs(currentX - targetX);
		var yToTarget = Math.abs(currentY - targetY);
		if ((xToTarget <= 7 && yToTarget <= 7)) {
			document.body.removeChild(projectile);
		} else {
			// Increases moved distance on specific axis to reduce diagonal visual impact.
			// If target distance on an axys is higher than double of the other, projectile moves faster on that axys
			var xToAdd = xToTarget > (yToTarget * 2) ? 7 : 5;
			var yToAdd = yToTarget > (xToTarget * 2) ? 7 : 5;
			if (currentX + xToAdd < targetX) {
				projectile.style.left = currentX + xToAdd + "px";
			}
			if (currentX - xToAdd > targetX) {
				projectile.style.left = currentX - xToAdd + "px";
			}
			if (currentY + yToAdd < targetY) {
				projectile.style.top = currentY + yToAdd + "px";
			}
			if (currentY - yToAdd > targetY) {
				projectile.style.top = currentY - yToAdd + "px";
			}
		}
	}
}
//Method to allow dead minions to call and destroy lost shots
function deleteProjectilesTargetingMinion(minionId) {
	var projectiles = document.querySelectorAll(".projectile[targetMinionId='" + minionId + "']");
	
	for (var index = 0; index < projectiles.length; index++) {
		document.body.removeChild(projectiles[index]);
	}
}

function showTurretInfo(turret){
	function upgrade(evt) {
		var form = document.getElementById("registrationForm");
		updateTurretInfo(turret);
		document.getElementById("upgBtn").style.display = turret.level <= 4 ? "block" : "none";
		if (form.style.display === "none") {
			form.style.display = "block";
			showRangeIndicator(
				parseInt(turret.x) + 8,
				parseInt(turret.y) + 8,
				turret.range,
				turretColor(turret.type)
			);
		} else {
			form.style.display = "none";
			hideRangeIndicator();
		}
	}
	return upgrade;
}

function updateTurretInfo(turret){
    document.getElementById("upgTurretId").value = turret.htmlElement.id;
    document.getElementById("upgName").innerText = turretName(turret.type);
    document.getElementById("upgLevel").innerText = turret.level;
    document.getElementById("upgDamage").innerText = turret.damage;
    document.getElementById("range").innerText = turret.range;
    document.getElementById("sellBtn").innerText = getTurretSellPrice(turret.type, turretUpgradeCosts(turret.type, turret.level - 1)) + "\nSell!";
    document.getElementById("upgBtn").innerText = turretUpgradeCosts(turret.type, turret.level) + "\nUpgrade!";
}

// Change turret data
function upgradeTurretData(turret){
	var upgradeDamage = turret.level * turretDamage(turret.type);
	var upgradeRange =  turret.level * turretRange(turret.type);
	//Upgrade Damage and range;
	switch(turret.type){
		case "machineGun":
			turret.damage += upgradeDamage * 0.5;
			turret.range += upgradeRange * 0.1;
			break;
		case "laser":
			turret.damage += upgradeDamage * 0.3;
			turret.range += upgradeRange * 0.05;
			break;
		case "flamethrower":
			turret.damage += upgradeDamage * 0.2;
			turret.range += upgradeRange * 0.025;
			break;
		case "blizzard":
			// Cooldown reduction is this upgrade focus
			turret.damage += upgradeDamage * 0.1;
			turret.range += upgradeRange * 0.02;
			break;
		case "toxic":
			turret.damage += upgradeDamage * 0.3;
			turret.range += upgradeRange * 0.1;
			break;
		case "stormCannon":
			turret.damage += upgradeDamage * 0.1;
			turret.range += upgradeRange * 0.005;
			break;
		case "railCannon":
			turret.damage += turretDamage(turret.type) * 0.25;
			turret.range += turretRange(turret.type) * 0.2;
			break;
	}
}

function shootingTrigger(turret, minion, turretStyle, damage){
	//return 0 to deactivate critical hit.
	switch(turret.type){
		case "machineGun":
			turretStyle.borderTop = "1px solid #cdfb00";
			turretStyle.borderRadius = "20px/20px";
			return calculateCriticalHitDamage(10, turret.damage);
		case "laser":
			turretStyle.borderTop = "1px solid #ff0000";
			turretStyle.borderRadius = "10px/10px";
			return calculateCriticalHitDamage(30, turret.damage);
		case "flamethrower":
			turretStyle.borderTop = "8px solid #b00101";
			turretStyle.borderRadius = "10px/10px";
			return 0;
		case "blizzard":
			// Slow down the enemy
			turretStyle.border = "2px solid rgba(0, 153, 255, 0.5)";
			freezeMinion(minion, 100 + (turret.level * 10));
			return 0;
		case "toxic":
			turretStyle.borderTop = "3px solid #4CAF50";
			turretStyle.borderRadius = "20px/20px";
			toxicMinion(minion, 125 + (turret.level * 20));
			return calculateCriticalHitDamage(10, turret.damage);
		case "stormCannon":
			turretStyle.borderTop = "3px solid #0905eb";
			turretStyle.borderRadius = "20px/20px";
			return calculateCriticalHitDamage(3, turret.damage);
		case "railCannon":
			turretStyle.borderTop = "3px solid #6600ff";
			turretStyle.borderRadius = "20px/20px";
			stunMinion(minion, 150 + (turret.level * 50));
			return calculateCriticalHitDamage(20, turret.damage);
	}
}

function calculateCriticalHitDamage(criticalChance, turretDamage) {
    // Generate a random number between 0 and 1
    let randomNumber = Math.random();
	let criticalDmg = turretDamage;
    // Compare the random number with critical chance
    // Convert criticalChance from percentage to decimal
	if (randomNumber < (criticalChance / 100)) {
		criticalDmg = turretDamage * 2;
	}

	return criticalDmg;
}