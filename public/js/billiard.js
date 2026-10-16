// public/js/billiard.js (ARAYÜZ VE ETKİLEŞİM SİSTEMİ)

const billTable = document.getElementById('billiardTable');
let cueCanvas = null;
let cueCtx = null;
let isDraggingCue = false;
let cueStartX = 0, cueStartY = 0, cueCurrX = 0, cueCurrY = 0;
let isMyTurnBilliard = false;
let isBallInHand = false;
let billiardWhitePos = { x: 150, y: 150 };

let lastBilliardTurnIndex = -1;
let lastBilliardBalls = {};

// Masadaki herhangi bir topun hareket edip etmediğini kontrol eden yardımcı fonksiyon
function areBilliardBallsMoving(balls = lastBilliardBalls) {
    if (!balls) return false;
    for (let key in balls) {
        let b = balls[key];
        if (b && b.active && b.x !== -100) {
            if (Math.abs(b.vx || 0) > 0.03 || Math.abs(b.vy || 0) > 0.03) return true;
        }
    }
    return false;
}

socket.on('billiardUpdate', (state) => {
    window.currentActiveTableId = state.tableId;
    if (window.setVoiceTable && state.tableId) window.setVoiceTable(state.tableId);
    window.isSpectating = !!state.isSpectator;

    // Gerçekçi ses efektleri tetikleme (Topların çarpışması ve cebe düşüş)
    if (state.events && window.playSound) {
        state.events.forEach(ev => {
            if (ev === 'hit') window.playSound('billiardHit');
            if (ev === 'pocket') window.playSound('pocket');
        });
    }

    // Toplar hareket halindeyse veya atış henüz sonuçlanmadıysa sıra kullanıcıda dahi olsa kilitli kalır
    let isMoving = !!state.isMoving || !!state.shotActive || areBilliardBallsMoving(state.balls);
    isMyTurnBilliard = !state.isSpectator && !isMoving && (state.players[state.turnIndex] === socket.id);
    isBallInHand = !state.isSpectator && state.ballInHand && !isMoving;
    billiardWhitePos = state.balls.white || { x: 150, y: 150 };

    if (window.startTurnTimer && state.turnIndex !== lastBilliardTurnIndex) {
        lastBilliardTurnIndex = state.turnIndex;
        window.startTurnTimer(state.turnTimeout || 30);
    }

    let discKeys = Object.keys(state.disconnectedPlayers || {});
    let hasVacant = discKeys.length > 0;
    let vacantPid = hasVacant ? discKeys[0] : null;
    let vacantName = hasVacant ? state.disconnectedPlayers[vacantPid].name : null;

    const specBanner = document.getElementById('spectatorBanner');
    if (specBanner) {
        if (state.isSpectator) {
            specBanner.style.display = 'block';
            if (hasVacant) {
                specBanner.innerHTML = `👁️ Yancısın | ⚠️ <b>${vacantName}</b> masadan ayrıldı! <button onclick="takeoverSeat('${state.tableId}', '${vacantPid}')" style="margin-left: 8px; padding: 4px 10px; background: #27ae60; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">💺 Boş Koltuğu Devral (${vacantName} yerine)</button>`;
            } else {
                specBanner.innerHTML = `👁️ İzleyici Modu (Yancısın) - Oyuncuları izliyorsun`;
            }
        } else {
            specBanner.style.display = 'none';
        }
    }

    let statusEl = document.getElementById('billiardStatus');
    if (statusEl) {
        if (state.gameOver) {
            let winMsg = state.isSpectator ? "Maç Sona Erdi!" : ((state.winner === socket.id) ? "KAZANDIN!" : "KAYBETTİN!");
            statusEl.innerHTML = `<span style="color:#f1c40f; font-weight:800; font-size:16px;">🏆 OYUN BİTTİ! ${winMsg}</span>`;
        } else if (state.isSpectator) {
            let discNotice = hasVacant ? ` | <span style="color:#ef4444; font-weight:bold;">⚠️ Eksik koltuk var, butona tıklayıp katılabilirsiniz!</span>` : "";
            statusEl.innerHTML = `<span style="color:#3498db; font-weight:bold;">👁️ Yancısın (İzleyici Modu)</span>${discNotice}`;
        } else {
            let mySuit = state.playerSuits[socket.id];
            let suitText = mySuit === 'solid' ? "<span style='color:#ef4444; font-weight:bold;'>🔴 Kırmızı (Düz)</span>" : (mySuit === 'stripe' ? "<span style='color:#f59e0b; font-weight:bold;'>🟡 Sarı (Çizgili)</span>" : "<span style='color:#94a3b8;'>Belli Değil</span>");
            
            let turnText = "";
            if (isMoving) {
                turnText = "<span style='color:#38bdf8; font-weight:800;'>⚡ Toplar yuvarlanıyor...</span>";
            } else if (isMyTurnBilliard) {
                turnText = "<span style='color:#10b981; font-weight:800;'>🎯 SIRA SENDE!</span>";
            } else {
                turnText = "<span style='color:#f87171;'>⏳ Sıra Rakipte...</span>";
            }

            let faulText = (isMyTurnBilliard && isBallInHand) ? " <b style='color:#facc15; background:rgba(239,68,68,0.3); padding:2px 8px; border-radius:6px; border:1px solid #ef4444;'>⚠️ FAUL! Beyaz topu masaya tıklayarak yerleştir</b>" : "";
            let discNotice = hasVacant ? ` | <span style="color:#f87171; font-weight:bold;">⚠️ Rakip ayrıldı</span>` : "";
            statusEl.innerHTML = `${turnText} | Hedef: ${suitText} ${faulText}${discNotice}`;
        }
    }

    let ballsContainer = document.getElementById('ballsContainer');
    if (ballsContainer) {
        let activeKeys = new Set();
        for (let key in state.balls) {
            let b = state.balls[key];
            if (!b.active || b.x === -100) continue;
            activeKeys.add(key);

            let ballId = 'bill_ball_' + key;
            let el = document.getElementById(ballId);
            let rollDeg = ((b.rollAngle || 0) * (180 / Math.PI)).toFixed(1);

            if (!el) {
                el = document.createElement('div');
                el.id = ballId;
                el.className = `ball ${b.type}`;
                el.style.left = '0px';
                el.style.top = '0px';
                el.style.willChange = 'transform';
                if (b.number) {
                    let numEl = document.createElement('div');
                    numEl.className = 'ball-num';
                    numEl.id = ballId + '_num';
                    numEl.textContent = b.number;
                    el.appendChild(numEl);
                }
                ballsContainer.appendChild(el);
            } else {
                el.className = `ball ${b.type}`;
            }

            el.style.display = 'flex';
            el.style.opacity = '1';
            el.style.transform = `translate3d(${b.x - 9}px, ${b.y - 9}px, 0)`;

            let numEl = document.getElementById(ballId + '_num');
            if (numEl) {
                numEl.style.transform = `rotate(${rollDeg}deg)`;
            }
        }

        let existingBalls = ballsContainer.getElementsByClassName('ball');
        for (let i = 0; i < existingBalls.length; i++) {
            let bEl = existingBalls[i];
            let key = bEl.id.replace('bill_ball_', '');
            if (!activeKeys.has(key)) {
                let prevBall = lastBilliardBalls[key];
                if (prevBall && prevBall.active && !bEl.dataset.pocketing) {
                    // Yumuşak cebe çekilme ve küçülerek kaybolma animasyonu
                    bEl.dataset.pocketing = '1';
                    bEl.style.transition = 'transform 0.24s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.22s ease-in';
                    bEl.style.transform = `translate3d(${prevBall.x - 9}px, ${prevBall.y - 9}px, 0) scale(0.2)`;
                    bEl.style.opacity = '0';
                    setTimeout(() => {
                        bEl.style.display = 'none';
                        bEl.style.transition = 'none';
                        delete bEl.dataset.pocketing;
                    }, 250);
                } else if (!bEl.dataset.pocketing) {
                    bEl.style.display = 'none';
                }
            }
        }
    }

    lastBilliardBalls = state.balls || {};
});

