// scratch/test_beach_and_cocktail.js
const path = require('path');
const { io } = require(path.join(process.cwd(), 'node_modules/socket.io-client'));

async function runTest() {
    console.log("=== CANLI SAHİL & KOKTEYL MENÜSÜ TESTİ BAŞLIYOR ===");

    const socket = io('http://localhost:3000', {
        transports: ['websocket'],
        forceNew: true
    });

    await new Promise((resolve) => socket.on('connect', resolve));
    console.log("🔌 Socket bağlandı.");

    const testUsername = "beach_t_" + Math.floor(Math.random() * 10000);
    socket.emit('register', { name: testUsername, pass: "123456", gender: 'male' });

    let loginData = await new Promise((resolve) => {
        socket.on('loginSuccess', (data) => resolve(data));
    });
    console.log(`👤 Giriş başarılı: ${testUsername}, Bakiye: ${loginData.money} TL`);

    // Sahile geç
    socket.emit('changeRoom', 'sahil');
    await new Promise(r => setTimeout(r, 400));
    console.log("🌊 Sahil mekanına geçildi.");

    // TEST 1: Kuğu Bisikleti Kiralama
    console.log("\n--- TEST 1: Kuğu Bisikleti Kiralama (20 TL) ---");
    socket.emit('rentSwanBoat');

    let swanRented = await new Promise((resolve) => {
        socket.on('swanBoatRented', (d) => resolve(d));
    });
    console.log(`✓ Kuğu kiralandı! Süre: ${swanRented.duration} saniye.`);

    // TEST 2: Tropik Bar Kokteyli Sipariş Etme
    console.log("\n--- TEST 2: Kokteyl Satın Alma (Hindistan Cevizi Kokteyli - 25 TL) ---");
    socket.emit('buyCocktail', { id: 'coconut' });

    let cocktailItem = await new Promise((resolve) => {
        socket.on('cocktailPurchasedSuccess', (item) => resolve(item));
    });
    console.log(`✓ Kokteyl başarıyla satın alındı: ${cocktailItem.name} (${cocktailItem.price} TL)`);

    // TEST 3: Chat Balonu ve Duyuru Kontrolü
    let chatReceived = await new Promise((resolve) => {
        socket.on('chatMessage', (msg) => {
            if (msg.message && msg.message.includes('Hindistan Cevizi')) {
                resolve(msg);
            }
        });
    });
    console.log(`✓ Sohbet balonu ve mekan içi anons doğrulandı: "${chatReceived.message}" (${chatReceived.name})`);

    console.log("\n=======================================================");
    console.log("🎉 TÜM SAHİL VE TROPİK KOKTEYL BARI TESTLERİ BAŞARIYLA GEÇTİ!");
    console.log("=======================================================\n");

    socket.disconnect();
    process.exit(0);
}

runTest().catch((err) => {
    console.error("❌ Test hatası:", err);
    process.exit(1);
});
