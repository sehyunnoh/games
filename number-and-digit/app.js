const PROBLEM_COUNT = 10;
const MIN_SPAN = 3;
const MAX_SPAN = 30;
const ABS_MIN = 1;
const ABS_MAX = 9999;
const DEFAULT_MIN = 1;
const DEFAULT_MAX = 100;
const BOUNDARIES = [10, 100, 1000];
const DIGIT_NAMES = { 1: '한 자리', 2: '두 자리', 3: '세 자리', 4: '네 자리' };
const SETTINGS_KEY = 'numberAndDigitSettings';
const HISTORY_KEY = 'numberAndDigitHistory';

const state = {
  phase: 'START',
  settings: null,
  problems: [],
  elapsedSeconds: 0,
  timerId: null,
};

function randBetween(lo, hi) {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

// ── 계산 ──

function countNumbers(start, end) {
  return end - start + 1;
}

// 자릿수가 같은 구간별로 쪼갠다 → [{ from, to, len, count }]
function splitByDigitLength(start, end) {
  const segments = [];
  let from = start;

  while (from <= end) {
    const len = String(from).length;
    const to = Math.min(end, Math.pow(10, len) - 1);
    segments.push({ from, to, len, count: to - from + 1 });
    from = to + 1;
  }

  return segments;
}

function countDigits(start, end) {
  return splitByDigitLength(start, end).reduce((sum, s) => sum + s.count * s.len, 0);
}

// ── 문제 생성 ──

function boundariesIn(min, max) {
  return BOUNDARIES.filter(b => b > min && b <= max);
}

// count가 큰 구간이 더 자주 뽑히도록 가중 선택
function pickWeighted(bands) {
  const total = bands.reduce((sum, b) => sum + b.count, 0);
  let r = randBetween(1, total);

  for (const band of bands) {
    if (r <= band.count) return band;
    r -= band.count;
  }

  return bands[bands.length - 1];
}

// 자릿수 경계를 넘지 않는 범위
function makePlainRange(min, max, spanCap) {
  const bands = splitByDigitLength(min, max).filter(s => s.count >= MIN_SPAN);
  if (bands.length === 0) return null;

  // 구간 폭에 비례해 고른다 (1~100에서 한 자리 수 문제만 잔뜩 나오지 않도록)
  const band = pickWeighted(bands);
  const span = randBetween(MIN_SPAN, Math.min(spanCap, band.count));
  const start = randBetween(band.from, band.to - span + 1);

  return { start, end: start + span - 1 };
}

// 자릿수 경계(10 / 100 / 1000)를 걸치는 범위
function makeCrossingRange(min, max, spanCap) {
  const boundaries = boundariesIn(min, max);
  if (boundaries.length === 0) return null;

  const b = boundaries[randBetween(0, boundaries.length - 1)];
  const maxBefore = Math.min(b - min, spanCap - 1, 6);
  const maxAfter = Math.min(max - b + 1, spanCap - 1, 8);
  if (maxBefore < 1 || maxAfter < 1) return null;

  for (let tries = 0; tries < 30; tries++) {
    const before = randBetween(1, maxBefore);
    const after = randBetween(1, maxAfter);
    const span = before + after;
    if (span >= MIN_SPAN && span <= spanCap) {
      return { start: b - before, end: b + after - 1 };
    }
  }

  return null;
}

function toProblem(range) {
  return {
    start: range.start,
    end: range.end,
    numberCount: countNumbers(range.start, range.end),
    digitCount: countDigits(range.start, range.end),
  };
}

function generateProblems(min, max) {
  const spanCap = Math.min(MAX_SPAN, max - min + 1);
  const crossingTarget = boundariesIn(min, max).length > 0 ? randBetween(2, 3) : 0;
  const problems = [];
  const seen = new Set();

  const add = range => {
    if (!range) return false;
    const key = `${range.start}-${range.end}`;
    if (seen.has(key)) return false;
    seen.add(key);
    problems.push(toProblem(range));
    return true;
  };

  // 1) 경계를 넘는 문제 먼저 확보
  for (let tries = 0; problems.length < crossingTarget && tries < 200; tries++) {
    add(makeCrossingRange(min, max, spanCap));
  }

  // 2) 나머지는 일반 문제 (범위가 좁아 일반 문제를 못 만들면 경계형으로 대체)
  for (let tries = 0; problems.length < PROBLEM_COUNT && tries < 400; tries++) {
    add(makePlainRange(min, max, spanCap) || makeCrossingRange(min, max, spanCap));
  }

  // 3) 서로 다른 범위가 부족하면 중복 허용
  while (problems.length < PROBLEM_COUNT) {
    const range = makePlainRange(min, max, spanCap) || makeCrossingRange(min, max, spanCap);
    if (!range) break;
    problems.push(toProblem(range));
  }

  // 경계형 문제가 앞쪽에 몰리지 않게 섞는다
  for (let i = problems.length - 1; i > 0; i--) {
    const j = randBetween(0, i);
    [problems[i], problems[j]] = [problems[j], problems[i]];
  }

  return problems;
}

// 수를 읽었을 때 받침이 있으면 '은', 없으면 '는' (2·4·5·9로 끝나면 받침 없음)
function topicParticle(n) {
  return [2, 4, 5, 9].includes(n % 10) ? '는' : '은';
}

function buildExplanation(p) {
  const segments = splitByDigitLength(p.start, p.end);
  const head = `${p.end} - ${p.start} + 1 = ${p.numberCount}개`;

  if (segments.length === 1) {
    const len = segments[0].len;
    return `${head}, ${DIGIT_NAMES[len]} 수이므로 ${p.numberCount} × ${len} = ${p.digitCount}개`;
  }

  const parts = segments
    .map(s => {
      const label = s.count === 1 ? `${s.from}` : `${s.from}~${s.to}`;
      return `${label}${topicParticle(s.to)} ${s.count}개×${s.len}=${s.count * s.len}`;
    })
    .join(', ');

  return `${head}, ${parts} → ${p.digitCount}개`;
}

// ── 설정 ──

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || null;
  } catch {
    return null;
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function showRangeError(message) {
  const el = document.getElementById('range-error');
  el.textContent = message;
  el.classList.remove('hidden');
}

function readSettings() {
  const minInput = document.getElementById('range-min');
  const maxInput = document.getElementById('range-max');

  let min = Math.floor(Number(minInput.value));
  let max = Math.floor(Number(maxInput.value));

  if (!Number.isFinite(min) || min < ABS_MIN) min = ABS_MIN;
  if (!Number.isFinite(max) || max > ABS_MAX) max = ABS_MAX;

  // 보정된 값을 입력칸에 반영
  minInput.value = min;
  maxInput.value = max;

  if (max <= min) {
    showRangeError('최대값은 최소값보다 커야 합니다.');
    return null;
  }

  if (max - min + 1 < MIN_SPAN) {
    showRangeError(`범위가 너무 좁습니다. 최소 ${MIN_SPAN}개 이상의 수가 필요합니다.`);
    return null;
  }

  document.getElementById('range-error').classList.add('hidden');
  return { min, max };
}

// ── 렌더링 ──

function renderProblems() {
  const grid = document.getElementById('problem-grid');
  grid.innerHTML = '';

  state.problems.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'problem-card';
    card.id = `card-${i}`;
    card.innerHTML = `
      <span class="problem-num">${i + 1}</span>
      <div class="question-text">
        <span class="range-num">${p.start}</span>에서 <span class="range-num">${p.end}</span>까지의 수
      </div>
      <div class="answer-row">
        <label class="answer-field">수의 개수
          <input type="number" id="n-${i}" class="answer-input" inputmode="numeric" autocomplete="off">개
        </label>
        <label class="answer-field">숫자의 개수
          <input type="number" id="d-${i}" class="answer-input" inputmode="numeric" autocomplete="off">개
        </label>
      </div>
      <div class="correct-answer hidden" id="correct-${i}"></div>
      <div class="explain hidden" id="explain-${i}"></div>
    `;
    grid.appendChild(card);
  });

  const first = document.getElementById('n-0');
  if (first) first.focus();
}

