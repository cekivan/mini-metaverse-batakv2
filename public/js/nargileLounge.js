// public/js/nargileLounge.js - Otantik Nargile Lounge, Garson Haydar, Duman Partikülleri ve Sipariş Sistemi

// Anlık masalar ve Garson Haydar durumu
window.nargileLoungeState = {};
window.smokeParticles = [];

// Garson Haydar NPC Durumu (Yürüyüş hızı çeyreğe düşürüldü: 0.55!)
const garsonHaydar = {
    active: false,
    x: 740,
    y: 445,
    destX: 740,
    destY: 445,
    speed: 0.55, // Kullanıcı Talebi: "servisleri yapan botun yürüyüş hızını çeyreğe düşür" (2.2 / 4 = 0.55)
    phase: 'idle', // 'walking_to_table', 'serving', 'puffing_and_opening', 'walking_back'
    serviceType: null, // 'serving_nargile', 'serving_fruit', 'changing_coals'
    tableId: null,
    targetTable: null,
    animFrame: 0,
    speechText: null,
    speechTimer: 0,
    actionTimer: 0,
    puffsDone: 0,
    sparkParticles: []
};

// 1. SOKET DİNLEYİCİLERİ
socket.on('nargile_lounge_state_update', (state) => {
    window.nargileLoungeState = state;
    updatePuffButtonVisibility();
});

// Duman Olayı Durumu (20. fırt çekildiğinde tüm ekranı kaplar)
window.nargileScreenSmoke = {
    active: false,
    startTime: 0,
    peakDuration: 8000, // 8 saniye boyunca tam kapalı duman (3 saniye uzatıldı)
    fadeDuration: 9000   // 9 saniye boyunca yavaş yavaş azalarak yok oluş (5 saniye uzatıldı)
};

socket.on('nargile_hose_passed', (data) => {
    if (currentRoom !== 'nargile_cafe') return;
    // Kullanıcı Talebi: "Bir de marpuç devredildi bildirimine gerek yok marpuç sırası gelende aynı oyunlardaki gibi bir bildirim sesi gitsin anlık o kadar."
    if (data.socketId === myId) {
        if (typeof playSound === 'function') {
            playSound('turn');
        } else if (window.playSound) {
            window.playSound('turn');
        }
    }
    updatePuffButtonVisibility();
});

socket.on('nargile_dense_smoke_blast', (data) => {
    if (currentRoom !== 'nargile_cafe') return;
    window.nargileScreenSmoke.active = true;
    window.nargileScreenSmoke.startTime = Date.now();
    window.nargileScreenSmoke.peakDuration = data.durationMs || 5000;
    window.nargileScreenSmoke.fadeDuration = data.fadeMs || 4000;
    if (typeof playSound === 'function') playSound('smokeBlast');
    else if (window.playSound) window.playSound('smokeBlast');
});

socket.on('lounge_coals_burned_out', (data) => {
    if (currentRoom !== 'nargile_cafe') return;
    showNargileHoseToast(`🔥 ${data.msg}`);
    // Eğer oyuncu bu masada oturuyorsa köz yenileme modalını aç
    checkAndPromptCoalRenewal(data.tableId);
});

socket.on('lounge_table_announcement', (data) => {
    if (currentRoom !== 'nargile_cafe') return;
    showNargileHoseToast(data.msg);
});

socket.on('open_nargile_menu', (data) => {
    if (currentRoom !== 'nargile_cafe') return;
    checkAndOpenNargileMenu(data.tableId);
});

socket.on('lounge_error', (msg) => {
    showNargileMenuNotice(msg);
    if (typeof showGameNotification === 'function') {
        showGameNotification(`⚠️ ${msg}`);
    }
});

socket.on('lounge_order_success', (data) => {
    closeNargileMenuModal();
    if (typeof showGameNotification === 'function') {
        showGameNotification(`✅ ${data.message}`);
    }
});

// Garson Haydar'ın Servis Animasyonu
socket.on('garson_haydar_service', (data) => {
    if (currentRoom !== 'nargile_cafe') return;
    startGarsonHaydarService(data.tableId, data.serviceType, data.orderedBy);
});

// Oyuncunun Nargile İçip Duman Üflemesi
socket.on('nargile_player_puffed', (data) => {
    if (currentRoom !== 'nargile_cafe') return;
    playNargileBubbleSound();

    let px = data.x;
    let py = data.y;
    let facing = 'down';
    if (players[data.socketId]) {
        px = players[data.socketId].x;
        py = players[data.socketId].y;
        facing = players[data.socketId].facing || 'down';
    }

    // Gerçekçi yoğun duman bulutu oluştur
    setTimeout(() => {
        createNargileSmokeCloud(px, py - 20, facing, 24);
    }, 400);

    if (data.socketId === myId) {
        showFloatingIcon(myId, '💨');
    }
});

