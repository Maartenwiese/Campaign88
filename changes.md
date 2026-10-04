# Campaign 88 — Change Management & Version History Document

This document records the complete change management history, architectural evolutions, feature releases, and bug fixes for **Campaign 88** (inspired by the classic 1987 *Fire Power* tank combat game) starting from initial inception to the current version.

---

## Version Overview & Release Timeline

| Version | Release Date | Key Focus | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| **v1.0.0** | 2026-10-02 | Retro Arcade Revival | 3 Tank Classes, Destructible Terrain, POW Extraction, Squish Mechanic, Hunter Drone, CRT Radar, Audio Synthesis |
| **v1.1.0** | 2026-10-03 | Mobile Experience | Automatic Device Detection, Fullscreen Portrait Viewport, Dual Touch Thumbsticks, Responsive HUD, Dedicated `/play` Route |
| **v1.1.5** | 2026-10-03 | Container & Cloud Deployment | Docker Packaging, Artifact Registry, Google Cloud Run Production Deployment |
| **v1.2.0** | 2026-10-04 | Networked Multiplayer | 5-Player Real-time Battles, Dynamic Map Scaling (3000x3000 to 5000x4200), Radar Fog of War, Callsign & Game Rooms, Leaderboard |
| **v1.3.0** | 2026-10-04 | Combat & Tactical Gameplay Adaptations | Road Clearance, Solid Tree Trunks & Canopy Cover (50% Def), POW Camp Gates & Sentries, Incoming Missile Alert (3-5s), Weapon Upgrades, Cheat Mode (`+++`), Chassis Lock, Player Drone Strike |
| **v1.3.1** | 2026-10-04 | UI/UX & Responsive Layout Stabilization | CSS Syntax Repair, HTML Structure Realignment, Responsive 100vh Desktop Fitting (No Scrollbars), Streamlined Single-Line Footer Controls, Mobile Portrait Briefing Fit, Unobstructed Touch Controls & Toast Stacking |
| **v1.4.0** | 2026-10-04 | 1v1 Multiplayer Duel & Tactical Realism | 2-Player Cap, Opposing River Bases, 30Hz Real-Time Driving & Attack Synchronization, Bridge Crossing Ramp Margins, Radar Fog of War Discovery Mask, Seeded Procedural Terrain on Every Game Launch, Hidden God Mode UI |

---

## Detailed Version Changelog

### [v1.4.0] — 2026-10-04 (1v1 Multiplayer Duel & Tactical Realism)
**Focus**: 1v1 duel multiplayer capping, opposing river bases, live opponent movement synchronization, bridge traversal physics, progressive radar fog of war reveal, procedural battlefield generation on every game start, and hidden god mode.

#### 1. 2-Player Cap (1v1 Duel Mode)
- **Room Limit Enforcement**: Configured `MAX_PLAYERS_PER_ROOM = 2` on the WebSocket server (`server.js`) and client (`index.html` / `play/index.html`).
- **Lobby Roster UI**: Updated the multiplayer setup modal and in-room roster to display exactly 2 slots:
  - **Slot 0**: Crimson Vanguard (West Base, `#ef4444`).
  - **Slot 1**: Cobalt Shield (East Base, `#3b82f6`).
- **Match HUD**: Updated in-match player counter to display `PLAYERS: X/2`. Toast alerts announce `COMMENCE 1v1 DUEL! 2 TANKS ENGAGED!`.

#### 2. Distinct Opposing Bases Across Central River
- **Base Positioning**: Configured opposing home bases on opposite sides of the central river:
  - Crimson Base at `x: 340, y: WORLD_H / 2` (Western Shore).
  - Cobalt Base at `x: WORLD_W - 340, y: WORLD_H / 2` (Eastern Shore).
- **Spawn Assignment**: Player 1 spawns facing east (`angle: 0`), Player 2 spawns facing west (`angle: Math.PI`).
- **Respawn Safety**: Destroyed players respawn inside their respective fortified bases with a 4-second invulnerability shield and visual barrier aura.

