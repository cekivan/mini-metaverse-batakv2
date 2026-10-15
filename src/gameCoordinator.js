// src/gameCoordinator.js - Oyun Motorları ve AFK Bot Yönetim Koordinatörü
const batakEngine = require('../batak.js');
const batak4Engine = require('../batak4.js');
const billiardEngine = require('../billiard.js');
const tavlaEngine = require('../tavla.js');
const okey101Engine = require('../okey101.js');

const dataManager = require('./dataManager');
const tableManager = require('./tableManager');

const activeGames = {};

// AFK & Bot Zamanlayıcıları
const batakAfkTimers = {};
const okey101AfkTimers = {};
const billiardBotTimers = {};
const tableCleanupTimers = {};

function clearTableCleanupTimer(tableId) {
    if (tableCleanupTimers[tableId]) {
        clearTimeout(tableCleanupTimers[tableId]);
        delete tableCleanupTimers[tableId];
    }
}

function getActiveGames() {
    return activeGames;
}

function getActiveGame(tableId) {
    return activeGames[tableId] || null;
}

// --- INSTANCE BULUCULAR ---
function getBatakInstance(socketId) {
    for (let gid in activeGames) {
        let g = activeGames[gid];
        if (g && g.players && g.players.includes(socketId)) {
            let engine = g.isBatak4 ? batak4Engine : batakEngine;
            return { game: g, engine: engine, gameId: gid };
        }
    }
    return null;
}

function getBilliardInstance(socketId) {
    for (let gid in activeGames) {
        let g = activeGames[gid];
        if (gid.startsWith('billiard') && g && g.players && g.players.includes(socketId)) {
            return { game: g, engine: billiardEngine, gameId: gid };
        }
    }
    return null;
}

function getTavlaInstance(socketId) {
    for (let gid in activeGames) {
        let g = activeGames[gid];
        if (gid.startsWith('tavla') && g && g.players && g.players.includes(socketId)) {
            return { game: g, engine: tavlaEngine, gameId: gid };
        }
    }
    return null;
}

function getOkey101Instance(socketId) {
    for (let gid in activeGames) {
        let g = activeGames[gid];
        if (gid.startsWith('okey101') && g && g.players && g.players.includes(socketId)) {
            return { game: g, engine: okey101Engine, gameId: gid };
        }
    }
    return null;
}

// --- BATAK SİSTEMİ ---
function startBatakAfkTimer(game, io, players) {
    if (!game || game.gameOver || game.waitingTrickClear) return;
    let gid = game.tableId;
    if (batakAfkTimers[gid]) {
        clearTimeout(batakAfkTimers[gid]);
        delete batakAfkTimers[gid];
    }

    let currentPid = game.players[game.turnIndex];
    let isBot = game.playerProfiles[currentPid]?.isBot;
    let delay = isBot ? 1200 : 40000;

    batakAfkTimers[gid] = setTimeout(() => {
        makeBatakAiMove(game, currentPid, isBot, io, players);
    }, delay);
}

function makeBatakAiMove(game, pid, isBot, io, players) {
    if (!game || game.gameOver || game.waitingTrickClear) return;
    let engine = game.isBatak4 ? batak4Engine : batakEngine;

    if (game.phase === 'ihale') {
        let currentBid = game.bid.current;
        let hand = game.hands[pid] || [];
        let highCount = hand.filter(c => c.value === 'A' || c.value === 'K' || c.value === 'Q').length;
        if (highCount >= 5 && currentBid < 8) {
            engine.handleBid(game, pid, currentBid + 1);
        } else {
            engine.handleBid(game, pid, 'pas');
        }
        sendBatakUpdate(game, io, players);
    }
    else if (game.phase === 'koz_secimi') {
        let hand = game.hands[pid] || [];
        let suitCounts = { '♠': 0, '♥': 0, '♦': 0, '♣': 0 };
        hand.forEach(c => { if (suitCounts[c.suit] !== undefined) suitCounts[c.suit]++; });
        let bestSuit = Object.keys(suitCounts).reduce((a, b) => suitCounts[a] > suitCounts[b] ? a : b, '♠');
        engine.setTrump(game, pid, bestSuit);
        sendBatakUpdate(game, io, players);
    }
    else if (game.phase === 'gomme') {
        let hand = game.hands[pid] || [];
        let nonTrumpIndices = [];
        hand.forEach((c, idx) => {
            if (c.suit !== game.trump) nonTrumpIndices.push(idx);
        });
        let discardIndices = nonTrumpIndices.slice(0, 4);
        while (discardIndices.length < 4) {
            let nextIdx = hand.findIndex((_, i) => !discardIndices.includes(i));
            if (nextIdx !== -1) discardIndices.push(nextIdx);
            else break;
        }
        engine.discardCards(game, pid, discardIndices);
        sendBatakUpdate(game, io, players);
    }
    else if (game.phase === 'oyun') {
        if (game.waitingTrickClear || (game.tableCards && game.tableCards.length >= (game.isBatak4 ? 4 : 3))) return;
        let hand = game.hands[pid] || [];
        for (let i = 0; i < hand.length; i++) {
            let color = players[pid]?.color || game.playerProfiles[pid]?.color || '#fff';
            let testResult = engine.playCard(game, pid, i, color);
            if (testResult.success) {
                handleBatakCardPlayed(game, engine, testResult, io, players);
                break;
            }
        }
    }
}

