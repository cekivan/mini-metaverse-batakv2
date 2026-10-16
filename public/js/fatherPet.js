// public/js/fatherPet.js - "Denizden Babam Çıksa Yerim" Baba Yoldaş (Pet), Mucizevi İniş Efekti ve Komik Yeme Sahnesi

window.activeFatherPets = {};
window.activeMiracleEffects = [];
let isEatingAnimationRunning = false;

// 1. "DENİZDEN BABAM ÇIKTI" SEÇENEK PENCERESİ KONTROLÜ
function openFatherCatchModal(data) {
    const container = document.getElementById('fishingProgressContainer');
    if (container) container.style.display = 'none';

    const modal = document.getElementById('fatherCatchModal');
    if (!modal) return;

    if (window.playSound) window.playSound('win');
    modal.style.display = 'flex';
}

function closeFatherCatchModal() {
    const modal = document.getElementById('fatherCatchModal');
    if (modal) modal.style.display = 'none';
}

function handleFatherChoice(choice) {
    closeFatherCatchModal();
    if (window.socket) {
        window.socket.emit('fatherChoice', { choice: choice });
    }
}
window.handleFatherChoice = handleFatherChoice;

// 2. BABADAN 700 TL HARÇLIK BİLDİRİMİ GÖSTERİCİ
function showFatherPocketMoneyNotice(amount, speech) {
    const notice = document.getElementById('fatherPocketMoneyNotice');
    const speechEl = document.getElementById('fatherPocketSpeechText');
    if (!notice) return;

    if (speechEl && speech) {
        speechEl.innerText = `“${speech} ❤️”`;
    }
    if (window.playSound) {
        window.playSound('coin');
    }

    notice.style.display = 'block';
    setTimeout(() => {
        if (notice) notice.style.display = 'none';
    }, 6500);
}

