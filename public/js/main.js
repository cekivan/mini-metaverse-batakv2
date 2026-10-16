// public/js/main.js - Ana Oyun Orkestratörü, Game Loop & Soket Yöneticisi
// (Modüler mimariye ayrılmıştır: authUI.js, wardrobe.js, avatarRenderer.js, chatBubbles.js, worldRenderer.js, fishing.js, adminPanel.js, mobileControls.js)

// public/js/main.js

var socket = window.socket || (typeof io !== 'undefined' ? io() : null);
window.socket = socket;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let myId = null;
let players = {};
let currentRoom = "sokak";

// WASD Hareket Değişkenleri (Akıcı Yürüyüş)
let keys = { w: false, a: false, s: false, d: false };


// --- 1. OTURUM & YÖNETİM DURUM DİNLENMESİ ---
let myUsername = "";

socket.on('loginSuccess', (data) => {
    try { const loginEl = document.getElementById('loginScreen'); if (loginEl) loginEl.style.display = 'none'; } catch(e) {}
    if (data) {
        if (data.username) {
            myUsername = data.username;
            window.myUsername = data.username;
        }
        if (data.gender) {
            window.myGender = data.gender;
        }
        if (data.money !== undefined) updateMoneyDisplay(data.money);
        if (data.inventory) myInventory = data.inventory;
        if (data.avatar) {
            myAvatar = data.avatar;
            if (!myAvatar.shoes) myAvatar.shoes = (window.myGender === 'female' ? 'flats' : 'sneakers');
            if (players[myId]) Object.assign(players[myId], myAvatar);
        }
        if (data.friends) {
            window.myFriendsList = data.friends;
            if (typeof renderFriendsListUI === 'function') renderFriendsListUI();
        }
        if (data.propInventory) {
            window.myPropInventory = data.propInventory;
            if (typeof updatePropsCountBadge === 'function') updatePropsCountBadge();
        }
        if (data.friendRequests) {
            window.myFriendRequests = data.friendRequests;
            if (typeof renderFriendRequestsUI === 'function') renderFriendRequestsUI();
        }
        if (typeof updateFriendshipBadges === 'function') updateFriendshipBadges();
        if (data.houses) {
            window.myHouses = data.houses;
        }
        if (data.house) {
            myHouseData = data.house;
            window.myHouseData = data.house;
        }
        if (data.furnitureInventory) {
            myFurnitureInventory = data.furnitureInventory;
            window.myFurnitureInventory = data.furnitureInventory;
        }
        if (typeof updateHouseEditButtonVisibility === 'function') {
            updateHouseEditButtonVisibility();
        }

        const ADMIN_NAMES = ['yasin', 'maltoroz'];
        if (data.isAdmin || (data.username && ADMIN_NAMES.includes(data.username.toLowerCase()))) {
            const adminBtn = document.getElementById('adminPanelNavBtn');
            if (adminBtn) adminBtn.style.display = 'flex';
        }

        // Yeni Güncellemeler (Beta v1.3) Panelini Aç
        setTimeout(() => {
            if (typeof openUpdatesModal === 'function') {
                openUpdatesModal();
            }
        }, 350);
    }
});

socket.on('moneyUpdate', (money) => {
    updateMoneyDisplay(money);
});


// --- 3. SÜRÜKLE BIRAK (DRAGGABLE) İŞLEMLERİ ---
document.addEventListener('DOMContentLoaded', () => {

    // A) CHAT PANELİNİ SÜRÜKLEME
    const chatPanel = document.getElementById('sideChatContainer');
    const chatHeader = document.getElementById('chatHeader');
    let isChatDragging = false, cStartX, cStartY, cInitialLeft, cInitialTop;

    if (chatHeader && chatPanel) {
        chatHeader.addEventListener('mousedown', (e) => {
            isChatDragging = true;
            cStartX = e.clientX; cStartY = e.clientY;
            cInitialLeft = chatPanel.offsetLeft; cInitialTop = chatPanel.offsetTop;
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!isChatDragging) return;
            chatPanel.style.left = (cInitialLeft + (e.clientX - cStartX)) + 'px';
            chatPanel.style.top = (cInitialTop + (e.clientY - cStartY)) + 'px';
            chatPanel.style.right = 'auto';
        });
        document.addEventListener('mouseup', () => { isChatDragging = false; });

        // Mobil Dokunmatik Desteği
        chatHeader.addEventListener('touchstart', (e) => {
            isChatDragging = true;
            cStartX = e.touches[0].clientX; cStartY = e.touches[0].clientY;
            cInitialLeft = chatPanel.offsetLeft; cInitialTop = chatPanel.offsetTop;
        });
        document.addEventListener('touchmove', (e) => {
            if (!isChatDragging) return;
            chatPanel.style.left = (cInitialLeft + (e.touches[0].clientX - cStartX)) + 'px';
            chatPanel.style.top = (cInitialTop + (e.touches[0].clientY - cStartY)) + 'px';
            chatPanel.style.right = 'auto';
        });
        document.addEventListener('touchend', () => { isChatDragging = false; });
    }

    // B) OYUN MASASINI (MODAL) SÜRÜKLEME
    const gameModal = document.getElementById('gameModal');
    const modalHeader = document.getElementById('modalHeader');
    let isModalDragging = false, mStartX, mStartY, mInitialLeft, mInitialTop;

    if (modalHeader && gameModal) {
        modalHeader.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
            isModalDragging = true;
            mStartX = e.clientX; mStartY = e.clientY;

            // Transformu kaldırıp px tabanlı konumlandırmaya geçiyoruz
            const rect = gameModal.getBoundingClientRect();
            gameModal.style.transform = 'none';
            gameModal.style.left = rect.left + 'px';
            gameModal.style.top = rect.top + 'px';

            mInitialLeft = gameModal.offsetLeft;
            mInitialTop = gameModal.offsetTop;
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!isModalDragging) return;
            gameModal.style.left = (mInitialLeft + (e.clientX - mStartX)) + 'px';
            gameModal.style.top = (mInitialTop + (e.clientY - mStartY)) + 'px';
        });
        document.addEventListener('mouseup', () => { isModalDragging = false; });
    }

    // Enter tuşu desteği ve Karakter Sayacı
    const sideInput = document.getElementById('sideChatInput');
    if (sideInput) {
        sideInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendSideChat(); });
        sideInput.addEventListener('input', updateChatCharCounter);
    }

    const passwordInput = document.getElementById('passwordInput');
    const usernameInput = document.getElementById('usernameInput');
    if (passwordInput) passwordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') attemptLogin(); });
    if (usernameInput) usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') attemptLogin(); });

    const regUserInput = document.getElementById('regUsernameInput');
    const regPassInput = document.getElementById('regPasswordInput');
    const regPassConfirmInput = document.getElementById('regPasswordConfirmInput');
    if (regUserInput) regUserInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') attemptRegister(); });
    if (regPassInput) regPassInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') attemptRegister(); });
    if (regPassConfirmInput) regPassConfirmInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') attemptRegister(); });

    const cpOld = document.getElementById('cpOldPassword');
    const cpNew = document.getElementById('cpNewPassword');
    const cpConfirm = document.getElementById('cpNewPasswordConfirm');
    if (cpOld) cpOld.addEventListener('keypress', (e) => { if (e.key === 'Enter') submitChangePassword(); });
    if (cpNew) cpNew.addEventListener('keypress', (e) => { if (e.key === 'Enter') submitChangePassword(); });
    if (cpConfirm) cpConfirm.addEventListener('keypress', (e) => { if (e.key === 'Enter') submitChangePassword(); });

    requestAnimationFrame(gameLoop);
});

// --- 4. OYUNCU VE ODA BAĞLANTILARI ---
socket.on('currentPlayers', (serverPlayers) => {
    let oldMe = (typeof myId !== 'undefined' && players && players[myId]) ? players[myId] : null;
    players = serverPlayers || {};
    myId = socket.id;
    if (!players[myId] && oldMe) {
        players[myId] = oldMe;
    }
    if (players[myId]) {
        lastEmittedX = players[myId].x;
        lastEmittedY = players[myId].y;
    }
});

socket.on('newPlayer', (data) => { if (data && data.id) players[data.id] = data.player; });
socket.on('playerDisconnected', (id) => {
    if (id === myId) return;
    delete players[id];
    delete activeChatBubbles[id];
    delete activePlayerEmojis[id];
});
socket.on('playerMoved', (data) => {
    if (players[data.id]) {
        if (players[data.id].action === 'sitting' && (data.x !== players[data.id].x || data.y !== players[data.id].y)) {
            players[data.id].action = null;
        }
        if (data.id === myId) {
            players[data.id].x = data.x;
            players[data.id].y = data.y;
        } else {
            players[data.id].targetX = data.x;
            players[data.id].targetY = data.y;
            if (data.isMoving !== undefined) {
                players[data.id].serverMoving = data.isMoving;
            }
            if (players[data.id].x === undefined) {
                players[data.id].x = data.x;
                players[data.id].y = data.y;
            }
        }
    }
});
socket.on('systemMessage', (msg) => { console.log("[Sistem]:", msg); });

socket.on('chatSpamWarning', (data) => {
    const banner = document.getElementById('chatSpamWarningBanner');
    if (banner) {
        banner.style.display = 'block';
        banner.textContent = (data && data.message) ? data.message : "⚠️ Çok hızlı mesaj atıyorsunuz! Lütfen 3 saniye bekleyin.";
        clearTimeout(window._chatSpamTimeout);
        window._chatSpamTimeout = setTimeout(() => {
            banner.style.display = 'none';
        }, ((data && data.cooldownRemaining) || 3) * 1000);
    }
});

socket.on('playerEmojiUpdate', (data) => {
    if (data && data.id && data.emoji) {
        activePlayerEmojis[data.id] = { emoji: data.emoji, start: Date.now() };
    }
});

const ROOM_TRANSITION_SPAWNS = {
    kafe: { default: { x: 400, y: 410 } },
    sokak: {
        sahil: { x: 85, y: 240 },
        cadde: { x: 720, y: 240 },
        kafe: { x: 400, y: 125 },
        nargile_cafe: { x: 670, y: 125 },
        market: { x: 730, y: 350 },
        emlakci: { x: 180, y: 130 },
        default: { x: 350, y: 230 }
    },
    cadde: {
        sokak: { x: 80, y: 230 },
        ganyan: { x: 240, y: 145 },
        dedenin_yeri: { x: 590, y: 145 },
        default: { x: 400, y: 230 }
    },
    emlakci: { default: { x: 400, y: 410 } },
    sahil: {
        sokak: { x: 680, y: 270 },
        default: { x: 420, y: 350 }
    },
    ganyan: { default: { x: 400, y: 410 } },
    dedenin_yeri: { default: { x: 400, y: 410 } },
    nargile_cafe: { default: { x: 400, y: 390 } },
    market: { default: { x: 400, y: 420 } }
};
let roomTransitionCooldownUntil = 0;
let roomTransitionFadeAlpha = 0;

// --- 5. MEKAN DEĞİŞTİRME (Üst Butonlar ve Geçişler) ---
function warnHouseEditActive() {
    if (typeof showSocialNotificationToast === 'function') {
        showSocialNotificationToast('⚠️', 'Ev Düzenleme Açık', 'Lütfen önce ev düzenleme ekranını kapatın.');
    } else {
        alert('Lütfen önce ev düzenleme ekranını kapatın.');
    }
}
window.warnHouseEditActive = warnHouseEditActive;

