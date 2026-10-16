// src/handlers/rouletteHandler.js - VIP Avrupa Ruleti Sunucu Mantığı
const dataManager = require('../dataManager');

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

// Avrupa Rulet Çarkı Sıralaması (Saat Yönünde)
const WHEEL_ORDER = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
    24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

// Casino Rulet Geçmişi (Son 15 Sayı)
const rouletteHistory = [];

function getNumberColor(num) {
    if (num === 0) return 'green';
    return RED_NUMBERS.includes(num) ? 'red' : 'black';
}

function calculatePayout(winningNumber, betKey, betAmount) {
    let winColor = getNumberColor(winningNumber);
    let num = Number(betKey);

    // 1. Düz Sayı Bahsi (0 - 36) -> 36x (35:1 net kazanç + ana para)
    if (!isNaN(num) && num >= 0 && num <= 36) {
        if (num === winningNumber) {
            return betAmount * 36;
        }
        return 0;
    }

    // 0 geldiyse tüm dış bahisler kaybeder
    if (winningNumber === 0) {
        return 0;
    }

    // 2. Renk Bahisleri (Kırmızı / Siyah) -> 2x (1:1)
    if (betKey === 'red') {
        return winColor === 'red' ? betAmount * 2 : 0;
    }
    if (betKey === 'black') {
        return winColor === 'black' ? betAmount * 2 : 0;
    }

    // 3. Tek / Çift Bahisleri -> 2x (1:1)
    if (betKey === 'even') {
        return winningNumber % 2 === 0 ? betAmount * 2 : 0;
    }
    if (betKey === 'odd') {
        return winningNumber % 2 !== 0 ? betAmount * 2 : 0;
    }

    // 4. Düşük (1-18) / Yüksek (19-36) -> 2x (1:1)
    if (betKey === 'low') {
        return (winningNumber >= 1 && winningNumber <= 18) ? betAmount * 2 : 0;
    }
    if (betKey === 'high') {
        return (winningNumber >= 19 && winningNumber <= 36) ? betAmount * 2 : 0;
    }

    // 5. Düzineler (1st 12, 2nd 12, 3rd 12) -> 3x (2:1)
    if (betKey === '1st12') {
        return (winningNumber >= 1 && winningNumber <= 12) ? betAmount * 3 : 0;
    }
    if (betKey === '2nd12') {
        return (winningNumber >= 13 && winningNumber <= 24) ? betAmount * 3 : 0;
    }
    if (betKey === '3rd12') {
        return (winningNumber >= 25 && winningNumber <= 36) ? betAmount * 3 : 0;
    }

    // 6. Kolonlar (Col 1: 1,4,7... / Col 2: 2,5,8... / Col 3: 3,6,9...) -> 3x (2:1)
    if (betKey === 'col1') {
        return (winningNumber % 3 === 1) ? betAmount * 3 : 0;
    }
    if (betKey === 'col2') {
        return (winningNumber % 3 === 2) ? betAmount * 3 : 0;
    }
    if (betKey === 'col3') {
        return (winningNumber % 3 === 0) ? betAmount * 3 : 0;
    }

    return 0;
}

function registerRouletteHandlers(io, socket, players) {
    // 1. Rulet Masasını Açma / Geçmiş Bilgisi Alma
    socket.on('roulette_join', () => {
        socket.emit('roulette_init', {
            history: rouletteHistory.slice(-15),
            wheelOrder: WHEEL_ORDER,
            redNumbers: RED_NUMBERS,
            blackNumbers: BLACK_NUMBERS
        });
    });

    // 2. Rulet Çarkını Çevirme (Bahis Yapma)
    socket.on('roulette_spin', (data) => {
        if (!players[socket.id] || !data || !data.bets || typeof data.bets !== 'object') {
            socket.emit('roulette_error', 'Geçersiz bahis isteği.');
            return;
        }

        let username = players[socket.id].name;
        let userData = dataManager.persistentData.users[username];
        if (!userData) {
            socket.emit('roulette_error', 'Kullanıcı hesabı bulunamadı.');
            return;
        }

        // Toplam bahsi doğrula
        let totalBet = 0;
        let sanitizedBets = {};

        for (let [betKey, amount] of Object.entries(data.bets)) {
            let parsedAmount = parseInt(amount, 10);
            if (isNaN(parsedAmount) || parsedAmount <= 0) continue;
            totalBet += parsedAmount;
            sanitizedBets[betKey] = parsedAmount;
        }

        if (totalBet <= 0) {
            socket.emit('roulette_error', 'Lütfen en az bir geçerli bahis yapın.');
            return;
        }

        if (totalBet > 100000) {
            socket.emit('roulette_error', 'Maksimum toplam bahis limiti 100.000 TL\'dir.');
            return;
        }

        if (userData.money < totalBet) {
            socket.emit('roulette_error', `Yetersiz bakiye! Bahis için ${totalBet} TL gerekiyor. Bakiyeniz: ${userData.money} TL.`);
            return;
        }

        // Bahis tutarını düş
        userData.money -= totalBet;

        // Rastgele kazanan sayıyı belirle (0 - 36)
        let winningNumber = Math.floor(Math.random() * 37);
        let winColor = getNumberColor(winningNumber);

        // Kazançları hesapla
        let totalPayout = 0;
        let winningBets = {};

        for (let [betKey, amount] of Object.entries(sanitizedBets)) {
            let payout = calculatePayout(winningNumber, betKey, amount);
            if (payout > 0) {
                totalPayout += payout;
                winningBets[betKey] = payout;
            }
        }

        // Kazancı ekle
        userData.money += totalPayout;
        players[socket.id].money = userData.money;
        dataManager.savePersistentData();

        let netWin = totalPayout - totalBet;

        // Geçmişe ekle
        rouletteHistory.push({ number: winningNumber, color: winColor });
        if (rouletteHistory.length > 30) rouletteHistory.shift();

        // Sonucu istemciye ilet
        socket.emit('moneyUpdate', userData.money);
        socket.emit('roulette_result', {
            winningNumber,
            color: winColor,
            wheelIndex: WHEEL_ORDER.indexOf(winningNumber),
            totalBet,
            totalPayout,
            netWin,
            winningBets,
            newBalance: userData.money,
            history: rouletteHistory.slice(-15)
        });

        // Mekandaki diğer oyunculara son kazanan sayıyı bildir
        if (players[socket.id].room === 'dedenin_yeri') {
            socket.to('dedenin_yeri').emit('roulette_broadcast_result', {
                username,
                winningNumber,
                color: winColor,
                netWin
            });
        }
    });
}

module.exports = {
    registerRouletteHandlers,
    calculatePayout,
    getNumberColor,
    WHEEL_ORDER,
    RED_NUMBERS,
    BLACK_NUMBERS
};
