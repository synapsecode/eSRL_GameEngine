export default {
    id: "VectorVoyage",

    init(helpers) {
        helpers.state.player = null;
        helpers.state.paths = [];
        helpers.state.nodes = [];
        helpers.state.score = 0;
        helpers.state.multiplier = 1;
        helpers.state.holding = false;
        helpers.state.gameOver = false;

        // difficulty
        helpers.state.level = 1;
        helpers.state.requiredAlignment = 0.15; // radians tolerance
        helpers.state.pathGlowTime = 300;
    },

    loadAssets(loader) { }, // no assets needed

    create(scene, helpers) {
        const W = 800, H = 600;

        // Coordinate-grid background
        this.drawGrid(scene, W, H);

        // Player vector
        helpers.state.player = {
            x: 80,
            y: H - 80,
            angle: -Math.PI / 4, // up-right
            mag: 2,
            trailPoints: []
        };

        // Generate first level
        this.spawnLevel(scene, helpers);

        // Input handlers
        scene.input.on("pointerdown", () => { helpers.state.holding = true; });
        scene.input.on("pointerup", () => { helpers.state.holding = false; });

        this.playerGraphics = scene.add.graphics();
        this.pathGraphics = scene.add.graphics();
        this.nodeGraphics = scene.add.graphics();
    },

    update(scene, helpers, dt) {
        if (helpers.state.gameOver) return;

        const p = helpers.state.player;

        // TAP = small right rotation (only if pointer has just been pressed this frame)
        if (scene.input.activePointer.justDown) {
            p.angle += 0.08; // slight right turn
        }

        // HOLD = increase magnitude
        if (helpers.state.holding) p.mag = Math.min(p.mag + 0.02, 8);

        // RELEASE = maintain speed (do nothing)

        // Move vector
        p.x += Math.cos(p.angle) * p.mag;
        p.y += Math.sin(p.angle) * p.mag;

        // Record trail
        p.trailPoints.push({ x: p.x, y: p.y });
        if (p.trailPoints.length > 50) p.trailPoints.shift();

        // Draw everything
        this.render(scene, helpers);

        // Check collisions
        if (this.checkEdgeCollision(p, scene)) {
            return this.fail(scene, helpers);
        }

        // Check path alignment
        this.checkPathAdherence(scene, helpers, p);
    },

    // ================================================================
    // ---------------------   RENDERING  -----------------------------
    // ================================================================
    render(scene, helpers) {
        const p = helpers.state.player;

        // Draw paths
        this.pathGraphics.clear();
        helpers.state.paths.forEach(path => {
            this.pathGraphics.lineStyle(4, path.glow ? 0x99ff99 : 0x008800);
            this.pathGraphics.beginPath();
            this.pathGraphics.moveTo(path.x1, path.y1);
            this.pathGraphics.lineTo(path.x2, path.y2);
            this.pathGraphics.stroke();
        });

        // Draw nodes
        this.nodeGraphics.clear();
        helpers.state.nodes.forEach(node => {
            this.nodeGraphics.fillStyle(node.activated ? 0xffee55 : 0xaaaa33);
            this.nodeGraphics.fillCircle(node.x, node.y, 6);
        });

        // Draw player vector
        this.playerGraphics.clear();
        const arrowLen = 30 + p.mag * 6;

        this.playerGraphics.lineStyle(3, 0x3399ff);
        this.playerGraphics.beginPath();
        this.playerGraphics.moveTo(p.x, p.y);
        this.playerGraphics.lineTo(
            p.x + Math.cos(p.angle) * arrowLen,
            p.y + Math.sin(p.angle) * arrowLen
        );
        this.playerGraphics.stroke();

        // Arrow head
        this.playerGraphics.fillStyle(0x3399ff);
        this.playerGraphics.fillTriangle(
            p.x + Math.cos(p.angle) * (arrowLen + 8),
            p.y + Math.sin(p.angle) * (arrowLen + 8),
            p.x + Math.cos(p.angle + 0.4) * (arrowLen - 5),
            p.y + Math.sin(p.angle + 0.4) * (arrowLen - 5),
            p.x + Math.cos(p.angle - 0.4) * (arrowLen - 5),
            p.y + Math.sin(p.angle - 0.4) * (arrowLen - 5)
        );

        // Trail glow
        this.playerGraphics.lineStyle(2, 0x77ccff, 0.3);
        for (let i = 1; i < p.trailPoints.length; i++) {
            const a = p.trailPoints[i - 1];
            const b = p.trailPoints[i];
            this.playerGraphics.beginPath();
            this.playerGraphics.moveTo(a.x, a.y);
            this.playerGraphics.lineTo(b.x, b.y);
            this.playerGraphics.stroke();
        }
    },

    // ================================================================
    // --------------------   LEVEL GENERATION  -----------------------
    // ================================================================
    spawnLevel(scene, helpers) {
        const W = 800, H = 600;

        helpers.state.paths = [];
        helpers.state.nodes = [];

        const level = helpers.state.level;
        const segments = 3 + level; // increasing complexity

        let x = 80, y = 520;
        for (let i = 0; i < segments; i++) {
            const len = 120 + Math.random() * 80;
            const angle = -Math.PI / 4 + (Math.random() * 0.4 - 0.2);

            const x2 = x + Math.cos(angle) * len;
            const y2 = y + Math.sin(angle) * len;

            helpers.state.paths.push({
                x1: x,
                y1: y,
                x2,
                y2,
                angle,
                glow: false
            });

            // intersection node
            helpers.state.nodes.push({
                x: x2,
                y: y2,
                activated: false
            });

            x = x2;
            y = y2;
        }
    },

    // ================================================================
    // ------------------   PATH ADHERENCE CHECK   --------------------
    // ================================================================
    checkPathAdherence(scene, helpers, p) {
        const tolerance = helpers.state.requiredAlignment;

        helpers.state.paths.forEach(path => {
            const dist = Phaser.Math.Distance.Between(p.x, p.y, path.x2, path.y2);
            const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(p.angle - path.angle));

            if (dist < 30 && angleDiff < tolerance) {
                path.glow = true;
                setTimeout(() => (path.glow = false), helpers.state.pathGlowTime);

                helpers.state.score += 10 * helpers.state.multiplier;
            }
        });

        helpers.state.nodes.forEach(node => {
            const dist = Phaser.Math.Distance.Between(p.x, p.y, node.x, node.y);
            if (dist < 20 && !node.activated) {
                node.activated = true;
                helpers.state.multiplier++;
            }
        });
    },

    // ================================================================
    // ---------------------   FAIL / SUCCESS   -----------------------
    // ================================================================
    checkEdgeCollision(p, scene) {
        return p.x < 0 || p.x > 800 || p.y < 0 || p.y > 600;
    },

    fail(scene, helpers) {
        helpers.state.gameOver = true;
        const overlay = scene.add.rectangle(400, 300, 800, 600, 0xff0000, 0.25);
        scene.add.text(280, 280, "GAME OVER", { font: "48px Arial", fill: "#ff4444" });
    },

    // ================================================================
    // ------------------------   UTILITIES   -------------------------
    // ================================================================
    drawGrid(scene, W, H) {
        const g = scene.add.graphics();
        g.lineStyle(1, 0x333333);

        for (let x = 0; x <= W; x += 40) {
            g.beginPath();
            g.moveTo(x, 0);
            g.lineTo(x, H);
            g.stroke();
        }
        for (let y = 0; y <= H; y += 40) {
            g.beginPath();
            g.moveTo(0, y);
            g.lineTo(W, y);
            g.stroke();
        }
    }
};
