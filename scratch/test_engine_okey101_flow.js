// scratch/test_engine_okey101_flow.js
const assert = require('assert');
const okey101Engine = require('../okey101');
const gameCoordinator = require('../src/gameCoordinator');

console.log("🚀 Starting Okey 101 Engine & Round Transition Unit Tests...");

const mockPlayers = ['p_0', 'p_1', 'p_2', 'p_3'];
const mockPlayerProfiles = {
    'p_0': { name: 'Oyuncu 1', isBot: false },
    'p_1': { name: 'Oyuncu 2', isBot: false },
    'p_2': { name: 'Oyuncu 3', isBot: false },
    'p_3': { name: 'Oyuncu 4', isBot: false }
};

// 1. Test Round 1 Initial State & Starter Rotation
let gameR1 = okey101Engine.startOkey101Game(mockPlayers, null, 1, 'esli');
assert.strictEqual(gameR1.roundNumber, 1);
assert.strictEqual(gameR1.turnIndex, 0, "Round 1 starter should be player 0");
assert.strictEqual(gameR1.hands['p_0'].length, 22, "Player 0 should have 22 tiles in Round 1");
assert.strictEqual(gameR1.hands['p_1'].length, 21, "Player 1 should have 21 tiles in Round 1");
assert.strictEqual(gameR1.drawnThisTurn, true, "Starter has drawnThisTurn = true");
console.log("✅ Round 1 deal & starter rotation verified!");

// 2. Test Round 2 Starter Rotation
let gameR2 = okey101Engine.startOkey101Game(mockPlayers, gameR1.scores, 2, 'esli', gameR1.yazboz);
assert.strictEqual(gameR2.roundNumber, 2);
assert.strictEqual(gameR2.turnIndex, 1, "Round 2 starter should be player 1");
assert.strictEqual(gameR2.hands['p_1'].length, 22, "Player 1 should have 22 tiles in Round 2");
assert.strictEqual(gameR2.hands['p_0'].length, 21, "Player 0 should have 21 tiles in Round 2");
console.log("✅ Round 2 deal & starter rotation verified!");

// 3. Test Discard Tile
let p1TileToDiscard = gameR2.hands['p_1'][21].id;
let discardRes = okey101Engine.discardTile(gameR2, 'p_1', p1TileToDiscard);
assert.strictEqual(discardRes.success, true);
assert.strictEqual(gameR2.turnIndex, 2, "Turn should advance to player 2 after discard");
assert.strictEqual(gameR2.drawnThisTurn, false, "drawnThisTurn reset for next player");
console.log("✅ DiscardTile mechanic verified!");

// 4. Test Taş İşleme (addTileToTablePer)
// Add a mock per on table: Kırmızı 5 - 6 - 7
gameR2.tableOpenedPers = [{
    id: 1,
    ownerId: 'p_2',
    type: 'seri',
    tiles: [
        { id: 'm_5', color: 'kirmizi', value: 5, isFakeOkey: false },
        { id: 'm_6', color: 'kirmizi', value: 6, isFakeOkey: false },
        { id: 'm_7', color: 'kirmizi', value: 7, isFakeOkey: false }
    ],
    score: 18
}];

// Prepare p_2's turn and hand with Kırmızı 8
gameR2.turnIndex = 2; // p_2
gameR2.drawnThisTurn = true;
gameR2.hasOpened['p_2'] = true;
let tile8 = { id: 'm_8', color: 'kirmizi', value: 8, isFakeOkey: false };
gameR2.hands['p_2'].push(tile8);

// Test appending to end
let ishlemeRes = okey101Engine.addTileToTablePer(gameR2, 'p_2', 'm_8', 0, 'end');
assert.strictEqual(ishlemeRes.success, true, "Should successfully process tile 8 into 5-6-7");
assert.strictEqual(gameR2.tableOpenedPers[0].tiles.length, 4, "Per should now have 4 tiles");
console.log("✅ Taş işleme (addTileToTablePer) verified!");

// 5. Test Round 11 Match Completion & Champion in Coordinator
let mockTableId = 'okey101_test_match';
let mockGameR11 = {
    tableId: mockTableId,
    roundNumber: 11,
    mode: 'esli',
    players: [...mockPlayers],
    playerProfiles: mockPlayerProfiles,
    scores: { 'p_0': 150, 'p_1': 200, 'p_2': 150, 'p_3': 200 },
    yazboz: {
        mode: 'esli',
        team1: { totalScore: 300 },
        team2: { totalScore: 400 }
    },
    gameOver: true
};

const mockIo = {
    to: () => ({ emit: () => {} })
};

gameCoordinator.activeGames[mockTableId] = mockGameR11;
gameCoordinator.startNextOkey101Round(mockGameR11, mockIo, mockPlayerProfiles);

let nextGameAfter11 = gameCoordinator.getActiveGame(mockTableId);
assert.ok(nextGameAfter11, "Next game should be started");
assert.strictEqual(nextGameAfter11.roundNumber, 1, "After round 11, should reset to Round 1");
assert.strictEqual(nextGameAfter11.gameOver, false, "New game should not be game over");
console.log("✅ Round 11 match completion & reset to round 1 verified!");

console.log("\n🎉 ALL UNIT TESTS PASSED SUCCESSFULLY!");
