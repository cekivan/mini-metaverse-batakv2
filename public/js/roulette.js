// public/js/roulette.js - VIP Avrupa Ruleti İstemci Mantığı

let rouletteSelectedChip = 50;
let rouletteBets = {};
let isRouletteSpinning = false;
let rouletteWheelAngle = 0;
let rouletteBallAngle = 0;
let rouletteBallRadius = 92;
let rouletteAnimId = null;

const ROULETTE_WHEEL_ORDER = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
    24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];
const ROULETTE_RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

function getRouletteNumColor(num) {
    if (num === 0) return '#10b981'; // Yeşil
    return ROULETTE_RED_NUMBERS.includes(num) ? '#ef4444' : '#1e293b'; // Kırmızı / Siyah
}

// 1. Modalı Açma ve Kapatma
function openRouletteModal() {
    const modal = document.getElementById('rouletteModal');
    if (!modal) return;
    modal.style.display = 'flex';

    updateRouletteUserBalance();
    initRouletteWheelCanvas();

    if (window.socket) {
        socket.emit('roulette_join');
    }
    if (window.playSound) window.playSound('click');
}
window.openRouletteModal = openRouletteModal;

function closeRouletteModal() {
    if (isRouletteSpinning) return; // Çark dönerken kapatılamaz
    const modal = document.getElementById('rouletteModal');
    if (modal) modal.style.display = 'none';
}
window.closeRouletteModal = closeRouletteModal;

function updateRouletteUserBalance() {
    let money = (window.myMoney !== undefined) ? window.myMoney : ((typeof players !== 'undefined' && typeof myId !== 'undefined' && players[myId]) ? players[myId].money : 1000);
    const el = document.getElementById('rouletteUserBalance');
    if (el) el.innerText = money.toLocaleString('tr-TR');
}

// 2. Çip Seçimi & Bahis Yönetimi
function selectRouletteChip(val) {
    if (isRouletteSpinning) return;
    rouletteSelectedChip = val;
    document.querySelectorAll('.roulette-chip').forEach(c => {
        let chipVal = parseInt(c.getAttribute('data-val'), 10);
        if (chipVal === val) {
            c.classList.add('selected');
        } else {
            c.classList.remove('selected');
        }
    });
    if (window.playSound) window.playSound('click');
}
window.selectRouletteChip = selectRouletteChip;

function placeRouletteBet(betKey) {
    if (isRouletteSpinning) return;

    let currentBalance = (window.myMoney !== undefined) ? window.myMoney : 1000;
    let currentTotal = getRouletteTotalBet();

    if (currentTotal + rouletteSelectedChip > currentBalance) {
        showRouletteToast('Yetersiz bakiye!', true);
        if (window.playSound) window.playSound('error');
        return;
    }

    rouletteBets[betKey] = (rouletteBets[betKey] || 0) + rouletteSelectedChip;
    updateRouletteBetUI();
    if (window.playSound) window.playSound('click');
}
window.placeRouletteBet = placeRouletteBet;

function clearRouletteBets() {
    if (isRouletteSpinning) return;
    rouletteBets = {};
    updateRouletteBetUI();
    if (window.playSound) window.playSound('click');
}
window.clearRouletteBets = clearRouletteBets;

function doubleRouletteBets() {
    if (isRouletteSpinning) return;
    let currentBalance = (window.myMoney !== undefined) ? window.myMoney : 1000;
    let currentTotal = getRouletteTotalBet();

    if (currentTotal === 0) return;
    if (currentTotal * 2 > currentBalance) {
        showRouletteToast('İkiye katlamak için yetersiz bakiye!', true);
        if (window.playSound) window.playSound('error');
        return;
    }

    for (let k in rouletteBets) {
        rouletteBets[k] *= 2;
    }
    updateRouletteBetUI();
    if (window.playSound) window.playSound('click');
}
window.doubleRouletteBets = doubleRouletteBets;

function getRouletteTotalBet() {
    return Object.values(rouletteBets).reduce((sum, v) => sum + v, 0);
}

function updateRouletteBetUI() {
    let total = getRouletteTotalBet();
    const totalEl = document.getElementById('rouletteTotalBetAmount');
    if (totalEl) totalEl.innerText = total.toLocaleString('tr-TR');

    // Tablo üzerindeki çip göstergelerini güncelle
    document.querySelectorAll('.roulette-cell').forEach(cell => {
        let key = cell.getAttribute('data-bet');
        let chipBadge = cell.querySelector('.cell-chip-badge');
        let betVal = rouletteBets[key] || 0;

        if (betVal > 0) {
            if (!chipBadge) {
                chipBadge = document.createElement('div');
                chipBadge.className = 'cell-chip-badge';
                cell.appendChild(chipBadge);
            }
            chipBadge.innerText = betVal >= 1000 ? (betVal / 1000) + 'K' : betVal;
            cell.classList.add('has-bet');
        } else {
            if (chipBadge) chipBadge.remove();
            cell.classList.remove('has-bet');
        }
    });

    const spinBtn = document.getElementById('rouletteSpinBtn');
    if (spinBtn) {
        spinBtn.disabled = (total <= 0 || isRouletteSpinning);
        spinBtn.style.opacity = (total <= 0 || isRouletteSpinning) ? '0.5' : '1';
    }
}

