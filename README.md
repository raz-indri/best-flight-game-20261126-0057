[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/raz-indri/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/raz-indri/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

# Coral Sky Run — Kepulauan Luma

A complete, original flight game for the [make.fun "Make the best flight game" bounty](https://make.fun/bounty/best-flight-game-20261126-0057). You are the mail pilot of the Luma archipelago, flying the little seaplane **Luma-9 "Kakatua"**: thread all eight sky rings over the islands, mind your fuel and your airspeed, then bring her home for a gentle landing on the Luma runway. Smooth flying pays — hard landings and stalls do not.

## How to play

Open `game/index.html` in a desktop browser — no server, no network, no downloads. Click **TAKE OFF** (or press Enter) to start.

- **W / S** — throttle up / down
- **Arrow keys (or A / D)** — bank and pitch; the mouse steers too
- **C** — chase / cockpit camera • **G** — landing gear • **R** — restart flight • **M** — sound on/off

Fly through the rings in order (gold ring = next), then land on the Luma runway: slow, gentle, on the strip. Rings pay 100 pts each, a smooth landing pays 400 + 250, and leftover fuel and a quick time add bonuses. Run out of fuel mid-sortie and you are gliding — the sea is soft only if you are slow.

## What's inside

- A procedural archipelago: 12 islands with beaches, palm and pine forest, a smoking volcano with a lava crater, turquoise sea with a sun-glint shader, drifting clouds
- A built-from-primitives seaplane with a spinning prop, navigation lights, twin floats and a lit cockpit panel with six glowing gauges
- Chase and cockpit cameras, a full HUD (altitude, airspeed, heading, vertical speed, throttle, fuel, artificial horizon, compass strip, ring tracker)
- Arcade flight model: lift that needs airspeed, banking that turns, stalls, water splash-downs, runway landings and crash detection
- Synthesised WebAudio sound: engine drone, wind rush, ring chimes, touchdown and crash stings — no audio files

## Layout

- `game/` — the playable game as static files (`index.html` + `src/*.js`, three.js vendored as `game/vendor/three.min.js`)
- `screenshots/` — four real renders of the game (chase, cockpit, volcano ring, final approach)
- `main.ts` — the make.fun entry program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
