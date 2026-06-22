import Phaser from 'phaser';
import { TURRET_CONFIG, calculateCritDamage } from '../data/turretConfig.js';
import { STORM_OVERHEAT_MAX, STORM_OVERHEAT_PER_SHOT, MAP_OFFSET_X, MAP_OFFSET_Y } from '../data/constants.js';

/**
 * Handles all turret→minion combat: targeting, damage, special effects,
 * deferred hits (blizzard AoE, missile impact), and projectile visuals.
 */
export default class CombatSystem {
    constructor(scene, turretSystem, minionSystem) {
        this.scene = scene;
        this.turretSystem = turretSystem;
        this.minionSystem = minionSystem;

        // Deferred damage accumulated each tick before applying
        this._blizzardPending = {}; // minionId → damage
        this._missilePending  = {}; // minionId → damage
    }

    destroy() {
        // Clean up any in-flight missile projectile sprites
        for (const t of this.turretSystem.turrets) {
            if (t.pendingMissiles) {
                t.pendingMissiles.forEach((m) => m.projectileSprite?.destroy());
                t.pendingMissiles = [];
            }
        }
    }

    // -------------------------------------------------------------------------
    // Main tick: called once per game tick (10ms)
    // -------------------------------------------------------------------------

    tick() {
        this._blizzardPending = {};

        this._processPendingMissiles();
        this._updateMissilePlaneFlags();

        const activeMinions = this.minionSystem.getActiveMinions();

        for (const minion of activeMinions) {
            if (minion.hp <= 0) continue;

            let damage = this._checkTurrets(minion);

            // Apply blizzard AoE deferred damage
            const blizzDmg = this._blizzardPending[minion.id] || 0;
            if (blizzDmg > 0) { damage += blizzDmg; delete this._blizzardPending[minion.id]; }

            // Apply missile deferred damage
            const missileDmg = this._missilePending[minion.id] || 0;
            if (missileDmg > 0) { damage += missileDmg; delete this._missilePending[minion.id]; }

            if (damage > 0) {
                this.minionSystem.applyDamage(minion, damage);
                if (minion.hp <= 0) {
                    minion.alive = false;
                    this.minionSystem.killMinion(minion);
                }
            }
        }
    }

    // -------------------------------------------------------------------------
    // Per-minion: iterate turrets and apply damage / effects
    // -------------------------------------------------------------------------

    _checkTurrets(minion) {
        let totalDamage = 0;
        const turrets = this.turretSystem.turrets;

        for (const turret of turrets) {
            if (turret.shotCd > 0) continue;

            const dist = Phaser.Math.Distance.Between(
                minion.x, minion.y, turret.pixelX, turret.pixelY,
            );
            if (dist > turret.range) continue;

            const cfg = TURRET_CONFIG[turret.type];

            // Flamethrower ignores planes
            if (cfg.ignoresPlanes && minion.isPlane) continue;

            // Missile special: plane priority
            if (turret.type === 'missile') {
                if (!minion.isPlane && turret.planeInRange) continue;
                if (turret.ammo <= 0) continue;
                totalDamage += this._fireMissile(turret, minion);
                continue;
            }

            // Storm cannon: hits ALL minions in range simultaneously
            if (turret.type === 'stormCannon') {
                if (turret.active === false) continue;
                totalDamage += this._fireStormCannon(turret, minion, dist);
                continue;
            }

            // Blizzard: AoE freeze
            if (turret.type === 'blizzard') {
                this._fireBlizzard(turret, minion);
                continue;
            }

            // Generic single-target turrets
            totalDamage += this._fireGeneric(turret, minion);
        }

        return totalDamage;
    }

    // -------------------------------------------------------------------------
    // Generic fire (machineGun, laser, flamethrower, toxic, railCannon)
    // -------------------------------------------------------------------------

    _fireGeneric(turret, minion) {
        const cfg = TURRET_CONFIG[turret.type];

        // Plane bonus
        let dmg = calculateCritDamage(turret.type, turret.damage);
        if (minion.isPlane && cfg.planeBonus > 1) dmg *= cfg.planeBonus;

        // Debuffs
        if (turret.type === 'toxic') {
            this.minionSystem.poison(minion, cfg.toxicDuration(turret.level));
        }
        if (turret.type === 'railCannon') {
            this.minionSystem.stun(minion, cfg.stunDuration(turret.level));
        }

        // Flash effect on turret sprite
        this._flashTurret(turret, cfg.colorHex);
        this.turretSystem.rotateTo(turret, minion.x, minion.y);

        // Sound
        this._playTurretSound(turret);

        this._startCooldown(turret);
        turret.totalDamage += dmg;
        return dmg;
    }

    // -------------------------------------------------------------------------
    // Blizzard: AoE freeze + deferred damage on all minions in range
    // -------------------------------------------------------------------------

    _fireBlizzard(turret, minion) {
        const cfg = TURRET_CONFIG.blizzard;
        const allMinions = this.minionSystem.getActiveMinions();

        for (const m of allMinions) {
            const d = Phaser.Math.Distance.Between(m.x, m.y, turret.pixelX, turret.pixelY);
            if (d <= turret.range) {
                this.minionSystem.freeze(m, cfg.freezeDuration(turret.level));
                this._blizzardPending[m.id] = (this._blizzardPending[m.id] || 0) + turret.damage;
                turret.totalDamage += turret.damage;
            }
        }

        this._flashTurret(turret, cfg.colorHex);
        this._playTurretSound(turret);
        this._startCooldown(turret);
        // AoE uses special blizzard cooldown signal
        turret.shotCd = -1;
    }

    // -------------------------------------------------------------------------
    // Storm Cannon: hits ALL minions in range per tick
    // -------------------------------------------------------------------------

