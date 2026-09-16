const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');
const assert = require('assert');

const {
  validateFleet,
  generateRandomFleet,
  processShot,
  BattleshipBot
} = require('../src/gameLogic');

// Запуск тестового инстанса сервера
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const rooms = new Map();

function generateRoomCode() {
  return 'TEST-' + Math.floor(100 + Math.random() * 900);
}

io.on('connection', (socket) => {
  socket.on('get_random_fleet', (cb) => {
    cb({ success: true, fleet: generateRandomFleet() });
  });

  socket.on('create_room', ({ playerName }, cb) => {
    const roomId = generateRoomCode();
    const player = { socketId: socket.id, playerId: 1, name: playerName, fleet: null, ready: false, shots: [], stats: { shots: 0, hits: 0 } };
    rooms.set(roomId, { id: roomId, isBot: false, players: [player], currentTurn: 1, phase: 'placement' });
    socket.join(roomId);
    socket.roomId = roomId;
    socket.playerId = 1;
    cb({ success: true, roomId, playerId: 1 });
  });

  socket.on('join_room', ({ roomId, playerName }, cb) => {
    const room = rooms.get(roomId);
    if (!room || room.players.length >= 2) return cb({ success: false, error: 'Cannot join' });
    const player = { socketId: socket.id, playerId: 2, name: playerName, fleet: null, ready: false, shots: [], stats: { shots: 0, hits: 0 } };
    room.players.push(player);
    socket.join(roomId);
    socket.roomId = roomId;
    socket.playerId = 2;
    cb({ success: true, roomId, playerId: 2 });
    socket.to(roomId).emit('opponent_joined', { opponentName: playerName });
  });

  socket.on('confirm_fleet', ({ roomId, fleet }, cb) => {
    const room = rooms.get(roomId);
    const player = room.players.find(p => p.socketId === socket.id);
    const val = validateFleet(fleet);
    if (!val.valid) return cb({ success: false, error: val.error });
    player.fleet = fleet;
    player.ready = true;
    cb({ success: true });
    io.to(roomId).emit('player_ready_status', { playerId: player.playerId, name: player.name });

    if (room.players.length === 2 && room.players.every(p => p.ready)) {
      room.phase = 'battle';
      room.currentTurn = 1;
      io.to(roomId).emit('battle_start', {
        currentTurn: 1,
        player1: { name: room.players[0].name },
        player2: { name: room.players[1].name }
      });
    }
  });

  socket.on('fire_shot', ({ roomId, x, y }, cb) => {
    const room = rooms.get(roomId);
    const shooter = room.players.find(p => p.socketId === socket.id);
    const target = room.players.find(p => p.playerId !== shooter.playerId);
    const shotRes = processShot(target.fleet, target.shots, x, y);
    cb({ success: true, result: shotRes.result });

    const nextTurn = shotRes.result === 'miss' ? target.playerId : shooter.playerId;
    room.currentTurn = nextTurn;
    io.to(roomId).emit('shot_result', {
      shooterId: shooter.playerId,
      x, y,
      result: shotRes.result,
      ship: shotRes.ship || null,
      halo: shotRes.halo || null,
      nextTurn
    });
  });

  socket.on('send_reaction', ({ roomId, reaction }) => {
    const room = rooms.get(roomId);
    const player = room.players.find(p => p.socketId === socket.id);
    io.to(roomId).emit('reaction_received', { playerId: player.playerId, reaction });
  });
});

const TEST_PORT = 3189;

server.listen(TEST_PORT, async () => {
  console.log(`[Test] Server listening on ${TEST_PORT}`);

  try {
    const serverUrl = `http://localhost:${TEST_PORT}`;

    // 1. Клиент 1 создает комнату
    const client1 = ioClient(serverUrl);
    await new Promise(r => client1.on('connect', r));

    let createdRoomId = null;
    await new Promise((resolve) => {
      client1.emit('create_room', { playerName: 'Адмирал 1' }, (res) => {
        assert(res.success);
        createdRoomId = res.roomId;
        assert.strictEqual(res.playerId, 1);
        resolve();
      });
    });
    console.log(`✓ Room created: ${createdRoomId}`);

    // 2. Клиент 2 подключается к комнате
    const client2 = ioClient(serverUrl);
    await new Promise(r => client2.on('connect', r));

    const opponentJoinedPromise = new Promise(r => client1.once('opponent_joined', r));

    await new Promise((resolve) => {
      client2.emit('join_room', { roomId: createdRoomId, playerName: 'Адмирал 2' }, (res) => {
        assert(res.success);
        assert.strictEqual(res.playerId, 2);
        resolve();
      });
    });

    const oppJoinedData = await opponentJoinedPromise;
    assert.strictEqual(oppJoinedData.opponentName, 'Адмирал 2');
    console.log('✓ Player 2 connected, Player 1 notified');

    // 3. Получение и подтверждение расстановки обоих игроков
    const fleet1 = await new Promise(r => client1.emit('get_random_fleet', res => r(res.fleet)));
    const fleet2 = await new Promise(r => client2.emit('get_random_fleet', res => r(res.fleet)));

    const battleStartP1 = new Promise(r => client1.once('battle_start', r));
    const battleStartP2 = new Promise(r => client2.once('battle_start', r));

    await new Promise(r => client1.emit('confirm_fleet', { roomId: createdRoomId, fleet: fleet1 }, r));
    await new Promise(r => client2.emit('confirm_fleet', { roomId: createdRoomId, fleet: fleet2 }, r));

    const [bs1, bs2] = await Promise.all([battleStartP1, battleStartP2]);
    assert.strictEqual(bs1.currentTurn, 1);
    assert.strictEqual(bs2.currentTurn, 1);
    console.log('✓ Both fleets confirmed, battle started');

    // 4. Клиент 1 производит выстрел
    const shotPromiseP1 = new Promise(r => client1.once('shot_result', r));
    const shotPromiseP2 = new Promise(r => client2.once('shot_result', r));

    client1.emit('fire_shot', { roomId: createdRoomId, x: 5, y: 5 }, (res) => {
      assert(res.success);
    });

    const [shotRes1, shotRes2] = await Promise.all([shotPromiseP1, shotPromiseP2]);
    assert.strictEqual(shotRes1.shooterId, 1);
    assert.strictEqual(shotRes2.shooterId, 1);
    assert.strictEqual(shotRes1.x, 5);
    assert.strictEqual(shotRes1.y, 5);
    console.log(`✓ Shot processed: ${shotRes1.result}`);

    // 5. Эмодзи реакция
    const reactionPromise = new Promise(r => client2.once('reaction_received', r));
    client1.emit('send_reaction', { roomId: createdRoomId, reaction: '🎯' });
    const reactData = await reactionPromise;
    assert.strictEqual(reactData.reaction, '🎯');
    console.log('✓ Reaction broadcasted successfully');

    client1.disconnect();
    client2.disconnect();
    server.close();

    console.log('\n🎉 ALL MULTIPLAYER INTEGRATION TESTS PASSED PERFECTLY! 🎉\n');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
});