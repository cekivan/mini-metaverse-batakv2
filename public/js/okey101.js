// public/js/okey101.js - 101 Okey İstemci Mantığı (Eşli & Tekli Kıraathane & A4 Yazboz)

let okey101Data = null;
let okey101SelectedIds = [];

// Socket Dinleyicisi
socket.on('okey101Update', (data) => {
    if (!data) return;
    if (data.playerInfos && data.playerInfos[socket.id]?.isDisconnected) {
        return; // Masadan ayrılmış oyuncuya modal açma!
    }

    okey101Data = data;
    window.currentActiveTableId = data.tableId;

    // Modalleri Aç/Kapat
    const gameModal = document.getElementById('gameModal');
    const okeyArea = document.getElementById('okey101Area');
    const batakArea = document.getElementById('batakArea');
    const billiardArea = document.getElementById('billiardArea');
    const tavlaArea = document.getElementById('tavlaArea');

    if (gameModal) gameModal.style.display = 'flex';
    if (batakArea) batakArea.style.display = 'none';
    if (billiardArea) billiardArea.style.display = 'none';
    if (tavlaArea) tavlaArea.style.display = 'none';
    if (okeyArea) okeyArea.style.display = 'block';

    if (window.setVoiceTable && data.tableId) {
        window.setVoiceTable(data.tableId);
    }

    const tableReactionArea = document.getElementById('tableReactionArea');
    if (tableReactionArea) tableReactionArea.style.display = 'none';

    // Gösterge Açma / Gösterme Butonu Kontrolü (Oyun başında ilk taş çekilmeden önce)
    const revealBtn = document.getElementById('okey101RevealGostergeBtn');
    if (revealBtn) {
        revealBtn.style.display = (data.canRevealGosterge && !data.isSpectator) ? 'inline-block' : 'none';
    }

    if (window.startTurnTimer) window.startTurnTimer(data.turnTimeout || 40);

    // 1. Başlık ve El Bilgisi
    const headerTitle = document.getElementById('okey101HeaderTitle');
    if (headerTitle) {
        let modeLabel = (data.mode === 'esli') ? "Eşli (2v2)" : "Tekli";
        headerTitle.innerText = `101 Okey (${modeLabel} - Cezalı & Katlamasız)`;
    }

    const roundBadge = document.getElementById('okey101RoundBadge');
    if (roundBadge) roundBadge.innerText = `${data.roundNumber || 1}. El`;

    const statusEl = document.getElementById('okey101Status');
    if (statusEl) {
        if (data.isSpectator) {
            statusEl.innerText = `İzleyicisin (Yancı) - Sıra: ${data.turnPlayerName}`;
            statusEl.style.color = '#38bdf8';
        } else if (data.gameOver) {
            let wName = data.playerInfos[data.winner] ? data.playerInfos[data.winner].name : "Biri";
            statusEl.innerText = `El Bitti! Kazanan: ${wName}`;
            statusEl.style.color = '#34d399';

            if (!window.celebratedRound || window.celebratedRound !== data.roundNumber) {
                window.celebratedRound = data.roundNumber;
                triggerVictoryCelebration(wName, data);
            }
        } else if (data.myTurn) {
            window.celebratedRound = null;
            if (!data.drawnThisTurn) {
                statusEl.innerText = "SIRA SENDE! Desteden veya solundan taş çek.";
                statusEl.style.color = '#facc15';
            } else if (data.lastDrawnTile && !data.lastDiscardTaken) {
                let dName = getOkeyTileName(data.lastDrawnTile, data.okeyDef);
                statusEl.innerText = `SIRA SENDE! Desteden [${dName}] çektin. El açabilir, işleyebilir veya taş atabilirsin.`;
                statusEl.style.color = '#34d399';
            } else {
                statusEl.innerText = "SIRA SENDE! El açabilir, işleyebilir veya taş atabilirsin.";
                statusEl.style.color = '#34d399';
            }
        } else {
            statusEl.innerText = `Sıra ${data.turnPlayerName} adlı oyuncuda...`;
            statusEl.style.color = '#cbd5e1';
        }
    }

    // 2. Skor Tablosu (4 Oyuncu & Takımlar)
    renderScoreboard(data);

    // 3. Gösterge ve Okey Taşı
    renderIndicators(data);

    // 4. Kalan Deste ve 4 Köşe Atılan Taşlar
    renderDeckAndDiscards(data);

    // 5. Masaya Açılmış Perler (4 Oyuncu Kendi Önüne)
    renderTableOpenedPers(data);

    // 6. Oyuncunun Istakası
    renderPlayerHand(data);

    // 7. A4 Kıraathane Yazboz Çetelesi
    renderYazboz(data);
});

// Masadan Ayrılma Olayı
socket.on('tableLeft', () => {
    if (window.leaveTableVoiceChat) window.leaveTableVoiceChat();
    okey101Data = null;
    window.currentActiveTableId = null;
    const gameModal = document.getElementById('gameModal');
    if (gameModal) gameModal.style.display = 'none';
    const okeyArea = document.getElementById('okey101Area');
    if (okeyArea) okeyArea.style.display = 'none';
});

// Oyuncu Skor & Ceza Kartları (Takım ve Eş Rozetleri)
function renderScoreboard(data) {
    const sb = document.getElementById('okey101Scoreboard');
    if (!sb) return;

    sb.innerHTML = "";
    data.players.forEach((pid, idx) => {
        let p = data.playerInfos[pid] || { name: "Oyuncu", score: 0, penalties: 0, hasOpened: false, tileCount: 0 };
        let isTurn = (pid === data.players[data.turnIndex]);
        let turnClass = isTurn ? 'turn-pulse' : '';
        let turnBorder = isTurn 
            ? 'border: 2px solid #facc15; box-shadow: 0 0 14px rgba(250, 204, 21, 0.7); background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(51, 65, 85, 0.9));' 
            : 'border: 1px solid rgba(255,255,255,0.1); background: rgba(15, 23, 42, 0.85);';
        
        let openedBadge = p.hasOpened 
            ? `<span style="background:linear-gradient(135deg,#059669,#10b981); color:white; font-size:9px; font-weight:800; padding:2px 6px; border-radius:4px; box-shadow:0 0 6px rgba(16,185,129,0.4);">Açtı</span>` 
            : `<span style="background:#475569; color:#cbd5e1; font-size:9px; font-weight:700; padding:2px 6px; border-radius:4px;">Açmadı</span>`;
        
        let penaltyBadge = p.penalties > 0 
            ? `<span style="background:rgba(239,68,68,0.2); border:1px solid #ef4444; color:#fca5a5; font-weight:800; font-size:10px; padding:1px 5px; border-radius:4px;">+${p.penalties} Ceza</span>` 
            : '';

        // Eşli Mod Takım Rozetleri
        let teamBadge = "";
        let partnerBadge = "";
        if (data.mode === 'esli') {
            let isTeam1 = (idx === 0 || idx === 2);
            teamBadge = isTeam1
                ? `<span style="background:linear-gradient(135deg,#1d4ed8,#2563eb); color:white; font-size:9px; font-weight:900; padding:2px 6px; border-radius:4px; box-shadow:0 0 6px rgba(37,99,235,0.4);">1. Grup</span>`
                : `<span style="background:linear-gradient(135deg,#c2410c,#ea580c); color:white; font-size:9px; font-weight:900; padding:2px 6px; border-radius:4px; box-shadow:0 0 6px rgba(234,88,12,0.4);">2. Grup</span>`;

            if (pid === data.partnerId) {
                partnerBadge = `<span style="color:#38bdf8; font-size:10px; font-weight:bold;">(Ortağın)</span>`;
                if (data.partnerOpened) {
                    partnerBadge += ` <span style="color:#34d399; font-size:10px; font-weight:bold;">✨ Açtı!</span>`;
                }
            }
        }

        let isSelf = (pid === socket.id);
        let namePrefix = isSelf ? "(Sen) " : "";
        let disconnectedHtml = "";
        if (data.disconnectedPlayers && data.disconnectedPlayers[pid]) {
            disconnectedHtml = `
                <div style="margin-top:4px; padding-top:4px; border-top:1px dashed rgba(239,68,68,0.4); display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:#ef4444; font-size:9.5px; font-weight:800;">⚠️ Masadan Ayrıldı</span>
                    <button onclick="okey101AssignBot('${pid}')" style="padding:2px 7px; background:linear-gradient(135deg,#8b5cf6,#6d28d9); color:white; border:none; border-radius:4px; font-size:9.5px; font-weight:bold; cursor:pointer; box-shadow:0 1px 4px rgba(139,92,246,0.4);" title="Boş koltuğa yapay zeka bot ata">🤖 Bota Devret</button>
                </div>
            `;
        }

        sb.innerHTML += `
            <div class="${turnClass}" id="okey101PlayerCard_${pid}" style="padding: 8px 10px; border-radius: 9px; ${turnBorder} text-align: left; transition: all 0.2s;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px; gap:4px;">
                    <div style="display:flex; align-items:center; gap:4px; overflow:hidden;">
                        <b style="font-size:12px; color:${p.color || '#fff'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:85px;">${namePrefix}${p.name}</b>
                        ${partnerBadge}
                    </div>
                    <div style="display:flex; gap:3px;">
                        ${teamBadge}
                        ${openedBadge}
                    </div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#cbd5e1; margin-top:3px;">
                    <span>Taş: <b style="color:#f8fafc;">${p.tileCount}</b></span>
                    <span>Ceza: <b style="color:#facc15; font-size:12px;">${p.score}</b></span>
                </div>
                ${penaltyBadge ? `<div style="text-align:right; margin-top:3px;">${penaltyBadge}</div>` : ''}
                ${disconnectedHtml}
            </div>
        `;
    });
}

// Gösterge Taşını Çiz (Okey Taşı masaya konmaz, göstergeden anlaşılır)
function renderIndicators(data) {
    const gEl = document.getElementById('okey101GostergeTile');
    if (gEl && data.gosterge) {
        let isFake = data.gosterge.isFakeOkey;
        let colorCls = isFake ? 'sahte' : data.gosterge.color;
        let text = isFake ? '⭐' : data.gosterge.value;
        gEl.className = `okey-tile mini ${colorCls}`;
        gEl.innerHTML = `<span>${text}</span>`;
    }
}

