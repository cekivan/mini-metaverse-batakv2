// src/fatherPetManager.js - "Denizden Babam Çıksa Yerim" Baba Yoldaş (Pet) ve Etkinlik Yöneticisi

const activeFatherPets = {};   // username -> petObject
const petMoneyTimers = {};     // username -> Timeout
const petExpireTimers = {};    // username -> Timeout
const petTalkIntervals = {};   // username -> Interval

let ioRef = null;
let playersRef = null;
let dataManagerRef = null;

const FATHER_SAYINGS_MALE = [
    "Aferin benim aslan oğluma! ❤️",
    "Gözüm üzerinde, akıllı ol evlat!",
    "Ceketini al sakın üşütme!",
    "Paranı çarçur etme, birikim yap!",
    "Ben senin yaşındayken dağları delerdik!",
    "Mekan güzelmiş ama çay evdeki gibi değil...",
    "Ayağını yorganına göre uzat evlat!",
    "Gururumsun oğlum benim! ❤️"
];

const FATHER_SAYINGS_FEMALE = [
    "Aferin benim güzel kızıma! ❤️",
    "Gözüm üzerinde, kimse seni üzemez!",
    "Ceketini al sakın üşütme!",
    "Paranı çarçur etme, birikim yap güzel kızım!",
    "Her zaman arkandayım prensesim!",
    "Mekan güzelmiş ama çay evdeki gibi değil...",
    "Ayağını yorganına göre uzat güzel kızım!",
    "Seninle iftihar ediyorum prensesim! ❤️"
];

function init(io, players, dataManager) {
    ioRef = io;
    playersRef = players;
    dataManagerRef = dataManager;
}

/**
 * Socket.IO ile istemcilere gönderilmeden önce Timer/Döngüsel referanslardan
 * arındırılmış saf JSON DTO nesnesi döndürür.
 */
function toPetDTO(pet) {
    if (!pet) return null;
    return {
        id: pet.id,
        ownerId: pet.ownerId,
        ownerName: pet.ownerName,
        name: pet.name,
        gender: pet.gender,
        room: pet.room,
        x: pet.x,
        y: pet.y,
        facing: pet.facing || 'down',
        speech: pet.speech || null,
        speechUntil: pet.speechUntil || 0,
        expiresAt: pet.expiresAt,
        durationMs: pet.durationMs,
        createdAt: pet.createdAt
    };
}

function getActivePets() {
    return activeFatherPets;
}

function getPetsInRoom(roomName) {
    const list = [];
    const now = Date.now();
    for (const u in activeFatherPets) {
        const pet = activeFatherPets[u];
        if (pet && pet.room === roomName && pet.expiresAt > now) {
            list.push(toPetDTO(pet));
        }
    }
    return list;
}

function getPetByOwnerId(ownerId) {
    for (const u in activeFatherPets) {
        if (activeFatherPets[u].ownerId === ownerId) {
            return activeFatherPets[u];
        }
    }
    return null;
}

function getPetByUsername(username) {
    return activeFatherPets[username] || null;
}

/**
 * Kullanıcı "Ye" ya da "Yeme" seçimini yaptığında çağrılır.
 */
function handleFatherChoice(socket, choice) {
    if (!playersRef || !playersRef[socket.id]) return;
    const player = playersRef[socket.id];
    const username = player.name;
    const uData = dataManagerRef.persistentData.users[username];

    if (choice === 'eat') {
        // 1. SEÇENEK: YE (+300 TL)
        const earned = 300;
        if (uData) {
            uData.money = (uData.money || 0) + earned;
            player.money = uData.money;
            dataManagerRef.savePersistentData();
            socket.emit('moneyUpdate', player.money);
        }

        // Oyuncuya sevimli animasyon başlangıcını gönder
        socket.emit('fatherEatAnimationStart', {
            reward: earned,
            money: player.money,
            gender: player.gender || 'male'
        });

    } else if (choice === 'spare') {
        // 2. SEÇENEK: YEME (SÜRPRİZ: SÜRESİ DOLANA KADAR GEZEN BABA PETİ)
        spawnFatherPet(socket.id);
    }
}

/**
 * Baba yoldaşını (pet) haritaya mucizevi şekilde indirir
 */