function handleBatakCardPlayed(game, engine, result, io, players) {
    if (batakAfkTimers[game.tableId]) {
        clearTimeout(batakAfkTimers[game.tableId]);
        delete batakAfkTimers[game.tableId];
    }

    if (result.trickWinner !== null) {
        game.waitingTrickClear = true;
        sendBatakUpdate(game, io, players);

        let winnerName = (players[result.trickWinner] ? players[result.trickWinner].name : game.playerProfiles[result.trickWinner]?.name) || "Biri";

        game.players.forEach(pid => io.to(pid).emit('systemMessage', `Eli ${winnerName} aldı!`));
        if (game.spectators) {
            game.spectators.forEach(sid => io.to(sid).emit('systemMessage', `Eli ${winnerName} aldı!`));
        }

        setTimeout(() => {
            game.tableCards = [];
            game.waitingTrickClear = false;

            if (result.roundEnded) {
                let roundMsg = "TUR BİTTİ! Puanlar hesaplandı, Yeni el dağıtılıyor...";
                game.players.forEach(pid => io.to(pid).emit('systemMessage', roundMsg));
                if (game.spectators) {
                    game.spectators.forEach(sid => io.to(sid).emit('systemMessage', roundMsg));
                }

                let highestScore = -999;
                let topPid = null;
                game.players.forEach(pid => {
                    let pName = game.playerProfiles[pid]?.name;
                    let score = game.scores[pid] || 0;
                    let isBot = pid.startsWith('bot_') || (pName && (pName.startsWith('🤖') || pName.includes('🤖'))) || game.playerProfiles[pid]?.isBot;
                    if (pName && !isBot) {
                        dataManager.recordQuestProgress(pName, 'batak_play', 1);
                    }
                    if (pName && score > 0 && !isBot) {
                        dataManager.persistentData.leaderboard.batak[pName] = (dataManager.persistentData.leaderboard.batak[pName] || 0) + score;
                        if (score > highestScore) {
                            highestScore = score;
                            topPid = pid;
                        }
                    }
                });

                if (topPid && dataManager.persistentData.users[game.playerProfiles[topPid]?.name]) {
                    let uName = game.playerProfiles[topPid].name;
                    let roundWin = 20;
                    if (game.pot && game.pot > 0) {
                        roundWin += game.pot;
                        let potMsg = `💰 TEBRİKLER! ${uName} masadaki ${game.pot} TL'lik pot ödülünü kazandı!`;
                        game.players.forEach(pid => io.to(pid).emit('systemMessage', potMsg));
                        if (game.spectators) game.spectators.forEach(sid => io.to(sid).emit('systemMessage', potMsg));
                        game.pot = 0;
                    }
                    dataManager.persistentData.users[uName].money = (dataManager.persistentData.users[uName].money || 100) + roundWin;
                    io.to(topPid).emit('moneyUpdate', dataManager.persistentData.users[uName].money);
                }
                dataManager.savePersistentData();

                setTimeout(() => {
                    let oldScores = game.scores;
                    let nextRound = (game.roundNumber || 1) + 1;

                    let newGame = engine.startBatakGame(game.players, oldScores, nextRound);
                    newGame.isBatak4 = game.isBatak4;
                    newGame.tableId = game.tableId;
                    newGame.bet = game.bet || 0;
                    newGame.pot = game.pot || 0;
                    newGame.spectators = game.spectators || [];
                    newGame.playerProfiles = game.playerProfiles;
                    newGame.disconnectedPlayers = game.disconnectedPlayers || {};

                    activeGames[game.tableId] = newGame;
                    sendBatakUpdate(newGame, io, players);
                }, 4000);
            } else {
                sendBatakUpdate(game, io, players);
            }
        }, 2000);
    } else {
        sendBatakUpdate(game, io, players);
    }
}

