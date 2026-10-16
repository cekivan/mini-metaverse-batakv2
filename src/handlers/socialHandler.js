// src/handlers/socialHandler.js - Sohbet, Arkadaşlık, Çay ve Para/Eşya Transfer Yöneticisi
const dataManager = require('../dataManager');

function registerSocialHandlers(io, socket, players, helpers) {
    const { givePlayerTeaWithTimer } = helpers;

    // 1. SOHBET MESAJI (50 KARAKTER LİMİTİ & SPAM KORUMASI: 1 SN'DE 3 MESAJ -> 3 SN BEKLEME)
    socket.chatTimestamps = [];
    socket.chatCooldownUntil = 0;

    socket.on('chatMessage', (msg) => {
        if (!players[socket.id] || !msg) return;

        let senderName = players[socket.id].name;
        let uData = dataManager.persistentData.users[senderName];
        if (uData && uData.muteExpiresAt) {
            if (Date.now() < uData.muteExpiresAt) {
                let remainingSec = Math.ceil((uData.muteExpiresAt - Date.now()) / 1000);
                let remMin = Math.floor(remainingSec / 60);
                let remSec = remainingSec % 60;
                let timeStr = remMin > 0 ? `${remMin} dakika ${remSec} saniye` : `${remSec} saniye`;
                socket.emit('chatSpamWarning', {
                    message: `🔇 Susturuldunuz! Sebep: ${uData.muteReason || 'Yönetici'}. Kalan süre: ${timeStr}`,
                    cooldownRemaining: Math.min(remMin * 60 + remSec, 5)
                });
                return;
            } else {
                uData.muteExpiresAt = null;
                uData.muteReason = null;
                uData.mutedBy = null;
                dataManager.savePersistentData();
                players[socket.id].isMuted = false;
            }
        }

        const now = Date.now();
        if (socket.chatCooldownUntil && now < socket.chatCooldownUntil) {
            let remain = Math.ceil((socket.chatCooldownUntil - now) / 1000);
            socket.emit('chatSpamWarning', { waitSeconds: remain });
            return;
        }

        socket.chatTimestamps = (socket.chatTimestamps || []).filter(t => now - t < 1000);
        if (socket.chatTimestamps.length >= 3) {
            socket.chatCooldownUntil = now + 3000;
            socket.emit('chatSpamWarning', { waitSeconds: 3 });
            socket.emit('systemMessage', "⚠️ Çok hızlı mesaj gönderiyorsunuz! Lütfen 3 saniye bekleyin.");
            return;
        }
        socket.chatTimestamps.push(now);

        let cleanMsg = dataManager.sanitizeString(msg, 50); // Maksimum 50 karakter

        // Geliştirici / Test Kısayolu: /testbaba
        if (cleanMsg === '/testbaba' || cleanMsg === '/baba') {
            socket.emit('fatherCaughtPrompt', {
                title: "Denizden Baban Çıktı!",
                proverb: "Denizden babam çıksa yerim...",
                description: "Oltana takılan şey bir balık değil... Baban! Ne yapmak istersin?",
                eatReward: 300,
                playerGender: players[socket.id].gender || 'male'
            });
            return;
        }

        players[socket.id].msg = cleanMsg;
        io.to(players[socket.id].room).emit('chatUpdate', { id: socket.id, msg: cleanMsg });

        setTimeout(() => {
            if (players[socket.id] && players[socket.id].msg === cleanMsg) {
                players[socket.id].msg = "";
            }
        }, 5000);
    });

    // 1.1 HIZLI EMOJİ BALONCUĞU TEPKİSİ
    socket.on('playerEmoji', (emoji) => {
        if (!players[socket.id] || !emoji) return;
        const validEmojis = ['😂', '😡', '❤️', '👋', '🎉', '😎', '☕', '🔥'];
        if (!validEmojis.includes(emoji)) return;
        io.to(players[socket.id].room).emit('playerEmojiUpdate', {
            id: socket.id,
            emoji: emoji
        });
    });

    // 2. SOSYAL EYLEMLER (EL SALLAMA, DANS, ALKIŞ, ÇAY İÇME, OTURMA)
    socket.on('playerAction', (actionData) => {
        if (!players[socket.id]) return;

        if (!actionData || !actionData.action || actionData.action === 'stand') {
            players[socket.id].action = null;
            io.to(players[socket.id].room).emit('playerActionUpdate', {
                id: socket.id,
                action: null,
                hasTea: players[socket.id].hasTea
            });
            return;
        }

        players[socket.id].action = actionData.action;
        if (actionData.action === 'tea') {
            let username = players[socket.id].name;
            let userData = dataManager.persistentData.users[username];
            if (userData) {
                if (userData.money < 10) {
                    socket.emit('gameError', "Çay 10 TL! Yetersiz bakiye.");
                    return;
                }
                userData.money -= 10;
                dataManager.savePersistentData();
                socket.emit('moneyUpdate', userData.money);
            }
            givePlayerTeaWithTimer(socket.id, username, 300000);
            socket.emit('systemMessage', "☕ Çay Ocağı'ndan taze tavşan kanı çay aldın (-10 TL). Afiyet olsun! (5 dakika elinde)");
            return;
        }

        io.to(players[socket.id].room).emit('playerActionUpdate', {
            id: socket.id,
            action: actionData.action,
            hasTea: players[socket.id].hasTea
        });

        // 'tea' ve 'sitting' dışındaki eylemler (dans, el sallama, alkış) 3.5 sn sonra normale döner
        if (actionData.action !== 'tea' && actionData.action !== 'sitting') {
            setTimeout(() => {
                if (players[socket.id] && players[socket.id].action === actionData.action) {
                    players[socket.id].action = null;
                    io.to(players[socket.id].room).emit('playerActionUpdate', { id: socket.id, action: null, hasTea: players[socket.id].hasTea });
                }
            }, 3500);
        }
    });

    // 3. ÇAY ISMARLAMA
    socket.on('buyTeaForPlayer', (data) => {
        if (!players[socket.id] || !data || !data.targetId) return;
        let sender = players[socket.id];
        let target = players[data.targetId];
        if (!target) return;

        let senderData = dataManager.persistentData.users[sender.name];
        if (!senderData || senderData.money < 10) {
            socket.emit('gameError', "Çay ısmarlamak için en az 10 TL gerekiyor! Bakiyeniz yetersiz.");
            return;
        }

        senderData.money -= 10;
        sender.money = senderData.money;
        dataManager.savePersistentData();

        socket.emit('moneyUpdate', senderData.money);
        givePlayerTeaWithTimer(data.targetId, target.name, 300000);

        io.to(data.targetId).emit('teaGiftReceived', { from: sender.name });
        io.to(data.targetId).emit('systemMessage', `☕ ${sender.name} sana sıcacık tavşan kanı bir çay ısmarladı! (5 dakika elinde).`);
        socket.emit('systemMessage', `☕ ${target.name} oyuncusuna çay ısmarladın (-10 TL).`);
    });

    // 4. PARA TRANSFERİ
    socket.on('sendMoney', (data) => {
        if (!players[socket.id] || !data || !data.targetUsername) return;
        let sender = players[socket.id];
        let senderData = dataManager.persistentData.users[sender.name];
        let targetUser = dataManager.sanitizeString(data.targetUsername, 30);
        let amount = dataManager.sanitizeAmount(data.amount, 1, 100000000);

        if (amount === null) {
            socket.emit('gameError', "Geçerli bir para miktarı giriniz!");
            return;
        }
        if (sender.name.toLowerCase() === targetUser.toLowerCase()) {
            socket.emit('gameError', "Kendinize para gönderemezsiniz!");
            return;
        }
        if (!senderData || senderData.money < amount) {
            socket.emit('gameError', `Yetersiz bakiye! Bakiyeniz: ${senderData?.money || 0} TL.`);
            return;
        }

        let targetKey = dataManager.findUserKey(targetUser);
        if (!targetKey || !dataManager.persistentData.users[targetKey]) {
            socket.emit('gameError', "Böyle bir oyuncu bulunamadı!");
            return;
        }

        senderData.money -= amount;
        sender.money = senderData.money;
        dataManager.persistentData.users[targetKey].money = (dataManager.persistentData.users[targetKey].money || 0) + amount;
        dataManager.savePersistentData();

        socket.emit('moneyUpdate', senderData.money);
        socket.emit('systemMessage', `💸 ${targetKey} kullanıcısına ${amount} TL gönderdin.`);

        for (let sid in players) {
            if (players[sid].name.toLowerCase() === targetKey.toLowerCase()) {
                players[sid].money = dataManager.persistentData.users[targetKey].money;
                io.to(sid).emit('moneyUpdate', players[sid].money);
                io.to(sid).emit('moneyGiftReceived', { from: sender.name, amount: amount });
                io.to(sid).emit('systemMessage', `💸 ${sender.name} sana ${amount} TL gönderdi! (Yeni Bakiyen: ${players[sid].money} TL)`);
            }
        }
    });

    // 5. EŞYA KUŞANMA (EQUIP PROP)
    socket.on('equipPropItem', (data) => {
        if (!players[socket.id] || !data || !data.itemKey) return;
        let username = players[socket.id].name;
        let userData = dataManager.persistentData.users[username];
        if (!userData) return;
        let itemKey = data.itemKey;
        let propId = itemKey.replace('props_', '');

        if (itemKey === 'props_none') {
            userData.avatar.heldItem = 'none';
            players[socket.id].heldItem = 'none';
            socket.emit('systemMessage', "✋ Elindeki eşyayı bıraktın.");
        } else {
            if (!userData.propInventory || !userData.propInventory[itemKey] || userData.propInventory[itemKey] <= 0) {
                socket.emit('gameError', "Bu eşyaya çantanızda sahip değilsiniz!");
                return;
            }
            if (propId === 'cay') {
                givePlayerTeaWithTimer(socket.id, username, 300000);
                socket.emit('systemMessage', "☕ Çayını eline aldın! (5 dakika süreli)");
                return;
            }
            if (userData.avatar.heldItem === propId) {
                userData.avatar.heldItem = 'none';
                players[socket.id].heldItem = 'none';
                socket.emit('systemMessage', `✋ ${propId} eşyasını çantana kaldırdın.`);
            } else {
                userData.avatar.heldItem = propId;
                players[socket.id].heldItem = propId;
                socket.emit('systemMessage', `🖐️ ${propId} eşyasını eline aldın.`);
            }
        }
        dataManager.savePersistentData();
        socket.emit('wardrobeUpdate', { avatar: userData.avatar, inventory: userData.inventory });
        socket.emit('propInventoryUpdate', userData.propInventory);
        io.to(players[socket.id].room).emit('playerAvatarChange', {
            id: socket.id,
            avatar: userData.avatar,
            heldItem: players[socket.id].heldItem
        });
    });

    // 6. EŞYA HEDİYE ETME (GIFT PROP)
    socket.on('giftPropItem', (data) => {
        if (!players[socket.id] || !data || !data.targetUsername || !data.itemKey) return;
        let sender = players[socket.id];
        let senderData = dataManager.persistentData.users[sender.name];
        let targetUser = dataManager.sanitizeString(data.targetUsername, 30);
        let itemKey = data.itemKey;
        let propId = itemKey.replace('props_', '');

        if (!itemKey.startsWith('props_') || itemKey === 'props_none') {
            socket.emit('gameError', "Sadece elde taşınabilen aksesuarlar hediye edilebilir!");
            return;
        }
        if (!senderData.propInventory || !senderData.propInventory[itemKey] || senderData.propInventory[itemKey] <= 0) {
            socket.emit('gameError', "Bu eşyaya çantanızda sahip değilsiniz!");
            return;
        }
        let targetKey = dataManager.findUserKey(targetUser);
        if (!targetKey || !dataManager.persistentData.users[targetKey]) {
            socket.emit('gameError', "Kullanıcı bulunamadı!");
            return;
        }

        senderData.propInventory[itemKey] -= 1;
        let remaining = senderData.propInventory[itemKey];
        if (remaining <= 0) {
            delete senderData.propInventory[itemKey];
            senderData.inventory = senderData.inventory.filter(k => k !== itemKey);
            if (senderData.avatar.heldItem === propId) {
                senderData.avatar.heldItem = 'none';
                sender.heldItem = 'none';
            }
        }

        let targetData = dataManager.persistentData.users[targetKey];
        if (!targetData.propInventory) targetData.propInventory = {};
        targetData.propInventory[itemKey] = (targetData.propInventory[itemKey] || 0) + 1;
        if (!targetData.inventory) targetData.inventory = [];
        if (!targetData.inventory.includes(itemKey)) targetData.inventory.push(itemKey);

        dataManager.savePersistentData();

        socket.emit('propInventoryUpdate', senderData.propInventory);
        socket.emit('wardrobeUpdate', { avatar: senderData.avatar, inventory: senderData.inventory });
        io.to(sender.room).emit('playerAvatarChange', { id: socket.id, avatar: senderData.avatar, heldItem: sender.heldItem });
        socket.emit('systemMessage', `🎁 ${targetKey} oyuncusuna 1 adet ${propId} hediye ettiniz!`);

        for (let sid in players) {
            if (players[sid].name.toLowerCase() === targetKey.toLowerCase()) {
                io.to(sid).emit('propInventoryUpdate', targetData.propInventory);
                io.to(sid).emit('wardrobeUpdate', { avatar: targetData.avatar, inventory: targetData.inventory });
                io.to(sid).emit('propGiftReceived', { from: sender.name, itemKey: itemKey });
                io.to(sid).emit('systemMessage', `🎁 ${sender.name} sana 1 adet ${propId} hediye etti!`);
            }
        }
    });

    // 7. ARKADAŞLIK İSTEĞİ GÖNDERME
    socket.on('sendFriendRequest', (data) => {
        if (!players[socket.id] || !data || !data.targetUsername) return;
        let sender = players[socket.id];
        let senderKey = dataManager.findUserKey(sender.name) || sender.name;
        let senderData = dataManager.persistentData.users[senderKey];
        let targetUser = (data.targetUsername || "").trim();

        if (senderKey.toLowerCase() === targetUser.toLowerCase()) {
            socket.emit('gameError', "Kendinizi arkadaş olarak ekleyemezsiniz!");
            return;
        }

        let targetKey = dataManager.findUserKey(targetUser);
        if (!targetKey) {
            socket.emit('gameError', "Böyle bir kullanıcı bulunamadı!");
            return;
        }
        let targetData = dataManager.persistentData.users[targetKey];

        if (!senderData.friends) senderData.friends = [];
        if (senderData.friends.some(f => f.toLowerCase() === targetKey.toLowerCase())) {
            socket.emit('gameError', `${targetKey} zaten arkadaş listenizde!`);
            return;
        }

        if (!targetData.friendRequests) targetData.friendRequests = [];
        if (targetData.friendRequests.some(r => r.toLowerCase() === senderKey.toLowerCase())) {
            socket.emit('gameError', `${targetKey} kullanıcısına zaten bekleyen bir arkadaşlık isteğiniz var!`);
            return;
        }

        if (senderData.friendRequests && senderData.friendRequests.some(r => r.toLowerCase() === targetKey.toLowerCase())) {
            senderData.friendRequests = senderData.friendRequests.filter(r => r.toLowerCase() !== targetKey.toLowerCase());
            targetData.friendRequests = targetData.friendRequests.filter(r => r.toLowerCase() !== senderKey.toLowerCase());

            if (!senderData.friends) senderData.friends = [];
            if (!targetData.friends) targetData.friends = [];
            if (!senderData.friends.some(f => f.toLowerCase() === targetKey.toLowerCase())) senderData.friends.push(targetKey);
            if (!targetData.friends.some(f => f.toLowerCase() === senderKey.toLowerCase())) targetData.friends.push(senderKey);

            dataManager.savePersistentData();

            socket.emit('systemMessage', `👥 ${targetKey} ile karşılıklı istek gönderdiğiniz için otomatik arkadaş oldunuz!`);
            socket.emit('friendListUpdate', dataManager.getFriendListData(senderKey, players));
            socket.emit('friendRequestsUpdate', senderData.friendRequests || []);

            for (let sid in players) {
                if (players[sid].name.toLowerCase() === targetKey.toLowerCase()) {
                    io.to(sid).emit('systemMessage', `👥 ${senderKey} arkadaşlık teklifinizi onayladı! Artık arkadaşsınız.`);
                    io.to(sid).emit('friendListUpdate', dataManager.getFriendListData(targetKey, players));
                    io.to(sid).emit('friendRequestsUpdate', targetData.friendRequests || []);
                }
            }
            return;
        }

        targetData.friendRequests.push(senderKey);
        dataManager.savePersistentData();

        socket.emit('systemMessage', `👥 ${targetKey} oyuncusuna arkadaşlık isteği gönderildi.`);

        for (let sid in players) {
            if (players[sid].name.toLowerCase() === targetKey.toLowerCase()) {
                io.to(sid).emit('friendRequestsUpdate', targetData.friendRequests);
                io.to(sid).emit('friendRequestReceived', { fromUsername: senderKey });
                io.to(sid).emit('systemMessage', `👥 ${senderKey} sana arkadaşlık isteği gönderdi!`);
            }
        }
    });

    // 8. ARKADAŞLIK İSTEĞİNE YANIT VERME
    socket.on('respondFriendRequest', (data) => {
        if (!players[socket.id] || !data || !data.fromUsername) return;
        let responder = players[socket.id];
        let responderKey = dataManager.findUserKey(responder.name) || responder.name;
        let responderData = dataManager.persistentData.users[responderKey];
        let fromUser = (data.fromUsername || "").trim();

        let fromKey = dataManager.findUserKey(fromUser);
        if (!fromKey) return;
        let fromData = dataManager.persistentData.users[fromKey];

        if (responderData.friendRequests) {
            responderData.friendRequests = responderData.friendRequests.filter(u => u.toLowerCase() !== fromKey.toLowerCase());
        }
        if (fromData.friendRequests) {
            fromData.friendRequests = fromData.friendRequests.filter(u => u.toLowerCase() !== responderKey.toLowerCase());
        }

        if (data.accept) {
            if (!responderData.friends) responderData.friends = [];
            if (!fromData.friends) fromData.friends = [];

            if (!responderData.friends.some(f => f.toLowerCase() === fromKey.toLowerCase())) responderData.friends.push(fromKey);
            if (!fromData.friends.some(f => f.toLowerCase() === responderKey.toLowerCase())) fromData.friends.push(responderKey);

            dataManager.savePersistentData();

            socket.emit('systemMessage', `👥 ${fromKey} ile artık arkadaşsınız!`);
            socket.emit('friendListUpdate', dataManager.getFriendListData(responderKey, players));
            socket.emit('friendRequestsUpdate', responderData.friendRequests || []);

            for (let sid in players) {
                if (players[sid].name.toLowerCase() === fromKey.toLowerCase()) {
                    io.to(sid).emit('systemMessage', `👥 ${responderKey} arkadaşlık isteğini kabul etti! Artık arkadaşsınız.`);
                    io.to(sid).emit('friendListUpdate', dataManager.getFriendListData(fromKey, players));
                    io.to(sid).emit('friendRequestsUpdate', fromData.friendRequests || []);
                }
            }
        } else {
            dataManager.savePersistentData();
            socket.emit('friendRequestsUpdate', responderData.friendRequests || []);
            socket.emit('systemMessage', `ℹ️ ${fromKey} kullanıcısının arkadaşlık isteğini sildiniz.`);
        }
    });

    // 9. ARKADAŞ SİLME
    socket.on('removeFriend', (data) => {
        if (!players[socket.id] || !data || !data.username) return;
        let username = players[socket.id].name;
        let userKey = dataManager.findUserKey(username) || username;
        let targetKey = dataManager.findUserKey((data.username || "").trim());
        if (!targetKey) return;

        let uData = dataManager.persistentData.users[userKey];
        let tData = dataManager.persistentData.users[targetKey];

        if (uData && uData.friends) {
            uData.friends = uData.friends.filter(f => f.toLowerCase() !== targetKey.toLowerCase());
        }
        if (tData && tData.friends) {
            tData.friends = tData.friends.filter(f => f.toLowerCase() !== userKey.toLowerCase());
        }
        dataManager.savePersistentData();

        socket.emit('friendListUpdate', dataManager.getFriendListData(userKey, players));
        socket.emit('systemMessage', `👥 ${targetKey} arkadaş listenizden çıkarıldı.`);

        for (let sid in players) {
            if (players[sid].name.toLowerCase() === targetKey.toLowerCase()) {
                io.to(sid).emit('friendListUpdate', dataManager.getFriendListData(targetKey, players));
                io.to(sid).emit('systemMessage', `ℹ️ ${userKey} seni arkadaş listesinden çıkardı.`);
            }
        }
    });

    // 10. ARKADAŞ LİSTESİ SORGULAMA
    socket.on('getFriendsList', () => {
        if (!players[socket.id]) return;
        let username = players[socket.id].name;
        let uKey = dataManager.findUserKey(username) || username;
        let uData = dataManager.persistentData.users[uKey];
        socket.emit('friendListUpdate', dataManager.getFriendListData(uKey, players));
        socket.emit('friendRequestsUpdate', uData?.friendRequests || []);
    });
}

module.exports = { registerSocialHandlers };