// 3. Rulet Çarkını Çizme (Canvas)
function initRouletteWheelCanvas() {
    const canvas = document.getElementById('rouletteWheelCanvas');
    if (!canvas) return;
    drawRouletteWheel(canvas, rouletteWheelAngle, rouletteBallAngle, rouletteBallRadius);
}

function drawRouletteWheel(canvas, wheelAngle, ballAngle, ballRadius) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = width / 2 - 8;
    const pocketOuter = outerRadius - 18;
    const pocketInner = pocketOuter - 28;
    const centerRadius = pocketInner - 8;

    ctx.clearRect(0, 0, width, height);

    // 1. Dış Pirinç / Altın ve Ahşap Çember
    ctx.save();
    let rimGrad = ctx.createRadialGradient(centerX, centerY, outerRadius - 16, centerX, centerY, outerRadius);
    rimGrad.addColorStop(0, '#78350f');
    rimGrad.addColorStop(0.5, '#451a03');
    rimGrad.addColorStop(0.85, '#d97706');
    rimGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Dış top oluğu (Ball track)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(centerX, centerY, pocketOuter + 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // 2. 37 Dilimli Çark (Dönen Kısım)
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(wheelAngle);

    const sliceAngle = (Math.PI * 2) / 37;

    for (let i = 0; i < 37; i++) {
        let num = ROULETTE_WHEEL_ORDER[i];
        let color = getRouletteNumColor(num);
        let startAngle = i * sliceAngle - sliceAngle / 2;
        let endAngle = startAngle + sliceAngle;

        // Dilim Rengi
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, pocketOuter, startAngle, endAngle);
        ctx.closePath();
        ctx.fill();

        // Pirinç Bölmeler
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Sayı Metni
        ctx.save();
        ctx.rotate(i * sliceAngle);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(num.toString(), 0, -pocketOuter + 14);
        ctx.restore();
    }

    // İç Altın Göbek Çemberi
    let hubGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, centerRadius);
    hubGrad.addColorStop(0, '#fef08a');
    hubGrad.addColorStop(0.4, '#eab308');
    hubGrad.addColorStop(0.8, '#a16207');
    hubGrad.addColorStop(1, '#713f12');
    ctx.fillStyle = hubGrad;
    ctx.beginPath();
    ctx.arc(0, 0, centerRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Taret kolları (Cross turret)
    ctx.fillStyle = '#fde047';
    for (let j = 0; j < 4; j++) {
        ctx.save();
        ctx.rotate((Math.PI / 2) * j);
        ctx.fillRect(-2, -centerRadius + 6, 4, centerRadius - 10);
        ctx.beginPath();
        ctx.arc(0, -centerRadius + 6, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    ctx.restore();

    // 3. Fildişi Rulet Topu (Ball)
    ctx.save();
    let ballX = centerX + Math.cos(ballAngle) * ballRadius;
    let ballY = centerY + Math.sin(ballAngle) * ballRadius;

    let bGrad = ctx.createRadialGradient(ballX - 1.5, ballY - 1.5, 1, ballX, ballY, 5);
    bGrad.addColorStop(0, '#ffffff');
    bGrad.addColorStop(0.7, '#f8fafc');
    bGrad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = bGrad;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(ballX, ballY, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// 4. Çarkı Çevirme (Spin)
function spinRoulette() {
    if (isRouletteSpinning) return;
    let totalBet = getRouletteTotalBet();
    if (totalBet <= 0) {
        showRouletteToast('Lütfen önce masaya bahis koyun!', true);
        return;
    }

    if (window.socket) {
        socket.emit('roulette_spin', { bets: rouletteBets });
    }
}
window.spinRoulette = spinRoulette;

function animateRouletteSpin(targetIndex, onComplete) {
    isRouletteSpinning = true;
    updateRouletteBetUI();

    const canvas = document.getElementById('rouletteWheelCanvas');
    if (!canvas) {
        isRouletteSpinning = false;
        if (onComplete) onComplete();
        return;
    }

    if (window.playSound) window.playSound('card');

    let startTime = performance.now();
    let duration = 4600; // 4.6 saniye akıcı dönüş

    // Hedef açı hesaplama: 37 dilim, indeks saat yönünde dizili
    // Top hedef cebe indiğinde: wheelAngle + (targetIndex * sliceAngle) = ballAngle - PI/2
    const sliceAngle = (Math.PI * 2) / 37;
    let targetSliceAngle = targetIndex * sliceAngle;

    let initialWheelAngle = rouletteWheelAngle;
    let totalWheelRotations = (Math.PI * 2) * 5; // 5 tam tur
    let finalWheelAngle = initialWheelAngle + totalWheelRotations;

    // Top ters yönde 7 tur atarak yavaşlayıp cebe yerleşir
    let initialBallAngle = rouletteBallAngle;
    let totalBallRotations = (Math.PI * 2) * -7;
    let finalBallAngle = initialBallAngle + totalBallRotations - (finalWheelAngle + targetSliceAngle) - Math.PI / 2;

    let startRadius = canvas.width / 2 - 20; // Dış pist
    let pocketRadius = canvas.width / 2 - 38; // Cep yarıçapı

    function frame(now) {
        let elapsed = now - startTime;
        let progress = Math.min(1, elapsed / duration);

        // Quintic & Cubic Easing
        let easeOut = 1 - Math.pow(1 - progress, 3.5);

        rouletteWheelAngle = initialWheelAngle + totalWheelRotations * easeOut;
        rouletteBallAngle = initialBallAngle + (finalBallAngle - initialBallAngle) * easeOut;

        // Topun piste ve son 1 saniyede cebe düşmesi
        if (progress > 0.65) {
            let dropProgress = (progress - 0.65) / 0.35;
            // Küçük sekme etkisi (bounce)
            let bounce = Math.sin(dropProgress * Math.PI * 3) * (1 - dropProgress) * 4;
            rouletteBallRadius = startRadius - (startRadius - pocketRadius) * dropProgress + bounce;
        } else {
            rouletteBallRadius = startRadius;
        }

        drawRouletteWheel(canvas, rouletteWheelAngle, rouletteBallAngle, rouletteBallRadius);

        if (progress < 1) {
            rouletteAnimId = requestAnimationFrame(frame);
        } else {
            rouletteBallRadius = pocketRadius;
            drawRouletteWheel(canvas, rouletteWheelAngle, rouletteBallAngle, rouletteBallRadius);
            isRouletteSpinning = false;
            updateRouletteBetUI();
            if (onComplete) onComplete();
        }
    }

    if (rouletteAnimId) cancelAnimationFrame(rouletteAnimId);
    rouletteAnimId = requestAnimationFrame(frame);
}

// 5. Soket Olayları
if (typeof socket !== 'undefined' && socket) {
    socket.on('roulette_init', (data) => {
        renderRouletteHistory(data.history || []);
    });

    socket.on('roulette_result', (data) => {
        animateRouletteSpin(data.wheelIndex, () => {
            handleRouletteResult(data);
        });
    });

    socket.on('roulette_error', (msg) => {
        showRouletteToast(msg, true);
        isRouletteSpinning = false;
        updateRouletteBetUI();
        if (window.playSound) window.playSound('error');
    });
}

function handleRouletteResult(data) {
    renderRouletteHistory(data.history);
    updateRouletteUserBalance();

    const banner = document.getElementById('rouletteResultBanner');
    const numBadge = document.getElementById('rouletteResultNumBadge');
    const msgEl = document.getElementById('rouletteResultMsg');
    const winAmountEl = document.getElementById('rouletteResultWinAmount');

    if (banner && numBadge && msgEl) {
        numBadge.innerText = data.winningNumber;
        numBadge.style.background = (data.color === 'green') ? '#10b981' : (data.color === 'red' ? '#ef4444' : '#1e293b');
        numBadge.style.boxShadow = `0 0 20px ${data.color === 'green' ? '#10b981' : (data.color === 'red' ? '#ef4444' : '#64748b')}`;

        if (data.totalPayout > 0) {
            msgEl.innerHTML = `<span style="color:#facc15; font-size:16px; font-weight:900;">TEBRİKLER! KAZANDIN!</span>`;
            if (winAmountEl) winAmountEl.innerHTML = `+${data.totalPayout.toLocaleString('tr-TR')} TL <span style="font-size:12px; color:#a7f3d0;">(Net: +${data.netWin.toLocaleString('tr-TR')} TL)</span>`;
            if (window.playSound) window.playSound('quest');
        } else {
            msgEl.innerHTML = `<span style="color:#94a3b8; font-size:15px; font-weight:800;">Bu Tur Kazanamadınız</span>`;
            if (winAmountEl) winAmountEl.innerHTML = `<span style="color:#f87171;">-${data.totalBet.toLocaleString('tr-TR')} TL</span>`;
        }

        banner.style.display = 'flex';
        setTimeout(() => {
            if (banner) banner.style.display = 'none';
        }, 4500);
    }
}

function renderRouletteHistory(history) {
    const list = document.getElementById('rouletteHistoryList');
    if (!list) return;
    list.innerHTML = '';
    (history || []).slice(-12).reverse().forEach(item => {
        let pill = document.createElement('div');
        pill.className = `roulette-hist-pill ${item.color}`;
        pill.innerText = item.number;
        list.appendChild(pill);
    });
}

function showRouletteToast(msg, isError = false) {
    let existing = document.getElementById('rouletteToast');
    if (existing) existing.remove();

    let toast = document.createElement('div');
    toast.id = 'rouletteToast';
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
