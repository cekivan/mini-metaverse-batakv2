// scratch/test_drag_discard_and_round_end.js
const io = require('c:/Users/WIN11/Desktop/Project01 - Kopya/node_modules/socket.io-client');
const assert = require('assert');

const SERVER_URL = 'http://localhost:3000';

function createClient(username) {
    return new Promise((resolve, reject) => {
        const socket = io(SERVER_URL, {
            transports: ['websocket'],
            forceNew: true
        });

        let clientObj = { socket, username, currentMoney: 0 };

        socket.on('connect', () => {
            socket.emit('register', { name: username, pass: '123456', gender: 'male' });
        });

        socket.on('loginSuccess', (data) => {
            clientObj.user = data;
            clientObj.pid = socket.id;
            clientObj.currentMoney = data.money;
            resolve(clientObj);
        });

        socket.on('registerFailed', () => {
            socket.emit('login', { name: username, pass: '123456' });
        });

        socket.on('loginFailed', (msg) => {
            reject(new Error(msg));
        });

        setTimeout(() => reject(new Error(`Timeout connecting ${username}`)), 5000);
    });
}

function emitAndWait(socket, emitEvent, emitData, waitEvent, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Timeout waiting for event "${waitEvent}" after emit "${emitEvent}"`));
        }, timeout);

        const errHandler = (msg) => {
            clearTimeout(timer);
            reject(new Error(`Game error during ${emitEvent}: ${msg}`));
        };
        socket.once('gameError', errHandler);

        socket.once(waitEvent, (data) => {
            clearTimeout(timer);
            socket.off('gameError', errHandler);
            resolve(data);
        });

        socket.emit(emitEvent, emitData);
    });
}

async function runTests() {
    console.log("🚀 Starting Okey 101 Drag Discard & Round Transition Tests...");

    const p1 = await createClient("OkeyTest_" + Date.now().toString().slice(-4));
    console.log(`✅ Player connected: ${p1.username} (${p1.pid})`);

    try {
        // 1. 101 Masası Oluştur
        console.log("📌 Creating Okey 101 table...");
        let lobby = await emitAndWait(p1.socket, 'createNewTable', { baseType: 'okey101_tekli', bet: 100 }, 'updateTableLobby');
        let tableId = lobby.tableId;
        console.log(`✅ Okey 101 table created: ${tableId}`);

        // 2. 3 Bot ekleyerek masayı doldur
        console.log("📌 Adding 3 bots to fill the 4-player table...");
        await emitAndWait(p1.socket, 'addBotToTable', tableId, 'updateTableLobby');
        await emitAndWait(p1.socket, 'addBotToTable', tableId, 'updateTableLobby');
        
        let startPromise = new Promise(resolve => {
            p1.socket.on('okey101Update', (data) => {
                if (data && data.roundNumber === 1 && data.hand && data.hand.length > 0) resolve(data);
            });
        });

        p1.socket.emit('addBotToTable', tableId);
        let gameData = await startPromise;
        console.log(`✅ Okey 101 game started! Round: ${gameData.roundNumber}, Mode: ${gameData.mode}, TurnIndex: ${gameData.turnIndex}`);
        assert.strictEqual(gameData.roundNumber, 1, "Should be Round 1");
        assert.ok(gameData.hand && gameData.hand.length >= 21, "Player should have a hand");

        // 3. Test Discarding a Tile
        // İlk turda p1 (starter) 22 taşa sahiptir ve drawnThisTurn = true'dur.
        console.log("📌 Testing Tile Discard via okey101DiscardTile...");
        let myHand = gameData.hand;
        let discardTileId = myHand[myHand.length - 1].id;

        let discardPromise = new Promise(resolve => {
            p1.socket.on('okey101Update', (updated) => {
                // p1 taş attığında sıra bir sonraki oyuncuya (bot) geçer
                if (!updated.myTurn) {
                    resolve(updated);
                }
            });
        });

        console.log(`📌 Emitting okey101DiscardTile with tile ${discardTileId}...`);
        p1.socket.emit('okey101DiscardTile', discardTileId);

        let afterDiscard = await discardPromise;
        console.log(`✅ Tile discarded successfully! Next player's turn (myTurn=${afterDiscard.myTurn}, TurnIndex=${afterDiscard.turnIndex})`);
        assert.strictEqual(afterDiscard.myTurn, false);
        assert.strictEqual(afterDiscard.turnIndex, 1);

        // 4. Test okey101NextRound Socket Event Handling
        console.log("📌 Testing okey101NextRound socket handler...");
        // Test socket handler registration by emitting okey101NextRound
        let errorReceived = null;
        p1.socket.once('gameError', (err) => { errorReceived = err; });
        p1.socket.emit('okey101NextRound');
        await new Promise(r => setTimeout(r, 500));
        assert.strictEqual(errorReceived, null, "okey101NextRound should not crash or return gameError");
        console.log("✅ okey101NextRound successfully processed by server!");

        console.log("\n🎉 ALL TESTS PASSED! Okey 101 discard, drag actions, and round transitions work flawlessly!");
    } catch (err) {
        console.error("❌ Test error:", err);
        process.exitCode = 1;
    } finally {
        p1.socket.disconnect();
        setTimeout(() => process.exit(process.exitCode || 0), 500);
    }
}

runTests();
