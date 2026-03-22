// ─── Canvas Setup ───────────────────────────────────────────────
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const BASE_W = 400;
const BASE_H = 600;
canvas.width = BASE_W;
canvas.height = BASE_H;

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
const INITIAL_SPAWN_INTERVAL = 1000;
const MIN_SPAWN_INTERVAL = 280;
const INITIAL_FALL_SPEED = 2.2;
const MAX_FALL_SPEED = 6.5;
const DIFFICULTY_INTERVAL = 15000;
const GROUND_Y = BASE_H - 60;
const POWER_BTN = { x: 338, y: BASE_H - 28, r: 24 };

// ─── Characters ─────────────────────────────────────────────────
// Power types:
//   freeze : 똥 이동 정지  (maxActive ms 동안, cooldown 후 재사용)
//   gun    : 총알 발사      (즉시, maxCooldown ms 쿨다운)
//   eat    : 먹기/뱉기      (eat mode → 흡수 → 뱉기, cooldown은 먹은 후 시작)
//   shield : 방어막          (maxActive ms 동안, cooldown 후 재사용)
const CHARACTERS = [
  {
    emoji: '👩',   name: '여자 1',   label: '활발한 여자',
    power: { type: 'freeze', name: '타임스톱', icon: '❄️', maxActive: 3000, maxCooldown: 10000 }
  },
  {
    emoji: '👩‍🦰', name: '여자 2',   label: '붉은머리 여자',
    power: { type: 'gun', name: '총쏘기', icon: '🔫', maxActive: 0, maxCooldown: 800 }
  },
  {
    emoji: '👨',   name: '남자 1',   label: '평범한 남자',
    power: { type: 'eat', name: '먹기/뱉기', icon: '🤤', maxActive: 0, maxCooldown: 6000 }
  },
  {
    emoji: '👨‍🦱', name: '남자 2',   label: '곱슬머리 남자',
    power: { type: 'shield', name: '방어막', icon: '🛡️', maxActive: 5000, maxCooldown: 15000 }
  },
  { emoji: '🧒', name: '아이',     label: '귀여운 꼬마',           power: null },
  { emoji: '🧑', name: '어른',     label: '평범한 어른',           power: null },
  { emoji: '👴', name: '할아버지', label: '지혜로운 노인',         power: null },
  { emoji: '😇', name: 'God',      label: '신은 피할 수 있을까?',  power: null },
];

const COLS = 4;
const ROWS = 2;
const CELL_W = 80;
const CELL_H = 90;
const GRID_X = (BASE_W - COLS * CELL_W) / 2;
const GRID_Y = 200;

// ─── State ──────────────────────────────────────────────────────
const STATES = { MENU: 'MENU', CHARACTER_SELECT: 'CHARACTER_SELECT', PLAYING: 'PLAYING', GAME_OVER: 'GAME_OVER' };
let state = STATES.MENU;
let selectedCharIdx = 0;
let currentChar = CHARACTERS[0];

let player, poops, score, highScore, spawnInterval, fallSpeed;
let lastTime = 0, spawnTimer = 0, difficultyTimer = 0;
let flashFrames = 0;
let floatingTexts = [];
let particles = [];

// Projectiles
let bullets = [];   // 여자2: [{x, y}]
let spits  = [];    // 남자1: [{x, y, wobble}]

// Power state (reset on each game start)
let powerState = {
  cooldown:    0,      // remaining cooldown ms
  isActive:    false,  // freeze / shield currently active
  activeTime:  0,      // remaining active-duration ms
  eatMode:     false,  // 남자1: eating window open
  eatModeTime: 0,      // remaining eat-window ms
  storedPoops: 0,      // 남자1: absorbed poop count (max 3)
};

const keys = {};

// ─── High Score ─────────────────────────────────────────────────
function loadHighScore() {
  return parseInt(localStorage.getItem('flaffyPoop_highScore') || '0');
}
function saveHighScore(s) {
  localStorage.setItem('flaffyPoop_highScore', s);
}
highScore = loadHighScore();

