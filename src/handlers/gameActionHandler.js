// src/handlers/gameActionHandler.js - Masa, Lobi ve Tüm Masa Oyunu Aksiyonları Yöneticisi
const dataManager = require('../dataManager');
const tableManager = require('../tableManager');
const gameCoordinator = require('../gameCoordinator');

function registerGameActionHandlers(io, socket, players) {
    // 1. MASA SEÇENEKLERİ SORGULAMA
    socket.on('requestTableOptions', (baseType) => {
        if (!players[socket.id]) return;
        let res = tableManager.getTableOptionsList(baseType, gameCoordinator.getActiveGames(), players);
        if (res) {
            socket.emit('tableOptionsModal', res);
        }
    });

    // 2. MASAYA OTURMA
    socket.on('joinTable', (tableId) => {
        if (!players[socket.id]) return;
        let table = tableManager.getTable(tableId);
        let room = players[socket.id].room;
        if (!table) return;

        if (gameCoordinator.getActiveGame(tableId)) {
            socket.emit('gameError', "Bu masada şu anda oyun oynanıyor! İzlemek veya boş koltuk varsa devralmak için masa menüsünü kullanın.");
            return;
        }

        let requiredBet = table.bet || 0;
        let pMoney = players[socket.id].money !== undefined ? players[socket.id].money : 0;
        if (requiredBet > 0 && pMoney < requiredBet) {
            socket.emit('gameError', `Yetersiz bakiye! Bu masanın bahsi ${requiredBet} TL, sizin bakiyeniz: ${pMoney} TL.`);
            return;
        }

        if (!table.players.includes(socket.id) && table.players.length < table.min) {
            table.players.push(socket.id);

            table.players.forEach(pid => {
                io.to(pid).emit('updateTableLobby', { name: table.name, count: table.players.length, min: table.min, tableId: tableId, bet: requiredBet });
            });

            if (table.players.length === table.min) {
                gameCoordinator.startGameForTable(tableId, table, room, io, players);
            }
        }
    });

    // 3. BOT EKLEME
    socket.on('addBotToTable', (tableId) => {
        if (!players[socket.id]) return;
        let res = tableManager.addBotToTable(tableId, gameCoordinator.getActiveGames(), players);
        if (!res.success) {
            socket.emit('gameError', res.message);
            return;
        }

        let table = res.table;
        table.players.forEach(pid => {
            io.to(pid).emit('updateTableLobby', { name: table.name, count: table.players.length, min: table.min, tableId: tableId, bet: table.bet || 0 });
        });

        io.to("kafe").emit('systemMessage', `🤖 ${res.botName} masaya katıldı!`);

        if (res.isFull) {
            gameCoordinator.startGameForTable(tableId, table, "kafe", io, players);
        }
    });

    // 4. YENİ MASA AÇMA
    socket.on('createNewTable', (payload) => {
        if (!players[socket.id]) return;
        let res = tableManager.createNewTable(payload, gameCoordinator.getActiveGames());
        if (!res.success) {
            socket.emit('gameError', res.message);
            return;
        }

        let table = res.table;
        table.players.push(socket.id);

        socket.emit('updateTableLobby', {
            name: table.name,
            count: 1,
            min: table.min,
            tableId: table.id,
            bet: table.bet,
            mode: table.mode
        });
        io.to("kafe").emit('systemMessage', `📢 ${players[socket.id].name} yeni bir ${table.name} masası açtı!`);
    });

    // 5. OYUNU İZLE
    socket.on('spectateTable', (tableId) => {
        let game = gameCoordinator.getActiveGame(tableId);
        if (!game) {
            socket.emit('gameError', "Bu masada şu anda izlenebilecek bir oyun yok.");
            return;
        }

        if (!game.spectators) game.spectators = [];
        if (!game.spectators.includes(socket.id)) game.spectators.push(socket.id);

        let gameType = tableId.startsWith('billiard') ? 'billiard' : (tableId.startsWith('tavla') ? 'tavla' : (tableId.startsWith('okey101') ? 'okey101' : 'batak'));
        socket.emit('startGame', gameType);

        if (gameType === 'batak') {
            gameCoordinator.sendBatakUpdate(game, io, players);
        } else if (gameType === 'billiard') {
            socket.emit('billiardUpdate', {
                balls: game.balls,
                turnIndex: game.turnIndex,
                players: game.players,
                playerSuits: game.playerSuits,
                ballInHand: game.ballInHand,
                winner: game.winner,
                gameOver: game.gameOver,
                isSpectator: true,
                tableId: game.tableId,
                turnTimeout: 30,
                disconnectedPlayers: game.disconnectedPlayers || {}
            });
        } else if (gameType === 'tavla') {
            gameCoordinator.sendTavlaUpdate(game, io);
        } else if (gameType === 'okey101') {
            gameCoordinator.sendOkey101Update(game, io, players);
        }

        io.to(tableId).emit('systemMessage', `👁️ ${players[socket.id]?.name || "Biri"} masayı izlemeye başladı.`);
    });

    // 6. MASA REAKSİYONU
    socket.on('tableReaction', (data) => {
        let tableId = data.tableId;
        let game = gameCoordinator.getActiveGame(tableId);
        if (game) {
            let senderName = players[socket.id]?.name || "Biri";
            let reactionObj = { sender: senderName, text: dataManager.sanitizeString(data.reaction, 50) };
            game.players.forEach(pid => io.to(pid).emit('showReaction', reactionObj));
            if (game.spectators) {
                game.spectators.forEach(sid => io.to(sid).emit('showReaction', reactionObj));
            }
        }
    });

    // 7. BATAK DİNLEYİCİLERİ
    socket.on('placeBid', (bidValue) => {
        let instance = gameCoordinator.getBatakInstance(socket.id);
        if (instance && instance.engine.handleBid(instance.game, socket.id, bidValue)) {
            gameCoordinator.sendBatakUpdate(instance.game, io, players);
        }
    });

    socket.on('selectTrump', (suit) => {
        let instance = gameCoordinator.getBatakInstance(socket.id);
        if (instance && instance.engine.setTrump(instance.game, socket.id, suit)) {
            gameCoordinator.sendBatakUpdate(instance.game, io, players);
        }
    });

    socket.on('discardCards', (indices) => {
        let instance = gameCoordinator.getBatakInstance(socket.id);
        if (instance && instance.engine.discardCards(instance.game, socket.id, indices)) {
            gameCoordinator.sendBatakUpdate(instance.game, io, players);
        }
    });

    socket.on('playCard', (cardIndex) => {
        let instance = gameCoordinator.getBatakInstance(socket.id);
        if (instance) {
            let color = players[socket.id]?.color || instance.game.playerProfiles[socket.id]?.color || '#fff';
            let res = instance.engine.playCard(instance.game, socket.id, cardIndex, color);
            if (res.success) {
                gameCoordinator.handleBatakCardPlayed(instance.game, instance.engine, res, io, players);
            } else {
                socket.emit('gameError', res.msg);
            }
        }
    });

    // 8. BİLARDO DİNLEYİCİLERİ
    socket.on('billiardShoot', (data) => {
        let instance = gameCoordinator.getBilliardInstance(socket.id);
        if (instance && data) {
            instance.engine.shootBall(instance.game, socket.id, data.angle, data.power, data.spinX, data.spinY);
        }
    });

    socket.on('billiardPlaceWhite', (pos) => {
        let instance = gameCoordinator.getBilliardInstance(socket.id);
        if (instance && pos && instance.engine.placeWhiteBall(instance.game, socket.id, pos.x, pos.y)) {
            socket.emit('billiardBallPlaced');
        }
    });

    // 9. TAVLA DİNLEYİCİLERİ
    socket.on('tavlaRoll', () => {
        let instance = gameCoordinator.getTavlaInstance(socket.id);
        if (instance && instance.engine.rollDice(instance.game, socket.id)) {
            gameCoordinator.sendTavlaUpdate(instance.game, io);
        }
    });

    socket.on('getTavlaValidMoves', (data) => {
        let instance = gameCoordinator.getTavlaInstance(socket.id);
        if (instance && data) {
            let moves = instance.engine.getValidMovesForPoint(instance.game, socket.id, data.fromPoint);
            socket.emit('tavlaValidMovesResponse', { moves: moves });
        }
    });

    socket.on('tavlaMove', (data) => {
        let instance = gameCoordinator.getTavlaInstance(socket.id);
        if (instance && data && instance.engine.makeMove(instance.game, socket.id, data.fromPoint, data.toPoint, data.usedDie)) {
            gameCoordinator.sendTavlaUpdate(instance.game, io);
            if (instance.game.gameOver && instance.game.winner && !instance.game.winnerRecorded) {
                instance.game.winnerRecorded = true;
                let wName = instance.game.playerProfiles[instance.game.winner]?.name;
                let isHuman = !instance.game.winner.startsWith('bot_') && !wName.startsWith('🤖') && !instance.game.playerProfiles[instance.game.winner]?.isBot;
                if (wName) {
                    if (isHuman) {
                        dataManager.persistentData.leaderboard.tavla[wName] = (dataManager.persistentData.leaderboard.tavla[wName] || 0) + 1;
                    }
                    instance.game.players.forEach(pid => {
                        let pName = instance.game.playerProfiles[pid]?.name;
                        if (pName && !pid.startsWith('bot_') && !pName.startsWith('🤖')) {
                            dataManager.recordQuestProgress(pName, 'tavla_play', 1);
                        }
                    });
                    let winPrize = 20;
                    if (instance.game.pot && instance.game.pot > 0) {
                        winPrize += instance.game.pot;
                        let potMsg = `💰 TEBRİKLER! ${wName} tavla masasındaki ${instance.game.pot} TL'lik potu kazandı!`;
                        instance.game.players.forEach(pid => io.to(pid).emit('systemMessage', potMsg));
                        if (instance.game.spectators) instance.game.spectators.forEach(sid => io.to(sid).emit('systemMessage', potMsg));
                        instance.game.pot = 0;
                    }
                    if (isHuman && dataManager.persistentData.users[wName]) {
                        dataManager.persistentData.users[wName].money = (dataManager.persistentData.users[wName].money || 100) + winPrize;
                        io.to(instance.game.winner).emit('moneyUpdate', dataManager.persistentData.users[wName].money);
                    }
                    dataManager.savePersistentData();
                }
            }
        }
    });

    // 10. 101 OKEY DİNLEYİCİLERİ
    socket.on('okey101DrawTile', () => {
        let instance = gameCoordinator.getOkey101Instance(socket.id);
        if (instance) {
            let drawFn = instance.engine.drawTileFromDeck || instance.engine.drawTile;
            let res = drawFn(instance.game, socket.id);
            if (res.success) {
                gameCoordinator.sendOkey101Update(instance.game, io, players);
            } else {
                socket.emit('gameError', res.msg);
            }
        }
    });

    socket.on('okey101TakeDiscard', () => {
        let instance = gameCoordinator.getOkey101Instance(socket.id);
        if (instance) {
            let takeFn = instance.engine.takeDiscardedTile || instance.engine.takeDiscardTile;
            let res = takeFn(instance.game, socket.id);
            if (res.success) {
                gameCoordinator.sendOkey101Update(instance.game, io, players);
            } else {
                socket.emit('gameError', res.msg);
            }
        }
    });

    socket.on('okey101ReturnDiscard', () => {
        let instance = gameCoordinator.getOkey101Instance(socket.id);
        if (instance) {
            let returnFn = instance.engine.returnDiscardTile || instance.engine.returnTakenDiscard;
            let res = returnFn(instance.game, socket.id);
            if (res.success) {
                gameCoordinator.sendOkey101Update(instance.game, io, players);
            } else {
                socket.emit('gameError', res.msg);
            }
        }
    });

    socket.on('okey101OpenHand', (payload) => {
        let instance = gameCoordinator.getOkey101Instance(socket.id);
        if (instance && payload) {
            let res = instance.engine.openHand(instance.game, socket.id, payload, payload.type);
            if (res.success) {
                if (res.msg) socket.emit('systemMessage', res.msg);
                gameCoordinator.sendOkey101Update(instance.game, io, players);
            } else {
                socket.emit('gameError', res.msg);
            }
        }
    });

    socket.on('okey101AddTileToPer', (data) => {
        let instance = gameCoordinator.getOkey101Instance(socket.id);
        if (instance && data) {
            let tileIds = data.tileIds || (data.tileId ? [data.tileId] : []);
            let targetIdx = (data.targetPerIndex !== undefined) ? data.targetPerIndex : data.perIndex;
            let position = data.position || (data.addToFront ? 'start' : 'end');
            let res = instance.engine.addTileToTablePer(instance.game, socket.id, tileIds, targetIdx, position);
            if (res.success) {
                socket.emit('systemMessage', res.msg);
                gameCoordinator.sendOkey101Update(instance.game, io, players);
                if (res.finished) {
                    gameCoordinator.checkOkey101RoundEnd(instance.game, io, players);
                }
            } else {
                socket.emit('gameError', res.msg);
            }
        }
    });

    socket.on('okey101DiscardTile', (tileId) => {
        let instance = gameCoordinator.getOkey101Instance(socket.id);
        if (instance) {
            let res = instance.engine.discardTile(instance.game, socket.id, tileId);
            if (res.success) {
                gameCoordinator.sendOkey101Update(instance.game, io, players);
                if (res.roundEnded) {
                    gameCoordinator.checkOkey101RoundEnd(instance.game, io, players);
                }
            } else {
                socket.emit('gameError', res.msg);
            }
        }
    });

    socket.on('okey101TakeOkey', (data) => {
        let instance = gameCoordinator.getOkey101Instance(socket.id);
        if (instance && data) {
            let res = instance.engine.takeOkeyFromTablePer(instance.game, socket.id, data.perIndex, data.tileId);
            if (res.success) {
                socket.emit('systemMessage', res.msg);
                gameCoordinator.sendOkey101Update(instance.game, io, players);
            } else {
                socket.emit('gameError', res.msg);
            }
        }
    });

    socket.on('okey101RevealGosterge', (data) => {
        let instance = gameCoordinator.getOkey101Instance(socket.id);
        if (instance) {
            let tileId = data ? data.tileId : null;
            let res = instance.engine.revealGosterge(instance.game, socket.id, tileId);
            if (res.success) {
                let pName = players[socket.id]?.name || "Oyuncu";
                let t = res.tile;
                let broadcastMsg = `📢 ${pName} elindeki GÖSTERGE taşını (${t.color.toUpperCase()} ${t.value}) gösterdi! Çifte giderken tek başına 1 çift sayılacak.`;

                instance.game.players.forEach(pid => {
                    io.to(pid).emit('systemMessage', broadcastMsg);
                    io.to(pid).emit('okey101GostergeRevealed', {
                        playerId: socket.id,
                        playerName: pName,
                        tile: t
                    });
                });
                if (instance.game.spectators) {
                    instance.game.spectators.forEach(sid => {
                        io.to(sid).emit('systemMessage', broadcastMsg);
                        io.to(sid).emit('okey101GostergeRevealed', {
                            playerId: socket.id,
                            playerName: pName,
                            tile: t
                        });
                    });
                }
                gameCoordinator.sendOkey101Update(instance.game, io, players);
            } else {
                socket.emit('gameError', res.msg);
            }
        }
    });

    socket.on('assignBotToVacantSeat', (data) => {
        let instance = gameCoordinator.getOkey101Instance(socket.id);
        if (instance && instance.game) {
            let targetPid = data ? data.targetPlayerId : null;
            let game = instance.game;
            let dPlayers = game.disconnectedPlayers || {};
            let seatIdx = -1;
            if (targetPid && dPlayers[targetPid]) {
                seatIdx = dPlayers[targetPid].seatIndex;
            } else if (data && data.seatIndex !== undefined) {
                seatIdx = data.seatIndex;
                targetPid = game.players[seatIdx];
            } else {
                // Herhangi bir boş/ayrılmış koltuğu bul
                let firstDPid = Object.keys(dPlayers)[0];
                if (firstDPid) {
                    targetPid = firstDPid;
                    seatIdx = dPlayers[firstDPid].seatIndex;
                }
            }

            if (seatIdx !== -1 && seatIdx < game.players.length) {
                let botId = `bot_${Date.now()}_${Math.floor(Math.random()*1000)}`;
                let botNames = [
                    "🤖 Çaycı İsmail", "🤖 Mahmut Emmi", "🤖 Dayı Recep", "🤖 Berber Niyazi", 
                    "🤖 Muhtar Remzi", "🤖 Kasap Şevket", "🤖 Kahveci Veli", "🤖 Taksici Hayri"
                ];
                let usedNames = Object.values(game.playerProfiles || {}).map(p => p.name);
                let available = botNames.filter(n => !usedNames.includes(n));
                let botName = available.length > 0 ? available[Math.floor(Math.random()*available.length)] : `🤖 Bot ${Math.floor(Math.random()*90)+10}`;

                let oldPid = game.players[seatIdx];
                game.players[seatIdx] = botId;

                if (game.hands && game.hands[oldPid]) {
                    game.hands[botId] = game.hands[oldPid];
                    delete game.hands[oldPid];
                }
                if (game.discardPiles && game.discardPiles[oldPid]) {
                    game.discardPiles[botId] = game.discardPiles[oldPid];
                    delete game.discardPiles[oldPid];
                }
                if (game.hasOpened) {
                    game.hasOpened[botId] = game.hasOpened[oldPid] || false;
                    delete game.hasOpened[oldPid];
                }
                if (game.openedType) {
                    game.openedType[botId] = game.openedType[oldPid] || null;
                    delete game.openedType[oldPid];
                }
                if (game.scores) {
                    game.scores[botId] = game.scores[oldPid] || 0;
                    delete game.scores[oldPid];
                }
                if (game.roundPenalties) {
                    game.roundPenalties[botId] = game.roundPenalties[oldPid] || 0;
                    delete game.roundPenalties[oldPid];
                }

                if (!game.playerProfiles) game.playerProfiles = {};
                game.playerProfiles[botId] = {
                    name: botName,
                    isBot: true,
                    color: "#8b5cf6"
                };

                if (game.disconnectedPlayers) {
                    delete game.disconnectedPlayers[oldPid];
                }

                players[botId] = {
                    name: botName,
                    isBot: true,
                    color: "#8b5cf6"
                };

                let alertMsg = `🤖 Boş koltuğu ${botName} devraldı ve oyuna dahil oldu!`;
                game.players.forEach(pid => io.to(pid).emit('systemMessage', alertMsg));
                if (game.spectators) game.spectators.forEach(sid => io.to(sid).emit('systemMessage', alertMsg));

                gameCoordinator.sendOkey101Update(game, io, players);

                // Eğer sıra bottaysa hemen hamle zamanlayıcısını tetikle
                if (game.players[game.turnIndex] === botId) {
                    gameCoordinator.startOkey101AfkTimer(game, io, players);
                }
            }
        }
    });

    // 11. MASADAN AYRILMA (LEAVE TABLE)
    socket.on('leaveTable', (tableId) => {
        let pName = players[socket.id] ? players[socket.id].name : "Oyuncu";
        let activeGames = gameCoordinator.getActiveGames();
        let tables = tableManager.getTables();

        for (let gid in activeGames) {
            let g = activeGames[gid];
            if (g && g.players && g.players.includes(socket.id)) {
                if (!g.disconnectedPlayers) g.disconnectedPlayers = {};
                let seatIdx = g.players.indexOf(socket.id);
                g.disconnectedPlayers[socket.id] = {
                    name: pName,
                    seatIndex: seatIdx
                };

                let remainingHumans = g.players.filter(pid => pid !== socket.id && !pid.startsWith('bot_') && (!g.disconnectedPlayers || !g.disconnectedPlayers[pid]));
                if (remainingHumans.length === 0) {
                    if (gameCoordinator.okey101AfkTimers[gid]) {
                        clearTimeout(gameCoordinator.okey101AfkTimers[gid]);
                        delete gameCoordinator.okey101AfkTimers[gid];
                    }
                    if (gameCoordinator.batakAfkTimers[gid]) {
                        clearTimeout(gameCoordinator.batakAfkTimers[gid]);
                        delete gameCoordinator.batakAfkTimers[gid];
                    }
                    if (gameCoordinator.billiardBotTimers[gid]) {
                        clearTimeout(gameCoordinator.billiardBotTimers[gid]);
                        delete gameCoordinator.billiardBotTimers[gid];
                    }
                    delete activeGames[gid];
                    if (tables[gid]) {
                        tables[gid].players = [];
                        tables[gid].spectators = [];
                    }
                } else {
                    g.players.forEach(pid => {
                        if (pid !== socket.id && !pid.startsWith('bot_')) {
                            io.to(pid).emit('systemMessage', `⚠️ ${pName} masadan kalktı! Koltuk boş, yerine biri oturabilir veya geri dönebilir.`);
                        }
                    });
                    if (g.spectators) {
                        g.spectators.forEach(sid => io.to(sid).emit('systemMessage', `⚠️ ${pName} masadan kalktı!`));
                    }
                    if (gid.startsWith('batak')) {
                        gameCoordinator.sendBatakUpdate(g, io, players);
                    } else if (gid.startsWith('tavla')) {
                        gameCoordinator.sendTavlaUpdate(g, io);
                    } else if (gid.startsWith('okey101')) {
                        gameCoordinator.sendOkey101Update(g, io, players);
                    }
                }
            }
        }

        // İzleyicilikten çıkış
        for (let gid in activeGames) {
            let g = activeGames[gid];
            if (g && g.spectators) {
                g.spectators = g.spectators.filter(sid => sid !== socket.id);
            }
        }

        // Lobiden çıkış
        let affected = tableManager.removePlayerFromLobbies(socket.id);
        affected.forEach(t => {
            t.players.forEach(pid => io.to(pid).emit('updateTableLobby', { name: t.name, count: t.players.length, min: t.min, tableId: t.id, bet: t.bet || 0 }));
        });

        socket.emit('tableLeft');
    });
}

module.exports = { registerGameActionHandlers };