// Deste ve 4 Köşe Yönlü Atılan Taşlar (Sol-Alt, Sağ-Alt, Sağ-Üst, Sol-Üst)
function renderDeckAndDiscards(data) {
    const drawCountEl = document.getElementById('okey101DrawCount');
    if (drawCountEl) drawCountEl.innerText = `Deste: ${data.drawPileCount}`;

    let myPid = socket.id;
    let playersList = data.players || [];
    let myIdx = playersList.indexOf(myPid);
    if (myIdx === -1) myIdx = 0;
    let n = 4;

    let rightIdx = (myIdx + 1) % n;
    let topIdx = (myIdx + 2) % n;
    let leftIdx = (myIdx + 3) % n;

    let rightPid = playersList[rightIdx];
    let topPid = playersList[topIdx];
    let leftPid = playersList[leftIdx];

    let myP = data.playerInfos[myPid];
    let rightP = data.playerInfos[rightPid];
    let topP = data.playerInfos[topPid];
    let leftP = data.playerInfos[leftPid];

    function renderSlotTile(containerId, tile, isHighlight) {
        const el = document.getElementById(containerId);
        if (!el) return;
        if (tile) {
            let isFake = tile.isFakeOkey;
            let colorCls = isFake ? 'sahte' : tile.color;
            let text = isFake ? '⭐' : tile.value;
            let extraGlow = isHighlight ? 'box-shadow: 0 0 12px rgba(56,189,248,0.7);' : '';
            el.innerHTML = `<div class="okey-tile mini ${colorCls}" style="${extraGlow}"><span>${text}</span></div>`;
        } else {
            el.innerHTML = `<span class="slot-empty">Boş</span>`;
        }
    }

    // 1. SOL-ALT: Solundaki oyuncudan sana atılan taş (Alabileceğin taş)
    renderSlotTile('okey101LeftTileContainer', leftP?.lastDiscard, true);
    const takeDiscardBtn = document.getElementById('okey101TakeDiscardBtn');
    if (takeDiscardBtn) {
        takeDiscardBtn.style.display = (data.canTakeDiscard && data.myTurn) ? 'block' : 'none';
        takeDiscardBtn.innerHTML = "🖐️ Taşı Al";
    }

    // 2. SAĞ-ALT: Senin sağındaki oyuncuya attığın taş
    renderSlotTile('okey101RightTileContainer', myP?.lastDiscard, false);

    // 3. SAĞ-ÜST: Sağındaki oyuncunun karşıdaki oyuncuya attığı taş
    renderSlotTile('okey101TopRightTileContainer', rightP?.lastDiscard, false);

    // 4. SOL-ÜST: Karşıdaki oyuncunun solundaki oyuncuya attığı taş
    renderSlotTile('okey101TopLeftTileContainer', topP?.lastDiscard, false);
}

// 4 Ayrı Bölgeye Oyuncu Perlerini Çiz (Herkes Kendi Önüne Açar)
function renderTableOpenedPers(data) {
    let myPid = socket.id;
    let playersList = data.players || [];
    let myIdx = playersList.indexOf(myPid);
    if (myIdx === -1) myIdx = 0;
    let n = 4;

    let rightIdx = (myIdx + 1) % n;
    let topIdx = (myIdx + 2) % n;
    let leftIdx = (myIdx + 3) % n;

    let rightPid = playersList[rightIdx];
    let topPid = playersList[topIdx];
    let leftPid = playersList[leftIdx];

    let myP = data.playerInfos[myPid];
    let rightP = data.playerInfos[rightPid];
    let topP = data.playerInfos[topPid];
    let leftP = data.playerInfos[leftPid];

    let allPers = (data.tableOpenedPers || []).map((per, originalIndex) => ({ per, originalIndex }));
    let topPers = allPers.filter(item => item.per.ownerId === topPid);
    let leftPers = allPers.filter(item => item.per.ownerId === leftPid);
    let rightPers = allPers.filter(item => item.per.ownerId === rightPid);
    let myPers = allPers.filter(item => item.per.ownerId === myPid);

    let canProcess = data.myTurn && data.drawnThisTurn && !!data.playerInfos[socket.id]?.hasOpened;

    function renderZonePersList(containerId, persList, emptyMsg) {
        const container = document.getElementById(containerId);
        if (!container) return 0;

        if (!persList || persList.length === 0) {
            container.innerHTML = `<div class="zone-empty-text">${emptyMsg}</div>`;
            return 0;
        }

        container.innerHTML = "";
        let totalZoneScore = 0;

        persList.forEach(({ per, originalIndex }) => {
            let hasOkeyInPer = false;
            let perSum = 0;

            let tilesHtml = per.tiles.map(t => {
                let isOkey = (data.okeyDef && !t.isFakeOkey && t.color === data.okeyDef.color && t.value === data.okeyDef.value);
                if (isOkey) hasOkeyInPer = true;
                let val = t.isFakeOkey ? (data.okeyDef ? data.okeyDef.value : 10) : t.value;
                perSum += val;
                let colorCls = t.isFakeOkey ? 'sahte' : t.color;
                let okeyCls = isOkey ? 'gold-border' : '';
                let text = t.isFakeOkey ? '⭐' : (isOkey ? `👑${t.value}` : t.value);
                return `<div class="okey-tile mini ${colorCls} ${okeyCls}"><span>${text}</span></div>`;
            }).join('');

            totalZoneScore += perSum;

            let actionButtons = "";
            if (canProcess) {
                let addBtns = `
                    <button onclick="okey101AddSelectedToPer(${originalIndex}, 'start')" style="padding:2px 5px; font-size:9px; background:linear-gradient(135deg,#0284c7,#0369a1); color:white; border:none; border-radius:4px; font-weight:800; cursor:pointer;" title="Seçili taşı perin başına ekle">◀</button>
                    <button onclick="okey101AddSelectedToPer(${originalIndex}, 'end')" style="padding:2px 5px; font-size:9px; background:linear-gradient(135deg,#0284c7,#0369a1); color:white; border:none; border-radius:4px; font-weight:800; cursor:pointer;" title="Seçili taşı perin sonuna ekle">▶</button>
                `;

                let takeOkeyBtn = "";
                if (hasOkeyInPer && per.type !== 'cift') {
                    takeOkeyBtn = `
                        <button onclick="okey101TakeOkeyFromPer(${originalIndex})" style="padding:2px 6px; font-size:9px; background:linear-gradient(135deg,#f59e0b,#d97706); color:white; border:none; border-radius:4px; cursor:pointer; font-weight:900;" title="Masadaki Okey'i al (Rakibe +101 Ceza)">👑 Al</button>
                    `;
                }

                actionButtons = `
                    <div style="display:flex; flex-direction:column; gap:2px; margin-left:4px;">
                        <div style="display:flex; gap:2px;">${addBtns}</div>
                        ${takeOkeyBtn}
                    </div>
                `;
            }

            let perTypeBadge = per.type === 'cift' 
                ? `<span style="font-size:8.5px; background:rgba(245,158,11,0.2); color:#fbbf24; border:1px solid rgba(245,158,11,0.4); padding:1px 4px; border-radius:3px; font-weight:800;">Çift</span>`
                : `<span style="font-size:8.5px; background:rgba(56,189,248,0.2); color:#38bdf8; border:1px solid rgba(56,189,248,0.4); padding:1px 4px; border-radius:3px; font-weight:800;">${perSum}p</span>`;

            container.innerHTML += `
                <div id="openPer_${originalIndex}" 
                     class="okey-open-per-group" 
                     style="padding: 4px 6px; margin-right: 4px; margin-bottom: 4px; cursor: pointer;"
                     ondragover="okey101PerDragOver(event, ${originalIndex})"
                     ondragleave="okey101PerDragLeave(event, ${originalIndex})"
                     ondrop="okey101PerDrop(event, ${originalIndex})"
                     onclick="okey101PerClick(event, ${originalIndex})"
                     title="Taşı bu pere sürükleyip bırakarak (veya seçip tıklayarak) işleyebilirsiniz">
                    <div style="display:flex; align-items:center; margin-right:3px;">
                        ${perTypeBadge}
                    </div>
                    <div style="display:flex; gap:2px; align-items:center;">${tilesHtml}</div>
                    ${actionButtons}
                </div>
            `;
        });

        return totalZoneScore;
    }

    // 1. ÜST (KARŞI) BÖLGE
    let topScore = renderZonePersList('okey101TopOpenedPersList', topPers, "Henüz el açmadı.");
    const topNameEl = document.getElementById('okey101TopZoneName');
    const topBadgeEl = document.getElementById('okey101TopZoneBadge');
    const topScoreEl = document.getElementById('okey101TopZoneScore');
    const topTeamEl = document.getElementById('okey101TopZoneTeam');
    if (topNameEl) topNameEl.innerText = topP ? topP.name : "-";
    if (topTeamEl) {
        topTeamEl.innerHTML = (topPid === data.partnerId) ? `<span style="color:#60a5fa; font-size:10px;">(Ortağın)</span>` : '';
    }
    if (topBadgeEl) {
        topBadgeEl.className = topP?.hasOpened ? "zone-badge opened" : "zone-badge unopened";
        topBadgeEl.innerText = topP?.hasOpened ? "Açtı" : "Açmadı";
    }
    if (topScoreEl) {
        topScoreEl.innerText = topP?.hasOpened ? `Toplam: ${topScore} Puan` : '';
    }

    // 2. SOL BÖLGE
    renderZonePersList('okey101LeftOpenedPersList', leftPers, "Henüz el açmadı.");
    const leftNameEl = document.getElementById('okey101LeftZoneName');
    const leftBadgeEl = document.getElementById('okey101LeftZoneBadge');
    if (leftNameEl) leftNameEl.innerText = leftP ? leftP.name : "Sol";
    if (leftBadgeEl) {
        leftBadgeEl.className = leftP?.hasOpened ? "zone-badge opened" : "zone-badge unopened";
        leftBadgeEl.innerText = leftP?.hasOpened ? "Açtı" : "Açmadı";
    }

    // 3. SAĞ BÖLGE
    renderZonePersList('okey101RightOpenedPersList', rightPers, "Henüz el açmadı.");
    const rightNameEl = document.getElementById('okey101RightZoneName');
    const rightBadgeEl = document.getElementById('okey101RightZoneBadge');
    if (rightNameEl) rightNameEl.innerText = rightP ? rightP.name : "Sağ";
    if (rightBadgeEl) {
        rightBadgeEl.className = rightP?.hasOpened ? "zone-badge opened" : "zone-badge unopened";
        rightBadgeEl.innerText = rightP?.hasOpened ? "Açtı" : "Açmadı";
    }

    // 4. ALT (BENİM) BÖLGEM
    let myScore = renderZonePersList('okey101BottomOpenedPersList', myPers, "Henüz el açmadın (En az 101 puan veya 5 çift gereklidir).");
    const myNameEl = document.getElementById('okey101MyZoneName');
    const myBadgeEl = document.getElementById('okey101MyZoneBadge');
    const myScoreEl = document.getElementById('okey101MyZoneScore');
    if (myNameEl) myNameEl.innerText = myP ? myP.name : "Sen";
    if (myBadgeEl) {
        myBadgeEl.className = myP?.hasOpened ? "zone-badge opened" : "zone-badge unopened";
        myBadgeEl.innerText = myP?.hasOpened ? "Açtın" : "Açmadın";
    }
    if (myScoreEl) {
        myScoreEl.innerText = myP?.hasOpened ? `Toplam: ${myScore} Puan` : '';
    }
}

