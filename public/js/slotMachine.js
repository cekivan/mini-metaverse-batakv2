// public/js/slotMachine.js - ⚡ Dedenin Şimşek Slotu 777 ⚡ İstemci Mantığı

let slotCurrentBet = 50;
let isSlotSpinning = false;
let isSlotAutoSpin = false;
let slotAutoSpinRemaining = 0;

const SLOT_SYMBOLS = [
    { id: 'seven', icon: '7️⃣', name: '777 Lucky', color: '#facc15' },
    { id: 'diamond', icon: '💎', name: 'Elmas', color: '#38bdf8' },
    { id: 'bell', icon: '🔔', name: 'Altın Çan', color: '#fbbf24' },
    { id: 'watermelon', icon: '🍉', name: 'Karpuz', color: '#4ade80' },
    { id: 'grape', icon: '🍇', name: 'Üzüm', color: '#c084fc' },
    { id: 'lemon', icon: '🍋', name: 'Limon', color: '#fde047' },
    { id: 'cherry', icon: '🍒', name: 'Kiraz', color: '#f87171' }
];

function getSymbolObj(id) {
    return SLOT_SYMBOLS.find(s => s.id === id) || SLOT_SYMBOLS[0];
}

// 1. Modalı Açma ve Kapatma
function openSlotModal() {
    const modal = document.getElementById('slotModal');
    if (!modal) return;
    modal.style.display = 'flex';

    updateSlotUserBalance();
    initSlotReels();

    if (window.socket) {
        socket.emit('slot_init');
    }
    if (window.playSound) window.playSound('click');
}
window.openSlotModal = openSlotModal;

function closeSlotModal() {
    if (isSlotSpinning) return;
    isSlotAutoSpin = false;
    updateSlotAutoBtn();
    const modal = document.getElementById('slotModal');
    if (modal) modal.style.display = 'none';
}
window.closeSlotModal = closeSlotModal;

function updateSlotUserBalance() {
    let money = (window.myMoney !== undefined) ? window.myMoney : ((typeof players !== 'undefined' && typeof myId !== 'undefined' && players[myId]) ? players[myId].money : 1000);
    const el = document.getElementById('slotUserBalance');
    if (el) el.innerText = money.toLocaleString('tr-TR');
}

// 2. Çarkları Başlatma / Hazırlama
function initSlotReels() {
    for (let r = 0; r < 3; r++) {
        let reelEl = document.getElementById(`slotReelStrip_${r}`);
        if (!reelEl) continue;
        reelEl.innerHTML = '';

        // Üst, orta ve alt semboller (Başlangıçta 777 veya Kiraz)
        let initialSyms = ['seven', 'cherry', 'diamond', 'watermelon', 'bell', 'seven'];
        initialSyms.forEach(symId => {
            let s = getSymbolObj(symId);
            let item = document.createElement('div');
            item.className = 'slot-symbol-item';
            item.innerHTML = `<span class="slot-sym-icon">${s.icon}</span><span class="slot-sym-name">${s.name}</span>`;
            reelEl.appendChild(item);
        });
        reelEl.style.transform = 'translateY(-80px)';
    }
}

// 3. Bahis Seçimi
function setSlotBet(val) {
    if (isSlotSpinning) return;
    slotCurrentBet = val;
    document.querySelectorAll('.slot-bet-btn').forEach(b => {
        let bVal = parseInt(b.getAttribute('data-val'), 10);
        if (bVal === val) {
            b.classList.add('active');
        } else {
            b.classList.remove('active');
        }
    });
    const betDisplay = document.getElementById('slotCurrentBetDisplay');
    if (betDisplay) betDisplay.innerText = val + ' TL';
    if (window.playSound) window.playSound('click');
}
window.setSlotBet = setSlotBet;

function setSlotMaxBet() {
    if (isSlotSpinning) return;
    setSlotBet(500);
}
window.setSlotMaxBet = setSlotMaxBet;

function toggleSlotAutoSpin() {
    if (isSlotAutoSpin) {
        isSlotAutoSpin = false;
        slotAutoSpinRemaining = 0;
        updateSlotAutoBtn();
        showSlotToast('Otomatik çevirme durduruldu.');
    } else {
        isSlotAutoSpin = true;
        slotAutoSpinRemaining = 10;
        updateSlotAutoBtn();
        showSlotToast('Otomatik 10 çevirme başlatıldı!');
        if (!isSlotSpinning) {
            spinSlot();
        }
    }
}
window.toggleSlotAutoSpin = toggleSlotAutoSpin;