function changeRoom(newRoom, targetSpawn) {
    if (currentRoom && currentRoom.startsWith("house_") && window.isHouseEditMode && newRoom !== currentRoom) {
        warnHouseEditActive();
        return;
    }
    let oldRoom = currentRoom;
    if (!newRoom.startsWith("house_") && typeof stopGramophoneMusic === 'function') {
        stopGramophoneMusic();
    }
    currentRoom = newRoom;
    roomTransitionFadeAlpha = 0.95; // Sinematik mekan geçiş kararması (Fade in)
    if (typeof bgCache !== 'undefined') bgCache.invalidate();
    if (newRoom !== 'sahil') {
        if (typeof myId !== 'undefined' && players[myId]) {
            players[myId].hasSwanBoat = false;
        }
        if (swanBoatCountdownInterval) {
            clearInterval(swanBoatCountdownInterval);
            swanBoatCountdownInterval = null;
        }
        swanBoatSecondsLeft = 0;
    }

    roomTransitionCooldownUntil = Date.now() + 1500;

    if (typeof keys !== 'undefined') {
        keys.w = false;
        keys.a = false;
        keys.s = false;
        keys.d = false;
    }
    targetWalkPos = null;

    if (typeof myId !== 'undefined' && players[myId]) {
        let p = players[myId];
        p.isMoving = false;
        p.action = null;
        let spawnPos = targetSpawn;
        if (!spawnPos) {
            let roomMap = ROOM_TRANSITION_SPAWNS[newRoom];
            if (roomMap) {
                spawnPos = roomMap[oldRoom] || roomMap.default;
            } else if (newRoom.startsWith("house_")) {
                spawnPos = { x: 400, y: 400 };
            } else {
                spawnPos = { x: 400, y: 300 };
            }
        }
        if (spawnPos) {
            p.x = spawnPos.x;
            p.y = spawnPos.y;
            lastEmittedX = p.x;
            lastEmittedY = p.y;
            lastEmittedMoving = false;
            socket.emit('playerMovement', { x: p.x, y: p.y, isMoving: false });
        }

        // Baba Peti Varsa Oyuncuyla Beraber Anında Yeni Mekana Geçsin
        if (window.activeFatherPets && window.activeFatherPets[myId]) {
            let myPet = window.activeFatherPets[myId];
            myPet.room = newRoom;
            myPet.x = p.x + 32;
            myPet.y = p.y;
            myPet.isMoving = false;
        }
    }

    socket.emit('changeRoom', newRoom);
    const fishBtn = document.getElementById('btnFishAction');
    if (fishBtn) {
        fishBtn.style.display = (newRoom === 'sahil') ? 'flex' : 'none';
    }

    updateSwanBoatButtonUI();

    const editBtn = document.getElementById('btnEditHouseFurniture');
    if (typeof updateHouseEditButtonVisibility === 'function') {
        updateHouseEditButtonVisibility();
    } else if (editBtn) {
        let isMyHouse = (newRoom && myUsername && newRoom === `house_${myUsername}`);
        editBtn.style.display = isMyHouse ? 'flex' : 'none';
    }
}

// 🗺️ MEKANLAR AÇILIR MENÜSÜ KONTROLLERİ
window.togglePlacesMenu = function(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const menu = document.getElementById('placesDropdownMenu');
    if (menu) {
        menu.classList.toggle('active');
    }
};

window.selectPlace = function(place) {
    const menu = document.getElementById('placesDropdownMenu');
    if (menu) menu.classList.remove('active');
    if (typeof changeRoom === 'function') {
        changeRoom(place);
    }
};

document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('placesDropdownMenu');
    const btn = document.getElementById('placesDropdownBtn');
    if (dropdown && dropdown.classList.contains('active')) {
        if (!dropdown.contains(e.target) && e.target !== btn && !btn?.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    }
});

let swanBoatCountdownInterval = null;
let swanBoatSecondsLeft = 0;

function updateSwanBoatButtonUI() {
    const swanBtn = document.getElementById('btnSwanBoatAction');
    if (!swanBtn) return;
    swanBtn.style.display = (currentRoom === 'sahil') ? 'flex' : 'none';
    if (players[myId] && players[myId].hasSwanBoat) {
        if (swanBoatSecondsLeft > 0) {
            let m = Math.floor(swanBoatSecondsLeft / 60);
            let s = swanBoatSecondsLeft % 60;
            swanBtn.innerText = `🦢 Kuğu Bisikletindesin (${m}:${s < 10 ? '0' : ''}${s})`;
        } else {
            swanBtn.innerText = "🦢 Kuğu Bisikletindesin (5 Dakika)";
        }
        swanBtn.style.background = "#059669";
    } else {
        swanBtn.innerText = "🦢 Kuğu Deniz Bisikleti Kirala (20 TL)";
        swanBtn.style.background = "linear-gradient(135deg, #f43f5e, #be123c)";
    }
}

function handleRentSwanBoat() {
    socket.emit('rentSwanBoat');
}

socket.on('playerSwanBoatUpdate', (data) => {
    if (players[data.id]) {
        players[data.id].hasSwanBoat = data.hasSwanBoat;
        if (data.id === myId) {
            if (!data.hasSwanBoat) {
                if (swanBoatCountdownInterval) {
                    clearInterval(swanBoatCountdownInterval);
                    swanBoatCountdownInterval = null;
                }
                swanBoatSecondsLeft = 0;
            }
            updateSwanBoatButtonUI();
        }
    }
});

socket.on('swanBoatRented', (data) => {
    swanBoatSecondsLeft = (data && data.duration) ? data.duration : 300;
    if (swanBoatCountdownInterval) clearInterval(swanBoatCountdownInterval);
    updateSwanBoatButtonUI();
    swanBoatCountdownInterval = setInterval(() => {
        swanBoatSecondsLeft--;
        if (swanBoatSecondsLeft <= 0) {
            clearInterval(swanBoatCountdownInterval);
            swanBoatCountdownInterval = null;
            if (players[myId]) players[myId].hasSwanBoat = false;
        }
        updateSwanBoatButtonUI();
    }, 1000);
});

socket.on('swanBoatExpired', () => {
    if (swanBoatCountdownInterval) {
        clearInterval(swanBoatCountdownInterval);
        swanBoatCountdownInterval = null;
    }
    swanBoatSecondsLeft = 0;
    if (players[myId]) players[myId].hasSwanBoat = false;
    updateSwanBoatButtonUI();
});

// --- 5.1 RECONNECT (KALDIĞIN YERDEN DEVAM ET) İŞLEMLERİ ---
let pendingReconnectTableId = null;

socket.on('reconnectOffer', (data) => {
    pendingReconnectTableId = data.tableId;
    const modal = document.getElementById('reconnectModal');
    const nameSpan = document.getElementById('reconnectTableName');
    if (nameSpan) nameSpan.innerText = data.tableName;
    if (modal) modal.style.display = 'flex';
});

function handleAcceptReconnect() {
    if (pendingReconnectTableId) {
        socket.emit('acceptReconnect', pendingReconnectTableId);
        pendingReconnectTableId = null;
    }
    const modal = document.getElementById('reconnectModal');
    if (modal) modal.style.display = 'none';
}

function handleDeclineReconnect() {
    if (pendingReconnectTableId) {
        socket.emit('declineReconnect', pendingReconnectTableId);
        pendingReconnectTableId = null;
    }
    const modal = document.getElementById('reconnectModal');
    if (modal) modal.style.display = 'none';
}

// --- 5.2 MASA SEÇİMİ (İZLE / KATIL / YENİ MASA) ---
let currentSelectedBaseType = null;

socket.on('tableOptionsModal', (data) => {
    currentSelectedBaseType = data.baseType;
    const modal = document.getElementById('tableSelectModal');
    const title = document.getElementById('tableSelectTitle');
    const list = document.getElementById('tableOptionsList');

    const modeCont = document.getElementById('newTable101ModeContainer');
    const modeSelect = document.getElementById('newTable101ModeSelect');
    if (modeCont) {
        modeCont.style.display = 'none'; // Masanın türü sabit: Sol masa tekli, Sağ masa eşli
        if (modeSelect) {
            modeSelect.value = (data.baseType === 'okey101_tekli') ? 'tekli' : 'esli';
        }
    }

    if (title) title.innerText = `${data.baseName} Masaları`;
    if (list) {
        list.innerHTML = "";
        data.tables.forEach(t => {
            let itemHtml = `<div style="background: rgba(0,0,0,0.35); border: 1px solid #34495e; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">`;

            let betBadge = (t.bet && t.bet > 0)
                ? `<span style="display:inline-block; margin-left:6px; background:rgba(245,158,11,0.25); border:1px solid #f59e0b; color:#facc15; font-size:11px; font-weight:800; padding:2px 8px; border-radius:12px;">💰 Bahis: ${t.bet} TL (Ödül: ${(t.pot > 0 ? t.pot : (t.bet * t.min))} TL)</span>`
                : `<span style="display:inline-block; margin-left:6px; background:rgba(34,197,94,0.2); border:1px solid #22c55e; color:#4ade80; font-size:11px; font-weight:800; padding:2px 8px; border-radius:12px;">🌱 Ücretsiz</span>`;

            let modeBadge = "";
            if (t.mode === 'esli') {
                modeBadge = `<span style="display:inline-block; margin-left:6px; background:rgba(59,130,246,0.25); border:1px solid #3b82f6; color:#60a5fa; font-size:11px; font-weight:800; padding:2px 8px; border-radius:12px;">👥 Eşli</span>`;
            } else if (t.mode === 'tekli') {
                modeBadge = `<span style="display:inline-block; margin-left:6px; background:rgba(100,116,139,0.25); border:1px solid #64748b; color:#cbd5e1; font-size:11px; font-weight:800; padding:2px 8px; border-radius:12px;">👤 Tekli</span>`;
            }

            if (t.isActive) {
                let vacantDesc = "";
                if (t.hasVacantSeat && t.vacantSeats && t.vacantSeats.length > 0) {
                    vacantDesc = `<div style="font-size: 12px; color: #f87171; font-weight: bold; margin-top: 3px;">💺 Boş Koltuk: ${t.vacantSeats.map(v => v.name + ' ayrıldı').join(', ')}</div>`;
                }

                itemHtml += `<div style="flex: 1; min-width: 180px;">
                    <div style="font-weight: bold; color: ${t.hasVacantSeat ? '#f59e0b' : '#f39c12'}; font-size: 15px; display:flex; align-items:center; flex-wrap:wrap; gap:4px;">
                        <span>${t.hasVacantSeat ? '⚠️' : '🔴'} ${t.name} (Oyun Sürüyor${t.hasVacantSeat ? ' - Eksik Koltuk Var!' : ''})</span>
                        ${modeBadge}
                        ${betBadge}
                    </div>
                    <div style="font-size: 12px; color: #bdc3c7; margin-top: 3px;">
                        Oyuncular: ${t.players.join(', ')} | 👁️ Yancılar: ${t.spectatorCount}
                    </div>
                    ${vacantDesc}
                </div>
                <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">`;

                if (t.hasVacantSeat && t.vacantSeats) {
                    t.vacantSeats.forEach(v => {
                        itemHtml += `<button onclick="takeoverSeat('${t.id}', '${v.oldPid}')" style="padding: 8px 12px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px; box-shadow: 0 2px 8px rgba(16,185,129,0.4);">💺 ${v.name} Yerine Otur</button>`;
                    });
                }

                if (t.hasBotSeat && t.botSeats) {
                    t.botSeats.forEach(b => {
                        itemHtml += `<button onclick="takeoverSeat('${t.id}', '${b.botPid}')" style="padding: 8px 12px; background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px; box-shadow: 0 2px 8px rgba(139,92,246,0.4);">🤖 ${b.name} Yerine Otur</button>`;
                    });
                }

                itemHtml += `<button onclick="spectateTable('${t.id}')" style="padding: 8px 14px; background: #e67e22; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 13px;">👁️ İzle (Yancı Ol)</button>
                </div>`;
            } else {
                let botBtnHtml = "";
                if (t.count < t.min) {
                    botBtnHtml = `<button onclick="handleAddBotToTable('${t.id}')" style="padding: 8px 12px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px; box-shadow: 0 2px 8px rgba(139,92,246,0.4);">🤖 Bot Ekle</button>`;
                }

                let botTakeoverBtnHtml = "";
                if (t.hasBotSeat && t.botSeats) {
                    t.botSeats.forEach(b => {
                        botTakeoverBtnHtml += `<button onclick="takeoverSeat('${t.id}', '${b.botPid}')" style="padding: 8px 12px; background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px; box-shadow: 0 2px 8px rgba(139,92,246,0.4);">🤖 ${b.name} Yerine Otur</button>`;
                    });
                }

                itemHtml += `<div>
                    <div style="font-weight: bold; color: #2ecc71; font-size: 15px; display:flex; align-items:center; flex-wrap:wrap; gap:4px;">
                        <span>🟢 ${t.name}</span>
                        ${modeBadge}
                        ${betBadge}
                    </div>
                    <div style="font-size: 12px; color: #bdc3c7; margin-top: 3px;">Oyuncular (${t.count}/${t.min}): ${t.players.length > 0 ? t.players.join(', ') : 'Henüz kimse yok'}</div>
                </div>
                <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                    ${botBtnHtml}
                    ${botTakeoverBtnHtml}
                    <button onclick="joinSelectedTable('${t.id}')" style="padding: 8px 14px; background: #27ae60; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 13px;">🟢 Masaya Otur</button>
                </div>`;
            }

            itemHtml += `</div>`;
            list.innerHTML += itemHtml;
        });
    }

    if (modal) modal.style.display = 'flex';
});

