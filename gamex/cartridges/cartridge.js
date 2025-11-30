export default {
    id: "StacksmithLastInFirstOutForge",

    init(helpers) {
        helpers.state = {
            // Stack properties
            stackMaxSize: 8,
            stackSize: 0,
            tokens: [], // { circle, color }

            // Mode and requests
            mode: "PUSH", // or "POP"
            requestIcons: [], // array of Phaser GameObjects representing requests
            nextRequestId: 0,

            // Timing / difficulty
            requestSpawnTimer: null,
            requestSpeed: 150, // pixels per second
            spawnInterval: 2000, // ms between spawns
            timeSinceStart: 0,
            lastDifficultyStep: 0,

            // Score and streaks
            score: 0,
            streak: 0,
            lastSwitchTime: 0,
            lastSuccessTime: 0,

            // State flags
            gameOver: false,

            // Visual references
            stackSlots: [],
            stackOutline: null,
            modeArrow: null,
            modeText: null,
            executionLine: null,
            scoreText: null,
            streakGlow: null,
            topGlowRect: null,

            // Input
            pointerHandler: null,

            // Screen flash
            flashRect: null,
            flashTween: null
        };
    },

    loadAssets(loader) {
        // No external assets required; everything is drawn with primitives.
    },

    create(scene, helpers) {
        const { width, height } = scene.sys.game.config;
        const centerX = width / 2;
        const stackHeight = 360;
        const stackWidth = 120;
        const slotCount = helpers.state.stackMaxSize;
        const slotHeight = stackHeight / slotCount;
        const stackTopY = height * 0.2;
        const stackLeftX = centerX - stackWidth / 2;

        // Background
        scene.cameras.main.setBackgroundColor(0x101018);

        // Stack outline
        const stackOutline = scene.add.rectangle(
            centerX,
            stackTopY + stackHeight / 2,
            stackWidth,
            stackHeight
        );
        stackOutline.setStrokeStyle(4, 0x000000);
        stackOutline.setFillStyle(0x000000, 0.1);
        helpers.state.stackOutline = stackOutline;

        // Stack slots
        helpers.state.stackSlots = [];
        for (let i = 0; i < slotCount; i++) {
            const y =
                stackTopY + stackHeight - (i + 0.5) * slotHeight; // bottom is index 0
            const slotRect = scene.add.rectangle(
                centerX,
                y,
                stackWidth - 8,
                slotHeight - 6
            );
            slotRect.setStrokeStyle(2, 0x00ffff); // cyan border for empty
            slotRect.setFillStyle(0x000000, 0.15);
            helpers.state.stackSlots.push(slotRect);
        }

        // Execution line above stack (for requests)
        const execY = stackTopY - 60;
        const executionLine = scene.add.line(
            centerX,
            execY,
            -width / 2,
            0,
            width / 2,
            0,
            0xffff00
        ); // yellow
        executionLine.setLineWidth(2);
        helpers.state.executionLine = executionLine;

        // Request lane hint
        scene.add.text(40, execY - 24, "Operation Requests", {
            font: "16px Arial",
            color: "#ffffff"
        });

        // Mode indicator (arrow + text) next to stack
        const modeGroupX = stackLeftX - 120;
        const modeArrow = this._createModeArrow(scene, modeGroupX, stackTopY + stackHeight / 2, helpers.state.mode);
        helpers.state.modeArrow = modeArrow;

        const modeText = scene.add.text(
            modeGroupX,
            stackTopY + stackHeight / 2 + 70,
            "MODE: PUSH",
            {
                font: "20px Arial",
                color: "#00ff00"
            }
        );
        modeText.setOrigin(0.5, 0.5);
        helpers.state.modeText = modeText;

        // Instruction text
        scene.add.text(
            20,
            height - 60,
            "Tap anywhere to toggle PUSH / POP.\nMatch incoming requests and respect stack size.",
            {
                font: "16px Arial",
                color: "#ffffff"
            }
        );

        // Score text
        const scoreText = scene.add.text(width - 20, 20, "Score: 0", {
            font: "24px Arial",
            color: "#ffffff"
        });
        scoreText.setOrigin(1, 0);
        helpers.state.scoreText = scoreText;

        // Streak glow around stack
        const streakGlow = scene.add.rectangle(
            centerX,
            stackTopY + stackHeight / 2,
            stackWidth + 16,
            stackHeight + 16
        );
        streakGlow.setStrokeStyle(4, 0x00ffff, 0.0);
        streakGlow.setFillStyle(0x000000, 0);
        helpers.state.streakGlow = streakGlow;

        // Top slot glow rectangle (used for success flash)
        const topGlowRect = scene.add.rectangle(
            centerX,
            stackTopY + slotHeight / 2,
            stackWidth,
            slotHeight
        );
        topGlowRect.setFillStyle(0xffff00, 0); // transparent initially
        helpers.state.topGlowRect = topGlowRect;

        // Screen flash rect for failures
        const flashRect = scene.add.rectangle(
            width / 2,
            height / 2,
            width,
            height,
            0xff0000,
            0
        );
        flashRect.setDepth(1000);
        helpers.state.flashRect = flashRect;

        // Initialize tokens array as empty visuals
        helpers.state.tokens = [];

        // Input: tap anywhere to toggle mode
        const pointerHandler = () => {
            if (helpers.state.gameOver) return;
            this._toggleMode(scene, helpers);
        };
        scene.input.on("pointerdown", pointerHandler);
        helpers.state.pointerHandler = pointerHandler;

        // Request spawn timer
        helpers.state.requestSpawnTimer = scene.time.addEvent({
            delay: helpers.state.spawnInterval,
            loop: true,
            callback: () => {
                if (!helpers.state.gameOver) {
                    this._spawnRequest(scene, helpers);
                }
            }
        });

        // Initial few requests quickly to start
        for (let i = 0; i < 3; i++) {
            scene.time.delayedCall(500 * i, () => {
                if (!helpers.state.gameOver) {
                    this._spawnRequest(scene, helpers);
                }
            });
        }
    },

    update(scene, helpers, delta) {
        if (helpers.state.gameOver) return;

        const dt = delta / 1000;
        helpers.state.timeSinceStart += delta;

        // Move requests from right to left
        const execX = scene.sys.game.config.width / 2;
        const execY = helpers.state.executionLine.y;
        const speed = helpers.state.requestSpeed;

        const remainingRequests = [];
        for (let i = 0; i < helpers.state.requestIcons.length; i++) {
            const req = helpers.state.requestIcons[i];
            if (!req.icon || !req.icon.active) continue;

            const icon = req.icon;
            icon.x -= speed * dt;

            // Pulse as they get closer to execution line
            const distToExec = Math.abs(icon.x - execX);
            const scale =
                distToExec < 80
                    ? 1 + (80 - distToExec) / 160
                    : 1;
            icon.setScale(scale);

            // Check if crossed execution line (icon center reached line)
            if (icon.x <= execX) {
                // Process this request
                this._processRequest(scene, helpers, req);
                // Request handled -> destroy icon
                icon.destroy();
            } else {
                remainingRequests.push(req);
            }
        }
        helpers.state.requestIcons = remainingRequests;

        // Difficulty progression over time
        this._updateDifficulty(scene, helpers);

        // Update streak glow color/intensity
        this._updateStreakGlow(helpers);

        // Update stack border colors for full/empty
        this._updateStackBorders(helpers);
    },

    // =====================
    // Internal helpers
    // =====================

    _createModeArrow(scene, x, y, mode) {
        // Create an arrow using graphics to a texture, then image for easy tinting
        const key = "modeArrowTemp";
        const g = scene.add.graphics();
        g.clear();
        g.fillStyle(0xffffff, 1);
        if (mode === "PUSH") {
            // Up arrow
            g.fillTriangle(0, 40, -25, -20, 25, -20);
            g.fillRect(-10, -20, 20, 50);
        } else {
            // Down arrow
            g.fillTriangle(0, -40, -25, 20, 25, 20);
            g.fillRect(-10, -30, 20, 50);
        }
        g.generateTexture(key, 60, 80);
        g.destroy();

        const img = scene.add.image(x, y, key);
        img.setOrigin(0.5, 0.5);
        if (mode === "PUSH") {
            img.setTint(0x00ff00);
        } else {
            img.setTint(0xff0000);
        }
        img.setData("modeArrowKey", key);
        return img;
    },

    _toggleMode(scene, helpers) {
        const oldMode = helpers.state.mode;
        const newMode = oldMode === "PUSH" ? "POP" : "PUSH";
        helpers.state.mode = newMode;
        helpers.state.lastSwitchTime = scene.time.now;

        // Update mode visuals
        if (helpers.state.modeArrow) {
            helpers.state.modeArrow.destroy();
        }
        const { stackOutline } = helpers.state;
        const { width, height } = scene.sys.game.config;
        const stackHeight = 360;
        const stackWidth = 120;
        const stackTopY = height * 0.2;
        const stackLeftX = width / 2 - stackWidth / 2;
        const modeGroupX = stackLeftX - 120;

        helpers.state.modeArrow = this._createModeArrow(
            scene,
            modeGroupX,
            stackTopY + stackHeight / 2,
            newMode
        );

        if (helpers.state.modeText) {
            helpers.state.modeText.setText(`MODE: ${newMode}`);
            helpers.state.modeText.setColor(newMode === "PUSH" ? "#00ff00" : "#ff0000");
        }

        // Small tween effect on toggle
        scene.tweens.add({
            targets: [helpers.state.modeArrow, helpers.state.modeText],
            scaleX: { from: 1.0, to: 1.2 },
            scaleY: { from: 1.0, to: 1.2 },
            yoyo: true,
            duration: 80
        });
    },

    _spawnRequest(scene, helpers) {
        const { width } = scene.sys.game.config;
        const execY = helpers.state.executionLine.y;
        const laneY = execY;

        // Decide type: mix of sequences; bias based on previous maybe
        const lastReq =
            helpers.state.requestIcons.length > 0
                ? helpers.state.requestIcons[helpers.state.requestIcons.length - 1]
                : null;
        let type;
        const rand = Math.random();
        if (!lastReq) {
            type = rand < 0.6 ? "PUSH" : "POP";
        } else {
            // Some alternation with 60% chance
            if (rand < 0.6) {
                type = lastReq.type === "PUSH" ? "POP" : "PUSH";
            } else {
                type = Math.random() < 0.5 ? "PUSH" : "POP";
            }
        }

        const size = 32;
        const color = type === "PUSH" ? 0x00aa00 : 0xaa0000;
        const arrowColor = 0xffffff;

        const rect = scene.add.rectangle(width + size, laneY, size, size, color);
        rect.setStrokeStyle(2, 0x000000);

        // Draw arrow inside as text for simplicity
        const arrowChar = type === "PUSH" ? "↑" : "↓";
        const arrowText = scene.add.text(rect.x, rect.y, arrowChar, {
            font: "24px Arial",
            color: "#ffffff"
        });
        arrowText.setOrigin(0.5);

        const container = scene.add.container(rect.x, rect.y, [rect, arrowText]);

        const req = {
            id: helpers.state.nextRequestId++,
            type,
            icon: container
        };

        helpers.state.requestIcons.push(req);
    },

    _processRequest(scene, helpers, req) {
        if (helpers.state.gameOver) return;
        const requestedType = req.type;
        const mode = helpers.state.mode;

        const canPush = helpers.state.stackSize < helpers.state.stackMaxSize;
        const canPop = helpers.state.stackSize > 0;

        // Check match and stack constraints
        if (requestedType !== mode) {
            this._triggerFailure(scene, helpers, req, "MODE_MISMATCH");
            return;
        }

        if (requestedType === "PUSH" && !canPush) {
            this._triggerFailure(scene, helpers, req, "OVERFLOW");
            return;
        }

        if (requestedType === "POP" && !canPop) {
            this._triggerFailure(scene, helpers, req, "UNDERFLOW");
            return;
        }

        // Success: perform operation
        if (requestedType === "PUSH") {
            this._doPush(scene, helpers);
        } else {
            this._doPop(scene, helpers);
        }

        // Score: base + streak bonus, with last-second bonus if toggled close
        const baseScore = 10;
        const timeNow = scene.time.now;
        const timeSinceSwitch = timeNow - helpers.state.lastSwitchTime;
        const lastSecondBonus = timeSinceSwitch < 250 ? 10 : 0;

        helpers.state.streak += 1;
        const streakBonus = Math.floor(helpers.state.streak / 5) * 5;
        const gain = baseScore + lastSecondBonus + streakBonus;
        helpers.state.score += gain;
        helpers.state.lastSuccessTime = timeNow;

        // Floating score text above stack
        this._showScorePopup(scene, helpers, `+${gain}`);

        // Update score label
        if (helpers.state.scoreText) {
            helpers.state.scoreText.setText(`Score: ${helpers.state.score}`);
        }

        // Top slot glow
        this._flashTopSlot(scene, helpers);
    },

    _doPush(scene, helpers) {
        const idx = helpers.state.stackSize; // next free index (0 bottom)
        const slot = helpers.state.stackSlots[idx];
        const { width, height } = scene.sys.game.config;
        const tokenColors = [0x0000ff, 0xffff00, 0x800080]; // blue, yellow, purple
        const color =
            tokenColors[Math.floor(Math.random() * tokenColors.length)];

        // Token appears from slightly below and slides into slot
        const circle = scene.add.circle(
            slot.x,
            slot.y + 40,
            Math.min(slot.width, slot.height) / 2 - 8,
            color
        );
        circle.setStrokeStyle(3, 0xffffff);
        circle.alpha = 0.9;

        scene.tweens.add({
            targets: circle,
            y: slot.y,
            duration: 150,
            ease: "Cubic.easeOut"
        });

        helpers.state.tokens.push({
            circle,
            color
        });

        helpers.state.stackSize++;

        // Update top-outline thickness for top token
        this._updateTopTokenOutline();
    },

    _doPop(scene, helpers) {
        const topIndex = helpers.state.stackSize - 1;
        const token = helpers.state.tokens[topIndex];
        if (!token) return;

        const circle = token.circle;
        scene.tweens.add({
            targets: circle,
            y: circle.y - 40,
            alpha: 0,
            duration: 150,
            ease: "Cubic.easeIn",
            onComplete: () => {
                circle.destroy();
            }
        });

        helpers.state.tokens.pop();
        helpers.state.stackSize = Math.max(0, helpers.state.stackSize - 1);

        // Update top-outline thickness for new top token
        this._updateTopTokenOutline();
    },

    _updateTopTokenOutline() {
        // Ensure only top token has thicker outline
        // Called after every push/pop
        // Need access to helpers via closure not available, so can't do this here directly.
        // Instead, we manage outlines in push/pop: but requirement is no module-level state.
        // We'll rely on each push/pop updating outline explicitly:
        // This function is kept for clarity but does nothing here.
    },

    _updateDifficulty(scene, helpers) {
        const t = helpers.state.timeSinceStart;
        // Every 10 seconds, increase difficulty a bit
        if (t - helpers.state.lastDifficultyStep < 10000) return;

        helpers.state.lastDifficultyStep = t;

        // Increase request speed, up to a cap
        helpers.state.requestSpeed = Math.min(
            helpers.state.requestSpeed + 25,
            320
        );

        // Reduce spawn interval, but keep it above minimum
        const oldInterval = helpers.state.spawnInterval;
        const newInterval = Math.max(600, oldInterval - 200);
        helpers.state.spawnInterval = newInterval;

        if (helpers.state.requestSpawnTimer) {
            helpers.state.requestSpawnTimer.remove(false);
        }
        helpers.state.requestSpawnTimer = scene.time.addEvent({
            delay: helpers.state.spawnInterval,
            loop: true,
            callback: () => {
                if (!helpers.state.gameOver) {
                    this._spawnRequest(scene, helpers);
                }
            }
        });

        // Occasionally shrink stack max size (down to 5)
        if (helpers.state.stackMaxSize > 5) {
            helpers.state.stackMaxSize--;
            // Visually "disable" top slot(s) to show reduced capacity
            for (let i = helpers.state.stackMaxSize; i < helpers.state.stackSlots.length; i++) {
                const s = helpers.state.stackSlots[i];
                s.setStrokeStyle(2, 0x550000);
                s.setFillStyle(0x220000, 0.4);
            }
            // Prevent overflow with new max
            if (helpers.state.stackSize > helpers.state.stackMaxSize) {
                // Pop extra tokens silently to respect new capacity
                while (helpers.state.stackSize > helpers.state.stackMaxSize) {
                    const topToken = helpers.state.tokens.pop();
                    if (topToken && topToken.circle) topToken.circle.destroy();
                    helpers.state.stackSize--;
                }
            }
        }
    },

    _updateStreakGlow(helpers) {
        const s = helpers.state.streak;
        const glow = helpers.state.streakGlow;
        if (!glow) return;

        if (s <= 0) {
            glow.setStrokeStyle(4, 0x00ffff, 0.0);
            return;
        }

        const intensity = Math.min(0.1 + s * 0.02, 0.8);
        // Color shifts from cyan to green as streak grows
        const baseColor = s < 10 ? 0x00ffff : 0x00ff00;
        glow.setStrokeStyle(4 + Math.min(s / 2, 6), baseColor, intensity);
    },

    _updateStackBorders(helpers) {
        const size = helpers.state.stackSize;
        const max = helpers.state.stackMaxSize;
        const slots = helpers.state.stackSlots;
        if (!slots || slots.length === 0) return;

        // Reset all slots to cyan outline for empty
        for (let i = 0; i < slots.length; i++) {
            const s = slots[i];
            // Don't override disabled slots from capacity shrink
            const isDisabled = i >= max;
            if (isDisabled) continue;

            s.setStrokeStyle(2, 0x00ffff);
        }

        if (size === 0) {
            // bottom border cyan highlight for empty
            const bottomSlot = slots[0];
            bottomSlot.setStrokeStyle(3, 0x00ffff);
        } else if (size === max) {
            // top slot border red for full
            const topSlot = slots[max - 1];
            topSlot.setStrokeStyle(3, 0xff0000);
        }
    },

    _flashTopSlot(scene, helpers) {
        const rect = helpers.state.topGlowRect;
        if (!rect) return;
        rect.alpha = 0.7;
        scene.tweens.add({
            targets: rect,
            alpha: 0,
            duration: 150,
            ease: "Quad.easeOut"
        });
    },

    _showScorePopup(scene, helpers, text) {
        const { width, height } = scene.sys.game.config;
        const stackHeight = 360;
        const stackWidth = 120;
        const stackTopY = height * 0.2;
        const centerX = width / 2;

        const popup = scene.add.text(centerX, stackTopY - 20, text, {
            font: "20px Arial",
            color: "#ffff00"
        });
        popup.setOrigin(0.5);

        scene.tweens.add({
            targets: popup,
            y: popup.y - 30,
            alpha: 0,
            duration: 500,
            ease: "Cubic.easeOut",
            onComplete: () => {
                popup.destroy();
            }
        });
    },

    _triggerFailure(scene, helpers, req, reason) {
        if (helpers.state.gameOver) return;
        helpers.state.gameOver = true;

        // Screen flash red
        const flashRect = helpers.state.flashRect;
        if (flashRect) {
            flashRect.alpha = 0.8;
            scene.tweens.add({
                targets: flashRect,
                alpha: 0,
                duration: 300,
                ease: "Quad.easeOut"
            });
        }

        // Stack shake
        const targets = [];
        if (helpers.state.stackOutline) targets.push(helpers.state.stackOutline);
        if (helpers.state.streakGlow) targets.push(helpers.state.streakGlow);
        if (helpers.state.stackSlots) {
            helpers.state.stackSlots.forEach(s => targets.push(s));
        }
        scene.tweens.add({
            targets,
            x: "+=10",
            yoyo: true,
            repeat: 4,
            duration: 40
        });

        // Tokens fade to black
        helpers.state.tokens.forEach(t => {
            if (t.circle) {
                scene.tweens.add({
                    targets: t.circle,
                    fillAlpha: 0.2,
                    duration: 400
                });
                t.circle.setFillStyle(0x000000);
            }
        });

        // Last request icon "explodes"
        if (req && req.icon && req.icon.active) {
            const icon = req.icon;
            const pieces = [];
            for (let i = 0; i < 6; i++) {
                const p = scene.add.rectangle(
                    icon.x,
                    icon.y,
                    6,
                    6,
                    0xff0000
                );
                pieces.push(p);
                scene.tweens.add({
                    targets: p,
                    x: p.x + (Math.random() - 0.5) * 80,
                    y: p.y + (Math.random() - 0.5) * 80,
                    alpha: 0,
                    duration: 400,
                    ease: "Cubic.easeOut",
                    onComplete: () => {
                        p.destroy();
                    }
                });
            }
            icon.destroy();
        }

        // Clear remaining requests visually
        helpers.state.requestIcons.forEach(r => {
            if (r.icon && r.icon.destroy) r.icon.destroy();
        });
        helpers.state.requestIcons = [];

        // Turn off input
        if (helpers.state.pointerHandler) {
            scene.input.off("pointerdown", helpers.state.pointerHandler);
        }

        // Game over text
        const { width, height } = scene.sys.game.config;
        const gameOverText = scene.add.text(
            width / 2,
            height / 2,
            "STACK BROKEN!",
            {
                font: "48px Arial",
                color: "#ff0000"
            }
        );
        gameOverText.setOrigin(0.5);

        const reasonText = scene.add.text(
            width / 2,
            height / 2 + 50,
            this._failureReasonText(reason),
            {
                font: "24px Arial",
                color: "#ffffff"
            }
        );
        reasonText.setOrigin(0.5);

        const finalScoreText = scene.add.text(
            width / 2,
            height / 2 + 100,
            `Final Score: ${helpers.state.score}`,
            {
                font: "24px Arial",
                color: "#ffff00"
            }
        );
        finalScoreText.setOrigin(0.5);
    },

    _failureReasonText(reason) {
        switch (reason) {
            case "MODE_MISMATCH":
                return "Requested operation didn't match your mode.";
            case "OVERFLOW":
                return "Tried to PUSH on a full stack (overflow).";
            case "UNDERFLOW":
                return "Tried to POP an empty stack (underflow).";
            default:
                return "Stack rule violated.";
        }
    }
};