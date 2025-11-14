export default class GameEngine {
    constructor(config) {
        this.config = config;
        this.cartridge = config.cartridge;
        this.eventBus = new Phaser.Events.EventEmitter();

        this.helpers = {
            events: this.eventBus,
            state: {},

            switchCartridge: (newCart) => {
                this.cartridge = newCart;
                this.phaser.scene.stop("MainScene");
                this.start();
            }
        };
    }

    start() {
        this.phaser = new Phaser.Game({
            type: Phaser.AUTO,
            width: this.config.width,
            height: this.config.height,
            parent: this.config.parent,
            physics: { default: "arcade" },
            scene: {
                preload: this._preload.bind(this),
                create: this._create.bind(this),
                update: this._update.bind(this)
            }
        });
    }

    _preload() {
        if (this.cartridge.loadAssets) {
            this.cartridge.loadAssets(this.phaser.scene.scenes[0].load);
        }
    }

    _create() {
        if (this.cartridge.init) {
            this.cartridge.init(this.helpers);
        }
        if (this.cartridge.create) {
            this.cartridge.create(this.phaser.scene.scenes[0], this.helpers);
        }
    }

    _update(time, delta) {
        if (this.cartridge.update) {
            this.cartridge.update(this.phaser.scene.scenes[0], this.helpers, delta);
        }
    }
}
