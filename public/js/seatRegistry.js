// public/js/seatRegistry.js - Yüksek Performanslı Oturma, Koltuk/Sandalye Kayıt Defteri ve Sıfır-Tahsisli Arama Motoru

/**
 * Statik mekanlardaki tüm koltuk, sandalye, tabure ve bankların önceden hesaplanmış sabit koordinatları.
 * Trigonometrik hesaplamalar (Math.cos/sin) oyun döngüsü dışında bir defa hesaplanmıştır.
 */
const STATIC_ROOM_SEATS = {
    kafe: [
        // Bar Tabureleri
        { x: 55, y: 68, facing: 'up', label: 'Bar Taburesi' },
        { x: 115, y: 68, facing: 'up', label: 'Bar Taburesi' },
        { x: 175, y: 68, facing: 'up', label: 'Bar Taburesi' },
        // Tavla Masası Sandalyeleri (E basınca oturur ve Tavla açılır)
        { x: 132, y: 288, facing: 'down', label: 'Tavla Sandalyesi', game: 'tavla', tableId: 'tavla' },
        { x: 132, y: 412, facing: 'up', label: 'Tavla Sandalyesi', game: 'tavla', tableId: 'tavla' },
        // Gömmeli Batak (3 Kişilik) - Sağ Bölüm (cx: 658, cy: 135, r: 59)
        { x: 658, y: 76, facing: 'down', label: 'Batak Sandalyesi', game: 'batak', tableId: 'batak' },
        { x: 709, y: 165, facing: 'left', label: 'Batak Sandalyesi', game: 'batak', tableId: 'batak' },
        { x: 607, y: 165, facing: 'right', label: 'Batak Sandalyesi', game: 'batak', tableId: 'batak' },
        // Normal Batak (4 Kişilik) - Sağ Bölüm (cx: 658, cy: 300, r: 59)
        { x: 658, y: 241, facing: 'down', label: 'Batak Sandalyesi', game: 'batak4', tableId: 'batak4' },
        { x: 717, y: 300, facing: 'left', label: 'Batak Sandalyesi', game: 'batak4', tableId: 'batak4' },
        { x: 658, y: 359, facing: 'up', label: 'Batak Sandalyesi', game: 'batak4', tableId: 'batak4' },
        { x: 599, y: 300, facing: 'right', label: 'Batak Sandalyesi', game: 'batak4', tableId: 'batak4' }
    ],
    nargile_cafe: [
        // Sol Üst Nargile Locası (Chesterfield Sedir)
        { x: 110, y: 84, facing: 'down', label: 'Sol Loca Koltuğu', tableId: 'lounge_sol', seatIndex: 0 },
        { x: 155, y: 84, facing: 'down', label: 'Sol Loca Koltuğu', tableId: 'lounge_sol', seatIndex: 1 },
        { x: 54, y: 115, facing: 'right', label: 'Sol Loca Koltuğu', tableId: 'lounge_sol', seatIndex: 2 },
        { x: 54, y: 148, facing: 'right', label: 'Sol Loca Koltuğu', tableId: 'lounge_sol', seatIndex: 3 },
        // Sağ Üst Nargile Locası (Chesterfield Sedir)
        { x: 645, y: 84, facing: 'down', label: 'Sağ Loca Koltuğu', tableId: 'lounge_sag', seatIndex: 0 },
        { x: 690, y: 84, facing: 'down', label: 'Sağ Loca Koltuğu', tableId: 'lounge_sag', seatIndex: 1 },
        { x: 746, y: 115, facing: 'left', label: 'Sağ Loca Koltuğu', tableId: 'lounge_sag', seatIndex: 2 },
        { x: 746, y: 148, facing: 'left', label: 'Sağ Loca Koltuğu', tableId: 'lounge_sag', seatIndex: 3 },
        // Tekli 101 Okey Sandalyeleri (E basınca oturur ve 101 Okey açılır)
        { x: 255, y: 155, facing: 'down', label: 'Tekli 101 Sandalyesi', tableId: 'okey101_tekli', game: 'okey101_tekli', seatIndex: 0 },
        { x: 370, y: 242, facing: 'left', label: 'Tekli 101 Sandalyesi', tableId: 'okey101_tekli', game: 'okey101_tekli', seatIndex: 1 },
        { x: 255, y: 330, facing: 'up', label: 'Tekli 101 Sandalyesi', tableId: 'okey101_tekli', game: 'okey101_tekli', seatIndex: 2 },
        { x: 140, y: 242, facing: 'right', label: 'Tekli 101 Sandalyesi', tableId: 'okey101_tekli', game: 'okey101_tekli', seatIndex: 3 },
        // Eşli 101 Okey Sandalyeleri (E basınca oturur ve 101 Okey açılır)
        { x: 545, y: 155, facing: 'down', label: 'Eşli 101 Sandalyesi', tableId: 'okey101', game: 'okey101', seatIndex: 0 },
        { x: 660, y: 242, facing: 'left', label: 'Eşli 101 Sandalyesi', tableId: 'okey101', game: 'okey101', seatIndex: 1 },
        { x: 545, y: 330, facing: 'up', label: 'Eşli 101 Sandalyesi', tableId: 'okey101', game: 'okey101', seatIndex: 2 },
        { x: 430, y: 242, facing: 'right', label: 'Eşli 101 Sandalyesi', tableId: 'okey101', game: 'okey101', seatIndex: 3 }
    ],
    sokak: [
        { x: 292, y: 218, facing: 'down', label: 'Meydan Bankı' },
        { x: 512, y: 218, facing: 'down', label: 'Meydan Bankı' }
    ],
    cadde: [
        { x: 122, y: 412, facing: 'down', label: 'Park Bankı' },
        { x: 362, y: 412, facing: 'down', label: 'Park Bankı' },
        { x: 402, y: 227, facing: 'down', label: 'Bulvar Bankı' }
    ],
    emlakci: [
        { x: 55, y: 425, facing: 'right', label: 'Müşteri Kanepe Koltuğu' },
        { x: 400, y: 68, facing: 'down', label: 'Danışman Koltuğu' }
    ],
    dedenin_yeri: [
        // Blackjack Masası Koltukları (E basınca oturur ve Blackjack açılır)
        { x: 364, y: 250, facing: 'up', label: 'Blackjack Koltuğu 1', tableId: 'blackjack', game: 'blackjack', seatIndex: 0 },
        { x: 400, y: 258, facing: 'up', label: 'Blackjack Koltuğu 2', tableId: 'blackjack', game: 'blackjack', seatIndex: 1 },
        { x: 436, y: 250, facing: 'up', label: 'Blackjack Koltuğu 3', tableId: 'blackjack', game: 'blackjack', seatIndex: 2 }
    ],
    market: [
        { x: 135, y: 183, facing: 'down', label: 'Showroom Koltuğu' },
        { x: 640, y: 280, facing: 'down', label: 'Showroom Sediri' },
        { x: 410, y: 392, facing: 'up', label: 'Showroom Sandalyesi' },
        { x: 415, y: 212, facing: 'up', label: 'Showroom Berjeri' }
    ],
    sahil: [
        // Tropik Bar Önü Tabureleri (Oturunca Kokteyl Menüsü Açılır)
        { x: 678, y: 462, facing: 'up', label: 'Tropik Bar Taburesi', game: 'cocktail_bar' },
        { x: 712, y: 462, facing: 'up', label: 'Tropik Bar Taburesi', game: 'cocktail_bar' },
        { x: 746, y: 462, facing: 'up', label: 'Tropik Bar Taburesi', game: 'cocktail_bar' },
        // Plaj Şezlongları
        { x: 600, y: 330, facing: 'right', label: 'Plaj Şezlongu' },
        { x: 606, y: 356, facing: 'right', label: 'Plaj Şezlongu' }
    ]
};