// ─── Init ────────────────────────────────────────────────────────
function initGame() {
  currentChar = CHARACTERS[selectedCharIdx];
  player = {
    x: BASE_W / 2 - PLAYER_SIZE / 2,
    y: GROUND_Y - PLAYER_SIZE,
    width: PLAYER_SIZE, height: PLAYER_SIZE, dx: 0
  };
  poops   = [];
  bullets = [];
  spits   = [];
  score   = 0;
  spawnInterval  = INITIAL_SPAWN_INTERVAL;
  fallSpeed      = INITIAL_FALL_SPEED;
  spawnTimer     = 0;
  difficultyTimer = 0;
  flashFrames    = 0;
  floatingTexts  = [];
  particles      = [];
  powerState = { cooldown: 0, isActive: false, activeTime: 0, eatMode: false, eatModeTime: 0, storedPoops: 0 };
}

// ─── Spawn ───────────────────────────────────────────────────────
function spawnPoop() {
  const margin = POOP_SIZE;
  const x = margin + Math.random() * (BASE_W - margin * 2);
  const isFast = score >= 30 && Math.random() < 0.2;
  const speed = fallSpeed * (0.8 + Math.random() * 0.5) * (isFast ? 1.8 : 1);
  poops.push({ x, y: -POOP_SIZE, speed, wobble: Math.random() * Math.PI * 2, wobbleAmp: 1 + Math.random() * 2, isFast, rotation: (Math.random() - 0.5) * 0.6 });
}

// ─── FX ──────────────────────────────────────────────────────────
function addFloatingText(x, y, text, color = '#FFD700') {
  floatingTexts.push({ x, y, text, color, alpha: 1, vy: -1.5, life: 60 });
}

function spawnParticles(x, y, colors = ['#8B4513', '#A0522D', '#D2691E', '#FFD700']) {
  for (let i = 0; i < 16; i++) {
    const angle = (Math.PI * 2 * i) / 16 + (Math.random() - 0.5) * 0.5;
    const speed = 1.5 + Math.random() * 4;
    const life  = 40 + Math.random() * 30;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life, maxLife: life, color: colors[Math.floor(Math.random() * colors.length)] });
  }
}

// ─── Collision Helpers ───────────────────────────────────────────
function checkPlayerPoopCollision(p) {
  const shrink = 0.2;
  const px = player.x + player.width  * shrink / 2;
  const py = player.y + player.height * shrink / 2;
  const pw = player.width  * (1 - shrink);
  const ph = player.height * (1 - shrink);
  const ps = POOP_SIZE * 0.7;
  const cx = p.x - ps / 2;
  const cy = p.y - ps / 2;
  return px < cx + ps && px + pw > cx && py < cy + ps && py + ph > cy;
}

function bulletHitsPoop(b, p) {
  const ps = POOP_SIZE * 0.8;
  return b.x > p.x - ps / 2 && b.x < p.x + ps / 2 &&
         b.y > p.y - ps / 2 && b.y < p.y + ps / 2;
}

function spitHitsPoop(s, p) {
  return Math.hypot(s.x - p.x, s.y - p.y) < POOP_SIZE * 0.75;
}

