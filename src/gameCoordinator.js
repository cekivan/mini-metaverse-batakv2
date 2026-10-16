// src/gameCoordinator.js - Oyun Motorları ve AFK Bot Yönetim Koordinatörü
const batakEngine = require('./engines/batak.js');
const batak4Engine = require('./engines/batak4.js');
const billiardEngine = require('./engines/billiard.js');
const tavlaEngine = require('./engines/tavla.js');
const okey101Engine = require('./engines/okey101.js');

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
                // 1. Bu elde alınan net puanları hesapla
                let handScores = {};
                game.players.forEach(pid => {
                    let curScore = game.scores[pid] || 0;
                    let prevScore = (game.lastScores && game.lastScores[pid] !== undefined) ? game.lastScores[pid] : 0;
                    handScores[pid] = curScore - prevScore;
                });
                game.lastScores = { ...game.scores };

                let currentRoundInSet = game.setRound || 1;
                if (!game.currentSetRounds) game.currentSetRounds = [];
                game.currentSetRounds.push({
                    roundNum: currentRoundInSet,
                    isTieBreaker: !!game.isTieBreaker,
                    handScores: { ...handScores },
                    totalScores: { ...game.scores }
                });

                // Görev ilerlemesi
                game.players.forEach(pid => {
                    let pName = game.playerProfiles[pid]?.name;
                    let isBot = pid.startsWith('bot_') || (pName && (pName.startsWith('🤖') || pName.includes('🤖'))) || game.playerProfiles[pid]?.isBot;
                    if (pName && !isBot) {
                        dataManager.recordQuestProgress(pName, 'batak_play', 1);
                    }
                });

                // 2. Set Kontrolleri: 5. Tur ve Eşitlik Bozma (6. Tur) Mantığı
                if (currentRoundInSet < 5) {
                    let nextRoundNum = currentRoundInSet + 1;
                    let roundMsg = `TUR BİTTİ! (${currentRoundInSet}. El). Puanlar kaydedildi, ${nextRoundNum}. el dağıtılıyor...`;
                    game.players.forEach(pid => io.to(pid).emit('systemMessage', roundMsg));
                    if (game.spectators) game.spectators.forEach(sid => io.to(sid).emit('systemMessage', roundMsg));

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
                        newGame.paidPlayers = game.paidPlayers || {};
                        newGame.currentSet = game.currentSet || 1;
                        newGame.setRound = nextRoundNum;
                        newGame.isTieBreaker = !!game.isTieBreaker;
                        newGame.currentSetRounds = game.currentSetRounds;
                        newGame.setsHistory = game.setsHistory || [];
                        newGame.cumulativeSetPoints = game.cumulativeSetPoints || {};
                        newGame.rematchVotes = {};
                        newGame.lastScores = game.lastScores;

                        activeGames[game.tableId] = newGame;
                        sendBatakUpdate(newGame, io, players);
                    }, 3500);
                } else if (currentRoundInSet === 5) {
                    // 5. Tur Bitti! Zirvede puan eşitliği var mı kontrol et
                    let maxScore = -999999;
                    game.players.forEach(pid => {
                        let sc = game.scores[pid] || 0;
                        if (sc > maxScore) maxScore = sc;
                    });
                    let topPlayers = game.players.filter(pid => (game.scores[pid] || 0) === maxScore);

                    if (topPlayers.length >= 2) {
                        // Eşitlik var -> 6. Tur (Eşitlik Bozma Oyunu) ekle!
                        game.isTieBreaker = true;
                        game.setRound = 6;

                        let topNames = topPlayers.map(p => game.playerProfiles[p]?.name || "Oyuncu").join(" ve ");
                        let tieMsg = `⚡ EŞİTLİK BOZMA OYUNU! 5. tur sonunda ${topNames} eşit puanla (${maxScore}) berabere kaldı! Kazananı belirlemek için 6. tur (Eşitlik Bozma Oyunu) başlıyor!`;
                        game.players.forEach(pid => io.to(pid).emit('systemMessage', tieMsg));
                        if (game.spectators) game.spectators.forEach(sid => io.to(sid).emit('systemMessage', tieMsg));

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
                            newGame.paidPlayers = game.paidPlayers || {};
                            newGame.currentSet = game.currentSet || 1;
                            newGame.setRound = 6;
                            newGame.isTieBreaker = true;
                            newGame.currentSetRounds = game.currentSetRounds;
                            newGame.setsHistory = game.setsHistory || [];
                            newGame.cumulativeSetPoints = game.cumulativeSetPoints || {};
                            newGame.rematchVotes = {};
                            newGame.lastScores = game.lastScores;

                            activeGames[game.tableId] = newGame;
                            sendBatakUpdate(newGame, io, players);
                        }, 4000);
                    } else {
                        // Tek birinci var, 5. tur sonunda set bitti!
                        finalizeBatakSet(game, engine, io, players);
                    }
                } else if (currentRoundInSet === 6) {
                    // 6. Tur (Eşitlik Bozma) Bitti! Seti tamamla
                    finalizeBatakSet(game, engine, io, players);
                }
            } else {
                sendBatakUpdate(game, io, players);
            }
        }, 2000);
    } else {
        sendBatakUpdate(game, io, players);
    }
}

