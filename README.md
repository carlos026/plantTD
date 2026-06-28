# Plant TD — Tower Defense Game

A browser-based tower defense game built with vanilla JavaScript, HTML5, and CSS3. No installation required — just open `index.html` and play.

## Gameplay

Strategically place turrets on the map to stop waves of incoming minions from reaching the end. Earn cash by defeating enemies and spend it on new towers or upgrades. Survive all **30 waves**, including powerful boss waves every 10th round. Starting from wave 5, special **Sp. Minions** join the fight. Starting from wave 11, airplane enemies mix in as well.

**Core loop:**
- Drag a turret card onto any non-road tile to place it (the boat tile is also off-limits)
- Click a placed turret to upgrade or sell it
- Start the wave and watch your defenses hold — or not

## Towers

All towers can be upgraded up to **level 8**.

| Tower | Cost | Description |
|---|---|---|
| Machine Gun | $20 | Fast fire rate, chance for critical hits — 2× damage vs airplanes |
| Laser | $100 | Mid-range precision with critical hits — 2× damage vs airplanes |
| Flamethrower | $400 | Short-range area damage — no effect on airplanes |
| Blizzard | $600 | Freezes enemies in an area (no effect on Sp. Minions) |
| Toxic | $800 | Applies long-range damage-over-time poison |
| Storm Cannon | $1000 | Hits **all** enemies in range simultaneously with electric bursts — see [Overheat](#storm-cannon-overheat) |
| Rail Cannon | $1500 | Extreme single-target damage, stuns enemies — 2× damage vs airplanes (stun has no effect on Sp. Minions or airplanes) |
| Missile Turret | $2000 | Prioritizes airplanes over ground targets. Uses an ammo queue — see [Missile Ammo Queue](#missile-ammo-queue). **5× damage vs airplanes** |

### Storm Cannon Overheat

The Storm Cannon generates heat with every shot. If overheat reaches **100%** the tower is permanently destroyed. It cools down passively between shots (faster at higher upgrade levels). Manage it carefully against dense waves.

- From **level 5** onward, a toggle button appears in the upgrade panel to pause shooting and let the tower cool safely.

### Missile Ammo Queue

The Missile Turret uses a limited ammo pool. Instead of buying one reload at a time, you can **queue up to 5 missiles** for production — similar to training units in strategy games. Each missile costs **$50** and takes time to load. The upgrade panel shows 5 slots:

- **Active slot** (bright gold, fill bar rising): missile currently being loaded
- **Queued slots** (dim gold 🚀): missiles waiting in line
- **Empty slots** (dark): available queue space

The buy button is disabled when the queue is full or when ammo + queue would exceed the tower's maximum capacity.

## Enemies

| Enemy | Appears | Speed | Notes |
|---|---|---|---|
| Minion | Wave 1+ | 1.0 | Standard enemy |
| Sp. Minion | Wave 5+ (30% chance) | **1.5** | Immune to freeze and stun; takes **2× damage** from all towers |
| Airplane | Wave 11+ (mixed) | 3.0 | Immune to stun; freeze slows to 1.0; immune to Flamethrower; takes 2× damage from Machine Gun, Laser, and Rail Cannon; takes **5× damage** from Missile Turret |
| Boss | Wave 10, 20 | 1.0 | Single enemy, high reward |
| **Sp. Boss** | **Wave 30** | **1.0** | Same traits as Sp. Minion — immune to freeze/stun, takes **2× damage**. 5,000,000 HP |

## Status Effects

| Effect | Minion | Sp. Minion | Airplane |
|---|---|---|---|
| Freeze | Slows to 0.5 | **No effect** | Slows to 1.0 |
| Stun | Fully stops | **No effect** | No effect (immune) |
| Toxic | 20 dmg/tick | 20 dmg/tick | 20 dmg/tick |

## Enemy HP Scaling

| Waves | HP |
|---|---|
| 1–5 | `64 + 2^(wave + 4)` |
| 6–10 | `2^(wave + 2) × 1.3` |
| 11–15 | `2^wave` |
| 16–17 | `2^wave × 0.6` |
| 18–20 | `2^wave × 0.4` |
| 21-29 | `200000 + 1.09^(wave-21)` |
| Boss wave 10 | `2^wave × 10` |
| Boss wave 20 | `2^wave` |
| Boss wave 30 (Sp. Boss) | 2,500,000 |

Airplanes share the same HP formula as regular minions for their wave.

## Wave Structure

| Wave | Enemies | Count |
|---|---|---|
| 1–4 | Minions only 
| 10 | Boss | 1 |
| 11–19 | Minions + Airplanes (random mix) | 10–16 (random) |
| 20 | Boss | 1 |
| 21–29 | Minions + Sp. Minions + Airplanes (random mix) | 10–16 (random) |
| 30 | **Sp. Boss** | 1 |

## Audio

The game plays a per-level soundtrack that loops continuously. Use the **volume button** in the top-left panel to cycle through volume levels:

`🔊 100%` → `🔊 75%` → `🔉 50%` → `🔈 25%` → `🔇 Mute` → back to 100%

The **⏸ Pause** button mutes/resumes the soundtrack independently of the volume setting.

## Mobile Support

The game scales automatically to fit any screen size. On devices narrower than the native 1422×640 resolution, the entire game view is scaled down proportionally so it always fits without scrolling.

Touch drag-and-drop is fully supported for placing turrets:
- **Long-press** (touchstart) a turret card to pick it up — a ghost preview follows your finger
- **Drag** to any non-road tile and **release** (touchend) to place it
- A range indicator appears while dragging so you can see coverage before placing

All other interactions (upgrade, sell, start wave, pause) work with a standard tap.

## Running the Game

No build step or dependencies required.

**Option 1 — Open directly:**
Double-click `index.html` in your file browser.

**Option 2 — Local server (recommended for audio):**
```bash
# Python
python -m http.server 8000

# Node.js
npx http-server
```
Then open `http://localhost:8000/index.html`.

**Browser requirements:** Any modern browser with JavaScript and audio enabled (Chrome, Firefox, Edge, Safari).

## Tech Stack

- **Vanilla JavaScript (ES6+)** — no frameworks or build tools
- **HTML5** — Drag and Drop API, Audio API
- **CSS3** — Variables, glassmorphism, keyframe animations

## Controls

| Action | How |
|---|---|
| Place tower (desktop) | Drag turret card onto the map |
| Place tower (mobile) | Long-press card, drag, release on tile |
| Upgrade / Sell | Click a placed tower |
| Start wave | Click **START** |
| Pause | Click **⏸** |
| Reset | Click **⟳** |
| Cycle volume | Click the volume button (top-left) |
| Pause music | Click **⏸ Pause** (top-left) |
