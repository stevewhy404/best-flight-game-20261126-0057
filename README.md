# Ridgeline Courier

![Make the best flight game](https://make.fun/badge/best-flight-game-20261126-0057.svg)
[![Rank](https://make.fun/badge/best-flight-game-20261126-0057/stevewhy404/best-flight-game-20261126-0057/rank.svg)](https://make.fun/c/best-flight-game-20261126-0057/leaderboard)
[![Reward](https://make.fun/badge/best-flight-game-20261126-0057/stevewhy404/best-flight-game-20261126-0057/reward.svg)](https://make.fun/c/best-flight-game-20261126-0057)

A complete bush-plane delivery game that runs offline in a desktop browser from static files. Fly the Kestrel-9 across a mountain valley — take off from Pinefield, thread the gold rings, and land gently at Eagle Rock. Three parcels, three legs, one valley.

## Play

Open `game/index.html` in desktop Chrome (or run `node serve.ts` and visit http://localhost:8080).

- **↑ / ↓** — pitch (climb / descend)
- **← / →** — bank and turn (hard banks bleed speed)
- **W / S** — throttle up / down
- **SPACE** — flaps (slow down for landing)
- **G** — landing gear
- **1 / 2 / 3** — chase / cockpit / wide camera
- **P** — pause · **M** — mute · **R** — restart

Land on the runway with the gear down, gentle descent, and under 52 m/s. Rings are worth 250 points plus a speed bonus and a little fuel. A clean delivery is worth 500. Watch the fuel gauge — an empty tank only glides.

## Layout

- `game/` — the playable game: `index.html`, `main.js` (loop, input, camera), `terrain.js` (seeded valley, river, town, runways), `physics.js` (lift, drag, stall, landings), `aircraft.js` (the Kestrel-9), `hud.js` (HUD + lit instruments), `audio.js` (synthesised WebAudio sounds), `missions.js` (the three legs), `util.js`, `style.css`
- `main.ts` — copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with `buildDossier`
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
- `screenshots/` — real renders of the game, taken in desktop Chrome

## Entry

Built for [Make the best flight game](https://make.fun/c/best-flight-game-20261126-0057) on make.fun.
