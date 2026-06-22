import Phaser from 'phaser';
import { TURRET_TYPES, TURRET_CONFIG } from '../data/turretConfig.js';
import {
    MAP_OFFSET_X, MAP_OFFSET_Y,
    TILE_W, TILE_H, MAP_W, MAP_H,
    TURRET_D, TURRET_GAP,
} from '../data/constants.js';

// Width of each shop card (px in game coords)
const CARD_W = 56;
const CARD_H = 72;
const CARD_PAD = 6;

/**
 * Renders the 8 turret shop cards in the top bar of the game canvas.
 * Handles pointer drag to place turrets on the map.
 *
 * Usage:
 *   const shop = new ShopPanel(scene, turretSystem);
 *   shop.create();
 *
 * Events emitted on scene.events:
 *   'shop-drag-start'  { type }      — user started dragging a card
 *   'shop-drag-end'    { type, tileX, tileY, cancelled } — drag ended
 */
export default class ShopPanel {
    constructor(scene, turretSystem, gameState) {
        this.scene = scene;
        this.turretSystem = turretSystem;
        this.gameState = gameState; // { cash, lives, wave }

        this._cards = [];
        this._ghost = null;
        this._draggingType = null;
        this._highlightGraphics = null;
    }

    create() {
        this._highlightGraphics = this.scene.add.graphics().setDepth(50);
        this._drawBackground();
        this._createCards();
        this._setupPointerEvents();
    }

    destroy() {
        this._cards.forEach((c) => c.container.destroy());
        this._cards = [];
        if (this._ghost) { this._ghost.destroy(); this._ghost = null; }
        if (this._highlightGraphics) { this._highlightGraphics.destroy(); }
    }

    // -------------------------------------------------------------------------
    // Refresh all card affordances (called when cash changes)
    // -------------------------------------------------------------------------
    refresh(cash) {
        this._cards.forEach((card) => {
            const canAfford = cash >= TURRET_CONFIG[card.type].cost;
            card.costText.setColor(canAfford ? '#ffd700' : '#ff4444');
            card.container.setAlpha(canAfford ? 1 : 0.5);
        });
    }

    // -------------------------------------------------------------------------
    // Background of the top shop bar
    // -------------------------------------------------------------------------
    _drawBackground() {
        const g = this.scene.add.graphics().setDepth(10);
        const barH = MAP_OFFSET_Y;
        const barX = MAP_OFFSET_X;
        const barW = MAP_W * TILE_W;

        g.fillStyle(0x0a0a1a, 1);
        g.fillRect(barX, 0, barW, barH);
        g.lineStyle(1, 0x333366, 1);
        g.strokeRect(barX, 0, barW, barH);
    }

    // -------------------------------------------------------------------------
    // Create one card per turret type
    // -------------------------------------------------------------------------
    _createCards() {
        const startX = MAP_OFFSET_X + 8;
        const startY = 6;

        TURRET_TYPES.forEach((type, idx) => {
            const cfg = TURRET_CONFIG[type];
            const x = startX + idx * (CARD_W + CARD_PAD);
            const y = startY;

            const container = this.scene.add.container(x, y).setDepth(20);

            // Card background
            const bg = this.scene.add.graphics();
            bg.fillStyle(cfg.color, 0.15);
            bg.lineStyle(1, cfg.color, 0.7);
            bg.fillRoundedRect(0, 0, CARD_W, CARD_H, 4);
            bg.strokeRoundedRect(0, 0, CARD_W, CARD_H, 4);
            container.add(bg);

            // Turret icon
            const icon = this.scene.add.image(CARD_W / 2, 24, cfg.textureKey)
                .setDisplaySize(32, 32);
            container.add(icon);

            // Cost label
            const costText = this.scene.add.text(CARD_W / 2, CARD_H - 14, `$${cfg.cost}`, {
                fontFamily: 'Orbitron, sans-serif',
                fontSize: '9px',
                color: '#ffd700',
                align: 'center',
            }).setOrigin(0.5, 0);
            container.add(costText);

            // Name label (tiny)
            const nameText = this.scene.add.text(CARD_W / 2, CARD_H - 4, cfg.name.split(' ')[0], {
                fontFamily: 'Exo 2, sans-serif',
                fontSize: '7px',
                color: '#cccccc',
                align: 'center',
            }).setOrigin(0.5, 1);
            container.add(nameText);

            // Invisible hit area for interaction
            const hitArea = this.scene.add.rectangle(CARD_W / 2, CARD_H / 2, CARD_W, CARD_H, 0, 0)
                .setInteractive({ useHandCursor: true });
            container.add(hitArea);

            this._cards.push({ type, container, bg, costText, hitArea });

            // Hover highlight
            hitArea.on('pointerover', () => {
                bg.clear();
                bg.fillStyle(cfg.color, 0.3);
                bg.lineStyle(2, cfg.color, 1);
                bg.fillRoundedRect(0, 0, CARD_W, CARD_H, 4);
                bg.strokeRoundedRect(0, 0, CARD_W, CARD_H, 4);
            });
            hitArea.on('pointerout', () => {
                bg.clear();
                bg.fillStyle(cfg.color, 0.15);
                bg.lineStyle(1, cfg.color, 0.7);
                bg.fillRoundedRect(0, 0, CARD_W, CARD_H, 4);
                bg.strokeRoundedRect(0, 0, CARD_W, CARD_H, 4);
            });
            hitArea.on('pointerdown', (pointer) => this._onCardDown(type, pointer));
        });
    }

