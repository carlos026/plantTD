import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import GameScene from './scenes/GameScene.js';
import { GAME_NATIVE_WIDTH, GAME_NATIVE_HEIGHT } from './data/constants.js';

const config = {
    type: Phaser.AUTO,
    width: GAME_NATIVE_WIDTH,
    height: GAME_NATIVE_HEIGHT,
    backgroundColor: '#0d0d1a',
    parent: 'game-container',
    scene: [BootScene, GameScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_NATIVE_WIDTH,
        height: GAME_NATIVE_HEIGHT,
    },
    audio: {
        disableWebAudio: false,
    },
};

new Phaser.Game(config);