function handleAddBotToTable(specificTableId) {
    let tId = specificTableId || window.currentActiveTableId;
    if (!tId && currentSelectedBaseType) {
        tId = currentSelectedBaseType;
    }
    if (tId) {
        socket.emit('addBotToTable', tId);
    }
}

function joinSelectedTable(tableId) {
    window.currentActiveTableId = tableId;
    if (window.setVoiceTable) window.setVoiceTable(tableId);
    socket.emit('joinTable', tableId);
    closeTableSelectModal();
    const modal = document.getElementById('gameModal');
    modal.style.display = 'block';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.left = '50%';
    modal.style.top = '50%';
    document.getElementById('modalStatus').innerText = "Masaya oturuldu, diğer oyuncular bekleniyor...";
}

function spectateTable(tableId) {
    window.currentActiveTableId = tableId;
    socket.emit('spectateTable', tableId);
    closeTableSelectModal();
}

function takeoverSeat(tableId, oldPid) {
    window.currentActiveTableId = tableId;
    socket.emit('takeoverSeat', { tableId: tableId, oldPid: oldPid });
    closeTableSelectModal();
    const modal = document.getElementById('gameModal');
    modal.style.display = 'block';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.left = '50%';
    modal.style.top = '50%';
    document.getElementById('modalStatus').innerText = "Koltuğa oturuluyor, oyun aktarılıyor...";
}

function handleCreateNewTable() {
    if (currentSelectedBaseType) {
        const betSelect = document.getElementById('newTableBetSelect');
        const betVal = betSelect ? (parseInt(betSelect.value) || 0) : 0;
        const modeSelect = document.getElementById('newTable101ModeSelect');
        let is101 = (currentSelectedBaseType === 'okey101' || currentSelectedBaseType === 'okey101_tekli');
        let defaultMode = (currentSelectedBaseType === 'okey101_tekli') ? 'tekli' : 'esli';
        const modeVal = (is101 && modeSelect) ? modeSelect.value : (is101 ? defaultMode : null);
        socket.emit('createNewTable', { baseType: currentSelectedBaseType, bet: betVal, mode: modeVal });
        closeTableSelectModal();
        const modal = document.getElementById('gameModal');
        modal.style.display = 'block';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.left = '50%';
        modal.style.top = '50%';
        let betMsg = betVal > 0 ? ` (Bahis: ${betVal} TL)` : " (Ücretsiz)";
        let modeMsg = modeVal === 'esli' ? " [Eşli 101]" : (modeVal === 'tekli' ? " [Tekli 101]" : "");
        document.getElementById('modalStatus').innerText = `Yeni masa açıldı${modeMsg}${betMsg}, diğer oyuncular bekleniyor...`;
    }
}

function closeTableSelectModal() {
    const modal = document.getElementById('tableSelectModal');
    if (modal) modal.style.display = 'none';
}

// --- 5.3 LİDERLİK TABLOSU ---
function openLeaderboard() {
    socket.emit('getLeaderboard');
    const modal = document.getElementById('leaderboardModal');
    if (modal) modal.style.display = 'flex';
}

function closeLeaderboard() {
    const modal = document.getElementById('leaderboardModal');
    if (modal) modal.style.display = 'none';
}

socket.on('leaderboardData', (data) => {
    const bList = document.getElementById('billiardLeaderList');
    const batakList = document.getElementById('batakLeaderList');
    const tavlaList = document.getElementById('tavlaLeaderList');

    if (bList) {
        if (!data.billiard || data.billiard.length === 0) {
            bList.innerHTML = "<div style='color:#94a3b8; font-style:italic;'>Henüz kayıt yok</div>";
        } else {
            let medals = ["🥇", "🥈", "🥉", "4.", "5."];
            bList.innerHTML = data.billiard.map((item, idx) =>
                `<div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                    <span>${medals[idx] || (idx + 1) + '.'} <b>${item.name}</b></span>
                    <span style="color:#facc15; font-weight:bold;">${item.wins} Galibiyet</span>
                </div>`
            ).join('');
        }
    }

    if (batakList) {
        if (!data.batak || data.batak.length === 0) {
            batakList.innerHTML = "<div style='color:#94a3b8; font-style:italic;'>Henüz kayıt yok</div>";
        } else {
            let medals = ["🥇", "🥈", "🥉", "4.", "5."];
            batakList.innerHTML = data.batak.map((item, idx) =>
                `<div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                    <span>${medals[idx] || (idx + 1) + '.'} <b>${item.name}</b></span>
                    <span style="color:#34d399; font-weight:bold;">${item.score} Puan</span>
                </div>`
            ).join('');
        }
    }

    if (tavlaList) {
        if (!data.tavla || data.tavla.length === 0) {
            tavlaList.innerHTML = "<div style='color:#94a3b8; font-style:italic;'>Henüz kayıt yok</div>";
        } else {
            let medals = ["🥇", "🥈", "🥉", "4.", "5."];
            tavlaList.innerHTML = data.tavla.map((item, idx) =>
                `<div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                    <span>${medals[idx] || (idx + 1) + '.'} <b>${item.name}</b></span>
                    <span style="color:#fb923c; font-weight:bold;">${item.wins} Galibiyet</span>
                </div>`
            ).join('');
        }
    }

    const okey101List = document.getElementById('okey101LeaderList');
    if (okey101List) {
        if (!data.okey101 || data.okey101.length === 0) {
            okey101List.innerHTML = "<div style='color:#94a3b8; font-style:italic;'>Henüz kayıt yok</div>";
        } else {
            let medals = ["🥇", "🥈", "🥉", "4.", "5."];
            okey101List.innerHTML = data.okey101.map((item, idx) =>
                `<div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                    <span>${medals[idx] || (idx + 1) + '.'} <b>${item.name}</b></span>
                    <span style="color:#ec4899; font-weight:bold;">${item.wins} Galibiyet</span>
                </div>`
            ).join('');
        }
    }
});

// --- DEVAM EDEN OYUNA DÖNÜŞ (RECONNECT / F5 KORUMASI) ---
pendingReconnectTableId = null;

socket.on('promptReconnect', (data) => {
    if (!data || !data.tableId) return;
    pendingReconnectTableId = data.tableId;
    let modal = document.getElementById('reconnectPromptModal');
    let tNameEl = document.getElementById('reconnectPromptTableName');
    if (tNameEl) tNameEl.innerText = data.tableName || "Masa";
    if (modal) modal.style.display = 'flex';
});

function confirmReconnect() {
    let modal = document.getElementById('reconnectPromptModal');
    if (modal) modal.style.display = 'none';
    if (pendingReconnectTableId) {
        socket.emit('acceptReconnect', pendingReconnectTableId);
        pendingReconnectTableId = null;
    }
}
window.confirmReconnect = confirmReconnect;

function dismissReconnect() {
    let modal = document.getElementById('reconnectPromptModal');
    if (modal) modal.style.display = 'none';
    if (pendingReconnectTableId) {
        socket.emit('declineReconnect', pendingReconnectTableId);
        pendingReconnectTableId = null;
    }
}
window.dismissReconnect = dismissReconnect;

// --- GÜNLÜK GÖREVLER (DAILY QUESTS) ---
function openDailyQuestsModal() {
    socket.emit('getDailyQuests');
    const modal = document.getElementById('dailyQuestsModal');
    if (modal) modal.style.display = 'flex';
}
window.openDailyQuestsModal = openDailyQuestsModal;

function closeDailyQuestsModal() {
    const modal = document.getElementById('dailyQuestsModal');
    if (modal) modal.style.display = 'none';
}
window.closeDailyQuestsModal = closeDailyQuestsModal;

function claimDailyQuest(questId) {
    if (!questId) return;
    socket.emit('claimDailyQuest', questId);
    if (window.playSound) window.playSound('coin');
}
window.claimDailyQuest = claimDailyQuest;

socket.on('dailyQuestsData', (quests) => {
    const container = document.getElementById('dailyQuestsContainer');
    if (!container) return;

    if (!quests || quests.length === 0) {
        container.innerHTML = "<div style='color:#94a3b8; font-style:italic; padding:20px;'>Bugün için aktif görev bulunamadı.</div>";
        return;
    }

    container.innerHTML = quests.map(q => {
        let isCompleted = q.current >= q.target;
        let isClaimed = !!q.claimed;
        let progressPct = Math.min(100, Math.round((q.current / q.target) * 100));

        let actionBtn = '';
        if (isClaimed) {
            actionBtn = `<span style="padding:6px 12px; background:rgba(255,255,255,0.08); color:#94a3b8; border-radius:8px; font-size:12px; font-weight:bold;">✅ Alındı</span>`;
        } else if (isCompleted) {
            actionBtn = `<button onclick="claimDailyQuest('${q.id}')" style="padding:8px 16px; background:linear-gradient(135deg, #10b981, #059669); color:white; border:none; border-radius:8px; font-weight:800; font-size:13px; cursor:pointer; box-shadow:0 0 10px rgba(16,185,129,0.5);">🎁 Ödülü Al (${q.reward} TL)</button>`;
        } else {
            actionBtn = `<span style="padding:6px 12px; background:rgba(255,255,255,0.05); color:#64748b; border-radius:8px; font-size:12px; font-weight:bold;">${q.current} / ${q.target}</span>`;
        }

        return `
            <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid ${isCompleted && !isClaimed ? '#10b981' : 'rgba(255,255,255,0.08)'}; border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; text-align: left;">
                <div style="flex: 1;">
                    <div style="font-weight: 800; font-size: 14px; color: ${isCompleted ? '#34d399' : '#f8fafc'};">${q.title}</div>
                    <div style="font-size: 12px; color: #94a3b8; margin: 2px 0 6px 0;">${q.desc}</div>
                    <div style="background: rgba(0,0,0,0.4); border-radius: 10px; height: 6px; width: 100%; max-width: 220px; overflow: hidden;">
                        <div style="background: ${isCompleted ? '#10b981' : '#38bdf8'}; width: ${progressPct}%; height: 100%; transition: width 0.3s;"></div>
                    </div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                    <div style="font-size: 13px; font-weight: 900; color: #facc15;">+${q.reward} TL</div>
                    ${actionBtn}
                </div>
            </div>
        `;
    }).join('');
});

