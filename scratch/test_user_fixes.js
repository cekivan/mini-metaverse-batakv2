// scratch/test_user_fixes.js - Test transitions, blackjack timer, and seat auto-open game
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- 1. Testing Server-side Blackjack betting timer ---');
const blackjackHandlerPath = path.join(__dirname, '../src/handlers/blackjackHandler.js');
const bjCode = fs.readFileSync(blackjackHandlerPath, 'utf8');
assert(bjCode.includes('blackjackTable.stateSecondsLeft = 15;'), 'Blackjack betting stateSecondsLeft must be 15');
console.log('✓ Server blackjackTable.stateSecondsLeft is 15 seconds');

console.log('--- 2. Testing Client-side Blackjack files ---');
const bjClientPath = path.join(__dirname, '../public/js/blackjack.js');
const bjClientCode = fs.readFileSync(bjClientPath, 'utf8');
assert(bjClientCode.includes('table.stateSecondsLeft / 15'), 'Client blackjack must calculate progress using 15s');
console.log('✓ Client blackjack.js calculates progress based on 15s');

const htmlPath = path.join(__dirname, '../public/index.html');
const htmlCode = fs.readFileSync(htmlPath, 'utf8');
assert(htmlCode.includes('id="bjStatusBanner"'), 'index.html contains bjStatusBanner');
assert(htmlCode.includes('id="bjTimerProgressContainer"'), 'index.html contains bjTimerProgressContainer');
console.log('✓ index.html has compact Blackjack top bar banner & timer');

console.log('--- 3. Testing seatRegistry.js game metadata & auto-open ---');
const seatRegistryPath = path.join(__dirname, '../public/js/seatRegistry.js');
const seatCode = fs.readFileSync(seatRegistryPath, 'utf8');

// Run seatRegistry in mock environment
let satPosition = null;
let openedGame = null;
let mockSocketEmits = [];

const mockWindow = {
    socket: {
        emit: (event, data) => mockSocketEmits.push({ event, data }),
        id: 'mock_socket_1'
    },
    openBlackjackModal: () => { openedGame = 'blackjack'; },
    bjTakeSeat: (idx) => { openedGame = 'blackjack_seat_' + idx; }
};

const sandbox = {
    window: mockWindow,
    socket: mockWindow.socket,
    currentRoom: 'kafe',
    players: {
        'mock_socket_1': { x: 130, y: 285 } // Right next to Tavla chair (132, 288)
    },
    myId: 'mock_socket_1',
    sitPlayerAt: (x, y, facing) => { satPosition = { x, y, facing }; },
    openBlackjackModal: mockWindow.openBlackjackModal,
    bjTakeSeat: mockWindow.bjTakeSeat,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    console: console
};

vm.createContext(sandbox);
vm.runInContext(seatCode, sandbox);

// Test sitting at Tavla
assert(typeof sandbox.findNearestSittableSeat === 'function');
assert(typeof sandbox.checkAndSitOnNearestFurnitureOrChair === 'function');

let satTavla = sandbox.checkAndSitOnNearestFurnitureOrChair();
assert(satTavla === true, 'Player should sit at Tavla chair');
assert.strictEqual(satPosition.x, 132);
assert.strictEqual(satPosition.y, 288);
assert(mockSocketEmits.some(e => e.event === 'requestTableOptions' && e.data === 'tavla'), 'Should request table options for tavla');
console.log('✓ Tavla seat: Player sat down and tavla table options opened');

// Test sitting at Batak
mockSocketEmits = [];
sandbox.players['mock_socket_1'] = { x: 655, y: 80 }; // Near Gömmeli Batak chair (658, 76)
let satBatak = sandbox.checkAndSitOnNearestFurnitureOrChair();
assert(satBatak === true, 'Player should sit at Batak chair');
assert(mockSocketEmits.some(e => e.event === 'requestTableOptions' && e.data === 'batak'), 'Should request table options for batak');
console.log('✓ Batak seat: Player sat down and batak table options opened');

// Test sitting at Blackjack in Dedenin Yeri
mockSocketEmits = [];
openedGame = null;
sandbox.currentRoom = 'dedenin_yeri';
sandbox.players['mock_socket_1'] = { x: 366, y: 252 }; // Near Blackjack chair 1 (364, 250)
let satBj = sandbox.checkAndSitOnNearestFurnitureOrChair();
assert(satBj === true, 'Player should sit at Blackjack chair');
assert.strictEqual(openedGame, 'blackjack');
console.log('✓ Blackjack seat: Player sat down and blackjack modal opened');

// Test sitting at 101 Okey in Nargile Cafe
mockSocketEmits = [];
sandbox.currentRoom = 'nargile_cafe';
sandbox.players['mock_socket_1'] = { x: 250, y: 158 }; // Near Tekli 101 chair (255, 155)
let satOkey = sandbox.checkAndSitOnNearestFurnitureOrChair();
assert(satOkey === true, 'Player should sit at 101 Okey chair');
assert(mockSocketEmits.some(e => e.event === 'requestTableOptions' && e.data === 'okey101_tekli'), 'Should request table options for okey101_tekli');
console.log('✓ 101 Okey seat: Player sat down and 101 Okey options opened');

console.log('--- 4. Testing main.js gameLoop and transition safety ---');
const mainJsPath = path.join(__dirname, '../public/js/main.js');
const mainJsCode = fs.readFileSync(mainJsPath, 'utf8');

// Verify requestAnimationFrame is at top of gameLoop
const gameLoopMatch = mainJsCode.match(/function gameLoop\(timestamp\)\s*\{\s*requestAnimationFrame\(gameLoop\);/);
assert(gameLoopMatch, 'requestAnimationFrame must be at the very start of gameLoop');
console.log('✓ requestAnimationFrame is at the top of gameLoop (cannot be cancelled by returns)');

// Verify playerDisconnected guard
assert(mainJsCode.includes('if (id === myId) return;'), 'playerDisconnected must guard against deleting myId');
console.log('✓ playerDisconnected guards against deleting local player');

// Verify roomTransitionCooldownUntil is 1500ms
assert(mainJsCode.includes('roomTransitionCooldownUntil = Date.now() + 1500;'), 'roomTransitionCooldownUntil must be at least 1500ms');
console.log('✓ roomTransitionCooldownUntil is 1500ms (prevents rapid bouncing)');

console.log('\n=======================================');
console.log('ALL TESTS PASSED SUCCESSFULLY! ALL 3 REQUIREMENTS VERIFIED!');
console.log('=======================================');
