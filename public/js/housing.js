// Modüler Mimari: Çoklu ev desteği, özgün estetik mobilyalar ve canlı oda dekorasyonu

var socket = window.socket || (typeof io !== 'undefined' ? io() : null);
window.socket = socket;

window.myHouses = window.myHouses || {};
window.myHouseData = window.myHouseData || null;
window.myFurnitureInventory = window.myFurnitureInventory || [];
window.currentViewingHouse = window.currentViewingHouse || null;
window.wasFurnitureDragged = false;
window.selectedFurnitureIndex = null;

let hoveredFurnitureIndex = null;
let draggedFurnitureIndex = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let isFurnitureDragging = false;
let canvasInteractionSetupDone = false;

function getMyHouses() {
    let houses = window.myHouses || {};
    if (Object.keys(houses).length === 0 && window.myHouseData && window.myHouseData.type) {
        houses[window.myHouseData.type] = window.myHouseData;
    }
    return houses;
}

function getMyFurnitureInventory() {
    return window.myFurnitureInventory || [];
}

function getCurrentViewingHouse() {
    return window.currentViewingHouse;
}

function parseHouseRoomClient(roomName) {
    if (!roomName || !roomName.toLowerCase().startsWith('house_')) return null;
    let parts = roomName.substring(6).split('_');
    let last = parts[parts.length - 1]?.toLowerCase();
    let houseType = (last === 'standart' || last === 'garden' || last === 'pool') ? last : null;
    let owner = houseType ? parts.slice(0, -1).join('_') : parts.join('_');
    return { owner, houseType };
}
window.parseHouseRoomClient = parseHouseRoomClient;

function isCurrentlyInMyHouse() {
    let cRoom = (typeof currentRoom !== 'undefined' ? currentRoom : (window.currentRoom || '')).toLowerCase();
    if (!cRoom.startsWith('house_')) return false;
    let parsed = parseHouseRoomClient(cRoom);
    let myName = (window.myUsername || (typeof myUsername !== 'undefined' ? myUsername : '') || (typeof players !== 'undefined' && players[myId]?.name) || '').toLowerCase().trim();
    return !!(myName && parsed && parsed.owner.toLowerCase() === myName);
}
window.isCurrentlyInMyHouse = isCurrentlyInMyHouse;

function updateHouseEditButtonVisibility() {
    const editBtn = document.getElementById('btnEditHouseFurniture');
    const leaveBtn = document.getElementById('btnLeaveHouseAction');
    const tourBanner = document.getElementById('houseTourBanner');
    let cRoom = (typeof currentRoom !== 'undefined' ? currentRoom : (window.currentRoom || '')).toLowerCase();
    let inAnyHouse = cRoom.startsWith('house_');
    let isTour = cRoom.startsWith('house_ornek_');
    let isMine = isCurrentlyInMyHouse();

    if (editBtn) editBtn.style.display = (isMine && !isTour) ? 'flex' : 'none';
    if (leaveBtn) {
        leaveBtn.style.display = inAnyHouse ? 'flex' : 'none';
        if (isTour) {
            leaveBtn.innerText = "🚪 Emlakçıya Dön";
            leaveBtn.onclick = () => exitHouseTour();
        } else {
            leaveBtn.innerText = "🚪 Meydana Çık";
            leaveBtn.onclick = () => { if (typeof changeRoom === 'function') changeRoom('sokak'); };
        }
    }
    if (tourBanner) {
        tourBanner.style.display = isTour ? 'flex' : 'none';
    }
}
window.updateHouseEditButtonVisibility = updateHouseEditButtonVisibility;

// --- 1. EMLAKÇI MODALI (Prestij Emlak - Satış Danışmanı Mert Bey) ---
const HOUSE_INFO = {
    'standart': {
        name: 'Standart Şehir Dairesi',
        price: 1250,
        emoji: '🏢',
        color: '#38bdf8',
        desc: 'Sıcak ve konforlu 1+1 şehir dairesi. Ahşap parke zemin ve modern tavan aydınlatması.'
    },
    'garden': {
        name: 'Verandalı Bahçeli Ev',
        price: 2500,
        emoji: '🏡',
        color: '#22c55e',
        desc: 'Doğayla iç içe müstakil yaşam! Geniş ahşap veranda, elma ağaçları ve yemyeşil bahçe manzarası.'
    },
    'pool': {
        name: 'Bahçeli & Havuzlu Villa',
        price: 3750,
        emoji: '🏰',
        color: '#f59e0b',
        desc: 'Lüksün zirvesi! Özel turkuaz yüzme havuzu, güneşlenme şezlongları ve mermer teras.'
    }
};

function openRealEstateModal() {
    const modal = document.getElementById('realEstateModal');
    if (!modal) return;
    renderRealEstateUI();
    modal.style.display = 'flex';
}
window.openRealEstateModal = openRealEstateModal;

function closeRealEstateModal() {
    const modal = document.getElementById('realEstateModal');
    if (modal) modal.style.display = 'none';
}
window.closeRealEstateModal = closeRealEstateModal;

function renderRealEstateUI() {
    const container = document.getElementById('realEstateCardsContainer');
    if (!container) return;
    container.innerHTML = "";

    let myHouses = getMyHouses();

    for (let key in HOUSE_INFO) {
        let h = HOUSE_INFO[key];
        let isOwned = !!myHouses[key];
        let card = document.createElement('div');
        card.style.cssText = `background: rgba(30, 41, 59, 0.85); border: 2px solid ${isOwned ? '#10b981' : h.color}; border-radius: 14px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; text-align: left; box-shadow: 0 8px 24px rgba(0,0,0,0.5); position: relative; overflow: hidden;`;

        if (isOwned) {
            let ownedBadge = document.createElement('div');
            ownedBadge.style.cssText = "position: absolute; top: 12px; right: 12px; background: #10b981; color: white; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px;";
            ownedBadge.innerText = "⭐ Sahipsiniz";
            card.appendChild(ownedBadge);
        }

        card.innerHTML += `
            <div>
                <div style="font-size: 42px; margin-bottom: 8px;">${h.emoji}</div>
                <h3 style="color: ${h.color}; margin: 0 0 6px 0; font-size: 18px;">${h.name}</h3>
                <p style="color: #cbd5e1; font-size: 13px; line-height: 1.4; margin: 0 0 14px 0;">${h.desc}</p>
            </div>
            <div style="margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">
                <div style="font-weight: 800; color: #facc15; font-size: 17px; margin-bottom: 10px;">💰 ${h.price} TL</div>
                <div style="display: flex; gap: 8px; justify-content: space-between;">
                    <button onclick="previewHouseTour('${key}')" style="flex: 1; padding: 8px 10px; background: linear-gradient(135deg, #0284c7, #0369a1); color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 12px; box-shadow: 0 3px 10px rgba(2,132,199,0.35); display: flex; align-items: center; justify-content: center; gap: 4px;">
                        <span>👁️</span> Evin İçini Gör
                    </button>
                    ${isOwned 
                        ? `<button disabled style="flex: 1; padding: 8px 10px; background: #334155; color: #94a3b8; border: none; border-radius: 8px; font-weight: bold; font-size: 12px;">Satın Alındı</button>`
                        : `<button onclick="confirmBuyHouse('${key}')" style="flex: 1; padding: 8px 10px; background: linear-gradient(135deg, ${h.color}, #0369a1); color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 12px; box-shadow: 0 3px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; gap: 4px;">
                            <span>🏠</span> Satın Al
                        </button>`
                    }
                </div>
            </div>
        `;
        container.appendChild(card);
    }
}

function confirmBuyHouse(type) {
    let h = HOUSE_INFO[type];
    if (!h) return;
    if (confirm(`${h.name} satın almak istiyor musunuz? (${h.price} TL)`)) {
        socket.emit('buyHouse', type);
    }
}
window.confirmBuyHouse = confirmBuyHouse;

// --- 1.1 ÖRNEK DAİRE GEZİSİ (DEMO TUR) FONKSİYONLARI ---
function previewHouseTour(type) {
    let h = HOUSE_INFO[type];
    if (!h) return;
    closeRealEstateModal();
    closeMaketInspectModal();
    window.activeHouseTourType = type;

    const banner = document.getElementById('houseTourBanner');
    const titleEl = document.getElementById('houseTourTitle');
    const buyBtn = document.getElementById('btnTourBuyHouse');
    if (banner) banner.style.display = 'flex';
    if (titleEl) titleEl.innerText = `🏡 Örnek Daire Gezisi: ${h.name} (${h.price} TL)`;
    if (buyBtn) buyBtn.onclick = () => buyHouseFromTour(type);

    if (typeof changeRoom === 'function') {
        changeRoom('house_ornek_' + type);
    }
}
window.previewHouseTour = previewHouseTour;

function exitHouseTour() {
    window.activeHouseTourType = null;
    const banner = document.getElementById('houseTourBanner');
    if (banner) banner.style.display = 'none';
    if (typeof changeRoom === 'function') {
        changeRoom('emlakci');
    }
}
window.exitHouseTour = exitHouseTour;

function buyHouseFromTour(type = null) {
    let targetType = type || window.activeHouseTourType || 'standart';
    confirmBuyHouse(targetType);
}
window.buyHouseFromTour = buyHouseFromTour;

