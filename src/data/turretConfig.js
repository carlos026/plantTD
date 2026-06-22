import { TILE_W } from './constants.js';

// All turret types in shop order
export const TURRET_TYPES = [
    'machineGun', 'laser', 'flamethrower', 'blizzard',
    'toxic', 'stormCannon', 'railCannon', 'missile',
];

export const TURRET_CONFIG = {
    machineGun: {
        name: 'Machine Gun',
        description: 'Rapid fire with low damage. Great against swarms of weak enemies.',
        color: 0xe0aaff,
        colorHex: '#e0aaff',
        textureKey: 'tw-machinegun',
        soundKey: 'sfx-machinegun',
        cost: 20,
        baseDamage: 20,
        baseRangeTiles: 3,
        cooldown: (_level) => 10,
        critChance: 10,
        upgradeCostMult: 5,
        affectsPlanes: true,
        planeBonus: 2,
        ignoresPlanes: false,
        aoe: false,
        upgradeStats(turret) {
            const ld = turret.level * this.baseDamage;
            const lr = turret.level * this.baseRangeTiles * TILE_W;
            turret.damage += ld * 0.5;
            turret.range  += lr * 0.1;
        },
    },

    laser: {
        name: 'Laser',
        description: 'Sustained beam dealing high damage. Effective against tanky targets.',
        color: 0xff006e,
        colorHex: '#ff006e',
        textureKey: 'tw-laser',
        soundKey: 'sfx-laser',
        cost: 100,
        baseDamage: 150,
        baseRangeTiles: 7,
        cooldown: (level) => 152 - level * 10,
        critChance: 30,
        upgradeCostMult: 0.8,
        affectsPlanes: true,
        planeBonus: 2,
        ignoresPlanes: false,
        aoe: false,
        upgradeStats(turret) {
            const ld = turret.level * this.baseDamage;
            const lr = turret.level * this.baseRangeTiles * TILE_W;
            turret.damage += ld * 0.3;
            turret.range  += lr * 0.05;
        },
    },

    flamethrower: {
        name: 'Flamethrower',
        description: 'Short-range flames dealing damage over time. Ideal for chokepoints.',
        color: 0xfb5607,
        colorHex: '#fb5607',
        textureKey: 'tw-flamethrower',
        soundKey: 'sfx-flamethrower',
        cost: 400,
        baseDamage: 80,
        baseRangeTiles: 2,
        cooldown: (_level) => 25,
        critChance: 0,
        upgradeCostMult: 0.3,
        affectsPlanes: false,
        ignoresPlanes: true,  // cannot target planes
        planeBonus: 0,
        aoe: false,
        upgradeStats(turret) {
            const ld = turret.level * this.baseDamage;
            const lr = turret.level * this.baseRangeTiles * TILE_W;
            turret.damage += ld * 0.2;
            turret.range  += lr * 0.025;
        },
    },

    blizzard: {
        name: 'Blizzard Tower',
        description: 'Freezing shots that slow enemies and deal cold damage.',
        color: 0x00b4d8,
        colorHex: '#00b4d8',
        textureKey: 'tw-blizzard',
        soundKey: 'sfx-blizzard',
        cost: 600,
        baseDamage: 10,
        baseRangeTiles: 5,
        cooldown: (level) => 202 - level * 20,
        critChance: 0,
        upgradeCostMult: 0.15,
        affectsPlanes: true,
        planeBonus: 0,
        ignoresPlanes: false,
        aoe: true,
        freezeDuration: (level) => 100 + level * 10,
        upgradeStats(turret) {
            const ld = turret.level * this.baseDamage;
            const lr = turret.level * this.baseRangeTiles * TILE_W;
            turret.damage += ld * 0.1;
            turret.range  += lr * 0.02;
        },
    },

    toxic: {
        name: 'Toxic Tower',
        description: 'Long-range poison with massive damage. Effective against single targets.',
        color: 0x3a5a40,
        colorHex: '#3a5a40',
        textureKey: 'tw-toxic',
        soundKey: 'sfx-toxic',
        cost: 800,
        baseDamage: 320,
        baseRangeTiles: 7,
        cooldown: (level) => 201 - level * 10,
        critChance: 10,
        upgradeCostMult: 0.15,
        affectsPlanes: true,
        planeBonus: 0,
        ignoresPlanes: false,
        aoe: false,
        toxicDuration: (level) => 125 + level * 20,
        upgradeStats(turret) {
            const ld = turret.level * this.baseDamage;
            const lr = turret.level * this.baseRangeTiles * TILE_W;
            turret.damage += ld * 0.3;
            turret.range  += lr * 0.1;
        },
    },

    stormCannon: {
        name: 'Storm Cannon',
        description: 'Hits all enemies in range simultaneously with electric bursts.',
        color: 0xffbe0b,
        colorHex: '#ffbe0b',
        textureKey: 'tw-stormCannon',
        soundKey: 'sfx-stormCannon',
        cost: 1000,
        baseDamage: 250,
        baseRangeTiles: 15,
        cooldown: (_level) => 10,
        critChance: 3,
        upgradeCostMult: 0.15,
        affectsPlanes: true,
        planeBonus: 0,
        ignoresPlanes: false,
        aoe: true,
        overheatMax: 100,
        overheatPerShot: 1,
        upgradeStats(turret) {
            const ld = turret.level * this.baseDamage;
            const lr = turret.level * this.baseRangeTiles * TILE_W;
            turret.damage += ld * 0.15;
            turret.range  += lr * 0.01;
        },
    },

    railCannon: {
        name: 'Rail Cannon',
        description: 'Extreme single-target damage with a very slow fire rate. Destroys bosses.',
        color: 0x3a86ff,
        colorHex: '#3a86ff',
        textureKey: 'tw-railCannon',
        soundKey: 'sfx-railCannon',
        cost: 1500,
        baseDamage: 3250,
        baseRangeTiles: 5,
        cooldown: (level) => 601 - level * 30,
        critChance: 20,
        upgradeCostMult: 0.2,
        affectsPlanes: true,
        planeBonus: 2,
        ignoresPlanes: false,
        aoe: false,
        stunDuration: (level) => 150 + level * 50,
        upgradeStats(turret) {
            turret.damage += this.baseDamage * 0.25;
            turret.range  += this.baseRangeTiles * TILE_W * 0.2;
        },
    },

    missile: {
        name: 'Missile Turret',
        description: 'Prioritizes aircraft. Fires a missile that detonates on impact, dealing 5× damage to planes.',
        color: 0xffd700,
        colorHex: '#FFD700',
        textureKey: 'tw-missile',
        soundKey: 'sfx-missileLaunch',
        soundImpactKey: 'sfx-missileImpact',
        cost: 2000,
        baseDamage: 5000,
        baseRangeTiles: 7,
        cooldown: (level) => 420 - level * 20,
        critChance: 20,
        upgradeCostMult: 0.2,
        affectsPlanes: true,
        planeBonus: 5,
        planePriority: true,
        ignoresPlanes: false,
        aoe: false,
        flightTicks: 80,
        ammoPerLevel: [0, 5, 6, 8, 10, 12],
        ammoLoadTicks: 500,
        upgradeStats(turret) {
            const ld = turret.level * this.baseDamage;
            const lr = turret.level * this.baseRangeTiles * TILE_W;
            turret.damage += ld * 0.3;
            turret.range  += lr * 0.05;
        },
    },
};