// --- 5.4 GECE / GÜNDÜZ MODU ---
let isNightMode = false;
function toggleNightMode() {
    isNightMode = !isNightMode;
    if (typeof bgCache !== 'undefined') bgCache.invalidate();
    const toast = document.getElementById('reactionToast');
    if (toast) {
        toast.innerText = isNightMode ? "🌙 Gece Modu Açıldı" : "☀️ Gündüz Modu Açıldı";
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 2000);
    }
}

// --- 5.5 MASA İÇİ REAKSİYONLAR & TEZAHÜRAT ---
function sendTableReaction(reactionText) {
    if (!window.currentActiveTableId) return;
    if (window.playSound) window.playSound('chatPop');
    socket.emit('tableReaction', { tableId: window.currentActiveTableId, reaction: reactionText });
}

socket.on('showReaction', (data) => {
    if (window.playSound) window.playSound('chatPop');
    const toast = document.getElementById('reactionToast');
    if (toast) {
        toast.innerText = `${data.sender}: ${data.text}`;
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 3000);
    }
});

// --- 5.6 SOSYAL KARAKTER HAREKETLERİ (Çay, Dans, El Salla, Alkış) ---
function triggerPlayerAction(action) {
    socket.emit('playerAction', { action: action });
    if (action === 'tea' && window.playSound) window.playSound('chatPop');
    else if (action === 'clap' && window.playSound) window.playSound('card');
}

socket.on('playerActionUpdate', (data) => {
    if (players[data.id]) {
        players[data.id].action = data.action;
        players[data.id].hasTea = data.hasTea;
    }
});

// --- 5.7 TUR SÜRESİ GERİ SAYIM ÇUBUĞU ---
let turnTimerInterval = null;
function startTurnTimer(durationSec) {
    const container = document.getElementById('turnTimerContainer');
    const bar = document.getElementById('turnTimerBar');
    if (!container || !bar) return;

    container.style.display = 'block';
    bar.style.transition = 'none';
    bar.style.width = '100%';
    bar.style.backgroundColor = '#22c55e';
    bar.classList.remove('timer-urgent-pulse');

    if (turnTimerInterval) clearInterval(turnTimerInterval);

    let start = Date.now();
    let totalMs = (durationSec || 30) * 1000;
    let lastTickSec = -1;

    turnTimerInterval = setInterval(() => {
        let elapsed = Date.now() - start;
        let leftMs = Math.max(0, totalMs - elapsed);
        let leftRatio = Math.max(0, leftMs / totalMs);
        let leftSec = Math.ceil(leftMs / 1000);
        bar.style.width = (leftRatio * 100) + '%';

        if (leftSec <= 7 && leftSec > 0) {
            bar.style.backgroundColor = '#ef4444';
            bar.classList.add('timer-urgent-pulse');
            if (leftSec !== lastTickSec) {
                lastTickSec = leftSec;
                if (window.playSound) window.playSound('tick');
            }
        } else if (leftRatio > 0.5) {
            bar.style.backgroundColor = '#22c55e';
            bar.classList.remove('timer-urgent-pulse');
        } else if (leftRatio > 0.25) {
            bar.style.backgroundColor = '#f59e0b';
            bar.classList.remove('timer-urgent-pulse');
        } else {
            bar.style.backgroundColor = '#ef4444';
        }

        if (leftRatio <= 0) {
            bar.classList.remove('timer-urgent-pulse');
            clearInterval(turnTimerInterval);
            turnTimerInterval = null;
        }
    }, 100);
}

// --- 6. OYUN BAŞLATMA VE LOBİ ---
socket.on('startGame', (gameType) => {
    closeTableSelectModal();
    const modal = document.getElementById('gameModal');
    modal.style.display = 'block';

    // Modalı her açıldığında tekrar ortaya hizala
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.left = '50%';
    modal.style.top = '50%';

    if (gameType === 'billiard') {
        document.getElementById('billiardArea').style.display = 'block';
        document.getElementById('batakArea').style.display = 'none';
        const tavlaArea = document.getElementById('tavlaArea');
        if (tavlaArea) tavlaArea.style.display = 'none';
    } else if (gameType === 'batak') {
        document.getElementById('billiardArea').style.display = 'none';
        document.getElementById('batakArea').style.display = 'block';
        const tavlaArea = document.getElementById('tavlaArea');
        if (tavlaArea) tavlaArea.style.display = 'none';
    } else if (gameType === 'tavla') {
        document.getElementById('billiardArea').style.display = 'none';
        document.getElementById('batakArea').style.display = 'none';
        const tavlaArea = document.getElementById('tavlaArea');
        if (tavlaArea) tavlaArea.style.display = 'block';
    }
    const lobbyBotBtn = document.getElementById('lobbyAddBotBtn');
    if (lobbyBotBtn) lobbyBotBtn.style.display = 'none';
});

socket.on('updateTableLobby', (data) => {
    window.currentActiveTableId = data.tableId;
    document.getElementById('modalStatus').innerText = `Lobi: ${data.name} (${data.count}/${data.min} Oyuncu)`;
    const lobbyBotBtn = document.getElementById('lobbyAddBotBtn');
    if (lobbyBotBtn) {
        lobbyBotBtn.style.display = (data.count < data.min) ? 'inline-block' : 'none';
    }
});

socket.on('gameError', (msg) => {
    const errToast = document.getElementById('errorToast');
    if (errToast) {
        errToast.innerText = msg;
        errToast.style.display = 'block';
        setTimeout(() => { errToast.style.display = 'none'; }, 3500);
    }
    if (typeof showSocialNotificationToast === 'function') {
        showSocialNotificationToast('⚠️', 'Uyarı', msg);
    }
});

function leaveCurrentTable() {
    if (window.leaveTableVoiceChat) window.leaveTableVoiceChat();
    socket.emit('leaveTable');
    window.isSpectating = false;
    window.currentActiveTableId = null;
    const lobbyBotBtn = document.getElementById('lobbyAddBotBtn');
    if (lobbyBotBtn) lobbyBotBtn.style.display = 'none';
    if (turnTimerInterval) { clearInterval(turnTimerInterval); turnTimerInterval = null; }
    const tContainer = document.getElementById('turnTimerContainer');
    if (tContainer) tContainer.style.display = 'none';
    document.getElementById('gameModal').style.display = 'none';
    document.getElementById('billiardArea').style.display = 'none';
    document.getElementById('batakArea').style.display = 'none';
    const tavlaArea = document.getElementById('tavlaArea');
    if (tavlaArea) tavlaArea.style.display = 'none';
    const okeyArea = document.getElementById('okey101Area');
    if (okeyArea) okeyArea.style.display = 'none';
    const banner = document.getElementById('spectatorBanner');
    if (banner) banner.style.display = 'none';
    const bOverlay = document.getElementById('billiardRematchOverlay');
    if (bOverlay) bOverlay.style.display = 'none';
    const batakYazboz = document.getElementById('batakYazbozModal');
    if (batakYazboz) batakYazboz.style.display = 'none';
    const fundsModal = document.getElementById('insufficientFundsModal');
    if (fundsModal) fundsModal.style.display = 'none';
}

socket.on('insufficientFundsWarning', (data) => {
    const modal = document.getElementById('insufficientFundsModal');
    const msgEl = document.getElementById('insufficientFundsMsg');
    if (msgEl && data && data.message) {
        msgEl.innerText = data.message;
    }
    if (modal) modal.style.display = 'flex';
    if (window.playSound) window.playSound('denied');
});

function closeInsufficientFundsModal() {
    const modal = document.getElementById('insufficientFundsModal');
    if (modal) modal.style.display = 'none';
    leaveCurrentTable();
}
window.closeInsufficientFundsModal = closeInsufficientFundsModal;

function goToFreeTables() {
    const modal = document.getElementById('insufficientFundsModal');
    if (modal) modal.style.display = 'none';
    leaveCurrentTable();
    if (typeof showSocialNotificationToast === 'function') {
        showSocialNotificationToast('🆓', 'Ücretsiz Masalar', 'Masa menüsünden 0 TL bahisli ücretsiz masaları seçebilirsiniz.');
    }
}
window.goToFreeTables = goToFreeTables;


// --- 7. MOUSE VE HOVER TAKİBİ (SIFIR LAYOUT THRASHING) ---
let canvasMouseX = -1, canvasMouseY = -1;
let hoveredTableId = null;
let cachedCanvasRect = null;

function updateCanvasRect() {
    if (canvas) cachedCanvasRect = canvas.getBoundingClientRect();
}
window.addEventListener('resize', updateCanvasRect);
window.addEventListener('scroll', updateCanvasRect, { passive: true });
window.addEventListener('orientationchange', updateCanvasRect);

canvas.addEventListener('mousemove', (e) => {
    if (!cachedCanvasRect) updateCanvasRect();
    let rect = cachedCanvasRect;
    canvasMouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    canvasMouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (currentRoom === 'sahil') {
        let isVendorHover = (canvasMouseX >= 90 && canvasMouseX <= 175 && canvasMouseY >= 145 && canvasMouseY <= 235);
        let isBarHover = (canvasMouseX >= 645 && canvasMouseX <= 785 && canvasMouseY >= 385 && canvasMouseY <= 475);
        let isWaterHover = (canvasMouseX < 560 || canvasMouseY < 320);
        let isExitHover = (canvasMouseX >= canvas.width - 66 && canvasMouseY >= 210 && canvasMouseY <= 310);
        if (isVendorHover || isBarHover || isWaterHover || isExitHover) {
            canvas.style.cursor = 'pointer';
        } else {
            canvas.style.cursor = 'default';
        }
    } else if (currentRoom === 'nargile_cafe') {
        let isOverTekli = (canvasMouseX >= 145 && canvasMouseX <= 365 && canvasMouseY >= 160 && canvasMouseY <= 360);
        let isOverEsli = (canvasMouseX >= 435 && canvasMouseX <= 655 && canvasMouseY >= 160 && canvasMouseY <= 360);
        let isOverExit = (canvasMouseX >= canvas.width / 2 - 45 && canvasMouseX <= canvas.width / 2 + 45 && canvasMouseY >= canvas.height - 75 && canvasMouseY <= canvas.height - 5);
        let isOverKitchen = (canvasMouseX >= canvas.width - 115 && canvasMouseX <= canvas.width - 10 && canvasMouseY >= canvas.height - 75 && canvasMouseY <= canvas.height - 5);
        let isOverSolLoca = (canvasMouseX >= 25 && canvasMouseX <= 215 && canvasMouseY >= 50 && canvasMouseY <= 175);
        let isOverSagLoca = (canvasMouseX >= 585 && canvasMouseX <= 775 && canvasMouseY >= 50 && canvasMouseY <= 175);
        if (isOverTekli || isOverEsli || isOverExit || isOverKitchen || isOverSolLoca || isOverSagLoca) {
            canvas.style.cursor = 'pointer';
        } else {
            canvas.style.cursor = 'default';
        }
    } else if (currentRoom === 'market') {
        canvas.style.cursor = 'pointer';
    }
});

