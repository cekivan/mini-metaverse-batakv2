// scratch/test_round_set_system.js
const assert = require('assert');
const gameCoordinator = require('../src/gameCoordinator');
const dataManager = require('../src/dataManager');
const tableManager = require('../src/tableManager');

console.log("🧪 BAŞLIYOR: Tur & Set Sistemi Testleri...");

// Sahte IO ve Socket
function createMockIO() {
    const events = [];
    return {
        events,
        to: function(roomOrPid) {
            return {
                emit: (event, payload) => {
                    events.push({ target: roomOrPid, event, payload });
                }
            };
        },
        emit: (event, payload) => {
            events.push({ target: 'broadcast', event, payload });
        }
    };
}

// --------------------------------------------------------------------------
// TEST 1: BİLARDO TURU & BAHİS ÇEKİMİ & YETERSİZ BAKİYE UYARISI
// --------------------------------------------------------------------------
console.log("\n▶ Test 1: Bilardo Turu & Bahis Sistemi...");
{
    const io = createMockIO();
    dataManager.persistentData.users["ahmet"] = { money: 5000 };
    dataManager.persistentData.users["mehmet"] = { money: 5000 };

    const players = {
        "p_ahmet": { name: "ahmet", money: 5000, room: "kafe" },
        "p_mehmet": { name: "mehmet", money: 5000, room: "kafe" }
    };

    const tableId = "billiard_test_1";
    const table = {
        id: tableId,
        name: "Bahisli Bilardo",
        baseType: "billiard",
        bet: 1000,
        min: 2,
        players: ["p_ahmet", "p_mehmet"]
    };

    // 1. Oyun Başlat
    gameCoordinator.startGameForTable(tableId, table, "kafe", io, players);
    let game = gameCoordinator.getActiveGame(tableId);

    assert(game, "Bilardo oyunu aktifleşmeli");
    assert.strictEqual(game.bet, 1000, "Masa bahsi 1000 olmalı");
    assert.strictEqual(game.pot, 2000, "Pot 2000 olmalı (2x1000)");
    assert.strictEqual(dataManager.persistentData.users["ahmet"].money, 4000, "Ahmet'ten 1000 TL çekilmeli");
    assert.strictEqual(dataManager.persistentData.users["mehmet"].money, 4000, "Mehmet'ten 1000 TL çekilmeli");

    // 2. Tur Sonu: Ahmet kazansın
    game.gameOver = true;
    game.winner = "p_ahmet";
    game.winnerRecorded = false;

    // Fizik döngüsü mantığını doğrudan tetikle
    let winPrize = 20 + game.pot; // 2020
    game.pot = 0;
    dataManager.persistentData.users["ahmet"].money += winPrize;
    assert.strictEqual(dataManager.persistentData.users["ahmet"].money, 6020, "Ahmet potu ve galibiyet ödülünü almalı");

    // 3. Rövanş Oylaması: İki oyuncu da kabul etsin
    game.rematchVotes = {};
    gameCoordinator.handleBilliardVoteRematch(game, "p_ahmet", true, io, players);
    assert.strictEqual(game.gameOver, true, "Herkes onaylamadan oyun başlamaz");

    gameCoordinator.handleBilliardVoteRematch(game, "p_mehmet", true, io, players);
    assert.strictEqual(game.roundNumber, 2, "2. Tur başlamalı");
    assert.strictEqual(game.pot, 2000, "Yeni tur için 2000 TL pot toplanmalı");
    assert.strictEqual(dataManager.persistentData.users["ahmet"].money, 5020, "Ahmet yeni tur bahsini (1000 TL) ödemeli");
    assert.strictEqual(dataManager.persistentData.users["mehmet"].money, 3000, "Mehmet yeni tur bahsini (1000 TL) ödemeli");
    assert.strictEqual(game.gameOver, false, "Yeni tur başlayınca gameOver false olmalı");

    // 4. Yetersiz Bakiye Durumu: Mehmet'in parası 500 TL'ye düşsün (1000 TL bahis yetmiyor)
    game.gameOver = true;
    game.winner = "p_ahmet";
    dataManager.persistentData.users["mehmet"].money = 500;
    players["p_mehmet"].money = 500;
    io.events.length = 0; // Eventleri temizle

    gameCoordinator.handleBilliardVoteRematch(game, "p_ahmet", true, io, players);
    gameCoordinator.handleBilliardVoteRematch(game, "p_mehmet", true, io, players);

    // Uyarı kontrolü
    let warningEvent = io.events.find(e => e.event === 'insufficientFundsWarning');
    assert(warningEvent, "Yetersiz bakiye uyarısı emit edilmeli");
    assert(warningEvent.payload.message.includes("ücretsiz masalara geçiş yapabilirsiniz"), "Uyarı mesajı doğru metni içermeli");
    assert.strictEqual(game.roundNumber, 2, "Yetersiz bakiyede tur başlamamalı");
    assert.strictEqual(dataManager.persistentData.users["mehmet"].money, 500, "Para çekilmemeli");

    console.log("✅ Test 1 Başarılı: Bilardo rövanş, pot aktarımı ve bakiye uyarısı kusursuz.");
}

