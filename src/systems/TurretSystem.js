import Phaser from 'phaser';
import {
    TURRET_CONFIG,
    turretUpgradeCost,
    turretSellPrice,
    getMissileMaxAmmo,
} from '../data/turretConfig.js';
import {
    MAP_OFFSET_X, MAP_OFFSET_Y,
    TILE_W, TILE_H, TURRET_D,
    STORM_OVERHEAT_MAX, STORM_OVERHEAT_PER_SHOT,
} from '../data/constants.js';

let _turretIdCounter = 0;

/**
 * Manages all placed turrets: placement, selection, upgrade, sell, range indicator.
 *
 * Turret data object:
 * {
 *   id, type, tileX, tileY, pixelX, pixelY,
 *   level, damage, range (px),
 *   shotCd, audioCd,
 *   sprite, level (1-5),
 *   totalDamage,
 *   // stormCannon extras: overheat, overheatCoolTick, firedThisTurn, active
 *   // missile extras: ammo, ammoLoading, ammoLoadTick, pendingMissiles, planeInRange
 * }
 */
export default class TurretSystem {
    constructor(scene, mapGrid) {
        this.scene = scene;
        this.mapGrid = mapGrid; // 2D array [y][x], 1 = road
        this.turrets = [];
        this._selectedTurret = null;
        this._rangeGraphics = null;
        this._occupiedTiles = new Set(); // "tileX,tileY" strings
    }

    create() {
        this._rangeGraphics = this.scene.add.graphics().setDepth(40);
    }

    destroy() {
        this.turrets.forEach((t) => this._destroyTurretSprite(t));
        this.turrets = [];
        this._occupiedTiles.clear();
        if (this._rangeGraphics) this._rangeGraphics.destroy();
    }

    // -------------------------------------------------------------------------
    // Placement validation
    // -------------------------------------------------------------------------

    canPlace(tileX, tileY) {
        if (tileX < 0 || tileY < 0) return false;
        if (this.mapGrid[tileY]?.[tileX] === 1) return false; // road
        if (this._occupiedTiles.has(`${tileX},${tileY}`)) return false;
        return true;
    }

    // -------------------------------------------------------------------------
    // Place a turret on the map
    // Returns the new turret object, or null if placement failed
    // -------------------------------------------------------------------------

    place(type, tileX, tileY) {
        if (!this.canPlace(tileX, tileY)) return null;

        const cfg = TURRET_CONFIG[type];
        const pixelX = MAP_OFFSET_X + tileX * TILE_W + TILE_W / 2;
        const pixelY = MAP_OFFSET_Y + tileY * TILE_H + TILE_H / 2;

        const sprite = this.scene.add.image(pixelX, pixelY, cfg.textureKey)
            .setDisplaySize(TURRET_D, TURRET_D)
            .setDepth(30)
            .setInteractive({ useHandCursor: true });

        const turret = {
            id: `turret-${++_turretIdCounter}`,
            type,
            tileX,
            tileY,
            pixelX,
            pixelY,
            level: 1,
            damage: cfg.baseDamage,
            range: cfg.baseRangeTiles * TILE_W,
            shotCd: 0,
            audioCd: 0,
            sprite,
            totalDamage: 0,
            totalUpgradeCost: 0,
        };

        // Type-specific extra state
        if (type === 'stormCannon') {
            turret.overheat = 0;
            turret.overheatCoolTick = 0;
            turret.firedThisTurn = false;
            turret.active = true;
        }
        if (type === 'missile') {
            turret.ammo = getMissileMaxAmmo(1);
            turret.ammoLoading = false;
            turret.ammoLoadTick = 0;
            turret.pendingMissiles = [];
            turret.planeInRange = false;
        }

        this.turrets.push(turret);
        this._occupiedTiles.add(`${tileX},${tileY}`);

        sprite.on('pointerdown', () => this.select(turret));

        return turret;
    }

    // -------------------------------------------------------------------------
    // Selection and range indicator
    // -------------------------------------------------------------------------

    select(turret) {
        if (this._selectedTurret === turret) {
            this.deselect();
            return;
        }
        this._selectedTurret = turret;
        this._drawRange(turret);
        this.scene.events.emit('turret-selected', { turret });
    }

    deselect() {
        this._selectedTurret = null;
        this._rangeGraphics.clear();
        this.scene.events.emit('turret-deselected');
    }

    getSelected() {
        return this._selectedTurret;
    }

    _drawRange(turret) {
        const cfg = TURRET_CONFIG[turret.type];
        const color = cfg.color;
        this._rangeGraphics.clear();
        this._rangeGraphics.fillStyle(color, 0.08);
        this._rangeGraphics.fillCircle(turret.pixelX, turret.pixelY, turret.range);
        this._rangeGraphics.lineStyle(1.5, color, 0.5);
        this._rangeGraphics.strokeCircle(turret.pixelX, turret.pixelY, turret.range);
    }