const MAX_SIT_DIST = 62;
const MAX_SIT_DIST_SQ = MAX_SIT_DIST * MAX_SIT_DIST; // 3844

/**
 * 60 FPS Animasyon Döngüsünde Sıfır-Tahsis (Zero Garbage Collection) çalışan en yakın koltuğu bulma fonksiyonu.
 * Bellekte gereksiz dizi açmaz, sort çalıştırmaz; O(N) tek geçişte minimum kare mesafeyi bulur.
 */
function findNearestSittableSeat() {
    if (typeof players === 'undefined' || typeof myId === 'undefined' || !players[myId]) return null;
    let p = players[myId];
    let room = typeof currentRoom !== 'undefined' ? currentRoom : '';

    // 1. Statik Mekan Koltukları Kontrolü
    let staticSeats = STATIC_ROOM_SEATS[room];
    if (staticSeats) {
        let bestSeat = null;
        let minDistSq = MAX_SIT_DIST_SQ;
        for (let i = 0; i < staticSeats.length; i++) {
            let s = staticSeats[i];
            let dx = p.x - s.x;
            let dy = p.y - s.y;
            let d2 = dx * dx + dy * dy;
            if (d2 < minDistSq) {
                minDistSq = d2;
                bestSeat = s;
            }
        }
        return bestSeat;
    }

    // 2. Dinamik Ev Mobilyaları Kontrolü (house_*)
    if (room.startsWith("house_")) {
        let house = (typeof getCurrentViewingHouse === 'function') ? getCurrentViewingHouse() : null;
        if (!house || !house.furniture || house.furniture.length === 0) return null;

        let catTable = window.FURNITURE_CATALOG || {};
        let bestSeat = null;
        let minDistSq = MAX_SIT_DIST_SQ;

        for (let i = 0; i < house.furniture.length; i++) {
            let item = house.furniture[i];
            let cat = catTable[item.id] || { w: 60, h: 50 };
            let rot = ((item.rotation || 0) % 4 + 4) % 4;
            let isTransposed = (rot === 1 || rot === 3);
            let effW = isTransposed ? cat.h : cat.w;
            let effH = isTransposed ? cat.w : cat.h;
            let left = item.x - effW / 2;
            let right = item.x + effW / 2;
            let top = item.y - effH / 2;
            let bottom = item.y + effH / 2;

            let sitX = item.x;
            let sitY = item.y;
            let facing = 'down';
            let label = 'Mobilya';

            if (item.id === 'sedir') {
                if (rot === 0) {
                    sitX = Math.max(left + 16, Math.min(right - 16, p.x));
                    sitY = Math.round(item.y - 2);
                    facing = 'down';
                } else if (rot === 1) {
                    sitX = Math.round(item.x + 8);
                    sitY = Math.max(top + 16, Math.min(bottom - 16, p.y));
                    facing = 'right';
                } else if (rot === 2) {
                    sitX = Math.max(left + 16, Math.min(right - 16, p.x));
                    sitY = Math.round(item.y + 12);
                    facing = 'up';
                } else if (rot === 3) {
                    sitX = Math.round(item.x - 8);
                    sitY = Math.max(top + 16, Math.min(bottom - 16, p.y));
                    facing = 'left';
                }
                label = 'Sedir';
            } else if (item.id === 'berjer') {
                let dirs = ['down', 'right', 'up', 'left'];
                facing = dirs[rot];
                label = 'Berjer';
            } else if (item.id === 'bilgisayar') {
                let dirs = ['up', 'left', 'down', 'right'];
                let offX = [0, 16, 0, -16][rot];
                let offY = [16, 0, -16, 0][rot];
                sitX = item.x + offX;
                sitY = item.y + offY;
                facing = dirs[rot];
                label = 'Çalışma Koltuğu';
            } else if (item.id === 'piyano') {
                sitX = item.x;
                sitY = item.y + 18;
                facing = 'up';
                label = 'Piyano Taburesi';
            } else if (item.id === 'yemek_masasi') {
                let isTop = (p.y < item.y);
                sitX = p.x < item.x ? item.x - 20 : item.x + 20;
                sitY = isTop ? item.y - 18 : item.y + 18;
                facing = isTop ? 'down' : 'up';
                label = 'Yemek Sandalyesi';
            } else {
                continue;
            }

            let dx = p.x - sitX;
            let dy = p.y - sitY;
            let d2 = dx * dx + dy * dy;
            if (d2 < minDistSq) {
                minDistSq = d2;
                bestSeat = { x: sitX, y: sitY, facing: facing, label: label, dist: Math.sqrt(d2) };
            }
        }
        return bestSeat;
    }

    return null;
}