function sendBatakUpdate(game, io, players) {
    if (!game || !game.hands || !game.players) return;
    let playerInfos = {};
    game.players.forEach(pid => {
        let pName = "Kayıtsız";
        if (players[pid]) pName = players[pid].name;
        else if (game.playerProfiles && game.playerProfiles[pid]) pName = game.playerProfiles[pid].name;

        playerInfos[pid] = {
            name: pName,
            score: (game.scores && game.scores[pid] !== undefined) ? game.scores[pid] : 0,
            tricks: (game.tricksTaken && game.tricksTaken[pid] !== undefined) ? game.tricksTaken[pid] : 0,
            isDisconnected: (game.disconnectedPlayers && !!game.disconnectedPlayers[pid])
        };
    });

    let currentPid = game.players[game.turnIndex];
    let currentPlayerName = playerInfos[currentPid] ? playerInfos[currentPid].name : "Biri";

    game.players.forEach((pid) => {
        io.to(pid).emit('batakUpdate', {
            phase: game.phase,
            hand: (game.hands && game.hands[pid]) || [],
            table: game.tableCards,
            myTurn: !game.waitingTrickClear && (game.players[game.turnIndex] === pid),
            turnIndex: game.turnIndex,
            players: game.players,
            turnPlayerName: currentPlayerName,
            tricks: (game.tricksTaken && game.tricksTaken[pid] !== undefined) ? game.tricksTaken[pid] : 0,
            trump: game.trump,
            bidInfo: game.bid,
            playerInfos: playerInfos,
            roundNumber: game.roundNumber || 1,
            isSpectator: false,
            tableId: game.tableId,
            turnTimeout: 40
        });
    });

    if (game.spectators && game.spectators.length > 0) {
        game.spectators.forEach((sid) => {
            io.to(sid).emit('batakUpdate', {
                phase: game.phase,
                hand: [],
                table: game.tableCards,
                myTurn: false,
                turnIndex: game.turnIndex,
                players: game.players,
                turnPlayerName: currentPlayerName,
                tricks: 0,
                trump: game.trump,
                bidInfo: game.bid,
                playerInfos: playerInfos,
                roundNumber: game.roundNumber || 1,
                isSpectator: true,
                tableId: game.tableId,
                turnTimeout: 40
            });
        });
    }

    if (!game.waitingTrickClear) {
        startBatakAfkTimer(game, io, players);
    }
}

// --- TAVLA SİSTEMİ ---
function sendTavlaUpdate(game, io) {
    if (!game || !game.players) return;
    let stateObj = {
        tableId: game.tableId,
        players: game.players,
        playerColors: game.playerColors,
        turnIndex: game.turnIndex,
        board: game.board,
        bar: game.bar,
        borneOff: game.borneOff,
        dice: game.dice,
        remainingMoves: game.remainingMoves,
        hasRolled: game.hasRolled,
        winner: game.winner,
        gameOver: game.gameOver,
        playerProfiles: game.playerProfiles,
        disconnectedPlayers: game.disconnectedPlayers || {}
    };

    game.players.forEach(pid => {
        io.to(pid).emit('tavlaUpdate', { ...stateObj, isSpectator: false });
    });

    if (game.spectators && game.spectators.length > 0) {
        game.spectators.forEach(sid => {
            io.to(sid).emit('tavlaUpdate', { ...stateObj, isSpectator: true });
        });
    }
}

