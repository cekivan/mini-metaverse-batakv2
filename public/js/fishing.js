// public/js/fishing.js - Sahil Balıkçılık & Avlanma Mekaniği Modülü

let fishingCountdownInterval = null;
let fishingRemainingSeconds = 10;

function triggerFishing() {
    if (typeof currentRoom !== 'undefined' && currentRoom !== 'sahil') return;
    if (typeof players !== 'undefined' && typeof myId !== 'undefined' && players[myId] && players[myId].isFishing) {
        if (window.socket) window.socket.emit('cancelFishing');
        return;
    }
    if (window.playSound) window.playSound('reel');
    if (window.socket) window.socket.emit('startFishing');
}

function closeFishingResultModal() {
    const modal = document.getElementById('fishingResultModal');
    if (modal) modal.style.display = 'none';
}

if (window.socket) {
    window.socket.on('fishingStarted', (data) => {
        if (window.playSound) window.playSound('splash');
        const container = document.getElementById('fishingProgressContainer');
        const progressBar = document.getElementById('fishingProgressBar');
        const countdownText = document.getElementById('fishingCountdownText');

        if (container) container.style.display = 'block';
        if (progressBar) progressBar.style.width = '100%';

        fishingRemainingSeconds = data.duration || 10;
        if (countdownText) countdownText.innerText = fishingRemainingSeconds;

        if (fishingCountdownInterval) clearInterval(fishingCountdownInterval);

        let startTime = Date.now();
        let totalMs = fishingRemainingSeconds * 1000;

        fishingCountdownInterval = setInterval(() => {
            let elapsed = Date.now() - startTime;
            let leftMs = Math.max(0, totalMs - elapsed);
            let leftSec = Math.ceil(leftMs / 1000);

            if (countdownText) countdownText.innerText = leftSec;
            if (progressBar) {
                let pct = (leftMs / totalMs) * 100;
                progressBar.style.width = pct + '%';
            }

            if (leftMs <= 0) {
                clearInterval(fishingCountdownInterval);
                fishingCountdownInterval = null;
            }
        }, 100);
    });

    window.socket.on('playerFishingState', (data) => {
        if (typeof players !== 'undefined' && players[data.id]) {
            players[data.id].isFishing = data.isFishing;
        }
    });

    window.socket.on('fishingCancelled', (data) => {
        if (fishingCountdownInterval) {
            clearInterval(fishingCountdownInterval);
            fishingCountdownInterval = null;
        }
        const container = document.getElementById('fishingProgressContainer');
        if (container) container.style.display = 'none';

        if (data && data.reason) {
            const errToast = document.getElementById('errorToast');
            if (errToast) {
                errToast.innerText = data.reason;
                errToast.style.display = 'block';
                setTimeout(() => { errToast.style.display = 'none'; }, 3000);
            }
        }
    });

    window.socket.on('fishingResult', (data) => {
        if (fishingCountdownInterval) {
            clearInterval(fishingCountdownInterval);
            fishingCountdownInterval = null;
        }
        const container = document.getElementById('fishingProgressContainer');
        if (container) container.style.display = 'none';

        let loot = data.loot;
        if (!loot) return;

        if (loot.value > 0) {
            if (window.playSound) window.playSound('coin');
        } else {
            if (window.playSound) window.playSound('splash');
        }

        if (data.money !== undefined && typeof updateMoneyDisplay === 'function') {
            updateMoneyDisplay(data.money);
        }

        const modal = document.getElementById('fishingResultModal');
        const emojiEl = document.getElementById('catchLootEmoji');
        const nameEl = document.getElementById('catchLootName');
        const descEl = document.getElementById('catchLootDesc');
        const rewardEl = document.getElementById('catchLootReward');

        if (emojiEl) emojiEl.innerText = loot.emoji || "🐟";
        if (nameEl) nameEl.innerText = loot.name;
        if (descEl) descEl.innerText = loot.desc;

        if (rewardEl) {
            if (loot.value > 0) {
                rewardEl.style.background = 'rgba(16, 185, 129, 0.2)';
                rewardEl.style.borderColor = '#10b981';
                rewardEl.style.color = '#34d399';
                rewardEl.innerText = `+${loot.value} TL Kazandın!`;
            } else {
                rewardEl.style.background = 'rgba(239, 68, 68, 0.2)';
                rewardEl.style.borderColor = '#ef4444';
                rewardEl.style.color = '#f87171';
                rewardEl.innerText = `0 TL (Çöp / Değersiz)`;
            }
        }

        if (modal) modal.style.display = 'flex';
    });
}
