// Keyboard shortcuts (in game only):
//   Space   start / pause / resume  Q    toggle game speed (1x / 2x)
//   1 - 9   buy the Nth shop turret W    damage stats panel
//   Esc     settings                L    reset (asks for confirmation)
//   G       wave preview panel
var Hotkeys = (function () {
	var _mouseX = null;
	var _mouseY = null;
	var _pausedByResetDialog = false;

	// overlays that take over the screen: shortcuts are inactive while one is open
	var BLOCKING_SCREENS = ["nicknameScreen", "mapSelectScreen", "difficultyScreen",
		"progressionScreen", "branchScreen", "postGameScreen", "newEnemiesScreen"];

	function _isShown(id) {
		var el = document.getElementById(id);
		return !!el && window.getComputedStyle(el).display !== "none";
	}

	function _isGameScreen() {
		if (!document.getElementById("startbutton")) return false; // map not drawn yet
		for (var i = 0; i < BLOCKING_SCREENS.length; i++) {
			if (_isShown(BLOCKING_SCREENS[i])) return false;
		}
		return !Tutorial.isActive();
	}

	function _isTyping(target) {
		if (!target || !target.tagName) return false;
		var tag = target.tagName.toLowerCase();
		return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
	}

	// 0-based shop index for Digit1..Digit9 (1st..9th turret) and Digit0 (10th), also on the numpad, or -1
	function _turretIndex(code) {
		var m = /^(?:Digit|Numpad)([0-9])$/.exec(code);
		if (!m) return -1;
		var n = parseInt(m[1], 10);
		if (n === 0) n = 10;
		return n <= HOTKEY_TURRET_COUNT ? n - 1 : -1;
	}

	// ── reset confirmation dialog ──────────────────────────
	function isResetDialogOpen() {
		return _isShown("resetConfirmScreen");
	}

	function showResetDialog() {
		if (!isRunning || isResetDialogOpen()) return;
		// freeze the game while the player decides
		if (!isPaused) {
			isPaused = true;
			_pausedByResetDialog = true;
		}
		document.getElementById("resetConfirmScreen").style.display = "flex";
	}

	function _closeResetDialog() {
		document.getElementById("resetConfirmScreen").style.display = "none";
	}

	function cancelReset() {
		_closeResetDialog();
		if (_pausedByResetDialog) {
			isPaused = false;
			_pausedByResetDialog = false;
		}
	}

	function confirmReset() {
		_closeResetDialog();
		_pausedByResetDialog = false;
		resetwave(null); // also clears the pause flag
	}

	// ── key handling ───────────────────────────────────────
	function _toggleSettings() {
		if (_isShown("settingsScreen")) closeSettings();
		else openSettings();
	}

	function _onKeyDown(e) {
		if (e.ctrlKey || e.altKey || e.metaKey || _isTyping(e.target)) return;

		// the reset dialog owns the keyboard while it is open
		if (isResetDialogOpen()) {
			if (e.code === "Escape") {
				e.preventDefault();
				cancelReset();
			} else if ((e.code === "Enter" || e.code === "NumpadEnter") && !e.repeat) {
				// a focused dialog button handles Enter itself
				var active = document.activeElement;
				if (active && active.tagName === "BUTTON") return;
				e.preventDefault();
				confirmReset();
			}
			return;
		}

		// the new enemies notice owns the keyboard while it is open
		if (isNewEnemiesDialogOpen()) {
			if (e.code === "Escape" || ((e.code === "Enter" || e.code === "NumpadEnter") && !e.repeat)) {
				var focused = document.activeElement;
				if (e.code !== "Escape" && focused && focused.tagName === "BUTTON") return; // the button handles Enter itself
				e.preventDefault();
				closeNewEnemiesDialog();
			} else if (e.code === "Space") {
				e.preventDefault(); // don't resume the game behind the notice
			}
			return;
		}

		// Esc closes settings, even though other shortcuts are off while it is open
		if (e.code === "Escape" && _isShown("settingsScreen")) {
			e.preventDefault();
			closeSettings();
			return;
		}
		if (_isShown("settingsScreen") || !_isGameScreen()) return;
		if (e.repeat) {
			// still swallow Space so held keys don't scroll the page
			if (e.code === "Space") e.preventDefault();
			return;
		}

		var turretIdx = _turretIndex(e.code);
		if (turretIdx >= 0) {
			e.preventDefault();
			buyTurretByHotkey(turretIdx, _mouseX, _mouseY);
			return;
		}

		switch (e.code) {
		case "Space":
			e.preventDefault();
			startOrPauseWave(e); // starts the game if it hasn't begun yet
			break;
		case "KeyQ":
			toggleGameSpeed();
			break;
		case "KeyW":
			showDamageStatsPanel();
			break;
		case "KeyG":
			showWavePreviewPanel();
			break;
		case "KeyL":
			showResetDialog();
			break;
		case "Escape":
			_toggleSettings();
			break;
		}
	}

	function _onMouseMove(e) {
		_mouseX = e.pageX;
		_mouseY = e.pageY;
	}

	document.addEventListener("keydown", _onKeyDown);
	document.addEventListener("mousemove", _onMouseMove);

	return {
		showResetDialog: showResetDialog,
		cancelReset:     cancelReset,
		confirmReset:    confirmReset
	};
})();
