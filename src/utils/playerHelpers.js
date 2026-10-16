// src/utils/playerHelpers.js - Oyuncu Durumu, Zamanlayıcılar ve Yönetim Yardımcı Fonksiyonları

const dataManager = require('../dataManager');
const tableManager = require('../tableManager');
const gameCoordinator = require('../gameCoordinator');

// Zamanlayıcı Havuzları
const playerFishingTimers = {};
const playerTeaTimers = {};

function getPlayersInRoom(players, roomName) {
    let roomPlayers = {};
    for (let id in players) {
        if (players[id].room === roomName) roomPlayers[id] = players[id];
    }
    return roomPlayers;
}

function givePlayerTeaWithTimer(io, players, targetSocketId, targetUsername, durationMs = 300000) {
    let target = players[targetSocketId];
    if (!target) return;
    target.hasTea = true;
    target.heldItem = 'cay';

    let targetData = dataManager.persistentData.users[targetUsername];
    if (targetData) {
        if (!targetData.avatar) targetData.avatar = {};
        targetData.avatar.heldItem = 'cay';
        targetData.teaExpiresAt = Date.now() + durationMs;
        if (!targetData.propInventory) targetData.propInventory = {};
        targetData.propInventory['props_cay'] = 1;
        dataManager.savePersistentData();
    }

    if (playerTeaTimers[targetSocketId]) {
        clearTimeout(playerTeaTimers[targetSocketId]);
        delete playerTeaTimers[targetSocketId];
    }

    playerTeaTimers[targetSocketId] = setTimeout(() => {
        delete playerTeaTimers[targetSocketId];
        let currentTarget = players[targetSocketId];
        if (currentTarget && (currentTarget.heldItem === 'cay' || currentTarget.hasTea)) {
            currentTarget.heldItem = 'none';
            currentTarget.hasTea = false;
            if (dataManager.persistentData.users[targetUsername]) {
                dataManager.persistentData.users[targetUsername].avatar.heldItem = 'none';
                dataManager.persistentData.users[targetUsername].teaExpiresAt = null;
                delete dataManager.persistentData.users[targetUsername].propInventory['props_cay'];
                dataManager.savePersistentData();
            }
            io.to(currentTarget.room).emit('playerAvatarChange', {
                id: targetSocketId,
                avatar: dataManager.persistentData.users[targetUsername]?.avatar,
                heldItem: 'none'
            });
            io.to(currentTarget.room).emit('playerActionUpdate', {
                id: targetSocketId,
                action: null,
                hasTea: false
            });
            io.to(targetSocketId).emit('teaExpired');
            io.to(targetSocketId).emit('systemMessage', "☕ Çayını bitirdin ve bardak soğudu! (5 dakikalık süren doldu).");
            io.to(targetSocketId).emit('propInventoryUpdate', dataManager.persistentData.users[targetUsername]?.propInventory || {});
        }
    }, durationMs);

    io.to(target.room).emit('playerActionUpdate', { id: targetSocketId, action: 'tea', hasTea: true });
    io.to(target.room).emit('playerAvatarChange', { id: targetSocketId, avatar: targetData?.avatar, heldItem: 'cay' });
    io.to(targetSocketId).emit('teaTimerStarted', { remainingMs: durationMs });
    io.to(targetSocketId).emit('propInventoryUpdate', targetData?.propInventory || {});
}

