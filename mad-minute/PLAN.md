# Mad Minute - 개발 계획

## 기술 스택

- **HTML / CSS / JS** (빌드 툴 없음)
- 파일 구조: `index.html` + `style.css` + `app.js`

---

## 화면 상태 (State)

앱은 3가지 상태를 가짐:

```
START → PLAYING → RESULT
```

| 상태 | 설명 |
|------|------|
| `START` | Start 버튼만 보임 |
| `PLAYING` | 타이머 + 문제 그리드 + Submit 버튼 |
| `RESULT` | 채점 결과 + 점수 + Reset 버튼 |

---

## 파일별 역할

### `index.html`
- 뼈대 마크업
- START 화면 (`#start-screen`)
- PLAYING/RESULT 화면 (`#game-screen`)
  - 헤더: 타이머 + 점수 영역
  - 문제 그리드 (`#problem-grid`)
  - Submit / Reset 버튼

### `style.css`
- 전체 레이아웃 (flex, grid)
- 문제 그리드: `display: grid; grid-template-columns: repeat(5, 1fr)`
- 채점 결과 색상: `.correct` (녹색), `.wrong` (빨간색)
- 타이머 경고 색상: 30초 이하일 때 빨간색

### `app.js`
- 상태 관리 및 핵심 로직

---

## 구현 단계

### Step 1 - HTML 마크업
- [ ] START 화면 (제목 + Start 버튼)
- [ ] GAME 화면 헤더 (타이머 + 점수 표시)
- [ ] 문제 그리드 컨테이너
- [ ] Submit / Reset 버튼

### Step 2 - CSS 스타일
- [ ] 전체 레이아웃 (배경, 폰트, 중앙 정렬)
- [ ] 문제 그리드 (5열, 각 문제 카드 스타일)
- [ ] 입력 필드 스타일
- [ ] `.correct` / `.wrong` 클래스 색상
- [ ] 버튼 스타일 (Start, Submit, Reset)
- [ ] 타이머 경고 스타일 (빨간색)

### Step 3 - JS 로직
- [ ] `generateProblems()` — 50개 문제 생성 (랜덤 0~12 × 3)
- [ ] `renderProblems()` — 그리드에 문제 카드 DOM 생성
- [ ] `startGame()` — START → PLAYING 전환, 타이머 시작
- [ ] `startTimer()` — 1초마다 카운트다운, 0이 되면 `submit()` 호출
- [ ] `submit()` — 입력값 채점, 색상 적용, 점수 계산
- [ ] `reset()` — RESULT → START 전환, 상태 초기화

### Step 4 - 통합 및 검증
- [ ] 타이머 만료 자동 제출 확인
- [ ] 빈칸 → 오답 처리 확인
- [ ] Submit 중복 클릭 방지 (채점 후 버튼 비활성화)
- [ ] Reset 후 완전 초기화 확인

---

## 주요 데이터 구조

```js
// 문제 하나
problem = {
  a: number,      // 0~12
  b: number,      // 0~12
  c: number,      // 0~12
  answer: number  // a * b * c
}

// 앱 상태
state = {
  phase: 'START' | 'PLAYING' | 'RESULT',
  problems: problem[],  // 50개
  timeLeft: number,     // 초 단위 (180)
  timerId: number,      // setInterval ID
  score: number
}
```

---

## 완료 기준

- [ ] Start → 타이머 시작 + 문제 표시
- [ ] 타이머 0이 되면 자동 채점
- [ ] Submit 클릭 시 채점 + 색상 표시 + 점수 표시
- [ ] Reset 클릭 시 Start 화면으로 복귀
- [ ] 브라우저에서 파일 직접 열어 동작 확인