/**
 * Koltuğa oturulduğunda ilgili oyun ekranını/menüsünü otomatik olarak açar.
 */
function openGameForSeat(seat) {
    if (!seat) return;
    let gameType = seat.game || seat.tableId;
    if (!gameType) return;

    if (gameType === 'blackjack') {
        if (typeof openBlackjackModal === 'function') {
            openBlackjackModal();
            let timerFn = (typeof setTimeout !== 'undefined') ? setTimeout : (typeof window !== 'undefined' ? window.setTimeout : null);
            if (timerFn && seat.seatIndex !== undefined && window.socket) {
                timerFn(() => {
                    if (typeof bjTakeSeat === 'function') bjTakeSeat(seat.seatIndex);
                    else if (window.socket) window.socket.emit('blackjack_sit', { seatIndex: seat.seatIndex });
                }, 150);
            }
        }
    } else if (gameType === 'batak' || gameType === 'batak4' || gameType === 'tavla' || gameType === 'okey101' || gameType === 'okey101_tekli' || gameType === 'billiard') {
        if (window.socket) {
            window.socket.emit('requestTableOptions', gameType);
        }
    } else if (gameType === 'cocktail_bar') {
        if (typeof openCocktailBarModal === 'function') {
            openCocktailBarModal();
        }
    }
}
window.openGameForSeat = openGameForSeat;

/**
 * Oyuncuyu tespit edilen en yakın koltuğa oturtur ve oyun masasıysa ekranını açar.
 * @returns {boolean} Oturma gerçekleştiyse true
 */
function checkAndSitOnNearestFurnitureOrChair() {
    let seat = findNearestSittableSeat();
    if (seat && typeof sitPlayerAt === 'function') {
        sitPlayerAt(seat.x, seat.y, seat.facing);
        openGameForSeat(seat);
        return true;
    }
    return false;
}

// Global Erişim İçin window Nesnesine Kaydet
window.STATIC_ROOM_SEATS = STATIC_ROOM_SEATS;
window.findNearestSittableSeat = findNearestSittableSeat;
window.checkAndSitOnNearestFurnitureOrChair = checkAndSitOnNearestFurnitureOrChair;
