# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A static collection of small browser games hosted via GitHub Pages (`.nojekyll` present, no build step). Each game lives in its own top-level directory as a fully self-contained bundle of `index.html` + `style.css` + `app.js`/`game.js`, with no shared dependencies, no bundler, no package.json, and no test suite. The site root `index.html` is a launcher page listing cards that link to each game's directory.

## Running / testing changes

There is nothing to build or install. To preview:

```bash
python3 -m http.server 8000   # or any static file server, from the repo root
```

Then open `http://localhost:8000/` for the launcher, or `http://localhost:8000/<game-dir>/` for a specific game directly. Verify changes by opening the page in a browser — there are no automated tests.

## Adding a new game

1. Create a new top-level directory (kebab or plain lowercase name) containing `index.html`, `style.css`, and a JS file (`app.js` or `game.js`).
2. Add a home-navigation link back to the root: `<a class="home-btn" href="../">🏠</a>` (see `flaffy-poop/index.html` or `mad-minute/index.html` for placement/styling).
3. Add a matching `.card` entry in the root `index.html` (`<a class="card" href="<game-dir>/">` with an `.icon`, `.name`, `.desc`).
4. Add the language toggle button (see "Language toggle" below) — every page on the site has one.

Note: `gamelist.md` is an informal idea backlog, not a registry of built games (`mad-minute` was built but never added to it) — don't treat it as something to keep in sync.

## Architecture per game

Games are plain vanilla JS with no modules/imports — everything lives in one script file using top-level `const`/`let` state and functions. Two structural patterns are used depending on game type:

- **Canvas/action games** (e.g. `flaffy-poop`): a single `<canvas>` element, a `requestAnimationFrame`-driven game loop, an explicit state machine (`STATES = { MENU, ..., PLAYING, GAME_OVER }`), constants block for tunable parameters (speeds, sizes, intervals) at the top of the file, and `localStorage` for high scores.
- **DOM/form games** (e.g. `mad-minute`): screens toggled via a `hidden` CSS class on containers (`#start-screen`, `#game-screen`), a simple `phase` state machine (`START → PLAYING → RESULT`), and `localStorage` for run history.

Both patterns favor a single flat state object/set of globals per file over classes or frameworks — follow the existing style within a game's file rather than introducing new patterns.

UI text and in-game copy default to Korean (`lang="ko"` on `<html>`); every UI-facing string must also have an English translation — see below.

## Language toggle (i18n)

Every page (root launcher + each game) has a `🌐 English` / `🌐 한국어` toggle button in the top right. Default is Korean; the choice is stored in `localStorage` under the **shared key `siteLang`**, so switching in one game carries over to the launcher and every other game.

Translation code is **duplicated per game** (no shared `i18n.js`) so each game stays self-contained. Each game's JS carries the same small block:

- `const I18N = { ko: {...}, en: {...} }` — the game's own dictionary
- `t(key, params)` — lookup with `{name}` placeholder substitution
- `toggleLang()` — flips the language, saves to `siteLang`, calls `applyLanguage()`
- `applyLanguage()` — sets `document.documentElement.lang` / `document.title`, replaces every `[data-i18n]` element's `textContent` (and `[data-i18n-html]`'s `innerHTML` where markup is needed), updates the button label, then re-renders any dynamically drawn text

Rules when adding UI strings:

- Static HTML text → `data-i18n="key"` on the element. If the text sits inside a `<label>` next to an `<input>`/`<select>`, wrap it in its own `<span data-i18n>` — `applyLanguage()` overwrites `textContent` and would otherwise delete the field.
- Dynamically built text (problem cards, history tables, canvas draws) → call `t()` at render time, and make sure `applyLanguage()` re-renders it. In the drill games, user input and grading results live in `state.answers` so a re-render mid-game keeps them.
- Never use a translated string as a data key or `<select value>` — keep those language-neutral (`ten`, `hundred`) and translate only the label. `division-drill` maps legacy Korean values from old `localStorage` records for display.
- Canvas games (`flaffy-poop`) redraw text every frame, so swapping the dictionary is enough; character/power names are stored as `nameKey`/`labelKey` and resolved through `t()`.

`I18N_PLAN.md` at the repo root records the design and per-game breakdown.

## Design docs convention (optional per-game)

Some game directories carry lightweight planning docs alongside the code — not required for every change, but follow the existing style if a game already has them:
- `REQUIREMENTS.md` — feature spec
- `PLAN.md` — current implementation plan (tech stack, state machine, file responsibilities, step checklist)
- `PLAN_HISTORY.md` — log of subsequent feature-addition plans, appended over time rather than overwriting `PLAN.md`
