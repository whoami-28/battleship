const LETTERS = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'И', 'К'];
const BOARD_SIZE = 10;

const FLEET_TEMPLATE = [
  { id: 'battleship-1', name: 'Линкор', size: 4 },
  { id: 'cruiser-1', name: 'Крейсер', size: 3 },
  { id: 'cruiser-2', name: 'Крейсер', size: 3 },
  { id: 'destroyer-1', name: 'Эсминец', size: 2 },
  { id: 'destroyer-2', name: 'Эсминец', size: 2 },
  { id: 'destroyer-3', name: 'Эсминец', size: 2 },
  { id: 'boat-1', name: 'Катер', size: 1 },
  { id: 'boat-2', name: 'Катер', size: 1 },
  { id: 'boat-3', name: 'Катер', size: 1 },
  { id: 'boat-4', name: 'Катер', size: 1 },
];

const state = {
  socket: null,
  roomId: null,
  playerId: null,
  playerName: 'Адмирал',
  opponentName: 'Соперник',
  isBot: false,
  placementFleet: [],
  selectedShipId: null,
  orientation: 'H',
  isReady: false,
  currentTurn: null,
  myShipsAlive: 10,
  opponentShipsAlive: 10,
  myShotsFired: 0,
  myHits: 0,
  isAnimatingShot: false,
  manualScale: null
};

