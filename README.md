# Campaign 88 (Fire Power: Legacy)

> *Turning something legacy into reality using a sprinkle of AI.*

**Campaign 88** is a modern, high-fidelity browser and mobile recreation of the seminal 1987 top-down tactical tank combat game *Fire Power*. It revives the fast-paced 2D armored warfare loop—featuring 3 distinct tank chassis classes, destructible civilian buildings, barbed-wire POW extraction camps, tactical landmines, realistic terrain obstacles, a live CRT radar scanner, an anti-camp hunter-killer drone, and networked real-time multiplayer for up to 5 concurrent players.

---

## Live Deployments & URLs

* **Production Cloud Run**: [https://campaign88-32248242147.us-central1.run.app](https://campaign88-32248242147.us-central1.run.app)
* **Mobile Optimized View**: [https://campaign88-32248242147.us-central1.run.app/play](https://campaign88-32248242147.us-central1.run.app/play)
* **Change Log**: See [changes.md](changes.md) for full version history from v1.0.0 through v1.3.0.

---

## Key Features

### 1. The Holy Trinity: Playable Tank Classes
* **Light Tank**: 100 HP, 150% speed, 4 POW capacity, Dash Thruster ability.
* **Medium Tank**: 200 HP, 100% speed, 8 POW capacity, Smoke Screen ability.
* **Heavy Tank**: 400 HP, 65% speed, 16 POW capacity, Siege Mode (double fire rate, 2x blast radius).
* *Chassis Lock*: Players select their tank in the pre-game briefing screen; mid-match switching is locked.

### 2. Tactical Battlefield & Obstacle Mechanics
* **Road Clearance**: Guaranteed clearance—houses, barracks, and trees never obstruct roadways.
* **Tree Cover & Trunk Collisions**: Solid tree trunks halt direct movement; tree canopies provide 50% damage reduction against incoming shells with foliage deflection particles and HUD status indicator.
* **Gated POW Camps & Armed Sentries**: Rescuing allied prisoners requires breaching compound perimeters protected by tiny gates (`GATE 🔒`) and taking down or squishing hostile sentry riflemen.
* **Incoming Ballistic Missile Strikes**: Warning system provides 3–5 seconds advance notification with a pulsing hazard zone and CRT radar blip; players must evacuate the circle to avoid catastrophic damage.
* **Building Destruction Weapon Upgrades**: Destroying buildings has a 70% chance to drop military weapon upgrade crates (APCR Hyper-Cannon, Triple Cluster Spread, Plasma Incendiary, Rapid Gatling).
* **Player Tactical Drone Strike**: 60-second cooldown player-commanded airstrike (`[X]` key) calling in an MQ-9 Reaper drone to drop twin Hellfire missiles onto enemy coordinates.
* **Infantry Squish Mechanic**: Driving over enemy or fleeing infantry triggers authentic squish audio, blood decals, and red splatter physics.
* **Secret Cheat Mode**: Pressing `+` three times grants 9999 armor, infinite fuel, full weapon power, and extra mines.

### 3. Networked Real-Time Multiplayer (Up to 5 Players)
* Real-time WebSocket matchmaking server (`server.js`).
* Custom room creation and player callsign customization.
* Dynamic map scaling based on active player count:
  * 1–2 Players: Sector Alpha ($3000 \times 3000\text{ px}$)
  * 3 Players: Sector Bravo ($3800 \times 3400\text{ px}$)
  * 4 Players: Sector Charlie ($4400 \times 3800\text{ px}$)
  * 5 Players: Grand Theater Delta ($5000 \times 4200\text{ px}$)
* **Radar Fog of War**: The CRT radar scanner only reveals territory and enemy blips that have been actively explored.
* **End-Game Leaderboard**: Live post-match statistics displaying score, kills, deaths, and match MVP awards.

### 4. Full Mobile Support
* Automatic device detection for phones and tablets.
* 9:16 portrait viewport layout with responsive UI scaling.
* Dual on-screen virtual thumbsticks: Left for omnidirectional driving, Right for 360-degree turret aiming and firing.
* Touch action buttons for Landmines, Special Abilities, Drone Strikes, and Fullscreen toggle.

---

## Controls

| Action | Desktop Controls | Mobile Touch Controls |
| :--- | :--- | :--- |
| **Drive / Steer** | `W`, `A`, `S`, `D` or Arrow Keys | Left Virtual Joystick |
| **Turret Aiming** | Mouse Cursor | Right Virtual Joystick (Aim & Tap to Fire) |
| **Fire Main Cannon** | Left Mouse Click or `Space` | Right Virtual Joystick / Screen Tap |
| **Deploy Landmine** | Right Mouse Click or `M` | `MINE` Button |
| **Special Ability** | `Shift` or `E` | `SPECIAL` Button |
| **Tactical Drone Strike** | `X` | `DRONE` Button |
| **Pre-Game Tank Select** | Briefing Screen Buttons | Briefing Screen Buttons |
| **Toggle Mobile / Fullscreen** | Buttons in Footer | Top / Bottom Action Buttons |
| **Cheat Mode** | Press `+` three times in succession | — |

---

## Quickstart & Local Execution

### Prerequisites
* [Node.js](https://nodejs.org/) (v18+)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Unified Local Server
```bash
npm start
# or:
PORT=8080 node server.js
```

Open [http://localhost:8080](http://localhost:8080) in your browser. For the mobile portrait view, visit [http://localhost:8080/play](http://localhost:8080/play).

---

## Containerization & Deployment

Build and run using Docker:
```bash
docker build -t campaign88 .
docker run -p 8080:8080 campaign88
```

Deploy to Google Cloud Run:
```bash
gcloud builds submit --tag us-central1-docker.pkg.dev/agentic002/campaign88/campaign88:latest
gcloud run deploy campaign88 \
  --image us-central1-docker.pkg.dev/agentic002/campaign88/campaign88:latest \
  --region us-central1 \
  --port 8080 \
  --allow-unauthenticated
```

---

## License

ISC License. Inspired by the classic *Fire Power* (1987).
