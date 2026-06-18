const STORAGE_KEY = "neon_core_best_score_v5";

let gameState = "menu"; // menu, playing, paused, gameover

let score = 0;
let bestScore = 0;
let lives = 3;
let wave = 1;
let survivalTime = 0;

let combo = 0;
let comboTimer = 0;

let shieldTimer = 0;
let slowTimer = 0;
let magnetTimer = 0;
let rapidTimer = 0;
let invulnTimer = 0;

let spawnClock = 0;
let enemySpawned = 0;
let enemyQuota = 0;
let enemySpawnInterval = 0.95;

let ambientLootClock = 0;
let ambientLootInterval = 2.4;

let bossIntroTimer = 0;
let transitionTimer = 0;
let advanceAfterTransition = false;
let bossWave = false;

let centerMessageText = "";
let centerMessageTimer = 0;

let shootCooldown = 0;

let flashAlpha = 0;
let shake = 0;
let ringPulse = 0;

let player;
let boss = null;

let stars = [];
let particles = [];
let pickups = [];
let hazards = [];
let powerups = [];
let bullets = [];
let enemyShots = [];

const HUD = {
  topBarH: 88,
  footerH: 60
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  angleMode(RADIANS);
  textAlign(CENTER, CENTER);
  loadBestScore();
  initStars();
  resetRun();
  gameState = "menu";
}

function loadBestScore() {
  try {
    bestScore = Number(localStorage.getItem(STORAGE_KEY) || 0);
  } catch (e) {
    bestScore = 0;
  }
}

function saveBestScore() {
  try {
    localStorage.setItem(STORAGE_KEY, String(bestScore));
  } catch (e) {}
}

function initStars() {
  stars = [];
  const total = Math.floor((windowWidth * windowHeight) / 9000) + 120;
  for (let i = 0; i < total; i++) {
    stars.push({
      x: random(width),
      y: random(height),
      r: random(0.6, 2.1),
      speed: random(0.08, 0.55),
      phase: random(TWO_PI)
    });
  }
}

function resetRun() {
  score = 0;
  lives = 3;
  wave = 1;
  survivalTime = 0;

  combo = 0;
  comboTimer = 0;

  shieldTimer = 0;
  slowTimer = 0;
  magnetTimer = 0;
  rapidTimer = 0;
  invulnTimer = 0;

  spawnClock = 0;
  enemySpawned = 0;
  enemyQuota = 0;
  enemySpawnInterval = 0.95;

  ambientLootClock = 0;
  ambientLootInterval = 2.4;

  bossIntroTimer = 0;
  transitionTimer = 0;
  advanceAfterTransition = false;
  bossWave = false;

  centerMessageText = "";
  centerMessageTimer = 0;

  shootCooldown = 0;
  flashAlpha = 0;
  shake = 0;
  ringPulse = 0;

  pickups = [];
  hazards = [];
  powerups = [];
  bullets = [];
  enemyShots = [];
  particles = [];
  boss = null;

  player = {
    pos: createVector(width * 0.5, height * 0.62),
    vel: createVector(0, 0),
    r: 18,
    trail: [],
    aim: createVector(0, -1)
  };
}

function startGame() {
  resetRun();
  startWave();
  gameState = "playing";
}

function startWave() {
  bossWave = wave % 5 === 0;
  enemySpawned = 0;
  spawnClock = 0;
  ambientLootClock = 0;

  if (bossWave) {
    enemyQuota = 0;
    bossIntroTimer = 1.2;
    setCenterMessage(`JEFE - OLEADA ${wave}`, 1.5);
  } else {
    enemyQuota = 6 + wave * 3;
    enemySpawnInterval = max(0.33, 0.95 - wave * 0.05);
    bossIntroTimer = 0;
    setCenterMessage(`OLEADA ${wave}`, 1.0);
  }
}

function draw() {
  const dt = min(deltaTime, 33) / 1000;

  updateStars(dt);
  drawBackground();

  if (gameState === "menu") {
    drawMenuScreen();
    drawGlobalEffects();
    return;
  }

  if (gameState === "playing") {
    updateGame(dt);
    drawGame();
  } else if (gameState === "paused") {
    drawGame();
    drawPauseOverlay();
  } else if (gameState === "gameover") {
    drawGame();
    drawGameOverOverlay();
  }

  drawGlobalEffects();
}

function updateStars(dt) {
  for (const s of stars) {
    s.y += s.speed * 60 * dt;
    s.phase += 1.3 * dt;
    if (s.y > height + 10) {
      s.y = -10;
      s.x = random(width);
    }
  }
}

function drawBackground() {
  background(6, 10, 24);

  noStroke();
  for (const s of stars) {
    const alpha = 100 + 90 * sin(s.phase);
    fill(180, 210, 255, alpha);
    circle(s.x, s.y, s.r * 2);
  }

  fill(60, 120, 255, 20);
  circle(width * 0.18, height * 0.18, min(width, height) * 0.72);
  fill(0, 255, 200, 12);
  circle(width * 0.82, height * 0.78, min(width, height) * 0.68);
  fill(100, 180, 255, 12);
  circle(width * 0.5, height * 0.18, min(width, height) * 0.34 + 120 + 20 * sin(frameCount * 0.012));
  circle(width * 0.5, height * 0.82, min(width, height) * 0.28 + 80 + 20 * cos(frameCount * 0.01));
}

