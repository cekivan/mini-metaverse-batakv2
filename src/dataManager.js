// src/dataManager.js - Güvenli Kalıcı Veri, Atomik Kayıt ve Kimlik Doğrulama Katmanı
const fs = require('fs');
const crypto = require('crypto');
const config = require('./config');

const DATA_FILE = config.DATA_FILE;
const BACKUP_FILE = config.BACKUP_FILE;
const TEMP_FILE = config.TEMP_FILE;

// Bellek İçi Veri Durumu
let persistentData = {
    users: {},
    leaderboard: {
        billiard: {},
        batak: {},
        tavla: {},
        okey101: {}
    }
};

let saveTimer = null;
let isSaving = false;

// --- 1. KRİPTOGRAFİK ŞİFRELEME (SCRYPT İLE GÜVENLİ HASH) ---
function hashPassword(password, salt) {
    if (!salt) {
        salt = crypto.randomBytes(16).toString('hex');
    }
    const hash = crypto.scryptSync(password, salt, 32).toString('hex');
    return { hash, salt };
}

function verifyPassword(password, storedHash, salt) {
    if (!storedHash || !salt || typeof password !== 'string') return false;
    try {
        const hash = crypto.scryptSync(password, salt, 32).toString('hex');
        const bufA = Buffer.from(hash, 'hex');
        const bufB = Buffer.from(storedHash, 'hex');
        if (bufA.length !== bufB.length) return false;
        return crypto.timingSafeEqual(bufA, bufB);
    } catch (e) {
        return false;
    }
}

// --- 2. ASENKRON, ATOMİK VE DEBOUNCED GÜVENLİ DOSYA YAZIMI ---
function flushNow() {
    if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
    }
    savePersistentDataSync();
}

function scheduleSave(delay = 120) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        saveTimer = null;
        savePersistentDataAtomic();
    }, delay);
}

function savePersistentDataSync() {
    try {
        const dataStr = JSON.stringify(persistentData, null, 2);
        fs.writeFileSync(TEMP_FILE, dataStr, 'utf-8');
        try {
            fs.renameSync(TEMP_FILE, DATA_FILE);
        } catch (renameErr) {
            fs.copyFileSync(TEMP_FILE, DATA_FILE);
            try { fs.unlinkSync(TEMP_FILE); } catch (_) {}
        }
    } catch (err) {
        console.error("Kayıt hatası (sync):", err.message);
        try {
            fs.writeFileSync(DATA_FILE, JSON.stringify(persistentData, null, 2), 'utf-8');
        } catch (e2) {
            console.error("Kritik: Doğrudan yazım da başarısız (sync):", e2.message);
        }
    }
}

async function savePersistentDataAtomic() {
    if (isSaving) {
        // Zaten yazıyorsa bir sonraki döngüde tekrar dene
        scheduleSave(60);
        return;
    }
    isSaving = true;

    try {
        const dataStr = JSON.stringify(persistentData, null, 2);
        // Node.js Event Loop'unu bloklamayan asenkron disk yazımı
        await fs.promises.writeFile(TEMP_FILE, dataStr, 'utf-8');
        // Windows NTFS dosya kilitleme ve üzerine yazma uyumluluğu
        try {
            await fs.promises.rename(TEMP_FILE, DATA_FILE);
        } catch (renameErr) {
            await fs.promises.copyFile(TEMP_FILE, DATA_FILE);
            try { await fs.promises.unlink(TEMP_FILE); } catch (_) {}
        }
    } catch (err) {
        console.error("Kayıt hatası (async):", err.message);
        try {
            // Doğrudan yazmayı dene
            await fs.promises.writeFile(DATA_FILE, JSON.stringify(persistentData, null, 2), 'utf-8');
        } catch (e2) {
            console.error("Kritik: Doğrudan yazım da başarısız (async):", e2.message);
        }
    } finally {
        isSaving = false;
    }
}

// Geriye dönük uyumluluk için alias
function savePersistentData() {
    scheduleSave();
}