// --- 1.2 EMLAKÇI SHOWROOM MAKET İNCELEME MODALI ---
function openMaketInspectModal(type) {
    let h = HOUSE_INFO[type];
    if (!h) return;
    const modal = document.getElementById('maketInspectModal');
    if (!modal) return;

    let myHouses = getMyHouses();
    let isOwned = !!myHouses[type];

    let emojiEl = document.getElementById('maketModalEmoji');
    let titleEl = document.getElementById('maketModalTitle');
    let priceEl = document.getElementById('maketModalPrice');
    let descEl = document.getElementById('maketModalDesc');

    if (emojiEl) emojiEl.innerText = h.emoji;
    if (titleEl) titleEl.innerText = h.name;
    if (priceEl) priceEl.innerText = `💰 ${h.price} TL`;
    if (descEl) descEl.innerText = h.desc;

    const tourBtn = document.getElementById('maketModalTourBtn');
    const buyBtn = document.getElementById('maketModalBuyBtn');

    if (tourBtn) {
        tourBtn.onclick = () => previewHouseTour(type);
    }
    if (buyBtn) {
        if (isOwned) {
            buyBtn.innerText = "⭐ Zaten Sahipsiniz";
            buyBtn.disabled = true;
            buyBtn.style.background = "#334155";
            buyBtn.style.cursor = "default";
        } else {
            buyBtn.innerText = "💰 Satın Al";
            buyBtn.disabled = false;
            buyBtn.style.background = "linear-gradient(135deg, #10b981, #059669)";
            buyBtn.style.cursor = "pointer";
            buyBtn.onclick = () => {
                confirmBuyHouse(type);
                closeMaketInspectModal();
            };
        }
    }

    modal.style.display = 'flex';
}
window.openMaketInspectModal = openMaketInspectModal;

function closeMaketInspectModal() {
    const modal = document.getElementById('maketInspectModal');
    if (modal) modal.style.display = 'none';
}
window.closeMaketInspectModal = closeMaketInspectModal;

// --- 2. MOBİLYA VE EV MARKETİ MODALI ---
const FURNITURE_CATALOG = {
    'bitki': { name: 'Dev Salon Deve Tabanı', price: 200, emoji: '🪴', image: '/images/furniture/bitki.jpg', w: 48, h: 62, desc: 'Seramik saksıda dekoratif parlak yapraklı Monstera.' },
    'hali': { name: 'Anadolu Dokuma Halısı', price: 240, emoji: '🧶', image: '/images/furniture/hali.jpg', w: 126, h: 76, desc: 'Saçaklı, çift bordürlü otantik el dokuma salon halısı.' },
    'sedir': { name: 'Otantik Şark Sediri', price: 280, emoji: '🛋️', image: '/images/furniture/sedir.jpg', w: 94, h: 54, desc: 'Kadife minderli, altın püsküllü otantik şark sediri.' },
    'kitaplik': { name: 'Masif Ahşap Kütüphane', price: 320, emoji: '📚', image: '/images/furniture/kitaplik.jpg', w: 74, h: 80, desc: 'Deri ciltli kitaplar ve antika küreli oymalı meşe kitaplık.' },
    'berjer': { name: 'Lüks Deri Berjer', price: 360, emoji: '🪑', image: '/images/furniture/berjer.jpg', w: 56, h: 52, desc: 'Hakiki kapitone deri dikişli, konforlu berjer koltuk.' },
    'yemek_masasi': { name: 'Masif Ahşap Yemek Masası', price: 400, emoji: '🪑', image: '/images/furniture/yemek_masasi.jpg', w: 92, h: 60, desc: 'Dantel runner örtülü, vazolu ve sandalyeli yemek masası.' },
    'akvaryum': { name: 'Canlı Resif Akvaryumu', price: 440, emoji: '🐠', image: '/images/furniture/akvaryum.jpg', w: 76, h: 56, desc: 'İçinde balıkların yüzdüğü, aydınlatmalı lüks akvaryum.' },
    'tv': { name: 'Smart Curved TV Konsolu', price: 480, emoji: '📺', image: '/images/furniture/tv.jpg', w: 90, h: 62, desc: 'Kavisli plazma ekran ve şık lake TV ünitesi.' },
    'gramofon': { name: 'Antika Pirinç Gramofon', price: 520, emoji: '🎺', image: '/images/furniture/gramofon.jpg', w: 54, h: 54, desc: 'Ceviz sandıklı, döner plaklı nostaljik altın gramofon.' },
    'somine': { name: 'Doğal Taş Şömine', price: 550, emoji: '🪵', image: '/images/furniture/somine.jpg', w: 84, h: 70, desc: 'Doğal taş kemerli, çıtırdayan odunlu rustik şömine.' },
    'bilgisayar': { name: 'RGB Oyuncu Battle Station', price: 570, emoji: '🖥️', image: '/images/furniture/bilgisayar.jpg', w: 88, h: 64, desc: 'Çift kavisli monitör, RGB neon kasa ve profesyonel oyuncu koltuğu.' },
    'arcade': { name: 'Retro Atari Oyun Kabini', price: 590, emoji: '🕹️', image: '/images/furniture/arcade.jpg', w: 56, h: 72, desc: 'Işıklı tabelalı, jetonlu klasik Space Invaders retro atari kabini.' },
    'piyano': { name: 'Lüks Kuyruklu Konser Piyanosu', price: 600, emoji: '🎹', image: '/images/furniture/piyano.jpg', w: 96, h: 78, desc: 'Açık kapaklı, altın telli siyah lake konser piyanosu.' },
    'meyve_arabasi': { name: 'Limonata Standı', price: 490, emoji: '🍋', image: '', w: 78, h: 68, desc: 'Tentesi, taze sıkılmış limonata sürahisi, bardakları ve tekerlekleriyle seyyar Limonata Standı. Tıklayan misafirlere limonata satarak ev sahibine kazanç sağlar.' }
};
window.FURNITURE_CATALOG = FURNITURE_CATALOG;

function getFurnitureRotationInfo(rot) {
    let r = ((rot || 0) % 4 + 4) % 4;
    switch (r) {
        case 0: return { angle: 0, label: '👉 Ön-Sağ (0°)', short: '0°' };
        case 1: return { angle: 90, label: '👇 Ön-Sol (90°)', short: '90°' };
        case 2: return { angle: 180, label: '👈 Arka-Sol (180°)', short: '180°' };
        case 3: return { angle: 270, label: '👆 Arka-Sağ (270°)', short: '270°' };
    }
}
window.getFurnitureRotationInfo = getFurnitureRotationInfo;

function openFurnitureMarketModal() {
    const modal = document.getElementById('furnitureMarketModal');
    if (!modal) return;
    renderFurnitureMarketUI();
    modal.style.display = 'flex';
}
window.openFurnitureMarketModal = openFurnitureMarketModal;

function closeFurnitureMarketModal() {
    const modal = document.getElementById('furnitureMarketModal');
    if (modal) modal.style.display = 'none';
}
window.closeFurnitureMarketModal = closeFurnitureMarketModal;

function renderFurnitureMarketUI() {
    const container = document.getElementById('furnitureCatalogGrid');
    if (!container) return;
    container.innerHTML = "";

    let curMoney = (window.myMoney !== undefined) ? window.myMoney : ((typeof players !== 'undefined' && typeof myId !== 'undefined' && players[myId]) ? players[myId].money : 0);
    const mBadge = document.getElementById('marketMoneyDisplay');
    if (mBadge) mBadge.innerText = curMoney;

    let inv = getMyFurnitureInventory();

    for (let id in FURNITURE_CATALOG) {
        let item = FURNITURE_CATALOG[id];
        let ownedCount = inv.filter(k => k === id).length;
        let card = document.createElement('div');
        card.style.cssText = "background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; text-align: left; box-shadow: 0 4px 15px rgba(0,0,0,0.3); transition: transform 0.2s, border-color 0.2s;";
        card.onmouseenter = () => { card.style.transform = 'translateY(-3px)'; card.style.borderColor = '#38bdf8'; };
        card.onmouseleave = () => { card.style.transform = 'translateY(0)'; card.style.borderColor = 'rgba(255,255,255,0.12)'; };

        let canAfford = curMoney >= item.price;
        let btnBg = canAfford ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #64748b, #475569)";

        card.innerHTML = `
            <div>
                <div style="position: relative; width: 100%; height: 145px; border-radius: 10px; overflow: hidden; background: #0f172a; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.1); box-shadow: inset 0 0 20px rgba(0,0,0,0.6);">
                    <img src="${item.image || ''}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <span style="display:${item.image ? 'none' : 'block'}; font-size: 42px;">${item.emoji}</span>
                    <span style="position: absolute; top: 8px; right: 8px; font-size: 11px; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255,255,255,0.2); padding: 3px 8px; border-radius: 12px; color: #f8fafc; font-weight: 700;">Sahip: ${ownedCount}</span>
                </div>
                <div style="font-weight: 800; color: #f8fafc; font-size: 15px; margin-bottom: 4px;">${item.name}</div>
                <div style="font-size: 12px; color: #94a3b8; line-height: 1.35;">${item.desc}</div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px;">
                <div style="font-weight: 800; color: #facc15; font-size: 16px;">💰 ${item.price} TL</div>
                <button id="buyBtn_${id}" onclick="confirmBuyFurniture('${id}')" style="padding: 7px 16px; background: ${btnBg}; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); transition: transform 0.1s, filter 0.2s;">🛒 Satın Al</button>
            </div>
        `;
        container.appendChild(card);
    }
}