function finalizeBatakSet(game, engine, io, players) {
    if (!game) return;

    // 1. Oyuncuları set puanlarına göre sırala (azalan sırayla)
    let ranked = [...game.players].map(pid => {
        let pName = game.playerProfiles[pid]?.name || (players[pid] ? players[pid].name : "Oyuncu");
        let score = game.scores[pid] || 0;
        let isBot = pid.startsWith('bot_') || (pName && (pName.startsWith('🤖') || pName.includes('🤖'))) || game.playerProfiles[pid]?.isBot;
        return { pid, name: pName, score, isBot };
    }).sort((a, b) => b.score - a.score);

    // 2. Set Sıralaması ve Set Puanları: 1. -> 3 puan, 2. -> 2 puan, 3. -> 1 puan (4. varsa -> 0)
    let setPointsTable = [3, 2, 1, 0];
    if (!game.cumulativeSetPoints) game.cumulativeSetPoints = {};
    ranked.forEach((item, index) => {
        item.rank = index + 1;
        item.setPoints = setPointsTable[index] !== undefined ? setPointsTable[index] : 0;
        game.cumulativeSetPoints[item.pid] = (game.cumulativeSetPoints[item.pid] || 0) + item.setPoints;
    });

    let winner = ranked[0];
    let winPid = winner.pid;
    let winName = winner.name;

    // Leaderboard güncellemesi
    if (!winner.isBot && winName) {
        dataManager.persistentData.leaderboard.batak[winName] = (dataManager.persistentData.leaderboard.batak[winName] || 0) + (winner.score > 0 ? winner.score : 1);
    }

    // 3. Pot Ödülü: Set sonundaki EN YÜKSEK kişi potun TAMAMINI (örn. 3.000 TL) tek başına kazanır!
    let winPrize = 0;
    if (game.pot && game.pot > 0) {
        winPrize = game.pot;
        game.pot = 0;
        if (!winner.isBot && dataManager.persistentData.users[winName]) {
            dataManager.persistentData.users[winName].money = (dataManager.persistentData.users[winName].money || 0) + winPrize;
            if (players[winPid]) players[winPid].money = dataManager.persistentData.users[winName].money;
            io.to(winPid).emit('moneyUpdate', dataManager.persistentData.users[winName].money);
        }
        dataManager.savePersistentData();

        let potMsg = `💰 TEBRİKLER! ${winName} ${game.currentSet || 1}. Seti ${winner.score} puanla zirvede tamamlayarak ${winPrize} TL'lik dev potu tek başına kazandı!`;
        game.players.forEach(pid => io.to(pid).emit('systemMessage', potMsg));
        if (game.spectators) game.spectators.forEach(sid => io.to(sid).emit('systemMessage', potMsg));
    } else {
        let setMsg = `🏆 ${game.currentSet || 1}. SET BİTTİ! Şampiyon: ${winName} (${winner.score} puan | +3 Set Puanı kazandı)`;
        game.players.forEach(pid => io.to(pid).emit('systemMessage', setMsg));
        if (game.spectators) game.spectators.forEach(sid => io.to(sid).emit('systemMessage', setMsg));
    }

    // 4. Set Geçmişine Kaydet
    if (!game.setsHistory) game.setsHistory = [];
    game.setsHistory.push({
        setNumber: game.currentSet || 1,
        rounds: [...(game.currentSetRounds || [])],
        finalScores: { ...game.scores },
        rankings: ranked.map(r => ({ ...r })),
        winnerId: winPid,
        winnerName: winName,
        isTieBreaker: !!game.isTieBreaker,
        potAwarded: winPrize
    });

    game.setEnded = true;
    game.rematchVotes = {};

    // 5. batakSetCompleted Event'ini Yayınla
    let setCompletedPayload = {
        tableId: game.tableId,
        setNumber: game.currentSet || 1,
        rankings: ranked,
        winner: winner,
        potAwarded: winPrize,
        setsHistory: game.setsHistory,
        cumulativeSetPoints: game.cumulativeSetPoints,
        isTieBreaker: !!game.isTieBreaker,
        bet: game.bet || 0
    };

    game.players.forEach(pid => {
        io.to(pid).emit('batakSetCompleted', setCompletedPayload);
    });
    if (game.spectators) {
        game.spectators.forEach(sid => io.to(sid).emit('batakSetCompleted', setCompletedPayload));
    }

    sendBatakUpdate(game, io, players);

    // 6. Botlar için otomatik rövanş oyu
    game.players.forEach(pid => {
        let isBot = pid.startsWith('bot_') || game.playerProfiles[pid]?.isBot;
        if (isBot) {
            setTimeout(() => {
                handleBatakVoteRematch(game, pid, true, io, players);
            }, 1500);
        }
    });
}

