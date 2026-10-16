// public/js/wardrobe.js - Gardırop, Kıyafet Kataloğu ve Özelleştirme Arayüzü

let myMoney = 2000;
let myInventory = {
    hats: ['none', 'bere'],
    faces: ['none'],
    skins: ['#facc15'],
    shirts: ['#3b82f6'],
    shoes: ['none', 'sneakers'],
    props: ['none']
};
let myAvatar = {
    hat: 'bere',
    face: 'none',
    skinColor: '#facc15',
    color: '#3b82f6',
    heldItem: 'none',
    shoes: 'sneakers'
};

const WARDROBE_CATALOG = {
    hats: [
        { id: 'none', name: 'Yok', cost: 0, icon: '🚫' },
        { id: 'bere', name: 'Kırmızı Bere', cost: 200, icon: '🔴', gender: 'male' },
        { id: 'kasket', name: 'Kıraathane Kasketi', cost: 260, icon: '🧢', gender: 'male' },
        { id: 'fes', name: 'Osmanlı Fesi', cost: 320, icon: '🏮', gender: 'male' },
        { id: 'cowboy', name: 'Kovboy Şapkası', cost: 380, icon: '🤠', gender: 'male' },
        // Nostaljik Şapkalar & Özel Aksesuarlar
        { id: 'korsan', name: 'Korsan Kaptanı', cost: 420, icon: '🏴‍☠️' },
        { id: 'sihirbaz', name: 'Sihirbaz Silindiri', cost: 360, icon: '🎩' },
        { id: 'kulaklik', name: 'DJ Kulaklığı', cost: 250, icon: '🎧' },
        // Kadın Saç Modelleri & Şapkalar
        { id: 'hair_long', name: 'Uzun Düz Saç', cost: 260, icon: '👩', gender: 'female' },
        { id: 'hair_wavy', name: 'Dalgalı Saç', cost: 320, icon: '💇‍♀️', gender: 'female' },
        { id: 'hair_ponytail', name: 'At Kuyruğu', cost: 280, icon: '👱‍♀️', gender: 'female' },
        { id: 'hair_braids', name: 'Örgülü Saç', cost: 290, icon: '👧', gender: 'female' },
        { id: 'hair_bob', name: 'Küt Kesim Saç', cost: 240, icon: '👩‍🦰', gender: 'female' },
        { id: 'hair_hijab', name: 'Şık Başörtüsü', cost: 250, icon: '🧕', gender: 'female' },
        { id: 'beret_pink', name: 'Pembe Fransız Bere', cost: 260, icon: '🌸', gender: 'female' },
        { id: 'crown', name: 'Prenses Tacı', cost: 480, icon: '👑', gender: 'female' }
    ],
    faces: [
        { id: 'none', name: 'Sade', cost: 0, icon: '🙂' },
        { id: 'mustache', name: 'Pala Bıyık', cost: 240, icon: '🥸', gender: 'male' },
        { id: 'sunglasses', name: 'Havalı Gözlük', cost: 300, icon: '🕶️' },
        { id: 'beard', name: 'Kirli Sakal', cost: 360, icon: '🧔', gender: 'male' }
    ],
    skins: [
        { id: '#facc15', name: 'Klasik Sarı', cost: 0, color: '#facc15' },
        { id: '#ffd1a4', name: 'Açık Ten', cost: 240, color: '#ffd1a4' },
        { id: '#d2996c', name: 'Buğday Ten', cost: 300, color: '#d2996c' },
        { id: '#8d5524', name: 'Esmer Ten', cost: 360, color: '#8d5524' }
    ],
    shirts: [
        // Erkek / Unisex Tişört & Üstler
        { id: '#3b82f6', name: 'Mavi Tişört', cost: 0, color: '#3b82f6' },
        { id: '#ef4444', name: 'Kırmızı Tişört', cost: 100, color: '#ef4444' },
        { id: '#10b981', name: 'Yeşil Tişört', cost: 100, color: '#10b981' },
        { id: '#8b5cf6', name: 'Mor Tişört', cost: 100, color: '#8b5cf6' },
        { id: '#f59e0b', name: 'Turuncu Tişört', cost: 100, color: '#f59e0b' },
        { id: '#0f172a', name: 'Siyah Tişört', cost: 100, color: '#0f172a' },
        { id: 'polo', name: 'Beyaz Polo Yaka', cost: 160, color: '#f8fafc', icon: '👔' },
        { id: 'hoodie', name: 'Oversize Hoodie', cost: 220, color: '#6366f1', icon: '🧥' },
        { id: 'leather', name: 'Deri Ceket', cost: 350, color: '#18181b', icon: '🥼' },
        // Kadın Elbiseleri & Etekler
        { id: 'dress_pink', name: 'Pembe Çiçekli Elbise', cost: 280, color: '#ec4899', icon: '👗', gender: 'female' },
        { id: 'dress_black', name: 'Zarif Siyah Gece Elbisesi', cost: 380, color: '#18181b', icon: '👗', gender: 'female' },
        { id: 'dress_red', name: 'Kırmızı Kokteyl Elbisesi', cost: 310, color: '#e11d48', icon: '💃', gender: 'female' },
        { id: 'skirt_crop', name: 'Pileli Etek & Crop', cost: 260, color: '#f43f5e', icon: '👚', gender: 'female' },
        { id: 'skirt_denim', name: 'Kot Etek Kombini', cost: 240, color: '#38bdf8', icon: '🎽', gender: 'female' }
    ],
    shoes: [
        { id: 'none', name: 'Yalınayak', cost: 0, icon: '🦶' },
        { id: 'sneakers', name: 'Spor Sneaker', cost: 180, icon: '👟' },
        { id: 'classic', name: 'Kösele Klasik Ayakkabı', cost: 240, icon: '👞' },
        { id: 'boots', name: 'Kışlık Bot', cost: 280, icon: '🥾' },
        { id: 'heels', name: 'Topuklu Stiletto', cost: 320, icon: '👠', gender: 'female' },
        { id: 'flats', name: 'Babet & Düz Ayakkabı', cost: 190, icon: '🥿', gender: 'female' }
    ],
    props: [
        { id: 'none', name: 'Boş El', cost: 0, icon: '✋' },
        { id: 'nargile', name: 'Tüten Nargile', cost: 700, icon: '💨' },
        { id: 'cay', name: 'İnce Belli Çay', cost: 100, icon: '☕' },
        { id: 'kahve', name: 'Közde Türk Kahvesi', cost: 110, icon: '☕' },
        { id: 'balon', name: 'Uçan Balon', cost: 120, icon: '🎈' },
        { id: 'gazoz', name: 'Nostaljik Gazoz', cost: 140, icon: '🍾' },
        { id: 'tespih', name: 'Kehribar Tespih', cost: 400, icon: '📿' },
        { id: 'olta', name: 'Balıkçı Oltası', cost: 200, icon: '🎣' },
        { id: 'baglama', name: 'Anadolu Bağlaması', cost: 220, icon: '🪕' },
        { id: 'asagold', name: 'Yıldızlı Büyü Asası', cost: 260, icon: '🪄' },
        { id: 'kupa', name: 'Şampiyonluk Kupası', cost: 290, icon: '🏆' },
        { id: 'gitar', name: 'Akustik Gitar', cost: 350, icon: '🎸' },
        { id: 'sirtcantasi', name: 'Gezgin Sırt Çantası', cost: 220, icon: '🎒' }
    ]
};

