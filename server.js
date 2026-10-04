const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = parseInt(process.env.PORT || '8080', 10);
const MAX_PLAYERS_PER_ROOM = 5;

// Tank player colors for up to 5 players
const PLAYER_COLORS = [
  { name: 'Crimson Fury', hex: '#ef4444', accent: '#991b1b', team: 1 },
  { name: 'Cobalt Shield', hex: '#3b82f6', accent: '#1d4ed8', team: 2 },
  { name: 'Emerald Vanguard', hex: '#10b981', accent: '#047857', team: 3 },
  { name: 'Amber Legion', hex: '#f59e0b', accent: '#b45309', team: 4 },
  { name: 'Amethyst Strike', hex: '#a855f7', accent: '#7e22ce', team: 5 }
];

// Calculate dynamic battlefield size based on player count
function getDynamicWorldSize(playerCount) {
  const count = Math.max(1, Math.min(MAX_PLAYERS_PER_ROOM, playerCount || 1));
  switch (count) {
    case 1:
    case 2:
      return { width: 3000, height: 3000, label: 'Sector Alpha (3000x3000)' };
    case 3:
      return { width: 3800, height: 3400, label: 'Sector Bravo (3800x3400)' };
    case 4:
      return { width: 4400, height: 3800, label: 'Sector Charlie (4400x3800)' };
    case 5:
    default:
      return { width: 5000, height: 4200, label: 'Grand Theater Delta (5000x4200)' };
  }
}

// Generate base garrisons for up to 5 players dynamically positioned around the perimeter
function generateBases(worldW, worldH) {
  return [
    { id: 0, x: 340, y: Math.floor(worldH * 0.5), r: 180, name: 'Red Garrison (West)', color: '#ef4444' },
    { id: 1, x: worldW - 340, y: Math.floor(worldH * 0.5), r: 180, name: 'Blue Garrison (East)', color: '#3b82f6' },
    { id: 2, x: Math.floor(worldW * 0.5), y: 340, r: 180, name: 'Green Garrison (North)', color: '#10b981' },
    { id: 3, x: Math.floor(worldW * 0.5), y: worldH - 340, r: 180, name: 'Amber Garrison (South)', color: '#f59e0b' },
    { id: 4, x: Math.floor(worldW * 0.28), y: Math.floor(worldH * 0.28), r: 180, name: 'Purple Garrison (NW Outpost)', color: '#a855f7' }
  ];
}

// Generate scaled river and bridge crossings
function generateRiverAndBridges(worldW, worldH) {
  const riverX = Math.floor(worldW * 0.5);
  const riverWidth = 140;
  
  // Bridges spaced across the river
  const bridges = [
    { x: riverX - 10, y: Math.floor(worldH * 0.22), w: riverWidth + 20, h: 100, name: 'North Bridge' },
    { x: riverX - 10, y: Math.floor(worldH * 0.50), w: riverWidth + 20, h: 120, name: 'Central Highway Bridge' },
    { x: riverX - 10, y: Math.floor(worldH * 0.78), w: riverWidth + 20, h: 100, name: 'South Pontoon Bridge' }
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
    this.riverData = generateRiverAndBridges(this.world.width, this.world.height);
  }

  updateWorldScaling() {
    this.world = getDynamicWorldSize(this.players.size);
    this.bases = generateBases(this.world.width, this.world.height);
    this.riverData = generateRiverAndBridges(this.world.width, this.world.height);
    
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
      idx++;
    }
  }

  addPlayer(id, ws, playerName, tankClass = 'medium') {
    if (this.players.size >= MAX_PLAYERS_PER_ROOM) {
      return { success: false, error: 'ROOM_FULL', message: 'Game session is full! Maximum 5 players allowed.' };
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

    // Assign full health and positions
    for (const player of this.players.values()) {
      player.health = player.maxHealth;
      player.fuel = 100;
      player.pows = 0;
      player.mines = 5;
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

        // Damage & Kill notification
        case 'player_hit': {
          if (!currentRoom || currentRoom.status !== 'playing') return;
          const victim = currentRoom.players.get(msg.victimId);
          const attacker = currentRoom.players.get(playerId);

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