// Masadaki Okey'i Geri Alma Aksiyonu
function okey101TakeOkeyFromPer(perIndex) {
    if (!okey101Data || !okey101Data.myTurn) return;
    if (okey101SelectedIds.length !== 1) {
        alert("Masadaki Okey'i almak için lütfen ıstakanızdan Okey'in yerine geçecek tam 1 taşı seçin!");
        return;
    }
    let tileId = okey101SelectedIds[0];
    okey101SelectedIds = [];
    if (window.playSound) window.playSound('okeyTile');
    socket.emit('okey101TakeOkey', { perIndex: perIndex, tileId: tileId });
}

// Sürükle ve Bırak ile Istaka Taşlarını Dizebilme (30 Yuvalı 2 Raflı Sistem)
let okey101DraggedId = null;
let okey101DraggedSlotIdx = null;

function okey101DragStart(e, tileId, slotIdx) {
    okey101DraggedId = tileId;
    okey101DraggedSlotIdx = slotIdx;
    if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', tileId);
    }
}
window.okey101DragStart = okey101DragStart;

function okey101SlotDragOver(e, slotIdx) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const el = document.getElementById(`okeySlot_${slotIdx}`);
    if (el) el.classList.add('drag-over');
}
window.okey101SlotDragOver = okey101SlotDragOver;

function okey101SlotDragLeave(e, slotIdx) {
    const el = document.getElementById(`okeySlot_${slotIdx}`);
    if (el) el.classList.remove('drag-over');
}
window.okey101SlotDragLeave = okey101SlotDragLeave;

function okey101SlotDrop(e, targetSlotIdx) {
    e.preventDefault();
    const el = document.getElementById(`okeySlot_${targetSlotIdx}`);
    if (el) el.classList.remove('drag-over');

    if (!window.okey101RackSlots) return;
    if (okey101DraggedSlotIdx === null || okey101DraggedSlotIdx === targetSlotIdx) {
        okey101DraggedId = null;
        okey101DraggedSlotIdx = null;
        return;
    }

    let fromIdx = okey101DraggedSlotIdx;
    let toIdx = targetSlotIdx;

    let sourceTileId = window.okey101RackSlots[fromIdx];
    let targetTileId = window.okey101RackSlots[toIdx];

    // İki yuva arasındaki taşı taşı veya takas et
    window.okey101RackSlots[toIdx] = sourceTileId;
    window.okey101RackSlots[fromIdx] = targetTileId;

    if (window.playSound) window.playSound('okeyTile');
    okey101DraggedId = null;
    okey101DraggedSlotIdx = null;
    renderPlayerHand(okey101Data);
}
window.okey101SlotDrop = okey101SlotDrop;

// Boş Yuvaya Tıklayarak Taşı Taşıma (Tek Tıkla Taşı Boşluğa veya Sağa Gönderme)
function okey101EmptySlotClick(slotIdx) {
    if (!okey101Data || !window.okey101RackSlots) return;

    // Eğer ıstakada tam 1 taş seçilmişse, o taşı doğrudan tıklanan boş yuvaya taşı!
    if (okey101SelectedIds.length === 1) {
        let selTileId = okey101SelectedIds[0];
        let fromIdx = window.okey101RackSlots.indexOf(selTileId);
        if (fromIdx !== -1 && fromIdx !== slotIdx) {
            window.okey101RackSlots[fromIdx] = null;
            window.okey101RackSlots[slotIdx] = selTileId;
            if (window.playSound) window.playSound('okeyTile');
            renderPlayerHand(okey101Data);
        }
    }
}
window.okey101EmptySlotClick = okey101EmptySlotClick;

// Masadaki Per Üzerine Taş Sürükleme ve Bırakma (İşleme)
function okey101PerDragOver(e, perIndex) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    const el = document.getElementById(`openPer_${perIndex}`);
    if (el) el.classList.add('per-drag-over');
}
window.okey101PerDragOver = okey101PerDragOver;

function okey101PerDragLeave(e, perIndex) {
    const el = document.getElementById(`openPer_${perIndex}`);
    if (el) el.classList.remove('per-drag-over');
}
window.okey101PerDragLeave = okey101PerDragLeave;

function okey101PerDrop(e, perIndex) {
    e.preventDefault();
    const el = document.getElementById(`openPer_${perIndex}`);
    if (el) el.classList.remove('per-drag-over');

    if (!okey101Data) return;

    if (!okey101Data.myTurn) {
        alert("Sıra sizde değilken masaya taş işleyemezsiniz!");
        return;
    }
    if (!okey101Data.drawnThisTurn) {
        alert("Taş işlemeden önce desteden veya solunuzdan taş çekmelisiniz!");
        return;
    }
    let myInfo = okey101Data.playerInfos && okey101Data.playerInfos[socket.id];
    if (!myInfo || !myInfo.hasOpened) {
        alert("⚠️ Masaya taş işleyebilmek için önce kendi elinizi açmış (en az 101 puan veya 5 çift) olmanız gerekir!");
        return;
    }

    let tileId = okey101DraggedId || (e.dataTransfer && e.dataTransfer.getData('text/plain'));
    if (!tileId) return;

    // İmleç perin sol yarısında mı sağ yarısında mı bırakıldı?
    let position = 'end';
    if (el) {
        let rect = el.getBoundingClientRect();
        let midX = rect.left + rect.width / 2;
        if (e.clientX < midX) {
            position = 'start';
        }
    }

    okey101DraggedId = null;
    okey101DraggedSlotIdx = null;

    if (window.playSound) window.playSound('okeyTile');
    socket.emit('okey101AddTileToPer', {
        tileIds: [tileId],
        tileId: tileId,
        targetPerIndex: perIndex,
        position: position
    });
}
window.okey101PerDrop = okey101PerDrop;

// Seçili Taşı Masadaki Pere Tıklayarak İşleme Alternatifi
function okey101PerClick(e, perIndex) {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;

    if (!okey101Data || !okey101Data.myTurn) return;
    if (okey101SelectedIds.length === 0) return;

    if (!okey101Data.drawnThisTurn) {
        alert("Taş işlemeden önce desteden veya solunuzdan taş çekmelisiniz!");
        return;
    }
    let myInfo = okey101Data.playerInfos && okey101Data.playerInfos[socket.id];
    if (!myInfo || !myInfo.hasOpened) {
        alert("⚠️ Masaya taş işleyebilmek için önce kendi elinizi açmış olmanız gerekir!");
        return;
    }

    let el = document.getElementById(`openPer_${perIndex}`);
    let position = 'end';
    if (el) {
        let rect = el.getBoundingClientRect();
        let midX = rect.left + rect.width / 2;
        if (e.clientX < midX) position = 'start';
    }

    let tileIds = [...okey101SelectedIds];
    okey101SelectedIds = [];
    if (window.playSound) window.playSound('okeyTile');
    socket.emit('okey101AddTileToPer', {
        tileIds: tileIds,
        tileId: tileIds[0],
        targetPerIndex: perIndex,
        position: position
    });
}
window.okey101PerClick = okey101PerClick;

function okey101DragEnd(e) {
    okey101DraggedId = null;
    okey101DraggedSlotIdx = null;
    document.querySelectorAll('.per-drag-over').forEach(el => el.classList.remove('per-drag-over'));
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}
window.okey101DragEnd = okey101DragEnd;

// Taş Adı ve Rengini Formatla
function getOkeyTileName(tile, okeyDef) {
    if (!tile) return "";
    let colorNameMap = { 'kirmizi': 'Kırmızı', 'siyah': 'Siyah', 'mavi': 'Mavi', 'sari': 'Sarı', 'sahte': 'Sahte Okey' };
    let cName = colorNameMap[tile.color] || tile.color;
    if (tile.isFakeOkey) return "Sahte Okey ⭐";
    let isOkey = (okeyDef && tile.color === okeyDef.color && tile.value === okeyDef.value);
    if (isOkey) return `${cName} ${tile.value} 👑 (OKEY!)`;
    return `${cName} ${tile.value}`;
}

function okey101SelectDrawnTile() {
    if (!okey101Data || !okey101Data.lastDrawnTileId) return;
    let tid = okey101Data.lastDrawnTileId;
    if (!okey101SelectedIds.includes(tid)) {
        okey101SelectedIds.push(tid);
    }
    renderPlayerHand(okey101Data);
}
window.okey101SelectDrawnTile = okey101SelectDrawnTile;

// =========================================================================
// 🀄 101 OKEY KURAL MOTORU VE OTOMATİK PER SAYMA (KİLİTLENME YOK - %100 ESNEK)
// =========================================================================

function isRealOkey(tile, okeyDef) {
    if (!tile || !okeyDef || tile.isFakeOkey) return false;
    return tile.color === okeyDef.color && tile.value === okeyDef.value;
}

function getEffectiveTile(tile, okeyDef) {
    if (!tile) return null;
    if (tile.isFakeOkey) {
        return {
            id: tile.id,
            color: okeyDef ? okeyDef.color : 'sahte',
            value: okeyDef ? okeyDef.value : 0,
            isFakeOkey: true,
            isOkey: false
        };
    }
    let isOkey = isRealOkey(tile, okeyDef);
    return {
        id: tile.id,
        color: tile.color,
        value: tile.value,
        isFakeOkey: false,
        isOkey: isOkey
    };
}

// Sıralı Per Kontrolü (Aynı Renk, Ardışık: 4-5-6 veya 11-12-13-1, Okey Joker Olarak Kullanılır)
function isValidSeries(tiles, okeyDef) {
    if (!tiles || tiles.length < 3 || tiles.length > 13) return false;

    let nonOkey = tiles.filter(t => !isRealOkey(t, okeyDef));
    if (nonOkey.length === 0) return true;

    let baseColor = nonOkey[0].isFakeOkey ? (okeyDef ? okeyDef.color : nonOkey[0].color) : nonOkey[0].color;
    for (let t of nonOkey) {
        let effColor = t.isFakeOkey ? (okeyDef ? okeyDef.color : t.color) : t.color;
        if (effColor !== baseColor) return false;
    }

    let nonOkeyVals = nonOkey.map(t => t.isFakeOkey ? (okeyDef ? okeyDef.value : t.value) : t.value);
    let okeyCount = tiles.length - nonOkey.length;
    let n = tiles.length;

    for (let startVal = 1; startVal <= 13; startVal++) {
        let req = [];
        let possible = true;
        for (let i = 0; i < n; i++) {
            let v = startVal + i;
            if (v > 13) {
                if (v === 14 && i === n - 1) {
                    v = 1; // 12-13-1 kuralı
                } else {
                    possible = false;
                    break;
                }
            }
            req.push(v);
        }
        if (!possible) continue;

        let tempReq = [...req];
        let matched = true;
        for (let val of nonOkeyVals) {
            let idx = tempReq.indexOf(val);
            if (idx === -1) {
                matched = false;
                break;
            }
            tempReq.splice(idx, 1);
        }
        if (matched && tempReq.length === okeyCount) {
            return true;
        }
    }

    return false;
}

