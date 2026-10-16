// public/js/adminPanel.js - Yasin Özel Admin ve Moderasyon Paneli Modülü

let allAdminUsers = [];
let adminCurrentMuteTarget = null;
let adminCurrentBanTarget = null;

function openAdminPanel() {
    const modal = document.getElementById('adminPanelModal');
    if (modal) modal.style.display = 'flex';
    switchAdminTab('users');
    if (window.socket) window.socket.emit('adminGetUsers');
}

function closeAdminPanel() {
    const modal = document.getElementById('adminPanelModal');
    if (modal) modal.style.display = 'none';
}

function refreshAdminUsers() {
    if (window.socket) window.socket.emit('adminGetUsers');
}

function switchAdminTab(tab) {
    const uSec = document.getElementById('adminTabUsersSection');
    const aSec = document.getElementById('adminTabAnnounceSection');
    const sSec = document.getElementById('adminTabSanctionsSection');
    const uBtn = document.getElementById('adminTabUsersBtn');
    const aBtn = document.getElementById('adminTabAnnounceBtn');
    const sBtn = document.getElementById('adminTabSanctionsBtn');

    if (uSec) uSec.style.display = (tab === 'users') ? 'block' : 'none';
    if (aSec) aSec.style.display = (tab === 'announce') ? 'block' : 'none';
    if (sSec) sSec.style.display = (tab === 'sanctions') ? 'block' : 'none';

    if (uBtn) {
        uBtn.style.background = (tab === 'users') ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'rgba(30, 41, 59, 0.8)';
        uBtn.style.color = (tab === 'users') ? 'white' : '#cbd5e1';
    }
    if (aBtn) {
        aBtn.style.background = (tab === 'announce') ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(30, 41, 59, 0.8)';
        aBtn.style.color = (tab === 'announce') ? 'white' : '#cbd5e1';
    }
    if (sBtn) {
        sBtn.style.background = (tab === 'sanctions') ? 'linear-gradient(135deg, #ef4444, #991b1b)' : 'rgba(30, 41, 59, 0.8)';
        sBtn.style.color = (tab === 'sanctions') ? 'white' : '#cbd5e1';
    }

    if (tab === 'sanctions') {
        refreshAdminSanctions();
    } else if (tab === 'users') {
        if (window.socket) window.socket.emit('adminGetUsers');
    }
}

function filterAdminUsers() {
    const searchVal = (document.getElementById('adminUserSearchInput')?.value || '').toLowerCase().trim();
    if (!searchVal) {
        renderAdminUsers(allAdminUsers);
        return;
    }
    let filtered = allAdminUsers.filter(u => u.username.toLowerCase().includes(searchVal));
    renderAdminUsers(filtered);
}

