// constants
// The game logic was designed for 15px tiles. MAP_SCALE enlarges the map on
// screen while keeping the grid (MAP_W x MAP_H) and paths identical: every
// pixel-based logic value (tile size, speeds, ranges) is multiplied by it.
const BASE_TILE = 15;
const TILE_H = 30;
const TILE_W = 30;
const MAP_SCALE = TILE_W / BASE_TILE;
const TILE_EPSILON = 1e-9;
const MINION_SIZE = 35; // sprite and HP bar width of regular enemies, in px
const BOSS_SIZE = 60;
const MAP_H = 23;
const MAP_W = 60;
// Scale of the buttons, shop, status bar and info panels
const HUD_SCALE = 1.5;
// Unscaled HUD size in px: strip below the map (gap + content + margin) and
// panel column right of the map (gap + .character-info box + margin)
const HUD_STRIP_HEIGHT = 210;
const HUD_PANEL_WIDTH = 264;
// Expose the sizes to board.css
document.documentElement.style.setProperty("--hud-scale", HUD_SCALE);
document.documentElement.style.setProperty("--map-width", MAP_W * TILE_W + "px");
document.documentElement.style.setProperty("--map-height", MAP_H * TILE_H + "px");
const MAX_TURRET_LEVEL = 8;
const HOTKEY_TURRET_COUNT = 9; // keys 1..N buy the Nth shop turret
const TURRET_OFFSET = 148;
const TURRET_GAP = 5;
const TURRET_D = 40;
// Offset from a placed turret's position (tile top-left) to its center
const TURRET_CENTER = TILE_W / 2;
const SHOOT_COOLDOWN = 30;
const STORM_OVERHEAT_MAX = 200;
const STORM_OVERHEAT_PER_SHOT = 1;
const STORM_OVERHEATED_COOL_MULT = 2; // overheated cooling is this many times slower than idle cooling
const ARCHERY_CRIT_CHANCE = 35;
const MISSILE_CRIT_CHANCE = 20;
const LASER_CRIT_CHANCE = 30;
// Blizzard - Snow King branch: freezes stack on the enemy; at BLIZZARD_STUN_STACKS it is stunned for BLIZZARD_STUN_DURATION ticks
const BLIZZARD_STUN_STACKS = 5;
const BLIZZARD_STUN_DURATION = 100;
// Flamethrower - Firestorm branch: Burning removes BURN_HP_PCT % of the enemy's max HP
// after BURN_DURATION ticks (100 ticks = 1 s); BURN_WEAK_HP_PCT % on enemies weak to the flamethrower
const BURN_DURATION = 500;
const BURN_HP_PCT = 5;
const BURN_WEAK_HP_PCT = 10;
// Toxic branches: Corrosive poison damage multiplier (base at level 5, plus per level above it); Contamination spread radius
const CORROSIVE_POISON_BASE_MULT = 2;
const CORROSIVE_POISON_PER_LEVEL = 0.75;
const TOXIC_SPREAD_RADIUS_TILES = 3;
// Storm Cannon - Chaotic Tempest branch: damage bonus (1 = +100%) applied when the branch is picked
const STORM_TEMPEST_DAMAGE_BONUS = 30;
// Missile Turret: ammo cost and reload time (ticks) of a bought missile
const MISSILE_AMMO_COST = 50;
const MISSILE_RELOAD_TICKS = 500;
// Missile - Auto Reload branch: faster reload and bigger magazine (multiplier over the level's max ammo)
const AUTO_RELOAD_TICKS = 250;
const AUTO_RELOAD_AMMO_MULT = 1.5;
// Missile - Heavy Payload branch: explosion radius (tiles, +10% per level above 5) and damage multiplier of the main target
const HEAVY_PAYLOAD_RADIUS_TILES = 2.5;
const HEAVY_PAYLOAD_MAIN_MULT = 2;
// Rail Cannon branches: share of the normal per-level cooldown improvement kept after level 5, and the fixed Annihilator stun (ticks)
const RAIL_PULVERIZER_COOLDOWN_IMPROVE = 0.8;
const RAIL_ANNIHILATOR_COOLDOWN_IMPROVE = 0.15;
const RAIL_ANNIHILATOR_STUN = 400;
// Archery - Hawkeye branch: every arrow crits; range is cut by this share once, when the branch is picked
const HAWKEYE_CRIT_CHANCE = 100;
const HAWKEYE_RANGE_PENALTY = 0.2;
// Archery - Advanced Crossbow branch: multiplier over the shot cooldown (below 1 = faster)
const CROSSBOW_COOLDOWN_MULT = 0.7;
const SNIPER_CRIT_CHANCE = 10; // Machine Gun - Sniper branch
const MIN_SPAWN_INTERVAL = 40;
const MAX_SPAWN_INTERVAL = 160;
const BOSS_LIVES_COST = 5;
const CRIT_POPUP_THROTTLE_MS = 300;

// move direction
const MOVE_N = 1;
const MOVE_S = -1;
const MOVE_E = 2;
const MOVE_W = -2;
const MOVE_END = -99;