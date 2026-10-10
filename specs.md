Product Requirements Document (PRD)
Project Fire Power: Legacy (Modern Retro Revival)
1. Document Control & Governance
Metadata Attribute	Enterprise Specification
Document ID	PRD-FPL-2026-10
Project Codename	Fire Power: Legacy
Document Version	1.2.0
Last Updated	2026-10-10
Target Launch	Q3 2027
Status	Approved / Implemented
Author	MaartenW
Target Platform	PC (Steam, GOG, WebGL / Modern Browsers)
 
2. Executive Summary & BLUF (Bottom Line Up Front)
Fire Power: Legacy is a modern, high-fidelity recreation of the seminal 1987 split-screen tank combat game Fire Power 

 . The project aims to resurrect the fast-paced, top-down tactical battle loop—incorporating Capture the Flag (CTF), POW extraction, and base demolition—while modernizing it with robust online matchmaking, a modern map builder with community sharing, and enhanced 16-bit-inspired physics and particle effects.

The Problem: Modern vehicle combat games have drifted toward hyper-realistic, complex simulators or over-complicated card-based progressions, leaving a massive vacuum for immediate, local and online "couch play" multiplayer action.

The Solution: A faithful, modernized 2D top-down "couch-and-keyboard" style multiplayer tank battle arena with instant pick-up-and-play mechanics, low latency online rollback netcode, and competitive tactical layers.

3. Strategic Context & Vision
Target Audience: Retro gamers (35–50) seeking nostalgia, and casual competitive players looking for fast-paced local/online party games.

Strategic Thesis: By keeping gameplay strictly top-down 2D, we maintain a clean visual hierarchy, eliminate 3D motion sickness, and keep the focus purely on tactical positioning, landmine traps, and split-second turret aiming.

4. Personas & Critical User Journeys (CUJs)
Persona	User Intent & Goal	Critical User Journey (CUJ)
The Nostalgic Gamer (Marcus, 42)	Relive 1980s split-screen memories with friends online or locally.	1. Boot game → 2. Invite friend to Steam Lobby → 3. Select horizontal split-screen mode → 4. Jump into classic base-siege combat with real-time voice/chat.
The Creative Builder (Aria, 26)	Create complex, fortified maps and share them online.	1. Open Map Editor → 2. Place spawns, walls, landmines, and base-bunkers → 3. Verify map validity via automated bot-play → 4. Publish to community hub.
The Party Host (Leo, 31)	Host an immediate, chaotic local game with friends on a single machine.	1. Start Local Versus Mode → 2. Map one player to WASD/Mouse, the other to a USB controller → 3. Instantly launch split-screen combat on one display.
 
5. Playable Vehicles (The Holy Trinity)
We will preserve the iconic rock-paper-scissors dynamic of the three original tank classes:

Class	Armor / HP	Speed	POW Capacity	Special Ability / Tactical Role
Light Tank	Low (100 HP)	Very Fast (150%)	4	Dash / Dash Thruster: Temporary speed boost to dodge incoming heavy artillery or make a quick flag escape.
Medium Tank	Medium (200 HP)	Moderate (100%)	8	Smoke Screen: Deploy a smoke cloud to break enemy turret lock-on and disrupt rival visibility.
Heavy Tank	High (400 HP)	Slow (65%)	16 (Max)	Siege Mode: Anchor in place to double firing rate and shell splash radius at the cost of mobility.
 
6. Functional Requirements & Scope
🟢 P0 (Must-Have for Minimum Viable Product)
Classic Game Loop: Complete reproduction of CTF mechanics (grabbing the flag, returning it to home base), POW cell destruction, soldier rescue, and First Aid tent mechanics.

Procedural Level & Complex Terrain Re-Generation (Every Game Launch):
- **Per-Game Procedural Re-Generation**: Battlefield levels must be completely procedurally re-generated on every single game launch (both Solo Skirmish, Operation Campaign, and Online Multiplayer). No two matches share the same geography or layout.
- **Complex Terrain & Natural Barriers**:
  - **Dynamic Rivers & Waterways**: Deep meandering watercourses and river channels acting as impassable barriers that divide the map into distinct operational theaters.
  - **Strategic Bridge Chokepoints**: Multiple tactical bridges (timber, reinforced concrete, pontoon) spanning waterways, serving as high-stakes crossing corridors and ambush points.
  - **Craggy Mountain Ranges**: Impassable rocky massifs, cliffs, and mountain peaks that shape natural canyons, chokepoints, and line-of-sight obstructions, forcing tactical detour planning.
  - **Obstruction-Free Road Corridors**: Paved and dirt highway arteries connecting bases and bridges, guaranteed to remain clear of houses, walls, and tree trunks for high-speed transit.
  - **Tactical Foliage & Forest Groves**: Dense pine and oak canopies providing 50% defense cover against incoming artillery, combined with solid inner tree trunks that physically halt tank driving.
  - **Demolishable Outposts & Fortified Camps**: Civilian structures yielding weapon upgrades upon destruction, and fortified POW camps guarded by hostile sentries behind locked gates.

Dynamic & Well-Hidden Opponent Flag Placement:
- **Non-Static Flag Spawns**: The opponent's flag must never spawn in a predictable, static location.
- **Deeply Concealed Positions**: Each procedural generation must place the enemy flag in a distinct, well-hidden, and tactically challenging location (e.g., secluded mountain defiles, deep behind dense forest canopies, or tucked within fortified defensive compounds).
- **Reconnaissance & Fog of War Integration**: Players must actively scout the battlefield and penetrate the radar fog of war to locate the opponent's flag, eliminating blind-rush tactics and rewarding tactical reconnaissance.

