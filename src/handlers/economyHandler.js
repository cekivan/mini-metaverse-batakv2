const config = require('../config');
const dataManager = require('../dataManager');
const fatherPetManager = require('../fatherPetManager');

// Kuğu Bisikleti 5 Dakikalık Kiralama Zamanlayıcıları Havuzu
const playerSwanTimers = {};

function registerEconomyHandlers(io, socket, players, helpers) {
    const { playerFishingTimers, givePlayerTeaWithTimer, getAdminOnlineUsers, getAdminSanctionsList, getPlayersInRoom } = helpers;

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

    // 2. KUĞU DENİZ BİSİKLETİ KİRALAMA (5 DAKİKA SÜRE)
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

        const SWAN_DURATION_SECONDS = 300; // 5 dakika (5 * 60)
        if (playerSwanTimers[socket.id]) {
            clearTimeout(playerSwanTimers[socket.id]);
        }

        playerSwanTimers[socket.id] = setTimeout(() => {
            if (!players[socket.id]) return;
            players[socket.id].hasSwanBoat = false;
            delete playerSwanTimers[socket.id];

            io.to(players[socket.id].room).emit('playerSwanBoatUpdate', { id: socket.id, hasSwanBoat: false });
            socket.emit('swanBoatExpired');
            socket.emit('systemMessage', "🦢 Kuğu bisikleti kiralama süreniz (5 dakika) sona erdi!");

            // Eğer oyuncu denizdeyse, suda mahsur kalmaması için güvenle iskeleye/kumsala al
            if (players[socket.id].room === 'sahil') {
                let px = players[socket.id].x;
                let py = players[socket.id].y;
                let onPier = (px >= 70 && px <= 555 && py >= 150 && py <= 235);
                let onSand = (py >= 370 && px >= 210) || (py >= 260 && px >= 340) || (py >= 180 && px >= 440) || (py >= 120 && px >= 550) || (px >= 640);
                if (!onPier && !onSand) {
                    players[socket.id].x = 420;
                    players[socket.id].y = 350;
                    io.to('sahil').emit('playerMoved', { id: socket.id, x: 420, y: 350 });
                }
            }
        }, SWAN_DURATION_SECONDS * 1000);

        socket.emit('moneyUpdate', userData.money);
        socket.emit('swanBoatRented', { duration: SWAN_DURATION_SECONDS });
        io.to(players[socket.id].room).emit('playerSwanBoatUpdate', { id: socket.id, hasSwanBoat: true });
        socket.emit('systemMessage', "🦢 Tebrikler! 20 TL'ye Kuğu Deniz Bisikleti kiraladın. (Süre: 5 Dakika)");
    });

    // 2.1 TROPİK SAHİL KOKTEYL BARI SATIN ALMA
    socket.on('buyCocktail', (data) => {
        if (!players[socket.id] || !data) return;
        let username = players[socket.id].name;
        let userData = dataManager.persistentData.users[username];
        if (!userData) return;

        const COCKTAILS = {
            'coconut': { name: 'Hindistan Cevizi Kokteyli', price: 25, icon: '🥥', chatText: 'Buz gibi Tropik Hindistan Cevizi Kokteyli yudumluyorum! 🌴' },
            'pineapple': { name: 'Ananaslı Frappé', price: 30, icon: '🍍', chatText: 'Taze Buzlu Ananaslı Frappé harika! 🍍' },
            'mojito': { name: 'Çilekli Sahil Mojito', price: 35, icon: '🍓', chatText: 'Çilekli Sahil Mojito ile serinliyorum! 🍓' },
            'sunset': { name: 'Sunset Horizon', price: 45, icon: '🍹', chatText: 'Lüks Sunset Horizon kokteyli yudumluyorum! 🌅' },
            'lemonade': { name: 'Buzlu Nane & Limonata', price: 20, icon: '🍋', chatText: 'Buz gibi nane limonatamı yudumluyorum! 🍋' }
        };

        let item = COCKTAILS[data.id];
        if (!item) return;

        if (userData.money < item.price) {
            socket.emit('gameError', `Yetersiz bakiye! Bu içecek ${item.price} TL. Bakiyeniz: ${userData.money} TL.`);
            return;
        }

        userData.money -= item.price;
        players[socket.id].money = userData.money;
        dataManager.savePersistentData();

        socket.emit('moneyUpdate', userData.money);
        socket.emit('cocktailPurchasedSuccess', item);
        socket.emit('systemMessage', `${item.icon} [${item.name}] satın aldınız ve afiyetle içtiniz! (-${item.price} TL)`);

        // Karakterin odada chat mesajı ve balonu çıkarmasını sağla
        let room = players[socket.id].room;
        let chatMsg = `${item.icon} ${item.chatText}`;
        io.to(room).emit('chatMessage', {
            id: socket.id,
            name: username,
            message: chatMsg,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
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

            // Çok nadir "Denizden babam çıktı" deyimi kontrolü
            if (chosen.id === 'baban') {
                dataManager.recordQuestProgress(uName, 'go_fishing', 1);
                io.to('sahil').emit('playerFishingState', { id: socket.id, isFishing: false });
                socket.emit('fatherCaughtPrompt', {
                    title: "Denizden Baban Çıktı!",
                    proverb: "Denizden babam çıksa yerim...",
                    description: "Oltana takılan şey bir balık değil... Baban! Ne yapmak istersin?",
                    eatReward: 300,
                    playerGender: players[socket.id].gender || 'male'
                });
                return;
            }

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

    // "Denizden Baban Çıktı" Seçim Olayı
    socket.on('fatherChoice', (data) => {
        if (!players[socket.id]) return;
        const choice = (data && data.choice) ? data.choice : 'spare';
        fatherPetManager.handleFatherChoice(socket, choice);
    });

    // Test ve Geliştirici Kısayolu: Anında Denizden Baban Çıktı Eventi Tetikler
    socket.on('devTriggerFatherCatch', () => {
        if (!players[socket.id]) return;
        socket.emit('fatherCaughtPrompt', {
            title: "Denizden Baban Çıktı!",
            proverb: "Denizden babam çıksa yerim...",
            description: "Oltana takılan şey bir balık değil... Baban! Ne yapmak istersin?",
            eatReward: 300,
            playerGender: players[socket.id].gender || 'male'
        });
    });

    socket.on('devTriggerPocketMoney', () => {
        if (!players[socket.id]) return;
        fatherPetManager.giveFatherPocketMoney(socket.id);
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

    // 4.2 ADMİN GLOBAL DUYURU YAYINI (TÜM OYUNA POP-UP)
    socket.on('adminBroadcastAnnouncement', (data) => {
        if (!players[socket.id] || !players[socket.id].isAdmin) {
            socket.emit('gameError', "Bu işlem için admin yetkisi gerekiyor!");
            return;
        }
        let title = (data?.title || "📢 SİSTEM VE YÖNETİCİ DUYURUSU").trim();
        let message = (data?.message || "").trim();
        if (!message) {
            socket.emit('gameError', "Duyuru metni boş olamaz!");
            return;
        }

        let now = new Date();
        let timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

        let announcementData = {
            id: 'ann_' + Date.now(),
            title: title,
            message: message,
            sender: players[socket.id].name || "Admin Yasin",
            time: timeStr
        };

        io.emit('globalAnnouncementPopup', announcementData);
        socket.emit('systemMessage', "✅ Duyuru tüm sunucudaki oyuncuların ekranına pop-up olarak yayınlandı!");
    });

    // 4.3 ADMİN OYUNCU YANINA IŞINLANMA (TELEPORT)
    socket.on('adminTeleportTo', (data) => {
        if (!players[socket.id] || !players[socket.id].isAdmin) {
            socket.emit('gameError', "Bu işlem için admin yetkisi gerekiyor!");
            return;
        }
        if (!data || !data.targetUsername) return;
        let targetSid = Object.keys(players).find(sid => players[sid]?.name?.toLowerCase() === data.targetUsername.toLowerCase());
        if (!targetSid || !players[targetSid]) {
            socket.emit('gameError', "Oyuncu çevrimdışı veya bulunamadı!");
            return;
        }

        let targetP = players[targetSid];
        let adminP = players[socket.id];
        let oldRoom = adminP.room;
        let newRoom = targetP.room;
        let newX = Math.max(30, Math.min(770, targetP.x + 30));
        let newY = targetP.y;

        adminP.room = newRoom;
        adminP.x = newX;
        adminP.y = newY;

        if (oldRoom !== newRoom) {
            socket.leave(oldRoom);
            socket.join(newRoom);
            socket.to(oldRoom).emit('playerDisconnected', socket.id);
            socket.emit('roomChanged', newRoom);
            fatherPetManager.handleRoomChange(socket.id, oldRoom, newRoom);
            socket.emit('currentPlayers', getPlayersInRoom(newRoom));
            socket.emit('activeFatherPets', fatherPetManager.getPetsInRoom(newRoom));
            socket.to(newRoom).emit('newPlayer', { id: socket.id, player: adminP });
        } else {
            io.to(newRoom).emit('playerMoved', { id: socket.id, x: newX, y: newY });
        }
        socket.emit('adminTeleported', { room: newRoom, x: newX, y: newY, target: targetP.name });
        socket.emit('systemMessage', `🚀 ${targetP.name} adlı oyuncunun yanına ışınlandınız! (${newRoom})`);
    });

    // 4.4 ADMİN OYUNCUYU YANINA ÇEKME (SUMMON)
    socket.on('adminSummon', (data) => {
        if (!players[socket.id] || !players[socket.id].isAdmin) {
            socket.emit('gameError', "Bu işlem için admin yetkisi gerekiyor!");
            return;
        }
        if (!data || !data.targetUsername) return;
        let targetSid = Object.keys(players).find(sid => players[sid]?.name?.toLowerCase() === data.targetUsername.toLowerCase());
        if (!targetSid || !players[targetSid]) {
            socket.emit('gameError', "Oyuncu çevrimdışı veya bulunamadı!");
            return;
        }

        let adminP = players[socket.id];
        let targetP = players[targetSid];
        let targetSocket = io.sockets.sockets.get(targetSid);
        let oldRoom = targetP.room;
        let adminRoom = adminP.room;
        let summonX = Math.max(30, Math.min(770, adminP.x + 30));
        let summonY = adminP.y;

        targetP.room = adminRoom;
        targetP.x = summonX;
        targetP.y = summonY;

        if (targetSocket) {
            if (oldRoom !== adminRoom) {
                targetSocket.leave(oldRoom);
                targetSocket.join(adminRoom);
                targetSocket.to(oldRoom).emit('playerDisconnected', targetSid);
                targetSocket.emit('roomChanged', adminRoom);
                fatherPetManager.handleRoomChange(targetSid, oldRoom, adminRoom);
                targetSocket.emit('currentPlayers', getPlayersInRoom(adminRoom));
                targetSocket.emit('activeFatherPets', fatherPetManager.getPetsInRoom(adminRoom));
                targetSocket.to(adminRoom).emit('newPlayer', { id: targetSid, player: targetP });
            } else {
                io.to(adminRoom).emit('playerMoved', { id: targetSid, x: summonX, y: summonY });
            }
            targetSocket.emit('adminSummoned', { room: adminRoom, x: summonX, y: summonY, adminName: adminP.name });
            targetSocket.emit('systemMessage', `🧲 Admin ${adminP.name} sizi yanına ışınladı!`);
        }
        socket.emit('systemMessage', `🧲 ${targetP.name} adlı oyuncu yanınıza çekildi!`);
    });

    // 4.5 ADMİN SÜRELİ SUSTURMA (MUTE)
    socket.on('adminMuteUser', (data) => {
        if (!players[socket.id] || !players[socket.id].isAdmin) {
            socket.emit('gameError', "Bu işlem için admin yetkisi gerekiyor!");
            return;
        }
        if (!data || !data.targetUsername) return;
        let minutes = parseInt(data.minutes) || 5;
        let reason = data.reason || "Yönetici kararı";
        let targetKey = dataManager.findUserKey(data.targetUsername);
        if (!targetKey || !dataManager.persistentData.users[targetKey]) {
            socket.emit('gameError', "Kullanıcı bulunamadı!");
            return;
        }
        let uData = dataManager.persistentData.users[targetKey];
        uData.muteExpiresAt = Date.now() + (minutes * 60 * 1000);
        uData.muteReason = reason;
        uData.mutedBy = players[socket.id].name;
        dataManager.savePersistentData();

        for (let sid in players) {
            if (players[sid]?.name?.toLowerCase() === targetKey.toLowerCase()) {
                players[sid].isMuted = true;
                io.to(sid).emit('playerMutedNotice', {
                    minutes: minutes,
                    expiresAt: uData.muteExpiresAt,
                    reason: reason
                });
                io.to(sid).emit('systemMessage', `🔇 Admin tarafından ${minutes} dakika süreyle susturuldunuz! (Sebep: ${reason})`);
            }
        }
        socket.emit('systemMessage', `🔇 ${targetKey} ${minutes} dakika süreyle susturuldu.`);
        socket.emit('adminUsersList', getAdminOnlineUsers());
        if (typeof getAdminSanctionsList === 'function') {
            socket.emit('adminSanctionsList', getAdminSanctionsList());
        }
    });

    // 4.6 ADMİN SUSTURMAYI KALDIR (UNMUTE)
    socket.on('adminUnmuteUser', (data) => {
        if (!players[socket.id] || !players[socket.id].isAdmin) {
            socket.emit('gameError', "Bu işlem için admin yetkisi gerekiyor!");
            return;
        }
        if (!data || !data.targetUsername) return;
        let targetKey = dataManager.findUserKey(data.targetUsername);
        if (!targetKey || !dataManager.persistentData.users[targetKey]) return;
        let uData = dataManager.persistentData.users[targetKey];
        uData.muteExpiresAt = null;
        uData.muteReason = null;
        uData.mutedBy = null;
        dataManager.savePersistentData();

        for (let sid in players) {
            if (players[sid]?.name?.toLowerCase() === targetKey.toLowerCase()) {
                players[sid].isMuted = false;
                io.to(sid).emit('systemMessage', `🔊 Susturmanız kaldırıldı, artık sohbet edebilirsiniz.`);
            }
        }
        socket.emit('systemMessage', `🔊 ${targetKey} kullanıcısının susturması kaldırıldı.`);
        socket.emit('adminUsersList', getAdminOnlineUsers());
        if (typeof getAdminSanctionsList === 'function') {
            socket.emit('adminSanctionsList', getAdminSanctionsList());
        }
    });

    // 4.7 ADMİN SÜRELİ BAN (OYUNDAN UZAKLAŞTIRMA)
    socket.on('adminBanUser', (data) => {
        if (!players[socket.id] || !players[socket.id].isAdmin) {
            socket.emit('gameError', "Bu işlem için admin yetkisi gerekiyor!");
            return;
        }
        if (!data || !data.targetUsername) return;
        let minutes = parseInt(data.minutes) || 15;
        let reason = data.reason || "Yönetici kararı";
        let targetKey = dataManager.findUserKey(data.targetUsername);
        if (!targetKey || !dataManager.persistentData.users[targetKey]) {
            socket.emit('gameError', "Kullanıcı bulunamadı!");
            return;
        }
        if (dataManager.isUserAdmin(targetKey)) {
            socket.emit('gameError', "Adminler banlanamaz!");
            return;
        }
        let uData = dataManager.persistentData.users[targetKey];
        uData.banExpiresAt = Date.now() + (minutes * 60 * 1000);
        uData.banReason = reason;
        uData.bannedBy = players[socket.id].name;
        dataManager.savePersistentData();

        for (let sid in players) {
            if (players[sid]?.name?.toLowerCase() === targetKey.toLowerCase()) {
                let targetSock = io.sockets.sockets.get(sid);
                if (targetSock) {
                    targetSock.emit('kickedOrBanned', {
                        type: 'ban',
                        minutes: minutes,
                        expiresAt: uData.banExpiresAt,
                        reason: reason
                    });
                    setTimeout(() => { targetSock.disconnect(true); }, 500);
                }
            }
        }
        socket.emit('systemMessage', `⛔ ${targetKey} ${minutes} dakika süreyle oyundan uzaklaştırıldı (banlandı).`);
        socket.emit('adminUsersList', getAdminOnlineUsers());
        if (typeof getAdminSanctionsList === 'function') {
            socket.emit('adminSanctionsList', getAdminSanctionsList());
        }
    });

    // 4.8 ADMİN BANI KALDIR (UNBAN)
    socket.on('adminUnbanUser', (data) => {
        if (!players[socket.id] || !players[socket.id].isAdmin) {
            socket.emit('gameError', "Bu işlem için admin yetkisi gerekiyor!");
            return;
        }
        if (!data || !data.targetUsername) return;
        let targetKey = dataManager.findUserKey(data.targetUsername);
        if (!targetKey || !dataManager.persistentData.users[targetKey]) return;
        let uData = dataManager.persistentData.users[targetKey];
        uData.banExpiresAt = null;
        uData.banReason = null;
        uData.bannedBy = null;
        dataManager.savePersistentData();
        socket.emit('systemMessage', `✅ ${targetKey} kullanıcısının banı kaldırıldı.`);
        socket.emit('adminUsersList', getAdminOnlineUsers());
        if (typeof getAdminSanctionsList === 'function') {
            socket.emit('adminSanctionsList', getAdminSanctionsList());
        }
    });

    // 4.9 ADMİN BANLI VE SUSTURULAN LİSTESİ
    socket.on('adminGetSanctionsList', () => {
        if (!players[socket.id] || !players[socket.id].isAdmin) return;
        if (typeof getAdminSanctionsList === 'function') {
            socket.emit('adminSanctionsList', getAdminSanctionsList());
        }
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

module.exports = { registerEconomyHandlers, playerSwanTimers };
