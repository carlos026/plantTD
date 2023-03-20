// constants
const TILE_H = 15;
const TILE_W = 15;
const MAP_H = 30;
const MAP_W = 80;
const TURRET_OFFSET = 200;
const TURRET_GAP = 5;
const TURRET_D = 40;

// move direction
const MOVE_N = 1;
const MOVE_S = -1;
const MOVE_E = 2;
const MOVE_W = -2;
const MOVE_END = -99;

// global state
var turretDragCounter = 0;
var isRunning = false;
var isPaused = false;
var minion_count = 5;
var interval_id = null;
var currentWave = 0;
var isBossWave = 0;
var currentLevel = 1;
var currentLives = 10;
var currentCash = 20;
var currentScore = 0;
var turretPos = new Array();
var numTurrets = 0;

///////////////// TURRET FUNCTIONS
function turretColor(turretID) {
  switch (turretID) {
    case "turret0":
      return "#DDA0DD";
    case "turret1":
      return "#0000FF";
    case "turret2":
      return "#008080";
    case "turret3":
      return "#FF4500";
    case "turret4":
      return "#FF0000";
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
      return 1000;
    case "turret4":
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
      return 15 * TILE_W;
    case "turret4":
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
      return 10;
    case "turret4":
      return 20;
  }
}