canvas.addEventListener('mouseleave', () => {
    canvasMouseX = -1;
    canvasMouseY = -1;
    canvas.style.cursor = 'default';
});

// Kafedeki masaların koordinatları (Blackjack yeni kumarhaneye taşındı, ferah salon düzeni)
const cafeTables = [
    { id: 'billiard', x: 45, y: 110, w: 175, h: 100, name: '8-Ball Bilardo' },
    { id: 'tavla', x: 45, y: 300, w: 175, h: 100, name: 'Geleneksel Tavla' },
    { id: 'batak', x: 590, y: 85, w: 135, h: 100, name: 'Gömmeli Batak' },
    { id: 'batak4', x: 590, y: 250, w: 135, h: 100, name: 'Normal Batak' }
];

// Dedenin Yeri Kumarhanesindeki Canlı Masalar
const casinoTables = [
    { id: 'blackjack', x: 310, y: 155, w: 180, h: 135, name: 'Canlı Blackjack 21' }
];

// Akıcı Tap-to-Walk ve Dokunma Efektleri
let targetWalkPos = null;
let tapRipples = [];
let lastCanvasTapTime = 0;

// --- 7.5 KOLTUĞA, SANDALYEYE, TABUREYE VE BANKA OTURMA MEKANİĞİ ---
function sitPlayerAt(seatX, seatY, facing = 'down') {
    if (!players[myId]) return;
    myFacing = facing;
    players[myId].x = seatX;
    players[myId].y = seatY;
    players[myId].facing = facing;
    players[myId].action = 'sitting';
    keys.w = false; keys.a = false; keys.s = false; keys.d = false;
    targetWalkPos = null;
    socket.emit('playerMovement', { x: seatX, y: seatY, facing: facing });
    socket.emit('playerAction', { action: 'sitting' });
    if (typeof showFloatingIcon === 'function') {
        showFloatingIcon(myId, '🛋️');
    }

    // Nargile mekanında koltuğa oturunca sunucuya bildir ve menüyü aç
    if (currentRoom === 'nargile_cafe') {
        let tId = null, sIdx = 0;
        // Sol Üst Loca Koltukları (x: 30..220, y: 55..170)
        if (seatX <= 220 && seatY <= 170) {
            tId = 'lounge_sol';
            sIdx = (seatY < 100 ? (seatX < 135 ? 0 : 1) : (seatY < 135 ? 2 : 3));
            socket.emit('nargile_sit_table', { tableId: tId, seatIndex: sIdx });
            if (typeof window.checkAndOpenNargileMenu === 'function') {
                window.checkAndOpenNargileMenu(tId);
            }
        }
        // Sağ Üst Loca Koltukları (x: 585..775, y: 55..170)
        else if (seatX >= 585 && seatY <= 170) {
            tId = 'lounge_sag';
            sIdx = (seatY < 100 ? (seatX < 670 ? 0 : 1) : (seatY < 135 ? 2 : 3));
            socket.emit('nargile_sit_table', { tableId: tId, seatIndex: sIdx });
            if (typeof window.checkAndOpenNargileMenu === 'function') {
                window.checkAndOpenNargileMenu(tId);
            }
        }
        // NOT: 101 Okey masalarına oturunca nargile menüsü AÇILMAZ! 101 masaları sadece oyun içindir.
    }
}

function standUpIfSitting(intendedDir = null) {
    if (!players[myId]) return;
    let p = players[myId];
    if (p.action === 'sitting') {
        p.action = null;
        socket.emit('playerAction', { action: 'stand' });
        if (currentRoom === 'nargile_cafe') {
            socket.emit('nargile_stand_table');
        }

        // Koltuktan/sandalyeden kalkarken katı çarpışma kutusunun dışına güvenli adım at
        let stepDist = 32;
        let testDirs = [];
        if (intendedDir === 'up') testDirs = [{ dx: 0, dy: -stepDist }, { dx: 0, dy: stepDist }, { dx: -stepDist, dy: 0 }, { dx: stepDist, dy: 0 }];
        else if (intendedDir === 'left') testDirs = [{ dx: -stepDist, dy: 0 }, { dx: 0, dy: stepDist }, { dx: stepDist, dy: 0 }, { dx: 0, dy: -stepDist }];
        else if (intendedDir === 'right') testDirs = [{ dx: stepDist, dy: 0 }, { dx: 0, dy: stepDist }, { dx: -stepDist, dy: 0 }, { dx: 0, dy: -stepDist }];
        else if (intendedDir === 'down') testDirs = [{ dx: 0, dy: stepDist }, { dx: -stepDist, dy: 0 }, { dx: stepDist, dy: 0 }, { dx: 0, dy: -stepDist }];
        else testDirs = [{ dx: 0, dy: stepDist }, { dx: 0, dy: -stepDist }, { dx: -stepDist, dy: 0 }, { dx: stepDist, dy: 0 }];

        let foundSafe = false;
        for (let td of testDirs) {
            let tx = p.x + td.dx;
            let ty = p.y + td.dy;
            if (!checkWorldCollision(tx, ty)) {
                p.x = tx;
                p.y = ty;
                foundSafe = true;
                break;
            }
        }
        if (!foundSafe) {
            for (let d of [24, 38, 48, 58]) {
                for (let td of testDirs) {
                    let scale = d / stepDist;
                    let tx = Math.round(p.x + td.dx * scale);
                    let ty = Math.round(p.y + td.dy * scale);
                    if (!checkWorldCollision(tx, ty)) {
                        p.x = tx;
                        p.y = ty;
                        foundSafe = true;
                        break;
                    }
                }
                if (foundSafe) break;
            }
        }

        socket.emit('playerMovement', { x: p.x, y: p.y, facing: myFacing });
    }
}

// --- 7.6 YAKINDAKİ KOLTUK, SANDALYE VEYA BANKI TESPİT ETME VE E TUŞU İLE OTURMA ---
// Fonksiyonlar ve koltuk listeleri modüler public/js/seatRegistry.js dosyasında yüksek performanslı ve sıfır-tahsisli olarak çalışır.
// Geriye dönük uyumluluk güvencesi:
var findNearestSittableSeat = (typeof window.findNearestSittableSeat === 'function') 
    ? window.findNearestSittableSeat 
    : function() { return null; };

var checkAndSitOnNearestFurnitureOrChair = (typeof window.checkAndSitOnNearestFurnitureOrChair === 'function') 
    ? window.checkAndSitOnNearestFurnitureOrChair 
    : function() { return false; };


// Eski click fonksiyonu geriye dönük uyumluluk için güvenli no-op / kontrol
function checkAndSitOnFurnitureOrChair(clickX, clickY) {
    return false;
}