// -------------------------------------------------------------------------
// Helper functions (replacing the original switch/case turret.js functions)
// -------------------------------------------------------------------------

export function getTurretConfig(type) {
    return TURRET_CONFIG[type];
}

export function turretName(type)        { return TURRET_CONFIG[type]?.name ?? type; }
export function turretColor(type)       { return TURRET_CONFIG[type]?.colorHex ?? '#ffffff'; }
export function turretCost(type)        { return TURRET_CONFIG[type]?.cost ?? 0; }
export function turretBaseDamage(type)  { return TURRET_CONFIG[type]?.baseDamage ?? 0; }
export function turretRangePx(type)     { return (TURRET_CONFIG[type]?.baseRangeTiles ?? 0) * TILE_W; }
export function turretCooldown(type, level) { return TURRET_CONFIG[type]?.cooldown(level) ?? 30; }

export function turretUpgradeCost(type, level) {
    const cfg = TURRET_CONFIG[type];
    if (!cfg) return 0;
    return Math.floor(level * cfg.cost * cfg.upgradeCostMult);
}

export function turretSellPrice(type, totalUpgradeCost) {
    return Math.floor(turretCost(type) * 0.2 + totalUpgradeCost * 0.2);
}

export function getMissileMaxAmmo(level) {
    const cfg = TURRET_CONFIG.missile;
    return cfg.ammoPerLevel[level] ?? 12;
}

export function calculateCritDamage(type, baseDmg) {
    const chance = TURRET_CONFIG[type]?.critChance ?? 0;
    return Math.random() < chance / 100 ? baseDmg * 2 : baseDmg;
}