// 2. GARSON HAYDAR SERVİS MOTORU
function startGarsonHaydarService(tableId, serviceType, orderedBy) {
    garsonHaydar.active = true;
    garsonHaydar.x = 740; // En sağ alttaki mutfak kapısı önü
    garsonHaydar.y = 445;
    garsonHaydar.serviceType = serviceType;
    garsonHaydar.tableId = tableId;
    garsonHaydar.phase = 'walking_to_table';
    garsonHaydar.animFrame = 0;
    garsonHaydar.actionTimer = 0;
    garsonHaydar.puffsDone = 0;
    garsonHaydar.sparkParticles = [];

    // Hedef masa koordinatları (Sol Üst Loca ve Sağ Üst Loca Sehpaları)
    if (tableId === 'lounge_sol' || tableId === 'okey101_tekli' || tableId === 'sol') {
        garsonHaydar.destX = 135;
        garsonHaydar.destY = 168;
    } else {
        garsonHaydar.destX = 665;
        garsonHaydar.destY = 168;
    }

    if (serviceType === 'serving_nargile') {
        garsonHaydar.speed = 0.55;
        setHaydarSpeech("Hemen getiriyorum efendim, özel közlü nargileniz hazır!", 7500);
    } else if (serviceType === 'serving_fruit') {
        garsonHaydar.speed = 0.55;
        setHaydarSpeech("Buzlu meyve tabağınız taze taze hazırlandı!", 7500);
    } else if (serviceType === 'changing_coals') {
        garsonHaydar.speed = 0.55;
        setHaydarSpeech("Közmatik hazır, közleri tazelemeye geldim!", 7500);
    } else if (serviceType === 'confiscating_nargile') {
        // Kullanıcı Talebi: Duman oranı tamamen bittiğinde garson yavaş yavaş masaya gelip alsın
        garsonHaydar.speed = 0.75; // Yavaş ve sakin adımlarla masaya yürür
        setHaydarSpeech("Öhö öhö! Ne yaptınız mekana, geliyorum oraya!", 7000);
    }
}

function setHaydarSpeech(text, durationMs = 6000) {
    garsonHaydar.speechText = text;
    garsonHaydar.speechTimer = Date.now() + durationMs;
}

function updateGarsonHaydar() {
    if (!garsonHaydar.active || currentRoom !== 'nargile_cafe') return;

    garsonHaydar.animFrame += 0.15;

    // A) MASAYA YÜRÜYÜŞ
    if (garsonHaydar.phase === 'walking_to_table') {
        let dx = garsonHaydar.destX - garsonHaydar.x;
        let dy = garsonHaydar.destY - garsonHaydar.y;
        let dist = Math.hypot(dx, dy);

        if (dist > garsonHaydar.speed) {
            garsonHaydar.x += (dx / dist) * garsonHaydar.speed;
            garsonHaydar.y += (dy / dist) * garsonHaydar.speed;
        } else {
            garsonHaydar.x = garsonHaydar.destX;
            garsonHaydar.y = garsonHaydar.destY;

            // Masaya vardı!
            if (garsonHaydar.serviceType === 'serving_nargile') {
                garsonHaydar.phase = 'puffing_and_opening';
                garsonHaydar.actionTimer = 0;
                setHaydarSpeech("Nargilenizi getirdim, açmak için iki fırt çekip veriyorum!", 6500);
            } else if (garsonHaydar.serviceType === 'serving_fruit') {
                garsonHaydar.phase = 'serving';
                garsonHaydar.actionTimer = 0;
                setHaydarSpeech("Buzlu meyve tabağınız masanızda, afiyet olsun!", 6500);
            } else if (garsonHaydar.serviceType === 'changing_coals') {
                garsonHaydar.phase = 'serving';
                garsonHaydar.actionTimer = 0;
                setHaydarSpeech("Közler tazelendi, dumanınız eksik olmasın!", 6500);
                // Kıvılcım efekti
                createSparkParticles(garsonHaydar.x, garsonHaydar.y - 25, 20);
            } else if (garsonHaydar.serviceType === 'confiscating_nargile') {
                garsonHaydar.phase = 'confiscating';
                garsonHaydar.actionTimer = 0;
                // Kullanıcı Talebi: Masaya vardığında repliği uzun süre ekranda kalsın
                setHaydarSpeech("STV'YE DÖNDÜRDÜN BURAYI! İÇMESİNİ BİLMİYORSAN VER NARGİLEYİ", 10000);
                if (window.nargileLoungeState && window.nargileLoungeState[garsonHaydar.tableId]) {
                    window.nargileLoungeState[garsonHaydar.tableId].hasNargile = false;
                    window.nargileLoungeState[garsonHaydar.tableId].currentHoseHolder = null;
                }
                updatePuffButtonVisibility();
            }
        }
    }

    // B) NARGİLEYİ AÇMAK İÇİN İKİ FIRT ÇEKİP ÜFLEME
    else if (garsonHaydar.phase === 'puffing_and_opening') {
        garsonHaydar.actionTimer += 1;

        // 1. Fırt (60. karede)
        if (garsonHaydar.actionTimer === 60) {
            playNargileBubbleSound();
            createNargileSmokeCloud(garsonHaydar.x, garsonHaydar.y - 30, 'up', 25);
            setHaydarSpeech("Fııııırrttt... (İlk fırt)", 3500);
        }
        // 2. Fırt (130. karede)
        else if (garsonHaydar.actionTimer === 130) {
            playNargileBubbleSound();
            createNargileSmokeCloud(garsonHaydar.x, garsonHaydar.y - 30, 'up', 30);
            setHaydarSpeech("Fıııırrttt... Dumanı açıldı, buyrun efendim!", 4500);
        }
        // Bitir ve mutfağa dön (210. karede)
        else if (garsonHaydar.actionTimer >= 210) {
            garsonHaydar.phase = 'walking_back';
            garsonHaydar.destX = 740;
            garsonHaydar.destY = 445;
            setHaydarSpeech("Afiyet olsun, bir isteğiniz olursa seslenin!", 7000);
        }
    }

    // C) MEYVE YA DA KÖZ DEĞİŞTİRME SERVİSİ (Yeterli bekleme: 120 kare)
    else if (garsonHaydar.phase === 'serving') {
        garsonHaydar.actionTimer += 1;
        if (garsonHaydar.actionTimer >= 120) {
            garsonHaydar.phase = 'walking_back';
            garsonHaydar.destX = 740;
            garsonHaydar.destY = 445;
            setHaydarSpeech("Afiyet olsun, bir isteğiniz olursa seslenin!", 7000);
        }
    }

    // C.2) NARGİLEYE EL KOYMA (STV'YE DÖNDÜRDÜN BURAYI!)
    else if (garsonHaydar.phase === 'confiscating') {
        garsonHaydar.actionTimer += 1;
        // Masada oyuncunun okuyabileceği kadar uzun (180 frame / ~3 sn) beklesin
        if (garsonHaydar.actionTimer >= 180) {
            garsonHaydar.phase = 'walking_back';
            garsonHaydar.destX = 740;
            garsonHaydar.destY = 445;
            garsonHaydar.speed = 0.75;
            setHaydarSpeech("STV'YE DÖNDÜRDÜN BURAYI! İÇMESİNİ BİLMİYORSAN VER NARGİLEYİ", 10000);
        }
    }

    // D) MUTFAĞA GERİ YÜRÜYÜŞ
    else if (garsonHaydar.phase === 'walking_back') {
        let dx = garsonHaydar.destX - garsonHaydar.x;
        let dy = garsonHaydar.destY - garsonHaydar.y;
        let dist = Math.hypot(dx, dy);

        if (dist > garsonHaydar.speed) {
            garsonHaydar.x += (dx / dist) * garsonHaydar.speed;
            garsonHaydar.y += (dy / dist) * garsonHaydar.speed;
        } else {
            // Mutfak kapısından içeri girdi ve kayboldu!
            garsonHaydar.active = false;
            garsonHaydar.phase = 'idle';
            garsonHaydar.speechText = null;
        }
    }
}

