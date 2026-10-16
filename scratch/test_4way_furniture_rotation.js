const io = require("socket.io-client");
const assert = require("assert");

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

async function test4WayRotation() {
    console.log("=== SANALİKA TARZI 4 YÖNLÜ MOBİLYA DÖNDÜRME TESTİ ===");
    const testUser = "user_rot_" + Math.floor(Math.random() * 9000 + 1000);
    const client = await createClient(testUser);
    const socket = client.socket;
    console.log(`✅ ${testUser} ile giriş yapıldı. Bakiye: ${client.currentMoney}`);

    // Ev satın al
    await new Promise((resolve) => {
        socket.emit("buyHouse", "standart");
        socket.once("housesUpdate", resolve);
    });
    console.log("✅ Standart ev satın alındı.");

    socket.on('gameError', (msg) => {
        console.error("SERVER GAME ERROR:", msg);
    });

    // Mobilya satın al: meyve_arabasi (490 TL, bakiye: 750 TL)
    await new Promise((resolve, reject) => {
        socket.once("furnitureBuySuccess", resolve);
        socket.once("gameError", reject);
        socket.emit("buyFurniture", "meyve_arabasi");
    });
    console.log("✅ 'meyve_arabasi' (Sanalika Organik Meyve & Limonata Arabası) marketten satın alındı.");

    // Eve gir
    await new Promise((resolve) => {
        let roomName = `house_${testUser}_standart`;
        socket.once("houseDataUpdate", resolve);
        socket.emit("changeRoom", roomName);
    });
    console.log("✅ Eve girildi.");

    // Eşya yerleştir (meyve_arabasi)
    await new Promise((resolve) => {
        socket.emit("placeFurniture", { itemId: "meyve_arabasi", x: 400, y: 320 });
        socket.once("houseFurnitureSync", resolve);
    });
    console.log("✅ 'meyve_arabasi' odaya yerleştirildi (Başlangıç rotasyonu 0).");

    // Şimdi eşyayı 4 kere sırayla döndür ve 0 -> 1 -> 2 -> 3 -> 0 döngüsünü doğrula!
    for (let step = 1; step <= 4; step++) {
        let expectedRot = step % 4;
        let syncedFurniture = await new Promise((resolve) => {
            socket.emit("rotateFurniture", { index: 0 });
            socket.once("houseFurnitureSync", resolve);
        });

        assert.strictEqual(
            syncedFurniture[0].rotation,
            expectedRot,
            `Döndürme hatası: Beklenen rotasyon ${expectedRot}, gelen ${syncedFurniture[0].rotation}`
        );
        console.log(`✅ Adım ${step}: Mobilya açısı ${expectedRot * 90}° (rotation: ${expectedRot}) olarak başarıyla güncellendi.`);
    }

    // Meyve arabasını doğrudan 90° (rotation 1: %100 Organik Kara Tahta önde) döndür
    let synced2 = await new Promise((resolve) => {
        socket.emit("rotateFurniture", { index: 0, rotation: 1 });
        socket.once("houseFurnitureSync", resolve);
    });
    assert.strictEqual(synced2[0].rotation, 1);
    console.log("✅ 'meyve_arabasi' 90° açısına (rotation 1) döndürüldü.");

    // Meyve arabasını 180° (rotation 2) döndür
    let synced3 = await new Promise((resolve) => {
        socket.emit("rotateFurniture", { index: 0, rotation: 2 });
        socket.once("houseFurnitureSync", resolve);
    });
    assert.strictEqual(synced3[0].rotation, 2);
    console.log("✅ 'meyve_arabasi' 180° açısına (rotation 2) döndürüldü.");

    // Meyve arabasını 270° (rotation 3) döndür
    let synced4 = await new Promise((resolve) => {
        socket.emit("rotateFurniture", { index: 0, rotation: 3 });
        socket.once("houseFurnitureSync", resolve);
    });
    assert.strictEqual(synced4[0].rotation, 3);
    console.log("✅ 'meyve_arabasi' 270° açısına (rotation 3) döndürüldü.");

    // Sürükle ve bırak ile konumu kaydederken rotasyonun korunduğunu doğrula
    let movedSync = await new Promise((resolve) => {
        socket.emit("moveFurniture", { index: 0, x: 460, y: 340, rotation: 3 });
        socket.once("houseFurnitureSync", resolve);
    });
    assert.strictEqual(movedSync[0].rotation, 3);
    assert.strictEqual(movedSync[0].x, 460);
    assert.strictEqual(movedSync[0].y, 340);
    console.log("✅ 'moveFurniture' işlemi rotasyonu koruyarak yeni konuma taşıdı.");

    socket.disconnect();
    console.log("🎉 SANALİKA TARZI 4 YÖNLÜ MOBİLYA DÖNDÜRME %100 BAŞARIYLA GEÇTİ!");
    process.exit(0);
}

test4WayRotation().catch((err) => {
    console.error("❌ Test hatası:", err);
    process.exit(1);
});
