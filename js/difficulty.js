// Difficulty levels, chosen before each map starts and locked while it is played.
// hpMult/speedMult scale every enemy (minions, planes, special enemies and bosses);
// scoreMult scales boss kills and the map-completion bonus; killsPerPoint/pointsPerKill
// set the score of a regular kill; enemiesMin/Max is the random enemy count per wave;
// seedReward is the Golden Seeds earned on map completion.
// Very Hard and Endless must be unlocked in Progression (see UnlockCatalog.getDifficulties).
// Endless: Normal stats with no last wave; see endlessTier() and the ENDLESS_* constants.
var DIFFICULTIES = {
	easy:     { name: "Easy",      hpMult: 0.75, speedMult: 0.75, scoreMult: 0.5, killsPerPoint: 2, pointsPerKill: 1, enemiesMin: 8,  enemiesMax: 12, seedReward: 1 },
	normal:   { name: "Normal",    hpMult: 1,    speedMult: 1,    scoreMult: 1,   killsPerPoint: 1, pointsPerKill: 1, enemiesMin: 12, enemiesMax: 16, seedReward: 1 },
	hard:     { name: "Hard",      hpMult: 1.25, speedMult: 1.25, scoreMult: 2,   killsPerPoint: 1, pointsPerKill: 2, enemiesMin: 15, enemiesMax: 20, seedReward: 1 },
	veryHard: { name: "Very Hard", hpMult: 1.5,  speedMult: 1.35, scoreMult: 2.5, killsPerPoint: 2, pointsPerKill: 5, enemiesMin: 20, enemiesMax: 25, seedReward: 2 },
	endless:  { name: "Endless",   hpMult: 1,    speedMult: 1,    scoreMult: 1.5,   killsPerPoint: 1, pointsPerKill: 1, enemiesMin: 12, enemiesMax: 16, seedReward: 0, endless: true }
};
// Largest enemy count of any difficulty (number of minion elements created per map)
var MAX_WAVE_ENEMIES = 25;

var currentDifficulty = "normal";
var difficultyKillCount = 0; // regular kills not yet turned into score (Easy)

function getDifficulty() {
	return DIFFICULTIES[currentDifficulty];
}

// Endless mode: every ENDLESS_TIER_WAVES waves enemies gain +10% HP and +5% speed,
// random special enemies appear from ENDLESS_SPECIAL_WAVE, every ENDLESS_BOSS_WAVES a random
// map boss spawns, and from ENDLESS_SEED_START_WAVE every boss wave (each 10 waves) defeated
// has an ENDLESS_SEED_CHANCE of granting a Golden Seed
var ENDLESS_TIER_WAVES = 10;
var ENDLESS_TIER_HP = 0.10;
var ENDLESS_TIER_SPEED = 0.05;
var ENDLESS_SPECIAL_WAVE = 20;
var ENDLESS_BOSS_WAVES = 30;
var ENDLESS_SEED_START_WAVE = 30;
var ENDLESS_SEED_CHANCE = 0.5;

function isEndlessMode() {
	return !!getDifficulty().endless;
}

// 0 for waves 1-10, 1 for waves 11-20, ...
function endlessTier() {
	if (!isEndlessMode()) return 0;
	return Math.max(0, Math.floor((currentWave - 1) / ENDLESS_TIER_WAVES));
}

// Difficulty HP/speed multipliers, including the Endless tier bonus
function enemyHpMult() {
	return getDifficulty().hpMult * (1 + ENDLESS_TIER_HP * endlessTier());
}

function enemySpeedMult() {
	return getDifficulty().speedMult * (1 + ENDLESS_TIER_SPEED * endlessTier());
}

function setDifficulty(id) {
	currentDifficulty = DIFFICULTIES[id] ? id : "normal";
	difficultyKillCount = 0;
}

function randomWaveEnemyCount() {
	var d = getDifficulty();
	return d.enemiesMin + Math.floor(Math.random() * (d.enemiesMax - d.enemiesMin + 1));
}

// Score earned for killing a regular (non-boss) enemy
function regularKillScore() {
	var d = getDifficulty();
	difficultyKillCount++;
	if (difficultyKillCount < d.killsPerPoint) return 0;
	difficultyKillCount = 0;
	return d.pointsPerKill;
}

// Scales a boss-kill or map-completion score by the difficulty
function difficultyScore(points) {
	return Math.round(points * getDifficulty().scoreMult);
}
