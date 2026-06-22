import Phaser from 'phaser';

/**
 * Manages wave state: spawning, timing, wave completion, rewards.
 *
 * Emits events on scene.events:
 *   'wave-started'   { wave }
 *   'wave-complete'  { wave }
 *   'minion-killed'  { minion, reward }
 *   'minion-escaped' { minion }
 *   'game-over'      {}
 */
export default class WaveSystem {
    constructor(scene, minionSystem, gameState) {
        this.scene = scene;
        this.minionSystem = minionSystem;
        this.gameState = gameState;

        this._waveActive = false;
        this._killed = 0;
        this._escaped = 0;
        this._waveTarget = 0;   // how many minions this wave
        this._isBoss = false;
        this._spawnedCount = 0;
        this._spawnQueue = [];  // list of minion configs to spawn
        this._spawnInterval = 100; // ticks between spawns
        this._spawnTick = 0;
    }

    // -------------------------------------------------------------------------
    // Start a new wave
    // -------------------------------------------------------------------------

    startWave() {
        if (this._waveActive) return;
        this.gameState.wave++;
        this._waveActive = true;
        this._killed = 0;
        this._escaped = 0;
        this._spawnedCount = 0;
        this._spawnTick = 0;

        const wave = this.gameState.wave;
        this._isBoss = wave % 10 === 0;

        if (this._isBoss) {
            this._waveTarget = 1;
            this._spawnQueue = [{
                maxHp: this._bossHp(wave),
                isPlane: false,
                isBoss: true,
                releaseDelay: 0,
            }];
        } else {
            this._waveTarget = wave < 10 ? 12 : Phaser.Math.Between(10, 16);
            this._spawnQueue = [];
            for (let i = 0; i < this._waveTarget; i++) {
                const usePlane = wave >= 11 && Math.random() < 0.5;
                this._spawnQueue.push({
                    maxHp: this._minionHp(wave),
                    isPlane: usePlane,
                    isBoss: false,
                    releaseDelay: i * this._spawnInterval,
                });
            }
        }

        // Spawn all with staggered release delays
        this._spawnQueue.forEach((cfg) => this.minionSystem.spawn(cfg));
        this._spawnedCount = this._spawnQueue.length;

        this.scene.events.emit('wave-started', { wave });
    }

    // -------------------------------------------------------------------------
    // Per-tick: check minion status, detect wave completion
    // -------------------------------------------------------------------------

    tick() {
        if (!this._waveActive) return;

        const minions = this.minionSystem.minions;

        for (const m of minions) {
            if (!m.alive && !m._waveProcessed) {
                m._waveProcessed = true;
                if (m.escaped) {
                    this._escaped++;
                    this._killed++; // counts toward wave total
                    this.gameState.lives--;
                    this.scene.events.emit('minion-escaped', { minion: m });
                    if (this.gameState.lives <= 0) {
                        this._waveActive = false;
                        this.scene.events.emit('game-over');
                        return;
                    }
                } else {
                    // Killed by turrets
                    const reward = this._isBoss
                        ? this._bossReward(this.gameState.wave)
                        : this._minionReward(this.gameState.wave);
                    this._killed++;
                    this.gameState.cash += reward;
                    this.scene.events.emit('minion-killed', { minion: m, reward });
                }
            }
        }

        // Check wave completion
        const allProcessed = this._killed >= this._waveTarget;
        const noneAlive = !this.minionSystem.hasAlive();

        if (allProcessed && noneAlive) {
            this._waveActive = false;
            this.scene.events.emit('wave-complete', { wave: this.gameState.wave });
        }
    }

    isWaveActive() {
        return this._waveActive;
    }

    isBossWave() {
        return this._isBoss;
    }

    // -------------------------------------------------------------------------
    // HP formulas (ported from original minionhp() / bossHp())
    // -------------------------------------------------------------------------

    _minionHp(wave) {
        let hp = 64 + Math.pow(2, wave + 4);
        if (wave > 5)  hp = Math.pow(2, wave + 2) * 1.3;
        if (wave > 10) hp = Math.pow(2, wave);
        if (wave > 15) hp = Math.pow(2, wave) * 0.60;
        if (wave > 17) hp = Math.pow(2, wave) * 0.40;
        return Math.round(hp);
    }

    _bossHp(wave) {
        return wave === 20
            ? Math.pow(2, wave)
            : Math.pow(2, wave) * 10;
    }

    // -------------------------------------------------------------------------
    // Reward formulas (ported from minionreward() / bossReward())
    // -------------------------------------------------------------------------

    _minionReward(wave) {
        return Math.pow(wave + 1, 2);
    }

    _bossReward(wave) {
        return Math.pow(wave + 1, 3);
    }
}