    // -------------------------------------------------------------------------
    // Drag start
    // -------------------------------------------------------------------------
    _onCardDown(type, pointer) {
        if (this.gameState.cash < TURRET_CONFIG[type].cost) return;

        this._draggingType = type;
        const cfg = TURRET_CONFIG[type];

        // Ghost sprite that follows the pointer
        this._ghost = this.scene.add.image(pointer.x, pointer.y, cfg.textureKey)
            .setDisplaySize(TURRET_D, TURRET_D)
            .setAlpha(0.6)
            .setDepth(100);

        this.scene.events.emit('shop-drag-start', { type });
    }

    // -------------------------------------------------------------------------
    // Global pointer events (move and up) set up once
    // -------------------------------------------------------------------------
    _setupPointerEvents() {
        this.scene.input.on('pointermove', (pointer) => {
            if (!this._draggingType) return;
            this._ghost.setPosition(pointer.x, pointer.y);
            this._updateTileHighlight(pointer);
        });

        this.scene.input.on('pointerup', (pointer) => {
            if (!this._draggingType) return;
            this._onDrop(pointer);
        });
    }

    // -------------------------------------------------------------------------
    // Highlight the tile under the cursor while dragging
    // -------------------------------------------------------------------------
    _updateTileHighlight(pointer) {
        this._highlightGraphics.clear();
        const tile = this._pointerToTile(pointer);
        if (!tile) return;

        const px = MAP_OFFSET_X + tile.tileX * TILE_W;
        const py = MAP_OFFSET_Y + tile.tileY * TILE_H;
        const canPlace = this.turretSystem.canPlace(tile.tileX, tile.tileY);

        this._highlightGraphics.lineStyle(2, canPlace ? 0x00ff88 : 0xff4444, 0.9);
        this._highlightGraphics.strokeRect(px, py, TILE_W, TILE_H);
    }

    // -------------------------------------------------------------------------
    // Drop: place turret or cancel
    // -------------------------------------------------------------------------
    _onDrop(pointer) {
        const type = this._draggingType;
        this._draggingType = null;

        if (this._ghost) {
            this._ghost.destroy();
            this._ghost = null;
        }
        this._highlightGraphics.clear();

        const tile = this._pointerToTile(pointer);
        if (tile && this.turretSystem.canPlace(tile.tileX, tile.tileY)) {
            this.scene.events.emit('shop-place-turret', {
                type,
                tileX: tile.tileX,
                tileY: tile.tileY,
            });
        } else {
            this.scene.events.emit('shop-drag-end', { type, cancelled: true });
        }
    }

    // -------------------------------------------------------------------------
    // Convert pointer screen position to map tile coordinates
    // Returns null if outside the map area
    // -------------------------------------------------------------------------
    _pointerToTile(pointer) {
        const mx = pointer.x - MAP_OFFSET_X;
        const my = pointer.y - MAP_OFFSET_Y;
        if (mx < 0 || my < 0 || mx >= MAP_W * TILE_W || my >= MAP_H * TILE_H) return null;
        return {
            tileX: Math.floor(mx / TILE_W),
            tileY: Math.floor(my / TILE_H),
        };
    }
}