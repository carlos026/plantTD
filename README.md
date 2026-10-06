# Plant TD — Tower Defense Game

A browser-based tower defense game built with vanilla JavaScript, HTML5, and CSS3. No installation required — just open `index.html` (or serve the folder locally) and play.

## Gameplay

Strategically place turrets on the map to stop waves of incoming enemies from reaching the exit. Earn cash by defeating enemies and spend it on new towers, upgrades, and missile ammo. Survive all **30 waves** — including boss waves every 10th round — to complete the map.

**Core loop:**
- Pick a map from the **map selection screen**
- Press **START**, then buy a turret from the shop and drag it onto any non-road tile
- Click a placed turret to upgrade it, sell it, or manage its special features
- Clear wave 30 to complete the map, earn a Golden Seed, and return to map selection

You start every map with **$100** and **15 lives**.

## Runs & Map Flow

A **run** is a sequence of maps played in the same browser session:

- When a map is completed (wave 30 cleared), the game returns to `index.html` and opens the map selection screen automatically — no need to log in again.
- The **run score carries over** from map to map and is shown on the map selection screen.
- **Each map can only be played once per run.** Completed maps are marked **✔ Completed** and can't be selected again.
- Click **↻ NEW RUN** on the map selection screen to reset the run score and played maps (your profile, record and seeds are kept).
- The run lives in `sessionStorage`: closing the tab starts a fresh run.
- A **game over never completes a map** — not even on wave 30. You can press START to retry the same map.

## Maps

Six themed maps, each with its own road layout, soundtrack, procedural artwork and special enemy.

| # | Map | Theme | Road | Special enemy |
|---|---|---|---|---|
| 1 | Night Forest | Moonlit forest, pines and fireflies | Cobblestone | Special Tank |
| 2 | Wasteland | Dry desert, cacti and cracked earth | Dirt with tyre tracks | Mecha |
| 3 | Swamp | Murky water, reeds and glowing mushrooms | Wooden boardwalk | Forest Tank |
| 4 | Inferno | Molten rock and glowing lava cracks | Basalt with embers | Fire Tank |
| 5 | Void | Dark space, nebulae and purple crystals | Void stone with energy line | Dark Tank |
| 6 | Iceland | Snowfields, ice cracks and snowy pines | Frozen ice | Ice Mecha |

