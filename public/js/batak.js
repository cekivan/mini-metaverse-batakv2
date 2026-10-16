// public/js/batak.js

let selectedForDiscard = [];
const trumpDisplay = document.getElementById('trumpDisplay');
const tricksDisplay = document.getElementById('tricksDisplay');
const tableCardsDiv = document.getElementById('tableCards');
const playerHandDiv = document.getElementById('playerHand');

socket.on('batakUpdate', (data) => {
    window.currentActiveTableId = data.tableId;
    if (window.setVoiceTable && data.tableId) window.setVoiceTable(data.tableId);
    if (window.startTurnTimer) window.startTurnTimer(data.turnTimeout || 30);

    // 1. SKOR TABLOSUNU DOLDURMA
    window.lastBatakData = data;
    const roundDisp = document.getElementById('roundDisplay');
    if (roundDisp) {
        if (data.isTieBreaker) {
            roundDisp.innerHTML = `<span class="tie-breaker-badge">⚡ Eşitlik Bozma Oyunu (6. Tur)</span>`;
        } else {
            let setNum = data.currentSet || 1;
            let roundNum = data.setRound || 1;
            roundDisp.innerHTML = `<span style="color:#60a5fa; font-weight:900;">${setNum}. Set</span> <span style="color:#94a3b8; font-weight:normal;">•</span> <span style="color:#2ecc71; font-weight:800;">${roundNum}/5. El</span>`;
        }
    }

    const batakModal = document.getElementById('batakYazbozModal');
    if (batakModal && batakModal.style.display === 'flex') {
        renderBatakYazboz();
    }

    let vacantSeatPid = null;
    let vacantSeatName = null;

    const scoreboardDiv = document.getElementById('batakScoreboard');
    if (scoreboardDiv) {
        scoreboardDiv.innerHTML = "";
        data.players.forEach(pid => {
            let pInfo = data.playerInfos[pid];
            let isTurn = (pid === data.players[data.turnIndex]);
            let color = isTurn ? "#f1c40f" : "white"; // Sırası gelen oyuncu sarı parlar
            let turnIcon = isTurn ? "▶ " : "";
            let discBadge = "";
            if (pInfo.isDisconnected) {
                discBadge = ` <span style="color: #ef4444; font-size: 11px; background: rgba(239, 68, 68, 0.2); padding: 2px 5px; border-radius: 4px;">⚠️ Ayrıldı</span>`;
                vacantSeatPid = pid;
                vacantSeatName = pInfo.name;
            }
            scoreboardDiv.innerHTML += `<div style="color: ${color}; font-weight: bold; margin: 0 5px;">${turnIcon}${pInfo.name}${discBadge}: Puan ${pInfo.score} <span style="font-weight:normal; font-size:12px;">(El: ${pInfo.tricks})</span></div>`;
        });
    }

    // 2. ARAYÜZ ELEMANLARINI SEÇME
    const biddingArea = document.getElementById('biddingArea');
    const trumpSelectArea = document.getElementById('trumpSelectArea');
    const discardArea = document.getElementById('discardArea');
    const bidDisplay = document.getElementById('bidDisplay');
    const specBanner = document.getElementById('spectatorBanner');

    if (specBanner) {
        if (data.isSpectator) {
            specBanner.style.display = 'block';
            if (vacantSeatPid) {
                specBanner.innerHTML = `👁️ Yancısın | ⚠️ <b>${vacantSeatName}</b> masadan ayrıldı! <button onclick="takeoverSeat('${data.tableId}', '${vacantSeatPid}')" style="margin-left: 8px; padding: 4px 10px; background: #27ae60; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">💺 Boş Koltuğu Devral (${vacantSeatName} yerine)</button>`;
            } else {
                specBanner.innerHTML = `👁️ İzleyici Modu (Yancısın) - Oyuncuları izliyorsun`;
            }
        } else {
            specBanner.style.display = 'none';
        }
    }

    trumpDisplay.innerText = `Koz: ${data.trump ? data.trump : 'Bekleniyor'}`;
    bidDisplay.innerText = `İhale: ${data.bidInfo.current}`;
    if (tricksDisplay) tricksDisplay.innerText = "";

    // Alanları geçici olarak gizle
    biddingArea.style.display = 'none';
    trumpSelectArea.style.display = 'none';
    discardArea.style.display = 'none';

    // 3. AŞAMALARA GÖRE KONTROLLER (Phase Logic)
    if (data.isSpectator) {
        modalStatus.innerText = `👁️ İzleyicisin (Yancı) - Hamle sırası: ${data.turnPlayerName}`;
        modalStatus.style.color = '#3498db';
    }
    else if (data.phase === 'ihale') {
        if (data.myTurn) {
            modalStatus.innerText = `SIRA SENDE (${data.turnPlayerName})! İhale ver veya Pas de.`;
            modalStatus.style.color = '#f1c40f';
            biddingArea.style.display = 'block';

            let alreadyPassed = data.bidInfo.passedPlayers && data.bidInfo.passedPlayers.includes(socket.id);
            if (alreadyPassed) {
                modalStatus.innerText = "Pas dedin, ihale turundan çıktın.";
                biddingArea.style.display = 'none';
            } else {
                let currentBid = data.bidInfo.current;
                let titleEl = document.getElementById('biddingTitle');
                if (titleEl) {
                    let minReq = (currentBid < 8) ? "8 (Pas denirse 7 kalır)" : (currentBid + 1);
                    titleEl.innerText = `İhale Zamanı! (Minimum: ${minReq})`;
                }
                for (let i = 4; i <= 13; i++) {
                    let btn = document.getElementById('btn' + i);
                    if (btn) {
                        btn.disabled = (i <= currentBid);
                        btn.style.opacity = (i <= currentBid) ? "0.4" : "1";
                    }
                }
            }
        } else {
            modalStatus.innerText = `İhale için sıra ${data.turnPlayerName} adlı oyuncuda...`;
            modalStatus.style.color = 'white';
        }
    }
    else if (data.phase === 'koz_secimi') {
        if (data.myTurn) {
            modalStatus.innerText = "İHALEYİ ALDIN! Kozunu belirle.";
            modalStatus.style.color = '#f1c40f';
            trumpSelectArea.style.display = 'block';
        } else {
            modalStatus.innerText = `İhaleyi ${data.turnPlayerName} aldı! Koz seçmesi bekleniyor...`;
            modalStatus.style.color = 'white';
        }
    }
    else if (data.phase === 'gomme') {
        if (data.myTurn) {
            modalStatus.innerText = "Koz seçildi! Elinden 4 kart seçip Göm.";
            modalStatus.style.color = '#f1c40f';
            discardArea.style.display = 'block';
        } else {
            modalStatus.innerText = `${data.turnPlayerName} kart gömüyor...`;
            modalStatus.style.color = 'white';
        }
    }
    else if (data.phase === 'oyun') {
        if (data.myTurn) {
            modalStatus.innerText = "SIRA SENDE! Lütfen bir kart at.";
            modalStatus.style.color = '#c0392b';
        } else {
            modalStatus.innerText = `Sıra ${data.turnPlayerName} adlı oyuncuda...`;
            modalStatus.style.color = 'white';
        }
    }

    function getCardHtml(card, extraClass = '', extraStyle = '', clickFunc = '') {
        let colorClass = (card.suit === '♥' || card.suit === '♦') ? 'red' : 'black';
        return `<div class="card ${colorClass} ${extraClass}" style="${extraStyle}" ${clickFunc ? `onclick="${clickFunc}"` : ''}>
            <div class="top-index"><span>${card.value}</span><span>${card.suit}</span></div>
            <div class="center-pip">${card.suit}</div>
            <div class="bot-index"><span>${card.value}</span><span>${card.suit}</span></div>
        </div>`;
    }

    // 4. MASADAKİ (ORTADAKİ) KARTLARI ÇİZ
    tableCardsDiv.innerHTML = "";
    data.table.forEach(item => {
        let cardStyle = `border: 3px solid ${item.playerColor}; box-shadow: 0 6px 14px rgba(0,0,0,0.4); transform: rotate(${((Math.random() * 8) - 4).toFixed(1)}deg);`;
        tableCardsDiv.innerHTML += getCardHtml(item.card, '', cardStyle);
    });

    // 5. OYUNCUNUN ELİNDEKİ KARTLARI ÇİZ
    playerHandDiv.innerHTML = "";
    if (data.isSpectator) {
        playerHandDiv.innerHTML = `<div style="color:#bdc3c7; font-size:14px; padding:15px; font-style:italic;">👁️ İzleyici Modundasın - Oyuncuların elleri gizlidir, masadaki oyunu izliyorsun.</div>`;
    } else {
        data.hand.forEach((card, index) => {
            let clickFunc = (data.phase === 'gomme' && data.myTurn) ? `toggleSelect(${index})` : `playCard(${index})`;
            let disableClass = (data.myTurn && (data.phase === 'oyun' || data.phase === 'gomme')) ? '' : 'disabled';
            let selectStyle = selectedForDiscard.includes(index) ? 'box-shadow: 0 0 14px 4px #f59e0b; transform: translateY(-14px);' : '';

            playerHandDiv.innerHTML += getCardHtml(card, disableClass, selectStyle, clickFunc);
        });
    }
});