// --- 101 OKEY SİSTEMİ ---
function sendOkey101Update(game, io, players) {
    if (!game || !game.hands || !game.players) return;
    let playerInfos = {};
    game.players.forEach(pid => {
        let pName = "Kayıtsız";
        if (players[pid]) pName = players[pid].name;
        else if (game.playerProfiles && game.playerProfiles[pid]) pName = game.playerProfiles[pid].name;

        playerInfos[pid] = {
            name: pName,
            color: game.playerProfiles && game.playerProfiles[pid] ? game.playerProfiles[pid].color : "#fff",
            score: (game.scores && game.scores[pid] !== undefined) ? game.scores[pid] : 0,
            penalties: (game.roundPenalties && game.roundPenalties[pid] !== undefined) ? game.roundPenalties[pid] : 0,
            hasOpened: !!(game.hasOpened && game.hasOpened[pid]),
            openedType: game.openedType ? game.openedType[pid] : null,
            tileCount: game.hands && game.hands[pid] ? game.hands[pid].length : 0,
            lastDiscard: game.discardPiles && game.discardPiles[pid] && game.discardPiles[pid].length > 0 ? game.discardPiles[pid][game.discardPiles[pid].length - 1] : null,
            isDisconnected: (game.disconnectedPlayers && !!game.disconnectedPlayers[pid]),
            isBot: !!(game.playerProfiles && game.playerProfiles[pid]?.isBot)
        };
    });

    let currentPid = game.players[game.turnIndex];
    let currentPlayerName = playerInfos[currentPid] ? playerInfos[currentPid].name : "Biri";

    game.players.forEach((pid) => {
        if (game.disconnectedPlayers && game.disconnectedPlayers[pid]) return;
        let prevPid = game.players[(game.turnIndex + 3) % 4];
        let partnerPid = okey101Engine.getPartnerId(game, pid);
        let partnerOpened = partnerPid && game.hasOpened && !!game.hasOpened[partnerPid];
        let canTakeDiscard = (game.players[game.turnIndex] === pid) && !game.drawnThisTurn && !!(game.discardPiles && game.discardPiles[prevPid] && game.discardPiles[prevPid].length > 0);

        let isMyTurn = (game.players[game.turnIndex] === pid);
        let myDiscardTaken = isMyTurn && !!game.lastDiscardTaken;
        let takenDiscardTileId = myDiscardTaken ? game.takenDiscardTileId : null;
        let lastDrawnTileId = (isMyTurn && game.drawnThisTurn && game.lastDrawnTileId) ? game.lastDrawnTileId[pid] : null;
        let lastDrawnTile = (isMyTurn && game.drawnThisTurn && game.lastDrawnTile) ? game.lastDrawnTile[pid] : null;

        let hasDrawnEver = !!(game.hasDrawnEver && game.hasDrawnEver[pid]);
        let hand = (game.hands && game.hands[pid]) || [];
        let matchingGostergeTile = hand.find(t => 
            !t.isFakeOkey && 
            t.color === game.gosterge.color && 
            t.value === game.gosterge.value && 
            (game.initialGostergeOwners && game.initialGostergeOwners[pid] && game.initialGostergeOwners[pid].includes(t.id))
        );
        let isFirstPlayerWith22 = (game.players[0] === pid && (!game.discardPiles[pid] || game.discardPiles[pid].length === 0));
        let canRevealGosterge = (!hasDrawnEver || isFirstPlayerWith22) && !!matchingGostergeTile && !(game.revealedGosterge && game.revealedGosterge[pid]);
        let myRevealedGostergeTileId = (game.revealedGosterge && game.revealedGosterge[pid]) || null;

        io.to(pid).emit('okey101Update', {
            hand: hand,
            myTurn: isMyTurn,
            turnIndex: game.turnIndex,
            players: game.players,
            turnPlayerName: currentPlayerName,
            gosterge: game.gosterge,
            okeyDef: game.okeyDef,
            drawPileCount: game.drawPile ? game.drawPile.length : 0,
            tableOpenedPers: game.tableOpenedPers || [],
            playerInfos: playerInfos,
            drawnThisTurn: game.drawnThisTurn,
            lastDiscardTaken: myDiscardTaken,
            takenDiscardTileId: takenDiscardTileId,
            lastDrawnTileId: lastDrawnTileId,
            lastDrawnTile: lastDrawnTile,
            canTakeDiscard: canTakeDiscard,
            canRevealGosterge: canRevealGosterge,
            revealedGosterge: game.revealedGosterge || {},
            myRevealedGostergeTileId: myRevealedGostergeTileId,
            disconnectedPlayers: game.disconnectedPlayers || {},
            roundNumber: game.roundNumber || 1,
            mode: game.mode || 'esli',
            yazboz: game.yazboz || null,
            partnerId: partnerPid,
            partnerOpened: partnerOpened,
            teamIdx: okey101Engine.getTeamIndex(game, pid),
            isSpectator: false,
            tableId: game.tableId,
            turnTimeout: 40,
            gameOver: game.gameOver,
            winner: game.winner
        });
    });

    if (game.spectators && game.spectators.length > 0) {
        game.spectators.forEach((sid) => {
            io.to(sid).emit('okey101Update', {
                hand: [],
                myTurn: false,
                turnIndex: game.turnIndex,
                players: game.players,
                turnPlayerName: currentPlayerName,
                gosterge: game.gosterge,
                okeyDef: game.okeyDef,
                drawPileCount: game.drawPile ? game.drawPile.length : 0,
                tableOpenedPers: game.tableOpenedPers || [],
                playerInfos: playerInfos,
                drawnThisTurn: game.drawnThisTurn,
                lastDiscardTaken: game.lastDiscardTaken,
                canTakeDiscard: false,
                canRevealGosterge: false,
                revealedGosterge: game.revealedGosterge || {},
                disconnectedPlayers: game.disconnectedPlayers || {},
                roundNumber: game.roundNumber || 1,
                mode: game.mode || 'esli',
                yazboz: game.yazboz || null,
                isSpectator: true,
                tableId: game.tableId,
                turnTimeout: 40,
                gameOver: game.gameOver,
                winner: game.winner
            });
        });
    }

    if (game.gameOver && game.winner && !game.winnerRecorded) {
        game.winnerRecorded = true;
        let wName = game.playerProfiles[game.winner]?.name;
        if (wName) {
            let isHuman = !game.winner.startsWith('bot_') && !wName.startsWith('🤖');
            if (isHuman) {
                dataManager.persistentData.leaderboard.okey101[wName] = (dataManager.persistentData.leaderboard.okey101[wName] || 0) + 1;
            }
            game.players.forEach(pid => {
                let pName = game.playerProfiles[pid]?.name;
                if (pName && !pid.startsWith('bot_') && !pName.startsWith('🤖')) {
                    dataManager.recordQuestProgress(pName, 'okey101_play', 1);
                }
            });
            let winPrize = 25;
            if (game.pot && game.pot > 0) {
                winPrize += game.pot;
                let potMsg = `💰 TEBRİKLER! ${wName} 101 Okey masasındaki ${game.pot} TL'lik potu kazandı!`;
                game.players.forEach(pid => io.to(pid).emit('systemMessage', potMsg));
                if (game.spectators) game.spectators.forEach(sid => io.to(sid).emit('systemMessage', potMsg));
                game.pot = 0;
            }
            if (isHuman && dataManager.persistentData.users[wName]) {
                dataManager.persistentData.users[wName].money = (dataManager.persistentData.users[wName].money || 100) + winPrize;
                io.to(game.winner).emit('moneyUpdate', dataManager.persistentData.users[wName].money);
            }
            dataManager.savePersistentData();
        }
    } else {
        startOkey101AfkTimer(game, io, players);
    }
}

