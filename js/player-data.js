/**
 * PlayerData — persistence layer for player profiles.
 *
 * All reads and writes are routed through StorageAdapter.
 * To migrate to Firebase, replace StorageAdapter with a Firebase
 * implementation that exposes the same { get, set } interface.
 * No other file needs to change.
 */

// ── Storage backend ────────────────────────────────────────────────────────
// Swap this object to migrate to Firebase (or any other backend).
var StorageAdapter = (function () {
    var PREFIX = 'plantTD_player_';

    function key(nickname) {
        return PREFIX + nickname.toLowerCase().trim();
    }

    return {
        get: function (nickname) {
            try {
                return JSON.parse(localStorage.getItem(key(nickname)));
            } catch (e) {
                return null;
            }
        },
        set: function (nickname, data) {
            try {
                localStorage.setItem(key(nickname), JSON.stringify(data));
            } catch (e) {}
        }
    };
})();

// ── PlayerData public API ──────────────────────────────────────────────────
var PlayerData = (function () {
    var _player = null;

    function _now() {
        return new Date().toISOString();
    }

    /**
     * Loads an existing player by nickname.
     * Updates lastPlayAt and persists.
     * Returns the player object, or null if not found.
     */
    function loadPlayer(nickname) {
        var data = StorageAdapter.get(nickname);
        if (!data) return null;
        // Migration: add unlock arrays for profiles created before the progression system
        if (!Array.isArray(data.unlockedMaps)) {
            data.unlockedMaps = [1];
        }
        if (!Array.isArray(data.unlockedTowers)) {
            data.unlockedTowers = [
                "machineGun", "laser", "flamethrower", "blizzard",
                "toxic", "stormCannon", "railCannon"
            ];
        }
        // Migration: profiles created before the tutorial already know the game
        if (typeof data.tutorialDone !== 'boolean') {
            data.tutorialDone = true;
        }
        data.lastPlayAt = _now();
        StorageAdapter.set(data.nickname, data);
        _player = data;
        return _player;
    }

    /**
     * Creates a new player record and persists it.
     * Returns the new player object.
     */
    function createPlayer(nickname) {
        var now = _now();
        _player = {
            nickname:       nickname.trim(),
            highestScore:   0,
            goldenSeeds:    0,
            unlockedMaps:   [1],
            unlockedTowers: [
                "machineGun", "laser", "flamethrower", "blizzard",
                "toxic", "stormCannon", "railCannon"
            ],
            tutorialDone:   false,
            createdAt:      now,
            lastPlayAt:     now
        };
        StorageAdapter.set(_player.nickname, _player);
        return _player;
    }

    /**
     * Persists the current player state.
     */
    function savePlayer() {
        if (!_player) return;
        StorageAdapter.set(_player.nickname, _player);
    }

    /**
     * Updates highestScore if score is a new record.
     * Persists automatically when a record is broken.
     */
    function updateScore(score) {
        if (!_player) return;
        if (score > _player.highestScore) {
            _player.highestScore = score;
            savePlayer();
        }
    }

    /**
     * Adds golden seeds and persists.
     */
    function addGoldenSeeds(count) {
        if (!_player) return;
        _player.goldenSeeds += count;
        savePlayer();
    }

    /**
     * Flags the first-time tutorial as seen and persists.
     */
    function markTutorialDone() {
        if (!_player) return;
        _player.tutorialDone = true;
        savePlayer();
    }

    /**
     * Returns the current in-memory player object (read-only reference).
     */
    function getPlayer() {
        return _player;
    }

    return {
        loadPlayer:     loadPlayer,
        createPlayer:   createPlayer,
        savePlayer:     savePlayer,
        updateScore:    updateScore,
        addGoldenSeeds: addGoldenSeeds,
        markTutorialDone: markTutorialDone,
        getPlayer:      getPlayer
    };
})();

// ── RunSession — state that survives the redirect to index.html ───────────
// Holds the current run (nickname, accumulated score, maps already played).
// Lives in sessionStorage, so closing the tab starts a fresh run.
var RunSession = (function () {
    var KEY = 'plantTD_run';

    function _read() {
        try {
            return JSON.parse(sessionStorage.getItem(KEY));
        } catch (e) {
            return null;
        }
    }

    function _write(run) {
        try {
            sessionStorage.setItem(KEY, JSON.stringify(run));
        } catch (e) {}
    }

    /**
     * Returns the active run, or null if none.
     */
    function get() {
        return _read();
    }

    /**
     * Starts a new run for nickname, unless one already exists for it.
     */
    function start(nickname) {
        var run = _read();
        if (run && run.nickname.toLowerCase() === nickname.toLowerCase().trim()) return run;
        run = { nickname: nickname.trim(), score: 0, playedMaps: [] };
        _write(run);
        return run;
    }

    function getScore() {
        var run = _read();
        return run ? run.score : 0;
    }

    function isMapPlayed(mapId) {
        var run = _read();
        return run ? run.playedMaps.indexOf(mapId) !== -1 : false;
    }

    /**
     * Marks mapId as finished and stores the accumulated score.
     */
    function completeMap(mapId, score) {
        var run = _read();
        if (!run) return;
        if (run.playedMaps.indexOf(mapId) === -1) run.playedMaps.push(mapId);
        run.score = score;
        _write(run);
    }

    /**
     * Keeps the player but clears score and played maps.
     */
    function reset() {
        var run = _read();
        if (!run) return;
        run.score = 0;
        run.playedMaps = [];
        _write(run);
    }

    return {
        get:         get,
        start:       start,
        getScore:    getScore,
        isMapPlayed: isMapPlayed,
        completeMap: completeMap,
        reset:       reset
    };
})();