function confirmBuyFurniture(itemId) {
    let item = FURNITURE_CATALOG[itemId];
    if (!item) return;

    let curMoney = (window.myMoney !== undefined) ? window.myMoney : ((typeof players !== 'undefined' && typeof myId !== 'undefined' && players[myId]) ? players[myId].money : 0);

    if (curMoney < item.price) {
        if (typeof showSocialNotificationToast === 'function') {
            showSocialNotificationToast('💰', 'Yetersiz Bakiye!', `Bu mobilya ${item.price} TL! Mevcut bakiyeniz: ${curMoney} TL.`);
        } else {
            alert(`Bu mobilya ${item.price} TL! Mevcut bakiyeniz: ${curMoney} TL.`);
        }
        return;
    }

    const buyBtn = document.getElementById(`buyBtn_${itemId}`);
    if (buyBtn) {
        buyBtn.disabled = true;
        buyBtn.innerText = '⏳ Alınıyor...';
        buyBtn.style.opacity = '0.7';
    }

    let activeSocket = window.socket || (typeof socket !== 'undefined' ? socket : null);
    if (activeSocket) {
        activeSocket.emit('buyFurniture', itemId);
    }
}
window.confirmBuyFurniture = confirmBuyFurniture;

// --- 3. KONUTLAR & EV ZİYARETİ MODALI (ÇOKLU EV LİSTESİ) ---
function openHousingPortalModal() {
    const modal = document.getElementById('housingPortalModal');
    const container = document.getElementById('availableHousesList');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; color: #94a3b8; padding: 25px;">
                <div style="font-size: 32px; margin-bottom: 8px;">🔄</div>
                <div>Konutlar taranıyor...</div>
            </div>
        `;
    }
    socket.emit('getAvailableHouses');
    if (modal) modal.style.display = 'flex';
}
window.openHousingPortalModal = openHousingPortalModal;

function closeHousingPortalModal() {
    const modal = document.getElementById('housingPortalModal');
    if (modal) modal.style.display = 'none';
}
window.closeHousingPortalModal = closeHousingPortalModal;

function renderAvailableHousesUI(data) {
    const container = document.getElementById('availableHousesList');
    if (!container) return;
    container.innerHTML = "";

    let houses = data.houses || [];
    let hasSelfHouse = data.hasSelfHouse;
    let friendCount = data.friendCount || 0;

    // Kendi evimiz yoksa uyarı ve Emlakçı butonu
    if (!hasSelfHouse) {
        let warningBox = document.createElement('div');
        warningBox.style.cssText = "background: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; border-radius: 12px; padding: 14px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;";
        warningBox.innerHTML = `
            <div>
                <div style="font-weight: 800; color: #facc15; font-size: 14px;">🏠 Henüz bir evin yok!</div>
                <div style="font-size: 12px; color: #cbd5e1; margin-top: 2px;">Emlakçı Ali Bey'den bir ev alarak kendi yuvanı kurabilir ve mobilyalarını yerleştirebilirsin.</div>
            </div>
            <button onclick="closeHousingPortalModal(); openRealEstateModal();" style="padding: 8px 16px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 12px; white-space: nowrap;">🏠 Ev Al</button>
        `;
        container.appendChild(warningBox);
    }

    if (houses.length === 0) {
        let emptyBox = document.createElement('div');
        emptyBox.style.cssText = "text-align: center; color: #94a3b8; padding: 30px 15px;";
        emptyBox.innerHTML = `
            <div style="font-size: 40px; margin-bottom: 8px;">🏢</div>
            <div style="font-weight: 700; color: #e2e8f0; font-size: 15px;">Ziyaret edebileceğin bir ev bulunamadı!</div>
            <div style="font-size: 12px; margin-top: 4px;">Burada yalnızca <b>kendi evleriniz</b> ve <b>arkadaşlarınızın evleri</b> listelenir.</div>
            ${friendCount === 0 ? `<div style="margin-top: 10px; color: #38bdf8; font-size: 12px;">💡 Henüz arkadaşın yok. Oyundaki diğer oyunculara tıklayıp arkadaş ekleyebilirsin!</div>` : ''}
        `;
        container.appendChild(emptyBox);
        return;
    }

    houses.forEach(h => {
        let info = HOUSE_INFO[h.type] || { name: 'Ev', emoji: '🏠', color: '#38bdf8' };
        let card = document.createElement('div');
        card.style.cssText = `display: flex; justify-content: space-between; align-items: center; background: rgba(30, 41, 59, 0.85); border: 2px solid ${h.isSelf ? '#10b981' : 'rgba(255,255,255,0.1)'}; border-radius: 12px; padding: 14px 18px; margin-bottom: 10px;`;

        let enterButtonText = h.isSelf 
            ? (h.type === 'pool' ? '🏰 Villama Gir' : (h.type === 'garden' ? '🏡 Bahçeli Evime Gir' : '🏢 Daireme Gir'))
            : '🚪 Eve Gir';

        let badgeText = h.isSelf 
            ? `<span style="font-size: 11px; background: #10b981; color: white; padding: 2px 8px; border-radius: 12px; font-weight: bold;">Evim</span>`
            : (h.isPublicCommunity 
                ? `<span style="font-size: 11px; background: rgba(245, 158, 11, 0.25); color: #facc15; padding: 2px 8px; border-radius: 12px; font-weight: bold; border: 1px solid #f59e0b;">🌐 Mahalle (Herkese Açık)</span>`
                : `<span style="font-size: 11px; background: rgba(56, 189, 248, 0.2); color: #38bdf8; padding: 2px 8px; border-radius: 12px; font-weight: bold;">Arkadaş</span>`);

        card.innerHTML = `
            <div style="display: flex; align-items: center; gap: 14px;">
                <span style="font-size: 36px;">${info.emoji}</span>
                <div>
                    <div style="font-weight: 800; color: #f8fafc; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                        ${h.isSelf ? `🏠 ${info.name}` : `${h.owner}'in Evi`}
                        ${badgeText}
                    </div>
                    <div style="font-size: 13px; color: ${info.color}; margin-top: 2px;">
                        ${h.isSelf ? `Sahibi: ${h.owner}` : info.name} • <span style="color: #cbd5e1;">${h.furnitureCount || 0} Mobilya</span>
                    </div>
                </div>
            </div>
            <button onclick="enterHouse('${h.owner}', '${h.type}')" style="padding: 9px 18px; background: ${h.isSelf ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #0ea5e9, #0284c7)'}; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); white-space:nowrap;">
                ${enterButtonText}
            </button>
        `;
        container.appendChild(card);
    });
}

function enterHouse(ownerUsername, houseType) {
    closeHousingPortalModal();
    let roomName = houseType ? `house_${ownerUsername}_${houseType}` : `house_${ownerUsername}`;
    socket.emit('getHouseData', { owner: ownerUsername, type: houseType });
    if (typeof changeRoom === 'function') {
        changeRoom(roomName);
    }
}
window.enterHouse = enterHouse;

// --- 4. EV İÇİ MOBİLYA DÜZENLEME MODALI ---
function openFurniturePlacementModal() {
    if (!isCurrentlyInMyHouse()) {
        alert("Mobilya düzenlemek için kendi evinizde olmalısınız!");
        return;
    }
    const modal = document.getElementById('furniturePlacementModal');
    if (!modal) return;
    renderFurniturePlacementUI();
    modal.style.display = 'flex';
}
window.openFurniturePlacementModal = openFurniturePlacementModal;

function closeFurniturePlacementModal() {
    const modal = document.getElementById('furniturePlacementModal');
    if (modal) modal.style.display = 'none';
}
window.closeFurniturePlacementModal = closeFurniturePlacementModal;

function renderFurniturePlacementUI() {
    const invContainer = document.getElementById('myInventoryFurnitureList');
    const placedContainer = document.getElementById('myPlacedFurnitureList');

    let inv = getMyFurnitureInventory();
    let viewingHouse = getCurrentViewingHouse();
    let placed = (viewingHouse && viewingHouse.furniture) ? viewingHouse.furniture : [];

    if (invContainer) {
        invContainer.innerHTML = "";
        if (inv.length === 0) {
            invContainer.innerHTML = `
                <div style="color:#94a3b8; font-size:13px; padding:15px; text-align:center;">
                    <div style="font-size:28px; margin-bottom:6px;">📦</div>
                    <div>Depoda yerleştirilmemiş mobilya yok.</div>
                    <div style="margin-top:10px;">
                        <button onclick="closeFurniturePlacementModal(); openFurnitureMarketModal();" style="padding:6px 14px; background:linear-gradient(135deg, #0ea5e9, #0284c7); color:white; border:none; border-radius:6px; font-weight:bold; font-size:12px; cursor:pointer;">🛒 Markete Git</button>
                    </div>
                </div>
            `;
        } else {
            inv.forEach((itemId, idx) => {
                let item = FURNITURE_CATALOG[itemId] || { name: itemId, emoji: '📦', desc: '', image: '' };
                let itemRow = document.createElement('div');
                itemRow.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:rgba(30, 41, 59, 0.7); padding:10px 12px; border-radius:10px; margin-bottom:8px; border:1px solid rgba(255,255,255,0.08);";
                itemRow.innerHTML = `
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:52px; height:52px; min-width:52px; border-radius:8px; overflow:hidden; background:#0f172a; border:1.5px solid rgba(56,189,248,0.3); display:flex; align-items:center; justify-content:center; box-shadow:0 3px 8px rgba(0,0,0,0.35);">
                            <img src="${item.image || ''}" alt="${item.name}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                            <span style="display:${item.image ? 'none' : 'block'}; font-size:26px;">${item.emoji}</span>
                        </div>
                        <div>
                            <div style="font-size:13px; font-weight:700; color:#f8fafc;">${item.name}</div>
                            <div style="font-size:11px; color:#94a3b8;">${item.desc || 'Dekoratif mobilya'}</div>
                        </div>
                    </div>
                    <button onclick="placeFurnitureInRoom('${itemId}')" style="padding:7px 14px; background:linear-gradient(135deg, #10b981, #059669); color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:12px; white-space:nowrap; box-shadow:0 2px 6px rgba(16,185,129,0.3);">➕ Odaya Koy</button>
                `;
                invContainer.appendChild(itemRow);
            });
        }
    }

    if (placedContainer) {
        placedContainer.innerHTML = "";
        if (placed.length === 0) {
            placedContainer.innerHTML = `
                <div style="color:#94a3b8; font-size:13px; padding:15px; text-align:center;">
                    <div style="font-size:28px; margin-bottom:6px;">🛋️</div>
                    <div>Bu evde henüz mobilya bulunmuyor.</div>
                    <div style="font-size:11px; margin-top:4px; color:#64748b;">Soldaki deponuzdan eşya seçip odaya koyabilirsiniz.</div>
                </div>
            `;
        } else {
            placed.forEach((p, idx) => {
                let item = FURNITURE_CATALOG[p.id] || { name: p.id, emoji: '📦', image: '' };
                let pRow = document.createElement('div');
                pRow.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:rgba(30, 41, 59, 0.7); padding:10px 12px; border-radius:10px; margin-bottom:8px; border:1px solid rgba(255,255,255,0.08);";
                pRow.innerHTML = `
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:52px; height:52px; min-width:52px; border-radius:8px; overflow:hidden; background:#0f172a; border:1.5px solid rgba(56,189,248,0.3); display:flex; align-items:center; justify-content:center; box-shadow:0 3px 8px rgba(0,0,0,0.35);">
                            <img src="${item.image || ''}" alt="${item.name}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                            <span style="display:${item.image ? 'none' : 'block'}; font-size:26px;">${item.emoji}</span>
                        </div>
                        <div>
                            <div style="font-size:13px; font-weight:700; color:#f8fafc;">${item.name}</div>
                            <div style="font-size:11px; color:#38bdf8;">📍 Konum: (${p.x}, ${p.y}) • 🔄 Yön: ${getFurnitureRotationInfo(p.rotation).label}</div>
                        </div>
                    </div>
                    <div style="display:flex; gap:6px;">
                        <button onclick="rotateFurniture(${idx})" title="Mobilyanın izometrik açısını 90° çevirir" style="padding:6px 10px; background:linear-gradient(135deg, #f59e0b, #d97706); color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:11px; white-space:nowrap;">🔄 Çevir (${getFurnitureRotationInfo(p.rotation).short})</button>
                        <button onclick="moveFurnitureToPlayer(${idx})" title="Mobilyayı karakterinin durduğu yere getirir" style="padding:6px 10px; background:linear-gradient(135deg, #0ea5e9, #0284c7); color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:11px; white-space:nowrap;">📍 Yanıma Getir</button>
                        <button onclick="removeFurnitureFromRoom(${idx})" title="Mobilyayı kaldırıp deponuza koyar" style="padding:6px 10px; background:linear-gradient(135deg, #ef4444, #dc2626); color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:11px; white-space:nowrap;">❌ Depoya Kaldır</button>
                    </div>
                `;
                placedContainer.appendChild(pRow);
            });
        }
    }
}

function placeFurnitureInRoom(itemId) {
    if (!isCurrentlyInMyHouse()) return;
    let myP = (typeof players !== 'undefined' && typeof myId !== 'undefined' && players[myId]) ? players[myId] : { x: 400, y: 300 };
    let placeX = Math.max(70, Math.min(730, Math.round(myP.x)));
    let placeY = Math.max(160, Math.min(460, Math.round(myP.y)));

    socket.emit('placeFurniture', {
        itemId: itemId,
        x: placeX,
        y: placeY
    });
}
window.placeFurnitureInRoom = placeFurnitureInRoom;

function moveFurnitureToPlayer(index) {
    if (!isCurrentlyInMyHouse()) return;
    let myP = (typeof players !== 'undefined' && typeof myId !== 'undefined' && players[myId]) ? players[myId] : { x: 400, y: 300 };
    let placeX = Math.max(70, Math.min(730, Math.round(myP.x)));
    let placeY = Math.max(160, Math.min(460, Math.round(myP.y)));

    socket.emit('moveFurniture', {
        index: index,
        x: placeX,
        y: placeY
    });

    let house = getCurrentViewingHouse();
    if (house && house.furniture && house.furniture[index]) {
        house.furniture[index].x = placeX;
        house.furniture[index].y = placeY;
    }
    renderFurniturePlacementUI();
}
window.moveFurnitureToPlayer = moveFurnitureToPlayer;

function removeFurnitureFromRoom(index) {
    if (!isCurrentlyInMyHouse()) return;
    if (window.selectedFurnitureIndex === index) {
        window.selectedFurnitureIndex = null;
    } else if (typeof window.selectedFurnitureIndex === 'number' && window.selectedFurnitureIndex > index) {
        window.selectedFurnitureIndex--;
    }
    socket.emit('removeFurniture', index);
    if (typeof renderSelectedFurniturePanel === 'function') {
        renderSelectedFurniturePanel();
    }
}
window.removeFurnitureFromRoom = removeFurnitureFromRoom;

// --- 5. MOUSE İLE DOĞRUDAN CANVASA SÜRÜKLE & BIRAK ETKİLEŞİMİ ---
function setupFurnitureCanvasInteractions() {
    if (canvasInteractionSetupDone) return;
    const gCanvas = document.getElementById('gameCanvas');
    if (!gCanvas) return;
    canvasInteractionSetupDone = true;

    function getCanvasCoords(e) {
        let rect = gCanvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (gCanvas.width / rect.width),
            y: (e.clientY - rect.top) * (gCanvas.height / rect.height)
        };
    }

    let dragStartX = 0;
    let dragStartY = 0;
    let hasActuallyMoved = false;

    function findFurnitureAt(x, y) {
        let house = getCurrentViewingHouse();
        if (!house || !house.furniture || house.furniture.length === 0) return null;
        for (let i = house.furniture.length - 1; i >= 0; i--) {
            let item = house.furniture[i];
            let cat = FURNITURE_CATALOG[item.id] || { w: 60, h: 50 };
            let rot = ((item.rotation || 0) % 4 + 4) % 4;
            let isTransposed = (rot === 1 || rot === 3);
            let w = isTransposed ? cat.h : cat.w;
            let h = isTransposed ? cat.w : cat.h;
            let hw = Math.max(26, w / 2 + 6);
            let hh = Math.max(26, h / 2 + 6);
            if (x >= item.x - hw && x <= item.x + hw && y >= item.y - hh && y <= item.y + hh) {
                return i;
            }
        }
        return null;
    }

    gCanvas.addEventListener('mousedown', (e) => {
        let isOwner = isCurrentlyInMyHouse();
        let coords = getCanvasCoords(e);
        let targetIdx = findFurnitureAt(coords.x, coords.y);

        if (targetIdx !== null) {
            let house = getCurrentViewingHouse();
            let item = house.furniture[targetIdx];

            // 1. Gramofon Müzik Çaları (Hem normal modda hem düzenleme modunda ev sahibi tıklayabilir)
            if (item.id === 'gramofon') {
                socket.emit('toggleGramophone');
                if (!window.isHouseEditMode) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
            }

            // 1.1 Limonata Standı: Tıklayan misafirlere limonata satın alma teklif eder ve ev sahibine kazanç sağlar
            if (item.id === 'meyve_arabasi') {
                if (typeof openLemonadeStandModal === 'function') {
                    openLemonadeStandModal(house);
                }
                if (!window.isHouseEditMode) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
            }

            // 2. Eşyalar Kilitlidir: Sadece "Evi Düzenle" modundayken taşınabilir!
            if (!isOwner || !window.isHouseEditMode) {
                if (isOwner && !window.isHouseEditMode && item.id !== 'gramofon') {
                    if (typeof showSocialNotificationToast === 'function') {
                        showSocialNotificationToast('🔒', 'Eşyalar Kilitli', "Mobilyaları taşımak için '🛋️ Evi Düzenle' butonuna basın.");
                    }
                }
                return;
            }

            // 3. Düzenleme modundayken: Bu eşyayı seç! Başka eşyaya tıklandıysa ona geç
            window.selectedFurnitureIndex = targetIdx;
            renderSelectedFurniturePanel();

            // Sürükleme başlat
            draggedFurnitureIndex = targetIdx;
            dragStartX = coords.x;
            dragStartY = coords.y;
            hasActuallyMoved = false;
            dragOffsetX = item.x - coords.x;
            dragOffsetY = item.y - coords.y;
            isFurnitureDragging = true;
            window.wasFurnitureDragged = false;
            gCanvas.style.cursor = 'grabbing';
            e.preventDefault();
            e.stopPropagation();
        } else {
            // Düzenleme modundayken boş zemine tıklandığında seçimi kaldır
            if (isOwner && window.isHouseEditMode && window.selectedFurnitureIndex !== null) {
                window.selectedFurnitureIndex = null;
                renderSelectedFurniturePanel();
            }
        }
    }, true);

    gCanvas.addEventListener('mousemove', (e) => {
        if (!isCurrentlyInMyHouse()) return;
        let coords = getCanvasCoords(e);

        if (isFurnitureDragging && draggedFurnitureIndex !== null && window.isHouseEditMode) {
            if (Math.hypot(coords.x - dragStartX, coords.y - dragStartY) > 5) {
                hasActuallyMoved = true;
                window.wasFurnitureDragged = true;
            }

            let house = getCurrentViewingHouse();
            if (house && house.furniture && house.furniture[draggedFurnitureIndex]) {
                let draggedItem = house.furniture[draggedFurnitureIndex];

                // 20px GÖRÜNMEZ IZGARAYA YAPIŞMA (SNAP-TO-GRID 20px)
                let rawX = coords.x + dragOffsetX;
                let rawY = coords.y + dragOffsetY;
                let newX = Math.round(rawX / 20) * 20;
                let newY = Math.round(rawY / 20) * 20;

                newX = Math.max(60, Math.min(gCanvas.width - 60, newX));
                newY = Math.max(160, Math.min(gCanvas.height - 40, newY));

                // KATI MADDE ÇARPIŞMASI:
                if (draggedItem.id !== 'hali') {
                    let cat1 = FURNITURE_CATALOG[draggedItem.id] || { w: 60, h: 50 };
                    let w1 = cat1.w;
                    let h1 = cat1.h;

                    let canMoveX = true;
                    let canMoveY = true;

                    for (let i = 0; i < house.furniture.length; i++) {
                        if (i === draggedFurnitureIndex) continue;
                        let other = house.furniture[i];
                        if (other.id === 'hali') continue;

                        let cat2 = FURNITURE_CATALOG[other.id] || { w: 60, h: 50 };
                        let w2 = cat2.w;
                        let h2 = cat2.h;

                        let minDx = (w1 + w2) / 2 - 8;
                        let minDy = (h1 + h2) / 2 - 8;

                        if (Math.abs(newX - other.x) < minDx && Math.abs(draggedItem.y - other.y) < minDy) {
                            canMoveX = false;
                        }
                        if (Math.abs(draggedItem.x - other.x) < minDx && Math.abs(newY - other.y) < minDy) {
                            canMoveY = false;
                        }
                    }

                    if (canMoveX) draggedItem.x = newX;
                    if (canMoveY) draggedItem.y = newY;
                } else {
                    draggedItem.x = newX;
                    draggedItem.y = newY;
                }

                gCanvas.style.cursor = 'grabbing';
            }
        } else {
            let targetIdx = findFurnitureAt(coords.x, coords.y);
            hoveredFurnitureIndex = targetIdx;
            if (targetIdx !== null && window.isHouseEditMode) {
                gCanvas.style.cursor = 'pointer';
            }
        }
    });

    window.addEventListener('mouseup', () => {
        if (isFurnitureDragging && draggedFurnitureIndex !== null) {
            let house = getCurrentViewingHouse();
            if (house && house.furniture && house.furniture[draggedFurnitureIndex]) {
                let item = house.furniture[draggedFurnitureIndex];

                if (hasActuallyMoved) {
                    // SÜRÜKLEME TESPİT EDİLDİ: 20px ızgaraya oturmuş yeni konumu kaydet
                    socket.emit('moveFurniture', {
                        index: draggedFurnitureIndex,
                        x: item.x,
                        y: item.y,
                        rotation: ((item.rotation || 0) % 4 + 4) % 4
                    });
                }
                // TIKLAMA TESPİT EDİLDİ (!hasActuallyMoved):
                // EŞYA DÖNDÜRÜLMEZ! Eşya sadece seçili kalır.
                // Döndürme için aşağıdaki "🔄 Eşyayı Döndür" butonuna basılır veya R tuşu kullanılır.
            }
            isFurnitureDragging = false;
            draggedFurnitureIndex = null;
            hasActuallyMoved = false;
            if (gCanvas) gCanvas.style.cursor = 'default';
            if (window.isHouseEditMode) {
                renderSelectedFurniturePanel();
                renderBottomDockFurnitureUI();
            }
            setTimeout(() => { window.wasFurnitureDragged = false; }, 100);
        }
    });
}

function rotateFurniture(index) {
    let house = getCurrentViewingHouse();
    if (!house || !house.furniture || !house.furniture[index]) return;
    let item = house.furniture[index];
    let curRot = (typeof item.rotation === 'number') ? item.rotation : 0;
    item.rotation = (curRot + 1) % 4;
    let facingList = ['front-right', 'front-left', 'back-left', 'back-right'];
    item.facing = facingList[item.rotation];

    socket.emit('rotateFurniture', {
        index: index,
        rotation: item.rotation,
        facing: item.facing
    });

    if (window.playSound) window.playSound('click');
    if (window.isHouseEditMode) {
        renderSelectedFurniturePanel();
        renderBottomDockFurnitureUI();
    }
}
window.rotateFurniture = rotateFurniture;

function rotateSelectedFurniture() {
    let house = getCurrentViewingHouse();
    if (!house || !house.furniture) return;
    if (typeof window.selectedFurnitureIndex === 'number' && window.selectedFurnitureIndex !== null && house.furniture[window.selectedFurnitureIndex]) {
        rotateFurniture(window.selectedFurnitureIndex);
    }
}
window.rotateSelectedFurniture = rotateSelectedFurniture;

function removeSelectedFurniture() {
    let house = getCurrentViewingHouse();
    if (!house || !house.furniture) return;
    if (typeof window.selectedFurnitureIndex === 'number' && window.selectedFurnitureIndex !== null && house.furniture[window.selectedFurnitureIndex]) {
        let idx = window.selectedFurnitureIndex;
        window.selectedFurnitureIndex = null;
        removeFurnitureFromRoom(idx);
        renderSelectedFurniturePanel();
        renderBottomDockFurnitureUI();
    }
}
window.removeSelectedFurniture = removeSelectedFurniture;

function deselectFurniture() {
    window.selectedFurnitureIndex = null;
    renderSelectedFurniturePanel();
}
window.deselectFurniture = deselectFurniture;

function renderSelectedFurniturePanel() {
    const box = document.getElementById('selectedFurnitureControlBox');
    if (!box) return;

    let house = getCurrentViewingHouse();
    let hasSelection = (typeof window.selectedFurnitureIndex === 'number' && 
                        window.selectedFurnitureIndex !== null && 
                        house && house.furniture && 
                        house.furniture[window.selectedFurnitureIndex]);

    if (!hasSelection) {
        box.style.border = "1.5px dashed rgba(148, 163, 184, 0.35)";
        box.style.background = "rgba(30, 41, 59, 0.7)";
        box.style.boxShadow = "none";
        box.innerHTML = `
            <div style="font-size: 20px; margin-bottom: 2px;">👆</div>
            <div style="font-size: 11px; font-weight: 800; color: #cbd5e1;">Eşya Seçilmedi</div>
            <div style="font-size: 10px; color: #94a3b8; line-height: 1.25; margin-top: 2px;">Odadaki bir eşyaya tıklayarak seçin, yerini değiştirin veya döndürün.</div>
        `;
        return;
    }

    let item = house.furniture[window.selectedFurnitureIndex];
    let cat = FURNITURE_CATALOG[item.id] || { name: item.id, emoji: '📦' };
    let rot = ((item.rotation || 0) % 4 + 4) % 4;
    let rotInfo = getFurnitureRotationInfo(rot);

    box.style.border = "1.5px solid #38bdf8";
    box.style.background = "linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))";
    box.style.boxShadow = "0 0 16px rgba(56, 189, 248, 0.25)";
    box.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%;">
            <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; text-align: left;">
                <span style="font-size: 22px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">${cat.emoji || '📦'}</span>
                <div style="overflow: hidden;">
                    <div style="font-size: 12px; font-weight: 800; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;" title="${cat.name}">${cat.name}</div>
                    <div style="font-size: 10px; font-weight: 700; color: #38bdf8;">Açı: ${rotInfo.label}</div>
                </div>
            </div>
            <button onclick="deselectFurniture()" title="Seçimi Kaldır" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #94a3b8; border-radius: 6px; padding: 2px 7px; font-size: 10px; cursor: pointer; font-weight: 600;">✕ Bırak</button>
        </div>
        <div style="display: flex; gap: 6px; width: 100%; margin-top: 6px;">
            <button id="btnRotateSelectedFurn" onclick="rotateSelectedFurniture()" style="flex: 1.3; padding: 7px 10px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; border-radius: 6px; font-weight: 800; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; box-shadow: 0 2px 8px rgba(245, 158, 11, 0.35); white-space: nowrap;" title="Eşyayı 90° çevirir (Kısayol: R)">
                🔄 Eşyayı Döndür
            </button>
            <button onclick="removeSelectedFurniture()" style="padding: 7px 9px; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; border: none; border-radius: 6px; font-weight: 700; font-size: 10px; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3); white-space: nowrap;" title="Eşyayı Odanızdan Kaldırıp Depoya Koyar">
                📦 Depola
            </button>
        </div>
    `;
}
window.renderSelectedFurniturePanel = renderSelectedFurniturePanel;