function startOkey101AfkTimer(game, io, players) {
    if (!game || game.gameOver) return;
    let gid = game.tableId;
    if (okey101AfkTimers[gid]) {
        clearTimeout(okey101AfkTimers[gid]);
        delete okey101AfkTimers[gid];
    }

    let currentPid = game.players[game.turnIndex];
    let isBot = game.playerProfiles[currentPid]?.isBot || currentPid.startsWith('bot_');
    let delay = isBot ? 1400 : 40000;

    okey101AfkTimers[gid] = setTimeout(() => {
        delete okey101AfkTimers[gid];
        if (game.players[game.turnIndex] === currentPid && !game.gameOver) {
            okey101Engine.makeBotMove(game, currentPid);
            sendOkey101Update(game, io, players);
            if (game.gameOver) {
                checkOkey101RoundEnd(game, io, players);
            }
        }
    }, delay);
}

function startNextOkey101Round(oldGame, io, players) {
    if (!oldGame || !oldGame.tableId) return;
    let tableId = oldGame.tableId;
    let nextRoundNum = (oldGame.roundNumber || 1) + 1;
    let nextGame = okey101Engine.startOkey101Game(
        oldGame.players,
        oldGame.scores,
        nextRoundNum,
        oldGame.mode || 'esli',
        oldGame.yazboz
    );
    nextGame.tableId = tableId;
    nextGame.mode = oldGame.mode;
    nextGame.bet = oldGame.bet;
    nextGame.pot = oldGame.pot;
    nextGame.spectators = oldGame.spectators || [];
    nextGame.disconnectedPlayers = oldGame.disconnectedPlayers || {};
    nextGame.playerProfiles = oldGame.playerProfiles || {};

    activeGames[tableId] = nextGame;
    sendOkey101Update(nextGame, io, players);
}