function updateGame(dt) {
  survivalTime += dt;

  if (score > bestScore) {
    bestScore = score;
    saveBestScore();
  }

  if (centerMessageTimer > 0) centerMessageTimer = max(0, centerMessageTimer - dt);
  if (comboTimer > 0) comboTimer = max(0, comboTimer - dt);
  else combo = 0;

  if (shieldTimer > 0) shieldTimer = max(0, shieldTimer - dt);
  if (slowTimer > 0) slowTimer = max(0, slowTimer - dt);
  if (magnetTimer > 0) magnetTimer = max(0, magnetTimer - dt);
  if (rapidTimer > 0) rapidTimer = max(0, rapidTimer - dt);
  if (invulnTimer > 0) invulnTimer = max(0, invulnTimer - dt);

  if (flashAlpha > 0) flashAlpha = max(0, flashAlpha - 160 * dt);
  if (shake > 0) shake *= pow(0.08, dt);
  if (shootCooldown > 0) shootCooldown = max(0, shootCooldown - dt);
  if (ringPulse > 0) ringPulse = max(0, ringPulse - 20 * dt);

  updatePlayer(dt);
  updateTransition(dt);
  updateBossIntro(dt);

  if (transitionTimer <= 0 && bossIntroTimer <= 0) {
    if (!boss) {
      updateWaveSpawns(dt);
      updateAmbientLoot(dt);
    }
  }

  updatePickups(dt);
  updatePowerups(dt);
  updateBullets(dt);
  updateHazards(dt);
  updateEnemyShots(dt);
  updateBoss(dt);
  updateParticles(dt);

  if (!boss && !bossWave && transitionTimer <= 0 && bossIntroTimer <= 0 && enemySpawned >= enemyQuota && hazards.length === 0 && enemyShots.length === 0) {
    beginTransition("OLEADA LIMPIA", 1.15, true);
    score += wave * 20;
    setCenterMessage("OLEADA LIMPIA", 1.0);
  }

  if (boss && boss.hp <= 0) {
    defeatBoss();
  }
}

function updatePlayer(dt) {
  const input = createVector(0, 0);

  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) input.x -= 1;
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) input.x += 1;
  if (keyIsDown(UP_ARROW) || keyIsDown(87)) input.y -= 1;
  if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) input.y += 1;

  const maxSpeed = 320 + wave * 4;
  const lerpAmount = min(1, 9 * dt);

  if (input.magSq() > 0) {
    input.normalize().mult(maxSpeed);
    player.aim = input.copy().normalize();
  }

  player.vel.lerp(input, lerpAmount);
  player.pos.add(p5.Vector.mult(player.vel, dt));

  const pad = player.r + 10;
  player.pos.x = constrain(player.pos.x, pad, width - pad);
  player.pos.y = constrain(player.pos.y, pad + HUD.topBarH * 0.1, height - pad - HUD.footerH * 0.2);

  player.trail.unshift(player.pos.copy());
  if (player.trail.length > 16) player.trail.pop();

  const firing = keyIsDown(32) || mouseIsPressed;
  if (firing && transitionTimer <= 0 && bossIntroTimer <= 0 && gameState === "playing") {
    attemptShoot(mouseX, mouseY);
  }
}

function updateWaveSpawns(dt) {
  if (enemySpawned < enemyQuota) {
    spawnClock += dt;
    if (spawnClock >= enemySpawnInterval) {
      spawnClock = 0;
      spawnEnemy();
      enemySpawned++;
    }
  }
}

function updateAmbientLoot(dt) {
  ambientLootClock += dt;
  if (ambientLootClock >= ambientLootInterval) {
    ambientLootClock = 0;
    if (pickups.length < 10) {
      if (random() < 0.78) spawnPickup();
      else spawnPowerup();
    }
  }
}

function updateTransition(dt) {
  if (transitionTimer > 0) {
    transitionTimer = max(0, transitionTimer - dt);
    if (transitionTimer <= 0 && advanceAfterTransition) {
      advanceAfterTransition = false;
      wave++;
      startWave();
    }
  }
}

function updateBossIntro(dt) {
  if (bossIntroTimer > 0) {
    bossIntroTimer = max(0, bossIntroTimer - dt);
    if (bossIntroTimer <= 0 && bossWave && !boss) {
      spawnBoss();
    }
  }
}

function spawnFromEdge() {
  const edge = floor(random(4));
  let x, y;
  if (edge === 0) { x = random(width); y = -30; }
  if (edge === 1) { x = width + 30; y = random(height); }
  if (edge === 2) { x = random(width); y = height + 30; }
  if (edge === 3) { x = -30; y = random(height); }
  return createVector(x, y);
}

function spawnEnemy() {
  const origin = spawnFromEdge();
  const dir = p5.Vector.sub(player.pos, origin).normalize();
  const roll = random();

  let type = "seeker";
  if (roll > 0.68) type = "dash";
  else if (roll > 0.35) type = "heavy";

  const enemy = {
    type,
    pos: origin,
    vel: createVector(0, 0),
    r: type === "heavy" ? random(30, 42) : type === "dash" ? random(16, 22) : random(18, 30),
    spin: random(TWO_PI),
    spinSpeed: random(-0.08, 0.08),
    wobble: random(TWO_PI),
    hp: type === "heavy" ? 2 : 1
  };

  const speed = type === "heavy"
    ? 85 + wave * 3
    : type === "dash"
      ? 210 + wave * 8
      : 130 + wave * 5;

  enemy.vel = dir.mult(speed);
  hazards.push(enemy);
}