function getPlayerDetailedLocation(sid, p) {
    if (!p) return "Bilinmiyor";

    // 1. Aktif Bir Oyunda mı?
    let activeGames = gameCoordinator.getActiveGames();
    for (let tid in activeGames) {
        let g = activeGames[tid];
        if (!g) continue;
        let isPlayer = g.players && g.players.includes(sid);
        let isSpec = g.spectators && g.spectators.includes(sid);
        if (isPlayer || isSpec) {
            let roleStr = isSpec ? " (Yancı/İzleyici)" : " (Oyuncu)";
            if (tid.startsWith('billiard')) return `🎱 8-Ball Bilardo Masası${roleStr}`;
            if (tid.startsWith('okey101')) return `🀄 101 Okey (${g.isTekli ? 'Tekli' : 'Eşli'}) Masası${roleStr}`;
            if (tid.startsWith('batak4')) return `♠️ 4 Kişilik Batak Masası${roleStr}`;
            if (tid.startsWith('batak')) return `♠️ Gömmeli Batak Masası${roleStr}`;
            if (tid.startsWith('tavla')) return `🎲 Klasik Tavla Masası${roleStr}`;
            return `Masa Oyunu [${tid}]${roleStr}`;
        }
    }

    // 2. Bekleyen Lobi Masasında mı?
    let tables = tableManager.getTables();
    for (let tid in tables) {
        let t = tables[tid];
        if (t.players && t.players.includes(sid)) {
            let tName = t.name || (t.baseType ? t.baseType.toUpperCase() : tid);
            return `⏳ Masa Beklemede (${tName} - ${t.players.length}/${t.maxPlayers || 4})`;
        }
    }

    // 3. Mini Metaverse Harita Odaları ve Koordinatları
    let r = p.room || "sokak";
    let x = Math.round(p.x || 0);
    let y = Math.round(p.y || 0);

    if (r === "kafe") return `☕ Kafe & Oyun Salonu (X: ${x}, Y: ${y})`;
    if (r === "sahil") return `🏖️ Sahil & Plaj (X: ${x}, Y: ${y})`;
    if (r === "nargile_cafe") return `💨 Nargile Kafe (X: ${x}, Y: ${y})`;
    if (r === "market") return `🛒 Mobilya Marketi Showroom (X: ${x}, Y: ${y})`;
    if (r === "ganyan") return `🏇 Altılı Ganyan Bayii & Hipodrom (X: ${x}, Y: ${y})`;
    if (r === "cadde") return `🛣️ Yeni Cadde (Ganyan & Casino) (X: ${x}, Y: ${y})`;
    if (r === "dedenin_yeri") return `⚡ Dedenin Yeri Casino (X: ${x}, Y: ${y})`;
    if (r === "emlakci") return `🏢 Prestij Emlak Ofisi (X: ${x}, Y: ${y})`;
    if (r === "sokak") return `🏙️ Sokak / Çarşı (X: ${x}, Y: ${y})`;
    if (r.startsWith("house_")) {
        let owner = r.replace("house_", "");
        return `🏠 ${owner}'in Evi (X: ${x}, Y: ${y})`;
    }

    return `${r} (X: ${x}, Y: ${y})`;
}

function getAdminOnlineUsers(players) {
    let list = [];
    const now = Date.now();
    for (let sid in players) {
        let p = players[sid];
        if (!p || !p.name) continue;

        let uData = dataManager.persistentData.users[p.name] || {};
        let uMoney = uData.money !== undefined ? uData.money : (p.money || 0);

        let locStr = getPlayerDetailedLocation(sid, p);
        let isMuted = !!(uData.muteExpiresAt && now < uData.muteExpiresAt);
        let muteMinutesRemaining = isMuted ? Math.ceil((uData.muteExpiresAt - now) / 60000) : 0;

        list.push({
            username: p.name,
            money: uMoney,
            isOnline: true,
            location: locStr,
            room: p.room || "sokak",
            x: Math.round(p.x || 0),
            y: Math.round(p.y || 0),
            isAdmin: !!p.isAdmin,
            isFishing: !!p.isFishing,
            hasTea: !!p.hasTea,
            isMuted: isMuted,
            muteMinutesRemaining: muteMinutesRemaining,
            action: p.action || null
        });
    }

    return list.sort((a, b) => a.username.localeCompare(b.username));
}

function getAdminSanctionsList() {
    let list = [];
    const now = Date.now();
    for (let uname in dataManager.persistentData.users) {
        let uData = dataManager.persistentData.users[uname];
        let isBanned = !!(uData.banExpiresAt && now < uData.banExpiresAt);
        let isMuted = !!(uData.muteExpiresAt && now < uData.muteExpiresAt);
        if (isBanned || isMuted) {
            list.push({
                username: uname,
                isBanned: isBanned,
                banRemainingMinutes: isBanned ? Math.ceil((uData.banExpiresAt - now) / 60000) : 0,
                banReason: uData.banReason || 'Yönetici kararı',
                bannedBy: uData.bannedBy || 'Admin',
                isMuted: isMuted,
                muteRemainingMinutes: isMuted ? Math.ceil((uData.muteExpiresAt - now) / 60000) : 0,
                muteReason: uData.muteReason || 'Yönetici kararı',
                mutedBy: uData.mutedBy || 'Admin'
            });
        }
    }
    return list;
}

module.exports = {
    playerFishingTimers,
    playerTeaTimers,
    getPlayersInRoom,
    givePlayerTeaWithTimer,
    getPlayerDetailedLocation,
    getAdminOnlineUsers,
    getAdminSanctionsList
};