// GÖMME İŞLEMİ İÇİN KART SEÇİM KONTROLÜ
function toggleSelect(index) {
    if (selectedForDiscard.includes(index)) {
        selectedForDiscard = selectedForDiscard.filter(i => i !== index);
    } else if (selectedForDiscard.length < 4) {
        selectedForDiscard.push(index);
    }
    document.getElementById('selectedCount').innerText = selectedForDiscard.length;
    document.getElementById('discardBtn').disabled = (selectedForDiscard.length !== 4);

    let cards = playerHandDiv.children;
    for (let i = 0; i < cards.length; i++) {
        if (selectedForDiscard.includes(i)) cards[i].style.transform = "translateY(-14px)";
        else cards[i].style.transform = "none";
    }
}

// SOKET GÖNDERİMLERİ (SUNUCUYA İSTEK ATAN FONKSİYONLAR)
function placeBid(val) {
    socket.emit('placeBid', val);
}

function selectTrump(suit) {
    socket.emit('selectTrump', suit);
}

function sendDiscard() {
    if (window.playSound) window.playSound('card');
    socket.emit('discardCards', selectedForDiscard);
    selectedForDiscard = [];
}

function playCard(index) {
    if (window.playSound) window.playSound('card');
    socket.emit('playCard', index);
}

