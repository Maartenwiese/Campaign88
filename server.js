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
  let s = seed;
  function rnd() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  }

  // Randomized river X between 44% and 56% of world width
  const riverX = Math.floor(worldW * (0.45 + rnd() * 0.10));
  const riverWidth = 160;

  // Sturdy bridges spanning across river with wide overhang to prevent any water collision
  const bW = riverWidth + 50;
  const bX = riverX - 25;
  const bridge1Y = Math.floor(worldH * (0.18 + rnd() * 0.08));
  const bridge2Y = Math.floor(worldH * 0.50);
  const bridge3Y = Math.floor(worldH * (0.74 + rnd() * 0.08));

  const bridges = [
    { x: bX, y: bridge1Y, w: bW, h: 110, name: 'North Bridge', type: 'wood' },
    { x: bX, y: bridge2Y, w: bW, h: 120, name: 'Central Highway Bridge', type: 'concrete' },
    { x: bX, y: bridge3Y, w: bW, h: 110, name: 'South Pontoon Bridge', type: 'pontoon' }
  ];

  const waterBodies = [
    { x: riverX, y: 0, w: riverWidth, h: worldH, type: 'river' }
  ];

  const roads = [
    { x: 180, y: bridge2Y + 5, w: worldW - 360, h: 110 },
    { x: 300, y: bridge1Y + 10, w: worldW - 600, h: 90 },
    { x: 300, y: bridge3Y + 10, w: worldW - 600, h: 90 },
    { x: 850, y: bridge1Y + 10, w: 90, h: bridge3Y - bridge1Y },
    { x: worldW - 940, y: bridge1Y + 10, w: 90, h: bridge3Y - bridge1Y }
  ];

  function overlapsRoad(rx, ry, rw, rh, margin = 20) {
    for (const r of roads) {
      if (rx < r.x + r.w + margin && rx + rw + margin > r.x &&
          ry < r.y + r.h + margin && ry + rh + margin > r.y) {
        return true;
      }
    }
    return false;
  }

  const mountains = [];
  const mPassOffsets = [
    { x: riverX - 380, y: Math.floor(worldH * 0.35) },
    { x: riverX + 380, y: Math.floor(worldH * 0.35) },
    { x: riverX - 380, y: Math.floor(worldH * 0.65) },
    { x: riverX + 380, y: Math.floor(worldH * 0.65) }
  ];
  for (const m of mPassOffsets) {
    mountains.push({
      x: m.x + (rnd() - 0.5) * 40,
      y: m.y + (rnd() - 0.5) * 40,
      r: 95 + Math.floor(rnd() * 25),
      peakX: -10, peakY: -15
    });
  }

  const houses = [];
  for (let i = 0; i < 16; i++) {
    const hx = 350 + rnd() * (worldW - 700);
    const hy = 250 + rnd() * (worldH - 500);
    if (Math.abs(hx - riverX) > 190 && !overlapsRoad(hx, hy, 120, 90, 20)) {
      houses.push({
        x: Math.floor(hx), y: Math.floor(hy), w: 120, h: 90, hp: 220, maxHp: 220,
        type: rnd() > 0.5 ? 'cottage' : 'bunker',
        roofColor: rnd() > 0.5 ? '#c25e36' : '#16a34a'
      });
    }
  }

  const foliage = [];
  for (let i = 0; i < 35; i++) {
    const tx = 300 + rnd() * (worldW - 600);
    const ty = 200 + rnd() * (worldH - 400);
    const tr = 50 + Math.floor(rnd() * 20);
    if (Math.abs(tx - riverX) > 160 && !overlapsRoad(tx - tr, ty - tr, tr * 2, tr * 2, 15)) {
      foliage.push({
        x: Math.floor(tx), y: Math.floor(ty), r: tr,
        type: rnd() > 0.3 ? 'oak' : 'pine'
      });
    }
  }

  const powCamps = [
    { x: 750 + Math.floor(rnd() * 300), y: 400 + Math.floor(rnd() * 250), w: 100, hp: 180, maxHp: 180 },
    { x: worldW - 1050 + Math.floor(rnd() * 300), y: worldH - 650 + Math.floor(rnd() * 250), w: 100, hp: 180, maxHp: 180 }
  ];

  return {
    seed,
    riverX,
    riverWidth,
    bridges,
    waterBodies,
    roads,
    mountains,
    houses,
    foliage,
    powCamps
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
            ws.send(JSON.stringify({ type: 'error', message: 'Combat room is full! Maximum 5 players already engaged.' }));
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
            specialActive: player.specialActive
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Campaign 88 Multiplayer Server online on port ${PORT}`);
  console.log(`Battlefield scaling enabled: up to ${MAX_PLAYERS_PER_ROOM} players`);
});
