// Turret functions
function getTurretTypes(){
	const types = ["machineGun", "laser", "flamethrower", "blizzard", "stormCannon", "railCannon"];
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
	case "stormCannon":
		return "#FF4500";
	case "railCannon":
		return "#fff700";
	}
}

function getTurretShotCooldown(type, level){
	switch (type) {
	case "machineGun":
		return 0;
	case "laser":
		return 0;
	case "flamethrower":
		return 50;
	case "blizzard":
		return 101 - level;
	case "stormCannon":
		return 0;
	case "railCannon":
		return 0;
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
			turret.shotCd = -1;
			break;
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
			case "stormCannon":
				break;
			case "railCannon":
				break;
			}
		}
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
	case "stormCannon":
		return "url('img/tw/tower4.png')";
	case "railCannon":
		return "url('img/tw/tower5.png')";
	}
}

function turretValue(type) {
	switch (type) {
	case "machineGun":
		return 10;
	case "laser":
		return 100;
	case "flamethrower":
		return 500;
	case "blizzard":
		return 800;
	case "stormCannon":
		return 3000;
	case "railCannon":
		return 5000;
	}
}

function turretRange(type) {
	switch (type) {
	case "machineGun":
		return 3 * TILE_W;
	case "laser":
		return 5 * TILE_W;
	case "flamethrower":
		return 10 * TILE_W;
	case "blizzard":
		return 10 * TILE_W;
	case "stormCannon":
		return 15 * TILE_W;
	case "railCannon":
		return 20 * TILE_W;
	}
}

function turretDamage(type) {
	switch (type) {
	case "machineGun":
		return 1;
	case "laser":
		return 3;
	case "flamethrower":
		return 5;
	case "blizzard":
		return 8;
	case "stormCannon":
		return 10;
	case "railCannon":
		return 20;
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
		upgradeCost = upgradeCost * 0.2;
		break;
	case "stormCannon":
		upgradeCost = upgradeCost * 0.15;
		break;
	case "railCannon":
		upgradeCost = upgradeCost * 0.10;
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
		document.getElementById("upgTurretId").value = turret.htmlElement.id;
		document.getElementById("upgName").innerText = turretName(turret.type);
		document.getElementById("upgLevel").innerText = turret.level;
		document.getElementById("upgDamage").innerText = turret.damage;
		document.getElementById("range").innerText = turret.range;
		document.getElementById("sellBtn").innerText = getTurretSellPrice(turret.type, turretUpgradeCosts(turret.type, turret.level - 1)) + "\nSell!";
		document.getElementById("upgBtn").innerText = turretUpgradeCosts(turret.type, turret.level) + "\nUpgrade!";
		form.style.display = form.style.display === "none" ? "block" : "none";
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
	var upgradeDamage = (turret.level * (turretDamage(turret.type)));
	console.log("Current turret dmg: " + upgradeDamage);
	var upgradeRange =  (turret.level * (turretRange(turret.type)));
	console.log("Current turret Range: " + turret.range);
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
			turret.damage += upgradeDamage * 0.20;
			turret.range += upgradeRange * 0.025;
			break;
		case "blizzard":
			turret.damage += upgradeDamage * 0.15;
			turret.range += upgradeRange * 0.010;
			break;
		case "stormCannon":
			turret.damage += upgradeDamage * 0.10;
			turret.range += upgradeRange * 0.005;
			break;
		case "railCannon":
			turret.damage += upgradeDamage * 0.05;
			turret.range += upgradeRange * 0.002;
			break;
	}
}