#### 3. Real-Time Driving & Turret Synchronization (30Hz)
- **Problem**: Previously, opponent tanks remained stationary because tank position and angle telemetry was not continuously emitted during movement.
- **Implementation**:
  - Added a 30Hz transmission loop in `update(dt)`: sends `player_state` with current coordinates (`x, y`), chassis orientation (`angle`), turret orientation (`turretAngle`), health, fuel, and special ability status.
  - Added server-side relay broadcasting `player_sync` to the opposing combatant.
  - Client updates rival position, rotates chassis and turret smoothly, and renders continuous dirt tread tracks (`treadMarks`) behind the moving rival tank.

#### 4. Real-Time Attack Synchronization & Hit Detection
- **Shell Firing Sync**: When either player discharges their main cannon, the client emits `fire_shell` with muzzle coordinates, velocity, projectile damage, and splash radius. The server relays this as `shell_fired` to spawn matching tracer projectiles on the opponent's screen.
- **Landmine Sync**: Deployed stealth mines are emitted via `lay_mine` and synchronized across both clients as armed hazard objects.
- **Rival Hit Detection**: Projectiles test collision against the rival tank hull in the physics loop; hits trigger explosions, damage reporting (`player_hit`), and server kill tracking.
- **Drone Strike Coordination**: Player-commanded drone strikes transmit target coordinates via `drone_strike`, alerting the opponent with air-raid sirens and incoming bomber shadows.

#### 5. Bridge Crossing Fix (Ramp Collision Margins & Extended Corridors)
- **Problem**: In previous builds, tanks could not cross bridges in multiplayer because circular collision hull detection against the river water boundary evaluated to `true` before the tank's center point reached the bridge rectangle.
- **Implementation**:
  - Extended bridge physical width: bridge width set to `riverW + 50 = 210px`, anchored with a 25px overhang into dry terrain on both river banks.
  - Updated `checkCollision(x, y, r)` with an approach corridor margin:
    ```javascript
    if (x >= b.x - r - 14 && x <= b.x + b.w + r + 14 && y >= b.y - 12 && y <= b.y + b.h + 12) {
      onBridge = true;
      break;
    }
    ```
  - This guarantees `onBridge` evaluates to `true` well before the tank's boundary touches water, allowing completely smooth, uninterrupted bridge crossings from both sides of the river.

#### 6. Radar Fog of War Shroud & Progressive Discovery
- **Requirement**: "The radar can only show the already discovered parts of the map. once explored you can see on the radar where and what everything is."
- **Implementation**:
  - Implemented 60x60 exploration grid (`radarExploredGrid`) tracking uncovered sectors.
  - Continuous exploration loop in `update(dt)` calls `discoverRadarArea(player.x, player.y, 450)` during movement, uncovering the map around the driving tank.
  - Updated `renderConsoleRadar()`:
    - River, bridges, roads, mountains, foliage, houses, and POW camps are rendered strictly when inside discovered cells.
    - Added dark phosphor veil (`rgba(2, 6, 4, 0.96)`) masking all unexplored cells on the CRT radar.
    - Opponent tanks and AI patrol units appear on radar only once their position falls within discovered territory.

#### 7. Seeded Procedural Battlefield Generation on EVERY Game Launch
- **Requirement**: "Also every time you start the game, a new terain is being generated."
- **Implementation**:
  - Created deterministic procedural terrain generator `generateProceduralTerrain(worldW, worldH, seed)` in `server.js` and matching `initWorld(seed)` in `index.html`.
  - Every game start (Solo Campaign or Multiplayer Match) produces a fresh random seed (`Date.now() ^ Math.random() * 0xffffff`).
  - Procedurally varies:
    - Central river meandering offset and width.
    - 3 unique tactical bridge types (wood, reinforced concrete, pontoon) with varied Y positions.
    - Highway network paths connecting base camps to bridge ramps.
    - Mountain clusters and chokepoints.
    - Civilian cottages, barracks, and dense pine/oak foliage groves with verified road clearance.
    - Fortified POW camps with barbed wire enclosures and armed sentries.
  - In multiplayer, the host server generates the terrain layout and broadcasts it to both duelists on match start, ensuring identical battlefield layouts.

