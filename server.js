const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const {
  BOARD_SIZE,
  FLEET_SPEC,
  validateFleet,
  generateRandomFleet,
  processShot,
  BattleshipBot
} = require('./src/gameLogic');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Хранилище активных комнат
const rooms = new Map();

function generateRoomCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let prefix = '';
  for (let i = 0; i < 4; i++) {
    prefix += letters[Math.floor(Math.random() * letters.length)];
  }
  const num = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${num}`;
}

io.on('connection', (socket) => {
  console.log(`[Socket] Подключение: ${socket.id}`);

  // Получить случайный валидный флот
  socket.on('get_random_fleet', (callback) => {
    try {
      const fleet = generateRandomFleet();
      callback({ success: true, fleet });
    } catch (err) {
      callback({ success: false, error: err.message });
    }
  });

  // Создать комнату
  socket.on('create_room', ({ playerName }, callback) => {
    const roomId = generateRoomCode();
    const player = {
      socketId: socket.id,
      playerId: 1,
      name: playerName || 'Капитан 1',
      fleet: null,
      ready: false,
      shots: [],
      stats: { shots: 0, hits: 0 }
    };

    const room = {
      id: roomId,
      isBot: false,
      players: [player],
      currentTurn: 1,
      phase: 'placement',
      rematchVotes: new Set()
    };

    rooms.set(roomId, room);
    socket.join(roomId);
    socket.roomId = roomId;
    socket.playerId = 1;

    console.log(`[Room] Создана комната ${roomId}`);
    if (callback) {
      callback({
        success: true,
        roomId,
        playerId: 1,
        playerName: player.name
      });
    }
  });

  // Создать игру с ботом
  socket.on('create_bot_game', ({ playerName }, callback) => {
    const roomId = 'BOT-' + Math.floor(1000 + Math.random() * 9000);
    const player = {
      socketId: socket.id,
      playerId: 1,
      name: playerName || 'Капитан',
      fleet: null,
      ready: false,
      shots: [],
      stats: { shots: 0, hits: 0 }
    };

    const botInstance = new BattleshipBot();
    const botPlayer = {
      socketId: 'BOT_ID',
      playerId: 2,
      name: 'Бот «Гроссмейстер» 🤖',
      fleet: botInstance.fleet,
      ready: true,
      shots: [],
      stats: { shots: 0, hits: 0 }
    };

    const room = {
      id: roomId,
      isBot: true,
      botInstance,
      players: [player, botPlayer],
      currentTurn: 1,
      phase: 'placement',
      rematchVotes: new Set()
    };

    rooms.set(roomId, room);
    socket.join(roomId);
    socket.roomId = roomId;
    socket.playerId = 1;

    if (callback) {
      callback({
        success: true,
        roomId,
        playerId: 1,
        opponentName: botPlayer.name
      });
    }
  });

  // Присоединиться к комнате
  socket.on('join_room', ({ roomId, playerName }, callback) => {
    const formattedId = (roomId || '').trim().toUpperCase();
    const room = rooms.get(formattedId);

    if (!room) {
      return callback({ success: false, error: 'Комната с таким кодом не найдена.' });
    }

    if (room.isBot) {
      return callback({ success: false, error: 'Это одиночная игра с ботом.' });
    }

    if (room.players.length >= 2) {
      return callback({ success: false, error: 'В комнате уже двое игроков.' });
    }

    const player = {
      socketId: socket.id,
      playerId: 2,
      name: playerName || 'Капитан 2',
      fleet: null,
      ready: false,
      shots: [],
      stats: { shots: 0, hits: 0 }
    };

    room.players.push(player);
    socket.join(formattedId);
    socket.roomId = formattedId;
    socket.playerId = 2;

    callback({
      success: true,
      roomId: formattedId,
      playerId: 2,
      opponentName: room.players[0].name
    });

    socket.to(formattedId).emit('opponent_joined', {
      opponentName: player.name
    });
  });

  // Подтверждение флота
  socket.on('confirm_fleet', ({ roomId, fleet }, callback) => {
    const room = rooms.get(roomId);
    if (!room) return callback && callback({ success: false, error: 'Комната не найдена.' });

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return callback && callback({ success: false, error: 'Игрок не найден.' });

    const valRes = validateFleet(fleet);
    if (!valRes.valid) {
      return callback && callback({ success: false, error: valRes.error });
    }

    player.fleet = fleet.map(s => ({
      ...s,
      hits: []
    }));
    player.ready = true;

    if (callback) callback({ success: true });

    io.to(roomId).emit('player_ready_status', {
      playerId: player.playerId,
      name: player.name
    });

    const allReady = room.players.length === 2 && room.players.every(p => p.ready);
    if (allReady) {
      room.phase = 'battle';
      room.currentTurn = 1;

      io.to(roomId).emit('battle_start', {
        currentTurn: room.currentTurn,
        player1: { name: room.players[0].name },
        player2: { name: room.players[1].name }
      });
    }
  });

  // Выстрел игрока
  socket.on('fire_shot', ({ roomId, x, y }, callback) => {
    const room = rooms.get(roomId);
    if (!room || room.phase !== 'battle') {
      return callback && callback({ success: false, error: 'Бой не активен.' });
    }

    const shooter = room.players.find(p => p.socketId === socket.id);
    if (!shooter) return callback && callback({ success: false, error: 'Игрок не найден.' });

    if (shooter.playerId !== room.currentTurn) {
      return callback && callback({ success: false, error: 'Сейчас не ваш ход.' });
    }

    const target = room.players.find(p => p.playerId !== shooter.playerId);
    if (!target) return callback && callback({ success: false, error: 'Цель не найдена.' });

    const shotRes = processShot(target.fleet, target.shots, x, y);
    if (!shotRes.valid) {
      return callback && callback({ success: false, error: shotRes.error });
    }

    shooter.stats.shots++;
    if (shotRes.result !== 'miss') {
      shooter.stats.hits++;
    }

    if (callback) callback({ success: true, result: shotRes.result });

    if (shotRes.allSunk) {
      room.phase = 'finished';
      io.to(roomId).emit('game_over', {
        winnerId: shooter.playerId,
        winnerName: shooter.name,
        loserFleet: target.fleet,
        stats: {
          winner: shooter.stats,
          loser: target.stats
        },
        finalShot: {
          x, y,
          shooterId: shooter.playerId,
          result: shotRes.result,
          ship: shotRes.ship,
          halo: shotRes.halo
        }
      });
      return;
    }

    const nextTurn = shotRes.result === 'miss' ? target.playerId : shooter.playerId;
    room.currentTurn = nextTurn;

    io.to(roomId).emit('shot_result', {
      shooterId: shooter.playerId,
      x, y,
      result: shotRes.result,
      ship: shotRes.ship || null,
      halo: shotRes.halo || null,
      newHaloShots: shotRes.newHaloShots || [],
      nextTurn: room.currentTurn
    });

    // Размеренный ход бота
    if (room.isBot && room.currentTurn === 2 && room.phase === 'battle') {
      scheduleBotTurn(room);
    }
  });

  // Эмодзи записки
  socket.on('send_reaction', ({ roomId, reaction }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;

    io.to(roomId).emit('reaction_received', {
      playerId: player.playerId,
      playerName: player.name,
      reaction
    });
  });

  // Реванш
  socket.on('request_rematch', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;

    room.rematchVotes.add(player.playerId);

    if (room.isBot) {
      restartRoom(room);
    } else {
      io.to(roomId).emit('rematch_voted', {
        playerId: player.playerId,
        playerName: player.name
      });
      if (room.rematchVotes.size === 2) {
        restartRoom(room);
      }
    }
  });

  // Отключение
  socket.on('disconnect', () => {
    const roomId = socket.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const leaving = room.players.find(p => p.socketId === socket.id);
    if (leaving) {
      socket.to(roomId).emit('player_left', {
        playerId: leaving.playerId,
        playerName: leaving.name
      });
    }

    room.players = room.players.filter(p => p.socketId !== socket.id);
    if (room.players.length === 0 || (room.isBot && room.players.length <= 1)) {
      rooms.delete(roomId);
    }
  });
});

function restartRoom(room) {
  room.rematchVotes.clear();
  room.phase = 'placement';
  room.currentTurn = 1;

  for (const player of room.players) {
    player.fleet = null;
    player.ready = false;
    player.shots = [];
    player.stats = { shots: 0, hits: 0 };
  }

  if (room.isBot) {
    room.botInstance = new BattleshipBot();
    room.players[1].fleet = room.botInstance.fleet;
    room.players[1].ready = true;
  }

  io.to(room.id).emit('game_restarted');
}

/**
 * Размеренный ход бота с паузой на раздумья (1.5 - 2.2 секунды)
 */
function scheduleBotTurn(room) {
  if (room.phase !== 'battle' || room.currentTurn !== 2) return;

  const bot = room.botInstance;
  const botPlayer = room.players[1];
  const humanPlayer = room.players[0];

  // Уверенная пауза на раздумья бота
  const delay = 1400 + Math.floor(Math.random() * 800);

  setTimeout(() => {
    if (room.phase !== 'battle' || room.currentTurn !== 2) return;

    const shotCoord = bot.chooseNextShot();
    if (!shotCoord) return;

    const shotRes = processShot(humanPlayer.fleet, humanPlayer.shots, shotCoord.x, shotCoord.y);
    bot.handleShotResult(shotRes);

    botPlayer.stats.shots++;
    if (shotRes.result !== 'miss') {
      botPlayer.stats.hits++;
    }

    if (shotRes.allSunk) {
      room.phase = 'finished';
      io.to(room.id).emit('game_over', {
        winnerId: 2,
        winnerName: botPlayer.name,
        loserFleet: humanPlayer.fleet,
        stats: {
          winner: botPlayer.stats,
          loser: humanPlayer.stats
        },
        finalShot: {
          x: shotCoord.x,
          y: shotCoord.y,
          shooterId: 2,
          result: shotRes.result,
          ship: shotRes.ship,
          halo: shotRes.halo
        }
      });
      return;
    }

    const nextTurn = shotRes.result === 'miss' ? 1 : 2;
    room.currentTurn = nextTurn;

    io.to(room.id).emit('shot_result', {
      shooterId: 2,
      x: shotCoord.x,
      y: shotCoord.y,
      result: shotRes.result,
      ship: shotRes.ship || null,
      halo: shotRes.halo || null,
      newHaloShots: shotRes.newHaloShots || [],
      nextTurn: room.currentTurn
    });

    if (shotRes.result !== 'miss' && room.currentTurn === 2) {
      scheduleBotTurn(room);
    }
  }, delay);
}

server.listen(PORT, () => {
  console.log(`⚓ Морской Бой запущен на http://localhost:${PORT}`);
});