function turretClick(turret) {
  function tclick(evt) {
    if (!isRunning || isPaused) {
      return;
    }

    // do we have enough money to make a tower?
    if (currentCash < turretValue(turret.id)) {
      return;
    }

    evt = evt || window.evt;

    // find out the window coordinates
    var x = 0;
    var y = 0;

    if (evt.pageX) {
      x = evt.pageX;
      y = evt.pageY;
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
      x = evt.clientX + offsetX;
      y = evt.clientY + offsetY;
    }

    // create a new shaped turret at the mouse coords	
    var turretD = document.createElement("div");
    turretD.setAttribute("id", turret.id + ":" + turretDragCounter++);
    turretD.setAttribute("class", "turretdrag");
    turretD.style.left = x + "px";
    turretD.style.top = y + "px";
    turretD.style.backgroundColor = turretColor(turret.id);
    turretD.setAttribute("draggable", "true");
    listenEvent(turretD, "dragstart", turretDrag(turretD));
    document.body.appendChild(turretD);
    // reduce our available cash by what we just spent
    currentCash -= turretValue(turret.id);
  }
  return tclick;
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

function cancelEvent(event) {
  if (event.preventDefault) {
    event.preventDefault();
  } else {
    event.returnValue = false;
  }
}

function cancelPropogation(event) {
  if (event.stopPropogation) {
    event.stopPropogation();
  } else {
    event.cancelBubble = true;
  }
}
///////////////////// END EVENT HANDLER WRAPPERS

////////////////////// DRAG AND DROP
function dragOver(evt) {
  if (evt.preventDefault) evt.preventDefault();
  evt = evt || window.event;
  evt.dataTransfer.dropEffect = 'copy';
  return false;
}

function mapDrop(mapzone) {
  function drop(evt) {
    cancelPropogation(evt);
    evt = evt || window.event;
    evt.dataTransfer.dropEffect = 'copy';
    var id = evt.dataTransfer.getData("Text");
    var turret = document.getElementById(id);
    turret.style.left = mapzone.style.left;
    turret.style.top = mapzone.style.top;

    // get the drop coordinates
    var x = mapzone.style.left.replace(/\D/g, "");
    var y = mapzone.style.top.replace(/\D/g, "");

    // the id is up to the colon in the string
    var turretID = turret.id.substring(0, turret.id.indexOf(":"));

    // store an entry in the turret position array
    turretPos[numTurrets++] = new Array(turretRange(turretID), turretDamage(turretID), x, y);

    // once its droppable, you can't move it anymore		
    turret.setAttribute("draggable", "false");
    listenEvent(turret, "dragstart", nodrag);
  }
  return drop;
}

function turretDrag(turret) {
  function drag(evt) {
    evt = evt || window.event;
    evt.dataTransfer.effectAllowed = 'copy';
    evt.dataTransfer.setData("Text", turret.id);
  }
  return drag;
}

function nodrag(evt) { }
///////////////////// END DRAG AND DROP

////////////////////// MAP CREATION
function level1(i, j) {
  if ((i == 0 && (j >= 0 && j <= 2)) ||
    (j == 2 && (i >= 0 && i < 70)) ||
    (i == 70 && (j >= 2 && j <= 28)) ||
    (j == 28 && (i <= 70 && i >= 60)) ||
    (i == 60 && (j <= 28 && j >= 5)) ||
    (j == 5 && (i <= 60 && i >= 40)) ||
    (i == 40 && (j >= 5 && j <= 25)) ||
    (j == 25 && (i <= 40 && i >= 30)) ||
    (i == 30 && (j >= 20 && j <= 25)) ||
    (j == 20 && (i <= 30 && i >= 5)) ||
    (i == 5 && (j <= 20 && j >= 10)) ||
    (j == 10 && (i >= 5 && i <= 75)) ||
    (i == 75 && (j >= 10 && j <= 30))) {
    return true;
  }
  return false;
}

function level2(x, y) {
  if ((x == 0 && (y >= 0 && y <= 2)) ||
    (y == 2 && (x >= 0 && x < 45)) ||
    (x == 45 && (y >= 2 && y <= 15)) ||
    (y == 15 && (x <= 45 && x >= 15)) ||
    (x == 15 && (y <= 15 && y >= 5)) ||
    (y == 5 && (x <= 15 && x >= 5)) ||
    (x == 5 && (y >= 5 && y <= 10)) ||
    (y == 10 && (x >= 5 && x <= 30)) ||
    (x == 30 && (y >= 10 && y <= 25)) ||
    (y == 25 && (x >= 30 && x <= 55)) ||
    (x == 55 && (y <= 25 && y >= 10)) ||
    (y == 10 && (x >= 55 && x <= 79))) {
    return true;
  }
  return false;
}

function drawMap() {
  // create the map zone
  for (var j = 0; j < MAP_H; j++) {
    for (var i = 0; i < MAP_W; i++) {
      var mapzone = document.createElement("div");
      mapzone.setAttribute("id", "mapzone" + i);
      mapzone.setAttribute("class", "mapzone");
      mapzone.style.left = TILE_H * i + "px";
      mapzone.style.top = TILE_W * j + "px";
      if (level1(i, j)) {
        mapzone.style.backgroundColor = "#1E90FF";
      } else {
        // if it isn't part of the map, its a drop target for a turret
        listenEvent(mapzone, "dragenter", cancelEvent);
        listenEvent(mapzone, "dragover", dragOver);
        listenEvent(mapzone, "drop", mapDrop(mapzone));
      }
      document.body.appendChild(mapzone);
    }
  }

  // create the turrets
  for (var k = 0; k < 5; k++) {
    var turret = document.createElement("div");
    turret.setAttribute("id", "turret" + k);
    turret.setAttribute("class", "turret");
    turret.style.left = TURRET_OFFSET + (TURRET_D + TURRET_GAP) * k + "px";
    turret.style.borderColor = turretColor(turret.id);
    turret.innerHTML = "<p>" + k + "<br /><br />$" + turretValue(turret.id) + "</p>";

    // turrets are draggable
    listenEvent(turret, "click", turretClick(turret));
    document.body.appendChild(turret);
  }

  // put a start button on
  var startbutton = document.createElement("div");
  startbutton.setAttribute("id", "startbutton");
  startbutton.setAttribute("class", "startbutton");
  startbutton.innerHTML = "<p> Start! </p>";
  listenEvent(startbutton, "click", startwave);
  document.body.appendChild(startbutton);

  // reset button
  var resetbutton = document.createElement("div");
  resetbutton.setAttribute("id", "resetbutton");
  resetbutton.setAttribute("class", "resetbutton");
  resetbutton.innerHTML = "<p> Reset </p>";
  listenEvent(resetbutton, "click", resetwave);
  document.body.appendChild(resetbutton);

  // status  bar
  var statusbar = document.createElement("div");
  statusbar.setAttribute("id", "statusbar");
  statusbar.setAttribute("class", "statusbar");
  statusbar.innerHTML = '<p> Cash: <span id="cash">$0</span> Score: <span id="score">0</span> Wave: <span id="wave">0</span> Lives: <span id="lives">0</span></p>';
  document.body.appendChild(statusbar);
}
/////////////////////// END MAP CREATION

//////////////////////// WAVE HANDLING
function startwave(evt) {
  if (isRunning) return;
  isRunning = true;

  // make the pause button visible
  var sb = document.getElementById("startbutton");
  sb.innerHTML = "<p> Pause </p>";
  listenEvent(sb, "click", pausewave);
  // reset globals	
  currentWave = 0;
  currentLives = 10;
  currentCash = 20;
  currentScore = 0;
  turretPos.length = 0;
  numTurrets = 0;

  // increase the wave count
  currentWave++;
  console.log("Wave: " + currentWave);

  // remove all the placed turrets
  var turrets = document.querySelectorAll(".turretdrag");
  for (var i = 0; i < turrets.length; i++) {
    document.body.removeChild(turrets[i]);
  }

  // create all our minions
  for (var i = 0; i < minion_count; i++) {
    var minion = document.createElement("div");
    minion.setAttribute("id", "minion" + i);
    minion.setAttribute("class", "minion");
    document.body.appendChild(minion);
  }

  // set up the timers to run
  var movex = new Array();
  var movey = new Array();
  // what direction are we going?
  var currentDir = new Array();
  var minion_c = 1;
  var minion_release = new Array();
  var minion_hp = new Array();
  var first_kill = new Array();
  var minions_killed = 0;
  var lives_lost = 0;
  var wave_over = false;
  // get all the minions available
  var minions = document.getElementsByClassName("minion");
  for (var i = 0; i < minions.length; i++) {
    movex[i] = 0;
    movey[i] = 0;
    currentDir[i] = MOVE_S;
    minion_release[i] = 0;
    minions[i].style.display = "none";
    minion_hp[i] = minionhp();
    first_kill[i] = true;
  }
  interval_id = setInterval(function () {
    if (!isPaused) {
      for (var i = 0; i < minion_c; i++) {
        // what direction do we want to go?
        currentDir[i] = whereToMove(movex[i], movey[i], currentDir[i]);

        if (currentDir[i] == MOVE_END) {
          // lose a life, one escaped!
          if (minions[i].style.display != "none") {
            currentLives--;
            lives_lost++;
            minions_killed++;
          }
          // we have reached the end of the map
          minions[i].style.display = "none";
          if (currentLives == 0) {
            // game over
            wave_over = true;
            break;
          }
          // do we have minions killed?
          if (minions_killed == minions.length || (isBossWave && minions_killed == 1)) {
            // wave over!
            console.log("Do we have minions killed? Wave Over!");
            wave_over = true;
          }
          continue;
        }

        switch (currentDir[i]) {
          case MOVE_N:
            movey[i] -= 1;
            break;
          case MOVE_S:
            movey[i] += 1;
            break;
          case MOVE_E:
            movex[i] += 1;
            break;
          case MOVE_W:
            movex[i] -= 1;
            break;
        }
        minions[i].style.display = "block";
        minions[i].style.top = movey[i] + "px";
        minions[i].style.left = movex[i] + "px";

        // are there any turrets in range?
        var damage = anyTurretsInRange(minions[i], movex[i], movey[i]);
        // reduce the minion's hit points by the damage
        minion_hp[i] -= damage;
        if (minion_hp[i] <= 0) {
          // goodbye minion!
          if (first_kill[i]) {
            first_kill[i] = false;
            minions_killed++;
            // increase your cash a little bit  
            if(isBossWave) {
              currentCash += bossReward();
            } else {
              currentCash += minionreward();
            }
            currentScore++;
            if (minions_killed == minions.length || (isBossWave && minions_killed == 1)) {
              // wave over!
              console.log("wave over!")
              wave_over = true;
            }
          }
          minions[i].style.display = "none";
        }
        // stagger the minions coming out, release one every 15 pixels
        if ((minion_release[i] == 100 * minion_c) && minion_c < minions.length) {
          minion_c++;
        }
        minion_release[i]++;
      }
      // update the status
      updateStatus();

      // is the wave over?
      if (wave_over) {
        if (currentLives == 0) {
          var lives = document.getElementById("lives");
          console.log("FF")
          lives.innerHTML = "Game Over";
          resetwave(null);
        }
        // reset for the next wave!
        minion_c = 1;
        minions_killed = 0;
        wave_over = false;
        currentWave++;
        isBossWave = currentWave % 3 == 0;
        //Move to next level if current wave = 20
        if (currentWave > 2) {
          startLevel2();
        }

        //Boss wave
        if (isBossWave) {
          for (var i = 0; i < 1; i++) {
            movex[i] = 0;
            movey[i] = 0;
            currentDir[i] = MOVE_S;
            minion_release[i] = 0;
            minions[i].style.display = "none";
            minions[i].style.color = "#156112";
            minions[i].style.width = "30px";
            minions[i].style.height = "30px";
            minion_hp[i] = bossHp();
            console.log("Boss Hp: " + minion_hp[i]);
            first_kill[i] = true;
          }
        } else {
          for (var i = 0; i < minions.length; i++) {
            movex[i] = 0;
            movey[i] = 0;
            currentDir[i] = MOVE_S;
            minion_release[i] = 0;
            minions[i].style.display = "none";
            minions[i].style.color = "#000000";
            minions[i].style.width = "15px";
            minions[i].style.height = "15px";
            minion_hp[i] = minionhp();
            console.log("Minion Hp: " + minion_hp[i]);
            first_kill[i] = true;
          }
        }
      }
    }
  }, 10);
}

function startLevel2() {
  currentLevel++;
  console.log("Current wave: " + currentWave);
  var pixels = document.getElementsByClassName('mapzone');

  for (var i = 0; i < pixels.length; i++) {
    pixels[i].style.backgroundColor = '#C98D26';
    drawNextMap(pixels[i]);
  }
}

function drawNextMap(mapzone) {
  var i = mapzone.style.left.replace("px", "") / TILE_H;
  var j = mapzone.style.top.replace("px", "") / TILE_W;
  if (level2(i, j)) {
    mapzone.style.backgroundColor = "#614821";
  }
}
function whereToMove(xpos, ypos, currentDir) {
  // convert the xpos and ypos to block coordinates
  xpos = (xpos + TILE_W / 2) / TILE_W;
  ypos = (ypos + TILE_H / 2) / TILE_H;

  var xnewpos = Math.floor(xpos);
  var ynewpos = Math.floor(ypos);

  // test out some possible move locations
  switch (currentDir) {
    case MOVE_N:
      ynewpos -= 1;
      break;
    case MOVE_S:
      ynewpos += 1;
      break;
    case MOVE_E:
      xnewpos += 1;
      break;
    case MOVE_W:
      xnewpos -= 1;
      break;
  }

  // are we still on the map?
  if (currentLevel <= 1) {
    if (level1(Math.floor(xnewpos), Math.floor(ynewpos))) {
      // ok! keep going in the same direction
      return currentDir;
    }

    // we have fallen off the map! Find out where to go...
    if (level1(Math.floor(xpos) + 1, Math.floor(ypos)) && currentDir != -MOVE_E) {
      return MOVE_E;
    }
    if (level1(Math.floor(xpos) - 1, Math.floor(ypos)) && currentDir != -MOVE_W) {
      return MOVE_W;
    }
    if (level1(Math.floor(xpos), Math.floor(ypos) + 1) && currentDir != -MOVE_S) {
      return MOVE_S;
    }
    if (level1(Math.floor(xpos), Math.floor(ypos) - 1) && currentDir != -MOVE_N) {
      return MOVE_N;
    }
  } else {
    if (level2(Math.floor(xnewpos), Math.floor(ynewpos))) {
      // ok! keep going in the same direction
      return currentDir;
    }

    // we have fallen off the map! Find out where to go...
    if (level2(Math.floor(xpos) + 1, Math.floor(ypos)) && currentDir != -MOVE_E) {
      return MOVE_E;
    }
    if (level2(Math.floor(xpos) - 1, Math.floor(ypos)) && currentDir != -MOVE_W) {
      return MOVE_W;
    }
    if (level2(Math.floor(xpos), Math.floor(ypos) + 1) && currentDir != -MOVE_S) {
      return MOVE_S;
    }
    if (level2(Math.floor(xpos), Math.floor(ypos) - 1) && currentDir != -MOVE_N) {
      return MOVE_N;
    }
  }

  // if all fails, we have reached the end of the map
  return MOVE_END;
}

function pausewave(evt) {
  isPaused = !isPaused;
}

function resetwave(evt) {
  if (!isRunning) return;
  isRunning = false;

  // make the start button visible
  var sb = document.getElementById("startbutton");
  sb.innerHTML = "<p> Start! </p>";
  listenEvent(sb, "click", startwave);

  // stop the timers
  clearInterval(interval_id);

  // remove all the minions	
  var minions = document.querySelectorAll(".minion");
  for (var i = 0; i < minions.length; i++) {
    document.body.removeChild(minions[i]);
  }

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
    if (currentCash >= turretValue(turrets[i].id)) {
      turrets[i].style.opacity = 1;
    } else {
      turrets[i].style.opacity = 0.5;
    }
  }
}

function anyTurretsInRange(minion, x, y) {
  var score = document.getElementById("score");
  var damage = 0;
  for (var i = 0; i < numTurrets; i++) {
    // get the x and y positions of the turret
    var xt = turretPos[i][2];
    var yt = turretPos[i][3];

    if (euclidDistance(x, xt, y, yt) <= turretPos[i][0]) {
      minion.style.backgroundColor = "#FF0000";
      damage += turretPos[i][1]; // return the damage
    }
  }
  if (damage == 0) {
    // nothing in range
    minion.style.backgroundColor = "#000000";
  }
  return damage;
}

function euclidDistance(x1, x2, y1, y2) {
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

function minionhp() {
  return Math.pow(2, currentWave) * 1;
}

function bossHp() {
  return Math.pow(2, currentWave) * 8;
}

function minionreward() {
  return Math.pow(currentWave + 1, 2);
}

function bossReward() {
  return Math.pow(currentWave + 1, 3);
}
////////////////////////// END WAVE HANDLING

window.onload = function () {
  drawMap();
}