// Grup Per Kontrolü (Aynı Sayı, Farklı Renkler: 7-7-7 gibi 3 veya 4 taş)
function isValidGroup(tiles, okeyDef) {
    if (!tiles || tiles.length < 3 || tiles.length > 4) return false;

    let nonOkey = tiles.filter(t => !isRealOkey(t, okeyDef));
    if (nonOkey.length === 0) return true;

    let baseVal = nonOkey[0].isFakeOkey ? (okeyDef ? okeyDef.value : nonOkey[0].value) : nonOkey[0].value;
    let colorsUsed = new Set();

    for (let t of nonOkey) {
        let effVal = t.isFakeOkey ? (okeyDef ? okeyDef.value : t.value) : t.value;
        let effCol = t.isFakeOkey ? (okeyDef ? okeyDef.color : t.color) : t.color;
        if (effVal !== baseVal) return false;
        if (colorsUsed.has(effCol)) return false;
        colorsUsed.add(effCol);
    }

    return true;
}

// Çift Kontrolü (Aynı Renk ve Sayı 2 Taş)
function isValidPair(tileA, tileB, okeyDef, gostergeTile = null) {
    if (!tileA || !tileB) return false;
    let effA = getEffectiveTile(tileA, okeyDef);
    let effB = getEffectiveTile(tileB, okeyDef);
    if (!effA || !effB) return false;

    if (effA.isOkey || effB.isOkey) return true;

    if (gostergeTile) {
        let isGostA = !tileA.isFakeOkey && tileA.color === gostergeTile.color && tileA.value === gostergeTile.value;
        let isGostB = !tileB.isFakeOkey && tileB.color === gostergeTile.color && tileB.value === gostergeTile.value;
        if (isGostA || isGostB) return true;
    }

    return effA.color === effB.color && effA.value === effB.value;
}

// Per Puanı Hesaplama
function getPerScore(tiles, okeyDef) {
    if (isValidSeries(tiles, okeyDef)) {
        let nonOkey = tiles.filter(t => !isRealOkey(t, okeyDef));
        let nonOkeyVals = nonOkey.map(t => t.isFakeOkey ? (okeyDef ? okeyDef.value : t.value) : t.value);
        let okeyCount = tiles.length - nonOkey.length;
        let n = tiles.length;

        for (let startVal = 1; startVal <= 13; startVal++) {
            let req = [];
            let possible = true;
            for (let i = 0; i < n; i++) {
                let v = startVal + i;
                if (v > 13) {
                    if (v === 14 && i === n - 1) v = 1;
                    else { possible = false; break; }
                }
                req.push(v);
            }
            if (!possible) continue;
            let tempReq = [...req];
            let matched = true;
            for (let val of nonOkeyVals) {
                let idx = tempReq.indexOf(val);
                if (idx === -1) { matched = false; break; }
                tempReq.splice(idx, 1);
            }
            if (matched && tempReq.length === okeyCount) {
                return req.reduce((a, b) => a + b, 0);
            }
        }
    } else if (isValidGroup(tiles, okeyDef)) {
        let nonOkey = tiles.find(t => !isRealOkey(t, okeyDef));
        let val = nonOkey ? (nonOkey.isFakeOkey ? (okeyDef ? okeyDef.value : 10) : nonOkey.value) : 10;
        return val * tiles.length;
    }
    let score = 0;
    tiles.forEach(t => {
        let eff = getEffectiveTile(t, okeyDef);
        score += eff ? eff.value : 0;
    });
    return score;
}

// Raf Üzerindeki Bitişik Yuvaları Ayrıştırma
function getContiguousRuns(startIdx, endIdx, currentHandMap) {
    let runs = [];
    let currentRun = [];
    for (let i = startIdx; i <= endIdx; i++) {
        let tid = window.okey101RackSlots ? window.okey101RackSlots[i] : null;
        let tile = tid ? currentHandMap[tid] : null;
        if (tile) {
            currentRun.push({ slotIdx: i, tile: tile });
        } else {
            if (currentRun.length > 0) {
                runs.push(currentRun);
                currentRun = [];
            }
        }
    }
    if (currentRun.length > 0) {
        runs.push(currentRun);
    }
    return runs;
}

// Bitişik Bir Taş Kümesindeki Geçerli Perleri Bul (Sıralı veya Grup)
function findPersInRun(run, okeyDef) {
    let tiles = run.map(x => x.tile);
    let n = tiles.length;
    if (n < 3) return [];

    let memo = {};

    function parse(startIndex) {
        if (startIndex >= n - 2) return { pers: [], score: 0 };
        if (memo[startIndex]) return memo[startIndex];

        let bestResult = { pers: [], score: 0 };

        // 1. Durum: Bu taşı atlayıp bir sonrakinden başla (arada bağlantısız taş varsa)
        let skipResult = parse(startIndex + 1);
        if (skipResult.score > bestResult.score) {
            bestResult = skipResult;
        }

        // 2. Durum: startIndex'ten başlayarak uzunluğu 3, 4, ... olan per dene
        for (let len = 3; len <= n - startIndex; len++) {
            let slice = tiles.slice(startIndex, startIndex + len);
            if (isValidSeries(slice, okeyDef) || isValidGroup(slice, okeyDef)) {
                let pScore = getPerScore(slice, okeyDef);
                let subResult = parse(startIndex + len);
                let totalScore = pScore + subResult.score;
                if (totalScore > bestResult.score) {
                    bestResult = {
                        pers: [
                            {
                                tiles: slice,
                                slotIndices: run.slice(startIndex, startIndex + len).map(x => x.slotIdx),
                                score: pScore
                            },
                            ...subResult.pers
                        ],
                        score: totalScore
                    };
                }
            }
        }

        memo[startIndex] = bestResult;
        return bestResult;
    }

    return parse(0).pers;
}

// Bitişik Bir Taş Kümesindeki Geçerli Çiftleri Bul
function findPairsInRun(run, okeyDef, gostergeTile, usedSlotIndices) {
    let pairs = [];
    for (let i = 0; i < run.length - 1; i++) {
        let item1 = run[i];
        let item2 = run[i + 1];
        if (usedSlotIndices.has(item1.slotIdx) || usedSlotIndices.has(item2.slotIdx)) continue;
        if (isValidPair(item1.tile, item2.tile, okeyDef, gostergeTile)) {
            pairs.push({
                tiles: [item1.tile, item2.tile],
                slotIndices: [item1.slotIdx, item2.slotIdx]
            });
            usedSlotIndices.add(item1.slotIdx);
            usedSlotIndices.add(item2.slotIdx);
            i++;
        }
    }
    return pairs;
}

// Tüm Istakadaki Geçerli Perleri ve Çiftleri Otomatik Tespit Et
function detectRackPers(data) {
    if (!data || !window.okey101RackSlots) {
        return { pers: [], pairs: [], totalScore: 0, perTileIds: new Set(), pairTileIds: new Set() };
    }

    let hand = data.hand || [];
    let currentHandMap = {};
    hand.forEach(t => currentHandMap[t.id] = t);

    let okeyDef = data.okeyDef;
    let gosterge = data.gosterge;

    let runs = [
        ...getContiguousRuns(0, 14, currentHandMap),
        ...getContiguousRuns(15, 29, currentHandMap)
    ];

    let detectedPers = [];
    let detectedPairs = [];
    let perTileIds = new Set();
    let pairTileIds = new Set();
    let totalScore = 0;

    // 1. Seri ve Grup Perlerini Tespit Et
    runs.forEach(run => {
        let pers = findPersInRun(run, okeyDef);
        pers.forEach(p => {
            detectedPers.push(p);
            totalScore += p.score;
            p.tiles.forEach(t => perTileIds.add(t.id));
        });
    });

    // 2. Çiftleri Tespit Et (Per içinde kullanılmamış taşlardan)
    let usedPairSlots = new Set();
    runs.forEach(run => {
        let unusedRun = run.filter(item => !perTileIds.has(item.tile.id));
        let pairs = findPairsInRun(unusedRun, okeyDef, gosterge, usedPairSlots);
        pairs.forEach(p => {
            detectedPairs.push(p);
            p.tiles.forEach(t => pairTileIds.add(t.id));
        });
    });

    // 3. Masaya Gösterilmiş Gösterge Varsa (Tek Başına 1 Çift Olarak Dahil Et)
    if (data.revealedGosterge && data.revealedGosterge[socket.id]) {
        let gId = data.revealedGosterge[socket.id];
        let gTile = currentHandMap[gId];
        if (gTile && !pairTileIds.has(gId)) {
            detectedPairs.push({
                type: 'pair',
                isGostergePair: true,
                tiles: [gTile]
            });
            pairTileIds.add(gId);
        }
    }

    return {
        pers: detectedPers,
        pairs: detectedPairs,
        totalScore: totalScore,
        perTileIds: perTileIds,
        pairTileIds: pairTileIds
    };
}
window.detectRackPers = detectRackPers;

