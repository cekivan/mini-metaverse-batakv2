const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log("=== OTURMA MEKANİĞİ & MODELLEME DOĞRULAMA TESTİ ===");

// main.js dosyasını oku ve ortam simülasyonu oluştur
const mainJsCode = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'main.js'), 'utf8');

// Global mock ortamı
const mockCanvas = {
    width: 800,
    height: 500,
    getContext: () => mockCtx,
    addEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 500 })
};

const mockCtx = {
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    ellipse: () => {},
    quadraticCurveTo: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    roundRect: () => {},
    measureText: () => ({ width: 40 }),
    fillText: () => {},
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1
};

const emittedEvents = [];
const mockSocket = {
    emit: (event, data) => {
        emittedEvents.push({ event, data });
    },
    on: () => {}
};

const sandbox = {
    window: {
        addEventListener: () => {},
        FURNITURE_CATALOG: {
            'sedir': { name: 'Sedir Koltuk', w: 84, h: 42 },
            'berjer': { name: 'Klasik Berjer', w: 46, h: 44 },
            'bilgisayar': { name: 'Çalışma Masası', w: 60, h: 46 },
            'piyano': { name: 'Kuyruklu Piyano', w: 72, h: 56 },
            'yemek_masasi': { name: 'Yemek Masası', w: 80, h: 50 }
        }
    },
    document: {
        getElementById: (id) => (id === 'gameCanvas' ? mockCanvas : { style: {}, innerText: '', classList: { remove: () => {} } }),
        createElement: () => mockCanvas,
        addEventListener: () => {},
        activeElement: { tagName: 'BODY' }
    },
    io: () => mockSocket,
    navigator: { vibrate: () => {} },
    canvas: mockCanvas,
    ctx: mockCtx,
    socket: mockSocket,
    Date: Date,
    Math: Math,
    console: console,
    clearInterval: clearInterval,
    setInterval: () => 1,
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout: clearTimeout,
    requestAnimationFrame: () => {}
};

// Test fonksiyonlarını sandbox içine yükle
const vm = require('vm');
vm.createContext(sandbox);

// main.js'i sandbox içinde çalıştır
try {
    vm.runInContext(mainJsCode, sandbox);
    console.log("✔ main.js başarıyla derlendi ve yüklendi.");
} catch (e) {
    console.error("main.js yükleme hatası:", e);
    process.exit(1);
}

// State ayar yardımcısı
function setGameState(opts) {
    let script = "";
    if (opts.currentRoom !== undefined) script += `currentRoom = ${JSON.stringify(opts.currentRoom)}; `;
    if (opts.myId !== undefined) script += `myId = ${JSON.stringify(opts.myId)}; `;
    if (opts.players !== undefined) script += `players = ${JSON.stringify(opts.players)}; `;
    if (opts.myFacing !== undefined) script += `myFacing = ${JSON.stringify(opts.myFacing)}; `;
    if (script) vm.runInContext(script, sandbox);
}

function getPlayer(id) {
    return vm.runInContext(`players[${JSON.stringify(id)}]`, sandbox);
}

// 1. TEST: Tıklama ile Oturma / Işınlanmanın KALDIRILDIĞININ Doğrulanması
console.log("\n--- TEST 1: Tıklama ile Işınlanma Engelleme Testi ---");
setGameState({
    currentRoom: "sokak",
    myId: "user1",
    players: {
        "user1": { x: 100, y: 100, facing: 'down', action: null, name: 'Ali' }
    }
});

// Sokak bankı (x: 292, y: 218) koordinatına tıklanıyor
sandbox.handleCanvasTapOrClick(292, 218);
assert.strictEqual(getPlayer("user1").action, null, "HATA: Banka tıklandığında oturmamalı!");
assert.strictEqual(getPlayer("user1").x, 100, "HATA: Banka tıklandığında oyuncu ışınlanmamalı!");
console.log("✔ Başarılı: Banka tıklandığında oyuncu oturmadı ve koordinatı değişmedi (ışınlanma yok).");

// 2. TEST: findNearestSittableSeat() Mesafeye Göre Koltuk Bulma Testi
console.log("\n--- TEST 2: Yakındaki Koltuğu Tespit Etme (findNearestSittableSeat) ---");
// Oyuncu banktan uzaktayken (100, 100)
let distantSeat = sandbox.findNearestSittableSeat();
assert.strictEqual(distantSeat, null, "HATA: Uzaktayken koltuk tespit edilmemeli!");
console.log("✔ Başarılı: Uzaktayken koltuk algılanmadı.");

// Oyuncu bankın yanına yaklaştığında (290, 225)
vm.runInContext(`players["user1"].x = 290; players["user1"].y = 225;`, sandbox);
let nearSeat = sandbox.findNearestSittableSeat();
assert.notStrictEqual(nearSeat, null, "HATA: Yakındayken bank tespit edilmeli!");
assert.strictEqual(nearSeat.label, 'Sokak Bankı');
assert.strictEqual(nearSeat.facing, 'down');
console.log(`✔ Başarılı: Yakındaki bank bulundu -> x: ${nearSeat.x}, y: ${nearSeat.y}, facing: ${nearSeat.facing}, mesafe: ${Math.round(nearSeat.dist)}px`);