// ==========================================================================
// BATAK KIRAATHANE YAZBOZU (SEKMELİ SAYFA SİSTEMİ) & RÖVANŞ
// ==========================================================================
let currentBatakTab = 1;

function toggleBatakYazbozModal() {
    const modal = document.getElementById('batakYazbozModal');
    if (!modal) return;
    if (modal.style.display === 'flex') {
        closeBatakYazbozModal();
    } else {
        openBatakYazbozModal();
    }
}
window.toggleBatakYazbozModal = toggleBatakYazbozModal;

function openBatakYazbozModal() {
    const modal = document.getElementById('batakYazbozModal');
    if (modal) modal.style.display = 'flex';
    if (window.lastBatakData) {
        if (currentBatakTab === null || currentBatakTab === undefined) {
            currentBatakTab = window.lastBatakData.currentSet || 1;
        }
        renderBatakYazboz();
    }
}
window.openBatakYazbozModal = openBatakYazbozModal;

function closeBatakYazbozModal() {
    const modal = document.getElementById('batakYazbozModal');
    if (modal) modal.style.display = 'none';
}
window.closeBatakYazbozModal = closeBatakYazbozModal;

function selectBatakTab(tabKey) {
    currentBatakTab = tabKey;
    renderBatakYazboz();
}
window.selectBatakTab = selectBatakTab;