// Oyuncunun Istakası (30 Yuvalı, 2 Raflı Gerçek Ahşap Oluk Sistemi & Otomatik Per Tanıma)
function renderPlayerHand(data) {
    const rack = document.getElementById('okey101PlayerHandRack');
    const tileCountEl = document.getElementById('okey101TileCount');
    if (!rack) return;

    let hand = data.hand || [];
    if (tileCountEl) tileCountEl.innerText = hand.length;

    let currentHandMap = {};
    hand.forEach(t => currentHandMap[t.id] = t);

    // 30 yuvalı ıstaka durumunu başlat (15 üst raf, 15 alt raf)
    if (!window.okey101RackSlots || window.okey101RackSlots.length !== 30) {
        window.okey101RackSlots = new Array(30).fill(null);
        hand.forEach((t, i) => {
            if (i < 30) window.okey101RackSlots[i] = t.id;
        });
    }

    // Masaya açılmış, işlenmiş veya atılmış taşları yuvalardan temizle
    for (let i = 0; i < 30; i++) {
        let tid = window.okey101RackSlots[i];
        if (tid && !currentHandMap[tid]) {
            window.okey101RackSlots[i] = null;
        }
    }

    // Henüz yuvaya yerleşmemiş yeni taşları yerleştir
    let unplacedTiles = hand.filter(t => !window.okey101RackSlots.includes(t.id));
    unplacedTiles.forEach(tile => {
        let targetSlot = -1;
        if (data.lastDrawnTileId && tile.id === data.lastDrawnTileId && window.okey101RackSlots[14] === null) {
            targetSlot = 14;
        } else {
            targetSlot = window.okey101RackSlots.indexOf(null);
        }
        if (targetSlot !== -1) {
            window.okey101RackSlots[targetSlot] = tile.id;
        }
    });

    // Otomatik Per ve Çift Tespiti (Kilitlenme yok, serbestçe bozulabilir)
    let detected = detectRackPers(data);
    window.okey101Detected = detected;

    // Yandan taş alındıysa uyarı banner'ını göster
    const warnEl = document.getElementById('okey101DiscardWarning');
    if (warnEl) {
        warnEl.style.display = (data.lastDiscardTaken && data.myTurn) ? 'flex' : 'none';
    }

    // Desteden taş çekildiyse bildirim bannerını göster
    const drawnNotifEl = document.getElementById('okey101DrawnNotification');
    const drawnTileNameEl = document.getElementById('okey101DrawnTileName');
    if (drawnNotifEl) {
        if (data.lastDrawnTile && data.lastDrawnTileId && data.myTurn && !data.lastDiscardTaken) {
            drawnNotifEl.style.display = 'flex';
            if (drawnTileNameEl) {
                drawnTileNameEl.innerText = getOkeyTileName(data.lastDrawnTile, data.okeyDef);
            }
        } else {
            drawnNotifEl.style.display = 'none';
        }
    }

    // 2 Rafı (Üst Raf: 0-14, Alt Raf: 15-29) Render Eden Fonksiyon
    function renderShelf(startIdx, endIdx) {
        let html = "";
        for (let idx = startIdx; idx <= endIdx; idx++) {
            let tileId = window.okey101RackSlots[idx];
            let tile = tileId ? currentHandMap[tileId] : null;

            if (!tile) {
                // BOŞ YUVA (Ahşap oluk çentiği)
                html += `
                    <div id="okeySlot_${idx}" 
                         class="okey-rack-slot empty"
                         ondragover="okey101SlotDragOver(event, ${idx})"
                         ondragleave="okey101SlotDragLeave(event, ${idx})"
                         ondrop="okey101SlotDrop(event, ${idx})"
                         onclick="okey101EmptySlotClick(${idx})"
                         title="Boş yuva (Seçili taşı buraya koymak için tıklayın veya sürükleyin)">
                    </div>
                `;
            } else {
                // DOLU YUVA (Taş içeren yuva)
                let isOkey = (data.okeyDef && !tile.isFakeOkey && tile.color === data.okeyDef.color && tile.value === data.okeyDef.value);
                let isRevealedGosterge = (data.revealedGosterge && data.revealedGosterge[socket.id] === tile.id);
                let isSelected = okey101SelectedIds.includes(tile.id);
                let isTaken = (data.takenDiscardTileId && tile.id === data.takenDiscardTileId);
                let isDrawn = (data.lastDrawnTileId && tile.id === data.lastDrawnTileId && !isTaken && data.myTurn);

                let isInPer = detected.perTileIds.has(tile.id);
                let isInPair = !isInPer && detected.pairTileIds.has(tile.id);
                let perCls = isInPer ? 'in-per' : (isInPair ? 'in-pair' : '');

                let colorCls = tile.isFakeOkey ? 'sahte' : tile.color;
                let okeyCls = isOkey ? 'gold-border' : (isRevealedGosterge ? 'gold-border' : '');
                let drawnCls = isDrawn ? 'drawn-tile' : '';
                let selectCls = isSelected ? 'selected' : '';
                let text = tile.isFakeOkey ? '⭐' : (isOkey ? `👑${tile.value}` : tile.value);
                let extraStyle = isTaken 
                    ? 'border: 2px solid #38bdf8; box-shadow: 0 0 12px rgba(56, 189, 248, 0.9); position: relative;' 
                    : (isRevealedGosterge ? 'border: 2px solid #facc15; box-shadow: 0 0 14px rgba(250,204,21,0.9); position: relative;' : 'position: relative;');

                let badgeHtml = "";
                if (isRevealedGosterge) {
                    badgeHtml += '<div style="position:absolute; top:-7px; left:-5px; background:linear-gradient(135deg,#f59e0b,#d97706); color:#fff; font-size:8px; font-weight:900; padding:1px 4px; border-radius:4px; box-shadow:0 1px 4px rgba(0,0,0,0.6); z-index:5;">⭐ GÖSTERGE</div>';
                }
                if (isTaken) {
                    badgeHtml += '<div style="position:absolute; top:-7px; right:-5px; background:#0284c7; color:white; font-size:8px; font-weight:800; padding:1px 4px; border-radius:4px; box-shadow:0 1px 4px rgba(0,0,0,0.5);">Yandan</div>';
                } else if (isDrawn) {
                    badgeHtml += '<div class="tile-badge-drawn">🀄 YENİ</div>';
                }

                let perStatus = isInPer ? ' [Geçerli Per ✓]' : (isInPair ? ' [Geçerli Çift 👥]' : '');
                let gostergeStatus = isRevealedGosterge ? ' [Gösterilmiş Gösterge ⭐ (Tek Başına Çift)]' : '';
                let tileTitle = (isTaken 
                    ? 'Yandan aldığınız taş (Açmak şarttır)' 
                    : (isDrawn ? 'Desteden yeni çektiğiniz taş!' : 'Istaka taşı')) + perStatus + gostergeStatus + ' - Çift tıklayarak diğer rafa hızlıca aktarabilir, sürükleyebilir veya tıklayarak seçebilirsiniz.';

                html += `
                    <div id="okeySlot_${idx}" 
                         class="okey-rack-slot occupied"
                         ondragover="okey101SlotDragOver(event, ${idx})"
                         ondragleave="okey101SlotDragLeave(event, ${idx})"
                         ondrop="okey101SlotDrop(event, ${idx})">
                        <div class="okey-tile ${colorCls} ${okeyCls} ${drawnCls} ${selectCls} ${perCls}" 
                             style="${extraStyle}"
                             draggable="true"
                             ondragstart="okey101DragStart(event, '${tile.id}', ${idx})"
                             ondragend="okey101DragEnd(event)"
                             onclick="okey101ToggleSelect('${tile.id}')"
                             ondblclick="okey101QuickMoveTile('${tile.id}', ${idx})"
                             oncontextmenu="event.preventDefault(); okey101QuickMoveTile('${tile.id}', ${idx});"
                             title="${tileTitle}">
                            ${badgeHtml}
                            <span>${text}</span>
                        </div>
                    </div>
                `;
            }
        }
        return html;
    }

    rack.innerHTML = `
        <div class="okey-rack-shelf top-shelf">
            ${renderShelf(0, 14)}
        </div>
        <div class="okey-rack-shelf-divider"></div>
        <div class="okey-rack-shelf bottom-shelf">
            ${renderShelf(15, 29)}
        </div>
    `;

    // Buton etiketlerini ve durumlarını duruma göre dinamik ayarla
    let myInfo = data.playerInfos && data.playerInfos[socket.id];
    let isAlreadyOpened = myInfo && myInfo.hasOpened;
    let openedType = myInfo?.openedType;

    const openHandBtn = document.getElementById('okey101OpenHandBtn');
    const openPairsBtn = document.getElementById('okey101OpenPairsBtn');

    if (openHandBtn) {
        if (!isAlreadyOpened) {
            openHandBtn.style.display = 'inline-block';
            openHandBtn.innerText = "✨ El Aç (101)";
        } else if (openedType === 'seri') {
            openHandBtn.style.display = 'inline-block';
            openHandBtn.innerText = "✨ Per İndir";
        } else {
            // Çift açmış oyuncu yeni seri per indiremez
            openHandBtn.style.display = 'none';
        }
    }

    if (openPairsBtn) {
        let hasAnyCiftOnTable = Object.values(data.playerInfos || {}).some(p => p.openedType === 'cift');
        if (!isAlreadyOpened) {
            openPairsBtn.style.display = 'inline-block';
            openPairsBtn.innerText = "👥 5 Çift Aç";
        } else if (openedType === 'cift') {
            openPairsBtn.style.display = 'inline-block';
            openPairsBtn.innerText = "👥 Çift İndir";
        } else if (openedType === 'seri' && hasAnyCiftOnTable) {
            openPairsBtn.style.display = 'inline-block';
            openPairsBtn.innerText = "👥 Çift İşle";
        } else {
            openPairsBtn.style.display = 'none';
        }
    }

    updateSelectedScore();
}

// Taş Seçme / Kaldırma
function okey101ToggleSelect(tileId) {
    if (okey101SelectedIds.includes(tileId)) {
        okey101SelectedIds = okey101SelectedIds.filter(id => id !== tileId);
    } else {
        okey101SelectedIds.push(tileId);
    }
    if (okey101Data) renderPlayerHand(okey101Data);
}

