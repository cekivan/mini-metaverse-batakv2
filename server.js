// server.js - Mini Metaverse Ana Sunucusu & Modüler Soket Orkestratörü
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const config = require('./src/config');
const dataManager = require('./src/dataManager');
const tableManager = require('./src/tableManager');
const gameCoordinator = require('./src/gameCoordinator');

// Handler Modülleri
const { registerAuthHandlers } = require('./src/handlers/authHandler');
const { registerSocialHandlers } = require('./src/handlers/socialHandler');
const { registerHousingHandlers } = require('./src/handlers/housingHandler');
const { registerEconomyHandlers } = require('./src/handlers/economyHandler');
const { registerGameActionHandlers } = require('./src/handlers/gameActionHandler');
const { registerVoiceHandlers, cleanupSocketVoice } = require('./src/handlers/voiceHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Çevrimiçi Oyuncular Havuzu
const players = {};

// Zamanlayıcı Havuzları
const playerFishingTimers = {};
const playerTeaTimers = {};

function getPlayersInRoom(roomName) {
    let roomPlayers = {};
    for (let id in players) {
        if (players[id].room === roomName) roomPlayers[id] = players[id];
    }
    return roomPlayers;
}

function givePlayerTeaWithTimer(targetSocketId, targetUsername, durationMs = 300000) {
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

function getAdminOnlineUsers() {
    let onlineUsernames = [...new Set(Object.values(players).map(p => p.name))];
    return onlineUsernames.map(u => ({
        username: u,
        money: dataManager.persistentData.users[u]?.money !== undefined ? dataManager.persistentData.users[u].money : 0,
        isOnline: true
    })).sort((a, b) => a.username.localeCompare(b.username));
}

const helpers = {
    getPlayersInRoom,
    givePlayerTeaWithTimer,
    getAdminOnlineUsers,
    playerFishingTimers,
    playerTeaTimers
};

// --- SOKET BAĞLANTILARI ---
io.on('connection', (socket) => {
    // 1. Modüler Handler'ları Kaydet
    registerAuthHandlers(io, socket, players, helpers);
    registerSocialHandlers(io, socket, players, helpers);
    registerHousingHandlers(io, socket, players);
    registerEconomyHandlers(io, socket, players, helpers);
    registerGameActionHandlers(io, socket, players);
    registerVoiceHandlers(io, socket, players);

    // 2. Oyuncu Hareketi
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id] && movementData) {
            if (players[socket.id].isFishing) {
                let dx = Math.abs(players[socket.id].x - movementData.x);
                let dy = Math.abs(players[socket.id].y - movementData.y);
                if (dx > 3 || dy > 3) {
                    players[socket.id].isFishing = false;
                    if (playerFishingTimers[socket.id]) {
                        clearTimeout(playerFishingTimers[socket.id]);
                        delete playerFishingTimers[socket.id];
                    }
                    io.to(players[socket.id].room).emit('playerFishingState', { id: socket.id, isFishing: false });
                    socket.emit('fishingCancelled');
                }
            }
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            socket.to(players[socket.id].room).emit('playerMoved', { id: socket.id, x: movementData.x, y: movementData.y });
        }
    });

    // 3. Mekan Değiştirme
    socket.on('changeRoom', (newRoom) => {
        if (!players[socket.id] || !newRoom) return;
        let oldRoom = players[socket.id].room;

        if (players[socket.id].isFishing) {
            players[socket.id].isFishing = false;
            if (playerFishingTimers[socket.id]) {
                clearTimeout(playerFishingTimers[socket.id]);
                delete playerFishingTimers[socket.id];
            }
        }

        socket.leave(oldRoom);
        socket.to(oldRoom).emit('playerDisconnected', socket.id);

        socket.join(newRoom);
        players[socket.id].room = newRoom;

        if (newRoom === "kafe") { players[socket.id].x = 350; players[socket.id].y = 400; }
        else if (newRoom === "sokak") { players[socket.id].x = 350; players[socket.id].y = 80; }
        else if (newRoom === "sahil") { players[socket.id].x = 420; players[socket.id].y = 350; }
        else if (newRoom === "nargile_cafe") { players[socket.id].x = 400; players[socket.id].y = 380; }
        else if (newRoom === "market") { players[socket.id].x = 400; players[socket.id].y = 420; }
        else if (newRoom.startsWith("house_")) {
            players[socket.id].x = 400; players[socket.id].y = 400;
            let parsed = dataManager.parseHouseRoom(newRoom);
            if (parsed) {
                let hData = dataManager.persistentData.users[parsed.owner];
                if (hData) {
                    let targetHouse = null;
                    let targetType = parsed.houseType;
                    if (hData.houses && targetType && hData.houses[targetType]) {
                        targetHouse = hData.houses[targetType];
                    } else if (hData.houses && Object.keys(hData.houses).length > 0) {
                        targetType = targetType || Object.keys(hData.houses)[0];
                        targetHouse = hData.houses[targetType];
                    } else if (hData.house) {
                        targetHouse = hData.house;
                        targetType = targetType || hData.house.type || 'standart';
                    }

                    if (targetHouse) {
                        socket.emit('houseDataUpdate', {
                            ...targetHouse,
                            owner: parsed.owner,
                            type: targetType,
                            houseId: `${parsed.owner}_${targetType}`
                        });
                    }
                }
            }
        }

        socket.emit('currentPlayers', getPlayersInRoom(newRoom));
        socket.to(newRoom).emit('newPlayer', { id: socket.id, player: players[socket.id] });
    });

    // 4. Bağlantı Kopması
    socket.on('disconnect', () => {
        if (playerFishingTimers[socket.id]) {
            clearTimeout(playerFishingTimers[socket.id]);
            delete playerFishingTimers[socket.id];
        }
        if (playerTeaTimers[socket.id]) {
            clearTimeout(playerTeaTimers[socket.id]);
            delete playerTeaTimers[socket.id];
        }

        cleanupSocketVoice(socket);

        if (players[socket.id]) {
            let pName = players[socket.id].name;
            let room = players[socket.id].room;
            console.log(`${pName} oyundan ayrıldı.`);

            let activeGames = gameCoordinator.getActiveGames();
            for (let gid in activeGames) {
                let g = activeGames[gid];
                if (g.players.includes(socket.id)) {
                    if (!g.disconnectedPlayers) g.disconnectedPlayers = {};
                    let seatIdx = g.players.indexOf(socket.id);
                    g.disconnectedPlayers[socket.id] = {
                        name: pName,
                        seatIndex: seatIdx
                    };

                    g.players.forEach(pid => {
                        if (pid !== socket.id) {
                            io.to(pid).emit('systemMessage', `⚠️ ${pName} masadan ayrıldı! Koltuk boş, yerine biri oturabilir veya geri gelebilir.`);
                        }
                    });
                    if (g.spectators) {
                        g.spectators.forEach(sid => io.to(sid).emit('systemMessage', `⚠️ ${pName} masadan ayrıldı!`));
                    }
                    if (gid.startsWith('batak')) {
                        gameCoordinator.sendBatakUpdate(g, io, players);
                    } else if (gid.startsWith('tavla')) {
                        gameCoordinator.sendTavlaUpdate(g, io);
                    } else if (gid.startsWith('okey101')) {
                        gameCoordinator.sendOkey101Update(g, io, players);
                    }

                    let connectedHumans = g.players.filter(pid => !pid.startsWith('bot_') && (!g.disconnectedPlayers || !g.disconnectedPlayers[pid]));
                    if (connectedHumans.length === 0) {
                        // 45 Saniyelik F5 / Ağ Kopması Hoşgörü Süresi (Grace Period)
                        if (!gameCoordinator.tableCleanupTimers[gid]) {
                            gameCoordinator.tableCleanupTimers[gid] = setTimeout(() => {
                                delete gameCoordinator.tableCleanupTimers[gid];
                                let currGame = activeGames[gid];
                                if (!currGame) return;
                                let stillConnected = currGame.players.filter(pid => !pid.startsWith('bot_') && (!currGame.disconnectedPlayers || !currGame.disconnectedPlayers[pid]));
                                if (stillConnected.length === 0) {
                                    console.log(`[Grace Period] 45 sn doldu, ${gid} masası temizleniyor.`);
                                    if (gameCoordinator.batakAfkTimers[gid]) {
                                        clearTimeout(gameCoordinator.batakAfkTimers[gid]);
                                        delete gameCoordinator.batakAfkTimers[gid];
                                    }
                                    if (gameCoordinator.okey101AfkTimers[gid]) {
                                        clearTimeout(gameCoordinator.okey101AfkTimers[gid]);
                                        delete gameCoordinator.okey101AfkTimers[gid];
                                    }
                                    if (gameCoordinator.billiardBotTimers[gid]) {
                                        clearTimeout(gameCoordinator.billiardBotTimers[gid]);
                                        delete gameCoordinator.billiardBotTimers[gid];
                                    }
                                    delete activeGames[gid];
                                    let table = tableManager.getTable(gid);
                                    if (table) table.players = [];
                                }
                            }, 45000);
                        }
                    }
                }
                if (g.spectators) {
                    g.spectators = g.spectators.filter(sid => sid !== socket.id);
                }
            }

            delete players[socket.id];
            io.to(room).emit('playerDisconnected', socket.id);

            tableManager.removePlayerFromLobbies(socket.id);
        }
    });
});

// Bilardo Fizik Motorunu Başlat
gameCoordinator.startBilliardPhysicsLoop(io);

// Global Güvenlik Katmanı (Uncaught Exception & Unhandled Rejection Koruması)
process.on('uncaughtException', (err) => {
    console.error('⚠️ [KRİTİK GÜVENLİK KATMANI - UNCAUGHT EXCEPTION]:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ [KRİTİK GÜVENLİK KATMANI - UNHANDLED REJECTION]:', reason);
});

// Güvenli Kapanma (Graceful Shutdown)
process.on('SIGINT', () => {
    console.log('\nSunucu kapatılıyor, veriler diske atomik yazılıyor...');
    dataManager.flushNow();
    process.exit(0);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ [BİLGİ]: Port ${config.PORT} zaten kullanımda! Sunucu zaten arka planda açık ve çalışıyor.`);
        console.error(`👉 Tarayıcınızdan http://localhost:${config.PORT} adresine girip oyunu hemen oynayabilirsiniz.\n`);
        process.exit(0);
    } else {
        console.error('Sunucu başlatma hatası:', err);
    }
});

server.listen(config.PORT, () => {
    console.log(`Mini Metaverse Sunucusu aktif: http://localhost:${config.PORT}`);
});