function createShipSvg(size, orientation = 'H', isSunk = false) {
  const cellSize = 34;
  const lengthPx = size * cellSize;
  const widthPx = cellSize;
  const w = orientation === 'H' ? lengthPx : widthPx;
  const h = orientation === 'H' ? widthPx : lengthPx;
  const transform = orientation === 'V' ? `transform="translate(${w}, 0) rotate(90)"` : '';

  let innerSvg = '';

  if (!isSunk) {
    // ЖИВОЙ КОРАБЛЬ (синяя ручка и легкая заливка)
    if (size === 4) {
      innerSvg = `
        <path d="M 6,17 Q 16,5 35,6 L 118,7 Q 132,10 134,17 Q 132,24 118,27 L 35,28 Q 16,29 6,17 Z" fill="#e2effc" stroke="#123985" stroke-width="2" stroke-linejoin="round"/>
        <path d="M 12,17 L 128,17" stroke="#3263ab" stroke-width="1" stroke-dasharray="3,2"/>
        <circle cx="16" cy="17" r="2.5" fill="none" stroke="#123985" stroke-width="1.2"/>
        <rect x="24" y="12" width="10" height="10" rx="3" fill="#ffffff" stroke="#123985" stroke-width="1.5"/>
        <path d="M 24,15 L 14,14 M 24,18 L 14,18" stroke="#123985" stroke-width="1.5" stroke-linecap="round"/>
        <rect x="38" y="11" width="11" height="12" rx="3" fill="#ffffff" stroke="#123985" stroke-width="1.5"/>
        <path d="M 38,15 L 26,14 M 38,19 L 26,18" stroke="#123985" stroke-width="1.5" stroke-linecap="round"/>
        <rect x="54" y="10" width="22" height="14" rx="2" fill="#d0e5fb" stroke="#123985" stroke-width="1.5"/>
        <line x1="65" y1="10" x2="65" y2="3" stroke="#123985" stroke-width="1.5"/>
        <line x1="61" y1="5" x2="69" y2="5" stroke="#123985" stroke-width="1.5"/>
        <rect x="80" y="12" width="6" height="10" fill="#123985"/>
        <rect x="90" y="12" width="6" height="10" fill="#123985"/>
        <path d="M 83,10 Q 82,6 87,4 Q 92,2 96,4" fill="none" stroke="#668ec4" stroke-width="1.2" stroke-linecap="round"/>
        <rect x="100" y="11" width="11" height="12" rx="3" fill="#ffffff" stroke="#123985" stroke-width="1.5"/>
        <path d="M 111,15 L 123,15 M 111,19 L 123,19" stroke="#123985" stroke-width="1.5" stroke-linecap="round"/>
        <rect x="114" y="12" width="10" height="10" rx="3" fill="#ffffff" stroke="#123985" stroke-width="1.5"/>
        <path d="M 124,16 L 132,16" stroke="#123985" stroke-width="1.5" stroke-linecap="round"/>
      `;
    } else if (size === 3) {
      innerSvg = `
        <path d="M 6,17 Q 16,7 32,7 L 86,8 Q 99,11 100,17 Q 99,23 86,26 L 32,27 Q 16,27 6,17 Z" fill="#e2effc" stroke="#123985" stroke-width="2" stroke-linejoin="round"/>
        <path d="M 12,17 L 94,17" stroke="#3263ab" stroke-width="1" stroke-dasharray="2,2"/>
        <rect x="22" y="12" width="10" height="10" rx="3" fill="#ffffff" stroke="#123985" stroke-width="1.5"/>
        <line x1="22" y1="16" x2="11" y2="15" stroke="#123985" stroke-width="1.6" stroke-linecap="round"/>
        <line x1="22" y1="19" x2="11" y2="19" stroke="#123985" stroke-width="1.6" stroke-linecap="round"/>
        <rect x="40" y="10" width="18" height="14" rx="2" fill="#d0e5fb" stroke="#123985" stroke-width="1.5"/>
        <line x1="49" y1="10" x2="49" y2="4" stroke="#123985" stroke-width="1.5"/>
        <circle cx="49" cy="4" r="2" fill="#123985"/>
        <rect x="63" y="12" width="7" height="10" fill="#123985" rx="1"/>
        <path d="M 67,11 Q 69,7 74,5" fill="none" stroke="#668ec4" stroke-width="1.2"/>
        <rect x="76" y="12" width="10" height="10" rx="3" fill="#ffffff" stroke="#123985" stroke-width="1.5"/>
        <line x1="86" y1="16" x2="96" y2="16" stroke="#123985" stroke-width="1.6" stroke-linecap="round"/>
        <line x1="86" y1="19" x2="96" y2="19" stroke="#123985" stroke-width="1.6" stroke-linecap="round"/>
      `;
    } else if (size === 2) {
      innerSvg = `
        <path d="M 6,17 Q 15,8 26,8 L 56,9 Q 65,12 66,17 Q 65,22 56,25 L 26,26 Q 15,26 6,17 Z" fill="#e2effc" stroke="#123985" stroke-width="2" stroke-linejoin="round"/>
        <rect x="18" y="12" width="9" height="10" rx="2" fill="#ffffff" stroke="#123985" stroke-width="1.5"/>
        <line x1="18" y1="17" x2="9" y2="17" stroke="#123985" stroke-width="1.5" stroke-linecap="round"/>
        <rect x="31" y="11" width="12" height="12" rx="2" fill="#d0e5fb" stroke="#123985" stroke-width="1.5"/>
        <line x1="37" y1="11" x2="37" y2="5" stroke="#123985" stroke-width="1.5"/>
        <rect x="47" y="13" width="11" height="8" rx="2" fill="#123985"/>
        <circle cx="59" cy="17" r="2.5" fill="#e2effc" stroke="#123985" stroke-width="1.2"/>
      `;
    } else {
      innerSvg = `
        <path d="M 4,17 Q 11,8 19,8 L 28,10 Q 31,13 31,17 Q 31,21 28,24 L 19,26 Q 11,26 4,17 Z" fill="#e2effc" stroke="#123985" stroke-width="2" stroke-linejoin="round"/>
        <rect x="13" y="12" width="9" height="10" rx="2" fill="#d0e5fb" stroke="#123985" stroke-width="1.5"/>
        <line x1="13" y1="17" x2="7" y2="17" stroke="#123985" stroke-width="1.6" stroke-linecap="round"/>
        <line x1="26" y1="12" x2="26" y2="7" stroke="#123985" stroke-width="1.2"/>
        <polygon points="26,7 21,9 26,11" fill="#c92a2a"/>
      `;
    }
  } else {
    // ПОТОПЛЕННЫЙ / УНИЧТОЖЕННЫЙ КОРАБЛЬ
    // Обгоревший остов, разорванный корпус, клубы дыма, пламя и карандашная штриховка
    if (size === 4) {
      innerSvg = `
        <!-- Разорванный обгоревший корпус -->
        <path d="M 6,17 Q 16,5 35,6 L 62,8 L 65,4 L 72,9 L 118,7 Q 132,10 134,17 Q 132,24 118,27 L 85,26 L 80,31 L 74,26 L 35,28 Q 16,29 6,17 Z" 
              fill="#2a2022" stroke="#d92525" stroke-width="2" stroke-linejoin="round"/>
        <!-- Карандашная штриховка гари -->
        <g stroke="#802020" stroke-width="1.2">
          <line x1="15" y1="10" x2="35" y2="24"/>
          <line x1="25" y1="10" x2="45" y2="24"/>
          <line x1="50" y1="9" x2="70" y2="25"/>
          <line x1="85" y1="10" x2="105" y2="24"/>
          <line x1="100" y1="11" x2="120" y2="23"/>
        </g>
        <!-- Разлом корпуса посередине -->
        <path d="M 66,5 L 70,16 L 64,28" stroke="#ff3838" stroke-width="2.5" fill="none"/>
        <!-- Поваленная горящая мачта -->
        <line x1="50" y1="14" x2="75" y2="3" stroke="#d92525" stroke-width="2"/>
        <!-- Клубы черного дыма и огня -->
        <circle cx="38" cy="7" r="5" fill="#402024" opacity="0.85"/>
        <circle cx="45" cy="4" r="6" fill="#1f181a" opacity="0.9"/>
        <circle cx="70" cy="5" r="7" fill="#ff4d00" opacity="0.75"/>
        <circle cx="76" cy="2" r="5" fill="#1f181a" opacity="0.9"/>
        <circle cx="102" cy="6" r="6" fill="#301c20" opacity="0.85"/>
        <!-- Языки пламени -->
        <polygon points="68,10 72,3 75,9" fill="#ffcc00"/>
        <polygon points="40,11 44,5 47,10" fill="#ff5500"/>
        <!-- Красные кресты потопления -->
        <g stroke="#d92525" stroke-width="2.5" stroke-linecap="round">
          <line x1="12" y1="9" x2="30" y2="25"/><line x1="30" y1="9" x2="12" y2="25"/>
          <line x1="45" y1="9" x2="63" y2="25"/><line x1="63" y1="9" x2="45" y2="25"/>
          <line x1="75" y1="9" x2="93" y2="25"/><line x1="93" y1="9" x2="75" y2="25"/>
          <line x1="105" y1="9" x2="123" y2="25"/><line x1="123" y1="9" x2="105" y2="25"/>
        </g>
      `;
    } else if (size === 3) {
      innerSvg = `
        <path d="M 6,17 Q 16,7 32,7 L 50,8 L 54,4 L 59,9 L 86,8 Q 99,11 100,17 Q 99,23 86,26 L 68,26 L 63,30 L 58,26 L 32,27 Q 16,27 6,17 Z" 
              fill="#2a2022" stroke="#d92525" stroke-width="2" stroke-linejoin="round"/>
        <g stroke="#802020" stroke-width="1.2">
          <line x1="15" y1="10" x2="35" y2="24"/>
          <line x1="35" y1="10" x2="55" y2="24"/>
          <line x1="65" y1="10" x2="85" y2="24"/>
        </g>
        <path d="M 52,6 L 56,17 L 50,27" stroke="#ff3838" stroke-width="2.2" fill="none"/>
        <circle cx="34" cy="5" r="6" fill="#1f181a" opacity="0.9"/>
        <circle cx="56" cy="4" r="7" fill="#ff4d00" opacity="0.8"/>
        <circle cx="75" cy="5" r="5" fill="#301c20" opacity="0.85"/>
        <polygon points="54,10 57,3 61,9" fill="#ffcc00"/>
        <g stroke="#d92525" stroke-width="2.5" stroke-linecap="round">
          <line x1="12" y1="9" x2="30" y2="25"/><line x1="30" y1="9" x2="12" y2="25"/>
          <line x1="42" y1="9" x2="60" y2="25"/><line x1="60" y1="9" x2="42" y2="25"/>
          <line x1="72" y1="9" x2="90" y2="25"/><line x1="90" y1="9" x2="72" y2="25"/>
        </g>
      `;
    } else if (size === 2) {
      innerSvg = `
        <path d="M 6,17 Q 15,8 26,8 L 36,9 L 40,5 L 43,10 L 56,9 Q 65,12 66,17 Q 65,22 56,25 L 26,26 Q 15,26 6,17 Z" 
              fill="#2a2022" stroke="#d92525" stroke-width="2" stroke-linejoin="round"/>
        <g stroke="#802020" stroke-width="1.2">
          <line x1="12" y1="10" x2="28" y2="24"/>
          <line x1="38" y1="10" x2="54" y2="24"/>
        </g>
        <circle cx="36" cy="4" r="6" fill="#ff4400" opacity="0.8"/>
        <circle cx="43" cy="2" r="5" fill="#1f181a" opacity="0.9"/>
        <polygon points="34,10 38,4 41,9" fill="#ffcc00"/>
        <g stroke="#d92525" stroke-width="2.5" stroke-linecap="round">
          <line x1="10" y1="9" x2="26" y2="25"/><line x1="26" y1="9" x2="10" y2="25"/>
          <line x1="42" y1="9" x2="58" y2="25"/><line x1="58" y1="9" x2="42" y2="25"/>
        </g>
      `;
    } else {
      innerSvg = `
        <path d="M 4,17 Q 11,8 19,8 L 28,10 Q 31,13 31,17 Q 31,21 28,24 L 19,26 Q 11,26 4,17 Z" 
              fill="#2a2022" stroke="#d92525" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="17" cy="5" r="6" fill="#ff4d00" opacity="0.85"/>
        <circle cx="21" cy="2" r="4" fill="#1f181a" opacity="0.9"/>
        <polygon points="16,10 19,4 22,9" fill="#ffcc00"/>
        <g stroke="#d92525" stroke-width="2.5" stroke-linecap="round">
          <line x1="9" y1="9" x2="25" y2="25"/><line x1="25" y1="9" x2="9" y2="25"/>
        </g>
      `;
    }
  }

  return `
    <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <g ${transform}>
        ${innerSvg}
      </g>
    </svg>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  initSocket();
  initUI();
  checkUrlRoomParam();
  setTimeout(updateAppScale, 100);
});

function initSocket() {
  state.socket = io();

  state.socket.on('opponent_joined', ({ opponentName }) => {
    state.opponentName = opponentName;
    const statusElem = document.getElementById('placement-opponent-status');
    if (statusElem) {
      statusElem.textContent = `${opponentName} подключился. Рисует флот...`;
      statusElem.style.color = 'var(--ink-blue)';
    }
    addLogMessage(`✏️ ${opponentName} сел за парту напротив!`, 'system');
    window.soundEngine.playSonar();
  });

  state.socket.on('player_ready_status', ({ playerId, name }) => {
    if (playerId !== state.playerId) {
      const statusElem = document.getElementById('placement-opponent-status');
      if (statusElem) {
        statusElem.textContent = `${name} готов к бою!`;
        statusElem.style.color = '#087f5b';
      }
    }
  });

  state.socket.on('battle_start', ({ currentTurn, player1, player2 }) => {
    state.currentTurn = currentTurn;
    state.opponentName = state.playerId === 1 ? player2.name : player1.name;
    startBattlePhase();
  });

  state.socket.on('shot_result', (data) => {
    handleShotResultWithFlight(data);
  });

  state.socket.on('game_over', (data) => {
    setTimeout(() => {
      handleGameOver(data);
    }, 900);
  });

  state.socket.on('reaction_received', ({ playerId, playerName, reaction }) => {
    showReactionNote(playerName, reaction, playerId === state.playerId);
  });

  state.socket.on('rematch_voted', ({ playerName }) => {
    const note = document.getElementById('rematch-status');
    if (note) {
      note.classList.remove('hidden');
      note.textContent = `${playerName} готов к реваншу! Нажмите «Сыграть снова».`;
    }
  });

  state.socket.on('game_restarted', () => {
    document.getElementById('modal-gameover').classList.add('hidden');
    resetForNewGame();
    switchScreen('screen-placement');
    addLogMessage('Новый чистый тетрадный лист! Расставьте корабли.', 'system');
  });

  state.socket.on('player_left', ({ playerName }) => {
    addLogMessage(`⚠️ ${playerName} закрыл тетрадь и ушел.`, 'sunk');
    alert(`${playerName} покинул игру.`);
  });
}

function initUI() {
  const savedName = localStorage.getItem('battleship_player_name');
  if (savedName) {
    document.getElementById('player-name-input').value = savedName;
    state.playerName = savedName;
  }

  const btnSound = document.getElementById('btn-sound');
  updateSoundIcon();
  btnSound.addEventListener('click', () => {
    window.soundEngine.toggleMute();
    updateSoundIcon();
  });

  document.getElementById('btn-create-room').addEventListener('click', () => {
    savePlayerName();
    state.socket.emit('create_room', { playerName: state.playerName }, (res) => {
      if (res && res.success) {
        state.roomId = res.roomId;
        state.playerId = 1;
        state.isBot = false;
        setupPlacementScreen();
      }
    });
  });

  document.getElementById('btn-join-room').addEventListener('click', () => {
    savePlayerName();
    const code = document.getElementById('join-code-input').value.trim();
    if (!code) return alert('Пожалуйста, введите код комнаты.');

    state.socket.emit('join_room', { roomId: code, playerName: state.playerName }, (res) => {
      if (res && res.success) {
        state.roomId = res.roomId;
        state.playerId = 2;
        state.opponentName = res.opponentName || 'Капитан 1';
        state.isBot = false;
        setupPlacementScreen();
      } else {
        alert(res.error || 'Не удалось войти в комнату.');
      }
    });
  });

  document.getElementById('btn-play-bot').addEventListener('click', () => {
    savePlayerName();
    state.socket.emit('create_bot_game', { playerName: state.playerName }, (res) => {
      if (res && res.success) {
        state.roomId = res.roomId;
        state.playerId = 1;
        state.opponentName = res.opponentName;
        state.isBot = true;
        setupPlacementScreen();
      }
    });
  });

  document.getElementById('btn-copy-link').addEventListener('click', () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${state.roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      const toast = document.getElementById('copy-toast');
      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), 2500);
    }).catch(() => {
      prompt('Скопируйте ссылку на комнату:', url);
    });
  });

  document.getElementById('btn-rotate').addEventListener('click', toggleOrientation);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
      if (document.getElementById('screen-placement').classList.contains('active') &&
          document.activeElement.tagName !== 'INPUT') {
        toggleOrientation();
      }
    }
  });

  document.getElementById('btn-randomize').addEventListener('click', () => {
    state.socket.emit('get_random_fleet', (res) => {
      if (res && res.success) {
        state.placementFleet = res.fleet;
        state.selectedShipId = null;
        renderPlacementGrid();
        renderShipDock();
        updateReadyButton();
        window.soundEngine.playPencilScratch();
      }
    });
  });

  document.getElementById('btn-clear-fleet').addEventListener('click', () => {
    state.placementFleet = [];
    state.selectedShipId = FLEET_TEMPLATE[0].id;
    renderPlacementGrid();
    renderShipDock();
    updateReadyButton();
    window.soundEngine.playPencilScratch();
  });

  document.getElementById('btn-confirm-ready').addEventListener('click', () => {
    if (state.placementFleet.length !== 10) return;
    const btn = document.getElementById('btn-confirm-ready');
    btn.disabled = true;
    btn.textContent = 'Ожидание соперника...';
    state.isReady = true;

    state.socket.emit('confirm_fleet', { roomId: state.roomId, fleet: state.placementFleet }, (res) => {
      if (res && !res.success) {
        alert(res.error || 'Ошибка проверки флота.');
        btn.disabled = false;
        btn.innerHTML = '⚔️ В БОЙ! ГОТОВ';
        state.isReady = false;
      }
    });
  });

  document.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const emoji = btn.dataset.emoji;
      if (state.roomId) {
        state.socket.emit('send_reaction', { roomId: state.roomId, reaction: emoji });
      }
    });
  });

  document.getElementById('btn-rematch').addEventListener('click', () => {
    const btn = document.getElementById('btn-rematch');
    btn.disabled = true;
    btn.textContent = 'Ждём соперника...';
    state.socket.emit('request_rematch', { roomId: state.roomId });
  });

  document.getElementById('btn-back-menu').addEventListener('click', () => {
    location.reload();
  });

  // Управление масштабированием
  document.getElementById('btn-zoom-out').addEventListener('click', () => {
    state.manualScale = Math.max(0.55, (state.manualScale || getComputedSheetScale()) - 0.08);
    applySheetScale(state.manualScale);
  });

  document.getElementById('btn-zoom-in').addEventListener('click', () => {
    state.manualScale = Math.min(1.3, (state.manualScale || getComputedSheetScale()) + 0.08);
    applySheetScale(state.manualScale);
  });

  document.getElementById('btn-zoom-fit').addEventListener('click', () => {
    state.manualScale = null;
    updateAppScale();
  });
}

function updateSoundIcon() {
  const icon = document.getElementById('sound-icon');
  icon.textContent = window.soundEngine.isMuted() ? '🔇' : '🔊';
}

function savePlayerName() {
  const input = document.getElementById('player-name-input');
  const name = input.value.trim() || 'Адмирал';
  state.playerName = name;
  localStorage.setItem('battleship_player_name', name);
}

function checkUrlRoomParam() {
  const params = new URLSearchParams(window.location.search);
  const room = params.get('room');
  if (room) {
    const input = document.getElementById('join-code-input');
    if (input) {
      input.value = room.toUpperCase();
      input.focus();
    }
  }
}

function switchScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');
  setTimeout(updateAppScale, 50);
}

function setupPlacementScreen() {
  switchScreen('screen-placement');

  document.getElementById('room-badge').classList.remove('hidden');
  document.getElementById('badge-text').textContent = `Комната: ${state.roomId}`;
  document.getElementById('current-room-code').textContent = state.roomId;

  const opponentStatus = document.getElementById('placement-opponent-status');
  if (state.isBot) {
    opponentStatus.textContent = 'Бот уже нарисовал свой флот и ждёт вас!';
    opponentStatus.style.color = '#087f5b';
    document.getElementById('btn-copy-link').style.display = 'none';
  } else if (state.playerId === 1) {
    opponentStatus.textContent = 'Ожидание подключения второго игрока...';
    opponentStatus.style.color = 'var(--ink-red)';
  } else {
    opponentStatus.textContent = `Игра против ${state.opponentName}`;
    opponentStatus.style.color = 'var(--ink-blue)';
  }

  state.placementFleet = [];
  state.selectedShipId = FLEET_TEMPLATE[0].id;
  state.orientation = 'H';
  state.isReady = false;

  buildGridSkeleton('placement-grid');
  renderPlacementGrid();
  renderShipDock();
  updateReadyButton();
  updateAppScale();
}

function toggleOrientation() {
  state.orientation = state.orientation === 'H' ? 'V' : 'H';
  const label = document.getElementById('rotate-label');
  if (label) label.textContent = state.orientation === 'H' ? 'Горизонт' : 'Вертикаль';
}

function buildGridSkeleton(elementId) {
  const container = document.getElementById(elementId);
  container.innerHTML = '';

  const corner = document.createElement('div');
  corner.className = 'grid-header-cell';
  container.appendChild(corner);

  for (let x = 0; x < BOARD_SIZE; x++) {
    const colHeader = document.createElement('div');
    colHeader.className = 'grid-header-cell';
    colHeader.textContent = LETTERS[x];
    container.appendChild(colHeader);
  }

  for (let y = 0; y < BOARD_SIZE; y++) {
    const rowHeader = document.createElement('div');
    rowHeader.className = 'grid-header-cell';
    rowHeader.textContent = y + 1;
    container.appendChild(rowHeader);

    for (let x = 0; x < BOARD_SIZE; x++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.x = x;
      cell.dataset.y = y;
      container.appendChild(cell);
    }
  }
}

function renderPlacementGrid() {
  const container = document.getElementById('placement-grid');
  const cells = container.querySelectorAll('.cell');

  container.querySelectorAll('.drawn-ship-overlay').forEach(el => el.remove());

  const occupied = new Map();
  for (const ship of state.placementFleet) {
    for (const c of ship.cells) {
      occupied.set(`${c.x},${c.y}`, ship.id);
    }
  }

  cells.forEach(cell => {
    const x = parseInt(cell.dataset.x, 10);
    const y = parseInt(cell.dataset.y, 10);
    const key = `${x},${y}`;

    cell.className = 'cell';
    if (occupied.has(key)) {
      cell.classList.add('ship');
    }

    cell.onmouseenter = () => onPlacementCellHover(x, y);
    cell.onmouseleave = clearPlacementPreviews;
    cell.onclick = () => onPlacementCellClick(x, y);
  });

  for (const ship of state.placementFleet) {
    renderShipOverlay(container, ship, false);
  }
}

function renderShipOverlay(gridContainer, ship, isSunk = false) {
  const firstCell = ship.cells[0];
  const isHorizontal = ship.cells.length === 1 || ship.cells[0].y === ship.cells[1].y;
  const orientation = isHorizontal ? 'H' : 'V';

  const targetCell = gridContainer.querySelector(`.cell[data-x="${firstCell.x}"][data-y="${firstCell.y}"]`);
  if (!targetCell) return;

  const overlay = document.createElement('div');
  overlay.className = `drawn-ship-overlay ${isSunk ? 'sunk-ship' : ''}`;
  overlay.dataset.shipId = ship.id;
  overlay.style.left = `${targetCell.offsetLeft}px`;
  overlay.style.top = `${targetCell.offsetTop}px`;
  overlay.style.width = orientation === 'H' ? `${ship.size * 34}px` : '34px';
  overlay.style.height = orientation === 'H' ? '34px' : `${ship.size * 34}px`;
  overlay.innerHTML = createShipSvg(ship.size, orientation, isSunk);

  if (!isSunk && gridContainer.id === 'placement-grid') {
    overlay.style.cursor = 'pointer';
    overlay.style.pointerEvents = 'auto';
    overlay.title = `${ship.name}: нажмите, чтобы стереть`;
    overlay.onclick = (e) => {
      e.stopPropagation();
      if (state.isReady) return;
      state.placementFleet = state.placementFleet.filter(s => s.id !== ship.id);
      state.selectedShipId = ship.id;
      renderPlacementGrid();
      renderShipDock();
      updateReadyButton();
      window.soundEngine.playPencilScratch();
    };
  }

  gridContainer.appendChild(overlay);
}

function onPlacementCellHover(x, y) {
  if (state.isReady) return;
  clearPlacementPreviews();

  if (!state.selectedShipId) return;
  const spec = FLEET_TEMPLATE.find(s => s.id === state.selectedShipId);
  if (!spec) return;

  const candidateCells = [];
  for (let i = 0; i < spec.size; i++) {
    const cx = state.orientation === 'H' ? x + i : x;
    const cy = state.orientation === 'V' ? y + i : y;
    candidateCells.push({ x: cx, y: cy });
  }

  const isValid = canPlaceShipAt(candidateCells, state.selectedShipId);
  const container = document.getElementById('placement-grid');

  for (const c of candidateCells) {
    if (c.x >= 0 && c.x < BOARD_SIZE && c.y >= 0 && c.y < BOARD_SIZE) {
      const el = container.querySelector(`.cell[data-x="${c.x}"][data-y="${c.y}"]`);
      if (el) {
        el.classList.add(isValid ? 'preview-valid' : 'preview-invalid');
      }
    }
  }
}

function clearPlacementPreviews() {
  const container = document.getElementById('placement-grid');
  container.querySelectorAll('.preview-valid, .preview-invalid').forEach(el => {
    el.classList.remove('preview-valid', 'preview-invalid');
  });
}

function onPlacementCellClick(x, y) {
  if (state.isReady) return;

  const existingShip = state.placementFleet.find(s => s.cells.some(c => c.x === x && c.y === y));
  if (existingShip) {
    state.placementFleet = state.placementFleet.filter(s => s.id !== existingShip.id);
    state.selectedShipId = existingShip.id;
    renderPlacementGrid();
    renderShipDock();
    updateReadyButton();
    window.soundEngine.playPencilScratch();
    return;
  }

  if (!state.selectedShipId) return;
  const spec = FLEET_TEMPLATE.find(s => s.id === state.selectedShipId);
  if (!spec) return;

  const candidateCells = [];
  for (let i = 0; i < spec.size; i++) {
    const cx = state.orientation === 'H' ? x + i : x;
    const cy = state.orientation === 'V' ? y + i : y;
    candidateCells.push({ x: cx, y: cy });
  }

  if (!canPlaceShipAt(candidateCells, spec.id)) {
    window.soundEngine.playMiss();
    return;
  }

  state.placementFleet.push({
    id: spec.id,
    name: spec.name,
    size: spec.size,
    cells: candidateCells
  });

  window.soundEngine.playPencilScratch();

  const unplaced = FLEET_TEMPLATE.find(s => !state.placementFleet.some(p => p.id === s.id));
  state.selectedShipId = unplaced ? unplaced.id : null;

  renderPlacementGrid();
  renderShipDock();
  updateReadyButton();
}

function canPlaceShipAt(cells, currentShipId) {
  for (const c of cells) {
    if (c.x < 0 || c.x >= BOARD_SIZE || c.y < 0 || c.y >= BOARD_SIZE) return false;
  }

  const otherShips = state.placementFleet.filter(s => s.id !== currentShipId);
  const occupiedSet = new Set();
  for (const s of otherShips) {
    for (const sc of s.cells) {
      occupiedSet.add(`${sc.x},${sc.y}`);
    }
  }

  for (const c of cells) {
    if (occupiedSet.has(`${c.x},${c.y}`)) return false;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = c.x + dx;
        const ny = c.y + dy;
        if (occupiedSet.has(`${nx},${ny}`)) {
          return false;
        }
      }
    }
  }

  return true;
}

function renderShipDock() {
  const container = document.getElementById('dock-ship-list');
  container.innerHTML = '';

  FLEET_TEMPLATE.forEach(spec => {
    const isPlaced = state.placementFleet.some(p => p.id === spec.id);
    const isSelected = state.selectedShipId === spec.id;

    const card = document.createElement('div');
    card.className = `dock-ship-card ${isPlaced ? 'placed' : ''} ${isSelected ? 'selected' : ''}`;

    const info = document.createElement('div');
    info.className = 'dock-ship-info';
    info.innerHTML = `
      <span class="dock-ship-title">${spec.name}</span>
      <span class="dock-ship-size">${spec.size} ${getDeckWord(spec.size)} ${isPlaced ? '(нарисован)' : ''}</span>
    `;

    const preview = document.createElement('div');
    preview.className = 'dock-ship-preview';
    preview.innerHTML = createShipSvg(spec.size, 'H', false);

    card.appendChild(info);
    card.appendChild(preview);

    if (!isPlaced) {
      card.onclick = () => {
        state.selectedShipId = spec.id;
        renderShipDock();
      };
    }

    container.appendChild(card);
  });

  document.getElementById('placed-count').textContent = state.placementFleet.length;
}

function updateReadyButton() {
  const btn = document.getElementById('btn-confirm-ready');
  const count = state.placementFleet.length;
  btn.disabled = count !== 10;
  if (count === 10) {
    btn.innerHTML = '⚔️ В БОЙ! ГОТОВ';
  } else {
    btn.innerHTML = `Нарисовано: ${count}/10`;
  }
}

function getDeckWord(size) {
  if (size === 1) return 'клетка';
  if (size < 5) return 'клетки';
  return 'клеток';
}

function startBattlePhase() {
  switchScreen('screen-battle');
  window.soundEngine.playSonar();

  document.getElementById('my-name-display').textContent = `${state.playerName} (Вы)`;
  document.getElementById('opponent-name-display').textContent = state.opponentName;

  state.myShipsAlive = 10;
  state.opponentShipsAlive = 10;
  state.myShotsFired = 0;
  state.myHits = 0;
  state.isAnimatingShot = false;

  document.getElementById('my-ships-alive').textContent = '10';
  document.getElementById('opponent-ships-alive').textContent = '10';

  buildGridSkeleton('my-battle-grid');
  buildGridSkeleton('radar-grid');

  renderMyBattleGridWithShips();
  setupRadarInteractions();
  renderFleetStatusChips();
  updateTurnDisplay();
  updateAppScale();

  addLogMessage('Бой начался! Чернила наготове.', 'system');
}

function renderMyBattleGridWithShips() {
  const container = document.getElementById('my-battle-grid');
  container.querySelectorAll('.drawn-ship-overlay').forEach(el => el.remove());

  for (const ship of state.placementFleet) {
    renderShipOverlay(container, ship, false);
  }
}

function setupRadarInteractions() {
  const container = document.getElementById('radar-grid');
  const cells = container.querySelectorAll('.cell');

  cells.forEach(cell => {
    const x = parseInt(cell.dataset.x, 10);
    const y = parseInt(cell.dataset.y, 10);

    cell.onclick = () => {
      if (state.isAnimatingShot) return;
      if (state.currentTurn !== state.playerId) {
        addLogMessage('Сейчас очередь хода соперника! Ожидайте залпа.', 'miss');
        return;
      }

      if (cell.classList.contains('miss') || cell.classList.contains('hit') || cell.classList.contains('sunk')) {
        return;
      }

      state.isAnimatingShot = true;
      state.socket.emit('fire_shot', { roomId: state.roomId, x, y }, (res) => {
        if (res && !res.success) {
          state.isAnimatingShot = false;
          addLogMessage(res.error, 'miss');
        }
      });
    };
  });
}

function animateProjectile(startElem, targetCell, onImpact) {
  const layer = document.getElementById('projectile-layer');
  if (!layer) return onImpact();

  const startRect = startElem.getBoundingClientRect();
  const targetRect = targetCell.getBoundingClientRect();

  const startX = startRect.left + startRect.width / 2;
  const startY = startRect.top + startRect.height / 2;
  const targetX = targetRect.left + targetRect.width / 2;
  const targetY = targetRect.top + targetRect.height / 2;

  const shell = document.createElement('div');
  shell.className = 'flying-shell';
  shell.innerHTML = `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <ellipse cx="12" cy="12" rx="9" ry="5" fill="#123985" stroke="#ffffff" stroke-width="1.5"/>
      <polygon points="3,9 0,12 3,15" fill="#c92a2a"/>
      <circle cx="17" cy="12" r="2" fill="#ffffff"/>
    </svg>
  `;

  const shadow = document.createElement('div');
  shadow.className = 'shell-shadow';

  layer.appendChild(shadow);
  layer.appendChild(shell);

  targetCell.classList.add('targeted');

  window.soundEngine.playShot();
  window.soundEngine.playShellWhistle();

  const duration = 750;
  const startTime = performance.now();
  const maxArcHeight = 130;

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    const curX = startX + (targetX - startX) * progress;
    const groundY = startY + (targetY - startY) * progress;
    const arc = -4 * maxArcHeight * progress * (progress - 1);
    const curY = groundY - arc;

    const nextProgress = Math.min(progress + 0.05, 1);
    const nextX = startX + (targetX - startX) * nextProgress;
    const nextGroundY = startY + (targetY - startY) * nextProgress;
    const nextArc = -4 * maxArcHeight * nextProgress * (nextProgress - 1);
    const nextY = nextGroundY - nextArc;

    const angle = Math.atan2(nextY - curY, nextX - curX) * (180 / Math.PI);

    shell.style.left = `${curX}px`;
    shell.style.top = `${curY}px`;
    shell.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;

    shadow.style.left = `${curX}px`;
    shadow.style.top = `${groundY}px`;
    const shadowScale = 1 - (arc / maxArcHeight) * 0.4;
    shadow.style.transform = `translate(-50%, -50%) scale(${shadowScale})`;

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      shell.remove();
      shadow.remove();
      targetCell.classList.remove('targeted');
      onImpact();
    }
  }

  requestAnimationFrame(step);
}

function handleShotResultWithFlight(data) {
  const { shooterId, x, y, nextTurn } = data;
  const isMeShooting = shooterId === state.playerId;

  const sourceGridId = isMeShooting ? 'my-battle-grid' : 'radar-grid';
  const targetGridId = isMeShooting ? 'radar-grid' : 'my-battle-grid';

  const sourceGrid = document.getElementById(sourceGridId);
  const targetGrid = document.getElementById(targetGridId);
  const targetCell = targetGrid.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);

  animateProjectile(sourceGrid, targetCell, () => {
    state.currentTurn = nextTurn;
    updateTurnDisplay();
    state.isAnimatingShot = false;
    applyShotResult(data);
  });
}

function applyShotResult(data) {
  const { shooterId, x, y, result, ship, halo } = data;
  const isMeShooting = shooterId === state.playerId;
  const coordName = `${LETTERS[x]}-${y + 1}`;

  if (isMeShooting) {
    state.myShotsFired++;
    const radarContainer = document.getElementById('radar-grid');
    const cell = radarContainer.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);

    if (result === 'miss') {
      window.soundEngine.playMiss();
      if (cell) cell.classList.add('miss');
      addLogMessage(`Залп по ${coordName} — всплеск воды! ПРОМАХ.`, 'miss');
    } else if (result === 'hit') {
      state.myHits++;
      window.soundEngine.playHit();
      if (cell) cell.classList.add('hit');
      addLogMessage(`🎯 Прямое попадание по ${coordName}! Взрыв брони! Стреляйте ещё!`, 'hit');
    } else if (result === 'sunk') {
      state.myHits++;
      window.soundEngine.playSunk();
      state.opponentShipsAlive--;
      document.getElementById('opponent-ships-alive').textContent = state.opponentShipsAlive;

      // Отрисовываем обгоревший потопленный корабль на радаре
      if (ship) {
        renderShipOverlay(radarContainer, ship, true);
        if (ship.cells) {
          for (const sc of ship.cells) {
            const scCell = radarContainer.querySelector(`.cell[data-x="${sc.x}"][data-y="${sc.y}"]`);
            if (scCell) scCell.className = 'cell sunk';
          }
        }
      }

      drawSequentialHalo(radarContainer, halo);
      updateShipChipStatus('opponent-fleet-status', ship.size, true);
      addLogMessage(`💥 ВРАЖЕСКИЙ ${ship.name.toUpperCase()} ПОТОПЛЕН! Дополнительный залп!`, 'sunk');
    }
  } else {
    // Стрелял соперник
    const myGrid = document.getElementById('my-battle-grid');
    const cell = myGrid.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);

    if (result === 'miss') {
      window.soundEngine.playMiss();
      if (cell) cell.classList.add('miss');
      addLogMessage(`Соперник целился в ${coordName} — снаряд ушёл в воду! Ваш ход.`, 'miss');
    } else if (result === 'hit') {
      window.soundEngine.playHit();
      if (cell) cell.classList.add('hit');
      addLogMessage(`⚠️ Взрыв в отсеках! Соперник попал по вашему кораблю в ${coordName}!`, 'hit');
    } else if (result === 'sunk') {
      window.soundEngine.playSunk();
      state.myShipsAlive--;
      document.getElementById('my-ships-alive').textContent = state.myShipsAlive;

      // Обновляем корабль на поле игрока обгоревшим остовом
      if (ship) {
        const oldOverlay = myGrid.querySelector(`.drawn-ship-overlay[data-ship-id="${ship.id}"]`);
        if (oldOverlay) oldOverlay.remove();
        renderShipOverlay(myGrid, ship, true);

        if (ship.cells) {
          for (const sc of ship.cells) {
            const scCell = myGrid.querySelector(`.cell[data-x="${sc.x}"][data-y="${sc.y}"]`);
            if (scCell) scCell.className = 'cell sunk';
          }
        }
      }

      drawSequentialHalo(myGrid, halo);
      updateShipChipStatus('my-fleet-status', ship.size, true);
      addLogMessage(`🔥 Катастрофа! Ваш ${ship.name} затоплен!`, 'sunk');
    }
  }
}

function drawSequentialHalo(gridContainer, halo) {
  if (!halo || halo.length === 0) return;

  halo.forEach((hc, idx) => {
    setTimeout(() => {
      const hcCell = gridContainer.querySelector(`.cell[data-x="${hc.x}"][data-y="${hc.y}"]`);
      if (hcCell && !hcCell.classList.contains('sunk') && !hcCell.classList.contains('hit')) {
        hcCell.classList.add('halo');
        if (idx % 2 === 0) window.soundEngine.playPencilScratch();
      }
    }, idx * 60);
  });
}

function updateTurnDisplay() {
  const banner = document.getElementById('turn-banner');
  const headline = document.getElementById('turn-headline');
  const subtext = document.getElementById('turn-subtext');

  const isMyTurn = state.currentTurn === state.playerId;

  banner.className = `battle-turn-banner ${isMyTurn ? 'your-turn' : 'opponent-turn'}`;
  if (isMyTurn) {
    headline.textContent = 'ВАШ ХОД!';
    subtext.textContent = 'Выберите клетку на поле противника и произведите залп';
  } else {
    headline.textContent = `ХОД ПРОТИВНИКА (${state.opponentName})`;
    subtext.textContent = 'Соперник выверяет прицел... Ожидайте залпа.';
  }
}

function renderFleetStatusChips() {
  const renderChips = (containerId) => {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    const sorted = [...FLEET_TEMPLATE].sort((a, b) => b.size - a.size);
    sorted.forEach(s => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.dataset.size = s.size;
      chip.textContent = `${s.name} (${s.size})`;
      container.appendChild(chip);
    });
  };

  renderChips('my-fleet-status');
  renderChips('opponent-fleet-status');
}

function updateShipChipStatus(containerId, size, markSunk) {
  const container = document.getElementById(containerId);
  const chips = container.querySelectorAll(`.chip[data-size="${size}"]:not(.sunk)`);
  if (chips.length > 0 && markSunk) {
    chips[0].classList.add('sunk');
  }
}

function handleGameOver(data) {
  const { winnerId, winnerName, loserFleet, stats } = data;
  const isWinner = winnerId === state.playerId;

  if (isWinner) {
    window.soundEngine.playVictory();
  } else {
    window.soundEngine.playDefeat();
    if (loserFleet) {
      const radar = document.getElementById('radar-grid');
      for (const ship of loserFleet) {
        renderShipOverlay(radar, ship, true);
      }
    }
  }

  const modal = document.getElementById('modal-gameover');
  const banner = document.getElementById('gameover-banner');
  const icon = document.getElementById('gameover-icon');
  const title = document.getElementById('gameover-title');
  const subtitle = document.getElementById('gameover-subtitle');

  if (isWinner) {
    banner.className = 'diary-banner victory';
    icon.textContent = '🏆';
    title.textContent = 'ОТЛИЧНО! ПОБЕДА!';
    subtitle.textContent = `Вы полностью разгромили эскадру командира ${state.opponentName}!`;
  } else {
    banner.className = 'diary-banner defeat';
    icon.textContent = '💥';
    title.textContent = 'ПОРАЖЕНИЕ...';
    subtitle.textContent = `Победу одержал ${winnerName}. Все ваши корабли потоплены.`;
  }

  const myStats = isWinner ? stats.winner : stats.loser;
  const totalShots = myStats.shots || state.myShotsFired || 0;
  const totalHits = myStats.hits || state.myHits || 0;
  const acc = totalShots > 0 ? Math.round((totalHits / totalShots) * 100) : 0;

  document.getElementById('stat-shots').textContent = totalShots;
  document.getElementById('stat-hits').textContent = totalHits;
  document.getElementById('stat-acc').textContent = `${acc}%`;

  const rematchBtn = document.getElementById('btn-rematch');
  rematchBtn.disabled = false;
  rematchBtn.innerHTML = '🔄 Сыграть снова';
  document.getElementById('rematch-status').classList.add('hidden');

  modal.classList.remove('hidden');
}

function resetForNewGame() {
  state.placementFleet = [];
  state.selectedShipId = FLEET_TEMPLATE[0].id;
  state.orientation = 'H';
  state.isReady = false;
  state.currentTurn = null;
  state.myShipsAlive = 10;
  state.opponentShipsAlive = 10;
  state.myShotsFired = 0;
  state.myHits = 0;
  state.isAnimatingShot = false;

  setupPlacementScreen();
}

function addLogMessage(msg, type = 'system') {
  const container = document.getElementById('log-messages');
  if (!container) return;

  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = `• ${msg}`;
  container.appendChild(entry);
  container.scrollTop = container.scrollHeight;
}

function showReactionNote(name, emoji, isMe) {
  const container = document.getElementById('reaction-toast-container');
  const note = document.createElement('div');
  note.className = 'reaction-note';
  note.innerHTML = `
    <span>${emoji}</span>
    <span><strong>${isMe ? 'Вы' : name}:</strong> записка с ${emoji}</span>
  `;
  container.appendChild(note);

  setTimeout(() => {
    if (note.parentNode) note.remove();
  }, 2800);
}

function getComputedSheetScale() {
  const sheet = document.querySelector('.notebook-sheet');
  if (!sheet) return 1;
  const match = sheet.style.transform.match(/scale\(([^)]+)\)/);
  return match ? parseFloat(match[1]) : 1;
}

function applySheetScale(scale) {
  const sheet = document.querySelector('.notebook-sheet');
  const wrapper = document.querySelector('.notebook-wrapper');
  if (!sheet || !wrapper) return;
  sheet.style.transform = `scale(${scale})`;
  sheet.style.transformOrigin = 'top center';
  wrapper.style.height = `${sheet.offsetHeight * scale + 10}px`;
}

/**
 * Авто-масштабирование тетрадного листа, чтобы интерфейс на 100% вмещался в окно без полосы прокрутки
 */
function updateAppScale() {
  const sheet = document.querySelector('.notebook-sheet');
  const wrapper = document.querySelector('.notebook-wrapper');
  if (!sheet || !wrapper) return;

  if (state.manualScale) {
    applySheetScale(state.manualScale);
    return;
  }

  sheet.style.transform = 'none';

  const windowW = window.innerWidth;
  const windowH = window.innerHeight;

  const sheetW = sheet.offsetWidth;
  const sheetH = sheet.offsetHeight;

  const margin = 20;
  const scaleX = (windowW - margin) / sheetW;
  const scaleY = (windowH - margin) / sheetH;

  // Масштабируем вниз, если лист больше окна браузера
  const scale = Math.min(1, scaleX, scaleY);

  if (scale < 1) {
    sheet.style.transform = `scale(${scale})`;
    sheet.style.transformOrigin = 'top center';
    wrapper.style.height = `${sheetH * scale + 10}px`;
  } else {
    sheet.style.transform = 'none';
    wrapper.style.height = 'auto';
  }
}

window.addEventListener('resize', updateAppScale);
window.addEventListener('orientationchange', updateAppScale);