// 3. GARSON HAYDAR'IN ÇİZİMİ (Lüks Takım Elbiseli / Smokinli Garson)
function drawGarsonHaydar(ctx) {
    if (!garsonHaydar.active || currentRoom !== 'nargile_cafe') return;

    ctx.save();
    let gx = garsonHaydar.x;
    let gy = garsonHaydar.y;

    // Yürüyüş ritmi (Ağırbaşlı ve asil adımlar)
    let walkBob = Math.sin(garsonHaydar.animFrame * 2) * 1.6;
    let legSwing = Math.sin(garsonHaydar.animFrame * 2) * 6;

    // Ayak altı gölgesi
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.beginPath();
    ctx.ellipse(gx, gy + 14, 13, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Takım Elbise Pantolonu ve Ayakkabılar (Siyah şık kumaş pantolon)
    ctx.strokeStyle = "#090d16";
    ctx.lineWidth = 4.5;
    ctx.lineCap = "round";
    // Sol bacak
    ctx.beginPath();
    ctx.moveTo(gx - 4, gy + 2);
    ctx.lineTo(gx - 4 - legSwing * 0.35, gy + 12);
    ctx.stroke();
    // Sağ bacak
    ctx.beginPath();
    ctx.moveTo(gx + 4, gy + 2);
    ctx.lineTo(gx + 4 + legSwing * 0.35, gy + 12);
    ctx.stroke();

    // Parlak Deri Kundura Ayakkabılar
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.ellipse(gx - 5 - legSwing * 0.35, gy + 13, 3.5, 2, 0, 0, Math.PI * 2);
    ctx.ellipse(gx + 5 + legSwing * 0.35, gy + 13, 3.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Ayakkabı parıltısı
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.fillRect(gx - 6 - legSwing * 0.35, gy + 12, 2, 1);
    ctx.fillRect(gx + 4 + legSwing * 0.35, gy + 12, 2, 1);

    // SMOKİN / TAKIM ELBİSE GÖVDESİ (Tuxedo Jacket)
    // Beyaz Pilili Smokin Gömleği (Tuxedo Shirt)
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(gx - 8, gy - 13 + walkBob, 16, 17, 3);
    ctx.fill();

    // Siyah Smokin Ceketi (İki yandan kapalı, V yaka açık)
    ctx.fillStyle = "#090d16";
    // Sol ceket kanadı
    ctx.beginPath();
    ctx.moveTo(gx - 8, gy - 13 + walkBob);
    ctx.lineTo(gx - 2, gy - 13 + walkBob);
    ctx.lineTo(gx - 4, gy + 4 + walkBob);
    ctx.lineTo(gx - 8, gy + 4 + walkBob);
    ctx.closePath();
    ctx.fill();
    // Sağ ceket kanadı
    ctx.beginPath();
    ctx.moveTo(gx + 8, gy - 13 + walkBob);
    ctx.lineTo(gx + 2, gy - 13 + walkBob);
    ctx.lineTo(gx + 4, gy + 4 + walkBob);
    ctx.lineTo(gx + 8, gy + 4 + walkBob);
    ctx.closePath();
    ctx.fill();

    // Saten Yaka (Lapels) Işıltısı
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx - 2, gy - 13 + walkBob);
    ctx.lineTo(gx - 4, gy + 4 + walkBob);
    ctx.moveTo(gx + 2, gy - 13 + walkBob);
    ctx.lineTo(gx + 4, gy + 4 + walkBob);
    ctx.stroke();

    // Siyah Papyon (Bow Tie)
    ctx.fillStyle = "#090d16";
    ctx.beginPath();
    ctx.moveTo(gx - 4, gy - 11 + walkBob);
    ctx.lineTo(gx + 4, gy - 9 + walkBob);
    ctx.lineTo(gx + 4, gy - 11 + walkBob);
    ctx.lineTo(gx - 4, gy - 9 + walkBob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#facc15"; // Papyon ortası altın toka
    ctx.beginPath(); ctx.arc(gx, gy - 10 + walkBob, 1.2, 0, Math.PI * 2); ctx.fill();

    // Beyaz İpek Mendil (Pocket Square - Sol Göğüs Cebi)
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(gx - 6, gy - 6 + walkBob);
    ctx.lineTo(gx - 4, gy - 8 + walkBob);
    ctx.lineTo(gx - 3, gy - 6 + walkBob);
    ctx.closePath();
    ctx.fill();

    // Kol Üzerinde Dökümlü Beyaz Garson Servis Peçetesi (Torşon)
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.roundRect(gx - 11, gy - 4 + walkBob, 4, 11, 2);
    ctx.fill();
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Kafa & Boyun
    ctx.fillStyle = "#ffd1a4";
    ctx.beginPath();
    ctx.arc(gx, gy - 19 + walkBob, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // Saç (Siyah jöleli/taralı şık beyefendi saçı)
    ctx.fillStyle = "#090d16";
    ctx.beginPath();
    ctx.arc(gx, gy - 22 + walkBob, 7.5, Math.PI, Math.PI * 2);
    ctx.fill();

    // Bıyık (Düzgün taranmış şık bıyık)
    ctx.strokeStyle = "#090d16";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(gx - 4, gy - 17 + walkBob);
    ctx.quadraticCurveTo(gx, gy - 15 + walkBob, gx + 4, gy - 17 + walkBob);
    ctx.stroke();

    // Gözler
    ctx.fillStyle = "#090d16";
    ctx.fillRect(gx - 3, gy - 20 + walkBob, 1.5, 1.5);
    ctx.fillRect(gx + 1.5, gy - 20 + walkBob, 1.5, 1.5);

    // İSİM ROZETİ: 🤵 Garson Haydar
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.beginPath();
    ctx.roundRect(gx - 38, gy - 36 + walkBob, 76, 15, 4);
    ctx.fill();
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = "#facc15";
    ctx.font = "bold 9.5px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🤵 Garson Haydar", gx, gy - 25 + walkBob);

    // ELİNDEKİ TEPSİ / NARGİLE / KÖZMATİK ÇİZİMİ
    if (garsonHaydar.phase === 'walking_to_table') {
        if (garsonHaydar.serviceType === 'serving_nargile') {
            // Elinde lüks dumanı tüten nargile taşıyor
            drawMiniCarriedNargile(ctx, gx + 11, gy - 12 + walkBob);
        } else if (garsonHaydar.serviceType === 'serving_fruit') {
            // Elinde gümüş meyve tepsisi taşıyor
            drawMiniCarriedFruitTray(ctx, gx + 11, gy - 12 + walkBob);
        } else if (garsonHaydar.serviceType === 'changing_coals') {
            // Elinde közmatik taşıyor
            drawMiniCarriedKozmatik(ctx, gx + 11, gy - 12 + walkBob);
        }
    } else if (garsonHaydar.phase === 'walking_back' || garsonHaydar.phase === 'confiscating') {
        if (garsonHaydar.serviceType === 'confiscating_nargile') {
            // Müsadere ettiği nargileyi elinde mutfağa geri taşıyor
            drawMiniCarriedNargile(ctx, gx + 11, gy - 12 + walkBob);
        }
    }

    // KONUŞMA BALONU (Net, geniş ve uzun süreli okunabilir)
    if (garsonHaydar.speechText && Date.now() < garsonHaydar.speechTimer) {
        ctx.font = "bold 11px sans-serif";
        let textWidth = ctx.measureText(garsonHaydar.speechText).width;
        let bubbleW = textWidth + 22;
        let bubbleH = 26;
        let bx = gx - bubbleW / 2;
        let by = gy - 66 + walkBob;

        ctx.fillStyle = "rgba(15, 23, 42, 0.96)";
        ctx.beginPath();
        ctx.roundRect(bx, by, bubbleW, bubbleH, 8);
        ctx.fill();
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Baloncuk ucu
        ctx.fillStyle = "rgba(15, 23, 42, 0.96)";
        ctx.beginPath();
        ctx.moveTo(gx - 5, by + bubbleH);
        ctx.lineTo(gx, by + bubbleH + 7);
        ctx.lineTo(gx + 5, by + bubbleH);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(garsonHaydar.speechText, gx, by + 17);
    }

    ctx.restore();
}

function drawMiniCarriedNargile(ctx, x, y) {
    // Cam şişe
    ctx.fillStyle = "#0284c7";
    ctx.beginPath(); ctx.arc(x, y + 4, 6, 0, Math.PI * 2); ctx.fill();
    // Metal gövde
    ctx.strokeStyle = "#d97706"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x, y - 8); ctx.stroke();
    // Köz tablası
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(x - 4, y - 10, 8, 3);
}

function drawMiniCarriedFruitTray(ctx, x, y) {
    ctx.fillStyle = "#cbd5e1";
    ctx.beginPath(); ctx.ellipse(x, y + 2, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    // Karpuz dilimi
    ctx.fillStyle = "#ef4444";
    ctx.beginPath(); ctx.arc(x - 2, y, 4, 0, Math.PI); ctx.fill();
    // Üzüm
    ctx.fillStyle = "#9333ea";
    ctx.beginPath(); ctx.arc(x + 3, y - 1, 2.5, 0, Math.PI * 2); ctx.fill();
}

function drawMiniCarriedKozmatik(ctx, x, y) {
    // Közmatik demir sapı ve kovası
    ctx.strokeStyle = "#334155"; ctx.lineWidth = 1.5;
    ctx.strokeRect(x - 4, y - 6, 8, 9);
    // İçindeki kor gibi yanan kömürler
    ctx.fillStyle = "#ea580c";
    ctx.fillRect(x - 3, y - 5, 6, 4);
    ctx.fillStyle = "#facc15";
    ctx.fillRect(x - 2, y - 4, 4, 2);
}

// 4. GERÇEKÇİ DUMAN PARTİKÜL SİSTEMİ
function createNargileSmokeCloud(x, y, facing = 'down', count = 22) {
    let baseVx = 0;
    if (facing === 'left') baseVx = -0.8;
    else if (facing === 'right') baseVx = 0.8;

    for (let i = 0; i < count; i++) {
        let spreadX = (Math.random() - 0.5) * 8;
        let spreadY = (Math.random() - 0.5) * 6;
        let life = 140 + Math.random() * 60; // ~2.5 - 3.5 saniye

        window.smokeParticles.push({
            x: x + spreadX,
            y: y + spreadY,
            vx: baseVx + (Math.random() - 0.5) * 0.9,
            vy: -0.6 - Math.random() * 0.8, // Yukarı süzülme
            radius: 4 + Math.random() * 3,
            maxRadius: 18 + Math.random() * 12,
            growth: 0.12 + Math.random() * 0.08,
            alpha: 0.85,
            decay: 0.85 / life,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.03
        });
    }
}

function createSparkParticles(x, y, count = 16) {
    for (let i = 0; i < count; i++) {
        let angle = Math.random() * Math.PI * 2;
        let speed = 1.5 + Math.random() * 3;
        garsonHaydar.sparkParticles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.2,
            life: 25 + Math.random() * 15,
            color: Math.random() > 0.5 ? '#facc15' : '#ea580c'
        });
    }
}

