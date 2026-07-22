const DIVIDEND_RANGES = { 십: 10, 백: 100, 천: 1000, 만: 10000 };
const DIVISOR_RANGES = { 일: 9, 십: 10, 백: 100 };

const state = {
  phase: 'START',
  settings: null,
  problems: [],
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
        <label class="answer-field">몫
          <input type="number" id="q-${i}" class="answer-input" inputmode="numeric" autocomplete="off">
        </label>
        <label class="answer-field">나머지
          <input type="number" id="r-${i}" class="answer-input" inputmode="numeric" autocomplete="off">
        </label>
      </div>
      <div class="correct-answer hidden" id="correct-${i}"></div>
    `;
    grid.appendChild(card);
  });

  document.getElementById('q-0').focus();
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
    const qInput = document.getElementById(`q-${i}`);
    const rInput = document.getElementById(`r-${i}`);
    const card = document.getElementById(`card-${i}`);

    const qVal = qInput.value.trim();
    const rVal = rInput.value.trim();
    const userQuotient = qVal === '' ? NaN : Number(qVal);
    const userRemainder = rVal === '' ? NaN : Number(rVal);

    qInput.disabled = true;
    rInput.disabled = true;

    const isCorrect = userQuotient === p.quotient && userRemainder === p.remainder;

    if (isCorrect) {
      card.classList.add('correct');
      correct++;
    } else {
      card.classList.add('wrong');
      const correctEl = document.getElementById(`correct-${i}`);
      correctEl.textContent = `정답: 몫 ${p.quotient} 나머지 ${p.remainder}`;
      correctEl.classList.remove('hidden');
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
    const settingsStr = `피제수 ${h.settings.dividendDigit} / 제수 ${h.settings.divisorDigit}`;

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
    <div class="history-title">기록</div>
    <table class="history-table">
      <thead>
        <tr>
          <th></th>
          <th>날짜</th>
          <th>자리수 설정</th>
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