function spawnPickup() {
  const origin = spawnFromEdge();
  const dir = p5.Vector.sub(player.pos, origin).normalize();
  pickups.push({
    pos: origin,
    vel: dir.mult(95 + wave * 2),
    r: random(12, 18),
    spin: random(TWO_PI),
    spinSpeed: random(-0.06, 0.06),
    sides: floor(random(5, 8))
  });
}

function spawnPowerup() {
  const origin = spawnFromEdge();
  const dir = p5.Vector.sub(player.pos, origin).normalize();
  const kinds = ["shield", "slow", "magnet", "rapid"];
  const kind = random(kinds);

  powerups.push({
    kind,
    pos: origin,
    vel: dir.mult(85 + wave * 2),
    r: 14,
    spin: random(TWO_PI),
    spinSpeed: random(-0.06, 0.06),
    life: 900
  });
}

function updatePickups(dt) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];

    if (magnetTimer > 0) {
      const d = p5.Vector.dist(player.pos, p.pos);
      if (d < 240) {
        const pull = p5.Vector.sub(player.pos, p.pos).normalize().mult((240 - d) * 2.4);
        p.vel.add(pull.mult(dt));
      }
    }

    p.pos.add(p5.Vector.mult(p.vel, dt));
    p.spin += 0.05 * dt;

    if (outOfBounds(p.pos, 100)) {
      pickups.splice(i, 1);
      continue;
    }

    if (p5.Vector.dist(player.pos, p.pos) < player.r + p.r) {
      combo = min(combo + 1, 12);
      comboTimer = 2.6;
      const comboBoost = 1 + combo * 0.1;
      const gain = floor(10 * comboBoost);
      score += gain;
      setPulse(18);
      flashAlpha = max(flashAlpha, 22);
      addParticles(p.pos.x, p.pos.y, color(90, 240, 255), 14 + combo);
      pickups.splice(i, 1);
    }
  }
}

function updatePowerups(dt) {
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    p.pos.add(p5.Vector.mult(p.vel, dt));
    p.spin += 0.04 * dt;
    p.life -= dt * 60;

    if (p.life <= 0 || outOfBounds(p.pos, 120)) {
      powerups.splice(i, 1);
      continue;
    }

    if (p5.Vector.dist(player.pos, p.pos) < player.r + p.r) {
      applyPowerup(p.kind);
      burst(p.pos.x, p.pos.y, p.kind === "shield" ? color(90, 255, 170) : p.kind === "slow" ? color(130, 145, 255) : color(255, 220, 90), 18);
      powerups.splice(i, 1);
    }
  }
}

function applyPowerup(kind) {
  if (kind === "shield") {
    shieldTimer = 6.5;
    setCenterMessage("ESCUDO ACTIVO", 0.9);
    flashAlpha = max(flashAlpha, 35);
  } else if (kind === "slow") {
    slowTimer = 4.2;
    setCenterMessage("TIEMPO LENTO", 0.9);
  } else if (kind === "magnet") {
    magnetTimer = 6.0;
    setCenterMessage("IMÁN ACTIVO", 0.9);
  } else if (kind === "rapid") {
    rapidTimer = 6.0;
    setCenterMessage("DISPARO RÁPIDO", 0.9);
  }
}

function getAimVector(tx, ty) {
  if (typeof tx !== "number" || typeof ty !== "number" || !isFinite(tx) || !isFinite(ty)) {
    return player.aim.copy();
  }
  const aim = createVector(tx - player.pos.x, ty - player.pos.y);
  if (aim.magSq() < 0.0001) return player.aim.copy();
  return aim.normalize();
}

function attemptShoot(tx, ty) {
  if (shootCooldown > 0 || gameState !== "playing") return;

  const aim = getAimVector(tx, ty);
  player.aim = aim.copy();

  const bulletSpeed = 760;
  const start = player.pos.copy().add(aim.copy().mult(player.r + 6));

  bullets.push({
    pos: start,
    vel: aim.mult(bulletSpeed),
    r: 5,
    life: 1.6,
    damage: 1
  });

  shootCooldown = rapidTimer > 0 ? 0.09 : 0.18;
  flashAlpha = max(flashAlpha, 14);
  addParticles(start.x, start.y, color(255, 255, 255), 3);
}

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.pos.add(p5.Vector.mult(b.vel, dt));
    b.life -= dt;

    if (b.life <= 0 || outOfBounds(b.pos, 40)) {
      bullets.splice(i, 1);
      continue;
    }

    let removed = false;

    for (let j = hazards.length - 1; j >= 0; j--) {
      const h = hazards[j];
      if (p5.Vector.dist(b.pos, h.pos) < b.r + h.r) {
        h.hp -= b.damage;
        bullets.splice(i, 1);
        removed = true;

        addParticles(h.pos.x, h.pos.y, color(255, 120, 170), 10);
        flashAlpha = max(flashAlpha, 10);

        if (h.hp <= 0) {
          hazards.splice(j, 1);
          score += 10 + wave * 2 + (h.type === "heavy" ? 12 : 0);
          combo = min(combo + 1, 12);
          comboTimer = 2.4;
          setPulse(10);
          maybeDropLoot(h.pos.x, h.pos.y);
          burst(h.pos.x, h.pos.y, color(255, 90, 120), h.type === "heavy" ? 28 : 18);
        }

        break;
      }
    }

    if (removed) continue;

    if (boss && p5.Vector.dist(b.pos, boss.pos) < b.r + boss.r) {
      boss.hp -= 10;
      boss.flashTimer = 0.12;
      bullets.splice(i, 1);
      addParticles(boss.pos.x, boss.pos.y, color(255, 255, 255), 12);
      burst(boss.pos.x, boss.pos.y, color(255, 90, 200), 14);
      continue;
    }
  }
}

