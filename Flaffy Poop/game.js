// ─── Canvas Setup ───────────────────────────────────────────────
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const BASE_W = 400;
const BASE_H = 600;
canvas.width = BASE_W;
canvas.height = BASE_H;

// Scale canvas to fit screen while maintaining aspect ratio
function resize() {
  const scale = Math.min(window.innerWidth / BASE_W, window.innerHeight / BASE_H);
  canvas.style.width = BASE_W * scale + 'px';
  canvas.style.height = BASE_H * scale + 'px';
}
window.addEventListener('resize', resize);
resize();

// ─── Constants ──────────────────────────────────────────────────
const PLAYER_SIZE = 40;
const POOP_SIZE = 32;
const PLAYER_SPEED = 5;
const INITIAL_SPAWN_INTERVAL = 1000; // ms
const MIN_SPAWN_INTERVAL = 280;
const INITIAL_FALL_SPEED = 2.2;
const MAX_FALL_SPEED = 6.5;
const DIFFICULTY_INTERVAL = 15000; // ms
const GROUND_Y = BASE_H - 60;

// ─── State ──────────────────────────────────────────────────────
const STATES = { MENU: 'MENU', PLAYING: 'PLAYING', GAME_OVER: 'GAME_OVER' };
let state = STATES.MENU;

let player, poops, score, highScore, spawnInterval, fallSpeed;
let lastTime = 0, spawnTimer = 0, difficultyTimer = 0;
let flashFrames = 0;
let floatingTexts = [];
let particles = [];

// Input
const keys = {};

// ─── High Score ─────────────────────────────────────────────────
function loadHighScore() {
  return parseInt(localStorage.getItem('flaffyPoop_highScore') || '0');
}
function saveHighScore(s) {
  localStorage.setItem('flaffyPoop_highScore', s);
}
highScore = loadHighScore();

// ─── Init Game ──────────────────────────────────────────────────
function initGame() {
  player = {
    x: BASE_W / 2 - PLAYER_SIZE / 2,
    y: GROUND_Y - PLAYER_SIZE,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    dx: 0
  };
  poops = [];
  score = 0;
  spawnInterval = INITIAL_SPAWN_INTERVAL;
  fallSpeed = INITIAL_FALL_SPEED;
  spawnTimer = 0;
  difficultyTimer = 0;
  flashFrames = 0;
  floatingTexts = [];
  particles = [];
}

// ─── Spawn Poop ─────────────────────────────────────────────────
function spawnPoop() {
  const margin = POOP_SIZE;
  const x = margin + Math.random() * (BASE_W - margin * 2);
  const isFast = score >= 30 && Math.random() < 0.2;
  const speed = fallSpeed * (0.8 + Math.random() * 0.5) * (isFast ? 1.8 : 1);
  poops.push({
    x, y: -POOP_SIZE,
    speed,
    wobble: Math.random() * Math.PI * 2,
    wobbleAmp: 1 + Math.random() * 2,
    isFast,
    rotation: (Math.random() - 0.5) * 0.6
  });
}

// ─── Floating Text ──────────────────────────────────────────────
function addFloatingText(x, y, text, color = '#FFD700') {
  floatingTexts.push({ x, y, text, color, alpha: 1, vy: -1.5, life: 60 });
}

// ─── Particles ──────────────────────────────────────────────────
function spawnParticles(x, y) {
  for (let i = 0; i < 18; i++) {
    const angle = (Math.PI * 2 * i) / 18 + (Math.random() - 0.5) * 0.5;
    const speed = 1.5 + Math.random() * 4;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 40 + Math.random() * 30,
      maxLife: 0,
      color: ['#8B4513', '#A0522D', '#D2691E', '#FFD700'][Math.floor(Math.random() * 4)]
    });
    particles[particles.length - 1].maxLife = particles[particles.length - 1].life;
  }
}

// ─── Collision ──────────────────────────────────────────────────
function checkCollision(p) {
  const shrink = 0.2;
  const px = player.x + player.width * shrink / 2;
  const py = player.y + player.height * shrink / 2;
  const pw = player.width * (1 - shrink);
  const ph = player.height * (1 - shrink);

  const ps = POOP_SIZE * 0.7;
  const cx = p.x - ps / 2;
  const cy = p.y - ps / 2;

  return px < cx + ps && px + pw > cx && py < cy + ps && py + ph > cy;
}