function renderAdminUsers(users) {
    const container = document.getElementById('adminUserListContainer');
    if (!container) return;

    if (!users || users.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:25px; font-style:italic;">Şu an oyunda çevrimiçi oyuncu bulunmuyor.</div>`;
        return;
    }

    container.innerHTML = users.map(user => {
        let isMe = (user.username.toLowerCase() === (window.myUsername || '').toLowerCase());
        let isUserAdminAccount = (user.isAdmin || ['yasin', 'maltoroz'].includes(user.username.toLowerCase()));
        let statusBadge = user.isOnline
            ? `<span style="font-size:11px; background:rgba(34,197,94,0.2); color:#4ade80; border:1px solid #22c55e; padding:1px 6px; border-radius:4px; font-weight:700;">🟢 Çevrimiçi</span>`
            : `<span style="font-size:11px; background:rgba(148,163,184,0.2); color:#94a3b8; border:1px solid #64748b; padding:1px 6px; border-radius:4px;">⚪ Çevrimdışı</span>`;

        let locBadge = user.location || "Sokak (Açık Alan)";
        let muteBadge = user.isMuted
            ? `<span style="font-size:11px; background:rgba(234,179,8,0.2); color:#facc15; border:1px solid #eab308; padding:1px 6px; border-radius:4px; font-weight:700;">🔇 Susturuldu (${user.muteMinutesRemaining} dk)</span>`
            : '';

        let sittingBadge = (user.action === 'sitting')
            ? `<span style="font-size:11px; background:rgba(168,85,247,0.2); color:#c084fc; border:1px solid #a855f7; padding:1px 6px; border-radius:4px; font-weight:700;">🛋️ Oturuyor</span>`
            : '';

        return `
        <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.08); padding: 12px 14px; border-radius: 12px; display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
                <div style="min-width: 220px;">
                    <div style="font-weight: 800; font-size: 15px; color: #f8fafc; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        <span>${user.username}</span>
                        ${isUserAdminAccount ? '<span style="font-size:10px; background:#ef4444; color:white; font-weight:800; padding:1px 6px; border-radius:4px;">ADMİN</span>' : ''}
                        ${isMe ? '<span style="font-size:10px; background:#3b82f6; color:white; font-weight:800; padding:1px 6px; border-radius:4px;">SEN</span>' : ''}
                        ${statusBadge}
                        ${muteBadge}
                        ${sittingBadge}
                    </div>
                    <div style="font-size: 12px; color: #38bdf8; font-weight: 700; margin-top: 5px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <span style="color: #94a3b8;">📍 Canlı Konum:</span>
                        <span style="color: #f1f5f9; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.35); padding: 2px 8px; border-radius: 6px; font-weight: 800; font-size: 12px;">
                            ${locBadge}
                        </span>
                        ${user.isFishing ? '<span style="color:#38bdf8; font-size:11px;">🎣 Balık Tutuyor</span>' : ''}
                        ${user.hasTea ? '<span style="color:#f59e0b; font-size:11px;">☕ Çay İçiyor</span>' : ''}
                    </div>
                    <div style="font-size: 13px; color: #facc15; font-weight: bold; margin-top: 5px;">
                        💰 Bakiye: <span style="font-size:14px; color:#38bdf8;">${user.money}</span> TL
                    </div>
                </div>

                <!-- ADMIN HIZLI EYLEMLER (IŞINLAN, ÇEK, SUSTUR, BANLA) -->
                ${!isMe ? `
                <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                    <button onclick="adminTeleportTo('${user.username}')" style="padding: 6px 10px; background: linear-gradient(135deg, #0284c7, #0369a1); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 11px; box-shadow:0 2px 5px rgba(2,132,199,0.3);" title="Oyuncunun yanına git">
                        🚀 Yanına Git
                    </button>
                    <button onclick="adminSummon('${user.username}')" style="padding: 6px 10px; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 11px; box-shadow:0 2px 5px rgba(124,58,237,0.3);" title="Oyuncuyu kendi yanına çek">
                        🧲 Yanıma Çek
                    </button>
                    ${user.isMuted ? `
                    <button onclick="adminUnmuteUser('${user.username}')" style="padding: 6px 10px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 11px;" title="Susturmayı kaldır">
                        🔊 Susturmayı Aç
                    </button>
                    ` : `
                    <button onclick="openMutePromptModal('${user.username}')" style="padding: 6px 10px; background: linear-gradient(135deg, #eab308, #ca8a04); color: #0f172a; border: none; border-radius: 6px; cursor: pointer; font-weight: 800; font-size: 11px;" title="Süreli sustur">
                        🔇 Sustur
                    </button>
                    `}
                    ${!isUserAdminAccount ? `
                    <button onclick="openBanPromptModal('${user.username}')" style="padding: 6px 10px; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 800; font-size: 11px;" title="Süreli banla">
                        ⛔ Banla
                    </button>
                    ` : ''}
                </div>
                ` : ''}
            </div>

            <!-- BAKİYE YÖNETİMİ SATIRI -->
            <div style="display:flex; align-items:center; justify-content:flex-end; gap:6px; flex-wrap:wrap; border-top:1px dashed rgba(255,255,255,0.08); padding-top:8px;">
                <span style="font-size:11px; color:#94a3b8; font-weight:bold;">Para İşlemi:</span>
                <input type="number" id="adminInput_${user.username}" placeholder="Miktar" value="100" style="width: 75px; padding: 5px 8px; background: rgba(15,23,42,0.85); border: 1px solid #475569; border-radius: 6px; color: white; font-weight: bold; font-size: 12px; text-align: center; outline:none;">
                <button onclick="adminModifyUser('${user.username}', 'add')" style="padding: 5px 10px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 11px;">+ Ekle</button>
                <button onclick="adminModifyUser('${user.username}', 'set')" style="padding: 5px 10px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 11px;">= Belirle</button>
                <button onclick="adminQuickAdd('${user.username}', 250)" style="padding: 5px 8px; background: rgba(245,158,11,0.15); border: 1px solid #f59e0b; color: #facc15; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 10px;">+250</button>
                <button onclick="adminQuickAdd('${user.username}', 1000)" style="padding: 5px 8px; background: rgba(245,158,11,0.15); border: 1px solid #f59e0b; color: #facc15; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 10px;">+1000</button>
            </div>
        </div>
        `;
    }).join('');
}

function adminModifyUser(targetUsername, mode) {
    const inputEl = document.getElementById(`adminInput_${targetUsername}`);
    let amount = parseInt(inputEl ? inputEl.value : 0);
    if (isNaN(amount) || amount < 0) {
        alert("Lütfen geçerli bir tutar yazın!");
        return;
    }
    if (window.socket) window.socket.emit('adminModifyMoney', { targetUsername: targetUsername, amount: amount, mode: mode });
}

