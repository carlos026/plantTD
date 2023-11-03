// Turret functions
function turretColor(turretID) {
  switch (turretID) {
    case "turret0":
      return "#DDA0DD";
    case "turret1":
      return "#8c00ff";
    case "turret2":
      return "#ff00ea";
    case "turret3":
      return "#00bcbc";
    case "turret4":
      return "#FF4500";
    case "turret5":
      return "#fff700";
  }
}

function turretImage(turretID) {
  switch (turretID) {
    case "turret0":
      return "url('img/tw/tower0.png')";
    case "turret1":
      return "url('img/tw/tower1.png')";
    case "turret2":
      return "url('img/tw/tower2.png')";
    case "turret3":
      return "url('img/tw/tower3.png')";
    case "turret4":
      return "url('img/tw/tower4.png')";
    case "turret5":
      return "url('img/tw/tower5.png')";
  }
}

function turretValue(turretID) {
  switch (turretID) {
    case "turret0":
      return 10;
    case "turret1":
      return 100;
    case "turret2":
      return 500;
    case "turret3":
      return 2000;
    case "turret4":
      return 3000;
    case "turret5":
      return 5000;
  }
}

function turretRange(turretID) {
  switch (turretID) {
    case "turret0":
      return 3 * TILE_W;
    case "turret1":
      return 5 * TILE_W;
    case "turret2":
      return 10 * TILE_W;
    case "turret3":
      return 10 * TILE_W;
    case "turret4":
      return 15 * TILE_W;
    case "turret5":
      return 20 * TILE_W;
  }
}

function turretDamage(turretID) {
  switch (turretID) {
    case "turret0":
      return 1;
    case "turret1":
      return 3;
    case "turret2":
      return 5;
    case "turret3":
      return 8;
    case "turret4":
      return 10;
    case "turret5":
      return 20;
  }
}

function turretName(turretID) {
  switch (turretID) {
    case "turret0":
      return "Machine Gun";
    case "turret1":
      return "Laser";
    case "turret2":
      return "Flamethrower";
    case "turret3":
      return "Blizzard Tower";
    case "turret4":
      return "Storm Cannon";
    case "turret5":
      return "Rail Cannon";
  }
}

function turretUpgradeCosts(turretID, turretLvl) {
  var upgradeCost = turretLvl * turretValue(turretID);
  switch(turretID) {
    case "turret0":
      upgradeCost = upgradeCost * 5;
      break;
    case "turret1":
      upgradeCost = upgradeCost * 0.8;
      break;
    case "turret2":
      upgradeCost = upgradeCost * 0.3;
      break;
    case "turret3":
      upgradeCost = upgradeCost * 0.2;
      break;
    case "turret4":
      upgradeCost = upgradeCost * 0.15;
      break;
    case "turret5":
      upgradeCost = upgradeCost * 0.10;
      break;
  }
  return upgradeCost;
}

function getTurretSellPrice(turretID, upgradeTotalValue) {
  return (turretValue(turretID) * (0.2)) + (upgradeTotalValue * 0.2);
}

// DRAG AND DROP
function turretDrag(turret) {
  function drag(evt) {
    evt = evt || window.event;
    evt.dataTransfer.effectAllowed = 'copy';
    evt.dataTransfer.setData("Text", turret.id);
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

function showTurretInfo(turretArray){
  function upgrade(evt) {
    var form = document.getElementById("registrationForm");
    document.getElementById("upgTurretId").value = turretArray[5].id;
    document.getElementById("upgName").innerText = turretName(turretArray[2]);
    document.getElementById("upgLevel").innerText = turretArray[6];
    document.getElementById("upgDamage").innerText = turretArray[1];
    document.getElementById("range").innerText = turretArray[0];
    document.getElementById("sellBtn").innerText = getTurretSellPrice(turretArray[2], turretUpgradeCosts(turretArray[2], turretArray[6] - 1)) + "\nSell!";
    document.getElementById("upgBtn").innerText = turretUpgradeCosts(turretArray[2], turretArray[6]) + "\nUpgrade!";
    form.style.display = form.style.display === "none" ? "block" : "none";
  }
  return upgrade;
}

function updateTurretInfo(turretArray){
    document.getElementById("upgTurretId").value = turretArray[5].id;
    document.getElementById("upgName").innerText = turretName(turretArray[2]);
    document.getElementById("upgLevel").innerText = turretArray[6];
    document.getElementById("upgDamage").innerText = turretArray[1];
    document.getElementById("range").innerText = turretArray[0];
    document.getElementById("sellBtn").innerText = getTurretSellPrice(turretArray[2], turretUpgradeCosts(turretArray[2], turretArray[6] - 1)) + "\nSell!";
    document.getElementById("upgBtn").innerText = turretUpgradeCosts(turretArray[2], turretArray[6]) + "\nUpgrade!";
}

// Change turret data
function upgradeTurretData(turretDataArray){
  var upgradeDamage = (turretDataArray[6] * (turretDamage(turretDataArray[2])));
  console.log("Current turret dmg: " + upgradeDamage);
  var upgradeRange =  (turretDataArray[6] * (turretRange(turretDataArray[2])));
  console.log("Current turret Range: " + turretDataArray[0]);
  //Upgrade Damage and range;
  switch(turretDataArray[2]){
    case "turret0":
      turretDataArray[1] += upgradeDamage * 0.5;
      turretDataArray[0] += upgradeRange * 0.1;
      break;
    case "turret1":
      turretDataArray[1] += upgradeDamage * 0.3;
      turretDataArray[0] += upgradeRange * 0.05;
      break;
    case "turret2":
      turretDataArray[1] += upgradeDamage * 0.20;
      turretDataArray[0] += upgradeRange * 0.025;
      break;
    case "turret3":
      turretDataArray[1] += upgradeDamage * 0.15;
      turretDataArray[0] += upgradeRange * 0.010;
      break;
    case "turret4":
      turretDataArray[1] += upgradeDamage * 0.10;
      turretDataArray[0] += upgradeRange * 0.005;
      break;
    case "turret5":
      turretDataArray[1] += upgradeDamage * 0.05;
      turretDataArray[0] += upgradeRange * 0.002;
      break;
  }
  return turretDataArray;
}