// 3. SEVİMLİ VE KOMİK "BABAYI YEME" ANİMASYONU (KESİNLİKLE CREEPY DEĞİL, TAMAMEN ÇİZGİ FİLM KOMEDİSİ)
function runFatherEatAnimation(reward = 300, gender = 'male', onComplete = null) {
    const modal = document.getElementById('fatherEatModal');
    const canvas = document.getElementById('fatherEatCanvas');
    if (!modal || !canvas) return;

    modal.style.display = 'flex';
    isEatingAnimationRunning = true;
    const ctx = canvas.getContext('2d');

    let startTime = Date.now();
    const duration = 3800; // 3.8 saniye

    let hasPlayedNom = false;
    let hasPlayedCoin = false;

    function animFrame() {
        if (!isEatingAnimationRunning) return;
        let elapsed = Date.now() - startTime;
        let progress = Math.min(1, elapsed / duration);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // --- ARKA PLAN: GÜNEŞLİ NEŞELİ DENİZ MANZARASI ---
        let skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        skyGrad.addColorStop(0, '#38bdf8');
        skyGrad.addColorStop(0.55, '#bae6fd');
        skyGrad.addColorStop(0.85, '#0284c7');
        skyGrad.addColorStop(1, '#0369a1');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Güneş ve Güneş Işınları
        ctx.save();
        ctx.translate(70, 60);
        ctx.rotate(elapsed / 1200);
        ctx.fillStyle = 'rgba(253, 224, 71, 0.4)';
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, 45, (i * Math.PI) / 4 - 0.15, (i * Math.PI) / 4 + 0.15);
            ctx.fill();
        }
        ctx.restore();
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(70, 60, 26, 0, Math.PI * 2);
        ctx.fill();

        // Sevimli Bulutlar
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(220 + Math.sin(elapsed / 600) * 8, 50, 18, 0, Math.PI * 2);
        ctx.arc(240 + Math.sin(elapsed / 600) * 8, 44, 24, 0, Math.PI * 2);
        ctx.arc(265 + Math.sin(elapsed / 600) * 8, 52, 16, 0, Math.PI * 2);
        ctx.fill();

        // Deniz Dalgaları
        ctx.fillStyle = 'rgba(14, 165, 233, 0.6)';
        ctx.beginPath();
        ctx.moveTo(0, 220);
        for (let x = 0; x <= canvas.width; x += 30) {
            let waveY = 220 + Math.sin((x + elapsed * 0.15) / 25) * 8;
            ctx.lineTo(x, waveY);
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        ctx.fill();

        // --- FAZ 1 (0 - 1.2s): BABA DENİZDE SİMİTTE GÜLÜMSER, OYUNCU YAKLAŞIR ---
        // --- FAZ 2 (1.2s - 2.2s): OYUNCU AĞZINI KOCAMAN AÇAR, BABA KÜÇÜK BİR LOKMA GİBİ HOP DİYE GİRER ---
        // --- FAZ 3 (2.2s - 3.8s): OYUNCU ÇİĞNER VE MUTLU OLUR, +300 TL ALTINLAR PATLAR ---

        let playerX = 140;
        let playerY = 190;
        let dadStartX = 360;
        let dadStartY = 200;

        let dadX = dadStartX;
        let dadY = dadStartY + Math.sin(elapsed / 250) * 6;
        let dadScale = 1.0;
        let dadAlpha = 1.0;
        let mouthOpen = 0; // 0 (kapalı) - 1 (tam açık HAM!)
        let isChewing = false;

        if (progress < 0.32) {
            // Yaklaşma ve bakışma
            mouthOpen = (progress / 0.32) * 0.4;
        } else if (progress < 0.58) {
            // Ağız kocaman açılır, baba sevimlice ağza doğru süzülür (vakum / çizgi film tarzı)
            let pullProg = (progress - 0.32) / 0.26;
            mouthOpen = 0.4 + pullProg * 0.6;
            dadX = dadStartX + (playerX + 35 - dadStartX) * (pullProg * pullProg);
            dadY = dadStartY + (playerY - 5 - dadStartY) * pullProg;
            dadScale = 1.0 - pullProg * 0.6;
            if (pullProg > 0.8) {
                dadAlpha = Math.max(0, 1 - (pullProg - 0.8) * 5);
            }
        } else {
            // Yutuldu! Ağız kapandı, çiğneme hareketi
            mouthOpen = 0;
            dadAlpha = 0;
            isChewing = true;

            if (!hasPlayedNom) {
                hasPlayedNom = true;
                if (window.playSound) window.playSound('nom');
            }
            if (progress > 0.7 && !hasPlayedCoin) {
                hasPlayedCoin = true;
                if (window.playSound) window.playSound('coin');
            }
        }

        // 1. BABA KARAKTERİNİ ÇİZ (Henüz yutulmadıysa)
        if (dadAlpha > 0.05) {
            ctx.save();
            ctx.globalAlpha = dadAlpha;
            ctx.translate(dadX, dadY);
            ctx.scale(dadScale, dadScale);

            // Sarı Deniz Can Simidi
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.ellipse(0, 20, 36, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Beyaz Can Simidi Şeritleri
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-28, 14, 8, 12);
            ctx.fillRect(20, 14, 8, 12);

            // Baba Gövdesi (Tombul Göbek + Beyaz Çizgili Atlet)
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.ellipse(0, 6, 22, 18, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Atlet İnce Çizgileri
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-10, -8); ctx.lineTo(-10, 18);
            ctx.moveTo(0, -10); ctx.lineTo(0, 22);
            ctx.moveTo(10, -8); ctx.lineTo(10, 18);
            ctx.stroke();

            // Kollar
            ctx.fillStyle = '#fed7aa';
            ctx.beginPath();
            ctx.ellipse(-22, 6, 6, 10, -0.2, 0, Math.PI * 2);
            ctx.ellipse(22, 6, 6, 10, 0.2, 0, Math.PI * 2);
            ctx.fill();

            // Baba Kafası (Kel + Şakaklarda Saç + Bıyık)
            ctx.fillStyle = '#fed7aa';
            ctx.beginPath();
            ctx.arc(0, -22, 17, 0, Math.PI * 2);
            ctx.fill();

            // Kellik Parlaması (Tepede beyaz hilal parıltı)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.ellipse(-4, -31, 7, 3, -0.2, 0, Math.PI * 2);
            ctx.fill();

            // Yan Saçlar (Şakaklarda siyah/kır saçlar)
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.arc(-16, -20, 6, 0, Math.PI * 2);
            ctx.arc(16, -20, 6, 0, Math.PI * 2);
            ctx.fill();

            // Gözler (Şaşkın ve Sevimli Çizgi Film Gözleri)
            ctx.fillStyle = '#1e293b';
            if (progress >= 0.32 && progress < 0.58) {
                // Şaşkın yuvarlak gözler: (O_O)
                ctx.beginPath(); ctx.arc(-6, -24, 3.2, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(6, -24, 3.2, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.arc(-7, -25, 1.2, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(5, -25, 1.2, 0, Math.PI * 2); ctx.fill();
            } else {
                // Neşeli mutlu gözler: (^_^)
                ctx.lineWidth = 2.2;
                ctx.strokeStyle = '#1e293b';
                ctx.beginPath(); ctx.arc(-6, -23, 4, Math.PI, 0); ctx.stroke();
                ctx.beginPath(); ctx.arc(6, -23, 4, Math.PI, 0); ctx.stroke();
            }

            // Pembe Yanaklar
            ctx.fillStyle = 'rgba(244, 63, 94, 0.35)';
            ctx.beginPath(); ctx.arc(-11, -17, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(11, -17, 4, 0, Math.PI * 2); ctx.fill();

            // HEYBETLİ TÜRK BIYIĞI (Pos / Pala Bıyık)
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.moveTo(0, -17);
            ctx.bezierCurveTo(-8, -21, -17, -18, -19, -13);
            ctx.bezierCurveTo(-14, -11, -6, -13, 0, -14);
            ctx.bezierCurveTo(6, -13, 14, -11, 19, -13);
            ctx.bezierCurveTo(17, -18, 8, -21, 0, -17);
            ctx.closePath();
            ctx.fill();

            // Sevimli Ter Damlası 💧
            if (progress >= 0.32 && progress < 0.58) {
                ctx.fillStyle = '#38bdf8';
                ctx.beginPath();
                ctx.arc(17, -28, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }

        // 2. ÇİZGİ FİLM VAKUM / HIZ ÇİZGİLERİ (Ağza doğru süzülüş)
        if (progress >= 0.32 && progress < 0.58) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                let sy = playerY - 20 + i * 14;
                ctx.beginPath();
                ctx.moveTo(dadX - 20, sy);
                ctx.lineTo(playerX + 40, sy - 5);
                ctx.stroke();
            }
            ctx.restore();
        }

        // 3. OYUNCU AVATARINI ÇİZ (Ağzı açılan / çiğneyen sevimli yüz)
        ctx.save();
        ctx.translate(playerX, playerY);

        // Oyuncu Gövdesi
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.roundRect(-18, 10, 36, 40, 8);
        ctx.fill();

        // Çiğnerken hafif kafa sallama
        let chewOffset = isChewing ? Math.sin(elapsed / 80) * 3 : 0;
        ctx.translate(0, chewOffset);

        // Oyuncu Kafası
        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.arc(0, -15, 24, 0, Math.PI * 2);
        ctx.fill();

        // Oyuncu Saçı
        ctx.fillStyle = (gender === 'female') ? '#ec4899' : '#1e293b';
        ctx.beginPath();
        ctx.arc(0, -22, 25, Math.PI, 0);
        ctx.fill();
        if (gender === 'female') {
            // Yan bukleler
            ctx.fillRect(-26, -22, 6, 26);
            ctx.fillRect(20, -22, 6, 26);
        }

        // Oyuncu Gözleri
        if (isChewing) {
            // Mutlu kapalı çiğneme gözleri: (> <)
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(4, -22); ctx.lineTo(12, -18); ctx.lineTo(4, -14); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-12, -22); ctx.lineTo(-4, -18); ctx.lineTo(-12, -14); ctx.stroke();
        } else {
            // Şaşkın/İştahlı gözler
            ctx.fillStyle = '#1e293b';
            ctx.beginPath(); ctx.arc(-6, -18, 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(10, -18, 3.5, 0, Math.PI * 2); ctx.fill();
        }

        // OYUNCUNUN AĞZI (KOMİK ÇİZGİ FİLM "HAMMM" AĞZI)
        if (mouthOpen > 0.05) {
            let mRadius = 6 + mouthOpen * 18;
            ctx.fillStyle = '#881337'; // Ağız içi
            ctx.beginPath();
            ctx.ellipse(14, -6, mRadius, mRadius * 0.85, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Sevimli Dil
            ctx.fillStyle = '#f43f5e';
            ctx.beginPath();
            ctx.arc(14, -6 + mRadius * 0.4, mRadius * 0.5, 0, Math.PI);
            ctx.fill();
        } else if (isChewing) {
            // Tombul şişmiş yanaklar ve mutlu kapalı ağız
            ctx.fillStyle = 'rgba(244, 63, 94, 0.4)';
            ctx.beginPath(); ctx.arc(14, -8, 7, 0, Math.PI * 2); ctx.fill();

            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(6, -6, 8, 0.2, Math.PI - 0.2);
            ctx.stroke();
        } else {
            // Küçük gülümseme
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(4, -8, 5, 0.2, Math.PI - 0.2);
            ctx.stroke();
        }

        ctx.restore();

        // 4. FAZ 3: KONFETİ, ALTINLAR VE "+300 TL KAZANDIN!" YAZISI
        if (progress > 0.6) {
            let rewardAlpha = Math.min(1, (progress - 0.6) / 0.15);
            ctx.save();
            ctx.globalAlpha = rewardAlpha;

            // Çizgi Film Yıldızları ve Kıvılcımlar
            for (let i = 0; i < 16; i++) {
                let sparkAngle = (i * Math.PI) / 8 + elapsed / 300;
                let sparkDist = 60 + Math.sin(elapsed / 150 + i) * 30;
                let sx = playerX + 10 + Math.cos(sparkAngle) * sparkDist;
                let sy = playerY - 20 + Math.sin(sparkAngle) * (sparkDist * 0.6);

                ctx.fillStyle = i % 2 === 0 ? '#facc15' : '#fb923c';
                ctx.font = '14px sans-serif';
                ctx.fillText('✨', sx, sy);
            }

            // Kocaman Komik Başlık
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fef08a';
            ctx.font = '900 24px sans-serif';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 8;
            ctx.fillText('✨ HAMMM! LEZİZ! ✨', canvas.width / 2, 70);

            // Deyim Açıklaması
            ctx.fillStyle = '#ffffff';
            ctx.font = 'italic 700 13px sans-serif';
            ctx.fillText('“Denizden babam çıksa yerim” deyimini başarıyla gerçekleştirdin!', canvas.width / 2, 98);

            // +300 TL Rozeti
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.roundRect(canvas.width / 2 - 80, 115, 160, 38, 19);
            ctx.fill();
            ctx.strokeStyle = '#34d399';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = '900 18px sans-serif';
            ctx.shadowBlur = 0;
            ctx.fillText('+300 TL KAZANDIN! 💰', canvas.width / 2, 140);

            ctx.restore();
        }

        if (progress < 1.0) {
            requestAnimationFrame(animFrame);
        } else {
            // Animasyon tamamlandı
            setTimeout(() => {
                isEatingAnimationRunning = false;
                modal.style.display = 'none';
                if (typeof onComplete === 'function') onComplete();
                const errToast = document.getElementById('errorToast');
                if (errToast) {
                    errToast.innerText = "🍽️ Afiyet olsun! Babanı yedin ve 300 TL kazandın.";
                    errToast.style.background = "linear-gradient(135deg, #10b981, #059669)";
                    errToast.style.display = 'block';
                    setTimeout(() => { errToast.style.display = 'none'; }, 4000);
                }
            }, 500);
        }
    }

    requestAnimationFrame(animFrame);
}

// 4. GÖKTEN İNEN MUCİZEVİ EFEKT ÜRETECİ (PARTİKÜLLER VE İLAHİ IŞIK SÜTUNU)
function createMiracleEffect(x, y) {
    const particles = [];
    for (let i = 0; i < 45; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * 60,
            y: y - Math.random() * 250,
            vy: 0.6 + Math.random() * 1.5,
            vx: (Math.random() - 0.5) * 0.8,
            size: 2 + Math.random() * 3.5,
            alpha: 0.4 + Math.random() * 0.6,
            char: ['✨', '⭐', '🌟', '•'][Math.floor(Math.random() * 4)]
        });
    }

    return {
        x: x,
        y: y,
        startTime: Date.now(),
        duration: 3800, // 3.8 saniye
        particles: particles
    };
}

// 5. MUCİZEVİ IŞIK SÜTUNUNU VE GÖKSEL İNİŞİ ÇİZ
function drawMiracleEffects(ctx, dt) {
    const now = Date.now();
    for (let i = window.activeMiracleEffects.length - 1; i >= 0; i--) {
        const effect = window.activeMiracleEffects[i];
        const elapsed = now - effect.startTime;
        const progress = elapsed / effect.duration;

        if (progress >= 1) {
            window.activeMiracleEffects.splice(i, 1);
            continue;
        }

        ctx.save();
        let eX = effect.x;
        let eY = effect.y;

        // İlahi Işık Sütunu (Tepeden aşağı inen parlak altın huzme)
        let beamAlpha = 1.0;
        if (progress < 0.2) {
            beamAlpha = progress / 0.2;
        } else if (progress > 0.7) {
            beamAlpha = Math.max(0, 1 - (progress - 0.7) / 0.3);
        }

        let beamWidth = 46 + Math.sin(now / 120) * 10;
        let pillarGrad = ctx.createLinearGradient(eX - beamWidth / 2, 0, eX + beamWidth / 2, 0);
        pillarGrad.addColorStop(0, 'rgba(253, 224, 71, 0)');
        pillarGrad.addColorStop(0.3, `rgba(254, 240, 138, ${beamAlpha * 0.7})`);
        pillarGrad.addColorStop(0.5, `rgba(255, 255, 255, ${beamAlpha * 0.95})`);
        pillarGrad.addColorStop(0.7, `rgba(254, 240, 138, ${beamAlpha * 0.7})`);
        pillarGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');

        ctx.fillStyle = pillarGrad;
        ctx.fillRect(eX - beamWidth / 2, 0, beamWidth, eY + 15);

        // Zeminde Şok Dalgaları (Halkalar)
        let ringCount = 3;
        for (let r = 0; r < ringCount; r++) {
            let rProg = ((elapsed / 900) + (r / ringCount)) % 1;
            let rRadius = rProg * 45;
            let rAlpha = (1 - rProg) * beamAlpha * 0.8;
            ctx.strokeStyle = `rgba(250, 204, 21, ${rAlpha})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.ellipse(eX, eY + 12, rRadius, rRadius * 0.42, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Gökten Süzülen Yıldızlar ve Partiküller
        for (let p of effect.particles) {
            p.y += p.vy;
            p.x += p.vx;
            if (p.y > eY + 14) {
                p.y = eY - 220;
                p.x = eX + (Math.random() - 0.5) * 55;
            }

            ctx.fillStyle = `rgba(253, 224, 71, ${p.alpha * beamAlpha})`;
            ctx.font = `${p.size * 3}px sans-serif`;
            ctx.fillText(p.char, p.x, p.y);
        }

        // Göksel Melek Halesi (Baba inerken başının üstünde dönen parlak altın hale)
        if (progress < 0.6) {
            let haloY = eY - 45 - (1 - progress / 0.6) * 120;
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.ellipse(eX, haloY, 14, 5, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }
}

// 6. BABA KARAKTERİNİ (PET) SANALİKA PİKSEL DÜNYASINDA ÇİZ VE SAHİBİNİ TAKİP ETTİR
function drawSingleFatherPet(ctx, pet, dt) {
    if (!pet) return;

    // Kendi petimiz ise her zaman mevcut odamızla senkron tutulur
    if (typeof myId !== 'undefined' && pet.ownerId === myId) {
        pet.room = (typeof currentRoom !== 'undefined') ? currentRoom : pet.room;
    } else if (typeof currentRoom !== 'undefined' && pet.room !== currentRoom) {
        return;
    }

    // Sahibini Bul
    let owner = (typeof players !== 'undefined') ? players[pet.ownerId] : null;

    if (owner) {
        // Hedef Pozisyon: Sahibinin yanında veya arkasında durur
        let targetOffsetX = (owner.facing === 'left') ? 34 : -34;
        let targetOffsetY = 2;
        let targetX = owner.x + targetOffsetX;
        let targetY = owner.y + targetOffsetY;

        let dx = targetX - pet.x;
        let dy = targetY - pet.y;
        let dist = Math.hypot(dx, dy);

        if (dist > 320) {
            // Çok uzaklaşırsa anında sahibinin yanına ışınlanır
            pet.x = targetX;
            pet.y = targetY;
            pet.isMoving = false;
        } else if (dist > 28) {
            // Sahibine doğru pıtır pıtır yürür
            let moveSpeed = 7.5 * dt;
            pet.x += dx * Math.min(moveSpeed, 0.22);
            pet.y += dy * Math.min(moveSpeed, 0.22);
            pet.isMoving = true;
            pet.walkCycle = (pet.walkCycle || 0) + (11 * dt);

            if (Math.abs(dx) > Math.abs(dy)) {
                pet.facing = dx > 0 ? 'right' : 'left';
            } else {
                pet.facing = dy > 0 ? 'down' : 'up';
            }
        } else {
            pet.isMoving = false;
        }
    }

    let pX = pet.x;
    let pY = pet.y;
    let facing = pet.facing || 'down';
    let legSwing = pet.isMoving ? Math.sin(pet.walkCycle || 0) * 5 : 0;
    let bellyBounce = pet.isMoving ? Math.abs(Math.sin(pet.walkCycle || 0)) * 2 : 0;

    ctx.save();

    // 1. Zemin Gölgesi
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    ctx.beginPath();
    ctx.ellipse(pX, pY + 22, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Bacaklar & Kösele Ayakkabılar
    ctx.fillStyle = "#374151"; // Kumaş pantolon
    ctx.fillRect(pX - 6 + legSwing * 0.4, pY + 8, 4.5, 11);
    ctx.fillRect(pX + 1.5 - legSwing * 0.4, pY + 8, 4.5, 11);

    // Koyu Kahverengi Kösele Ayakkabı
    ctx.fillStyle = "#451a03";
    ctx.beginPath();
    ctx.roundRect(pX - 8 + legSwing * 0.4, pY + 18, 7, 4, [2, 3, 1, 1]);
    ctx.roundRect(pX + 1 - legSwing * 0.4, pY + 18, 7, 4, [3, 2, 1, 1]);
    ctx.fill();

    // 3. Tombul Gövde (Şişman Babanın Heybetli Göbeği & Beyaz Çizgili Atlet)
    ctx.save();
    ctx.translate(0, -bellyBounce);

    // Göbek arkası gölge
    ctx.fillStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.ellipse(pX, pY - 2, 13, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Beyaz Atlet
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.ellipse(pX, pY - 3, 12, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Kumaş Pantolon Kemeri (Tombul göbeğin hemen altından sıkan pirinç tokalı kemer)
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(pX - 10, pY + 6, 20, 3.5);
    ctx.fillStyle = "#eab308"; // Toka
    ctx.fillRect(pX - 2.5, pY + 5.5, 5, 4.5);

    // Kollar (Tombul kollar)
    let skin = "#fed7aa";
    ctx.fillStyle = skin;
    if (facing === 'left') {
        ctx.beginPath(); ctx.ellipse(pX - 8, pY - 2, 3.5, 6, -0.2, 0, Math.PI * 2); ctx.fill();
    } else if (facing === 'right') {
        ctx.beginPath(); ctx.ellipse(pX + 8, pY - 2, 3.5, 6, 0.2, 0, Math.PI * 2); ctx.fill();
    } else {
        ctx.beginPath(); ctx.ellipse(pX - 11, pY - 2, 3.5, 6, 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(pX + 11, pY - 2, 3.5, 6, -0.1, 0, Math.PI * 2); ctx.fill();
    }

    // 4. Baba Kafası (Kel Kafa + Şakaklarda Saç)
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(pX, pY - 20, 10.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Kel Kafa Parlaması
    ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
    ctx.beginPath();
    ctx.ellipse(pX - 2, pY - 27, 4, 1.8, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Yan Saçlar (Şakaklarda siyah/gri saçlar)
    ctx.fillStyle = "#1f2937";
    if (facing !== 'right') {
        ctx.beginPath(); ctx.arc(pX - 9, -20 + pY, 3.8, 0, Math.PI * 2); ctx.fill();
    }
    if (facing !== 'left') {
        ctx.beginPath(); ctx.arc(pX + 9, -20 + pY, 3.8, 0, Math.PI * 2); ctx.fill();
    }

    // Gözler
    ctx.fillStyle = "#111827";
    let eyeOffX = (facing === 'left') ? -2 : (facing === 'right' ? 2 : 0);
    ctx.beginPath(); ctx.arc(pX - 3.5 + eyeOffX, pY - 21, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(pX + 3.5 + eyeOffX, pY - 21, 1.3, 0, Math.PI * 2); ctx.fill();

    // Gür Kaşlar
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(pX - 6 + eyeOffX, pY - 24, 4.5, 1.4);
    ctx.fillRect(pX + 1.5 + eyeOffX, pY - 24, 4.5, 1.4);

    // Pembe Yanaklar
    ctx.fillStyle = "rgba(244, 63, 94, 0.28)";
    ctx.beginPath(); ctx.arc(pX - 6 + eyeOffX, pY - 18, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(pX + 6 + eyeOffX, pY - 18, 2.5, 0, Math.PI * 2); ctx.fill();

    // HEYBETLİ TÜRK BIYIĞI (Pos / Pala Bıyık)
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.moveTo(pX + eyeOffX, pY - 18);
    ctx.bezierCurveTo(pX - 5 + eyeOffX, pY - 20, pX - 9 + eyeOffX, pY - 17, pX - 10 + eyeOffX, pY - 14);
    ctx.bezierCurveTo(pX - 7 + eyeOffX, pY - 14, pX - 3 + eyeOffX, pY - 16, pX + eyeOffX, pY - 16.5);
    ctx.bezierCurveTo(pX + 3 + eyeOffX, pY - 16.5, pX + 7 + eyeOffX, pY - 14, pX + 10 + eyeOffX, pY - 14);
    ctx.bezierCurveTo(pX + 9 + eyeOffX, pY - 17, pX + 5 + eyeOffX, pY - 20, pX + eyeOffX, pY - 18);
    ctx.closePath();
    ctx.fill();

    ctx.restore(); // Belly bounce restorasyonu

    // 5. İsim Rozeti ve Canlı Kalan Süre Rozeti (Örn: "🧔‍♂️ Ahmet'in babası ⏳14:32")
    let timeBadge = '';
    if (pet.expiresAt) {
        let remainingSec = Math.max(0, Math.floor((pet.expiresAt - Date.now()) / 1000));
        let m = Math.floor(remainingSec / 60);
        let s = (remainingSec % 60).toString().padStart(2, '0');
        timeBadge = ` ⏳${m}:${s}`;
    }
    let badgeText = `🧔‍♂️ ${pet.name}${timeBadge}`;
    ctx.font = "bold 10px sans-serif";
    let textW = ctx.measureText(badgeText).width;

    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.beginPath();
    ctx.roundRect(pX - textW / 2 - 6, pY - 44, textW + 12, 15, 5);
    ctx.fill();
    ctx.strokeStyle = "#f59e0b"; // Altın sarısı pet çerçevesi
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#fef08a";
    ctx.textAlign = "center";
    ctx.fillText(badgeText, pX, pY - 33);

    // 6. Konuşma Balonu (Örn: "Seninle gurur duyuyorum oğlum ❤️")
    if (pet.speech && Date.now() < (pet.speechUntil || 0)) {
        let speechText = pet.speech;
        ctx.font = "bold 11px sans-serif";
        let speechW = ctx.measureText(speechText).width;
        let bubbleH = 22;
        let bubbleY = pY - 74;

        // Balon gövdesi
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.roundRect(pX - speechW / 2 - 10, bubbleY, speechW + 20, bubbleH, 8);
        ctx.fill();
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Balon okcuğu
        ctx.beginPath();
        ctx.moveTo(pX - 5, bubbleY + bubbleH);
        ctx.lineTo(pX, bubbleY + bubbleH + 6);
        ctx.lineTo(pX + 5, bubbleY + bubbleH);
        ctx.closePath();
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.stroke();

        // Balon metni
        ctx.fillStyle = "#1e293b";
        ctx.fillText(speechText, pX, bubbleY + 15);
    }

    ctx.restore();
}

// 7. TÜM BABA PETLERİNİ VE MUCİZE EFEKTLERİNİ ÇİZEN ANA METOD
function updateAndRenderFatherPets(ctx, dt) {
    // 1. Mucizevi Göksel İniş Efektlerini Çiz
    drawMiracleEffects(ctx, dt);

    // 2. Haritadaki Tüm Baba Petlerini Çiz
    for (let id in window.activeFatherPets) {
        drawSingleFatherPet(ctx, window.activeFatherPets[id], dt);
    }
}
window.updateAndRenderFatherPets = updateAndRenderFatherPets;

// --- SOKET DİNLEYİCİLERİ ---
if (window.socket) {
    // Balıktan Baban Çıktı Seçim Penceresi
    window.socket.on('fatherCaughtPrompt', (data) => {
        openFatherCatchModal(data);
    });

    // "Ye" Seçilince Başlayan Çizgi Film Animasyonu
    window.socket.on('fatherEatAnimationStart', (data) => {
        runFatherEatAnimation(data.reward, data.gender, () => {
            if (data.money !== undefined && typeof updateMoneyDisplay === 'function') {
                updateMoneyDisplay(data.money);
            }
        });
    });

    // Mekandaki Aktif Baba Petleri Listesi
    window.socket.on('activeFatherPets', (pets) => {
        let oldPets = window.activeFatherPets || {};
        window.activeFatherPets = {};
        if (Array.isArray(pets)) {
            pets.forEach(p => {
                let existing = oldPets[p.ownerId];
                if (existing) {
                    existing.room = p.room;
                    existing.expiresAt = p.expiresAt;
                    existing.durationMs = p.durationMs;
                    existing.name = p.name;
                    window.activeFatherPets[p.ownerId] = existing;
                } else {
                    window.activeFatherPets[p.ownerId] = p;
                }
            });
        }
        // Eğer kendi petimiz varsa ama listede henüz odaya yansımadıysa koru
        if (typeof myId !== 'undefined' && oldPets[myId] && !window.activeFatherPets[myId]) {
            oldPets[myId].room = (typeof currentRoom !== 'undefined') ? currentRoom : oldPets[myId].room;
            window.activeFatherPets[myId] = oldPets[myId];
        }
    });

    // Yeni Baba Peti Oluştu (Normal veya Oda Değişimi)
    window.socket.on('fatherPetSpawned', (data) => {
        if (data && data.pet) {
            let existing = window.activeFatherPets[data.pet.ownerId];
            if (existing) {
                existing.room = data.pet.room;
                existing.expiresAt = data.pet.expiresAt;
                existing.durationMs = data.pet.durationMs;
                existing.x = data.pet.x;
                existing.y = data.pet.y;
            } else {
                window.activeFatherPets[data.pet.ownerId] = data.pet;
            }
        }
    });

    // Gökten İnen Mucizevi Efekt ile Baba Peti Oluştu
    window.socket.on('fatherMiracleSpawn', (data) => {
        if (data && data.pet) {
            window.activeFatherPets[data.pet.ownerId] = data.pet;
            window.activeMiracleEffects.push(createMiracleEffect(data.pet.x, data.pet.y));
            if (window.playSound) {
                window.playSound('miracle');
            }
        }
    });

    // 30 Saniye Sonra Gelen 700 TL Harçlık
    window.socket.on('fatherPocketMoneyReceived', (data) => {
        showFatherPocketMoneyNotice(data.amount, data.speech);
    });

    // Babanın Konuşma Balonu
    window.socket.on('fatherPetSpeak', (data) => {
        if (data && data.ownerId && window.activeFatherPets[data.ownerId]) {
            let pet = window.activeFatherPets[data.ownerId];
            pet.speech = data.speech;
            pet.speechUntil = Date.now() + 8000;
        }
    });

    // Baba Peti Kaldırıldı
    window.socket.on('fatherPetDespawned', (data) => {
        if (data && data.ownerId) {
            // Oda değişimi sırasında kendi petimizin yanlışlıkla silinmesini önle
            if (data.reason === 'room_change' && typeof myId !== 'undefined' && data.ownerId === myId) {
                return;
            }
            delete window.activeFatherPets[data.ownerId];
        }
    });
}