function handleCanvasTapOrClick(clickX, clickY) {
    if (window.wasFurnitureDragged) {
        window.wasFurnitureDragged = false;
        return;
    }
    let now = Date.now();
    if (now - lastCanvasTapTime < 140) return;
    lastCanvasTapTime = now;

    // 1. ÖNCELİK: Başka bir oyuncunun üzerine tıklama kontrolü (Sosyal Etkileşim Menüsü)
    let clickedOtherPlayer = null;
    for (let id in players) {
        if (id === myId) continue;
        let p = players[id];
        let dist = Math.hypot(clickX - p.x, clickY - p.y);
        if (dist <= 26) {
            clickedOtherPlayer = { id, player: p };
            break;
        }
    }
    if (clickedOtherPlayer) {
        if (typeof openPlayerInteractionModal === 'function') {
            openPlayerInteractionModal(clickedOtherPlayer.id, clickedOtherPlayer.player);
        }
        return;
    }

    // 2. ÖNCELİK: Kendi üzerine tıklayarak oturuyorsa ayağa kalkma
    if (players[myId] && players[myId].action === 'sitting') {
        let myDist = Math.hypot(clickX - players[myId].x, clickY - players[myId].y);
        if (myDist <= 28) {
            standUpIfSitting();
            return;
        }
    }

    // NOT: Eşyaya tıklayarak oturma kaldırıldı! Eşya düzenlerken ışınlanma engellendi. Oturma 'E' tuşu ile yapılır.

    if (currentRoom === "kafe") {
        // Çıkış kapısına tıklama (Ortada - Sokak Kapısı)
        if (clickX >= canvas.width / 2 - 45 && clickX <= canvas.width / 2 + 45 && clickY >= canvas.height - 75 && clickY <= canvas.height - 5) {
            changeRoom('sokak');
            return;
        }

        // Çay Ocağı Tezgahına tıklama (10 TL çay al)
        if (clickX >= 20 && clickX <= 250 && clickY >= 15 && clickY <= 65) {
            triggerPlayerAction('tea');
            return;
        }

        let clickedTable = false;
        cafeTables.forEach(obj => {
            if (clickX >= obj.x && clickX <= obj.x + obj.w && clickY >= obj.y && clickY <= obj.y + obj.h) {
                clickedTable = true;
                if (obj.id === 'blackjack') {
                    if (typeof openBlackjackModal === 'function') openBlackjackModal();
                } else {
                    socket.emit('requestTableOptions', obj.id);
                }
            }
        });
        if (clickedTable) return;
    } else if (currentRoom === "ganyan") {
        // Çıkış kapısı (Ortada - Cadde kapısı)
        if (clickX >= canvas.width / 2 - 45 && clickX <= canvas.width / 2 + 45 && clickY >= canvas.height - 75 && clickY <= canvas.height - 5) {
            changeRoom('cadde');
            return;
        }
        if (clickX >= 20 && clickX <= 265 && clickY >= 248 && clickY <= 435) {
            if (typeof openGanyanKuponModal === 'function') openGanyanKuponModal();
            return;
        }
        if (clickX >= 525 && clickX <= 780 && clickY >= 245 && clickY <= 445) {
            if (typeof openHorseRentalModal === 'function') openHorseRentalModal();
            return;
        }
    } else if (currentRoom === "sahil") {
        // Sağa doğru çıkış (Sokak / Şehir Yolu)
        if (clickX >= canvas.width - 66 && clickY >= 210 && clickY <= 310) {
            changeRoom('sokak');
            return;
        }
        // Köprünün En Solundaki Kuğu Bisikletçiye Tıklama
        if (clickX >= 90 && clickX <= 175 && clickY >= 145 && clickY <= 235) {
            handleRentSwanBoat();
            return;
        }
        // Tropik Sahil Barına Tıklama (Kokteyl Menüsü)
        if (clickX >= 645 && clickX <= 785 && clickY >= 385 && clickY <= 475) {
            if (typeof openCocktailBarModal === 'function') openCocktailBarModal();
            return;
        }
        // Su veya İskele alanına tıklandığında balık tutmayı tetikle
        if (clickX < 560 || clickY < 320) {
            triggerFishing();
            return;
        }
    } else if (currentRoom === "sokak") {
        // Sola doğru çıkış (Sahil / Plaj)
        if (clickX <= 66 && clickY >= 235 && clickY <= 315) {
            changeRoom('sahil');
            return;
        }
        // Sağa doğru çıkış (Yeni Cadde - Ganyan & Casino)
        if (clickX >= canvas.width - 66 && clickY >= 235 && clickY <= 315) {
            changeRoom('cadde');
            return;
        }
        // 🏠 Emlakçı Dükkanına Tıklama (Cadde'deki Emlak Ofisi'ne Yönlendir)
        if (clickX >= 20 && clickX <= 235 && clickY >= 10 && clickY <= 115) {
            changeRoom('emlakci');
            return;
        }
        // ☕ Kafe & Oyun Salonu Kapısına Tıklama
        if (clickX >= 260 && clickX <= 540 && clickY >= 10 && clickY <= 115) {
            changeRoom('kafe');
            return;
        }
        // 💨 Nargile Cafe Kapısına Tıklama
        if (clickX >= 560 && clickX <= 780 && clickY >= 10 && clickY <= 115) {
            changeRoom('nargile_cafe');
            return;
        }
        // 🏢 Konutlar & Apartman Kapısına Tıklama (SADECE KENDİ VE ARKADAŞLARININ EVLERİ)
        if (clickX >= 20 && clickX <= 250 && clickY >= 335 && clickY <= 470) {
            if (typeof openHousingPortalModal === 'function') openHousingPortalModal();
            return;
        }
        // 📢 Açık Hava Reklam Panosu (Konutlar ile Mobilya Marketi Arası)
        if (clickX >= 270 && clickX <= 530 && clickY >= 335 && clickY <= 470) {
            if (typeof openBillboardAdModal === 'function') openBillboardAdModal();
            return;
        }
        // 🛒 Mobilya Marketi Kapısına Tıklama
        if (clickX >= 550 && clickX <= 780 && clickY >= 335 && clickY <= 470) {
            changeRoom('market');
            return;
        }
    } else if (currentRoom === "cadde") {
        // Sola doğru çıkış (Sokak / Meydan)
        if (clickX <= 66 && clickY >= 140 && clickY <= 315) {
            changeRoom('sokak');
            return;
        }
        // Ganyan Bayii Cephesine / Kapısına Tıklama (x: 90..390)
        if (clickX >= 90 && clickX <= 390 && clickY >= 12 && clickY <= 125) {
            changeRoom('ganyan');
            return;
        }
        // Dedenin Yeri Casino Cephesine / Kapısına Tıklama (x: 440..740)
        if (clickX >= 440 && clickX <= 740 && clickY >= 12 && clickY <= 125) {
            changeRoom('dedenin_yeri');
            return;
        }
        // 📢 Cadde Açık Hava Reklam Panosu (x: 470..730, y: 345..470)
        if (clickX >= 465 && clickX <= 735 && clickY >= 335 && clickY <= 470) {
            if (typeof openBillboardAdModal === 'function') openBillboardAdModal();
            return;
        }
    } else if (currentRoom === "emlakci") {
        // Çıkış Kapısına Tıklama (Ortada - Meydan Kapısı)
        if (clickX >= canvas.width / 2 - 45 && clickX <= canvas.width / 2 + 45 && clickY >= canvas.height - 75 && clickY <= canvas.height - 5) {
            changeRoom('sokak');
            return;
        }
        // Satış Danışmanı Mert Bey & Bankosu
        if (clickX >= 310 && clickX <= 490 && clickY >= 65 && clickY <= 145) {
            if (typeof openRealEstateModal === 'function') openRealEstateModal();
            return;
        }
        // Maket 1: Standart Şehir Dairesi
        if (clickX >= 85 && clickX <= 255 && clickY >= 210 && clickY <= 360) {
            if (typeof openMaketInspectModal === 'function') openMaketInspectModal('standart');
            return;
        }
        // Maket 2: Verandalı Bahçeli Ev
        if (clickX >= 315 && clickX <= 485 && clickY >= 210 && clickY <= 360) {
            if (typeof openMaketInspectModal === 'function') openMaketInspectModal('garden');
            return;
        }
        // Maket 3: Havuzlu Villa
        if (clickX >= 545 && clickX <= 715 && clickY >= 210 && clickY <= 360) {
            if (typeof openMaketInspectModal === 'function') openMaketInspectModal('pool');
            return;
        }
    } else if (currentRoom === "dedenin_yeri") {
        // Çıkış Kapısına Tıklama (Ortada - Cadde Kapısı)
        if (clickX >= canvas.width / 2 - 45 && clickX <= canvas.width / 2 + 45 && clickY >= canvas.height - 75 && clickY <= canvas.height - 5) {
            changeRoom('cadde');
            return;
        }
        // 777 Slot Makinelerine Tıklama (Sol Duvar)
        if (clickX >= 25 && clickX <= 185 && clickY >= 115 && clickY <= 195) {
            if (typeof openSlotModal === 'function') openSlotModal();
            return;
        }
        // VIP Rulet Masasına Tıklama (Sağ Duvar)
        if (clickX >= 625 && clickX <= 775 && clickY >= 125 && clickY <= 235) {
            if (typeof openRouletteModal === 'function') openRouletteModal();
            return;
        }
        // Canlı Blackjack Masasına Tıklama (Orta)
        let t = casinoTables[0];
        if (clickX >= t.x && clickX <= t.x + t.w && clickY >= t.y && clickY <= t.y + t.h) {
            if (typeof openBlackjackModal === 'function') openBlackjackModal();
            return;
        }
    } else if (currentRoom === "nargile_cafe") {
        // 1. Mutfak Kapısına Tıklama (En Sağ Altta - Sadece Görevliler Girebilir)
        if (clickX >= canvas.width - 115 && clickX <= canvas.width - 10 && clickY >= canvas.height - 75 && clickY <= canvas.height - 5) {
            if (typeof window.showKitchenStaffOnlyNotice === 'function') {
                window.showKitchenStaffOnlyNotice();
            }
            return;
        }

        // 2. Sol Üst ve Sağ Üst Nargile Localarına Tıklama (Menüyü Aç)
        if (clickX >= 25 && clickX <= 215 && clickY >= 50 && clickY <= 175) {
            if (typeof window.checkAndOpenNargileMenu === 'function') {
                window.checkAndOpenNargileMenu('lounge_sol');
            }
            return;
        }
        if (clickX >= 585 && clickX <= 775 && clickY >= 50 && clickY <= 175) {
            if (typeof window.checkAndOpenNargileMenu === 'function') {
                window.checkAndOpenNargileMenu('lounge_sag');
            }
            return;
        }

        // 3. Koltuklara Tıklayarak Oturma
        let nargileSeats = [
            // Sol Üst Nargile Locası Koltukları
            { x: 110, y: 84, facing: 'down', tableId: 'lounge_sol', seatIndex: 0 },
            { x: 155, y: 84, facing: 'down', tableId: 'lounge_sol', seatIndex: 1 },
            { x: 54, y: 115, facing: 'right', tableId: 'lounge_sol', seatIndex: 2 },
            { x: 54, y: 148, facing: 'right', tableId: 'lounge_sol', seatIndex: 3 },
            // Sağ Üst Nargile Locası Koltukları
            { x: 645, y: 84, facing: 'down', tableId: 'lounge_sag', seatIndex: 0 },
            { x: 690, y: 84, facing: 'down', tableId: 'lounge_sag', seatIndex: 1 },
            { x: 746, y: 115, facing: 'left', tableId: 'lounge_sag', seatIndex: 2 },
            { x: 746, y: 148, facing: 'left', tableId: 'lounge_sag', seatIndex: 3 },
            // Sol 101 Okey Sandalyeleri
            { x: 255, y: 155, facing: 'down', tableId: 'okey101_tekli', seatIndex: 0 },
            { x: 370, y: 242, facing: 'left', tableId: 'okey101_tekli', seatIndex: 1 },
            { x: 255, y: 330, facing: 'up', tableId: 'okey101_tekli', seatIndex: 2 },
            { x: 140, y: 242, facing: 'right', tableId: 'okey101_tekli', seatIndex: 3 },
            // Sağ 101 Okey Sandalyeleri
            { x: 545, y: 155, facing: 'down', tableId: 'okey101', seatIndex: 0 },
            { x: 660, y: 242, facing: 'left', tableId: 'okey101', seatIndex: 1 },
            { x: 545, y: 330, facing: 'up', tableId: 'okey101', seatIndex: 2 },
            { x: 430, y: 242, facing: 'right', tableId: 'okey101', seatIndex: 3 }
        ];
        for (let seat of nargileSeats) {
            if (Math.hypot(clickX - seat.x, clickY - seat.y) <= 32) {
                sitPlayerAt(seat.x, seat.y, seat.facing);
                return;
            }
        }

        // 4. 101 Masalarına Tıklama -> 101 OKEY Oyun Masasını Aç (Nargile Menüsü Değil!)
        if (clickX >= 145 && clickX <= 365 && clickY >= 155 && clickY <= 355) {
            socket.emit('requestTableOptions', 'okey101_tekli');
            return;
        }
        if (clickX >= 435 && clickX <= 655 && clickY >= 155 && clickY <= 355) {
            socket.emit('requestTableOptions', 'okey101');
            return;
        }
        // Çıkış Kapısına Tıklama (Ortada - Sokak Kapısı)
        if (clickX >= canvas.width / 2 - 45 && clickX <= canvas.width / 2 + 45 && clickY >= canvas.height - 75 && clickY <= canvas.height - 5) {
            changeRoom('sokak');
            return;
        }
    } else if (currentRoom === "market") {
        // Çıkış Kapısına Tıklama (Orta Alt)
        if (clickX >= canvas.width / 2 - 40 && clickX <= canvas.width / 2 + 40 && clickY >= canvas.height - 75 && clickY <= canvas.height - 10) {
            changeRoom('sokak');
            return;
        }
        // Mağazadaki tezgaha, raflara veya teşhirdeki mobilyalara tıklandığında mobilya marketini aç
        if (typeof openFurnitureMarketModal === 'function') {
            openFurnitureMarketModal();
            return;
        }
    } else if (currentRoom.startsWith("house_")) {
        // Ev Çıkış Kapısı (Sol Altta)
        if (clickX >= 15 && clickX <= 75 && clickY >= canvas.height - 75 && clickY <= canvas.height - 10) {
            if (window.isHouseEditMode) {
                warnHouseEditActive();
                return;
            }
            if (currentRoom.startsWith("house_ornek_")) {
                if (typeof exitHouseTour === 'function') exitHouseTour();
                else changeRoom('emlakci');
            } else {
                changeRoom('sokak');
            }
            return;
        }
    }

    // Tıkladığın yere gitme özelliği kaldırıldı (Karakter sadece tuşlar ve kumanda ile hareket eder)
    targetWalkPos = null;
}

canvas.addEventListener('click', (e) => {
    if (!cachedCanvasRect) updateCanvasRect();
    let rect = cachedCanvasRect;
    let clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
    let clickY = (e.clientY - rect.top) * (canvas.height / rect.height);
    handleCanvasTapOrClick(clickX, clickY);
});