// R tuşu ile mobilya düzenleme modunda hızlı izometrik yön çevirme (Sağ / Sol)
window.addEventListener('keydown', (e) => {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
    if (window.isHouseEditMode && (e.key === 'r' || e.key === 'R')) {
        let house = getCurrentViewingHouse();
        if (house && house.furniture && house.furniture.length > 0) {
            let targetIdx = (typeof window.selectedFurnitureIndex === 'number' && window.selectedFurnitureIndex !== null)
                ? window.selectedFurnitureIndex
                : ((typeof draggedFurnitureIndex !== 'undefined' && draggedFurnitureIndex !== null) 
                    ? draggedFurnitureIndex 
                    : house.furniture.length - 1);
            if (targetIdx >= 0 && targetIdx < house.furniture.length) {
                rotateFurniture(targetIdx);
            }
        }
    }
});

// --- 5.1 KOMPAKT EV DÜZENLEME ŞERİDİ (BOTTOM DOCK) & KAPI KİLİDİ ---
window.isHouseEditMode = false;
window.isGramophonePlaying = false;

function toggleHouseEditMode() {
    if (!isCurrentlyInMyHouse()) {
        alert("Mobilya düzenlemek için kendi evinizde olmalısınız!");
        return;
    }
    if (window.isHouseEditMode) {
        saveAndCloseHouseEditDock();
    } else {
        openHouseEditDock();
    }
}
window.toggleHouseEditMode = toggleHouseEditMode;