// Seçilen Taşların ve Istakadaki Perlerin Puanını Canlı Göster
function updateSelectedScore() {
    const scoreDisp = document.getElementById('okey101SelectedScoreDisplay');
    if (!scoreDisp || !okey101Data) return;

    let hand = okey101Data.hand || [];
    let detected = window.okey101Detected || detectRackPers(okey101Data);
    let myInfo = okey101Data.playerInfos && okey101Data.playerInfos[socket.id];
    let isAlreadyOpened = myInfo && myInfo.hasOpened;
    let openedType = myInfo?.openedType;

    const openHandBtn = document.getElementById('okey101OpenHandBtn');
    const openPairsBtn = document.getElementById('okey101OpenPairsBtn');

    // 1. Durum: Kullanıcı elle taş seçmişse (okey101SelectedIds > 0)
    if (okey101SelectedIds.length > 0) {
        let selectedTiles = hand.filter(t => okey101SelectedIds.includes(t.id));
        let sum = 0;
        selectedTiles.forEach(t => {
            let val = t.isFakeOkey ? (okey101Data.okeyDef ? okey101Data.okeyDef.value : 10) : t.value;
            sum += val;
        });

        if (isAlreadyOpened) {
            scoreDisp.className = "score-pill-valid";
            scoreDisp.innerHTML = `👉 Seçilen: <b>${sum} Puan</b> (${selectedTiles.length} Taş) | 🀄 Istaka: <b>${detected.totalScore} P</b>`;
        } else if (sum >= 180) {
            scoreDisp.className = "score-pill-valid";
            scoreDisp.innerHTML = `👑 Seçilen: <b>${sum} Puan</b> (180+ Sağlandı! 2 Siler! ⭐⭐)`;
        } else if (sum >= 150) {
            scoreDisp.className = "score-pill-valid";
            scoreDisp.innerHTML = `🌟 Seçilen: <b>${sum} Puan</b> (150+ Sağlandı! 1 Siler! ⭐)`;
        } else if (sum >= 101) {
            scoreDisp.className = "score-pill-valid";
            scoreDisp.innerHTML = `✨ Seçilen: <b>${sum} Puan</b> (101 Sağlandı! Açılabilir)`;
        } else {
            scoreDisp.className = "score-pill-normal";
            scoreDisp.innerHTML = `👉 Seçilen: <b>${sum} / 101 Puan</b> (${selectedTiles.length} Taş) | 🀄 Istaka: <b>${detected.totalScore} P</b>`;
        }
    } else {
        // 2. Durum: Kullanıcı elle taş seçmemişse OTOMATİK ISTAKA PER PUANINI GÖSTER
        let sum = detected.totalScore;
        let perCount = detected.pers.length;
        let pairCount = detected.pairs.length;

        if (isAlreadyOpened) {
            if (openedType === 'cift') {
                scoreDisp.className = pairCount > 0 ? "score-pill-valid" : "score-pill-normal";
                scoreDisp.innerHTML = `👥 Istaka Çiftleri: <b>${pairCount} Çift</b> ${pairCount > 0 ? "(Tek tıkla masaya indirebilirsiniz)" : ""}`;
            } else {
                scoreDisp.className = sum > 0 ? "score-pill-valid" : "score-pill-normal";
                scoreDisp.innerHTML = `🀄 Istaka Perleri: <b>${sum} Puan</b> (${perCount} Per) ${sum > 0 ? "(Tek tıkla masaya indirebilirsiniz)" : ""}`;
            }
        } else if (sum >= 180) {
            scoreDisp.className = "score-pill-valid";
            scoreDisp.innerHTML = `👑 Istaka Perleri: <b>${sum} Puan</b> (${perCount} Per - 180+ Sağlandı! 2 Siler! ⭐⭐ Tek tıkla aç!)`;
        } else if (sum >= 150) {
            scoreDisp.className = "score-pill-valid";
            scoreDisp.innerHTML = `🌟 Istaka Perleri: <b>${sum} Puan</b> (${perCount} Per - 150+ Sağlandı! 1 Siler! ⭐ Tek tıkla aç!)`;
        } else if (sum >= 101) {
            scoreDisp.className = "score-pill-valid";
            scoreDisp.innerHTML = `✨ Istaka Perleri: <b>${sum} Puan</b> (${perCount} Per - 101 Sağlandı! 🟢 Tek tıkla el aç!)`;
        } else if (pairCount >= 5) {
            scoreDisp.className = "score-pill-valid";
            scoreDisp.innerHTML = `👥 Istaka Çiftleri: <b>${pairCount} Çift</b> (5 Çift Sağlandı! 🟢 Tek tıkla el aç!)`;
        } else if (sum > 0) {
            scoreDisp.className = "score-pill-normal";
            scoreDisp.innerHTML = `🀄 Istaka Perleri: <b>${sum} / 101 Puan</b> (${101 - sum} puan eksik • ${perCount} Per)`;
        } else if (pairCount > 0) {
            scoreDisp.className = "score-pill-normal";
            scoreDisp.innerHTML = `👥 Istaka Çiftleri: <b>${pairCount} / 5 Çift</b> (${5 - pairCount} çift eksik)`;
        } else {
            scoreDisp.className = "score-pill-normal";
            scoreDisp.innerHTML = `🀄 Istaka: <b>0 Puan</b> (Per yapmak için sayıları yan yana dizin)`;
        }
    }

    // El Açma butonuna hazır olduğunu belirten parlama efekti ekle/kaldır
    if (openHandBtn) {
        let isReadyToOpen = (!isAlreadyOpened && detected.totalScore >= 101 && okey101Data.myTurn) || 
                            (isAlreadyOpened && openedType === 'seri' && detected.pers.length > 0 && okey101Data.myTurn);
        if (isReadyToOpen && okey101SelectedIds.length === 0) {
            openHandBtn.classList.add('btn-ready-to-open');
            openHandBtn.title = "Istakanızdaki tüm geçerli perleri tek tıkla masaya açar!";
        } else {
            openHandBtn.classList.remove('btn-ready-to-open');
            openHandBtn.title = "";
        }
    }

    if (openPairsBtn) {
        let isReadyPairs = (!isAlreadyOpened && detected.pairs.length >= 5 && okey101Data.myTurn) ||
                           (isAlreadyOpened && detected.pairs.length > 0 && okey101Data.myTurn);
        if (isReadyPairs && okey101SelectedIds.length === 0) {
            openPairsBtn.classList.add('btn-ready-to-open');
            openPairsBtn.title = "Istakanızdaki tüm çiftleri tek tıkla masaya açar!";
        } else {
            openPairsBtn.classList.remove('btn-ready-to-open');
            openPairsBtn.title = "";
        }
    }
}

// Aksiyonlar
function okey101DrawFromDeck() {
    if (!okey101Data || !okey101Data.myTurn) return;
    if (window.playSound) window.playSound('okeyTile');
    socket.emit('okey101DrawTile');
}

function okey101TakeDiscard() {
    if (!okey101Data || !okey101Data.myTurn) return;
    if (window.playSound) window.playSound('okeyTile');
    socket.emit('okey101TakeDiscard');
}

function okey101ReturnDiscard() {
    if (!okey101Data || !okey101Data.myTurn) return;
    if (window.playSound) window.playSound('okeyTile');
    socket.emit('okey101ReturnDiscard');
}
window.okey101ReturnDiscard = okey101ReturnDiscard;

function okey101SubmitDiscard() {
    if (!okey101Data || !okey101Data.myTurn) return;

    // Yandan taş alındıysa el açılmadan taş atılamaz
    if (okey101Data.lastDiscardTaken) {
        let hasOpened = okey101Data.playerInfos && okey101Data.playerInfos[socket.id]?.hasOpened;
        if (!hasOpened) {
            alert("⚠️ Yandan taş aldığınızda elinizi açmak (en az 101 puan veya 5 çift) ve bu taşı perlerinizde kullanmak zorundasınız!\n\nEl açmadan taş atamazsınız. Eğer elinizi açamıyorsanız 'Taşı Geri Bırak' butonuna basarak desteden çekebilirsiniz.");
            return;
        }
    }

    if (okey101SelectedIds.length !== 1) {
        alert("Lütfen atmak için tam olarak 1 taş seçin!");
        return;
    }
    let tileId = okey101SelectedIds[0];
    okey101SelectedIds = [];
    if (window.playSound) window.playSound('okeyTile');
    socket.emit('okey101DiscardTile', tileId);
}

// ✨ El Aç (101 Puan veya Per İndirme) - Tek Tıkla Otomatik Açma Desteği
function okey101SubmitOpenHand() {
    if (!okey101Data || !okey101Data.myTurn) return;

    let myInfo = okey101Data.playerInfos && okey101Data.playerInfos[socket.id];
    let isAlreadyOpened = myInfo && myInfo.hasOpened;
    let detected = window.okey101Detected || detectRackPers(okey101Data);

    let persToOpen = [];

    // Durum 1: Kullanıcı manuel olarak taş seçtiyse
    if (okey101SelectedIds.length >= 3) {
        persToOpen = [{
            tileIds: [...okey101SelectedIds]
        }];
    } 
    // Durum 2: Kullanıcı tek tek seçmedi, ıstakada tespit edilen perleri tek tıkla aç!
    else {
        if (!detected.pers || detected.pers.length === 0) {
            alert("Istakanızda geçerli bir per bulunamadı!\n\nPer oluşturmak için sayıları ıstakada yan yana dizin (örnek: 4-5-6 veya 7-7-7) veya açmak istediğiniz taşlara tıklayarak seçin.");
            return;
        }

        if (!isAlreadyOpened && detected.totalScore < 101) {
            alert(`Istakanızdaki perlerin toplamı ${detected.totalScore} puan.\n\nİlk el açılışı için en az 101 puan gereklidir! (${101 - detected.totalScore} puan daha gerekli)`);
            return;
        }

        // Yandan taş alındıysa perlerde yer alması zorunludur
        if (okey101Data.lastDiscardTaken && okey101Data.takenDiscardTileId) {
            let hasTakenTile = detected.pers.some(p => p.tiles.some(t => t.id === okey101Data.takenDiscardTileId));
            if (!hasTakenTile) {
                alert("⚠️ Yandan aldığınız taşı açacağınız perlerin içine dahil etmek zorundasınız!\n\nLütfen yandan aldığınız taşı ıstakanızdaki perlerden birine bitişik yerleştirin.");
                return;
            }
        }

        persToOpen = detected.pers.map(p => ({
            tileIds: p.tiles.map(t => t.id)
        }));
    }

    let payload = {
        pers: persToOpen
    };

    okey101SelectedIds = [];
    if (window.playSound) window.playSound('okeyTile');
    socket.emit('okey101OpenHand', payload);
}

// 👥 5 Çift Aç / Çift İndir - Tek Tıkla Otomatik Açma Desteği
function okey101SubmitOpenPairs() {
    if (!okey101Data || !okey101Data.myTurn) return;
    let myInfo = okey101Data.playerInfos && okey101Data.playerInfos[socket.id];
    let isAlreadyOpened = myInfo && myInfo.hasOpened;
    let detected = window.okey101Detected || detectRackPers(okey101Data);

    let pairs = [];

    // Durum 1: Elle seçim yapıldıysa
    if (okey101SelectedIds.length >= 2) {
        let minTiles = isAlreadyOpened ? 2 : 10;
        if (okey101SelectedIds.length < minTiles || okey101SelectedIds.length % 2 !== 0) {
            if (!isAlreadyOpened) {
                alert("İlk çift açılışı için en az 5 çift (10 taş) seçmelisiniz!");
            } else {
                alert("Masaya çift indirmek için çiftler halinde (en az 2 taş) seçmelisiniz!");
            }
            return;
        }
        for (let i = 0; i < okey101SelectedIds.length; i += 2) {
            pairs.push([okey101SelectedIds[i], okey101SelectedIds[i+1]]);
        }
    }
    // Durum 2: Otomatik ıstaka çiftleri tek tıkla aç
    else {
        if (!detected.pairs || detected.pairs.length === 0) {
            alert("Istakanızda çift bulunamadı!\n\nÇift oluşturmak için aynı renk ve sayıdaki taşları yan yana koyun.");
            return;
        }

        if (!isAlreadyOpened && detected.pairs.length < 5) {
            alert(`Istakanızda ${detected.pairs.length} çift bulundu.\n\nİlk çift açılışı için en az 5 çift gereklidir! (${5 - detected.pairs.length} çift daha gerekli)`);
            return;
        }

        if (okey101Data.lastDiscardTaken && okey101Data.takenDiscardTileId) {
            let hasTakenTile = detected.pairs.some(p => p.tiles.some(t => t.id === okey101Data.takenDiscardTileId));
            if (!hasTakenTile) {
                alert("⚠️ Yandan aldığınız taşı açacağınız çiftlerin içine dahil etmek zorundasınız!");
                return;
            }
        }

        pairs = detected.pairs.map(p => [p.tiles[0].id, p.tiles[1].id]);
    }

    okey101SelectedIds = [];
    if (window.playSound) window.playSound('okeyTile');
    socket.emit('okey101OpenHand', { type: 'cift', pairs: pairs });
}

