import Phaser from 'phaser';
import { generateMapGrid, MAP_PATHS } from '../data/mapData.js';
import {
    TILE_W, TILE_H, MAP_W, MAP_H,
    MAP_OFFSET_X, MAP_OFFSET_Y,
    GAME_NATIVE_WIDTH, GAME_NATIVE_HEIGHT,
} from '../data/constants.js';
import {
    TURRET_CONFIG,
    turretUpgradeCost,
    turretSellPrice,
    getMissileMaxAmmo,
} from '../data/turretConfig.js';
import TurretSystem  from '../systems/TurretSystem.js';
import MinionSystem  from '../systems/MinionSystem.js';
import WaveSystem    from '../systems/WaveSystem.js';
import CombatSystem  from '../systems/CombatSystem.js';
import ShopPanel     from '../ui/ShopPanel.js';

const TICK_MS     = 10;   // game logic runs at 100 ticks/sec (same as original)
const HUD_UPDATE  = 6;    // refresh HUD every 6 ticks

// Map tile colors
const COLOR_GRASS     = 0x3a7d44;
const COLOR_GRASS_ALT = 0x2d6a4f;
const COLOR_ROAD      = 0x8b7355;
const COLOR_ROAD_DARK = 0x7a6347;

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    // -------------------------------------------------------------------------
    init(data) {
        this.mapId = data.mapId || 1;
        this.gameState = {
            cash: 20,
            lives: 15,
            wave: 0,
            score: 0,
            isRunning: false,
            isPaused: false,
        };
        this._tickAccum = 0;
        this._hudTick   = 0;
    }

    // -------------------------------------------------------------------------
    create() {
        this._mapGrid = generateMapGrid(this.mapId);

        // ---- Rendering ----
        this._drawMap();
        this._drawMapBorder();

        // ---- Systems ----
        this.turretSystem = new TurretSystem(this, this._mapGrid);
        this.turretSystem.create();

        this.minionSystem = new MinionSystem(this, this.mapId);

        this.waveSystem = new WaveSystem(this, this.minionSystem, this.gameState);

        this.combatSystem = new CombatSystem(this, this.turretSystem, this.minionSystem);

        this.shopPanel = new ShopPanel(this, this.turretSystem, this.gameState);
        this.shopPanel.create();
        this.shopPanel.refresh(this.gameState.cash);

        // ---- UI ----
        this._drawSidebar();
        this._drawHUD();
        this._setupSceneEvents();

        // Map cycle (dev)
        this.add.text(GAME_NATIVE_WIDTH - 84, 8, `Map ${this.mapId}  ◂▸`, {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '12px',
            color: '#555577',
        }).setDepth(25).setInteractive({ useHandCursor: true })
          .on('pointerup', () => this.scene.restart({ mapId: (this.mapId % 6) + 1 }));

        // Deselect on empty map click
        this.input.on('pointerdown', (_ptr, objects) => {
            if (objects.length === 0) this.turretSystem.deselect();
        });
    }

    // -------------------------------------------------------------------------
    // Main update — runs every animation frame
    // Accumulates time and triggers game ticks at 10ms intervals
    // -------------------------------------------------------------------------
    update(_time, delta) {
        if (this.gameState.isPaused) return;

        this._tickAccum += delta;
        while (this._tickAccum >= TICK_MS) {
            this._tickAccum -= TICK_MS;
            this._gameTick();
        }
    }

    _gameTick() {
        if (!this.gameState.isRunning) return;

        this.minionSystem.tick();
        this.combatSystem.tick();
        this.waveSystem.tick();
        this.turretSystem.updateCooldowns(TICK_MS);

        this._hudTick++;
        if (this._hudTick >= HUD_UPDATE) {
            this._hudTick = 0;
            this._refreshHUD();
        }
    }

    // -------------------------------------------------------------------------
    // Map rendering
    // -------------------------------------------------------------------------

    _drawMap() {
        const g = this.add.graphics().setDepth(0);
        for (let y = 0; y < MAP_H; y++) {
            for (let x = 0; x < MAP_W; x++) {
                const px = MAP_OFFSET_X + x * TILE_W;
                const py = MAP_OFFSET_Y + y * TILE_H;
                if (this._mapGrid[y][x] === 1) {
                    g.fillStyle((x + y) % 2 === 0 ? COLOR_ROAD : COLOR_ROAD_DARK, 1);
                } else {
                    g.fillStyle((x + y) % 2 === 0 ? COLOR_GRASS : COLOR_GRASS_ALT, 1);
                }
                g.fillRect(px, py, TILE_W, TILE_H);
            }
        }
        if (import.meta.env.DEV) this._drawPathDebug(g);
    }

    _drawPathDebug(g) {
        const path = MAP_PATHS[this.mapId];
        if (!path) return;
        g.lineStyle(1, 0xff0000, 0.35);
        for (let i = 0; i < path.length - 1; i++) {
            const a = path[i], b = path[i + 1];
            g.lineBetween(
                MAP_OFFSET_X + a.x, MAP_OFFSET_Y + a.y,
                MAP_OFFSET_X + b.x, MAP_OFFSET_Y + b.y,
            );
        }
    }

    _drawMapBorder() {
        this.add.graphics().setDepth(1)
            .lineStyle(1, 0x000000, 0.35)
            .strokeRect(MAP_OFFSET_X, MAP_OFFSET_Y, MAP_W * TILE_W, MAP_H * TILE_H);
    }

    // -------------------------------------------------------------------------
    // Left sidebar
    // -------------------------------------------------------------------------

    _drawSidebar() {
        const g = this.add.graphics().setDepth(10);
        g.fillStyle(0x0d0d1a, 1);
        g.fillRect(0, 0, MAP_OFFSET_X, GAME_NATIVE_HEIGHT);
        g.lineStyle(1, 0x2a2a4a, 1);
        g.lineBetween(MAP_OFFSET_X, 0, MAP_OFFSET_X, GAME_NATIVE_HEIGHT);

        this.add.text(10, 10, 'Plant\nTD', {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#e0aaff',
        }).setDepth(20);

        this._sidebarInfo = this.add.text(8, 60, 'Click a turret\nto upgrade.\n\n[U] Upgrade\n[S] Sell', {
            fontFamily: 'Exo 2, sans-serif',
            fontSize: '10px',
            color: '#666688',
            wordWrap: { width: MAP_OFFSET_X - 14 },
        }).setDepth(20);
    }

    // -------------------------------------------------------------------------
    // HUD
    // -------------------------------------------------------------------------

    _drawHUD() {
        const barY = MAP_OFFSET_Y + MAP_H * TILE_H + 6;
        const style = (color) => ({
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '13px',
            color,
        });

        this._hudCash  = this.add.text(MAP_OFFSET_X + 8,   barY, `$${this.gameState.cash}`,  style('#ffd700')).setDepth(25);
        this._hudLives = this.add.text(MAP_OFFSET_X + 120,  barY, `♥ ${this.gameState.lives}`, style('#ff6b6b')).setDepth(25);
        this._hudWave  = this.add.text(MAP_OFFSET_X + 220,  barY, `Wave ${this.gameState.wave}`, style('#e0aaff')).setDepth(25);
        this._hudScore = this.add.text(MAP_OFFSET_X + 340,  barY, `Score ${this.gameState.score}`, style('#aaaaaa')).setDepth(25);

        // START / PAUSE button
        this._startBtn = this.add.text(MAP_OFFSET_X + 500, barY, '▶ START', {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '13px',
            color: '#00ff88',
            backgroundColor: '#003322',
            padding: { x: 8, y: 3 },
        }).setDepth(25).setInteractive({ useHandCursor: true })
          .on('pointerup', () => this._onStartPause());

        // Wave info above map
        this._hudWaveLabel = this.add.text(MAP_OFFSET_X + 8, 6, '', {
            fontFamily: 'Exo 2, sans-serif',
            fontSize: '11px',
            color: '#888899',
        }).setDepth(25);
    }

    _refreshHUD() {
        this._hudCash.setText(`$${Math.floor(this.gameState.cash)}`);
        this._hudLives.setText(`♥ ${this.gameState.lives}`);
        this._hudWave.setText(`Wave ${this.gameState.wave}`);
        this._hudScore.setText(`Score ${this.gameState.score}`);
        this.shopPanel.refresh(this.gameState.cash);
        this._refreshSidebarInfo();
    }

    // -------------------------------------------------------------------------
    // Sidebar upgrade info
    // -------------------------------------------------------------------------

    _refreshSidebarInfo() {
        const t = this.turretSystem.getSelected();
        if (!t) {
            this._sidebarInfo.setText('Click a turret\nto upgrade.\n\n[U] Upgrade\n[S] Sell');
            return;
        }
        const cfg = TURRET_CONFIG[t.type];
        const upgCost = turretUpgradeCost(t.type, t.level);
        const sellAmt = turretSellPrice(t.type, t.totalUpgradeCost);

        let lines = [
            cfg.name,
            `Lv ${t.level}  Dmg ${Math.round(t.damage)}`,
            `Range ${Math.round(t.range / TILE_W)} tiles`,
        ];
        if (t.type === 'missile') {
            lines.push(`Ammo: ${t.ammo}/${getMissileMaxAmmo(t.level)}`);
            if (t.ammoLoading) lines.push('Loading ammo...');
        }
        if (t.type === 'stormCannon') {
            lines.push(`Heat: ${t.overheat}%`);
        }
        lines.push('');
        if (t.level < 5) {
            lines.push(`[U] Upgrade $${upgCost}`);
        } else {
            lines.push('(Max level)');
        }
        lines.push(`[S] Sell $${sellAmt}`);
        if (t.type === 'missile' && !t.ammoLoading && t.ammo < getMissileMaxAmmo(t.level)) {
            lines.push('[A] Buy Ammo $50');
        }
        if (t.type === 'stormCannon' && t.level === 5) {
            lines.push(`[T] Toggle ${t.active !== false ? 'Off' : 'On'}`);
        }

        this._sidebarInfo.setText(lines.join('\n'));
    }

    // -------------------------------------------------------------------------
    // Scene events
    // -------------------------------------------------------------------------

    _setupSceneEvents() {
        // Shop card dropped on valid tile
        this.events.on('shop-place-turret', ({ type, tileX, tileY }) => {
            const cost = TURRET_CONFIG[type].cost;
            if (this.gameState.cash < cost) return;
            const t = this.turretSystem.place(type, tileX, tileY);
            if (!t) return;
            this.gameState.cash -= cost;
            this._refreshHUD();
        });

        // Turret selection events → refresh sidebar
        this.events.on('turret-selected',    () => this._refreshSidebarInfo());
        this.events.on('turret-deselected',  () => this._refreshSidebarInfo());
        this.events.on('turret-ammo-changed',() => this._refreshSidebarInfo());
        this.events.on('turret-storm-toggled', () => this._refreshSidebarInfo());

        // Wave events
        this.events.on('wave-started', ({ wave }) => {
            const boss = this.waveSystem.isBossWave();
            this._hudWaveLabel.setText(boss ? `⚠ BOSS WAVE ${wave}` : `Wave ${wave} started`);
            this._startBtn.setText('⏸ PAUSE');
        });

        this.events.on('wave-complete', ({ wave }) => {
            this._hudWaveLabel.setText(`Wave ${wave} complete!`);
            this._startBtn.setText('▶ START');
            this.gameState.isRunning = false;
        });

        this.events.on('minion-killed',  () => { this.gameState.score++; this._refreshHUD(); });
        this.events.on('minion-escaped', () => this._refreshHUD());

        this.events.on('game-over', () => {
            this.gameState.isRunning = false;
            this._hudWaveLabel.setText('GAME OVER');
            this._startBtn.setText('▶ START');
        });

        // Storm cannon destroyed by overheat
        this.events.on('storm-cannon-destroyed', ({ turret }) => {
            this.turretSystem.sell(turret); // removes sprite + deselects
            this._refreshHUD();
        });

        // Keyboard shortcuts
        const keys = this.input.keyboard.addKeys({ U: 'U', S: 'S', A: 'A', T: 'T', P: 'P' });
        keys.U.on('down', () => this._onUpgrade());
        keys.S.on('down', () => this._onSell());
        keys.A.on('down', () => this._onBuyAmmo());
        keys.T.on('down', () => this._onToggleStorm());
        keys.P.on('down', () => this._onPause());
    }

    // -------------------------------------------------------------------------
    // Actions
    // -------------------------------------------------------------------------

    _onStartPause() {
        if (!this.gameState.isRunning) {
            // Start / resume
            this.gameState.isRunning = true;
            this.gameState.isPaused  = false;
            if (!this.waveSystem.isWaveActive()) {
                this.waveSystem.startWave();
            }
            this._startBtn.setText('⏸ PAUSE');
        } else {
            this._onPause();
        }
    }

    _onPause() {
        this.gameState.isPaused = !this.gameState.isPaused;
        this._startBtn.setText(this.gameState.isPaused ? '▶ RESUME' : '⏸ PAUSE');
    }

    _onUpgrade() {
        const t = this.turretSystem.getSelected();
        if (!t || !this.turretSystem.canUpgrade(t)) return;
        const cost = this.turretSystem.upgradeCost(t);
        if (this.gameState.cash < cost) return;
        this.gameState.cash -= cost;
        this.turretSystem.upgrade(t);
        this._refreshHUD();
    }

    _onSell() {
        const t = this.turretSystem.getSelected();
        if (!t) return;
        const refund = this.turretSystem.sell(t);
        this.gameState.cash += refund;
        this._refreshHUD();
    }

    _onBuyAmmo() {
        const t = this.turretSystem.getSelected();
        if (!t || t.type !== 'missile') return;
        if (this.gameState.cash < 50) return;
        if (t.ammoLoading || t.ammo >= getMissileMaxAmmo(t.level)) return;
        this.gameState.cash -= 50;
        this.turretSystem.startAmmoLoad(t);
        this._refreshHUD();
    }

    _onToggleStorm() {
        const t = this.turretSystem.getSelected();
        if (!t || t.type !== 'stormCannon' || t.level < 5) return;
        this.turretSystem.toggleStorm(t);
        this._refreshSidebarInfo();
    }
}