function openHouseEditDock() {
    window.isHouseEditMode = true;
    window.selectedFurnitureIndex = null;
    const dock = document.getElementById('furnitureBottomDock');
    if (dock) dock.style.display = 'flex';

    const btn = document.getElementById('btnEditHouseFurniture');
    if (btn) {
        btn.innerHTML = "💾 Düzenlemeyi Bitir";
        btn.style.background = "linear-gradient(135deg, #10b981, #059669)";
    }

    let house = getCurrentViewingHouse();
    const privSelect = document.getElementById('houseDoorPrivacySelect');
    if (privSelect && house) {
        privSelect.value = house.privacy || 'public';
    }

    renderSelectedFurniturePanel();
    renderBottomDockFurnitureUI();
    if (typeof showSocialNotificationToast === 'function') {
        showSocialNotificationToast('🛠️', 'Ev Düzenleme Açık', 'Eşyaya tıklayıp seçebilir, aşağıdaki butonla döndürebilirsiniz.');
    }
}
window.openHouseEditDock = openHouseEditDock;

function saveAndCloseHouseEditDock() {
    window.isHouseEditMode = false;
    window.selectedFurnitureIndex = null;
    const dock = document.getElementById('furnitureBottomDock');
    if (dock) dock.style.display = 'none';

    const btn = document.getElementById('btnEditHouseFurniture');
    if (btn) {
        btn.innerHTML = "🛋️ Evi Düzenle";
        btn.style.background = "linear-gradient(135deg, #8b5cf6, #6d28d9)";
    }

    renderSelectedFurniturePanel();
    if (typeof showSocialNotificationToast === 'function') {
        showSocialNotificationToast('✅', 'Kayıt Başarılı', 'Ev düzenlemeniz kaydedildi, eşyalar kilitlendi.');
    }
}
window.saveAndCloseHouseEditDock = saveAndCloseHouseEditDock;