canvas.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches.length === 1) {
        let t = e.touches[0];
        if (!cachedCanvasRect) updateCanvasRect();
        let rect = cachedCanvasRect;
        let clickX = (t.clientX - rect.left) * (canvas.width / rect.width);
        let clickY = (t.clientY - rect.top) * (canvas.height / rect.height);
        handleCanvasTapOrClick(clickX, clickY);
    }
}, { passive: true });

// --- 8. WASD VE YÖN KONTROLLERİ ---
let myFacing = 'down';
let walkCycle = 0;

// Alt+Tab veya pencere odak kaybında tuş takılmasını (Sticky Keys) önleme
window.addEventListener('blur', () => {
    keys.w = false;
    keys.a = false;
    keys.s = false;
    keys.d = false;
    targetWalkPos = null;
});

window.addEventListener('keydown', (e) => {
    let activeTag = document.activeElement ? document.activeElement.tagName : '';
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag) || document.activeElement?.isContentEditable) return;

    // Aktif oyun masası veya tam ekran pencereler açıkken arka planda karakterin yürümesini engelle
    let gameModal = document.getElementById('gameModal');
    if (gameModal && gameModal.style.display === 'flex') return;
    let wardrobeModal = document.getElementById('wardrobeModal');
    if (wardrobeModal && wardrobeModal.style.display === 'flex') return;
    let ganyanModal = document.getElementById('ganyanKuponModal');
    if (ganyanModal && ganyanModal.style.display === 'flex') return;

    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') { myFacing = 'up'; standUpIfSitting('up'); keys.w = true; targetWalkPos = null; }
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') { myFacing = 'left'; standUpIfSitting('left'); keys.a = true; targetWalkPos = null; }
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') { myFacing = 'down'; standUpIfSitting('down'); keys.s = true; targetWalkPos = null; }
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') { myFacing = 'right'; standUpIfSitting('right'); keys.d = true; targetWalkPos = null; }
    if (e.key === 'e' || e.key === 'E') { triggerMobileInteract(); }
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.w = false;
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.a = false;
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.s = false;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.d = false;
});

function setKey(dir, isPressed) {
    keys[dir] = isPressed;
    if (isPressed) {
        let dirName = dir === 'w' ? 'up' : (dir === 's' ? 'down' : (dir === 'a' ? 'left' : 'right'));
        myFacing = dirName;
        standUpIfSitting(dirName);
        targetWalkPos = null;
    }
}

function handleTouchKey(dir, isPressed, event) {
    if (event && event.cancelable) event.preventDefault();
    if (isPressed && typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(10); } catch (e) { }
    }
    setKey(dir, isPressed);
}

// Mobil Etkileşim ("E" Tuşu) İşlevi
function triggerMobileInteract() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(20); } catch (e) { }
    }
    if (!players[myId]) return;
    let p = players[myId];

    // 1. Zaten oturuyorsa E tuşuna basınca AYAĞA KALK
    if (p.action === 'sitting') {
        standUpIfSitting();
        return;
    }

    // 2. Bir koltuk/sandalye/sedir/bank yakınındaysa E tuşu ile OTUR
    if (checkAndSitOnNearestFurnitureOrChair()) {
        return;
    }

    if (currentRoom === "kafe") {
        let distExit = Math.hypot(p.x - (canvas.width / 2), p.y - (canvas.height - 35));
        if (distExit < 75) {
            changeRoom('sokak');
            return;
        }

        if (p.x >= 20 && p.x <= 260 && p.y <= 120) {
            triggerPlayerAction('tea');
            return;
        }
        let nearest = null;
        let minDist = 120;
        cafeTables.forEach(t => {
            let cx = t.x + t.w / 2;
            let cy = t.y + t.h / 2;
            let dist = Math.hypot(p.x - cx, p.y - cy);
            if (dist < minDist) {
                minDist = dist;
                nearest = t;
            }
        });
        if (nearest) {
            if (nearest.id === 'blackjack') {
                if (typeof openBlackjackModal === 'function') openBlackjackModal();
            } else {
                socket.emit('requestTableOptions', nearest.id);
            }
            return;
        }
    } else if (currentRoom === "ganyan") {
        let distExit = Math.hypot(p.x - (canvas.width / 2), p.y - (canvas.height - 35));
        if (distExit < 75) {
            changeRoom('cadde');
            return;
        }
        let distTjk = Math.hypot(p.x - 140, p.y - 300);
        let distStable = Math.hypot(p.x - 650, p.y - 350);
        if (distTjk < 120) {
            if (typeof openGanyanKuponModal === 'function') openGanyanKuponModal();
            return;
        }
        if (distStable < 120) {
            if (typeof openHorseRentalModal === 'function') openHorseRentalModal();
            return;
        }
    } else if (currentRoom === "nargile_cafe") {
        let distTekli = Math.hypot(p.x - 255, p.y - 242);
        let distEsli = Math.hypot(p.x - 545, p.y - 242);
        if (distTekli < 130) {
            socket.emit('requestTableOptions', 'okey101_tekli');
            return;
        }
        if (distEsli < 130) {
            socket.emit('requestTableOptions', 'okey101');
            return;
        }
        let distExit = Math.hypot(p.x - (canvas.width / 2), p.y - (canvas.height - 35));
        if (distExit < 75) {
            changeRoom('sokak');
            return;
        }
    } else if (currentRoom === "sahil") {
        if (p.x >= canvas.width - 66 && p.y >= 180 && p.y <= 360) {
            changeRoom('sokak');
            return;
        }
        let distSwan = Math.hypot(p.x - 135, p.y - 188);
        if (distSwan < 85) {
            handleRentSwanBoat();
            return;
        }
        let distBar = Math.hypot(p.x - 715, p.y - 425);
        if (distBar < 95) {
            if (typeof openCocktailBarModal === 'function') openCocktailBarModal();
            return;
        }
        triggerFishing();
        return;
    } else if (currentRoom === "sokak") {
        if (p.x <= 66 && p.y >= 180 && p.y <= 330) {
            changeRoom('sahil');
            return;
        }
        if (p.x >= canvas.width - 66 && p.y >= 180 && p.y <= 330) {
            changeRoom('cadde');
            return;
        }
        if (p.x <= 235 && p.y <= 120) {
            changeRoom('emlakci');
            return;
        }
        if (p.x >= 260 && p.x <= 540 && p.y <= 120) {
            changeRoom('kafe');
            return;
        }
        if (p.x >= 560 && p.y <= 120) {
            changeRoom('nargile_cafe');
            return;
        }
        if (p.x <= 250 && p.y >= 335) {
            if (typeof openHousingPortalModal === 'function') openHousingPortalModal();
            return;
        }
        if (p.x >= 270 && p.x <= 530 && p.y >= 335) {
            if (typeof openBillboardAdModal === 'function') openBillboardAdModal();
            return;
        }
        if (p.x >= 550 && p.y >= 335) {
            changeRoom('market');
            return;
        }
    } else if (currentRoom === "cadde") {
        if (p.x <= 66 && p.y >= 140 && p.y <= 330) {
            changeRoom('sokak');
            return;
        }
        if (p.x >= 90 && p.x <= 390 && p.y <= 135) {
            changeRoom('ganyan');
            return;
        }
        if (p.x >= 440 && p.x <= 740 && p.y <= 135) {
            changeRoom('dedenin_yeri');
            return;
        }
        if (p.x >= 465 && p.x <= 735 && p.y >= 335) {
            if (typeof openBillboardAdModal === 'function') openBillboardAdModal();
            return;
        }
    } else if (currentRoom === "emlakci") {
        let distExit = Math.hypot(p.x - (canvas.width / 2), p.y - (canvas.height - 35));
        if (distExit < 75) {
            changeRoom('sokak');
            return;
        }
        if (Math.hypot(p.x - 400, p.y - 135) < 95) {
            if (typeof openRealEstateModal === 'function') openRealEstateModal();
            return;
        }
        if (Math.hypot(p.x - 170, p.y - 280) < 95) {
            if (typeof openMaketInspectModal === 'function') openMaketInspectModal('standart');
            return;
        }
        if (Math.hypot(p.x - 400, p.y - 280) < 95) {
            if (typeof openMaketInspectModal === 'function') openMaketInspectModal('garden');
            return;
        }
        if (Math.hypot(p.x - 630, p.y - 280) < 95) {
            if (typeof openMaketInspectModal === 'function') openMaketInspectModal('pool');
            return;
        }
    } else if (currentRoom === "dedenin_yeri") {
        let distExit = Math.hypot(p.x - (canvas.width / 2), p.y - (canvas.height - 35));
        if (distExit < 75) {
            changeRoom('cadde');
            return;
        }
        // Slot makinelerine yakınlık (Sol: x: 105, y: 155)
        if (Math.hypot(p.x - 105, p.y - 155) < 120) {
            if (typeof openSlotModal === 'function') openSlotModal();
            return;
        }
        // Rulet masasına yakınlık (Sağ: x: 700, y: 180)
        if (Math.hypot(p.x - 700, p.y - 180) < 120) {
            if (typeof openRouletteModal === 'function') openRouletteModal();
            return;
        }
        // Blackjack masası
        let t = casinoTables[0];
        let cx = t.x + t.w / 2;
        let cy = t.y + t.h / 2;
        if (Math.hypot(p.x - cx, p.y - cy) < 130) {
            if (typeof openBlackjackModal === 'function') openBlackjackModal();
            return;
        }
    } else if (currentRoom === "market") {
        if (p.x >= 520 && p.y <= 170) {
            if (typeof openFurnitureMarketModal === 'function') openFurnitureMarketModal();
            return;
        }
        if (p.y >= canvas.height - 90) {
            changeRoom('sokak');
            return;
        }
    } else if (currentRoom.startsWith("house_")) {
        if (p.x <= 90 && p.y >= canvas.height - 90) {
            if (window.isHouseEditMode) {
                warnHouseEditActive();
                return;
            }
            if (currentRoom.startsWith("house_ornek_")) {
                if (typeof exitHouseTour === 'function') exitHouseTour();
                else changeRoom('emlakci');
            } else {
                changeRoom('sokak');
            }
            return;
        }
    }
}

// Mobil Sanal Kumanda Aç/Kapat Butonu
function toggleMobileDpad() {
    let dpad = document.getElementById('mobileControlsOverlay');
    let actionBtn = document.getElementById('mobileActionBtn');
    if (!dpad) return;
    let isHidden = (dpad.style.display === 'none' || dpad.style.display === '');
    dpad.style.display = isHidden ? 'block' : 'none';
    if (actionBtn) actionBtn.style.display = isHidden ? 'flex' : 'none';
}


// --- 2. ANA OYUN VE ÇİZİM DÖNGÜSÜ (GAME LOOP) ---
// --- 10. ANA OYUN VE ÇİZİM DÖNGÜSÜ (GAME LOOP & AKICI HAREKET SENKRONU) ---
let lastMovementEmitTime = 0;
let lastEmittedX = -9999;
let lastEmittedY = -9999;
let lastEmittedMoving = false;
let lastGameLoopTime = 0;
const MOVEMENT_EMIT_INTERVAL_MS = 38; // ~26 Hz (Ağı şişirmeyen, mükemmel pürüzsüz ağ güncelleme sıklığı)