// --- 3. VERİ YÜKLEME VE YEDEKLEME ---
function loadPersistentData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            // Başlangıçta güvenli yedek al
            try {
                fs.copyFileSync(DATA_FILE, BACKUP_FILE);
            } catch (copyErr) {
                console.warn("Yedek kopyalama uyarısı:", copyErr.message);
            }

            const content = fs.readFileSync(DATA_FILE, 'utf-8');
            const parsed = JSON.parse(content);
            persistentData.users = parsed.users || {};
            persistentData.leaderboard = parsed.leaderboard || { billiard: {}, batak: {}, tavla: {}, okey101: {} };
            if (!persistentData.leaderboard.okey101) persistentData.leaderboard.okey101 = {};
            console.log(`Kalıcı veriler başarıyla yüklendi (${Object.keys(persistentData.users).length} kullanıcı).`);
        } else {
            console.log("data.json bulunamadı, yeni veri şablonu oluşturuluyor.");
            savePersistentDataAtomic();
        }
    } catch (e) {
        console.error("data.json okunamadı, yedek dosyaya bakılıyor:", e.message);
        if (fs.existsSync(BACKUP_FILE)) {
            try {
                const bkpContent = fs.readFileSync(BACKUP_FILE, 'utf-8');
                const parsed = JSON.parse(bkpContent);
                persistentData.users = parsed.users || {};
                persistentData.leaderboard = parsed.leaderboard || { billiard: {}, batak: {}, tavla: {}, okey101: {} };
                console.log("Veriler data.json.bak yedeğinden başarıyla kurtarıldı.");
            } catch (e2) {
                console.error("Kritik: Yedek dosya da okunamadı!", e2.message);
            }
        }
    }
}

// Sunucu başlangıcında veriyi belleğe al
loadPersistentData();

// --- 3.1 ADMİN KULLANICILARI VE YETKİ KONTROLÜ ---
const ADMIN_USERS = ['yasin', 'maltoroz'];

function isUserAdmin(name) {
    if (!name || typeof name !== 'string') return false;
    return ADMIN_USERS.includes(name.toLowerCase().trim());
}

// --- 4. KULLANICI ARAMA & EV / ODA AYRIŞTIRICILARI ---
function findUserKey(name) {
    if (!name || typeof name !== 'string') return null;
    let lower = name.toLowerCase().trim();
    return Object.keys(persistentData.users).find(k => k.toLowerCase() === lower) || null;
}

function parseHouseRoom(roomName) {
    if (!roomName || !roomName.toLowerCase().startsWith('house_')) return null;
    let parts = roomName.substring(6).split('_');
    let last = parts[parts.length - 1]?.toLowerCase();
    let houseType = (last === 'standart' || last === 'garden' || last === 'pool') ? last : null;
    let rawOwner = houseType ? parts.slice(0, -1).join('_') : parts.join('_');
    let owner = findUserKey(rawOwner) || rawOwner;
    return { owner, houseType };
}

function getFriendListData(username, playersOnline = {}) {
    let uKey = findUserKey(username) || username;
    let uData = persistentData.users[uKey];
    if (!uData || !uData.friends) return [];
    return uData.friends.map(fName => {
        let fKey = findUserKey(fName) || fName;
        let onlinePlayer = Object.values(playersOnline).find(p => p.name && p.name.toLowerCase() === fKey.toLowerCase());
        let fData = persistentData.users[fKey];
        return {
            username: fKey,
            isOnline: !!onlinePlayer,
            room: onlinePlayer ? onlinePlayer.room : null,
            house: fData ? fData.house : null
        };
    });
}

// --- 5. GÜVENLİ GİRİŞ, KAYIT VE ŞİFRE DEĞİŞTİRME ---
function loginUser(rawName, password, playersOnline = {}) {
    if (!rawName || typeof rawName !== 'string') {
        return { success: false, message: "❌ Kullanıcı adı boş olamaz!" };
    }
    const cleanName = rawName.trim();
    if (!password || typeof password !== 'string' || password.length < 3) {
        return { success: false, message: "❌ Şifre en az 3 karakter olmalıdır!" };
    }

    const existingKey = findUserKey(cleanName);
    if (!existingKey) {
        return { 
            success: false, 
            message: "❌ Böyle bir hesap bulunamadı! Henüz hesabınız yoksa lütfen 'Kayıt Ol' sekmesini kullanın." 
        };
    }

    // Çevrimiçi Çift Giriş Kontrolü (Aynı hesapla 2. giriş engeli)
    const isAlreadyOnline = Object.values(playersOnline).some(
        p => p && p.name && p.name.toLowerCase() === existingKey.toLowerCase()
    );
    if (isAlreadyOnline) {
        return {
            success: false,
            message: "⚠️ Bu hesap şu anda oyunda aktif! Eğer bu sizseniz diğer sekmeyi kapatın veya birkaç saniye bekleyin."
        };
    }

    const uData = persistentData.users[existingKey];

    // Şifre Doğrulama
    if (uData.auth && uData.auth.hash && uData.auth.salt) {
        const isValid = verifyPassword(password, uData.auth.hash, uData.auth.salt);
        if (!isValid) {
            return { success: false, message: "❌ Şifre hatalı!" };
        }
        if (isUserAdmin(existingKey)) {
            uData.role = 'admin';
            uData.isAdmin = true;
        }
        return {
            success: true,
            username: existingKey,
            userData: uData,
            isNew: false
        };
    }

    // Eski (legacy) hesap ilk girişte şifresini bağlar
    const { hash, salt } = hashPassword(password);
    uData.auth = { hash, salt };
    if (isUserAdmin(existingKey)) {
        uData.role = 'admin';
        uData.isAdmin = true;
    }
    savePersistentDataAtomic();

    return {
        success: true,
        username: existingKey,
        userData: uData,
        isNew: false,
        upgraded: true
    };
}