#### 8. Hidden God Mode UI
- **Requirement**: "hide the god mode button."
- **Implementation**:
  - Removed `#cheat-mode-badge` from `#footer-controls`.
  - Added `#cheat-mode-badge, .cheat-mode-badge { display: none !important; }` in CSS.
  - Secret triple-plus key combination (`+++`) remains active in the background, activating unlimited armor, infinite fuel, and maximum weaponry silently without revealing any god-mode button on the screen.

### [v1.3.1] — 2026-10-04 (UI/UX & Responsive Layout Stabilization)
**Focus**: Interface hierarchy repair, CSS cascade stabilization, viewport responsiveness, elimination of window scrolling, and unobstructed mobile portrait controls.

#### 1. CSS Syntax & DOM Hierarchy Integrity Repair
- **Root Cause Diagnoses**:
  - Found an unclosed CSS brace `}` in rule `#mp-match-hud`, causing all subsequent tactical styles (`.pregame-class-container`, `.drone-strike-btn`, `#missile-alert-box`, `.cheat-mode-badge`, `.weapon-upgrade-pill`) to fail or corrupt the stylesheet cascade.
  - Found an omitted opening `<div id="m-buttons-cluster">` in the mobile action cluster markup, causing its closing `</div>` to prematurely terminate `#mobile-controls-overlay`, `#viewport-wrapper`, and `#arcade-chassis`, kicking the right `#steel-console` out below the main game window on desktop.
- **Fixes Applied**:
  - Balanced all CSS selector blocks; verified brace depth at exactly 0.
  - Restored full DOM hierarchy and verified HTML tag opening/closing balance at 0 unclosed tags and 0 errors.

#### 2. Desktop Console Viewport & Single-Line Footer Bar
- **Responsiveness**: Replaced fixed 820px chassis height with `height: min(800px, calc(100vh - 68px)); min-height: 520px;`, allowing the entire arcade chassis to scale dynamically to laptop and desktop screens (800p, 900p, 1080p, 1440p) without any vertical page scrolling.
- **Console Balancing**: Refined `#steel-console` with flex `justify-content: space-between;` and compact padding, keeping gauges, LED readouts, and the CRT radar scanner crisp.
- **Single-Line Footer**: Refactored `#footer-controls` with concise keybinding hints (`WASD`, `Mouse`, `M`, `Shift`, `1-3`) and compact action buttons (`🎯 DRONE [X]`, `🌐 MULTI`, `📱 MOBILE`, `⛶ FULL`, `AUDIO`), ensuring a unified single-line bottom bar without line wrapping.

#### 3. Mobile Fullscreen Portrait Interface Polish
- **Automatic Route & Viewport Detection**: Updated `detectMobileDevice()` to automatically activate mobile portrait mode on `/play`, coarse touch pointers, and narrow screen viewports (<= 768px).
- **Briefing Modal Sizing**: Redesigned pre-game tank chassis buttons (`.retro-class-select-btn`) to fit side-by-side on a single row, and scaled start buttons so that both Solo Campaign and Online Multiplayer options fit inside the phone screen without requiring modal scrolling.
- **Toast & Hazard Stacking**: Moved `#toast-msg`, `#air-raid-alert`, and `#missile-alert-box` to `top: calc(env(safe-area-inset-top, 0px) + 84px);` on the left side of the screen, perfectly adjacent to the floating radar widget. This leaves the virtual analog joystick and bottom-right button cluster completely clear and accessible.

---

### [v1.3.0] — 2026-10-04 (Combat & Tactical Gameplay Adaptations)
**Focus**: Tactical battlefield refinements, obstacle placement safety, defensive cover mechanics, weapon upgrades, cheat system, and player-commanded airstrikes.

#### 1. Strategic Road Obstacle Clearance
- **Problem**: Procedurally placed structures and trees occasionally obstructed road networks, impeding player navigation and high-speed flanking.
- **Implementation**:
  - Implemented spatial clearance validation functions: `doesRectOverlapRoad(x, y, w, h, margin)` and `doesCircleOverlapRoad(cx, cy, radius, margin)`.
  - Enforced a 12px buffer clearance during initial map generation (`initWorld()`) and dynamic multiplayer map scaling (`setDynamicMultiplayerWorld()`).
  - Validated that 100% of generated houses, barracks, and foliage are placed strictly off-road.