function renderBatakYazboz() {
    const data = window.lastBatakData;
    if (!data) return;

    const tabsContainer = document.getElementById('batakYazbozTabs');
    const contentContainer = document.getElementById('batakYazbozContent');
    const setTitleEl = document.getElementById('batakYazbozSetTitle');
    const potInfoEl = document.getElementById('batakYazbozPotInfo');

    if (!tabsContainer || !contentContainer) return;

    let setsHist = data.setsHistory || [];
    let curSetNum = data.currentSet || 1;
    let maxSetNum = Math.max(curSetNum, setsHist.length);

    // 1. Sekmeleri Çiz
    tabsContainer.innerHTML = "";
    for (let s = 1; s <= maxSetNum; s++) {
        let isAct = (currentBatakTab === s);
        let btn = document.createElement('button');
        btn.className = `batak-tab-btn ${isAct ? 'active' : ''}`;
        btn.innerText = `${s}. Set`;
        btn.onclick = () => selectBatakTab(s);
        tabsContainer.appendChild(btn);
    }

    // 🏆 Genel Sıralama Sekmesi (Tüm setlerin birleşik puanları)
    let isGrandAct = (currentBatakTab === 'grand');
    let grandBtn = document.createElement('button');
    grandBtn.className = `batak-tab-btn grand ${isGrandAct ? 'active' : ''}`;
    grandBtn.innerText = "🏆 Genel Sıralama";
    grandBtn.onclick = () => selectBatakTab('grand');
    tabsContainer.appendChild(grandBtn);

    // Üst Bilgi
    if (potInfoEl) {
        let potVal = data.pot || (data.bet ? data.bet * data.players.length : 0);
        potInfoEl.innerHTML = (data.bet > 0) ? `Set Bahsi: <b>${data.bet} TL</b> | Pot: <b>${potVal} TL</b>` : `🆓 Ücretsiz Masa`;
    }

    if (currentBatakTab === 'grand') {
        if (setTitleEl) setTitleEl.innerText = "🏆 Genel Set Sıralaması & Toplam Set Puanları";
        renderBatakGrandRankings(data, contentContainer, setsHist, maxSetNum);
    } else {
        let setNum = Number(currentBatakTab) || 1;
        if (setTitleEl) setTitleEl.innerText = `${setNum}. Set Çetelesi`;
        renderBatakSingleSet(data, contentContainer, setNum, setsHist);
    }
}

function renderBatakSingleSet(data, container, setNum, setsHist) {
    let histObj = setsHist.find(h => h.setNumber === setNum);
    let isCompleted = !!histObj;
    let isCurrentActive = (!isCompleted && setNum === (data.currentSet || 1));

    let rounds = [];
    let playerPids = data.players || [];
    let finalScores = {};
    let rankings = [];

    if (isCompleted) {
        rounds = histObj.rounds || [];
        finalScores = histObj.finalScores || {};
        rankings = histObj.rankings || [];
    } else if (isCurrentActive) {
        rounds = data.currentSetRounds || [];
        playerPids.forEach(p => {
            finalScores[p] = (data.playerInfos && data.playerInfos[p]) ? data.playerInfos[p].score : 0;
        });
        rankings = [...playerPids].map(p => ({
            pid: p,
            name: data.playerInfos[p]?.name || "Oyuncu",
            score: finalScores[p] || 0
        })).sort((a, b) => b.score - a.score);
        let ptsTable = [3, 2, 1, 0];
        rankings.forEach((r, idx) => {
            r.rank = idx + 1;
            r.setPoints = ptsTable[idx] !== undefined ? ptsTable[idx] : 0;
        });
    }

    let html = `<table class="batak-yazboz-table">
        <thead>
            <tr>
                <th style="width: 150px; text-align: left;">El / Tur</th>`;

    playerPids.forEach(p => {
        let pName = (data.playerInfos && data.playerInfos[p]) ? data.playerInfos[p].name : (histObj?.rankings?.find(r => r.pid === p)?.name || "Oyuncu");
        let isMe = (p === socket.id);
        html += `<th style="${isMe ? 'background:#dbeafe; color:#1e40af;' : ''}">${pName} ${isMe ? '(Sen)' : ''}</th>`;
    });

    html += `</tr></thead><tbody>`;

    let totalRoundsToShow = 5;
    if (rounds.some(r => r.roundNum === 6 || r.isTieBreaker) || data.isTieBreaker) {
        totalRoundsToShow = 6;
    }

    for (let rNum = 1; rNum <= totalRoundsToShow; rNum++) {
        let isTie = (rNum === 6);
        let roundLabel = isTie ? `<span class="tie-breaker-badge">⚡ 6. El (Eşitlik Bozma)</span>` : `${rNum}. El`;
        let roundRecord = rounds.find(r => r.roundNum === rNum);

        html += `<tr><td style="text-align: left; font-weight: bold; background: ${isTie ? '#fef2f2' : '#f8fafc'};">${roundLabel}</td>`;

        playerPids.forEach(p => {
            let scoreText = "-";
            if (roundRecord) {
                let s = (roundRecord.handScores && roundRecord.handScores[p] !== undefined) ? roundRecord.handScores[p] : (roundRecord.scores ? roundRecord.scores[p] : null);
                if (s !== null && s !== undefined) {
                    let sColor = s > 0 ? '#16a34a' : (s < 0 ? '#dc2626' : '#64748b');
                    let sPrefix = s > 0 ? '+' : '';
                    scoreText = `<span style="color:${sColor}; font-weight:800;">${sPrefix}${s}</span>`;
                }
            } else if (isCurrentActive && rNum === (data.setRound || 1)) {
                scoreText = `<span style="color:#d97706; font-size:11px; font-style:italic;">Oynanıyor...</span>`;
            }
            html += `<td>${scoreText}</td>`;
        });

        html += `</tr>`;
    }

    // Toplam Satırı
    html += `<tr class="total-row"><td style="text-align: left;">📊 SET EL TOPLAMI</td>`;
    playerPids.forEach(p => {
        let tot = finalScores[p] !== undefined ? finalScores[p] : 0;
        let tColor = tot > 0 ? '#15803d' : (tot < 0 ? '#b91c1c' : '#0f172a');
        html += `<td style="color:${tColor}; font-size:15px;">${tot}</td>`;
    });
    html += `</tr>`;

    // Sıralama Satırı
    let medals = { 1: "🥇 1. (Zirve)", 2: "🥈 2.", 3: "🥉 3.", 4: "4." };
    html += `<tr class="rank-row"><td style="text-align: left;">🏆 SET DERECESİ</td>`;
    playerPids.forEach(p => {
        let rankObj = rankings.find(r => r.pid === p);
        let rankText = rankObj ? (medals[rankObj.rank] || `${rankObj.rank}.`) : "-";
        html += `<td>${rankText}</td>`;
    });
    html += `</tr>`;

    // Set Puanı Satırı
    html += `<tr class="points-row"><td style="text-align: left;">⭐ KAZANILAN SET PUANI</td>`;
    playerPids.forEach(p => {
        let rankObj = rankings.find(r => r.pid === p);
        let pts = rankObj ? rankObj.setPoints : 0;
        let isChamp = (rankObj && rankObj.rank === 1);
        let extraBadge = isChamp && isCompleted && histObj?.potAwarded ? `<div style="font-size:10px; color:#059669; font-weight:normal;">+${histObj.potAwarded} TL Pot</div>` : '';
        html += `<td><b>+${pts} Puan</b>${extraBadge}</td>`;
    });
    html += `</tr>`;

    html += `</tbody></table>`;
    container.innerHTML = html;
}

