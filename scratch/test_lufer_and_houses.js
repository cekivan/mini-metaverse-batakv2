// scratch/test_lufer_and_houses.js
const assert = require('assert');
const config = require('../src/config');
const io = require('c:/Users/WIN11/Desktop/Project01 - Kopya/node_modules/socket.io-client');

console.log("🚀 Testing Lüfer Fish (8 TL) & Halved House Prices...");

// 1. Verify config.HOUSE_PRICES
console.log("📌 Checking config.HOUSE_PRICES...");
assert.strictEqual(config.HOUSE_PRICES.standart, 1250, "Standart house price should be 1250 TL");
assert.strictEqual(config.HOUSE_PRICES.garden, 2500, "Garden house price should be 2500 TL");
assert.strictEqual(config.HOUSE_PRICES.pool, 3750, "Pool house price should be 3750 TL");
console.log("✅ House prices halved in config.js: Standart: 1250 TL, Garden: 2500 TL, Pool: 3750 TL");

// 2. Verify FISH_LOOT_TABLE has Lüfer with value 8
console.log("📌 Checking FISH_LOOT_TABLE for Lüfer...");
let luferCoast = config.FISH_LOOT_TABLE.find(f => f.id === 'lufer');
assert.ok(luferCoast, "Lüfer must exist in FISH_LOOT_TABLE");
assert.strictEqual(luferCoast.value, 8, "Lüfer price must be 8 TL");
console.log(`✅ Lüfer found in coastal fishing: ${luferCoast.name} (${luferCoast.emoji}) -> ${luferCoast.value} TL`);

// 3. Verify SWAN_BOAT_LOOT_TABLE has Lüfer with value 8
console.log("📌 Checking SWAN_BOAT_LOOT_TABLE for Lüfer...");
let luferSwan = config.SWAN_BOAT_LOOT_TABLE.find(f => f.id === 'lufer');
assert.ok(luferSwan, "Lüfer must exist in SWAN_BOAT_LOOT_TABLE");
assert.strictEqual(luferSwan.value, 8, "Lüfer price in swan boat must be 8 TL");
console.log(`✅ Lüfer found in open sea fishing: ${luferSwan.name} (${luferSwan.emoji}) -> ${luferSwan.value} TL`);

// 4. Test socket connection & buying a house at new price
const SERVER_URL = 'http://localhost:3000';

function testSocketPurchase() {
    return new Promise((resolve, reject) => {
        const username = "HouseBuyer_" + Date.now().toString().slice(-4);
        const socket = io(SERVER_URL, {
            transports: ['websocket'],
            forceNew: true
        });

        socket.on('connect', () => {
            socket.emit('register', { name: username, pass: '123456', gender: 'male' });
        });

        socket.on('loginSuccess', (userData) => {
            // Initial money is 2000
            let startMoney = userData.money;
            console.log(`✅ ${username} registered with ${startMoney} TL`);

            socket.once('moneyUpdate', (newMoney) => {
                let diff = startMoney - newMoney;
                console.log(`✅ House purchased! Spent: ${diff} TL, Remaining: ${newMoney} TL`);
                assert.strictEqual(diff, 1250, "Standart house should cost exactly 1250 TL");
                socket.disconnect();
                resolve();
            });

            socket.emit('buyHouse', 'standart');
        });

        socket.on('gameError', (err) => {
            reject(new Error(err));
        });

        setTimeout(() => reject(new Error("Timeout socket test")), 5000);
    });
}

testSocketPurchase()
    .then(() => {
        console.log("\n🎉 ALL TESTS PASSED! Lüfer (8 TL) and halved house prices verified successfully!");
        process.exit(0);
    })
    .catch((err) => {
        console.error("❌ Test error:", err);
        process.exit(1);
    });
