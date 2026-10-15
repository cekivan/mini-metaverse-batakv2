// src/handlers/economyHandler.js - Gardırop, Balıkçılık, Kuğu Kiralama, Liderlik ve Admin Yöneticisi
const config = require('../config');
const dataManager = require('../dataManager');

function registerEconomyHandlers(io, socket, players, helpers) {
    const { playerFishingTimers, givePlayerTeaWithTimer, getAdminOnlineUsers } = helpers;

    // 1. GARDIROR VE KIYAFET SATIN ALMA
    socket.on('buyWardrobeItem', (data) => {
        if (!players[socket.id] || !data) return;
        let username = players[socket.id].name;
        let userData = dataManager.persistentData.users[username];
        if (!userData) return;

        let cat = data.category;
        let normCat = cat.endsWith('s') ? cat : (cat + 's');
        let singleCat = cat.endsWith('s') ? cat.slice(0, -1) : cat;
        let itemId = data.id;

        let itemKey = `${normCat}_${itemId}`;
        let itemCost = config.WARDROBE_ITEM_PRICES[itemKey] !== undefined ? config.WARDROBE_ITEM_PRICES[itemKey] : 5;
        let isFree = (itemCost === 0 || itemId === 'none' || itemId === '#facc15' || itemId === '#3b82f6');

        if (normCat === 'props' && itemId !== 'none') {
            if (userData.money < itemCost) {
                socket.emit('gameError', `Yetersiz bakiye! Bu eşya ${itemCost} TL. Bakiyeniz: ${userData.money} TL.`);
                return;
            }
            userData.money -= itemCost;
            if (!userData.propInventory) userData.propInventory = {};
            userData.propInventory[itemKey] = (userData.propInventory[itemKey] || 0) + 1;

            if (!userData.inventory) userData.inventory = [];
            if (!userData.inventory.includes(itemKey)) userData.inventory.push(itemKey);

            if (itemId === 'cay') {
                givePlayerTeaWithTimer(socket.id, username, 300000);
                dataManager.recordQuestProgress(username, 'drink_tea', 1);
            } else {
                userData.avatar.heldItem = itemId;
                players[socket.id].heldItem = itemId;
            }

            dataManager.savePersistentData();
            socket.emit('moneyUpdate', userData.money);
            socket.emit('propInventoryUpdate', userData.propInventory);
            socket.emit('wardrobeUpdate', { avatar: userData.avatar, inventory: userData.inventory });
            io.to(players[socket.id].room).emit('playerAvatarChange', {
                id: socket.id,
                avatar: userData.avatar,
                heldItem: players[socket.id].heldItem
            });
            socket.emit('systemMessage', `✅ 1 adet ${itemId} satın aldın! Çantandaki toplam: ${userData.propInventory[itemKey]} adet.`);
            return;
        }

        let isAlreadyOwned = isFree || (userData.inventory && userData.inventory.includes(itemKey));

        if (!isAlreadyOwned) {
            if (userData.money < itemCost) {
                socket.emit('gameError', `Yetersiz bakiye! Bu eşya ${itemCost} TL. Bakiyeniz: ${userData.money} TL.`);
                return;
            }
            userData.money -= itemCost;
            if (!userData.inventory) userData.inventory = [];
            userData.inventory.push(itemKey);
        }

        if (singleCat === 'hat') {
            userData.avatar.hat = itemId;
            players[socket.id].hat = itemId;
        } else if (singleCat === 'face') {
            userData.avatar.face = itemId;
            players[socket.id].face = itemId;
        } else if (singleCat === 'skin') {
            userData.avatar.skinColor = itemId;
            players[socket.id].skinColor = itemId;
        } else if (singleCat === 'shirt') {
            userData.avatar.shirtColor = itemId;
            userData.avatar.color = itemId;
            players[socket.id].color = itemId;
        } else if (singleCat === 'shoe') {
            userData.avatar.shoes = itemId;
            players[socket.id].shoes = itemId;
        }

        dataManager.savePersistentData();

        socket.emit('moneyUpdate', userData.money);
        socket.emit('wardrobeUpdate', { avatar: userData.avatar, inventory: userData.inventory });

        let updatedAvatar = userData.avatar;
        io.to(players[socket.id].room).emit('playerAvatarChange', {
            id: socket.id,
            avatar: updatedAvatar,
            hat: updatedAvatar.hat,
            face: updatedAvatar.face,
            skinColor: updatedAvatar.skinColor,
            color: updatedAvatar.color,
            heldItem: updatedAvatar.heldItem,
            shoes: updatedAvatar.shoes,
            gender: updatedAvatar.gender
        });
    });

    // 2. KUĞU DENİZ BİSİKLETİ KİRALAMA
    socket.on('rentSwanBoat', () => {
        if (!players[socket.id]) return;
        let username = players[socket.id].name;
        let userData = dataManager.persistentData.users[username];
        if (!userData) return;

        if (players[socket.id].hasSwanBoat) {
            socket.emit('gameError', "Zaten Kuğu Deniz Bisikleti kiraladınız!");
            return;
        }
        if (userData.money < 20) {
            socket.emit('gameError', "Kuğu Deniz Bisikleti kiralamak için 20 TL gerekiyor! Bakiyeniz yetersiz.");
            return;
        }

        userData.money -= 20;
        players[socket.id].money = userData.money;
        players[socket.id].hasSwanBoat = true;
        dataManager.savePersistentData();

        socket.emit('moneyUpdate', userData.money);
        socket.emit('swanBoatRented', true);
        io.to(players[socket.id].room).emit('playerSwanBoatUpdate', { id: socket.id, hasSwanBoat: true });
        socket.emit('systemMessage', "🦢 Tebrikler! 20 TL'ye Kuğu Deniz Bisikleti kiraladın.");
    });

    // 3. SAHİL BALIK TUTMA
    socket.on('startFishing', () => {
        if (!players[socket.id] || players[socket.id].room !== 'sahil') return;
        if (players[socket.id].isFishing) {
            socket.emit('gameError', "Zaten oltan denizde! Balığın vurmasını bekle...");
            return;
        }

        players[socket.id].isFishing = true;
        io.to('sahil').emit('playerFishingState', { id: socket.id, isFishing: true });
        socket.emit('fishingStarted', { duration: 10 });

        if (playerFishingTimers[socket.id]) clearTimeout(playerFishingTimers[socket.id]);

        playerFishingTimers[socket.id] = setTimeout(() => {
            if (!players[socket.id] || !players[socket.id].isFishing) return;
            players[socket.id].isFishing = false;
            delete playerFishingTimers[socket.id];

            let currentLootTable = players[socket.id].hasSwanBoat 
                ? config.SWAN_BOAT_LOOT_TABLE 
                : config.FISH_LOOT_TABLE;

            let totalWeight = currentLootTable.reduce((sum, item) => sum + item.weight, 0);
            let rand = Math.random() * totalWeight;
            let chosen = currentLootTable[0];
            let acc = 0;
            for (let item of currentLootTable) {
                acc += item.weight;
                if (rand <= acc) {
                    chosen = item;
                    break;
                }
            }

            let uName = players[socket.id].name;
            let earned = chosen.value;
            let uData = dataManager.persistentData.users[uName];
            if (uData) {
                uData.money = (uData.money || 0) + earned;
                players[socket.id].money = uData.money;
                dataManager.savePersistentData();
                dataManager.recordQuestProgress(uName, 'go_fishing', 1);
                socket.emit('moneyUpdate', players[socket.id].money);
            }

            socket.emit('fishingResult', {
                loot: chosen,
                money: players[socket.id].money
            });

            io.to('sahil').emit('playerFishingState', { id: socket.id, isFishing: false });

            if (['levrek', 'ahtapot', 'inci', 'mercan', 'hazine'].includes(chosen.id)) {
                io.to('sahil').emit('systemMessage', `🎣 VAY CANINA! ${uName} denizden ${chosen.emoji} ${chosen.name} tuttu! (+${earned} TL)`);
            }
        }, 10000);
    });

    socket.on('cancelFishing', () => {
        if (players[socket.id] && players[socket.id].isFishing) {
            players[socket.id].isFishing = false;
            if (playerFishingTimers[socket.id]) {
                clearTimeout(playerFishingTimers[socket.id]);
                delete playerFishingTimers[socket.id];
            }
            io.to('sahil').emit('playerFishingState', { id: socket.id, isFishing: false });
        }
    });

    // 4. ADMİN PANELİ İŞLEMLERİ
    socket.on('adminGetUsers', () => {
        if (!players[socket.id] || !players[socket.id].isAdmin) {
            socket.emit('gameError', "Bu işlem için admin yetkisi gerekiyor!");
            return;
        }
        socket.emit('adminUsersList', getAdminOnlineUsers());
    });

    socket.on('adminModifyMoney', (data) => {
        if (!players[socket.id] || !players[socket.id].isAdmin) {
            socket.emit('gameError', "Bu işlem için admin yetkisi gerekiyor!");
            return;
        }
        if (!data || !data.targetUsername) return;
        let targetUser = data.targetUsername;
        let amount = dataManager.sanitizeAmount(data.amount, 0, 100000000);
        if (amount === null) {
            socket.emit('gameError', "Geçersiz para miktarı!");
            return;
        }

        if (!dataManager.persistentData.users[targetUser]) {
            socket.emit('gameError', "Kullanıcı bulunamadı!");
            return;
        }

        if (data.mode === 'set') {
            dataManager.persistentData.users[targetUser].money = amount;
        } else {
            dataManager.persistentData.users[targetUser].money = (dataManager.persistentData.users[targetUser].money || 0) + amount;
        }

        dataManager.savePersistentData();

        let updatedMoney = dataManager.persistentData.users[targetUser].money;

        for (let sid in players) {
            if (players[sid].name.toLowerCase() === targetUser.toLowerCase()) {
                players[sid].money = updatedMoney;
                io.to(sid).emit('moneyUpdate', updatedMoney);
                let noteMsg = (data.mode === 'set')
                    ? `👑 Admin hesabınızın bakiyesini ${amount} TL olarak güncelledi!`
                    : `👑 Admin hesabınıza ${amount} TL ekledi! (Yeni Bakiye: ${updatedMoney} TL)`;
                io.to(sid).emit('systemMessage', noteMsg);
            }
        }

        socket.emit('systemMessage', `✅ ${targetUser} kullanıcısının yeni bakiyesi: ${updatedMoney} TL`);
        socket.emit('adminUsersList', getAdminOnlineUsers());
    });

    // 5. LİDERLİK TABLOSU
    socket.on('getLeaderboard', () => {
        const isHuman = (name) => name && !name.startsWith('🤖') && !name.startsWith('bot_') && !name.includes('🤖') && !name.toLowerCase().includes('dayı') && !name.toLowerCase().includes('ismail') && !name.toLowerCase().includes('emmi');

        let topBilliard = Object.entries(dataManager.persistentData.leaderboard.billiard || {})
            .filter(([name]) => isHuman(name))
            .map(([name, wins]) => ({ name, wins }))
            .sort((a, b) => b.wins - a.wins).slice(0, 5);

        let topBatak = Object.entries(dataManager.persistentData.leaderboard.batak || {})
            .filter(([name]) => isHuman(name))
            .map(([name, score]) => ({ name, score }))
            .sort((a, b) => b.score - a.score).slice(0, 5);

        let topTavla = Object.entries(dataManager.persistentData.leaderboard.tavla || {})
            .filter(([name]) => isHuman(name))
            .map(([name, wins]) => ({ name, wins }))
            .sort((a, b) => b.wins - a.wins).slice(0, 5);

        let topOkey101 = Object.entries(dataManager.persistentData.leaderboard.okey101 || {})
            .filter(([name]) => isHuman(name))
            .map(([name, wins]) => ({ name, wins }))
            .sort((a, b) => b.wins - a.wins).slice(0, 5);

        socket.emit('leaderboardData', {
            billiard: topBilliard,
            batak: topBatak,
            tavla: topTavla,
            okey101: topOkey101
        });
    });

    // 6. GÜNLÜK GÖREVLER (DAILY QUESTS)
    socket.on('getDailyQuests', () => {
        if (!players[socket.id]) return;
        let username = players[socket.id].name;
        let quests = dataManager.getUserDailyQuests(username);
        socket.emit('dailyQuestsData', quests);
    });

    socket.on('claimDailyQuest', (questId) => {
        if (!players[socket.id] || !questId) return;
        let username = players[socket.id].name;
        let res = dataManager.claimQuestReward(username, questId);
        if (res.success) {
            socket.emit('moneyUpdate', res.newMoney);
            socket.emit('dailyQuestsData', res.quests);
            socket.emit('systemMessage', res.msg);
        } else {
            socket.emit('gameError', res.msg);
        }
    });
}

module.exports = { registerEconomyHandlers };