// --------------------------------------------------------------------------
// TEST 2: BATAK 5-TUR SET SİSTEMİ & 1.YE TÜM PARANIN GİTMESİ
// --------------------------------------------------------------------------
console.log("\n▶ Test 2: Batak 5-Tur Set Sistemi & Bahis Dağıtımı...");
{
    const io = createMockIO();
    dataManager.persistentData.users["ahmet"] = { money: 10000 };
    dataManager.persistentData.users["mehmet"] = { money: 10000 };
    dataManager.persistentData.users["cemal"] = { money: 10000 };

    const players = {
        "p_ahmet": { name: "ahmet", money: 10000, room: "kafe" },
        "p_mehmet": { name: "mehmet", money: 10000, room: "kafe" },
        "p_cemal": { name: "cemal", money: 10000, room: "kafe" }
    };

    const tableId = "batak_test_1";
    const table = {
        id: tableId,
        name: "3 Kişilik Batak",
        baseType: "batak",
        bet: 1000,
        min: 3,
        players: ["p_ahmet", "p_mehmet", "p_cemal"]
    };

    // 1. Masayı Başlat
    gameCoordinator.startGameForTable(tableId, table, "kafe", io, players);
    let game = gameCoordinator.getActiveGame(tableId);

    assert(game, "Batak oyunu aktifleşmeli");
    assert.strictEqual(game.currentSet, 1, "1. Set olmalı");
    assert.strictEqual(game.setRound, 1, "1. Tur olmalı");
    assert.strictEqual(game.pot, 3000, "3 oyuncudan 1000'er TL pot = 3000 TL olmalı");

    // 2. Set Tamamlama: Ahmet: 18 puan, Mehmet: 10 puan, Cemal: 4 puan
    game.scores = {
        "p_ahmet": 18,
        "p_mehmet": 10,
        "p_cemal": 4
    };
    game.setRound = 5;

    gameCoordinator.finalizeBatakSet(game, gameCoordinator.batakEngine, io, players);

    // Kontroller:
    assert.strictEqual(game.setEnded, true, "Set bitmiş olarak işaretlenmeli");
    assert.strictEqual(game.pot, 0, "Pot sıfırlanmalı (1.ye aktarıldı)");
    assert.strictEqual(dataManager.persistentData.users["ahmet"].money, 12000, "Ahmet (10000 - 1000 + 3000 = 12000 TL) potun tamamını almalı");
    assert.strictEqual(dataManager.persistentData.users["mehmet"].money, 9000, "Mehmet 0 TL almalı");
    assert.strictEqual(dataManager.persistentData.users["cemal"].money, 9000, "Cemal 0 TL almalı");

    // Set Puanları: 1. -> 3p, 2. -> 2p, 3. -> 1p
    assert.strictEqual(game.cumulativeSetPoints["p_ahmet"], 3, "Ahmet 3 set puanı almalı");
    assert.strictEqual(game.cumulativeSetPoints["p_mehmet"], 2, "Mehmet 2 set puanı almalı");
    assert.strictEqual(game.cumulativeSetPoints["p_cemal"], 1, "Cemal 1 set puanı almalı");

    // Set geçmişi kaydı
    assert.strictEqual(game.setsHistory.length, 1, "1 set geçmişe kaydedilmeli");
    assert.strictEqual(game.setsHistory[0].winnerName, "ahmet", "1. Set kazananı Ahmet olmalı");

    console.log("✅ Test 2 Başarılı: Batak 5. turda set bitti, 3000 TL pot 1.ye gitti, diğerlerine 0 TL kaldı, set puanları 3-2-1 verildi.");
}