    _fireStormCannon(turret, minion, dist) {
        const cfg = TURRET_CONFIG.stormCannon;

        if (turret.overheat >= STORM_OVERHEAT_MAX) {
            // Destroy the turret
            this.scene.events.emit('storm-cannon-destroyed', { turret });
            return 0;
        }

        let dmg = calculateCritDamage('stormCannon', turret.damage);
        if (minion.isPlane && cfg.planeBonus > 1) dmg *= cfg.planeBonus;

        turret.overheat = Math.min(STORM_OVERHEAT_MAX, turret.overheat + STORM_OVERHEAT_PER_SHOT);
        turret.firedThisTurn = true;

        this._flashTurret(turret, cfg.colorHex);
        this._playTurretSound(turret);
        this._startCooldown(turret);
        turret.totalDamage += dmg;
        return dmg;
    }

    // -------------------------------------------------------------------------
    // Missile: queue delayed impact
    // -------------------------------------------------------------------------

    _fireMissile(turret, minion) {
        const cfg = TURRET_CONFIG.missile;
        let dmg = turret.damage;
        if (minion.isPlane) dmg *= cfg.planeBonus;

        turret.ammo--;

        // Create projectile sprite
        const projSprite = this.scene.add.image(turret.pixelX, turret.pixelY, 'tw-missileShot')
            .setDisplaySize(12, 12)
            .setDepth(55);

        turret.pendingMissiles.push({
            id: minion.id,
            minion,
            damage: dmg,
            timer: cfg.flightTicks,
            projectileSprite: projSprite,
            startX: turret.pixelX,
            startY: turret.pixelY,
        });

        this.turretSystem.rotateTo(turret, minion.x, minion.y);
        this._flashTurret(turret, cfg.colorHex);

        // Launch sound
        if (turret._launchSound) {
            turret._launchSound.stop();
        }
        turret._launchSound = this.scene.sound.add(cfg.soundKey, { volume: 0.4 });
        turret._launchSound.play();

        this._startCooldown(turret);
        return 0; // damage applied at impact
    }

    // -------------------------------------------------------------------------
    // Process in-flight missiles each tick (lerp projectile, apply on impact)
    // -------------------------------------------------------------------------

    _processPendingMissiles() {
        for (const turret of this.turretSystem.turrets) {
            if (turret.type !== 'missile' || !turret.pendingMissiles) continue;

            const remaining = [];
            for (const missile of turret.pendingMissiles) {
                missile.timer--;

                // Lerp projectile toward current minion position
                if (missile.projectileSprite && missile.minion.alive) {
                    const progress = 1 - missile.timer / TURRET_CONFIG.missile.flightTicks;
                    const curX = missile.startX + (missile.minion.x - missile.startX) * progress;
                    const curY = missile.startY + (missile.minion.y - missile.startY) * progress;
                    missile.projectileSprite.setPosition(curX, curY);

                    const angle = Phaser.Math.Angle.Between(
                        curX, curY, missile.minion.x, missile.minion.y,
                    );
                    missile.projectileSprite.setRotation(angle + Math.PI / 2);
                }

                if (missile.timer <= 0) {
                    // Impact!
                    missile.projectileSprite?.destroy();
                    this._missilePending[missile.id] =
                        (this._missilePending[missile.id] || 0) + missile.damage;
                    turret.totalDamage += missile.damage;

                    // Impact sound
                    const impactKey = TURRET_CONFIG.missile.soundImpactKey;
                    this.scene.sound.play(impactKey, { volume: 0.5 });

                    // Impact visual (orange flash)
                    this._createMissileImpact(missile.minion.x, missile.minion.y);
                } else {
                    remaining.push(missile);
                }
            }
            turret.pendingMissiles = remaining;
        }
    }

    // -------------------------------------------------------------------------
    // Pre-pass: flag missile turrets that have a plane in range
    // -------------------------------------------------------------------------

    _updateMissilePlaneFlags() {
        const missileTurrets = this.turretSystem.turrets.filter(
            (t) => t.type === 'missile',
        );
        for (const t of missileTurrets) t.planeInRange = false;

        const planes = this.minionSystem.getActivePlanes();
        for (const plane of planes) {
            for (const t of missileTurrets) {
                if (t.shotCd > 0) continue;
                const d = Phaser.Math.Distance.Between(plane.x, plane.y, t.pixelX, t.pixelY);
                if (d <= t.range) t.planeInRange = true;
            }
        }
    }

    // -------------------------------------------------------------------------
    // Missile impact visual
    // -------------------------------------------------------------------------

    _createMissileImpact(x, y) {
        const g = this.scene.add.graphics().setDepth(70);
        g.fillStyle(0xff8800, 0.8);
        g.fillCircle(x, y, 12);
        g.fillStyle(0xffdd00, 0.9);
        g.fillCircle(x, y, 6);

        this.scene.tweens.add({
            targets: g,
            alpha: 0,
            scaleX: 2.5,
            scaleY: 2.5,
            duration: 600,
            ease: 'Power2',
            onComplete: () => g.destroy(),
        });
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    _startCooldown(turret) {
        turret.shotCd = TURRET_CONFIG[turret.type].cooldown(turret.level);
    }

    _flashTurret(turret, colorHex) {
        turret.sprite?.setTint(Phaser.Display.Color.HexStringToColor(colorHex).color);
        this.scene.time.delayedCall(80, () => turret.sprite?.clearTint());
    }

    _playTurretSound(turret) {
        const key = TURRET_CONFIG[turret.type]?.soundKey;
        if (!key) return;
        if (turret.audioCd > 0) { turret.audioCd--; return; }
        turret.audioCd = TURRET_CONFIG[turret.type].cooldown(turret.level);
        this.scene.sound.play(key, { volume: 0.3 });
    }
}