function handleDoorPrivacyChange(newPrivacy) {
    let house = getCurrentViewingHouse();
    if (!house) return;
    socket.emit('setHousePrivacy', {
        type: house.type,
        privacy: newPrivacy
    });
}
window.handleDoorPrivacyChange = handleDoorPrivacyChange;

function renderBottomDockFurnitureUI() {
    const list = document.getElementById('bottomDockFurnitureList');
    if (!list) return;
    list.innerHTML = "";

    let inv = getMyFurnitureInventory();
    if (inv.length === 0) {
        list.innerHTML = `<div style="color: #94a3b8; font-size: 11px; padding: 10px;">📦 Depoda yerleştirilmemiş mobilya yok. Markete gidip eşya alabilirsiniz.</div>`;
        return;
    }

    let counts = {};
    inv.forEach(id => { counts[id] = (counts[id] || 0) + 1; });

    Object.keys(counts).forEach(itemId => {
        let count = counts[itemId];
        let item = FURNITURE_CATALOG[itemId] || { name: itemId, emoji: '📦', image: '' };

        let card = document.createElement('div');
        card.style.cssText = "min-width: 86px; max-width: 90px; height: 90px; background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 6px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; text-align: center; flex-shrink: 0;";

        card.innerHTML = `
            <div style="font-size: 22px; line-height: 1;">${item.emoji || '📦'}</div>
            <div style="font-size: 11px; font-weight: 700; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80px;" title="${item.name}">${item.name} (${count})</div>
            <button onclick="placeFurnitureFromDock('${itemId}')" style="padding: 4px 8px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 5px; font-size: 10px; font-weight: 800; cursor: pointer; width: 100%;">➕ Koy</button>
        `;
        list.appendChild(card);
    });
}
window.renderBottomDockFurnitureUI = renderBottomDockFurnitureUI;

function placeFurnitureFromDock(itemId) {
    placeFurnitureInRoom(itemId);
    setTimeout(() => {
        let house = getCurrentViewingHouse();
        if (house && house.furniture && house.furniture.length > 0) {
            window.selectedFurnitureIndex = house.furniture.length - 1;
            renderSelectedFurniturePanel();
        }
        renderBottomDockFurnitureUI();
    }, 250);
}
window.placeFurnitureFromDock = placeFurnitureFromDock;

// --- 6. SANALİKA TARZI ESTETİK EV İÇİ VE MOBİLYA ÇİZİMİ (ÖNBELLEKLİ & AKICI) ---
function renderStaticHouseTo(bctx, type, width, height) {
    if (type === 'pool') {
        // --- BAHÇELİ & HAVUZLU LÜKS VİLLA ---
        let skyGrad = bctx.createLinearGradient(0, 0, 0, 130);
        skyGrad.addColorStop(0, '#0284c7');
        skyGrad.addColorStop(0.6, '#38bdf8');
        skyGrad.addColorStop(1, '#bae6fd');
        bctx.fillStyle = skyGrad;
        bctx.fillRect(0, 0, width, 130);

        // Kristal Turkuaz Yüzme Havuzu (Işıltılı & Canlı)
        let poolGrad = bctx.createLinearGradient(140, 20, 660, 120);
        poolGrad.addColorStop(0, '#0284c7');
        poolGrad.addColorStop(0.5, '#06b6d4');
        poolGrad.addColorStop(1, '#22d3ee');
        bctx.fillStyle = poolGrad;
        bctx.beginPath();
        bctx.roundRect(140, 20, 520, 95, 12);
        bctx.fill();

        bctx.strokeStyle = "#e0f2fe";
        bctx.lineWidth = 3.5;
        bctx.stroke();

        // Havuz Şezlongları & Palmiye Süsleri
        drawPoolLounger(bctx, 45, 50);
        drawPoolLounger(bctx, 85, 75);
        drawSunUmbrella(bctx, 705, 55);

        // Cam Teras Korkuluğu
        bctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        bctx.fillRect(0, 122, width, 12);
        bctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
        bctx.lineWidth = 1.5;
        bctx.strokeRect(0, 122, width, 12);

        // İç Zemin: İtalyan Carrara Parlak Mermeri
        let floorGrad = bctx.createLinearGradient(0, 134, 0, height);
        floorGrad.addColorStop(0, '#f8fafc');
        floorGrad.addColorStop(0.4, '#f1f5f9');
        floorGrad.addColorStop(1, '#e2e8f0');
        bctx.fillStyle = floorGrad;
        bctx.fillRect(0, 134, width, height - 134);

        bctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
        bctx.lineWidth = 1;
        for (let x = 0; x < width; x += 55) {
            bctx.beginPath(); bctx.moveTo(x, 134); bctx.lineTo(x, height); bctx.stroke();
        }
        for (let y = 134; y < height; y += 55) {
            bctx.beginPath(); bctx.moveTo(0, y); bctx.lineTo(width, y); bctx.stroke();
        }

        // Duvar Boyu Gizli LED Işık Şeridi
        let ledGlow = bctx.createLinearGradient(0, 134, 0, 180);
        ledGlow.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
        ledGlow.addColorStop(1, 'rgba(6, 182, 212, 0)');
        bctx.fillStyle = ledGlow;
        bctx.fillRect(0, 134, width, 46);

    } else if (type === 'garden') {
        // --- VERANDALI BAHÇELİ EV ---
        let lawnGrad = bctx.createLinearGradient(0, 0, 0, 130);
        lawnGrad.addColorStop(0, '#14532d');
        lawnGrad.addColorStop(0.7, '#16a34a');
        lawnGrad.addColorStop(1, '#22d3ee');
        bctx.fillStyle = lawnGrad;
        bctx.fillRect(0, 0, width, 130);

        bctx.fillStyle = "#fef08a";
        for (let fx = 12; fx < width; fx += 24) {
            bctx.beginPath();
            bctx.moveTo(fx, 45);
            bctx.lineTo(fx + 5, 38);
            bctx.lineTo(fx + 10, 45);
            bctx.lineTo(fx + 10, 75);
            bctx.lineTo(fx, 75);
            bctx.closePath();
            bctx.fill();
        }
        bctx.fillStyle = "#fef9c3";
        bctx.fillRect(0, 50, width, 5);
        bctx.fillRect(0, 65, width, 5);

        let flowerColors = ['#f43f5e', '#facc15', '#a855f7', '#fb923c', '#ec4899'];
        for (let i = 0; i < 28; i++) {
            bctx.fillStyle = flowerColors[i % flowerColors.length];
            let flX = 20 + i * 27;
            let flY = 78 + Math.sin(i * 3) * 3;
            bctx.beginPath(); bctx.arc(flX, flY, 3.5, 0, Math.PI * 2); bctx.fill();
            bctx.fillStyle = "#fef08a";
            bctx.beginPath(); bctx.arc(flX, flY, 1.2, 0, Math.PI * 2); bctx.fill();
        }

        drawMiniFruitTree(bctx, 110, 32);
        drawMiniFruitTree(bctx, 670, 32);

        bctx.fillStyle = "#5c2c16";
        bctx.fillRect(0, 122, width, 14);

        let deckGrad = bctx.createLinearGradient(0, 136, 0, height);
        deckGrad.addColorStop(0, '#b45309');
        deckGrad.addColorStop(0.5, '#92400e');
        deckGrad.addColorStop(1, '#78350f');
        bctx.fillStyle = deckGrad;
        bctx.fillRect(0, 136, width, height - 136);

        bctx.strokeStyle = "rgba(40, 15, 5, 0.45)";
        bctx.lineWidth = 1.5;
        for (let y = 136; y < height; y += 28) {
            bctx.beginPath(); bctx.moveTo(0, y); bctx.lineTo(width, y); bctx.stroke();
        }
        for (let x = 60; x < width; x += 110) {
            bctx.beginPath(); bctx.moveTo(x, 136); bctx.lineTo(x, height); bctx.stroke();
        }

        let porchLight = bctx.createRadialGradient(width / 2, 136, 10, width / 2, 220, 260);
        porchLight.addColorStop(0, 'rgba(251, 191, 36, 0.28)');
        porchLight.addColorStop(1, 'rgba(251, 191, 36, 0)');
        bctx.fillStyle = porchLight;
        bctx.fillRect(0, 136, width, height - 136);

    } else {
        // --- STANDART ŞEHİR DAİRESİ ---
        let wallGrad = bctx.createLinearGradient(0, 0, 0, 136);
        wallGrad.addColorStop(0, '#1e293b');
        wallGrad.addColorStop(0.7, '#0f172a');
        wallGrad.addColorStop(1, '#020617');
        bctx.fillStyle = wallGrad;
        bctx.fillRect(0, 0, width, 136);

        bctx.fillStyle = "rgba(255,255,255,0.18)";
        bctx.fillRect(0, 0, width, 7);

        drawCityWindow(bctx, 160, 18, 125, 95);
        drawCityWindow(bctx, 515, 18, 125, 95);

        [90, 400, 710].forEach(sX => {
            let cone = bctx.createRadialGradient(sX, 45, 2, sX, 60, 45);
            cone.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
            cone.addColorStop(1, 'rgba(254, 240, 138, 0)');
            bctx.fillStyle = cone;
            bctx.beginPath();
            bctx.moveTo(sX - 10, 45);
            bctx.lineTo(sX + 10, 45);
            bctx.lineTo(sX + 35, 115);
            bctx.lineTo(sX - 35, 115);
            bctx.closePath();
            bctx.fill();

            bctx.fillStyle = "#d97706";
            bctx.fillRect(sX - 4, 40, 8, 14);
            bctx.fillStyle = "#fef08a";
            bctx.beginPath(); bctx.arc(sX, 42, 5, 0, Math.PI * 2); bctx.fill();
        });

        bctx.fillStyle = "#0f172a";
        bctx.fillRect(0, 128, width, 10);
        bctx.fillStyle = "#f8fafc";
        bctx.fillRect(0, 128, width, 1.5);

        let floorGrad = bctx.createLinearGradient(0, 138, 0, height);
        floorGrad.addColorStop(0, '#d97706');
        floorGrad.addColorStop(0.6, '#b45309');
        floorGrad.addColorStop(1, '#92400e');
        bctx.fillStyle = floorGrad;
        bctx.fillRect(0, 138, width, height - 138);

        bctx.strokeStyle = "rgba(0,0,0,0.22)";
        bctx.lineWidth = 1;
        for (let y = 138; y < height; y += 26) {
            bctx.beginPath(); bctx.moveTo(0, y); bctx.lineTo(width, y); bctx.stroke();
        }
        for (let x = 40; x < width; x += 80) {
            bctx.beginPath(); bctx.moveTo(x, 138); bctx.lineTo(x, height); bctx.stroke();
        }
    }
}
window.renderStaticHouseTo = renderStaticHouseTo;

