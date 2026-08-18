# 언어 토글(한국어 / English) 도입 계획

사이트 전체(런처 + 게임 5개)에 우측 상단 언어 버튼을 추가한다.
기본 언어는 **한국어**, 버튼을 누르면 **English**로 전환된다.

---

## 설계 원칙

| 항목 | 결정 |
|------|------|
| 적용 범위 | 루트 런처 + 게임 5개 전부 |
| 버튼 형태 | 한 개 버튼 토글 — 현재 한국어면 `🌐 English`, 영어면 `🌐 한국어` (누르면 바뀌는 대상 언어를 표시) |
| 버튼 위치 | 우측 상단 (게임 화면은 홈 버튼 옆 `#header-actions`, 시작 화면은 좌측 상단 홈 버튼의 반대편) |
| 코드 배치 | **게임별 자체 포함** — 공유 `i18n.js` 없이 각 게임의 JS 안에 사전과 토글 로직을 둔다 (CLAUDE.md의 자립 구성 규칙 유지) |
| 언어 저장 | `localStorage`의 **공용 키 `siteLang`** — 코드는 복제하되 값은 공유하므로, 한 게임에서 English로 바꾸면 다른 게임/런처에도 그대로 적용된다 |
| 기본값 | 저장값이 없으면 `ko`. 브라우저 언어 자동 감지는 하지 않는다 (예측 가능성 우선) |

---

## 공통 패턴 (각 게임에 복제)

```js
const LANG_KEY = 'siteLang';

const I18N = {
  ko: { start: '시작', numbers: '수의 개수', /* ... */ },
  en: { start: 'Start', numbers: 'Numbers',  /* ... */ },
};

let lang = localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'ko';

// t('score', { n: 7 }) → "점수 7" / "Score 7"
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
  document.getElementById('lang-btn').textContent = lang === 'ko' ? '🌐 English' : '🌐 한국어';
  // 동적으로 그려진 영역은 state 기준으로 다시 그린다
  rerenderDynamicParts();
}
```

- **정적 문구**: HTML에 `data-i18n="key"` 속성을 달고 `applyLanguage()`가 일괄 교체
- **동적 문구**: 렌더 함수가 `t()`를 호출하도록 바꾸고, 토글 시 `state` 기준으로 다시 그림
- **채점 후 토글**: 입력값과 채점 결과를 `state`에 보관해, 다시 그려도 점수·정답·해설이 유지되도록 한다

### 버튼 마크업 / 스타일

```html
<button id="lang-btn" class="lang-btn" onclick="toggleLang()">🌐 English</button>
```

```css
.lang-btn { /* 각 게임 style.css에서 .home-btn과 같은 모양으로 */ }
#start-screen .lang-btn { position: absolute; top: 20px; right: 24px; }
```

---

## 게임별 작업 내용

### 1. 루트 `index.html` (런처) — 문자열 약 12개

- 대상: `Games` 제목, `클릭해서 플레이하세요`, 카드 5개의 이름/설명
- JS 파일이 없으므로 기존 인라인 `<style>` 스타일에 맞춰 **인라인 `<script>`** 로 사전 + 토글 추가
- 카드 이름/설명은 `data-i18n` 속성으로 처리
- 영어 카드명 예: `Flaffy Poop`, `Mad Minute`, `Note Reader`, `Division Drill`, `Numbers & Digits`

### 2. `note-reader` — 문자열 약 14개 (가장 쉬움)

- 한국어가 **HTML에만** 있고 `app.js`에는 없음 → `data-i18n`만 붙이면 대부분 끝
- 대상: 제목, 부제, `손 모드`/`오른손만`/`왼손만`/`혼합`, `음 범위`/`오선 안쪽만`/`가운데 도 포함`, `설정`, `최고 연속 정답`
- 주의: `#best-streak-display`는 텍스트 노드 + `<span>` 혼합 구조 → 라벨을 별도 `<span data-i18n>`으로 감싼 뒤 값 span은 건드리지 않는다

### 3. `mad-minute` — 문자열 약 10개

- 대상: 부제(`3분 안에 50문제의 곱셈을 풀어보세요`), 기록 테이블 헤더(`기록`/`날짜`/`점수`/`남은 시간`), `타임아웃`, `N:NN 남음`
- `남음`은 값과 붙어 있으므로 `t('timeLeft', { time })` 형태로 치환 (영어: `{time} left`)
- 토글 시 `renderHistory()` 재호출

### 4. `division-drill` — 문자열 약 25개 + **데이터 정리 필요**

- 대상: 제목/부제, 드롭박스 라벨 3개와 옵션 문구, `몫`/`나머지`, `정답: 몫 N 나머지 M`, 기록 테이블 헤더/설정 표기
- **주의점**: 현재 `DIVIDEND_RANGES = { 십: 10, 백: 100, ... }`처럼 **한국어가 데이터 키이자 `<select>`의 value**이고, 기록에도 그 한국어 값이 저장되어 있다
  - `<option value="ten|hundred|thousand|tenThousand">`, `<option value="one|ten|hundred">`처럼 **언어 중립 키로 교체**하고, 표시 문구는 사전에서 가져온다
  - 이미 저장된 옛 기록(한국어 값)은 `{ 십: 'ten', 백: 'hundred', ... }` 매핑으로 변환해 표시하고, 매칭이 안 되면 저장된 값을 그대로 보여준다 (기록 유실 없음)

### 5. `number-and-digit` — 문자열 약 25개

