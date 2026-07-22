# 나눗셈 연습 - 개발 계획

## 기술 스택

- **HTML / CSS / JS** (빌드 툴 없음)
- 파일 구조: `index.html` + `style.css` + `app.js`

---

## 화면 상태 (State)

```
START → PLAYING → RESULT
```

| 상태 | 설명 |
|------|------|
| `START` | 자리수/문제 수 드롭박스 + Start 버튼 |
| `PLAYING` | 경과 시간 + 문제 카드 그리드(전체 N개) + Submit 버튼 |
| `RESULT` | 채점된 카드(녹색/빨간색) + 점수 + 소요 시간 + Reset 버튼 + 기록 테이블 |

`mad-minute`과 동일하게 별도 화면 div 없이, `#game-screen` 안에서 채점 전/후 상태를 카드 색상과 버튼 표시 여부로 구분한다 (Submit 버튼 → 채점 후 숨김, Reset 버튼 → 채점 후 표시).

---

## 파일별 역할

### `index.html`

- `#start-screen`
  - 피제수 자리수 `<select>` (십/백/천/만)
  - 제수 자리수 `<select>` (일/십/백)
  - 문제 수 `<select>` (5/10/20)
  - Start 버튼, 홈 버튼
- `#game-screen`
  - 상단바: 경과 시간(`#elapsed`), 점수(`#score`, 채점 전 숨김), 홈 버튼, Submit/Reset 버튼
  - `#problem-grid`: 문제 카드들이 채워질 컨테이너 (각 카드 = 세로셈 부호 + 몫/나머지 입력)
  - `#history-section` (채점 후 표시)

### `style.css`

- 시작 화면 드롭박스 그룹 레이아웃
- 문제 그리드: `display: grid`, 문제 수에 따라 열 수 조정 (예: `repeat(auto-fit, minmax(...))`)
- 세로셈 부호(`.long-division`): 제수(`.divisor`)를 왼쪽에 배치하고, 피제수(`.dividend`)를 감싸는 `.bracket` 요소에 `border-left` + `border-top` + `border-top-left-radius`를 적용해 초등 교과서식 나눗셈 부호(왼쪽 세로선 + 위쪽 가로선 + 모서리 곡선) 모양을 만듦
- 부호 아래 몫/나머지 입력 필드 배치 (`몫:` / `나머지:` 라벨 + 숫자 입력, 카드 내부)
- 채점 결과 색상: `.correct`(녹색), `.wrong`(빨간색) — 카드 전체 배경/테두리에 적용
- 결과 화면: 점수 강조, 기록 테이블 (mad-minute 스타일 재사용)

### `app.js`

- 자리수 → 최대값 매핑 테이블
- `generateProblems(count, dividendMax, divisorMax)` — 문제 N개 랜덤 생성, 각 문제의 정답(몫/나머지) 계산
- `renderProblems()` — `#problem-grid`에 문제 카드 DOM 생성 (세로셈 부호 + 몫/나머지 입력)
- `startGame()` — 드롭박스 값 읽어 설정 저장, 문제 세트 생성, `renderProblems()` 호출, 스톱워치 시작
- `startTimer()` / `stopTimer()` — 1초마다 경과 시간 갱신 (제한 없이 계속 증가, 시간 초과에 의한 자동 제출 없음 — Submit은 사용자가 직접 클릭해야만 호출됨)
- `submitAnswers()` — 모든 카드 순회하며 채점
  - 입력값과 정답(몫/나머지) 비교, 비어있으면 오답 처리
  - 맞은 카드 `.correct`, 틀린 카드 `.wrong` + 정답 노출
  - 입력 필드 비활성화, 점수 계산 및 표시
  - 스톱워치 정지, `saveHistory()` 호출
- `saveHistory()` / `loadHistory()` / `renderHistory()` — `localStorage`에 최근 10회 기록 저장 (mad-minute의 히스토리 패턴 재사용)
- `reset()` — 상태 초기화 후 START 화면으로 복귀

---

## 주요 데이터 구조

```js
// 자리수 옵션 → 랜덤 범위 상한
const DIVIDEND_RANGES = { '십': 10, '백': 100, '천': 1000, '만': 10000 };
const DIVISOR_RANGES  = { '일': 9, '십': 10, '백': 100 };

// 문제 하나
problem = {
  dividend: number,
  divisor: number,
  quotient: number,   // Math.floor(dividend / divisor)
  remainder: number,  // dividend % divisor
};

// 앱 상태
state = {
  phase: 'START' | 'PLAYING' | 'RESULT',
  settings: { dividendDigit, divisorDigit, problemCount },
  problems: problem[],
  elapsedSeconds: number,
  timerId: number,
};
```

---

## 구현 단계

### Step 1 - HTML 마크업
- [ ] START 화면 (드롭박스 3개 + Start 버튼)
- [ ] GAME 화면 상단바 (경과 시간 + 점수 + Submit/Reset 버튼)
- [ ] 문제 그리드 컨테이너
- [ ] 결과 영역 (기록 테이블 컨테이너)

### Step 2 - CSS 스타일
- [ ] 시작 화면 드롭박스 레이아웃
- [ ] 문제 그리드 (열 수, 카드 스타일)
- [ ] 세로셈 부호 모양 (border 트릭으로 왼쪽 세로선 + 위쪽 가로선 + 곡선 모서리)
- [ ] 카드 내 몫/나머지 입력 필드 정렬
- [ ] `.correct` / `.wrong` 카드 색상
- [ ] 결과/기록 테이블 스타일

### Step 3 - JS 로직
- [ ] `generateProblems()` — 자리수 설정에 따른 랜덤 문제 N개 생성
- [ ] `renderProblems()` — 그리드에 문제 카드 DOM 생성
- [ ] `startGame()` — 설정 읽기, 문제 생성, 렌더, 타이머 시작
- [ ] `startTimer()` / `stopTimer()` — 경과 시간 관리
- [ ] `submitAnswers()` — 전체 채점, 카드 색상/정답 노출, 점수 계산, `saveHistory()` 호출
- [ ] `saveHistory()` / `loadHistory()` / `renderHistory()`
- [ ] `reset()` — 초기화

### Step 4 - 통합 및 검증
- [ ] 자리수 조합별 경계값(1, 최대값) 확인
- [ ] 나눠지는 수 < 나누는 수인 경우 몫 0 처리 확인
- [ ] 몫/나머지 중 하나만 입력하고 Submit 시 오답 처리 확인
- [ ] Submit 중복 클릭 방지 (채점 후 버튼 비활성화)
- [ ] 경과 시간이 제한 없이 계속 증가하고, 시간이 얼마가 지나도 자동 제출되지 않는지 확인
- [ ] Reset 후 완전 초기화 확인
- [ ] 새로고침 후에도 기록 유지 확인

---

## 완료 기준

- [ ] 자리수 조합에 맞는 범위로 문제 N개가 생성됨
- [ ] 몫/나머지 정답 판정이 정확함 (나누어떨어지는 경우 포함)
- [ ] Submit 클릭 시 전체 문제가 한 번에 채점되고 색상으로 표시됨
- [ ] 결과 화면에 점수/소요 시간이 정확히 표시됨
- [ ] Reset으로 설정을 재선택해 새 게임 시작 가능
- [ ] 기록이 `localStorage`에 저장되고 유지됨
- [ ] 브라우저에서 파일 직접 열어 전체 흐름 동작 확인