function gameLoop(timestamp) {
    requestAnimationFrame(gameLoop);
    let now = performance.now();
    let dt = lastGameLoopTime ? Math.min((now - lastGameLoopTime) / 1000, 0.1) : 0.016;
    lastGameLoopTime = now;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Ortamı Çiz
    if (currentRoom === "kafe") {
        drawCafeEnvironment();
    } else if (currentRoom === "sahil") {
        drawBeachEnvironment();
    } else if (currentRoom === "nargile_cafe") {
        drawNargileCafeEnvironment();
    } else if (currentRoom === "market") {
        drawMarketEnvironment();
    } else if (currentRoom === "ganyan") {
        if (typeof drawGanyanEnvironment === 'function') drawGanyanEnvironment();
    } else if (currentRoom === "cadde") {
        if (typeof drawCaddeEnvironment === 'function') drawCaddeEnvironment();
    } else if (currentRoom === "dedenin_yeri") {
        if (typeof drawDedeninYeriEnvironment === 'function') drawDedeninYeriEnvironment();
    } else if (currentRoom === "emlakci") {
        if (typeof drawEmlakciEnvironment === 'function') drawEmlakciEnvironment();
    } else if (currentRoom.startsWith("house_")) {
        if (typeof drawHouseEnvironment === 'function') drawHouseEnvironment();
    } else {
        drawStreetEnvironment();
    }

    // 2. Kendi Oyuncumuzu Hareket Ettir (Normal hız %20 azaltıldı: 2.0; Atlı hız: 5.0 - Hız farkı 2.5 kat belirgin!)
    if (players[myId]) {
        let isMounted = !!(players[myId] && players[myId].hasHorse);
        let speed = isMounted ? 5.0 : 2.0; // Normal hız %20 azaltıldı (2.5 -> 2.0). Atlı hız aynı (5.0)!
        let p = players[myId];
        let isMoving = false;
        let moveDx = 0;
        let moveDy = 0;

        if (keys.w || keys.s || keys.a || keys.d) {
            if (keys.w) moveDy -= speed;
            if (keys.s) moveDy += speed;
            if (keys.a) moveDx -= speed;
            if (keys.d) moveDx += speed;
        }

        // Çapraz yürüyüş hız normalizasyonu (%41 hız fazlalığını eşitler)
        if (moveDx !== 0 && moveDy !== 0) {
            moveDx *= 0.70710678;
            moveDy *= 0.70710678;
        }

        if (moveDx !== 0 || moveDy !== 0) {
            let curDir = keys.w ? 'up' : (keys.s ? 'down' : (keys.a ? 'left' : 'right'));
            standUpIfSitting(curDir);
            isMoving = true;
            let prevWalkCycle = walkCycle;
            walkCycle += isMounted ? 0.35 : 0.16;

            // Ritmik doğal adım sesi (Footsteps SFX)
            if (Math.floor(walkCycle / Math.PI) !== Math.floor(prevWalkCycle / Math.PI)) {
                if (window.playSound) window.playSound('footstep');
            }

            let nextX = p.x + moveDx;
            let nextY = p.y + moveDy;

            let colX = checkWorldCollision(nextX, p.y);
            let colY = checkWorldCollision(p.x, nextY);

            // Eğer oyuncu halihazırda bir mobilya/engel içindeyse (örneğin sandalyeden yeni kalktıysa):
            // Çıkış adımına izin vererek kitlenmeyi tamamen önle
            let isStuckInObstacle = checkWorldCollision(p.x, p.y);
            if (isStuckInObstacle) {
                p.x = nextX;
                p.y = nextY;
            } else {
                if (!colX) p.x = nextX;
                if (!colY) p.y = nextY;
            }
        }

        // Mekanlar Arası Kesintisiz Yürüyerek Geçiş Koridorları (Tüm Mekanlar İçin Seamless Portals)
        if (Date.now() >= roomTransitionCooldownUntil) {
            if (currentRoom === "kafe") {
                if (p.y >= canvas.height - 35 && p.x >= canvas.width / 2 - 45 && p.x <= canvas.width / 2 + 45) {
                    changeRoom('sokak');
                    return;
                }
            } else if (currentRoom === "sokak") {
                if (p.x <= 20 && p.y >= 180 && p.y <= 330) {
                    changeRoom('sahil');
                    return;
                }
                if (p.x >= canvas.width - 20 && p.y >= 180 && p.y <= 330) {
                    changeRoom('cadde');
                    return;
                }
                // Emlakçı kapısından içeri adım atma (Meydan sol üst x: 165..225, y <= 95)
                if (p.x >= 165 && p.x <= 225 && p.y <= 95) {
                    changeRoom('emlakci');
                    return;
                }
            } else if (currentRoom === "cadde") {
                if (p.x <= 20 && p.y >= 140 && p.y <= 330) {
                    changeRoom('sokak');
                    return;
                }
                if (p.x >= 200 && p.x <= 260 && p.y <= 95) {
                    changeRoom('ganyan');
                    return;
                }
                if (p.x >= 550 && p.x <= 610 && p.y <= 95) {
                    changeRoom('dedenin_yeri');
                    return;
                }
            } else if (currentRoom === "emlakci") {
                if (p.y >= canvas.height - 35 && p.x >= canvas.width / 2 - 45 && p.x <= canvas.width / 2 + 45) {
                    changeRoom('sokak');
                    return;
                }
            } else if (currentRoom === "sahil") {
                if (p.x >= canvas.width - 20 && p.y >= 180 && p.y <= 360) {
                    changeRoom('sokak');
                    return;
                }
            } else if (currentRoom === "nargile_cafe") {
                if (p.y >= canvas.height - 35 && p.x >= canvas.width / 2 - 45 && p.x <= canvas.width / 2 + 45) {
                    changeRoom('sokak');
                    return;
                }
            } else if (currentRoom === "ganyan") {
                if (p.y >= canvas.height - 35 && p.x >= canvas.width / 2 - 45 && p.x <= canvas.width / 2 + 45) {
                    changeRoom('cadde');
                    return;
                }
            } else if (currentRoom === "dedenin_yeri") {
                if (p.y >= canvas.height - 35 && p.x >= canvas.width / 2 - 45 && p.x <= canvas.width / 2 + 45) {
                    changeRoom('cadde');
                    return;
                }
            } else if (currentRoom === "market") {
                if (p.y >= canvas.height - 35 && p.x >= canvas.width / 2 - 45 && p.x <= canvas.width / 2 + 45) {
                    changeRoom('sokak');
                    return;
                }
            } else if (currentRoom.startsWith("house_")) {
                if (p.x <= 55 && p.y >= canvas.height - 70) {
                    if (window.isHouseEditMode) {
                        p.x = 65;
                        p.y = canvas.height - 75;
                        if (!window._lastHouseEditWarnTime || Date.now() - window._lastHouseEditWarnTime > 2500) {
                            window._lastHouseEditWarnTime = Date.now();
                            warnHouseEditActive();
                        }
                        return;
                    }
                    if (currentRoom.startsWith("house_ornek_")) {
                        if (typeof exitHouseTour === 'function') exitHouseTour();
                        else changeRoom('emlakci');
                    } else {
                        changeRoom('sokak');
                    }
                    return;
                }
            }
        }

        let minBoundX = (currentRoom === "sokak" || currentRoom === "cadde") ? 12 : 18;
        let maxBoundX = (currentRoom === "sokak" || currentRoom === "sahil") ? canvas.width - 12 : canvas.width - 18;
        p.x = Math.max(minBoundX, Math.min(maxBoundX, p.x));
        p.y = Math.max(38, Math.min(canvas.height - 20, p.y));

        // Ağ Trafiği Throttling & Hassas Sayı Sıkıştırması (Bant Genişliği %40 Tasarruf)
        let posChanged = (Math.abs(p.x - lastEmittedX) > 0.3 || Math.abs(p.y - lastEmittedY) > 0.3);
        if (isMoving) {
            if (posChanged && (now - lastMovementEmitTime >= MOVEMENT_EMIT_INTERVAL_MS)) {
                lastMovementEmitTime = now;
                lastEmittedX = p.x;
                lastEmittedY = p.y;
                lastEmittedMoving = true;
                let emitX = Math.round(p.x * 10) / 10;
                let emitY = Math.round(p.y * 10) / 10;
                socket.emit('playerMovement', { x: emitX, y: emitY, isMoving: true });
            }
        } else if (lastEmittedMoving) {
            // Oyuncu yeni durdu! Son net pozisyonu kesinleştirici paket olarak gönder
            lastMovementEmitTime = now;
            lastEmittedX = p.x;
            lastEmittedY = p.y;
            lastEmittedMoving = false;
            let emitX = Math.round(p.x * 10) / 10;
            let emitY = Math.round(p.y * 10) / 10;
            socket.emit('playerMovement', { x: emitX, y: emitY, isMoving: false });
        }
    }

    // 3. Uzaktaki (Remote) Oyuncuların Yumuşak Delta-Time Lerp Hareketi ve Adım Senkronizasyonu
    let lerpFactor = 1 - Math.exp(-14 * dt); // Monitör yenileme hızından bağımsız pürüzsüz enterpolasyon
    for (let id in players) {
        if (id !== myId) {
            let p = players[id];
            if (p.targetX !== undefined && p.targetY !== undefined) {
                let dx = p.targetX - p.x;
                let dy = p.targetY - p.y;
                let dist = Math.hypot(dx, dy);
                if (dist > 85 || p.action === 'sitting') {
                    // Işınlanma, kapıdan geçiş veya oturma anında duvarlardan kaymayı engelle
                    p.x = p.targetX;
                    p.y = p.targetY;
                    p.isMoving = (p.serverMoving === true);
                } else if (dist > 0.8) {
                    p.x += dx * lerpFactor;
                    p.y += dy * lerpFactor;
                    p.isMoving = true;
                    p.walkCycle = (p.walkCycle || 0) + (13 * dt);
                    if (Math.abs(dx) > Math.abs(dy)) {
                        p.facing = dx > 0 ? 'right' : 'left';
                    } else {
                        p.facing = dy > 0 ? 'down' : 'up';
                    }
                } else {
                    p.x = p.targetX;
                    p.y = p.targetY;
                    p.isMoving = (p.serverMoving === true);
                }
            }
        }
    }

    // 4. Tüm Oyuncuları Derinlik (Y) Sırasına Göre Çiz (Öndeki Oyuncunun Arkadakini Örtmesi Kuralı)
    let sortedPlayers = Object.entries(players).sort((a, b) => {
        let yA = (a[1] && a[1].y !== undefined) ? a[1].y : 0;
        let yB = (b[1] && b[1].y !== undefined) ? b[1].y : 0;
        return yA - yB;
    });
    for (let i = 0; i < sortedPlayers.length; i++) {
        let [id, pObj] = sortedPlayers[i];
        drawAnimatedPlayer(pObj, id);
    }

    if (typeof updateAndRenderFatherPets === 'function') {
        updateAndRenderFatherPets(ctx, dt);
    }

    // 5. Nargile Cafe Yoğun Ekran Dumanı (20. Fırt Felaketi: Tüm ekranı 5 sn kaplayıp kimseyi göstermez)
    if (currentRoom === 'nargile_cafe' && typeof window.drawNargileScreenSmoke === 'function') {
        window.drawNargileScreenSmoke(ctx);
    }

    // 6. Sinematik Mekan Geçiş Kararması / Açılması (Fade Transition)
    if (roomTransitionFadeAlpha > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(15, 23, 42, ${roomTransitionFadeAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        roomTransitionFadeAlpha = Math.max(0, roomTransitionFadeAlpha - dt * 4.5);
    }
}