function maybeDropLoot(x, y) {
  if (random() < 0.9 && pickups.length < 16) {
    pickups.push({
      pos: createVector(x, y),
      vel: p5.Vector.random2D().mult(random(55, 120)),
      r: random(11, 16),
      spin: random(TWO_PI),
      spinSpeed: random(-0.08, 0.08),
      sides: floor(random(5, 8))
    });
  }

  if (random() < 0.14 && powerups.length < 6) {
    const kinds = ["shield", "slow", "magnet", "rapid"];
    powerups.push({
      kind: random(kinds),
      pos: createVector(x, y),
      vel: p5.Vector.random2D().mult(random(40, 90)),
      r: 14,
      spin: random(TWO_PI),
      spinSpeed: random(-0.06, 0.06),
      life: 480
    });
  }
}

function updateHazards(dt) {
  const slowFactor = slowTimer > 0 ? 0.58 : 1;

  for (let i = hazards.length - 1; i >= 0; i--) {
    const h = hazards[i];
    h.spin += (h.type === "heavy" ? 0.6 : 2.2) * dt;
    h.wobble += 2.4 * dt;

    const toPlayer = p5.Vector.sub(player.pos, h.pos);
    const distToPlayer = toPlayer.mag();
    const dir = toPlayer.copy().normalize();

    if (h.type === "seeker") {
      h.vel.lerp(dir.mult((145 + wave * 6) * slowFactor), min(1, 2.2 * dt));
    } else if (h.type === "dash") {
      const boost = dir.mult((260 + wave * 9) * slowFactor);
      h.vel.lerp(boost, min(1, 3.8 * dt));
      h.vel.add(createVector(cos(frameCount * 0.08 + h.wobble), sin(frameCount * 0.07 + h.wobble)).mult(14 * dt));
    } else if (h.type === "heavy") {
      const heavyPull = dir.mult((95 + wave * 4) * slowFactor);
      h.vel.lerp(heavyPull, min(1, 1.4 * dt));
      h.vel.add(createVector(sin(h.wobble), cos(h.wobble * 1.1)).mult(8 * dt));
    }

    h.pos.add(p5.Vector.mult(h.vel, dt));

    if (outOfBounds(h.pos, 140)) {
      hazards.splice(i, 1);
      continue;
    }

    if (p5.Vector.dist(player.pos, h.pos) < player.r + h.r * 0.9) {
      if (shieldTimer <= 0 && invulnTimer <= 0) {
        damagePlayer(h.pos.x, h.pos.y);
      } else {
        addParticles(h.pos.x, h.pos.y, color(90, 255, 170), 12);
      }
      hazards.splice(i, 1);
      continue;
    }
  }
}

function updateEnemyShots(dt) {
  for (let i = enemyShots.length - 1; i >= 0; i--) {
    const s = enemyShots[i];
    s.pos.add(p5.Vector.mult(s.vel, dt));
    s.spin += s.spinSpeed * dt;
    s.life -= dt;

    if (s.life <= 0 || outOfBounds(s.pos, 120)) {
      enemyShots.splice(i, 1);
      continue;
    }

    if (p5.Vector.dist(player.pos, s.pos) < player.r + s.r) {
      if (shieldTimer <= 0 && invulnTimer <= 0) {
        damagePlayer(s.pos.x, s.pos.y);
      } else {
        addParticles(s.pos.x, s.pos.y, color(90, 255, 170), 8);
      }
      enemyShots.splice(i, 1);
    }
  }
}

function damagePlayer(x, y) {
  lives -= 1;
  invulnTimer = 1.1;
  shake = 14;
  flashAlpha = max(flashAlpha, 75);
  combo = 0;
  comboTimer = 0;
  setPulse(24);
  addParticles(x, y, color(255, 90, 120), 24);
  burst(x, y, color(255, 90, 120), 18);

  if (lives <= 0) {
    gameState = "gameover";
    if (score > bestScore) {
      bestScore = score;
      saveBestScore();
    }
  }
}

function spawnBoss() {
  boss = {
    pos: createVector(width * 0.5, 110),
    r: 58,
    maxHp: 280 + wave * 35,
    hp: 280 + wave * 35,
    phase: 1,
    fireClock: 0,
    flashTimer: 0,
    moveClock: 0
  };
  setCenterMessage("¡JEFE!", 1.0);
}

function updateBoss(dt) {
  if (!boss) return;

  boss.flashTimer = max(0, boss.flashTimer - dt);
  boss.moveClock += dt;

  const pct = boss.hp / boss.maxHp;
  const newPhase = pct > 0.66 ? 1 : pct > 0.33 ? 2 : 3;
  if (newPhase !== boss.phase) {
    boss.phase = newPhase;
    setCenterMessage(`FASE ${boss.phase}`, 0.8);
    boss.fireClock = 0;
    flashAlpha = max(flashAlpha, 25);
  }

  const arena = min(width, height) * 0.34;
  const targetX = width * 0.5 + sin(boss.moveClock * (1.4 + boss.phase * 0.15)) * arena * 0.72;
  const targetY = 105 + sin(boss.moveClock * 0.9 + boss.phase) * (boss.phase === 3 ? 28 : 18);

  boss.pos.x = lerp(boss.pos.x, targetX, 0.05);
  boss.pos.y = lerp(boss.pos.y, targetY, 0.05);

  boss.fireClock += dt;
  const interval = boss.phase === 1 ? 1.45 : boss.phase === 2 ? 1.05 : 0.72;
  if (boss.fireClock >= interval) {
    boss.fireClock = 0;
    bossAttack();
  }

  if (p5.Vector.dist(player.pos, boss.pos) < player.r + boss.r) {
    if (shieldTimer <= 0 && invulnTimer <= 0) {
      damagePlayer(boss.pos.x, boss.pos.y);
    }
  }
}