let currentWardrobeTab = 'hats';
let isWardrobeOpen = false;

function updateMoneyDisplay(amount) {
    myMoney = amount;
    window.myMoney = amount;
    const badge = document.getElementById('moneyDisplay');
    const uBadge = document.getElementById('userMoneyDisplay');
    const wBadge = document.getElementById('wardrobeMoneyDisplay');
    const mBadge = document.getElementById('marketMoneyDisplay');
    if (badge) badge.innerText = myMoney;
    if (uBadge) uBadge.innerText = myMoney;
    if (wBadge) wBadge.innerText = myMoney;
    if (mBadge) mBadge.innerText = myMoney;
}

let previewAvatar = {
    hat: 'bere',
    face: 'none',
    skinColor: '#facc15',
    color: '#3b82f6',
    heldItem: 'none',
    shoes: 'sneakers'
};

function isItemOwned(category, id) {
    if (id === 'none' || id === '#facc15' || id === '#3b82f6') return true;
    let normCat = category.endsWith('s') ? category : (category + 's');
    let key = `${normCat}_${id}`;
    if (normCat === 'props') {
        let propInv = window.myPropInventory || {};
        return (propInv[key] && propInv[key] > 0);
    }
    if (normCat === 'shoes' && (id === 'none' || id === 'sneakers' || id === 'flats')) return true;
    if (Array.isArray(myInventory)) {
        return myInventory.includes(key);
    } else if (myInventory && myInventory[normCat]) {
        return myInventory[normCat].includes(id);
    }
    return false;
}