#### 2. Tree Trunk Collision & Foliage Canopy Cover
- **Feature**: Trees can no longer be driven straight through; trunks physically block movement, while canopies provide tactical combat cover.
- **Implementation**:
  - Added solid inner trunk collision in `checkCollision(x, y, r)` with a trunk radius of `f.r * 0.40`. Tanks stop against trunks.
  - Implemented `isTankUnderTreeCover(x, y)` detecting when a tank is positioned within tree foliage radius (`f.r + 12`).
  - Added 50% damage reduction (`dmg *= 0.5`) against incoming enemy shells and missiles when under canopy cover.
  - Added visual leaf deflection particles upon impact and a glowing green dashed outline with a `🛡️ COVER: 50% DEF` HUD indicator above the tank.

#### 3. Fortified POW Camps Behind Tiny Gates & Armed Sentries
- **Feature**: POW holding cells are enclosed in barbed wire compounds with tiny gates and are defended by hostile sentries.
- **Implementation**:
  - Added tiny gate rendering to POW camps (`c.gateW = 24`, steel frame, hazard border, yellow padlock icon `GATE 🔒`).
  - Guarded camps spawn hostile sentry rifle soldiers (`isGuard: true`) patrolling outside the compound perimeter.
  - Guard sentries actively face and engage the player with rifle fire (12 damage, 14px muzzle blast, 350px detection range).
  - Added squish and projectile hit mechanics for guards (+50 points, custom blood pool decals, sound effects).

#### 4. Incoming Tactical Missile Alert (3–5s Advance Warning)
- **Feature**: Random incoming ballistic missile strikes marked with a 3–5 second advance warning on the battlefield.
- **Implementation**:
  - Implemented `triggerIncomingMissileWarning()` firing an alert with a 4.2-second countdown timer.
  - Rendered a pulsing red danger circle (185px radius), animated hazard dashed perimeter ring, rotating crosshairs, and a shrinking impact ring.
  - Added warning banner in viewport: `⚠️ INCOMING MISSILE IN Xs! EVACUATE MARKED ZONE! ⚠️`.
  - Added blinking radar hazard circle on the CRT radar scanner.
  - Detonation logic (`detonateIncomingMissile()`): Deals 250 splash damage to any tank remaining inside the designated impact circle. Players must drive outside to survive.

#### 5. Building Destruction Weapon Upgrade Crates
- **Feature**: Demolishing civilian buildings and barracks can reveal weapon upgrade crates.
- **Implementation**:
  - Demolishing a building triggers a 70% drop rate for `spawnWeaponUpgrade(x, y)`.
  - Crate pickup awards 25 rounds of enhanced ammunition:
    - **APCR Hyper-Cannon**: High-velocity kinetic shell (2.2x damage, 1.5x shell velocity, cyan tracer).
    - **Triple Cluster Shot**: 3-round wide-arc spread volley (covering 30-degree cone).
    - **Plasma Incendiary**: Heavy blast shell (1.8x damage, 2.4x massive splash radius, crimson tracer).
    - **Rapid-Fire Gatling**: High-speed autocannon (3x rate of fire, green tracer).
  - Rendered 3D military crate sprites with glowing pulsing auras and HUD badge indicator (`#weapon-upgrade-pill`).

#### 6. Cheat Mode Activation (`+` Pressed 3 Times)
- **Feature**: Secret keyboard combo granting god-mode status.
- **Implementation**:
  - Implemented `checkCheatModeInput(key, code)` tracking `+` (or `NumpadAdd` / `=`) keypresses within a 2000ms window.
  - On 3 consecutive presses, triggers `activateCheatMode()`:
    - Armor set to 9999 HP (invulnerable to damage).
    - Fuel locked at 100% (unlimited fuel capacity).
    - Ammunition locked at full strength (infinite weapon upgrade shots).
    - Landmine stock refreshed to 10.
  - Rendered blinking gold HUD badge: `⭐ CHEAT MODE ACTIVE (GODMODE)`.

