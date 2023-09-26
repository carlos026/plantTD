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

function turretUpgPrice(turretID) {
  switch(turretID) {
    case "turret0":
      return machineGunUpgPrice = machineGunDmg == 1 ? machineGunUpgPrice : machineGunUpgPrice * 1.50;
    case "turret1":
      return laserUpgPrice = laserDmg == 3 ? laserUpgPrice : laserUpgPrice * 1.30;
    case "turret2":
      return flameThrowerUpgPrice = flameThrowerDmg == 10 ? flameThrowerUpgPrice : flameThrowerUpgPrice * 1.20;
      case "turret3":
      return blizzardTowerUpgPrice = blizzardTowerDmg == 8 ? blizzardTowerUpgPrice : blizzardTowerUpgPrice * 1.20;
    case "turret4":
      return stormCannonUpgPrice = stormCannonDmg == 13 ? stormCannonUpgPrice : stormCannonUpgPrice * 1.15;
    case "turret5":
      return railCannonUpgPrice = railCannonDmg == 16 ? railCannonUpgPrice : railCannonUpgPrice * 1.10;
  }
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

// @TODO Passar o array da turret alvo.
function showTurretInfo(turret){
  function upgrade(evt) {
    var turretTypeId = turret.id.substring(0, turret.id.indexOf(":"));
    var form = document.getElementById("registrationForm");
    document.getElementById("upgTurretId").innerText = turret.id;
    document.getElementById("upgName").innerText = turretName(turretTypeId);
    //document.getElementById("upgLevel").innerText = turret.getAttribute("level");
    //document.getElementById("upgDamage").innerText = getCurrentTurretDamage(turretTypeId, turret.id.substring(8, turret.id.length), "false");
    //document.getElementById("upgPrice").innerText = turretUpgPrice(turretTypeId);
    form.style.display = form.style.display === "none" ? "block" : "none";
  }
  return upgrade;
}

function upgradeTurret(turretDataArray){
  // Alterar os dados da turreta
  // Subir o nível (Adicionar no turretPos)
  return turretDataArray;
}