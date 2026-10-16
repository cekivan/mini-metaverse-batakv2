// src/handlers/ganyanHandler.js - Altılı Ganyan Hipodrom Yarış Motoru & Binek At Kiralama Yöneticisi
const dataManager = require('../dataManager');

// 5 İkonik Türk Hipodrom Atı ve Oranları
const HORSES = [
    { id: 'sahbatur', number: 1, name: 'Şahbatur', odds: 2.20, color: '#dc2626', coatColor: '#852e16', jockeyName: 'Kadir Usta', title: 'Pistlerin Şampiyonu' },
    { id: 'gulbatur', number: 2, name: 'Gülbatur', odds: 3.40, color: '#2563eb', coatColor: '#262626', jockeyName: 'Deli Halil', title: 'Son Düzlük Fırtınası' },
    { id: 'boldpilot', number: 3, name: 'Bold Pilot', odds: 4.80, color: '#eab308', coatColor: '#b45309', jockeyName: 'Gazi Selim', title: 'Efsanevi Rekortmen' },
    { id: 'batangemi', number: 4, name: 'Batan Gemi', odds: 7.50, color: '#16a34a', coatColor: '#64748b', jockeyName: 'Kivre Cemal', title: 'Sürprizlerin Efendisi' },
    { id: 'cilginkivre', number: 5, name: 'Çılgın Kivre', odds: 8.80, color: '#9333ea', coatColor: '#451a03', jockeyName: 'Toroz Reis', title: 'Bomba Kazanç' }
];

const GANYAN_ROOM = 'ganyan';
const BETTING_DURATION_SEC = 15; // 15 sn bahis toplama süresi
const RACING_DURATION_SEC = 30;  // 30 sn yarış süresi

const ganyanState = {
    raceNumber: 1,
    phase: 'BETTING', // 'BETTING', 'RACING'
    secondsLeft: BETTING_DURATION_SEC,
    horses: HORSES,
    bets: {}, // { [socketId]: { username, horseId, amount } }
    winnerHorse: null,
    lastWinner: null,
    raceProgress: {}, // Anlık at pist pozisyonları (0 - 100)
    history: []
};

let ganyanLoopTimer = null;
let ioInstance = null;
let serverPlayersRef = null;

// Binek atı kira zamanlayıcıları: { [socketId]: timeoutId }
const horseMountTimers = {};

function getPlayerMoney(username) {
    if (!username) return 0;
    const uKey = dataManager.findUserKey ? dataManager.findUserKey(username) : username.toLowerCase();
    if (uKey && dataManager.persistentData.users[uKey]) {
        return dataManager.persistentData.users[uKey].money || 0;
    }
    return 0;
}