function bossAttack() {
  if (!boss) return;

  const center = boss.pos.copy();

  if (boss.phase === 1) {
    radialShot(center, 10, 255, 90, 200, 250);
  } else if (boss.phase === 2) {
    radialShot(center, 12, 255, 160, 80, 280);
    aimedBurst(center, 3, 250, 7);
  } else if (boss.phase === 3) {
    radialShot(center, 16, 255, 110, 240, 320);
    aimedBurst(center, 5, 290, 10);
    radialShot(center, 8, 130, 145, 255, 230, TWO_PI / 16);
  }
}

function radialShot(origin, count, r, g, b, speed, offset = 0) {
  for (let i = 0; i < count; i++) {
    const a = offset + TWO_PI * i / count;
    enemyShots.push(makeEnemyShot(origin.x, origin.y, cos(a) * speed, sin(a) * speed, color(r, g, b), 10));
  }
}

function aimedBurst(origin, count, speed, spread) {
  const aim = p5.Vector.sub(player.pos, origin).normalize();
  const baseAngle = aim.heading();
  for (let i = 0; i < count; i++) {
    const a = baseAngle + map(i, 0, count - 1, -spread, spread);
    const dir = createVector(cos(a), sin(a)).mult(speed);
    enemyShots.push(makeEnemyShot(origin.x, origin.y, dir.x, dir.y, color(255, 200, 90), 8));
  }
}

function makeEnemyShot(x, y, vx, vy, col, size = 8) {
  return {
    pos: createVector(x, y),
    vel: createVector(vx, vy),
    r: size,
    col,
    life: 6,
    spin: random(TWO_PI),
    spinSpeed: random(-0.05, 0.05)
  };
}

function defeatBoss() {
  addParticles(boss.pos.x, boss.pos.y, color(255, 255, 255), 40);
  burst(boss.pos.x, boss.pos.y, color(255, 220, 90), 60);
  score += 180 + wave * 40;
  boss = null;
  enemyShots = [];
  hazards = [];
  setCenterMessage("JEFE DERROTADO", 1.2);
  beginTransition("SIGUIENTE OLEADA", 1.8, true);
}

function beginTransition(text, seconds, advance) {
  transitionTimer = seconds;
  advanceAfterTransition = advance;
  setCenterMessage(text, seconds);
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.pos.add(p5.Vector.mult(pt.vel, dt));
    pt.vel.mult(pow(0.93, dt * 60));
    pt.life -= 2.3 * dt * 60;
    pt.size *= pow(0.985, dt * 60);
    if (pt.life <= 0) particles.splice(i, 1);
  }
}

function addParticles(x, y, col, amount = 20) {
  for (let i = 0; i < amount; i++) {
    particles.push({
      pos: createVector(x, y),
      vel: p5.Vector.random2D().mult(random(35, 220)),
      size: random(3, 10),
      life: random(35, 90),
      col
    });
  }
}

function burst(x, y, col, amount = 18) {
  addParticles(x, y, col, amount);
}

function setPulse(amount) {
  ringPulse = max(ringPulse, amount);
}

function drawGame() {
  push();
  if (shake > 0.05) translate(random(-shake, shake), random(-shake, shake));

  drawArena();
  drawObjects();
  drawPlayer();
  drawBullets();
  drawEnemyShots();
  drawBoss();
  drawHUD();
  drawParticles();

  if (centerMessageTimer > 0) drawCenterMessage();

  pop();
}

function drawArena() {
  push();
  translate(width / 2, height / 2);
  rotate(frameCount * 0.004);

  noFill();
  const outerR = min(width, height) * 0.38;

  stroke(80, 150, 255, 50);
  strokeWeight(4);
  circle(0, 0, outerR * 2);

  stroke(80, 240, 255, 90);
  strokeWeight(2);
  circle(0, 0, outerR * 1.5);

  stroke(255, 255, 255, 18);
  for (let i = 0; i < 24; i++) {
    const a = TWO_PI * i / 24 + frameCount * 0.005;
    const x1 = cos(a) * outerR * 0.95;
    const y1 = sin(a) * outerR * 0.95;
    const x2 = cos(a) * outerR * 1.08;
    const y2 = sin(a) * outerR * 1.08;
    line(x1, y1, x2, y2);
  }

  stroke(60, 120, 255, 30);
  strokeWeight(1);
  for (let i = -4; i <= 4; i++) {
    line(-outerR * 0.95, i * outerR * 0.22, outerR * 0.95, i * outerR * 0.22);
    line(i * outerR * 0.22, -outerR * 0.95, i * outerR * 0.22, outerR * 0.95);
  }
  pop();
}

function drawObjects() {
  for (const p of pickups) drawPickup(p);
  for (const h of hazards) drawHazard(h);
  for (const p of powerups) drawPowerup(p);
}

