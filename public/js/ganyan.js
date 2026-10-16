// public/js/ganyan.js - Altılı Ganyan Hipodrom Yarışı & Binek Atı İstemci Kontrolörü
var socket = window.socket || (typeof io !== 'undefined' ? io() : null);

window.ganyanState = {
    raceNumber: 1,
    phase: 'BETTING',
    secondsLeft: 15,
    horses: [],
    raceProgress: {},
    lastWinner: null,
    myBet: null,
    history: []
};

let horseTimerInterval = null;
let horseSecondsRemaining = 0;

// --- 1. SOKET DİNLENMESİ ---
if (socket) {
    socket.on('ganyan_state_update', (data) => {
        window.ganyanState = Object.assign(window.ganyanState, data);
        updateGanyanUI();
    });

    socket.on('ganyan_race_started', (data) => {
        if (window.playSound) window.playSound('bell');
        if (data && data.startTime) window.ganyanState.raceStartTime = data.startTime;
        if (data && data.durationSeconds) window.ganyanState.durationSeconds = data.durationSeconds;
        window.ganyanState.phase = 'RACING';
        if (window._ganyanHorses) {
            for (let k in window._ganyanHorses) {
                window._ganyanHorses[k].curProg = 0;
                window._ganyanHorses[k].targetProg = 0;
            }
        }
        // Kullanıcı Talebi: "sonrasında da bahisler kapanmıştır yarış başlıyor bildirimi gitsin."
        showGanyanAnnouncement(
            "🚩 BAHİSLER KAPANMIŞTIR!",
            `🚩 Bahisler kapanmıştır, ${data.raceNumber}. koşu başlıyor! Atlar piste çıktı!`,
            "race_start"
        );
        updateGanyanUI();
    });

    socket.on('ganyan_race_finished', (data) => {
        // Yeni tur başladığı için kuponu temizle
        window.ganyanState.myBet = null;
        if (data.winner) {
            window.ganyanState.lastWinner = data.winner;
            // Kullanıcı Talebi: "ve yarış bittiğinde kazanan atı söylerken altında da yeni turlar için bahisler açılmıştır tarzı bir bildirim görsün o mekandaki herkes."
            showGanyanAnnouncement(
                `🏆 ${data.winner.number} Nolu ${data.winner.name} Kazandı!`,
                "📢 Yeni turlar için bahisler açılmıştır! Kuponlarınızı yatırabilirsiniz.",
                "race_finish"
            );
            if (window.activeConfetti) window.activeConfetti();
        }
        updateGanyanUI();
    });

    socket.on('ganyan_announcement', (data) => {
        showGanyanAnnouncement(data.title, data.subMessage, data.type);
    });

    socket.on('ganyan_bet_placed', (data) => {
        if (window.playSound) window.playSound('coin');
        window.ganyanState.myBet = data;
        updateGanyanUI();
        showGanyanToast(`✅ Kupon Yatırıldı: ${data.horseName} (${data.amount} TL - Olası Kazanç: ${data.possibleWin} TL)`);
    });

    socket.on('ganyan_bet_won', (data) => {
        if (window.playSound) window.playSound('win');
        showGanyanCelebrationModal(data);
    });

    socket.on('ganyan_error', (msg) => {
        alert(msg);
    });

    socket.on('playerHorseUpdate', (data) => {
        if (typeof players !== 'undefined' && players[data.id]) {
            players[data.id].hasHorse = data.hasHorse;
        }
    });

    socket.on('horse_rent_result', (res) => {
        if (res.success) {
            if (typeof players !== 'undefined' && players[myId]) {
                players[myId].hasHorse = true;
            }
            if (window.playSound) window.playSound('win');
            startHorseTimerDisplay(res.durationSeconds || 300);
            closeHorseRentalModal();
            showGanyanToast(`🐎 5 Dakikalık Binek Atın Hazır! Hızın 2.5 Katına Çıktı!`);
        } else {
            alert(res.message);
        }
    });

    socket.on('horse_mount_expired', () => {
        if (typeof players !== 'undefined' && players[myId]) {
            players[myId].hasHorse = false;
        }
        stopHorseTimerDisplay();
        showGanyanToast(`🐎 Binek atı kiralama süresi doldu. Seyise iade edildi.`);
    });
}

// --- 2. GANYAN KUPON MODAL KONTROLLERİ ---
let selectedHorseId = 'sahbatur';

function openGanyanKuponModal() {
    const modal = document.getElementById('ganyanKuponModal');
    if (!modal) return;
    modal.style.display = 'flex';
    if (socket) socket.emit('get_ganyan_state');
    renderGanyanHorseList();
    updateGanyanUI();
}
window.openGanyanKuponModal = openGanyanKuponModal;

