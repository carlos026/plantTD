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
const TURRET_OFFSET = 148;
const TURRET_GAP = 5;
const TURRET_D = 40;
const SHOOT_COOLDOWN = 30;
const STORM_OVERHEAT_MAX = 200;
const STORM_OVERHEAT_PER_SHOT = 1;
const STORM_OVERHEATED_COOL_MULT = 2; // overheated cooling is this many times slower than idle cooling
const ARCHERY_CRIT_CHANCE = 35;
const MISSILE_CRIT_CHANCE = 20;
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