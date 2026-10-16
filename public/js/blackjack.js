// public/js/blackjack.js - Multiplayer Canlı Blackjack 21 İstemci Mantığı

let bjCurrentTable = null;
let bjCurrentBet = 50;

// 1. Masayı Açma ve Ayrılma
function openBlackjackModal() {
    const modal = document.getElementById('blackjackModal');
    if (!modal) return;
    modal.style.display = 'flex';

    if (window.socket) {
        socket.emit('blackjack_join');
    }

    updateBlackjackUserMoney();
    if (window.playSound) window.playSound('click');
}
window.openBlackjackModal = openBlackjackModal;

function closeBlackjackModal() {
    const modal = document.getElementById('blackjackModal');
    if (!modal) return;
    modal.style.display = 'none';

    if (window.socket) {
        socket.emit('blackjack_leave');
    }
}
window.closeBlackjackModal = closeBlackjackModal;

function updateBlackjackUserMoney() {
    let money = (window.myMoney !== undefined) ? window.myMoney : ((typeof players !== 'undefined' && typeof myId !== 'undefined' && players[myId]) ? players[myId].money : 1000);
    const mEl = document.getElementById('bjUserMoney');
    if (mEl) mEl.innerText = money;
}

// 2. Soket Dinleyicileri
if (typeof socket !== 'undefined' && socket) {
    socket.on('blackjack_init', (tableState) => {
        bjCurrentTable = tableState;
        renderBlackjackTable(tableState);
    });

    socket.on('blackjack_state_update', (tableState) => {
        bjCurrentTable = tableState;
        renderBlackjackTable(tableState);
    });

    socket.on('blackjack_error', (msg) => {
        showBlackjackToast(msg, true);
        if (window.playSound) window.playSound('error');
    });

    socket.on('blackjack_system_message', (msg) => {
        showBlackjackToast(msg, false);
    });
}

function showBlackjackToast(msg, isError = false) {
    let existing = document.getElementById('bjToastMessage');
    if (existing) existing.remove();

    let toast = document.createElement('div');
    toast.id = 'bjToastMessage';
    toast.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: ${isError ? 'rgba(220, 38, 38, 0.95)' : 'rgba(15, 23, 42, 0.95)'};
        color: white;
        padding: 10px 22px;
        border-radius: 12px;
        border: 2px solid ${isError ? '#f87171' : '#facc15'};
        font-weight: 800;
        font-size: 13px;
        z-index: 35000;
        box-shadow: 0 10px 30px rgba(0,0,0,0.6);
        pointer-events: none;
        animation: popIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;
    toast.innerText = msg;
    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3200);
}

// 3. Masayı Görselleştirme (Render)
function renderBlackjackTable(table) {
    if (!table) return;

    updateBlackjackUserMoney();

    // İzleyici sayısı
    const specCountEl = document.getElementById('bjSpectatorCount');
    if (specCountEl) specCountEl.innerText = table.spectatorCount || 0;

    // Masa Durumu ve Süre Çubuğu
    renderStatusBanner(table);

    // Kasa / Dealer Kartları
    renderDealerHand(table);

    // 3 Koltuğun Çizimi
    renderSeats(table);

    // Alt Kontrol Butonları (Bahis / Kart Çek / Dur / İkiye Katla)
    renderControls(table);
}