function drawPickup(p) {
  push();
  translate(p.pos.x, p.pos.y);
  rotate(p.spin);
  noStroke();
  fill(90, 240, 255, 28);
  circle(0, 0, p.r * 3.2);
  fill(90, 240, 255);
  beginShape();
  for (let i = 0; i < p.sides; i++) {
    const a = TWO_PI * i / p.sides;
    vertex(cos(a) * p.r, sin(a) * p.r);
  }
  endShape(CLOSE);
  fill(255);
  circle(0, 0, p.r * 0.58);
  pop();
}

function drawHazard(h) {
  push();
  translate(h.pos.x, h.pos.y);
  rotate(h.spin);
  noStroke();

  const col = h.type === "dash" ? color(255, 180, 70) : h.type === "heavy" ? color(180, 110, 255) : color(255, 90, 130);

  fill(red(col), green(col), blue(col), 34);
  circle(0, 0, h.r * 3.6);

  fill(col);
  beginShape();
  const sides = h.type === "heavy" ? 6 : h.type === "dash" ? 4 : 5;
  for (let i = 0; i < sides; i++) {
    const a = TWO_PI * i / sides + HALF_PI;
    const rr = i % 2 === 0 ? h.r : h.r * 0.56;
    vertex(cos(a) * rr, sin(a) * rr);
  }
  endShape(CLOSE);

  fill(22);
  circle(0, 0, h.r * 0.46);
  pop();
}

function drawPowerup(p) {
  push();
  translate(p.pos.x, p.pos.y);
  rotate(p.spin);
  noStroke();

  const core = p.kind === "shield"
    ? color(90, 255, 170)
    : p.kind === "slow"
      ? color(130, 145, 255)
      : color(255, 220, 90);

  fill(red(core), green(core), blue(core), 28);
  circle(0, 0, 54);

  fill(core);
  rectMode(CENTER);
  rect(0, 0, 22, 22, 6);
  fill(255);

  if (p.kind === "shield") {
    circle(0, 0, 7);
  } else if (p.kind === "slow") {
    triangle(-6, 4, 0, -8, 6, 4);
  } else if (p.kind === "magnet") {
    rect(0, 0, 6, 16, 2);
    rect(0, 0, 16, 6, 2);
  } else {
    rect(0, 0, 6, 16, 2);
    rect(0, 0, 16, 6, 2);
  }
  pop();
}

function drawPlayer() {
  push();
  translate(player.pos.x, player.pos.y);

  const blink = invulnTimer > 0 && frameCount % 8 < 4;

  noStroke();
  if (shieldTimer > 0) {
    const glow = 120 + 55 * sin(frameCount * 0.18);
    fill(80, 255, 170, 32);
    circle(0, 0, player.r * 5.2 + glow);
    fill(80, 255, 170, 16);
    circle(0, 0, player.r * 7.0 + glow * 0.7);
  }

  if (rapidTimer > 0) {
    fill(255, 220, 90, 20);
    circle(0, 0, player.r * 4.2);
  }

  fill(70, 240, 255, 40);
  circle(0, 0, player.r * 3.4);
  fill(70, 240, 255, 18);
  circle(0, 0, player.r * 5.6);

  if (!blink) {
    stroke(255);
    strokeWeight(2);
    fill(20, 220, 255);
    circle(0, 0, player.r * 2);

    noStroke();
    fill(255);
    triangle(-6, 4, 0, -8, 6, 4);

    noFill();
    stroke(255, 255, 255, 170);
    strokeWeight(1.6);
    circle(0, 0, player.r * 1.1);
  }
  pop();
}

function drawBullets() {
  for (const b of bullets) {
    push();
    translate(b.pos.x, b.pos.y);
    noStroke();
    fill(255, 255, 255, 60);
    circle(0, 0, b.r * 3);
    fill(90, 240, 255);
    circle(0, 0, b.r * 2);
    pop();
  }
}

function drawEnemyShots() {
  for (const s of enemyShots) {
    push();
    translate(s.pos.x, s.pos.y);
    rotate(s.spin);
    noStroke();
    fill(red(s.col), green(s.col), blue(s.col), 40);
    circle(0, 0, s.r * 3);
    fill(s.col);
    triangle(-s.r, s.r * 0.8, 0, -s.r * 1.1, s.r, s.r * 0.8);
    pop();
  }
}

function drawBoss() {
  if (!boss) return;

  push();
  translate(boss.pos.x, boss.pos.y);
  const f = boss.flashTimer > 0 ? 255 : 0;

  noStroke();
  fill(255, 80, 200, 30);
  circle(0, 0, boss.r * 3.6);

  fill(180 + f * 0.25, 80 + f * 0.15, 255 - f * 0.15);
  beginShape();
  const sides = 8;
  for (let i = 0; i < sides; i++) {
    const a = TWO_PI * i / sides + frameCount * 0.01;
    const rr = i % 2 === 0 ? boss.r : boss.r * 0.72;
    vertex(cos(a) * rr, sin(a) * rr);
  }
  endShape(CLOSE);

  fill(20);
  circle(0, 0, boss.r * 0.52);

  fill(255);
  circle(-boss.r * 0.22, -boss.r * 0.06, boss.r * 0.11);
  circle(boss.r * 0.22, -boss.r * 0.06, boss.r * 0.11);
  pop();
}

