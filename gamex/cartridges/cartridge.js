export default {
  id: "HypotenuseSnap",

  init(helpers) {
    helpers.state.level = 1;
    helpers.state.speed = 110; // initial speed for hypotenuse square
    helpers.state.fastSnapThreshold = 600; // ms, for 'speed bonus' visual effect
    helpers.state.gameOver = false;
    helpers.state.triangle = null;
    helpers.state.hypoSquare = null;
    helpers.state.startSnapTime = null;
    helpers.state.successTimer = null;
    helpers.state.gridSize = 40; // for background grid
    helpers.state.validSnapDelta = 0.07; // relative, tolerance for area match
    helpers.state.transitioning = false;
    helpers.state.flashColor = null;
    helpers.state.flashTimer = null;
  },

  loadAssets(loader) {
    // No external images; synthesize sounds/shapes in code
    loader.audio("snap", "https://cdn.jsdelivr.net/gh/photonstorm/phaser3-examples/public/assets/audio/SoundEffects/shot1.wav");
    loader.audio("pop", "https://cdn.jsdelivr.net/gh/photonstorm/phaser3-examples/public/assets/audio/SoundEffects/pop.ogg");
    loader.audio("fail", "https://cdn.jsdelivr.net/gh/photonstorm/phaser3-examples/public/assets/audio/SoundEffects/snap.wav");
    // For triangle breakdown animation, we'll use code only (lines)
  },

  create(scene, helpers) {
    // Draw background grid
    const width = 800, height = 600;
    scene.cameras.main.setBackgroundColor("#1A1C20");
    // Precreate grid lines group for reuse
    if (!this.gridLines) {
      this.gridLines = [];
      for (let x = 0; x <= width; x += helpers.state.gridSize) {
        this.gridLines.push(
          scene.add.line(0, 0, x, 0, x, height, 0x323646, 0.3).setOrigin(0)
        );
      }
      for (let y = 0; y <= height; y += helpers.state.gridSize) {
        this.gridLines.push(
          scene.add.line(0, 0, 0, y, width, y, 0x323646, 0.3).setOrigin(0)
        );
      }
    }

    // Main references
    this.triangleElements = {};
    this.hypoSquareObj = {};
    this.ui = {};

    // Input state
    this.holdActive = false;

    this.startLevel(scene, helpers);

    // Input binding: pointer and keyboard
    scene.input.on('pointerdown', () => this.handlePointerDown(scene, helpers));
    scene.input.on('pointerup', () => this.handlePointerUp(scene, helpers));
    this.cursors = scene.input.keyboard.createCursorKeys();
    scene.input.keyboard.on("keydown-SPACE", () => this.handlePointerDown(scene, helpers));
    scene.input.keyboard.on("keyup-SPACE", () => this.handlePointerUp(scene, helpers));
  },

  update(scene, helpers, delta) {
    if (helpers.state.gameOver || helpers.state.transitioning) return;

    // Main movement logic for hypotenuse square
    const hs = helpers.state.hypoSquare;
    if (!hs) return;

    if (this.holdActive && hs.state === "Moving") {
      hs.t += (helpers.state.speed * (delta / 1000)) / hs.hypotenuseLength;
      hs.t = Math.min(1, hs.t);
      this.updateHypoSquare(scene, helpers, hs.t);
      this.pulseHypoSquare(scene, helpers, delta);
      if (hs.t >= 1) {
        this.autoSnap(scene, helpers);
      }
    } else if (!this.holdActive && hs.state === "Moving" && hs.slowing) {
      // On release: animate to nearest grid point
      const snapT = this.calcGridSnapT(hs.t, hs.snapSteps);
      // Easing
      hs.t += Math.sign(snapT - hs.t) * Math.min(Math.abs(snapT - hs.t), 2 * (delta / 1000) / hs.hypotenuseLength);
      if (Math.abs(hs.t - snapT) < 0.009) {
        hs.t = snapT;
        hs.slowing = false;
      }
      this.updateHypoSquare(scene, helpers, hs.t);
    }

    if (helpers.state.flashTimer && scene.time.now > helpers.state.flashTimer) {
      this.stopFlash(scene, helpers);
    }
  },

  // --- Level/triangle logic ---
  startLevel(scene, helpers) {
    helpers.state.transitioning = false;
    if (this.triangleElements && this.triangleElements.group) {
      this.triangleElements.group.clear(true, true);
    }
    if (this.hypoSquareObj && this.hypoSquareObj.group) {
      this.hypoSquareObj.group.clear(true, true);
    }

    // Generate triangle sides
    const level = helpers.state.level;
    // Reasonable min/max for legs (fix to grid)
    const minLen = 5 * helpers.state.gridSize, maxLen = 10 * helpers.state.gridSize; // px
    let a = Phaser.Math.Snap.To(minLen + Math.random() * (maxLen - minLen), helpers.state.gridSize);
    let b = Phaser.Math.Snap.To(minLen + Math.random() * (maxLen - minLen), helpers.state.gridSize);
    // Progression: slightly increase randomness/make sides less perpendicular
    if (level > 3) {
      a = Phaser.Math.Snap.To(minLen + Math.random() * (maxLen + 40 * (level - 3)), helpers.state.gridSize);
      b = Phaser.Math.Snap.To(minLen + Math.random() * (maxLen + 40 * (level - 3)), helpers.state.gridSize);
    }
    helpers.state.triangle = {a, b};

    // Triangle vertices: right-angled triangle with right angle at (cx, cy)
    // We'll center the triangle nicely
    const margin = 65;
    const cx = 400 - a / 2 + margin / 2, cy = 300 + b / 2;

    // Vertices: V0 (cx, cy) [right angle], V1 (cx+a, cy), V2 (cx, cy-b)
    const V0 = { x: cx, y: cy }; // right angle
    const V1 = { x: cx + a, y: cy };
    const V2 = { x: cx, y: cy - b };
    const hypoVec = { x: V1.x - V2.x, y: V1.y - V2.y };
    const c = Math.sqrt(a * a + b * b);

    helpers.state.triangle = {
      a, b, c,
      verts: [V0, V1, V2]
    };

    // Prepare data for squares on each side (edges from-via-to)
    const baseMid = { x: (V0.x + V1.x) / 2, y: (V0.y + V1.y) / 2 };
    const altMid = { x: (V0.x + V2.x) / 2, y: (V0.y + V2.y) / 2 };
    const hypoMid = { x: (V1.x + V2.x) / 2, y: (V1.y + V2.y) / 2 };

    // Clean up previous graphical groups
    this.triangleElements = { group: scene.add.group() };
    this.hypoSquareObj = { group: scene.add.group() };

    // Draw triangle
    this.triangleElements.tri = scene.add.polygon(0, 0, [
      V0.x, V0.y, V1.x, V1.y, V2.x, V2.y
    ], 0x222a34, 0.08).setOrigin(0).setStrokeStyle(5, 0xfffffff, 0.33);
    this.triangleElements.group.add(this.triangleElements.tri);

    // Draw base and altitude edges
    this.triangleElements.baseEdge = scene.add.line(0,0, V0.x, V0.y, V1.x, V1.y, 0x2196f3, 1).setOrigin(0).setLineWidth(7);
    this.triangleElements.group.add(this.triangleElements.baseEdge);
    this.triangleElements.altEdge = scene.add.line(0,0, V0.x, V0.y, V2.x, V2.y, 0x31d052, 1).setOrigin(0).setLineWidth(7);
    this.triangleElements.group.add(this.triangleElements.altEdge);
    this.triangleElements.hypoEdge = scene.add.line(0,0,V2.x,V2.y,V1.x,V1.y,0xf9e942,1).setOrigin(0).setLineWidth(7);
    this.triangleElements.group.add(this.triangleElements.hypoEdge);

    // Draw right-angle indicator
    const dotRadius = 14;
    this.triangleElements.cyanDot = scene.add.circle(V0.x, V0.y, dotRadius, 0x41e7f7, 1).setStrokeStyle(4, 0x00d1b8);
    this.triangleElements.group.add(this.triangleElements.cyanDot);

    // Draw squares on legs
    // Base: from V0 to V1 (angle 0), blue
    this.triangleElements.baseSquare = this.drawSquareOnEdge(scene, V0, V1, a, 0x2196f3, 0.65, false);
    // Altitude: from V0 to V2 (angle -90), green
    this.triangleElements.altSquare = this.drawSquareOnEdge(scene, V0, V2, b, 0x31d052, 0.65, false);

    this.triangleElements.group.addMultiple([
      this.triangleElements.baseSquare.graphics,
      this.triangleElements.altSquare.graphics
    ]);

    // Hypotenuse square logic
    // For snapping, define t in [0,1] from V2 (start) to V1 (end)
    const snapSteps = Math.ceil(c / helpers.state.gridSize);
    helpers.state.hypoSquare = {
      state: "Moving",
      t: 0, // progress along hypotenuse, 0 = V2 to 1 = V1
      c,
      side: c,
      snapSteps,
      slowing: false,
      snapped: false,
      verts: [V2, V1],
      hypoStart: V2,
      hypoEnd: V1,
      hypoVec,
      hypoAngle: Math.atan2(hypoVec.y, hypoVec.x),
      hypoOrigin: { x: V2.x, y: V2.y },
      hypotenuseLength: c,
      nextSpeed: helpers.state.speed,
      color: 0xf9e942
    };

    // Draw moving hypotenuse square (initial position)
    this.createHypoSquare(scene, helpers, 0);

    // Draw square on hypotenuse (destination for matching)
    this.triangleElements.hypoRefSquare = this.drawSquareOnEdge(scene, V2, V1, c, 0xf9e942, 0, true, 0); // outline only, alpha 0
    this.triangleElements.group.add(this.triangleElements.hypoRefSquare.graphics);

    // UI
    if (!this.ui.levelText) {
      this.ui.levelText = scene.add.text(24, 20, 'LEVEL 1', {
        font: '28px Arial',
        color: '#ffffff'
      }).setOrigin(0,0);
      this.ui.levelText.setAlpha(0.82);
    } else {
      this.ui.levelText.setText('LEVEL ' + helpers.state.level);
    }

    // For speed-precision feedback
    if (!this.ui.infoText) {
      this.ui.infoText = scene.add.text(400, 48, '', {
        font: '22px Arial',
        color: '#ffeb3b',
        align: "center"
      }).setOrigin(0.5,0);
    }
    this.ui.infoText.setText("Hold/Tap to slide square along hypotenuse\nSnap to area match!");

    // Reset timing for speed bonus
    helpers.state.startSnapTime = scene.time.now;

    // Transition after success
    helpers.state.transitioning = false;
    // Animate cyan dot if needed
    this.cyanDotPulseAnim(scene, helpers, 0);
  },

  // --- Input handlers ---
  handlePointerDown(scene, helpers) {
    if (helpers.state.gameOver || helpers.state.transitioning) return;
    const hs = helpers.state.hypoSquare;
    if (!hs || hs.state !== "Moving") return;
    this.holdActive = true;
    hs.slowing = false;
    // Square grows slightly as held
    if (this.hypoSquareObj.sprite)
      this.hypoSquareObj.sprite.setScale(1.06);
  },

  handlePointerUp(scene, helpers) {
    if (helpers.state.gameOver || helpers.state.transitioning) return;
    const hs = helpers.state.hypoSquare;
    if (!hs || hs.state !== "Moving") return;
    if (this.holdActive && hs.t > 0 && hs.t < 1) {
      hs.slowing = true;
      this.holdActive = false;
      if (this.hypoSquareObj.sprite)
        this.hypoSquareObj.sprite.setScale(1);
    }
  },

  autoSnap(scene, helpers) {
    if (helpers.state.gameOver) return;
    this.snapHypoSquare(scene, helpers);
  },

  pulseHypoSquare(scene, helpers, delta) {
    if (!this.hypoSquareObj.sprite) return;
    // Pulse effect: scale up/down gently
    const t = helpers.state.hypoSquare.t;
    const pulse = 1 + 0.05*Math.sin(scene.time.now/100 + Math.PI*2*t);
    this.hypoSquareObj.sprite.setScale(pulse);
  },

  // --- Drawing and updating moving hypotenuse square ---
  createHypoSquare(scene, helpers, t) {
    // Remove previous
    if (this.hypoSquareObj && this.hypoSquareObj.sprite) {
      this.hypoSquareObj.sprite.destroy();
    }

    const hs = helpers.state.hypoSquare;
    // Find new (x,y)
    const { x, y } = this.getHypoPoint(hs, t);

    // Main: draw the moving square at hypotenuse position, properly rotated
    const graphics = scene.add.graphics();
    graphics.setDepth(3);
    const half = hs.side / 2;
    graphics.fillStyle(hs.color, 1);
    graphics.save();
    graphics.translate(x, y);
    graphics.rotate(hs.hypoAngle);

    // Adaptive color: fading to cyan based on placement accuracy
    let matchRatio = this.areaMatchRatio(scene, helpers, t);
    const yellow = Phaser.Display.Color.IntegerToColor(0xf9e942);
    const cyan = Phaser.Display.Color.IntegerToColor(0x41e7f7);
    const interpCol = Phaser.Display.Color.Interpolate.ColorWithColor(
      yellow, cyan, 1, Math.min(1, matchRatio)
    );
    const interp = Phaser.Display.Color.GetColor(interpCol.r, interpCol.g, interpCol.b);

    graphics.fillStyle(interp, 1);
    graphics.fillRect(-half, -half, hs.side, hs.side);

    graphics.restore();

    // Outline for visual feedback
    graphics.lineStyle(5, 0xffffff, 0.42);
    graphics.strokeRect(x - half, y - half, hs.side, hs.side);

    this.hypoSquareObj.sprite = graphics;
    this.hypoSquareObj.group.add(graphics);
  },

  updateHypoSquare(scene, helpers, t) {
    helpers.state.hypoSquare.t = t;
    this.createHypoSquare(scene, helpers, t);
  },

  getHypoPoint(hs, t) {
    // Linear interpolation
    return {
      x: hs.hypoStart.x + (hs.hypoEnd.x - hs.hypoStart.x) * t,
      y: hs.hypoStart.y + (hs.hypoEnd.y - hs.hypoStart.y) * t
    };
  },

  // --- Square on triangle edges ---
  drawSquareOnEdge(scene, from, to, side, color, alpha, outlineOnly, fadeAlpha) {
    // Make square start at 'from' and extend in correct direction
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    // Construct corner points of square, rotated correctly
    // Square is attached with one edge on the triangle
    const cx = (from.x + to.x) / 2;
    const cy = (from.y + to.y) / 2;
    const half = side / 2;
    const rot = angle;

    const graphics = scene.add.graphics();
    graphics.setDepth(1);
    graphics.save();
    graphics.translate(cx, cy);
    graphics.rotate(rot);
    if (!outlineOnly) {
      graphics.fillStyle(color, alpha);
      graphics.fillRect(-half, -half, side, side);
    }
    graphics.lineStyle(4, color, typeof fadeAlpha === "number" ? fadeAlpha : 0.59);
    graphics.strokeRect(-half, -half, side, side);
    graphics.restore();

    return { graphics, cx, cy, rot };
  },

  // --- Snapping/match area logic ---
  snapHypoSquare(scene, helpers) {
    if (helpers.state.gameOver || helpers.state.transitioning) return;
    const hs = helpers.state.hypoSquare;
    if (hs.state !== "Moving") return;
    hs.state = "Snapped";
    this.holdActive = false;
    if (this.hypoSquareObj.sprite) this.hypoSquareObj.sprite.setScale(1);

    // Check: is hypo square area close (within tolerance)?
    const a = helpers.state.triangle.a, b = helpers.state.triangle.b, c = helpers.state.triangle.c;

    // Required: hypo square should occupy the exact (a^2 + b^2) area on c^2
    // We'll infer mapped Ratio via t (proportional across hypo)
    let snappedT = hs.t;
    let projectedArea = c*c * snappedT*snappedT;
    let targetArea = a*a + b*b;
    let match = Math.abs(projectedArea - targetArea) / targetArea < helpers.state.validSnapDelta;

    // Feedback: color, outline, etc
    this.highlightHypoSquare(scene, helpers, match);

    // Visual feedback: leg squares pulse green on match
    if (match) {
      this.pulseSquare(scene, this.triangleElements.baseSquare.graphics, 0x1cf971);
      this.pulseSquare(scene, this.triangleElements.altSquare.graphics, 0x1cf971);

      // Triangle edges pulse green
      this.pulseEdge(scene, this.triangleElements.baseEdge, 0x1cf971);
      this.pulseEdge(scene, this.triangleElements.altEdge, 0x1cf971);
      this.pulseEdge(scene, this.triangleElements.hypoEdge, 0x1cf971);

      // Cyan dot glows
      this.cyanDotPulseAnim(scene, helpers, 1);

      // Hypotenuse square flashes cyan
      this.hypoSquarePulseAnim(scene, helpers, 0x41e7f7);

      // Level up (after short delay)
      this.transitionToNext(scene, helpers);

      // Speed bonus: quick snap = purple flash, else normal green
      if (scene.time.now - helpers.state.startSnapTime < helpers.state.fastSnapThreshold) {
        this.triangleFlash(scene, 0xd042f9);
        this.ui.infoText.setColor("#9808da");
        this.ui.infoText.setText("FAST!\nArea matched\n" + "Level Up!");
        scene.sound.play("pop", {volume:0.16});
      } else {
        this.triangleFlash(scene, 0x1cf971);
        this.ui.infoText.setColor("#39f970");
        this.ui.infoText.setText("Area matched!\nGreat job!\nLevel Up!");
        scene.sound.play("snap", {volume:0.16});
      }

      helpers.state.level += 1;
      helpers.state.speed = Math.min(420, helpers.state.speed * 1.11 + 9);
    } else {
      // Fail: triangle/square flash red, triangle breaks
      this.failAnimation(scene, helpers);
      this.ui.infoText.setColor("#ea1b24");
      this.ui.infoText.setText("Missed!\nTry again.");
      scene.sound.play("fail", {volume:0.18});
    }
  },

  calcGridSnapT(curT, snapSteps) {
    // snapSteps: number of possible grid 'segments' along hypotenuse
    // snap to nearest
    const snapped = Math.round(curT * snapSteps) / snapSteps;
    return Phaser.Math.Clamp(snapped, 0, 1);
  },

  areaMatchRatio(scene, helpers, t) {
    // 0 = start, 1 = perfect match, >1 = overshoot
    const a = helpers.state.triangle.a, b = helpers.state.triangle.b, c = helpers.state.triangle.c;
    const area = c*c * t*t;
    const total = a*a + b*b;
    return Math.min(1, area / total);
  },

  highlightHypoSquare(scene, helpers, matched) {
    if (!this.hypoSquareObj.sprite) return;
    // Outline and color pulse
    if (matched) {
      this.hypoSquareObj.sprite.setBlendMode("ADD");
      // Replace fill color to cyan
      this.hypoSquareObj.sprite.clear();
      const hs = helpers.state.hypoSquare;
      const { x, y } = this.getHypoPoint(hs, hs.t);
      const half = hs.side / 2;

      this.hypoSquareObj.sprite.save();
      this.hypoSquareObj.sprite.translate(x, y);
      this.hypoSquareObj.sprite.rotate(hs.hypoAngle);
      this.hypoSquareObj.sprite.fillStyle(0x41e7f7, 1);
      this.hypoSquareObj.sprite.fillRect(-half, -half, hs.side, hs.side);
      this.hypoSquareObj.sprite.restore();
      // Outline
      this.hypoSquareObj.sprite.lineStyle(8, 0xffffff, 1);
      this.hypoSquareObj.sprite.strokeRect(x - half, y - half, hs.side, hs.side);
    } else {
      // Flash red
      this.hypoSquareObj.sprite.setBlendMode("SCREEN");
      this.hypoSquareObj.sprite.lineStyle(7, 0xfe1c38, 1);
      this.hypoSquareObj.sprite.strokeRectShape(new Phaser.Geom.Rectangle(
        this.hypoSquareObj.sprite.x, this.hypoSquareObj.sprite.y, 
        helpers.state.hypoSquare.side, helpers.state.hypoSquare.side
      ));
    }
  },

  pulseSquare(scene, graphics, color) {
    // Animate: pulse fill/outline
    scene.tweens.add({
      targets: graphics,
      alpha: { from: 1, to: 0.38 },
      duration: 170, yoyo: true, repeat: 2,
      onYoyo: () => {
        graphics.setAlpha(0.9);
      },
      onComplete: () => {
        graphics.setAlpha(1);
      }
    });
    graphics.lineStyle(6, color, 0.72);
    graphics.strokePath();
  },

  pulseEdge(scene, edge, color) {
    edge.setStrokeStyle(13, color, 0.93);
    scene.tweens.add({
      targets: edge,
      alpha: {from:1, to:0.6},
      duration:128,
      yoyo:true,
      repeat:1,
      onComplete:()=>{
        edge.setStrokeStyle(7, color, 0.72);
        edge.setAlpha(1);
      }
    });
  },

  cyanDotPulseAnim(scene, helpers, isGlow) {
    const dot = this.triangleElements.cyanDot;
    if (!dot) return;
    // Animate briefly
    scene.tweens.add({
      targets: dot,
      scale: {from:1, to:1.22},
      alpha: {from:1, to:1.06},
      duration: 190,
      yoyo: true,
      repeat: 0,
      onYoyo: ()=>{dot.setAlpha(1)},
      onComplete:()=>{
        dot.setScale(1);
        dot.setAlpha(1);
      }
    });
    dot.setStrokeStyle(7, isGlow ? 0x64ffe9 : 0x00d1b8, 1);
    scene.time.delayedCall(190, ()=>{
      dot.setStrokeStyle(4, 0x00d1b8, 1);
    });
  },

  hypoSquarePulseAnim(scene, helpers, color) {
    if (!this.hypoSquareObj.sprite) return;
    scene.tweens.add({
      targets: this.hypoSquareObj.sprite,
      alpha: {from:1, to:0.6},
      duration:125,
      yoyo:true,
      repeat:2,
      onYoyo: ()=>this.hypoSquareObj.sprite.setAlpha(1),
      onComplete:()=>{this.hypoSquareObj.sprite.setAlpha(1);}
    });
  },

  triangleFlash(scene, color) {
    this.triangleElements.tri.setFillStyle(color, 0.18);
    scene.tweens.add({
      targets: this.triangleElements.tri,
      alpha: {from:0.55, to:0.11},
      duration: 220,
      yoyo: true,
      repeat: 0,
      onComplete: ()=>{
        this.triangleElements.tri.setAlpha(0.08);
        this.triangleElements.tri.setFillStyle(0x222a34, 0.08);
      }
    });
  },

  transitionToNext(scene, helpers) {
    helpers.state.transitioning = true;
    scene.time.delayedCall(1050, () => {
      this.startLevel(scene, helpers);
    });
  },

  // --- Game over/failure design ---
  failAnimation(scene, helpers) {
    helpers.state.gameOver = true;
    // Red flash all shapes
    this.triangleElements.tri.setFillStyle(0xfe1c38, 0.22);
    // All edges
    this.triangleElements.baseEdge.setStrokeStyle(15,0xfe1c38,0.73);
    this.triangleElements.altEdge.setStrokeStyle(15,0xfe1c38,0.73);
    this.triangleElements.hypoEdge.setStrokeStyle(15,0xfe1c38,0.73);
    // Squares
    this.triangleElements.baseSquare.graphics.lineStyle(8,0xfe1c38,1);
    this.triangleElements.baseSquare.graphics.strokePath();
    this.triangleElements.altSquare.graphics.lineStyle(8,0xfe1c38,1);
    this.triangleElements.altSquare.graphics.strokePath();
    // Dot
    this.triangleElements.cyanDot.setFillStyle(0xb30b0b);

    // Hypotenuse square
    if (this.hypoSquareObj && this.hypoSquareObj.sprite) {
      this.hypoSquareObj.sprite.clear();
      this.hypoSquareObj.sprite.lineStyle(10,0xfe1c38,1);
      // We'll flash it for effect
    }

    // Triangle collapse: break into lines
    scene.time.delayedCall(340, ()=>{
      this.breakdownTriangleAnim(scene, helpers);
      if (scene.sound) scene.sound.play("fail",{volume:.17});
      // Game over text
      this.ui.infoText.setColor("#fe1c38");
      this.ui.infoText.setText("SNAP! Area mismatched\nClick to restart.");
    });
    scene.input.once("pointerdown", ()=>helpers.switchCartridge(this));
  },

  breakdownTriangleAnim(scene, helpers) {
    // Animate lines spreading
    const V = helpers.state.triangle.verts;
    const lines = [
      scene.add.line(0,0,V[0].x,V[0].y,V[1].x,V[1].y,0xfe1c38,1).setOrigin(0),
      scene.add.line(0,0,V[0].x,V[0].y,V[2].x,V[2].y,0xfe1c38,1).setOrigin(0),
      scene.add.line(0,0,V[2].x,V[2].y,V[1].x,V[1].y,0xfe1c38,1).setOrigin(0)
    ];
    lines.forEach(ln=>{
      ln.setLineWidth(10);
      scene.tweens.add({
        targets: ln,
        x: {from:0, to:(Math.random()*60-30)},
        y: {from:0, to:(Math.random()*60-30)},
        alpha: {from:1, to:0},
        duration: 550,
        delay: Math.random()*130,
        onComplete: ()=>ln.destroy()
      });
    });
    this.triangleElements.tri.setAlpha(0);
    this.triangleElements.baseEdge.setAlpha(0);
    this.triangleElements.altEdge.setAlpha(0);
    this.triangleElements.hypoEdge.setAlpha(0);
    this.triangleElements.baseSquare.graphics.setAlpha(0);
    this.triangleElements.altSquare.graphics.setAlpha(0);
    this.triangleElements.hypoRefSquare.graphics.setAlpha(0);
    this.triangleElements.cyanDot.setAlpha(0);
    if (this.hypoSquareObj.sprite) this.hypoSquareObj.sprite.setAlpha(0);
  },

  stopFlash(scene, helpers) {
    helpers.state.flashColor = null;
    helpers.state.flashTimer = null;
    if (this.triangleElements && this.triangleElements.tri) {
      this.triangleElements.tri.setFillStyle(0x222a34, 0.08);
    }
  }
};