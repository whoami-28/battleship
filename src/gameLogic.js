/**
 * gameLogic.js - Правила и логика классического Морского Боя
 */

const BOARD_SIZE = 10;

const FLEET_SPEC = [
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

function isValidCoord(x, y) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

function getNeighbors(x, y) {
  const neighbors = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (isValidCoord(nx, ny)) {
        neighbors.push({ x: nx, y: ny });
      }
    }
  }
  return neighbors;
}

function validateFleet(ships) {
  if (!Array.isArray(ships) || ships.length !== FLEET_SPEC.length) {
    return { valid: false, error: 'Неверное количество кораблей. Требуется 10 кораблей.' };
  }

  const expectedSizes = [...FLEET_SPEC.map(s => s.size)].sort((a, b) => b - a);
  const actualSizes = [...ships.map(s => (s.cells ? s.cells.length : 0))].sort((a, b) => b - a);
  for (let i = 0; i < expectedSizes.length; i++) {
    if (expectedSizes[i] !== actualSizes[i]) {
      return { valid: false, error: 'Размеры кораблей не соответствуют правилам флота.' };
    }
  }

  const occupiedMap = new Map();

  for (let sIdx = 0; sIdx < ships.length; sIdx++) {
    const ship = ships[sIdx];
    const cells = ship.cells;

    if (!cells || cells.length !== ship.size) {
      return { valid: false, error: 'Корабль ' + (ship.name || sIdx) + ' имеет некорректную длину.' };
    }

    for (const c of cells) {
      if (!isValidCoord(c.x, c.y)) {
        return { valid: false, error: 'Корабль выходит за границы поля 10x10.' };
      }
    }

    if (cells.length > 1) {
      const isHorizontal = cells.every(c => c.y === cells[0].y);
      const isVertical = cells.every(c => c.x === cells[0].x);

      if (!isHorizontal && !isVertical) {
        return { valid: false, error: 'Корабль должен быть прямой линией.' };
      }

      if (isHorizontal) {
        const xs = cells.map(c => c.x).sort((a, b) => a - b);
        for (let i = 1; i < xs.length; i++) {
          if (xs[i] !== xs[i - 1] + 1) return { valid: false, error: 'Палубы корабля должны быть непрерывными.' };
        }
      } else {
        const ys = cells.map(c => c.y).sort((a, b) => a - b);
        for (let i = 1; i < ys.length; i++) {
          if (ys[i] !== ys[i - 1] + 1) return { valid: false, error: 'Палубы корабля должны быть непрерывными.' };
        }
      }
    }

    for (const c of cells) {
      const key = c.x + ',' + c.y;
      if (occupiedMap.has(key)) {
        return { valid: false, error: 'Корабли не могут накладываться друг на друга.' };
      }
      occupiedMap.set(key, sIdx);
    }
  }

  for (let sIdx = 0; sIdx < ships.length; sIdx++) {
    const ship = ships[sIdx];
    for (const c of ship.cells) {
      const neighbors = getNeighbors(c.x, c.y);
      for (const n of neighbors) {
        const nKey = n.x + ',' + n.y;
        if (occupiedMap.has(nKey)) {
          const otherShipIdx = occupiedMap.get(nKey);
          if (otherShipIdx !== sIdx) {
            return { valid: false, error: 'Корабли не должны соприкасаться сторонами или углами.' };
          }
        }
      }
    }
  }

  return { valid: true };
}

function generateRandomFleet() {
  const maxAttempts = 500;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const grid = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false));
    const ships = [];
    let success = true;

    for (const spec of FLEET_SPEC) {
      const placed = tryPlaceShipRandomly(grid, spec);
      if (!placed) {
        success = false;
        break;
      }
      ships.push(placed);
    }

    if (success && validateFleet(ships).valid) {
      return ships;
    }
  }
  throw new Error('Не удалось сгенерировать расстановку флота.');
}

function tryPlaceShipRandomly(grid, spec) {
  const size = spec.size;
  const orientations = ['H', 'V'];
  const maxTries = 300;

  for (let i = 0; i < maxTries; i++) {
    const orientation = orientations[Math.floor(Math.random() * orientations.length)];
    const x = Math.floor(Math.random() * (orientation === 'H' ? BOARD_SIZE - size + 1 : BOARD_SIZE));
    const y = Math.floor(Math.random() * (orientation === 'V' ? BOARD_SIZE - size + 1 : BOARD_SIZE));

    let canPlace = true;
    const cells = [];

    for (let s = 0; s < size; s++) {
      const cx = orientation === 'H' ? x + s : x;
      const cy = orientation === 'V' ? y + s : y;

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (isValidCoord(nx, ny) && grid[ny][nx]) {
            canPlace = false;
            break;
          }
        }
        if (!canPlace) break;
      }
      if (!canPlace) break;
      cells.push({ x: cx, y: cy });
    }

    if (canPlace) {
      for (const c of cells) grid[c.y][c.x] = true;
      return { id: spec.id, name: spec.name, size: spec.size, cells, hits: [] };
    }
  }
  return null;
}

