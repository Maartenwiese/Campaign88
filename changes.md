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

---

## Detailed Version Changelog

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
