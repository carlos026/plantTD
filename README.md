# Plant TD — Tower Defense Game

A browser-based tower defense game built with vanilla JavaScript, HTML5, and CSS3. No installation required — just open `game.html` and play.

## Gameplay

Strategically place turrets on the map to stop waves of incoming minions from reaching the end. Earn cash by defeating enemies and spend it on new towers or upgrades. Survive all 20 waves, including powerful boss waves every 10th round. Starting from wave 11, airplane enemies join the fight alongside regular minions.

**Core loop:**
- Drag a turret card onto any non-road tile to place it
- Click a placed turret to upgrade or sell it
- Start the wave and watch your defenses hold — or not

## Towers

| Tower | Cost | Description |
|---|---|---|
| Machine Gun | $20 | Fast fire rate, chance for critical hits — 2× damage vs airplanes |
| Laser | $100 | Mid-range precision with critical hits — 2× damage vs airplanes |
| Flamethrower | $400 | Short-range area damage — no effect on airplanes |
| Blizzard | $600 | Freezes enemies in an area |
| Toxic | $800 | Applies long-range damage-over-time poison |
| Storm Cannon | $1000 | Hits **all** enemies in range simultaneously with electric bursts — see [Overheat](#storm-cannon-overheat) |
| Rail Cannon | $1500 | Extreme single-target damage, stuns enemies — 2× damage vs airplanes (stun has no effect on them) |

### Storm Cannon Overheat

The Storm Cannon generates heat with every shot. If overheat reaches **100%** the tower is permanently destroyed. It cools down passively between shots (faster at higher upgrade levels). Manage it carefully against dense waves.

- At **level 5**, a toggle button appears in the upgrade panel to pause shooting and let the tower cool safely.

## Enemies

| Enemy | Appears | Speed | HP | Notes |
|---|---|---|---|---|
| Minion | Wave 1+ | 1.0 | Standard | — |
| Airplane | Wave 11+ (mixed) | 3.0 | Standard | Immune to stun; freeze slows to 1.0; immune to Flamethrower; takes 2× damage from Machine Gun, Laser, and Rail Cannon |
| Boss | Every 10th wave | 1.0 | Very high | Single enemy, high reward |

## Status Effects

| Effect | Minion | Airplane |
|---|---|---|
| Freeze | Slows to 0.5 | Slows to 1.0 |
| Stun | Fully stops | No effect (immune) |
| Toxic | 20 dmg/tick | 20 dmg/tick |

## Enemy HP Scaling

| Waves | HP Formula |
|---|---|
| 1–5 | `64 + 2^(wave + 4)` |
| 6–10 | `2^(wave + 2) × 1.3` |
| 11–15 | `2^wave` |
| 16 and 17 | `2^wave × 0.6` |
| 18+ | `2^wave × 0.4` |
| Boss (every 10th wave) | `2^wave × 10` |

Airplanes share the same HP formula as regular minions. Killing a regular minion or airplane rewards `(wave + 1)²` cash; a boss rewards `(wave + 1)³`.

## Wave Structure

| Wave | Enemies | Count |
|---|---|---|
| 1–9 | Minions only | 12 |
| 10, 20, … | Boss | 1 |
| 11–19, … | Minions + Airplanes (random mix) | 10–16 (random) |

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
