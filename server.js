const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = parseInt(process.env.PORT || '8080', 10);
const MAX_PLAYERS_PER_ROOM = 2;

// Tank player colors for 2-player 1v1 duel
const PLAYER_COLORS = [
  { name: 'Crimson Vanguard', hex: '#ef4444', accent: '#991b1b', team: 1 },
  { name: 'Cobalt Shield', hex: '#3b82f6', accent: '#1d4ed8', team: 2 }
];

// Battlefield size for 1v1 tactical tank duel
function getDynamicWorldSize(playerCount) {
  return { width: 3400, height: 2600, label: 'Sector 1v1 Arena (3400x2600)' };
}

// Generate base garrisons for the two opposing players (West vs East across the river)
function generateBases(worldW, worldH) {
  return [
    { id: 0, x: 340, y: Math.floor(worldH * 0.5), r: 180, name: 'Crimson Base (West)', color: '#ef4444' },
    { id: 1, x: worldW - 340, y: Math.floor(worldH * 0.5), r: 180, name: 'Cobalt Base (East)', color: '#3b82f6' }
  ];
}

// Procedural battlefield terrain generator (synchronized across both players)
function generateProceduralTerrain(worldW, worldH, seed = Math.floor(Math.random() * 100000)) {
  let parsed;
  try {
    parsed = Number(seed);
  } catch (e) {
    parsed = NaN;
  }
  const sSeed = (Number.isFinite(parsed) && seed !== undefined && seed !== null && seed !== '')
    ? Math.abs(Math.floor(parsed)) % 233280
    : (Math.floor(Math.random() * 900000) + 100000);
  let s = sSeed;
  function rnd() {
    s = Math.abs((s * 9301 + 49297) % 233280);
    return s / 233280;
  }

  // 1. Central River & Water Bodies
  const riverX = Math.floor(worldW * (0.45 + rnd() * 0.10));
  const riverW = 160;

  const bridgeWidth = riverW + 50;
  const bridgeX = riverX - 25;
  const bridge1Y = Math.floor(worldH * (0.18 + rnd() * 0.08));
  const bridge2Y = Math.floor(worldH * 0.50);
  const bridge3Y = Math.floor(worldH * (0.74 + rnd() * 0.08));

  const waterBodies = [
    { x: riverX, y: 0, w: riverW, h: worldH, type: 'river' },
    { x: Math.floor(riverX * 0.45), y: Math.floor(bridge1Y * 0.45), r: 85, type: 'circle' },
    { x: Math.floor(riverX * 0.45), y: Math.floor(bridge3Y + (worldH - bridge3Y) * 0.55), r: 85, type: 'circle' },
    { x: riverX + 420, y: Math.floor(bridge1Y * 0.45), r: 85, type: 'circle' }
  ];

  // 2. Bridges
  const bridges = [
    { x: bridgeX, y: bridge1Y, w: bridgeWidth, h: 110, name: 'North Bridge', type: 'wood' },
    { x: bridgeX, y: bridge2Y, w: bridgeWidth, h: 120, name: 'Central Highway Bridge', type: 'concrete' },
    { x: bridgeX, y: bridge3Y, w: bridgeWidth, h: 110, name: 'South Pontoon Bridge', type: 'pontoon' }
  ];

  // 3. Highways & Arterial Roads
  const roads = [
    { x: 180, y: bridge2Y + 5, w: worldW - 360, h: 110 },
    { x: 300, y: bridge1Y + 10, w: worldW - 600, h: 90 },
    { x: 300, y: bridge3Y + 10, w: worldW - 600, h: 90 },
    { x: 850, y: bridge1Y + 10, w: 90, h: bridge3Y - bridge1Y },
    { x: worldW - 940, y: bridge1Y + 10, w: 90, h: bridge3Y - bridge1Y }
  ];

  // 4. Spatial Clearance Helpers (margin = 20px)
  function doesRectOverlapRoad(x, y, w, h, margin = 20) {
    for (const r of roads) {
      if (x + w > r.x - margin && x < r.x + r.w + margin &&
          y + h > r.y - margin && y < r.y + r.h + margin) {
        return true;
      }
    }
    return false;
  }

  function doesCircleOverlapRoad(cx, cy, radius, margin = 20) {
    for (const r of roads) {
      const checkR = radius + margin;
      const closestX = Math.max(r.x, Math.min(cx, r.x + r.w));
      const closestY = Math.max(r.y, Math.min(cy, r.y + r.h));
      const dx = cx - closestX;
      const dy = cy - closestY;
      if (dx * dx + dy * dy < checkR * checkR) {
        return true;
      }
    }
    return false;
  }

  // 5. Mountains
  const mountains = [];
  const mOffsets = [
    { x: riverX - 380, y: Math.floor(worldH * 0.35), r: 95 },
    { x: riverX + 380, y: Math.floor(worldH * 0.35), r: 95 },
    { x: riverX - 380, y: Math.floor(worldH * 0.65), r: 95 },
    { x: riverX + 380, y: Math.floor(worldH * 0.65), r: 95 },
    { x: Math.floor(riverX * 0.40), y: Math.floor(worldH * 0.12), r: 85 },
    { x: worldW - Math.floor(riverX * 0.35), y: Math.floor(worldH * 0.88), r: 90 },
    { x: worldW - 460, y: Math.floor(worldH * 0.28), r: 105 },
    { x: worldW - 360, y: Math.floor(worldH * 0.18), r: 85 },
    { x: worldW - 420, y: Math.floor(worldH * 0.72), r: 100 },
    { x: worldW - 550, y: Math.floor(worldH * 0.82), r: 85 }
  ];
  for (const m of mOffsets) {
    mountains.push({
      x: m.x + (rnd() - 0.5) * 40,
      y: m.y + (rnd() - 0.5) * 40,
      r: m.r + Math.floor(rnd() * 20),
      peakX: -10, peakY: -15
    });
  }

  // 6. Walls (Starting Compound Breach Walls & Perimeter Walls)
  const walls = [];
  function addWall(w) {
    if (!doesRectOverlapRoad(w.x, w.y, w.w, w.h, 20)) {
      walls.push(w);
    }
  }
  addWall({ x: 180, y: bridge2Y - 200, w: 260, h: 48, hp: 150, maxHp: 150 });
  addWall({ x: 600, y: bridge2Y - 520, w: 48, h: 260, hp: 150, maxHp: 150 });
  addWall({ x: 180, y: bridge2Y + 240, w: 220, h: 48, hp: 150, maxHp: 150 });
  addWall({ x: 500, y: bridge2Y + 240, w: 180, h: 48, hp: 100, maxHp: 150 });

  for (let x = 80; x < worldW - 80; x += 80) {
    addWall({ x, y: 60, w: 80, h: 48, hp: 120, maxHp: 120 });
    addWall({ x, y: worldH - 108, w: 80, h: 48, hp: 120, maxHp: 120 });
  }
  for (let y = 108; y < worldH - 108; y += 80) {
    addWall({ x: 60, y, w: 48, h: 80, hp: 120, maxHp: 120 });
    addWall({ x: worldW - 108, y, w: 48, h: 80, hp: 120, maxHp: 120 });
  }

  // 7. Houses & Bunkers
  const houses = [];
  function addHouse(h) {
    if (!doesRectOverlapRoad(h.x, h.y, h.w, h.h, 20)) {
      houses.push(h);
    }
  }
  addHouse({ x: 460, y: bridge2Y - 260, w: 120, h: 100, hp: 220, maxHp: 220, type: 'bunker', roofColor: '#16a34a' });

  for (let i = 0; i < 20; i++) {
    const hx = 350 + rnd() * (worldW - 700);
    const hy = 250 + rnd() * (worldH - 500);
    const hHp = 200 + Math.floor(rnd() * 80);
    const hType = rnd() > 0.5 ? 'cottage' : 'bunker';
    const hRoof = rnd() > 0.5 ? '#c25e36' : '#16a34a';
    if (Math.abs(hx - riverX) > 190) {
      addHouse({
        x: Math.floor(hx), y: Math.floor(hy), w: 120, h: 90,
        hp: hHp, maxHp: 280, type: hType, roofColor: hRoof
      });
    }
  }

  // 8. Foliage & Trees
  const foliage = [];
  function addTree(tl) {
    if (!doesCircleOverlapRoad(tl.x, tl.y, tl.r, 20)) {
      foliage.push(tl);
    }
  }
  for (let i = 0; i < 40; i++) {
    const tx = 300 + rnd() * (worldW - 600);
    const ty = 200 + rnd() * (worldH - 400);
    const tr = 50 + Math.floor(rnd() * 20);
    const tType = rnd() > 0.3 ? 'oak' : 'pine';
    if (Math.abs(tx - riverX) > 160) {
      addTree({ x: Math.floor(tx), y: Math.floor(ty), r: tr, type: tType });
    }
  }

  // 9. POW Camps
  const powCamps = [];
  function addPowCamp(pc) {
    if (!doesRectOverlapRoad(pc.x, pc.y, pc.w, pc.h, 20)) {
      powCamps.push(pc);
    }
  }
  addPowCamp({
    x: 1750, y: bridge1Y - 140, w: 90, h: 90, hp: 280, maxHp: 280, prisoners: 6,
    hasGate: true, gateOpen: false, guarded: true, gateW: 24
  });
  addPowCamp({
    x: riverX + 460, y: bridge2Y - 160, w: 100, h: 100, hp: 320, maxHp: 320, prisoners: 8,
    hasGate: true, gateOpen: false, guarded: false, gateW: 26
  });
  addPowCamp({
    x: 1750, y: bridge3Y + 140, w: 90, h: 90, hp: 280, maxHp: 280, prisoners: 6,
    hasGate: true, gateOpen: false, guarded: true, gateW: 24
  });

  // 10. Dynamic Concealed Opponent Flag
  const offsetRnd = rnd();
  const choiceRnd = rnd();
  const flagCandidates = [
    { x: worldW - 440, y: Math.floor(worldH * 0.22) },
    { x: worldW - 400, y: Math.floor(worldH * 0.78) },
    { x: riverX + 540, y: Math.floor(worldH * 0.15) },
    { x: worldW - 680, y: Math.floor(worldH * 0.82) },
    { x: worldW - 580, y: Math.floor(worldH * 0.40) + Math.floor((offsetRnd - 0.5) * 200) }
  ];
  const chosenFlag = flagCandidates[Math.floor(choiceRnd * flagCandidates.length)] || flagCandidates[0];
  const flag = {
    x: Math.floor(chosenFlag.x),
    y: Math.floor(chosenFlag.y),
    homeX: Math.floor(chosenFlag.x),
    homeY: Math.floor(chosenFlag.y)
  };

  return {
    seed: sSeed,
    riverX,
    riverWidth: riverW,
    bridges,
    waterBodies,
    roads,
    mountains,
    walls,
    houses,
    foliage,
    powCamps,
    flag,
    enemyFlag: flag
  };
}

