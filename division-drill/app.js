// ── I18N ──

const LANG_KEY = 'siteLang';

const I18N = {
  ko: {
    title: '나눗셈 연습',
    subtitle: '문제를 풀고 몫과 나머지를 입력한 뒤 Submit을 눌러보세요',
    home: '🏠 홈',
    dividendLabel: '나눠지는 수 (피제수) 자리수',
    dividendTen: '십의자리 (1~10)',
    dividendHundred: '백의자리 (1~100)',
    dividendThousand: '천의자리 (1~1000)',
    dividendTenThousand: '만의자리 (1~10000)',
    divisorLabel: '나누는 수 (제수) 자리수',
    divisorOne: '일의자리 (1~9)',
    divisorTen: '십의자리 (1~10)',
    divisorHundred: '백의자리 (1~100)',
    problemCount: '문제 수',
    quotient: '몫',
    remainder: '나머지',
    answer: '정답: 몫 {q} 나머지 {r}',
    dividendShort: '피제수',
    divisorShort: '제수',
    historyTitle: '기록',
    date: '날짜',
    settings: '자리수 설정',
    score: '점수',
    elapsed: '소요 시간',
    digitOne: '일',
    digitTen: '십',
    digitHundred: '백',
    digitThousand: '천',
    digitTenThousand: '만',
  },
  en: {
    title: 'Division Drill',
    subtitle: 'Solve each problem, enter the quotient and remainder, then press Submit',
    home: '🏠 Home',
    dividendLabel: 'Dividend size',
    dividendTen: 'Tens (1-10)',
    dividendHundred: 'Hundreds (1-100)',
    dividendThousand: 'Thousands (1-1000)',
    dividendTenThousand: 'Ten-thousands (1-10000)',
    divisorLabel: 'Divisor size',
    divisorOne: 'Ones (1-9)',
    divisorTen: 'Tens (1-10)',
    divisorHundred: 'Hundreds (1-100)',
    problemCount: 'Problems',
    quotient: 'Quotient',
    remainder: 'Remainder',
    answer: 'Answer: quotient {q}, remainder {r}',
    dividendShort: 'Dividend',
    divisorShort: 'Divisor',
    historyTitle: 'History',
    date: 'Date',
    settings: 'Digit settings',
    score: 'Score',
    elapsed: 'Time',
    digitOne: 'ones',
    digitTen: 'tens',
    digitHundred: 'hundreds',
    digitThousand: 'thousands',
    digitTenThousand: 'ten-thousands',
  },
};

// 예전 기록에는 자리수 설정이 한국어('십', '백'…)로 저장되어 있다
const LEGACY_DIGIT_KEYS = { 일: 'one', 십: 'ten', 백: 'hundred', 천: 'thousand', 만: 'tenThousand' };

const DIGIT_LABEL_KEYS = {
  one: 'digitOne',
  ten: 'digitTen',
  hundred: 'digitHundred',
  thousand: 'digitThousand',
  tenThousand: 'digitTenThousand',
};

let lang = localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'ko';

