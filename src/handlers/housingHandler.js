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
            y: Math.round(data.y || 300)
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

    // 6. EV VERİSİ SORGULAMA
    socket.on('getHouseData', (data) => {
        let rawTarget = typeof data === 'object' && data ? data.owner : data;
        rawTarget = (rawTarget || players[socket.id]?.name || "").trim();
        let targetUser = dataManager.findUserKey(rawTarget) || rawTarget;
        let tData = dataManager.persistentData.users[targetUser];
        let reqType = typeof data === 'object' && data ? data.type : null;

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
                socket.emit('houseDataUpdate', {
                    ...targetHouse,
                    owner: targetUser,
                    type: reqType || targetHouse.type || 'standart',
                    houseId: `${targetUser}_${reqType || targetHouse.type}`
                });
                return;
            }
        }
        socket.emit('houseDataUpdate', null);
    });

    // 7. KULLANILABİLİR EVLERİ LİSTELEME
    socket.on('getAvailableHouses', () => {
        if (!players[socket.id]) return;
        let username = players[socket.id].name;
        let uKey = dataManager.findUserKey(username) || username;
        let uData = dataManager.persistentData.users[uKey];
        if (!uData) return;

        let availableList = [];
        let myHouses = uData.houses || (uData.house ? { [uData.house.type]: uData.house } : {});
        for (let hType in myHouses) {
            let hObj = myHouses[hType];
            availableList.push({
                owner: uKey,
                houseId: `${uKey}_${hType}`,
                type: hType,
                isSelf: true,
                furnitureCount: (hObj.furniture || []).length
            });
        }

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
                    availableList.push({
                        owner: fKey,
                        houseId: `${fKey}_${hType}`,
                        type: hType,
                        isSelf: false,
                        furnitureCount: (hObj.furniture || []).length
                    });
                }
            }
        });

        socket.emit('availableHousesList', {
            houses: availableList,
            hasSelfHouse: Object.keys(myHouses).length > 0,
            friendCount: friends.length
        });
    });
}

module.exports = { registerHousingHandlers };