function okey101AddSelectedToPer(perIndex, position) {
    if (!okey101Data || !okey101Data.myTurn) return;
    if (okey101SelectedIds.length === 0) {
        alert("Masaya işlemek için elinizden en az 1 taş seçin!");
        return;
    }
    let tileIds = [...okey101SelectedIds];
    okey101SelectedIds = [];
    if (window.playSound) window.playSound('okeyTile');
    socket.emit('okey101AddTileToPer', { tileIds: tileIds, tileId: tileIds[0], targetPerIndex: perIndex, position: position });
}

// Otomatik Seri Dizme (Gruplar Arasında 1 Yuva Boşluk Bırakarak Dizer)
function okey101SortSeries() {
    if (!okey101Data || !okey101Data.hand) return;
    let hand = [...okey101Data.hand];
    const colorOrder = { 'kirmizi': 1, 'siyah': 2, 'mavi': 3, 'sari': 4, 'sahte': 5 };
    
    // Taşları renk ve sayıya göre sırala
    hand.sort((a, b) => {
        let ca = colorOrder[a.color] || 9;
        let cb = colorOrder[b.color] || 9;
        if (ca !== cb) return ca - cb;
        return a.value - b.value;
    });

    // Peş peşe gelen serileri ve renk gruplarını kümele
    let groups = [];
    let cur = [];
    for (let i = 0; i < hand.length; i++) {
        let t = hand[i];
        if (cur.length === 0) {
            cur.push(t);
        } else {
            let last = cur[cur.length - 1];
            if (t.color === last.color && (t.value === last.value + 1 || t.value === last.value)) {
                cur.push(t);
            } else {
                groups.push(cur);
                cur = [t];
            }
        }
    }
    if (cur.length > 0) groups.push(cur);

    let newSlots = new Array(30).fill(null);
    let slotIdx = 0;

    groups.forEach((group) => {
        // Eğer bu grup üst rafa (ilk 15 yuvaya) sığmıyorsa alt rafa (15. yuvaya) geç
        if (slotIdx < 15 && (slotIdx + group.length) > 15) {
            slotIdx = 15;
        }
        group.forEach(tile => {
            if (slotIdx < 30) {
                newSlots[slotIdx] = tile.id;
                slotIdx++;
            }
        });
        // Gruplar arasına 1 boşluk koy (raf taşmadığı sürece)
        if (slotIdx < 14 || (slotIdx >= 15 && slotIdx < 29)) {
            slotIdx++;
        }
    });

    window.okey101RackSlots = newSlots;
    if (window.playSound) window.playSound('okeyTile');
    renderPlayerHand(okey101Data);
}

// Otomatik Çift Dizme (Çiftler Arasında 1 Yuva Boşluk Bırakarak Dizer)
function okey101SortPairs() {
    if (!okey101Data || !okey101Data.hand) return;
    let hand = [...okey101Data.hand];
    hand.sort((a, b) => {
        if (a.value !== b.value) return a.value - b.value;
        return a.color.localeCompare(b.color);
    });

    let pairs = [];
    let singles = [];
    let used = new Set();

    for (let i = 0; i < hand.length; i++) {
        if (used.has(hand[i].id)) continue;
        let matchIdx = -1;
        for (let j = i + 1; j < hand.length; j++) {
            if (!used.has(hand[j].id) && hand[i].color === hand[j].color && hand[i].value === hand[j].value) {
                matchIdx = j;
                break;
            }
        }
        if (matchIdx !== -1) {
            pairs.push([hand[i], hand[matchIdx]]);
            used.add(hand[i].id);
            used.add(hand[matchIdx].id);
        } else {
            singles.push(hand[i]);
            used.add(hand[i].id);
        }
    }

    let newSlots = new Array(30).fill(null);
    let slotIdx = 0;

    pairs.forEach(pair => {
        if (slotIdx < 15 && (slotIdx + 2) > 15) {
            slotIdx = 15;
        }
        if (slotIdx + 1 < 30) {
            newSlots[slotIdx] = pair[0].id;
            newSlots[slotIdx + 1] = pair[1].id;
            slotIdx += 2;
            if (slotIdx < 14 || (slotIdx >= 15 && slotIdx < 29)) {
                slotIdx++; // 1 boşluk bırak
            }
        }
    });

    singles.forEach(tile => {
        if (slotIdx >= 30) {
            let firstEmpty = newSlots.indexOf(null);
            if (firstEmpty !== -1) newSlots[firstEmpty] = tile.id;
        } else {
            newSlots[slotIdx] = tile.id;
            slotIdx++;
        }
    });

    window.okey101RackSlots = newSlots;
    if (window.playSound) window.playSound('okeyTile');
    renderPlayerHand(okey101Data);
}

// ==========================================================
// 📋 A4 KIRAATHANE YAZBOZU (ÇETELİSİ) FONKSİYONLARI
// ==========================================================
function renderYazboz(data) {
    if (!data) return;
    const y = data.yazboz;
    if (!y) return;

    // Mod ve El Bilgisi
    const modeBadge = document.getElementById('yazbozModeBadge');
    if (modeBadge) {
        modeBadge.innerText = (data.mode === 'esli') ? "Eşli (2v2) Katlamasız & Cezalı" : "Tekli (Bireysel)";
        modeBadge.style.color = (data.mode === 'esli') ? "#1d4ed8" : "#0f766e";
    }

    const roundText = document.getElementById('yazbozRoundText');
    if (roundText) roundText.innerText = `${data.roundNumber || 1}. El`;

    // Takım İsimleri ve Oyuncuları
    let t1Players = [data.players[0], data.players[2]];
    let t2Players = [data.players[1], data.players[3]];

    let t1Names = t1Players.map(pid => data.playerInfos[pid] ? data.playerInfos[pid].name : "Oyuncu").join(' & ');
    let t2Names = t2Players.map(pid => data.playerInfos[pid] ? data.playerInfos[pid].name : "Oyuncu").join(' & ');

    const t1Title = document.getElementById('yazbozTeam1Players');
    const t2Title = document.getElementById('yazbozTeam2Players');
    if (t1Title) t1Title.innerText = t1Names;
    if (t2Title) t2Title.innerText = t2Names;

    // Üst Bölüm (El Cezaları)
    const topT1El = document.getElementById('yazbozTopTeam1');
    const topT2El = document.getElementById('yazbozTopTeam2');
    const topSumT1El = document.getElementById('yazbozTopSumTeam1');
    const topSumT2El = document.getElementById('yazbozTopSumTeam2');

    let t1Top = (y.team1 && y.team1.topRounds) ? y.team1.topRounds : [];
    let t2Top = (y.team2 && y.team2.topRounds) ? y.team2.topRounds : [];

    let t1TopSum = t1Top.reduce((sum, r) => sum + r.score, 0);
    let t2TopSum = t2Top.reduce((sum, r) => sum + r.score, 0);

    if (topT1El) {
        topT1El.innerHTML = t1Top.length > 0 
            ? t1Top.map(r => {
                let cls = r.score < 0 ? "yazboz-row-siler" : "yazboz-row-penalty";
                return `<div class="yazboz-row-item"><span style="color:#475569;">${r.text.split(':')[0]}:</span> <b class="${cls}">${r.text.split(':')[1] || r.score}</b></div>`;
            }).join('')
            : `<div style="color:#a8a29e; font-style:italic;">Henüz el bitmedi...</div>`;
    }
    if (topT2El) {
        topT2El.innerHTML = t2Top.length > 0
            ? t2Top.map(r => {
                let cls = r.score < 0 ? "yazboz-row-siler" : "yazboz-row-penalty";
                return `<div class="yazboz-row-item"><span style="color:#475569;">${r.text.split(':')[0]}:</span> <b class="${cls}">${r.text.split(':')[1] || r.score}</b></div>`;
            }).join('')
            : `<div style="color:#a8a29e; font-style:italic;">Henüz el bitmedi...</div>`;
    }
    if (topSumT1El) topSumT1El.innerText = `${t1TopSum} Puan`;
    if (topSumT2El) topSumT2El.innerText = `${t2TopSum} Puan`;

    // Alt Bölüm (Cezalar ve Silerler)
    const botT1El = document.getElementById('yazbozBottomTeam1');
    const botT2El = document.getElementById('yazbozBottomTeam2');
    const botSumT1El = document.getElementById('yazbozBottomSumTeam1');
    const botSumT2El = document.getElementById('yazbozBottomSumTeam2');

    let t1Pens = (y.team1 && y.team1.bottomPenalties) ? y.team1.bottomPenalties : [];
    let t1Sils = (y.team1 && y.team1.bottomSilers) ? y.team1.bottomSilers : [];
    let t2Pens = (y.team2 && y.team2.bottomPenalties) ? y.team2.bottomPenalties : [];
    let t2Sils = (y.team2 && y.team2.bottomSilers) ? y.team2.bottomSilers : [];

    let t1PenSum = t1Pens.reduce((sum, p) => sum + p.score, 0);
    let t1SilSum = t1Sils.reduce((sum, s) => sum + Math.abs(s.score), 0);
    let t2PenSum = t2Pens.reduce((sum, p) => sum + p.score, 0);
    let t2SilSum = t2Sils.reduce((sum, s) => sum + Math.abs(s.score), 0);

    let t1BotNet = t1PenSum - t1SilSum;
    let t2BotNet = t2PenSum - t2SilSum;

    if (botT1El) {
        let itemsHtml = [];
        t1Pens.forEach(p => itemsHtml.push(`<div class="yazboz-row-item"><span style="color:#64748b;">${p.round}. El:</span> <b class="yazboz-row-penalty">${p.text}</b></div>`));
        t1Sils.forEach(s => itemsHtml.push(`<div class="yazboz-row-item"><span style="color:#64748b;">${s.round}. El:</span> <b class="yazboz-row-siler">${s.text}</b></div>`));
        botT1El.innerHTML = itemsHtml.length > 0 ? itemsHtml.join('') : `<div style="color:#a8a29e; font-style:italic;">Ceza veya siler yok.</div>`;
    }
    if (botT2El) {
        let itemsHtml = [];
        t2Pens.forEach(p => itemsHtml.push(`<div class="yazboz-row-item"><span style="color:#64748b;">${p.round}. El:</span> <b class="yazboz-row-penalty">${p.text}</b></div>`));
        t2Sils.forEach(s => itemsHtml.push(`<div class="yazboz-row-item"><span style="color:#64748b;">${s.round}. El:</span> <b class="yazboz-row-siler">${s.text}</b></div>`));
        botT2El.innerHTML = itemsHtml.length > 0 ? itemsHtml.join('') : `<div style="color:#a8a29e; font-style:italic;">Ceza veya siler yok.</div>`;
    }

    if (botSumT1El) botSumT1El.innerText = `${t1PenSum > 0 ? '+' + t1PenSum : '0'} / ${t1SilSum > 0 ? '-' + t1SilSum : '0'} = ${t1BotNet}`;
    if (botSumT2El) botSumT2El.innerText = `${t2PenSum > 0 ? '+' + t2PenSum : '0'} / ${t2SilSum > 0 ? '-' + t2SilSum : '0'} = ${t2BotNet}`;

    // Genel Toplam Ceza (En az olan kazanır)
    const totalT1El = document.getElementById('yazbozTotalScoreTeam1');
    const totalT2El = document.getElementById('yazbozTotalScoreTeam2');

    let totalT1 = (y.team1 && y.team1.totalScore !== undefined) ? y.team1.totalScore : (t1TopSum + t1BotNet);
    let totalT2 = (y.team2 && y.team2.totalScore !== undefined) ? y.team2.totalScore : (t2TopSum + t2BotNet);

    if (totalT1El) {
        let leader1 = totalT1 < totalT2 ? " 🏆 (Önde)" : "";
        totalT1El.innerHTML = `${totalT1} Puan${leader1 ? `<span style="font-size:12px; color:#22c55e;">${leader1}</span>` : ''}`;
    }
    if (totalT2El) {
        let leader2 = totalT2 < totalT1 ? " 🏆 (Önde)" : "";
        totalT2El.innerHTML = `${totalT2} Puan${leader2 ? `<span style="font-size:12px; color:#22c55e;">${leader2}</span>` : ''}`;
    }

    // Oyun Bittiğinde Sonraki El Butonu ve Otomatik Açılma
    const nextBtn = document.getElementById('yazbozNextRoundBtn');
    if (nextBtn) {
        nextBtn.style.display = data.gameOver ? 'inline-block' : 'none';
    }

    const modal = document.getElementById('okey101YazbozModal');
    if (data.gameOver && modal && modal.style.display !== 'flex') {
        openYazbozModal();
    }
}

