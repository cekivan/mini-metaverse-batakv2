// scratch/test_haydar_lounge.js
const io = require('socket.io-client');
const assert = require('assert');

const SERVER_URL = 'http://localhost:3000';

async function runTest() {
    console.log("=== NARGİLE LOUNGE & GARSON HAYDAR ENTEGRASYON TESTİ BAŞLIYOR ===");

    const client = io(SERVER_URL, { reconnection: false, timeout: 5000 });

    await new Promise((resolve, reject) => {
        client.on('connect', resolve);
        client.on('connect_error', reject);
    });
    console.log("1. Sunucuya bağlandı, socket ID:", client.id);

    let latestLoungeState = null;
    client.on('nargile_lounge_state_update', (st) => {
        latestLoungeState = st;
        console.log("   [State Update Received]:", JSON.stringify(st, null, 2));
    });

    let garsonServiceEvent = null;
    client.on('garson_haydar_service', (data) => {
        garsonServiceEvent = data;
        console.log("   -> Garson Haydar Servis Eventi Geldi:", data);
    });

    let openedMenuEvent = null;
    client.on('open_nargile_menu', (data) => {
        openedMenuEvent = data;
        console.log("   -> Nargile Menüsü Açıldı:", data);
    });

    let orderSuccessEvent = null;
    client.on('lounge_order_success', (data) => {
        orderSuccessEvent = data;
        console.log("   -> Sipariş Başarılı Bildirimi:", data);
    });

    let loungeErrorEvent = null;
    client.on('lounge_error', (msg) => {
        loungeErrorEvent = msg;
        console.log("   -> Lounge Uyarısı / Engelleme:", msg);
    });

    // Giriş yap
    const testUsername = "haydar_tester_" + Math.floor(Math.random() * 10000);
    await new Promise((resolve) => {
        client.once('loginSuccess', resolve);
        client.emit('login', { username: testUsername, role: 'player' });
    });
    console.log("   -> loginSuccess alındı.");

    // Nargile kafeye geç
    client.emit('changeRoom', 'nargile_cafe');
    await new Promise(r => setTimeout(r, 500));

    // 2. Sol Üst Locaya Oturma Testi
    console.log("\n2. Sol Üst Loca Koltuğuna Oturuluyor (lounge_sol, seatIndex: 0)...");
    await new Promise((resolve) => {
        client.emit('nargile_sit_table', { tableId: 'lounge_sol', seatIndex: 0 }, resolve);
    });
    await new Promise(r => setTimeout(r, 600));

    console.log("   Current latestLoungeState:", latestLoungeState);

    assert(openedMenuEvent, "Locaya oturunca menü açılmalıydı!");
    assert.strictEqual(openedMenuEvent.tableId, 'lounge_sol', "Masa ID lounge_sol olmalı!");
    assert(latestLoungeState && latestLoungeState.lounge_sol, "latestLoungeState.lounge_sol tanımlı olmalı!");
    assert(latestLoungeState.lounge_sol.seatedPlayers[client.id], "Oyuncu sol locaya oturmuş görünmeli!");
    console.log("✅ Sol Üst Locaya oturma ve menü açılması başarılı.");

    // 3. Masada 101 masasının temiz olduğunu teyit et
    assert(!latestLoungeState.okey101_tekli, "101 tekli masasında nargile verisi olmamalı!");
    assert(!latestLoungeState.okey101, "101 eşli masasında nargile verisi olmamalı!");
    console.log("✅ 101 masalarında nargile bulunmadığı doğrulandı (101 masaları temiz!).");

    // 4. Garson Haydar'dan Ortak Nargile Siparişi Testi
    console.log("\n4. Sol Loca için Ortak Nargile Siparişi veriliyor...");
    garsonServiceEvent = null;
    orderSuccessEvent = null;
    await new Promise((resolve) => {
        client.emit('nargile_order_item', { tableId: 'lounge_sol', item: 'nargile' }, resolve);
    });
    await new Promise(r => setTimeout(r, 600));

    assert(latestLoungeState.lounge_sol.hasNargile, "Sol locada aktif nargile görünmeli!");
    assert(garsonServiceEvent, "Garson Haydar servis animasyonu tetiklenmeli!");
    assert.strictEqual(garsonServiceEvent.tableId, 'lounge_sol', "Haydar'ın hedefi lounge_sol olmalı!");
    assert.strictEqual(garsonServiceEvent.serviceType, 'serving_nargile', "Servis tipi serving_nargile olmalı!");
    console.log("✅ Garson Haydar'ın Sol Loca sehpasına nargile servisi başarıyla tetiklendi.");

    // 5. İkinci Nargile Siparişi Engelleme Testi (Masada zaten nargile var)
    console.log("\n5. Aynı masaya 2. kez nargile sipariş edilmeye çalışılıyor...");
    loungeErrorEvent = null;
    await new Promise((resolve) => {
        client.emit('nargile_order_item', { tableId: 'lounge_sol', item: 'nargile' }, resolve);
    });
    await new Promise(r => setTimeout(r, 400));

    assert(loungeErrorEvent && loungeErrorEvent.includes("zaten aktif bir nargile var"), "2. nargile engellenmeliydi!");
    console.log("✅ İkinci nargile siparişi başarıyla engellendi: " + loungeErrorEvent);

    // 6. Sol Locaya Meyve Tabağı Siparişi Testi
    console.log("\n6. Sol Loca için Buzlu Meyve Tabağı Siparişi veriliyor...");
    garsonServiceEvent = null;
    await new Promise((resolve) => {
        client.emit('nargile_order_item', { tableId: 'lounge_sol', item: 'fruit' }, resolve);
    });
    await new Promise(r => setTimeout(r, 600));

    assert(latestLoungeState.lounge_sol.hasFruit, "Sol locada meyve tabağı aktif olmalı!");
    assert(garsonServiceEvent, "Garson Haydar meyve servisini başlatmalı!");
    assert.strictEqual(garsonServiceEvent.serviceType, 'serving_fruit', "Servis tipi serving_fruit olmalı!");
    console.log("✅ Garson Haydar'ın Sol Locaya meyve tabağı servisi başarıyla tetiklendi.");

    // 7. İkinci Meyve Tabağı Engelleme Testi
    console.log("\n7. Aynı masaya 2. kez meyve tabağı sipariş edilmeye çalışılıyor...");
    loungeErrorEvent = null;
    await new Promise((resolve) => {
        client.emit('nargile_order_item', { tableId: 'lounge_sol', item: 'fruit' }, resolve);
    });
    await new Promise(r => setTimeout(r, 400));

    assert(loungeErrorEvent && loungeErrorEvent.includes("zaten bir meyve tabağı var"), "2. meyve tabağı engellenmeliydi!");
    console.log("✅ İkinci meyve tabağı engellemesi doğrulandı: " + loungeErrorEvent);

    // 8. Sağ Locaya Oturma ve Sipariş Testi (lounge_sag)
    console.log("\n8. Sağ Üst Locaya Geçiliyor (lounge_sag)...");
    openedMenuEvent = null;
    await new Promise((resolve) => {
        client.emit('nargile_sit_table', { tableId: 'lounge_sag', seatIndex: 1 }, resolve);
    });
    await new Promise(r => setTimeout(r, 400));

    assert.strictEqual(openedMenuEvent.tableId, 'lounge_sag', "Sağ locada menü lounge_sag olarak açılmalı!");
    garsonServiceEvent = null;
    await new Promise((resolve) => {
        client.emit('nargile_order_item', { tableId: 'lounge_sag', item: 'nargile' }, resolve);
    });
    await new Promise(r => setTimeout(r, 600));

    assert(latestLoungeState.lounge_sag.hasNargile, "Sağ locada nargile aktif olmalı!");
    assert.strictEqual(garsonServiceEvent.tableId, 'lounge_sag', "Garson Haydar sağ locaya yönelmeli!");
    console.log("✅ Sağ Üst Loca servisi ve Garson Haydar yönelimi başarıyla doğrulandı.");

    client.disconnect();
    console.log("\n🎉 TÜM TESTLER BAŞARIYLA GEÇTİ! 🎉");
    process.exit(0);
}

runTest().catch((err) => {
    console.error("❌ TEST BAŞARISIZ:", err);
    process.exit(1);
});