// ─── Power System ────────────────────────────────────────────────
function activatePower() {
  const power = currentChar.power;
  if (!power || state !== STATES.PLAYING) return;

  if (power.type === 'eat') {
    // Spit takes priority (no cooldown needed for spit)
    if (powerState.storedPoops > 0) {
      spits.push({ x: player.x + player.width / 2, y: player.y, wobble: 0 });
      powerState.storedPoops--;
      addFloatingText(player.x + player.width / 2, player.y - 20, '퉤!', '#A0522D');
      return;
    }
    // Enter eat mode (needs cooldown to be 0)
    if (powerState.cooldown > 0 || powerState.eatMode) return;
    powerState.eatMode     = true;
    powerState.eatModeTime = 4000;
    addFloatingText(player.x + player.width / 2, player.y - 20, '먹기 모드!', '#00FF88');
    return;
  }

  // For all other types: check cooldown and not-already-active
  if (powerState.cooldown > 0 || powerState.isActive) return;

  switch (power.type) {
    case 'freeze':
      powerState.isActive   = true;
      powerState.activeTime = power.maxActive;
      addFloatingText(BASE_W / 2, GROUND_Y / 2, '❄️ 타임스톱!', '#88CCFF');
      break;
    case 'gun':
      bullets.push({ x: player.x + player.width / 2, y: player.y });
      powerState.cooldown = power.maxCooldown;
      break;
    case 'shield':
      powerState.isActive   = true;
      powerState.activeTime = power.maxActive;
      addFloatingText(BASE_W / 2, GROUND_Y / 2, '🛡️ 방어막!', '#88FFFF');
      break;
  }
}

// ─── Update ─────────────────────────────────────────────────────
function update(dt) {
  if (state !== STATES.PLAYING) return;
  updatePower(dt);
  updatePlayer();
  updateSpawnAndDifficulty(dt);
  updatePoops();
  updateBullets();
  updateSpits();
  updateFX();
}

function updatePower(dt) {
  if (powerState.cooldown > 0) powerState.cooldown = Math.max(0, powerState.cooldown - dt);

  const power = currentChar.power;
  if (!power) return;

  // Duration-based: freeze & shield
  if (powerState.isActive) {
    powerState.activeTime -= dt;
    if (powerState.activeTime <= 0) {
      powerState.isActive   = false;
      powerState.activeTime = 0;
      powerState.cooldown   = power.maxCooldown;
      if (power.type === 'freeze') addFloatingText(BASE_W / 2, GROUND_Y / 2, '해제', '#88CCFF');
    }
  }

  // Eat mode window timer
  if (powerState.eatMode) {
    powerState.eatModeTime -= dt;
    if (powerState.eatModeTime <= 0) {
      powerState.eatMode     = false;
      powerState.eatModeTime = 0;
    }
  }
}

function updatePlayer() {
  if (keys['ArrowLeft'] || keys['a'] || keys['A'] || touchDir === -1) {
    player.dx = -PLAYER_SPEED;
  } else if (keys['ArrowRight'] || keys['d'] || keys['D'] || touchDir === 1) {
    player.dx = PLAYER_SPEED;
  } else {
    player.dx *= 0.7;
  }
  player.x += player.dx;
  player.x = Math.max(0, Math.min(BASE_W - player.width, player.x));
}

function updateSpawnAndDifficulty(dt) {
  spawnTimer += dt;
  if (spawnTimer >= spawnInterval) {
    spawnTimer = 0;
    spawnPoop();
    if (spawnInterval < 500 && Math.random() < 0.3) {
      setTimeout(() => { if (state === STATES.PLAYING) spawnPoop(); }, spawnInterval * 0.4);
    }
  }
  difficultyTimer += dt;
  if (difficultyTimer >= DIFFICULTY_INTERVAL) {
    difficultyTimer = 0;
    spawnInterval = Math.max(MIN_SPAWN_INTERVAL, spawnInterval - 60);
    fallSpeed     = Math.min(MAX_FALL_SPEED, fallSpeed + 0.25);
  }
}