function checkOkey101RoundEnd(game, io, players) {
    if (!game || !game.gameOver || game.nextRoundScheduled) return;
    game.nextRoundScheduled = true;
    setTimeout(() => {
        if (game.tableId && activeGames[game.tableId] && activeGames[game.tableId].gameOver) {
            startNextOkey101Round(activeGames[game.tableId], io, players);
        }
    }, 8000);
}

// --- BİLARDO BOT ŞUTU ---
function makeBilliardBotShot(game, botId) {
    if (!game || game.gameOver || game.players[game.turnIndex] !== botId) return;

    if (game.ballInHand) {
        let placed = false;
        let testPositions = [
            { x: 150, y: 150 }, { x: 140, y: 100 }, { x: 140, y: 200 },
            { x: 180, y: 150 }, { x: 120, y: 150 }, { x: 200, y: 120 }
        ];
        for (let pos of testPositions) {
            if (billiardEngine.placeWhiteBall(game, botId, pos.x, pos.y)) {
                placed = true;
                break;
            }
        }
        if (!placed) {
            game.balls.white.x = 150;
            game.balls.white.y = 150;
            game.balls.white.vx = 0;
            game.balls.white.vy = 0;
            game.ballInHand = false;
        }
    }

    let white = game.balls.white;
    if (!white || !white.active) return;

    let mySuit = game.playerSuits[botId];
    let candidateBalls = [];
    let allBalls = Object.values(game.balls).filter(b => b.active && b.type !== 'white');

    if (mySuit) {
        candidateBalls = allBalls.filter(b => b.type === mySuit);
        if (candidateBalls.length === 0) {
            candidateBalls = allBalls.filter(b => b.type === 'black');
        }
    } else {
        candidateBalls = allBalls.filter(b => b.type === 'solid' || b.type === 'stripe');
        if (candidateBalls.length === 0) candidateBalls = allBalls.filter(b => b.type === 'black');
    }

    if (candidateBalls.length === 0) return;

    const pockets = [
        { x: 12, y: 12 }, { x: 300, y: 10 }, { x: 588, y: 12 },
        { x: 12, y: 288 }, { x: 300, y: 290 }, { x: 588, y: 288 }
    ];

    let bestShot = null;
    let bestScore = -999999;

    for (let target of candidateBalls) {
        for (let pocket of pockets) {
            let dxTP = pocket.x - target.x;
            let dyTP = pocket.y - target.y;
            let distTP = Math.sqrt(dxTP * dxTP + dyTP * dyTP);
            if (distTP === 0) continue;

            let ghostX = target.x - (dxTP / distTP) * 16;
            let ghostY = target.y - (dyTP / distTP) * 16;

            if (ghostX < 16 || ghostX > 584 || ghostY < 16 || ghostY > 284) continue;

            let dxWG = ghostX - white.x;
            let dyWG = ghostY - white.y;
            let distWG = Math.sqrt(dxWG * dxWG + dyWG * dyWG);
            if (distWG === 0) continue;

            let dirWG = { x: dxWG / distWG, y: dyWG / distWG };
            let dirTP = { x: dxTP / distTP, y: dyTP / distTP };
            let dot = dirWG.x * dirTP.x + dirWG.y * dirTP.y;

            if (dot > 0.05) {
                let score = dot * 200 - distTP * 0.2 - distWG * 0.15;
                if (score > bestScore) {
                    bestScore = score;
                    bestShot = {
                        angle: Math.atan2(dyWG, dxWG) * (180 / Math.PI),
                        power: Math.min(22, Math.max(10, 8 + (distTP + distWG) * 0.025))
                    };
                }
            }
        }
    }

    if (!bestShot) {
        let target = candidateBalls[0];
        let dx = target.x - white.x;
        let dy = target.y - white.y;
        bestShot = {
            angle: Math.atan2(dy, dx) * (180 / Math.PI),
            power: 14
        };
    }

    let jitter = (Math.random() - 0.5) * 3;
    let finalAngle = bestShot.angle + jitter;

    billiardEngine.shootBall(game, botId, finalAngle, bestShot.power, 0, 0);
}

