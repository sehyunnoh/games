// ── I18N ──

const LANG_KEY = 'siteLang';

const I18N = {
  ko: {
    title: '수와 숫자',
    subtitle: '범위 안에 수는 몇 개, 숫자는 몇 개인지 맞혀보세요',
    home: '🏠 홈',
    explainQuestion: '10에서 22까지의 수',
    explainNumbers: '<b>수</b>의 개수 = 22 - 10 + 1 = <b>13개</b>',
    explainDigits: '<b>숫자</b>의 개수 = 13 × 2 = <b>26개</b>',
    minLabel: '최소값',
    maxLabel: '최대값',
    errorMaxTooSmall: '최대값은 최소값보다 커야 합니다.',
    errorRangeTooNarrow: '범위가 너무 좁습니다. 최소 {n}개 이상의 수가 필요합니다.',
    question: '{start}에서 {end}까지의 수',
    numbersLabel: '수의 개수',
    digitsLabel: '숫자의 개수',
    unit: '개',
    answer: '정답: 수 {n}개 / 숫자 {d}개',
    explainHead: '{end} - {start} + 1 = {n}개, ',
    explainSingle: '{name} 수이므로 {n} × {len} = {total}개',
    explainTail: ' → {total}개',
    rangeSep: '~',
    digit1: '한 자리',
    digit2: '두 자리',
    digit3: '세 자리',
    digit4: '네 자리',
    historyTitle: '기록',
    date: '날짜',
    range: '범위',
    score: '점수',
    elapsed: '소요 시간',
  },
  en: {
    title: 'Numbers & Digits',
    subtitle: 'Guess how many numbers, and how many digits, are in the range',
    home: '🏠 Home',
    explainQuestion: 'Numbers from 10 to 22',
    explainNumbers: '<b>Numbers</b> = 22 - 10 + 1 = <b>13</b>',
    explainDigits: '<b>Digits</b> = 13 × 2 = <b>26</b>',
    minLabel: 'Minimum',
    maxLabel: 'Maximum',
    errorMaxTooSmall: 'The maximum must be greater than the minimum.',
    errorRangeTooNarrow: 'That range is too narrow. It needs at least {n} numbers.',
    question: 'Numbers from {start} to {end}',
    numbersLabel: 'Numbers',
    digitsLabel: 'Digits',
    unit: '',
    answer: 'Answer: {n} numbers / {d} digits',
    explainHead: '{end} - {start} + 1 = {n} numbers, ',
    explainSingle: 'all {name}, so {n} × {len} = {total} digits',
    explainTail: ' → {total} digits',
    rangeSep: '-',
    digit1: '1-digit',
    digit2: '2-digit',
    digit3: '3-digit',
    digit4: '4-digit',
    historyTitle: 'History',
    date: 'Date',
    range: 'Range',
    score: 'Score',
    elapsed: 'Time',
  },
};

let lang = localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'ko';

function t(key, params) {
  let s = I18N[lang][key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

function toggleLang() {
  lang = lang === 'ko' ? 'en' : 'ko';
  localStorage.setItem(LANG_KEY, lang);
  applyLanguage();
}

function applyLanguage() {
  document.documentElement.lang = lang;
  document.title = t('title');

  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });

  const label = lang === 'ko' ? '🌐 English' : '🌐 한국어';
  document.getElementById('lang-btn').textContent = label;
  document.getElementById('lang-btn-game').textContent = label;

  if (state.error) showRangeError(state.error.key, state.error.params);

  // 이미 그려진 문제/기록은 현재 상태 그대로 다시 그린다
  if (state.problems.length > 0) {
    captureAnswers();
    renderProblems();
  }
  if (state.phase === 'RESULT') renderHistory();
}

// ── GAME ──

const PROBLEM_COUNT = 10;
const MIN_SPAN = 3;
const MAX_SPAN = 30;
const ABS_MIN = 1;
const ABS_MAX = 9999;
const DEFAULT_MIN = 1;
const DEFAULT_MAX = 100;
const BOUNDARIES = [10, 100, 1000];
const SETTINGS_KEY = 'numberAndDigitSettings';
const HISTORY_KEY = 'numberAndDigitHistory';

