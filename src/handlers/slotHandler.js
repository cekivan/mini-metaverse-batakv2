// src/handlers/slotHandler.js - ⚡ Dedenin Şimşek Slotu 777 ⚡ Sunucu Mantığı
const dataManager = require('../dataManager');

const SYMBOL_WEIGHTS = [
    { id: 'cherry', icon: '🍒', name: 'Kiraz', weight: 28 },
    { id: 'lemon', icon: '🍋', name: 'Limon', weight: 24 },
    { id: 'grape', icon: '🍇', name: 'Üzüm', weight: 18 },
    { id: 'watermelon', icon: '🍉', name: 'Karpuz', weight: 14 },
    { id: 'bell', icon: '🔔', name: 'Çan', weight: 8 },
    { id: 'diamond', icon: '💎', name: 'Elmas', weight: 5 },
    { id: 'seven', icon: '7️⃣', name: 'Yedi 777', weight: 3 }
];

const ALLOWED_BETS = [10, 25, 50, 100, 250, 500, 1000];

function getRandomSymbol() {
    let totalWeight = SYMBOL_WEIGHTS.reduce((sum, s) => sum + s.weight, 0);
    let rand = Math.random() * totalWeight;
    for (let s of SYMBOL_WEIGHTS) {
        if (rand < s.weight) return s.id;
        rand -= s.weight;
    }
    return SYMBOL_WEIGHTS[0].id;
}

function evaluateSlotSpin(reels, betAmount) {
    let [r1, r2, r3] = reels;
    let multiplier = 0;
    let isJackpot = false;
    let winType = '';

    // 1. Üçlü Eşleşmeler
    if (r1 === r2 && r2 === r3) {
        switch (r1) {
            case 'seven':
                multiplier = 50;
                isJackpot = true;
                winType = '⚡ MEGA 777 JACKPOT! ⚡';
                break;
            case 'diamond':
                multiplier = 25;
                winType = '💎 ELMAS ZAFERİ! 💎';
                break;
            case 'bell':
                multiplier = 15;
                winType = '🔔 ALTIN ÇANLAR! 🔔';
                break;
            case 'watermelon':
                multiplier = 10;
                winType = '🍉 TATLI KARPUZ! 🍉';
                break;
            case 'grape':
                multiplier = 7;
                winType = '🍇 TAZE ÜZÜM! 🍇';
                break;
            case 'lemon':
                multiplier = 5;
                winType = '🍋 EKŞİ LİMON! 🍋';
                break;
            case 'cherry':
                multiplier = 4;
                winType = '🍒 3x KİRAZ! 🍒';
                break;
        }
    } else {
        // 2. Kiraz Bonusları (Herhangi 2 veya 1 Kiraz)
        let cherryCount = reels.filter(r => r === 'cherry').length;
        if (cherryCount === 2) {
            multiplier = 2;
            winType = '🍒 2x Kiraz Tesellisi';
        } else if (cherryCount === 1) {
            multiplier = 1;
            winType = '🍒 1x Kiraz İadesi';
        }
    }

    let winAmount = betAmount * multiplier;
    return {
        multiplier,
        winAmount,
        netWin: winAmount - betAmount,
        isJackpot,
        winType
    };
}

function registerSlotHandlers(io, socket, players) {
    // 1. Slot Bilgisi
    socket.on('slot_init', () => {
        socket.emit('slot_info', {
            allowedBets: ALLOWED_BETS,
            symbols: SYMBOL_WEIGHTS.map(s => ({ id: s.id, icon: s.icon, name: s.name }))
        });
    });

    // 2. Çevirme (Spin)
    socket.on('slot_spin', (data) => {
        if (!players[socket.id] || !data) {
            socket.emit('slot_error', 'Geçersiz slot çevirme isteği.');
            return;
        }

        let betAmount = parseInt(data.betAmount, 10);
        if (isNaN(betAmount) || !ALLOWED_BETS.includes(betAmount)) {
            socket.emit('slot_error', 'Geçersiz bahis miktarı.');
            return;
        }

        let username = players[socket.id].name;
        let userData = dataManager.persistentData.users[username];
        if (!userData) {
            socket.emit('slot_error', 'Kullanıcı verisi bulunamadı.');
            return;
        }

        if (userData.money < betAmount) {
            socket.emit('slot_error', `Yetersiz bakiye! Bahis: ${betAmount} TL, Bakiyeniz: ${userData.money} TL.`);
            return;
        }

        // Bahsi düş
        userData.money -= betAmount;

        // 3 Çarkı Belirle
        let reels = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
        let evalResult = evaluateSlotSpin(reels, betAmount);

        // Kazanç varsa ekle
        if (evalResult.winAmount > 0) {
            userData.money += evalResult.winAmount;
        }

        players[socket.id].money = userData.money;
        dataManager.savePersistentData();

        // İstemciye sonucu gönder
        socket.emit('moneyUpdate', userData.money);
        socket.emit('slot_result', {
            reels,
            betAmount,
            winAmount: evalResult.winAmount,
            multiplier: evalResult.multiplier,
            netWin: evalResult.netWin,
            isJackpot: evalResult.isJackpot,
            winType: evalResult.winType,
            newBalance: userData.money
        });

        // Jackpot kazanıldıysa mekandaki herkese neon tebrik duyurusu gönder
        if (evalResult.isJackpot && players[socket.id].room === 'dedenin_yeri') {
            io.to('dedenin_yeri').emit('systemMessage', `⚡🎰 BÜYÜK JACKPOT! ${username} 777 Slotunda tam ${evalResult.winAmount} TL KAZANDI! 🎰⚡`);
        }
    });
}

module.exports = {
    registerSlotHandlers,
    evaluateSlotSpin,
    getRandomSymbol,
    SYMBOL_WEIGHTS,
    ALLOWED_BETS
};