// Eski falso/spin kontrolleri temizlendi (Gereksiz çağrılara karşı güvenli stub)
function resetBilliardSpin() {}
window.resetBilliardSpin = resetBilliardSpin;

function getCanvasCoords(e) {
    if (!cueCanvas) cueCanvas = document.getElementById('cueCanvas');
    let rect = cueCanvas.getBoundingClientRect();
    let clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    let clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    return {
        x: (clientX - rect.left) * (600 / rect.width),
        y: (clientY - rect.top) * (300 / rect.height)
    };
}

function handleBillMouseDown(e) {
    if (window.isSpectating) return; // İzleyiciler atış yapamaz
    if (!isMyTurnBilliard) return;
    if (areBilliardBallsMoving()) return; // Toplar hareket halindeyken ıstaka tutulamaz

    let coords = getCanvasCoords(e);
    let clickX = coords.x;
    let clickY = coords.y;

    if (isBallInHand) {
        socket.emit('billiardPlaceWhite', { x: clickX, y: clickY });
        return;
    }

    isDraggingCue = true;
    cueStartX = clickX; cueStartY = clickY; cueCurrX = clickX; cueCurrY = clickY;
}

function handleBillMouseMove(e) {
    if (window.isSpectating) return;
    if (!isDraggingCue) return;
    if (areBilliardBallsMoving()) {
        isDraggingCue = false;
        if (cueCtx) cueCtx.clearRect(0, 0, 600, 300);
        return;
    }
    if (e.cancelable) e.preventDefault();

    let coords = getCanvasCoords(e);
    cueCurrX = coords.x;
    cueCurrY = coords.y;

    drawCue();
}