function registerUser(rawName, password, gender = 'male') {
    if (!rawName || typeof rawName !== 'string') {
        return { success: false, message: "❌ Kullanıcı adı boş olamaz!" };
    }
    const cleanName = rawName.trim();
    if (cleanName.length < 2 || cleanName.length > 20) {
        return { success: false, message: "❌ Kullanıcı adı 2-20 karakter arasında olmalıdır!" };
    }
    if (!password || typeof password !== 'string' || password.length < 3) {
        return { success: false, message: "❌ Şifre en az 3 karakter olmalıdır!" };
    }

    const existingKey = findUserKey(cleanName);
    if (existingKey) {
        return { 
            success: false, 
            message: "❌ Bu kullanıcı adı zaten alınmış! Lütfen başka bir ad seçin veya 'Giriş Yap' sekmesini kullanın." 
        };
    }

    const isFem = (gender === 'female');
    const { hash, salt } = hashPassword(password);

    const newUser = {
        money: 1000,
        gender: gender || 'male',
        auth: { hash, salt },
        role: isUserAdmin(cleanName) ? 'admin' : 'user',
        isAdmin: isUserAdmin(cleanName),
        avatar: {
            hat: isFem ? 'hair_long' : 'bere',
            face: 'none',
            skinColor: '#ffd1a4',
            shirtColor: isFem ? 'dress_pink' : '#3b82f6',
            color: isFem ? 'dress_pink' : '#3b82f6',
            heldItem: 'none',
            shoes: isFem ? 'flats' : 'sneakers'
        },
        inventory: isFem 
            ? ['hats_hair_long', 'skins_#ffd1a4', 'shirts_dress_pink', 'shoes_flats', 'face_none', 'props_none']
            : ['hats_bere', 'skins_#facc15', 'shirts_#3b82f6', 'shoes_sneakers', 'face_none', 'props_none'],
        friends: [],
        friendRequests: [],
        house: null,
        houses: {},
        furnitureInventory: [],
        propInventory: {}
    };

    persistentData.users[cleanName] = newUser;
    savePersistentDataAtomic();

    return {
        success: true,
        username: cleanName,
        userData: newUser,
        isNew: true
    };
}

function changeUserPassword(username, oldPassword, newPassword) {
    if (!username || !oldPassword || !newPassword) {
        return { success: false, message: "❌ Lütfen tüm şifre alanlarını doldurun!" };
    }
    const cleanName = username.trim();
    const uKey = findUserKey(cleanName);
    if (!uKey || !persistentData.users[uKey]) {
        return { success: false, message: "❌ Kullanıcı bulunamadı!" };
    }
    const uData = persistentData.users[uKey];

    if (!uData.auth || !uData.auth.hash) {
        return { success: false, message: "❌ Hesabın şifresi doğrulanamadı!" };
    }

    const isOldValid = verifyPassword(oldPassword, uData.auth.hash, uData.auth.salt);
    if (!isOldValid) {
        return { success: false, message: "❌ Mevcut eski şifrenizi yanlış girdiniz!" };
    }

    if (newPassword.length < 3) {
        return { success: false, message: "❌ Yeni şifre en az 3 karakter olmalıdır!" };
    }

    if (oldPassword === newPassword) {
        return { success: false, message: "❌ Yeni şifre eski şifrenizle aynı olamaz!" };
    }

    const { hash, salt } = hashPassword(newPassword);
    uData.auth = { hash, salt };
    savePersistentDataAtomic();

    return { success: true, message: "✅ Şifreniz başarıyla değiştirildi!" };
}