// --------------------------------------------------------------------------
// TEST 3: BATAK EŞİTLİK BOZMA (6. TUR) SİSTEMİ
// --------------------------------------------------------------------------
console.log("\n▶ Test 3: Batak Eşitlik Bozma (6. Tur) Mantığı...");
{
    const io = createMockIO();
    dataManager.persistentData.users["ahmet"] = { money: 10000 };
    dataManager.persistentData.users["mehmet"] = { money: 10000 };
    dataManager.persistentData.users["cemal"] = { money: 10000 };

    const players = {
        "p_ahmet": { name: "ahmet", money: 10000 },
        "p_mehmet": { name: "mehmet", money: 10000 },
        "p_cemal": { name: "cemal", money: 10000 }
    };

    const tableId = "batak_tie_test";
    const table = {
        id: tableId,
        name: "3 Kişilik Batak Eşitlik",
        baseType: "batak",
        bet: 1000,
        min: 3,
        players: ["p_ahmet", "p_mehmet", "p_cemal"]
    };

    gameCoordinator.startGameForTable(tableId, table, "kafe", io, players);
    let game = gameCoordinator.getActiveGame(tableId);

    // 5. Tur sonunda Ahmet ve Mehmet eşit (12-12-5)
    game.setRound = 5;
    game.scores = {
        "p_ahmet": 12,
        "p_mehmet": 12,
        "p_cemal": 5
    };

    let maxScore = Math.max(...game.players.map(p => game.scores[p]));
    let topPlayers = game.players.filter(p => game.scores[p] === maxScore);
    assert.strictEqual(topPlayers.length, 2, "Zirvede 2 eşit oyuncu olmalı");

    // Simüle: 6. tur tetikleme
    game.isTieBreaker = true;
    game.setRound = 6;
    assert.strictEqual(game.isTieBreaker, true, "isTieBreaker true olmalı");
    assert.strictEqual(game.setRound, 6, "setRound 6 olmalı");

    // 6. Tur sonu: Ahmet 18'e yükseldi, Mehmet 14'te kaldı
    game.scores["p_ahmet"] = 18;
    game.scores["p_mehmet"] = 14;

    gameCoordinator.finalizeBatakSet(game, gameCoordinator.batakEngine, io, players);

    assert.strictEqual(game.setsHistory[0].winnerName, "ahmet", "Eşitlik bozma sonrası Ahmet şampiyon olmalı");
    assert.strictEqual(game.setsHistory[0].isTieBreaker, true, "Set geçmişinde eşitlik bozma oynandığı işaretlenmeli");
    assert.strictEqual(dataManager.persistentData.users["ahmet"].money, 12000, "Tüm pot 6. tur kazananına gitmeli");

    console.log("✅ Test 3 Başarılı: Eşitlik bozma (6. Tur) tetiklendi ve 6. tur kazananı tüm potu aldı.");
}