function spawnFatherPet(ownerId) {
    if (!playersRef || !playersRef[ownerId]) return null;
    const player = playersRef[ownerId];
    const username = player.name;
    const room = player.room || 'sahil';
    const playerGender = player.gender || 'male';

    // Eğer zaten bir baba peti varsa eskisi temizlensin
    if (activeFatherPets[username]) {
        despawnFatherPet(username, "Yenisi çağrıldı");
    }

    const petId = `father_pet_${ownerId}_${Date.now()}`;
    const petName = `${username}'in babası`;
    const spawnX = player.x + 35;
    const spawnY = player.y;
    const durationMs = 15 * 60 * 1000; // 15 dakika

    const pet = {
        id: petId,
        ownerId: ownerId,
        ownerName: username,
        name: petName,
        gender: playerGender,
        room: room,
        x: spawnX,
        y: spawnY,
        facing: 'down',
        createdAt: Date.now(),
        durationMs: durationMs,
        expiresAt: Date.now() + durationMs,
        pocketMoneyGiven: false,
        speech: null,
        speechUntil: 0
    };

    activeFatherPets[username] = pet;

    // Mekandakilere küçük sistem bildirimi
    if (ioRef) {
        ioRef.to(room).emit('systemMessage', "✨ Bir oyuncu babayı tuttu!");
        
        // Gökten inen mucizevi efekt bildirimi (Saf DTO)
        ioRef.to(room).emit('fatherMiracleSpawn', {
            pet: toPetDTO(pet)
        });
    }

    // 1. ZAMANLAYICI: 30 SANİYE SONRA HARÇLIK VE GURUR MESAJI
    petMoneyTimers[username] = setTimeout(() => {
        giveFatherPocketMoney(ownerId);
    }, 30000);

    // 2. PERİYODİK BABA SÖZLERİ (Her 2 dakikada bir tatlı bir baba tavsiyesi)
    petTalkIntervals[username] = setInterval(() => {
        triggerRandomFatherTalk(username);
    }, 120000);

    // 3. ZAMANLAYICI: 15 DAKİKA SONRA VEDA VE DESPAWN
    petExpireTimers[username] = setTimeout(() => {
        despawnFatherPet(username, "15 dakika doldu");
    }, durationMs);

    return pet;
}

/**
 * Periyodik tatlı baba sözleri
 */
function triggerRandomFatherTalk(username) {
    const pet = activeFatherPets[username];
    if (!pet || Date.now() >= pet.expiresAt) return;

    const sayings = (pet.gender === 'female') ? FATHER_SAYINGS_FEMALE : FATHER_SAYINGS_MALE;
    const chosen = sayings[Math.floor(Math.random() * sayings.length)];

    pet.speech = chosen;
    pet.speechUntil = Date.now() + 8000;

    if (ioRef && pet.room) {
        ioRef.to(pet.room).emit('fatherPetSpeak', {
            petId: pet.id,
            ownerId: pet.ownerId,
            speech: pet.speech
        });
    }
}

/**
 * 30 saniye sonra bir kereye mahsus 700 TL harçlık ve gurur mesajı
 */
function giveFatherPocketMoney(ownerId) {
    const pet = getPetByOwnerId(ownerId);
    if (!pet || pet.pocketMoneyGiven) return;
    pet.pocketMoneyGiven = true;

    const player = playersRef ? playersRef[ownerId] : null;
    if (!player) return;

    const username = player.name;
    const uData = dataManagerRef.persistentData.users[username];
    const childWord = (pet.gender === 'female' ? 'kızım' : 'oğlum');
    const speechText = `Seninle gurur duyuyorum ${childWord}`;
    const amount = 700;

    // 700 TL Harçlık Ver
    if (uData) {
        uData.money = (uData.money || 0) + amount;
        player.money = uData.money;
        dataManagerRef.savePersistentData();
        if (ioRef) ioRef.to(ownerId).emit('moneyUpdate', player.money);
    }

    pet.speech = speechText + " ❤️";
    pet.speechUntil = Date.now() + 8000;

    if (ioRef) {
        // Sadece sahibine ekranında 'Baban cebine 700 TL harçlık koydu' uyarısı ve harçlık eventi
        ioRef.to(ownerId).emit('fatherPocketMoneyReceived', {
            amount: amount,
            speech: speechText,
            message: "Baban cebine 700 TL harçlık koydu!"
        });

        // Mekandaki herkese babanın konuşma balonu
        ioRef.to(player.room).emit('fatherPetSpeak', {
            petId: pet.id,
            ownerId: ownerId,
            speech: pet.speech
        });
    }
}