function updatePoops() {
  const isFrozen = powerState.isActive && currentChar.power?.type === 'freeze';
  const hasShield = powerState.isActive && currentChar.power?.type === 'shield';
  const canEat    = powerState.eatMode   && currentChar.power?.type === 'eat';

  for (let i = poops.length - 1; i >= 0; i--) {
    const p = poops[i];

    if (!isFrozen) {
      p.y += p.speed;
      p.wobble += 0.08;
      p.x += Math.sin(p.wobble) * p.wobbleAmp;
    }

    // Fell off bottom
    if (p.y > BASE_H + POOP_SIZE) {
      poops.splice(i, 1);
      score++;
      addFloatingText(p.x, GROUND_Y - 10, '+1');
      continue;
    }

    // Collision with player
    if (checkPlayerPoopCollision(p)) {
      if (hasShield) {
        // Shield absorbs poop
        spawnParticles(p.x, p.y, ['#00FFFF', '#88FFFF', '#FFFFFF']);
        addFloatingText(p.x, p.y - 20, '막았다!', '#00FFFF');
        poops.splice(i, 1);
        score++;
        continue;
      }
      if (canEat) {
        // Eat mode absorbs poop
        spawnParticles(p.x, p.y, ['#8B4513', '#A0522D', '#D2691E']);
        addFloatingText(player.x + player.width / 2, player.y - 20, '냠냠!', '#FFD700');
        powerState.storedPoops = Math.min(3, powerState.storedPoops + 1);
        powerState.eatMode     = false;
        powerState.eatModeTime = 0;
        powerState.cooldown    = currentChar.power.maxCooldown;
        poops.splice(i, 1);
        continue;
      }
      // Normal hit → game over
      spawnParticles(player.x + player.width / 2, player.y + player.height / 2);
      flashFrames = 12;
      if (score > highScore) { highScore = score; saveHighScore(highScore); }
      state = STATES.GAME_OVER;
      return;
    }
  }
}

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].y -= 10;
    if (bullets[i].y < -10) { bullets.splice(i, 1); continue; }
    let hit = false;
    for (let j = poops.length - 1; j >= 0; j--) {
      if (bulletHitsPoop(bullets[i], poops[j])) {
        spawnParticles(poops[j].x, poops[j].y, ['#8B4513', '#A0522D', '#FFD700']);
        addFloatingText(poops[j].x, poops[j].y - 10, '💥', '#FFD700');
        score++;
        poops.splice(j, 1);
        hit = true;
        break;
      }
    }
    if (hit) bullets.splice(i, 1);
  }
}

function updateSpits() {
  for (let i = spits.length - 1; i >= 0; i--) {
    const s = spits[i];
    s.y -= 8;
    s.wobble += 0.12;
    s.x += Math.sin(s.wobble) * 2;
    if (s.y < -POOP_SIZE) { spits.splice(i, 1); continue; }
    let hit = false;
    for (let j = poops.length - 1; j >= 0; j--) {
      if (spitHitsPoop(s, poops[j])) {
        spawnParticles(poops[j].x, poops[j].y, ['#8B4513', '#A0522D', '#D2691E']);
        addFloatingText(poops[j].x, poops[j].y - 10, '퍽!', '#A0522D');
        score++;
        poops.splice(j, 1);
        hit = true;
        break;
      }
    }
    if (hit) spits.splice(i, 1);
  }
}

function updateFX() {
  if (flashFrames > 0) flashFrames--;
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const t = floatingTexts[i];
    t.y += t.vy;
    t.life--;
    t.alpha = t.life / 60;
    if (t.life <= 0) floatingTexts.splice(i, 1);
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--;
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
function renderBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, BASE_H);
  grad.addColorStop(0, '#87CEEB');
  grad.addColorStop(0.75, '#87CEEB');
  grad.addColorStop(1, '#90EE90');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  drawCloud(60, 80, 0.7);
  drawCloud(280, 50, 0.9);
  drawCloud(170, 110, 0.55);

  ctx.fillStyle = '#5D8A3C';
  ctx.fillRect(0, GROUND_Y, BASE_W, BASE_H - GROUND_Y);
  ctx.fillStyle = '#4A7A2E';
  ctx.fillRect(0, GROUND_Y, BASE_W, 6);

  // Bottom UI bar background
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, GROUND_Y + 6, BASE_W, BASE_H - GROUND_Y - 6);
}