function renderStatusBanner(table) {
    const bannerText = document.getElementById('bjStatusText');
    const timerContainer = document.getElementById('bjTimerProgressContainer');
    const timerBar = document.getElementById('bjTimerProgressBar');

    if (!bannerText) return;

    switch (table.state) {
        case 'WAITING':
            bannerText.innerHTML = `⏳ <b>Masada oyuncu bekleniyor...</b> (Boş koltuklara oturabilirsiniz)`;
            if (timerContainer) timerContainer.style.display = 'none';
            break;
        case 'BETTING':
            bannerText.innerHTML = `🪙 <b>Bahis Yap!</b> Kalan: <span style="color:#facc15; font-size:15px; font-weight:900;">⏱️ ${table.stateSecondsLeft}s</span>`;
            if (timerContainer && timerBar) {
                timerContainer.style.display = 'block';
                let pct = Math.max(0, Math.min(100, (table.stateSecondsLeft / 15) * 100));
                timerBar.style.width = pct + '%';
                timerBar.style.background = 'linear-gradient(90deg, #10b981, #facc15)';
            }
            break;
        case 'DEALING':
            bannerText.innerHTML = `🎴 <b>Kartlar Dağıtılıyor...</b>`;
            if (timerContainer) timerContainer.style.display = 'none';
            break;
        case 'PLAYER_TURNS':
            let activeSeat = table.seats[table.activeTurnSeatIndex];
            let activeName = activeSeat ? activeSeat.username : "Oyuncu";
            let isMyTurn = activeSeat && activeSeat.socketId === (window.socket ? window.socket.id : '');
            let turnWho = isMyTurn ? "<span style='color:#38bdf8;'>SENİN SIRAN!</span>" : `Sıra: <b>${activeName}</b>`;
            bannerText.innerHTML = `🎯 ${turnWho} — Kalan Süre: <span style="color:#facc15; font-size:16px; font-weight:900;">${table.turnSecondsLeft}s</span>`;
            if (timerContainer && timerBar) {
                timerContainer.style.display = 'block';
                let pct = Math.max(0, Math.min(100, (table.turnSecondsLeft / 15) * 100));
                timerBar.style.width = pct + '%';
                timerBar.style.background = isMyTurn ? 'linear-gradient(90deg, #38bdf8, #0284c7)' : 'linear-gradient(90deg, #facc15, #f59e0b)';
            }
            break;
        case 'DEALER_TURN':
            bannerText.innerHTML = `🎩 <b>Kasa Oynuyor...</b> (17'ye kadar kart çeker)`;
            if (timerContainer) timerContainer.style.display = 'none';
            break;
        case 'PAYOUT':
            bannerText.innerHTML = `🏆 <b>Kazançlar Hesaplanıyor ve Dağıtılıyor...</b>`;
            if (timerContainer) timerContainer.style.display = 'none';
            break;
        case 'RESET':
            bannerText.innerHTML = `🔄 <b>Yeni El Başlıyor...</b>`;
            if (timerContainer) timerContainer.style.display = 'none';
            break;
        default:
            bannerText.innerHTML = `♠️ Blackjack 21`;
            if (timerContainer) timerContainer.style.display = 'none';
    }
}

function renderCardElement(card, isNew = false) {
    if (!card) return null;
    let cardDiv = document.createElement('div');
    if (card.hidden) {
        cardDiv.className = `bj-card hidden-card ${isNew ? 'bj-card-deal-anim' : ''}`;
        cardDiv.setAttribute('data-card-sig', 'HIDDEN');
        cardDiv.style.width = '52px';
        cardDiv.style.height = '78px';
        cardDiv.style.cursor = 'default';
        cardDiv.innerHTML = `<div class="bj-card-pattern">♠</div>`;
    } else {
        let isRed = (card.suit === '♥' || card.suit === '♦');
        cardDiv.className = `bj-card ${isRed ? 'red' : 'black'} ${isNew ? 'bj-card-deal-anim' : ''}`;
        cardDiv.setAttribute('data-card-sig', `${card.rank}_${card.suit}`);
        cardDiv.style.width = '52px';
        cardDiv.style.height = '78px';
        cardDiv.style.cursor = 'default';
        cardDiv.innerHTML = `
            <div class="bj-card-corner top-left">
                <span>${card.rank}</span>
                <span>${card.suit}</span>
            </div>
            <div class="bj-card-suit-big">${card.suit}</div>
            <div class="bj-card-corner bottom-right">
                <span>${card.rank}</span>
                <span>${card.suit}</span>
            </div>
        `;
    }
    if (isNew) {
        setTimeout(() => {
            if (cardDiv && cardDiv.classList) {
                cardDiv.classList.remove('bj-card-deal-anim');
            }
        }, 360);
    }
    return cardDiv;
}