function openWardrobe() {
    isWardrobeOpen = true;
    previewAvatar = { ...myAvatar };
    renderWardrobeUI();
    const modal = document.getElementById('wardrobeModal');
    if (modal) modal.style.display = 'flex';
    requestAnimationFrame(avatarPreviewLoop);
}

function closeWardrobe() {
    isWardrobeOpen = false;
    previewAvatar = { ...myAvatar };
    const modal = document.getElementById('wardrobeModal');
    if (modal) modal.style.display = 'none';
}

function switchWardrobeTab(tabName) {
    currentWardrobeTab = tabName;
    ['tabHats', 'tabFaces', 'tabSkins', 'tabShirts', 'tabShoes', 'tabProps'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.remove('active');
    });
    if (tabName === 'hats') document.getElementById('tabHats')?.classList.add('active');
    if (tabName === 'faces') document.getElementById('tabFaces')?.classList.add('active');
    if (tabName === 'skins') document.getElementById('tabSkins')?.classList.add('active');
    if (tabName === 'shirts') document.getElementById('tabShirts')?.classList.add('active');
    if (tabName === 'shoes') document.getElementById('tabShoes')?.classList.add('active');
    if (tabName === 'props') document.getElementById('tabProps')?.classList.add('active');
    renderWardrobeActiveGrid();
}

function previewWardrobeItem(category, id) {
    if (category === 'hats') previewAvatar.hat = id;
    else if (category === 'faces') previewAvatar.face = id;
    else if (category === 'skins') previewAvatar.skinColor = id;
    else if (category === 'shirts') previewAvatar.color = id;
    else if (category === 'shoes') previewAvatar.shoes = id;
    else if (category === 'props') previewAvatar.heldItem = id;
    renderWardrobeUI();
}

function renderWardrobeUI() {
    updateMoneyDisplay(myMoney);

    // Rozetleri ve isimleri güncelle
    const pName = players[myId] ? players[myId].name : "Kivre";
    const nameElem = document.getElementById('previewPlayerName');
    if (nameElem) nameElem.innerText = pName;

    const hatItem = WARDROBE_CATALOG.hats.find(h => h.id === previewAvatar.hat);
    const faceItem = WARDROBE_CATALOG.faces.find(f => f.id === previewAvatar.face);
    const skinItem = WARDROBE_CATALOG.skins.find(s => s.id === previewAvatar.skinColor);
    const shirtItem = WARDROBE_CATALOG.shirts.find(c => c.id === previewAvatar.color);
    const shoeItem = (WARDROBE_CATALOG.shoes || []).find(s => s.id === previewAvatar.shoes);
    const propItem = WARDROBE_CATALOG.props.find(p => p.id === previewAvatar.heldItem);

    const hBadge = document.getElementById('currentHatBadge');
    const fBadge = document.getElementById('currentFaceBadge');
    const sBadge = document.getElementById('currentSkinBadge');
    const cBadge = document.getElementById('currentShirtBadge');
    const shBadge = document.getElementById('currentShoeBadge');
    const pBadge = document.getElementById('currentPropBadge');

    if (hBadge) hBadge.innerText = hatItem ? `${hatItem.icon} ${hatItem.name}` : 'Yok';
    if (fBadge) fBadge.innerText = faceItem ? `${faceItem.icon} ${faceItem.name}` : 'Sade';
    if (sBadge) sBadge.innerText = skinItem ? skinItem.name : 'Klasik Sarı';
    if (cBadge) cBadge.innerText = shirtItem ? shirtItem.name : 'Mavi Tişört';
    if (shBadge) shBadge.innerText = shoeItem ? `${shoeItem.icon} ${shoeItem.name}` : 'Sneaker';
    if (pBadge) pBadge.innerText = propItem ? `${propItem.icon} ${propItem.name}` : 'Boş El';

    renderWardrobeActiveGrid();
}