function drawHouseEnvironment() {
    setupFurnitureCanvasInteractions();

    let house = getCurrentViewingHouse();
    let type = house ? house.type : 'standart';
    let owner = house ? house.owner : 'Bilinmeyen';
    let isOwner = isCurrentlyInMyHouse();
    let now = Date.now();

    // 1. Önbellekli Statik Ev Tabanı ve Zemin Renderı
    let bg = (typeof bgCache !== 'undefined') ? bgCache.getCanvas('house_' + type, canvas.width, canvas.height) : null;
    if (bg) {
        ctx.drawImage(bg, 0, 0);
    } else {
        renderStaticHouseTo(ctx, type, canvas.width, canvas.height);
    }

    // Yalnızca Havuzlu Villada Canlı Su Dalgalanma Animasyonu (Caustics)
    if (type === 'pool') {
        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.lineWidth = 1.8;
        for (let i = 0; i < 4; i++) {
            let wy = 38 + i * 20 + Math.sin(now / 700 + i * 1.5) * 4;
            ctx.beginPath();
            ctx.moveTo(170, wy);
            ctx.bezierCurveTo(280, wy - 6, 420, wy + 6, 620, wy);
            ctx.stroke();
        }
    }

    // 2. EV SAHİBİ VE BAŞLIK BİLGİSİ
    let titleText = `🏠 ${owner}'in Evi (${HOUSE_INFO[type]?.name || 'Ev'})`;
    let bannerH = isOwner ? 46 : 34;
    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    ctx.beginPath();
    ctx.roundRect(canvas.width / 2 - 220, 8, 440, bannerH, 10);
    ctx.fill();
    ctx.strokeStyle = isOwner ? "#10b981" : "#38bdf8";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.fillStyle = "#facc15";
    ctx.font = "bold 14px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(titleText, canvas.width / 2, 28);

    if (isOwner) {
        ctx.fillStyle = window.isHouseEditMode ? "#34d399" : "#94a3b8";
        ctx.font = "bold 11px 'Plus Jakarta Sans', sans-serif";
        let subMsg = window.isHouseEditMode
            ? "🛠️ Düzenleme Modu (20px Izgara) • Eşyaya tıklayıp seçin, alttaki butonla çevirin • Alttan 'Kaydet'e basın"
            : "🔒 Eşyalar Kilitli • Evi dekore etmek için '🛋️ Evi Düzenle' butonuna basın";
        ctx.fillText(subMsg, canvas.width / 2, 45);
    }

    // GÖRÜNMEZ 20px IZGARA (DÜZENLEME MODUNDA GÖRSEL NOKTALAR)
    if (window.isHouseEditMode) {
        ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
        for (let gx = 60; gx <= canvas.width - 60; gx += 20) {
            for (let gy = 160; gy <= canvas.height - 35; gy += 20) {
                ctx.beginPath();
                ctx.arc(gx, gy, 1.3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // 3. ODADAKİ MOBİLYALARI ÇİZ
    if (house && house.furniture && house.furniture.length > 0) {
        house.furniture.forEach((item, idx) => {
            let isHovered = isOwner && window.isHouseEditMode && (idx === hoveredFurnitureIndex);
            let isDragged = isOwner && window.isHouseEditMode && (idx === draggedFurnitureIndex);
            let isSelected = isOwner && window.isHouseEditMode && (idx === window.selectedFurnitureIndex);
            drawCustomIsometricFurniture(ctx, item, isHovered, isDragged, isSelected);
        });

        // Çalan Gramofondan Yükselen Müzik Notaları
        if (window.isGramophonePlaying) {
            let gram = house.furniture.find(f => f.id === 'gramofon');
            if (gram) {
                let notes = ['🎵', '🎶', '♩', '♪'];
                for (let i = 0; i < 3; i++) {
                    let noteTime = (now / 600 + i * 1.5);
                    let noteY = (gram.y - 32) - ((now / 20 + i * 28) % 46);
                    let noteX = gram.x + Math.sin(noteTime) * 16;
                    let alpha = Math.max(0, 1 - ((gram.y - 32 - noteY) / 46));
                    ctx.save();
                    ctx.fillStyle = `rgba(250, 204, 21, ${alpha})`;
                    ctx.font = "bold 16px sans-serif";
                    ctx.fillText(notes[i % notes.length], noteX, noteY);
                    ctx.restore();
                }
            }
        }
    }

    // 4. ÇIKIŞ KAPISI (Sol Altta "Sokağa Çıkış")
    ctx.fillStyle = "#78350f";
    ctx.fillRect(20, canvas.height - 65, 45, 55);
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, canvas.height - 65, 45, 55);
    ctx.fillStyle = "#facc15";
    ctx.beginPath(); ctx.arc(55, canvas.height - 38, 3, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🚪 MEYDAN", 42, canvas.height - 72);
}
window.drawHouseEnvironment = drawHouseEnvironment;

// --- 7. ÖZGÜN ZENGİN MOBİLYA ÇİZİM MOTORU (4 YÖNLÜ İZOMETRİK) ---
function drawCustomIsometricFurniture(ctx, item, isHovered, isDragged, isSelected) {
    let x = item.x;
    let y = item.y;
    let id = item.id;
    let rot = ((item.rotation || 0) % 4 + 4) % 4;
    let now = Date.now();
    let cat = FURNITURE_CATALOG[id] || { w: 60, h: 45 };

    let isTransposed = (rot === 1 || rot === 3);
    let effW = isTransposed ? cat.h : cat.w;
    let effH = isTransposed ? cat.w : cat.h;

    ctx.save();

    // 1. Zemin Gölgesi (4 yöne göre izometrik elips)
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    ctx.beginPath();
    ctx.ellipse(x, y + (effH / 2) - 4, effW * 0.46, Math.max(6, effH * 0.16), 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. 4 Yönlü Özgün İzometrik Çizim Motoru
    if (window.FURNITURE_DRAWERS && typeof window.FURNITURE_DRAWERS[id] === 'function') {
        window.FURNITURE_DRAWERS[id](ctx, x, y, rot, now);
    }

    // 3. Seçim / Sürükleme Vurgulamaları
    let rotAngle = rot * 90;
    if (isDragged) {
        let hw = effW / 2 + 6;
        let hh = effH / 2 + 6;
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(x - hw, y - hh, hw * 2, hh * 2);
        ctx.setLineDash([]);

        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(x - hw - 3, y - hh - 3, 6, 6);
        ctx.fillRect(x + hw - 3, y - hh - 3, 6, 6);
        ctx.fillRect(x - hw - 3, y + hh - 3, 6, 6);
        ctx.fillRect(x + hw - 3, y + hh - 3, 6, 6);

        ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
        ctx.beginPath();
        ctx.roundRect(x - 65, y - hh - 24, 130, 20, 6);
        ctx.fill();
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = "#facc15";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`📍 (${x}, ${y}) • 🔄 ${rotAngle}°`, x, y - hh - 10);

    } else if (isSelected) {
        let hw = effW / 2 + 6;
        let hh = effH / 2 + 6;
        
        // Işıltılı Canlı Neon Çerçeve
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(x - hw, y - hh, hw * 2, hh * 2);
        ctx.setLineDash([]);

        // Köşe İşaretçileri (Corner handles)
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(x - hw - 3, y - hh - 3, 7, 7);
        ctx.fillRect(x + hw - 4, y - hh - 3, 7, 7);
        ctx.fillRect(x - hw - 3, y + hh - 4, 7, 7);
        ctx.fillRect(x + hw - 4, y + hh - 4, 7, 7);

        // Seçili Rozeti (Üstte şık etiket)
        let labelText = `✨ SEÇİLİ • ${cat.name || 'Eşya'} (${rotAngle}°)`;
        ctx.font = "bold 10px sans-serif";
        let textW = ctx.measureText(labelText).width;
        let badgeW = Math.max(120, textW + 20);

        ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
        ctx.beginPath();
        ctx.roundRect(x - badgeW / 2, y - hh - 25, badgeW, 20, 6);
        ctx.fill();
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = "#38bdf8";
        ctx.textAlign = "center";
        ctx.fillText(labelText, x, y - hh - 11);

    } else if (isHovered) {
        let hw = effW / 2 + 4;
        let hh = effH / 2 + 4;
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x - hw, y - hh, hw * 2, hh * 2);
        ctx.setLineDash([]);

        ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
        ctx.beginPath();
        ctx.roundRect(x - 70, y - hh - 24, 140, 20, 6);
        ctx.fill();
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = "#facc15";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`👆 Seçmek için tıkla`, x, y - hh - 10);
    }

    ctx.restore();
}

function drawCityWindow(ctx, x, y, w, h) {
    ctx.fillStyle = "#0284c7";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h);
    ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2);
    ctx.stroke();
}