function render() {
  renderBackground();
  if      (state === STATES.MENU)             renderMenu();
  else if (state === STATES.CHARACTER_SELECT) renderCharacterSelect();
  else if (state === STATES.PLAYING || state === STATES.GAME_OVER) {
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
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(40, 140, BASE_W - 80, 280, 20);
  ctx.fill();

  drawEmoji('💩', BASE_W / 2, 195, 64);
  drawTextOutlined('Flaffy Poop', BASE_W / 2, 265, 28, '#FFD700');
  drawTextOutlined('하늘에서 떨어지는 똥을 피하세요!', BASE_W / 2, 305, 13, '#fff');

  if (Math.floor(Date.now() / 500) % 2 === 0) {
    drawTextOutlined('Space 또는 화면 탭으로 시작', BASE_W / 2, 350, 13, '#7FFF00');
  }
  if (highScore > 0) drawTextOutlined(`최고 점수: ${highScore}`, BASE_W / 2, 390, 15, '#FFD700');
  drawTextOutlined('← → 또는 A/D 키로 이동', BASE_W / 2, 430, 11, 'rgba(255,255,255,0.7)');
}

function renderCharacterSelect() {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(20, 100, BASE_W - 40, BASE_H - 140, 16);
  ctx.fill();

  drawTextOutlined('캐릭터 선택', BASE_W / 2, 135, 20, '#FFD700');

  for (let i = 0; i < CHARACTERS.length; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const cx = GRID_X + col * CELL_W + CELL_W / 2;
    const cy = GRID_Y + row * CELL_H + CELL_H / 2 - 10;
    const isSelected = (i === selectedCharIdx);

    ctx.fillStyle = isSelected ? 'rgba(255,215,0,0.35)' : 'rgba(255,255,255,0.08)';
    roundRect(GRID_X + col * CELL_W + 4, GRID_Y + row * CELL_H + 4, CELL_W - 8, CELL_H - 8, 10);
    ctx.fill();

    if (isSelected) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2.5;
      roundRect(GRID_X + col * CELL_W + 4, GRID_Y + row * CELL_H + 4, CELL_W - 8, CELL_H - 8, 10);
      ctx.stroke();
    }

    const bounce = isSelected ? Math.sin(Date.now() / 250) * 3 : 0;
    drawEmoji(CHARACTERS[i].emoji, cx, cy - 8 + bounce, 36);

    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isSelected ? '#FFD700' : 'rgba(255,255,255,0.8)';
    ctx.fillText(CHARACTERS[i].name, cx, cy + 26);

    // Power icon badge
    if (CHARACTERS[i].power) {
      ctx.font = '11px serif';
      ctx.fillText(CHARACTERS[i].power.icon, GRID_X + col * CELL_W + CELL_W - 13, GRID_Y + row * CELL_H + 15);
    }
  }

  // Info box
  const ch = CHARACTERS[selectedCharIdx];
  const boxH = ch.power ? 68 : 50;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(30, GRID_Y + ROWS * CELL_H + 14, BASE_W - 60, boxH, 10);
  ctx.fill();

  drawEmoji(ch.emoji, BASE_W / 2 - 58, GRID_Y + ROWS * CELL_H + 14 + boxH / 2, 28);
  drawTextOutlined(ch.name, BASE_W / 2 + 12, GRID_Y + ROWS * CELL_H + 30, 14, '#FFD700');
  drawTextOutlined(ch.label, BASE_W / 2 + 12, GRID_Y + ROWS * CELL_H + 48, 10, 'rgba(255,255,255,0.75)');
  if (ch.power) {
    drawTextOutlined(`${ch.power.icon} 파워: ${ch.power.name}`, BASE_W / 2 + 12, GRID_Y + ROWS * CELL_H + 66, 10, '#88FFCC');
  }

  const confirmY = GRID_Y + ROWS * CELL_H + boxH + 26;
  if (Math.floor(Date.now() / 500) % 2 === 0) {
    drawTextOutlined('Space / Enter / 탭으로 선택 확정', BASE_W / 2, confirmY, 11, '#7FFF00');
  }
  drawTextOutlined('← → ↑ ↓ 키 또는 클릭으로 이동', BASE_W / 2, confirmY + 18, 10, 'rgba(255,255,255,0.5)');
}

