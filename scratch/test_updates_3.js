// scratch/test_updates_3.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { io } = require(path.join(process.cwd(), 'node_modules/socket.io-client'));

async function testAll() {
    console.log("=== YENİ GÜNCELLEMELERİN DOĞRULAMA TESTİ BAŞLIYOR ===\n");

    // 1. NARGILE TESTİ: SOKET BAĞLANTISI VE 20. FIRT PARAMETRELERİ
    console.log("--- 1. Nargile 20. Fırt ve Duman Süresi Doğrulaması ---");
    const socket = io('http://localhost:3000', {
        transports: ['websocket'],
        forceNew: true
    });

    await new Promise((resolve) => socket.on('connect', resolve));
    console.log("✓ Socket sunucuya bağlandı.");

    const testUser = "smoke_t_" + Math.floor(Math.random() * 10000);
    socket.emit('register', { name: testUser, pass: "123456", gender: 'male' });
    await new Promise((resolve) => socket.on('loginSuccess', resolve));
    console.log("✓ Giriş yapıldı:", testUser);

    socket.emit('changeRoom', 'nargile_cafe');
    await new Promise(r => setTimeout(r, 400));

    // Masaya otur
    await new Promise((resolve) => {
        socket.emit('nargile_sit_table', { tableId: 'lounge_sol', seatIndex: 0 }, (res) => {
            assert(res && res.success, "Masaya oturma başarılı olmalı");
            resolve();
        });
    });
    console.log("✓ Masaya oturuldu.");

    // Nargile siparişi ver
    await new Promise((resolve) => {
        socket.emit('nargile_order_item', { tableId: 'lounge_sol', item: 'nargile' }, (res) => {
            assert(res && res.success, "Nargile siparişi başarılı olmalı");
            resolve();
        });
    });
    console.log("✓ Nargile siparişi verildi.");

    // 20. fırt için smoke event dinleyicisi
    let smokeBlastPromise = new Promise((resolve) => {
        socket.on('nargile_dense_smoke_blast', (data) => {
            resolve(data);
        });
    });

    // 20 fırt çek
    console.log("✓ 20 fırt çekiliyor...");
    for (let i = 1; i <= 20; i++) {
        await new Promise((resolve) => {
            socket.emit('nargile_puff', { tableId: 'lounge_sol' }, (res) => {
                assert(res && res.success, `Fırt ${i} başarılı olmalı`);
                resolve();
            });
        });
    }

    let smokeData = await smokeBlastPromise;
    console.log("✓ nargile_dense_smoke_blast alındı:", smokeData);
    assert.strictEqual(smokeData.durationMs, 8000, "Duman tepe süresi 8000 ms olmalıdır (+3 sn uzatıldı)");
    assert.strictEqual(smokeData.fadeMs, 9000, "Duman sönüm süresi 9000 ms olmalıdır (+5 sn uzatıldı)");
    console.log("✓ Duman süresi başarıyla doğrulandı: 8 sn maksimum, 9 sn sönüm (Toplam 17 sn)!");

    socket.disconnect();

    // 2. CLIENT CODE: NARGILE METİNLERİNİN KALDIRILDIĞININ VE HIZININ TESTİ
    console.log("\n--- 2. Nargile İstemci Kod Analizi (Yazısız Ekran & Garson Haydar) ---");
    let nargileJs = fs.readFileSync(path.join(process.cwd(), 'public/js/nargileLounge.js'), 'utf8');
    assert(!nargileJs.includes("GÖZ GÖZÜ GÖRMÜYOR!"), "Duman esnasındaki 'GÖZ GÖZÜ GÖRMÜYOR' yazısı tamamen kaldırılmış olmalıdır!");
    assert(!nargileJs.includes("Öhö öhö! 20 fırt çekildi"), "20 fırt çekildi metni tamamen kaldırılmış olmalıdır!");
    assert(nargileJs.includes("alpha = Math.min(1.0, Math.ceil(rawAlpha * 10) / 10);"), "Duman yüzde 90, 80, 70 şeklinde kademeli azalmalıdır!");
    assert(nargileJs.includes("garsonHaydar.speed = 0.75;"), "Garson Haydar yavaşça masaya gelmelidir (speed: 0.75)!");
    console.log("✓ Duman ekranı yazısız hale getirildi, kademeli sönümleme ve Haydar yavaş gelişi doğrulandı!");

    // 3. BLACKJACK UI CSS DOĞRULAMASI
    console.log("\n--- 3. Blackjack UI Yükseklik ve Buton Margin/Padding Doğrulaması ---");
    let styleCss = fs.readFileSync(path.join(process.cwd(), 'public/style.css'), 'utf8');
    let indexHtml = fs.readFileSync(path.join(process.cwd(), 'public/index.html'), 'utf8');

    assert(styleCss.includes("min-height: 610px;"), ".blackjack-table-container min-height 610px ile aşağıya doğru genişletilmiş olmalıdır!");
    assert(styleCss.includes(".bj-control-bar {"), ".bj-control-bar için özel CSS tanımlanmış olmalıdır!");
    assert(styleCss.includes(".bj-action-btn.btn-primary"), "Bahis Yap butonu için .bj-action-btn.btn-primary stili tanımlanmış olmalıdır!");
    assert(styleCss.includes(".bj-action-btn.btn-hit"), "Kart Çek (Hit) butonu için ferah boyut ve margin/padding tanımlanmış olmalıdır!");
    assert(indexHtml.includes("id=\"bjBettingControls\" style=\"display: none; align-items: center; justify-content: space-between; gap: 14px; width: 100%; flex-wrap: wrap; padding: 4px 0;\""), "Bahis kontrolleri ezilmeyecek şekilde alt kısma çekilmiş olmalıdır!");
    console.log("✓ Blackjack modal yüksekliği ve kontrol butonlarının ferah aralıkları doğrulandı!");

    // 4. EVDEN ÇIKIŞ ENGELİ (HOUSE EDIT MODE) DOĞRULAMASI
    console.log("\n--- 4. Evden Çıkış Mantığı (isHouseEditMode) Doğrulaması ---");
    let mainJs = fs.readFileSync(path.join(process.cwd(), 'public/js/main.js'), 'utf8');
    let worldRendererJs = fs.readFileSync(path.join(process.cwd(), 'public/js/worldRenderer.js'), 'utf8');

    assert(mainJs.includes("function warnHouseEditActive()"), "warnHouseEditActive uyarı fonksiyonu tanımlanmış olmalıdır!");
    assert(mainJs.includes("Lütfen önce ev düzenleme ekranını kapatın."), "Uyarı metni 'Lütfen önce ev düzenleme ekranını kapatın.' olmalıdır!");
    assert(mainJs.includes("if (currentRoom && currentRoom.startsWith(\"house_\") && window.isHouseEditMode && newRoom !== currentRoom)"), "changeRoom ev düzenleme açıkken engellenmelidir!");
    assert(worldRendererJs.includes("if (window.isHouseEditMode) return true;"), "Ev kapısının fiziksel çarpışması ev düzenleme açıkken kapıyı kilitlemelidir!");
    console.log("✓ Ev düzenleme açıkken kapı tıklaması, yürüme ve oda değiştirme engeli başarıyla doğrulandı!");

    console.log("\n=======================================================");
    console.log("🎉 TÜM İSTEKLER VE TESTLER %100 BAŞARIYLA TAMAMLANDI!");
    console.log("=======================================================\n");
    process.exit(0);
}

testAll().catch(err => {
    console.error("❌ Test hatası:", err);
    process.exit(1);
});