function addPlayerMoney(username, amount) {
    if (!username || amount <= 0) return 0;
    const uKey = dataManager.findUserKey ? dataManager.findUserKey(username) : username.toLowerCase();
    if (uKey && dataManager.persistentData.users[uKey]) {
        dataManager.persistentData.users[uKey].money = (dataManager.persistentData.users[uKey].money || 0) + amount;
        dataManager.savePersistentData();
        return dataManager.persistentData.users[uKey].money;
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

let ganyanTickCounter = 0;

function initGanyanEngine(io, players) {
    ioInstance = io;
    serverPlayersRef = players;

    if (ganyanLoopTimer) clearInterval(ganyanLoopTimer);
    // 100ms yüksek frekanslı akıcı motor (Saniyede 10 kontrol)
    ganyanLoopTimer = setInterval(tickGanyanEngine, 100);
}

function tickGanyanEngine() {
    if (!ioInstance) return;

    ganyanTickCounter++;

    if (ganyanState.phase === 'BETTING') {
        // Bahis esnasında her 1000ms'de bir sayacı düşür ve güncelle
        if (ganyanTickCounter % 10 === 0) {
            ganyanState.secondsLeft--;
            if (ganyanState.secondsLeft <= 0) {
                startRace();
            } else {
                broadcastGanyanState();
            }
        }
    } else if (ganyanState.phase === 'RACING') {
        const now = Date.now();
        const startTime = ganyanState.raceStartTime || now;
        const elapsedSec = Math.max(0, (now - startTime) / 1000);
        ganyanState.secondsLeft = Math.max(0, Math.ceil(RACING_DURATION_SEC - elapsedSec));

        // 100ms'de bir milimetrik, pürüzsüz ve daima ileri koşan (strictly monotonic) at simülasyonu
        updateRaceSimulation(elapsedSec);

        // İstemcilere kesintisiz, akıcı konum akışı sağla
        broadcastGanyanState();

        if (elapsedSec >= RACING_DURATION_SEC) {
            finishRace();
        }
    }
}

function startRace() {
    ganyanState.phase = 'RACING';
    ganyanState.secondsLeft = RACING_DURATION_SEC;
    ganyanState.raceStartTime = Date.now();
    ganyanState.durationSeconds = RACING_DURATION_SEC;

    // Ağırlıklı şans ile kazananı belirle
    const weights = HORSES.map(h => 1 / h.odds);
    const sumWeights = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * sumWeights;
    let selectedWinner = HORSES[0];

    for (let i = 0; i < HORSES.length; i++) {
        if (rand < weights[i]) {
            selectedWinner = HORSES[i];
            break;
        }
        rand -= weights[i];
    }
    ganyanState.winnerHorse = selectedWinner;

    // Başlangıç pozisyonları
    ganyanState.raceProgress = {};
    HORSES.forEach(h => {
        ganyanState.raceProgress[h.id] = {
            pos: 0,
            lastPos: 0,
            speedVariation: 0.95 + Math.random() * 0.1,
            isWinner: (h.id === selectedWinner.id)
        };
    });

    // 1. Yarış Başladı Event'i (Milisaniye kesinliğinde zaman damgasıyla)
    ioInstance.to(GANYAN_ROOM).emit('ganyan_race_started', {
        raceNumber: ganyanState.raceNumber,
        winnerId: selectedWinner.id,
        horses: HORSES,
        durationSeconds: RACING_DURATION_SEC,
        startTime: ganyanState.raceStartTime
    });

    // 2. Anons
    ioInstance.to(GANYAN_ROOM).emit('ganyan_announcement', {
        title: "🚩 BAHİSLER KAPANMIŞTIR!",
        subMessage: "🚩 Bahisler kapanmıştır, yarış başlıyor!",
        type: 'race_start',
        raceNumber: ganyanState.raceNumber
    });

    broadcastGanyanState();
}

function updateRaceSimulation(elapsedSec) {
    const progressRatio = Math.min(1.0, Math.max(0.0, elapsedSec / RACING_DURATION_SEC)); // 0.0 - 1.0

    HORSES.forEach(h => {
        const item = ganyanState.raceProgress[h.id];
        if (!item) return;

        let p = progressRatio;
        let idx = h.number;
        let baseProgress = p * 92.0;

        // Doğal at yarışı dinamikleri (Kesinlikle pozitif türevli: atlar asla geriye gitmez/ışınlanmaz)
        let strideWave = Math.sin(p * Math.PI * 4 + idx * 1.3) * 1.4;
        let midPush = Math.sin(p * Math.PI) * ((idx % 3 === 0) ? 1.8 : ((idx % 2 === 0) ? -0.8 : 1.0));
        let naturalWiggle = (strideWave + midPush) * Math.sin(p * Math.PI); // Başlangıçta 0, bitişte 0

        if (item.isWinner) {
            if (p > 0.65) {
                // Son düzlük atağı: Son %35'te kazanan at pürüzsüzce hızlanarak öne fırlar
                let surgeRatio = (p - 0.65) / 0.35;
                let surge = Math.pow(surgeRatio, 1.6) * 8.0;
                item.pos = Math.min(100.0, baseProgress + surge + naturalWiggle * 0.4);
            } else {
                item.pos = Math.min(72.0, baseProgress + naturalWiggle);
            }
            if (p >= 0.985) item.pos = 100.0;
        } else {
            // Diğer atlar biraz geride takip eder (93.5 - 97.2 arasında bitirir)
            let cap = 93.5 + ((5 - idx) * 0.7);
            let horseProg = p * cap + naturalWiggle * 0.7;
            item.pos = Math.max(0.0, Math.min(cap, horseProg));
        }

        // Kesinlikle geriye sıçramayı önle (Monotonic forward clamp)
        if (item.lastPos !== undefined && item.pos < item.lastPos) {
            item.pos = item.lastPos;
        }
        item.lastPos = item.pos;
    });
}

function finishRace() {
    const winner = ganyanState.winnerHorse;
    let totalPayout = 0;
    const winnersList = [];

    for (const [sId, bet] of Object.entries(ganyanState.bets)) {
        if (bet.horseId === winner.id) {
            const winAmount = Math.floor(bet.amount * winner.odds);
            totalPayout += winAmount;

            const newBal = addPlayerMoney(bet.username, winAmount);
            winnersList.push({ username: bet.username, winAmount, horseName: winner.name });

            const targetSocket = ioInstance.sockets.sockets.get(sId);
            if (targetSocket) {
                if (serverPlayersRef && serverPlayersRef[sId]) {
                    serverPlayersRef[sId].money = newBal;
                }
                targetSocket.emit('moneyUpdate', newBal);
                targetSocket.emit('ganyan_bet_won', {
                    horseName: winner.name,
                    betAmount: bet.amount,
                    odds: winner.odds,
                    winAmount: winAmount
                });
            }
        }
    }

    const finishedRaceNumber = ganyanState.raceNumber;
    ganyanState.history.unshift({
        raceNumber: finishedRaceNumber,
        winner: winner,
        winnersCount: winnersList.length,
        totalPayout: totalPayout
    });
    if (ganyanState.history.length > 8) ganyanState.history.pop();

    // Yeni tur için bahisleri 30 saniye boyunca aç
    prepareNextRace();
    ganyanState.lastWinner = winner;

    // 1. Yarış Tamamlandı Event'i
    ioInstance.to(GANYAN_ROOM).emit('ganyan_race_finished', {
        winner: winner,
        winnersList: winnersList,
        raceNumber: finishedRaceNumber,
        nextRaceNumber: ganyanState.raceNumber
    });

    // 2. Kullanıcı Talebi: "ve yarış bittiğinde kazanan atı söylerken altında da yeni turlar için bahisler açılmıştır tarzı bir bildirim görsün o mekandaki herkes."
    ioInstance.to(GANYAN_ROOM).emit('ganyan_announcement', {
        title: `🏆 ${winner.number} Nolu ${winner.name} Kazandı!`,
        subMessage: "📢 Yeni turlar için bahisler açılmıştır! Kuponlarınızı yatırabilirsiniz.",
        type: 'race_finish',
        winner: winner,
        raceNumber: finishedRaceNumber
    });
}

function prepareNextRace() {
    ganyanState.phase = 'BETTING';
    ganyanState.secondsLeft = BETTING_DURATION_SEC;
    ganyanState.raceNumber++;
    ganyanState.bets = {};
    ganyanState.winnerHorse = null;
    ganyanState.raceProgress = {};
}

function broadcastGanyanState() {
    if (!ioInstance) return;
    ioInstance.to(GANYAN_ROOM).emit('ganyan_state_update', {
        raceNumber: ganyanState.raceNumber,
        phase: ganyanState.phase,
        secondsLeft: ganyanState.secondsLeft,
        raceStartTime: ganyanState.raceStartTime || null,
        durationSeconds: RACING_DURATION_SEC,
        horses: HORSES,
        winnerHorse: ganyanState.winnerHorse,
        lastWinner: ganyanState.lastWinner || null,
        raceProgress: ganyanState.raceProgress,
        history: ganyanState.history,
        totalBetsCount: Object.keys(ganyanState.bets).length
    });
}

function registerGanyanHandlers(io, socket, players) {
    socket.on('get_ganyan_state', () => {
        const pObj = players[socket.id];
        const username = pObj ? (pObj.name || pObj.username) : null;
        const myBet = ganyanState.bets[socket.id] || (username ? Object.values(ganyanState.bets).find(b => b.username === username) : null) || null;

        socket.emit('ganyan_state_update', {
            raceNumber: ganyanState.raceNumber,
            phase: ganyanState.phase,
            secondsLeft: ganyanState.secondsLeft,
            horses: HORSES,
            winnerHorse: ganyanState.winnerHorse,
            lastWinner: ganyanState.lastWinner || null,
            raceProgress: ganyanState.raceProgress,
            history: ganyanState.history,
            myBet: myBet,
            totalBetsCount: Object.keys(ganyanState.bets).length
        });
    });

    socket.on('ganyan_place_bet', (data) => {
        const pObj = players[socket.id];
        const username = pObj ? (pObj.name || pObj.username) : null;
        if (!pObj || !username) {
            socket.emit('ganyan_error', "Bahis yapmak için giriş yapmış olmalısınız.");
            return;
        }

        // KURAL 1: Yarış esnasında kimse bahis yapamasın
        if (ganyanState.phase !== 'BETTING') {
            socket.emit('ganyan_error', "⛔ Koşu devam ediyor! Yarış esnasında kupon yatırılamaz. Lütfen bir sonraki turu bekleyin.");
            return;
        }

        // KURAL 2: Bug engeli: Sadece tek bir at seçilsin ve yarış başına tek bir bahis oynansın
        const existingBet = ganyanState.bets[socket.id] || Object.values(ganyanState.bets).find(b => b.username === username);
        if (existingBet) {
            socket.emit('ganyan_error', `⚠️ Bu yarış için zaten ${existingBet.horseName} adlı ata ${existingBet.amount} TL bahis oynadınız! Her yarışta yalnızca 1 ata 1 kez bahis yapabilirsiniz.`);
            return;
        }

        const horseId = data.horseId;
        const amount = parseInt(data.amount, 10);

        if (!horseId || !amount || amount <= 0 || isNaN(amount)) {
            socket.emit('ganyan_error', "Geçersiz bahis tutarı!");
            return;
        }

        const targetHorse = HORSES.find(h => h.id === horseId);
        if (!targetHorse) {
            socket.emit('ganyan_error', "Seçilen at bulunamadı!");
            return;
        }

        const curMoney = getPlayerMoney(username);
        if (curMoney < amount) {
            socket.emit('ganyan_error', `Yetersiz bakiye! Mevcut paranız: ${curMoney} TL`);
            return;
        }

        const newBalance = deductPlayerMoney(username, amount);
        if (players[socket.id]) players[socket.id].money = newBalance;
        socket.emit('moneyUpdate', newBalance);

        ganyanState.bets[socket.id] = {
            username: username,
            horseId: horseId,
            horseName: targetHorse.name,
            odds: targetHorse.odds,
            amount: amount,
            possibleWin: Math.floor(amount * targetHorse.odds)
        };

        socket.emit('ganyan_bet_placed', {
            success: true,
            horseName: targetHorse.name,
            amount: amount,
            odds: targetHorse.odds,
            possibleWin: Math.floor(amount * targetHorse.odds)
        });

        io.to(GANYAN_ROOM).emit('ganyan_new_bet_announced', {
            username: username,
            horseName: targetHorse.name,
            amount: amount
        });
    });

    socket.on('rent_horse_mount', () => {
        const pObj = players[socket.id];
        const username = pObj ? (pObj.name || pObj.username) : null;
        if (!pObj || !username) {
            socket.emit('horse_rent_result', { success: false, message: "Giriş yapmalısınız." });
            return;
        }
        const COST = 200;
        const DURATION_MS = 5 * 60 * 1000;

        const curMoney = getPlayerMoney(username);
        if (curMoney < COST) {
            socket.emit('horse_rent_result', {
                success: false,
                message: `Binek atı kiralamak için en az 200 TL gerekir! (Bakiyeniz: ${curMoney} TL)`
            });
            return;
        }

        const newBalance = deductPlayerMoney(username, COST);
        if (players[socket.id]) players[socket.id].money = newBalance;
        socket.emit('moneyUpdate', newBalance);

        const expiresAt = Date.now() + DURATION_MS;
        players[socket.id].hasHorse = true;
        players[socket.id].horseExpiresAt = expiresAt;

        if (horseMountTimers[socket.id]) {
            clearTimeout(horseMountTimers[socket.id]);
        }

        horseMountTimers[socket.id] = setTimeout(() => {
            if (players[socket.id]) {
                players[socket.id].hasHorse = false;
                delete players[socket.id].horseExpiresAt;
                
                const curSocket = io.sockets.sockets.get(socket.id);
                if (curSocket) {
                    curSocket.emit('horse_mount_expired');
                    io.to(players[socket.id].room).emit('playerHorseUpdate', {
                        id: socket.id,
                        hasHorse: false
                    });
                }
            }
            delete horseMountTimers[socket.id];
        }, DURATION_MS);

        socket.emit('horse_rent_result', {
            success: true,
            durationSeconds: 300,
            expiresAt: expiresAt,
            message: "🐎 Şahlanan Asil Binek Atını 5 dakikalığına kiraladın! Yürüme hızın 2 katına çıktı!"
        });

        io.to(players[socket.id].room).emit('playerHorseUpdate', {
            id: socket.id,
            hasHorse: true
        });
    });

    socket.on('disconnect', () => {
        if (horseMountTimers[socket.id]) {
            clearTimeout(horseMountTimers[socket.id]);
            delete horseMountTimers[socket.id];
        }
        delete ganyanState.bets[socket.id];
    });
}

module.exports = {
    initGanyanEngine,
    registerGanyanHandlers,
    ganyanState,
    HORSES
};