// Generate scaled river and bridge crossings
function generateRiverAndBridges(worldW, worldH) {
  const riverX = Math.floor(worldW * 0.5);
  const riverWidth = 160;
  
  const bridges = [
    { x: riverX - 25, y: Math.floor(worldH * 0.22), w: riverWidth + 50, h: 110, name: 'North Bridge' },
    { x: riverX - 25, y: Math.floor(worldH * 0.50), w: riverWidth + 50, h: 120, name: 'Central Highway Bridge' },
    { x: riverX - 25, y: Math.floor(worldH * 0.78), w: riverWidth + 50, h: 110, name: 'South Pontoon Bridge' }
  ];

  return { riverX, riverWidth, bridges };
}

// Rooms Map: roomId -> Room
const rooms = new Map();

class Room {
  constructor(name, hostId, hostPlayerName) {
    this.id = name.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 32) || 'operation-' + Math.floor(Math.random() * 8999 + 1000);
    this.name = name.trim().slice(0, 32);
    this.hostId = hostId;
    this.status = 'lobby'; // 'lobby' | 'playing' | 'finished'
    this.createdAt = Date.now();
    this.players = new Map();
    this.projectiles = [];
    this.mines = [];
    this.matchDuration = 180; // 3 minutes match timer
    this.timeRemaining = 180;
    this.timerInterval = null;
    this.world = getDynamicWorldSize(1);
    this.bases = generateBases(this.world.width, this.world.height);
    this.seed = Math.floor(Math.random() * 900000) + 100000;
    this.terrain = generateProceduralTerrain(this.world.width, this.world.height, this.seed);
    this.riverData = {
      riverX: this.terrain.riverX,
      riverWidth: this.terrain.riverWidth,
      bridges: this.terrain.bridges
    };
  }

  updateWorldScaling() {
    this.world = getDynamicWorldSize(this.players.size);
    this.bases = generateBases(this.world.width, this.world.height);
    
    // Reposition players at their respective bases if still in lobby
    let idx = 0;
    for (const player of this.players.values()) {
      const base = this.bases[idx % this.bases.length];
      player.slot = idx;
      player.color = PLAYER_COLORS[idx % PLAYER_COLORS.length].hex;
      player.team = idx + 1;
      player.teamName = PLAYER_COLORS[idx % PLAYER_COLORS.length].name;
      player.base = { x: base.x, y: base.y, r: base.r };
      player.x = base.x;
      player.y = base.y;
      player.angle = idx === 1 ? Math.PI : 0;
      player.turretAngle = idx === 1 ? Math.PI : 0;
      idx++;
    }
  }

  addPlayer(id, ws, playerName, tankClass = 'medium') {
    if (this.players.size >= MAX_PLAYERS_PER_ROOM) {
      return { success: false, error: 'ROOM_FULL', message: 'Game session is full! Maximum 2 players allowed for 1v1 duel.' };
    }
    if (this.status !== 'lobby') {
      return { success: false, error: 'GAME_IN_PROGRESS', message: 'Battle is already underway in this sector!' };
    }

    const slot = this.players.size;
    const colorInfo = PLAYER_COLORS[slot % PLAYER_COLORS.length];
    
    const player = {
      id,
      ws,
      name: (playerName || `Tanker-${slot + 1}`).trim().slice(0, 20),
      tankClass,
      slot,
      color: colorInfo.hex,
      team: slot + 1,
      teamName: colorInfo.name,
      x: 0,
      y: 0,
      angle: 0,
      turretAngle: 0,
      health: 200,
      maxHealth: 200,
      fuel: 100,
      mines: 5,
      pows: 0,
      score: 0,
      kills: 0,
      deaths: 0,
      ready: false,
      lastInputTime: Date.now()
    };

    this.players.set(id, player);
    this.updateWorldScaling();
    return { success: true, player };
  }

  removePlayer(id) {
    this.players.delete(id);
    if (this.players.size === 0) {
      if (this.timerInterval) clearInterval(this.timerInterval);
      rooms.delete(this.id);
      return;
    }

    // Transfer host if host left
    if (this.hostId === id) {
      const nextHost = this.players.keys().next().value;
      this.hostId = nextHost;
    }

    if (this.status === 'lobby') {
      this.updateWorldScaling();
    }
  }

  startMatch() {
    this.status = 'playing';
    this.timeRemaining = this.matchDuration;
    this.updateWorldScaling();

    // Generate fresh procedural terrain for the duel
    this.seed = Math.floor(Math.random() * 900000) + 100000;
    this.terrain = generateProceduralTerrain(this.world.width, this.world.height, this.seed);
    this.riverData = {
      riverX: this.terrain.riverX,
      riverWidth: this.terrain.riverWidth,
      bridges: this.terrain.bridges
    };

    // Assign full health and base spawn positions
    let idx = 0;
    for (const player of this.players.values()) {
      const base = this.bases[idx % this.bases.length];
      player.health = player.maxHealth;
      player.fuel = 100;
      player.pows = 0;
      player.mines = 5;
      player.x = base.x;
      player.y = base.y;
      player.angle = idx === 1 ? Math.PI : 0;
      player.turretAngle = idx === 1 ? Math.PI : 0;
      idx++;
    }

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timeRemaining--;
      if (this.timeRemaining <= 0) {
        this.endMatch('TIME_EXPIRED');
      } else if (this.timeRemaining % 5 === 0) {
        this.broadcast({
          type: 'time_sync',
          timeRemaining: this.timeRemaining
        });
      }
    }, 1000);
  }

  endMatch(reason = 'MATCH_COMPLETED') {
    if (this.status === 'finished') return;
    this.status = 'finished';
    if (this.timerInterval) clearInterval(this.timerInterval);

    // Build comprehensive final leaderboard
    const rankedPlayers = Array.from(this.players.values())
      .map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        teamName: p.teamName,
        tankClass: p.tankClass,
        score: p.score,
        kills: p.kills,
        deaths: p.deaths,
        pows: p.pows,
        kd: p.deaths === 0 ? p.kills : +(p.kills / p.deaths).toFixed(2)
      }))
      .sort((a, b) => b.score - a.score || b.kills - a.kills || a.deaths - b.deaths);

    // Assign ranks
    rankedPlayers.forEach((p, idx) => {
      p.rank = idx + 1;
    });

    const winner = rankedPlayers[0] || null;

    this.broadcast({
      type: 'match_over',
      reason,
      winner,
      leaderboard: rankedPlayers
    });
  }

  broadcast(msg, excludeId = null) {
    const payload = JSON.stringify(msg);
    for (const [id, player] of this.players.entries()) {
      if (id !== excludeId && player.ws.readyState === WebSocket.OPEN) {
        try {
          player.ws.send(payload);
        } catch (e) {
          console.error(`Error sending to player ${id}:`, e.message);
        }
      }
    }
  }

  getLobbyState() {
    return {
      roomId: this.id,
      roomName: this.name,
      hostId: this.hostId,
      status: this.status,
      maxPlayers: MAX_PLAYERS_PER_ROOM,
      playerCount: this.players.size,
      world: this.world,
      bases: this.bases,
      seed: this.seed,
      terrain: this.terrain,
      riverData: this.riverData,
      timeRemaining: this.timeRemaining,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        slot: p.slot,
        color: p.color,
        team: p.team,
        teamName: p.teamName,
        tankClass: p.tankClass,
        x: p.x,
        y: p.y,
        angle: p.angle,
        turretAngle: p.turretAngle,
        ready: p.ready,
        score: p.score,
        kills: p.kills,
        deaths: p.deaths,
        isHost: p.id === this.hostId
      }))
    };
  }
}