// ── 게임 흐름 ──

function startGame() {
  const settings = readSettings();
  if (!settings) return;

  saveSettings(settings);

  state.settings = settings;
  state.problems = generateProblems(settings.min, settings.max);

  document.getElementById('range-label').textContent = `${settings.min} ~ ${settings.max}`;
  renderProblems();

  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');

  state.phase = 'PLAYING';
  state.elapsedSeconds = 0;
  updateElapsedDisplay();
  startTimer();
}

function startTimer() {
  state.timerId = setInterval(() => {
    state.elapsedSeconds++;
    updateElapsedDisplay();
  }, 1000);
}

function stopTimer() {
  clearInterval(state.timerId);
}

function updateElapsedDisplay() {
  const m = Math.floor(state.elapsedSeconds / 60);
  const s = state.elapsedSeconds % 60;
  document.getElementById('elapsed').textContent = `${m}:${String(s).padStart(2, '0')}`;
}

function submitAnswers() {
  if (state.phase === 'RESULT') return;
  state.phase = 'RESULT';

  stopTimer();

  let correct = 0;

  state.problems.forEach((p, i) => {
    const nInput = document.getElementById(`n-${i}`);
    const dInput = document.getElementById(`d-${i}`);
    const card = document.getElementById(`card-${i}`);

    const nVal = nInput.value.trim();
    const dVal = dInput.value.trim();
    const userNumbers = nVal === '' ? NaN : Number(nVal);
    const userDigits = dVal === '' ? NaN : Number(dVal);

    nInput.disabled = true;
    dInput.disabled = true;

    const isCorrect = userNumbers === p.numberCount && userDigits === p.digitCount;

    if (isCorrect) {
      card.classList.add('correct');
      correct++;
    } else {
      card.classList.add('wrong');

      const correctEl = document.getElementById(`correct-${i}`);
      correctEl.textContent = `정답: 수 ${p.numberCount}개 / 숫자 ${p.digitCount}개`;
      correctEl.classList.remove('hidden');

      const explainEl = document.getElementById(`explain-${i}`);
      explainEl.textContent = buildExplanation(p);
      explainEl.classList.remove('hidden');
    }
  });

  const scoreEl = document.getElementById('score');
  scoreEl.textContent = `${correct} / ${state.problems.length}`;
  scoreEl.classList.remove('hidden');

  document.getElementById('submit-btn').classList.add('hidden');
  document.getElementById('reset-btn').classList.remove('hidden');

  saveHistory(correct, state.problems.length, state.elapsedSeconds, state.settings);
  renderHistory();
}

