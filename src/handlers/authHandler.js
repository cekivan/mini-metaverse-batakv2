// src/handlers/authHandler.js - Giriş, Kayıt, Şifre Değiştirme ve Reconnect Yöneticisi
const dataManager = require('../dataManager');
const tableManager = require('../tableManager');
const gameCoordinator = require('../gameCoordinator');

function registerAuthHandlers(io, socket, players, helpers) {
    const { getPlayersInRoom, givePlayerTeaWithTimer } = helpers;

    // Ortak Giriş Başarılı İşlemi
    function onLoginSuccess(uData, username, isAdmin) {
        let hasValidTea = false;
        if (uData.teaExpiresAt) {
            if (Date.now() >= uData.teaExpiresAt) {
                uData.teaExpiresAt = null;
                if (uData.avatar.heldItem === 'cay') uData.avatar.heldItem = 'none';
                if (uData.propInventory) delete uData.propInventory['props_cay'];
                dataManager.savePersistentData();
            } else {
                hasValidTea = true;
            }
        }

        players[socket.id] = {
            name: username,
            x: 400, y: 400,
            color: uData.avatar.shirtColor || '#3b82f6',
            skinColor: uData.avatar.skinColor || '#facc15',
            hat: uData.avatar.hat || 'bere',
            face: uData.avatar.face || 'none',
            heldItem: uData.avatar.heldItem || 'none',
            shoes: uData.avatar.shoes || 'none',
            gender: uData.gender || 'male',
            money: uData.money !== undefined ? uData.money : 100,
            msg: "",
            room: "sokak",
            hasTea: hasValidTea,
            action: hasValidTea ? 'tea' : null,
            isFishing: false,
            hasSwanBoat: false,
            isAdmin: isAdmin
        };

        if (hasValidTea) {
            givePlayerTeaWithTimer(socket.id, username, uData.teaExpiresAt - Date.now());
        }

        socket.join("sokak");

        socket.emit('loginSuccess', {
            money: uData.money,
            avatar: uData.avatar,
            inventory: uData.inventory,
            propInventory: uData.propInventory || {},
            friendRequests: uData.friendRequests || [],
            isAdmin: isAdmin,
            username: username,
            friends: dataManager.getFriendListData(username, players),
            houses: uData.houses || (uData.house ? { [uData.house.type]: uData.house } : {}),
            house: uData.house,
            gender: uData.gender || 'male',
            furnitureInventory: uData.furnitureInventory || []
        });

        socket.emit('currentPlayers', getPlayersInRoom("sokak"));
        socket.to("sokak").emit('newPlayer', { id: socket.id, player: players[socket.id] });

        console.log(`${username} oyuna girdi! Bakiye: ${uData.money} TL (Admin: ${isAdmin})`);

        // Devam eden oyun kontrolü (Reconnect Teklifi)
        const activeGames = gameCoordinator.getActiveGames();
        let ongoingGame = null;
        for (let tid in activeGames) {
            let g = activeGames[tid];
            if (g && g.disconnectedPlayers) {
                for (let dPid in g.disconnectedPlayers) {
                    if (g.disconnectedPlayers[dPid].name.toLowerCase() === username.toLowerCase()) {
                        ongoingGame = { tableId: tid, game: g };
                        break;
                    }
                }
            }
            if (ongoingGame) break;
        }

        if (ongoingGame) {
            let table = tableManager.getTable(ongoingGame.tableId);
            let tName = table ? table.name : "Masa";
            socket.emit('promptReconnect', { tableId: ongoingGame.tableId, tableName: tName });
        }
    }

    // 1. MEVCUT HESAP İLE GİRİŞ
    socket.on('login', (data) => {
        if (!data) {
            socket.emit('loginFailed', "Giriş bilgileri eksik!");
            return;
        }

        const inputName = dataManager.sanitizeString(data.name || "Oyuncu", 20);
        const pass = typeof data.pass === 'string' ? data.pass.trim() : "";

        const authResult = dataManager.loginUser(inputName, pass, players);

        if (!authResult.success) {
            socket.emit('loginFailed', authResult.message || "Giriş başarısız!");
            return;
        }

        const username = authResult.username;
        const uData = authResult.userData;
        const isAdmin = (uData.role === 'admin' || uData.isAdmin === true);

        onLoginSuccess(uData, username, isAdmin);
    });

    // 2. YENİ HESAP KAYIT (REGISTER)
    socket.on('register', (data) => {
        if (!data) {
            socket.emit('registerFailed', "Kayıt bilgileri eksik!");
            return;
        }

        const inputName = dataManager.sanitizeString(data.name || "", 20);
        const pass = typeof data.pass === 'string' ? data.pass.trim() : "";
        const chosenGender = (data.gender === 'female') ? 'female' : 'male';

        const regResult = dataManager.registerUser(inputName, pass, chosenGender);

        if (!regResult.success) {
            socket.emit('registerFailed', regResult.message || "Kayıt başarısız!");
            return;
        }

        const username = regResult.username;
        const uData = regResult.userData;
        const isAdmin = (uData.role === 'admin' || uData.isAdmin === true);

        onLoginSuccess(uData, username, isAdmin);
        socket.emit('systemMessage', `🎉 Hoş geldiniz ${username}! Hesabınız başarıyla oluşturuldu. Başlangıç hediyesi: 100 TL!`);
    });

    // 3. OYUN İÇİ ŞİFRE DEĞİŞTİRME
    socket.on('changePassword', (data) => {
        if (!players[socket.id] || !data) return;
        const username = players[socket.id].name;
        const oldPass = typeof data.oldPass === 'string' ? data.oldPass.trim() : "";
        const newPass = typeof data.newPass === 'string' ? data.newPass.trim() : "";

        const result = dataManager.changeUserPassword(username, oldPass, newPass);

        if (result.success) {
            socket.emit('passwordChangeResult', { success: true, message: result.message });
            socket.emit('systemMessage', result.message);
        } else {
            socket.emit('passwordChangeResult', { success: false, message: result.message });
        }
    });

    // 4. RECONNECT (Kendi Eski Koltuğuna Geri Dönüş)
    socket.on('acceptReconnect', (tableId) => {
        let game = gameCoordinator.getActiveGame(tableId);
        if (!game || !players[socket.id]) return;

        let myName = players[socket.id].name.toLowerCase();
        let oldPid = null;

        for (let pid in game.disconnectedPlayers) {
            if (game.disconnectedPlayers[pid].name.toLowerCase() === myName) {
                oldPid = pid;
                break;
            }
        }
        if (!oldPid) {
            for (let pid in game.playerProfiles) {
                if (game.playerProfiles[pid].name.toLowerCase() === myName) {
                    oldPid = pid;
                    break;
                }
            }
        }

        if (!oldPid || !game.players.includes(oldPid)) {
            socket.emit('gameError', "Eski koltuğunuz artık mevcut değil veya başka biri devraldı.");
            return;
        }

        let pIndex = game.players.indexOf(oldPid);
        if (pIndex !== -1) game.players[pIndex] = socket.id;

        gameCoordinator.clearTableCleanupTimer(tableId);

        game.playerProfiles[socket.id] = game.playerProfiles[oldPid];
        delete game.playerProfiles[oldPid];

        if (game.disconnectedPlayers) delete game.disconnectedPlayers[oldPid];

        if (game.hands && game.hands[oldPid]) {
            game.hands[socket.id] = game.hands[oldPid];
            delete game.hands[oldPid];
        }
        if (game.tricksTaken && game.tricksTaken[oldPid] !== undefined) {
            game.tricksTaken[socket.id] = game.tricksTaken[oldPid];
            delete game.tricksTaken[oldPid];
        }
        if (game.scores && game.scores[oldPid] !== undefined) {
            game.scores[socket.id] = game.scores[oldPid];
            delete game.scores[oldPid];
        }
        if (game.playerSuits && game.playerSuits[oldPid] !== undefined) {
            game.playerSuits[socket.id] = game.playerSuits[oldPid];
            delete game.playerSuits[oldPid];
        }
        if (game.bid && game.bid.highestBidder === oldPid) {
            game.bid.highestBidder = socket.id;
        }
        if (game.passedPlayers) {
            game.passedPlayers = game.passedPlayers.map(p => p === oldPid ? socket.id : p);
        }
        if (game.tableCards) {
            game.tableCards.forEach(tc => { if (tc.playerId === oldPid) tc.playerId = socket.id; });
        }
        if (game.hasOpened && game.hasOpened[oldPid] !== undefined) {
            game.hasOpened[socket.id] = game.hasOpened[oldPid];
            delete game.hasOpened[oldPid];
        }
        if (game.openedType && game.openedType[oldPid] !== undefined) {
            game.openedType[socket.id] = game.openedType[oldPid];
            delete game.openedType[oldPid];
        }
        if (game.roundPenalties && game.roundPenalties[oldPid] !== undefined) {
            game.roundPenalties[socket.id] = game.roundPenalties[oldPid];
            delete game.roundPenalties[oldPid];
        }
        if (game.discardPiles && game.discardPiles[oldPid]) {
            game.discardPiles[socket.id] = game.discardPiles[oldPid];
            delete game.discardPiles[oldPid];
        }
        if (game.initialGostergeOwners && game.initialGostergeOwners[oldPid]) {
            game.initialGostergeOwners[socket.id] = game.initialGostergeOwners[oldPid];
            delete game.initialGostergeOwners[oldPid];
        }
        if (game.revealedGosterge && game.revealedGosterge[oldPid]) {
            game.revealedGosterge[socket.id] = game.revealedGosterge[oldPid];
            delete game.revealedGosterge[oldPid];
        }
        if (game.hasDrawnEver && game.hasDrawnEver[oldPid] !== undefined) {
            game.hasDrawnEver[socket.id] = game.hasDrawnEver[oldPid];
            delete game.hasDrawnEver[oldPid];
        }
        if (game.lastDrawnTileId && game.lastDrawnTileId[oldPid]) {
            game.lastDrawnTileId[socket.id] = game.lastDrawnTileId[oldPid];
            delete game.lastDrawnTileId[oldPid];
        }
        if (game.lastDrawnTile && game.lastDrawnTile[oldPid]) {
            game.lastDrawnTile[socket.id] = game.lastDrawnTile[oldPid];
            delete game.lastDrawnTile[oldPid];
        }

        players[socket.id].room = "kafe";
        socket.join("kafe");

        let gameType = tableId.startsWith('billiard') ? 'billiard' : (tableId.startsWith('tavla') ? 'tavla' : (tableId.startsWith('okey101') ? 'okey101' : 'batak'));
        socket.emit('startGame', gameType);

        if (gameType === 'batak') {
            gameCoordinator.sendBatakUpdate(game, io, players);
        } else if (gameType === 'tavla') {
            gameCoordinator.sendTavlaUpdate(game, io);
        } else if (gameType === 'okey101') {
            gameCoordinator.sendOkey101Update(game, io, players);
        } else if (gameType === 'billiard') {
            socket.emit('billiardUpdate', {
                balls: game.balls,
                turnIndex: game.turnIndex,
                players: game.players,
                playerSuits: game.playerSuits,
                ballInHand: game.ballInHand,
                winner: game.winner,
                gameOver: game.gameOver,
                tableId: game.tableId,
                turnTimeout: 30,
                disconnectedPlayers: game.disconnectedPlayers || {}
            });
        }

        io.to("kafe").emit('systemMessage', `✅ ${players[socket.id].name} masaya geri döndü!`);
        game.players.forEach(pid => {
            if (pid !== socket.id) io.to(pid).emit('systemMessage', `✅ ${players[socket.id].name} masaya geri döndü, oyun devam ediyor!`);
        });
    });

    socket.on('declineReconnect', (tableId) => {
        let game = gameCoordinator.getActiveGame(tableId);
        if (game && players[socket.id]) {
            let myName = players[socket.id].name;
            game.players.forEach(pid => {
                if (pid !== socket.id) io.to(pid).emit('systemMessage', `ℹ️ ${myName} masaya dönmedi.`);
            });
        }
    });

    // 5. BOŞALAN KOLTUĞU DEVRALMA
    socket.on('takeoverSeat', (data) => {
        let tableId = data.tableId;
        let game = gameCoordinator.getActiveGame(tableId);
        if (!game || !players[socket.id]) return;

        let oldPid = data.oldPid;
        if (!oldPid || !game.disconnectedPlayers || !game.disconnectedPlayers[oldPid]) {
            let discKeys = Object.keys(game.disconnectedPlayers || {});
            if (discKeys.length > 0) oldPid = discKeys[0];
        }

        if (!oldPid || !game.players.includes(oldPid)) {
            socket.emit('gameError', "Devralınabilecek boş bir koltuk bulunamadı.");
            return;
        }

        let pIndex = game.players.indexOf(oldPid);
        if (pIndex !== -1) game.players[pIndex] = socket.id;

        let newName = players[socket.id].name;
        let oldName = game.playerProfiles[oldPid]?.name || "Eski Oyuncu";

        game.playerProfiles[socket.id] = {
            name: newName,
            color: players[socket.id].color || "#fff",
            isBot: false
        };
        delete game.playerProfiles[oldPid];

        if (game.disconnectedPlayers) delete game.disconnectedPlayers[oldPid];

        if (game.hands && game.hands[oldPid]) {
            game.hands[socket.id] = game.hands[oldPid];
            delete game.hands[oldPid];
        }
        if (game.tricksTaken && game.tricksTaken[oldPid] !== undefined) {
            game.tricksTaken[socket.id] = game.tricksTaken[oldPid];
            delete game.tricksTaken[oldPid];
        }
        if (game.scores && game.scores[oldPid] !== undefined) {
            game.scores[socket.id] = game.scores[oldPid];
            delete game.scores[oldPid];
        }
        if (game.playerSuits && game.playerSuits[oldPid] !== undefined) {
            game.playerSuits[socket.id] = game.playerSuits[oldPid];
            delete game.playerSuits[oldPid];
        }
        if (game.bid && game.bid.highestBidder === oldPid) {
            game.bid.highestBidder = socket.id;
        }
        if (game.passedPlayers) {
            game.passedPlayers = game.passedPlayers.map(p => p === oldPid ? socket.id : p);
        }
        if (game.tableCards) {
            game.tableCards.forEach(tc => { if (tc.playerId === oldPid) tc.playerId = socket.id; });
        }
        if (game.hasOpened && game.hasOpened[oldPid] !== undefined) {
            game.hasOpened[socket.id] = game.hasOpened[oldPid];
            delete game.hasOpened[oldPid];
        }
        if (game.openedType && game.openedType[oldPid] !== undefined) {
            game.openedType[socket.id] = game.openedType[oldPid];
            delete game.openedType[oldPid];
        }
        if (game.roundPenalties && game.roundPenalties[oldPid] !== undefined) {
            game.roundPenalties[socket.id] = game.roundPenalties[oldPid];
            delete game.roundPenalties[oldPid];
        }
        if (game.discardPiles && game.discardPiles[oldPid]) {
            game.discardPiles[socket.id] = game.discardPiles[oldPid];
            delete game.discardPiles[oldPid];
        }

        players[socket.id].room = "kafe";
        socket.join("kafe");

        let gameType = tableId.startsWith('billiard') ? 'billiard' : (tableId.startsWith('tavla') ? 'tavla' : (tableId.startsWith('okey101') ? 'okey101' : 'batak'));
        socket.emit('startGame', gameType);

        if (gameType === 'batak') {
            gameCoordinator.sendBatakUpdate(game, io, players);
        } else if (gameType === 'tavla') {
            gameCoordinator.sendTavlaUpdate(game, io);
        } else if (gameType === 'okey101') {
            gameCoordinator.sendOkey101Update(game, io, players);
        }

        io.to("kafe").emit('systemMessage', `🪑 ${newName}, ${oldName} yerine masadaki boş koltuğa oturdu!`);
    });
}

module.exports = { registerAuthHandlers };