function renderWardrobeActiveGrid() {
    const grid = document.getElementById('wardrobeActiveGrid');
    if (!grid) return;

    let userGender = window.myGender || window.selectedGender || 'male';
    let allItems = WARDROBE_CATALOG[currentWardrobeTab] || [];
    let items = allItems.filter(item => {
        if (!item.gender) return true;
        return item.gender === userGender;
    });

    grid.innerHTML = items.map(item => {
        let isEquippedActive = false;
        let isBeingPreviewed = false;

        if (currentWardrobeTab === 'hats') {
            isEquippedActive = (myAvatar.hat === item.id);
            isBeingPreviewed = (previewAvatar.hat === item.id);
        } else if (currentWardrobeTab === 'faces') {
            isEquippedActive = (myAvatar.face === item.id);
            isBeingPreviewed = (previewAvatar.face === item.id);
        } else if (currentWardrobeTab === 'skins') {
            isEquippedActive = (myAvatar.skinColor === item.id);
            isBeingPreviewed = (previewAvatar.skinColor === item.id);
        } else if (currentWardrobeTab === 'shirts') {
            isEquippedActive = (myAvatar.color === item.id);
            isBeingPreviewed = (previewAvatar.color === item.id);
        } else if (currentWardrobeTab === 'shoes') {
            isEquippedActive = (myAvatar.shoes === item.id);
            isBeingPreviewed = (previewAvatar.shoes === item.id);
        } else if (currentWardrobeTab === 'props') {
            isEquippedActive = (myAvatar.heldItem === item.id);
            isBeingPreviewed = (previewAvatar.heldItem === item.id);
        }

        let owned = isItemOwned(currentWardrobeTab, item.id);

        let visualHtml = "";
        if (item.icon) {
            visualHtml = `<div style="font-size:32px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${item.icon}</div>`;
        } else if (item.color) {
            let isRound = currentWardrobeTab === 'skins';
            visualHtml = `<div style="width:36px; height:36px; border-radius:${isRound ? '50%' : '8px'}; background:${item.color}; border:2px solid rgba(255,255,255,0.6); box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`;
        }

        let buttonHtml = "";
        let propCount = 0;
        if (currentWardrobeTab === 'props' && item.id !== 'none') {
            let pKey = `props_${item.id}`;
            propCount = (window.myPropInventory && window.myPropInventory[pKey]) || 0;
            if (isEquippedActive) {
                buttonHtml = `
                    <button onclick="event.stopPropagation(); if (typeof equipPropItem==='function') equipPropItem('${pKey}')" style="width:100%; padding:5px; border-radius:6px; background:rgba(56,189,248,0.25); border:1px solid #38bdf8; color:#38bdf8; font-weight:800; font-size:11px; cursor:pointer;">🖐️ Elde (Bırak)</button>
                    <button onclick="event.stopPropagation(); buyWardrobeItem('props', '${item.id}')" style="width:100%; margin-top:3px; padding:4px; border-radius:6px; background:linear-gradient(135deg, #f59e0b, #d97706); border:none; color:white; font-weight:800; font-size:10px; cursor:pointer;">+1 Al (${item.cost} TL)</button>
                `;
            } else if (propCount > 0) {
                buttonHtml = `
                    <button onclick="event.stopPropagation(); if (typeof equipPropItem==='function') equipPropItem('${pKey}')" style="width:100%; padding:5px; border-radius:6px; background:linear-gradient(135deg, #10b981, #059669); border:none; color:white; font-weight:800; font-size:11px; cursor:pointer;">🖐️ Eline Al</button>
                    <button onclick="event.stopPropagation(); buyWardrobeItem('props', '${item.id}')" style="width:100%; margin-top:3px; padding:4px; border-radius:6px; background:linear-gradient(135deg, #f59e0b, #d97706); border:none; color:white; font-weight:800; font-size:10px; cursor:pointer;">+1 Al (${item.cost} TL)</button>
                `;
            } else {
                buttonHtml = `<button onclick="event.stopPropagation(); buyWardrobeItem('props', '${item.id}')" style="width:100%; padding:6px; border-radius:6px; background:linear-gradient(135deg, #f59e0b, #d97706); border:none; color:white; font-weight:800; font-size:11px; cursor:pointer; box-shadow:0 2px 6px rgba(245,158,11,0.3);">🛒 Satın Al (${item.cost} TL)</button>`;
            }
        } else {
            if (isEquippedActive) {
                buttonHtml = `<button disabled style="width:100%; padding:6px; border-radius:6px; background:rgba(56,189,248,0.25); border:1px solid #38bdf8; color:#38bdf8; font-weight:800; font-size:11px; cursor:default;">⭐ Üzerinde</button>`;
            } else if (owned) {
                buttonHtml = `<button onclick="event.stopPropagation(); buyWardrobeItem('${currentWardrobeTab}', '${item.id}')" style="width:100%; padding:6px; border-radius:6px; background:linear-gradient(135deg, #10b981, #059669); border:none; color:white; font-weight:800; font-size:11px; cursor:pointer; box-shadow:0 2px 6px rgba(16,185,129,0.3);">✅ Kuşan</button>`;
            } else {
                buttonHtml = `<button onclick="event.stopPropagation(); buyWardrobeItem('${currentWardrobeTab}', '${item.id}')" style="width:100%; padding:6px; border-radius:6px; background:linear-gradient(135deg, #f59e0b, #d97706); border:none; color:white; font-weight:800; font-size:11px; cursor:pointer; box-shadow:0 2px 6px rgba(245,158,11,0.3);">🛒 Satın Al (${item.cost} TL)</button>`;
            }
        }

        let previewBadge = isBeingPreviewed ? `<div style="font-size:10px; color:#facc15; font-weight:bold; margin-top:2px;">👀 Deneniyor</div>` : '';
        let countTag = propCount > 0 ? `<span style="background:linear-gradient(135deg, #f59e0b, #d97706); color:white; font-size:10px; font-weight:800; padding:1px 6px; border-radius:8px; margin-left:4px;">x${propCount}</span>` : '';

        return `
        <div class="wardrobe-item-card ${isEquippedActive ? 'equipped' : ''} ${isBeingPreviewed ? 'previewing' : ''}" 
             onclick="previewWardrobeItem('${currentWardrobeTab}', '${item.id}')" 
             style="cursor:pointer; padding:10px; background:rgba(15,23,42,0.65); display:flex; flex-direction:column; justify-content:space-between; align-items:center; min-height:125px;">
            ${visualHtml}
            <div style="font-size:12px; font-weight:700; margin-top:4px; color:#f8fafc; text-align:center;">${item.name} ${countTag}</div>
            ${previewBadge}
            <div style="width:100%; margin-top:6px;">${buttonHtml}</div>
        </div>`;
    }).join('');
}

function buyWardrobeItem(category, id) {
    socket.emit('buyWardrobeItem', { category: category, id: id });
}


socket.on('wardrobeUpdate', (data) => {
    if (data.inventory) myInventory = data.inventory;
    if (data.avatar) {
        myAvatar = data.avatar;
        if (!myAvatar.shoes) myAvatar.shoes = (window.myGender === 'female' ? 'flats' : 'sneakers');
        previewAvatar = { ...myAvatar };
        if (players[myId]) Object.assign(players[myId], myAvatar);
    }
    renderWardrobeUI();
});

socket.on('playerAvatarChange', (data) => {
    if (players[data.id]) {
        let av = data.avatar || {
            hat: data.hat,
            face: data.face,
            skinColor: data.skinColor,
            color: data.color,
            heldItem: data.heldItem,
            shoes: data.shoes || 'sneakers'
        };
        Object.assign(players[data.id], av);
    }
    if (data.id === myId) {
        let av = data.avatar || {
            hat: data.hat,
            face: data.face,
            skinColor: data.skinColor,
            color: data.color,
            heldItem: data.heldItem,
            shoes: data.shoes || 'sneakers'
        };
        myAvatar = av;
        previewAvatar = { ...myAvatar };
        renderWardrobeUI();
    }
});