function closeGanyanKuponModal() {
    const modal = document.getElementById('ganyanKuponModal');
    if (modal) modal.style.display = 'none';
}
window.closeGanyanKuponModal = closeGanyanKuponModal;

function selectGanyanHorse(hId) {
    // Eğer oyuncu bu yarış için zaten bahis yaptıysa seçim değiştirilemez
    if (window.ganyanState.myBet) {
        alert("⚠️ Bu yarış için zaten kupon yatırdınız! Her yarışta yalnızca 1 ata 1 kez bahis yapabilirsiniz.");
        return;
    }
    // Eğer yarış devam ediyorsa
    if (window.ganyanState.phase !== 'BETTING') {
        alert("⛔ Yarış devam ediyor! Bahisler kapalıdır.");
        return;
    }
    selectedHorseId = hId;
    renderGanyanHorseList();
    updatePossibleWinPreview();
}
window.selectGanyanHorse = selectGanyanHorse;

function setGanyanBetPreset(amount) {
    if (window.ganyanState.myBet || window.ganyanState.phase !== 'BETTING') return;
    const input = document.getElementById('ganyanBetInput');
    if (input) {
        input.value = amount;
        updatePossibleWinPreview();
    }
}
window.setGanyanBetPreset = setGanyanBetPreset;

function updatePossibleWinPreview() {
    const input = document.getElementById('ganyanBetInput');
    const winPreview = document.getElementById('ganyanPossibleWinText');
    if (!input || !winPreview) return;

    const amount = parseInt(input.value, 10) || 0;
    const horse = (window.ganyanState.horses || []).find(h => h.id === selectedHorseId);
    if (horse) {
        const win = Math.floor(amount * horse.odds);
        winPreview.innerText = `${win} TL`;
    } else {
        winPreview.innerText = `0 TL`;
    }
}
window.updatePossibleWinPreview = updatePossibleWinPreview;

function submitGanyanBet() {
    // 1. KONTROL: Yarış esnasında kupon yatırılamaz
    if (window.ganyanState.phase !== 'BETTING') {
        alert("⛔ Koşu devam ediyor! Yarış esnasında bahis yapılamaz. Lütfen bir sonraki turu bekleyin.");
        return;
    }

    // 2. KONTROL: Sadece tek bir ata tek bir bahis oynanabilir
    if (window.ganyanState.myBet) {
        alert(`⚠️ Bu yarış için zaten ${window.ganyanState.myBet.horseName} adlı ata kupon yatırdınız! Her yarışta yalnızca 1 ata 1 kez bahis yapabilirsiniz.`);
        return;
    }

    const input = document.getElementById('ganyanBetInput');
    const amount = parseInt(input ? input.value : 0, 10);
    if (!amount || amount <= 0) {
        alert("Lütfen geçerli bir bahis tutarı girin.");
        return;
    }
    if (socket) {
        socket.emit('ganyan_place_bet', {
            horseId: selectedHorseId,
            amount: amount
        });
    }
}
window.submitGanyanBet = submitGanyanBet;

