# 언어 토글(한국어 / English) 추가

전체 사이트에 적용한 기능이며, 설계 전반은 루트의 `I18N_PLAN.md`에 정리되어 있다.

## 공통 방식

| 항목 | 결정 |
|------|------|
| 버튼 | 우측 상단 한 개 토글 (`🌐 English` ↔ `🌐 한국어`, 바뀔 언어를 표시) |
| 기본 언어 | 한국어 (브라우저 언어 자동 감지 없음) |
| 저장 | `localStorage`의 공용 키 `siteLang` — 다른 게임/런처와 선택이 공유된다 |
| 코드 | 게임별 자체 포함 (공유 `i18n.js` 없음): `I18N` 사전 + `t()` + `toggleLang()` + `applyLanguage()` |
| 정적 문구 | HTML `data-i18n` 속성 (마크업이 필요한 곳은 `data-i18n-html`) |
| 동적 문구 | 렌더 함수에서 `t()` 호출, 토글 시 다시 그림 |

## 이 게임에서 한 일

- 시작 화면 문구, 드롭박스 라벨/옵션, `몫`/`나머지`, `정답: 몫 N 나머지 M`, 기록 테이블 헤더까지 약 25개 문자열을 사전으로 이동
- `<label>` 안의 라벨 텍스트를 `<span data-i18n>`으로 감쌌다 — `textContent` 교체가 `<select>`를 지워버리기 때문
- **데이터 키 정리**: `DIVIDEND_RANGES`/`DIVISOR_RANGES`의 키와 `<option value>`가 한국어(`십`, `백`…)였던 것을 언어 중립 키(`ten`, `hundred`, `thousand`, `tenThousand`, `one`)로 교체
- 예전 기록에는 한국어 값이 저장돼 있으므로 `LEGACY_DIGIT_KEYS`로 매핑해 표시한다 (매칭 실패 시 저장된 값 그대로 노출)
- 채점 중/후 언어를 바꿔도 입력값과 정오 표시가 유지되도록 `state.answers`에 입력값·정답 여부를 보관하고, `renderProblems()` → `restoreAnswers()`가 상태 기준으로 다시 그리도록 리팩터링
