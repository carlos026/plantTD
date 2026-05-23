# Plant TD — Tower Defense Game

A browser-based tower defense game built with vanilla JavaScript, HTML5, and CSS3. No installation required — just open `game.html` and play.

## Gameplay

Strategically place turrets on the map to stop waves of incoming minions from reaching the end. Earn cash by defeating enemies and spend it on new towers or upgrades. Survive all 20 waves, including powerful boss waves every 10th round.

**Core loop:**
- Drag a turret card onto any non-road tile to place it
- Click a placed turret to upgrade or sell it
- Start the wave and watch your defenses hold — or not

## Towers

| Tower | Cost | Description |
|---|---|---|
| Machine Gun | $20 | Fast fire rate, chance for critical hits |
| Laser | $100 | Mid-range precision with critical hits |
| Flamethrower | $400 | Short-range area damage |
| Blizzard | $600 | Freezes enemies in an area |
| Toxic | $800 | Applies damage-over-time poison |
| Rail Cannon | $1500 | High damage, stuns enemies |
| Storm Cannon | $2000 | Long-range, heavy damage |

## Status Effects

- **Freeze** — Slows enemy movement to near zero
- **Stun** — Fully immobilizes the enemy
- **Toxic** — Deals 20 damage per tick for a duration

## Enemy HP Scaling

| Waves | HP Formula |
|---|---|
| 1–5 | `64 + 2^(wave + 4)` |
| 6–10 | `2^(wave + 2) × 1.3` |
| 11–15 | `2^wave` |
| 16 and 17 | `2^wave × 0.6` |
| 18+ | `2^wave × 0.4` |
| Boss (every 10th wave) | `2^wave × 10` |

Killing a regular minion rewards `(wave + 1)²` cash; a boss rewards `(wave + 1)³`.

## Running the Game

No build step or dependencies required.

**Option 1 — Open directly:**
Double-click `game.html` in your file browser.

**Option 2 — Local server (recommended for audio):**
```bash
# Python
python -m http.server 8000

# Node.js
npx http-server
```
Then open `http://localhost:8000/game.html`.

**Browser requirements:** Any modern browser with JavaScript and audio enabled (Chrome, Firefox, Edge, Safari).


## Tech Stack

- **Vanilla JavaScript (ES6+)** — no frameworks or build tools
- **HTML5** — Drag and Drop API, Audio API
- **CSS3** — Variables, glassmorphism, keyframe animations

## Controls

| Action | How |
|---|---|
| Place tower | Drag turret card onto the map |
| Upgrade / Sell | Click a placed tower |
| Start wave | Click **START** |
| Pause | Click **⏸** |
| Reset | Click **⟳** |
| Toggle music | Click the play/pause button |