function handleBillMouseUp(e) {
    if (isDraggingCue) {
        isDraggingCue = false;
        if (cueCtx) cueCtx.clearRect(0, 0, 600, 300);

        let dx = cueStartX - cueCurrX;
        let dy = cueStartY - cueCurrY;
        let pullDist = Math.sqrt(dx * dx + dy * dy);
        let power = Math.min(24, Math.max(1, pullDist / 4.5));
        let angle = Math.atan2(dy, dx) * (180 / Math.PI);

        if (power > 1.2 && isMyTurnBilliard && !areBilliardBallsMoving()) {
            // KRİTİK BUG DÜZELTME:
            // Vuruş yapıldığı an sıra istemci tarafında anında 'false' yapılır.
            // Böylece oyuncu toplar durup sunucudan yeni sıra onayı gelene kadar kesinlikle 2. vuruşu yapamaz!
            isMyTurnBilliard = false;

            if (window.playSound) window.playSound('cueShoot');
            socket.emit('billiardShoot', {
                angle,
                power,
                spinX: 0,
                spinY: 0
            });

            // Durumu hemen "Toplar hareket halinde" olarak güncelle
            let statusEl = document.getElementById('billiardStatus');
            if (statusEl) {
                let parts = statusEl.innerHTML.split('|');
                let targetPart = parts.length > 1 ? '|' + parts[1] : '';
                statusEl.innerHTML = `<span style='color:#38bdf8; font-weight:800;'>⚡ Toplar yuvarlanıyor...</span> ${targetPart}`;
            }
        }
    }
}

if (billTable) {
    billTable.addEventListener('mousedown', handleBillMouseDown);
    billTable.addEventListener('touchstart', handleBillMouseDown, { passive: false });
}
document.addEventListener('mousemove', handleBillMouseMove, { passive: false });
document.addEventListener('touchmove', handleBillMouseMove, { passive: false });
document.addEventListener('mouseup', handleBillMouseUp);
document.addEventListener('touchend', handleBillMouseUp);

