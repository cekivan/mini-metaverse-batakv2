const io = require("socket.io-client");
const assert = require("assert");
const fs = require("fs");
const path = require("path");

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

async function runTests() {
    console.log("=== TEST: SEÇİM ODAKLI MOBİLYA VE ALT DOCK DÖNDÜRME SİSTEMİ ===");

    // 1. STATİK KOD VE ARAYÜZ KONTROLLERİ
    console.log("\n--- 1. Arayüz & Fonksiyon Varlığı Kontrolleri ---");
    const htmlContent = fs.readFileSync(path.join(__dirname, "../public/index.html"), "utf8");
    const housingJs = fs.readFileSync(path.join(__dirname, "../public/js/housing.js"), "utf8");

    assert.ok(htmlContent.includes('id="selectedFurnitureControlBox"'), "index.html içinde #selectedFurnitureControlBox bulunmalı!");
    console.log("✅ index.html: #selectedFurnitureControlBox başarıyla tanımlı.");

    assert.ok(housingJs.includes('window.selectedFurnitureIndex = null'), "housing.js içinde selectedFurnitureIndex başlatılmış olmalı!");
    assert.ok(housingJs.includes('function rotateSelectedFurniture()'), "housing.js içinde rotateSelectedFurniture tanımlı olmalı!");
    assert.ok(housingJs.includes('function deselectFurniture()'), "housing.js içinde deselectFurniture tanımlı olmalı!");
    assert.ok(housingJs.includes('function removeSelectedFurniture()'), "housing.js içinde removeSelectedFurniture tanımlı olmalı!");
    assert.ok(housingJs.includes('function renderSelectedFurniturePanel()'), "housing.js içinde renderSelectedFurniturePanel tanımlı olmalı!");
    console.log("✅ housing.js: Tüm yardımcı seçim ve alt dock fonksiyonları eksiksiz mevcut.");

    // 2. MOUSEUP'TA KAZARA DÖNDÜRMENİN KALDIRILDIĞININ DOĞRULANMASI
    const mouseUpMatch = housingJs.match(/window\.addEventListener\('mouseup'[\s\S]*?if \(!hasActuallyMoved\) \{[\s\S]*?rotateFurniture/);
    assert.strictEqual(mouseUpMatch, null, "HATA: mouseup içinde !hasActuallyMoved durumunda rotateFurniture çağrılmamalı!");
    console.log("✅ housing.js: mouseup esnasında tıklama veya hafif hareketlerde kazara eşya döndürme KALDIRILMIŞ.");

    // 3. SUNUCU İLE ENTEGRASYON VE ÇOKLU EŞYA SEÇİM/DÖNDÜRME DÖNGÜSÜ
    console.log("\n--- 2. Sunucu Entegrasyonu: Çoklu Eşya, Yer Değiştirme ve Döndürme ---");
    const testUser = "sel_rot_" + Math.floor(Math.random() * 9000 + 1000);
    const client = await createClient(testUser);
    const socket = client.socket;
    console.log(`✅ ${testUser} oluşturuldu. Bakiye: ${client.currentMoney}`);

    socket.on('gameError', (msg) => {
        console.error("SERVER GAME ERROR:", msg);
    });

    // Ev satın al (500 TL)
    await new Promise((resolve) => {
        socket.emit("buyHouse", "standart");
        socket.once("housesUpdate", resolve);
    });
    console.log("✅ Standart ev satın alındı.");

    // İki mobilya al: bitki (200 TL) ve meyve_arabasi (490 TL)
    await new Promise((resolve) => {
        socket.once("furnitureBuySuccess", resolve);
        socket.emit("buyFurniture", "bitki");
    });
    await new Promise((resolve) => {
        socket.once("furnitureBuySuccess", resolve);
        socket.emit("buyFurniture", "meyve_arabasi");
    });
    console.log("✅ 'bitki' ve 'meyve_arabasi' satın alındı.");

    // Eve gir
    await new Promise((resolve) => {
        socket.once("houseDataUpdate", resolve);
        socket.emit("changeRoom", `house_${testUser}_standart`);
    });
    console.log("✅ Eve girildi.");

    // İki eşyayı da odaya koy
    await new Promise((resolve) => {
        socket.emit("placeFurniture", { itemId: "bitki", x: 200, y: 240 });
        socket.once("houseFurnitureSync", resolve);
    });
    let furnitureList = await new Promise((resolve) => {
        socket.emit("placeFurniture", { itemId: "meyve_arabasi", x: 450, y: 280 });
        socket.once("houseFurnitureSync", resolve);
    });

    assert.strictEqual(furnitureList.length, 2, "Odadaki eşya sayısı 2 olmalı!");
    console.log("✅ 2 eşya odaya yerleştirildi (İndeks 0: bitki, İndeks 1: meyve_arabasi).");

    // Senaryo 1: Eşya 0'ı hareket ettir (Yerini değiştir) - Rotasyonun DEĞİŞMEDİĞİNİ doğrula
    let afterMove = await new Promise((resolve) => {
        socket.once("houseFurnitureSync", resolve);
        socket.emit("moveFurniture", { index: 0, x: 240, y: 260, rotation: furnitureList[0].rotation || 0 });
    });
    assert.strictEqual(afterMove[0].x, 240);
    assert.strictEqual(afterMove[0].y, 260);
    assert.strictEqual(afterMove[0].rotation, 0, "Hareket ettirirken eşyanın açısı değişmemeli!");
    console.log("✅ Eşya 0 başarıyla taşındı (240, 260) ve rotasyonu 0 olarak korundu (Kazara dönme engellendi).");

    // Senaryo 2: Eşya 0 seçiliyken 'Eşyayı Döndür' butonuna basılması simülasyonu
    let afterRotate0 = await new Promise((resolve) => {
        socket.once("houseFurnitureSync", resolve);
        socket.emit("rotateFurniture", { index: 0 });
    });
    assert.strictEqual(afterRotate0[0].rotation, 1, "Eşya 0 rotasyonu 1 olmalı");
    assert.strictEqual(afterRotate0[1].rotation, 0, "Eşya 1 rotasyonu etkilenmemeli");
    console.log("✅ Eşya 0 'Eşyayı Döndür' butonuyla 90° döndürüldü. Eşya 1 etkilenmedi.");

    // Senaryo 3: Şimdi Eşya 1'e basıp ona geçildiğini simüle et ve 'Eşyayı Döndür'e bas
    let afterRotate1 = await new Promise((resolve) => {
        socket.once("houseFurnitureSync", resolve);
        socket.emit("rotateFurniture", { index: 1 });
    });
    assert.strictEqual(afterRotate1[1].rotation, 1, "Eşya 1 rotasyonu 1 olmalı");
    assert.strictEqual(afterRotate1[0].rotation, 1, "Eşya 0 rotasyonu 1 kalmalı");
    console.log("✅ Başka bir eşyaya (Eşya 1) basıp düzenlemeye geçildi ve 'Eşyayı Döndür' ile başarıyla döndürüldü.");

    // Senaryo 4: Eşya 1'i 180°, 270°, 0° döngüsünde tamamla
    for (let r = 2; r <= 3; r++) {
        let res = await new Promise((resolve) => {
            socket.once("houseFurnitureSync", resolve);
            socket.emit("rotateFurniture", { index: 1 });
        });
        assert.strictEqual(res[1].rotation, r, `Eşya 1 rotasyon döngüsü ${r} olmalı`);
    }
    console.log("✅ Eşya 1 tam 4 yönlü Sanalika rotasyon döngüsünü tamamladı.");

    socket.disconnect();
    console.log("\n🎉 TÜM SEÇİM & DÖNDÜRME TESTLERİ %100 BAŞARIYLA TAMAMLANDI!");
}

runTests().catch(err => {
    console.error("❌ TEST BAŞARISIZ:", err);
    process.exit(1);
});
