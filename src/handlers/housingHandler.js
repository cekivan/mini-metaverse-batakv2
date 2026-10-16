// src/handlers/housingHandler.js - Konut Satın Alma, Mobilya Alımı ve Dekorasyon Yöneticisi
const config = require('../config');
const dataManager = require('../dataManager');

function registerHousingHandlers(io, socket, players) {
    // 1. EV SATIN ALMA
    socket.on('buyHouse', (houseType) => {
        if (!players[socket.id]) return;
        let username = players[socket.id].name;
        let uKey = dataManager.findUserKey(username) || username;
        let uData = dataManager.persistentData.users[uKey];
        if (!uData) return;

        let price = config.HOUSE_PRICES[houseType];
        if (!price) {
            socket.emit('gameError', "Geçersiz ev tipi!");
            return;
        }

        if (!uData.houses) uData.houses = {};
        if (uData.house && uData.house.type && !uData.houses[uData.house.type]) {
            uData.houses[uData.house.type] = uData.house;
        }

        if (uData.houses[houseType]) {
            socket.emit('gameError', "Zaten bu tip bir eve sahipsiniz!");
            return;
        }
        if (uData.money < price) {
            socket.emit('gameError', `Bu ev ${price} TL! Bakiyeniz: ${uData.money} TL.`);
            return;
        }

        uData.money -= price;
        players[socket.id].money = uData.money;
        uData.houses[houseType] = {
            type: houseType,
            furniture: []
        };
        uData.house = uData.houses[houseType];
        dataManager.savePersistentData();

        let houseName = config.HOUSE_NAMES[houseType] || houseType;
        socket.emit('moneyUpdate', uData.money);
        socket.emit('housesUpdate', uData.houses);
        socket.emit('houseDataUpdate', {
            ...uData.houses[houseType],
            owner: uKey,
            type: houseType,
            houseId: `${uKey}_${houseType}`
        });
        socket.emit('systemMessage', `🏠 Tebrikler! ${houseName} tipi yeni evinizi satın aldınız!`);
    });

    // 2. MOBİLYA SATIN ALMA
    socket.on('buyFurniture', (itemId) => {
        if (!players[socket.id]) return;
        let username = players[socket.id].name;
        let uKey = dataManager.findUserKey(username) || username;
        let uData = dataManager.persistentData.users[uKey];
        if (!uData) return;

        let cost = config.FURNITURE_PRICES[itemId];
        if (!cost) {
            socket.emit('gameError', "Geçersiz mobilya!");
            return;
        }
        if (uData.money < cost) {
            socket.emit('gameError', `Bu mobilya ${cost} TL! Bakiyeniz: ${uData.money} TL.`);
            return;
        }

        uData.money -= cost;
        players[socket.id].money = uData.money;
        if (!uData.furnitureInventory) uData.furnitureInventory = [];
        uData.furnitureInventory.push(itemId);
        dataManager.savePersistentData();

        socket.emit('moneyUpdate', uData.money);
        socket.emit('furnitureInventoryUpdate', uData.furnitureInventory);
        socket.emit('furnitureBuySuccess', {
            itemId: itemId,
            cost: cost,
            remainingMoney: uData.money
        });
        socket.emit('systemMessage', `🛒 Mobilya satın alındı! Evinize gidip yerleştirebilirsiniz.`);
    });

    // 3. MOBİLYA YERLEŞTİRME
    socket.on('placeFurniture', (data) => {
        if (!players[socket.id] || !data || !data.itemId) return;
        let username = players[socket.id].name;
        let uKey = dataManager.findUserKey(username) || username;
        let uData = dataManager.persistentData.users[uKey];
        if (!uData) return;

        let parsed = dataManager.parseHouseRoom(players[socket.id].room);
        if (!parsed || parsed.owner.toLowerCase() !== uKey.toLowerCase()) {
            socket.emit('gameError', "Mobilyaları sadece kendi evinizde yerleştirebilirsiniz!");
            return;
        }

        if (!uData.houses) uData.houses = {};
        let hType = parsed.houseType || (uData.house ? uData.house.type : 'standart');
        if (!uData.houses[hType]) {
            uData.houses[hType] = (uData.house && uData.house.type === hType) ? uData.house : { type: hType, furniture: [] };
        }
        let targetHouse = uData.houses[hType];

        let idx = (uData.furnitureInventory || []).indexOf(data.itemId);
        if (idx === -1) {
            socket.emit('gameError', "Envanterinizde bu mobilya kalmadı!");
            return;
        }

        uData.furnitureInventory.splice(idx, 1);
        if (!targetHouse.furniture) targetHouse.furniture = [];
        targetHouse.furniture.push({
            id: data.itemId,
            x: Math.round(data.x || 400),
            y: Math.round(data.y || 300),
            rotation: data.rotation || 0
        });
        uData.house = targetHouse;
        dataManager.savePersistentData();

        socket.emit('furnitureInventoryUpdate', uData.furnitureInventory);
        io.to(players[socket.id].room).emit('houseFurnitureSync', targetHouse.furniture);
        socket.emit('systemMessage', `🛋️ Mobilya odaya yerleştirildi!`);
    });

    // 4. MOBİLYA TAŞIMA
    socket.on('moveFurniture', (data) => {
        if (!players[socket.id] || !data || data.index === undefined) return;
        let username = players[socket.id].name;
        let uKey = dataManager.findUserKey(username) || username;
        let uData = dataManager.persistentData.users[uKey];
        if (!uData) return;

        let parsed = dataManager.parseHouseRoom(players[socket.id].room);
        if (!parsed || parsed.owner.toLowerCase() !== uKey.toLowerCase()) return;

        if (!uData.houses) uData.houses = {};
        let hType = parsed.houseType || (uData.house ? uData.house.type : 'standart');
        let targetHouse = uData.houses[hType] || uData.house;
        if (!targetHouse || !targetHouse.furniture) return;

        let index = parseInt(data.index);
        if (index >= 0 && index < targetHouse.furniture.length) {
            targetHouse.furniture[index].x = Math.round(data.x);
            targetHouse.furniture[index].y = Math.round(data.y);
            if (data.rotation !== undefined) {
                targetHouse.furniture[index].rotation = parseInt(data.rotation);
            }
            uData.house = targetHouse;
            dataManager.savePersistentData();

            io.to(players[socket.id].room).emit('houseFurnitureSync', targetHouse.furniture);
        }
    });

    // 4.1 MOBİLYA DÖNDÜRME (90 DERECE ÇEVİRME)
    socket.on('rotateFurniture', (data) => {
        if (!players[socket.id] || !data || data.index === undefined) return;
        let username = players[socket.id].name;
        let uKey = dataManager.findUserKey(username) || username;
        let uData = dataManager.persistentData.users[uKey];
        if (!uData) return;

        let parsed = dataManager.parseHouseRoom(players[socket.id].room);
        if (!parsed || parsed.owner.toLowerCase() !== uKey.toLowerCase()) return;

        if (!uData.houses) uData.houses = {};
        let hType = parsed.houseType || (uData.house ? uData.house.type : 'standart');
        let targetHouse = uData.houses[hType] || uData.house;
        if (!targetHouse || !targetHouse.furniture) return;

        let index = parseInt(data.index);
        if (index >= 0 && index < targetHouse.furniture.length) {
            let curItem = targetHouse.furniture[index];
            let curRot = (typeof curItem.rotation === 'number') ? curItem.rotation : 0;
            let newRot = (data.rotation !== undefined) ? (parseInt(data.rotation) % 4) : ((curRot + 1) % 4);
            if (newRot < 0) newRot += 4;
            let facingList = ['front-right', 'front-left', 'back-left', 'back-right'];
            let newFacing = (data.facing !== undefined) ? data.facing : facingList[newRot];
            
            curItem.rotation = newRot;
            curItem.facing = newFacing;
            uData.house = targetHouse;
            dataManager.savePersistentData();

            io.to(players[socket.id].room).emit('houseFurnitureSync', targetHouse.furniture);
        }
    });

    // 5. MOBİLYA KALDIRMA
    socket.on('removeFurniture', (index) => {
        if (!players[socket.id]) return;
        let username = players[socket.id].name;
        let uKey = dataManager.findUserKey(username) || username;
        let uData = dataManager.persistentData.users[uKey];
        if (!uData) return;

        let parsed = dataManager.parseHouseRoom(players[socket.id].room);
        if (!parsed || parsed.owner.toLowerCase() !== uKey.toLowerCase()) return;

        if (!uData.houses) uData.houses = {};
        let hType = parsed.houseType || (uData.house ? uData.house.type : 'standart');
        let targetHouse = uData.houses[hType] || uData.house;
        if (!targetHouse || !targetHouse.furniture) return;

        let idx = parseInt(index);
        if (idx >= 0 && idx < targetHouse.furniture.length) {
            let removed = targetHouse.furniture.splice(idx, 1)[0];
            if (!uData.furnitureInventory) uData.furnitureInventory = [];
            uData.furnitureInventory.push(removed.id);
            uData.house = targetHouse;
            dataManager.savePersistentData();

            socket.emit('furnitureInventoryUpdate', uData.furnitureInventory);
            io.to(players[socket.id].room).emit('houseFurnitureSync', targetHouse.furniture);
            socket.emit('systemMessage', `📦 Mobilya kaldırılıp depoya geri alındı.`);
        }
    });

    // 6. EV VERİSİ SORGULAMA (KAPI KİLİDİ KONTROLLÜ)
    socket.on('getHouseData', (data) => {
        let rawTarget = typeof data === 'object' && data ? data.owner : data;
        rawTarget = (rawTarget || players[socket.id]?.name || "").trim();
        let targetUser = dataManager.findUserKey(rawTarget) || rawTarget;
        let tData = dataManager.persistentData.users[targetUser];
        let reqType = typeof data === 'object' && data ? data.type : null;

        let myName = players[socket.id]?.name || "";
        let isOwner = (myName.toLowerCase() === targetUser.toLowerCase());

        if (tData) {
            let targetHouse = null;
            if (tData.houses && reqType && tData.houses[reqType]) {
                targetHouse = tData.houses[reqType];
            } else if (tData.houses && Object.keys(tData.houses).length > 0) {
                reqType = reqType || Object.keys(tData.houses)[0];
                targetHouse = tData.houses[reqType] || Object.values(tData.houses)[0];
            } else if (tData.house) {
                targetHouse = tData.house;
                reqType = reqType || tData.house.type;
            }

            if (targetHouse) {
                let housePrivacy = targetHouse.privacy || 'public'; // Varsayılan: Herkese açık

                // Kapı Kilidi Kontrolü
                if (!isOwner) {
                    if (housePrivacy === 'locked') {
                        socket.emit('gameError', "🔒 Bu evin kapısı kilitli! Yalnızca ev sahibi girebilir.");
                        return;
                    }
                    if (housePrivacy === 'friends') {
                        let isFriend = (tData.friends || []).some(f => {
                            let fName = typeof f === 'string' ? f : (f ? f.username : '');
                            return fName.toLowerCase() === myName.toLowerCase();
                        });
                        if (!isFriend) {
                            socket.emit('gameError', "👥 Bu ev yalnızca arkadaşlara açık!");
                            return;
                        }
                    }
                }

                socket.emit('houseDataUpdate', {
                    ...targetHouse,
                    owner: targetUser,
                    type: reqType || targetHouse.type || 'standart',
                    privacy: housePrivacy,
                    houseId: `${targetUser}_${reqType || targetHouse.type}`
                });
                return;
            }
        }
        socket.emit('houseDataUpdate', null);
    });

    // 6.1 EV KAPI KİLİDİ AYARLAMA (HERKESE AÇIK / ARKADAŞLAR / KİLİTLİ)
    socket.on('setHousePrivacy', (data) => {
        if (!players[socket.id] || !data || !data.privacy) return;
        let username = players[socket.id].name;
        let uKey = dataManager.findUserKey(username) || username;
        let uData = dataManager.persistentData.users[uKey];
        if (!uData) return;

        let hType = data.type || (uData.house ? uData.house.type : 'standart');
        if (!uData.houses) uData.houses = {};
        let targetHouse = uData.houses[hType] || uData.house;
        if (!targetHouse) return;

        const allowed = ['public', 'friends', 'locked'];
        if (!allowed.includes(data.privacy)) return;

        targetHouse.privacy = data.privacy;
        uData.houses[hType] = targetHouse;
        uData.house = targetHouse;
        dataManager.savePersistentData();

        socket.emit('housePrivacyUpdated', { type: hType, privacy: data.privacy });
        let privLabel = data.privacy === 'public' ? '🌐 Herkese Açık (Mahalledeki herkes gelebilir)' : (data.privacy === 'locked' ? '🔒 Kilitli (Sadece Sen)' : '👥 Yalnızca Arkadaşlar');
        socket.emit('systemMessage', `🚪 Ev kapı kilidi güncellendi: ${privLabel}`);
        io.to(players[socket.id].room).emit('housePrivacySync', { privacy: data.privacy });
    });

    // 6.2 GRAMOFON MÜZİK ÇALARI (SADECE EV SAHİBİ ÇALABİLİR)
    let gramophonePlayingRooms = {};
    socket.on('toggleGramophone', () => {
        if (!players[socket.id]) return;
        let username = players[socket.id].name;
        let uKey = dataManager.findUserKey(username) || username;
        let curRoom = players[socket.id].room;
        let parsed = dataManager.parseHouseRoom(curRoom);
        if (!parsed) return;

        if (parsed.owner.toLowerCase() !== uKey.toLowerCase()) {
            socket.emit('gameError', "🎶 Gramofonu yalnızca ev sahibi açıp kapatabilir!");
            return;
        }

        let isPlaying = !gramophonePlayingRooms[curRoom];
        gramophonePlayingRooms[curRoom] = isPlaying;

        io.to(curRoom).emit('gramophoneStateUpdate', {
            isPlaying: isPlaying,
            owner: parsed.owner
        });

        socket.emit('systemMessage', isPlaying ? "🎶 Gramofon çalıştırıldı! Nostaljik melodiler çalıyor..." : "⏹️ Gramofon kapatıldı.");
    });

    // 6.1 LİMONATA STANDINDAN LİMONATA SATIN ALMA (15 TL)
    socket.on('buyLemonadeFromStand', (data) => {
        if (!players[socket.id] || !data) return;
        let buyerName = players[socket.id].name;
        let buyerKey = dataManager.findUserKey(buyerName) || buyerName;
        let buyerData = dataManager.persistentData.users[buyerKey];
        if (!buyerData) return;

        const LEMONADE_PRICE = 15;
        if ((buyerData.money || 0) < LEMONADE_PRICE) {
            socket.emit('gameError', "Limonata satın almak için yeterli paranız yok! (15 TL gerekli)");
            return;
        }

        let ownerName = data.owner;
        let ownerKey = dataManager.findUserKey(ownerName) || ownerName;
        let ownerData = dataManager.persistentData.users[ownerKey];

        // Alıcıdan 15 TL düş
        buyerData.money = Math.max(0, buyerData.money - LEMONADE_PRICE);
        players[socket.id].money = buyerData.money;
        socket.emit('moneyUpdate', buyerData.money);

        // Ev sahibine 15 TL ekle (kullanıcı kuralı: "limonata satın aldıkça ev sahibine gitsin o para ve bir limonata sattınız bildirimiyle belirtsin bunu.")
        if (ownerData) {
            ownerData.money = (ownerData.money || 0) + LEMONADE_PRICE;

            // Eğer ev sahibi o an oyundaysa canlı bildirim ve bakiye güncellemesi gönder
            for (let sid in players) {
                if (players[sid] && players[sid].name && players[sid].name.toLowerCase() === ownerName.toLowerCase()) {
                    players[sid].money = ownerData.money;
                    io.to(sid).emit('moneyUpdate', ownerData.money);
                    io.to(sid).emit('lemonadeSaleNotification', {
                        buyer: buyerName,
                        amount: LEMONADE_PRICE
                    });
                    io.to(sid).emit('systemMessage', `🍋 [${buyerName}] sizden 1 bardak taze limonata satın aldı! Hesabınıza +15 TL eklendi.`);
                    break;
                }
            }
        }
        dataManager.savePersistentData();

        // Alıcıya başarı mesajı
        socket.emit('lemonadePurchasedSuccess', { amount: LEMONADE_PRICE });
        socket.emit('systemMessage', `🍋 Buz gibi taze limonatayı afiyetle içtiniz! (-15 TL ev sahibine ödendi)`);
    });

    // 7. KULLANILABİLİR EVLERİ LİSTELEME (HERKESE AÇIK EVLER DAHİL)
    socket.on('getAvailableHouses', () => {
        if (!players[socket.id]) return;
        let username = players[socket.id].name;
        let uKey = dataManager.findUserKey(username) || username;
        let uData = dataManager.persistentData.users[uKey];
        if (!uData) return;

        let availableList = [];
        let addedKeys = new Set();

        // 1. Kendi Evlerim
        let myHouses = uData.houses || (uData.house ? { [uData.house.type]: uData.house } : {});
        for (let hType in myHouses) {
            let hObj = myHouses[hType];
            let k = `${uKey}_${hType}`;
            addedKeys.add(k);
            availableList.push({
                owner: uKey,
                houseId: k,
                type: hType,
                isSelf: true,
                privacy: hObj.privacy || 'public',
                furnitureCount: (hObj.furniture || []).length
            });
        }

        // 2. Arkadaşlarımın Evleri
        let friends = uData.friends || [];
        friends.forEach(fName => {
            let clean = typeof fName === 'string' ? fName : (fName ? fName.username : '');
            if (!clean) return;
            let fKey = dataManager.findUserKey(clean) || clean;
            let fData = dataManager.persistentData.users[fKey];
            if (fData) {
                let fHouses = fData.houses || (fData.house ? { [fData.house.type]: fData.house } : {});
                for (let hType in fHouses) {
                    let hObj = fHouses[hType];
                    let k = `${fKey}_${hType}`;
                    if (!addedKeys.has(k)) {
                        addedKeys.add(k);
                        availableList.push({
                            owner: fKey,
                            houseId: k,
                            type: hType,
                            isSelf: false,
                            privacy: hObj.privacy || 'public',
                            furnitureCount: (hObj.furniture || []).length
                        });
                    }
                }
            }
        });

        // 3. Mahalledeki Herkese Açık Evler (Public Houses)
        for (let otherUser in dataManager.persistentData.users) {
            if (otherUser.toLowerCase() === uKey.toLowerCase()) continue;
            let oData = dataManager.persistentData.users[otherUser];
            let oHouses = oData.houses || (oData.house ? { [oData.house.type]: oData.house } : {});
            for (let hType in oHouses) {
                let hObj = oHouses[hType];
                let k = `${otherUser}_${hType}`;
                if (!addedKeys.has(k) && hObj.privacy === 'public') {
                    addedKeys.add(k);
                    availableList.push({
                        owner: otherUser,
                        houseId: k,
                        type: hType,
                        isSelf: false,
                        isPublicCommunity: true,
                        privacy: 'public',
                        furnitureCount: (hObj.furniture || []).length
                    });
                }
            }
        }

        socket.emit('availableHousesList', {
            houses: availableList,
            hasSelfHouse: Object.keys(myHouses).length > 0,
            friendCount: friends.length
        });
    });
}

module.exports = { registerHousingHandlers };