function updateAndDrawSmokeParticles(ctx) {
    // 1. Duman Partikülleri
    for (let i = window.smokeParticles.length - 1; i >= 0; i--) {
        let p = window.smokeParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy *= 0.98; // Hava direnci
        p.vx += (Math.random() - 0.5) * 0.06; // Hafif türbülans
        p.radius = Math.min(p.maxRadius, p.radius + p.growth);
        p.alpha -= p.decay;
        p.rotation += p.rotSpeed;

        if (p.alpha <= 0.01) {
            window.smokeParticles.splice(i, 1);
            continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        let grad = ctx.createRadialGradient(0, 0, p.radius * 0.1, 0, 0, p.radius);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        grad.addColorStop(0.5, 'rgba(241, 245, 249, 0.7)');
        grad.addColorStop(0.85, 'rgba(203, 213, 225, 0.35)');
        grad.addColorStop(1, 'rgba(148, 163, 184, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // 2. Köz Kıvılcım Partikülleri
    for (let i = garsonHaydar.sparkParticles.length - 1; i >= 0; i--) {
        let sp = garsonHaydar.sparkParticles[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vy += 0.1; // Yerçekimi
        sp.life--;

        if (sp.life <= 0) {
            garsonHaydar.sparkParticles.splice(i, 1);
            continue;
        }

        ctx.save();
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// 5. MASANIN ÜSTÜNDEKİ GERÇEKÇİ NARGİLE VE MEYVE TABAĞI ÇİZİMİ
function drawTableActiveItems(ctx, tableId, tableX, tableY, tableW, tableH) {
    const tableInfo = window.nargileLoungeState[tableId];
    if (!tableInfo) return;

    let centerX = tableX + tableW / 2;
    let centerY = tableY + tableH / 2;

    // A) MEYVE TABAĞI (Masada meyve varsa, merkezin solunda durur)
    if (tableInfo.hasFruit) {
        let fx = tableInfo.hasNargile ? (centerX - 35) : centerX;
        let fy = centerY;
        drawRealisticFruitPlatter(ctx, fx, fy);
    }

    // B) GERÇEKÇİ NARGİLE (Masada nargile varsa, merkezin sağında durur)
    if (tableInfo.hasNargile) {
        let nx = tableInfo.hasFruit ? (centerX + 35) : centerX;
        let ny = centerY;
        drawRealisticTableNargile(ctx, nx, ny, tableInfo);
    }
}

function drawRealisticFruitPlatter(ctx, x, y) {
    ctx.save();

    // Gölge
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(x, y + 8, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Gümüş Oval Tepsi
    ctx.fillStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.ellipse(x, y, 20, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Parlak yansıma
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.beginPath();
    ctx.arc(x - 8, y - 3, 5, Math.PI * 0.8, Math.PI * 1.6);
    ctx.stroke();

    // Karpuz Dilimi
    ctx.fillStyle = "#15803d"; // Kabuk
    ctx.beginPath();
    ctx.arc(x - 5, y - 2, 9, 0.1, Math.PI * 0.9);
    ctx.fill();
    ctx.fillStyle = "#ef4444"; // Etli kısım
    ctx.beginPath();
    ctx.arc(x - 5, y - 3, 7.5, 0.1, Math.PI * 0.9);
    ctx.fill();
    // Karpuz çekirdekleri
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(x - 7, y, 1, 1.5);
    ctx.fillRect(x - 3, y - 1, 1, 1.5);

    // Sarı Kavun Dilimi
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(x + 6, y - 1, 7, Math.PI * 0.7, Math.PI * 1.8);
    ctx.fill();

    // Mor Üzüm Tanesi Salkımı
    ctx.fillStyle = "#7e22ce";
    ctx.beginPath(); ctx.arc(x + 2, y + 3, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 6, y + 4, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 4, y + 6, 2, 0, Math.PI * 2); ctx.fill();

    // Çilek
    ctx.fillStyle = "#dc2626";
    ctx.beginPath(); ctx.arc(x - 3, y + 4, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#22c55e"; // Yaprak
    ctx.fillRect(x - 4, y + 1, 2, 1.5);

    // Buz Küpleri
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.fillRect(x - 1, y - 5, 3.5, 3.5);
    ctx.fillRect(x + 4, y - 6, 3, 3);

    ctx.restore();
}

function drawRealisticTableNargile(ctx, x, y, tableInfo) {
    ctx.save();
    let isBurned = tableInfo.isCoalBurnedOut;

    // 1. Masa Üzerindeki Nargile Gölgesi
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    ctx.ellipse(x, y + 12, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Cam Şişe (Buzlu cam su gövdesi & animasyonlu hava kabarcıkları)
    let bottleGrad = ctx.createRadialGradient(x - 3, y + 4, 2, x, y + 4, 14);
    bottleGrad.addColorStop(0, '#38bdf8');
    bottleGrad.addColorStop(0.6, '#0284c7');
    bottleGrad.addColorStop(1, '#075985');

    ctx.fillStyle = bottleGrad;
    ctx.beginPath();
    ctx.arc(x, y + 4, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Su içindeki hava kabarcıkları animasyonu
    let bubbleAnim = (Date.now() / 250) % 8;
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.beginPath(); ctx.arc(x - 4, y + 8 - bubbleAnim, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 3, y + 9 - ((bubbleAnim + 4) % 8), 1.2, 0, Math.PI * 2); ctx.fill();

    // 3. Pirinç/Altın İşlemeli Ser (Gövde Borusu)
    ctx.fillStyle = "#d97706";
    ctx.fillRect(x - 2.5, y - 18, 5, 18);
    // Gövde boğumu (Altın küre)
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath(); ctx.arc(x, y - 9, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#78350f"; ctx.lineWidth = 0.8; ctx.stroke();

    // 4. Metal Köz Tepsisi (Tabla)
    ctx.fillStyle = "#94a3b8";
    ctx.beginPath(); ctx.ellipse(x, y - 18, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#475569"; ctx.lineWidth = 1; ctx.stroke();

    // 5. Kil Lüle (Başlık)
    ctx.fillStyle = "#b45309";
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 18);
    ctx.lineTo(x - 8, y - 27);
    ctx.lineTo(x + 8, y - 27);
    ctx.lineTo(x + 6, y - 18);
    ctx.closePath();
    ctx.fill();

    // 6. Közler (Aktif ise alevli kırmızı-turuncu kor, sönmüşse gri kül)
    if (!isBurned) {
        // Kor Kömür Küpleri (Pulsing Glow)
        let glowPulse = 0.8 + Math.sin(Date.now() / 200) * 0.2;
        ctx.fillStyle = "rgba(239, 68, 68, " + (glowPulse * 0.4) + ")";
        ctx.beginPath(); ctx.arc(x, y - 29, 10, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = "#ea580c";
        ctx.fillRect(x - 5, y - 31, 4.5, 4);
        ctx.fillRect(x + 1, y - 31, 4.5, 4);
        ctx.fillStyle = "#facc15"; // Közün sıcak iç kısmı
        ctx.fillRect(x - 4, y - 30, 2.5, 2);
        ctx.fillRect(x + 2, y - 30, 2.5, 2);

        // Lüleden tüten ince tütsü dumanı
        let wispY = (Date.now() / 80) % 15;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y - 32);
        ctx.quadraticCurveTo(x + 4, y - 36 - wispY * 0.5, x - 2, y - 40 - wispY);
        ctx.stroke();
    } else {
        // Sönmüş kül rengi közler
        ctx.fillStyle = "#475569";
        ctx.fillRect(x - 5, y - 31, 4.5, 4);
        ctx.fillRect(x + 1, y - 31, 4.5, 4);
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(x - 4, y - 30, 2.5, 2);
        ctx.fillRect(x + 2, y - 30, 2.5, 2);

        // "KÖZ BİTTİ" UYARI ROZETİ
        ctx.fillStyle = "rgba(220, 38, 38, 0.9)";
        ctx.beginPath(); ctx.roundRect(x - 28, y - 46, 56, 14, 4); ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 8px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🔥 KÖZ BİTTİ!", x, y - 36);
    }

    // 7. Marpuç (Hortum): Nargileden masaya ve marpucu tutan oyuncuya doğru kıvrılan deri hortum
    ctx.strokeStyle = "#991b1b"; // Bordo deri hortum
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 2);
    ctx.bezierCurveTo(x - 22, y + 10, x - 18, y + 26, x - 6, y + 22);
    ctx.stroke();

    // Altın Marpuç Ucu
    ctx.fillStyle = "#facc15";
    ctx.fillRect(x - 6, y + 20, 6, 4);

    ctx.restore();
}

// 6. KULLANICI ARAYÜZÜ (MODALLAR, BUTONLAR VE UYARILAR)
function checkAndOpenNargileMenu(tableId) {
    if (!tableId || tableId === 'okey101_tekli' || tableId === 'sol') tableId = 'lounge_sol';
    if (tableId === 'okey101' || tableId === 'sag') tableId = 'lounge_sag';
    const modal = document.getElementById('nargileMenuModal');
    if (!modal) return;

    // Her menü açılışında en taze masa durumunu sorgula
    if (window.socket) {
        window.socket.emit('get_nargile_lounge_state');
    }

    const tableInfo = (window.nargileLoungeState && window.nargileLoungeState[tableId]) ? window.nargileLoungeState[tableId] : null;
    document.getElementById('nargileMenuTableId').value = tableId;
    
    const defaultName = (tableId === 'lounge_sag' ? '🛋️ Sağ Üst Nargile Locası' : '🛋️ Sol Üst Nargile Locası');
    document.getElementById('nargileMenuTableName').innerText = tableInfo ? tableInfo.name : defaultName;

    // Varsa önceki uyarıyı temizle
    const notice = document.getElementById('nargileMenuNotice');
    if (notice) notice.style.display = 'none';

    const btnNargile = document.getElementById('btnOrderNargile');
    const btnFruit = document.getElementById('btnOrderFruit');

    if (tableInfo && tableInfo.hasNargile) {
        btnNargile.style.opacity = '0.65';
        btnNargile.style.background = 'linear-gradient(135deg, #334155, #1e293b)';
        btnNargile.innerHTML = `
            <span style="display: flex; align-items: center; gap: 8px;">💨 Masada Zaten Nargile Var (Aktif)</span>
            <span style="background: rgba(239,68,68,0.25); border: 1px solid #ef4444; padding: 4px 10px; border-radius: 8px; color: #fca5a5; font-size: 11px; font-weight: 900;">MASADA VAR</span>
        `;
    } else {
        btnNargile.style.opacity = '1';
        btnNargile.style.background = 'linear-gradient(135deg, #8b5cf6, #6d28d9)';
        btnNargile.innerHTML = `
            <span style="display: flex; align-items: center; gap: 8px;">💨 Ortak Nargile Söyle (10 Dk)</span>
            <span style="background: rgba(0,0,0,0.3); padding: 4px 10px; border-radius: 8px; color: #fde047; font-weight: 900;">700 TL</span>
        `;
    }

    if (tableInfo && tableInfo.hasFruit) {
        btnFruit.style.opacity = '0.65';
        btnFruit.style.background = 'linear-gradient(135deg, #334155, #1e293b)';
        btnFruit.innerHTML = `
            <span style="display: flex; align-items: center; gap: 8px;">🍉 Masada Zaten Meyve Tabağı Var</span>
            <span style="background: rgba(239,68,68,0.25); border: 1px solid #ef4444; padding: 4px 10px; border-radius: 8px; color: #fca5a5; font-size: 11px; font-weight: 900;">MASADA VAR</span>
        `;
    } else {
        btnFruit.style.opacity = '1';
        btnFruit.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        btnFruit.innerHTML = `
            <span style="display: flex; align-items: center; gap: 8px;">🍉 Buzlu Meyve Tabağı Söyle (10 Dk)</span>
            <span style="background: rgba(0,0,0,0.3); padding: 4px 10px; border-radius: 8px; color: #fde047; font-weight: 900;">500 TL</span>
        `;
    }

    modal.style.display = 'flex';
}

function submitLoungeOrder(itemType) {
    let rawTableId = document.getElementById('nargileMenuTableId').value || 'lounge_sol';
    let tableId = rawTableId;
    if (rawTableId === 'okey101_tekli' || rawTableId === 'sol') tableId = 'lounge_sol';
    if (rawTableId === 'okey101' || rawTableId === 'sag') tableId = 'lounge_sag';
    const tableInfo = (window.nargileLoungeState && window.nargileLoungeState[tableId]) ? window.nargileLoungeState[tableId] : null;

    if (itemType === 'nargile' && tableInfo && tableInfo.hasNargile) {
        showNargileMenuNotice("⚠️ Masanızda zaten aktif bir nargile var! Başka bir nargile isteyemezsiniz.");
        return;
    }
    if (itemType === 'fruit' && tableInfo && tableInfo.hasFruit) {
        showNargileMenuNotice("⚠️ Masanızda zaten bir meyve tabağı var!");
        return;
    }

    socket.emit('nargile_order_item', { tableId: tableId, item: itemType });
}

function showNargileMenuNotice(msg) {
    const notice = document.getElementById('nargileMenuNotice');
    if (notice) {
        notice.innerText = msg;
        notice.style.display = 'block';
    }
    showNargileHoseToast(msg);
}

function join101FromLounge() {
    const tableId = document.getElementById('nargileMenuTableId').value || 'okey101_tekli';
    closeNargileMenuModal();
    if (window.socket) {
        window.socket.emit('requestTableOptions', tableId);
    }
}

function closeNargileMenuModal() {
    const modal = document.getElementById('nargileMenuModal');
    if (modal) modal.style.display = 'none';
}

function checkAndPromptCoalRenewal(tableId) {
    const modal = document.getElementById('nargileCoalsPromptModal');
    if (!modal) return;
    document.getElementById('nargileCoalTableId').value = tableId;
    modal.style.display = 'flex';
}

function submitRenewCoals() {
    const tableId = document.getElementById('nargileCoalTableId').value;
    if (!tableId) return;
    socket.emit('nargile_renew_coals', { tableId: tableId });
    closeNargileCoalsModal();
}

function submitLeaveNargile() {
    const tableId = document.getElementById('nargileCoalTableId').value;
    if (!tableId) return;
    socket.emit('nargile_leave_nargile', { tableId: tableId });
    closeNargileCoalsModal();
}

function closeNargileCoalsModal() {
    const modal = document.getElementById('nargileCoalsPromptModal');
    if (modal) modal.style.display = 'none';
}

// 7. FIRT ÇEKME BUTONU (Puff Button)
function updatePuffButtonVisibility() {
    const btn = document.getElementById('btnPuffNargileContainer');
    if (!btn) return;

    if (currentRoom !== 'nargile_cafe') {
        btn.style.display = 'none';
        return;
    }

    let isMyTurnToPuff = false;
    let secLeft = 60;
    for (const t of Object.values(window.nargileLoungeState)) {
        if (t.hasNargile && !t.isCoalBurnedOut && t.currentHoseHolder === myId) {
            isMyTurnToPuff = true;
            secLeft = t.hoseSecondsLeft || 60;
            break;
        }
    }

    if (isMyTurnToPuff) {
        btn.style.display = 'flex';
        const txt = document.getElementById('puffCountdownSec');
        if (txt) txt.innerText = `${secLeft}s`;
    } else {
        btn.style.display = 'none';
    }
}

function triggerMyNargilePuff() {
    for (const [tid, t] of Object.entries(window.nargileLoungeState)) {
        if (t.hasNargile && t.currentHoseHolder === myId) {
            socket.emit('nargile_puff', { tableId: tid });
            break;
        }
    }
}

// 8. MUTFAK KAPISI UYARISI
function showKitchenStaffOnlyNotice() {
    if (typeof showGameNotification === 'function') {
        showGameNotification("⛔ Sadece mutfak görevlileri ve personel girebilir!");
    } else {
        showNargileHoseToast("⛔ Sadece mutfak görevlileri ve personel girebilir!");
    }
}

function showNargileHoseToast(msg) {
    const toast = document.getElementById('nargileHoseToast');
    if (!toast) return;
    toast.innerText = msg;
    toast.style.display = 'block';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.style.display = 'none';
    }, 4500);
}

function playNargileBubbleSound() {
    try {
        if (typeof audioCtx !== 'undefined' && audioCtx) {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            let osc = audioCtx.createOscillator();
            let gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(140 + Math.random() * 80, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(320 + Math.random() * 60, audioCtx.currentTime + 0.18);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.18);
        }
    } catch (e) {}
}

// 9. TÜM EKRANI KAPLAYAN YOĞUN DUMAN BULUTU (20. FIRT ÖZEL EFEKTİ)
function drawNargileScreenSmoke(ctx) {
    if (!window.nargileScreenSmoke || !window.nargileScreenSmoke.active) return;
    if (currentRoom !== 'nargile_cafe') return;

    let elapsed = Date.now() - window.nargileScreenSmoke.startTime;
    let peak = window.nargileScreenSmoke.peakDuration || 5000;
    let fade = window.nargileScreenSmoke.fadeDuration || 4000;
    let total = peak + fade;

    if (elapsed >= total) {
        window.nargileScreenSmoke.active = false;
        return;
    }

    let alpha = 1.0;
    if (elapsed > peak) {
        let progress = (elapsed - peak) / fade;
        let rawAlpha = Math.max(0, 1.0 - progress);
        // Kullanıcı Talebi: Duman yavaş yavaş yüzde 90, 80, 70 şeklinde azalsın
        alpha = Math.min(1.0, Math.ceil(rawAlpha * 10) / 10);
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    // 1. Zemin: Kalın, opak beyazımsı gri sis
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Swirling Hacimli Duman Katmanları (Kimse birbirini göremez)
    let t = Date.now() / 900;
    for (let i = 0; i < 15; i++) {
        let cx = (canvas.width / 5) * (i % 5) + Math.sin(t + i * 1.3) * 55 + 40;
        let cy = (canvas.height / 3) * Math.floor(i / 5) + Math.cos(t * 0.9 + i * 1.1) * 40 + 40;
        let rad = 180 + Math.sin(t + i * 2) * 50;

        let grad = ctx.createRadialGradient(cx, cy, rad * 0.15, cx, cy, rad);
        grad.addColorStop(0, "rgba(255, 255, 255, 0.98)");
        grad.addColorStop(0.4, "rgba(241, 245, 249, 0.94)");
        grad.addColorStop(0.8, "rgba(203, 213, 225, 0.65)");
        grad.addColorStop(1, "rgba(148, 163, 184, 0.1)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill();
    }

    // 3. Kullanıcı Talebi: "20 fırt çektikten sonra herhangi bir yazı çıkmasın." - Yazı kaldırıldı.

    ctx.restore();
}

window.checkAndOpenNargileMenu = checkAndOpenNargileMenu;
window.submitLoungeOrder = submitLoungeOrder;
window.closeNargileMenuModal = closeNargileMenuModal;
window.submitRenewCoals = submitRenewCoals;
window.submitLeaveNargile = submitLeaveNargile;
window.closeNargileCoalsModal = closeNargileCoalsModal;
window.triggerMyNargilePuff = triggerMyNargilePuff;
window.showKitchenStaffOnlyNotice = showKitchenStaffOnlyNotice;
window.updateGarsonHaydar = updateGarsonHaydar;
window.drawGarsonHaydar = drawGarsonHaydar;
window.updateAndDrawSmokeParticles = updateAndDrawSmokeParticles;
window.drawTableActiveItems = drawTableActiveItems;
window.join101FromLounge = join101FromLounge;
window.showNargileMenuNotice = showNargileMenuNotice;
window.drawNargileScreenSmoke = drawNargileScreenSmoke;