function handleBatakVoteRematch(game, pid, vote, io, players) {
    if (!game || !game.setEnded) return;
    if (!game.rematchVotes) game.rematchVotes = {};
    game.rematchVotes[pid] = !!vote;

    let pName = game.playerProfiles[pid]?.name || (players[pid] ? players[pid].name : "Oyuncu");

    let votePayload = {
        playerId: pid,
        playerName: pName,
        agreed: !!vote,
        votes: game.rematchVotes,
        totalPlayers: game.players.length
    };
    game.players.forEach(p => io.to(p).emit('batakRematchStatus', votePayload));
    if (game.spectators) game.spectators.forEach(s => io.to(s).emit('batakRematchStatus', votePayload));

    let allAgreed = game.players.every(p => game.rematchVotes[p]);
    if (allAgreed) {
        let bet = game.bet || 0;
        if (bet > 0) {
            let brokePlayers = [];
            game.players.forEach(p => {
                if (!p.startsWith('bot_') && players[p]) {
                    let uName = players[p].name;
                    let curMoney = (dataManager.persistentData.users[uName]?.money !== undefined)
                        ? dataManager.persistentData.users[uName].money
                        : (players[p].money || 0);
                    if (curMoney < bet) {
                        brokePlayers.push({ pid: p, name: uName, money: curMoney });
                    }
                }
            });

            if (brokePlayers.length > 0) {
                let warningMsg = "Paranız bu masada oynamaya yetmiyor isterseniz ücretsiz masalara geçiş yapabilirsiniz.";
                brokePlayers.forEach(bp => {
                    io.to(bp.pid).emit('insufficientFundsWarning', {
                        message: warningMsg,
                        requiredBet: bet,
                        currentMoney: bp.money
                    });
                    io.to(bp.pid).emit('systemMessage', `⚠️ ${warningMsg}`);
                });
                game.players.filter(p => !brokePlayers.some(bp => bp.pid === p)).forEach(otherPid => {
                    io.to(otherPid).emit('systemMessage', `⚠️ Masadaki oyunculardan birinin bakiyesi yeni set bahsini karşılamaya yetmedi.`);
                });
                game.rematchVotes = {};
                return;
            }

            let newPot = 0;
            game.players.forEach(p => {
                if (!p.startsWith('bot_') && players[p]) {
                    let uName = players[p].name;
                    dataManager.persistentData.users[uName].money = Math.max(0, (dataManager.persistentData.users[uName].money || 0) - bet);
                    players[p].money = dataManager.persistentData.users[uName].money;
                    io.to(p).emit('moneyUpdate', players[p].money);
                }
                newPot += bet;
            });
            dataManager.savePersistentData();
            game.pot = newPot;
        }

        // Yeni set başlat
        game.currentSet = (game.currentSet || 1) + 1;
        game.setRound = 1;
        game.isTieBreaker = false;
        game.setEnded = false;
        game.rematchVotes = {};
        game.currentSetRounds = [];
        game.lastScores = {};
        game.scores = {};
        game.players.forEach(p => { game.scores[p] = 0; });

        let engine = game.isBatak4 ? batak4Engine : batakEngine;
        let newGame = engine.startBatakGame(game.players, game.scores, 1);
        newGame.isBatak4 = game.isBatak4;
        newGame.tableId = game.tableId;
        newGame.bet = game.bet || 0;
        newGame.pot = game.pot || 0;
        newGame.spectators = game.spectators || [];
        newGame.playerProfiles = game.playerProfiles;
        newGame.disconnectedPlayers = game.disconnectedPlayers || {};
        newGame.paidPlayers = game.paidPlayers || {};
        newGame.currentSet = game.currentSet;
        newGame.setRound = 1;
        newGame.isTieBreaker = false;
        newGame.currentSetRounds = [];
        newGame.setsHistory = game.setsHistory;
        newGame.cumulativeSetPoints = game.cumulativeSetPoints;
        newGame.rematchVotes = {};
        newGame.lastScores = {};

        activeGames[game.tableId] = newGame;

        let startNotice = `📢 ${newGame.currentSet}. Set Başladı!${bet > 0 ? ` (Set Bahsi: ${bet} TL | Pot: ${newGame.pot} TL)` : ''}`;
        newGame.players.forEach(pid => {
            io.to(pid).emit('systemMessage', startNotice);
            io.to(pid).emit('batakNewSetStarted', {
                setNumber: newGame.currentSet,
                pot: newGame.pot,
                bet: newGame.bet
            });
        });
        if (newGame.spectators) {
            newGame.spectators.forEach(sid => io.to(sid).emit('systemMessage', startNotice));
        }

        sendBatakUpdate(newGame, io, players);
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

    let commonState = {
        phase: game.phase,
        table: game.tableCards,
        turnIndex: game.turnIndex,
        players: game.players,
        turnPlayerName: currentPlayerName,
        trump: game.trump,
        bidInfo: game.bid,
        playerInfos: playerInfos,
        roundNumber: game.roundNumber || 1,
        tableId: game.tableId,
        turnTimeout: 40,
        currentSet: game.currentSet || 1,
        setRound: game.setRound || 1,
        isTieBreaker: !!game.isTieBreaker,
        currentSetRounds: game.currentSetRounds || [],
        setsHistory: game.setsHistory || [],
        cumulativeSetPoints: game.cumulativeSetPoints || {},
        bet: game.bet || 0,
        pot: game.pot || 0,
        setEnded: !!game.setEnded,
        rematchVotes: game.rematchVotes || {}
    };

    game.players.forEach((pid) => {
        io.to(pid).emit('batakUpdate', {
            ...commonState,
            hand: (game.hands && game.hands[pid]) || [],
            myTurn: !game.waitingTrickClear && (game.players[game.turnIndex] === pid),
            tricks: (game.tricksTaken && game.tricksTaken[pid] !== undefined) ? game.tricksTaken[pid] : 0,
            isSpectator: false
        });
    });

    if (game.spectators && game.spectators.length > 0) {
        game.spectators.forEach((sid) => {
            io.to(sid).emit('batakUpdate', {
                ...commonState,
                hand: [],
                myTurn: false,
                tricks: 0,
                isSpectator: true
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

    if (!game.gameOver) {
        let currentPid = game.players[game.turnIndex];
        let isBot = currentPid && (currentPid.startsWith('bot_') || game.playerProfiles?.[currentPid]?.isBot);
        if (isBot) {
            setTimeout(() => {
                if (game.players[game.turnIndex] === currentPid && !game.gameOver) {
                    tavlaEngine.makeTavlaBotMove(game, currentPid);
                    sendTavlaUpdate(game, io);
                }
            }, 1200);
        }
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

    if (game.gameOver) {
        checkOkey101RoundEnd(game, io, players);
        if (game.winner && !game.winnerRecorded) {
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

    if (oldGame.nextRoundTimer) {
        clearTimeout(oldGame.nextRoundTimer);
        delete oldGame.nextRoundTimer;
    }
    oldGame.nextRoundScheduled = false;

    let nextRoundNum = (oldGame.roundNumber || 1) + 1;
    let scores = oldGame.scores;
    let yazboz = oldGame.yazboz;

    // 11 El tamamlandığında maç biter ve yeni oyun başlar
    if (oldGame.roundNumber >= 11) {
        nextRoundNum = 1;
        scores = null;
        yazboz = null;

        let champName = "Oyuncu";
        let minScore = 999999;
        if (oldGame.mode === 'esli' && oldGame.yazboz) {
            let t1 = (oldGame.yazboz.team1 && oldGame.yazboz.team1.totalScore !== undefined) ? oldGame.yazboz.team1.totalScore : 0;
            let t2 = (oldGame.yazboz.team2 && oldGame.yazboz.team2.totalScore !== undefined) ? oldGame.yazboz.team2.totalScore : 0;
            if (t1 <= t2) {
                champName = "1. Grup (Oyuncu 1 & 3)";
                minScore = t1;
            } else {
                champName = "2. Grup (Oyuncu 2 & 4)";
                minScore = t2;
            }
        } else if (oldGame.scores) {
            for (let pid in oldGame.scores) {
                let sc = oldGame.scores[pid];
                if (sc < minScore) {
                    minScore = sc;
                    champName = oldGame.playerProfiles?.[pid]?.name || players[pid]?.name || "Oyuncu";
                }
            }
        }

        let champMsg = `🏆 101 OKEY MAÇI TAMAMLANDI! 11 El sonucunda ŞAMPİYON: ${champName} (Toplam ${minScore} Ceza)! Yeni maç başlıyor...`;
        oldGame.players.forEach(pid => io.to(pid).emit('systemMessage', champMsg));
        if (oldGame.spectators) oldGame.spectators.forEach(sid => io.to(sid).emit('systemMessage', champMsg));
    }

    let nextGame = okey101Engine.startOkey101Game(
        oldGame.players,
        scores,
        nextRoundNum,
        oldGame.mode || 'esli',
        yazboz
    );
    nextGame.tableId = tableId;
    nextGame.mode = oldGame.mode;
    nextGame.bet = oldGame.bet;
    nextGame.pot = oldGame.pot || 0;
    nextGame.spectators = oldGame.spectators || [];
    nextGame.disconnectedPlayers = oldGame.disconnectedPlayers || {};
    nextGame.playerProfiles = oldGame.playerProfiles || {};
    nextGame.paidPlayers = oldGame.paidPlayers || {};

    activeGames[tableId] = nextGame;
    sendOkey101Update(nextGame, io, players);
}

function checkOkey101RoundEnd(game, io, players) {
    if (!game || !game.gameOver || game.nextRoundScheduled) return;
    game.nextRoundScheduled = true;
    if (game.nextRoundTimer) {
        clearTimeout(game.nextRoundTimer);
    }
    game.nextRoundTimer = setTimeout(() => {
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
    let paidPlayers = {};

    table.players.forEach(pid => {
        if (!pid.startsWith('bot_') && players[pid]) {
            let uName = players[pid].name;
            paidPlayers[uName.toLowerCase()] = true;
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
        newGame.paidPlayers = { ...paidPlayers };
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

        // Set Sistemi Başlatma
        newGame.currentSet = 1;
        newGame.setRound = 1;
        newGame.isTieBreaker = false;
        newGame.currentSetRounds = [];
        newGame.setsHistory = [];
        newGame.cumulativeSetPoints = {};
        newGame.rematchVotes = {};
        newGame.lastScores = {};
        table.players.forEach(pid => {
            newGame.cumulativeSetPoints[pid] = 0;
            newGame.lastScores[pid] = 0;
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
        newGame.roundNumber = 1;
        newGame.rematchVotes = {};
        newGame.paidPlayers = { ...paidPlayers };
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
                    roundNumber: 1,
                    bet: newGame.bet,
                    pot: newGame.pot,
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
        newGame.paidPlayers = { ...paidPlayers };
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
        newGame.paidPlayers = { ...paidPlayers };
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

// --- BİLARDO RÖVANŞ OYLAMA & YENİ TUR BAŞLATMA ---
function handleBilliardVoteRematch(game, pid, vote, io, players) {
    if (!game || !game.gameOver) return;
    if (!game.rematchVotes) game.rematchVotes = {};
    game.rematchVotes[pid] = !!vote;

    let pName = game.playerProfiles[pid]?.name || (players[pid] ? players[pid].name : "Oyuncu");

    let votePayload = {
        playerId: pid,
        playerName: pName,
        agreed: !!vote,
        votes: game.rematchVotes,
        totalPlayers: game.players.length
    };
    game.players.forEach(p => io.to(p).emit('billiardRematchStatus', votePayload));
    if (game.spectators) game.spectators.forEach(s => io.to(s).emit('billiardRematchStatus', votePayload));

    let allAgreed = game.players.every(p => game.rematchVotes[p]);
    if (allAgreed) {
        let bet = game.bet || 0;
        if (bet > 0) {
            let brokePlayers = [];
            game.players.forEach(p => {
                if (!p.startsWith('bot_') && players[p]) {
                    let uName = players[p].name;
                    let curMoney = (dataManager.persistentData.users[uName]?.money !== undefined)
                        ? dataManager.persistentData.users[uName].money
                        : (players[p].money || 0);
                    if (curMoney < bet) {
                        brokePlayers.push({ pid: p, name: uName, money: curMoney });
                    }
                }
            });

            if (brokePlayers.length > 0) {
                let warningMsg = "Paranız bu masada oynamaya yetmiyor isterseniz ücretsiz masalara geçiş yapabilirsiniz.";
                brokePlayers.forEach(bp => {
                    io.to(bp.pid).emit('insufficientFundsWarning', {
                        message: warningMsg,
                        requiredBet: bet,
                        currentMoney: bp.money
                    });
                    io.to(bp.pid).emit('systemMessage', `⚠️ ${warningMsg}`);
                });
                game.players.filter(p => !brokePlayers.some(bp => bp.pid === p)).forEach(otherPid => {
                    io.to(otherPid).emit('systemMessage', `⚠️ Masadaki oyuncunun bakiyesi yeni tur bahsini karşılamaya yetmedi.`);
                });
                game.rematchVotes = {};
                return;
            }

            let newPot = 0;
            game.players.forEach(p => {
                if (!p.startsWith('bot_') && players[p]) {
                    let uName = players[p].name;
                    dataManager.persistentData.users[uName].money = Math.max(0, (dataManager.persistentData.users[uName].money || 0) - bet);
                    players[p].money = dataManager.persistentData.users[uName].money;
                    io.to(p).emit('moneyUpdate', players[p].money);
                }
                newPot += bet;
            });
            dataManager.savePersistentData();
            game.pot = newPot;
        }

        // Yeni bilardo turu başlat
        game.roundNumber = (game.roundNumber || 1) + 1;
        let fresh = billiardEngine.startBilliardGame(game.players);
        game.balls = fresh.balls;
        game.turnIndex = fresh.turnIndex;
        game.playerSuits = fresh.playerSuits;
        game.ballInHand = fresh.ballInHand;
        game.winner = null;
        game.gameOver = false;
        game.winnerRecorded = false;
        game.rematchVotes = {};
        game.shotActive = false;
        game._forceUpdate = true;

        let startNotice = `🎱 ${game.roundNumber}. Tur Başladı!${bet > 0 ? ` (Masa Bahsi: ${bet} TL | Pot: ${game.pot} TL)` : ''}`;
        game.players.forEach(pid => {
            io.to(pid).emit('systemMessage', startNotice);
            io.to(pid).emit('billiardRoundStarted', {
                roundNumber: game.roundNumber,
                pot: game.pot,
                bet: game.bet
            });
        });
        if (game.spectators) {
            game.spectators.forEach(sid => io.to(sid).emit('systemMessage', startNotice));
        }
    }
}

// --- BİLARDO FİZİK DÖNGÜSÜ (HAREKET TABANLI AKILLI GÜNCELLEME) ---
function startBilliardPhysicsLoop(io, players = {}) {
    setInterval(() => {
        // Hızlı aktiflik kontrolü: Sunucuda hiç bilardo masası yoksa boşuna işlem yapma
        let hasAnyBilliard = false;
        for (let gid in activeGames) {
            if (gid.startsWith('billiard')) {
                hasAnyBilliard = true;
                break;
            }
        }
        if (!hasAnyBilliard) return;

        let now = Date.now();
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
                    let winPrize = 20;
                    if (game.pot && game.pot > 0) {
                        winPrize += game.pot;
                        let potMsg = `💰 TEBRİKLER! ${wName} bilardo masasındaki ${game.pot} TL'lik potu kazandı!`;
                        game.players.forEach(pid => io.to(pid).emit('systemMessage', potMsg));
                        if (game.spectators) game.spectators.forEach(sid => io.to(sid).emit('systemMessage', potMsg));
                        game.pot = 0;
                    }
                    if (wName) {
                        if (isHuman) {
                            dataManager.persistentData.leaderboard.billiard[wName] = (dataManager.persistentData.leaderboard.billiard[wName] || 0) + 1;
                        }
                        if (isHuman && dataManager.persistentData.users[wName]) {
                            dataManager.persistentData.users[wName].money = (dataManager.persistentData.users[wName].money || 100) + winPrize;
                            io.to(game.winner).emit('moneyUpdate', dataManager.persistentData.users[wName].money);
                        }
                        dataManager.savePersistentData();
                    }

                    // Tur bitti bildirimi & Rövanş oylaması tetikle
                    game.roundNumber = game.roundNumber || 1;
                    game.rematchVotes = {};
                    let roundOverPayload = {
                        tableId: game.tableId,
                        winner: game.winner,
                        winnerName: wName,
                        roundNumber: game.roundNumber,
                        bet: game.bet || 0,
                        potAwarded: winPrize
                    };
                    game.players.forEach(pid => {
                        io.to(pid).emit('billiardRoundOver', roundOverPayload);
                    });
                    if (game.spectators) {
                        game.spectators.forEach(sid => io.to(sid).emit('billiardRoundOver', roundOverPayload));
                    }

                    // Bot için otomatik rövanş oyu
                    game.players.forEach(pid => {
                        let isBot = pid.startsWith('bot_') || game.playerProfiles[pid]?.isBot;
                        if (isBot) {
                            setTimeout(() => {
                                handleBilliardVoteRematch(game, pid, true, io, players);
                            }, 1200);
                        }
                    });
                }

                // Ağ trafiği optimizasyonu: Toplar hareket ederken her 30ms'de bir gönder.
                // Toplar durduğunda hemen 1 kesinleştirici paket gönder.
                // Toplar tamamen hareketsizken gereksiz 33 FPS soket selini kes (yalnızca 1 sn nabız veya zorunlu tetik).
                let shouldEmit = isMoving || game._wasMoving || game._forceUpdate;
                if (!shouldEmit && (!game._lastMotionlessEmit || now - game._lastMotionlessEmit >= 1000)) {
                    shouldEmit = true;
                    game._lastMotionlessEmit = now;
                }
                game._wasMoving = isMoving;
                if (game._forceUpdate) game._forceUpdate = false;

                if (shouldEmit) {
                    let soundEvents = game.soundEvents || [];
                    game.soundEvents = [];

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
                        roundNumber: game.roundNumber || 1,
                        bet: game.bet || 0,
                        pot: game.pot || 0,
                        shotActive: !!game.shotActive,
                        isMoving: !!isMoving,
                        events: soundEvents,
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
    finalizeBatakSet,
    handleBatakVoteRematch,
    handleBilliardVoteRematch,
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
