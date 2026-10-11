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

    // Difficulties absent from the catalog (or not locked) are always available
    function isDifficultyUnlocked(difficultyId) {
        var catalog = UnlockCatalog.getDifficulties();
        for (var i = 0; i < catalog.length; i++) {
            if (catalog[i].id === difficultyId && catalog[i].locked) {
                var p = PlayerData.getPlayer();
                return p ? p.unlockedDifficulties.indexOf(difficultyId) !== -1 : false;
            }
        }
        return true;
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

    function isOwned(category, id) {
        if (category === "maps")   return isMapUnlocked(id);
        if (category === "towers") return isTowerUnlocked(id);
        return isDifficultyUnlocked(id);
    }

    // Validates and executes a purchase. Returns { ok, reason }.
    function purchase(category, id) {
        var p = PlayerData.getPlayer();
        if (!p) return { ok: false, reason: "No player loaded" };

        var catalog = category === "maps"   ? UnlockCatalog.getMaps()
                    : category === "towers" ? UnlockCatalog.getTowers()
                    : UnlockCatalog.getDifficulties();
        var item = null;
        for (var i = 0; i < catalog.length; i++) {
            if (catalog[i].id === id) { item = catalog[i]; break; }
        }
        if (!item)        return { ok: false, reason: "Item not found" };
        if (!item.locked) return { ok: false, reason: "Not a lockable item" };

        var owned = isOwned(category, id);
        if (owned)                    return { ok: false, reason: "Already owned" };
        if (p.goldenSeeds < item.cost) return { ok: false, reason: "Not enough seeds" };

        p.goldenSeeds -= item.cost;
        if (category === "maps") {
            p.unlockedMaps.push(id);
        } else if (category === "towers") {
            p.unlockedTowers.push(id);
        } else {
            p.unlockedDifficulties.push(id);
        }
        PlayerData.savePlayer();
        return { ok: true };
    }

    return {
        getDefaults:       getDefaults,
        isMapUnlocked:     isMapUnlocked,
        isTowerUnlocked:   isTowerUnlocked,
        isDifficultyUnlocked: isDifficultyUnlocked,
        isOwned:           isOwned,
        getUnlockedTowers: getUnlockedTowers,
        purchase:          purchase
    };
})();
