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

Note: `gamelist.md` is an informal idea backlog, not a registry of built games (`mad-minute` was built but never added to it) — don't treat it as something to keep in sync.

## Architecture per game

Games are plain vanilla JS with no modules/imports — everything lives in one script file using top-level `const`/`let` state and functions. Two structural patterns are used depending on game type:

- **Canvas/action games** (e.g. `flaffy-poop`): a single `<canvas>` element, a `requestAnimationFrame`-driven game loop, an explicit state machine (`STATES = { MENU, ..., PLAYING, GAME_OVER }`), constants block for tunable parameters (speeds, sizes, intervals) at the top of the file, and `localStorage` for high scores.
- **DOM/form games** (e.g. `mad-minute`): screens toggled via a `hidden` CSS class on containers (`#start-screen`, `#game-screen`), a simple `phase` state machine (`START → PLAYING → RESULT`), and `localStorage` for run history.

Both patterns favor a single flat state object/set of globals per file over classes or frameworks — follow the existing style within a game's file rather than introducing new patterns.

UI text and in-game copy are written in Korean (`lang="ko"` on `<html>`); match this when adding UI-facing strings to existing games.

## Design docs convention (optional per-game)

Some game directories carry lightweight planning docs alongside the code — not required for every change, but follow the existing style if a game already has them:
- `REQUIREMENTS.md` — feature spec
- `PLAN.md` — current implementation plan (tech stack, state machine, file responsibilities, step checklist)
- `PLAN_HISTORY.md` — log of subsequent feature-addition plans, appended over time rather than overwriting `PLAN.md`
