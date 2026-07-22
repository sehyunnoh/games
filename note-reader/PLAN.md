# 음표 읽기 - 개발 계획

## 기술 스택

- **HTML / CSS / JS** (빌드 툴 없음)
- 오선보: SVG (정적인 화면이라 canvas 애니메이션 루프 불필요)
- 건반: DOM(div) 절대 위치 배치
- 파일 구조: `index.html` + `style.css` + `app.js`

---

## 화면 상태 (State)

```
START → PLAYING
```

`PLAYING`은 시간/세트 제한이 없는 무제한 연습이라 별도 RESULT 상태 없이, 상단바에 누적 통계를 계속 표시.

---

## 핵심 데이터 모델

```js
// 자연음 하나
note = { letter: 'C'..'G', octave: number }  // 예: { letter: 'C', octave: 4 }

settings = {
  handMode: 'right' | 'left' | 'mixed',
  rangeMode: 'staff' | 'extended'
}

state = {
  phase: 'START' | 'PLAYING',
  settings,
  currentClef: 'treble' | 'bass',
  currentNote: note,
  streak: number,
  bestStreak: number,
  totalAnswered: number,
  totalCorrect: number,
  locked: boolean   // 채점 애니메이션 중 클릭 무시
}
```

## 음 위치 계산 (오선보 렌더링의 핵심)

자연음을 옥타브까지 포함한 전역 "다이어토닉 스텝"으로 변환해서 자리표 기준선과의 차이로 오선 상의 위치를 계산한다.

```js
const LETTERS = ['C','D','E','F','G','A','B'];
function step(note) { return note.octave * 7 + LETTERS.indexOf(note.letter); }

const CLEFS = {
  treble: { bottomLine: { letter: 'E', octave: 4 }, glyph: '𝄞' },
  bass:   { bottomLine: { letter: 'G', octave: 2 }, glyph: '𝄢' },
};

// positionIndex: 0 = 아래 첫째 줄, 1씩 증가할 때마다 반 칸(줄→칸→줄...) 위로 이동
// 8 = 맨 위 줄. 0~8 범위를 벗어나면 덧줄 필요.
function positionIndex(note, clefName) {
  const clef = CLEFS[clefName];
  return step(note) - step(clef.bottomLine);
}
```

- SVG y좌표 = `bottomLineY - positionIndex * (lineSpacing / 2)`
- `positionIndex`가 음수(아래) 또는 8 초과(위)면 그 위치까지 덧줄을 짝수 간격(-2, -4, ... / 10, 12, ...)으로 그림

### 음 범위 (자리표별)

| 모드 | 높은음자리표 | 낮은음자리표 |
|------|------|------|
| 오선 안쪽만 | E4 ~ F5 (9개 음) | G2 ~ A3 (9개 음) |
| 확장 (가운데 도 포함) | C4 ~ G5 (13개 음) | E2 ~ C4 (13개 음) |

혼합 모드는 문제마다 위 두 자리표 중 하나를 랜덤으로 고르고, 그 자리표의 범위에서 음을 뽑는다.

---

## 건반 렌더링

- 현재 설정(`handMode` + `rangeMode`)에서 나올 수 있는 모든 음의 최저/최고를 구해 그 구간을 포함하는 연속된 피아노 건반을 그린다 (혼합 모드는 두 자리표 범위를 합친 구간을 연속으로 표시).
- 흰건반 목록을 최저음~최고음 사이의 자연음 시퀀스로 만들고 균등 너비로 배치, 검은건반은 흰건반 쌍 사이(E-F, B-C 제외) 경계에 겹쳐서 배치.
- 흰건반에만 `data-note`를 부여해 클릭 판정에 사용 (검은건반은 장식용, 클릭 무시).
- 가운데 도(C4) 건반에는 `.middle-c-dot` 표시.

---

## 파일별 역할

### `index.html`
- `#start-screen`: 손 모드 라디오 그룹, 음 범위 라디오 그룹, Start 버튼, 최고 기록 표시
- `#game-screen`: 상단바(streak/정답률/홈), `#staff-container`(SVG 삽입 위치), `#keyboard`(건반 삽입 위치)

### `style.css`
- 좌우 분할 레이아웃 (flex)
- 오선/음표/자리표 스타일
- 건반 스타일 (흰/검은건반, hover, 정답/오답 색상 전환 애니메이션)
- 시작 화면 라디오 버튼 그룹 스타일

### `app.js`
- 음 위치 계산 (`step`, `positionIndex`, 범위 테이블)
- `renderStaff(note, clef)` — SVG 오선 5줄 + 자리표 glyph + 덧줄 + 음표(ellipse) 그리기
- `buildKeyboard(settings)` — 설정에 맞는 건반 DOM 생성 (설정 변경 시에만 다시 그림)
- `nextQuestion()` — 손 모드에 따라 자리표 결정, 직전 음과 겹치지 않게 랜덤 음 선택, `renderStaff` 호출
- `handleKeyClick(note)` — 정답 판정, 색상 피드백, streak/정답률 갱신, `bestStreak` localStorage 저장, 딜레이 후 `nextQuestion`
- `startGame()` / `goHome()` — 상태 전환

---

## 구현 단계

- [ ] HTML 마크업 (시작 화면 라디오 그룹 + 연습 화면 골격)
- [ ] CSS 레이아웃 및 색상 피드백 스타일
- [ ] 음 위치 계산 유틸 (`step`, `positionIndex`, 범위 테이블)
- [ ] 오선보 SVG 렌더링 (자리표, 오선, 덧줄, 음표)
- [ ] 건반 DOM 렌더링 (흰/검은건반 배치, 가운데 도 표시)
- [ ] 문제 생성 로직 (자리표/음 랜덤 선택, 직전 음 중복 방지)
- [ ] 클릭 채점 로직 (정답/오답 피드백, streak, 정답률, best streak 저장)
- [ ] 시작 화면 ↔ 연습 화면 전환, 홈 버튼
- [ ] 브라우저에서 직접 열어 모든 모드 조합(3×2) 동작 확인

## 완료 기준

- [ ] 손 모드 3종 × 음 범위 2종 모든 조합에서 오선/건반이 올바르게 나옴
- [ ] 정답/오답 클릭 시 시각 피드백과 통계가 올바르게 갱신됨
- [ ] 덧줄(가운데 도)이 확장 모드에서 정확한 위치에 그려짐
- [ ] 최고 연속 정답이 새로고침 후에도 유지됨
- [ ] 홈 버튼으로 루트 페이지 이동 확인