function drawHUD() {
  drawGlassPanel(10, 10, width - 20, HUD.topBarH, 20);

  push();
  fill(255);
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  textSize(16);
  text("Puntaje", 22, 18);
  textSize(26);
  text(score, 22, 36);

  fill(220);
  textStyle(NORMAL);
  textSize(13);
  text(`Récord: ${bestScore}`, 170, 18);
  text(`Supervivencia: ${formatTime(survivalTime)}`, 170, 36);
  text(`Oleada: ${wave}`, 170, 54);

  const chipW = min(132, max(92, (width - 280) / 3));
  const chipH = 42;
  const chipGap = 10;
  const total = chipW * 3 + chipGap * 2;
  const startX = width - total - 18;

  drawStatChip(startX + (chipW + chipGap) * 0, 26, chipW, chipH, "Vidas", lives, color(255, 115, 140));
  drawStatChip(startX + (chipW + chipGap) * 1, 26, chipW, chipH, "Combo", `x${max(1, combo + 1)}`, color(255, 220, 90));
  drawStatChip(startX + (chipW + chipGap) * 2, 26, chipW, chipH, "Nivel", wave, color(90, 240, 255));
  pop();

  drawPowerBars();
  drawBottomHintBar();

  if (boss) {
    drawBossHUD();
  }
}

function drawStatChip(x, y, w, h, title, value, accent) {
  push();
  noStroke();
  fill(255, 255, 255, 16);
  rect(x, y, w, h, 14);

  fill(red(accent), green(accent), blue(accent), 70);
  rect(x + 1, y + 1, 4, h - 2, 14);

  fill(255);
  textAlign(LEFT, TOP);
  textSize(12);
  textStyle(NORMAL);
  text(title, x + 14, y + 8);

  textSize(20);
  textStyle(BOLD);
  text(value, x + 14, y + 21);
  pop();
}

function drawBossHUD() {
  const w = min(560, width * 0.72);
  const x = width / 2 - w / 2;
  const y = HUD.topBarH + 14;

  drawGlassPanel(x, y, w, 58, 18);

  push();
  textAlign(CENTER, CENTER);
  fill(255);
  textStyle(BOLD);
  textSize(15);
  text("JEFE", width / 2, y + 12);

  rectMode(CORNER);
  noStroke();
  fill(255, 255, 255, 12);
  rect(width / 2 - (w - 40) / 2, y + 28, w - 40, 14, 999);

  const pct = constrain(boss.hp / boss.maxHp, 0, 1);
  fill(255, 90, 120);
  rect(width / 2 - (w - 40) / 2, y + 28, (w - 40) * pct, 14, 999);

  fill(255);
  textSize(12);
  textStyle(NORMAL);
  text(`${ceil(boss.hp)} / ${boss.maxHp}`, width / 2, y + 35);
  pop();
}

function drawPowerBars() {
  const bars = [
    ["Escudo", shieldTimer / 6.5, color(90, 255, 170)],
    ["Lento", slowTimer / 4.2, color(130, 145, 255)],
    ["Imán", magnetTimer / 6.0, color(255, 220, 90)],
    ["Rápido", rapidTimer / 6.0, color(255, 220, 90)]
  ];

  const x = width - min(320, width * 0.28) - 16;
  const y0 = HUD.topBarH + 16;
  const barW = min(320, width * 0.28);
  const barH = 14;
  const gap = 8;

  push();
  rectMode(CORNER);
  for (let i = 0; i < bars.length; i++) {
    const [label, progress, accent] = bars[i];
    const y = y0 + i * (barH + gap);

    noStroke();
    fill(255, 255, 255, 12);
    rect(x, y, barW, barH, 999);
    fill(red(accent), green(accent), blue(accent), 200);
    rect(x, y, barW * constrain(progress, 0, 1), barH, 999);

    fill(255, 240);
    textAlign(RIGHT, CENTER);
    textSize(12);
    textStyle(BOLD);
    text(label, x - 10, y + barH / 2 + 1);
  }
  pop();
}

function drawBottomHintBar() {
  const y = height - HUD.footerH - 12;
  drawGlassPanel(10, y, width - 20, HUD.footerH, 18);

  push();
  fill(225);
  textAlign(LEFT, CENTER);
  textSize(14);
  textStyle(NORMAL);
  text("Mover: WASD / flechas", 24, y + HUD.footerH / 2);
  textAlign(CENTER, CENTER);
  text("Disparar: Espacio o clic", width / 2, y + HUD.footerH / 2);
  textAlign(RIGHT, CENTER);
  text("P: pausa · R: reiniciar", width - 24, y + HUD.footerH / 2);
  pop();
}

function drawCenterMessage() {
  const a = centerMessageTimer > 0.4 ? 255 : map(centerMessageTimer, 0, 0.4, 0, 255, true);
  push();
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(30);
  fill(255, 255, 255, a);
  text(centerMessageText, width / 2, height * 0.22);
  pop();
}

function drawParticles() {
  noStroke();
  for (const pt of particles) {
    fill(red(pt.col), green(pt.col), blue(pt.col), constrain(pt.life * 2, 0, 255));
    circle(pt.pos.x, pt.pos.y, pt.size);
  }
}

function drawGlobalEffects() {
  if (flashAlpha > 0.1) {
    push();
    noStroke();
    fill(255, 255, 255, flashAlpha * 0.75);
    rect(0, 0, width, height);
    pop();
  }

  if (bossIntroTimer > 0 && gameState === "playing") {
    push();
    noStroke();
    fill(255, 90, 200, 28);
    rect(0, 0, width, height);
    pop();
  }
}

