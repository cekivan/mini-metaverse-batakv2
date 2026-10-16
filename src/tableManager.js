// src/tableManager.js - Masa, Lobi ve Bot Koltuğu Yönetim Modülü
const config = require('./config');

const baseTableConfigs = JSON.parse(JSON.stringify(config.BASE_TABLE_CONFIGS));
const tables = JSON.parse(JSON.stringify(config.DEFAULT_TABLES));

const BOT_NAMES = [
    "🤖 Çaycı İsmail", "🤖 Mahmut Emmi", "🤖 Dayı Recep", "🤖 Hasan Dayı",
    "🤖 Berber Niyazi", "🤖 Muhtar Remzi", "🤖 Kasap Şevket", "🤖 Kahveci Veli",
    "🤖 Emlakçı Seyfi", "🤖 Terzi Mithat", "🤖 Manav Şükrü", "🤖 Taksici Hayri"
];

const BOT_AVATARS = [
    { hat: 'kasket', face: 'mustache', skinColor: '#ffd1a4', color: '#10b981', heldItem: 'cay' },
    { hat: 'bere', face: 'beard', skinColor: '#facc15', color: '#3b82f6', heldItem: 'tespih' },
    { hat: 'fes', face: 'mustache', skinColor: '#d2996c', color: '#ef4444', heldItem: 'nargile' },
    { hat: 'cowboy', face: 'sunglasses', skinColor: '#8d5524', color: '#8b5cf6', heldItem: 'gazoz' },
    { hat: 'kasket', face: 'none', skinColor: '#ffd1a4', color: '#f59e0b', heldItem: 'baglama' },
    { hat: 'bere', face: 'mustache', skinColor: '#facc15', color: '#0f172a', heldItem: 'asagold' }
];

function getTables() {
    return tables;
}

function getTable(tableId) {
    return tables[tableId] || null;
}

function getBaseTableConfigs() {
    return baseTableConfigs;
}

function getTableOptionsList(baseType, activeGames = {}, players = {}) {
    if (!baseTableConfigs[baseType]) return null;

    let tableList = [];
    for (let tid in tables) {
        let t = tables[tid];
        if (t.baseType === baseType) {
            let isGameActive = !!activeGames[tid];
            let currentNames = [];
            let vacantSeats = [];
            let botSeats = [];

            if (isGameActive) {
                let g = activeGames[tid];
                currentNames = g.players.map(pid => (players[pid]?.name || g.playerProfiles[pid]?.name || "Oyuncu"));
                if (g.disconnectedPlayers) {
                    for (let dPid in g.disconnectedPlayers) {
                        vacantSeats.push({
                            oldPid: dPid,
                            name: g.disconnectedPlayers[dPid].name,
                            seatIndex: g.disconnectedPlayers[dPid].seatIndex
                        });
                    }
                }
                g.players.forEach((pid, idx) => {
                    let isBot = pid.startsWith('bot_') || g.playerProfiles?.[pid]?.isBot || players[pid]?.isBot;
                    if (isBot) {
                        let bName = g.playerProfiles?.[pid]?.name || players[pid]?.name || `Bot ${idx + 1}`;
                        botSeats.push({
                            botPid: pid,
                            name: bName,
                            seatIndex: idx
                        });
                    }
                });
            } else {
                currentNames = t.players.map(pid => players[pid]?.name || "Oyuncu");
                t.players.forEach((pid, idx) => {
                    let isBot = pid.startsWith('bot_') || players[pid]?.isBot;
                    if (isBot) {
                        let bName = players[pid]?.name || `Bot ${idx + 1}`;
                        botSeats.push({
                            botPid: pid,
                            name: bName,
                            seatIndex: idx
                        });
                    }
                });
            }

            tableList.push({
                id: t.id,
                name: t.name,
                min: t.min,
                bet: t.bet || 0,
                mode: t.mode || (t.baseType === 'okey101_tekli' ? 'tekli' : (t.baseType === 'okey101' ? 'esli' : null)),
                pot: (t.bet || 0) * t.min,
                count: isGameActive ? t.min : t.players.length,
                isActive: isGameActive,
                players: currentNames,
                spectatorCount: (activeGames[tid]?.spectators || []).length,
                hasVacantSeat: vacantSeats.length > 0,
                vacantSeats: vacantSeats,
                hasBotSeat: botSeats.length > 0,
                botSeats: botSeats
            });
        }
    }

    return {
        baseType: baseType,
        baseName: baseTableConfigs[baseType].name,
        tables: tableList
    };
}