function syncCardsContainer(containerEl, cards) {
    if (!containerEl) return;
    if (!cards || cards.length === 0) {
        if (containerEl.getAttribute('data-has-cards') !== 'none') {
            containerEl.setAttribute('data-has-cards', 'none');
            containerEl.innerHTML = `<div class="bj-no-cards-msg" style="font-size: 11px; color: #64748b; font-style:italic; padding: 12px 0;">Kart bekleniyor</div>`;
        }
        return;
    }

    // Boş mesajı varsa kaldır
    let emptyMsg = containerEl.querySelector('.bj-no-cards-msg');
    if (emptyMsg) emptyMsg.remove();
    containerEl.setAttribute('data-has-cards', 'true');

    let currentCardEls = Array.from(containerEl.querySelectorAll(':scope > .bj-card'));

    cards.forEach((card, i) => {
        let cardSig = card.hidden ? 'HIDDEN' : `${card.rank}_${card.suit}`;
        let existingEl = currentCardEls[i];
        if (existingEl) {
            // Eğer kart aynıysa kesinlikle dokunma, titreme ve yok olma yaşanmaz
            if (existingEl.getAttribute('data-card-sig') !== cardSig) {
                let newEl = renderCardElement(card, false);
                containerEl.replaceChild(newEl, existingEl);
            }
        } else {
            // Yeni kart dağıtıldı (animasyonla ekle)
            let newEl = renderCardElement(card, true);
            containerEl.appendChild(newEl);
        }
    });

    // Artan eski kartları sil (yeni el başladığında)
    let updatedCardEls = Array.from(containerEl.querySelectorAll(':scope > .bj-card'));
    for (let i = cards.length; i < updatedCardEls.length; i++) {
        if (updatedCardEls[i] && updatedCardEls[i].parentNode === containerEl) {
            containerEl.removeChild(updatedCardEls[i]);
        }
    }
}

function renderDealerHand(table) {
    const cardsEl = document.getElementById('bjDealerCards');
    const scorePill = document.getElementById('bjDealerScorePill');
    if (!cardsEl) return;

    if (!table.dealerHand || table.dealerHand.length === 0) {
        if (cardsEl.getAttribute('data-dealer-empty') !== 'true') {
            cardsEl.setAttribute('data-dealer-empty', 'true');
            cardsEl.innerHTML = `
                <div style="font-size: 13px; color: rgba(255,255,255,0.4); font-style: italic; padding: 16px 0;">
                    Bahisler tamamlanınca kartlar dağıtılır
                </div>
            `;
        }
        if (scorePill) scorePill.style.display = 'none';
        return;
    }
    cardsEl.removeAttribute('data-dealer-empty');

    syncCardsContainer(cardsEl, table.dealerHand);

    if (scorePill) {
        scorePill.style.display = 'inline-flex';
        let scoreText = table.dealerScore;
        if (table.dealerHidden && table.dealerHand.length >= 2) {
            scoreText = `${table.dealerScore} + ?`;
        } else if (table.dealerScore > 21) {
            scoreText = `${table.dealerScore} (Bust!)`;
        }
        scorePill.innerText = `Puan: ${scoreText}`;
    }
}