// HTTP Server
const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = parsedUrl.pathname;

  // Health check endpoint
  if (pathname === '/healthz' || pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }

  // Active rooms JSON API
  if (pathname === '/api/rooms') {
    const roomList = Array.from(rooms.values()).map(r => ({
      id: r.id,
      name: r.name,
      playerCount: r.players.size,
      maxPlayers: MAX_PLAYERS_PER_ROOM,
      status: r.status,
      worldLabel: r.world.label
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(roomList));
    return;
  }

  // Static file serving
  if (pathname === '/' || pathname === '/index.html') {
    pathname = '/index.html';
  } else if (pathname === '/play' || pathname === '/play/') {
    pathname = '/play/index.html';
  }

  const filePath = path.join(__dirname, pathname);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for client-side routing
      const fallbackPath = path.join(__dirname, 'index.html');
      fs.readFile(fallbackPath, (fbErr, content) => {
        if (fbErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('File Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

// WebSocket Server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  let playerId = 'p-' + Math.random().toString(36).substring(2, 9);
  let currentRoom = null;

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      switch (msg.type) {
        // List active rooms
        case 'list_rooms': {
          const roomList = Array.from(rooms.values()).map(r => ({
            id: r.id,
            name: r.name,
            playerCount: r.players.size,
            maxPlayers: MAX_PLAYERS_PER_ROOM,
            status: r.status,
            worldLabel: r.world.label
          }));
          ws.send(JSON.stringify({ type: 'rooms_list', rooms: roomList }));
          break;
        }

        // Create a new game room
        case 'create_room': {
          const roomName = (msg.roomName || '').trim();
          const playerName = (msg.playerName || '').trim();

          if (!roomName) {
            ws.send(JSON.stringify({ type: 'error', message: 'Operation name is required to create a game!' }));
            return;
          }
          if (!playerName) {
            ws.send(JSON.stringify({ type: 'error', message: 'Player callsign is required before starting!' }));
            return;
          }

          // Check if room name already exists
          const existingId = roomName.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 32);
          if (rooms.has(existingId)) {
            ws.send(JSON.stringify({ type: 'error', message: `Operation "${roomName}" already exists! Join it or choose another name.` }));
            return;
          }

          const room = new Room(roomName, playerId, playerName);
          rooms.set(room.id, room);
          currentRoom = room;

          const joinResult = room.addPlayer(playerId, ws, playerName, msg.tankClass || 'medium');
          if (!joinResult.success) {
            ws.send(JSON.stringify({ type: 'error', message: joinResult.message }));
            return;
          }

          ws.send(JSON.stringify({
            type: 'room_joined',
            playerId,
            isHost: true,
            room: room.getLobbyState()
          }));
          break;
        }

        // Join an existing game room
        case 'join_room': {
          const roomName = (msg.roomName || '').trim();
          const playerName = (msg.playerName || '').trim();

          if (!roomName) {
            ws.send(JSON.stringify({ type: 'error', message: 'Game name is required to join!' }));
            return;
          }
          if (!playerName) {
            ws.send(JSON.stringify({ type: 'error', message: 'Player callsign is required before entering!' }));
            return;
          }

          const targetId = roomName.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 32);
          let room = rooms.get(targetId);
          if (!room) {
            // Check by exact name match
            for (const r of rooms.values()) {
              if (r.name.toLowerCase() === roomName.toLowerCase()) {
                room = r;
                break;
              }
            }
          }

          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: `Operation "${roomName}" was not found! Check the name or create a new operation.` }));
            return;
          }

          if (room.players.size >= MAX_PLAYERS_PER_ROOM) {
            ws.send(JSON.stringify({ type: 'error', message: 'Room is full (max 2 players)' }));
            return;
          }

          if (room.status !== 'lobby') {
            ws.send(JSON.stringify({ type: 'error', message: 'Battle is already underway in this sector!' }));
            return;
          }

          currentRoom = room;
          const joinResult = room.addPlayer(playerId, ws, playerName, msg.tankClass || 'medium');
          if (!joinResult.success) {
            ws.send(JSON.stringify({ type: 'error', message: joinResult.message }));
            return;
          }

          ws.send(JSON.stringify({
            type: 'room_joined',
            playerId,
            isHost: room.hostId === playerId,
            room: room.getLobbyState()
          }));

          // Notify existing players in room
          room.broadcast({
            type: 'player_joined',
            player: joinResult.player,
            room: room.getLobbyState()
          }, playerId);
          break;
        }

        // Update player class in lobby
        case 'select_class': {
          if (!currentRoom) return;
          const player = currentRoom.players.get(playerId);
          if (player) {
            player.tankClass = msg.tankClass;
            const healthMap = { light: 100, medium: 200, heavy: 400 };
            player.maxHealth = healthMap[msg.tankClass] || 200;
            player.health = player.maxHealth;
            currentRoom.broadcast({
              type: 'player_updated',
              player: { id: playerId, tankClass: player.tankClass, maxHealth: player.maxHealth }
            });
          }
          break;
        }

        // Toggle ready in lobby
        case 'toggle_ready': {
          if (!currentRoom) return;
          const player = currentRoom.players.get(playerId);
          if (player) {
            player.ready = !player.ready;
            currentRoom.broadcast({
              type: 'player_updated',
              player: { id: playerId, ready: player.ready }
            });
          }
          break;
        }

        // Host launches the match
        case 'start_match': {
          if (!currentRoom || currentRoom.hostId !== playerId) return;
          currentRoom.startMatch();
          currentRoom.broadcast({
            type: 'match_started',
            room: currentRoom.getLobbyState()
          });
          break;
        }

        // Real-time tank state update from client
        case 'player_state': {
          if (!currentRoom || currentRoom.status !== 'playing') return;
          const player = currentRoom.players.get(playerId);
          if (!player) return;

          player.x = msg.x;
          player.y = msg.y;
          player.angle = msg.angle;
          player.turretAngle = msg.turretAngle;
          player.health = msg.health;
          player.fuel = msg.fuel;
          player.score = msg.score;
          player.specialActive = msg.specialActive;
          if (msg.hasFlag !== undefined) player.hasFlag = msg.hasFlag;
          if (msg.pows !== undefined) player.pows = msg.pows;

          // Broadcast state to all other players in room
          currentRoom.broadcast({
            type: 'player_sync',
            id: playerId,
            x: player.x,
            y: player.y,
            angle: player.angle,
            turretAngle: player.turretAngle,
            health: player.health,
            maxHealth: player.maxHealth,
            fuel: player.fuel,
            score: player.score,
            specialActive: player.specialActive,
            hasFlag: msg.hasFlag,
            pows: msg.pows
          }, playerId);
          break;
        }

        // Cannon fire event
        case 'fire_shell': {
          if (!currentRoom || currentRoom.status !== 'playing') return;
          currentRoom.broadcast({
            type: 'shell_fired',
            shooterId: playerId,
            x: msg.x,
            y: msg.y,
            vx: msg.vx,
            vy: msg.vy,
            damage: msg.damage,
            splash: msg.splash,
            turretAngle: msg.turretAngle
          }, playerId);
          break;
        }

        // Mine laid event
        case 'lay_mine': {
          if (!currentRoom || currentRoom.status !== 'playing') return;
          currentRoom.broadcast({
            type: 'mine_laid',
            ownerId: playerId,
            x: msg.x,
            y: msg.y
          }, playerId);
          break;
        }

        // Drone strike event
        case 'drone_strike': {
          if (!currentRoom || currentRoom.status !== 'playing') return;
          currentRoom.broadcast({
            type: 'drone_strike_launched',
            callerId: playerId,
            targetX: msg.targetX,
            targetY: msg.targetY
          }, playerId);
          break;
        }

        // Damage & Kill notification
        case 'player_hit': {
          if (!currentRoom || currentRoom.status !== 'playing') return;
          const targetId = msg.victimId || msg.targetId;
          const victim = currentRoom.players.get(targetId);
          const attacker = currentRoom.players.get(msg.shooterId || playerId);

          if (victim) {
            victim.health = Math.max(0, victim.health - msg.damage);

            if (victim.health <= 0) {
              victim.deaths++;
              if (attacker && attacker.id !== victim.id) {
                attacker.kills++;
                attacker.score += 500;
              }

              currentRoom.broadcast({
                type: 'kill_event',
                victimId: victim.id,
                victimName: victim.name,
                killerId: attacker ? attacker.id : null,
                killerName: attacker ? attacker.name : 'Battlefield Hazard'
              });

              // Check if any player reached 5 kills
              if (attacker && attacker.kills >= 5) {
                currentRoom.endMatch('KILL_LIMIT_REACHED');
              }
            } else {
              currentRoom.broadcast({
                type: 'hit_sync',
                victimId: victim.id,
                health: victim.health,
                damage: msg.damage
              });
            }
          }
          break;
        }

        // Flag captured event
        case 'flag_captured': {
          if (!currentRoom || currentRoom.status !== 'playing') return;
          currentRoom.broadcast({
            type: 'flag_captured',
            playerId: msg.playerId || playerId,
            x: msg.x,
            y: msg.y
          }, playerId);
          break;
        }

        // Flag returned event
        case 'flag_returned': {
          if (!currentRoom || currentRoom.status !== 'playing') return;
          currentRoom.broadcast({
            type: 'flag_returned',
            playerId: msg.playerId || playerId,
            flagsCaptured: msg.flagsCaptured,
            score: msg.score
          }, playerId);
          break;
        }

        // Flag dropped event
        case 'flag_dropped': {
          if (!currentRoom || currentRoom.status !== 'playing') return;
          currentRoom.broadcast({
            type: 'flag_dropped',
            playerId: msg.playerId || playerId,
            homeX: msg.homeX,
            homeY: msg.homeY,
            x: msg.x,
            y: msg.y
          }, playerId);
          break;
        }

        // POW rescued event
        case 'pow_rescued': {
          if (!currentRoom || currentRoom.status !== 'playing') return;
          currentRoom.broadcast({
            type: 'pow_rescued',
            playerId: msg.playerId || playerId,
            count: msg.count,
            totalRescued: msg.totalRescued,
            campIndex: msg.campIndex,
            score: msg.score
          }, playerId);
          break;
        }

        // Leave room
        case 'leave_room': {
          if (currentRoom) {
            const leavingName = currentRoom.players.get(playerId)?.name || 'Player';
            currentRoom.removePlayer(playerId);
            currentRoom.broadcast({
              type: 'player_left',
              playerId,
              playerName: leavingName,
              room: currentRoom.getLobbyState()
            });
            currentRoom = null;
          }
          break;
        }
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoom) {
      const leavingName = currentRoom.players.get(playerId)?.name || 'Player';
      currentRoom.removePlayer(playerId);
      currentRoom.broadcast({
        type: 'player_left',
        playerId,
        playerName: leavingName,
        room: currentRoom.players.size > 0 ? currentRoom.getLobbyState() : null
      });
    }
  });
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateProceduralTerrain,
    getDynamicWorldSize,
    generateBases
  };
}

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Campaign 88 Multiplayer Server online on port ${PORT}`);
    console.log(`Battlefield scaling enabled: up to ${MAX_PLAYERS_PER_ROOM} players`);
  });
}

