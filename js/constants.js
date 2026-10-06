// constants
const TILE_H = 15;
const TILE_W = 15;
const MAP_H = 30;
const MAP_W = 80;
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