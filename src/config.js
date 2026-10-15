// src/config.js - Mini Metaverse Konfigürasyon ve Sabitleri
const path = require('path');

module.exports = {
    // Port ve Ağ
    PORT: process.env.PORT || 3000,

    // Kalıcı Veri Yolları
    DATA_FILE: path.resolve(__dirname, '../data.json'),
    BACKUP_FILE: path.resolve(__dirname, '../data.json.bak'),
    TEMP_FILE: path.resolve(__dirname, '../data.json.tmp'),

    // Geriye Dönük Uyumluluk Şifresi (Eski hesaplar için yedek master şifre)
    LEGACY_MASTER_PASS: "yasin54",

    // Başlangıç Masa Şablonları
    BASE_TABLE_CONFIGS: {
        billiard: { min: 2, name: '8-Ball Bilardo', type: 'billiard' },
        batak: { min: 3, name: 'Gömmeli Batak (3 Kişi)', type: 'batak' },
        batak4: { min: 4, name: 'Normal Batak (4 Kişi)', type: 'batak4' },
        tavla: { min: 2, name: 'Klasik Tavla', type: 'tavla' },
        okey101: { min: 4, name: '101 Okey (Çiftli / Eşli)', type: 'okey101', mode: 'esli' },
        okey101_tekli: { min: 4, name: '101 Okey (Tekli)', type: 'okey101_tekli', mode: 'tekli' }
    },

    // Varsayılan Masalar
    DEFAULT_TABLES: {
        billiard: { id: 'billiard', baseType: 'billiard', name: '8-Ball Bilardo', min: 2, bet: 0, pot: 0, players: [], spectators: [] },
        batak: { id: 'batak', baseType: 'batak', name: 'Gömmeli Batak (3 Kişi)', min: 3, bet: 0, pot: 0, players: [], spectators: [] },
        batak4: { id: 'batak4', baseType: 'batak4', name: 'Normal Batak (4 Kişi)', min: 4, bet: 0, pot: 0, players: [], spectators: [] },
        tavla: { id: 'tavla', baseType: 'tavla', name: 'Klasik Tavla', min: 2, bet: 0, pot: 0, players: [], spectators: [] },
        okey101: { id: 'okey101', baseType: 'okey101', name: '101 Okey (Çiftli / Eşli)', min: 4, bet: 0, pot: 0, mode: 'esli', players: [], spectators: [] },
        okey101_tekli: { id: 'okey101_tekli', baseType: 'okey101_tekli', name: '101 Okey (Tekli)', min: 4, bet: 0, pot: 0, mode: 'tekli', players: [], spectators: [] }
    },

    // Gardırop & Kıyafet Fiyat Listesi
    WARDROBE_ITEM_PRICES: {
        'hats_none': 0, 'hats_bere': 200, 'hats_kasket': 260, 'hats_fes': 320, 'hats_cowboy': 380,
        // Kadın Saç Modelleri & Şapkalar
        'hats_hair_long': 260, 'hats_hair_wavy': 320, 'hats_hair_ponytail': 280, 'hats_hair_braids': 290,
        'hats_hair_bob': 240, 'hats_hair_hijab': 250, 'hats_beret_pink': 260, 'hats_crown': 480,

        'faces_none': 0, 'faces_mustache': 240, 'faces_sunglasses': 300, 'faces_beard': 360,
        'skins_#facc15': 0, 'skins_#ffd1a4': 240, 'skins_#d2996c': 300, 'skins_#8d5524': 360,
        
        // Tişörtler & Elbiseler
        'shirts_#3b82f6': 0, 'shirts_#ef4444': 100, 'shirts_#10b981': 100, 'shirts_#8b5cf6': 100, 'shirts_#f59e0b': 100, 'shirts_#0f172a': 100,
        'shirts_polo': 160, 'shirts_hoodie': 220, 'shirts_leather': 350,
        'shirts_dress_pink': 280, 'shirts_dress_black': 380, 'shirts_dress_red': 310, 'shirts_skirt_crop': 260, 'shirts_skirt_denim': 240,

        // Ayakkabılar
        'shoes_none': 0, 'shoes_sneakers': 180, 'shoes_classic': 240, 'shoes_boots': 280, 'shoes_heels': 320, 'shoes_flats': 190,

        // El Eşyaları (Props)
        'props_none': 0, 'props_nargile': 700, 'props_cay': 100, 'props_kahve': 110, 'props_balon': 120, 
        'props_gazoz': 140, 'props_tespih': 400, 'props_olta': 200, 'props_baglama': 220, 'props_asagold': 260, 'props_kupa': 290
    },

    // Konut Fiyatları & İsimleri
    HOUSE_PRICES: {
        'standart': 2500,
        'garden': 5000,
        'pool': 7500
    },
    HOUSE_NAMES: {
        'standart': 'Standart Şehir Dairesi',
        'garden': 'Verandalı Bahçeli Ev',
        'pool': 'Bahçeli & Havuzlu Villa'
    },

    // Mobilya Fiyatları
    FURNITURE_PRICES: {
        'bitki': 200,
        'hali': 240,
        'sedir': 280,
        'kitaplik': 320,
        'berjer': 360,
        'yemek_masasi': 400,
        'akvaryum': 440,
        'tv': 480,
        'gramofon': 520,
        'somine': 550,
        'bilgisayar': 570,
        'arcade': 590,
        'piyano': 600
    },

    // Balık Tutma Ganimet Tablosu (Kıyıdan)
    FISH_LOOT_TABLE: [
        { id: 'cizme', name: "Eski Çizme", emoji: "🥾", value: 0, weight: 20, desc: "Eski bir çizme çektin! Deniz temizliği için teşekkürler." },
        { id: 'hamsi', name: "Karadeniz Hamsisi", emoji: "🐟", value: 1, weight: 28, desc: "Taze bir Karadeniz Hamsisi yakaladın!" },
        { id: 'istavrit', name: "Gümüş İstavrit", emoji: "🐟", value: 3, weight: 20, desc: "Çıtır bir Gümüş İstavrit yakaladın!" },
        { id: 'cipura', name: "Ege Çipurası", emoji: "🐠", value: 10, weight: 14, desc: "Nefis bir Ege Çipurası tuttun!" },
        { id: 'levrek', name: "Deniz Levreği", emoji: "🐟", value: 20, weight: 9, desc: "Büyük bir Deniz Levreği çektin!" },
        { id: 'ahtapot', name: "Kaya Ahtapotu", emoji: "🐙", value: 35, weight: 6, desc: "Kolları kıpır kıpır bir Kaya Ahtapotu yakaladın!" },
        { id: 'inci', name: "Nadir İnci", emoji: "🦪", value: 50, weight: 3, desc: "✨ EFSANEVİ! İstiridye içinden parıldayan Nadir İnci çıktı!" }
    ],

    // Kuğu Bisikleti İle Açık Deniz Ganimet Tablosu
    SWAN_BOAT_LOOT_TABLE: [
        { id: 'hamsi', name: "Karadeniz Hamsisi", emoji: "🐟", value: 1, weight: 10, desc: "Taze bir Karadeniz Hamsisi yakaladın!" },
        { id: 'istavrit', name: "Gümüş İstavrit", emoji: "🐟", value: 3, weight: 12, desc: "Çıtır bir Gümüş İstavrit yakaladın!" },
        { id: 'cipura', name: "Ege Çipurası", emoji: "🐠", value: 10, weight: 15, desc: "Nefis bir Ege Çipurası tuttun!" },
        { id: 'levrek', name: "Deniz Levreği", emoji: "🐟", value: 20, weight: 15, desc: "Büyük bir Deniz Levreği çektin!" },
        { id: 'ahtapot', name: "Kaya Ahtapotu", emoji: "🐙", value: 35, weight: 15, desc: "Kolları kıpır kıpır bir Kaya Ahtapotu yakaladın!" },
        { id: 'inci', name: "Nadir İnci", emoji: "🦪", value: 50, weight: 15, desc: "✨ EFSANEVİ! İstiridye içinden parıldayan Nadir İnci çıktı!" },
        { id: 'mercan', name: "Altın Mercan", emoji: "🪸", value: 75, weight: 10, desc: "🌟 Muhteşem parıltı! Derin sulardan Altın Mercan çıkardın!" },
        { id: 'hazine', name: "Antik Hazine Sandığı", emoji: "🪙", value: 100, weight: 8, desc: "👑 İNANILMAZ! Kuğu bisikletiyle açık denizden altın dolu Antik Hazine Sandığı çektin!" }
    ]
};
