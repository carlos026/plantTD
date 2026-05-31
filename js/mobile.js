// Mobile viewport scaling and touch drag-and-drop support

var GAME_NATIVE_WIDTH  = 1422;
var GAME_NATIVE_HEIGHT = 640;
var mobileScale = 1.0;

function getMobileScale() {
	return mobileScale;
}

function applyGameScale() {
	var scaleX = window.innerWidth  / GAME_NATIVE_WIDTH;
	var scaleY = window.innerHeight / GAME_NATIVE_HEIGHT;
	mobileScale = Math.min(scaleX, scaleY, 1.0);
	if (mobileScale < 1.0) {
		document.body.style.zoom = mobileScale;
	} else {
		document.body.style.zoom = '';
	}
}

// ── Touch drag-and-drop ───────────────────────────────────────

var touchDrag = {
	active:       false,
	turretType:   null,
	turretDragEl: null,
	ghost:        null
};

function initTouchDragForCard(card) {
	card.addEventListener('touchstart', function(e) {
		e.preventDefault();
		if (!isRunning || isPaused) return;
		var turretType = card.getAttribute('type');
		if (currentCash < turretValue(turretType)) return;

		var touch = e.touches[0];
		var gameX = touch.clientX / mobileScale;
		var gameY = touch.clientY / mobileScale;

		currentCash -= turretValue(turretType);
		isDraggingNewTurret = true;

		// Create real turretdrag element off-screen; ghost is what user sees
		var turretD = document.createElement("div");
		turretD.setAttribute("id", turretType + ":" + turretCounter++);
		turretD.setAttribute("class", "turretdrag");
		turretD.style.backgroundImage = turretImage(turretType);
		turretD.style.left = "-200px";
		turretD.style.top  = "-200px";
		document.body.appendChild(turretD);

		showRangeIndicator(gameX, gameY, turretRange(turretType), turretColor(turretType));

		// Ghost uses absolute position in game coords so body zoom scales it correctly
		var ghost = document.createElement("div");
		ghost.style.position         = "absolute";
		ghost.style.width            = "40px";
		ghost.style.height           = "40px";
		ghost.style.backgroundImage  = turretImage(turretType);
		ghost.style.backgroundSize   = "contain";
		ghost.style.backgroundRepeat = "no-repeat";
		ghost.style.backgroundPosition = "center";
		ghost.style.left             = (gameX - 20) + "px";
		ghost.style.top              = (gameY - 20) + "px";
		ghost.style.pointerEvents    = "none";
		ghost.style.zIndex           = "9999";
		ghost.style.opacity          = "0.85";
		ghost.style.borderRadius     = "6px";
		ghost.style.border           = "1.5px solid rgba(0,180,255,0.6)";
		document.body.appendChild(ghost);

		touchDrag.active       = true;
		touchDrag.turretType   = turretType;
		touchDrag.turretDragEl = turretD;
		touchDrag.ghost        = ghost;

		document.addEventListener('touchmove', onTouchDragMove, {passive: false});
		document.addEventListener('touchend',  onTouchDragEnd,  {passive: false});
	}, {passive: false});
}

function onTouchDragMove(e) {
	e.preventDefault();
	if (!touchDrag.active) return;
	var touch = e.touches[0];
	var gameX = touch.clientX / mobileScale;
	var gameY = touch.clientY / mobileScale;
	touchDrag.ghost.style.left = (gameX - 20) + "px";
	touchDrag.ghost.style.top  = (gameY - 20) + "px";
	if (rangeIndicator) {
		rangeIndicator.style.left = gameX + "px";
		rangeIndicator.style.top  = gameY + "px";
	}
}

function onTouchDragEnd(e) {
	e.preventDefault();
	document.removeEventListener('touchmove', onTouchDragMove);
	document.removeEventListener('touchend',  onTouchDragEnd);
	if (!touchDrag.active) return;

	var touch = e.changedTouches[0];

	if (touchDrag.ghost && touchDrag.ghost.parentNode) {
		touchDrag.ghost.parentNode.removeChild(touchDrag.ghost);
		touchDrag.ghost = null;
	}

	// Hide turretDrag temporarily so elementFromPoint finds the mapzone beneath
	var turretD = touchDrag.turretDragEl;
	turretD.style.display = "none";
	var el = document.elementFromPoint(touch.clientX, touch.clientY);
	turretD.style.display = "";

	var placed = false;
	if (el) {
		var target = el.closest
			? el.closest('.mapzone')
			: (el.classList && el.classList.contains('mapzone') ? el : null);
		if (target) {
			var mx = parseInt(target.dataset.mapX);
			var my = parseInt(target.dataset.mapY);
			placed = placeTurretAtMapzone(target, mx, my, turretD);
		}
	}

	if (!placed) {
		currentCash += turretValue(touchDrag.turretType);
		if (turretD && turretD.parentNode) {
			turretD.parentNode.removeChild(turretD);
		}
	}

	isDraggingNewTurret = false;
	hideRangeIndicator();
	touchDrag.active       = false;
	touchDrag.turretDragEl = null;
	touchDrag.turretType   = null;
	updateStatus();
}