function createNewTable(payload, activeGames = {}) {
    if (!payload || !payload.baseType || !baseTableConfigs[payload.baseType]) {
        return { success: false, message: "Geçersiz oyun türü!" };
    }

    let baseType = payload.baseType;
    let baseConf = baseTableConfigs[baseType];
    let customName = (payload.name || "").trim();
    let bet = parseInt(payload.bet) || 0;
    if (bet < 0) bet = 0;
    if (bet > 5000) bet = 5000;

    let mode = payload.mode;
    if (!mode) {
        mode = (baseType === 'okey101_tekli') ? 'tekli' : (baseType === 'okey101' ? 'esli' : null);
    }

    let uniqueId = `${baseType}_${Date.now()}`;
    let tableName = customName !== "" 
        ? `${customName} (${baseConf.name})` 
        : `${baseConf.name} #${Object.keys(tables).filter(k => tables[k].baseType === baseType).length + 1}`;

    tables[uniqueId] = {
        id: uniqueId,
        baseType: baseType,
        name: tableName,
        min: baseConf.min,
        bet: bet,
        pot: 0,
        mode: mode,
        players: [],
        spectators: []
    };

    return { success: true, tableId: uniqueId, table: tables[uniqueId] };
}

function addBotToTable(tableId, activeGames = {}, players = {}) {
    let table = tables[tableId];
    if (!table) {
        for (let tid in tables) {
            let cand = tables[tid];
            if (cand.baseType === tableId && !activeGames[tid] && cand.players.length < cand.min) {
                table = cand;
                tableId = tid;
                break;
            }
        }
    }
    if (!table) return { success: false, message: "Masa bulunamadı!" };
    if (activeGames[tableId]) return { success: false, message: "Bu masada oyun zaten başlamış!" };
    if (table.players.length >= table.min) return { success: false, message: "Masa zaten dolu!" };

    let botId = `bot_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    let usedNames = table.players.map(pid => players[pid]?.name);
    let availableNames = BOT_NAMES.filter(n => !usedNames.includes(n));
    let botName = availableNames.length > 0 
        ? availableNames[Math.floor(Math.random() * availableNames.length)] 
        : `🤖 Oyuncu Bot ${Math.floor(Math.random() * 90) + 10}`;

    let botAv = BOT_AVATARS[Math.floor(Math.random() * BOT_AVATARS.length)];

    players[botId] = {
        name: botName,
        isBot: true,
        x: 400, y: 400,
        color: botAv.color,
        skinColor: botAv.skinColor,
        hat: botAv.hat,
        face: botAv.face,
        heldItem: botAv.heldItem,
        gender: 'male',
        money: 99999,
        room: 'kafe'
    };

    table.players.push(botId);

    return {
        success: true,
        botId: botId,
        botName: botName,
        table: table,
        isFull: (table.players.length === table.min)
    };
}

function removePlayerFromLobbies(socketId) {
    let affectedTables = [];
    for (let tid in tables) {
        let t = tables[tid];
        if (t.players && t.players.includes(socketId)) {
            t.players = t.players.filter(pid => pid !== socketId);
            affectedTables.push(t);
        }
    }
    return affectedTables;
}

module.exports = {
    tables,
    baseTableConfigs,
    getTables,
    getTable,
    getBaseTableConfigs,
    getTableOptionsList,
    createNewTable,
    addBotToTable,
    removePlayerFromLobbies
};
