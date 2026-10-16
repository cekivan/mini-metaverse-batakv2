// src/handlers/nargileLoungeHandler.js - Otantik Nargile Lounge, Garson Haydar, Sipariş & Köz Yönetimi
const dataManager = require('../dataManager');

const NARGILE_ROOM = 'nargile_cafe';
const ITEM_LIFETIME_MS = 10 * 60 * 1000; // 10 dakika (600 saniye)
const HOSE_ROTATION_INTERVAL_SEC = 60;   // 1 dakikada bir marpuç devri (60 saniye)

// Masaların anlık lounge durumları (Sol Üst ve Sağ Üst Localar)
const loungeTables = {
    lounge_sol: {
        id: 'lounge_sol',
        name: 'Sol Üst Nargile Locası',
        x: 95,
        y: 100,
        w: 80,
        h: 55,
        seatedPlayers: {}, // { [socketId]: { username, seatIndex, sitTime } }
        activeNargile: null, // { orderedBy, orderedAt, expiresAt, coalExpiresAt, isCoalBurnedOut }
        activeFruit: null,   // { orderedBy, orderedAt, expiresAt }
        currentHoseHolder: null,
        hoseExpiresAt: null,
        puffsThisMinute: {} // { [socketId]: { count, resetAt } }
    },
    lounge_sag: {
        id: 'lounge_sag',
        name: 'Sağ Üst Nargile Locası',
        x: 625,
        y: 100,
        w: 80,
        h: 55,
        seatedPlayers: {},
        activeNargile: null,
        activeFruit: null,
        currentHoseHolder: null,
        hoseExpiresAt: null,
        puffsThisMinute: {}
    }
};

function resolveLoungeTableId(tableId) {
    if (tableId === 'lounge_sol' || tableId === 'okey101_tekli' || tableId === 'sol') return 'lounge_sol';
    if (tableId === 'lounge_sag' || tableId === 'okey101' || tableId === 'sag') return 'lounge_sag';
    return tableId || 'lounge_sol';
}

let ioInstance = null;
let serverPlayersRef = null;
let loungeLoopTimer = null;

function getPlayerMoney(username) {
    if (!username) return 0;
    const uKey = dataManager.findUserKey ? dataManager.findUserKey(username) : username.toLowerCase();
    if (uKey && dataManager.persistentData.users[uKey]) {
        return dataManager.persistentData.users[uKey].money || 0;
    }
    return 0;
}

function deductPlayerMoney(username, amount) {
    if (!username || amount <= 0) return 0;
    const uKey = dataManager.findUserKey ? dataManager.findUserKey(username) : username.toLowerCase();
    if (uKey && dataManager.persistentData.users[uKey]) {
        dataManager.persistentData.users[uKey].money = Math.max(0, (dataManager.persistentData.users[uKey].money || 0) - amount);
        dataManager.savePersistentData();
        return dataManager.persistentData.users[uKey].money;
    }
    return 0;
}

function initNargileLounge(io, players) {
    ioInstance = io;
    serverPlayersRef = players;

    if (loungeLoopTimer) clearInterval(loungeLoopTimer);
    loungeLoopTimer = setInterval(tickLoungeEngine, 1000);
}