function updateSlotAutoBtn() {
    const btn = document.getElementById('slotAutoSpinBtn');
    if (!btn) return;
    if (isSlotAutoSpin) {
        btn.classList.add('active');
        btn.innerHTML = `🛑 DURDUR (${slotAutoSpinRemaining})`;
    } else {
        btn.classList.remove('active');
        btn.innerHTML = `🔄 OTO (10x)`;
    }
}

// 4. Slot Çevirme Mantığı (Spin)
function spinSlot() {
    if (isSlotSpinning) return;

    let currentBalance = (window.myMoney !== undefined) ? window.myMoney : 1000;
    if (slotCurrentBet > currentBalance) {
        showSlotToast('Yetersiz bakiye!', true);
        isSlotAutoSpin = false;
        updateSlotAutoBtn();
        if (window.playSound) window.playSound('error');
        return;
    }

    // Kol çekme animasyonu
    animateSlotLever();

    // Çarkları döndürmeye başla
    startReelsSpinAnim();

    if (window.socket) {
        socket.emit('slot_spin', { betAmount: slotCurrentBet });
    }
}
window.spinSlot = spinSlot;

function animateSlotLever() {
    const arm = document.getElementById('slotLeverArm');
    const knob = document.getElementById('slotLeverKnob');
    if (!arm || !knob) return;

    arm.style.transform = 'scaleY(0.35) rotate(15deg)';
    knob.style.transform = 'translateY(55px)';

    setTimeout(() => {
        arm.style.transform = 'scaleY(1) rotate(0deg)';
        knob.style.transform = 'translateY(0)';
    }, 320);

    if (window.playSound) window.playSound('click');
}

function startReelsSpinAnim() {
    isSlotSpinning = true;
    updateSlotControlsState();

    // Önceki zafer efektlerini temizle
    document.querySelectorAll('.slot-payline').forEach(l => l.classList.remove('active-win'));
    const banner = document.getElementById('slotWinBanner');
    if (banner) banner.style.display = 'none';

    for (let r = 0; r < 3; r++) {
        let reelEl = document.getElementById(`slotReelStrip_${r}`);
        if (reelEl) {
            reelEl.classList.add('spinning');
        }
    }
}

function stopReelWithSymbol(reelIdx, targetSymId, onStopped) {
    let reelEl = document.getElementById(`slotReelStrip_${reelIdx}`);
    if (!reelEl) return;

    let targetSym = getSymbolObj(targetSymId);

    // Çark şeridini 12 rastgele sembol ve ortada hedef sembol olacak şekilde doldur
    let stripHTML = '';
    for (let i = 0; i < 6; i++) {
        let s = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
        stripHTML += `<div class="slot-symbol-item"><span class="slot-sym-icon">${s.icon}</span><span class="slot-sym-name">${s.name}</span></div>`;
    }

    // KAZANAN HEDEF SEMBOL (Tam Ortada index 6)
    stripHTML += `
        <div class="slot-symbol-item target-symbol" id="slotTargetSym_${reelIdx}">
            <span class="slot-sym-icon">${targetSym.icon}</span>
            <span class="slot-sym-name">${targetSym.name}</span>
        </div>
    `;

    for (let j = 0; j < 4; j++) {
        let s2 = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
        stripHTML += `<div class="slot-symbol-item"><span class="slot-sym-icon">${s2.icon}</span><span class="slot-sym-name">${s2.name}</span></div>`;
    }

    reelEl.innerHTML = stripHTML;
    reelEl.classList.remove('spinning');

    // Her sembol 80px yükseklikte; orta hizaya çekme
    let targetOffset = -(6 * 80);
    reelEl.style.transition = 'transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    reelEl.style.transform = `translateY(${targetOffset}px)`;

    if (window.playSound) window.playSound('card');

    setTimeout(() => {
        if (onStopped) onStopped();
    }, 450);
}

