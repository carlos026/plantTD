// Difficulty levels, chosen before each map starts and locked while it is played.
// hpMult/speedMult scale every enemy (minions, planes, special enemies and bosses);
// scoreMult scales boss kills and the map-completion bonus; killsPerPoint/pointsPerKill
// set the score of a regular kill; enemiesMin/Max is the random enemy count per wave.
var DIFFICULTIES = {
	easy:   { name: "Easy",   hpMult: 0.75, speedMult: 0.75, scoreMult: 0.5, killsPerPoint: 2, pointsPerKill: 1, enemiesMin: 8,  enemiesMax: 12 },
	normal: { name: "Normal", hpMult: 1,    speedMult: 1,    scoreMult: 1,   killsPerPoint: 1, pointsPerKill: 1, enemiesMin: 12, enemiesMax: 16 },
	hard:   { name: "Hard",   hpMult: 1.25, speedMult: 1.25, scoreMult: 2,   killsPerPoint: 1, pointsPerKill: 2, enemiesMin: 15, enemiesMax: 20 }
};
// Largest enemy count of any difficulty (number of minion elements created per map)
var MAX_WAVE_ENEMIES = 20;

var currentDifficulty = "normal";
var difficultyKillCount = 0; // regular kills not yet turned into score (Easy)

function getDifficulty() {
	return DIFFICULTIES[currentDifficulty];
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
