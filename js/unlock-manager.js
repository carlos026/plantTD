var UnlockManager = (function () {
    // Defaults for new/migrated profiles — mirrors PlayerData.createPlayer defaults
    var _defaultMaps   = [1];
    var _defaultTowers = [
        "machineGun", "laser", "flamethrower", "blizzard",
        "toxic", "stormCannon", "railCannon"
    ];

    function getDefaults() {
        return {
            maps:   _defaultMaps.slice(),
            towers: _defaultTowers.slice()
        };
    }

    function isMapUnlocked(mapId) {
        var p = PlayerData.getPlayer();
        return p ? p.unlockedMaps.indexOf(mapId) !== -1 : false;
    }

    function isTowerUnlocked(towerId) {
        var p = PlayerData.getPlayer();
        return p ? p.unlockedTowers.indexOf(towerId) !== -1 : false;
    }

    // Returns only the turret type strings the player currently owns
    function getUnlockedTowers() {
        var all = getTurretTypes();
        var result = [];
        for (var i = 0; i < all.length; i++) {
            if (isTowerUnlocked(all[i])) result.push(all[i]);
        }
        return result;
    }

    // Validates and executes a purchase. Returns { ok, reason }.
    function purchase(category, id) {
        var p = PlayerData.getPlayer();
        if (!p) return { ok: false, reason: "No player loaded" };

        var catalog = category === "maps" ? UnlockCatalog.getMaps() : UnlockCatalog.getTowers();
        var item = null;
        for (var i = 0; i < catalog.length; i++) {
            if (catalog[i].id === id) { item = catalog[i]; break; }
        }
        if (!item)        return { ok: false, reason: "Item not found" };
        if (!item.locked) return { ok: false, reason: "Not a lockable item" };

        var owned = category === "maps" ? isMapUnlocked(id) : isTowerUnlocked(id);
        if (owned)                    return { ok: false, reason: "Already owned" };
        if (p.goldenSeeds < item.cost) return { ok: false, reason: "Not enough seeds" };

        p.goldenSeeds -= item.cost;
        if (category === "maps") {
            p.unlockedMaps.push(id);
        } else {
            p.unlockedTowers.push(id);
        }
        PlayerData.savePlayer();
        return { ok: true };
    }

    return {
        getDefaults:       getDefaults,
        isMapUnlocked:     isMapUnlocked,
        isTowerUnlocked:   isTowerUnlocked,
        getUnlockedTowers: getUnlockedTowers,
        purchase:          purchase
    };
})();