function drawPoolLounger(ctx, x, y) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, 40, 16);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(x + 4, y + 3, 10, 10);
}

function drawSunUmbrella(ctx, x, y) {
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(x, y, 22, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 28); ctx.stroke();
}

function drawMiniFruitTree(ctx, x, y) {
    ctx.fillStyle = "#5c2c16";
    ctx.fillRect(x - 4, y + 10, 8, 20);
    ctx.fillStyle = "#166534";
    ctx.beginPath(); ctx.arc(x, y + 6, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath(); ctx.arc(x - 6, y + 2, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 6, y + 8, 3, 0, Math.PI * 2); ctx.fill();
}

// --- 8. SOCKET DINLEYICILERI (HOUSING) ---
if (typeof socket !== 'undefined') {
    socket.on('housesUpdate', (houses) => {
        window.myHouses = houses || {};
        if (document.getElementById('realEstateModal')?.style.display === 'flex') {
            renderRealEstateUI();
        }
    });

    socket.on('houseDataUpdate', (house) => {
        if (house) {
            window.currentViewingHouse = house;
            let me = (window.myUsername || (typeof myUsername !== 'undefined' ? myUsername : '') || (typeof players !== 'undefined' && players[myId]?.name) || '').toLowerCase();
            if (house.owner && house.owner.toLowerCase() === me) {
                window.myHouseData = house;
                if (!window.myHouses) window.myHouses = {};
                window.myHouses[house.type] = house;
            }
        }
        updateHouseEditButtonVisibility();
        if (typeof window.invalidateBgCache === 'function') window.invalidateBgCache();
        if (document.getElementById('furniturePlacementModal')?.style.display === 'flex') {
            renderFurniturePlacementUI();
        }
    });

    socket.on('furnitureInventoryUpdate', (inv) => {
        window.myFurnitureInventory = inv || [];
        if (document.getElementById('furniturePlacementModal')?.style.display === 'flex') {
            renderFurniturePlacementUI();
        }
        if (document.getElementById('furnitureMarketModal')?.style.display === 'flex') {
            renderFurnitureMarketUI();
        }
    });

    socket.on('furnitureBuySuccess', (data) => {
        if (typeof playSound === 'function') playSound('coin');
        let item = FURNITURE_CATALOG[data.itemId];
        let name = item ? item.name : data.itemId;
        let emoji = item ? item.emoji : '🛋️';
        if (typeof showSocialNotificationToast === 'function') {
            showSocialNotificationToast(emoji, 'Satın Alındı! 🎉', `${name} satın alındı! Envanterinize eklendi.`);
        }
        renderFurnitureMarketUI();
    });

    socket.on('availableHousesList', (data) => {
        renderAvailableHousesUI(data);
    });

    socket.on('houseFurnitureSync', (furnitureList) => {
        if (window.currentViewingHouse) {
            window.currentViewingHouse.furniture = furnitureList || [];
        }
        if (window.myHouseData && isCurrentlyInMyHouse()) {
            window.myHouseData.furniture = furnitureList || [];
            if (window.myHouses && window.currentViewingHouse?.type) {
                window.myHouses[window.currentViewingHouse.type].furniture = furnitureList || [];
            }
        }
        if (typeof window.selectedFurnitureIndex === 'number' && window.selectedFurnitureIndex !== null) {
            if (!furnitureList || window.selectedFurnitureIndex >= furnitureList.length) {
                window.selectedFurnitureIndex = null;
            }
        }
        if (window.isHouseEditMode) {
            if (typeof renderSelectedFurniturePanel === 'function') renderSelectedFurniturePanel();
            if (typeof renderBottomDockFurnitureUI === 'function') renderBottomDockFurnitureUI();
        }
        if (document.getElementById('furniturePlacementModal')?.style.display === 'flex') {
            renderFurniturePlacementUI();
        }
    });

    socket.on('gameError', (msg) => {
        // Hata durumunda satın al butonlarını normale döndür
        let allBuyBtns = document.querySelectorAll('[id^="buyBtn_"]');
        allBuyBtns.forEach(btn => {
            btn.disabled = false;
            btn.innerText = '🛒 Satın Al';
            btn.style.opacity = '1';
        });
    });

    socket.on('gramophoneStateUpdate', (data) => {
        window.isGramophonePlaying = !!data.isPlaying;
        if (data.isPlaying) {
            if (window.playGramophoneMusic) window.playGramophoneMusic();
            if (typeof showSocialNotificationToast === 'function') {
                showSocialNotificationToast('🎶', 'Gramofon Çalıyor', 'Nostaljik melodiler çalmaya başladı.');
            }
        } else {
            if (window.stopGramophoneMusic) window.stopGramophoneMusic();
            if (typeof showSocialNotificationToast === 'function') {
                showSocialNotificationToast('⏹️', 'Gramofon Durduruldu', 'Müzik kapatıldı.');
            }
        }
    });

    socket.on('lemonadeSaleNotification', (data) => {
        if (typeof showSocialNotificationToast === 'function') {
            showSocialNotificationToast('🍋', 'Limonata Sattınız!', `${data.buyer} sizden 1 bardak taze limonata satın aldı! (+${data.amount || 15} TL)`);
        }
        if (window.playSound) window.playSound('coins');
    });

    socket.on('lemonadePurchasedSuccess', (data) => {
        if (typeof showSocialNotificationToast === 'function') {
            showSocialNotificationToast('🍋', 'Buz Gibi Limonata!', `Limonatayı afiyetle içtiniz! (${data.amount || 15} TL ev sahibine ödendi)`);
        }
        if (window.playSound) window.playSound('tea_sip');
    });

    socket.on('housePrivacySync', (data) => {
        let house = getCurrentViewingHouse();
        if (house) house.privacy = data.privacy;
        const privSelect = document.getElementById('houseDoorPrivacySelect');
        if (privSelect) privSelect.value = data.privacy;
    });
}

// Limonata Standı Modal Kontrolleri
function openLemonadeStandModal(house) {
    if (!house) house = getCurrentViewingHouse();
    if (!house) return;
    const modal = document.getElementById('lemonadeStandModal');
    if (!modal) return;
    const ownerSpan = document.getElementById('lemonadeOwnerName');
    if (ownerSpan) ownerSpan.innerText = house.owner || "Ev Sahibi";
    modal.style.display = 'flex';
}
window.openLemonadeStandModal = openLemonadeStandModal;

function closeLemonadeStandModal() {
    const modal = document.getElementById('lemonadeStandModal');
    if (modal) modal.style.display = 'none';
}
window.closeLemonadeStandModal = closeLemonadeStandModal;

function confirmBuyLemonade() {
    let house = getCurrentViewingHouse();
    if (!house) return;
    if (socket) {
        socket.emit('buyLemonadeFromStand', {
            owner: house.owner,
            houseType: house.type
        });
    }
    closeLemonadeStandModal();
}
window.confirmBuyLemonade = confirmBuyLemonade;

// Sayfa yüklendiğinde canvas etkileşimlerini başlat
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupFurnitureCanvasInteractions);
} else {
    setupFurnitureCanvasInteractions();
}

window.drawPlacedFurniture = drawCustomIsometricFurniture;
window.drawCustomIsometricFurniture = drawCustomIsometricFurniture;
