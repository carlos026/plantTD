var UnlockCatalog = (function () {
    var _maps = [
        { id: 1, name: "Night Forest", locked: false },
        { id: 2, name: "Wasteland",    locked: true, cost: 1 },
        { id: 3, name: "Swamp",        locked: true, cost: 1 },
        { id: 4, name: "Inferno",      locked: true, cost: 1 },
        { id: 5, name: "Void",         locked: true, cost: 1 },
        { id: 6, name: "Iceland",      locked: true,  cost: 1 }
    ];

    var _towers = [
        { id: "machineGun",   name: "Machine Gun",    locked: false },
        { id: "laser",        name: "Laser",           locked: false },
        { id: "flamethrower", name: "Flamethrower",   locked: false },
        { id: "blizzard",     name: "Blizzard Tower", locked: false },
        { id: "toxic",        name: "Toxic Tower",    locked: false },
        { id: "stormCannon",  name: "Storm Cannon",   locked: false },
        { id: "railCannon",   name: "Rail Cannon",    locked: false },
        { id: "missile",      name: "Missile Turret", locked: true, cost: 3 },
        { id: "archery",      name: "Archery Turret", locked: true,  cost: 1 }
    ];

    return {
        getMaps:   function () { return _maps; },
        getTowers: function () { return _towers; }
    };
})();