function renderBatakGrandRankings(data, container, setsHist, maxSetNum) {
    let playerPids = data.players || [];
    let cumPoints = data.cumulativeSetPoints || {};

    let grandRows = playerPids.map(p => {
        let pName = (data.playerInfos && data.playerInfos[p]) ? data.playerInfos[p].name : "Oyuncu";
        let setsWon = setsHist.filter(h => h.winnerId === p).length;
        let totalPts = cumPoints[p] || 0;
        return { pid: p, name: pName, setsWon: setsWon, totalPts: totalPts };
    }).sort((a, b) => b.totalPts !== a.totalPts ? b.totalPts - a.totalPts : b.setsWon - a.setsWon);

    grandRows.forEach((r, i) => { r.grandRank = i + 1; });

    let medals = { 1: "🥇 1.", 2: "🥈 2.", 3: "🥉 3.", 4: "4." };

    let html = `<table class="batak-yazboz-table">
        <thead>
            <tr>
                <th style="width: 70px;">Derece</th>
                <th style="text-align: left;">Oyuncu</th>`;

    for (let s = 1; s <= maxSetNum; s++) {
        html += `<th>${s}. Set Puanı</th>`;
    }

    html += `<th style="background:#fef3c7; color:#92400e;">🏆 Kazanılan Setler</th>
             <th style="background:#dcfce7; color:#166534; font-size:14px;">⭐ TOPLAM SET PUANI</th>
            </tr>
        </thead>
        <tbody>`;

    grandRows.forEach(row => {
        let isMe = (row.pid === socket.id);
        html += `<tr style="${isMe ? 'background:#eff6ff;' : ''}">
            <td style="font-weight:900; font-size:14px;">${medals[row.grandRank] || `${row.grandRank}.`}</td>
            <td style="text-align:left; font-weight:800;">${row.name} ${isMe ? '<span style="color:#2563eb;">(Sen)</span>' : ''}</td>`;

        for (let s = 1; s <= maxSetNum; s++) {
            let histObj = setsHist.find(h => h.setNumber === s);
            let setPtsText = "-";
            if (histObj && histObj.rankings) {
                let rItem = histObj.rankings.find(r => r.pid === row.pid);
                if (rItem) {
                    setPtsText = `<span style="font-weight:800; color:#1d4ed8;">+${rItem.setPoints}</span>`;
                }
            } else if (s === (data.currentSet || 1)) {
                setPtsText = `<span style="color:#d97706; font-size:11px;">Oynanıyor...</span>`;
            }
            html += `<td>${setPtsText}</td>`;
        }

        html += `<td style="font-weight:900; color:#b45309;">${row.setsWon} Set</td>
                 <td style="font-weight:900; color:#15803d; font-size:16px; background:#f0fdf4;">${row.totalPts} Puan</td>
        </tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

// SOKET DİNLEYİCİLERİ - BATAK SET BİTİŞ & RÖVANŞ
socket.on('batakSetCompleted', (data) => {
    window.lastBatakData = { ...window.lastBatakData, ...data, setEnded: true };
    openBatakYazbozModal();

    const rematchSection = document.getElementById('batakRematchSection');
    const titleEl = document.getElementById('batakRematchTitle');
    const winnerAnnounce = document.getElementById('batakRematchWinnerAnnounce');
    const betInfoEl = document.getElementById('batakRematchBetInfo');
    const votesText = document.getElementById('batakRematchVotesText');
    const acceptBtn = document.getElementById('batakRematchAcceptBtn');

    if (rematchSection) rematchSection.style.display = 'block';
    if (titleEl) titleEl.innerText = `🏆 ${data.setNumber}. Set Sona Erdi!`;
    if (winnerAnnounce) {
        let isMe = (data.winner?.pid === socket.id);
        let potNotice = (data.potAwarded > 0) ? ` ve <b>${data.potAwarded} TL</b>'lik büyük potu kazandı!` : '!';
        winnerAnnounce.innerHTML = isMe ? `🎉 Tebrikler, seti <b>${data.winner?.score} puanla</b> zirvede bitirdin${potNotice}` : `🎉 <b>${data.winner?.name}</b> seti ${data.winner?.score} puanla 1. tamamladı${potNotice}`;
    }

    if (betInfoEl) {
        let totalPot = data.bet * (data.rankings ? data.rankings.length : 3);
        betInfoEl.innerHTML = (data.bet > 0) ? `Yeni Set Bahsi: <b>${data.bet} TL</b> (Kişi Başı) | Kazanan Potu: <b>${totalPot} TL</b>` : `🆓 Ücretsiz Masa`;
    }

    if (votesText) votesText.innerText = "Yeni set için oyuncuların onayı bekleniyor...";
    if (acceptBtn) {
        acceptBtn.disabled = false;
        acceptBtn.style.opacity = '1';
        acceptBtn.innerHTML = "✅ Yeni Set Başlat";
    }
    if (window.playSound) window.playSound('victory');
});

socket.on('batakRematchStatus', (data) => {
    const votesText = document.getElementById('batakRematchVotesText');
    if (votesText && data.votes) {
        let votedCount = Object.values(data.votes).filter(v => v).length;
        votesText.innerText = `Oyuncuların onayı bekleniyor... (${votedCount}/${data.totalPlayers} Onay)`;
    }
});

socket.on('batakNewSetStarted', (data) => {
    const rematchSection = document.getElementById('batakRematchSection');
    if (rematchSection) rematchSection.style.display = 'none';
    currentBatakTab = data.setNumber || 1;
    if (window.lastBatakData) {
        window.lastBatakData.currentSet = data.setNumber;
        window.lastBatakData.setEnded = false;
    }
    renderBatakYazboz();
    if (window.playSound) window.playSound('card');
});

function acceptBatakRematch() {
    const acceptBtn = document.getElementById('batakRematchAcceptBtn');
    if (acceptBtn) {
        acceptBtn.disabled = true;
        acceptBtn.style.opacity = '0.6';
        acceptBtn.innerHTML = "⏳ Onaylandı, Diğerleri Bekleniyor...";
    }
    socket.emit('batakVoteRematch');
}
window.acceptBatakRematch = acceptBatakRematch;