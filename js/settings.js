// Game settings (music/effects volume, critical popups), persisted in localStorage
var GameSettings = (function() {
	var STORAGE_KEY = "plantTD_settings";
	var defaults = { musicVolume: 100, effectsVolume: 100, showCritical: true };
	var values = load();

	function load() {
		var stored = null;
		try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) {}
		var result = {};
		for (var k in defaults) {
			result[k] = (stored && stored[k] !== undefined) ? stored[k] : defaults[k];
		}
		return result;
	}

	function save() {
		try { localStorage.setItem(STORAGE_KEY, JSON.stringify(values)); } catch (e) {}
	}

	function get(name) { return values[name]; }

	function set(name, value) {
		values[name] = value;
		save();
	}

	return { get: get, set: set };
})();

function getEffectsVolume() {
	return GameSettings.get("effectsVolume") / 100;
}

// Sets the current effects volume on a freshly created Audio and returns it
function applyEffectsVolume(audio) {
	audio.volume = getEffectsVolume();
	return audio;
}

function applyMusicVolume() {
	soundtrack.volume = GameSettings.get("musicVolume") / 100;
}

function applyEffectsVolumeToTurrets() {
	var vol = getEffectsVolume();
	for (var i = 0; i < turretPos.length; i++) {
		if (turretPos[i].audioFile)       turretPos[i].audioFile.volume = vol;
		if (turretPos[i].audioFileImpact) turretPos[i].audioFileImpact.volume = vol;
	}
}

function openSettings() {
	document.getElementById("musicVolumeSlider").value   = GameSettings.get("musicVolume");
	document.getElementById("effectsVolumeSlider").value = GameSettings.get("effectsVolume");
	document.getElementById("showCriticalToggle").checked = GameSettings.get("showCritical");
	updateSettingsLabels();
	// read-only: the difficulty is chosen before the map starts
	var difficultyEl = document.getElementById("difficultyValue");
	difficultyEl.textContent = getDifficulty().name;
	difficultyEl.className = "settings-difficulty difficulty-" + currentDifficulty;
	document.getElementById("settingsScreen").style.display = "flex";
}

function closeSettings() {
	document.getElementById("settingsScreen").style.display = "none";
}

function updateSettingsLabels() {
	document.getElementById("musicVolumeValue").textContent   = GameSettings.get("musicVolume") + "%";
	document.getElementById("effectsVolumeValue").textContent = GameSettings.get("effectsVolume") + "%";
}

function onMusicVolumeChange(value) {
	GameSettings.set("musicVolume", parseInt(value, 10));
	applyMusicVolume();
	updateSettingsLabels();
}

function onEffectsVolumeChange(value) {
	GameSettings.set("effectsVolume", parseInt(value, 10));
	applyEffectsVolumeToTurrets();
	updateSettingsLabels();
}

function onShowCriticalChange(checked) {
	GameSettings.set("showCritical", checked);
}

applyMusicVolume();