Map 1 is unlocked from the start; the others are unlocked with Golden Seeds (see [Progression](#progression--unlocks)).

### Map Graphics

The map is rendered once onto a `<canvas>` placed behind the (transparent) tile grid, so the visuals never affect game logic:

- Organic ground with soft colour patches, fine texture and a subtle placement grid
- A continuous road with borders, shadows, rounded corners and a per-theme texture
- Decorations placed at least 2 tiles away from the road, plus ambient particles, lighting and a vignette
- Pulsing markers on the enemy **spawn** and **exit** points

All details are procedural but seeded by map id, so each map always looks the same. Themes are configured in `THEMES` inside `js/map-renderer.js`.

## Tutorial

New players get a short **interactive tutorial** on their first map. It highlights each element of the screen and waits for real actions:

1. Welcome
2. Status bar (Cash, Lives, Wave)
3. Press **START** *(waits for you)*
4. Buy and place a tower *(waits for you)*
5. Shop info button ⓘ
6. Click your tower *(waits for you)*
7. Upgrade / Sell panel
8. Final tips (enemy info, DMG STATS, Golden Seeds, Progression)

The wave is paused automatically on reading-only steps. The tutorial can be skipped at any time, and once finished or skipped it never shows again for that profile (profiles created before the tutorial existed skip it).

## Towers

All towers can be upgraded up to **level 8**. Damage and range are always whole numbers.

| Tower | Cost | Crit chance | Description |
|---|---|---|---|
| Machine Gun | $20 | — | Very fast fire rate — 2× damage vs airplanes |
| Laser | $100 | 30% | Mid-range precision — 2× damage vs airplanes |
| Flamethrower | $400 | — | Short-range damage — no effect on airplanes |
| Blizzard | $600 | — | Area attack that freezes every enemy in range |
| Toxic | $800 | 20% | Long range, applies damage-over-time poison |
| Storm Cannon | $1000 | — | Long-range electric bursts — see [Overheat](#storm-cannon-overheat) |
| Rail Cannon | $1500 | 30% | Extreme single-target damage, stuns enemies — 2× damage vs airplanes |
| Missile Turret | $2000 | 20% | Prioritizes airplanes; homing missiles with an ammo queue — see [Missile Ammo Queue](#missile-ammo-queue). **5× damage vs airplanes** |
| Archery Turret | $250 | **35%** | Homing arrows with unlimited ammo — see [Archery Multi-Shot](#archery-multi-shot) |

Missile and Archery are **locked** at first and must be unlocked in Progression.

### Critical Hits

When a hit is critical, a floating **"<damage> Critical!"** label pops above the enemy and fades out. The number is the **final** damage dealt (after airplane and special-enemy multipliers), rounded. For Missile and Archery the label appears when the projectile **lands**. To avoid clutter, each enemy shows at most one label every 300 ms (the damage itself is always applied).

### Storm Cannon Overheat

The Storm Cannon generates heat with every shot and cools down between shots (faster when idle and at higher levels).

- When overheat reaches **100%**, the tower **shuts down** (it is no longer destroyed): it stops shooting, turns grey with a red glow and its heat bar blinks.
- While shut down it cools **2× slower** than normal idle cooling (`STORM_OVERHEATED_COOL_MULT`) and only comes back online at **0%**.
- The upgrade panel shows `100% (Overheated)` while it is shut down.
- From **level 5** onward, an **On/Off** toggle lets you stop shooting manually to cool the tower safely.

### Missile Ammo Queue

The Missile Turret uses a limited ammo pool. Instead of buying one reload at a time, you can **queue up to 5 missiles** for production — similar to training units in strategy games. Each missile costs **$50** and takes time to load. The upgrade panel shows 5 slots:

- **Active slot** (bright gold, fill bar rising): missile currently being loaded
- **Queued slots** (dim gold 🚀): missiles waiting in line
- **Empty slots** (dark): available queue space

The buy button is disabled when the queue is full or when ammo + queue would exceed the tower's maximum capacity (5 at level 1, up to 18 at level 8).

### Archery Multi-Shot

The Archery Turret fires homing **arrow projectiles** (`arrowShot.png`) that fly to the target and deal damage on impact, with an impact burst effect. It has no ammo limit; its strength lies in critical hits and multi-targeting:

- **Level 1–4:** fires at a single target
- **Level 5–7:** fires at **2 targets** simultaneously
- **Level 8:** fires at **3 targets** simultaneously

## Enemies

| Enemy | Appears | Speed | Notes |
|---|---|---|---|
| Minion | Wave 1+ | 1.0 | Standard enemy |
| Airplane | Waves 11–29 (50% of spawns) | 3.0 | Immune to stun; freeze slows to 1.0; immune to Flamethrower; 2× damage from Machine Gun, Laser and Rail Cannon; **5× damage** from Missile Turret |
| Special enemy | Waves 21–29 (30% of non-airplane spawns) | varies | Depends on the map — see below |
| Boss | Waves 10 and 20 | 1.0 | Single enemy, high reward |
| Map Boss | Wave 30 | varies | Boss version of the map's special enemy — see below |

Enemies leave the spawn at **random intervals** (0.4 s – 1.6 s, configured by `MIN_SPAWN_INTERVAL` / `MAX_SPAWN_INTERVAL`), so waves arrive in irregular groups instead of a fixed rhythm.

Click any enemy (also while paused) to open the **Enemy Info** panel with its name, HP (and shield) and speed.

### Map Special Enemies

Each map has its own special enemy, defined in `SPECIAL_ENEMIES` (`js/minion.js`).

| Map | Enemy | Speed | HP | Immune to | Damage taken | Lives lost on escape |
|---|---|---|---|---|---|---|
| Night Forest | Special Tank | 1.5 | 1× | Freeze, Stun | **2×** from all towers | 1 |
| Wasteland | Mecha | 0.5 (0.25 frozen) | **2×** | Stun | 1× | 1 |
| Swamp | Forest Tank | 1.0 | 1× | — | **½** from all towers, **4×** from Flamethrower | 1 |
| Inferno | Fire Tank | 1.0 | 1× | Flamethrower | **200×** from Blizzard | **2** |
| Void | Dark Tank | 1.0 | 1× + shield | Freeze, Stun | 2× on the shield | 1 |
| Iceland | Ice Mecha | 0.5 | **2×** | Freeze, Stun | 1× | 1 |

- **Dark Tank shield:** spawns with a shield equal to its HP. Damage hits the shield first at 2×; any excess carries over to HP at 1×. If the tank survives **10 seconds** after losing its shield, the shield is fully restored. A purple glow shows when the shield is up.
- Towers a special enemy is immune to (e.g. Flamethrower vs Fire Tank) ignore it and pick another target.
- Mecha and Ice Mecha use their own sprites (`mechaw-up.png`, `mecha-up.png`); the other special enemies use the special sprite with a per-map colour tint.

### Bosses

- **Every boss is immune to stun.**
- **Every boss costs 5 lives** if it escapes, multiplied by its own life cost — the **Fire Tank Boss** (Inferno) costs **10 lives**.
- The **wave 30 boss** is the boss version of the map's special enemy (e.g. *Mecha Boss*, *Dark Tank Boss*) and inherits all of its traits, including the HP multiplier, immunities, damage multipliers and shield.

## Status Effects

| Effect | Minion | Airplane | Special enemies |
|---|---|---|---|
| Freeze | Slows to 0.5 | Slows to 1.0 | Per enemy (Mecha slows to 0.25; immune: Special Tank, Dark Tank, Ice Mecha) |
| Stun | Fully stops | Immune | Per enemy (immune: Special Tank, Mecha, Dark Tank, Ice Mecha) — bosses are always immune |
| Toxic | 40 dmg/tick | 40 dmg/tick | 40 dmg/tick × the enemy's damage multiplier |

## Enemy HP Scaling

| Waves | HP |
|---|---|
| 1–5 | `64 + 2^(wave + 4)` |
| 6–10 | `2^(wave + 2) × 1.3` |
| 11–15 | `2^wave` |
| 16–17 | `2^wave × 0.6` |
| 18–20 | `2^wave × 0.4` |
| 21–29 | `200000 × 1.09^(wave − 21)` |
| Boss wave 10 | `2^wave × 10` |
| Boss wave 20 | `2^wave` |
| Boss wave 30 | 2,500,000 × the map enemy's HP multiplier |

Airplanes share the regular minion HP for their wave. Special enemies multiply it by their own HP multiplier.

## Wave Structure

| Wave | Enemies | Count |
|---|---|---|
| 1–9 | Minions | 12 |
| 10 | Boss | 1 |
| 11–19 | Minions + Airplanes | 10–16 (random) |
| 20 | Boss | 1 |
| 21–29 | Minions + Airplanes + map special enemy | 10–16 (random) |
| 30 | **Map Boss** | 1 |

## Rewards

| Event | Cash | Score |
|---|---|---|
| Minion / airplane / special enemy killed | `(wave + 1)²` | +1 |
| Boss killed | `(wave + 1)³` | +8 |
| Map completed | — | +100 and **+1 Golden Seed** |

## Progression & Unlocks

Golden Seeds are spent on the **PROGRESSION** screen (from map selection) to permanently unlock content for your profile:

| Item | Cost |
|---|---|
| Wasteland, Swamp, Inferno, Void, Iceland (each) | 1 seed |
| Archery Turret | 1 seed |
| Missile Turret | 3 seeds |

Only unlocked towers appear in the in-game shop. Costs are configured in `js/unlock-catalog.js`.

## Pausing

Pausing stops the enemies and turrets, but you can still:

- Buy and place new towers
- Upgrade and sell towers
- Queue missile ammo
- Inspect enemies (Enemy Info panel)

The status bar (cash) updates immediately while paused.

## Audio

The game plays a per-map soundtrack that loops continuously. Use the **volume button** in the top-left panel to cycle through volume levels:

`🔊 100%` → `🔊 50%` → `🔉 25%` → `🔈 5%` → `🔇 Mute` → back to 100%

The **⏸ Pause** button mutes/resumes the soundtrack independently of the volume setting.

## Player Profile

On first launch a **nickname screen** appears. Enter any name (up to 20 characters) to create your profile, or reuse an existing nickname to continue where you left off.

Your profile is saved automatically in the browser's LocalStorage (`plantTD_player_<nickname>`): record, golden seeds, unlocked maps and towers, and whether the tutorial was seen. Storage goes through a `StorageAdapter`, so it can be swapped for another backend (e.g. Firebase) without touching the rest of the game.

### Player HUD

After logging in, a **Player HUD** panel appears to the right of the status bar, showing:

| Field | Description |
|---|---|
| Player | Your nickname |
| Record | Highest score ever reached across all sessions |
| Seeds | Golden seeds available to spend |

The record is updated automatically whenever your current score exceeds it.

## Mobile Support

The game scales automatically to fit any screen size. On screens smaller than the native 1422×720 resolution, the entire game view is scaled down proportionally so it always fits without scrolling.

Touch drag-and-drop is fully supported for placing turrets:
- **Touch** a turret card to pick it up — a ghost preview follows your finger
- **Drag** to any non-road tile and **release** to place it
- A range indicator appears while dragging so you can see coverage before placing

All other interactions (upgrade, sell, start wave, pause) work with a standard tap.

## Running the Game

No build step or dependencies required.

**Option 1 — Local server (recommended):**
```bash
# Python
python -m http.server 8000

# Node.js
npx http-server
```
Then open `http://localhost:8000/index.html`. Serving the files avoids browser restrictions on `file://` pages (audio and drag-and-drop behave more reliably).

**Option 2 — Open directly:**
Double-click `index.html` in your file browser.

**Browser requirements:** Any modern browser with JavaScript and audio enabled (Chrome, Firefox, Edge, Safari).

## Project Structure

| File | Responsibility |
|---|---|
| `index.html` | Screens (nickname, map selection, progression), HUD and panels |
| `board.css` | All styling and animations |
| `js/constants.js` | Global tunables (map size, spawn interval, crit chances, boss lives cost…) |
| `js/map.js` | Road layout of each map (`isRoad`) |
| `js/map-renderer.js` | Canvas map artwork and per-map themes |
| `js/turret.js` | Tower stats, costs, upgrades, cooldowns and critical hits |
| `js/minion.js` | Enemy stats, status effects, map special enemies and bosses |
| `js/tower-defense.js` | Game loop, waves, damage, UI screens and map flow |
| `js/player-data.js` | Player profile persistence and the per-session run (`RunSession`) |
| `js/unlock-catalog.js` / `js/unlock-manager.js` | Unlockable items and purchase rules |
| `js/tutorial.js` | First-time interactive tutorial |
| `js/mobile.js` | Screen scaling and touch drag-and-drop |

## Tech Stack

- **Vanilla JavaScript (ES6+)** — no frameworks or build tools
- **HTML5** — Canvas, Drag and Drop API, Audio API, Web Storage
- **CSS3** — Variables, glassmorphism, keyframe animations

## Controls

| Action | How |
|---|---|
| Login / create profile | Enter nickname on startup screen, press **PLAY** or Enter |
| Choose map | Click **PLAY** on an unlocked, not-yet-completed map |
| Unlock maps / towers | **PROGRESSION** button on the map selection screen |
| Start a new run | **↻ NEW RUN** on the map selection screen |
| Place tower (desktop) | Click a turret card, then drag it onto the map |
| Place tower (mobile) | Touch a card, drag, release on a tile |
| Tower info (shop) | Click the **ⓘ** button under a shop card |
| Upgrade / Sell / Ammo | Click a placed tower |
| Enemy info | Click an enemy |
| Damage statistics | Click **DMG STATS** |
| Start wave | Click **START** |
| Pause | Click **⏸ PAUSE** |
| Reset | Click **⟳ RESET** |
| Cycle volume | Click the volume button (top-left) |
| Pause music | Click **⏸ Pause** (top-left) |