function drawMenuScreen() {
  const cardW = min(660, width * 0.88);
  const cardH = min(450, height * 0.68);
  const x = width / 2 - cardW / 2;
  const y = height / 2 - cardH / 2;

  drawGlassPanel(x, y, cardW, cardH, 28);

  push();
  textAlign(CENTER, CENTER);
  fill(255);
  textStyle(BOLD);
  textSize(min(width, height) * 0.062);
  text("NEON CORE", width / 2, y + 70);

  textStyle(NORMAL);
  textSize(17);
  fill(220);
  text(
    "Sobrevive, recoge orbes, dispara y derrota jefes.\nCada 5 oleadas aparece un jefe más peligroso.",
    width / 2,
    y + 145
  );

  drawFancyButton(width / 2, y + 245, 230, 60, "JUGAR");
  textSize(14);
  fill(190);
  text("WASD / flechas · Espacio o clic para disparar · P pausa · R reiniciar", width / 2, y + 320);
  text(`Récord actual: ${bestScore}`, width / 2, y + 350);
  pop();
}

function drawFancyButton(cx, cy, w, h, label) {
  const hovered = dist(mouseX, mouseY, cx, cy) < max(w, h) * 0.55;

  push();
  rectMode(CENTER);
  noStroke();
  fill(hovered ? color(75, 150, 255, 95) : color(75, 150, 255, 65));
  rect(cx, cy, w + 12, h + 12, 18);
  fill(22, 31, 66);
  rect(cx, cy, w, h, 16);
  stroke(130, 205, 255);
  strokeWeight(2);
  noFill();
  rect(cx, cy, w, h, 16);
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(22);
  text(label, cx, cy + 1);
  pop();
}

function drawPauseOverlay() {
  const w = min(460, width * 0.82);
  const h = 220;
  const x = width / 2 - w / 2;
  const y = height / 2 - h / 2;

  drawGlassPanel(x, y, w, h, 28);

  push();
  textAlign(CENTER, CENTER);
  fill(255);
  textStyle(BOLD);
  textSize(34);
  text("PAUSA", width / 2, y + 62);
  textStyle(NORMAL);
  textSize(17);
  fill(225);
  text("Presiona P para volver al juego", width / 2, y + 112);
  drawFancyButton(width / 2, y + 166, 200, 52, "SEGUIR");
  pop();
}

function drawGameOverOverlay() {
  const cardW = min(560, width * 0.88);
  const cardH = min(420, height * 0.68);
  const x = width / 2 - cardW / 2;
  const y = height / 2 - cardH / 2;

  drawGlassPanel(x, y, cardW, cardH, 28);

  push();
  textAlign(CENTER, CENTER);
  fill(255);
  textStyle(BOLD);
  textSize(min(width, height) * 0.058);
  text("GAME OVER", width / 2, y + 66);

  textStyle(NORMAL);
  textSize(18);
  fill(225);
  text(`Puntaje final: ${score}`, width / 2, y + 132);
  text(`Récord: ${bestScore}`, width / 2, y + 164);
  text(`Oleada alcanzada: ${wave}`, width / 2, y + 196);

  drawFancyButton(width / 2, y + 282, 240, 58, "REINTENTAR");
  textSize(14);
  fill(190);
  text("Pulsa R, Enter o haz clic", width / 2, y + 348);
  pop();
}

function drawGlassPanel(x, y, w, h, radius = 24) {
  push();
  noStroke();
  fill(4, 7, 17, 180);
  rect(x, y, w, h, radius);
  stroke(255, 255, 255, 26);
  strokeWeight(1);
  noFill();
  rect(x + 0.5, y + 0.5, w - 1, h - 1, radius);
  pop();
}

function setCenterMessage(text, seconds) {
  centerMessageText = text;
  centerMessageTimer = seconds;
}

function formatTime(seconds) {
  const s = max(0, floor(seconds));
  const m = floor(s / 60);
  const sec = nf(s % 60, 2);
  return `${m}:${sec}`;
}

function mousePressed() {
  if (gameState === "menu") {
    startGame();
  } else if (gameState === "playing") {
    attemptShoot(mouseX, mouseY);
  } else if (gameState === "paused") {
    gameState = "playing";
  } else if (gameState === "gameover") {
    startGame();
  }
}

function keyPressed() {
  if (gameState === "menu" && (keyCode === ENTER || keyCode === RETURN)) {
    startGame();
  } else if (gameState === "playing" && (key === "p" || key === "P")) {
    gameState = "paused";
  } else if (gameState === "paused" && (key === "p" || key === "P")) {
    gameState = "playing";
  } else if (gameState === "gameover" && (key === "r" || key === "R" || keyCode === ENTER || keyCode === RETURN)) {
    startGame();
  } else if (gameState === "playing" && keyCode === 32) {
    attemptShoot(mouseX, mouseY);
  }

  if ([LEFT_ARROW, RIGHT_ARROW, UP_ARROW, DOWN_ARROW, 65, 68, 87, 83, 32].includes(keyCode)) {
    return false;
  }
}

function outOfBounds(v, pad) {
  return v.x < -pad || v.x > width + pad || v.y < -pad || v.y > height + pad;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initStars();
  if (player) {
    player.pos.x = constrain(player.pos.x, player.r + 10, width - player.r - 10);
    player.pos.y = constrain(player.pos.y, player.r + 10, height - player.r - 10);
  }
}