// --- MASA BAŞLATMA ---
function startGameForTable(tableId, table, room, io, players) {
    let bet = table.bet || 0;
    let pot = 0;

    table.players.forEach(pid => {
        if (!pid.startsWith('bot_') && players[pid]) {
            let uName = players[pid].name;
            if (dataManager.persistentData.users[uName]) {
                dataManager.persistentData.users[uName].money = Math.max(0, (dataManager.persistentData.users[uName].money || 0) - bet);
                players[pid].money = dataManager.persistentData.users[uName].money;
                io.to(pid).emit('moneyUpdate', players[pid].money);
            }
        }
        pot += bet;
    });
    dataManager.savePersistentData();

    let betAnnouncement = bet > 0 ? ` (Masa Bahsi: ${bet} TL | Toplam Ödül Havuzu: ${pot} TL)` : "";
    io.to(room).emit('systemMessage', `🔥 ${table.name} oyunu başladı!${betAnnouncement}`);

    let isBatak4 = table.baseType === 'batak4';
    let isBatak3 = table.baseType === 'batak';
    let isBilliard = table.baseType === 'billiard';
    let isTavla = table.baseType === 'tavla';
    let isOkey101 = table.baseType === 'okey101' || table.baseType === 'okey101_tekli';

    if (isBatak3 || isBatak4) {
        let engine = isBatak3 ? batakEngine : batak4Engine;
        let newGame = engine.startBatakGame(table.players, null, 1);
        newGame.isBatak4 = isBatak4;
        newGame.tableId = tableId;
        newGame.bet = bet;
        newGame.pot = pot;
        newGame.spectators = [];
        newGame.disconnectedPlayers = {};
        newGame.playerProfiles = {};
        table.players.forEach(pid => {
            newGame.playerProfiles[pid] = {
                name: players[pid] ? players[pid].name : "Oyuncu",
                color: players[pid] ? players[pid].color : "#fff",
                isBot: !!players[pid]?.isBot
            };
        });

        activeGames[tableId] = newGame;
        activeGames[tableId].players.forEach((pid) => {
            if (!pid.startsWith('bot_')) io.to(pid).emit('startGame', 'batak');
        });
        sendBatakUpdate(activeGames[tableId], io, players);
    }
    else if (isBilliard) {
        let newGame = billiardEngine.startBilliardGame(table.players);
        newGame.tableId = tableId;
        newGame.bet = bet;
        newGame.pot = pot;
        newGame.spectators = [];
        newGame.disconnectedPlayers = {};
        newGame.playerProfiles = {};
        table.players.forEach(pid => {
            newGame.playerProfiles[pid] = {
                name: players[pid] ? players[pid].name : "Oyuncu",
                isBot: !!players[pid]?.isBot
            };
        });

        activeGames[tableId] = newGame;
        activeGames[tableId].players.forEach((pid) => {
            if (!pid.startsWith('bot_')) {
                io.to(pid).emit('startGame', 'billiard');
                io.to(pid).emit('billiardUpdate', {
                    balls: newGame.balls,
                    turnIndex: newGame.turnIndex,
                    players: newGame.players,
                    playerSuits: newGame.playerSuits,
                    ballInHand: newGame.ballInHand,
                    winner: newGame.winner,
                    gameOver: newGame.gameOver,
                    tableId: newGame.tableId,
                    turnTimeout: 30,
                    disconnectedPlayers: {}
                });
            }
        });
    }
    else if (isTavla) {
        let newGame = tavlaEngine.startTavlaGame(table.players);
        newGame.tableId = tableId;
        newGame.bet = bet;
        newGame.pot = pot;
        newGame.spectators = [];
        newGame.disconnectedPlayers = {};
        newGame.playerProfiles = {};
        table.players.forEach(pid => {
            newGame.playerProfiles[pid] = {
                name: players[pid] ? players[pid].name : "Oyuncu",
                isBot: !!players[pid]?.isBot
            };
        });

        activeGames[tableId] = newGame;
        activeGames[tableId].players.forEach((pid) => {
            if (!pid.startsWith('bot_')) io.to(pid).emit('startGame', 'tavla');
        });
        sendTavlaUpdate(activeGames[tableId], io);
    }
    else if (isOkey101) {
        let mode = table.mode || (table.baseType === 'okey101_tekli' ? 'tekli' : 'esli');
        let newGame = okey101Engine.startOkey101Game(table.players, null, 1, mode);
        newGame.tableId = tableId;
        newGame.bet = bet;
        newGame.pot = pot;
        newGame.mode = mode;
        newGame.spectators = [];
        newGame.disconnectedPlayers = {};
        newGame.playerProfiles = {};
        table.players.forEach(pid => {
            newGame.playerProfiles[pid] = {
                name: players[pid] ? players[pid].name : "Oyuncu",
                color: players[pid] ? players[pid].color : "#fff",
                isBot: !!players[pid]?.isBot
            };
        });

        activeGames[tableId] = newGame;
        activeGames[tableId].players.forEach((pid) => {
            if (!pid.startsWith('bot_')) io.to(pid).emit('startGame', 'okey101');
        });
        sendOkey101Update(activeGames[tableId], io, players);
    }
}

