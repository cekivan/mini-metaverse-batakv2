// src/config/roomSpawns.js - Modüler Mekan Geçiş, Doğuş Koordinatları ve Örnek Ev Sistem Yapılandırması

/**
 * Mekanlar arası geçişte oyuncuların odaya giriş pozisyonları.
 * [HedefMekan][GeldigiMekan] -> { x, y }
 */
const ROOM_SPAWN_MAP = {
    kafe: {
        default: { x: 400, y: 410 }
    },
    sokak: {
        sahil: { x: 75, y: 240 },
        cadde: { x: 725, y: 240 },
        kafe: { x: 400, y: 125 },
        nargile_cafe: { x: 670, y: 125 },
        market: { x: 730, y: 350 },
        default: { x: 350, y: 230 }
    },
    cadde: {
        sokak: { x: 75, y: 230 },
        ganyan: { x: 210, y: 145 },
        dedenin_yeri: { x: 585, y: 145 },
        emlakci: { x: 600, y: 350 },
        default: { x: 400, y: 230 }
    },
    emlakci: {
        default: { x: 400, y: 410 }
    },
    sahil: {
        sokak: { x: 715, y: 270 },
        default: { x: 420, y: 350 }
    },
    ganyan: {
        default: { x: 400, y: 410 }
    },
    dedenin_yeri: {
        default: { x: 400, y: 410 }
    },
    nargile_cafe: {
        default: { x: 400, y: 390 }
    },
    market: {
        default: { x: 400, y: 420 }
    }
};

/**
 * Emlakçı Örnek Daire Gezisi (Showroom Demo Turu) için hazır döşeli mobilya yerleşimleri.
 */
const DEMO_HOUSES = {
    standart: [
        { id: 'hali', x: 400, y: 290, rot: 0 },
        { id: 'tv', x: 400, y: 160, rot: 0 },
        { id: 'berjer', x: 280, y: 280, rot: 0 },
        { id: 'somine', x: 650, y: 165, rot: 0 },
        { id: 'bitki', x: 120, y: 165, rot: 0 }
    ],
    garden: [
        { id: 'hali', x: 400, y: 300, rot: 0 },
        { id: 'sedir', x: 300, y: 220, rot: 0 },
        { id: 'yemek_masasi', x: 500, y: 260, rot: 0 },
        { id: 'akvaryum', x: 670, y: 165, rot: 0 },
        { id: 'bitki', x: 120, y: 165, rot: 0 }
    ],
    pool: [
        { id: 'hali', x: 400, y: 300, rot: 0 },
        { id: 'piyano', x: 670, y: 200, rot: 0 },
        { id: 'bilgisayar', x: 150, y: 180, rot: 0 },
        { id: 'somine', x: 400, y: 160, rot: 0 },
        { id: 'berjer', x: 280, y: 300, rot: 0 },
        { id: 'berjer', x: 520, y: 300, rot: 2 }
    ]
};

/**
 * Verilen mekan geçişi için oyuncunun doğuş (spawn) koordinatlarını hesaplar.
 * @param {string} newRoom - Geçilmek istenen yeni mekan adı
 * @param {string} oldRoom - Ayrılınan önceki mekan adı
 * @returns {{ x: number, y: number }}
 */
function getRoomSpawn(newRoom, oldRoom) {
    if (newRoom && newRoom.startsWith("house_")) {
        return { x: 400, y: 400 };
    }
    const targetRoomConfig = ROOM_SPAWN_MAP[newRoom];
    if (!targetRoomConfig) {
        return { x: 400, y: 300 };
    }
    if (oldRoom && targetRoomConfig[oldRoom]) {
        return { ...targetRoomConfig[oldRoom] };
    }
    return { ...targetRoomConfig.default };
}

/**
 * İstenen ev tipine göre örnek daire mobilya dizilimini döndürür.
 * @param {string} demoType 
 * @returns {Array<object>}
 */
function getDemoHouseConfig(demoType) {
    return DEMO_HOUSES[demoType] || DEMO_HOUSES.standart;
}

module.exports = {
    ROOM_SPAWN_MAP,
    DEMO_HOUSES,
    getRoomSpawn,
    getDemoHouseConfig
};
