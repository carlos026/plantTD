import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        this._createLoadingBar();

        // Turret images
        this.load.image('tw-machinegun',  'img/tw/tower0.png');
        this.load.image('tw-laser',       'img/tw/tower1.png');
        this.load.image('tw-flamethrower','img/tw/tower2.png');
        this.load.image('tw-blizzard',    'img/tw/tower3.png');
        this.load.image('tw-toxic',       'img/tw/Toxic.png');
        this.load.image('tw-stormCannon', 'img/tw/tower4.png');
        this.load.image('tw-railCannon',  'img/tw/tower5.png');
        this.load.image('tw-missile',     'img/tw/missile.png');
        this.load.image('tw-missileShot', 'img/tw/missileShot.png');

        // Minion images (4-directional sprites)
        this.load.image('min-down',  'img/min-lv1/min-down.png');
        this.load.image('min-up',    'img/min-lv1/min-up.png');
        this.load.image('min-left',  'img/min-lv1/min-left.png');
        this.load.image('min-right', 'img/min-lv1/min-right.png');

        this.load.image('boss-down',  'img/min-lv1/boss-down.png');
        this.load.image('boss-up',    'img/min-lv1/boss-up.png');
        this.load.image('boss-left',  'img/min-lv1/boss-left.png');
        this.load.image('boss-right', 'img/min-lv1/boss-right.png');

        // Plane images
        this.load.image('pla-down',  'img/pla-lv2/pla-down.png');
        this.load.image('pla-up',    'img/pla-lv2/pla-up.png');
        this.load.image('pla-left',  'img/pla-lv2/pla-left.png');
        this.load.image('pla-right', 'img/pla-lv2/pla-right.png');

        this.load.image('pla-boss-down',  'img/pla-lv2/pla-boss-down.png');
        this.load.image('pla-boss-up',    'img/pla-lv2/pla-boss-up.png');
        this.load.image('pla-boss-left',  'img/pla-lv2/pla-boss-left.png');
        this.load.image('pla-boss-right', 'img/pla-lv2/pla-boss-right.png');

        // Audio
        this.load.audio('music-map1',       'sound/map1Soundtrack.mp3');
        this.load.audio('sfx-machinegun',    'sound/MachineGun.wav');
        this.load.audio('sfx-machinegun-l',  'sound/MachineGun_laud.wav');
        this.load.audio('sfx-laser',         'sound/Laser.wav');
        this.load.audio('sfx-flamethrower',  'sound/Flamethrower.wav');
        this.load.audio('sfx-blizzard',      'sound/Blizzard.wav');
        this.load.audio('sfx-toxic',         'sound/Toxic.wav');
        this.load.audio('sfx-stormCannon',   'sound/StormCannon.wav');
        this.load.audio('sfx-railCannon',    'sound/RailCannon.wav');
        this.load.audio('sfx-missileLaunch', 'sound/missileLaunch.mp3');
        this.load.audio('sfx-missileImpact', 'sound/missileImpact.mp3');
    }

    create() {
        this.scene.start('GameScene', { mapId: 1 });
    }

    _createLoadingBar() {
        const { width, height } = this.scale;
        const cx = width / 2;
        const cy = height / 2;

        const barW = 400;
        const barH = 20;

        const bg = this.add.graphics();
        bg.fillStyle(0x111111, 1);
        bg.fillRect(cx - barW / 2 - 2, cy - barH / 2 - 2, barW + 4, barH + 4);

        const bar = this.add.graphics();

        this.load.on('progress', (value) => {
            bar.clear();
            bar.fillStyle(0x4cc9f0, 1);
            bar.fillRect(cx - barW / 2, cy - barH / 2, barW * value, barH);
        });

        this.add.text(cx, cy - 40, 'Loading...', {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '20px',
            color: '#ffffff',
        }).setOrigin(0.5);
    }
}