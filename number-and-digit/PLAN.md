# 수와 숫자 - 개발 계획

## 기술 스택

- **HTML / CSS / JS** (빌드 툴 없음, 모듈 없음)
- 파일 구조: `number-and-digit/index.html` + `style.css` + `app.js`
- 기존 `division-drill` 구조를 그대로 따른다 (DOM/폼형 게임 패턴)

---

## 화면 상태 (State)

```
START → PLAYING → RESULT
```

| 상태 | 설명 |
|------|------|
| `START` | 제목 + 용어 설명 + 최소값/최대값 입력 + Start 버튼 |
| `PLAYING` | 경과 시간 + 설정 범위 + 문제 카드 10개 + Submit 버튼 |
| `RESULT` | 채점된 카드(녹색/빨강 + 해설) + 점수 + 소요 시간 + Reset + 기록 테이블 |

`division-drill`과 동일하게 `#start-screen` / `#game-screen` 두 개의 div를 `hidden` 클래스로 토글하고,
채점 전/후는 카드 색상과 버튼 표시 여부로만 구분한다(별도 결과 화면 div 없음).

---

## 파일별 역할

### `index.html`

- `#start-screen`
  - 홈 버튼, 제목(수와 숫자), 용어 설명 박스(예: `10에서 22까지의 수 → 수 13개, 숫자 26개`)
  - `.options`: `최소값` `<input type="number" id="range-min">` (기본 1) / `최대값` `<input type="number" id="range-max">` (기본 100)
  - `#range-error`: 검증 실패 안내 문구 (평소 `hidden`)
  - Start 버튼
- `#game-screen`
  - `#game-header`: `#elapsed`(경과 시간), `#range-label`(예: `1 ~ 100`), `#score`(채점 전 숨김), 홈 버튼, `#submit-btn` / `#reset-btn`
  - `#problem-grid`: 문제 카드 컨테이너
  - `#history-section`: 채점 후 표시되는 기록 테이블

### `style.css`

- 시작 화면 설명 박스 + 최소/최대 입력 그룹 레이아웃 (division-drill의 `.option-group` 재사용)
- `#range-error`: 빨간 안내 문구
- `#problem-grid`: `display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr))`
- `.problem-card`: 번호 + 문제 문장(`.question-text`, 범위 숫자 강조) + 입력 두 줄(`.answer-row`)
- `.answer-field`: `수의 개수` / `숫자의 개수` 라벨 + `input[type=number]` + `개` 단위 표기
- 채점 결과: `.correct`(녹색), `.wrong`(빨강) — 카드 배경/테두리
- `.correct-answer`(정답 줄) / `.explain`(해설 줄, 작은 글씨)
- 기록 테이블은 `division-drill` 스타일 재사용

### `app.js`

상수

```js
const PROBLEM_COUNT = 10;
const MIN_SPAN = 3;        // 한 문제의 최소 범위 폭
const MAX_SPAN = 30;       // 한 문제의 최대 범위 폭
const ABS_MIN = 1;
const ABS_MAX = 9999;
const DEFAULT_MIN = 1, DEFAULT_MAX = 100;
const SETTINGS_KEY = 'number-and-digit-settings';
const HISTORY_KEY  = 'number-and-digit-history';
```

핵심 계산 함수

```js
function countNumbers(start, end) { return end - start + 1; }

// 범위 폭이 최대 30이므로 단순 루프로 계산
function countDigits(start, end) {
  let total = 0;
  for (let n = start; n <= end; n++) total += String(n).length;
  return total;
}

// 해설용: 자릿수가 같은 구간별로 쪼갠다 → [{ from, to, len, count }]
function splitByDigitLength(start, end) { ... }
```

문제 생성 (설정 범위 `[min, max]` 기준)

```js
digitBoundariesIn(min, max)   // [10, 100, 1000] 중 min < b <= max 인 경계만 추림
makePlainRange(min, max)      // 경계를 넘지 않는 범위: 자릿수 구간 하나를 골라 그 안에서 뽑음
makeCrossingRange(min, max)   // 경계 하나를 골라 앞뒤로 걸치는 범위 (양쪽 모두 [min,max] 안)
generateProblems(min, max)    // 경계형 2~3개(경계가 있을 때만) + 나머지 일반형
                              // 중복 범위는 재시도로 회피, 시도 한도 초과 시 중복 허용
```

- `MAX_SPAN`은 `Math.min(30, max - min + 1)`로 클램프하고, 폭이 `MIN_SPAN`보다 작아지지 않게 한다

문제 객체 / 앱 상태

```js
problem = { start, end, numberCount, digitCount };

const state = {
  phase: 'START' | 'PLAYING' | 'RESULT',
  settings: { min, max },
  problems: [],
  elapsedSeconds: 0,
  timerId: null,
};
```