    refreshRange() {
        if (this._selectedTurret) this._drawRange(this._selectedTurret);
    }

    // -------------------------------------------------------------------------
    // Upgrade
    // -------------------------------------------------------------------------

    canUpgrade(turret) {
        return turret.level < 5;
    }

    upgradeCost(turret) {
        return turretUpgradeCost(turret.type, turret.level);
    }

    upgrade(turret) {
        if (!this.canUpgrade(turret)) return false;
        const cost = this.upgradeCost(turret);
        turret.level++;
        turret.totalUpgradeCost += cost;

        // Apply stat increases from config
        TURRET_CONFIG[turret.type].upgradeStats(turret);

        // Update cooldown after level change
        turret.shotCd = 0;

        if (this._selectedTurret === turret) this._drawRange(turret);
        return true;
    }

    // -------------------------------------------------------------------------
    // Sell
    // -------------------------------------------------------------------------

    sell(turret) {
        const idx = this.turrets.indexOf(turret);
        if (idx === -1) return 0;

        const refund = turretSellPrice(turret.type, turret.totalUpgradeCost);

        // Clean up in-flight missile projectiles
        if (turret.type === 'missile' && turret.pendingMissiles) {
            turret.pendingMissiles.forEach((m) => {
                if (m.projectileSprite) m.projectileSprite.destroy();
            });
        }

        this._destroyTurretSprite(turret);
        this.turrets.splice(idx, 1);
        this._occupiedTiles.delete(`${turret.tileX},${turret.tileY}`);

        if (this._selectedTurret === turret) {
            this.deselect();
        }

        return refund;
    }

    _destroyTurretSprite(turret) {
        if (turret.sprite) {
            turret.sprite.destroy();
            turret.sprite = null;
        }
    }

    // -------------------------------------------------------------------------
    // Per-tick cooldown update (called from GameScene.update)
    // -------------------------------------------------------------------------

    updateCooldowns(delta) {
        for (const turret of this.turrets) {
            if (turret.shotCd > 0) {
                turret.shotCd--;
            } else {
                // Blizzard resets after AoE shot completes
                if (turret.type === 'blizzard' && turret.shotCd === -1) {
                    turret.shotCd = TURRET_CONFIG.blizzard.cooldown(turret.level);
                }
                // Flamethrower: extended cooldown window
                if (turret.type === 'flamethrower' && turret.shotCd < 0) {
                    turret.shotCd++;
                }
            }

            // Storm cannon overheat decay
            if (turret.type === 'stormCannon' && turret.overheat > 0) {
                if (turret.overheatCoolTick > 0) {
                    turret.overheatCoolTick--;
                } else {
                    turret.overheat = Math.max(0, turret.overheat - STORM_OVERHEAT_PER_SHOT);
                    const base = TURRET_CONFIG.stormCannon.cooldown(1);
                    turret.overheatCoolTick = turret.firedThisTurn
                        ? base
                        : Math.ceil(base / turret.level);
                }
                turret.firedThisTurn = false;
            }

            // Missile ammo loading
            if (turret.type === 'missile' && turret.ammoLoading) {
                turret.ammoLoadTick--;
                if (turret.ammoLoadTick <= 0) {
                    turret.ammo = Math.min(
                        turret.ammo + 1,
                        getMissileMaxAmmo(turret.level),
                    );
                    turret.ammoLoading = false;
                    turret.ammoLoadTick = 0;
                    if (this._selectedTurret === turret) {
                        this.scene.events.emit('turret-ammo-changed', { turret });
                    }
                }
            }
        }
    }

    // -------------------------------------------------------------------------
    // Rotate turret sprite toward a target position
    // -------------------------------------------------------------------------

    rotateTo(turret, targetX, targetY) {
        const angle = Phaser.Math.Angle.Between(
            turret.pixelX, turret.pixelY,
            targetX, targetY,
        );
        turret.sprite.setRotation(angle + Math.PI / 2);
    }

    resetRotation(turret) {
        turret.sprite.setRotation(0);
    }

    // -------------------------------------------------------------------------
    // Missile ammo buy (deducts from caller; caller checks cash)
    // -------------------------------------------------------------------------

    startAmmoLoad(turret) {
        if (turret.type !== 'missile') return;
        if (turret.ammoLoading) return;
        if (turret.ammo >= getMissileMaxAmmo(turret.level)) return;
        turret.ammoLoading = true;
        turret.ammoLoadTick = TURRET_CONFIG.missile.ammoLoadTicks;
    }

    // -------------------------------------------------------------------------
    // Toggle storm cannon active state (level 5 only)
    // -------------------------------------------------------------------------

    toggleStorm(turret) {
        if (turret.type !== 'stormCannon') return;
        turret.active = !turret.active;
        this.scene.events.emit('turret-storm-toggled', { turret });
    }
}