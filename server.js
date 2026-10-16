// server.js - Mini Metaverse Ana Sunucusu & Modüler Soket Orkestratörü
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const config = require('./src/config');
const dataManager = require('./src/dataManager');
const tableManager = require('./src/tableManager');
const gameCoordinator = require('./src/gameCoordinator');
const fatherPetManager = require('./src/fatherPetManager');
const { getRoomSpawn, getDemoHouseConfig } = require('./src/config/roomSpawns');

// Handler Modülleri
const { registerAuthHandlers } = require('./src/handlers/authHandler');
const { registerSocialHandlers } = require('./src/handlers/socialHandler');
const { registerHousingHandlers } = require('./src/handlers/housingHandler');
const { registerEconomyHandlers, playerSwanTimers } = require('./src/handlers/economyHandler');
const { registerGameActionHandlers } = require('./src/handlers/gameActionHandler');
const { registerVoiceHandlers, cleanupSocketVoice } = require('./src/handlers/voiceHandler');
const { registerBlackjackHandlers, removePlayerFromBlackjack } = require('./src/handlers/blackjackHandler');
const { registerRouletteHandlers } = require('./src/handlers/rouletteHandler');
const { registerSlotHandlers } = require('./src/handlers/slotHandler');
const { initGanyanEngine, registerGanyanHandlers } = require('./src/handlers/ganyanHandler');
const { initNargileLounge, registerNargileLoungeHandlers, handlePlayerDisconnect: handleNargileDisconnect } = require('./src/handlers/nargileLoungeHandler');
const adManager = require('./src/adManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Çevrimiçi Oyuncular Havuzu
const players = {};

// Modüler Yardımcı Fonksiyonlar & Zamanlayıcılar
const {
    getPlayersInRoom,
    givePlayerTeaWithTimer,
    getAdminOnlineUsers,
    getAdminSanctionsList,
    playerFishingTimers,
    playerTeaTimers
} = require('./src/utils/playerHelpers');

function getRoomPlayers(roomName) {
    return getPlayersInRoom(players, roomName);
}

const helpers = {
    getPlayersInRoom: (room) => getPlayersInRoom(players, room),
    givePlayerTeaWithTimer: (sid, uname, dur) => givePlayerTeaWithTimer(io, players, sid, uname, dur),
    getAdminOnlineUsers: () => getAdminOnlineUsers(players),
    getAdminSanctionsList: () => getAdminSanctionsList(),
    playerFishingTimers,
    playerTeaTimers
};

// Baba Peti (Denizden Babam Çıksa Yerim) Yöneticisini Başlat
fatherPetManager.init(io, players, dataManager);

// Altılı Ganyan Hipodrom Yarış Motorunu Başlat
initGanyanEngine(io, players);

// Otantik Nargile Lounge Motorunu Başlat
initNargileLounge(io, players);

// Canlı Reklam Panoları ve TV Ağı Motorunu Başlat
adManager.init(io, players);

// --- SOKET BAĞLANTILARI ---
io.on('connection', (socket) => {
    // 1. Modüler Handler'ları Kaydet
    registerAuthHandlers(io, socket, players, helpers);
    registerSocialHandlers(io, socket, players, helpers);
    registerHousingHandlers(io, socket, players);
    registerEconomyHandlers(io, socket, players, helpers);
    registerGameActionHandlers(io, socket, players);
    registerVoiceHandlers(io, socket, players);
    registerBlackjackHandlers(io, socket, players);
    registerRouletteHandlers(io, socket, players);
    registerSlotHandlers(io, socket, players);
    registerGanyanHandlers(io, socket, players);
    registerNargileLoungeHandlers(io, socket, players);

    // Reklam Ağı Soket Dinleyicileri
    adManager.handleClientConnect(socket);
    socket.on('submitBillboardAd', (data) => adManager.submitAd(socket, data ? data.text : ''));
    socket.on('getBillboardAdState', () => socket.emit('billboardAdUpdate', adManager.getState()));

    // 2. Oyuncu Hareketi (Akıcı Ağ Filtrelemesi)
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id] && movementData) {
            let prevX = players[socket.id].x;
            let prevY = players[socket.id].y;
            let hasMoved = (prevX === undefined || prevY === undefined || Math.abs(prevX - movementData.x) > 0.05 || Math.abs(prevY - movementData.y) > 0.05);

            if (players[socket.id].isFishing && hasMoved) {
                let dx = Math.abs(prevX - movementData.x);
                let dy = Math.abs(prevY - movementData.y);
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
            let stateChanged = (movementData.isMoving !== undefined && movementData.isMoving !== players[socket.id]._lastBroadcastMoving);
            if (movementData.isMoving !== undefined) {
                players[socket.id].isMoving = movementData.isMoving;
            }

            if (hasMoved || stateChanged) {
                players[socket.id]._lastBroadcastMoving = movementData.isMoving;
                socket.to(players[socket.id].room).emit('playerMoved', { 
                    id: socket.id, 
                    x: movementData.x, 
                    y: movementData.y,
                    isMoving: movementData.isMoving
                });
                fatherPetManager.updateOwnerPosition(socket.id, movementData.x, movementData.y);
            }
        }
    });

    // 3. Mekan Değiştirme
    socket.on('changeRoom', (newRoom) => {
        if (!players[socket.id] || !newRoom || typeof newRoom !== 'string') return;
        let oldRoom = players[socket.id].room;

        if (players[socket.id].isFishing) {
            players[socket.id].isFishing = false;
            if (playerFishingTimers[socket.id]) {
                clearTimeout(playerFishingTimers[socket.id]);
                delete playerFishingTimers[socket.id];
            }
        }
        if (oldRoom === 'sahil' && newRoom !== 'sahil') {
            players[socket.id].hasSwanBoat = false;
            if (playerSwanTimers && playerSwanTimers[socket.id]) {
                clearTimeout(playerSwanTimers[socket.id]);
                delete playerSwanTimers[socket.id];
            }
        }

        socket.leave(oldRoom);
        socket.to(oldRoom).emit('playerDisconnected', socket.id);

        socket.join(newRoom);
        players[socket.id].room = newRoom;

        if (newRoom === "kafe") { 
            players[socket.id].x = 400; players[socket.id].y = 410; 
        }
        else if (newRoom === "sokak") { 
            if (oldRoom === "sahil") { players[socket.id].x = 85; players[socket.id].y = 240; }
            else if (oldRoom === "cadde") { players[socket.id].x = 720; players[socket.id].y = 240; }
            else if (oldRoom === "kafe") { players[socket.id].x = 400; players[socket.id].y = 125; }
            else if (oldRoom === "nargile_cafe") { players[socket.id].x = 670; players[socket.id].y = 125; }
            else if (oldRoom === "market") { players[socket.id].x = 730; players[socket.id].y = 350; }
            else if (oldRoom === "emlakci") { players[socket.id].x = 180; players[socket.id].y = 125; }
            else { players[socket.id].x = 350; players[socket.id].y = 230; }
        }
        else if (newRoom === "cadde") {
            if (oldRoom === "sokak") { players[socket.id].x = 80; players[socket.id].y = 230; }
            else if (oldRoom === "ganyan") { players[socket.id].x = 210; players[socket.id].y = 145; }
            else if (oldRoom === "dedenin_yeri") { players[socket.id].x = 585; players[socket.id].y = 145; }
            else { players[socket.id].x = 400; players[socket.id].y = 230; }
        }
        else if (newRoom === "emlakci") { 
            players[socket.id].x = 400; players[socket.id].y = 410; 
        }
        else if (newRoom === "sahil") { 
            if (oldRoom === "sokak") { players[socket.id].x = 680; players[socket.id].y = 270; }
            else { players[socket.id].x = 420; players[socket.id].y = 350; }
        }
        else if (newRoom === "ganyan") { 
            players[socket.id].x = 400; players[socket.id].y = 410; 
        }
        else if (newRoom === "dedenin_yeri") { 
            players[socket.id].x = 400; players[socket.id].y = 410; 
        }
        else if (newRoom === "nargile_cafe") { 
            players[socket.id].x = 400; players[socket.id].y = 390; 
        }
        else if (newRoom === "market") { 
            players[socket.id].x = 400; players[socket.id].y = 420; 
        }
        else if (newRoom.startsWith("house_")) {
            players[socket.id].x = 400; players[socket.id].y = 400;
            let parsed = dataManager.parseHouseRoom(newRoom);
            if (parsed) {
                let isDemo = (parsed.owner === 'ornek' || parsed.owner === 'demo');
                if (isDemo) {
                    let demoType = parsed.houseType || 'standart';
                    let demoFurn = getDemoHouseConfig(demoType);
                    socket.emit('houseDataUpdate', {
                        owner: 'Örnek Daire',
                        type: demoType,
                        houseId: newRoom,
                        furniture: demoFurn,
                        isDemo: true
                    });
                } else {
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
        }

        fatherPetManager.handleRoomChange(socket.id, oldRoom, newRoom);
        if (oldRoom === 'nargile_cafe' && newRoom !== 'nargile_cafe') {
            handleNargileDisconnect(socket.id);
        }

        socket.emit('currentPlayers', getRoomPlayers(newRoom));
        socket.emit('activeFatherPets', fatherPetManager.getPetsInRoom(newRoom));
        socket.to(newRoom).emit('newPlayer', { id: socket.id, player: players[socket.id] });
    });

    // 4. Bağlantı Kopması
    socket.on('disconnect', () => {
        handleNargileDisconnect(socket.id);
        fatherPetManager.handleDisconnect(socket.id);
        if (playerFishingTimers[socket.id]) {
            clearTimeout(playerFishingTimers[socket.id]);
            delete playerFishingTimers[socket.id];
        }
        if (playerTeaTimers[socket.id]) {
            clearTimeout(playerTeaTimers[socket.id]);
            delete playerTeaTimers[socket.id];
        }
        if (playerSwanTimers && playerSwanTimers[socket.id]) {
            clearTimeout(playerSwanTimers[socket.id]);
            delete playerSwanTimers[socket.id];
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

            removePlayerFromBlackjack(io, socket.id, players);
            tableManager.removePlayerFromLobbies(socket.id);

            delete players[socket.id];
            io.to(room).emit('playerDisconnected', socket.id);
        } else {
            removePlayerFromBlackjack(io, socket.id, players);
            tableManager.removePlayerFromLobbies(socket.id);
        }
    });
});

// Bilardo Fizik Motorunu Başlat
gameCoordinator.startBilliardPhysicsLoop(io, players);

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