// ─── Update ─────────────────────────────────────────────────────
function update(dt) {
  if (state !== STATES.PLAYING) return;

  // Player movement
  if (keys['ArrowLeft'] || keys['a'] || keys['A'] || touchDir === -1) {
    player.dx = -PLAYER_SPEED;
  } else if (keys['ArrowRight'] || keys['d'] || keys['D'] || touchDir === 1) {
    player.dx = PLAYER_SPEED;
  } else {
    player.dx *= 0.7; // deceleration
  }
  player.x += player.dx;
  player.x = Math.max(0, Math.min(BASE_W - player.width, player.x));

  // Spawn poops
  spawnTimer += dt;
  if (spawnTimer >= spawnInterval) {
    spawnTimer = 0;
    spawnPoop();
    // Sometimes spawn a second poop at higher difficulties
    if (spawnInterval < 500 && Math.random() < 0.3) {
      setTimeout(() => { if (state === STATES.PLAYING) spawnPoop(); }, spawnInterval * 0.4);
    }
  }

  // Difficulty
  difficultyTimer += dt;
  if (difficultyTimer >= DIFFICULTY_INTERVAL) {
    difficultyTimer = 0;
    spawnInterval = Math.max(MIN_SPAWN_INTERVAL, spawnInterval - 60);
    fallSpeed = Math.min(MAX_FALL_SPEED, fallSpeed + 0.25);
  }

  // Update poops
  for (let i = poops.length - 1; i >= 0; i--) {
    const p = poops[i];
    p.y += p.speed;
    p.wobble += 0.08;
    p.x += Math.sin(p.wobble) * p.wobbleAmp;

    if (p.y > BASE_H + POOP_SIZE) {
      poops.splice(i, 1);
      score++;
      addFloatingText(p.x, GROUND_Y - 10, '+1');
      continue;
    }

    if (checkCollision(p)) {
      spawnParticles(player.x + player.width / 2, player.y + player.height / 2);
      flashFrames = 12;
      if (score > highScore) {
        highScore = score;
        saveHighScore(highScore);
      }
      state = STATES.GAME_OVER;
      return;
    }
  }

  // Flash cooldown
  if (flashFrames > 0) flashFrames--;

  // Floating texts
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const t = floatingTexts[i];
    t.y += t.vy;
    t.life--;
    t.alpha = t.life / 60;
    if (t.life <= 0) floatingTexts.splice(i, 1);
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

// ─── Draw Helpers ────────────────────────────────────────────────
function drawTextOutlined(text, x, y, size, color, align = 'center') {
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.lineWidth = size / 6;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawEmoji(emoji, x, y, size, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.font = `${size}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 0, 0);
  ctx.restore();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Render ─────────────────────────────────────────────────────
function render() {
  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, BASE_H);
  grad.addColorStop(0, '#87CEEB');
  grad.addColorStop(0.75, '#87CEEB');
  grad.addColorStop(1, '#90EE90');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // Clouds (static decorative)
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  drawCloud(60, 80, 0.7);
  drawCloud(280, 50, 0.9);
  drawCloud(170, 110, 0.55);

  // Ground
  ctx.fillStyle = '#5D8A3C';
  ctx.fillRect(0, GROUND_Y, BASE_W, BASE_H - GROUND_Y);
  ctx.fillStyle = '#4A7A2E';
  ctx.fillRect(0, GROUND_Y, BASE_W, 6);

  if (state === STATES.MENU) {
    renderMenu();
  } else if (state === STATES.PLAYING || state === STATES.GAME_OVER) {
    renderGame();
    if (state === STATES.GAME_OVER) renderGameOver();
  }
}

function drawCloud(cx, cy, scale) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.arc(0, 0, 25, 0, Math.PI * 2);
  ctx.arc(30, -10, 30, 0, Math.PI * 2);
  ctx.arc(60, 0, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderMenu() {
  // Title box
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(40, 140, BASE_W - 80, 280, 20);
  ctx.fill();

  drawEmoji('💩', BASE_W / 2, 195, 64);
  drawTextOutlined('Flaffy Poop', BASE_W / 2, 265, 28, '#FFD700');
  drawTextOutlined('하늘에서 떨어지는 똥을 피하세요!', BASE_W / 2, 305, 13, '#fff');

  // Blinking start text
  if (Math.floor(Date.now() / 500) % 2 === 0) {
    drawTextOutlined('Space 또는 화면 탭으로 시작', BASE_W / 2, 350, 13, '#7FFF00');
  }

  // High score
  if (highScore > 0) {
    drawTextOutlined(`최고 점수: ${highScore}`, BASE_W / 2, 390, 15, '#FFD700');
  }

  // Controls hint
  drawTextOutlined('← → 또는 A/D 키로 이동', BASE_W / 2, 430, 11, 'rgba(255,255,255,0.7)');
}

function renderGame() {
  // Poops
  for (const p of poops) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation + Math.sin(p.wobble * 0.5) * 0.15);
    ctx.font = `${POOP_SIZE}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💩', 0, 0);
    if (p.isFast) {
      ctx.font = '10px serif';
      ctx.fillStyle = 'red';
      ctx.fillText('🔥', POOP_SIZE * 0.4, -POOP_SIZE * 0.4);
    }
    ctx.restore();
  }

  // Player
  drawEmoji('🧍', player.x + player.width / 2, player.y + player.height / 2, PLAYER_SIZE * 1.05);

  // Particles
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4 * alpha + 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Floating texts
  for (const t of floatingTexts) {
    ctx.save();
    ctx.globalAlpha = t.alpha;
    drawTextOutlined(t.text, t.x, t.y, 16, t.color);
    ctx.restore();
  }

  // Flash on hit
  if (flashFrames > 0) {
    ctx.fillStyle = `rgba(255, 50, 50, ${flashFrames / 12 * 0.45})`;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
  }

  // Score HUD
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(8, 8, 130, 44, 8);
  ctx.fill();
  drawTextOutlined(`점수: ${score}`, 73, 22, 15, '#fff', 'center');
  drawTextOutlined(`최고: ${highScore}`, 73, 42, 12, '#FFD700', 'center');
}

function renderGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // Panel
  ctx.fillStyle = 'rgba(20,20,40,0.95)';
  roundRect(50, 160, BASE_W - 100, 280, 20);
  ctx.fill();
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  roundRect(50, 160, BASE_W - 100, 280, 20);
  ctx.stroke();

  drawEmoji('😵', BASE_W / 2, 215, 48);
  drawTextOutlined('게임 오버!', BASE_W / 2, 270, 26, '#FF6B6B');
  drawTextOutlined(`점수: ${score}`, BASE_W / 2, 310, 20, '#fff');

  if (score >= highScore && score > 0) {
    drawTextOutlined(`🏆 신기록! ${highScore}`, BASE_W / 2, 345, 16, '#FFD700');
  } else {
    drawTextOutlined(`최고 점수: ${highScore}`, BASE_W / 2, 345, 16, '#FFD700');
  }

  if (Math.floor(Date.now() / 600) % 2 === 0) {
    drawTextOutlined('Space 또는 탭으로 재시작', BASE_W / 2, 400, 13, '#7FFF00');
  }
}