function renderGame() {
  const isFrozen  = powerState.isActive && currentChar.power?.type === 'freeze';
  const hasShield = powerState.isActive && currentChar.power?.type === 'shield';

  // Freeze screen tint
  if (isFrozen) {
    ctx.fillStyle = 'rgba(135,206,250,0.18)';
    ctx.fillRect(0, 0, BASE_W, GROUND_Y);
  }

  // Poops
  for (const p of poops) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation + Math.sin(p.wobble * 0.5) * 0.15);
    if (isFrozen) ctx.globalAlpha = 0.65;
    ctx.font = `${POOP_SIZE}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💩', 0, 0);
    if (isFrozen) {
      ctx.globalAlpha = 1;
      ctx.font = '13px serif';
      ctx.fillText('❄️', POOP_SIZE * 0.4, -POOP_SIZE * 0.4);
    }
    if (p.isFast && !isFrozen) {
      ctx.font = '10px serif';
      ctx.fillStyle = 'red';
      ctx.fillText('🔥', POOP_SIZE * 0.4, -POOP_SIZE * 0.4);
    }
    ctx.restore();
  }

  // Bullets (여자2: 총알)
  for (const b of bullets) {
    ctx.save();
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
    ctx.fill();
    // Bullet trail
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(b.x, b.y + 8, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Spits (남자1: 뱉기)
  for (const s of spits) {
    ctx.save();
    ctx.shadowColor = '#A0522D';
    ctx.shadowBlur = 6;
    drawEmoji('💩', s.x, s.y, 18);
    ctx.restore();
  }

  // Eat mode glow
  if (powerState.eatMode) {
    ctx.save();
    ctx.globalAlpha = 0.22 + Math.sin(Date.now() / 150) * 0.12;
    ctx.fillStyle = '#00FF88';
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, PLAYER_SIZE * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Shield glow
  if (hasShield) {
    ctx.save();
    const pulse = 0.15 + Math.sin(Date.now() / 80) * 0.07;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#00FFFF';
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, PLAYER_SIZE * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = pulse + 0.3;
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, PLAYER_SIZE * 0.9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Player
  drawEmoji(currentChar.emoji, player.x + player.width / 2, player.y + player.height / 2, PLAYER_SIZE * 1.05);

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

  // Hit flash
  if (flashFrames > 0) {
    ctx.fillStyle = `rgba(255,50,50,${flashFrames / 12 * 0.45})`;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
  }

  // Score HUD
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(8, 8, 150, 44, 8);
  ctx.fill();
  drawEmoji(currentChar.emoji, 26, 30, 24);
  drawTextOutlined(`점수: ${score}`,    100, 22, 14, '#fff');
  drawTextOutlined(`최고: ${highScore}`, 100, 40, 11, '#FFD700');

  // Power button
  renderPowerButton();
}

// ─── Power Button UI ─────────────────────────────────────────────
function renderPowerButton() {
  const bx = POWER_BTN.x, by = POWER_BTN.y, br = POWER_BTN.r;
  const power = currentChar.power;

  if (!power) {
    ctx.fillStyle = 'rgba(60,60,60,0.5)';
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
    ctx.font = '8px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(150,150,150,0.6)';
    ctx.fillText('파워없음', bx, by);
    return;
  }

  const onCooldown = powerState.cooldown > 0;
  const isActive   = powerState.isActive;

  // Base color
  let baseColor = '#152e6e';
  if (isActive)           baseColor = '#0a4a2e';
  if (powerState.eatMode) baseColor = '#0a4a1e';
  if (onCooldown)         baseColor = '#2a2a3a';

  ctx.fillStyle = baseColor;
  ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();

  // Border
  const borderColor = isActive           ? '#00FFAA'
                    : powerState.eatMode ? '#00FF88'
                    : onCooldown         ? '#444455'
                    :                      '#4488FF';
  ctx.strokeStyle = borderColor;
  ctx.lineWidth   = 2;
  ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.stroke();

  // Cooldown arc (fills button as "blocked", sweeps away as cooldown decreases)
  if (onCooldown) {
    const ratio = powerState.cooldown / power.maxCooldown;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.arc(bx, by, br, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }

  // Active-duration arc (outside ring, shrinks as time remaining decreases)
  if (isActive && power.maxActive > 0) {
    const ratio = powerState.activeTime / power.maxActive;
    ctx.strokeStyle = isActive && power.type === 'shield' ? '#00FFFF' : '#88CCFF';
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.arc(bx, by, br + 4, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
    ctx.stroke();
  }

  // Icon (changes based on eat state)
  let icon = power.icon;
  if (power.type === 'eat') {
    icon = powerState.storedPoops > 0 ? '💩' : (powerState.eatMode ? '😋' : '🤤');
  }
  drawEmoji(icon, bx, onCooldown ? by - 5 : by, 20);

  // Cooldown seconds label
  if (onCooldown) {
    ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#aaa';
    ctx.fillText(Math.ceil(powerState.cooldown / 1000) + 's', bx, by + 11);
  }

  // Stored poop count badge (남자1)
  if (power.type === 'eat' && powerState.storedPoops > 0) {
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('×' + powerState.storedPoops, bx + 15, by - 15);
  }

  // Label under button
  ctx.font = '8px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(200,200,200,0.7)';
  let label = power.name;
  if (power.type === 'eat') label = powerState.storedPoops > 0 ? '뱉기' : (powerState.eatMode ? '대기중' : '먹기');
  ctx.fillText(label, bx, by + br + 2);

  // Key hint
  ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(150,150,200,0.55)';
  ctx.fillText('[Z]', bx - br - 8, by);
}

function renderGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  ctx.fillStyle = 'rgba(20,20,40,0.95)';
  roundRect(50, 150, BASE_W - 100, 300, 20);
  ctx.fill();
  ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2;
  roundRect(50, 150, BASE_W - 100, 300, 20);
  ctx.stroke();

  drawEmoji('😵', BASE_W / 2, 205, 44);
  drawTextOutlined('게임 오버!', BASE_W / 2, 258, 24, '#FF6B6B');
  drawTextOutlined(`${currentChar.emoji}  ${currentChar.name}`, BASE_W / 2, 290, 14, 'rgba(255,255,255,0.7)');
  drawTextOutlined(`점수: ${score}`, BASE_W / 2, 320, 20, '#fff');

  if (score >= highScore && score > 0) {
    drawTextOutlined(`🏆 신기록! ${highScore}`, BASE_W / 2, 352, 15, '#FFD700');
  } else {
    drawTextOutlined(`최고 점수: ${highScore}`, BASE_W / 2, 352, 15, '#FFD700');
  }

  if (Math.floor(Date.now() / 600) % 2 === 0) {
    drawTextOutlined('Space / 탭: 재도전', BASE_W / 2, 392, 12, '#7FFF00');
  }
  drawTextOutlined('C: 캐릭터 변경', BASE_W / 2, 415, 11, 'rgba(255,255,255,0.6)');
}

// ─── Input Handling ─────────────────────────────────────────────
window.addEventListener('keydown', e => {
  keys[e.key] = true;

  if (state === STATES.CHARACTER_SELECT) {
    if      (e.key === 'ArrowRight') selectedCharIdx = (selectedCharIdx + 1) % CHARACTERS.length;
    else if (e.key === 'ArrowLeft')  selectedCharIdx = (selectedCharIdx - 1 + CHARACTERS.length) % CHARACTERS.length;
    else if (e.key === 'ArrowDown')  selectedCharIdx = Math.min(selectedCharIdx + COLS, CHARACTERS.length - 1);
    else if (e.key === 'ArrowUp')    selectedCharIdx = Math.max(selectedCharIdx - COLS, 0);
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); initGame(); state = STATES.PLAYING; }
    return;
  }

  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleAction(); }
  if ((e.key === 'z' || e.key === 'Z') && state === STATES.PLAYING) activatePower();
  if ((e.key === 'c' || e.key === 'C') && state === STATES.GAME_OVER) state = STATES.CHARACTER_SELECT;
});
window.addEventListener('keyup', e => { keys[e.key] = false; });

function handleAction() {
  if      (state === STATES.MENU)      state = STATES.CHARACTER_SELECT;
  else if (state === STATES.GAME_OVER) { initGame(); state = STATES.PLAYING; }
}

// ─── Touch / Click ───────────────────────────────────────────────
let touchDir = 0;

function getCanvasPos(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (BASE_W / rect.width),
    y: (clientY - rect.top)  * (BASE_H / rect.height)
  };
}

function isPowerBtnHit(x, y) {
  if (!currentChar.power) return false;
  return Math.hypot(x - POWER_BTN.x, y - POWER_BTN.y) <= POWER_BTN.r;
}

function getCellIndexAt(x, y) {
  for (let i = 0; i < CHARACTERS.length; i++) {
    const col = i % COLS, row = Math.floor(i / COLS);
    const cx = GRID_X + col * CELL_W + 4;
    const cy = GRID_Y + row * CELL_H + 4;
    if (x >= cx && x <= cx + CELL_W - 8 && y >= cy && y <= cy + CELL_H - 8) return i;
  }
  return -1;
}

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const pos = getCanvasPos(e.touches[0].clientX, e.touches[0].clientY);

  if (state === STATES.CHARACTER_SELECT) {
    const idx = getCellIndexAt(pos.x, pos.y);
    if (idx >= 0) { idx === selectedCharIdx ? (initGame(), state = STATES.PLAYING) : (selectedCharIdx = idx); }
    return;
  }
  if (state === STATES.MENU || state === STATES.GAME_OVER) { handleAction(); return; }
  if (state === STATES.PLAYING && isPowerBtnHit(pos.x, pos.y)) { activatePower(); return; }
  touchDir = pos.x < BASE_W / 2 ? -1 : 1;
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  if (state !== STATES.PLAYING) return;
  const pos = getCanvasPos(e.touches[0].clientX, e.touches[0].clientY);
  if (!isPowerBtnHit(pos.x, pos.y)) touchDir = pos.x < BASE_W / 2 ? -1 : 1;
}, { passive: false });

canvas.addEventListener('touchend', e => {
  e.preventDefault();
  touchDir = 0;
}, { passive: false });

canvas.addEventListener('click', e => {
  const pos = getCanvasPos(e.clientX, e.clientY);
  if (state === STATES.CHARACTER_SELECT) {
    const idx = getCellIndexAt(pos.x, pos.y);
    if (idx >= 0) { idx === selectedCharIdx ? (initGame(), state = STATES.PLAYING) : (selectedCharIdx = idx); }
    return;
  }
  if (state === STATES.PLAYING && isPowerBtnHit(pos.x, pos.y)) { activatePower(); return; }
  if (state === STATES.MENU || state === STATES.GAME_OVER) handleAction();
});

// ─── Game Loop ──────────────────────────────────────────────────
function loop(timestamp) {
  const dt = Math.min(timestamp - lastTime, 50);
  lastTime = timestamp;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(loop); });
