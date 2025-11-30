export default {
    id: "PythagorasCartridge",

    init(helpers) {
        helpers.state.score = 0;
        helpers.state.level = 1;
        helpers.state.streak = 0;
        helpers.state.bestStreak = 0;
        helpers.state.question = null;
        helpers.state.userAnswer = "";
        helpers.state.lives = 5;
        helpers.state.totalQuestions = 0;
        helpers.state.correctAnswers = 0;
        helpers.state.feedback = "";
        helpers.state.difficulty = "easy"; // easy, medium, hard
        helpers.state.showHint = false;
        helpers.state.particles = [];
        console.log("Enhanced Pythagoras Game initialized!");
    },

    loadAssets(loader) {
        // No external assets needed
    },

    create(scene, helpers) {
        const W = 800;
        const H = 600;

        // Gradient background effect
        this.createBackground(scene);

        // Header bar
        this.createHeader(scene, helpers);

        // Main game area
        this.triangleContainer = scene.add.container(150, 180);
        this.drawDynamicTriangle(scene, helpers);

        // Question panel
        this.createQuestionPanel(scene, helpers, W / 2 + 150, 250);

        // Number pad
        this.createEnhancedNumberPad(scene, helpers, W / 2 + 150, 420);

        // Power-ups panel
        this.createPowerUps(scene, helpers);

        // Particle system for effects
        this.particles = [];

        // Generate first question
        this.generateQuestion(helpers, scene);
    },

    createBackground(scene) {
        const graphics = scene.add.graphics();
        graphics.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x0f3460, 1);
        graphics.fillRect(0, 0, 800, 600);

        // Grid pattern
        for (let i = 0; i < 800; i += 40) {
            graphics.lineStyle(1, 0x2d4a6d, 0.3);
            graphics.lineBetween(i, 0, i, 600);
        }
        for (let i = 0; i < 600; i += 40) {
            graphics.lineStyle(1, 0x2d4a6d, 0.3);
            graphics.lineBetween(0, i, 800, i);
        }
    },

    createHeader(scene, helpers) {
        // Title with glow effect
        const title = scene.add.text(400, 30, "⚡ PYTHAGORAS MASTER ⚡", {
            font: "bold 32px Arial",
            color: "#00d4ff",
            stroke: "#000000",
            strokeThickness: 4
        }).setOrigin(0.5);

        // Stats bar
        const statsBg = scene.add.rectangle(400, 70, 760, 50, 0x0f1923, 0.8);
        statsBg.setStrokeStyle(2, 0x00d4ff);

        this.scoreText = scene.add.text(50, 70, `⭐ ${helpers.state.score}`, {
            font: "bold 20px Arial",
            color: "#ffd700"
        }).setOrigin(0, 0.5);

        this.levelText = scene.add.text(200, 70, `LVL ${helpers.state.level}`, {
            font: "bold 20px Arial",
            color: "#00ff88"
        }).setOrigin(0, 0.5);

        this.streakText = scene.add.text(350, 70, `🔥 ${helpers.state.streak}`, {
            font: "bold 20px Arial",
            color: "#ff6b35"
        }).setOrigin(0, 0.5);

        // Lives display
        this.livesText = scene.add.text(750, 70, "", {
            font: "20px Arial",
            color: "#ff4757"
        }).setOrigin(1, 0.5);
        this.updateLivesDisplay(helpers);
    },

    updateLivesDisplay(helpers) {
        const hearts = "❤️".repeat(Math.max(0, helpers.state.lives));
        this.livesText.setText(hearts);
    },

    createQuestionPanel(scene, helpers, x, y) {
        const panel = scene.add.rectangle(x, y, 380, 280, 0x1e3a5f, 0.9);
        panel.setStrokeStyle(3, 0x00d4ff);

        this.formulaText = scene.add.text(x, y - 110, "a² + b² = c²", {
            font: "bold 24px Arial",
            color: "#00d4ff"
        }).setOrigin(0.5);

        this.questionText = scene.add.text(x, y - 50, "", {
            font: "20px Arial",
            color: "#ffffff",
            align: "center",
            wordWrap: { width: 340 }
        }).setOrigin(0.5);

        this.answerDisplay = scene.add.text(x, y + 30, "", {
            font: "bold 28px Arial",
            color: "#ffd700",
            stroke: "#000000",
            strokeThickness: 2
        }).setOrigin(0.5);

        this.feedbackText = scene.add.text(x, y + 80, "", {
            font: "bold 22px Arial",
            color: "#ffffff"
        }).setOrigin(0.5);

        // Submit button
        const submitBtn = scene.add.rectangle(x, y + 120, 160, 50, 0x00b894);
        submitBtn.setInteractive();
        submitBtn.setStrokeStyle(3, 0xffffff);

        const submitText = scene.add.text(x, y + 120, "SUBMIT ✓", {
            font: "bold 22px Arial",
            color: "#ffffff"
        }).setOrigin(0.5);

        submitBtn.on("pointerover", () => {
            submitBtn.setFillStyle(0x00d4aa);
            submitBtn.setScale(1.05);
        });

        submitBtn.on("pointerout", () => {
            submitBtn.setFillStyle(0x00b894);
            submitBtn.setScale(1);
        });

        submitBtn.on("pointerdown", () => {
            this.checkAnswer(helpers, scene);
        });
    },

    createEnhancedNumberPad(scene, helpers, x, y) {
        const buttons = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'];
        const buttonSize = 50;
        const spacing = 65;
        const cols = 3;

        buttons.forEach((num, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const btnX = x - spacing + col * spacing;
            const btnY = y + row * spacing;

            const isSpecial = num === '⌫' || num === '.';
            const button = scene.add.rectangle(btnX, btnY, buttonSize, buttonSize,
                isSpecial ? 0xff6348 : 0x2d3436);
            button.setInteractive();
            button.setStrokeStyle(2, 0x00d4ff);

            const text = scene.add.text(btnX, btnY, num, {
                font: "bold 24px Arial",
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
                if (num === '⌫') {
                    helpers.state.userAnswer = helpers.state.userAnswer.slice(0, -1);
                } else if (num === '.' && !helpers.state.userAnswer.includes('.')) {
                    helpers.state.userAnswer += num;
                } else if (num !== '.') {
                    if (helpers.state.userAnswer.length < 8) {
                        helpers.state.userAnswer += num;
                    }
                }
                this.updateAnswerDisplay(helpers);
            });
        });
    },

    updateAnswerDisplay(helpers) {
        const display = helpers.state.userAnswer || "_";
        this.answerDisplay.setText(display);
    },

    createPowerUps(scene, helpers) {
        const powerUpY = 120;

        // Hint button
        const hintBtn = scene.add.rectangle(50, powerUpY, 80, 40, 0xe67e22);
        hintBtn.setInteractive();
        hintBtn.setStrokeStyle(2, 0xffffff);

        scene.add.text(50, powerUpY, "💡 HINT", {
            font: "14px Arial",
            color: "#ffffff"
        }).setOrigin(0.5);

        hintBtn.on("pointerdown", () => {
            this.showHint(helpers, scene);
        });

        // Skip button (costs points)
        const skipBtn = scene.add.rectangle(150, powerUpY, 80, 40, 0xe74c3c);
        skipBtn.setInteractive();
        skipBtn.setStrokeStyle(2, 0xffffff);

        scene.add.text(150, powerUpY, "⏭️ SKIP", {
            font: "14px Arial",
            color: "#ffffff"
        }).setOrigin(0.5);

        skipBtn.on("pointerdown", () => {
            if (helpers.state.score >= 5) {
                helpers.state.score -= 5;
                this.scoreText.setText(`⭐ ${helpers.state.score}`);
                helpers.state.streak = 0;
                this.streakText.setText(`🔥 ${helpers.state.streak}`);
                this.generateQuestion(helpers, scene);
                this.feedbackText.setText("Skipped (-5 pts)");
                this.feedbackText.setColor("#ff6348");
            }
        });
    },

    showHint(helpers, scene) {
        if (!helpers.state.question) return;

        const q = helpers.state.question;
        let hint = "";

        if (q.find === 'c') {
            hint = `Hint: c = √(${q.known.a}² + ${q.known.b}²) = √(${q.known.a * q.known.a} + ${q.known.b * q.known.b})`;
        } else if (q.find === 'a') {
            const cSquared = (q.known.c * q.known.c).toFixed(1);
            const bSquared = q.known.b * q.known.b;
            hint = `Hint: a = √(c² - b²) = √(${cSquared} - ${bSquared})`;
        } else {
            const cSquared = (q.known.c * q.known.c).toFixed(1);
            const aSquared = q.known.a * q.known.a;
            hint = `Hint: b = √(c² - a²) = √(${cSquared} - ${aSquared})`;
        }

        this.feedbackText.setText(hint);
        this.feedbackText.setColor("#e67e22");
    },

    drawDynamicTriangle(scene, helpers) {
        this.triangleContainer.removeAll(true);

        const scale = 1.8;
        const a = 80 * scale;
        const b = 60 * scale;

        // Triangle vertices
        const p1 = { x: 0, y: b };      // Bottom left
        const p2 = { x: a, y: b };      // Bottom right
        const p3 = { x: 0, y: 0 };      // Top left

        // Draw triangle sides with glow
        const graphics = scene.add.graphics();
        graphics.lineStyle(4, 0x00d4ff, 1);
        graphics.strokeTriangle(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);

        // Add subtle fill
        graphics.fillStyle(0x0f3460, 0.3);
        graphics.fillTriangle(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);

        this.triangleContainer.add(graphics);

        // Right angle indicator
        const sqSize = 20;
        const square = scene.add.rectangle(sqSize / 2, b - sqSize / 2, sqSize, sqSize);
        square.setStrokeStyle(3, 0xffffff);
        square.setFillStyle(0x000000, 0);
        this.triangleContainer.add(square);

        // Side labels with better positioning
        const labelA = scene.add.text(a / 2, b + 25, "a", {
            font: "bold 28px Arial",
            color: "#ff6348",
            stroke: "#000000",
            strokeThickness: 3
        }).setOrigin(0.5);

        const labelB = scene.add.text(-25, b / 2, "b", {
            font: "bold 28px Arial",
            color: "#00d4ff",
            stroke: "#000000",
            strokeThickness: 3
        }).setOrigin(0.5);

        const labelC = scene.add.text(a / 2 + 30, b / 2 - 10, "c", {
            font: "bold 28px Arial",
            color: "#ffd700",
            stroke: "#000000",
            strokeThickness: 3
        }).setOrigin(0.5);

        this.triangleContainer.add([labelA, labelB, labelC]);
    },

    generateQuestion(helpers, scene) {
        // Difficulty-based number generation
        let maxNum = 10;
        if (helpers.state.level > 5) maxNum = 15;
        if (helpers.state.level > 10) maxNum = 20;

        const a = Math.floor(Math.random() * maxNum) + 3;
        const b = Math.floor(Math.random() * maxNum) + 3;
        const c = Math.sqrt(a * a + b * b);

        const hiddenSide = Math.floor(Math.random() * 3);

        let question = "";
        let answer = 0;

        switch (hiddenSide) {
            case 0:
                question = `Given:\n  b = ${b}\n  c = ${c.toFixed(1)}\n\nFind: a = ?`;
                answer = Math.sqrt(c * c - b * b);
                helpers.state.question = { known: { b, c: parseFloat(c.toFixed(1)) }, find: 'a', answer };
                break;
            case 1:
                question = `Given:\n  a = ${a}\n  c = ${c.toFixed(1)}\n\nFind: b = ?`;
                answer = Math.sqrt(c * c - a * a);
                helpers.state.question = { known: { a, c: parseFloat(c.toFixed(1)) }, find: 'b', answer };
                break;
            case 2:
                question = `Given:\n  a = ${a}\n  b = ${b}\n\nFind: c = ?`;
                answer = c;
                helpers.state.question = { known: { a, b }, find: 'c', answer };
                break;
        }

        this.questionText.setText(question);
        helpers.state.userAnswer = "";
        this.updateAnswerDisplay(helpers);
        this.feedbackText.setText("");
        helpers.state.totalQuestions++;
    },

    checkAnswer(helpers, scene) {
        if (!helpers.state.userAnswer) {
            this.feedbackText.setText("⚠️ Enter an answer!");
            this.feedbackText.setColor("#ff6348");
            return;
        }

        const userNum = parseFloat(helpers.state.userAnswer);
        const correctAnswer = helpers.state.question.answer;
        const tolerance = 0.2;

        if (Math.abs(userNum - correctAnswer) <= tolerance) {
            // CORRECT ANSWER
            const basePoints = 10;
            const streakBonus = helpers.state.streak * 2;
            const levelBonus = helpers.state.level * 5;
            const totalPoints = basePoints + streakBonus + levelBonus;

            helpers.state.score += totalPoints;
            helpers.state.streak++;
            helpers.state.correctAnswers++;

            if (helpers.state.streak > helpers.state.bestStreak) {
                helpers.state.bestStreak = helpers.state.streak;
            }

            // Level up every 5 correct answers
            if (helpers.state.correctAnswers % 5 === 0) {
                helpers.state.level++;
                this.levelText.setText(`LVL ${helpers.state.level}`);
                this.showLevelUp(scene);
            }

            this.scoreText.setText(`⭐ ${helpers.state.score}`);
            this.streakText.setText(`🔥 ${helpers.state.streak}`);

            this.feedbackText.setText(`✓ CORRECT! +${totalPoints} pts`);
            this.feedbackText.setColor("#00ff88");

            this.createSuccessParticles(scene);

            scene.time.delayedCall(1500, () => {
                this.generateQuestion(helpers, scene);
            });
        } else {
            // WRONG ANSWER
            helpers.state.lives--;
            helpers.state.streak = 0;

            this.updateLivesDisplay(helpers);
            this.streakText.setText(`🔥 ${helpers.state.streak}`);

            this.feedbackText.setText(`✗ Wrong! Answer: ${correctAnswer.toFixed(1)}`);
            this.feedbackText.setColor("#ff4757");

            if (helpers.state.lives <= 0) {
                this.gameOver(scene, helpers);
            } else {
                scene.time.delayedCall(2000, () => {
                    this.generateQuestion(helpers, scene);
                });
            }
        }
    },

    createSuccessParticles(scene) {
        for (let i = 0; i < 20; i++) {
            const particle = scene.add.circle(
                600 + Math.random() * 100 - 50,
                250 + Math.random() * 100 - 50,
                Math.random() * 5 + 2,
                0xffd700
            );

            scene.tweens.add({
                targets: particle,
                y: particle.y - 100,
                alpha: 0,
                duration: 1000,
                ease: 'Cubic.easeOut',
                onComplete: () => particle.destroy()
            });
        }
    },

    showLevelUp(scene) {
        const levelUpText = scene.add.text(400, 300, "LEVEL UP! 🎉", {
            font: "bold 48px Arial",
            color: "#ffd700",
            stroke: "#000000",
            strokeThickness: 6
        }).setOrigin(0.5).setAlpha(0);

        scene.tweens.add({
            targets: levelUpText,
            alpha: 1,
            scale: 1.2,
            duration: 300,
            yoyo: true,
            hold: 800,
            onComplete: () => levelUpText.destroy()
        });
    },

    gameOver(scene, helpers) {
        const accuracy = ((helpers.state.correctAnswers / helpers.state.totalQuestions) * 100).toFixed(1);

        // Dark overlay
        const overlay = scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.85);

        // Game Over panel
        const panel = scene.add.rectangle(400, 300, 500, 450, 0x1e3a5f);
        panel.setStrokeStyle(4, 0x00d4ff);

        scene.add.text(400, 150, "GAME OVER", {
            font: "bold 48px Arial",
            color: "#ff4757",
            stroke: "#000000",
            strokeThickness: 4
        }).setOrigin(0.5);

        // Stats
        const stats = [
            `Final Score: ${helpers.state.score}`,
            `Level Reached: ${helpers.state.level}`,
            `Questions: ${helpers.state.totalQuestions}`,
            `Correct: ${helpers.state.correctAnswers}`,
            `Accuracy: ${accuracy}%`,
            `Best Streak: ${helpers.state.bestStreak} 🔥`
        ];

        stats.forEach((stat, i) => {
            scene.add.text(400, 230 + i * 35, stat, {
                font: "20px Arial",
                color: "#ffffff"
            }).setOrigin(0.5);
        });

        // Restart button
        const restartBtn = scene.add.rectangle(400, 490, 180, 55, 0x00b894);
        restartBtn.setInteractive();
        restartBtn.setStrokeStyle(3, 0xffffff);

        scene.add.text(400, 490, "PLAY AGAIN", {
            font: "bold 22px Arial",
            color: "#ffffff"
        }).setOrigin(0.5);

        restartBtn.on("pointerover", () => {
            restartBtn.setFillStyle(0x00d4aa);
            restartBtn.setScale(1.05);
        });

        restartBtn.on("pointerout", () => {
            restartBtn.setFillStyle(0x00b894);
            restartBtn.setScale(1);
        });

        restartBtn.on("pointerdown", () => {
            scene.scene.restart();
        });
    },

    update(scene, helpers) {
        // Smooth animations handled by tweens
    }
};