function authenticateOrRegister(rawName, password, gender = 'male', playersOnline = {}) {
    const existingKey = findUserKey(rawName);
    if (existingKey) {
        return loginUser(rawName, password, playersOnline);
    } else {
        return registerUser(rawName, password, gender);
    }
}

// --- 6. GİRDİ SANİTİZASYON VE DOĞRULAMA (INPUT SANITIZATION) ---
function sanitizeAmount(val, min = 1, max = 100000000) {
    if (val === null || val === undefined) return null;
    let num = Math.floor(Number(val));
    if (isNaN(num) || !isFinite(num)) return null;
    if (num < min) return null;
    if (num > max) return max;
    return num;
}

function sanitizeString(str, maxLen = 100) {
    if (typeof str !== 'string') return '';
    return str.trim().slice(0, maxLen);
}

// --- 7. GÜNLÜK GÖREVLER (DAILY QUESTS) SİSTEMİ ---
function getTodayDateString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DEFAULT_DAILY_QUESTS_DEF = [
    { id: 'okey101_play', title: '🀄 101 Okey Partisi', desc: "101 Okey masasında 1 el tamamla", target: 1, reward: 60 },
    { id: 'batak_play', title: '🃏 Koz Batak Ustası', desc: "Batak masasında 1 el tamamla", target: 1, reward: 50 },
    { id: 'tavla_play', title: '🎲 Tavla Mücadelesi', desc: "Tavla masasında 1 oyun tamamla", target: 1, reward: 40 },
    { id: 'drink_tea', title: '☕ Tavşan Kanı Çay', desc: "Kıraathane çay ocağından taze çay iç", target: 1, reward: 20 },
    { id: 'go_fishing', title: '🎣 Göl Kenarı Balıkçısı', desc: "Göl kenarında 1 kez olta atıp balık tut", target: 1, reward: 30 }
];

function getUserDailyQuests(username) {
    const uKey = findUserKey(username);
    if (!uKey || !persistentData.users[uKey]) return [];
    const uData = persistentData.users[uKey];
    const today = getTodayDateString();

    if (!uData.dailyQuests || uData.dailyQuests.date !== today) {
        uData.dailyQuests = {
            date: today,
            quests: DEFAULT_DAILY_QUESTS_DEF.map(q => ({
                id: q.id,
                title: q.title,
                desc: q.desc,
                target: q.target,
                reward: q.reward,
                current: 0,
                claimed: false
            }))
        };
        savePersistentData();
    }

    return uData.dailyQuests.quests;
}

function recordQuestProgress(username, questId, amount = 1) {
    const uKey = findUserKey(username);
    if (!uKey || !persistentData.users[uKey]) return null;
    const quests = getUserDailyQuests(uKey);
    const quest = quests.find(q => q.id === questId);
    if (!quest) return null;

    if (quest.current < quest.target) {
        quest.current = Math.min(quest.target, quest.current + amount);
        savePersistentData();
        return quest;
    }
    return null;
}

function claimQuestReward(username, questId) {
    const uKey = findUserKey(username);
    if (!uKey || !persistentData.users[uKey]) return { success: false, msg: "Kullanıcı bulunamadı!" };
    const uData = persistentData.users[uKey];
    const quests = getUserDailyQuests(uKey);
    const quest = quests.find(q => q.id === questId);

    if (!quest) return { success: false, msg: "Görev bulunamadı!" };
    if (quest.current < quest.target) return { success: false, msg: "Bu görevi henüz tamamlamadınız!" };
    if (quest.claimed) return { success: false, msg: "Bu görevin ödülünü zaten aldınız!" };

    quest.claimed = true;
    uData.money = (uData.money || 100) + quest.reward;
    savePersistentData();

    return {
        success: true,
        reward: quest.reward,
        newMoney: uData.money,
        quests: uData.dailyQuests.quests,
        msg: `🎉 Tebrikler! "${quest.title}" görevinden ${quest.reward} TL kazandınız!`
    };
}

module.exports = {
    persistentData,
    loadPersistentData,
    savePersistentData,
    saveUserData: savePersistentData,
    savePersistentDataAtomic,
    flushNow,
    findUserKey,
    parseHouseRoom,
    getFriendListData,
    loginUser,
    registerUser,
    changeUserPassword,
    authenticateOrRegister,
    hashPassword,
    verifyPassword,
    sanitizeAmount,
    sanitizeString,
    getUserDailyQuests,
    recordQuestProgress,
    claimQuestReward,
    isUserAdmin,
    ADMIN_USERS
};
