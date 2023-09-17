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

function turretSlowDown(turretID) {
  switch (turretID) {
    case "turret0":
      return 10;
    case "turret1":
      return 10;
    case "turret2":
      return 10;
    case "turret3":
      return 20;
    case "turret4":
      return 10;
    case "turret5":
      return 10;
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