function drawCue() {
    if (!cueCanvas) { cueCanvas = document.getElementById('cueCanvas'); }
    if (!cueCtx) { cueCtx = cueCanvas.getContext('2d'); }
    cueCtx.clearRect(0, 0, cueCanvas.width, cueCanvas.height);

    let dx = cueStartX - cueCurrX;
    let dy = cueStartY - cueCurrY;
    let pullDist = Math.hypot(dx, dy);
    let angle = Math.atan2(dy, dx);
    let power = Math.min(24, Math.max(1, pullDist / 4.5));
    let powerPct = Math.min(100, Math.round((pullDist / 105) * 100));

    let wX = billiardWhitePos.x;
    let wY = billiardWhitePos.y;
    if (!wX || wX <= 0) return;

    let rayDirX = Math.cos(angle);
    let rayDirY = Math.sin(angle);

    // Beyaz topun etrafında nişan alma halkası
    cueCtx.save();
    cueCtx.beginPath();
    cueCtx.arc(wX, wY, 12, 0, Math.PI * 2);
    cueCtx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    cueCtx.lineWidth = 1.6;
    cueCtx.setLineDash([3, 3]);
    cueCtx.stroke();
    cueCtx.restore();

    // 1. IŞIN İZLEME (RAYCASTING) & HEDEF TOP ÇARPIŞMA TAHMİNİ (GHOST BALL)
    let closestDist = 280; // Maksimum nişan kılavuzu uzunluğu
    let hitBall = null;
    let hitGhostPos = null;

    for (let key in lastBilliardBalls) {
        if (key === 'white') continue;
        let b = lastBilliardBalls[key];
        if (!b.active || b.x === -100) continue;

        let toBallX = b.x - wX;
        let toBallY = b.y - wY;
        let proj = toBallX * rayDirX + toBallY * rayDirY;

        if (proj > 8 && proj < closestDist + 16) {
            let perpSq = (toBallX * toBallX + toBallY * toBallY) - (proj * proj);
            let minDistSq = 16 * 16; // 2 * radius (8 + 8 = 16)
            if (perpSq < minDistSq) {
                let dHit = proj - Math.sqrt(minDistSq - perpSq);
                if (dHit > 0 && dHit < closestDist) {
                    closestDist = dHit;
                    hitBall = b;
                    hitGhostPos = { x: wX + rayDirX * dHit, y: wY + rayDirY * dHit };
                }
            }
        }
    }

    // 2. KILAVUZ HEDEF ÇİZGİSİ (Lazer Parlamalı ve Kesikli)
    let targetX = wX + rayDirX * closestDist;
    let targetY = wY + rayDirY * closestDist;

    cueCtx.save();
    cueCtx.shadowColor = 'rgba(56, 189, 248, 0.65)';
    cueCtx.shadowBlur = 6;
    cueCtx.beginPath();
    cueCtx.moveTo(wX + rayDirX * 9, wY + rayDirY * 9);
    cueCtx.lineTo(targetX, targetY);
    cueCtx.setLineDash([5, 4]);
    cueCtx.lineWidth = 2;
    cueCtx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    cueCtx.stroke();
    cueCtx.restore();

    // 3. HAYALET BEYAZ TOP (GHOST BALL) VE ÇARPIŞMA AÇI OKLARI
    if (hitBall && hitGhostPos) {
        // Hayalet Beyaz Top
        cueCtx.save();
        cueCtx.beginPath();
        cueCtx.arc(hitGhostPos.x, hitGhostPos.y, 8, 0, Math.PI * 2);
        let ghostGrad = cueCtx.createRadialGradient(hitGhostPos.x - 2, hitGhostPos.y - 2, 1, hitGhostPos.x, hitGhostPos.y, 8);
        ghostGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
        ghostGrad.addColorStop(1, 'rgba(255, 255, 255, 0.12)');
        cueCtx.fillStyle = ghostGrad;
        cueCtx.fill();
        cueCtx.shadowColor = '#38bdf8';
        cueCtx.shadowBlur = 6;
        cueCtx.strokeStyle = '#ffffff';
        cueCtx.lineWidth = 1.6;
        cueCtx.stroke();
        cueCtx.restore();

        // Hedef Topun Sekme Yönü (Impact Normal Arrow)
        let normX = (hitBall.x - hitGhostPos.x) / 16;
        let normY = (hitBall.y - hitGhostPos.y) / 16;
        let arrowLen = 38;
        let endNormX = hitBall.x + normX * arrowLen;
        let endNormY = hitBall.y + normY * arrowLen;

        cueCtx.save();
        cueCtx.shadowColor = 'rgba(250, 204, 21, 0.75)';
        cueCtx.shadowBlur = 6;
        cueCtx.beginPath();
        cueCtx.moveTo(hitBall.x, hitBall.y);
        cueCtx.lineTo(endNormX, endNormY);
        cueCtx.strokeStyle = '#facc15';
        cueCtx.lineWidth = 2.4;
        cueCtx.stroke();

        // Ok ucu (Üçgen Başlık)
        let headLen = 7;
        let angleArr = Math.atan2(normY, normX);
        cueCtx.beginPath();
        cueCtx.moveTo(endNormX, endNormY);
        cueCtx.lineTo(endNormX - headLen * Math.cos(angleArr - Math.PI / 6), endNormY - headLen * Math.sin(angleArr - Math.PI / 6));
        cueCtx.lineTo(endNormX - headLen * Math.cos(angleArr + Math.PI / 6), endNormY - headLen * Math.sin(angleArr + Math.PI / 6));
        cueCtx.fillStyle = '#facc15';
        cueCtx.fill();
        cueCtx.restore();

        // Beyaz Topun Sekme Yönü (Tangent Deflection Ray)
        let tangX = -normY;
        let tangY = normX;
        let dot = tangX * rayDirX + tangY * rayDirY;
        if (dot < 0) { tangX = -tangX; tangY = -tangY; }

        let whiteDeflectLen = 24;
        cueCtx.save();
        cueCtx.shadowColor = 'rgba(56, 189, 248, 0.7)';
        cueCtx.shadowBlur = 5;
        cueCtx.beginPath();
        cueCtx.moveTo(hitGhostPos.x, hitGhostPos.y);
        cueCtx.lineTo(hitGhostPos.x + tangX * whiteDeflectLen, hitGhostPos.y + tangY * whiteDeflectLen);
        cueCtx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        cueCtx.lineWidth = 1.8;
        cueCtx.setLineDash([3, 3]);
        cueCtx.stroke();
        cueCtx.restore();
    }

    // 4. GERÇEKÇİ AHŞAP ISTAKA ÇİZİMİ (REALISTIC TAPERED CUE STICK & SHADOW)
    let cueOffset = 12 + Math.min(90, pullDist * 0.85);
    let cueLen = 175;

    let tipX = wX - rayDirX * cueOffset;
    let tipY = wY - rayDirY * cueOffset;
    let buttX = wX - rayDirX * (cueOffset + cueLen);
    let buttY = wY - rayDirY * (cueOffset + cueLen);

    cueCtx.save();
    // Masa Çuhası Üzerine Istaka Gölgesi
    cueCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    cueCtx.shadowBlur = 8;
    cueCtx.shadowOffsetX = 3;
    cueCtx.shadowOffsetY = 4;

    // Istaka Gövdesi (Akçaağaç -> Ceviz Geçişi)
    let cueGrad = cueCtx.createLinearGradient(tipX, tipY, buttX, buttY);
    cueGrad.addColorStop(0, '#fef3c7'); // Açık dişbudak/akçaağaç şaft
    cueGrad.addColorStop(0.55, '#d97706'); // Sıcak ahşap ton
    cueGrad.addColorStop(1, '#451a03'); // Koyu ceviz dipçik

    cueCtx.beginPath();
    cueCtx.moveTo(tipX, tipY);
    cueCtx.lineTo(buttX, buttY);
    cueCtx.strokeStyle = cueGrad;
    cueCtx.lineWidth = 6;
    cueCtx.lineCap = "round";
    cueCtx.stroke();

    // Pirinç Yüksük (Brass Ferrule)
    let ferruleX = wX - rayDirX * (cueOffset + 6);
    let ferruleY = wY - rayDirY * (cueOffset + 6);
    cueCtx.beginPath();
    cueCtx.moveTo(tipX, tipY);
    cueCtx.lineTo(ferruleX, ferruleY);
    cueCtx.strokeStyle = '#f59e0b';
    cueCtx.lineWidth = 5;
    cueCtx.stroke();

    // Mavi Tebeşirli Istaka Ucu (Blue Chalked Tip)
    let chalkTipX = wX - rayDirX * (cueOffset + 2.5);
    let chalkTipY = wY - rayDirY * (cueOffset + 2.5);
    cueCtx.beginPath();
    cueCtx.moveTo(tipX, tipY);
    cueCtx.lineTo(chalkTipX, chalkTipY);
    cueCtx.strokeStyle = '#0284c7';
    cueCtx.lineWidth = 4.5;
    cueCtx.stroke();
    cueCtx.restore();

    // 5. DİNAMİK VURUŞ GÜCÜ GÖSTERGESİ (POWER METER HUD)
    if (pullDist > 6) {
        let pColor = powerPct < 40 ? '#10b981' : (powerPct < 75 ? '#f59e0b' : '#ef4444');
        let hudX = Math.max(75, Math.min(525, tipX));
        let hudY = Math.max(25, Math.min(275, tipY - 20));

        cueCtx.save();
        cueCtx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        cueCtx.strokeStyle = pColor;
        cueCtx.lineWidth = 1.6;
        cueCtx.shadowColor = pColor;
        cueCtx.shadowBlur = 8;
        cueCtx.beginPath();
        cueCtx.roundRect(hudX - 42, hudY - 14, 84, 28, 8);
        cueCtx.fill();
        cueCtx.stroke();

        // Mini Güç Barı
        cueCtx.shadowBlur = 0;
        cueCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        cueCtx.fillRect(hudX - 34, hudY + 5, 68, 4);
        cueCtx.fillStyle = pColor;
        cueCtx.fillRect(hudX - 34, hudY + 5, (68 * powerPct) / 100, 4);

        cueCtx.fillStyle = pColor;
        cueCtx.font = "bold 11px sans-serif";
        cueCtx.textAlign = "center";
        cueCtx.textBaseline = "middle";
        cueCtx.fillText(`⚡ %${powerPct}`, hudX, hudY - 3);
        cueCtx.restore();
    }
}

