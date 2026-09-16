const assert = require('assert');
const {
  validateFleet,
  generateRandomFleet,
  processShot,
  BattleshipBot,
  BOARD_SIZE,
  FLEET_SPEC
} = require('../src/gameLogic');

console.log('--- Running Game Logic Tests ---');

// Test 1: Generate 20 random fleets and validate them
for (let i = 0; i < 20; i++) {
  const fleet = generateRandomFleet();
  const res = validateFleet(fleet);
  assert.strictEqual(res.valid, true, `Generated fleet ${i} must be valid: ${res.error}`);
  assert.strictEqual(fleet.length, 10, 'Must contain exactly 10 ships');
}
console.log('✓ Test 1: Random fleet generation and validation (20 iterations) passed');

// Test 2: Invalidation checks
const validFleet = generateRandomFleet();
// Ships touching test: move ship 1 directly adjacent to ship 0
const badFleet = JSON.parse(JSON.stringify(validFleet));
badFleet[1].cells = [{ x: badFleet[0].cells[0].x, y: badFleet[0].cells[0].y }]; // overlap
const overlapRes = validateFleet(badFleet);
assert.strictEqual(overlapRes.valid, false, 'Overlapping ships must be invalid');

// Wrong length test
const wrongLenFleet = validFleet.slice(0, 9);
assert.strictEqual(validateFleet(wrongLenFleet).valid, false, 'Fleet with 9 ships must be invalid');
console.log('✓ Test 2: Validation rejection rules passed');

// Test 3: Shot processing (hit, miss, sunk, halo, victory)
const testFleet = [
  { id: 'battleship-1', name: 'Линкор', size: 4, cells: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0}] },
  { id: 'cruiser-1', name: 'Крейсер', size: 3, cells: [{x:0,y:2},{x:1,y:2},{x:2,y:2}] },
  { id: 'cruiser-2', name: 'Крейсер', size: 3, cells: [{x:0,y:4},{x:1,y:4},{x:2,y:4}] },
  { id: 'destroyer-1', name: 'Эсминец', size: 2, cells: [{x:0,y:6},{x:1,y:6}] },
  { id: 'destroyer-2', name: 'Эсминец', size: 2, cells: [{x:0,y:8},{x:1,y:8}] },
  { id: 'destroyer-3', name: 'Эсминец', size: 2, cells: [{x:4,y:6},{x:5,y:6}] },
  { id: 'boat-1', name: 'Катер', size: 1, cells: [{x:4,y:8}] },
  { id: 'boat-2', name: 'Катер', size: 1, cells: [{x:6,y:8}] },
  { id: 'boat-3', name: 'Катер', size: 1, cells: [{x:8,y:8}] },
  { id: 'boat-4', name: 'Катер', size: 1, cells: [{x:8,y:6}] },
];

assert.strictEqual(validateFleet(testFleet).valid, true, 'Test fleet must be valid');

const shots = [];
// Shot 1: Miss at (9, 9)
const shot1 = processShot(testFleet, shots, 9, 9);
assert.strictEqual(shot1.result, 'miss');
assert.strictEqual(shots.length, 1);

// Shot 2: Re-shooting same cell must return error
const shotDup = processShot(testFleet, shots, 9, 9);
assert.strictEqual(shotDup.valid, false);

// Shot 3: Hit boat at (4, 8) -> size 1, should immediately sink!
const shotBoat = processShot(testFleet, shots, 4, 8);
assert.strictEqual(shotBoat.result, 'sunk');
assert.strictEqual(shotBoat.ship.name, 'Катер');
assert(shotBoat.halo.length > 0, 'Halo around boat must exist');
// Check that halo cells are now marked in shots as misses
const haloCell = shotBoat.halo[0];
assert(shots.some(s => s.x === haloCell.x && s.y === haloCell.y && s.hit === false), 'Halo cells must be added to shots');

console.log('✓ Test 3: Shot processing, sinking and halo logic passed');

// Test 4: BattleshipBot simulation
const bot = new BattleshipBot();
assert.strictEqual(bot.fleet.length, 10);
let botShotsCount = 0;
while (botShotsCount < 50) {
  const shot = bot.chooseNextShot();
  assert(shot !== null, 'Bot must choose a valid shot');
  assert(shot.x >= 0 && shot.x < BOARD_SIZE && shot.y >= 0 && shot.y < BOARD_SIZE);
  bot.handleShotResult({ result: 'miss', x: shot.x, y: shot.y });
  botShotsCount++;
}
console.log('✓ Test 4: Bot targeting simulation passed');

console.log('--- All Game Logic Tests Passed Successfully! ---');