/**
 * Baba yoldaşını haritadan kaldırır
 */
function despawnFatherPet(key, reason = "") {
    // key can be username or ownerId
    let pet = activeFatherPets[key];
    let username = key;
    if (!pet) {
        pet = getPetByOwnerId(key);
        if (pet) username = pet.ownerName;
    }
    if (!pet) return;

    if (petMoneyTimers[username]) {
        clearTimeout(petMoneyTimers[username]);
        delete petMoneyTimers[username];
    }
    if (petTalkIntervals[username]) {
        clearInterval(petTalkIntervals[username]);
        delete petTalkIntervals[username];
    }
    if (petExpireTimers[username]) {
        clearTimeout(petExpireTimers[username]);
        delete petExpireTimers[username];
    }

    if (ioRef && pet.room) {
        ioRef.to(pet.room).emit('fatherPetDespawned', {
            petId: pet.id,
            ownerId: pet.ownerId,
            reason: reason
        });
    }

    delete activeFatherPets[username];
}

/**
 * Oyuncu oda değiştirdiğinde babası da süresi dolana kadar onunla beraber her mekana gider!
 */
function handleRoomChange(ownerId, oldRoom, newRoom) {
    const pet = getPetByOwnerId(ownerId);
    if (!pet) return;

    // Eğer eski oda ile yeni oda farklıysa, eski odadakilere despawn gönder
    if (ioRef && oldRoom && oldRoom !== newRoom) {
        ioRef.to(oldRoom).emit('fatherPetDespawned', {
            petId: pet.id,
            ownerId: ownerId,
            reason: 'room_change'
        });
    }

    pet.room = newRoom;
    const player = playersRef ? playersRef[ownerId] : null;
    if (player) {
        pet.x = player.x + 35;
        pet.y = player.y;
    }

    // Yeni odaya babanın odaya gelişini bildir
    if (ioRef && newRoom) {
        ioRef.to(newRoom).emit('fatherPetSpawned', {
            pet: toPetDTO(pet)
        });
    }

    // Sahibin kendi soketine de garanti doğrudan gönder
    if (ioRef && ownerId) {
        ioRef.to(ownerId).emit('fatherPetSpawned', {
            pet: toPetDTO(pet)
        });
    }
}

/**
 * Sahip yürüdükçe sunucudaki pet koordinatını günceller
 */
function updateOwnerPosition(ownerId, x, y) {
    const pet = getPetByOwnerId(ownerId);
    if (!pet) return;
    pet.x = x + 30;
    pet.y = y;
}

/**
 * Oyuncu yeniden bağlandığında veya sayfa yenilediğinde süresi bitmemiş petini geri bağlar
 */
function handleLogin(socket, username) {
    if (!username) return;
    const pet = activeFatherPets[username];
    if (pet && pet.expiresAt > Date.now()) {
        pet.ownerId = socket.id;
        const player = playersRef ? playersRef[socket.id] : null;
        if (player) {
            pet.room = player.room || 'sokak';
            pet.x = player.x + 35;
            pet.y = player.y;
        }
        socket.emit('fatherPetSpawned', { pet: toPetDTO(pet) });
        if (ioRef && pet.room) {
            ioRef.to(pet.room).emit('fatherPetSpawned', { pet: toPetDTO(pet) });
        }
    }
}

/**
 * Oyuncu oyundan çıkarsa
 */
function handleDisconnect(ownerId) {
    const pet = getPetByOwnerId(ownerId);
    if (!pet) return;

    if (ioRef && pet.room) {
        ioRef.to(pet.room).emit('fatherPetDespawned', {
            petId: pet.id,
            ownerId: ownerId,
            reason: 'Oyuncu ayrıldı'
        });
    }
}

module.exports = {
    init,
    toPetDTO,
    getActivePets,
    getPetsInRoom,
    getPetByOwnerId,
    getPetByUsername,
    handleFatherChoice,
    spawnFatherPet,
    giveFatherPocketMoney,
    despawnFatherPet,
    handleRoomChange,
    updateOwnerPosition,
    handleLogin,
    handleDisconnect
};