function renderSeats(table) {
    const mySid = window.socket ? window.socket.id : '';

    table.seats.forEach((seat, idx) => {
        const box = document.getElementById(`bjSeatBox_${idx}`);
        const content = document.getElementById(`bjSeatContent_${idx}`);
        if (!box || !content) return;

        let isOccupied = (seat.socketId !== null);
        let isMe = (seat.socketId === mySid);
        let isHisTurn = (table.state === 'PLAYER_TURNS' && table.activeTurnSeatIndex === idx);

        if (isHisTurn) {
            box.classList.add('active-turn');
        } else {
            box.classList.remove('active-turn');
        }

        if (!isOccupied) {
            if (content.getAttribute('data-seat-state') !== 'empty') {
                content.setAttribute('data-seat-state', 'empty');
                content.innerHTML = `
                    <div class="bj-empty-spot">
                        <div style="font-size: 26px; margin-bottom: 4px; opacity: 0.7;">🪑</div>
                        <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">Koltuk Boş</div>
                        <button class="bj-sit-btn" onclick="bjSit(${idx})">Masaya Otur</button>
                    </div>
                `;
            }
        } else {
            // Koltuk yapısını 1 kez oluştur; timer tick'lerinde DOM'u yıkma
            let isFirstOccupied = (content.getAttribute('data-seat-state') !== 'occupied');
            if (isFirstOccupied) {
                content.setAttribute('data-seat-state', 'occupied');
                content.innerHTML = `
                    <div class="bj-occupied-spot">
                        <div class="bj-player-header">
                            <div class="bj-player-name" id="bjSeatName_${idx}"></div>
                            <span id="bjSeatLeaveContainer_${idx}"></span>
                        </div>
                        <div class="bj-bet-display" id="bjSeatBet_${idx}"></div>
                        <div class="bj-cards-fan" id="bjSeatCards_${idx}"></div>
                        <div class="bj-player-score" id="bjSeatScore_${idx}"></div>
                        <div class="bj-status-pill-area" id="bjSeatStatus_${idx}"></div>
                    </div>
                `;
            }

            // 1. Oyuncu Adı & Çıkış Butonu
            const nameEl = document.getElementById(`bjSeatName_${idx}`);
            const leaveContainer = document.getElementById(`bjSeatLeaveContainer_${idx}`);
            if (nameEl) {
                nameEl.className = `bj-player-name ${isMe ? 'is-me' : ''}`;
                nameEl.innerHTML = `<span>${isMe ? '👤 Sen' : '👤 ' + seat.username}</span>`;
            }
            if (leaveContainer) {
                leaveContainer.innerHTML = isMe ? `<button class="bj-leave-seat-btn" onclick="bjLeaveSeat(${idx})" title="Masadan Kalk">Masadan Kalk</button>` : '';
            }

            // 2. Bahis Yazısı
            const betEl = document.getElementById(`bjSeatBet_${idx}`);
            if (betEl) {
                if (seat.bet > 0) {
                    betEl.innerHTML = `<span class="chip-mini"></span> ${seat.bet} TL`;
                } else if (table.state === 'BETTING') {
                    betEl.innerHTML = `<span style="font-size:11px; color:#facc15; font-weight:bold;">Bahis Bekleniyor...</span>`;
                } else {
                    betEl.innerHTML = `<span style="font-size:11px; color:#64748b;">Bahis Yok</span>`;
                }
            }

            // 3. Kartlar (İnkremental ve Titremesiz)
            const cardsContainer = document.getElementById(`bjSeatCards_${idx}`);
            if (cardsContainer) {
                syncCardsContainer(cardsContainer, seat.cards);
            }

            // 4. Skor
            const scoreEl = document.getElementById(`bjSeatScore_${idx}`);
            if (scoreEl) {
                if (seat.cards && seat.cards.length > 0) {
                    scoreEl.innerHTML = `Toplam: <b>${seat.score}</b>`;
                    scoreEl.style.display = 'block';
                } else {
                    scoreEl.style.display = 'none';
                }
            }

            // 5. Durum Rozeti
            const statusEl = document.getElementById(`bjSeatStatus_${idx}`);
            if (statusEl) {
                let badgeHtml = '';
                if (seat.result) {
                    if (seat.result === 'WIN') badgeHtml = `<span class="bj-result-badge win">🎉 Kazandı (+${seat.payout} TL)</span>`;
                    else if (seat.result === 'BLACKJACK') badgeHtml = `<span class="bj-result-badge blackjack">👑 Blackjack (+${seat.payout} TL)</span>`;
                    else if (seat.result === 'PUSH') badgeHtml = `<span class="bj-result-badge push">🤝 Berabere (İade)</span>`;
                    else if (seat.result === 'LOSS') badgeHtml = `<span class="bj-result-badge loss">💥 Kaybetti</span>`;
                } else if (seat.status === 'BUSTED') {
                    badgeHtml = `<span class="bj-result-badge loss">💥 Battı (Bust)</span>`;
                } else if (seat.status === 'STOOD') {
                    badgeHtml = `<span class="bj-result-badge stood">🛑 Durdu (${seat.score})</span>`;
                } else if (seat.status === 'BLACKJACK') {
                    badgeHtml = `<span class="bj-result-badge blackjack">👑 Doğal 21</span>`;
                } else if (seat.bet === 0 && table.state !== 'BETTING' && table.state !== 'WAITING') {
                    badgeHtml = `<span class="bj-result-badge skip">💤 Pas Geçti</span>`;
                }
                statusEl.innerHTML = badgeHtml;
            }
        }
    });
}