#### 7. Pre-Game Tank Class Lock
- **Feature**: Players must choose their tank chassis prior to match launch; class switching is locked during combat.
- **Implementation**:
  - Added interactive retro chassis selector buttons to the briefing screen (`#intro-class-light`, `#intro-class-medium`, `#intro-class-heavy`).
  - Added `selectPreGameClass(className)` allowing selection during the pre-game screen.
  - Once the game starts (`startGame()`), `tankClassLocked = true` locks the chassis.
  - Number keys 1, 2, 3 and mid-game class selectors display a warning toast: `⚠️ TANK CLASS LOCKED FOR MISSION DURATION!`.

#### 8. Player Tactical Drone Strike (60s Cooldown)
- **Feature**: Players can summon a precision MQ-9 Reaper drone strike every 60 seconds.
- **Implementation**:
  - Added a 60-second cooldown timer `playerDroneStrikeTimer`.
  - Added a HUD and mobile drone strike button (`#drone-strike-btn`, `#m-btn-drone`) and mapped keyboard shortcut `[X]`.
  - When triggered, an MQ-9 Reaper drone flies across the map to the target coordinates and drops twin Hellfire missiles with massive area-of-effect destruction (180 damage, 85px blast radius).

---

### [v1.2.0] — 2026-10-04 (Networked Real-Time Multiplayer Warfare)
**Focus**: Online multiplayer combat, dynamic map scaling, player rooms, callsigned lobbies, and radar fog of war.

#### 1. 5-Player Real-Time Multiplayer Architecture
- Built a Node.js WebSocket backend (`server.js`) supporting room-based matchmaking.
- Up to 5 simultaneous players per room with low-latency client-server state synchronization (60Hz interpolation).
- Synchronization of vehicle coordinates, chassis angles, turret orientations, cannon fire, mine drops, damage, and kills.

#### 2. Dynamic Battlefield Scaling
- Battlefield dimensions expand dynamically based on connected player count:
  - **1–2 Players**: Sector Alpha ($3000 \times 3000\text{ px}$)
  - **3 Players**: Sector Bravo ($3800 \times 3400\text{ px}$)
  - **4 Players**: Sector Charlie ($4400 \times 3800\text{ px}$)
  - **5 Players**: Grand Theater Delta ($5000 \times 4200\text{ px}$)
- Proportional scaling of river systems, bridges, base garrisons, and radar grids.

#### 3. Room Management & Callsign Customization
- Room creation modal allowing custom room names and player callsigns.
- Public room browser via `/api/rooms` endpoint.
- 5 unique faction color schemes:
  - Player 1: Crimson Fury (`#ef4444`)
  - Player 2: Cobalt Shield (`#3b82f6`)
  - Player 3: Emerald Vanguard (`#10b981`)
  - Player 4: Amber Legion (`#f59e0b`)
  - Player 5: Amethyst Strike (`#a855f7`)

#### 4. Radar Fog of War
- Requirement: Radar only displays terrain and entities discovered by the player.
- Divided map into a fog grid (`RADAR_FOG_CELL_SIZE = 120px`).
- Tanks unveil fog within an 850px sensor radius.
- CRT scanner renders dark phosphor shadow over unmapped zones; rival tank blips appear only within discovered cells.

#### 5. Post-Match Leaderboard & End Screen
- Real-time tracking of player score, kills, deaths, and accuracy.
- Match completion triggers an end-game leaderboard modal displaying final rankings, MVP honors, and match statistics.

---

### [v1.1.5] — 2026-10-03 (Containerization & Google Cloud Run Deployment)
**Focus**: Packaging, artifact repository publishing, and serverless cloud deployment.

#### 1. Containerization
- Authored production `Dockerfile` with multi-stage build optimization and Alpine Linux base.
- Configured production environment variables (`NODE_ENV=production`, `PORT=8080`).
- Configured `.dockerignore` to streamline build context.

#### 2. Artifact Registry & Cloud Run
- Created Google Cloud Artifact Registry repository: `us-central1-docker.pkg.dev/agentic002/campaign88/campaign88`.
- Deployed service to Google Cloud Run in `us-central1`.
- Verified live service endpoint: `https://campaign88-32248242147.us-central1.run.app`.

---

### [v1.1.0] — 2026-10-03 (Mobile Experience & Adaptive Layout)
**Focus**: Seamless mobile gameplay, automatic device detection, portrait orientation, and virtual touch controls.