// ── HISTORY ──

function saveHistory(score, total, elapsedSeconds, settings) {
  const history = loadHistory();
  history.unshift({ date: new Date().toISOString(), score, total, elapsedSeconds, settings });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function renderHistory() {
  const history = loadHistory();
  const section = document.getElementById('history-section');

  if (history.length === 0) return;

  const bestAccuracy = Math.max(...history.map(h => h.score / h.total));

  const rows = history.map((h, i) => {
    const isCurrent = i === 0;
    const isBest = h.score / h.total === bestAccuracy;
    const d = new Date(h.date);
    const pad = n => String(n).padStart(2, '0');
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const timeStr = `${Math.floor(h.elapsedSeconds / 60)}:${pad(h.elapsedSeconds % 60)}`;
    const rangeStr = `${h.settings.min} ~ ${h.settings.max}`;

    const classes = [isBest ? 'history-best' : '', isCurrent ? 'history-current' : ''].filter(Boolean).join(' ');

    return `<tr class="${classes}">
      <td class="history-star">${isBest ? '★' : ''}</td>
      <td class="history-date">${dateStr}</td>
      <td class="history-settings">${rangeStr}</td>
      <td class="history-score">${h.score} / ${h.total}</td>
      <td class="history-time">${timeStr}</td>
    </tr>`;
  }).join('');

  section.innerHTML = `
    <div class="history-title">기록</div>
    <table class="history-table">
      <thead>
        <tr>
          <th></th>
          <th>날짜</th>
          <th>범위</th>
          <th>점수</th>
          <th>소요 시간</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
  section.classList.remove('hidden');
}

function reset() {
  stopTimer();
  state.phase = 'START';
  state.problems = [];
  state.elapsedSeconds = 0;

  document.getElementById('elapsed').textContent = '0:00';
  document.getElementById('score').classList.add('hidden');
  document.getElementById('submit-btn').classList.remove('hidden');
  document.getElementById('reset-btn').classList.add('hidden');
  document.getElementById('problem-grid').innerHTML = '';
  document.getElementById('history-section').classList.add('hidden');

  document.getElementById('game-screen').classList.add('hidden');
  document.getElementById('start-screen').classList.remove('hidden');
}

// ── 초기화 ──

(function init() {
  const saved = loadSettings();
  document.getElementById('range-min').value = saved ? saved.min : DEFAULT_MIN;
  document.getElementById('range-max').value = saved ? saved.max : DEFAULT_MAX;

  ['range-min', 'range-max'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') startGame();
    });
  });
})();