function renderControls(table) {
    const mySid = window.socket ? window.socket.id : '';
    const mySeat = table.seats.find(s => s.socketId === mySid);

    const bettingControls = document.getElementById('bjBettingControls');
    const playControls = document.getElementById('bjPlayControls');
    const spectatorControls = document.getElementById('bjSpectatorControls');
    const placeBetBtn = document.getElementById('bjPlaceBetBtn');

    if (!bettingControls || !playControls || !spectatorControls) return;

    // 1. Durum: Bahis Aşaması ve kullanıcı bir koltukta oturuyor
    if (table.state === 'BETTING' && mySeat) {
        bettingControls.style.display = 'flex';
        playControls.style.display = 'none';
        spectatorControls.style.display = 'none';

        if (mySeat.hasPlacedBet && mySeat.bet > 0) {
            if (placeBetBtn) {
                placeBetBtn.innerText = `✅ Bahis Yapıldı (${mySeat.bet} TL)`;
                placeBetBtn.disabled = true;
                placeBetBtn.style.opacity = '0.7';
            }
        } else {
            if (placeBetBtn) {
                placeBetBtn.innerText = `🪙 Bahis Yap (${bjCurrentBet} TL)`;
                placeBetBtn.disabled = false;
                placeBetBtn.style.opacity = '1';
            }
        }
    }
    // 2. Durum: Oyun Aşaması ve sıra oturmakta olan bu kullanıcıda
    else if (table.state === 'PLAYER_TURNS' && mySeat && table.activeTurnSeatIndex === mySeat.seatIndex && mySeat.status === 'PLAYING') {
        bettingControls.style.display = 'none';
        playControls.style.display = 'flex';
        spectatorControls.style.display = 'none';

        // Sade ve akıcı 21: Yalnızca Kart Çek (Hit) ve Dur (Stand)
    }
    // 3. Durum: Diğer tüm durumlar (İzleyici modu veya sırasını bekleyen oyuncu)
    else {
        bettingControls.style.display = 'none';
        playControls.style.display = 'none';
        spectatorControls.style.display = 'flex';

        const infoText = document.getElementById('bjSpectatorInfoText');
        if (infoText) {
            if (mySeat) {
                if (table.state === 'PLAYER_TURNS') {
                    let curSeat = table.seats[table.activeTurnSeatIndex];
                    let curName = curSeat ? curSeat.username : "Oyuncu";
                    infoText.innerHTML = `Sıradaki oyuncu hamlesini yapıyor: <b>${curName}</b>...`;
                } else if (table.state === 'DEALER_TURN') {
                    infoText.innerHTML = `Kasa kart çekiyor...`;
                } else {
                    infoText.innerHTML = `El oynanıyor, sonuçlar bekleniyor...`;
                }
            } else {
                infoText.innerHTML = `👁️ İzleyici Modu: Masadaki boş bir koltuğa <b>'Masaya Otur'</b> butonuna en hızlı basan oturur!`;
            }
        }
    }
}

// 4. Oyuncu Etkileşim Butonları (Otur, Kalk, Bahis, Hamleler)
function bjSit(seatIndex) {
    if (!window.socket) return;
    socket.emit('blackjack_sit', seatIndex);
    if (window.playSound) window.playSound('click');
}
window.bjSit = bjSit;

function bjLeaveSeat(seatIndex) {
    if (!window.socket) return;
    socket.emit('blackjack_leave_seat', seatIndex);
    if (window.playSound) window.playSound('click');
}
window.bjLeaveSeat = bjLeaveSeat;

function bjAddChip(amount) {
    let inp = document.getElementById('bjCustomBetInput');
    let val = parseInt(inp ? inp.value : bjCurrentBet, 10) || 0;
    val += amount;
    bjCurrentBet = val;
    if (inp) inp.value = val;

    const placeBetBtn = document.getElementById('bjPlaceBetBtn');
    if (placeBetBtn && (!bjCurrentTable || !bjCurrentTable.seats.find(s => s.socketId === socket.id)?.hasPlacedBet)) {
        placeBetBtn.innerText = `🪙 Bahis Yap (${bjCurrentBet} TL)`;
    }
    if (window.playSound) window.playSound('coin');
}
window.bjAddChip = bjAddChip;

function bjClearBet() {
    bjCurrentBet = 10;
    let inp = document.getElementById('bjCustomBetInput');
    if (inp) inp.value = 10;

    const placeBetBtn = document.getElementById('bjPlaceBetBtn');
    if (placeBetBtn) placeBetBtn.innerText = `🪙 Bahis Yap (10 TL)`;
}
window.bjClearBet = bjClearBet;

function bjSubmitBet() {
    if (!window.socket) return;
    let inp = document.getElementById('bjCustomBetInput');
    let amount = parseInt(inp ? inp.value : bjCurrentBet, 10) || 10;

    socket.emit('blackjack_place_bet', { amount: amount });
    if (window.playSound) window.playSound('coin');
}
window.bjSubmitBet = bjSubmitBet;

function bjHit() {
    if (!window.socket) return;
    socket.emit('blackjack_hit');
    if (window.playSound) window.playSound('deal');
}
window.bjHit = bjHit;

function bjStand() {
    if (!window.socket) return;
    socket.emit('blackjack_stand');
    if (window.playSound) window.playSound('click');
}
window.bjStand = bjStand;