function adminQuickAdd(targetUsername, amount) {
    if (window.socket) window.socket.emit('adminModifyMoney', { targetUsername: targetUsername, amount: amount, mode: 'add' });
}

// Admin Teleport & Summon (Anında, onaysız kesintisiz geçiş)
function adminTeleportTo(targetUsername) {
    if (window.socket) window.socket.emit('adminTeleportTo', { targetUsername: targetUsername });
    closeAdminPanel();
}

function adminSummon(targetUsername) {
    if (window.socket) window.socket.emit('adminSummon', { targetUsername: targetUsername });
    closeAdminPanel();
}

// Admin Mute Handlers
function openMutePromptModal(username) {
    adminCurrentMuteTarget = username;
    const targetSpan = document.getElementById('muteTargetUsername');
    if (targetSpan) targetSpan.innerText = username;
    const minInput = document.getElementById('muteMinutesInput');
    if (minInput) minInput.value = 5;
    const modal = document.getElementById('adminMutePromptModal');
    if (modal) modal.style.display = 'flex';
}

function closeAdminMutePrompt() {
    const modal = document.getElementById('adminMutePromptModal');
    if (modal) modal.style.display = 'none';
    adminCurrentMuteTarget = null;
}

function setMuteMinutes(min) {
    const input = document.getElementById('muteMinutesInput');
    if (input) input.value = min;
}

function confirmAdminMute() {
    if (!adminCurrentMuteTarget) return;
    const minInput = document.getElementById('muteMinutesInput');
    const reasonInput = document.getElementById('muteReasonInput');
    let minutes = parseInt(minInput ? minInput.value : 5) || 5;
    let reason = (reasonInput ? reasonInput.value : "Chat spam / uygunsuz mesaj").trim();

    if (window.socket) {
        window.socket.emit('adminMuteUser', {
            targetUsername: adminCurrentMuteTarget,
            minutes: minutes,
            reason: reason
        });
    }
    closeAdminMutePrompt();
}

function adminUnmuteUser(targetUsername) {
    if (window.socket) window.socket.emit('adminUnmuteUser', { targetUsername: targetUsername });
}

// Admin Ban Handlers
function openBanPromptModal(username) {
    adminCurrentBanTarget = username;
    const targetSpan = document.getElementById('banTargetUsername');
    if (targetSpan) targetSpan.innerText = username;
    const minInput = document.getElementById('banMinutesInput');
    if (minInput) minInput.value = 15;
    const modal = document.getElementById('adminBanPromptModal');
    if (modal) modal.style.display = 'flex';
}

function closeAdminBanPrompt() {
    const modal = document.getElementById('adminBanPromptModal');
    if (modal) modal.style.display = 'none';
    adminCurrentBanTarget = null;
}

function setBanMinutes(min) {
    const input = document.getElementById('banMinutesInput');
    if (input) input.value = min;
}

function confirmAdminBan() {
    if (!adminCurrentBanTarget) return;
    const minInput = document.getElementById('banMinutesInput');
    const reasonInput = document.getElementById('banReasonInput');
    let minutes = parseInt(minInput ? minInput.value : 15) || 15;
    let reason = (reasonInput ? reasonInput.value : "Oyun kurallarını ihlal").trim();

    if (window.socket) {
        window.socket.emit('adminBanUser', {
            targetUsername: adminCurrentBanTarget,
            minutes: minutes,
            reason: reason
        });
    }
    closeAdminBanPrompt();
}

function adminUnbanUser(targetUsername) {
    if (window.socket) window.socket.emit('adminUnbanUser', { targetUsername: targetUsername });
}

// Admin Sanctions List Handlers
function refreshAdminSanctions() {
    if (window.socket) window.socket.emit('adminGetSanctionsList');
}