const state = {
  phase: 'START',
  settings: null,
  problems: [],
  answers: [],
  error: null,
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

// 수를 읽었을 때 받침이 있으면 '은', 없으면 '는' (2·4·5·9로 끝나면 받침 없음) — 한국어 전용
function topicParticle(n) {
  return [2, 4, 5, 9].includes(n % 10) ? '는' : '은';
}

function buildExplanation(p) {
  const segments = splitByDigitLength(p.start, p.end);
  const head = t('explainHead', { end: p.end, start: p.start, n: p.numberCount });

  if (segments.length === 1) {
    const len = segments[0].len;
    return head + t('explainSingle', {
      name: t(`digit${len}`),
      n: p.numberCount,
      len,
      total: p.digitCount,
    });
  }

  const parts = segments
    .map(s => {
      const label = s.count === 1 ? `${s.from}` : `${s.from}${t('rangeSep')}${s.to}`;
      const calc = `${s.count}×${s.len}=${s.count * s.len}`;
      return lang === 'ko'
        ? `${label}${topicParticle(s.to)} ${s.count}개×${s.len}=${s.count * s.len}`
        : `${label}: ${calc}`;
    })
    .join(', ');

  return head + parts + t('explainTail', { total: p.digitCount });
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

function showRangeError(key, params) {
  state.error = { key, params };

  const el = document.getElementById('range-error');
  el.textContent = t(key, params);
  el.classList.remove('hidden');
}

function clearRangeError() {
  state.error = null;
  document.getElementById('range-error').classList.add('hidden');
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
    showRangeError('errorMaxTooSmall');
    return null;
  }

  if (max - min + 1 < MIN_SPAN) {
    showRangeError('errorRangeTooNarrow', { n: MIN_SPAN });
    return null;
  }

  clearRangeError();
  return { min, max };
}

// ── 렌더링 ──

// 화면의 입력값을 state에 담아둔다 (언어 전환으로 다시 그려도 유지되도록)
function captureAnswers() {
  if (state.phase === 'RESULT') return;

  state.problems.forEach((p, i) => {
    const nInput = document.getElementById(`n-${i}`);
    const dInput = document.getElementById(`d-${i}`);
    if (!nInput || !dInput) return;
    state.answers[i] = { n: nInput.value, d: dInput.value };
  });
}

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
        ${t('question', {
          start: `<span class="range-num">${p.start}</span>`,
          end: `<span class="range-num">${p.end}</span>`,
        })}
      </div>
      <div class="answer-row">
        <label class="answer-field">${t('numbersLabel')}
          <input type="number" id="n-${i}" class="answer-input" inputmode="numeric" autocomplete="off">${t('unit')}
        </label>
        <label class="answer-field">${t('digitsLabel')}
          <input type="number" id="d-${i}" class="answer-input" inputmode="numeric" autocomplete="off">${t('unit')}
        </label>
      </div>
      <div class="correct-answer hidden" id="correct-${i}"></div>
      <div class="explain hidden" id="explain-${i}"></div>
    `;
    grid.appendChild(card);
  });

  restoreAnswers();

  if (state.phase === 'PLAYING') {
    const first = document.getElementById('n-0');
    if (first) first.focus();
  }
}

// 저장해둔 입력값과 채점 결과를 화면에 되돌린다
function restoreAnswers() {
  state.problems.forEach((p, i) => {
    const answer = state.answers[i];
    if (!answer) return;

    const nInput = document.getElementById(`n-${i}`);
    const dInput = document.getElementById(`d-${i}`);
    nInput.value = answer.n;
    dInput.value = answer.d;

    if (state.phase !== 'RESULT') return;

    nInput.disabled = true;
    dInput.disabled = true;

    const card = document.getElementById(`card-${i}`);
    card.classList.add(answer.correct ? 'correct' : 'wrong');

    if (!answer.correct) {
      const correctEl = document.getElementById(`correct-${i}`);
      correctEl.textContent = t('answer', { n: p.numberCount, d: p.digitCount });
      correctEl.classList.remove('hidden');

      const explainEl = document.getElementById(`explain-${i}`);
      explainEl.textContent = buildExplanation(p);
      explainEl.classList.remove('hidden');
    }
  });
}

// ── 게임 흐름 ──

function startGame() {
  const settings = readSettings();
  if (!settings) return;

  saveSettings(settings);

  state.settings = settings;
  state.problems = generateProblems(settings.min, settings.max);
  state.answers = [];
  state.phase = 'PLAYING';

  document.getElementById('range-label').textContent = `${settings.min} ~ ${settings.max}`;
  renderProblems();

  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');

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

  captureAnswers();
  stopTimer();

  let correct = 0;

  state.problems.forEach((p, i) => {
    const answer = state.answers[i] || { n: '', d: '' };
    const nVal = answer.n.trim();
    const dVal = answer.d.trim();
    const userNumbers = nVal === '' ? NaN : Number(nVal);
    const userDigits = dVal === '' ? NaN : Number(dVal);

    answer.correct = userNumbers === p.numberCount && userDigits === p.digitCount;
    state.answers[i] = answer;

    if (answer.correct) correct++;
  });

  state.phase = 'RESULT';
  renderProblems();

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
    <div class="history-title">${t('historyTitle')}</div>
    <table class="history-table">
      <thead>
        <tr>
          <th></th>
          <th>${t('date')}</th>
          <th>${t('range')}</th>
          <th>${t('score')}</th>
          <th>${t('elapsed')}</th>
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
  state.answers = [];
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

  applyLanguage();
})();