// 5. Soket Dinleyicileri
if (typeof socket !== 'undefined' && socket) {
    socket.on('slot_result', (data) => {
        // Sırayla çarkları durdur (Reel 0: 1.0s, Reel 1: 1.6s, Reel 2: 2.2s)
        setTimeout(() => {
            stopReelWithSymbol(0, data.reels[0], () => {});
        }, 900);

        setTimeout(() => {
            stopReelWithSymbol(1, data.reels[1], () => {});
        }, 1500);

        setTimeout(() => {
            stopReelWithSymbol(2, data.reels[2], () => {
                handleSlotOutcome(data);
            });
        }, 2100);
    });

    socket.on('slot_error', (msg) => {
        showSlotToast(msg, true);
        isSlotSpinning = false;
        isSlotAutoSpin = false;
        updateSlotAutoBtn();
        updateSlotControlsState();
        if (window.playSound) window.playSound('error');
    });
}

function handleSlotOutcome(data) {
    isSlotSpinning = false;
    updateSlotUserBalance();
    updateSlotControlsState();

    const banner = document.getElementById('slotWinBanner');
    const winTitle = document.getElementById('slotWinTitle');
    const winAmount = document.getElementById('slotWinAmount');
    const payline = document.querySelector('.slot-payline');

    if (data.winAmount > 0) {
        if (payline) payline.classList.add('active-win');

        // Hedef sembolleri vurgula
        for (let r = 0; r < 3; r++) {
            let el = document.getElementById(`slotTargetSym_${r}`);
            if (el) el.classList.add('win-pulse');
        }

        if (banner && winTitle && winAmount) {
            winTitle.innerText = data.winType || 'TEBRİKLER!';
            winAmount.innerText = `+${data.winAmount.toLocaleString('tr-TR')} TL (${data.multiplier}x)`;
            banner.style.display = 'flex';
        }

        if (data.isJackpot) {
            if (window.playSound) window.playSound('quest');
            triggerSlotJackpotEffects();
        } else {
            if (window.playSound) window.playSound('quest');
        }
    } else {
        // Kayıp
        showSlotToast(`Kazanamadınız (-${data.betAmount} TL)`, false);
    }

    // Otomatik Çevirme Devamı
    if (isSlotAutoSpin) {
        slotAutoSpinRemaining--;
        updateSlotAutoBtn();

        if (slotAutoSpinRemaining > 0) {
            setTimeout(() => {
                if (isSlotAutoSpin && !isSlotSpinning) {
                    spinSlot();
                }
            }, 1400);
        } else {
            isSlotAutoSpin = false;
            updateSlotAutoBtn();
            showSlotToast('Otomatik çevirme tamamlandı.');
        }
    }
}

function triggerSlotJackpotEffects() {
    const marquee = document.getElementById('slotMarquee');
    if (marquee) {
        marquee.classList.add('jackpot-flash');
        setTimeout(() => marquee.classList.remove('jackpot-flash'), 5000);
    }
}

function updateSlotControlsState() {
    const spinBtn = document.getElementById('slotSpinBtn');
    if (spinBtn) {
        spinBtn.disabled = isSlotSpinning;
        spinBtn.style.opacity = isSlotSpinning ? '0.6' : '1';
    }
}

// 6. Ödül Tablosu Modalı
function toggleSlotPaytable() {
    const modal = document.getElementById('slotPaytableModal');
    if (!modal) return;
    modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
    if (window.playSound) window.playSound('click');
}
window.toggleSlotPaytable = toggleSlotPaytable;

function showSlotToast(msg, isError = false) {
    let existing = document.getElementById('slotToast');
    if (existing) existing.remove();

    let toast = document.createElement('div');
    toast.id = 'slotToast';
    toast.style.cssText = `
        position: fixed;
        top: 60px;
        left: 50%;
        transform: translateX(-50%);
        background: ${isError ? 'rgba(220, 38, 38, 0.95)' : 'rgba(15, 23, 42, 0.95)'};
        color: white;
        padding: 10px 22px;
        border-radius: 12px;
        border: 2px solid ${isError ? '#f87171' : '#facc15'};
        font-weight: 800;
        font-size: 13px;
        z-index: 45000;
        box-shadow: 0 10px 30px rgba(0,0,0,0.6);
        pointer-events: none;
    `;
    toast.innerText = msg;
    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
    }, 2800);
}