Single-Player Operation Campaign & Stage Progression:
- **Unified Mode Selector**: Briefing interface provides three distinct game experiences:
  1. `[OPERATION CAMPAIGN]`: Multi-stage tactical operation with persistent Armory Depot and climax Titan Boss.
  2. `[SKIRMISH ARENA]`: Instant procedural single-match quickplay.
  3. `[1v1 MULTIPLAYER DUEL]`: Real-time online competitive combat.
- **Linear 3-Stage Operation Structure**:
  - **Stage 1 (Border River Recon & POW Rescue)**:
    - *Primary Objective*: Infiltrate enemy sectors across bridges and rescue at least 6 POWs, escorting them to the base.
    - *Optional Bounty*: Neutralize enemy radar outpost for +300 bonus Salvage Warbonds.
  - **Stage 2 (Mountain Pass Infiltration & Flag Extraction)**:
    - *Primary Objective*: Penetrate craggy mountain canyons under heavy patrol fire, locate the deeply concealed enemy flag under radar fog, and return it across the river.
    - *Optional Bounty*: Ambush the enemy fuel convoy for +400 bonus Salvage Warbonds.
  - **Stage 3 (Fortress Siege & Titan Behemoth Boss)**:
    - *Primary Objective*: Breach the fortified Citadel perimeter walls, neutralize defense turrets, and eliminate the Titan Behemoth super-tank.
- **Titan Behemoth Boss Encounter**:
  - *Phase 1 (100% - 50% HP)*: Twin high-velocity main cannons with heavy frontal deflection armor (reduced frontal damage).
  - *Phase 2 (< 50% HP)*: Enrage mode with elevated chassis speed, incoming missile salvos, and an exposed rear glowing exhaust port vulnerable to **3x critical flanking damage**.
- **Field Armory Depot & Salvage Economy**:
  - Earn "Salvage Warbonds" from combat destructions, POW rescues, and completed bounties.
  - Between stages (and at base), purchase upgrades:
    1. *Reinforced Hull*: +25% Max HP and damage mitigation.
    2. *Twin-Barrel Autocannon*: Twin simultaneous shell volley with increased projectile speed.
    3. *High-Torque Turbo Engine*: +20% top speed and faster track turning.
    4. *Advanced Drone Avionics*: Drone strike recharge reduced from 60s to 30s.
    5. *Reserve Tank Requisition*: +1 Reserve Life.
- **Deployment Reserves & Checkpoints**:
  - 3 initial tank lives per campaign. Destroyed tanks redeploy at forward base. Mission failure allows stage checkpoint retries.
- **Retro CRT Military Intercom HUD**:
  - Radio transmission banners at stage entry, objective updates, and Titan Boss sirens with synthesized radio-beeps.

Basic Destruction Engine: Fully destructible perimeter walls, gates, and civilian structures with satisfying pixelated explosion animations.

The "Anti-Camp" Mechanic: If a player remains static within a 20-meter radius for more than 45 seconds, an AI attack helicopter spawns off-screen to pursue them.

Physical Soldier Interaction: Driving over fleeing soldiers triggers the classic squish audio cue and places a temporary red decal on the terrain.

🟡 P1 (Should-Have for General Availability)
Online Multiplayer with Rollback Netcode: Low-latency online peer-to-head multiplayer utilizing rollback logic to replicate local split-screen feel online.

Modernized Base Garages: Dynamic weapon repair and tank-swapping inside the garage during active matches.

Stealth Mine Laying: Ability to drop invisible mines (only visible to team/player who dropped them) that detonate when ran over by the opponent.

In-Game Level Editor: Interactive tile-based map builder supporting base assembly, road drawing, and turret placing.

🔴 Non-Goals (Out of Scope)
3D Perspective Camera: The game will strictly remain a flat, top-down 2D camera. No first-person or over-the-shoulder third-person modes will be developed.

Fully Rendered 3D Cinematic Cutscenes: Pre-rendered or 3D video cutscenes are out of scope; all narrative delivery is strictly retro 2D CRT radio intercom banners and audio-beeps.

7. Core User Interface & Experience (UI/UX)
+-----------------------------------------------------------+
|  [P1 VIEWPORT: Top-Down Tank View]                       |
|  - Tracks Player 1 tank at center                         |
|  - Real-time physics, explosions, and destructible walls  |
|                                                           |
+-----------------------------------------------------------+
+-----------------------------------------------------------+
| HUD PANEL (Right-Side Stencil Board):                     |
| [P1 HP: ||||||| ] [POWs: 4/16] [Mines: 3] [Fuel: 80%]     |
| [P2 HP: ||||    ] [POWs: 0/16] [Mines: 0] [Fuel: 42%]     |
+-----------------------------------------------------------+
Visual Style: High-quality, modern 16-bit pixel art with fluid 60FPS animations. Screen shake and dynamic smoke particles are applied heavily on structure collapse.

Audio Direction: Rich, crunchy, retro-synthesized sound effects for tank diesel engines, mechanical turret rotations, metal-tearing explosions, and the signature "squish" sound for infantry runovers.

Tactical Radar & Fog of War: A military CRT phosphor radar display shrouded by a persistent fog of war. Unexplored terrain, natural barriers (rivers, mountain defiles), civilian structures, enemy installations, and the well-hidden opponent flag remain completely concealed until physically scouted and uncovered by the player's reconnaissance sweep.

8. Success Metrics & Telemetry
DORA Velocity: Code-to-deployment time under 4 hours for emergency hotfixes to netcode.

Gameplay Balance Metric: The win-loss ratio between the Light, Medium, and Heavy tanks should remain within a balanced 48%−52% envelope.

Creative Retention: Monthly active user-generated map submissions on the Steam Workshop.