// --- BİLARDO RÖVANŞ VE TUR SİSTEMİ ---
let lastBilliardRoundData = null;

socket.on('billiardRoundOver', (data) => {
    lastBilliardRoundData = data;
    const overlay = document.getElementById('billiardRematchOverlay');
    if (!overlay) return;

    overlay.style.display = 'block';

    const titleEl = document.getElementById('billiardRematchTitle');
    const winnerEl = document.getElementById('billiardRematchWinnerDesc');
    const betBadge = document.getElementById('billiardRematchBetBadge');
    const votesEl = document.getElementById('billiardRematchVotesStatus');
    const btn = document.getElementById('billiardRematchAcceptBtn');

    if (titleEl) titleEl.innerText = `${data.roundNumber || 1}. Tur Sona Erdi!`;
    if (winnerEl) {
        let isMe = data.winner === socket.id;
        winnerEl.innerHTML = isMe ? "🏆 <span style='color:#22c55e;'>Tebrikler, bu turu KAZANDIN!</span>" : `🏆 Turu <b>${data.winnerName || 'Rakip'}</b> kazandı.`;
    }

    if (betBadge) {
        if (data.bet > 0) {
            let totalPot = data.bet * 2;
            betBadge.innerHTML = `💰 Yeni Tur Bahsi: <b>${data.bet} TL</b> (Kişi Başı) | Kazanan Potu: <b>${totalPot} TL</b>`;
            betBadge.style.display = 'inline-block';
        } else {
            betBadge.innerHTML = `🆓 Ücretsiz Masa`;
            betBadge.style.display = 'inline-block';
        }
    }

    if (votesEl) votesEl.innerText = "Tekrar oynamak için iki oyuncunun da onayı gerekiyor.";
    if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.innerHTML = "✅ Tekrar Oyna";
    }
});

socket.on('billiardRematchStatus', (data) => {
    const votesEl = document.getElementById('billiardRematchVotesStatus');
    if (votesEl && data.votes) {
        let votedCount = Object.values(data.votes).filter(v => v).length;
        votesEl.innerText = `Oyuncuların onayı bekleniyor... (${votedCount}/${data.totalPlayers || 2} Onay)`;
    }
});

socket.on('billiardRoundStarted', (data) => {
    const overlay = document.getElementById('billiardRematchOverlay');
    if (overlay) overlay.style.display = 'none';
    if (window.playSound) window.playSound('billiardHit');
});

function acceptBilliardRematch() {
    const btn = document.getElementById('billiardRematchAcceptBtn');
    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.6';
        btn.innerHTML = "⏳ Rakip Bekleniyor...";
    }
    socket.emit('billiardVoteRematch');
}
window.acceptBilliardRematch = acceptBilliardRematch;