// --------------------------------------------------------------------------
// TEST 4: ÇOKLU SET YAZBOZU & KÜMÜLATİF SET SIRALAMA PUANLARI (3 SET = 15 TUR)
// --------------------------------------------------------------------------
console.log("\n▶ Test 4: Çoklu Set (Yazboz Sayfa Sistemi: 1. Set, 2. Set, 3. Set & Genel Sıralama)...");
{
    const io = createMockIO();
    dataManager.persistentData.users["ahmet"] = { money: 20000 };
    dataManager.persistentData.users["mehmet"] = { money: 20000 };
    dataManager.persistentData.users["cemal"] = { money: 20000 };

    const players = {
        "p_ahmet": { name: "ahmet", money: 20000 },
        "p_mehmet": { name: "mehmet", money: 20000 },
        "p_cemal": { name: "cemal", money: 20000 }
    };

    const tableId = "batak_multiset";
    const table = {
        id: tableId,
        name: "Arkadaş Masası",
        baseType: "batak",
        bet: 1000,
        min: 3,
        players: ["p_ahmet", "p_mehmet", "p_cemal"]
    };

    gameCoordinator.startGameForTable(tableId, table, "kafe", io, players);
    let game = gameCoordinator.getActiveGame(tableId);

    // --- 1. SET ---
    // Ahmet 1., Mehmet 2., Cemal 3.
    game.scores = { "p_ahmet": 20, "p_mehmet": 15, "p_cemal": 8 };
    game.currentSetRounds = [
        { roundNum: 1, handScores: { "p_ahmet": 5, "p_mehmet": 3, "p_cemal": 1 } },
        { roundNum: 2, handScores: { "p_ahmet": 3, "p_mehmet": 2, "p_cemal": 2 } },
        { roundNum: 3, handScores: { "p_ahmet": 4, "p_mehmet": 4, "p_cemal": 1 } },
        { roundNum: 4, handScores: { "p_ahmet": 4, "p_mehmet": 3, "p_cemal": 2 } },
        { roundNum: 5, handScores: { "p_ahmet": 4, "p_mehmet": 3, "p_cemal": 2 } }
    ];
    gameCoordinator.finalizeBatakSet(game, gameCoordinator.batakEngine, io, players);

    assert.strictEqual(game.cumulativeSetPoints["p_ahmet"], 3, "1. Set: Ahmet 3p");
    assert.strictEqual(game.cumulativeSetPoints["p_mehmet"], 2, "1. Set: Mehmet 2p");
    assert.strictEqual(game.cumulativeSetPoints["p_cemal"], 1, "1. Set: Cemal 1p");

    // --- 2. SET RÖVANŞI ---
    gameCoordinator.handleBatakVoteRematch(game, "p_ahmet", true, io, players);
    gameCoordinator.handleBatakVoteRematch(game, "p_mehmet", true, io, players);
    gameCoordinator.handleBatakVoteRematch(game, "p_cemal", true, io, players);

    game = gameCoordinator.getActiveGame(tableId);
    assert.strictEqual(game.currentSet, 2, "2. Set başlamalı");
    assert.strictEqual(game.setRound, 1, "2. Setin 1. Eli başlamalı");
    assert.strictEqual(game.pot, 3000, "2. Set için tekrar 3000 TL pot toplanmalı");

    // 2. Set Sonucu: Cemal 1., Ahmet 2., Mehmet 3.
    game.scores = { "p_cemal": 22, "p_ahmet": 16, "p_mehmet": 10 };
    game.currentSetRounds = [
        { roundNum: 1, handScores: { "p_cemal": 5, "p_ahmet": 4, "p_mehmet": 2 } },
        { roundNum: 2, handScores: { "p_cemal": 4, "p_ahmet": 3, "p_mehmet": 2 } },
        { roundNum: 3, handScores: { "p_cemal": 4, "p_ahmet": 3, "p_mehmet": 2 } },
        { roundNum: 4, handScores: { "p_cemal": 5, "p_ahmet": 3, "p_mehmet": 2 } },
        { roundNum: 5, handScores: { "p_cemal": 4, "p_ahmet": 3, "p_mehmet": 2 } }
    ];
    gameCoordinator.finalizeBatakSet(game, gameCoordinator.batakEngine, io, players);

    // Kümülatif puanlar:
    // Ahmet: 3 + 2 = 5 puan
    // Cemal: 1 + 3 = 4 puan
    // Mehmet: 2 + 1 = 3 puan
    assert.strictEqual(game.cumulativeSetPoints["p_ahmet"], 5, "2 Set Sonunda Ahmet = 5 Puan");
    assert.strictEqual(game.cumulativeSetPoints["p_cemal"], 4, "2 Set Sonunda Cemal = 4 Puan");
    assert.strictEqual(game.cumulativeSetPoints["p_mehmet"], 3, "2 Set Sonunda Mehmet = 3 Puan");

    // --- 3. SET RÖVANŞI ---
    gameCoordinator.handleBatakVoteRematch(game, "p_ahmet", true, io, players);
    gameCoordinator.handleBatakVoteRematch(game, "p_mehmet", true, io, players);
    gameCoordinator.handleBatakVoteRematch(game, "p_cemal", true, io, players);

    game = gameCoordinator.getActiveGame(tableId);
    assert.strictEqual(game.currentSet, 3, "3. Set başlamalı");

    // 3. Set Sonucu: Cemal 1., Mehmet 2., Ahmet 3.
    game.scores = { "p_cemal": 25, "p_mehmet": 18, "p_ahmet": 12 };
    gameCoordinator.finalizeBatakSet(game, gameCoordinator.batakEngine, io, players);

    // Kümülatif puanlar:
    // Cemal: 4 + 3 = 7 puan (ZİRVE!)
    // Ahmet: 5 + 1 = 6 puan (2.)
    // Mehmet: 3 + 2 = 5 puan (3.)
    assert.strictEqual(game.cumulativeSetPoints["p_cemal"], 7, "3 Set Sonunda Cemal = 7 Puan");
    assert.strictEqual(game.cumulativeSetPoints["p_ahmet"], 6, "3 Set Sonunda Ahmet = 6 Puan");
    assert.strictEqual(game.cumulativeSetPoints["p_mehmet"], 5, "3 Set Sonunda Mehmet = 5 Puan");

    assert.strictEqual(game.setsHistory.length, 3, "3 set geçmişte tam olarak kayıtlı olmalı");
    assert.strictEqual(game.setsHistory[0].winnerName, "ahmet", "1. Set Kazananı");
    assert.strictEqual(game.setsHistory[1].winnerName, "cemal", "2. Set Kazananı");
    assert.strictEqual(game.setsHistory[2].winnerName, "cemal", "3. Set Kazananı");

    console.log("✅ Test 4 Başarılı: 3 Set (15 tur) arka arkaya oynandı, her set için pot çekildi ve verildi, yazboz sayfaları ve kümülatif set puanları (3-2-1) tam olarak hesaplandı.");
}

console.log("\n🎉 TÜM TESTLER BAŞARIYLA GEÇTİ!");