function renderGanyanHorseList() {
    const listEl = document.getElementById('ganyanHorseListContainer');
    if (!listEl) return;

    const horses = window.ganyanState.horses || [
        { id: 'sahbatur', number: 1, name: 'Şahbatur', odds: 2.20, color: '#dc2626', jockeyName: 'Kadir Usta' },
        { id: 'gulbatur', number: 2, name: 'Gülbatur', odds: 3.40, color: '#2563eb', jockeyName: 'Deli Halil' },
        { id: 'boldpilot', number: 3, name: 'Bold Pilot', odds: 4.80, color: '#eab308', jockeyName: 'Gazi Selim' },
        { id: 'batangemi', number: 4, name: 'Batan Gemi', odds: 7.50, color: '#16a34a', jockeyName: 'Kivre Cemal' },
        { id: 'cilginkivre', number: 5, name: 'Çılgın Kivre', odds: 8.80, color: '#9333ea', jockeyName: 'Toroz Reis' }
    ];

    const hasBet = !!window.ganyanState.myBet;
    const isRacing = window.ganyanState.phase !== 'BETTING';

    listEl.innerHTML = horses.map(h => {
        const isSelected = (h.id === selectedHorseId);
        const isBetHorse = hasBet && (window.ganyanState.myBet.horseId === h.id || window.ganyanState.myBet.horseName === h.name);
        
        let borderStyle = isBetHorse ? '2px solid #22c55e' : (isSelected ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)');
        let bgStyle = isBetHorse ? 'rgba(34, 197, 94, 0.2)' : (isSelected ? 'rgba(245, 158, 11, 0.25)' : 'rgba(30, 41, 59, 0.7)');
        let cursorStyle = (hasBet || isRacing) ? 'default' : 'pointer';

        return `
            <div onclick="selectGanyanHorse('${h.id}')" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 10px; background: ${bgStyle}; border: ${borderStyle}; cursor: ${cursorStyle}; transition: all 0.15s; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 28px; height: 28px; border-radius: 50%; background: ${h.color}; color: white; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">
                        ${h.number}
                    </div>
                    <div>
                        <div style="font-weight: 800; color: #f8fafc; font-size: 15px; display: flex; align-items: center; gap: 6px;">
                            ${h.name}
                            ${isBetHorse ? '<span style="font-size: 10px; background: #16a34a; color: white; padding: 2px 6px; border-radius: 4px; font-weight: 900;">KUPONUNDA</span>' : ''}
                        </div>
                        <div style="font-size: 11px; color: #94a3b8;">Jokey: ${h.jockeyName}</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #34d399; font-weight: 900; font-size: 15px; padding: 4px 10px; border-radius: 6px;">
                        ${Number(h.odds).toFixed(2)}
                    </div>
                    <div style="font-size: 10px; color: #cbd5e1; margin-top: 2px;">Ganyan Oranı</div>
                </div>
            </div>
        `;
    }).join('');
}

function updateGanyanUI() {
    const timerText = document.getElementById('ganyanTimerText');
    const phaseText = document.getElementById('ganyanPhaseText');
    const activeBetBox = document.getElementById('ganyanActiveBetBox');
    const lastWinnerBox = document.getElementById('ganyanLastWinnerBox');
    const submitBtn = document.getElementById('ganyanSubmitBetBtn');
    const lockedNotice = document.getElementById('ganyanBetLockedNotice');
    const amountSection = document.getElementById('ganyanAmountSection');

    if (timerText) timerText.innerText = `${window.ganyanState.secondsLeft || 0}s`;

    if (phaseText) {
        if (window.ganyanState.phase === 'BETTING') {
            phaseText.innerText = `📢 Bahisler Açık (${window.ganyanState.raceNumber}. Koşu - 15s)`;
            phaseText.style.color = '#34d399';
        } else if (window.ganyanState.phase === 'RACING') {
            phaseText.innerText = `🏇 Koşu Devam Ediyor! (${window.ganyanState.raceNumber}. Koşu - 30s)`;
            phaseText.style.color = '#facc15';
        } else {
            phaseText.innerText = `🏆 Koşu Tamamlandı (Sonuçlar)`;
            phaseText.style.color = '#38bdf8';
        }
    }

    // Son kazanan at kutusu
    if (lastWinnerBox) {
        if (window.ganyanState.lastWinner) {
            lastWinnerBox.style.display = 'block';
            lastWinnerBox.innerHTML = `🏆 <b>Son Koşu Kazananı:</b> #${window.ganyanState.lastWinner.number} ${window.ganyanState.lastWinner.name} (${Number(window.ganyanState.lastWinner.odds).toFixed(2)} Oran)`;
        } else {
            lastWinnerBox.style.display = 'none';
        }
    }

    // Aktif oynanmış kupon kutusu
    if (activeBetBox) {
        if (window.ganyanState.myBet) {
            activeBetBox.style.display = 'block';
            activeBetBox.innerHTML = `
                <div style="font-size: 13px; font-weight: 800; color: #fde047;">🎯 Oynadığın Kupon (Kilitli):</div>
                <div style="font-size: 13px; color: #f8fafc; margin-top: 4px;">
                    <b>${window.ganyanState.myBet.horseName}</b> • ${window.ganyanState.myBet.amount} TL <span style="color:#34d399; font-weight: bold;">(Olası Kazanç: ${window.ganyanState.myBet.possibleWin} TL)</span>
                </div>
                <div style="font-size: 11px; color: #fbbf24; margin-top: 4px;">
                    ⚠️ Bu yarış için bahsiniz kabul edildi. Her koşuda yalnızca 1 ata 1 kez bahis yapılabilir.
                </div>
            `;
        } else {
            activeBetBox.style.display = 'none';
        }
    }

    // Buton ve kilitli bildirim kontrolü
    if (submitBtn) {
        if (window.ganyanState.phase !== 'BETTING') {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.55';
            submitBtn.style.cursor = 'not-allowed';
            submitBtn.style.background = '#475569';
            submitBtn.innerText = '⛔ Koşu Devam Ediyor (Bahisler Kapalı)';
            if (lockedNotice) {
                lockedNotice.style.display = 'block';
                lockedNotice.innerText = 'Yarış esnasında kimse bahis yapamaz. Lütfen yarışın bitmesini bekleyin.';
            }
            if (amountSection) amountSection.style.opacity = '0.5';
        } else if (window.ganyanState.myBet) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.65';
            submitBtn.style.cursor = 'not-allowed';
            submitBtn.style.background = '#1e3a8a';
            submitBtn.innerText = `✅ Kupon Yatırıldı (${window.ganyanState.myBet.horseName})`;
            if (lockedNotice) {
                lockedNotice.style.display = 'block';
                lockedNotice.innerText = 'Bu yarış için kuponunuz başarıyla yatırıldı. Sonraki koşuda tekrar kupon yapabilirsiniz.';
            }
            if (amountSection) amountSection.style.opacity = '0.5';
        } else {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
            submitBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
            submitBtn.innerText = '🎫 Kuponu Yatır';
            if (lockedNotice) lockedNotice.style.display = 'none';
            if (amountSection) amountSection.style.opacity = '1';
        }
    }
}