// 3. TEST: E Harfi / triggerMobileInteract() ile Oturma Testi
console.log("\n--- TEST 3: E Harfi ile Oturma Dinamiği ---");
emittedEvents.length = 0;
sandbox.triggerMobileInteract();

let p = getPlayer("user1");
assert.strictEqual(p.action, 'sitting', "HATA: E tuşu ile oyuncu 'sitting' durumuna geçmeli!");
assert.strictEqual(p.x, 292, "HATA: Oyuncu bank koordinatına yerleşmeli!");
assert.strictEqual(p.y, 218, "HATA: Oyuncu bank koordinatına yerleşmeli!");
assert.strictEqual(p.facing, 'down');

// Socket eventlerini kontrol et
const sitActionEmitted = emittedEvents.some(e => e.event === 'playerAction' && e.data.action === 'sitting');
const sitMoveEmitted = emittedEvents.some(e => e.event === 'playerMovement' && e.data.x === 292);
assert.strictEqual(sitActionEmitted, true, "HATA: playerAction 'sitting' yayılmalı!");
assert.strictEqual(sitMoveEmitted, true, "HATA: playerMovement yeni oturma koordinatıyla yayılmalı!");
console.log("✔ Başarılı: E tuşuna basıldığında karakter 'sitting' durumuna geçti ve oturma koordinatına yerleşti.");

// 4. TEST: Otururken E Harfine Tekrar Basınca Ayağa Kalkma Testi
console.log("\n--- TEST 4: Otururken E Harfi ile Ayağa Kalkma ---");
emittedEvents.length = 0;
sandbox.triggerMobileInteract();

assert.strictEqual(getPlayer("user1").action, null, "HATA: Otururken E'ye basınca action null olmalı (ayağa kalkmalı)!");
const standActionEmitted = emittedEvents.some(e => e.event === 'playerAction' && e.data.action === 'stand');
assert.strictEqual(standActionEmitted, true, "HATA: playerAction 'stand' yayılmalı!");
console.log("✔ Başarılı: Otururken E tuşuna basıldığında karakter güvenle ayağa kalktı.");

// 5. TEST: Ev İçi Mobilyalarda (Sedir, Berjer) E Tuşu ile Oturma Testi
console.log("\n--- TEST 5: Ev İçi Mobilyalarda E Tuşu ile Oturma ---");
setGameState({ currentRoom: "house_owner1" });
sandbox.getCurrentViewingHouse = () => ({
    furniture: [
        { id: 'sedir', x: 300, y: 200, rotation: 0 },
        { id: 'berjer', x: 500, y: 250, rotation: 1 }
    ]
});

// Sedir yakınına git
vm.runInContext(`players["user1"].x = 300; players["user1"].y = 220; players["user1"].action = null;`, sandbox);

let houseSeat = sandbox.findNearestSittableSeat();
assert.notStrictEqual(houseSeat, null, "HATA: Sedir tespit edilmeli!");
assert.strictEqual(houseSeat.label, 'Sedir');

// E tuşuna bas
sandbox.triggerMobileInteract();
assert.strictEqual(getPlayer("user1").action, 'sitting');
assert.strictEqual(getPlayer("user1").facing, 'down');
console.log("✔ Başarılı: Evdeki sedirin yanına gidip E tuşuna basılınca oturuldu.");

// WASD tuşuna basarak kalkma
sandbox.standUpIfSitting('down');
assert.strictEqual(getPlayer("user1").action, null);
console.log("✔ Başarılı: Hareket edildiğinde otomatik ayağa kalkıldı.");

// 6. TEST: Karakter Modellemesi ve Çizim Fonksiyonlarının Hata Vermemesi
console.log("\n--- TEST 6: Ayak Ayak Üstüne Atmış Karakter Çizim Testi ---");
const facings = ['down', 'right', 'left', 'up'];
facings.forEach(facing => {
    vm.runInContext(`players["user1"].action = 'sitting'; players["user1"].facing = '${facing}'; myFacing = '${facing}';`, sandbox);
    
    // drawAnimatedPlayer çağrısı
    assert.doesNotThrow(() => {
        sandbox.drawAnimatedPlayer(getPlayer("user1"), "user1");
    }, `HATA: facing '${facing}' için drawAnimatedPlayer hata verdi!`);
    
    // drawAvatarLegsAndShoes çağrısı
    assert.doesNotThrow(() => {
        sandbox.drawAvatarLegsAndShoes(mockCtx, 300, 200, 0, "#ffd1a4", "sneakers", false, true, facing);
    }, `HATA: facing '${facing}' için drawAvatarLegsAndShoes hata verdi!`);
});
console.log("✔ Başarılı: Tüm 4 yönde ('down', 'right', 'left', 'up') ayak ayak üstüne atma ve kol modellemeleri hatasız çizildi.");

console.log("\n========================================================");
console.log("🎉 TÜM OTURMA VE MODELLEME TESTLERİ EKSİKSİZ GEÇTİ! 🎉");
console.log("========================================================");
process.exit(0);