// --- BİLARDO FİZİK DÖNGÜSÜ ---
function startBilliardPhysicsLoop(io) {
    setInterval(() => {
        for (let gid in activeGames) {
            if (!gid.startsWith('billiard')) continue;
            let game = activeGames[gid];
            if (game) {
                let isMoving = billiardEngine.updatePhysics(game);

                // Bot Sırası
                if (!isMoving && !game.gameOver && !game.shotActive) {
                    let currentPid = game.players[game.turnIndex];
                    let isBot = currentPid && (currentPid.startsWith('bot_') || game.playerProfiles[currentPid]?.isBot);
                    if (isBot && !billiardBotTimers[gid]) {
                        billiardBotTimers[gid] = setTimeout(() => {
                            delete billiardBotTimers[gid];
                            makeBilliardBotShot(game, currentPid);
                        }, 1400);
                    }
                }

                // Bilardo Bitiş
                if (game.gameOver && game.winner && !game.winnerRecorded) {
                    game.winnerRecorded = true;
                    let wName = game.playerProfiles[game.winner]?.name;
                    let isHuman = !game.winner.startsWith('bot_') && !wName.startsWith('🤖') && !game.playerProfiles[game.winner]?.isBot;
                    if (wName) {
                        if (isHuman) {
                            dataManager.persistentData.leaderboard.billiard[wName] = (dataManager.persistentData.leaderboard.billiard[wName] || 0) + 1;
                        }
                        let winPrize = 20;
                        if (game.pot && game.pot > 0) {
                            winPrize += game.pot;
                            let potMsg = `💰 TEBRİKLER! ${wName} bilardo masasındaki ${game.pot} TL'lik potu kazandı!`;
                            game.players.forEach(pid => io.to(pid).emit('systemMessage', potMsg));
                            if (game.spectators) game.spectators.forEach(sid => io.to(sid).emit('systemMessage', potMsg));
                            game.pot = 0;
                        }
                        if (isHuman && dataManager.persistentData.users[wName]) {
                            dataManager.persistentData.users[wName].money = (dataManager.persistentData.users[wName].money || 100) + winPrize;
                            io.to(game.winner).emit('moneyUpdate', dataManager.persistentData.users[wName].money);
                        }
                        dataManager.savePersistentData();
                    }
                }

                let stateObj = {
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
                };

                game.players.forEach((pid) => {
                    io.to(pid).emit('billiardUpdate', { ...stateObj, isSpectator: false });
                });

                if (game.spectators && game.spectators.length > 0) {
                    game.spectators.forEach((sid) => {
                        io.to(sid).emit('billiardUpdate', { ...stateObj, isSpectator: true });
                    });
                }
            }
        }
    }, 30);
}

module.exports = {
    activeGames,
    getActiveGames,
    getActiveGame,
    getBatakInstance,
    getBilliardInstance,
    getTavlaInstance,
    getOkey101Instance,
    startBatakAfkTimer,
    makeBatakAiMove,
    handleBatakCardPlayed,
    sendBatakUpdate,
    sendTavlaUpdate,
    sendOkey101Update,
    startOkey101AfkTimer,
    startNextOkey101Round,
    checkOkey101RoundEnd,
    makeBilliardBotShot,
    startGameForTable,
    startBilliardPhysicsLoop,
    billiardEngine,
    tavlaEngine,
    okey101Engine,
    batakEngine,
    batak4Engine,
    batakAfkTimers,
    okey101AfkTimers,
    billiardBotTimers,
    tableCleanupTimers,
    clearTableCleanupTimer
};
