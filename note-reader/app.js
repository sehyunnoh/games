(function () {
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

  function step(note) {
    return note.octave * 7 + LETTERS.indexOf(note.letter);
  }

  const CLEFS = {
    treble: { glyph: '\u{1D11E}', bottomLine: { letter: 'E', octave: 4 } },
    bass: { glyph: '\u{1D122}', bottomLine: { letter: 'G', octave: 2 } },
  };

  function positionIndex(note, clefName) {
    return step(note) - step(CLEFS[clefName].bottomLine);
  }

  const RANGES = {
    treble: {
      staff: { min: { letter: 'E', octave: 4 }, max: { letter: 'F', octave: 5 } },
      extended: { min: { letter: 'C', octave: 4 }, max: { letter: 'G', octave: 5 } },
    },
    bass: {
      staff: { min: { letter: 'G', octave: 2 }, max: { letter: 'A', octave: 3 } },
      extended: { min: { letter: 'E', octave: 2 }, max: { letter: 'C', octave: 4 } },
    },
  };

  function enumerateNotes(min, max) {
    const notes = [];
    let cur = { letter: min.letter, octave: min.octave };
    while (step(cur) <= step(max)) {
      notes.push({ letter: cur.letter, octave: cur.octave });
      const idx = LETTERS.indexOf(cur.letter);
      cur = idx === LETTERS.length - 1
        ? { letter: LETTERS[0], octave: cur.octave + 1 }
        : { letter: LETTERS[idx + 1], octave: cur.octave };
    }
    return notes;
  }

  function noteKey(note) {
    return `${note.letter}${note.octave}`;
  }

  function clefsForHandMode(handMode) {
    if (handMode === 'right') return ['treble'];
    if (handMode === 'left') return ['bass'];
    return ['treble', 'bass'];
  }

  function keyboardRange(settings) {
    const clefs = clefsForHandMode(settings.handMode);
    let min = null;
    let max = null;
    clefs.forEach((clefName) => {
      const r = RANGES[clefName][settings.rangeMode];
      if (min === null || step(r.min) < step(min)) min = r.min;
      if (max === null || step(r.max) > step(max)) max = r.max;
    });
    return { min, max };
  }

  // ── DOM refs ──
  const startScreen = document.getElementById('start-screen');
  const gameScreen = document.getElementById('game-screen');
  const handModeGroup = document.getElementById('hand-mode-group');
  const rangeModeGroup = document.getElementById('range-mode-group');
  const startBtn = document.getElementById('start-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const staffContainer = document.getElementById('staff-container');
  const keyboardContainer = document.getElementById('keyboard');
  const streakDisplay = document.getElementById('streak-display');
  const accuracyDisplay = document.getElementById('accuracy-display');
  const bestStreakDisplay = document.getElementById('best-streak-display');
  const bestStreakValue = document.getElementById('best-streak-value');

  const settings = { handMode: 'right', rangeMode: 'staff' };

  function setupOptionGroup(group, onSelect) {
    group.addEventListener('click', (e) => {
      const btn = e.target.closest('.option-btn');
      if (!btn) return;
      [...group.children].forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      onSelect(btn.dataset.value);
    });
  }

  setupOptionGroup(handModeGroup, (v) => { settings.handMode = v; });
  setupOptionGroup(rangeModeGroup, (v) => { settings.rangeMode = v; });

  // ── Best streak persistence ──
  function loadBestStreak() {
    return parseInt(localStorage.getItem('noteReader_bestStreak') || '0', 10);
  }
  function saveBestStreak(v) {
    localStorage.setItem('noteReader_bestStreak', String(v));
  }

  // ── Game state ──
  let state = null;

  function startGame() {
    const { min, max } = keyboardRange(settings);
    state = {
      settings: { ...settings },
      currentClef: null,
      currentNote: null,
      lastNoteKey: null,
      streak: 0,
      bestStreak: loadBestStreak(),
      totalAnswered: 0,
      totalCorrect: 0,
      locked: false,
    };
    startScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    buildKeyboard(min, max);
    updateStats();
    nextQuestion();
  }

  function goToStart() {
    gameScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    const best = loadBestStreak();
    if (best > 0) {
      bestStreakValue.textContent = best;
      bestStreakDisplay.classList.remove('hidden');
    }
  }

  startBtn.addEventListener('click', startGame);
  settingsBtn.addEventListener('click', goToStart);

  function updateStats() {
    streakDisplay.textContent = `\u{1F525} ${state.streak}`;
    accuracyDisplay.textContent = `${state.totalCorrect} / ${state.totalAnswered}`;
  }

  function pickClef() {
    const clefs = clefsForHandMode(state.settings.handMode);
    return clefs[Math.floor(Math.random() * clefs.length)];
  }

  function clearKeyFeedback() {
    keyboardContainer.querySelectorAll('.key.white').forEach((k) => {
      k.classList.remove('correct', 'wrong', 'reveal');
    });
  }

  function nextQuestion() {
    clearKeyFeedback();
    const clefName = pickClef();
    const range = RANGES[clefName][state.settings.rangeMode];
    const pool = enumerateNotes(range.min, range.max);
    let note;
    do {
      note = pool[Math.floor(Math.random() * pool.length)];
    } while (pool.length > 1 && noteKey(note) === state.lastNoteKey);
    state.currentClef = clefName;
    state.currentNote = note;
    state.lastNoteKey = noteKey(note);
    state.locked = false;
    renderStaff(note, clefName);
  }

  // ── Staff rendering ──
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const STAFF_WIDTH = 220;
  const STAFF_HEIGHT = 200;
  const LINE_SPACING = 16;
  const BOTTOM_LINE_Y = 150;
  const NOTE_X = 150;

  function yForPosition(position) {
    return BOTTOM_LINE_Y - position * (LINE_SPACING / 2);
  }

  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }

  function renderStaff(note, clefName) {
    staffContainer.innerHTML = '';
    const svg = svgEl('svg', {
      width: STAFF_WIDTH,
      height: STAFF_HEIGHT,
      viewBox: `0 0 ${STAFF_WIDTH} ${STAFF_HEIGHT}`,
    });

    for (let p = 0; p <= 8; p += 2) {
      const y = yForPosition(p);
      svg.appendChild(svgEl('line', { x1: 20, y1: y, x2: STAFF_WIDTH - 20, y2: y, class: 'staff-line' }));
    }

    const glyphY = clefName === 'treble' ? BOTTOM_LINE_Y + 14 : yForPosition(4) + 12;
    const glyphSize = clefName === 'treble' ? 74 : 40;
    const glyph = svgEl('text', { x: 22, y: glyphY, class: 'clef-glyph', 'font-size': glyphSize });
    glyph.textContent = CLEFS[clefName].glyph;
    svg.appendChild(glyph);

    const position = positionIndex(note, clefName);
    if (position < 0) {
      for (let p = -2; p >= position; p -= 2) {
        const y = yForPosition(p);
        svg.appendChild(svgEl('line', { x1: NOTE_X - 13, y1: y, x2: NOTE_X + 13, y2: y, class: 'ledger-line' }));
      }
    } else if (position > 8) {
      for (let p = 10; p <= position; p += 2) {
        const y = yForPosition(p);
        svg.appendChild(svgEl('line', { x1: NOTE_X - 13, y1: y, x2: NOTE_X + 13, y2: y, class: 'ledger-line' }));
      }
    }

    const noteY = yForPosition(position);
    const notehead = svgEl('ellipse', { cx: NOTE_X, cy: noteY, rx: 9, ry: 7, class: 'notehead', id: 'notehead' });
    svg.appendChild(notehead);

    const stemUp = position <= 4;
    const stemX = stemUp ? NOTE_X + 9 : NOTE_X - 9;
    const stemY2 = stemUp ? noteY - 38 : noteY + 38;
    svg.appendChild(svgEl('line', { x1: stemX, y1: noteY, x2: stemX, y2: stemY2, class: 'staff-line' }));

    staffContainer.appendChild(svg);
  }

  // ── Keyboard rendering ──
  const WHITE_KEY_WIDTH = 44;
  const BLACK_KEY_WIDTH = 28;

  function buildKeyboard(min, max) {
    const whiteNotes = enumerateNotes(min, max);
    keyboardContainer.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'piano-keys';
    wrap.style.width = `${whiteNotes.length * WHITE_KEY_WIDTH}px`;

    whiteNotes.forEach((note, i) => {
      const key = document.createElement('div');
      key.className = 'key white';
      key.style.left = `${i * WHITE_KEY_WIDTH}px`;
      key.style.width = `${WHITE_KEY_WIDTH}px`;
      key.dataset.note = noteKey(note);
      if (note.letter === 'C' && note.octave === 4) {
        const dot = document.createElement('div');
        dot.className = 'middle-c-dot';
        key.appendChild(dot);
      }
      key.addEventListener('click', () => handleKeyClick(note, key));
      wrap.appendChild(key);
    });

    for (let i = 0; i < whiteNotes.length - 1; i++) {
      if (whiteNotes[i].letter !== 'E' && whiteNotes[i].letter !== 'B') {
        const black = document.createElement('div');
        black.className = 'key black';
        black.style.left = `${(i + 1) * WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2}px`;
        black.style.width = `${BLACK_KEY_WIDTH}px`;
        wrap.appendChild(black);
      }
    }

    keyboardContainer.appendChild(wrap);
    const overflow = wrap.offsetWidth - keyboardContainer.clientWidth;
    if (overflow > 0) keyboardContainer.scrollLeft = overflow / 2;
  }

  // ── Answer handling ──
  function handleKeyClick(note, keyEl) {
    if (!state || state.locked) return;
    state.locked = true;
    const correct = noteKey(note) === noteKey(state.currentNote);
    const notehead = document.getElementById('notehead');

    state.totalAnswered++;
    if (correct) {
      state.totalCorrect++;
      state.streak++;
      if (state.streak > state.bestStreak) {
        state.bestStreak = state.streak;
        saveBestStreak(state.bestStreak);
      }
      keyEl.classList.add('correct');
      if (notehead) notehead.classList.add('correct');
    } else {
      state.streak = 0;
      keyEl.classList.add('wrong');
      if (notehead) notehead.classList.add('wrong');
      const correctKey = keyboardContainer.querySelector(`.key[data-note="${noteKey(state.currentNote)}"]`);
      if (correctKey) correctKey.classList.add('reveal');
    }
    updateStats();

    setTimeout(nextQuestion, correct ? 500 : 1000);
  }

  goToStart();
})();