function renderAdminSanctions(list) {
    const container = document.getElementById('adminSanctionsListContainer');
    if (!container) return;

    if (!list || list.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:25px; font-style:italic;">Şu an cezalı (banlı veya susturulan) kullanıcı bulunmuyor.</div>`;
        return;
    }

    container.innerHTML = list.map(item => {
        let banBadge = item.isBanned
            ? `<span style="font-size:11px; background:rgba(239,68,68,0.2); color:#ef4444; border:1px solid #ef4444; padding:2px 8px; border-radius:6px; font-weight:800;">⛔ BANLI (${item.banRemainingMinutes} dk kaldı)</span>`
            : '';
        let muteBadge = item.isMuted
            ? `<span style="font-size:11px; background:rgba(234,179,8,0.2); color:#facc15; border:1px solid #eab308; padding:2px 8px; border-radius:6px; font-weight:800;">🔇 MUTE (${item.muteRemainingMinutes} dk kaldı)</span>`
            : '';

        let banDetail = item.isBanned
            ? `<div style="font-size:12px; color:#fca5a5; margin-top:3px;">⛔ <b>Ban Sebebi:</b> ${item.banReason} (Yönetici: ${item.bannedBy})</div>`
            : '';
        let muteDetail = item.isMuted
            ? `<div style="font-size:12px; color:#fef08a; margin-top:3px;">🔇 <b>Mute Sebebi:</b> ${item.muteReason} (Yönetici: ${item.mutedBy})</div>`
            : '';

        return `
        <div style="background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(255,255,255,0.08); padding: 12px 14px; border-radius: 10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
                <div style="font-weight: 800; font-size: 15px; color: #f8fafc; display:flex; align-items:center; gap:8px;">
                    <span>${item.username}</span>
                    ${banBadge}
                    ${muteBadge}
                </div>
                ${banDetail}
                ${muteDetail}
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                ${item.isBanned ? `
                <button onclick="adminUnbanUser('${item.username}')" style="padding: 6px 12px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 12px;">
                    ✅ Banı Kaldır
                </button>
                ` : ''}
                ${item.isMuted ? `
                <button onclick="adminUnmuteUser('${item.username}')" style="padding: 6px 12px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 12px;">
                    🔊 Mute Kaldır
                </button>
                ` : ''}
            </div>
        </div>
        `;
    }).join('');
}

function sendAdminAnnouncement() {
    const titleInput = document.getElementById('adminAnnounceTitle');
    const msgInput = document.getElementById('adminAnnounceMessage');

    let title = (titleInput?.value || "📢 SİSTEM VE YÖNETİCİ DUYURUSU").trim();
    let message = (msgInput?.value || "").trim();

    if (!message) {
        alert("Lütfen bir duyuru metni yazın!");
        return;
    }

    if (window.socket) {
        window.socket.emit('adminBroadcastAnnouncement', {
            title: title,
            message: message
        });
    }

    if (msgInput) msgInput.value = "";
}

function closeGlobalAnnouncement() {
    const modal = document.getElementById('globalAnnouncementModal');
    if (modal) modal.style.display = 'none';
}

// Admin Socket Dinleyicileri
if (window.socket) {
    window.socket.on('adminUsersList', (users) => {
        allAdminUsers = users || [];
        renderAdminUsers(allAdminUsers);
    });

    window.socket.on('adminSanctionsList', (list) => {
        renderAdminSanctions(list);
    });

    window.socket.on('kickedOrBanned', (data) => {
        let msg = `⛔ HESABINIZ GEÇİCİ OLARAK UZAKLAŞTIRILDI!\n\nSüre: ${data.minutes} Dakika\nSebep: ${data.reason}\n\nSüre dolana kadar oyuna giriş yapamazsınız.`;
        alert(msg);
        window.location.reload();
    });

    window.socket.on('playerMutedNotice', (data) => {
        let msg = `🔇 Admin tarafından ${data.minutes} dakika süreyle susturuldunuz!\nSebep: ${data.reason}`;
        alert(msg);
    });

    window.socket.on('adminSummoned', (data) => {
        if (typeof changeRoom === 'function' && data.room && data.room !== currentRoom) {
            changeRoom(data.room, { x: data.x, y: data.y });
        }
        if (typeof players !== 'undefined' && players[myId]) {
            players[myId].x = data.x;
            players[myId].y = data.y;
            if (typeof lastEmittedX !== 'undefined') {
                lastEmittedX = data.x;
                lastEmittedY = data.y;
                lastEmittedMoving = false;
            }
        }
    });

    window.socket.on('adminTeleported', (data) => {
        if (typeof changeRoom === 'function' && data.room && data.room !== currentRoom) {
            changeRoom(data.room, { x: data.x, y: data.y });
        }
        if (typeof players !== 'undefined' && players[myId]) {
            players[myId].x = data.x;
            players[myId].y = data.y;
            if (typeof lastEmittedX !== 'undefined') {
                lastEmittedX = data.x;
                lastEmittedY = data.y;
                lastEmittedMoving = false;
            }
        }
        closeAdminPanel();
    });

    window.socket.on('globalAnnouncementPopup', (data) => {
        if (!data) return;

        const modal = document.getElementById('globalAnnouncementModal');
        const titleEl = document.getElementById('globalAnnounceTitle');
        const senderEl = document.getElementById('globalAnnounceSender');
        const timeEl = document.getElementById('globalAnnounceTime');
        const msgEl = document.getElementById('globalAnnounceMessage');

        if (titleEl) titleEl.innerText = data.title || "📢 SİSTEM DUYURUSU";
        if (senderEl) senderEl.innerText = `👑 Gönderen: ${data.sender || 'Admin'}`;
        if (timeEl) timeEl.innerText = `🕒 ${data.time || ''}`;
        if (msgEl) msgEl.innerText = data.message || "";

        if (modal) {
            modal.style.display = 'flex';
        }

        if (window.playSound) {
            window.playSound('notification');
        }
    });
}