function tickLoungeEngine() {
    if (!ioInstance) return;
    const now = Date.now();

    for (const [tableId, table] of Object.entries(loungeTables)) {
        // 1. Nargile Süresi ve Köz Kontrolü (10 Dakika)
        if (table.activeNargile) {
            if (!table.activeNargile.isCoalBurnedOut && now >= table.activeNargile.coalExpiresAt) {
                // Köz bitti!
                table.activeNargile.isCoalBurnedOut = true;
                // Masadakilere közü yenilemeleri için 60 saniye süre tanı
                table.activeNargile.expiresAt = now + 60 * 1000;
                broadcastLoungeState();
                ioInstance.to(NARGILE_ROOM).emit('lounge_coals_burned_out', {
                    tableId,
                    msg: `🔥 ${table.name} nargilesinin közü bitti! 1 dakika içinde 200 TL'ye köz yenileyebilirsiniz, aksi halde nargile masadan kaldırılacaktır.`
                });
            } else if (table.activeNargile.isCoalBurnedOut && now >= table.activeNargile.expiresAt) {
                // Köz bitti ve köz değiştirilmedi -> Nargile masadan kaybolur!
                table.activeNargile = null;
                table.currentHoseHolder = null;
                table.hoseExpiresAt = null;
                broadcastLoungeState();
                ioInstance.to(NARGILE_ROOM).emit('lounge_table_announcement', {
                    tableId,
                    msg: `💨 ${table.name} üzerindeki nargilenin közü değiştirilmediği için nargile masadan kaldırıldı. Masaya yeni nargile sipariş edebilirsiniz!`
                });
            }
        }

        // 2. Meyve Tabağı Süresi Kontrolü (10 Dakika)
        if (table.activeFruit) {
            if (now >= table.activeFruit.expiresAt) {
                table.activeFruit = null;
                broadcastLoungeState();
                ioInstance.to(NARGILE_ROOM).emit('lounge_table_announcement', {
                    tableId,
                    msg: `🍉 ${table.name} üzerindeki meyve tabağı süresi doldu ve kaldırıldı.`
                });
            }
        }

        // 3. 30 Saniyelik Marpuç Rotasyonu
        if (table.activeNargile && !table.activeNargile.isCoalBurnedOut) {
            const seatedSockets = Object.keys(table.seatedPlayers);
            if (seatedSockets.length > 0) {
                if (!table.currentHoseHolder || !table.seatedPlayers[table.currentHoseHolder] || (table.hoseExpiresAt && now >= table.hoseExpiresAt)) {
                    rotateHoseHolder(table);
                }
            } else {
                table.currentHoseHolder = null;
            }
        }
    }
}

function rotateHoseHolder(table) {
    const seatedSockets = Object.keys(table.seatedPlayers);
    if (seatedSockets.length === 0) {
        table.currentHoseHolder = null;
        table.hoseExpiresAt = null;
        return;
    }

    let nextIndex = 0;
    if (table.currentHoseHolder) {
        const curIdx = seatedSockets.indexOf(table.currentHoseHolder);
        if (curIdx !== -1) {
            nextIndex = (curIdx + 1) % seatedSockets.length;
        }
    }
    const nextSocketId = seatedSockets[nextIndex];
    table.currentHoseHolder = nextSocketId;
    table.hoseExpiresAt = Date.now() + HOSE_ROTATION_INTERVAL_SEC * 1000;

    const holderName = table.seatedPlayers[nextSocketId]?.username || "Misafir";
    ioInstance.to(NARGILE_ROOM).emit('nargile_hose_passed', {
        tableId: table.id,
        socketId: nextSocketId,
        username: holderName,
        secondsLeft: HOSE_ROTATION_INTERVAL_SEC
    });
    broadcastLoungeState();
}

function broadcastLoungeState() {
    if (!ioInstance) return;
    const cleanState = {};
    for (const [tid, t] of Object.entries(loungeTables)) {
        cleanState[tid] = {
            id: t.id,
            name: t.name,
            mode: t.mode,
            seatedCount: Object.keys(t.seatedPlayers).length,
            seatedPlayers: t.seatedPlayers,
            hasNargile: !!t.activeNargile,
            isCoalBurnedOut: t.activeNargile ? !!t.activeNargile.isCoalBurnedOut : false,
            nargileExpiresIn: t.activeNargile ? Math.max(0, Math.floor((t.activeNargile.expiresAt - Date.now()) / 1000)) : 0,
            coalExpiresIn: t.activeNargile ? Math.max(0, Math.floor((t.activeNargile.coalExpiresAt - Date.now()) / 1000)) : 0,
            hasFruit: !!t.activeFruit,
            fruitExpiresIn: t.activeFruit ? Math.max(0, Math.floor((t.activeFruit.expiresAt - Date.now()) / 1000)) : 0,
            currentHoseHolder: t.currentHoseHolder,
            hoseSecondsLeft: t.hoseExpiresAt ? Math.max(0, Math.floor((t.hoseExpiresAt - Date.now()) / 1000)) : 0
        };
    }
    ioInstance.to(NARGILE_ROOM).emit('nargile_lounge_state_update', cleanState);
}