함수 목록

- `readSettings()` — 입력칸 값 읽고 보정/검증. 실패 시 `#range-error` 표시하고 `null` 반환
- `loadSettings()` / `saveSettings()` — 마지막 최소/최대값을 `localStorage`에 저장·복원
- `generateProblems(min, max)` — 위 규칙대로 10문제 생성
- `renderProblems()` — `#problem-grid`에 카드 DOM 생성, 첫 입력칸 포커스
- `startGame()` — 설정 검증 → 저장 → 문제 생성 → 렌더 → 스톱워치 시작 → 화면 전환
- `startTimer()` / `stopTimer()` — 1초마다 경과 시간 갱신 (제한 시간 없음, 자동 제출 없음)
- `submitAnswers()` — 10문제 순회 채점
  - 두 칸 모두 정답이어야 `.correct`, 아니면 `.wrong` + 정답/해설 노출
  - 빈 칸은 오답, 입력 비활성화, 점수 표시, 스톱워치 정지, `saveHistory()`
- `topicParticle(n)` — 수를 읽었을 때의 받침에 따라 조사 `은`/`는` 선택 (해설 문구용)
- `buildExplanation(p)` — `splitByDigitLength()` 결과로 해설 문장 생성
  - 단일 구간: `22 - 10 + 1 = 13개, 두 자리 수이므로 13 × 2 = 26개`
  - 복수 구간: `103 - 98 + 1 = 6개, 98~99는 2개×2=4, 100~103은 4개×3=12 → 16개`
- `saveHistory()` / `loadHistory()` / `renderHistory()` — `localStorage` 최근 10회 (범위 설정 포함)
- `reset()` — 상태 초기화 후 START 화면 복귀 (입력칸에는 직전 설정 유지)

### 루트 `index.html`

`.card` 항목 추가:

```html
<a class="card" href="number-and-digit/">
  <span class="icon">🔢</span>
  <span class="name">수와 숫자</span>
  <span class="desc">범위 안에 수는 몇 개, 숫자는 몇 개일까요?</span>
</a>
```

---

## 구현 단계

### Step 1 - HTML 마크업
- [x] START 화면 (설명 박스 + 최소/최대 입력 + 오류 문구 + Start 버튼 + 홈 버튼)
- [x] GAME 화면 상단바 (경과 시간 / 범위 / 점수 / 홈 / Submit / Reset)
- [x] `#problem-grid`, `#history-section`

### Step 2 - CSS
- [x] 시작 화면 설명 박스 + 입력 그룹
- [x] 문제 카드 그리드 + 카드 내부(문제 문장, 입력 2칸)
- [x] `.correct` / `.wrong` / `.explain` 스타일
- [x] 기록 테이블

### Step 3 - JS 로직
- [x] `countNumbers()` / `countDigits()` / `splitByDigitLength()`
- [x] `readSettings()` / `loadSettings()` / `saveSettings()`
- [x] `boundariesIn()` / `pickWeighted()` / `makePlainRange()` / `makeCrossingRange()` / `generateProblems()`
- [x] `renderProblems()` / `startGame()` / 타이머
- [x] `submitAnswers()` + `buildExplanation()`
- [x] 기록 저장/표시, `reset()`

### Step 4 - 검증
- [x] 요구사항 예시 4개(1~8, 10~22, 256~263, 98~103) 정답 값 일치 확인
- [x] 설정 범위 밖의 수가 문제에 나오지 않는지 확인 (예: 1~50 설정 시 51 이상 등장 금지)
- [x] 좁은 범위(예: 1~5), 경계 없는 범위(예: 200~400), 넓은 범위(1~9999) 각각에서 10문제 생성되는지 확인
- [x] 최대값 ≤ 최소값 / 범위 폭 3 미만 입력 시 안내 문구 표시되고 시작되지 않는지 확인
- [x] 경계가 있는 설정에서 경계 넘는 문제가 2~3개 나오는지 확인
- [x] 한 칸만 입력하고 Submit → 오답 처리 확인
- [x] Submit 중복 클릭 방지, Reset 후 완전 초기화 + 설정값 유지 확인
- [x] 새로고침 후 기록/설정 유지 확인

---

## 완료 기준

- [x] 시작 화면에서 최소값/최대값을 설정해 난이도를 조절할 수 있음
- [x] 10문제가 한 화면에 표시되고 Submit 한 번으로 전체 채점됨
- [x] 수/숫자 개수 정답 판정이 자릿수 경계를 넘는 경우에도 정확함
- [x] 틀린 문제에 정답 + 한 줄 해설이 표시됨
- [x] 점수(맞은 개수/10)와 소요 시간이 표시되고 기록에 저장됨
- [x] 루트 런처에서 카드로 진입 가능, 게임 내 홈 버튼으로 복귀 가능