function getShipHalo(ship, shotsAlreadyFired = []) {
  const firedMap = new Set(shotsAlreadyFired.map(s => s.x + ',' + s.y));
  const shipCellsMap = new Set(ship.cells.map(c => c.x + ',' + c.y));
  const halo = [];
  const haloAdded = new Set();

  for (const cell of ship.cells) {
    const neighbors = getNeighbors(cell.x, cell.y);
    for (const n of neighbors) {
      const key = n.x + ',' + n.y;
      if (!shipCellsMap.has(key) && !haloAdded.has(key)) {
        haloAdded.add(key);
        halo.push({ x: n.x, y: n.y, wasAlreadyShot: firedMap.has(key) });
      }
    }
  }
  return halo;
}

function processShot(ships, shots, x, y) {
  if (!isValidCoord(x, y)) {
    return { valid: false, error: 'Координаты выстрела вне сетки поля.' };
  }

  const alreadyShot = shots.some(s => s.x === x && s.y === y);
  if (alreadyShot) {
    return { valid: false, error: 'В эту клетку уже стреляли.' };
  }

  let hitShip = null;
  for (const ship of ships) {
    const cellHit = ship.cells.find(c => c.x === x && c.y === y);
    if (cellHit) {
      hitShip = ship;
      break;
    }
  }

  if (!hitShip) {
    const shotRecord = { x, y, hit: false };
    shots.push(shotRecord);
    return { valid: true, result: 'miss', x, y, shotRecord };
  }

  if (!hitShip.hits) hitShip.hits = [];
  hitShip.hits.push({ x, y });
  const shotRecord = { x, y, hit: true };
  shots.push(shotRecord);

  const isSunk = hitShip.cells.every(c =>
    hitShip.hits.some(h => h.x === c.x && h.y === c.y)
  );

  if (isSunk) {
    const halo = getShipHalo(hitShip, shots);
    const newHaloShots = [];
    for (const h of halo) {
      if (!h.wasAlreadyShot) {
        const haloShot = { x: h.x, y: h.y, hit: false, isHalo: true };
        shots.push(haloShot);
        newHaloShots.push(haloShot);
      }
    }

    const allSunk = ships.every(s =>
      s.cells.every(c => (s.hits || []).some(h => h.x === c.x && h.y === c.y))
    );

    return {
      valid: true,
      result: 'sunk',
      x, y,
      ship: { id: hitShip.id, name: hitShip.name, size: hitShip.size, cells: hitShip.cells },
      halo: halo.map(h => ({ x: h.x, y: h.y })),
      newHaloShots,
      allSunk,
      shotRecord
    };
  }

  return {
    valid: true,
    result: 'hit',
    x, y,
    shipName: hitShip.name,
    shotRecord
  };
}

/**
 * Человечный бот для одиночной игры
 * Не подглядывает в координаты игрока, совершает естественные ошибки и не добивает корабли со 100% точностью робота
 */
class BattleshipBot {
  constructor() {
    this.fleet = generateRandomFleet();
    this.enemyShots = [];
    this.hitsQueue = [];
  }

  chooseNextShot() {
    // Если есть раненый корабль, но с вероятностью 35% бот может отвлечься или ошибиться
    if (this.hitsQueue.length > 0) {
      const isDistracted = Math.random() < 0.35;
      if (!isDistracted) {
        const shot = this.targetModeShot();
        if (shot) return shot;
      }
    }

    // Случайный человеческий поиск по полю
    return this.huntModeShot();
  }

  huntModeShot() {
    const fired = new Set(this.enemyShots.map(s => s.x + ',' + s.y));
    const allCandidates = [];

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (!fired.has(x + ',' + y)) {
          allCandidates.push({ x, y });
        }
      }
    }

    if (allCandidates.length === 0) return null;
    // Обычный случайный выбор клетки, как у человека
    return allCandidates[Math.floor(Math.random() * allCandidates.length)];
  }

  targetModeShot() {
    const fired = new Set(this.enemyShots.map(s => s.x + ',' + s.y));

    // Выбираем случайное известное попадание, если их несколько
    const origin = this.hitsQueue[Math.floor(Math.random() * this.hitsQueue.length)];
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 }
    ].sort(() => Math.random() - 0.5);

    for (const dir of directions) {
      const tx = origin.x + dir.dx;
      const ty = origin.y + dir.dy;
      if (isValidCoord(tx, ty) && !fired.has(tx + ',' + ty)) {
        return { x: tx, y: ty };
      }
    }

    return null;
  }

  handleShotResult(shotResult) {
    this.enemyShots.push({ x: shotResult.x, y: shotResult.y, hit: shotResult.result !== 'miss' });

    if (shotResult.result === 'hit') {
      this.hitsQueue.push({ x: shotResult.x, y: shotResult.y });
    } else if (shotResult.result === 'sunk') {
      const sunkCells = new Set(shotResult.ship.cells.map(c => c.x + ',' + c.y));
      this.hitsQueue = this.hitsQueue.filter(h => !sunkCells.has(h.x + ',' + h.y));

      // Иногда бот забывает сразу отметить весь ореол (для большей реалистичности)
      if (shotResult.halo) {
        for (const h of shotResult.halo) {
          if (Math.random() < 0.85) { // 85% шанс пометить
            if (!this.enemyShots.some(s => s.x === h.x && s.y === h.y)) {
              this.enemyShots.push({ x: h.x, y: h.y, hit: false });
            }
          }
        }
      }
    }
  }
}

module.exports = {
  BOARD_SIZE,
  FLEET_SPEC,
  isValidCoord,
  getNeighbors,
  validateFleet,
  generateRandomFleet,
  getShipHalo,
  processShot,
  BattleshipBot
};