function registerNargileLoungeHandlers(io, socket, players) {
    // 1. Oda girişinde lounge durumunu talep et
    socket.on('get_nargile_lounge_state', (callback) => {
        const cleanState = {};
        for (const [tid, t] of Object.entries(loungeTables)) {
            cleanState[tid] = {
                id: t.id,
                name: t.name,
                mode: t.mode,
                seatedCount: Object.keys(t.seatedPlayers).length,
                seatedPlayers: t.seatedPlayers,
                hasNargile: !!t.activeNargile,
                isCoalBurnedOut: t.activeNargile ? !!t.activeNargile.isCoalBurnedOut : false,
                nargileExpiresIn: t.activeNargile ? Math.max(0, Math.floor((t.activeNargile.expiresAt - Date.now()) / 1000)) : 0,
                coalExpiresIn: t.activeNargile ? Math.max(0, Math.floor((t.activeNargile.coalExpiresAt - Date.now()) / 1000)) : 0,
                hasFruit: !!t.activeFruit,
                fruitExpiresIn: t.activeFruit ? Math.max(0, Math.floor((t.activeFruit.expiresAt - Date.now()) / 1000)) : 0,
                currentHoseHolder: t.currentHoseHolder,
                hoseSecondsLeft: t.hoseExpiresAt ? Math.max(0, Math.floor((t.hoseExpiresAt - Date.now()) / 1000)) : 0
            };
        }
        socket.emit('nargile_lounge_state_update', cleanState);
        if (typeof callback === 'function') callback(cleanState);
    });

    // 2. Koltuğa oturma (ve menü açma isteği)
    socket.on('nargile_sit_table', (data, callback) => {
        if (!data || !data.tableId) {
            if (typeof callback === 'function') callback({ success: false, message: "Geçersiz masa verisi!" });
            return;
        }
        const tableId = resolveLoungeTableId(data.tableId);
        const seatIndex = data.seatIndex !== undefined ? data.seatIndex : 0;
        const table = loungeTables[tableId];
        if (!table) {
            if (typeof callback === 'function') callback({ success: false, message: "Masa bulunamadı!" });
            return;
        }

        const pObj = players[socket.id];
        const username = pObj ? (pObj.name || pObj.username) : "Misafir";

        // Diğer masalardan temizle
        for (const t of Object.values(loungeTables)) {
            delete t.seatedPlayers[socket.id];
        }

        table.seatedPlayers[socket.id] = {
            username: username,
            seatIndex: seatIndex,
            sitTime: Date.now()
        };

        // Eğer masada nargile varsa ve şu an marpuç kimsede değilse marpucu oturan kişiye ver
        if (table.activeNargile && !table.currentHoseHolder) {
            table.currentHoseHolder = socket.id;
            table.hoseExpiresAt = Date.now() + HOSE_ROTATION_INTERVAL_SEC * 1000;
        }

        broadcastLoungeState();

        // Oturan kişiye Lounge Menüsü aç
        socket.emit('open_nargile_menu', {
            tableId: tableId,
            tableName: table.name,
            hasNargile: !!table.activeNargile,
            hasFruit: !!table.activeFruit
        });

        if (typeof callback === 'function') {
            callback({ success: true, tableId, seatIndex });
        }
    });

    // 3. Koltuktan kalkma
    socket.on('nargile_stand_table', (callback) => {
        for (const table of Object.values(loungeTables)) {
            if (table.seatedPlayers[socket.id]) {
                delete table.seatedPlayers[socket.id];
                if (table.currentHoseHolder === socket.id) {
                    rotateHoseHolder(table);
                }
            }
        }
        broadcastLoungeState();
        if (typeof callback === 'function') callback({ success: true });
    });

    // 4. Masaya Sipariş Verme (Ortak Nargile 700 TL, Meyve Tabağı 500 TL)
    socket.on('nargile_order_item', (data, callback) => {
        if (!data || !data.tableId) {
            if (typeof callback === 'function') callback({ success: false, message: "Geçersiz sipariş verisi!" });
            return;
        }
        const tableId = resolveLoungeTableId(data.tableId);
        const itemType = data.item; // 'nargile' | 'fruit'
        const table = loungeTables[tableId];

        if (!table) {
            socket.emit('lounge_error', "Geçersiz masa seçimi!");
            if (typeof callback === 'function') callback({ success: false, message: "Geçersiz masa seçimi!" });
            return;
        }

        const pObj = players[socket.id];
        const username = pObj ? (pObj.name || pObj.username) : null;
        if (!pObj || !username) {
            socket.emit('lounge_error', "Sipariş vermek için giriş yapmış olmalısınız.");
            if (typeof callback === 'function') callback({ success: false, message: "Giriş yapılmalı." });
            return;
        }

        if (itemType === 'nargile') {
            const COST = 700;
            if (table.activeNargile) {
                const msg = "Masanızda zaten aktif bir nargile var! Başka bir nargile isteyemezsiniz.";
                socket.emit('lounge_error', msg);
                if (typeof callback === 'function') callback({ success: false, message: msg });
                return;
            }
            const curMoney = getPlayerMoney(username);
            if (curMoney < COST) {
                socket.emit('lounge_error', `Yetersiz bakiye! Ortak nargile 700 TL (Bakiyeniz: ${curMoney} TL)`);
                if (typeof callback === 'function') callback({ success: false, message: "Yetersiz bakiye!" });
                return;
            }

            const newBalance = deductPlayerMoney(username, COST);
            if (players[socket.id]) players[socket.id].money = newBalance;
            socket.emit('moneyUpdate', newBalance);

            const now = Date.now();
            table.activeNargile = {
                orderedBy: username,
                orderedAt: now,
                coalExpiresAt: now + ITEM_LIFETIME_MS, // 10 dakika köz
                expiresAt: now + ITEM_LIFETIME_MS + 60 * 1000, // 10 dk + 60 sn
                isCoalBurnedOut: false
            };
            table.isConfiscating = false;
            table.puffsThisMinute = {};
            table.currentHoseHolder = socket.id;
            table.hoseExpiresAt = now + HOSE_ROTATION_INTERVAL_SEC * 1000;

            // Garson Haydar'ın mutfaktan çıkıp nargileyi masaya getirmesi, açmak için 2 fırt çekip masaya vermesi animasyonunu tetikle!
            io.to(NARGILE_ROOM).emit('garson_haydar_service', {
                tableId: tableId,
                serviceType: 'serving_nargile',
                orderedBy: username,
                itemName: 'Ortak Nargile (700 TL)'
            });

            socket.emit('lounge_order_success', {
                item: 'nargile',
                message: "💨 Garson Haydar siparişinizi hazırlıyor! Mutfaktan nargilenizi getirip açacak."
            });

            if (typeof callback === 'function') callback({ success: true, item: 'nargile' });

        } else if (itemType === 'fruit') {
            const COST = 500;
            if (table.activeFruit) {
                const msg = "Masanızda zaten bir meyve tabağı var!";
                socket.emit('lounge_error', msg);
                if (typeof callback === 'function') callback({ success: false, message: msg });
                return;
            }
            const curMoney = getPlayerMoney(username);
            if (curMoney < COST) {
                socket.emit('lounge_error', `Yetersiz bakiye! Meyve tabağı 500 TL (Bakiyeniz: ${curMoney} TL)`);
                if (typeof callback === 'function') callback({ success: false, message: "Yetersiz bakiye!" });
                return;
            }

            const newBalance = deductPlayerMoney(username, COST);
            if (players[socket.id]) players[socket.id].money = newBalance;
            socket.emit('moneyUpdate', newBalance);

            const now = Date.now();
            table.activeFruit = {
                orderedBy: username,
                orderedAt: now,
                expiresAt: now + ITEM_LIFETIME_MS
            };

            // Garson Haydar'ın mutfaktan çıkıp meyve tabağını masaya getirmesi animasyonunu tetikle!
            io.to(NARGILE_ROOM).emit('garson_haydar_service', {
                tableId: tableId,
                serviceType: 'serving_fruit',
                orderedBy: username,
                itemName: 'Buzlu Taze Meyve Tabağı (500 TL)'
            });

            socket.emit('lounge_order_success', {
                item: 'fruit',
                message: "🍉 Garson Haydar taze meyve tabağınızı masanıza getiriyor!"
            });

            if (typeof callback === 'function') callback({ success: true, item: 'fruit' });
        }

        broadcastLoungeState();
    });

    // 5. Köz Yenileme (200 TL)
    socket.on('nargile_renew_coals', (data, callback) => {
        if (!data || !data.tableId) {
            if (typeof callback === 'function') callback({ success: false, message: "Geçersiz masa verisi!" });
            return;
        }
        const tableId = resolveLoungeTableId(data.tableId);
        const table = loungeTables[tableId];
        if (!table || !table.activeNargile) {
            socket.emit('lounge_error', "Yenilenecek nargile bulunamadı!");
            if (typeof callback === 'function') callback({ success: false, message: "Yenilenecek nargile bulunamadı!" });
            return;
        }

        const COST = 200;
        const pObj = players[socket.id];
        const username = pObj ? (pObj.name || pObj.username) : null;
        if (!pObj || !username) {
            socket.emit('lounge_error', "Giriş yapmalısınız.");
            if (typeof callback === 'function') callback({ success: false, message: "Giriş yapılmalı." });
            return;
        }

        const curMoney = getPlayerMoney(username);
        if (curMoney < COST) {
            socket.emit('lounge_error', `Yetersiz bakiye! Köz yenileme 200 TL (Bakiyeniz: ${curMoney} TL)`);
            if (typeof callback === 'function') callback({ success: false, message: "Yetersiz bakiye!" });
            return;
        }

        const newBalance = deductPlayerMoney(username, COST);
        if (players[socket.id]) players[socket.id].money = newBalance;
        socket.emit('moneyUpdate', newBalance);

        const now = Date.now();
        table.activeNargile.isCoalBurnedOut = false;
        table.activeNargile.coalExpiresAt = now + ITEM_LIFETIME_MS;
        table.activeNargile.expiresAt = now + ITEM_LIFETIME_MS + 60 * 1000;

        // Garson Haydar elinde közmatikle gelip közleri değiştirme animasyonu
        io.to(NARGILE_ROOM).emit('garson_haydar_service', {
            tableId: tableId,
            serviceType: 'changing_coals',
            orderedBy: username,
            itemName: 'Köz Yenileme (200 TL)'
        });

        socket.emit('lounge_order_success', {
            item: 'coals',
            message: "🔥 Garson Haydar elinde közmatikle közleri tazelemeye geliyor!"
        });

        broadcastLoungeState();
        if (typeof callback === 'function') callback({ success: true });
    });

    // 6. Nargileyi Bırak / Masadan Kaldır
    socket.on('nargile_leave_nargile', (data, callback) => {
        if (!data || !data.tableId) {
            if (typeof callback === 'function') callback({ success: false, message: "Geçersiz veri!" });
            return;
        }
        const tableId = resolveLoungeTableId(data.tableId);
        const table = loungeTables[tableId];
        if (table) {
            if (table.activeNargile) {
                table.activeNargile = null;
                table.currentHoseHolder = null;
                table.hoseExpiresAt = null;
                io.to(NARGILE_ROOM).emit('lounge_table_announcement', {
                    tableId,
                    msg: `💨 ${table.name} nargilesi kaldırıldı. Masaya yeni nargile sipariş edebilirsiniz!`
                });
            }
            if (data.clearFruit || data.clearAll) {
                table.activeFruit = null;
            }
            broadcastLoungeState();
        }
        if (typeof callback === 'function') callback({ success: true });
    });

    // 7. Nargileden Fırt Çekme ve Duman Üfleme (Dakikada en fazla 20 fırt limiti)
    socket.on('nargile_puff', (data, callback) => {
        if (!data || !data.tableId) {
            if (typeof callback === 'function') callback({ success: false, message: "Geçersiz veri!" });
            return;
        }
        const tableId = resolveLoungeTableId(data.tableId);
        const table = loungeTables[tableId];
        if (!table || !table.activeNargile || table.activeNargile.isCoalBurnedOut) {
            if (typeof callback === 'function') callback({ success: false, message: "Masada içilebilir nargile yok!" });
            return;
        }

        if (table.isConfiscating) {
            socket.emit('lounge_error', "Nargile aşırı dumandan dolayı garson tarafından kaldırılıyor!");
            if (typeof callback === 'function') callback({ success: false, message: "Nargile garson tarafından kaldırılıyor!" });
            return;
        }

        // Marpuç bu oyuncuda mı?
        if (table.currentHoseHolder !== socket.id) {
            socket.emit('lounge_error', "Marpuç şu an sizde değil, sıra geldiğinde çekebilirsiniz!");
            if (typeof callback === 'function') callback({ success: false, message: "Marpuç sizde değil!" });
            return;
        }

        const now = Date.now();
        let tracker = table.puffsThisMinute[socket.id];
        if (!tracker || now >= tracker.resetAt) {
            tracker = { count: 0, resetAt: now + 60000 };
            table.puffsThisMinute[socket.id] = tracker;
        }

        if (tracker.count >= 20) {
            const secLeft = Math.ceil((tracker.resetAt - now) / 1000);
            socket.emit('lounge_error', `Dakikada en fazla 20 fırt çekebilirsiniz! (${secLeft} sn sonra tekrar çekebilirsiniz)`);
            if (typeof callback === 'function') callback({ success: false, message: "Dakikada en fazla 20 fırt çekebilirsiniz!" });
            return;
        }

        tracker.count++;

        const pObj = players[socket.id];
        const username = pObj ? (pObj.name || pObj.username) : "Oyuncu";

        // Tüm odaya oyuncunun nargile içip duman üflediğini duyur (Gerçekçi duman partikülleri!)
        io.to(NARGILE_ROOM).emit('nargile_player_puffed', {
            socketId: socket.id,
            username: username,
            tableId: tableId,
            x: pObj ? pObj.x : table.x,
            y: pObj ? pObj.y : table.y,
            puffNumber: tracker.count
        });

        // Kullanıcı Talebi: "20 fırt çektikten sonra herhangi bir yazı çıkmasın. ve dumanın maksimum halinde kalma süresini bi 3 saniye daha uzat (8 sn). dumanın geçme süresini de bi 5 saniye daha uzat yavaş yavaş azalsın (9 sn). duman oranı tamamen bittiğinde garson yavaş yavaş gelip alsın ki yazdığı şeyi görebilelim."
        if (tracker.count === 20) {
            table.isConfiscating = true;

            // 1. Ekranı 8 saniye boyunca kaplayıp 9 saniyede yavaş yavaş dağılacak duman olayını tüm odaya duyur (Toplam 17 sn)
            io.to(NARGILE_ROOM).emit('nargile_dense_smoke_blast', {
                tableId: tableId,
                username: username,
                durationMs: 8000,
                fadeMs: 9000
            });

            // 2. Duman oranı TAMAMEN BİTTİĞİNDE Garson Haydar yavaş yavaş masaya gelir (17.2 sn sonra)
            setTimeout(() => {
                io.to(NARGILE_ROOM).emit('garson_haydar_service', {
                    tableId: tableId,
                    serviceType: 'confiscating_nargile',
                    orderedBy: username,
                    itemName: 'Nargile Müsadere'
                });
            }, 17200);

            // 3. Garson masaya yavaşça varıp nargileyi alıp götürdüğünde sunucu masasından nargileyi kaldır
            setTimeout(() => {
                table.activeNargile = null;
                table.currentHoseHolder = null;
                table.hoseExpiresAt = null;
                table.isConfiscating = false;
                table.puffsThisMinute = {};
                broadcastLoungeState();
            }, 27500);
        }

        if (typeof callback === 'function') callback({ success: true, puffNumber: tracker.count });
    });
}

function handlePlayerDisconnect(socketId) {
    for (const table of Object.values(loungeTables)) {
        if (table.seatedPlayers[socketId]) {
            delete table.seatedPlayers[socketId];
            if (table.currentHoseHolder === socketId) {
                rotateHoseHolder(table);
            }
        }
    }
    broadcastLoungeState();
}

module.exports = {
    initNargileLounge,
    registerNargileLoungeHandlers,
    handlePlayerDisconnect,
    loungeTables
};
