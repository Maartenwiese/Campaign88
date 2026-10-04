Product Requirements Document (PRD)
Project Fire Power: Legacy (Modern Retro Revival)
1. Document Control & Governance
Metadata Attribute	Enterprise Specification
Document ID	PRD-FPL-2026-10
Project Codename	Fire Power: Legacy
Document Version	1.0.0-Draft
Target Launch	Q3 2027
Status	In Review
Author	Gemini Enterprise
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
Classic Game Loop: Complete reproduction of CTF mechanics (grabbing the flag, returning it to home base), POW cell destruction, soldier rescue, and First Aid tent mechanics 

 .

Local Split-Screen: Flawless horizontal split-screen implementation supporting keyboard/mouse and gamepad dual-input.

Basic Destruction Engine: Fully destructible perimeter walls, gates, and civilian structures with satisfying pixelated explosion animations.

The "Anti-Camp" Mechanic: If a player remains static within a 20-meter radius for more than 45 seconds, an AI attack helicopter spawns off-screen to pursue them.

Physical Soldier Interaction: Driving over fleeing soldiers triggers the classic squish audio cue and places a temporary red decal on the terrain 

 .

🟡 P1 (Should-Have for General Availability)
Online Multiplayer with Rollback Netcode: Low-latency online peer-to-head multiplayer utilizing rollback logic to replicate local split-screen feel online.

Modernized Base Garages: Dynamic weapon repair and tank-swapping inside the garage during active matches.

Stealth Mine Laying: Ability to drop invisible mines (only visible to team/player who dropped them) that detonate when ran over by the opponent.

In-Game Level Editor: Interactive tile-based map builder supporting base assembly, road drawing, and turret placing.

🔴 Non-Goals (Out of Scope)
3D Perspective Camera: The game will strictly remain a flat, top-down 2D camera. No first-person or over-the-shoulder third-person modes will be developed.

Single-Player Story Campaign: Narrative-driven missions are out of scope. AI bots will be built solely for offline practice/skirmish play.

7. Core User Interface & Experience (UI/UX)
+-----------------------------------------------------------+
|  [P1 VIEWPORT: Top-Down Tank View]                       |
|  - Tracks Player 1 tank at center                         |
|  - Real-time physics, explosions, and destructible walls  |
|                                                           |
+-----------------------------------------------------------+
| ================== HORIZONTAL SPLIT ===================== |
+-----------------------------------------------------------+
|  [P2 VIEWPORT: Top-Down Tank View]                       |
|  - Tracks Player 2 tank at center                         |
|                                                           |
|                                                           |
+-----------------------------------------------------------+
| HUD PANEL (Right-Side Stencil Board):                     |
| [P1 HP: ||||||| ] [POWs: 4/16] [Mines: 3] [Fuel: 80%]     |
| [P2 HP: ||||    ] [POWs: 0/16] [Mines: 0] [Fuel: 42%]     |
+-----------------------------------------------------------+
Visual Style: High-quality, modern 16-bit pixel art with fluid 60FPS animations. Screen shake and dynamic smoke particles are applied heavily on structure collapse.

Audio Direction: Rich, crunchy, retro-synthesized sound effects for tank diesel engines, mechanical turret rotations, metal-tearing explosions, and the signature "squish" sound for infantry runovers.

8. Success Metrics & Telemetry
DORA Velocity: Code-to-deployment time under 4 hours for emergency hotfixes to netcode.

Gameplay Balance Metric: The win-loss ratio between the Light, Medium, and Heavy tanks should remain within a balanced 48%−52% envelope.

Creative Retention: Monthly active user-generated map submissions on the Steam Workshop.

B
B
B
B
B
B
B
B
B
B

