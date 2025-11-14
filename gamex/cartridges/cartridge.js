
export default {
  id: "DerivaDash",

  init(helpers) {
    helpers.state = {
      playerPosition: { x: 0, y: 300 },
      playerSlope: 0,
      score: 0,
      gameOver: false,
    };
  },

  loadAssets(loader) {
    // No external assets needed
  },

  create(scene, helpers) {
    // Function curve as a visual guide
    const curveGraphics = scene.add.graphics();

    // Player object
    const player = scene.add.circle(helpers.state.playerPosition.x, helpers.state.playerPosition.y, 10, 0x00ff00);
    player.setStrokeStyle(2, 0xffffff);

    // Tangent line representing the derivative
    const tangentLine = scene.add.line(0, 0, 0, 0, 100, 0, 0xffa500).setOrigin(0, 0.5);

    // Secondary game element indicating upcoming curve changes
    const indicator = scene.add.triangle(800, 300, 0, -10, 10, 10, -10, 10, 0xffff00).setScale(0.5);

    // Visual feedback for correct alignment
    const visualFeedback = scene.add.circle(helpers.state.playerPosition.x, helpers.state.playerPosition.y, 15, 0xffffff, 0.1);

    // Score text
    this.scoreText = scene.add.text(16, 16, 'Score: 0', {
      font: '24px Arial',
      color: '#ffffff'
    });

    // Input handling
    const cursors = scene.input.keyboard.createCursorKeys();

    this.updateTangent = (x) => {
      const slope = Math.sin(x / 50); // Example slope function
      tangentLine.setTo(player.x, player.y, player.x + 50, player.y + slope * 50);
      helpers.state.playerSlope = slope;
    };

    this.updatePlayerPosition = (delta) => {
      if (helpers.state.gameOver) return;
      player.x += delta * 0.05;
      helpers.state.playerPosition.x = player.x;
      this.updateTangent(player.x);

      if (cursors.up.isDown) {
        player.y -= 2;
      } else if (cursors.down.isDown) {
        player.y += 2;
      }

      if (Math.abs(player.y - (300 + helpers.state.playerSlope * player.x)) < 5) {
        visualFeedback.setFillStyle(0x00ff00, 0.2);
        helpers.state.score += 1;
      } else {
        visualFeedback.setFillStyle(0xff0000, 0.2);
        helpers.state.score = Math.max(0, helpers.state.score - 1);
      }

      this.scoreText.setText(`Score: ${helpers.state.score}`);

      // Game over condition
      if (player.x >= 800) {
        helpers.state.gameOver = true;
        scene.add.text(400, 300, 'GAME OVER', { font: '64px Arial', color: '#ff0000' }).setOrigin(0.5);
        scene.time.delayedCall(2000, () => {
          helpers.switchCartridge(this);
        });
      }
    };

    scene.time.addEvent({
      delay: 1000,
      callback: () => {
        indicator.x = (indicator.x - 50) < 0 ? 800 : indicator.x - 50;
      },
      loop: true
    });
  },

  update(scene, helpers, delta) {
    this.updatePlayerPosition(delta);
  }
};