// ─── Input Handling ─────────────────────────────────────────────
window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    handleAction();
  }
});
window.addEventListener('keyup', e => { keys[e.key] = false; });

function handleAction() {
  if (state === STATES.MENU) {
    initGame();
    state = STATES.PLAYING;
  } else if (state === STATES.GAME_OVER) {
    initGame();
    state = STATES.PLAYING;
  }
}

// Touch controls
let touchDir = 0;
let touchStartX = 0;

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const scaleX = BASE_W / rect.width;
  const tx = (touch.clientX - rect.left) * scaleX;
  touchStartX = tx;

  if (state === STATES.MENU || state === STATES.GAME_OVER) {
    handleAction();
    return;
  }

  touchDir = tx < BASE_W / 2 ? -1 : 1;
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const scaleX = BASE_W / rect.width;
  const tx = (touch.clientX - rect.left) * scaleX;
  touchDir = tx < BASE_W / 2 ? -1 : 1;
}, { passive: false });

canvas.addEventListener('touchend', e => {
  e.preventDefault();
  touchDir = 0;
}, { passive: false });

// Mouse click (for desktop testing)
canvas.addEventListener('click', e => {
  if (state === STATES.MENU || state === STATES.GAME_OVER) handleAction();
});

// ─── Game Loop ──────────────────────────────────────────────────
function loop(timestamp) {
  const dt = Math.min(timestamp - lastTime, 50); // cap at 50ms to avoid spiral of death
  lastTime = timestamp;

  update(dt);
  render();

  requestAnimationFrame(loop);
}

// ─── Start ──────────────────────────────────────────────────────
initGame();
requestAnimationFrame(ts => {
  lastTime = ts;
  requestAnimationFrame(loop);
});