// --- 3. BİNEK ATI KİRALAMA PENCERESİ (200 TL / 5 DAKİKA 2X HIZ) ---
function openHorseRentalModal() {
    const modal = document.getElementById('horseRentalModal');
    if (modal) modal.style.display = 'flex';
}
window.openHorseRentalModal = openHorseRentalModal;

function closeHorseRentalModal() {
    const modal = document.getElementById('horseRentalModal');
    if (modal) modal.style.display = 'none';
}
window.closeHorseRentalModal = closeHorseRentalModal;

function submitRentHorse() {
    if (socket) {
        socket.emit('rent_horse_mount');
    }
}
window.submitRentHorse = submitRentHorse;

function startHorseTimerDisplay(seconds = 300) {
    stopHorseTimerDisplay();
    horseSecondsRemaining = seconds;

    const badge = document.getElementById('horseMountActiveBadge');
    const timerText = document.getElementById('horseMountCountdown');
    if (badge) badge.style.display = 'flex';

    function tick() {
        if (horseSecondsRemaining <= 0) {
            stopHorseTimerDisplay();
            return;
        }
        let mins = Math.floor(horseSecondsRemaining / 60);
        let secs = horseSecondsRemaining % 60;
        let str = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        if (timerText) timerText.innerText = str;
        horseSecondsRemaining--;
    }

    tick();
    horseTimerInterval = setInterval(tick, 1000);
}

function stopHorseTimerDisplay() {
    if (horseTimerInterval) {
        clearInterval(horseTimerInterval);
        horseTimerInterval = null;
    }
    const badge = document.getElementById('horseMountActiveBadge');
    if (badge) badge.style.display = 'none';
}

function showGanyanAnnouncement(title, subMessage, type = 'info') {
    const banner = document.getElementById('ganyanLiveToast');
    if (!banner) return;
    const titleEl = document.getElementById('ganyanToastTitle');
    const subEl = document.getElementById('ganyanToastSub');

    if (titleEl) titleEl.innerHTML = title || '';
    if (subEl) {
        subEl.innerHTML = subMessage || '';
        subEl.style.display = subMessage ? 'block' : 'none';
    }

    banner.style.display = 'block';

    if (window.ganyanToastTimer) clearTimeout(window.ganyanToastTimer);
    window.ganyanToastTimer = setTimeout(() => {
        banner.style.display = 'none';
    }, 7000);
}
window.showGanyanAnnouncement = showGanyanAnnouncement;

function showGanyanBanner(text) {
    showGanyanAnnouncement(text, "");
}

function showGanyanToast(msg) {
    if (typeof showFloatingIcon === 'function' && typeof myId !== 'undefined') {
        showFloatingIcon(myId, '🏇');
    }
    showGanyanAnnouncement(msg, "");
}

function showGanyanCelebrationModal(data) {
    const modal = document.getElementById('ganyanWinModal');
    if (!modal) return;
    const nameEl = document.getElementById('ganyanWinHorseName');
    const amountEl = document.getElementById('ganyanWinAmount');
    if (nameEl) nameEl.innerText = data.horseName;
    if (amountEl) amountEl.innerText = `+${data.winAmount} TL`;
    modal.style.display = 'flex';
}
window.closeGanyanWinModal = () => {
    const modal = document.getElementById('ganyanWinModal');
    if (modal) modal.style.display = 'none';
};
