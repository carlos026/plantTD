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
            nickname:      nickname.trim(),
            highestScore:  0,
            goldenSeeds:   0,
            createdAt:     now,
            lastPlayAt:    now
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
        getPlayer:      getPlayer
    };
})();