function t(key, params) {
  let s = I18N[lang][key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

function digitLabel(value) {
  const key = DIGIT_LABEL_KEYS[LEGACY_DIGIT_KEYS[value] ?? value];
  return key ? t(key) : value;
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

  const label = lang === 'ko' ? '🌐 English' : '🌐 한국어';
  document.getElementById('lang-btn').textContent = label;
  document.getElementById('lang-btn-game').textContent = label;

  // 이미 그려진 문제/기록은 현재 상태 그대로 다시 그린다
  if (state.problems.length > 0) {
    captureAnswers();
    renderProblems();
  }
  if (state.phase === 'RESULT') renderHistory();
}

// ── GAME ──

const DIVIDEND_RANGES = { ten: 10, hundred: 100, thousand: 1000, tenThousand: 10000 };
const DIVISOR_RANGES = { one: 9, ten: 10, hundred: 100 };

const state = {
  phase: 'START',
  settings: null,
  problems: [],
  answers: [],
  elapsedSeconds: 0,
  timerId: null,
};

function randInt(max) {
  return Math.floor(Math.random() * max) + 1;
}

function generateProblems(count, dividendMax, divisorMax) {
  return Array.from({ length: count }, () => {
    const divisor = randInt(divisorMax);
    const dividend = randInt(dividendMax);
    return {
      dividend,
      divisor,
      quotient: Math.floor(dividend / divisor),
      remainder: dividend % divisor,
    };
  });
}

// 화면의 입력값을 state에 담아둔다 (언어 전환으로 다시 그려도 유지되도록)
function captureAnswers() {
  if (state.phase === 'RESULT') return;

  state.problems.forEach((p, i) => {
    const qInput = document.getElementById(`q-${i}`);
    const rInput = document.getElementById(`r-${i}`);
    if (!qInput || !rInput) return;
    state.answers[i] = { q: qInput.value, r: rInput.value };
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
      <div class="long-division">
        <span class="divisor">${p.divisor}</span>
        <span class="bracket"><span class="dividend">${p.dividend}</span></span>
      </div>
      <div class="answer-row">
        <label class="answer-field">${t('quotient')}
          <input type="number" id="q-${i}" class="answer-input" inputmode="numeric" autocomplete="off">
        </label>
        <label class="answer-field">${t('remainder')}
          <input type="number" id="r-${i}" class="answer-input" inputmode="numeric" autocomplete="off">
        </label>
      </div>
      <div class="correct-answer hidden" id="correct-${i}"></div>
    `;
    grid.appendChild(card);
  });

  restoreAnswers();

  if (state.phase === 'PLAYING') document.getElementById('q-0').focus();
}

// 저장해둔 입력값과 채점 결과를 화면에 되돌린다
function restoreAnswers() {
  state.problems.forEach((p, i) => {
    const answer = state.answers[i];
    if (!answer) return;

    const qInput = document.getElementById(`q-${i}`);
    const rInput = document.getElementById(`r-${i}`);
    qInput.value = answer.q;
    rInput.value = answer.r;

    if (state.phase !== 'RESULT') return;

    qInput.disabled = true;
    rInput.disabled = true;

    const card = document.getElementById(`card-${i}`);
    card.classList.add(answer.correct ? 'correct' : 'wrong');

    if (!answer.correct) {
      const correctEl = document.getElementById(`correct-${i}`);
      correctEl.textContent = t('answer', { q: p.quotient, r: p.remainder });
      correctEl.classList.remove('hidden');
    }
  });
}

function startGame() {
  const dividendDigit = document.getElementById('dividend-digit').value;
  const divisorDigit = document.getElementById('divisor-digit').value;
  const problemCount = Number(document.getElementById('problem-count').value);

  state.settings = { dividendDigit, divisorDigit, problemCount };
  state.problems = generateProblems(
    problemCount,
    DIVIDEND_RANGES[dividendDigit],
    DIVISOR_RANGES[divisorDigit]
  );
  state.answers = [];
  state.phase = 'PLAYING';

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
    const answer = state.answers[i] || { q: '', r: '' };
    const qVal = answer.q.trim();
    const rVal = answer.r.trim();
    const userQuotient = qVal === '' ? NaN : Number(qVal);
    const userRemainder = rVal === '' ? NaN : Number(rVal);

    answer.correct = userQuotient === p.quotient && userRemainder === p.remainder;
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
  localStorage.setItem('divisionDrillHistory', JSON.stringify(history.slice(0, 10)));
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem('divisionDrillHistory') || '[]');
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
    const settingsStr = `${t('dividendShort')} ${digitLabel(h.settings.dividendDigit)} / ${t('divisorShort')} ${digitLabel(h.settings.divisorDigit)}`;

    const classes = [isBest ? 'history-best' : '', isCurrent ? 'history-current' : ''].filter(Boolean).join(' ');

    return `<tr class="${classes}">
      <td class="history-star">${isBest ? '★' : ''}</td>
      <td class="history-date">${dateStr}</td>
      <td class="history-settings">${settingsStr}</td>
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
          <th>${t('settings')}</th>
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

applyLanguage();
