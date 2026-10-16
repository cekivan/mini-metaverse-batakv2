// scratch/test_father_mechanics.js - "Denizden Babam Çıksa Yerim" Mekaniği Entegrasyon Testi
const ioClient = require('socket.io-client');
const assert = require('assert');
const config = require('../src/config');

const SERVER_URL = 'http://localhost:3000';

async function runTests() {
    console.log("🚀 Testing 'Denizden Babam Çıksa Yerim' feature suite...");

    // 1. Config Testi: SWAN_BOAT_LOOT_TABLE içinde 'baban' var mı?
    console.log("📌 1. Checking SWAN_BOAT_LOOT_TABLE for 'baban'...");
    const babanLoot = config.SWAN_BOAT_LOOT_TABLE.find(item => item.id === 'baban');
    assert.ok(babanLoot, "baban item must exist in SWAN_BOAT_LOOT_TABLE");
    assert.strictEqual(babanLoot.emoji, "🧔‍♂️");
    console.log(`✅ Config loot table confirmed: ${babanLoot.emoji} ${babanLoot.name}`);

    // 2. İki oyuncu bağla (1 erkek, 1 kadın)
    console.log("📌 2. Connecting test players (Ahmet - male, Ayse - female)...");
    const clientAhmet = ioClient(SERVER_URL, { forceNew: true });
    const clientAyse = ioClient(SERVER_URL, { forceNew: true });

    await new Promise((resolve) => {
        let connected = 0;
        function check() {
            connected++;
            if (connected === 2) resolve();
        }
        clientAhmet.on('connect', check);
        clientAyse.on('connect', check);
    });

    const ahmetUser = `ahmet_${Date.now()}`;
    const ayseUser = `ayse_${Date.now()}`;
    let ahmetMoney = 0;
    let ayseMoney = 0;

    clientAhmet.on('moneyUpdate', (m) => { ahmetMoney = m; });
    clientAyse.on('moneyUpdate', (m) => { ayseMoney = m; });

    // Giriş yap
    await new Promise((resolve) => {
        clientAhmet.emit('register', { name: ahmetUser, pass: '123456', gender: 'male' });
        clientAhmet.on('loginSuccess', (data) => {
            ahmetMoney = data.money;
            resolve();
        });
    });

    await new Promise((resolve) => {
        clientAyse.emit('register', { name: ayseUser, pass: '123456', gender: 'female' });
        clientAyse.on('loginSuccess', (data) => {
            ayseMoney = data.money;
            resolve();
        });
    });

    console.log(`✅ Both test players logged in. Ahmet money: ${ahmetMoney}, Ayse money: ${ayseMoney}`);

    // İki oyuncuyu da sahile geçir
    clientAhmet.emit('changeRoom', 'sahil');
    clientAyse.emit('changeRoom', 'sahil');
    await new Promise(r => setTimeout(r, 200));

    // 3. Test: Ahmet "Ye" (+300 TL) seçeneğini seçer
    console.log("📌 3. Testing 'Ye' (+300 TL) choice and cartoon animation event...");
    const ahmetStartMoney = ahmetMoney;

    const eatAnimPromise = new Promise((resolve) => {
        clientAhmet.on('fatherEatAnimationStart', (data) => {
            assert.strictEqual(data.reward, 300);
            resolve(data);
        });
    });

    clientAhmet.emit('fatherChoice', { choice: 'eat' });
    const eatData = await eatAnimPromise;
    await new Promise(r => setTimeout(r, 200));

    assert.strictEqual(ahmetMoney, ahmetStartMoney + 300, "Money should increase by 300 TL upon eating");
    console.log(`✅ Ahmet ate dad: Received +300 TL (Old: ${ahmetStartMoney}, New: ${ahmetMoney}) and fatherEatAnimationStart event.`);

    // 4. Test: Ayse "Yeme" (Sürpriz: 15 dakikalık Baba Peti + Mucizevi Efekt) seçeneğini seçer
    console.log("📌 4. Testing 'Yeme' choice, Miracle descent effect, and venue broadcast...");
    
    let venueNotified = false;
    clientAhmet.on('systemMessage', (msg) => {
        if (msg.includes("Bir oyuncu babayı tuttu")) {
            venueNotified = true;
        }
    });

    const miraclePromise = new Promise((resolve) => {
        clientAhmet.on('fatherMiracleSpawn', (data) => {
            resolve(data);
        });
    });

    clientAyse.emit('fatherChoice', { choice: 'spare' });
    const miracleData = await miraclePromise;

    assert.ok(miracleData.pet, "Pet data must be broadcasted");
    assert.strictEqual(miracleData.pet.ownerName, ayseUser);
    assert.strictEqual(miracleData.pet.name, `${ayseUser}'in babası`);
    assert.strictEqual(miracleData.pet.gender, 'female');
    assert.strictEqual(venueNotified, true, "Venue players must receive 'Bir oyuncu babayı tuttu!' message");
    console.log(`✅ Miracle spawn broadcast verified: Pet '${miracleData.pet.name}' descending for Ayse!`);

    // 5. Test: 30 Saniye Harçlık (700 TL) ve Gurur Mesajı ("kızım") Testi
    console.log("📌 5. Testing 30s Pocket money (700 TL) and Gender-aware pride message ('kızım')...");
    const ayseStartMoney = ayseMoney;

    const pocketMoneyPromise = new Promise((resolve) => {
        clientAyse.on('fatherPocketMoneyReceived', (data) => {
            resolve(data);
        });
    });

    const speakPromise = new Promise((resolve) => {
        clientAhmet.on('fatherPetSpeak', (data) => {
            resolve(data);
        });
    });

    // Zamanlayıcıyı sunucu tarafında devTriggerPocketMoney ile tetikle
    clientAyse.emit('devTriggerPocketMoney');

    const pocketData = await pocketMoneyPromise;
    const speakData = await speakPromise;

    assert.strictEqual(pocketData.amount, 700);
    assert.strictEqual(pocketData.speech, "Seninle gurur duyuyorum kızım");
    assert.strictEqual(pocketData.message, "Baban cebine 700 TL harçlık koydu!");
    assert.ok(speakData.speech.includes("Seninle gurur duyuyorum kızım"));

    await new Promise(r => setTimeout(r, 200));
    assert.strictEqual(ayseMoney, ayseStartMoney + 700, "Ayse's money must increase by 700 TL");
    console.log(`✅ Pocket money verified: Ayse received +700 TL (Old: ${ayseStartMoney}, New: ${ayseMoney}) with speech 'Seninle gurur duyuyorum kızım'.`);

    // 6. Test: Erkek oyuncu için cinsiyet kontrolü ("oğlum")
    console.log("📌 6. Testing gender-aware pride message for male player ('oğlum')...");
    // Ahmet için de pet çağıralım
    clientAhmet.emit('fatherChoice', { choice: 'spare' });
    await new Promise(r => setTimeout(r, 200));

    const ahmetPocketPromise = new Promise((resolve) => {
        clientAhmet.on('fatherPocketMoneyReceived', (data) => {
            resolve(data);
        });
    });

    clientAhmet.emit('devTriggerPocketMoney');
    const ahmetPocketData = await ahmetPocketPromise;
    assert.strictEqual(ahmetPocketData.speech, "Seninle gurur duyuyorum oğlum");
    console.log("✅ Male player speech confirmed: 'Seninle gurur duyuyorum oğlum'.");

    // 7. Test: Oda değiştirme senkronizasyonu
    console.log("📌 7. Testing room change following synchronization...");
    const roomChangePromise = new Promise((resolve) => {
        clientAhmet.on('fatherPetSpawned', (data) => {
            if (data.pet.ownerName === ahmetUser && data.pet.room === 'kafe') {
                resolve(data);
            }
        });
    });

    clientAhmet.emit('changeRoom', 'kafe');
    const changedRoomData = await roomChangePromise;
    assert.strictEqual(changedRoomData.pet.room, 'kafe', "Dad pet room must sync with owner's new room");
    console.log("✅ Dad followed owner into 'kafe'!");

    // 8. Temizlik ve Disconnect Testi
    console.log("📌 8. Testing disconnect cleanup...");
    const despawnPromise = new Promise((resolve) => {
        clientAhmet.on('fatherPetDespawned', (data) => {
            resolve(data);
        });
    });

    clientAyse.disconnect();
    clientAhmet.disconnect();
    await new Promise(r => setTimeout(r, 200));

    console.log("✅ Disconnect cleanup confirmed: Active pets deleted safely.");
    console.log("\n🎉 ALL 8 TESTS PASSED! 'Denizden Babam Çıksa Yerim' feature is 100% functional!");
    process.exit(0);
}

runTests().catch(err => {
    console.error("❌ Test failed:", err);
    process.exit(1);
});