#### 1. Automatic Device Detection & Portrait Viewport
- Built auto-detection inspecting User-Agent strings and touch event capabilities.
- Dynamically applies `.mobile-mode` with a 9:16 portrait viewport aspect ratio.
- Configured mobile meta viewport tags preventing unwanted zooming and panning.

#### 2. Dual Virtual Thumbsticks
- Integrated Left Thumbstick: Omnidirectional steering, acceleration, and reverse driving.
- Integrated Right Thumbstick: 360-degree independent turret rotation and tap-to-fire mechanic.
- Added haptic feedback styling and spring-centered dynamic knobs.

#### 3. Mobile Touch Action Controls
- Added dedicated touch control cluster:
  - `MINE` button: Quick-drop landmines.
  - `SPECIAL` button: Class ability activation (Dash, Smoke, Siege).
  - `DRONE` button: Tactical airstrike call-in.
  - Fullscreen toggle button.

#### 4. Mobile HUD & Navigation
- Redesigned status dashboard into a top-mounted mobile bar with mini CRT radar, compact armor/fuel bars, and POW counter.
- Created `/play` route optimized for clean mobile browser bookmarks.

---

### [v1.0.0] — 2026-10-02 (Initial Retro Arcade Revival)
**Focus**: Foundational game engine recreation inspired by 1987's *Fire Power* / *Campaign 88*.

#### 1. The Holy Trinity: Playable Tank Classes
- **Light Tank**: 100 HP, 150% speed, 4 POW capacity, Dash Thruster ability.
- **Medium Tank**: 200 HP, 100% speed, 8 POW capacity, Smoke Screen ability.
- **Heavy Tank**: 400 HP, 65% speed, 16 POW capacity, Siege Mode (double fire rate, 2x blast radius).

#### 2. Combat & Destruction Engine
- Destructible concrete walls with fractured brick physics and rubble generation.
- Destructible barracks and houses with pitched roofs and smoke particle trails.
- Projectile ballistics with muzzle velocity, recoil animations, and splash damage radius.
- Deployable stealth landmines with arming delay and chain explosions.

#### 3. Capture the Flag & POW Rescue Mechanics
- Enemy flag capture mechanics with delivery to home garage for major score bonuses.
- POW extraction compound: breaching holding cells liberates allied prisoners of war.
- Boarding mechanics: tanks transport soldiers up to their chassis capacity back to base.

#### 4. Infantry Squish Mechanic
- Driving over fleeing infantry triggers authentic squish audio, screen decals, and red blood splatter particles (matching classic reference imagery).

#### 5. Anti-Camp Hunter-Killer Drone
- Players stationary within a 220px radius for over 45 seconds trigger an AI kamikaze attack drone pursuing the player.

#### 6. World Generation & Terrain
- $4000 \times 2400\text{ px}$ world with dual biomes (Western Grassland Forest & Eastern Arid Desert).
- Packed dirt roads with tire rut grooves.
- Deep blue water bodies (lakes and central river) impassable to tanks.
- Timber, steel, and military pontoon bridges spanning river crossings.
- Craggy 3D isometric mountain ranges blocking vehicular movement.

#### 7. Retro Audio Synthesizer (Web Audio API)
- Pure procedural Web Audio synthesis for engine rumble, turret rotation, cannon blasts, machine gun rattles, siren alerts, and squishes without external audio asset dependencies.

---

## Architecture & Configuration Reference

### Directory Structure
```
campaign88/
├── Dockerfile              # Production container build specification
├── .dockerignore           # Build context exclusions
├── index.html              # Primary game client (HTML5, Canvas, Web Audio, CSS3)
├── play/
│   └── index.html          # Mobile route mirror
├── server.js               # Node.js HTTP & WebSocket multiplayer backend
├── package.json            # Project dependencies (ws)
├── changes.md              # Change management & release history document
└── specs.md                # Initial product specifications & design document
```

### Port Configuration
- **Local Service**: Defaults to port `8080` (or `PORT` environment variable).
- **Google Cloud Run**: Automatically mapped to `PORT` ($8080$ / $80$).
- **Protocol**: HTTP/1.1 with WebSocket upgrade support (`ws://` / `wss://`).
