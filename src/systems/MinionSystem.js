import Phaser from 'phaser';
import { MAP_PATHS } from '../data/mapData.js';
import { MAP_OFFSET_X, MAP_OFFSET_Y, TILE_W, TILE_H } from '../data/constants.js';

// Debuff speeds
const SPEED_NORMAL  = 1.0;
const SPEED_FROZEN  = 0.5;
const SPEED_STUNNED = 0.0;
const SPEED_PLANE   = 3.0;
const SPEED_PLANE_FROZEN = 1.0;

// Visual sizes
const SPRITE_SIZE      = 16;
const BOSS_SPRITE_SIZE = 30;
const HP_BAR_W         = 20;
const HP_BAR_H         = 3;
const HP_BAR_BOSS_W    = 30;

let _minionIdCounter = 0;

/**
 * Manages all active minions: sprites, HP bars, path following, debuffs.
 *
 * Minion data object:
 *  { id, sprite, hpGfx, maxHp, hp, x, y, waypointIdx, alive, escaped,
 *    released, releaseDelay, isPlane, isBoss, _frozen, _stunned, _toxic }
 */
export default class MinionSystem {
    constructor(scene, mapId) {
        this.scene = scene;
        this.mapId = mapId;
        this.minions = [];
        this._path = MAP_PATHS[mapId] || [];
    }

    setMapId(mapId) {
        this.mapId = mapId;
        this._path = MAP_PATHS[mapId] || [];
    }

    destroy() {
        this.minions.forEach((m) => this._destroyMinion(m));
        this.minions = [];
    }

    // -------------------------------------------------------------------------
    // Spawn a new minion (called by WaveSystem)
    // -------------------------------------------------------------------------

    spawn({ maxHp, isPlane = false, isBoss = false, releaseDelay = 0 }) {
        const start = this._path[0] ?? { x: 0, y: 0 };
        const px = MAP_OFFSET_X + start.x;
        const py = MAP_OFFSET_Y + start.y;

        const size = isBoss ? BOSS_SPRITE_SIZE : SPRITE_SIZE;
        const texKey = this._minionTexKey(isPlane, isBoss, 'down');

        const sprite = this.scene.add.image(px, py, texKey)
            .setDisplaySize(size, size)
            .setDepth(60)
            .setVisible(false)
            .setInteractive();

        const hpGfx = this.scene.add.graphics().setDepth(61);

        const minion = {
            id: `m-${++_minionIdCounter}`,
            sprite,
            hpGfx,
            maxHp,
            hp: maxHp,
            x: px,
            y: py,
            waypointIdx: 1,
            alive: true,
            escaped: false,
            released: false,
            releaseDelay,
            isPlane,
            isBoss,
            // debuffs (duration in ticks)
            _frozen: 0,
            _stunned: 0,
            _toxic: 0,
        };

        this.minions.push(minion);
        return minion;
    }

    // -------------------------------------------------------------------------
    // Per-tick update (called from the game tick loop, once per 10ms)
    // -------------------------------------------------------------------------

    tick() {
        for (const m of this.minions) {
            if (!m.alive) continue;

            // Stagger release
            if (!m.released) {
                if (m.releaseDelay > 0) {
                    m.releaseDelay--;
                    continue;
                }
                m.released = true;
                m.sprite.setVisible(true);
            }

            // Check path completion
            if (m.waypointIdx >= this._path.length) {
                m.alive = false;
                m.escaped = true;
                this._destroyMinion(m);
                continue;
            }

            // Tick down debuffs
            this._tickDebuffs(m);

            // Move toward current waypoint
            this._move(m);

            // Update visuals
            this._updateVisuals(m);
        }

        // Remove dead / escaped minions from array each tick
        this.minions = this.minions.filter((m) => m.alive);
    }

    // -------------------------------------------------------------------------
    // Movement
    // -------------------------------------------------------------------------

    _move(m) {
        const speed = this._getSpeed(m);
        if (speed === 0) return; // stunned

        const target = this._path[m.waypointIdx];
        const tx = MAP_OFFSET_X + target.x;
        const ty = MAP_OFFSET_Y + target.y;

        const dx = tx - m.x;
        const dy = ty - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= speed) {
            m.x = tx;
            m.y = ty;
            m.waypointIdx++;
        } else {
            m.x += (dx / dist) * speed;
            m.y += (dy / dist) * speed;
        }