- 대상: 제목/부제/설명 박스, `최소값`/`최대값`, 오류 문구 2종, 문제 문장, `수의 개수`/`숫자의 개수`/`개`, `정답: 수 N개 / 숫자 M개`, 해설, 기록 테이블
- 문제 문장: `{start}에서 {end}까지의 수` ↔ `Numbers from {start} to {end}`
- 해설 문구를 언어별로 분리
  - ko(단일 구간): `22 - 10 + 1 = 13개, 두 자리 수이므로 13 × 2 = 26개`
  - en(단일 구간): `22 - 10 + 1 = 13 numbers, all 2-digit, so 13 × 2 = 26 digits`
  - ko(경계 넘김): `103 - 98 + 1 = 6개, 98~99는 2개×2=4, 100~103은 4개×3=12 → 16개`
  - en(경계 넘김): `103 - 98 + 1 = 6 numbers, 98-99: 2×2=4, 100-103: 4×3=12 → 16 digits`
- `topicParticle()`(은/는 조사)은 **한국어 전용 분기**로만 사용
- `DIGIT_NAMES`(한 자리/두 자리…)도 사전으로 이동 (영어: `1-digit`, `2-digit`…)
- 채점 후 토글해도 결과가 유지되도록 사용자 입력값·정오 여부를 `state.answers`에 보관하고, 렌더를 `state` 기준으로 다시 수행

### 6. `flaffy-poop` — 문자열 약 35개 (가장 많음, 캔버스)

- 텍스트가 **매 프레임 캔버스에 다시 그려지므로** 사전만 갈아끼우면 전환 즉시 반영 (재렌더 로직 불필요)
- 대상:
  - 캐릭터 5명의 `name`/`label`과 파워 이름 5종 → 캐릭터 정의에서 문자열을 빼고 `id` 기준으로 사전 조회
  - 플로팅 텍스트: `퉤!`, `먹기 모드!`, `✨ 신의 가호!`, `❄️ 타임스톱!`, `🛡️ 방어막!`, `해제`, `막았다!`, `냠냠!`, `퍽!`
  - 메뉴/HUD/게임오버: `하늘에서 떨어지는 똥을 피하세요!`, `Space 또는 화면 탭으로 시작`, `최고 점수`, `← → 또는 A/D 키로 이동`, `캐릭터 선택`, `파워`, `점수`, `최고`, `파워없음`, `뱉기`/`대기중`/`먹기`/`가호중`, `게임 오버!`, `🏆 신기록!`, `Space / 탭: 재도전`, `C: 캐릭터 변경`
- 언어 버튼은 캔버스가 아니라 기존 `.home-btn`과 같은 **HTML 오버레이 버튼**으로 우측 상단에 배치
- **확인 필요**: 영어 문구가 한국어보다 길어 캔버스 폭(`BASE_W`)을 넘지 않는지 — 메뉴/게임오버 화면을 실제로 띄워 확인하고, 필요하면 폰트 크기나 문구를 줄인다

---

## 구현 순서

1. **런처**에 패턴 적용 (사전 + 토글 + 버튼 스타일 확정) — 가장 단순해서 기준을 잡기 좋음
2. **note-reader** (HTML 문자열만)
3. **mad-minute**
4. **division-drill** (select 값 → 중립 키 교체 + 기록 하위 호환)
5. **number-and-digit** (해설 영어판 + 채점 결과 유지)
6. **flaffy-poop** (캔버스 문자열 + 폭 확인)
7. 문서 갱신
   - `CLAUDE.md`에 i18n 패턴과 공용 키 `siteLang` 규칙 한 단락 추가 (새 게임도 같은 방식으로 따르도록)
   - 각 게임 `PLAN_HISTORY.md`에 이번 기능 추가 기록 (없는 게임은 새로 생성, 문서가 없는 `flaffy-poop`은 생략)

---

## 검증 항목

- [x] 각 페이지에서 버튼을 눌렀을 때 **모든** 문구가 바뀌는지 (빠진 문자열 없는지)
- [x] 새로고침 후에도 선택한 언어가 유지되는지
- [x] 한 게임에서 English로 바꾸고 홈 → 다른 게임으로 이동해도 English가 유지되는지
- [x] 채점/결과 화면에서 토글해도 점수·정답·해설이 그대로 유지되는지 (mad-minute, division-drill, number-and-digit)
- [x] `<html lang>` 속성과 문서 제목이 함께 바뀌는지
- [x] 영어 문구가 길어져 레이아웃이 깨지거나 캔버스 밖으로 나가지 않는지
- [x] 기존 `localStorage` 기록이 언어 전환 후에도 정상 표시되는지 (특히 division-drill의 옛 한국어 설정값)

---

## 예상 작업량

| 대상 | 문자열 | 난이도 |
|------|--------|--------|
| 런처 | ~12 | 낮음 |
| note-reader | ~14 | 낮음 |
| mad-minute | ~10 | 낮음 |
| division-drill | ~25 | 중간 (데이터 키 정리) |
| number-and-digit | ~25 | 중간 (해설 영어판) |
| flaffy-poop | ~35 | 높음 (캔버스 문구 다수) |

---

## 진행 상황

2026-08-17 구현 완료 — 룬처 + 게임 5개 전부에 적용. 브라우저에서 토글, 새로고침/게임 간 유지, 채점 후 토글, 예전 기록 표시, 캔버스 문구 폭을 모두 확인했다.
