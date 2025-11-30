export default {
    id: "StackDSACartridge",

    init(helpers) {
        helpers.state.stack = [];
        helpers.state.maxSize = 8;
        helpers.state.score = 0;
        helpers.state.level = 1;
        helpers.state.operations = 0;
        helpers.state.currentChallenge = null;
        helpers.state.challengeMode = "tutorial"; // tutorial, timed, sequence
        helpers.state.timeLeft = 30;
        helpers.state.targetSequence = [];
        helpers.state.userSequence = [];
        helpers.state.animating = false;
        console.log("Stack DSA Game initialized!");
    },

    loadAssets(loader) {
        // No external assets needed
    },

    create(scene, helpers) {
        const W = 800;
        const H = 600;

        // Background
        this.createBackground(scene);

        // Header
        this.createHeader(scene, helpers);

        // Stack visualization area
        this.createStackArea(scene, helpers, 150, 200);

        // Control panel
        this.createControlPanel(scene, helpers, 550, 200);

        // Challenge panel
        this.createChallengePanel(scene, helpers, 550, 450);

        // Mode selector
        this.createModeSelector(scene, helpers);

        // Initialize first challenge
        this.startChallenge(helpers, scene);
    },

    createBackground(scene) {
        const graphics = scene.add.graphics();
        graphics.fillGradientStyle(0x0f0f23, 0x0f0f23, 0x1a1a3e, 0x2d2d5f, 1);
        graphics.fillRect(0, 0, 800, 600);

        // Circuit board pattern
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * 800;
            const y = Math.random() * 600;
            graphics.lineStyle(1, 0x4a90e2, 0.2);
            graphics.lineBetween(x, y, x + 50, y);
            graphics.lineBetween(x + 50, y, x + 50, y + 30);
        }
    },

    createHeader(scene, helpers) {
        scene.add.text(400, 25, "📚 STACK MASTER", {
            font: "bold 36px Arial",
            color: "#4a90e2",
            stroke: "#000000",
            strokeThickness: 4
        }).setOrigin(0.5);

        scene.add.text(400, 55, "Learn LIFO - Last In, First Out", {
            font: "18px Arial",
            color: "#8ab4f8",
            fontStyle: "italic"
        }).setOrigin(0.5);

        // Stats
        this.scoreText = scene.add.text(50, 90, `⭐ Score: ${helpers.state.score}`, {
            font: "bold 18px Arial",
            color: "#ffd700"
        });

        this.levelText = scene.add.text(250, 90, `Level ${helpers.state.level}`, {
            font: "bold 18px Arial",
            color: "#00ff88"
        });

        this.opsText = scene.add.text(400, 90, `Operations: ${helpers.state.operations}`, {
            font: "18px Arial",
            color: "#ffffff"
        });

        this.timerText = scene.add.text(650, 90, "", {
            font: "bold 20px Arial",
            color: "#ff6b6b"
        });
    },

    createStackArea(scene, helpers, x, y) {
        // Stack container visualization
        const containerWidth = 200;
        const containerHeight = 360;

        // Container outline
        const container = scene.add.rectangle(x + 100, y + 180, containerWidth, containerHeight);
        container.setStrokeStyle(4, 0x4a90e2);
        container.setFillStyle(0x1a1a3e, 0.5);

        // Base platform
        scene.add.rectangle(x + 100, y + 360, containerWidth + 20, 10, 0x4a90e2);

        // Stack label
        scene.add.text(x + 100, y - 20, "STACK", {
            font: "bold 24px Arial",
            color: "#4a90e2"
        }).setOrigin(0.5);

        // Size indicator
        this.sizeText = scene.add.text(x + 100, y + 380, `Size: 0 / ${helpers.state.maxSize}`, {
            font: "18px Arial",
            color: "#8ab4f8"
        }).setOrigin(0.5);

        // Top indicator arrow
        this.topArrow = scene.add.text(x - 40, y + 330, "← TOP", {
            font: "bold 16px Arial",
            color: "#ff6b6b"
        }).setOrigin(0.5);
        this.topArrow.setVisible(false);

        // Store stack items array
        this.stackItems = [];
    },

    createControlPanel(scene, helpers, x, y) {
        const panel = scene.add.rectangle(x, y, 400, 200, 0x1a1a3e, 0.8);
        panel.setStrokeStyle(3, 0x4a90e2);

        scene.add.text(x, y - 80, "STACK OPERATIONS", {
            font: "bold 20px Arial",
            color: "#4a90e2"
        }).setOrigin(0.5);

        // Input field for push
        const inputBg = scene.add.rectangle(x - 80, y - 30, 140, 40, 0x2d2d5f);
        inputBg.setStrokeStyle(2, 0x4a90e2);

        this.inputDisplay = scene.add.text(x - 80, y - 30, "Enter value", {
            font: "18px Arial",
            color: "#8ab4f8"
        }).setOrigin(0.5);

        helpers.state.inputValue = "";

        // Number pad (compact)
        this.createCompactNumberPad(scene, helpers, x - 80, y + 50);

        // Operation buttons
        this.createOperationButtons(scene, helpers, x + 80, y - 30);

        // Visual operation display
        this.operationText = scene.add.text(x, y + 120, "", {
            font: "bold 16px Arial",
            color: "#00ff88",
            align: "center"
        }).setOrigin(0.5);
    },

    createCompactNumberPad(scene, helpers, x, y) {
        const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '←'];
        const buttonSize = 35;
        const spacing = 45;
        const cols = 3;

        buttons.forEach((num, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const btnX = x - spacing + col * spacing;
            const btnY = y + row * spacing;

            const isSpecial = num === 'C' || num === '←';
            const button = scene.add.rectangle(btnX, btnY, buttonSize, buttonSize,
                isSpecial ? 0xff6348 : 0x2d3436);
            button.setInteractive();
            button.setStrokeStyle(2, 0x4a90e2);

            const text = scene.add.text(btnX, btnY, num, {
                font: "bold 16px Arial",
                color: "#ffffff"
            }).setOrigin(0.5);

            button.on("pointerover", () => {
                button.setFillStyle(isSpecial ? 0xff7f66 : 0x495057);
                button.setScale(1.1);
            });

            button.on("pointerout", () => {
                button.setFillStyle(isSpecial ? 0xff6348 : 0x2d3436);
                button.setScale(1);
            });

            button.on("pointerdown", () => {
                if (num === 'C') {
                    helpers.state.inputValue = "";
                } else if (num === '←') {
                    helpers.state.inputValue = helpers.state.inputValue.slice(0, -1);
                } else {
                    if (helpers.state.inputValue.length < 3) {
                        helpers.state.inputValue += num;
                    }
                }
                this.updateInputDisplay(helpers);
            });
        });
    },

    updateInputDisplay(helpers) {
        const display = helpers.state.inputValue || "Enter value";
        this.inputDisplay.setText(display);
    },

    createOperationButtons(scene, helpers, x, y) {
        const operations = [
            { name: "PUSH", color: 0x00b894, y: 0 },
            { name: "POP", color: 0xe74c3c, y: 60 },
            { name: "PEEK", color: 0xf39c12, y: 120 }
        ];

        operations.forEach(op => {
            const btn = scene.add.rectangle(x, y + op.y, 140, 45, op.color);
            btn.setInteractive();
            btn.setStrokeStyle(3, 0xffffff);

            const text = scene.add.text(x, y + op.y, op.name, {
                font: "bold 18px Arial",
                color: "#ffffff"
            }).setOrigin(0.5);

            btn.on("pointerover", () => {
                btn.setFillStyle(op.color + 0x222222);
                btn.setScale(1.05);
            });

            btn.on("pointerout", () => {
                btn.setFillStyle(op.color);
                btn.setScale(1);
            });

            btn.on("pointerdown", () => {
                this.executeOperation(helpers, scene, op.name.toLowerCase());
            });
        });
    },

    createChallengePanel(scene, helpers, x, y) {
        const panel = scene.add.rectangle(x, y, 400, 120, 0x1a1a3e, 0.8);
        panel.setStrokeStyle(3, 0x4a90e2);

        scene.add.text(x, y - 50, "🎯 CHALLENGE", {
            font: "bold 20px Arial",
            color: "#4a90e2"
        }).setOrigin(0.5);

        this.challengeText = scene.add.text(x, y - 10, "", {
            font: "16px Arial",
            color: "#ffffff",
            align: "center",
            wordWrap: { width: 360 }
        }).setOrigin(0.5);

        this.challengeStatus = scene.add.text(x, y + 30, "", {
            font: "bold 18px Arial",
            color: "#00ff88"
        }).setOrigin(0.5);
    },

    createModeSelector(scene, helpers) {
        const modes = ["Tutorial", "Timed", "Sequence"];
        const startX = 100;
        const y = 130;

        modes.forEach((mode, index) => {
            const btn = scene.add.rectangle(startX + index * 120, y, 110, 35, 0x2d3436);
            btn.setInteractive();
            btn.setStrokeStyle(2, 0x4a90e2);

            const text = scene.add.text(startX + index * 120, y, mode, {
                font: "bold 14px Arial",
                color: "#ffffff"
            }).setOrigin(0.5);

            btn.on("pointerdown", () => {
                helpers.state.challengeMode = mode.toLowerCase();
                helpers.state.level = 1;
                helpers.state.score = 0;
                this.levelText.setText(`Level ${helpers.state.level}`);
                this.scoreText.setText(`⭐ Score: ${helpers.state.score}`);
                this.startChallenge(helpers, scene);
            });

            btn.on("pointerover", () => btn.setFillStyle(0x495057));
            btn.on("pointerout", () => btn.setFillStyle(0x2d3436));
        });
    },

    executeOperation(helpers, scene, operation) {
        if (helpers.state.animating) return;

        helpers.state.operations++;
        this.opsText.setText(`Operations: ${helpers.state.operations}`);

        switch (operation) {
            case 'push':
                this.pushToStack(helpers, scene);
                break;
            case 'pop':
                this.popFromStack(helpers, scene);
                break;
            case 'peek':
                this.peekStack(helpers, scene);
                break;
        }

        this.checkChallenge(helpers, scene);
    },

    pushToStack(helpers, scene) {
        const value = helpers.state.inputValue;
        if (!value || value === "") {
            this.operationText.setText("❌ Enter a value first!");
            this.operationText.setColor("#ff6b6b");
            return;
        }

        if (helpers.state.stack.length >= helpers.state.maxSize) {
            this.operationText.setText("❌ Stack Overflow!");
            this.operationText.setColor("#ff6b6b");
            return;
        }

        helpers.state.stack.push(value);
        helpers.state.inputValue = "";
        this.updateInputDisplay(helpers);

        this.operationText.setText(`✓ Pushed: ${value}`);
        this.operationText.setColor("#00ff88");

        this.animatePush(scene, helpers, value);
        this.updateStackDisplay(helpers);
    },

    popFromStack(helpers, scene) {
        if (helpers.state.stack.length === 0) {
            this.operationText.setText("❌ Stack Underflow!");
            this.operationText.setColor("#ff6b6b");
            return;
        }

        const value = helpers.state.stack.pop();
        this.operationText.setText(`✓ Popped: ${value}`);
        this.operationText.setColor("#ff6b6b");

        this.animatePop(scene, helpers);
        this.updateStackDisplay(helpers);
    },

    peekStack(helpers, scene) {
        if (helpers.state.stack.length === 0) {
            this.operationText.setText("❌ Stack is empty!");
            this.operationText.setColor("#ff6b6b");
            return;
        }

        const value = helpers.state.stack[helpers.state.stack.length - 1];
        this.operationText.setText(`👁️ Top: ${value}`);
        this.operationText.setColor("#f39c12");

        // Highlight top item
        if (this.stackItems.length > 0) {
            const topItem = this.stackItems[this.stackItems.length - 1];
            scene.tweens.add({
                targets: topItem,
                scaleX: 1.1,
                scaleY: 1.1,
                duration: 200,
                yoyo: true
            });
        }
    },

    animatePush(scene, helpers, value) {
        helpers.state.animating = true;

        const stackX = 250;
        const baseY = 380;
        const itemHeight = 40;
        const index = helpers.state.stack.length - 1;
        const targetY = baseY - (index + 1) * itemHeight;

        // Create new item
        const item = scene.add.rectangle(stackX, 100, 180, 35, 0x00b894);
        item.setStrokeStyle(3, 0xffffff);

        const text = scene.add.text(stackX, 100, value, {
            font: "bold 20px Arial",
            color: "#ffffff"
        }).setOrigin(0.5);

        // Animate falling into stack
        scene.tweens.add({
            targets: [item, text],
            y: targetY,
            duration: 500,
            ease: 'Bounce.easeOut',
            onComplete: () => {
                helpers.state.animating = false;
            }
        });

        this.stackItems.push(item);
        this.stackItems.push(text);
    },

    animatePop(scene, helpers) {
        helpers.state.animating = true;

        if (this.stackItems.length >= 2) {
            const text = this.stackItems.pop();
            const item = this.stackItems.pop();

            scene.tweens.add({
                targets: [item, text],
                y: 50,
                alpha: 0,
                duration: 400,
                ease: 'Cubic.easeIn',
                onComplete: () => {
                    item.destroy();
                    text.destroy();
                    helpers.state.animating = false;
                }
            });
        } else {
            helpers.state.animating = false;
        }
    },

    updateStackDisplay(helpers) {
        this.sizeText.setText(`Size: ${helpers.state.stack.length} / ${helpers.state.maxSize}`);

        if (helpers.state.stack.length > 0) {
            this.topArrow.setVisible(true);
            const index = helpers.state.stack.length - 1;
            const baseY = 380;
            const itemHeight = 40;
            this.topArrow.setY(baseY - (index + 1) * itemHeight);
        } else {
            this.topArrow.setVisible(false);
        }
    },

    startChallenge(helpers, scene) {
        const mode = helpers.state.challengeMode;

        if (mode === "tutorial") {
            this.startTutorialChallenge(helpers);
        } else if (mode === "timed") {
            this.startTimedChallenge(helpers, scene);
        } else if (mode === "sequence") {
            this.startSequenceChallenge(helpers);
        }
    },

    startTutorialChallenge(helpers) {
        const challenges = [
            { desc: "Push three numbers: 5, 10, 15", target: ["5", "10", "15"] },
            { desc: "Push 7, 14, 21, then Pop once", target: ["7", "14"] },
            { desc: "Push 1, 2, 3, Pop twice, Push 4", target: ["1", "4"] },
            { desc: "Build stack: 10, 20, 30, 40, 50", target: ["10", "20", "30", "40", "50"] }
        ];

        const challenge = challenges[Math.min(helpers.state.level - 1, challenges.length - 1)];
        this.challengeText.setText(challenge.desc);
        helpers.state.currentChallenge = challenge.target;
        this.timerText.setText("");
    },

    startTimedChallenge(helpers, scene) {
        helpers.state.timeLeft = 30;
        const target = Math.floor(Math.random() * 50) + 10;
        this.challengeText.setText(`Push the number ${target} before time runs out!`);
        helpers.state.currentChallenge = [target.toString()];

        this.timerInterval = scene.time.addEvent({
            delay: 1000,
            callback: () => {
                helpers.state.timeLeft--;
                this.timerText.setText(`⏱️ ${helpers.state.timeLeft}s`);

                if (helpers.state.timeLeft <= 0) {
                    this.timerInterval.destroy();
                    this.challengeStatus.setText("⏰ Time's Up!");
                    this.challengeStatus.setColor("#ff6b6b");
                }
            },
            loop: true
        });
    },

    startSequenceChallenge(helpers) {
        const length = Math.min(3 + helpers.state.level, 8);
        const sequence = [];
        for (let i = 0; i < length; i++) {
            sequence.push((Math.floor(Math.random() * 20) + 1).toString());
        }

        this.challengeText.setText(`Replicate this stack: ${sequence.join(", ")}`);
        helpers.state.currentChallenge = sequence;
        this.timerText.setText("");
    },

    checkChallenge(helpers, scene) {
        if (!helpers.state.currentChallenge) return;

        const current = helpers.state.stack.join(",");
        const target = helpers.state.currentChallenge.join(",");

        if (current === target) {
            const points = helpers.state.level * 50;
            helpers.state.score += points;
            this.scoreText.setText(`⭐ Score: ${helpers.state.score}`);

            this.challengeStatus.setText(`🎉 Challenge Complete! +${points} pts`);
            this.challengeStatus.setColor("#00ff88");

            scene.time.delayedCall(2000, () => {
                helpers.state.level++;
                this.levelText.setText(`Level ${helpers.state.level}`);
                this.challengeStatus.setText("");

                if (this.timerInterval) {
                    this.timerInterval.destroy();
                }

                this.startChallenge(helpers, scene);
            });
        }
    },

    update(scene, helpers) {
        // Game loop handled by events
    }
};