        m.sprite.setPosition(m.x, m.y);

        // Rotate sprite to face direction
        const angle = Math.atan2(dy, dx) * Phaser.Math.RAD_TO_DEG;
        this._updateSpriteDirection(m, dx, dy);
    }

    _getSpeed(m) {
        if (m._stunned > 0) return SPEED_STUNNED;
        if (m.isPlane) return m._frozen > 0 ? SPEED_PLANE_FROZEN : SPEED_PLANE;
        return m._frozen > 0 ? SPEED_FROZEN : SPEED_NORMAL;
    }

    _updateSpriteDirection(m, dx, dy) {
        let dir = 'down';
        if (Math.abs(dx) > Math.abs(dy)) {
            dir = dx > 0 ? 'right' : 'left';
        } else {
            dir = dy > 0 ? 'down' : 'up';
        }
        const key = this._minionTexKey(m.isPlane, m.isBoss, dir);
        if (m.sprite.texture.key !== key) m.sprite.setTexture(key);
    }

    _minionTexKey(isPlane, isBoss, dir) {
        if (isPlane) return isBoss ? `pla-boss-${dir}` : `pla-${dir}`;
        return isBoss ? `boss-${dir}` : `min-${dir}`;
    }

    // -------------------------------------------------------------------------
    // HP bar
    // -------------------------------------------------------------------------

    _updateVisuals(m) {
        const barW = m.isBoss ? HP_BAR_BOSS_W : HP_BAR_W;
        const barX = m.x - barW / 2;
        const barY = m.y - (m.isBoss ? BOSS_SPRITE_SIZE : SPRITE_SIZE) / 2 - 5;
        const pct  = Math.max(0, m.hp / m.maxHp);

        m.hpGfx.clear();

        // Background
        m.hpGfx.fillStyle(0x330000, 1);
        m.hpGfx.fillRect(barX, barY, barW, HP_BAR_H);

        // Fill — gradient from green → yellow → red
        const fillColor = pct > 0.6 ? 0x00cc44 : pct > 0.3 ? 0xffaa00 : 0xff2222;
        m.hpGfx.fillStyle(fillColor, 1);
        m.hpGfx.fillRect(barX, barY, barW * pct, HP_BAR_H);

        // Debuff tints
        if (m._frozen > 0) m.sprite.setTint(0x88ddff);
        else if (m._stunned > 0) m.sprite.setTint(0xffff88);
        else if (m._toxic > 0) m.sprite.setTint(0x88ff44);
        else m.sprite.clearTint();
    }

    // -------------------------------------------------------------------------
    // Debuffs
    // -------------------------------------------------------------------------

    _tickDebuffs(m) {
        if (m._frozen  > 0) m._frozen--;
        if (m._stunned > 0) m._stunned--;
        if (m._toxic   > 0) {
            m._toxic--;
            m.hp -= 20;
        }
    }

    freeze(m, duration) {
        if (!m.isPlane) {
            m._frozen = Math.max(m._frozen, duration);
        } else {
            m._frozen = Math.max(m._frozen, Math.floor(duration * 0.5));
        }
    }

    stun(m, duration) {
        if (!m.isPlane) {
            m._stunned = Math.max(m._stunned, duration);
        }
        // planes are immune to stun
    }

    poison(m, duration) {
        m._toxic = Math.max(m._toxic, duration);
    }

    applyDamage(m, amount) {
        if (!m.alive) return;
        m.hp -= amount;
    }

    // -------------------------------------------------------------------------
    // Cleanup
    // -------------------------------------------------------------------------

    killMinion(m) {
        m.alive = false;
        this._destroyMinion(m);
    }

    _destroyMinion(m) {
        m.sprite?.destroy();
        m.hpGfx?.destroy();
        m.sprite = null;
        m.hpGfx = null;
    }

    // -------------------------------------------------------------------------
    // Queries
    // -------------------------------------------------------------------------

    getActiveMinions() {
        return this.minions.filter((m) => m.alive && m.released);
    }

    getActivePlanes() {
        return this.getActiveMinions().filter((m) => m.isPlane);
    }

    hasAlive() {
        return this.minions.some((m) => m.alive);
    }
}