function toggleYazbozModal() {
    const modal = document.getElementById('okey101YazbozModal');
    if (!modal) return;
    if (modal.style.display === 'flex') {
        modal.style.display = 'none';
    } else {
        openYazbozModal();
    }
}

function openYazbozModal() {
    const modal = document.getElementById('okey101YazbozModal');
    if (modal) modal.style.display = 'flex';
    if (okey101Data) renderYazboz(okey101Data);
}

function closeYazbozModal() {
    const modal = document.getElementById('okey101YazbozModal');
    if (modal) modal.style.display = 'none';
}

function okey101NextRound() {
    if (window.playSound) window.playSound('okeyTile');
    socket.emit('okey101NextRound');
    closeYazbozModal();
    closeVictoryOverlay();
}

// 🀄 TAŞA ÇİFT TIKLAMA / SAĞ TIKLAMA İLE HIZLI TAŞIMA (Üst <-> Alt Raf)
function okey101QuickMoveTile(tileId, currentSlotIdx) {
    if (!window.okey101RackSlots) return;
    let targetSlot = -1;
    if (currentSlotIdx < 15) {
        // Üst raftaysa -> Alt raftaki (15-29) ilk boş yuvaya aktar
        for (let i = 15; i < 30; i++) {
            if (window.okey101RackSlots[i] === null) { targetSlot = i; break; }
        }
    } else {
        // Alt raftaysa -> Üst raftaki (0-14) ilk boş yuvaya aktar
        for (let i = 0; i < 15; i++) {
            if (window.okey101RackSlots[i] === null) { targetSlot = i; break; }
        }
    }
    // Karşı rafta boşluk yoksa genel ilk boşluğu bul
    if (targetSlot === -1) {
        targetSlot = window.okey101RackSlots.indexOf(null);
    }
    if (targetSlot !== -1 && targetSlot !== currentSlotIdx) {
        window.okey101RackSlots[currentSlotIdx] = null;
        window.okey101RackSlots[targetSlot] = tileId;
        if (window.playSound) window.playSound('okeyTile');
        if (okey101Data) renderPlayerHand(okey101Data);
    }
}
window.okey101QuickMoveTile = okey101QuickMoveTile;

// 🤖 BOŞALAN / AYRILAN KOLTUĞA YAPAY ZEKA BOTU ATAMA
function okey101AssignBot(pid) {
    socket.emit('assignBotToVacantSeat', { targetPlayerId: pid });
}
window.okey101AssignBot = okey101AssignBot;

// 📢 GÖSTERGEYİ MASAYA GÖSTERME (Çifte giderken tek taşla çift sayılabilmesi için)
function okey101RevealGosterge() {
    if (!okey101Data) return;
    socket.emit('okey101RevealGosterge');
}
window.okey101RevealGosterge = okey101RevealGosterge;

// Gösterge Masaya Gösterildiğinde Ortak Bildirim
socket.on('okey101GostergeRevealed', (payload) => {
    let banner = document.getElementById('gostergeRevealBanner');
    if (banner) {
        banner.innerHTML = `📢 <b>${payload.playerName}</b> elindeki Göstergeyi (<b style="color:#fde047;">${payload.tile.color.toUpperCase()} ${payload.tile.value}</b>) masaya gösterdi! <span style="font-size:12px; opacity:0.9;">(Çifte giderken tek taşla çift sayılacak)</span>`;
        banner.classList.add('show');
        if (window.playSound) window.playSound('coin');
        setTimeout(() => {
            banner.classList.remove('show');
        }, 5500);
    }
});

// 🏆 ZAFER KUTLAMASI & KONFETİ ŞÖLENİ
function triggerVictoryCelebration(winnerName, data) {
    let overlay = document.getElementById('victoryOverlay');
    let canvas = document.getElementById('victoryConfettiCanvas');
    if (window.playSound) window.playSound('fanfare');

    // 1. Konfeti Parçacık Yağmuru
    if (canvas) {
        canvas.style.display = 'block';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        let ctx = canvas.getContext('2d');
        let particles = [];
        let colors = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#f43f5e', '#facc15'];
        for (let i = 0; i < 150; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * -canvas.height,
                r: Math.random() * 6 + 4,
                d: Math.random() * 10 + 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                tilt: Math.floor(Math.random() * 10) - 10,
                tiltAngleIncremental: (Math.random() * 0.07) + 0.05,
                tiltAngle: 0
            });
        }

        let animationFrameId;
        let startTime = Date.now();
        function drawConfetti() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particles.length; i++) {
                let p = particles[i];
                p.tiltAngle += p.tiltAngleIncremental;
                p.y += (Math.cos(p.d) + 3 + p.r / 2) / 1.5;
                p.x += Math.sin(p.d);
                p.tilt = Math.sin(p.tiltAngle) * 15;

                ctx.beginPath();
                ctx.lineWidth = p.r;
                ctx.strokeStyle = p.color;
                ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
                ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
                ctx.stroke();

                if (p.y > canvas.height) {
                    p.x = Math.random() * canvas.width;
                    p.y = -20;
                }
            }
            if (Date.now() - startTime < 5000) {
                animationFrameId = requestAnimationFrame(drawConfetti);
            } else {
                cancelAnimationFrame(animationFrameId);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                canvas.style.display = 'none';
            }
        }
        drawConfetti();
    }

    // 2. Zafer Tebrik Ekranı
    if (overlay) {
        let winInfoText = "✨ Eli Başarıyla Bitirdi! (-101 Puan)";
        let winnerPid = data.winner;
        let pInfo = data.playerInfos ? data.playerInfos[winnerPid] : null;
        let isCift = pInfo && pInfo.openedType === 'cift';
        if (isCift) winInfoText = "👥 5 Çift Açarak Bitirdi! (-202 Puan)";

        overlay.innerHTML = `
            <div class="victory-card">
                <div style="font-size: 52px; margin-bottom: 8px;">🏆</div>
                <h2 style="font-size: 24px; font-weight: 900; color: #facc15; margin: 0 0 8px 0; text-shadow: 0 0 15px rgba(250,204,21,0.6);">
                    TEBRİKLER ${winnerName.toUpperCase()}!
                </h2>
                <div style="font-size: 14px; font-weight: 800; color: #38bdf8; margin-bottom: 22px;">
                    ${winInfoText}
                </div>
                <div style="display: flex; justify-content: center; gap: 10px;">
                    <button onclick="closeVictoryAndOpenYazboz()" style="padding: 10px 22px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; border-radius: 9px; font-size: 13.5px; font-weight: 900; cursor: pointer; box-shadow: 0 4px 15px rgba(245,158,11,0.5);">
                        📋 Yazbozu İncele
                    </button>
                    <button onclick="closeVictoryOverlay()" style="padding: 10px 18px; background: #334155; color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 9px; font-size: 13px; font-weight: bold; cursor: pointer;">
                        Kapat
                    </button>
                </div>
            </div>
        `;
        overlay.style.display = 'flex';
    }
}
window.triggerVictoryCelebration = triggerVictoryCelebration;

function closeVictoryOverlay() {
    let overlay = document.getElementById('victoryOverlay');
    if (overlay) overlay.style.display = 'none';
    let canvas = document.getElementById('victoryConfettiCanvas');
    if (canvas) canvas.style.display = 'none';
}
window.closeVictoryOverlay = closeVictoryOverlay;

function closeVictoryAndOpenYazboz() {
    closeVictoryOverlay();
    openYazbozModal();
}
window.closeVictoryAndOpenYazboz = closeVictoryAndOpenYazboz;
