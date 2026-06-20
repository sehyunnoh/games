const state = {
  phase: 'START',
  problems: [],
  timeLeft: 180,
  timerId: null,
};

function rand() {
  return Math.floor(Math.random() * 13);
}

function generateProblems() {
  state.problems = Array.from({ length: 50 }, () => {
    const a = rand(), b = rand(), c = rand();
    return { a, b, c, answer: a * b * c };
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
      <span class="problem-text">${p.a} × ${p.b} × ${p.c} =</span>
      <input
        type="number"
        id="ans-${i}"
        class="answer-input"
        min="0"
        max="9999"
        autocomplete="off"
      >
    `;
    grid.appendChild(card);
  });

  // 첫 번째 입력 필드에 포커스
  document.getElementById('ans-0').focus();
}

function startGame() {
  generateProblems();
  renderProblems();

  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');

  state.phase = 'PLAYING';
  state.timeLeft = 180;
  updateTimerDisplay();
  startTimer();
}

function startTimer() {
  state.timerId = setInterval(() => {
    state.timeLeft--;
    updateTimerDisplay();
    if (state.timeLeft <= 0) {
      clearInterval(state.timerId);
      submitAnswers();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const m = Math.floor(state.timeLeft / 60);
  const s = state.timeLeft % 60;
  const timerEl = document.getElementById('timer');
  timerEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
  timerEl.classList.toggle('warning', state.timeLeft <= 30);
}

function submitAnswers() {
  if (state.phase === 'RESULT') return;
  state.phase = 'RESULT';

  clearInterval(state.timerId);

  let correct = 0;

  state.problems.forEach((p, i) => {
    const input = document.getElementById(`ans-${i}`);
    const card = document.getElementById(`card-${i}`);
    const val = input.value.trim();
    const userAnswer = val === '' ? NaN : Number(val);

    input.disabled = true;

    if (!isNaN(userAnswer) && userAnswer === p.answer) {
      card.classList.add('correct');
      correct++;
    } else {
      card.classList.add('wrong');
    }
  });

  const scoreEl = document.getElementById('score');
  scoreEl.textContent = `${correct} / 50`;
  scoreEl.classList.remove('hidden');

  document.getElementById('submit-btn').classList.add('hidden');
  document.getElementById('reset-btn').classList.remove('hidden');

  saveHistory(correct, state.timeLeft);
  renderHistory();
}

// ── HISTORY ──

function saveHistory(score, timeLeft) {
  const history = loadHistory();
  history.unshift({ date: new Date().toISOString(), score, timeLeft });
  localStorage.setItem('madMinuteHistory', JSON.stringify(history.slice(0, 10)));
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem('madMinuteHistory') || '[]');
  } catch {
    return [];
  }
}

function renderHistory() {
  const history = loadHistory();
  const section = document.getElementById('history-section');

  if (history.length === 0) return;

  const bestScore = Math.max(...history.map(h => h.score));

  const rows = history.map((h, i) => {
    const isCurrent = i === 0;
    const isBest = h.score === bestScore;
    const d = new Date(h.date);
    const pad = n => String(n).padStart(2, '0');
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const timeStr = h.timeLeft === 0
      ? '타임아웃'
      : `${Math.floor(h.timeLeft / 60)}:${pad(h.timeLeft % 60)} 남음`;

    const classes = [isBest ? 'history-best' : '', isCurrent ? 'history-current' : ''].filter(Boolean).join(' ');

    return `<tr class="${classes}">
      <td class="history-star">${isBest ? '★' : ''}</td>
      <td class="history-date">${dateStr}</td>
      <td class="history-score">${h.score} / 50</td>
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
          <th>점수</th>
          <th>남은 시간</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
  section.classList.remove('hidden');
}

function reset() {
  clearInterval(state.timerId);
  state.phase = 'START';
  state.problems = [];
  state.timeLeft = 180;

  const timerEl = document.getElementById('timer');
  timerEl.textContent = '3:00';
  timerEl.classList.remove('warning');

  document.getElementById('score').classList.add('hidden');
  document.getElementById('submit-btn').classList.remove('hidden');
  document.getElementById('reset-btn').classList.add('hidden');
  document.getElementById('problem-grid').innerHTML = '';
  document.getElementById('history-section').classList.add('hidden');

  document.getElementById('game-screen').classList.add('hidden');
  document.getElementById('start-screen').classList.remove('hidden');
}
