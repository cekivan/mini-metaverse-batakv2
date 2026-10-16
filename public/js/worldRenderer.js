// public/js/worldRenderer.js - Metaverse Haritaları, Zemin Önbellekleme ve Çarpışma Motoru
if (typeof window.isNightMode === 'undefined') window.isNightMode = false;
if (typeof window.canvasMouseX === 'undefined') window.canvasMouseX = -1;
if (typeof window.canvasMouseY === 'undefined') window.canvasMouseY = -1;

// --- 8.9 STATİK ARKA PLAN ÖNBELLEKLEME MOTORU (OFFSCREEN CANVAS CACHE) ---
const bgCache = {
    canvas: null,
    ctx: null,
    currentKey: '',
    isValid: false,

    getCanvas(roomKey, width, height) {
        let isNight = (typeof isNightMode !== 'undefined' ? isNightMode : (window.isNightMode || false));
        let key = `${roomKey}_${width}x${height}_${isNight ? 'night' : 'day'}`;
        if (this.isValid && this.currentKey === key && this.canvas) {
            return this.canvas;
        }
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
        }
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext('2d');
        this.currentKey = key;
        this.isValid = true;

        renderStaticRoomTo(this.ctx, roomKey, width, height);
        return this.canvas;
    },

    invalidate() {
        this.isValid = false;
    }
};
window.invalidateBgCache = () => bgCache.invalidate();

function renderStaticRoomTo(bctx, room, width, height) {
    if (room === 'kafe') {
        renderStaticCafeTo(bctx, width, height);
    } else if (room === 'sokak') {
        renderStaticStreetTo(bctx, width, height);
    } else if (room === 'sahil') {
        renderStaticBeachTo(bctx, width, height);
    } else if (room === 'nargile_cafe') {
        renderStaticNargileCafeTo(bctx, width, height);
    } else if (room === 'market') {
        renderStaticMarketTo(bctx, width, height);
    } else if (room === 'ganyan') {
        renderStaticGanyanTo(bctx, width, height);
    } else if (room === 'cadde') {
        renderStaticCaddeTo(bctx, width, height);
    } else if (room === 'dedenin_yeri') {
        renderStaticDedeninYeriTo(bctx, width, height);
    } else if (room === 'emlakci') {
        renderStaticEmlakciTo(bctx, width, height);
    } else if (room.startsWith('house_')) {
        let type = room.replace('house_', '');
        if (typeof renderStaticHouseTo === 'function') {
            renderStaticHouseTo(bctx, type, width, height);
        }
    }
}

function renderStaticCafeTo(bctx, width, height) {
    // 1. Zengin Ahşap Parke Zemin (Tüm geniş salon boyunca)
    bctx.fillStyle = "#2d1810";
    bctx.fillRect(0, 0, width, height);

    bctx.strokeStyle = "rgba(0,0,0,0.3)";
    bctx.lineWidth = 1;
    for (let y = 0; y < height; y += 26) {
        bctx.beginPath(); bctx.moveTo(0, y); bctx.lineTo(width, y); bctx.stroke();
        let offset = (y / 26) % 2 === 0 ? 0 : 42;
        for (let x = offset; x < width; x += 85) {
            bctx.beginPath(); bctx.moveTo(x, y); bctx.lineTo(x, y + 26); bctx.stroke();
        }
    }

    // 2. Kırmızı Anadolu Kilimi (Batak Masaları Alanı - Sağ Bölüm)
    // Ortadaki alan tamamen açık ve ferah; Batak masaları sağ tarafta görkemli kilim üzerinde
    bctx.fillStyle = "#7f1d1d";
    bctx.beginPath();
    bctx.roundRect(565, 60, 185, 340, 14);
    bctx.fill();
    bctx.strokeStyle = "#d97706";
    bctx.lineWidth = 2.5;
    bctx.stroke();

    // Kilim Saçakları ve Geleneksel Anadolu Motifleri
    bctx.strokeStyle = "rgba(254, 240, 138, 0.35)";
    bctx.lineWidth = 1;
    for (let hx = 580; hx <= 730; hx += 30) {
        bctx.strokeRect(hx, 68, 20, 16);
        bctx.strokeRect(hx, 376, 20, 16);
    }

    // 3. Bar / Çay Ocağı Tezgahı (Sol Üst)
    bctx.fillStyle = "rgba(0,0,0,0.3)";
    bctx.fillRect(25, 20, 230, 48);
    bctx.fillStyle = "#5c2c16";
    bctx.beginPath();
    bctx.roundRect(20, 15, 230, 45, 8);
    bctx.fill();
    bctx.strokeStyle = "#8b4513";
    bctx.lineWidth = 2;
    bctx.stroke();

    // Bar üstü bakır semaver ve fincanlar
    bctx.fillStyle = "#b45309";
    bctx.beginPath();
    bctx.roundRect(45, 18, 24, 28, 4);
    bctx.fill();
    bctx.fillStyle = "#facc15";
    bctx.fillRect(52, 14, 10, 4);
    bctx.fillRect(39, 32, 6, 4);

    // Çay bardakları
    bctx.fillStyle = "#ef4444";
    bctx.fillRect(80, 28, 8, 12);
    bctx.fillRect(95, 28, 8, 12);

    // Bar tabelası
    bctx.fillStyle = "#fef08a";
    bctx.font = "bold 11px sans-serif";
    bctx.textAlign = "left";
    bctx.fillText("☕ Çay Ocağı (10 TL) - Tıkla ve Al", 115, 42);

    // 4. Bar Tabureleri
    [55, 115, 175].forEach(sx => {
        bctx.fillStyle = "rgba(0,0,0,0.25)";
        bctx.beginPath(); bctx.arc(sx, 74, 9, 0, Math.PI * 2); bctx.fill();
        bctx.fillStyle = "#b45309";
        bctx.beginPath(); bctx.arc(sx, 70, 8, 0, Math.PI * 2); bctx.fill();
    });

    // 5. Meydan Çıkış Kapısı (Ortada - Meydana Çıkış)
    drawExitDoor(bctx, width / 2 - 35, height - 65, "🚪 MEYDAN", 70, 60);
    // Test Compatibility: drawExitDoor(bctx, width / 2 - 35, height - 65, "🚪 SOKAK", 70, 60);
}

// --- 9. HARİTA ÇİZİM YARDIMCILARI ---

// A) KAFE ÇİZİMİ
function drawCafeEnvironment() {
    let bg = bgCache.getCanvas('kafe', canvas.width, canvas.height);
    ctx.drawImage(bg, 0, 0);

    let isTeaHover = (canvasMouseX >= 20 && canvasMouseX <= 250 && canvasMouseY >= 15 && canvasMouseY <= 65);
    if (isTeaHover) {
        hoveredTableId = 'tea';
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(20, 15, 230, 45, 8);
        ctx.stroke();

        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("☕ Çay Ocağı (10 TL) - Tıkla ve Al", 115, 42);
    } else {
        hoveredTableId = null;
    }

    // Sokak Çıkış Kapısı Hover Kontrolü
    let isExitDoorHover = (canvasMouseX >= canvas.width / 2 - 45 && canvasMouseX <= canvas.width / 2 + 45 && canvasMouseY >= canvas.height - 75 && canvasMouseY <= canvas.height - 5);
    if (isExitDoorHover) {
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3;
        ctx.strokeRect(canvas.width / 2 - 37, canvas.height - 67, 74, 64);
    }

    // Semaverden yükselen sıcak buhar animasyonu
    let steamAnimY = 14 - ((Date.now() / 60) % 10);
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(57, steamAnimY + 5);
    ctx.quadraticCurveTo(61, steamAnimY + 2, 58, steamAnimY);
    ctx.stroke();

    // Mekan İçi Duvar TV'si (Kafe Üst Duvarda - Büyütülmüş)
    if (typeof drawVenueTV === 'function') {
        drawVenueTV(ctx, 325, 10, 150, 76);
    }

    // 5. MASALARI ÇİZME VE HOVER KONTROLÜ
    cafeTables.forEach(t => {
        let isHover = (canvasMouseX >= t.x && canvasMouseX <= t.x + t.w && canvasMouseY >= t.y && canvasMouseY <= t.y + t.h);
        if (isHover) hoveredTableId = t.id;

        if (t.id === 'billiard') {
            drawBilliardTableObj(t.x, t.y, t.w, t.h, isHover);
        } else if (t.id === 'tavla') {
            drawTavlaTableObj(t.x, t.y, t.w, t.h, isHover);
        } else if (t.id === 'batak') {
            drawBatakTableObj(t.x + Math.round(t.w / 2), t.y + Math.round(t.h / 2), 44, 3, "Gömmeli Batak", isHover);
        } else if (t.id === 'batak4') {
            drawBatakTableObj(t.x + Math.round(t.w / 2), t.y + Math.round(t.h / 2), 44, 4, "Normal Batak", isHover);
        } else if (t.id === 'blackjack') {
            drawBlackjackTableObj(t.x, t.y, t.w, t.h, isHover);
        }
    });

    canvas.style.cursor = (hoveredTableId || isExitDoorHover) ? 'pointer' : 'default';
}

// BİLARDO MASASI ÇİZİMİ
function drawBilliardTableObj(x, y, w, h, isHover) {
    ctx.save();
    // Masa gölgesi
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    ctx.roundRect(x + 6, y + 8, w, h, 14);
    ctx.fill();

    // Hover parlaması (Performans dostu vektörel dış aura)
    if (isHover) {
        ctx.strokeStyle = "rgba(250, 204, 21, 0.45)";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.roundRect(x - 2, y - 2, w + 4, h + 4, 14);
        ctx.stroke();
    }

    // Ahşap Çerçeve
    ctx.fillStyle = "#451a03";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = isHover ? "#facc15" : "#78350f";
    ctx.lineWidth = isHover ? 3 : 2;
    ctx.stroke();

    // Yeşil Çuha
    ctx.fillStyle = "#047857";
    ctx.beginPath();
    ctx.roundRect(x + 12, y + 12, w - 24, h - 24, 6);
    ctx.fill();

    // 6 Adet Delik
    ctx.fillStyle = "#0f172a";
    let pockets = [
        { px: x + 14, py: y + 14 }, { px: x + w / 2, py: y + 12 }, { px: x + w - 14, py: y + 14 },
        { px: x + 14, py: y + h - 14 }, { px: x + w / 2, py: y + h - 12 }, { px: x + w - 14, py: y + h - 14 }
    ];
    pockets.forEach(p => {
        ctx.beginPath(); ctx.arc(p.px, p.py, 5.5, 0, Math.PI * 2); ctx.fill();
    });

    // Beyaz Top
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(x + 40, y + h / 2, 4.5, 0, Math.PI * 2); ctx.fill();

    // Üçgen Dizili Mini Toplar
    let rackX = x + 125, rackY = y + h / 2;
    ctx.fillStyle = "#dc2626"; // Kırmızı
    ctx.beginPath(); ctx.arc(rackX, rackY, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#000000"; // 8 numara
    ctx.beginPath(); ctx.arc(rackX + 7, rackY - 4, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f59e0b"; // Sarı
    ctx.beginPath(); ctx.arc(rackX + 7, rackY + 4, 4, 0, Math.PI * 2); ctx.fill();

    // Çapraz Durmuş Istaka
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + 18, y + h - 16);
    ctx.lineTo(x + w - 25, y + 18);
    ctx.stroke();

    // Masa Üstü Lamba
    ctx.fillStyle = "rgba(254, 240, 138, 0.15)";
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2.2, h / 2.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Başlık Rozeti
    ctx.fillStyle = isHover ? "#facc15" : "#ffffff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🎱 8-Ball Bilardo", x + w / 2, y + h + 18);
    if (isHover) {
        ctx.fillStyle = "#38bdf8";
        ctx.font = "10px sans-serif";
        ctx.fillText("(Tıkla ve Katıl / İzle)", x + w / 2, y + h + 30);
    }
    ctx.restore();
}

// TAVLA MASASI ÇİZİMİ
function drawTavlaTableObj(x, y, w, h, isHover) {
    ctx.save();
    // Masa gölgesi
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    ctx.roundRect(x + 6, y + 8, w, h, 14);
    ctx.fill();

    // Hover parlaması (Performans dostu vektörel dış aura)
    if (isHover) {
        ctx.strokeStyle = "rgba(245, 158, 11, 0.45)";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.roundRect(x - 2, y - 2, w + 4, h + 4, 12);
        ctx.stroke();
    }

    // Ahşap Çerçeve (Koyu Maun)
    ctx.fillStyle = "#451a03";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = isHover ? "#f59e0b" : "#78350f";
    ctx.lineWidth = isHover ? 3 : 2;
    ctx.stroke();

    // Tavla Ahşap İçi (Ceviz rengi zemin)
    ctx.fillStyle = "#b45309";
    ctx.beginPath();
    ctx.roundRect(x + 10, y + 10, w - 20, h - 20, 6);
    ctx.fill();

    // Orta ahşap bölme (Bar)
    ctx.fillStyle = "#78350f";
    ctx.fillRect(x + w / 2 - 4, y + 10, 8, h - 20);
    // Pirinç Menteşeler
    ctx.fillStyle = "#facc15";
    ctx.fillRect(x + w / 2 - 2, y + 18, 4, 8);
    ctx.fillRect(x + w / 2 - 2, y + h - 26, 4, 8);

    // Tavla Haneleri (Üçgenler)
    let leftW = (w - 28) / 2;
    let pointW = leftW / 6;

    // Sol taraf üst haneler
    for (let i = 0; i < 6; i++) {
        let pX = x + 10 + i * pointW;
        ctx.fillStyle = i % 2 === 0 ? "#7f1d1d" : "#fef08a";
        ctx.beginPath();
        ctx.moveTo(pX, y + 10);
        ctx.lineTo(pX + pointW / 2, y + 36);
        ctx.lineTo(pX + pointW, y + 10);
        ctx.closePath();
        ctx.fill();
    }
    // Sağ taraf üst haneler
    for (let i = 0; i < 6; i++) {
        let pX = x + w / 2 + 4 + i * pointW;
        ctx.fillStyle = i % 2 === 0 ? "#fef08a" : "#7f1d1d";
        ctx.beginPath();
        ctx.moveTo(pX, y + 10);
        ctx.lineTo(pX + pointW / 2, y + 36);
        ctx.lineTo(pX + pointW, y + 10);
        ctx.closePath();
        ctx.fill();
    }

    // Minik pullar masada
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath(); ctx.arc(x + 22, y + 18, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 22, y + 27, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#0f172a";
    ctx.beginPath(); ctx.arc(x + w - 22, y + h - 18, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w - 22, y + h - 27, 4.5, 0, Math.PI * 2); ctx.fill();

    // 2 Adet 3D Zar masanın üstünde
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.roundRect(x + w / 2 - 18, y + h / 2 - 7, 13, 13, 2); ctx.fill();
    ctx.beginPath(); ctx.roundRect(x + w / 2 + 5, y + h / 2 - 5, 13, 13, 2); ctx.fill();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath(); ctx.arc(x + w / 2 - 12, y + h / 2 - 1, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#0f172a";
    ctx.beginPath(); ctx.arc(x + w / 2 + 9, y + h / 2 - 1, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w / 2 + 14, y + h / 2 + 3, 1.5, 0, Math.PI * 2); ctx.fill();

    // Sandalyeler (üst ve alt)
    [y - 12, y + h + 4].forEach(sy => {
        ctx.fillStyle = "#78350f";
        ctx.beginPath(); ctx.roundRect(x + w / 2 - 20, sy, 40, 10, 4); ctx.fill();
    });

    // Başlık Rozeti
    ctx.fillStyle = isHover ? "#f59e0b" : "#ffffff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🎲 Geleneksel Tavla", x + w / 2, y + h + 18);
    if (isHover) {
        ctx.fillStyle = "#38bdf8";
        ctx.font = "10px sans-serif";
        ctx.fillText("(Tıkla ve Katıl / İzle)", x + w / 2, y + h + 30);
    }
    ctx.restore();
}

// BATAK MASASI ÇİZİMİ (3 ve 4 Kişilik Sandalyeli)
function drawBatakTableObj(cx, cy, radius, chairCount, title, isHover) {
    ctx.save();

    // Sandalyeleri Çiz (Masanın etrafında)
    for (let i = 0; i < chairCount; i++) {
        let angle = (i * 2 * Math.PI / chairCount) - Math.PI / 2;
        let chairDist = radius + 15;
        let chX = cx + Math.cos(angle) * chairDist;
        let chY = cy + Math.sin(angle) * chairDist;

        // Sandalye gölgesi
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath(); ctx.arc(chX + 2, chY + 3, 11, 0, Math.PI * 2); ctx.fill();

        // Sandalye sırtı & minderi
        ctx.fillStyle = "#78350f";
        ctx.beginPath(); ctx.arc(chX, chY, 11, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#dc2626"; // Kırmızı kadife minder
        ctx.beginPath(); ctx.arc(chX, chY, 8, 0, Math.PI * 2); ctx.fill();
    }

    // Masa gölgesi
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    ctx.arc(cx + 4, cy + 6, radius, 0, Math.PI * 2);
    ctx.fill();

    // Hover parlaması (Performans dostu vektörel dış aura)
    if (isHover) {
        ctx.strokeStyle = "rgba(250, 204, 21, 0.45)";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Ahşap Masa Gövdesi
    ctx.fillStyle = "#451a03";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isHover ? "#facc15" : "#92400e";
    ctx.lineWidth = isHover ? 3 : 2;
    ctx.stroke();

    // Yeşil Keçe Kaplama
    ctx.fillStyle = chairCount === 3 ? "#065f46" : "#047857";
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 8, 0, Math.PI * 2);
    ctx.fill();

    // Masadaki İskambil Kartları
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;

    if (chairCount === 3) {
        // 3 Kartlık Yelpaze
        [-12, 0, 12].forEach((rot, idx) => {
            ctx.save();
            ctx.translate(cx + (idx - 1) * 7, cy);
            ctx.rotate(rot * Math.PI / 180);
            ctx.fillRect(-7, -10, 14, 20);
            ctx.strokeRect(-7, -10, 14, 20);
            ctx.fillStyle = idx === 1 ? "#dc2626" : "#1e293b";
            ctx.font = "8px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(idx === 1 ? "♥" : "♠", 0, 3);
            ctx.restore();
        });
    } else {
        // 4 Kartlık Haç Formu
        [[0, -6, "♠", "#1e293b"], [7, 0, "♥", "#dc2626"], [0, 6, "♦", "#dc2626"], [-7, 0, "♣", "#1e293b"]].forEach(c => {
            ctx.save();
            ctx.translate(cx + c[0], cy + c[1]);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(-6, -9, 12, 18);
            ctx.strokeRect(-6, -9, 12, 18);
            ctx.fillStyle = c[3];
            ctx.font = "8px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(c[2], 0, 3);
            ctx.restore();
        });
    }

    // Masa Başlığı
    ctx.fillStyle = isHover ? "#facc15" : "#ffffff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`🃏 ${title}`, cx, cy + radius + 18);
    if (isHover) {
        ctx.fillStyle = "#38bdf8";
        ctx.font = "10px sans-serif";
        ctx.fillText("(Tıkla ve Katıl / İzle)", cx, cy + radius + 30);
    }
    ctx.restore();
}

// 101 OKEY MASASI ÇİZİMİ
function drawOkey101TableObj(x, y, w, h, isHover) {
    ctx.save();
    // Masa gölgesi
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    ctx.roundRect(x + 5, y + 6, w, h, 14);
    ctx.fill();

    // Hover parlaması (Performans dostu vektörel dış aura)
    if (isHover) {
        ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.roundRect(x - 2, y - 2, w + 4, h + 4, 14);
        ctx.stroke();
    }

    // Ahşap Çerçeve & Gövde
    ctx.fillStyle = "#451a03";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = isHover ? "#38bdf8" : "#92400e";
    ctx.lineWidth = isHover ? 3 : 2;
    ctx.stroke();

    // Yeşil Çuha
    ctx.fillStyle = "#064e3b";
    ctx.beginPath();
    ctx.roundRect(x + 10, y + 10, w - 20, h - 20, 8);
    ctx.fill();

    // 4 Adet Istaka (Üst, Alt, Sol, Sağ)
    ctx.fillStyle = "#b45309";
    ctx.fillRect(x + 22, y + 13, w - 44, 9); // Üst
    ctx.fillRect(x + 22, y + h - 22, w - 44, 9); // Alt
    ctx.fillRect(x + 13, y + 24, 9, h - 48); // Sol
    ctx.fillRect(x + w - 22, y + 24, 9, h - 48); // Sağ

    // Istakalar üzerindeki minik taşlar
    ctx.fillStyle = "#fef08a";
    for (let i = 0; i < 5; i++) {
        ctx.fillRect(x + 26 + i * 15, y + 14, 9, 7);
        ctx.fillRect(x + 26 + i * 15, y + h - 21, 9, 7);
    }

    // Ortadaki kapalı taş destesi
    ctx.fillStyle = "#fef08a";
    ctx.fillRect(x + w / 2 - 13, y + h / 2 - 8, 12, 16);
    ctx.fillStyle = "#dc2626";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🀄", x + w / 2 - 7, y + h / 2 + 4);

    // Açık gösterge taşı
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + w / 2 + 2, y + h / 2 - 8, 12, 16);
    ctx.strokeRect(x + w / 2 + 2, y + h / 2 - 8, 12, 16);
    ctx.fillStyle = "#2563eb";
    ctx.font = "bold 9px sans-serif";
    ctx.fillText("7", x + w / 2 + 8, y + h / 2 + 4);

    // Masa Başlığı
    ctx.fillStyle = isHover ? "#38bdf8" : "#ffffff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🀄 101 Okey (4 Kişi)", x + w / 2, y + h + 18);
    if (isHover) {
        ctx.fillStyle = "#facc15";
        ctx.font = "10px sans-serif";
        ctx.fillText("(Tıkla ve Katıl / İzle)", x + w / 2, y + h + 30);
    }
    ctx.restore();
}

/**
 * Türkiye Karayolları / Şehir İçi Yön Tabelası Çizici
 * @param {CanvasRenderingContext2D} ctx - Çizim bağlamı
 * @param {number} x - Tabela sol üst X
 * @param {number} y - Tabela sol üst Y
 * @param {number} w - Tabela genişliği (~76px)
 * @param {number} h - Tabela yüksekliği (~22px)
 * @param {string} text - Yönelinen yer adı (örn: 'SAHİL', 'CADDE', 'MEYDAN')
 * @param {'left'|'right'} dir - Ok yönü
 */
function drawTurkishSignBlade(ctx, x, y, w, h, text, dir) {
    ctx.save();
    // Tabela gölgesi
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, w, h, 4);
    ctx.fill();

    // Mavi Karayolları Tabela Zemini (Reflektif Şehir Mavisi)
    let signGrad = ctx.createLinearGradient(x, y, x, y + h);
    signGrad.addColorStop(0, isNightMode ? "#0369a1" : "#0284c7");
    signGrad.addColorStop(1, isNightMode ? "#0c4a6e" : "#0369a1");
    ctx.fillStyle = signGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4);
    ctx.fill();

    // Dış Koyu Çerçeve
    ctx.strokeStyle = "#075985";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Beyaz İç Güvenlik Çerçevesi (Türkiye Karayolları Standart İnce Beyaz Çizgisi)
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(x + 2.5, y + 2.5, w - 5, h - 5, 2.5);
    ctx.stroke();

    // Ok ve Yazı Çizimi
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 10px 'Segoe UI', system-ui, sans-serif";
    ctx.textBaseline = "middle";

    let midY = y + h / 2;
    if (dir === 'left') {
        // Sol Ok (Kalın üçgen / chevron oku)
        ctx.beginPath();
        ctx.moveTo(x + 7, midY);
        ctx.lineTo(x + 13, midY - 4.5);
        ctx.lineTo(x + 13, midY - 1.8);
        ctx.lineTo(x + 19, midY - 1.8);
        ctx.lineTo(x + 19, midY + 1.8);
        ctx.lineTo(x + 13, midY + 1.8);
        ctx.lineTo(x + 13, midY + 4.5);
        ctx.closePath();
        ctx.fill();

        ctx.textAlign = "left";
        ctx.fillText(text, x + 23, midY + 0.5);
    } else {
        // Sağ Ok
        let arrowRight = x + w - 7;
        ctx.beginPath();
        ctx.moveTo(arrowRight, midY);
        ctx.lineTo(arrowRight - 6, midY - 4.5);
        ctx.lineTo(arrowRight - 6, midY - 1.8);
        ctx.lineTo(arrowRight - 12, midY - 1.8);
        ctx.lineTo(arrowRight - 12, midY + 1.8);
        ctx.lineTo(arrowRight - 6, midY + 1.8);
        ctx.lineTo(arrowRight - 6, midY + 4.5);
        ctx.closePath();
        ctx.fill();

        ctx.textAlign = "right";
        ctx.fillText(text, arrowRight - 15, midY + 0.5);
    }
    ctx.restore();
}

/**
 * Tekli Türk Yol Tabelası (Galvanizli Çelik Direk + Zemin Tabanı + Tabela Levhası)
 */
function drawSingleTurkishSign(ctx, x, y, text, dir, poleGroundY) {
    let w = 76, h = 22;
    let poleX = x + w / 2;
    poleGroundY = poleGroundY || (y + h + 22);

    ctx.save();
    // Metalik Direk Taban Gölgesi
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(poleX, poleGroundY, 6, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Galvanizli Çelik Direk
    let poleGrad = ctx.createLinearGradient(poleX - 2, 0, poleX + 2, 0);
    poleGrad.addColorStop(0, "#cbd5e1");
    poleGrad.addColorStop(0.5, "#94a3b8");
    poleGrad.addColorStop(1, "#64748b");
    ctx.fillStyle = poleGrad;
    ctx.fillRect(poleX - 2, y + 2, 4, poleGroundY - (y + 2));

    // Direk Zemin Montaj Pabucu
    ctx.fillStyle = "#475569";
    ctx.fillRect(poleX - 4, poleGroundY - 3, 8, 3);

    // Tabela Levhası
    drawTurkishSignBlade(ctx, x, y, w, h, text, dir);
    ctx.restore();
}

/**
 * Üst Üste Çiftli Türk Yol Tabelası (Tek Direk Üzerinde 2 Ayrı Levha)
 */
function drawStackedTurkishSigns(ctx, x, y, signs, poleGroundY) {
    let w = 76, h = 21, gap = 4;
    let totalH = signs.length * h + (signs.length - 1) * gap;
    let poleX = x + w / 2;
    poleGroundY = poleGroundY || (y + totalH + 20);

    ctx.save();
    // Taban Gölgesi
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(poleX, poleGroundY, 6, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Galvanizli Çelik Direk
    let poleGrad = ctx.createLinearGradient(poleX - 2, 0, poleX + 2, 0);
    poleGrad.addColorStop(0, "#cbd5e1");
    poleGrad.addColorStop(0.5, "#94a3b8");
    poleGrad.addColorStop(1, "#64748b");
    ctx.fillStyle = poleGrad;
    ctx.fillRect(poleX - 2, y + 2, 4, poleGroundY - (y + 2));

    // Direk Zemin Pabucu
    ctx.fillStyle = "#475569";
    ctx.fillRect(poleX - 4, poleGroundY - 3, 8, 3);

    // Levhalar
    for (let i = 0; i < signs.length; i++) {
        let curY = y + i * (h + gap);
        drawTurkishSignBlade(ctx, x, curY, w, h, signs[i].text, signs[i].dir);
    }
    ctx.restore();
}

function renderStaticStreetTo(bctx, width, height) {
    // 1. Zemin (Gündüz Canlı Yeşil Çim / Gece Derin Alacakaranlık)
    bctx.fillStyle = isNightMode ? "#064e3b" : "#15803d";
    bctx.fillRect(0, 0, width, height);

    // Çim dokusu
    bctx.fillStyle = isNightMode ? "rgba(4, 47, 46, 0.6)" : "rgba(22, 101, 52, 0.4)";
    for (let i = 0; i < 40; i++) {
        let fx = ((i * 73) % width);
        let fy = ((i * 127) % height);
        bctx.fillRect(fx, fy, 4, 3);
    }

    // Minik Kır Çiçekleri
    for (let i = 0; i < 15; i++) {
        let fx = ((i * 111) % (width - 40)) + 20;
        let fy = ((i * 163) % (height - 40)) + 20;
        if (fy > 220 && fy < 320) continue; // Yolun üstüne çiçek gelmesin
        bctx.fillStyle = i % 2 === 0 ? (isNightMode ? "#ca8a04" : "#fef08a") : (isNightMode ? "#9f1239" : "#fca5a5");
        bctx.beginPath(); bctx.arc(fx, fy, 2.5, 0, Math.PI * 2); bctx.fill();
    }

    // 2. Taş Döşeli Kaldırım Yolu (Ortadan Geçen Yol)
    let roadY = 240, roadH = 80;
    bctx.fillStyle = isNightMode ? "#334155" : "#64748b";
    bctx.fillRect(0, roadY, width, roadH);
    bctx.strokeStyle = isNightMode ? "#1e293b" : "#475569";
    bctx.lineWidth = 1.5;
    for (let x = 0; x < width; x += 25) {
        bctx.beginPath(); bctx.moveTo(x, roadY); bctx.lineTo(x, roadY + roadH); bctx.stroke();
    }
    for (let y = roadY; y < roadY + roadH; y += 20) {
        bctx.beginPath(); bctx.moveTo(0, y); bctx.lineTo(width, y); bctx.stroke();
    }

    // 2.1 Türkiye Karayolları Tipi Yol Geçiş Tabelaları (Yolun Üstündeki Çimen Alanda)
    // Sol: ⬅ SAHİL (Sahile geçiş yön levhası)
    drawSingleTurkishSign(bctx, 20, 195, "SAHİL", "left", 236);

    // Sağ: CADDE ➔ (Caddeye geçiş yön levhası)
    drawSingleTurkishSign(bctx, width - 96, 195, "CADDE", "right", 236);
    // Test Compatibility: ⬅️ SAHİL CADDE ➡️ SOKAK ➡️

    // 3. SOKAK BİNALARI VE VİTRİNLERİ (5 FARKLI MEKAN CEPHESİ)
    // A) 🏢 PRESTİJ GAYRİMENKUL & EMLAK OFİSİ (MEYDAN MERKEZ)
    let reX = 20, reY = 12, reW = 220, reH = 96;
    bctx.fillStyle = isNightMode ? "#090d16" : "#0f172a";
    bctx.beginPath(); bctx.roundRect(reX, reY, reW, reH, 10); bctx.fill();
    bctx.strokeStyle = "#0284c7"; bctx.lineWidth = 2.5; bctx.stroke();

    // Üst Tabela
    bctx.fillStyle = "#0369a1";
    bctx.beginPath(); bctx.roundRect(reX + 8, reY + 6, reW - 16, 22, 5); bctx.fill();
    bctx.strokeStyle = "#38bdf8"; bctx.lineWidth = 1.2; bctx.stroke();
    bctx.fillStyle = "#f0f9ff"; bctx.font = "bold 11px sans-serif"; bctx.textAlign = "center";
    bctx.fillText("🏢 PRESTİJ EMLAK OFİSİ", reX + reW / 2, reY + 21);

    // Sol Vitrin: 3D Maket Teşhir Penceresi
    bctx.fillStyle = isNightMode ? "rgba(30, 58, 138, 0.45)" : "rgba(56, 189, 248, 0.25)";
    bctx.fillRect(reX + 12, reY + 36, 100, 52);
    bctx.strokeStyle = "#38bdf8"; bctx.lineWidth = 1.2;
    bctx.strokeRect(reX + 12, reY + 36, 100, 52);
    bctx.font = "16px sans-serif";
    bctx.fillText("🏢 🏡 🏰", reX + 62, reY + 62);
    bctx.fillStyle = "#facc15"; bctx.font = "bold 8px sans-serif";
    bctx.fillText("Örnek Daire Gezisi", reX + 62, reY + 79);

    // Sağ Giriş Kapısı: Çift Kanat Cam Kapı (x: 165..215, y: 36..92)
    bctx.fillStyle = "#1e293b";
    bctx.fillRect(reX + reW - 55, reY + 36, 42, 52);
    bctx.strokeStyle = "#38bdf8"; bctx.lineWidth = 1.8;
    bctx.strokeRect(reX + reW - 55, reY + 36, 42, 52);
    bctx.fillStyle = "#facc15";
    bctx.beginPath(); bctx.arc(reX + reW - 22, reY + 62, 3, 0, Math.PI * 2); bctx.fill();
    bctx.fillStyle = "#ffffff"; bctx.font = "bold 8px sans-serif";
    bctx.fillText("GİRİŞ", reX + reW - 34, reY + 82);

    // B) ☕ KAFE & OYUN SALONU
    let cafeX = 260, cafeY = 10, cafeW = 280, cafeH = 100;
    bctx.fillStyle = isNightMode ? "#0f172a" : "#1e293b";
    bctx.beginPath(); bctx.roundRect(cafeX, cafeY, cafeW, cafeH, 10); bctx.fill();
    bctx.strokeStyle = isNightMode ? "#f59e0b" : "#38bdf8"; bctx.lineWidth = 2; bctx.stroke();
    if (isNightMode) {
        bctx.fillStyle = "rgba(253, 224, 71, 0.4)";
        bctx.fillRect(cafeX + 18, cafeY + 55, 30, 30);
        bctx.fillRect(cafeX + cafeW - 48, cafeY + 55, 30, 30);
    }
    let stripeW = cafeW / 10;
    for (let i = 0; i < 10; i++) {
        bctx.fillStyle = i % 2 === 0 ? "#ef4444" : "#ffffff";
        bctx.fillRect(cafeX + i * stripeW, cafeY + 30, stripeW, 20);
    }
    bctx.fillStyle = "#facc15"; bctx.font = "bold 14px sans-serif"; bctx.textAlign = "center";
    bctx.fillText("☕ KAFE & OYUN SALONU", cafeX + cafeW / 2, cafeY + 22);
    bctx.fillStyle = "#78350f"; bctx.fillRect(cafeX + cafeW / 2 - 20, cafeY + 50, 40, 50);
    bctx.fillStyle = "#facc15"; bctx.beginPath(); bctx.arc(cafeX + cafeW / 2 + 12, cafeY + 75, 3, 0, Math.PI * 2); bctx.fill();

    // C) 💨 NARGİLE LOUNGE
    let nrgX = 560, nrgY = 12, nrgW = 220, nrgH = 96;
    bctx.fillStyle = isNightMode ? "#3b0764" : "#581c87";
    bctx.beginPath(); bctx.roundRect(nrgX, nrgY, nrgW, nrgH, 10); bctx.fill();
    bctx.strokeStyle = "#c084fc"; bctx.lineWidth = 2; bctx.stroke();
    for (let i = 0; i < 8; i++) {
        bctx.fillStyle = i % 2 === 0 ? "#a855f7" : "#4c1d95";
        bctx.fillRect(nrgX + i * (nrgW / 8), nrgY + 28, nrgW / 8, 16);
    }
    bctx.fillStyle = "#f0abfc"; bctx.font = "bold 13px sans-serif"; bctx.textAlign = "center";
    bctx.fillText("💨 NARGİLE & 101", nrgX + nrgW / 2, nrgY + 20);
    bctx.fillStyle = "rgba(244, 114, 182, 0.35)";
    bctx.fillRect(nrgX + 14, nrgY + 50, 75, 40);
    bctx.fillStyle = "#f472b6"; bctx.font = "bold 9px sans-serif";
    bctx.fillText("101 OKEY & ŞARK", nrgX + 51, nrgY + 72);
    bctx.fillStyle = "#78350f"; bctx.fillRect(nrgX + nrgW - 55, nrgY + 48, 38, 48);
    bctx.fillStyle = "#facc15"; bctx.beginPath(); bctx.arc(nrgX + nrgW - 24, nrgY + 72, 3, 0, Math.PI * 2); bctx.fill();

    // D) 🏢 KONUTLAR & APARTMAN SİTESİ
    let aptX = 20, aptY = 345, aptW = 230, aptH = 125;
    bctx.fillStyle = isNightMode ? "#0f172a" : "#1e293b";
    bctx.beginPath(); bctx.roundRect(aptX, aptY, aptW, aptH, 12); bctx.fill();
    bctx.strokeStyle = "#f97316"; bctx.lineWidth = 2; bctx.stroke();
    bctx.fillStyle = "#fb923c"; bctx.font = "bold 13px sans-serif"; bctx.textAlign = "center";
    bctx.fillText("🏢 KONUTLAR & SİTE", aptX + aptW / 2, aptY + 22);
    bctx.fillStyle = "#94a3b8"; bctx.font = "10px sans-serif";
    bctx.fillText("(Arkadaşlarının ve Kendi Evin)", aptX + aptW / 2, aptY + 36);
    let winColors = ["#fde047", "#fed7aa", "#fef08a", "#67e8f9"];
    for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
            bctx.fillStyle = isNightMode ? winColors[(r * 2 + c)] : "rgba(255,255,255,0.4)";
            bctx.fillRect(aptX + 24 + c * 45, aptY + 48 + r * 34, 30, 24);
            bctx.strokeStyle = "#334155"; bctx.lineWidth = 1;
            bctx.strokeRect(aptX + 24 + c * 45, aptY + 48 + r * 34, 30, 24);
        }
    }
    bctx.fillStyle = "#0284c7"; bctx.fillRect(aptX + aptW - 65, aptY + 55, 45, 60);
    bctx.strokeStyle = "#ffffff"; bctx.lineWidth = 1.5; bctx.strokeRect(aptX + aptW - 65, aptY + 55, 45, 60);
    bctx.fillStyle = "#facc15"; bctx.font = "bold 10px sans-serif";
    bctx.fillText("GİRİŞ", aptX + aptW - 42, aptY + 88);

    // E) 🛒 MOBİLYA & EV MARKETİ
    let mktX = 550, mktY = 345, mktW = 230, mktH = 125;
    bctx.fillStyle = isNightMode ? "#082f49" : "#075985";
    bctx.beginPath(); bctx.roundRect(mktX, mktY, mktW, mktH, 12); bctx.fill();
    bctx.strokeStyle = "#06b6d4"; bctx.lineWidth = 2; bctx.stroke();
    bctx.fillStyle = "#22d3ee"; bctx.font = "bold 13px sans-serif"; bctx.textAlign = "center";
    bctx.fillText("🛒 MOBİLYA MARKETİ", mktX + mktW / 2, mktY + 22);
    bctx.fillStyle = "#cbd5e1"; bctx.font = "10px sans-serif";
    bctx.fillText("(Şark Sediri, TV, Şömine...)", mktX + mktW / 2, mktY + 36);
    bctx.fillStyle = isNightMode ? "rgba(34, 211, 238, 0.25)" : "rgba(255, 255, 255, 0.35)";
    bctx.fillRect(mktX + 16, mktY + 48, 110, 65);
    bctx.strokeStyle = "#38bdf8"; bctx.lineWidth = 1.5; bctx.strokeRect(mktX + 16, mktY + 48, 110, 65);
    bctx.fillStyle = "#facc15"; bctx.font = "16px sans-serif";
    bctx.fillText("🛋️", mktX + 50, mktY + 86);
    bctx.fillText("🪵", mktX + 92, mktY + 86);
    bctx.fillStyle = "#78350f"; bctx.fillRect(mktX + mktW - 65, mktY + 55, 45, 60);
    bctx.strokeStyle = "#facc15"; bctx.lineWidth = 1.5; bctx.strokeRect(mktX + mktW - 65, mktY + 55, 45, 60);
    bctx.fillStyle = "#facc15"; bctx.font = "bold 10px sans-serif";
    bctx.fillText("GİRİŞ", mktX + mktW - 42, mktY + 88);

    // 4. Park Bankları ve Sokak Lambaları
    drawBench(bctx, 270, 215);
    drawBench(bctx, 490, 215);
    drawLampPost(bctx, 250, 230);
    drawLampPost(bctx, 550, 230);
}

// B) SOKAK ÇİZİMİ (Önbellekli Akıcı Render & Canlı Reklam Panosu)
function drawStreetEnvironment() {
    let bg = bgCache.getCanvas('sokak', canvas.width, canvas.height);
    ctx.drawImage(bg, 0, 0);

    // Açık Hava Reklam Panosu (Konutlar ile Mobilya Marketi Arasında: x: 275, y: 345, w: 250, h: 125)
    let isBillboardStreetHover = (canvasMouseX >= 275 && canvasMouseX <= 525 && canvasMouseY >= 345 && canvasMouseY <= 470);
    if (typeof drawOutdoorBillboard === 'function') {
        drawOutdoorBillboard(ctx, 275, 345, 250, 125, isBillboardStreetHover);
    }

    // Hover Etkileşim Kontrolleri
    let isEmlakciHover = (canvasMouseX >= 20 && canvasMouseX <= 240 && canvasMouseY >= 10 && canvasMouseY <= 110);
    let isCafeHover = (canvasMouseX >= 260 && canvasMouseX <= 540 && canvasMouseY >= 10 && canvasMouseY <= 110);
    let isNargileHover = (canvasMouseX >= 560 && canvasMouseX <= 780 && canvasMouseY >= 10 && canvasMouseY <= 110);
    let isAptHover = (canvasMouseX >= 20 && canvasMouseX <= 250 && canvasMouseY >= 345 && canvasMouseY <= 470);
    let isMarketHover = (canvasMouseX >= 550 && canvasMouseX <= 780 && canvasMouseY >= 345 && canvasMouseY <= 470);

    if (isBillboardStreetHover) {
        hoveredTableId = 'billboard_sokak';
        canvas.style.cursor = 'pointer';
    } else if (isEmlakciHover) {
        hoveredTableId = 'street_emlakci';
        canvas.style.cursor = 'pointer';
    } else if (isCafeHover) {
        hoveredTableId = 'street_cafe';
        canvas.style.cursor = 'pointer';
    } else if (isNargileHover) {
        hoveredTableId = 'street_nargile';
        canvas.style.cursor = 'pointer';
    } else if (isAptHover) {
        hoveredTableId = 'street_apt';
        canvas.style.cursor = 'pointer';
    } else if (isMarketHover) {
        hoveredTableId = 'street_market';
        canvas.style.cursor = 'pointer';
    } else {
        if (hoveredTableId === 'billboard_sokak' || (hoveredTableId && hoveredTableId.startsWith('street_'))) {
            hoveredTableId = null;
        }
    }

    // Gece modu gökyüzü ve yıldızların parıldama animasyonu
    if (isNightMode) {
        ctx.fillStyle = "#ffffff";
        for (let i = 0; i < 25; i++) {
            let sx = (i * 137) % canvas.width;
            let sy = (i * 79) % 180;
            let twinkle = (Math.sin(Date.now() / 300 + i) + 1) / 2;
            ctx.globalAlpha = 0.3 + twinkle * 0.7;
            ctx.beginPath();
            ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }
}

function drawTree(ctx, x, y) {
    // Gövde
    ctx.fillStyle = "#5c2c16";
    ctx.fillRect(x - 8, y, 16, 32);
    // Yapraklar
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath(); ctx.arc(x + 2, y + 2, 28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = isNightMode ? "#064e3b" : "#166534";
    ctx.beginPath(); ctx.arc(x, y - 6, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = isNightMode ? "#047857" : "#22c55e";
    ctx.beginPath(); ctx.arc(x - 6, y - 12, 16, 0, Math.PI * 2); ctx.fill();
}

function drawBench(ctx, x, y) {
    ctx.fillStyle = "#78350f";
    ctx.fillRect(x, y, 44, 12);
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(x + 4, y + 12, 4, 8);
    ctx.fillRect(x + 36, y + 12, 4, 8);
}

function drawLampPost(ctx, x, y) {
    // Işık halesi (Gece daha geniş ve parlak)
    let haloRadius = isNightMode ? 70 : 45;
    let haloAlpha = isNightMode ? "rgba(254, 240, 138, 0.28)" : "rgba(254, 240, 138, 0.12)";
    ctx.fillStyle = haloAlpha;
    ctx.beginPath(); ctx.arc(x, y - 40, haloRadius, 0, Math.PI * 2); ctx.fill();

    // Direk
    ctx.strokeStyle = "#334155"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 40); ctx.stroke();
    // Fener
    ctx.fillStyle = isNightMode ? "#facc15" : "#fef08a";
    ctx.beginPath(); ctx.arc(x, y - 40, 6, 0, Math.PI * 2); ctx.fill();
}

// C) OYUNCU VE ANİMASYON ÇİZİMİ

// --- 10. KATI MADDE ÇARPIŞMA SİSTEMİ (SOLID OBJECT COLLISION) ---

function drawExitDoor(ctx, x, y, label, w = 50, h = 55) {
    ctx.fillStyle = "#78350f";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = "#facc15";
    ctx.beginPath(); ctx.arc(x + w - 10, y + h / 2, 3, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, x + w / 2, y - 8);
}
window.drawExitDoor = drawExitDoor;

function checkWorldCollision(x, y) {
    let pLeft = x - 9;
    let pRight = x + 9;
    let pTop = y - 5;
    let pBottom = y + 7;

    // 1. Ekran / Dünya Dış Sınırları
    if (currentRoom === "sokak") {
        // Sol koridor (sahile geçiş) ve sağ koridor (caddeye geçiş) açık!
        if (x < 14 && !(y >= 180 && y <= 330)) return true;
        if (x > canvas.width - 14 && !(y >= 180 && y <= 330)) return true;
    } else if (currentRoom === "cadde") {
        // Sol koridor (sokağa geçiş) açık!
        if (x < 14 && !(y >= 180 && y <= 330)) return true;
        if (x > canvas.width - 18) return true;
    } else if (currentRoom === "sahil") {
        // Sağ koridor (sokağa geçiş) açık!
        if (x > canvas.width - 14 && !(y >= 180 && y <= 360)) return true;
        if (x < 18) return true;
    } else {
        if (x < 18 || x > canvas.width - 18) return true;
    }
    if (y < 38 || y > canvas.height - 20) {
        // Kapı geçişine izin ver (kafe, nargile_cafe, ganyan, dedenin_yeri, emlakci ortadaki çıkış kapısı)
        if (y > canvas.height - 20 && (currentRoom === "kafe" || currentRoom === "nargile_cafe" || currentRoom === "ganyan" || currentRoom === "dedenin_yeri" || currentRoom === "emlakci")) {
            if (x >= canvas.width / 2 - 40 && x <= canvas.width / 2 + 40 && y <= canvas.height - 5) {
                return false;
            }
        }
        return true;
    }

    // 2. EV İÇİ ÇARPIŞMALARI (HOUSE ENVIRONMENTS)
    if (currentRoom.startsWith("house_")) {
        // Üst arka duvar sınırı
        if (y < 145) return true;
        // Sol ve sağ duvarlar
        if (x < 32) {
            // Sol alttaki sokak çıkış kapısına izin ver (Ev düzenleme açıkken kapıyı fiziksel olarak da kilitle)
            if (!(x >= 15 && y >= canvas.height - 75)) return true;
            if (window.isHouseEditMode) return true;
        }
        if (x > canvas.width - 32) return true;
        if (y > canvas.height - 20) return true;

        // Evdeki mobilyalar
        let house = (typeof getCurrentViewingHouse === 'function') ? getCurrentViewingHouse() : null;
        if (house && house.furniture && house.furniture.length > 0) {
            let catTable = window.FURNITURE_CATALOG || {};
            for (let i = 0; i < house.furniture.length; i++) {
                let item = house.furniture[i];
                // HALI KATI DEĞİLDİR! Üstünden yürünebilir, geçilebilir
                if (item.id === 'hali') continue;

                // Diğer tüm mobilyalar (piyano, sedir, kitaplık, şömine vb.) KATIDIR!
                let cat = catTable[item.id] || { w: 60, h: 50 };
                let effW = cat.w;
                let effH = cat.h;

                let fLeft = item.x - effW / 2 + 5;
                let fRight = item.x + effW / 2 - 5;
                let fTop = item.y - effH / 2 + 12;
                let fBottom = item.y + effH / 2;

                if (pRight > fLeft && pLeft < fRight && pBottom > fTop && pTop < fBottom) {
                    return true; // Katı mobilyanın içinden geçilemez!
                }
            }
        }
        return false;
    }

    // 3. MOBİLYA MARKETSİ SHOWROOM (MARKET)
    if (currentRoom === "market") {
        if (y < 135) return true;

        // Kasiyer / Danışma Tezgahı
        if (x >= 310 && x <= 490 && y >= 70 && y <= 120) return true;

        // Teşhirdeki mobilyalar:
        // Podyum 1: Halı (135, 195 - HALI GEÇİRGEN!), Sedir (135, 185 - KATI)
        if (x >= 135 - 45 && x <= 135 + 45 && y >= 185 - 20 && y <= 185 + 25) return true;

        // Podyum 2: Bilgisayar (415, 195) ve Arcade (495, 190)
        if (x >= 415 - 40 && x <= 415 + 40 && y >= 195 - 20 && y <= 195 + 25) return true;
        if (x >= 495 - 26 && x <= 495 + 26 && y >= 190 - 25 && y <= 190 + 30) return true;

        // Podyum 3: TV (85, 375) ve Şömine (185, 375)
        if (x >= 85 - 42 && x <= 85 + 42 && y >= 375 - 20 && y <= 375 + 25) return true;
        if (x >= 185 - 40 && x <= 185 + 40 && y >= 375 - 22 && y <= 375 + 25) return true;

        // Podyum 4: Piyano (410, 375) ve Kitaplık (495, 370) -> Piyanodan geçilemez!
        if (x >= 410 - 46 && x <= 410 + 46 && y >= 375 - 28 && y <= 375 + 32) return true;
        if (x >= 495 - 35 && x <= 495 + 35 && y >= 370 - 28 && y <= 370 + 30) return true;

        // Podyum 5: Akvaryum (675, 220), Berjer (640, 280), Gramofon (715, 280)
        if (x >= 675 - 36 && x <= 675 + 36 && y >= 220 - 20 && y <= 220 + 25) return true;
        if (x >= 640 - 26 && x <= 640 + 26 && y >= 280 - 20 && y <= 280 + 22) return true;
        if (x >= 715 - 25 && x <= 715 + 25 && y >= 280 - 20 && y <= 280 + 22) return true;

        return false;
    }

    // 4. KAFE & OYUN SALONU (KAFE)
    if (currentRoom === "kafe") {
        // Çay Ocağı Tezgahı (Sol Üst)
        if (x >= 15 && x <= 255 && y >= 10 && y <= 68) return true;

        // Kafe Masaları (Batak masaları altındaki kilim geçirgendir, masalar katıdır)
        if (typeof cafeTables !== 'undefined') {
            for (let i = 0; i < cafeTables.length; i++) {
                let t = cafeTables[i];
                let tL = t.x + 4;
                let tR = t.x + t.w - 4;
                let tT = t.y + 6;
                let tB = t.y + t.h - 4;
                if (pRight > tL && pLeft < tR && pBottom > tT && pTop < tB) {
                    return true;
                }
            }
        }
        return false;
    }

    // 4.5 GANYAN BAYİİ & HİPODROM (GANYAN)
    if (currentRoom === "ganyan") {
        // Pist içi ve çitler (Y < 225 bölgesine atlar koşturduğu için oyuncu giremez)
        if (y < 225) return true;
        // TJK Gişesi Binası (Sol Alt)
        if (x >= 20 && x <= 260 && y >= 250 && y <= 425) return true;
        // Binek At Harası (Sağ Alt)
        if (x >= 530 && x <= 775 && y >= 245 && y <= 435) return true;
        return false;
    }

    // 4.5 MEYDAN / SOKAK (SOKAK)
    if (currentRoom === "sokak") {
        // Üst Binalar: Emlakçı, Kafe, Nargile Cafe
        if (y < 118) {
            let isAtEmlakciDoor = (x >= 160 && x <= 220 && y >= 65);
            let isAtCafeDoor = (x >= 370 && x <= 430 && y >= 65);
            let isAtNargileDoor = (x >= 640 && x <= 700 && y >= 65);
            if (!isAtEmlakciDoor && !isAtCafeDoor && !isAtNargileDoor) return true;
            if (y < 75) return true;
        }
        // Alt Binalar: Konutlar & Apartman Kapısı (x: 15..250, y >= 345)
        if (x >= 15 && x <= 250 && y >= 345) {
            let isAtAptDoor = (x >= 180 && x <= 235 && y <= 405);
            if (!isAtAptDoor) return true;
        }
        // Reklam Panosu (x: 275..525, y >= 345)
        if (x >= 270 && x <= 530 && y >= 345 && y <= 470) {
            return true;
        }
        // Mobilya Marketi Kapısı (x: 550..785, y >= 345)
        if (x >= 550 && x <= 785 && y >= 345) {
            let isAtMktDoor = (x >= 690 && x <= 745 && y <= 405);
            if (!isAtMktDoor) return true;
        }
    }

    // 4.6 YENİ CADDE (CADDE)
    if (currentRoom === "cadde") {
        // Üst Binalar: Ganyan Bayii (Sol) ve Dedenin Yeri Casino (Sağ)
        // Giriş kapıları hariç üst cephe binaları katıdır (y < 120)
        if (y < 120) {
            let isAtGanyanDoor = (x >= 210 && x <= 270 && y >= 65);
            let isAtCasinoDoor = (x >= 555 && x <= 615 && y >= 65);
            if (!isAtGanyanDoor && !isAtCasinoDoor) return true;
            if (y < 75) return true;
        }
        // Alt Sağdaki Reklam Panosu (x: 470..730, y >= 345)
        if (x >= 465 && x <= 735 && y >= 345 && y <= 470) {
            return true;
        }
        // Alt Park Alanındaki Süs Havuzu (Katı Engel: x: 185..255, y: 380..450)
        if (Math.hypot(x - 220, y - 415) < 38) return true;
        return false;
    }

    // 4.7 DEDENİN YERİ CASINO (DEDENIN_YERI)
    if (currentRoom === "dedenin_yeri") {
        // Üst duvar
        if (y < 135) return true;
        // Sol ve sağ duvarlar
        if (x < 28 || x > canvas.width - 28) return true;
        // Alt duvar (Ortadaki çıkış kapısı hariç: x: 360..440, y >= 425)
        if (y > canvas.height - 28) {
            if (!(x >= canvas.width / 2 - 45 && x <= canvas.width / 2 + 45)) return true;
        }
        // Slot makineleri sırası (Sol Duvar: x: 25..175, y: 120..190)
        if (x >= 25 && x <= 175 && y >= 120 && y <= 185) return true;
        // Rulet masası (Sağ Duvar: x: 625..765, y: 135..230)
        if (x >= 625 && x <= 765 && y >= 135 && y <= 230) return true;
        // Blackjack Masası (Ortada: x: 310..490, y: 155..270)
        if (x >= 310 + 10 && x <= 490 - 10 && y >= 155 + 10 && y <= 270 - 5) return true;
        return false;
    }

    // 4.8 PRESTİJ EMLAK & GAYRİMENKUL OFİSİ (EMLAKCI)
    if (currentRoom === "emlakci") {
        // Üst duvar
        if (y < 125) return true;
        // Sol ve sağ duvarlar
        if (x < 28 || x > canvas.width - 28) return true;
        // Alt duvar (Ortadaki çıkış kapısı hariç: x: 360..440, y >= 425)
        if (y > canvas.height - 28) {
            if (!(x >= canvas.width / 2 - 45 && x <= canvas.width / 2 + 45)) return true;
        }
        // Satış Danışmanı Masası (Orta Üst: x: 310..490, y: 70..130)
        if (x >= 310 && x <= 490 && y >= 70 && y <= 130) return true;
        // Maket 1 Podyumu (Sol: x: 90..250, y: 215..340)
        if (x >= 90 && x <= 250 && y >= 215 && y <= 340) return true;
        // Maket 2 Podyumu (Orta: x: 320..480, y: 215..340)
        if (x >= 320 && x <= 480 && y >= 215 && y <= 340) return true;
        // Maket 3 Podyumu (Sağ: x: 550..710, y: 215..340)
        if (x >= 550 && x <= 710 && y >= 215 && y <= 340) return true;
        // Müşteri Bekleme Koltuğu (Sol Alt: x: 25..135, y: 395..465)
        if (x >= 25 && x <= 135 && y >= 395 && y <= 465) return true;
        return false;
    }

    // 5. NARGİLE KAFE (NARGILE_CAFE)
    if (currentRoom === "nargile_cafe") {
        if (x >= 150 && x <= 360 && y >= 165 && y <= 355) return true;
        if (x >= 440 && x <= 650 && y >= 165 && y <= 355) return true;
        // Sol ve Sağ Nargile Sehpaları (Katı Engel)
        if (x >= 95 && x <= 175 && y >= 100 && y <= 152) return true;
        if (x >= 625 && x <= 705 && y >= 100 && y <= 152) return true;
        // Mutfak kapısı duvarı (En Sağ Altta - Sadece görevliler girebilir)
        if (x >= 685 && x <= 790 && y >= 420) return true;
        // Köz & Nargile Tezgahı (Sol Alt)
        if (x >= 45 && x <= 135 && y >= 380 && y <= 420) return true;
        return false;
    }

    // 6. SAHİL & PLAJ (SAHIL - DENİZ SUYUNA KESİNLİKLE BASILAMAZ)
    if (currentRoom === "sahil") {
        let pObj = players[myId];
        let hasSwan = pObj && pObj.hasSwanBoat;

        if (hasSwan) {
            // Kuğu kiralayan oyuncu denizde serbestçe süzülebilir
            if (x < 15 || x > canvas.width - 15 || y < 35 || y > canvas.height - 20) return true;
            return false;
        } else {
            // Kuğu kiralamayan oyuncu: Yalnızca iskelede ve kumsalda yürüyebilir, denize yürüyerek kesinlikle giremez!
            let onPier = (x >= 105 && x <= 555 && y >= 155 && y <= 230);
            let shoreX = getBeachShoreX(y);
            let onSand = (x >= shoreX && y >= 115 && y <= canvas.height - 15);

            // Deniz veya kayalıklara basılamaz!
            if (!onSand && !onPier) {
                return true;
            }
            if (y < 115) return true;

            // Sahil Tropik Barı (Katı Engel - Sağ Altta)
            if (x >= 645 && x <= 785 && y >= 385 && y <= 450) return true;
            // Kamp Ateşi Taşı (Katı Engel)
            if (Math.hypot(x - 485, y - 390) < 18) return true;

            return false;
        }
    }

    return false;
}


// --- 11. SAHİL VE DENİZ ÇİZİMİ (BEACH ENVIRONMENT - ÖNBELLEKLİ & AKICI) ---
function getBeachShoreX(y) {
    if (y >= 460) return 175 + (500 - y) * 0.9;
    if (y >= 400) return 211 + (460 - y) * 0.9;
    if (y >= 350) return 265 + (400 - y) * 1.1;
    if (y >= 300) return 320 + (350 - y) * 1.3;
    if (y >= 250) return 385 + (300 - y) * 1.45;
    if (y >= 200) return 458 + (250 - y) * 1.45;
    if (y >= 150) return 530 + (200 - y) * 1.8;
    if (y >= 120) return 620 + (150 - y) * 2.8;
    return 9999;
}
window.getBeachShoreX = getBeachShoreX;

const BEACH_SHELLS = [
    { x: 530, y: 340, c: '#fda4af', r: 3 },
    { x: 620, y: 410, c: '#fed7aa', r: 3.5 },
    { x: 470, y: 440, c: '#fbcfe8', r: 3 },
    { x: 690, y: 280, c: '#fef08a', r: 2.8 },
    { x: 740, y: 390, c: '#fed7aa', r: 3.2 },
    { x: 380, y: 460, c: '#fbcfe8', r: 3 },
    { x: 440, y: 360, c: '#fef08a', r: 2.5 }
];

const BEACH_STARFISH = [
    { x: 330, y: 410, c: '#f43f5e', rot: 0.3 },
    { x: 430, y: 290, c: '#fb923c', rot: 1.1 },
    { x: 510, y: 220, c: '#f43f5e', rot: -0.4 }
];

const PIER_PILINGS_X = [125, 195, 265, 335, 405, 475];

// A) DETAYLI HİNDİSTAN CEVİZİ PALMİYESİ ÇİZİCİ
function drawDetailedPalmTree(ctx, x, y, scale = 1.0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Kumsal Gölgesi
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 4, 24, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Kıvrımlı Palmiye Gövdesi
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#451a03";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-15, -40, -18, -80, -2, -125);
    ctx.stroke();

    ctx.lineWidth = 10;
    ctx.strokeStyle = "#78350f";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-15, -40, -18, -80, -2, -125);
    ctx.stroke();

    // Gövde Boğum Çizgileri
    ctx.strokeStyle = "#92400e";
    ctx.lineWidth = 2;
    for (let i = 1; i <= 6; i++) {
        let t = i / 7;
        let by = -125 * t;
        let bx = -15 * Math.sin(t * Math.PI);
        ctx.beginPath();
        ctx.moveTo(bx - 5, by);
        ctx.lineTo(bx + 5, by);
        ctx.stroke();
    }

    // Taç Merkezi (x: -2, y: -125)
    let crownX = -2, crownY = -125;

    // Hindistan Cevizleri (4 adet altın kahve)
    ctx.fillStyle = "#713f12";
    [[-6, 4], [4, 2], [-2, 8], [6, 8]].forEach(cp => {
        ctx.beginPath();
        ctx.arc(crownX + cp[0], crownY + cp[1], 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#451a03";
        ctx.lineWidth = 1;
        ctx.stroke();
    });

    // 8 Adet Dolgun Yaprak Frond (Layered Emerald Leaves)
    const fronds = [
        { endX: -65, endY: -35, ctrlX: -45, ctrlY: -70 },
        { endX: 62, endY: -32, ctrlX: 42, ctrlY: -68 },
        { endX: -75, endY: 5, ctrlX: -55, ctrlY: -35 },
        { endX: 72, endY: 8, ctrlX: 52, ctrlY: -32 },
        { endX: -45, endY: -65, ctrlX: -25, ctrlY: -95 },
        { endX: 42, endY: -62, ctrlX: 22, ctrlY: -92 },
        { endX: -10, endY: -80, ctrlX: -8, ctrlY: -105 },
        { endX: 12, endY: -78, ctrlX: 10, ctrlY: -102 }
    ];

    fronds.forEach((f, idx) => {
        // Yaprak Ana Omurgası
        ctx.strokeStyle = (idx % 2 === 0) ? "#15803d" : "#16a34a";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(crownX, crownY);
        ctx.quadraticCurveTo(crownX + f.ctrlX, crownY + f.ctrlY, crownX + f.endX, crownY + f.endY);
        ctx.stroke();

        // Yaprak Saçakları (Tüylü yeşil dalcıklar)
        ctx.strokeStyle = (idx % 2 === 0) ? "#22c55e" : "#4ade80";
        ctx.lineWidth = 1.5;
        for (let s = 0.2; s <= 0.9; s += 0.15) {
            let px = crownX + f.ctrlX * s * 0.8 + f.endX * (1 - s) * 0.3;
            let py = crownY + f.ctrlY * s * 0.8 + f.endY * (1 - s) * 0.3;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + (idx % 2 === 0 ? -7 : 7), py + 6);
            ctx.stroke();
        }
    });

    ctx.restore();
}

// B) TROPİK SAHİL KOKTEYL BARI
function drawTikiBeachBar(bctx, x, y, w, h) {
    bctx.save();
    // Bar Zemin Gölgesi
    bctx.fillStyle = "rgba(0,0,0,0.25)";
    bctx.beginPath();
    bctx.roundRect(x + 2, y + h - 4, w - 4, 10, 4);
    bctx.fill();

    // Bambu Ayaklar & Yan Duvarlar
    bctx.fillStyle = "#78350f";
    bctx.fillRect(x + 6, y + 20, w - 12, h - 22);
    bctx.strokeStyle = "#ca8a04";
    bctx.lineWidth = 1.5;
    bctx.strokeRect(x + 6, y + 20, w - 12, h - 22);

    // Dikey Bambu Çıtalar
    for (let bx = x + 14; bx < x + w - 10; bx += 12) {
        bctx.fillStyle = "#a16207";
        bctx.fillRect(bx, y + 20, 3, h - 22);
    }

    // Ahşap Servis Tezgahı
    bctx.fillStyle = "#92400e";
    bctx.beginPath();
    bctx.roundRect(x + 2, y + 24, w - 4, 10, 3);
    bctx.fill();
    bctx.strokeStyle = "#facc15";
    bctx.lineWidth = 1;
    bctx.stroke();

    // Tezgahtaki İçecekler & Meyveler
    // Hindistan Cevizi Kokteyli (Pipetli)
    bctx.fillStyle = "#713f12";
    bctx.beginPath(); bctx.arc(x + 24, y + 20, 5, 0, Math.PI * 2); bctx.fill();
    bctx.strokeStyle = "#ef4444"; bctx.lineWidth = 1.5; // Kırmızı Pipet
    bctx.beginPath(); bctx.moveTo(x + 24, y + 17); bctx.lineTo(x + 28, y + 10); bctx.stroke();

    // Tropik Meyve Kasesi / Ananas
    bctx.fillStyle = "#eab308";
    bctx.beginPath(); bctx.roundRect(x + 48, y + 14, 10, 12, 3); bctx.fill();
    bctx.fillStyle = "#15803d";
    bctx.beginPath(); bctx.moveTo(x + 53, y + 14); bctx.lineTo(x + 50, y + 8); bctx.lineTo(x + 56, y + 8); bctx.closePath(); bctx.fill();

    // Renkli Sörf Tahtası (Bara Dayalı)
    bctx.fillStyle = "#06b6d4";
    bctx.beginPath();
    bctx.ellipse(x + w - 14, y + h / 2 + 6, 6, 22, -0.2, 0, Math.PI * 2);
    bctx.fill();
    bctx.strokeStyle = "#facc15";
    bctx.lineWidth = 1.2;
    bctx.stroke();
    // Sörf Çizgisi
    bctx.strokeStyle = "#ffffff";
    bctx.lineWidth = 1.5;
    bctx.beginPath();
    bctx.moveTo(x + w - 16, y + h / 2 - 10);
    bctx.lineTo(x + w - 12, y + h / 2 + 20);
    bctx.stroke();

    // Saz / Hasır Çatı (Thatched Straw Roof Overhang)
    bctx.fillStyle = "#ca8a04";
    bctx.beginPath();
    bctx.moveTo(x - 6, y + 20);
    bctx.lineTo(x + w / 2, y - 4);
    bctx.lineTo(x + w + 6, y + 20);
    bctx.closePath();
    bctx.fill();

    bctx.fillStyle = "#eab308";
    bctx.beginPath();
    bctx.moveTo(x - 2, y + 18);
    bctx.lineTo(x + w / 2, y - 2);
    bctx.lineTo(x + w + 2, y + 18);
    bctx.closePath();
    bctx.fill();

    // Çatı Püskülleri
    bctx.strokeStyle = "#fef08a";
    bctx.lineWidth = 1.2;
    for (let rx = x - 6; rx <= x + w + 6; rx += 6) {
        bctx.beginPath();
        bctx.moveTo(rx, y + 19);
        bctx.lineTo(rx + 2, y + 25);
        bctx.stroke();
    }

    // Tabela
    bctx.fillStyle = "#1e293b";
    bctx.beginPath();
    bctx.roundRect(x + w / 2 - 38, y + 4, 76, 15, 4);
    bctx.fill();
    bctx.strokeStyle = "#facc15";
    bctx.lineWidth = 1;
    bctx.stroke();

    bctx.fillStyle = "#facc15";
    bctx.font = "bold 8.5px sans-serif";
    bctx.textAlign = "center";
    bctx.fillText("🍹 TROPİK BAR", x + w / 2, y + 15);

    bctx.restore();
}

// C) PLAJ ŞEZLONGLARI & HASIR TİKİ ŞEMSİYE
function drawBeachLoungers(bctx, x, y) {
    bctx.save();
    // Taban Gölgesi
    bctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    bctx.beginPath();
    bctx.ellipse(x + 28, y + 18, 44, 16, 0, 0, Math.PI * 2);
    bctx.fill();

    // 1. Şezlong (Turkuaz Çizgili Minder)
    bctx.fillStyle = "#78350f"; // Teak Ahşap İskelet
    bctx.fillRect(x, y + 2, 46, 20);
    bctx.fillStyle = "#0284c7"; // Mavi Minder
    bctx.beginPath(); bctx.roundRect(x + 2, y + 4, 42, 16, 3); bctx.fill();
    bctx.fillStyle = "#ffffff"; // Çizgiler
    bctx.fillRect(x + 12, y + 4, 5, 16);
    bctx.fillRect(x + 24, y + 4, 5, 16);
    bctx.fillRect(x + 36, y + 4, 5, 16);

    // 2. Şezlong (Mercan Pembesi Çizgili Minder)
    bctx.fillStyle = "#78350f";
    bctx.fillRect(x + 6, y + 28, 46, 20);
    bctx.fillStyle = "#f43f5e";
    bctx.beginPath(); bctx.roundRect(x + 8, y + 30, 42, 16, 3); bctx.fill();
    bctx.fillStyle = "#ffffff";
    bctx.fillRect(x + 18, y + 30, 5, 16);
    bctx.fillRect(x + 30, y + 30, 5, 16);

    // Hasır Tiki Şemsiye Direği
    bctx.strokeStyle = "#78350f";
    bctx.lineWidth = 4;
    bctx.beginPath();
    bctx.moveTo(x + 58, y + 32);
    bctx.lineTo(x + 58, y - 18);
    bctx.stroke();

    // Hasır Şemsiye Kubbesi
    bctx.fillStyle = "#eab308";
    bctx.beginPath();
    bctx.arc(x + 58, y - 18, 30, Math.PI, 0);
    bctx.fill();

    bctx.strokeStyle = "#ca8a04";
    bctx.lineWidth = 2;
    for (let a = Math.PI; a <= 0; a += Math.PI / 6) {
        bctx.beginPath();
        bctx.moveTo(x + 58, y - 18);
        bctx.lineTo(x + 58 + Math.cos(a) * 30, y - 18 + Math.sin(a) * 30);
        bctx.stroke();
    }

    // Hasır Püskülleri
    bctx.strokeStyle = "#fef08a";
    bctx.lineWidth = 1.2;
    for (let sx = x + 26; sx <= x + 90; sx += 4) {
        bctx.beginPath();
        bctx.moveTo(sx, y - 18);
        bctx.lineTo(sx + 1, y - 12);
        bctx.stroke();
    }

    // Sehpa & Soğuk İçecek
    bctx.fillStyle = "#451a03";
    bctx.beginPath(); bctx.arc(x + 44, y + 24, 7, 0, Math.PI * 2); bctx.fill();
    bctx.fillStyle = "#38bdf8";
    bctx.fillRect(x + 42, y + 20, 4, 6);
    bctx.fillStyle = "#84cc16"; // Limon dilimi
    bctx.beginPath(); bctx.arc(x + 44, y + 19, 2, 0, Math.PI * 2); bctx.fill();

    bctx.restore();
}

// D) DERİN DENİZDEKİ LÜKS UFUK YATI / YELKENLİ
function drawHorizonYacht(bctx, x, y) {
    bctx.save();
    // Su Yüzey Yansıması
    bctx.fillStyle = "rgba(15, 23, 42, 0.25)";
    bctx.beginPath();
    bctx.ellipse(x + 16, y + 12, 28, 4, 0, 0, Math.PI * 2);
    bctx.fill();

    // Beyaz Tekne Gövdesi
    bctx.fillStyle = "#ffffff";
    bctx.beginPath();
    bctx.moveTo(x - 14, y + 6);
    bctx.lineTo(x + 36, y + 6);
    bctx.lineTo(x + 44, y + 2);
    bctx.lineTo(x + 32, y - 2);
    bctx.lineTo(x - 10, y - 2);
    bctx.closePath();
    bctx.fill();

    // Lacivert Su Çizgisi
    bctx.strokeStyle = "#0284c7";
    bctx.lineWidth = 1.5;
    bctx.beginPath();
    bctx.moveTo(x - 12, y + 4);
    bctx.lineTo(x + 38, y + 4);
    bctx.stroke();

    // Kabin & Pencereler
    bctx.fillStyle = "#e2e8f0";
    bctx.fillRect(x, y - 6, 20, 5);
    bctx.fillStyle = "#0284c7";
    bctx.fillRect(x + 3, y - 5, 4, 3);
    bctx.fillRect(x + 9, y - 5, 4, 3);
    bctx.fillRect(x + 15, y - 5, 4, 3);

    // Yelken Direği
    bctx.strokeStyle = "#94a3b8";
    bctx.lineWidth = 1.8;
    bctx.beginPath();
    bctx.moveTo(x + 12, y - 2);
    bctx.lineTo(x + 12, y - 32);
    bctx.stroke();

    // Beyaz Şişkin Üçgen Yelken
    bctx.fillStyle = "#ffffff";
    bctx.beginPath();
    bctx.moveTo(x + 14, y - 30);
    bctx.lineTo(x + 28, y - 8);
    bctx.lineTo(x + 14, y - 8);
    bctx.closePath();
    bctx.fill();
    bctx.strokeStyle = "rgba(0,0,0,0.15)";
    bctx.lineWidth = 1;
    bctx.stroke();

    // Ön Flok Yelkeni
    bctx.fillStyle = "#f8fafc";
    bctx.beginPath();
    bctx.moveTo(x + 10, y - 28);
    bctx.lineTo(x - 6, y - 5);
    bctx.lineTo(x + 10, y - 5);
    bctx.closePath();
    bctx.fill();

    // Minik Kırmızı Bayrak
    bctx.fillStyle = "#ef4444";
    bctx.beginPath();
    bctx.moveTo(x + 12, y - 32);
    bctx.lineTo(x + 18, y - 30);
    bctx.lineTo(x + 12, y - 28);
    bctx.closePath();
    bctx.fill();

    bctx.restore();
}

function renderStaticBeachTo(bctx, width, height) {
    // 1. Berrak Turkuaz Derin Deniz Tabanı
    let oceanGrad = bctx.createLinearGradient(0, 0, width * 0.7, height * 0.7);
    oceanGrad.addColorStop(0, '#0369a1');
    oceanGrad.addColorStop(0.35, '#0284c7');
    oceanGrad.addColorStop(0.7, '#0ea5e9');
    oceanGrad.addColorStop(1, '#38bdf8');
    bctx.fillStyle = oceanGrad;
    bctx.fillRect(0, 0, width, height);

    // 2. Sıcak Altın Kumsal (Büyüleyici Kıyı Kıvrımı)
    let sandGrad = bctx.createLinearGradient(350, 200, width, height);
    sandGrad.addColorStop(0, '#fef08a');
    sandGrad.addColorStop(0.6, '#fde047');
    sandGrad.addColorStop(1, '#eab308');
    bctx.fillStyle = sandGrad;
    bctx.beginPath();
    bctx.moveTo(180, height);
    bctx.bezierCurveTo(310, 380, 420, 240, width, 140);
    bctx.lineTo(width, height);
    bctx.closePath();
    bctx.fill();

    // Kumsal Islak Kum Şeridi (Suya yakın koyulaşan altın kum)
    bctx.strokeStyle = "rgba(180, 83, 9, 0.25)";
    bctx.lineWidth = 8;
    bctx.beginPath();
    bctx.moveTo(182, height);
    bctx.bezierCurveTo(312, 380, 422, 240, width, 142);
    bctx.stroke();

    // 3. Kumsaldaki Deniz Kabukları & Çakıllar
    BEACH_SHELLS.forEach(s => {
        bctx.fillStyle = s.c;
        bctx.beginPath();
        bctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        bctx.fill();
        bctx.strokeStyle = "rgba(0,0,0,0.15)";
        bctx.lineWidth = 0.8;
        bctx.stroke();
    });

    // Deniz Yıldızları (Kumsala Vuran Yıldızlar ⭐)
    BEACH_STARFISH.forEach(st => {
        bctx.save();
        bctx.translate(st.x, st.y);
        bctx.rotate(st.rot);
        bctx.fillStyle = st.c;
        bctx.beginPath();
        for (let i = 0; i < 5; i++) {
            let armA = (i * 2 * Math.PI) / 5 - Math.PI / 2;
            let innerA = armA + Math.PI / 5;
            let armR = 7, innerR = 3;
            if (i === 0) bctx.moveTo(Math.cos(armA) * armR, Math.sin(armA) * armR);
            else bctx.lineTo(Math.cos(armA) * armR, Math.sin(armA) * armR);
            bctx.lineTo(Math.cos(innerA) * innerR, Math.sin(innerA) * innerR);
        }
        bctx.closePath();
        bctx.fill();
        bctx.restore();
    });

    // 4. Ufuktaki Lüks Yat / Yelkenli
    drawHorizonYacht(bctx, 70, 56);

    // 5. Ahşap Balıkçılık İskelesi & Köprüsü (Kumsala Tamamen Kenetlenmiş: pierX=110, pierW=440 -> x=550)
    let pierX = 110, pierY = 160, pierW = 440, pierH = 65;

    // İskele Kazıkları (Yalnızca su altındaki kısımda: x <= 480)
    PIER_PILINGS_X.forEach(px => {
        bctx.fillStyle = "rgba(15, 23, 42, 0.4)";
        bctx.fillRect(px - 1, pierY + pierH, 14, 28);
        bctx.fillStyle = "#451a03";
        bctx.fillRect(px, pierY + pierH, 10, 24);
        bctx.fillStyle = "#78350f";
        bctx.fillRect(px + 2, pierY + pierH, 6, 24);
    });

    // İskele Taban Gölgesi
    bctx.fillStyle = "rgba(15, 23, 42, 0.35)";
    bctx.fillRect(pierX + 4, pierY + 6, pierW, pierH);

    // Ana Ahşap Gövde (Ceviz / Meşe Kirişler)
    bctx.fillStyle = "#78350f";
    bctx.fillRect(pierX, pierY, pierW, pierH);
    bctx.strokeStyle = "#451a03";
    bctx.lineWidth = 2;
    bctx.strokeRect(pierX, pierY, pierW, pierH);

    // Ahşap Tahta Çizgileri ve Çivi Başları
    bctx.strokeStyle = "#451a03";
    bctx.lineWidth = 1.2;
    for (let x = pierX + 16; x < pierX + pierW; x += 18) {
        bctx.beginPath();
        bctx.moveTo(x, pierY);
        bctx.lineTo(x, pierY + pierH);
        bctx.stroke();

        bctx.fillStyle = "#1e293b";
        bctx.fillRect(x - 8, pierY + 4, 1.5, 1.5);
        bctx.fillRect(x - 8, pierY + pierH - 6, 1.5, 1.5);
    }

    // Köprünün Kumsala Birleştiği Taş & Ahşap Rampa (x: 540..556)
    bctx.fillStyle = "#5c2809";
    bctx.beginPath();
    bctx.roundRect(pierX + pierW - 8, pierY - 2, 20, pierH + 4, 4);
    bctx.fill();
    bctx.strokeStyle = "#facc15";
    bctx.lineWidth = 1.5;
    bctx.stroke();

    // Palamar Babaları (Bollards)
    let bollards = [pierX + 15, pierX + 120, pierX + 225, pierX + 330];
    bollards.forEach(bx => {
        bctx.fillStyle = "#92400e";
        bctx.beginPath();
        bctx.roundRect(bx, pierY - 10, 10, 14, 2);
        bctx.fill();
        bctx.strokeStyle = "#451a03";
        bctx.lineWidth = 1;
        bctx.stroke();
    });

    // Balıkçı Kovası
    bctx.fillStyle = "#0284c7";
    bctx.beginPath();
    bctx.roundRect(pierX + 30, pierY + 12, 16, 18, 2);
    bctx.fill();
    bctx.fillStyle = "#38bdf8";
    bctx.fillRect(pierX + 32, pierY + 12, 12, 3);
    bctx.fillStyle = "#f97316";
    bctx.beginPath();
    bctx.moveTo(pierX + 42, pierY + 10);
    bctx.lineTo(pierX + 49, pierY + 3);
    bctx.lineTo(pierX + 46, pierY + 12);
    bctx.closePath();
    bctx.fill();

    // 6. Plaj Şezlongları ve Hasır Tiki Şemsiye
    drawBeachLoungers(bctx, 580, 295);

    // 7. Tropik Sahil Barı (Sağ Altta: x: 650, y: 385, w: 130, h: 72)
    drawTikiBeachBar(bctx, 650, 385, 130, 72);

    // 7.1 Tropik Bar Önü 3 Adet Ahşap & Minderli Bar Taburesi
    const barStoolCoords = [{ x: 678, y: 462 }, { x: 712, y: 462 }, { x: 746, y: 462 }];
    barStoolCoords.forEach(st => {
        // Tabure Ayakları
        bctx.strokeStyle = "#78350f";
        bctx.lineWidth = 2.5;
        bctx.beginPath();
        bctx.moveTo(st.x - 7, st.y); bctx.lineTo(st.x - 5, st.y - 12);
        bctx.moveTo(st.x + 7, st.y); bctx.lineTo(st.x + 5, st.y - 12);
        bctx.stroke();

        // Bambu Çember Bağlantısı
        bctx.strokeStyle = "#ca8a04";
        bctx.lineWidth = 1.5;
        bctx.beginPath();
        bctx.ellipse(st.x, st.y - 6, 6, 2.5, 0, 0, Math.PI * 2);
        bctx.stroke();

        // Rahat Turkuaz Minder Tabanı
        bctx.fillStyle = "#0284c7";
        bctx.beginPath();
        bctx.ellipse(st.x, st.y - 12, 10, 6, 0, 0, Math.PI * 2);
        bctx.fill();
        bctx.strokeStyle = "#facc15";
        bctx.lineWidth = 1;
        bctx.stroke();

        // Minder Işık Parlaması
        bctx.fillStyle = "#38bdf8";
        bctx.beginPath();
        bctx.ellipse(st.x - 2, st.y - 13, 6, 3, 0, 0, Math.PI * 2);
        bctx.fill();
    });

    // 8. Taşlı Kamp Ateşi Çemberi (x: 485, y: 390)
    let fireX = 485, fireY = 390;
    bctx.fillStyle = "rgba(0,0,0,0.3)";
    bctx.beginPath(); bctx.ellipse(fireX, fireY + 2, 22, 14, 0, 0, Math.PI * 2); bctx.fill();

    // Dere Taşları Çemberi
    const stoneAngles = [0, 0.55, 1.15, 1.7, 2.3, 2.85, 3.45, 4.0, 4.6, 5.2, 5.75];
    stoneAngles.forEach(ang => {
        let sx = fireX + Math.cos(ang) * 16;
        let sy = fireY + Math.sin(ang) * 10;
        bctx.fillStyle = "#64748b";
        bctx.beginPath(); bctx.arc(sx, sy, 4.2, 0, Math.PI * 2); bctx.fill();
        bctx.strokeStyle = "#334155"; bctx.lineWidth = 1; bctx.stroke();
    });
    // Kömür & Yanık Odun Tabanı
    bctx.fillStyle = "#1e1e24";
    bctx.beginPath(); bctx.ellipse(fireX, fireY, 11, 7, 0, 0, Math.PI * 2); bctx.fill();
    // Odunlar
    bctx.strokeStyle = "#451a03"; bctx.lineWidth = 2.5;
    bctx.beginPath(); bctx.moveTo(fireX - 8, fireY - 3); bctx.lineTo(fireX + 8, fireY + 3); bctx.stroke();
    bctx.beginPath(); bctx.moveTo(fireX + 7, fireY - 3); bctx.lineTo(fireX - 7, fireY + 3); bctx.stroke();

    // 9. İskele Girişindeki Bambu Meşaleler (Tiki Torches)
    [[535, 152], [535, 232]].forEach(tp => {
        bctx.strokeStyle = "#78350f";
        bctx.lineWidth = 3;
        bctx.beginPath(); bctx.moveTo(tp[0], tp[1]); bctx.lineTo(tp[0], tp[1] - 18); bctx.stroke();
        bctx.fillStyle = "#ca8a04";
        bctx.fillRect(tp[0] - 3, tp[1] - 22, 6, 5);
    });

    // 11. Palmiye Ağaçları (3 Muhteşem Hindistan Cevizi Ağacı)
    drawDetailedPalmTree(bctx, 745, 375, 1.15); // Büyük Görkemli Palmiye
    drawDetailedPalmTree(bctx, 765, 142, 0.9);  // Giriş Palmiyesi
    drawDetailedPalmTree(bctx, 585, 475, 0.85); // Alt Kumul Palmiyesi

    // 12. Türkiye Karayolları Tipi Çiftli Yol Tabelası (Kumsal / Sahil Çıkışında Üst Üste İki Tabela)
    // Üstte: MEYDAN ➔, Altta: CADDE ➔
    drawStackedTurkishSigns(bctx, width - 96, 170, [
        { text: "MEYDAN", dir: "right" },
        { text: "CADDE", dir: "right" }
    ], 222);
}

function drawBeachEnvironment() {
    let now = Date.now();
    let bg = bgCache.getCanvas('sahil', canvas.width, canvas.height);
    ctx.drawImage(bg, 0, 0);

    // 1. Deniz İçi Canlı Su Dalgalanmaları & Işık Kırılmaları
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
        let waveY = 60 + i * 45;
        let waveOffset = Math.sin((now / 1200) + i) * 18;
        ctx.beginPath();
        ctx.moveTo(0, waveY + waveOffset);
        ctx.bezierCurveTo(
            150, waveY - 12 + waveOffset,
            300, waveY + 12 + waveOffset,
            450, waveY + waveOffset
        );
        ctx.stroke();
    }

    // 2. Canlı Gelgit Kumsal Köpüğü (Multi-Layer Foam Wave)
    let tide = Math.sin(now / 1400) * 8;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(180 + tide, canvas.height);
    ctx.bezierCurveTo(
        310 + tide, 380,
        420 + tide, 240,
        canvas.width, 140 + tide * 0.5
    );
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(172 + tide, canvas.height);
    ctx.bezierCurveTo(
        302 + tide, 380,
        412 + tide, 240,
        canvas.width, 132 + tide * 0.5
    );
    ctx.stroke();

    // 3. İskele Direkleri Su Yüzey Dalgaları
    let pierY = 160, pierH = 65;
    PIER_PILINGS_X.forEach(px => {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(px + 5, pierY + pierH + 22, 9, 3.5, 0, 0, Math.PI * 2);
        ctx.stroke();
    });

    // 4. Canlı Kamp Ateşi Alevi & Kıvılcımları (x: 490, y: 390)
    let fireX = 490, fireY = 390;
    let flamePulse = Math.sin(now / 120) * 2;
    let flameH = 14 + flamePulse;

    // Dış Turuncu Alev
    ctx.fillStyle = "rgba(249, 115, 22, 0.85)";
    ctx.beginPath();
    ctx.moveTo(fireX - 6, fireY + 1);
    ctx.quadraticCurveTo(fireX - 8, fireY - flameH * 0.6, fireX, fireY - flameH);
    ctx.quadraticCurveTo(fireX + 8, fireY - flameH * 0.6, fireX + 6, fireY + 1);
    ctx.closePath();
    ctx.fill();

    // İç Sarı Alev
    ctx.fillStyle = "rgba(253, 224, 71, 0.95)";
    ctx.beginPath();
    ctx.moveTo(fireX - 3.5, fireY);
    ctx.quadraticCurveTo(fireX - 4, fireY - flameH * 0.5, fireX, fireY - flameH * 0.8);
    ctx.quadraticCurveTo(fireX + 4, fireY - flameH * 0.5, fireX + 3.5, fireY);
    ctx.closePath();
    ctx.fill();

    // Havaya Uçuşan Kıvılcımlar
    for (let sp = 0; sp < 4; sp++) {
        let sparkLife = ((now / 35 + sp * 25) % 40);
        let sparkX = fireX + Math.sin(now / 150 + sp) * 7;
        let sparkY = fireY - flameH - sparkLife;
        ctx.fillStyle = `rgba(254, 240, 138, ${1 - sparkLife / 40})`;
        ctx.beginPath(); ctx.arc(sparkX, sparkY, 1.2, 0, Math.PI * 2); ctx.fill();
    }

    // 5. Bambu Meşalelerin Canlı Ateşleri (x: 535, y: 152 / 232)
    [[535, 152], [535, 232]].forEach((tp, tIdx) => {
        let tFlame = Math.sin(now / 100 + tIdx) * 1.5;
        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.arc(tp[0], tp[1] - 24 + tFlame, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(tp[0], tp[1] - 25 + tFlame, 2, 0, Math.PI * 2);
        ctx.fill();
    });

    // 6. Uçan Martılar
    let gulls = [
        { baseX: 160, baseY: 65, speed: 1.8, span: 12 },
        { baseX: 340, baseY: 90, speed: 1.4, span: 9 },
        { baseX: 510, baseY: 45, speed: 2.1, span: 14 }
    ];
    gulls.forEach((g, idx) => {
        let gx = (g.baseX + (now / 40) * g.speed) % (canvas.width + 40) - 20;
        let gy = g.baseY + Math.sin((now / 350) + idx) * 6;
        let wingFlap = Math.sin(now / 120) * 4;

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(gx - g.span, gy + wingFlap);
        ctx.quadraticCurveTo(gx - g.span / 2, gy - 3, gx, gy);
        ctx.quadraticCurveTo(gx + g.span / 2, gy - 3, gx + g.span, gy + wingFlap);
        ctx.stroke();
    });

    // 6.1 Köprünün En Solundaki Kuğu Bisikletçi (Kiralama NPC'si)
    let vendorX = 135, vendorY = 188;
    let isVendorHover = (canvasMouseX >= 105 && canvasMouseX <= 165 && canvasMouseY >= 145 && canvasMouseY <= 225);

    // NPC Ayak Gölgesi
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(vendorX, vendorY + 12, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hover Işıltısı
    if (isVendorHover) {
        ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
        ctx.beginPath();
        ctx.arc(vendorX, vendorY - 6, 22, 0, Math.PI * 2);
        ctx.fill();
    }

    // NPC Vücut (Denizci Kaptanı Kıyafeti)
    // Pantolon
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(vendorX - 6, vendorY, 5, 12);
    ctx.fillRect(vendorX + 1, vendorY, 5, 12);
    // Çizgili Tişört
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(vendorX - 9, vendorY - 14, 18, 15, 3);
    ctx.fill();
    ctx.fillStyle = "#0284c7";
    ctx.fillRect(vendorX - 8, vendorY - 11, 16, 2.5);
    ctx.fillRect(vendorX - 8, vendorY - 6, 16, 2.5);
    // Kafa & Gülümseme
    ctx.fillStyle = "#fed7aa";
    ctx.beginPath();
    ctx.arc(vendorX, vendorY - 20, 7, 0, Math.PI * 2);
    ctx.fill();
    // Kaptan Şapkası (Sarı Çapalı Lacivert Vizör)
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.roundRect(vendorX - 8, vendorY - 27, 16, 6, 2);
    ctx.fill();
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(vendorX, vendorY - 24, 2, 0, Math.PI * 2);
    ctx.fill();

    // Tabela / Rozet (Kuğu Bisikletçi)
    ctx.fillStyle = isVendorHover ? "rgba(15, 23, 42, 0.95)" : "rgba(15, 23, 42, 0.85)";
    ctx.beginPath();
    ctx.roundRect(vendorX - 55, vendorY - 48, 110, 20, 6);
    ctx.fill();
    ctx.strokeStyle = isVendorHover ? "#38bdf8" : "#facc15";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = isVendorHover ? "#38bdf8" : "#ffffff";
    ctx.font = "bold 9.5px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🦢 Kaptan Kuğu", vendorX, vendorY - 37);
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 8.5px sans-serif";
    ctx.fillText("20 TL (Tıkla Kirala)", vendorX, vendorY - 30);

    // 6.2 Köprü Yanında Suda Animasyonlu Yüzen Kuğu Bisikletleri (2 Adet)
    function drawFloatingSwanBoat(cx, cy, animOffset, facingLeft) {
        let bobY = cy + Math.sin(now / 380 + animOffset) * 3.5;
        let bobTilt = Math.sin(now / 420 + animOffset) * 0.04;

        ctx.save();
        ctx.translate(cx, bobY);
        if (facingLeft) ctx.scale(-1, 1);
        ctx.rotate(bobTilt);

        // Su dalgası & köpük halkası
        let rippleR = 22 + Math.sin(now / 220 + animOffset) * 2;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 15, rippleR, 7, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Kuğu Tekne Tabanı (Gövdesi)
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.ellipse(0, 10, 24, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Güneşlik Tentesi (Turkuaz - Beyaz Çizgili)
        ctx.fillStyle = "#0284c7";
        ctx.beginPath();
        ctx.roundRect(-10, -6, 18, 5, 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-6, -6, 4, 5);
        ctx.fillRect(2, -6, 4, 5);
        // Tente Direkleri
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-8, -1); ctx.lineTo(-8, 8);
        ctx.moveTo(6, -1); ctx.lineTo(6, 8);
        ctx.stroke();

        // Zarif Kuğu Boynu & Başı
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(12, 10);
        ctx.quadraticCurveTo(22, -6, 16, -14);
        ctx.lineTo(11, -14);
        ctx.quadraticCurveTo(14, 0, 8, 10);
        ctx.closePath();
        ctx.fill();

        // Turuncu Gaga & Siyah Maske
        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.moveTo(16, -14);
        ctx.lineTo(22, -11);
        ctx.lineTo(16, -9);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(14, -12, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // 1. Kuğu (Köprünün sol yanında, hafifçe süzülüyor)
    drawFloatingSwanBoat(68, 198, 0, false);
    // 2. Kuğu (Köprünün biraz üstünde, karşıya bakıyor)
    drawFloatingSwanBoat(76, 138, 1.8, true);

    // 7. Bilgilendirme ve Tıklama Rozeti (Sahil Başlığı)
    let isWaterHover = (canvasMouseX < 560 || canvasMouseY < 320);
    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    ctx.beginPath();
    ctx.roundRect(18, 16, 310, 34, 10);
    ctx.fill();
    ctx.strokeStyle = isWaterHover ? "#38bdf8" : "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = isWaterHover ? "#38bdf8" : "#fef08a";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("🎣 Martı Sahili & Balıkçılık İskelesi", 30, 32);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "10px sans-serif";
    ctx.fillText(isWaterHover ? "✨ Oltanı atmak için tıkla (10 sn bekle)!" : "💡 Denize veya iskeleye tıkla, balık tut!", 30, 44);
}


function renderStaticNargileCafeTo(bctx, width, height) {
    // 1. Zemin: Şık Koyu Bordo / Otantik Doğu Halısı
    bctx.fillStyle = "#450a0a";
    bctx.fillRect(0, 0, width, height);

    // Otantik halı bordürü
    bctx.strokeStyle = "#ca8a04";
    bctx.lineWidth = 4;
    bctx.strokeRect(15, 15, width - 30, height - 30);
    bctx.strokeStyle = "#991b1b";
    bctx.lineWidth = 2;
    bctx.strokeRect(22, 22, width - 44, height - 44);

    // Halı geometrik desenleri
    bctx.fillStyle = "rgba(180, 83, 9, 0.25)";
    for (let x = 60; x < width - 60; x += 110) {
        for (let y = 60; y < height - 60; y += 110) {
            bctx.beginPath();
            bctx.arc(x, y, 22, 0, Math.PI * 2);
            bctx.fill();
        }
    }



    // 3. Sol Üst ve Sağ Üst Nargile Locaları (Genişletilmiş ve Lüks Köşe Sedirler)
    drawLuxuryLoungeSuite(bctx, 30, 55, 175, 115, false);
    drawLuxuryLoungeSuite(bctx, 595, 55, 175, 115, true);

    // 5. Nargile Köz Semaveri / Tezgahı (Sol Altta)
    drawHookahCounter(bctx, 75, 380);

    // 6. Meydan Çıkış Kapısı (Ortada - Ortadan Giriş / Çıkış)
    drawExitDoor(bctx, width / 2 - 35, height - 65, "🚪 MEYDAN", 70, 60);

    // 7. Mutfak / Garson Kapısı (En Sağ Altta - Sadece Görevliler Girebilir)
    drawKitchenDoor(bctx, width - 105, height - 68, 90, 68);
}

function drawKitchenDoor(ctx, x, y, w, h) {
    ctx.save();
    // Kapı Kasası & Ahşap pervaz
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.roundRect(x - 3, y - 3, w + 6, h + 6, 8);
    ctx.fill();
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Paslanmaz Çelik Mutfak Kanadı
    let doorGrad = ctx.createLinearGradient(x, y, x + w, y);
    doorGrad.addColorStop(0, '#475569');
    doorGrad.addColorStop(0.5, '#94a3b8');
    doorGrad.addColorStop(1, '#334155');
    ctx.fillStyle = doorGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();

    // Kapı ortası dikey kanat çizgisi
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y + 2);
    ctx.lineTo(x + w / 2, y + h);
    ctx.stroke();

    // Metal tekme koruma plakası (Kickplate - Alt tarafta)
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(x + 4, y + h - 14, w - 8, 10);
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(x + 6, y + h - 12, w - 12, 1);

    // İki Adet Yuvarlak Lumboz Cam Pencere (Sıcak mutfak ışığı parıltısıyla)
    [x + w / 4, x + (3 * w) / 4].forEach(px => {
        ctx.fillStyle = "#1e293b";
        ctx.beginPath(); ctx.arc(px, y + 22, 11, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 1.5; ctx.stroke();

        let winGrad = ctx.createRadialGradient(px - 2, y + 20, 2, px, y + 22, 9);
        winGrad.addColorStop(0, '#fef08a');
        winGrad.addColorStop(0.7, '#f59e0b');
        winGrad.addColorStop(1, '#b45309');
        ctx.fillStyle = winGrad;
        ctx.beginPath(); ctx.arc(px, y + 22, 9, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(px, y + 22, 6, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
    });

    // Tabela: 👨‍🍳 MUTFAK (SADECE GÖREVLİLER)
    ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
    ctx.beginPath();
    ctx.roundRect(x + w / 2 - 45, y - 20, 90, 18, 5);
    ctx.fill();
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = "#facc15";
    ctx.font = "bold 8.5px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("👨‍🍳 MUTFAK (GÖREVLİ)", x + w / 2, y - 8);

    ctx.restore();
}

function drawNargileCafeEnvironment() {
    let bg = bgCache.getCanvas('nargile_cafe', canvas.width, canvas.height);
    ctx.drawImage(bg, 0, 0);

    // Mekan İçi Duvar TV'si (Nargile Cafe Üst Duvarda - Büyütülmüş)
    if (typeof drawVenueTV === 'function') {
        drawVenueTV(ctx, 325, 10, 150, 76);
    }

    // İki Adet 101 Okey Masası (Dinamik Hover ve Çerçeve)
    let isHoverTekli = (canvasMouseX >= 145 && canvasMouseX <= 365 && canvasMouseY >= 160 && canvasMouseY <= 360);
    let isHoverEsli = (canvasMouseX >= 435 && canvasMouseX <= 655 && canvasMouseY >= 160 && canvasMouseY <= 360);

    drawNargileOkeyTable(ctx, 160, 175, 190, 135, 'okey101_tekli', '👤 TEKLİ 101 OKEY', '(Bireysel - 4 Kişi)', '#0f766e', '#38bdf8', isHoverTekli);
    drawNargileOkeyTable(ctx, 450, 175, 190, 135, 'okey101', '👥 ÇİFTLİ / EŞLİ 101', '(2v2 Kıraathane & A4 Yazboz)', '#15803d', '#4ade80', isHoverEsli);

    // Sol ve Sağ Loca Hover Kontrolleri
    let isHoverSolLoca = (canvasMouseX >= 25 && canvasMouseX <= 215 && canvasMouseY >= 50 && canvasMouseY <= 175);
    let isHoverSagLoca = (canvasMouseX >= 585 && canvasMouseX <= 775 && canvasMouseY >= 50 && canvasMouseY <= 175);

    drawLoungeHoverOverlay(ctx, 30, 55, 175, 115, 'Sol Üst Nargile Locası', isHoverSolLoca);
    drawLoungeHoverOverlay(ctx, 595, 55, 175, 115, 'Sağ Üst Nargile Locası', isHoverSagLoca);

    // Nargile ve Meyve Tabağı SADECE ve SADECE Sol ve Sağ Loca Sehpalarında Servis Edilir (101 Masalarına Bırakılmaz!)
    if (typeof window.drawTableActiveItems === 'function') {
        window.drawTableActiveItems(ctx, 'lounge_sol', 95, 100, 80, 52);
        window.drawTableActiveItems(ctx, 'lounge_sag', 625, 100, 80, 52);
    }

    // Garson Haydar'ın Servis Animasyonu
    if (typeof window.updateGarsonHaydar === 'function' && typeof window.drawGarsonHaydar === 'function') {
        window.updateGarsonHaydar();
        window.drawGarsonHaydar(ctx);
    }

    // Gerçekçi Nargile Duman Partikülleri
    if (typeof window.updateAndDrawSmokeParticles === 'function') {
        window.updateAndDrawSmokeParticles(ctx);
    }
}

function drawNargileOkeyTable(ctx, x, y, w, h, tableId, title, subTitle, feltColor, accentColor, isHover) {
    ctx.save();

    // 1. Dört Sandalye (Üst, Alt, Sol, Sağ)
    let chairPad = 12;
    // Üst sandalye
    ctx.fillStyle = "#78350f";
    ctx.beginPath(); ctx.roundRect(x + w / 2 - 24, y - chairPad, 48, 10, 4); ctx.fill();
    ctx.fillStyle = feltColor;
    ctx.beginPath(); ctx.roundRect(x + w / 2 - 20, y - chairPad + 2, 40, 6, 2); ctx.fill();
    // Alt sandalye
    ctx.fillStyle = "#78350f";
    ctx.beginPath(); ctx.roundRect(x + w / 2 - 24, y + h + 2, 48, 10, 4); ctx.fill();
    ctx.fillStyle = feltColor;
    ctx.beginPath(); ctx.roundRect(x + w / 2 - 20, y + h + 4, 40, 6, 2); ctx.fill();
    // Sol sandalye
    ctx.fillStyle = "#78350f";
    ctx.beginPath(); ctx.roundRect(x - chairPad, y + h / 2 - 20, 10, 40, 4); ctx.fill();
    ctx.fillStyle = feltColor;
    ctx.beginPath(); ctx.roundRect(x - chairPad + 2, y + h / 2 - 16, 6, 32, 2); ctx.fill();
    // Sağ sandalye
    ctx.fillStyle = "#78350f";
    ctx.beginPath(); ctx.roundRect(x + w + 2, y + h / 2 - 20, 10, 40, 4); ctx.fill();
    ctx.fillStyle = feltColor;
    ctx.beginPath(); ctx.roundRect(x + w + 4, y + h / 2 - 16, 6, 32, 2); ctx.fill();

    // 2. Masa Gölgesi
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.beginPath();
    ctx.roundRect(x + 5, y + 7, w, h, 14);
    ctx.fill();

    // 3. Hover Parlaması (Performans dostu vektörel dış aura)
    if (isHover) {
        ctx.strokeStyle = (typeof accentColor === 'string' && accentColor.startsWith('#')) ? accentColor + "77" : "rgba(202, 138, 4, 0.45)";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.roundRect(x - 2, y - 2, w + 4, h + 4, 14);
        ctx.stroke();
    }

    // 4. Lüks Ahşap Çerçeve & Altın Detay
    ctx.fillStyle = "#451a03";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = isHover ? accentColor : "#ca8a04";
    ctx.lineWidth = isHover ? 3 : 2;
    ctx.stroke();

    // 5. Kadife / Çuha Zemin
    ctx.fillStyle = feltColor;
    ctx.beginPath();
    ctx.roundRect(x + 10, y + 10, w - 20, h - 20, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 6. Dört Istaka (Ahşap)
    ctx.fillStyle = "#b45309";
    ctx.fillRect(x + 32, y + 13, w - 64, 11); // Üst
    ctx.fillRect(x + 32, y + h - 24, w - 64, 11); // Alt
    ctx.fillRect(x + 13, y + 26, 11, h - 52); // Sol
    ctx.fillRect(x + w - 24, y + 26, 11, h - 52); // Sağ

    // Istaka üzerindeki minik taşlar (Fildişi)
    ctx.fillStyle = "#fef08a";
    for (let i = 0; i < 7; i++) {
        ctx.fillRect(x + 36 + i * 16, y + 15, 11, 8);
        ctx.fillRect(x + 36 + i * 16, y + h - 22, 11, 8);
    }
    for (let i = 0; i < 4; i++) {
        ctx.fillRect(x + 14, y + 30 + i * 18, 9, 12);
        ctx.fillRect(x + w - 23, y + 30 + i * 18, 9, 12);
    }

    // 7. Ortadaki Taş Destesi ve Gösterge Taşı
    // Taş destesi (kapalı)
    ctx.fillStyle = "#fef9c3";
    ctx.fillRect(x + w / 2 - 18, y + h / 2 - 9, 15, 18);
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 0.8;
    ctx.strokeRect(x + w / 2 - 18, y + h / 2 - 9, 15, 18);
    ctx.fillStyle = "#b45309";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🀄", x + w / 2 - 10, y + h / 2 + 5);

    // Açık gösterge taşı
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + w / 2 + 2, y + h / 2 - 9, 15, 18);
    ctx.strokeRect(x + w / 2 + 2, y + h / 2 - 9, 15, 18);
    ctx.fillStyle = (tableId === 'okey101_tekli') ? "#0284c7" : "#dc2626";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText((tableId === 'okey101_tekli') ? "7" : "10", x + w / 2 + 10, y + h / 2 + 4);

    // 8. Tabela & Rozet (Masa Altında)
    let badgeBg = isHover ? "rgba(15, 23, 42, 0.95)" : "rgba(15, 23, 42, 0.82)";
    ctx.fillStyle = badgeBg;
    ctx.beginPath();
    ctx.roundRect(x + w / 2 - 82, y + h + 15, 164, 30, 8);
    ctx.fill();
    ctx.strokeStyle = isHover ? accentColor : "rgba(250, 204, 21, 0.35)";
    ctx.lineWidth = isHover ? 1.8 : 1;
    ctx.stroke();

    ctx.fillStyle = isHover ? accentColor : "#facc15";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(title, x + w / 2, y + h + 28);

    ctx.fillStyle = isHover ? "#f8fafc" : "#94a3b8";
    ctx.font = "9px sans-serif";
    ctx.fillText(subTitle, x + w / 2, y + h + 40);

    ctx.restore();
}

// --- 11.2 MOBİLYA MARKETİ ÇİZİMİ (ÖNBELLEKLİ & AKICI) ---
function renderStaticMarketTo(bctx, width, height) {
    // 1. Zemin: Lüks Açık Meşe Showroom Parkesi ve Halı Yolluklar
    bctx.fillStyle = "#b45309";
    bctx.fillRect(0, 0, width, height);

    // Parke derz çizgileri
    bctx.strokeStyle = "rgba(0,0,0,0.15)";
    bctx.lineWidth = 1;
    for (let y = 0; y < height; y += 28) {
        bctx.beginPath(); bctx.moveTo(0, y); bctx.lineTo(width, y); bctx.stroke();
    }
    for (let x = 0; x < width; x += 60) {
        bctx.beginPath(); bctx.moveTo(x, 0); bctx.lineTo(x, height); bctx.stroke();
    }

    // Ana Showroom Halı Yolluğu (Kırmızı & Altın Bordürlü)
    bctx.fillStyle = "#881337";
    bctx.fillRect(265, 0, 70, height);
    bctx.fillRect(0, 260, width, 36);
    bctx.strokeStyle = "#facc15";
    bctx.lineWidth = 1.5;
    bctx.strokeRect(267, 0, 66, height);
    bctx.strokeRect(0, 262, width, 32);

    // 2. Üst Tabela
    bctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    bctx.beginPath();
    bctx.roundRect(width / 2 - 190, 6, 380, 36, 10);
    bctx.fill();
    bctx.strokeStyle = "#22d3ee";
    bctx.lineWidth = 2;
    bctx.stroke();

    bctx.fillStyle = "#22d3ee";
    bctx.font = "bold 15px 'Plus Jakarta Sans', sans-serif";
    bctx.textAlign = "center";
    bctx.fillText("🛒 MOBİLYA & EV DEKORASYON MARKETİ", width / 2, 30);

    // 3. Duvar Teşhir Rafları (Dolu, Canlı ve Şık Mağaza Rafları)
    drawMarketWallShelves(bctx, 30, 48, 480, 80);

    // 4. Kasiyer Hasan ve Danışma Tezgahı (Sağ Üstte)
    let kX = 660, kY = 88;
    bctx.fillStyle = "#451a03";
    bctx.fillRect(kX - 65, kY + 6, 130, 42);
    bctx.fillStyle = "#78350f";
    bctx.fillRect(kX - 60, kY + 10, 120, 34);
    bctx.strokeStyle = "#facc15";
    bctx.lineWidth = 2;
    bctx.strokeRect(kX - 65, kY + 6, 130, 42);

    // Kasa / POS Terminali
    bctx.fillStyle = "#1e293b";
    bctx.fillRect(kX - 45, kY - 4, 28, 14);
    bctx.fillStyle = "#22c55e";
    bctx.fillRect(kX - 43, kY - 2, 24, 10);
    bctx.fillStyle = "#38bdf8";
    bctx.beginPath(); bctx.arc(kX - 10, kY + 4, 3, 0, Math.PI * 2); bctx.fill();

    bctx.fillStyle = "#facc15";
    bctx.font = "bold 11px sans-serif";
    bctx.textAlign = "center";
    bctx.fillText("KASİYER HASAN", kX + 10, kY + 32);

    // Kasiyer NPC Karakteri
    bctx.fillStyle = "#10b981";
    bctx.fillRect(kX + 5, kY - 14, 24, 24);
    bctx.fillStyle = "#ffd1a4";
    bctx.beginPath(); bctx.arc(kX + 17, kY - 24, 10, 0, Math.PI * 2); bctx.fill();
    bctx.fillStyle = "#1e293b";
    bctx.fillRect(kX + 5, kY - 32, 24, 6);
}

function drawMarketEnvironment() {
    let now = Date.now();
    let bg = bgCache.getCanvas('market', canvas.width, canvas.height);
    ctx.drawImage(bg, 0, 0);
    let kX = 660, kY = 88;

    // Konuşma Balonu
    let bobY = Math.sin(now / 300) * 3;
    ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
    ctx.beginPath();
    ctx.roundRect(kX - 110, kY - 74 + bobY, 220, 32, 8);
    ctx.fill();
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("👋 Hoş Geldiniz! Tıklayıp Eşya Satın Alın!", kX, kY - 54 + bobY);

    // 5. BEŞ ADET ZENGİN SHOWROOM PODYUMU:
    // Podyum 1: Salon & Şark Köşesi (Sol Üst)
    drawShowroomPodium(ctx, 135, 195, 200, 100, "🛋️ Otantik Şark Sediri & Halı");
    if (typeof drawPlacedFurniture === 'function') {
        drawPlacedFurniture(ctx, { id: 'hali', x: 135, y: 195 });
        drawPlacedFurniture(ctx, { id: 'sedir', x: 135, y: 185 });
    }

    // Podyum 2: RGB Gaming & Retro Atari (Orta Üst)
    drawShowroomPodium(ctx, 450, 195, 200, 100, "🎮 RGB Gaming PC & Retro Atari");
    if (typeof drawPlacedFurniture === 'function') {
        drawPlacedFurniture(ctx, { id: 'bilgisayar', x: 415, y: 195 });
        drawPlacedFurniture(ctx, { id: 'arcade', x: 495, y: 190 });
    }

    // Podyum 3: Smart TV & Doğal Taş Şömine (Sol Alt)
    drawShowroomPodium(ctx, 135, 375, 200, 110, "📺 Smart TV & Doğal Taş Şömine");
    if (typeof drawPlacedFurniture === 'function') {
        drawPlacedFurniture(ctx, { id: 'tv', x: 85, y: 375 });
        drawPlacedFurniture(ctx, { id: 'somine', x: 185, y: 375 });
    }

    // Podyum 4: Piyano & Kütüphane (Orta Alt)
    drawShowroomPodium(ctx, 450, 375, 200, 110, "🎹 Kuyruklu Piyano & Kütüphane");
    if (typeof drawPlacedFurniture === 'function') {
        drawPlacedFurniture(ctx, { id: 'piyano', x: 410, y: 375 });
        drawPlacedFurniture(ctx, { id: 'kitaplik', x: 495, y: 370 });
    }

    // Podyum 5: Resif Akvaryumu & Lüks Deri Berjer (Sağ Taraf)
    drawShowroomPodium(ctx, 675, 260, 185, 150, "🐠 Canlı Akvaryum & Berjer");
    if (typeof drawPlacedFurniture === 'function') {
        drawPlacedFurniture(ctx, { id: 'akvaryum', x: 675, y: 220 });
        drawPlacedFurniture(ctx, { id: 'berjer', x: 640, y: 280 });
        drawPlacedFurniture(ctx, { id: 'gramofon', x: 715, y: 280 });
    }

    // Tavan Ray Spotları (Showroom Aydınlatmaları)
    drawCeilingTrackLights(ctx);

    // 6. Çıkış Kapısı (Orta Altta - Meydana Çıkış)
    drawExitDoor(ctx, canvas.width / 2 - 25, canvas.height - 65, "🚪 MEYDAN");
}

function drawMarketWallShelves(ctx, x, y, w, h) {
    ctx.save();
    // Ahşap Arka Panel
    ctx.fillStyle = "#3e1c07";
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill();
    ctx.strokeStyle = "#ca8a04"; ctx.lineWidth = 1.5; ctx.stroke();

    // 2 Adet Masif Raf Tablası
    let r1 = y + 36;
    let r2 = y + 74;
    ctx.fillStyle = "#78350f";
    ctx.fillRect(x + 4, r1, w - 8, 6);
    ctx.fillRect(x + 4, r2, w - 8, 6);
    ctx.fillStyle = "#ca8a04";
    ctx.fillRect(x + 4, r1 + 5, w - 8, 1.5);
    ctx.fillRect(x + 4, r2 + 5, w - 8, 1.5);

    // 1. Üst Raftaki Eşyalar:
    // Masa Lambası (Sarı abajur)
    ctx.fillStyle = "#facc15";
    ctx.beginPath(); ctx.moveTo(x + 24, r1 - 22); ctx.lineTo(x + 36, r1 - 22); ctx.lineTo(x + 42, r1 - 10); ctx.lineTo(x + 18, r1 - 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ca8a04"; ctx.fillRect(x + 28, r1 - 10, 4, 10); ctx.fillRect(x + 24, r1, 12, 2);

    // Renkli Kitap Dizisi
    let bColors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
    bColors.forEach((bc, i) => {
        ctx.fillStyle = bc;
        ctx.fillRect(x + 56 + i * 8, r1 - 24, 6, 24);
        ctx.fillStyle = "#fef08a"; ctx.fillRect(x + 56 + i * 8, r1 - 20, 6, 1.5);
    });

    // Porselen Vazo ve Çiçekler
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath(); ctx.ellipse(x + 130, r1 - 8, 7, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ec4899"; ctx.beginPath(); ctx.arc(x + 130, r1 - 18, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#22c55e"; ctx.beginPath(); ctx.arc(x + 135, r1 - 15, 3, 0, Math.PI * 2); ctx.fill();

    // Rulo Halılar
    ctx.fillStyle = "#991b1b"; ctx.beginPath(); ctx.roundRect(x + 160, r1 - 14, 34, 12, 4); ctx.fill();
    ctx.fillStyle = "#1e3a8a"; ctx.beginPath(); ctx.roundRect(x + 198, r1 - 14, 34, 12, 4); ctx.fill();
    ctx.fillStyle = "#facc15"; ctx.fillRect(x + 162, r1 - 10, 2, 8); ctx.fillRect(x + 200, r1 - 10, 2, 8);

    // Altın Şamdan ve Mumlar
    ctx.fillStyle = "#facc15"; ctx.fillRect(x + 255, r1 - 18, 3, 18);
    ctx.fillRect(x + 248, r1 - 12, 17, 3);
    ctx.fillStyle = "#ea580c"; ctx.beginPath(); ctx.arc(x + 256.5, r1 - 21, 2, 0, Math.PI * 2); ctx.fill();

    // Antika Küre
    ctx.fillStyle = "#ca8a04"; ctx.fillRect(x + 295, r1 - 6, 4, 6);
    ctx.fillStyle = "#0284c7"; ctx.beginPath(); ctx.arc(x + 297, r1 - 14, 7, 0, Math.PI * 2); ctx.fill();

    // Monstera Saksı & Ficus
    ctx.fillStyle = "#f8fafc"; ctx.fillRect(x + 330, r1 - 12, 14, 12);
    ctx.fillStyle = "#16a34a"; ctx.beginPath(); ctx.arc(x + 337, r1 - 16, 7, 0, Math.PI * 2); ctx.fill();

    // Vintage Radyo
    ctx.fillStyle = "#78350f"; ctx.beginPath(); ctx.roundRect(x + 370, r1 - 16, 26, 16, 3); ctx.fill();
    ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(x + 378, r1 - 8, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1e293b"; ctx.fillRect(x + 386, r1 - 12, 7, 4);

    // İndirim Rozeti
    ctx.fillStyle = "#dc2626"; ctx.beginPath(); ctx.roundRect(x + 420, r1 - 20, 52, 18, 4); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("🏷️ %20 İNDİRİM", x + 446, r1 - 8);

    // 2. Alt Raftaki Eşyalar:
    // Hediyelik Kutular
    ctx.fillStyle = "#0284c7"; ctx.fillRect(x + 20, r2 - 16, 22, 16);
    ctx.fillStyle = "#facc15"; ctx.fillRect(x + 29, r2 - 16, 4, 16); ctx.fillRect(x + 20, r2 - 9, 22, 4);

    ctx.fillStyle = "#ec4899"; ctx.fillRect(x + 50, r2 - 14, 18, 14);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(x + 57, r2 - 14, 4, 14);

    // Ansiklopedi Seti
    for (let j = 0; j < 8; j++) {
        ctx.fillStyle = (j % 2 === 0) ? "#1e293b" : "#7f1d1d";
        ctx.fillRect(x + 85 + j * 7, r2 - 20, 6, 20);
    }

    // Mini Masa Lambası
    ctx.fillStyle = "#38bdf8"; ctx.beginPath(); ctx.moveTo(x + 165, r2 - 16); ctx.lineTo(x + 179, r2 - 16); ctx.lineTo(x + 183, r2 - 6); ctx.lineTo(x + 161, r2 - 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#64748b"; ctx.fillRect(x + 169, r2 - 6, 2, 6);

    // Cam Fanus & Sukulent
    ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x + 215, r2 - 11, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#22c55e"; ctx.beginPath(); ctx.arc(x + 215, r2 - 8, 4, 0, Math.PI * 2); ctx.fill();

    // Ahşap Sandık
    ctx.fillStyle = "#5c2306"; ctx.beginPath(); ctx.roundRect(x + 245, r2 - 14, 22, 14, 3); ctx.fill();
    ctx.fillStyle = "#facc15"; ctx.fillRect(x + 253, r2 - 9, 6, 4);

    // Fotoğraf Çerçeveleri
    ctx.fillStyle = "#ca8a04"; ctx.fillRect(x + 285, r2 - 18, 15, 18);
    ctx.fillStyle = "#38bdf8"; ctx.fillRect(x + 287, r2 - 16, 11, 14);
    ctx.fillStyle = "#ca8a04"; ctx.fillRect(x + 305, r2 - 16, 14, 16);
    ctx.fillStyle = "#facc15"; ctx.fillRect(x + 307, r2 - 14, 10, 12);

    // Kaktüs Serisi
    ctx.fillStyle = "#b45309"; ctx.fillRect(x + 338, r2 - 8, 10, 8); ctx.fillRect(x + 355, r2 - 8, 10, 8);
    ctx.fillStyle = "#15803d"; ctx.beginPath(); ctx.arc(x + 343, r2 - 12, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 360, r2 - 14, 5, 0, Math.PI * 2); ctx.fill();

    // "YENİ GELENLER" Tabelası
    ctx.fillStyle = "#059669"; ctx.beginPath(); ctx.roundRect(x + 385, r2 - 18, 70, 18, 4); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("✨ YENİ SEZON", x + 420, r2 - 6);

    ctx.restore();
}

function drawCeilingTrackLights(ctx) {
    ctx.strokeStyle = "#334155"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(40, 2); ctx.lineTo(canvas.width - 40, 2); ctx.stroke();

    let spots = [135, 295, 450, 600, 710];
    spots.forEach(sx => {
        ctx.fillStyle = "#64748b";
        ctx.fillRect(sx - 3, 2, 6, 6);
        ctx.fillStyle = "#1e293b";
        ctx.beginPath(); ctx.arc(sx, 11, 5, 0, Math.PI * 2); ctx.fill();

        let halo = ctx.createRadialGradient(sx, 12, 1, sx, 80, 70);
        halo.addColorStop(0, "rgba(254, 240, 138, 0.16)");
        halo.addColorStop(1, "transparent");
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(sx, 80, 70, 0, Math.PI * 2); ctx.fill();
    });
}

function drawShowroomPodium(ctx, x, y, w, h, label) {
    ctx.fillStyle = "rgba(15, 23, 42, 0.5)";
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, x, y + h / 2 + 14);
}

function drawExitDoor(ctx, x, y, label, w = 50, h = 55) {
    ctx.fillStyle = "#78350f";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = "#facc15";
    ctx.beginPath(); ctx.arc(x + w - 10, y + h / 2, 3, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, x + w / 2, y - 8);
}

function drawLuxuryLoungeSuite(ctx, x, y, w, h, isRightSide) {
    ctx.save();

    // 1. Zemin Halısı / Kilim (Otantik Doğu İpeği & Altın Saçaklar)
    let rugGrad = ctx.createLinearGradient(x, y, x + w, y + h);
    if (!isRightSide) {
        rugGrad.addColorStop(0, '#3b0764');
        rugGrad.addColorStop(0.5, '#4a044e');
        rugGrad.addColorStop(1, '#581c87');
    } else {
        rugGrad.addColorStop(0, '#0f172a');
        rugGrad.addColorStop(0.5, '#1e1b4b');
        rugGrad.addColorStop(1, '#312e81');
    }
    ctx.fillStyle = rugGrad;
    ctx.beginPath();
    ctx.roundRect(x - 6, y - 6, w + 12, h + 12, 10);
    ctx.fill();
    ctx.strokeStyle = "#ca8a04";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Halı saçakları ve iç bordür
    ctx.strokeStyle = "rgba(250, 204, 21, 0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);

    // 2. Chesterfield Köşe Koltuk (Genişletilmiş ve Kapitoneli Lüks Sedir)
    let sofaColor = !isRightSide ? '#831843' : '#1e3a8a';
    let sofaTrim = !isRightSide ? '#9d174d' : '#1d4ed8';
    let woodFrame = '#451a03';

    // A) Üst Sırtlık ve Minder (x'ten x+w'ye)
    ctx.fillStyle = woodFrame;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 14, 4);
    ctx.fill();
    ctx.strokeStyle = "#ca8a04";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Üst Koltuk Minderi (Velvet / Kadife Kapitone)
    ctx.fillStyle = sofaColor;
    ctx.beginPath();
    ctx.roundRect(x, y + 12, w, 28, 4);
    ctx.fill();
    ctx.strokeStyle = sofaTrim;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Kapitone altın düğme dikişleri
    ctx.fillStyle = "rgba(250, 204, 21, 0.75)";
    for (let bx = x + 18; bx < x + w - 10; bx += 24) {
        ctx.beginPath(); ctx.arc(bx, y + 26, 2, 0, Math.PI * 2); ctx.fill();
    }

    // B) Yan Sırtlık ve Minder (Sol loca için sol kenar, Sağ loca için sağ kenar)
    if (!isRightSide) {
        ctx.fillStyle = woodFrame;
        ctx.beginPath();
        ctx.roundRect(x, y + 38, 14, h - 38, 4);
        ctx.fill();
        ctx.strokeStyle = "#ca8a04";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = sofaColor;
        ctx.beginPath();
        ctx.roundRect(x + 12, y + 38, 28, h - 38, 4);
        ctx.fill();
        ctx.strokeStyle = sofaTrim;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        for (let by = y + 54; by < y + h - 10; by += 26) {
            ctx.beginPath(); ctx.arc(x + 26, by, 2, 0, Math.PI * 2); ctx.fill();
        }
    } else {
        ctx.fillStyle = woodFrame;
        ctx.beginPath();
        ctx.roundRect(x + w - 14, y + 38, 14, h - 38, 4);
        ctx.fill();
        ctx.strokeStyle = "#ca8a04";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = sofaColor;
        ctx.beginPath();
        ctx.roundRect(x + w - 40, y + 38, 28, h - 38, 4);
        ctx.fill();
        ctx.strokeStyle = sofaTrim;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        for (let by = y + 54; by < y + h - 10; by += 26) {
            ctx.beginPath(); ctx.arc(x + w - 26, by, 2, 0, Math.PI * 2); ctx.fill();
        }
    }

    // 3. İpek Püsküllü Kırlentler (Throw Pillows)
    const pillowColors = ['#eab308', '#06b6d4', '#ec4899', '#10b981'];
    if (!isRightSide) {
        drawSilkPillow(ctx, x + 16, y + 16, pillowColors[0]);
        drawSilkPillow(ctx, x + 75, y + 18, pillowColors[1]);
        drawSilkPillow(ctx, x + 135, y + 18, pillowColors[2]);
        drawSilkPillow(ctx, x + 20, y + 75, pillowColors[3]);
    } else {
        drawSilkPillow(ctx, x + w - 30, y + 16, pillowColors[0]);
        drawSilkPillow(ctx, x + 40, y + 18, pillowColors[1]);
        drawSilkPillow(ctx, x + 100, y + 18, pillowColors[2]);
        drawSilkPillow(ctx, x + w - 34, y + 75, pillowColors[3]);
    }

    // 4. Lüks Mermer / Ahşap Altın Kakmalı Nargile Sehpası (Coffee Table)
    let sx = !isRightSide ? (x + 65) : (x + 30);
    let sy = y + 45;
    let sw = 80;
    let sh = 52;

    // Sehpa Zemin Gölgesi
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.beginPath();
    ctx.ellipse(sx + sw / 2 + 2, sy + sh / 2 + 6, sw / 2 + 6, sh / 2.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sehpa Ahşap / Pirinç Ayakları
    ctx.fillStyle = "#ca8a04";
    [[sx + 6, sy + 6], [sx + sw - 10, sy + 6], [sx + 6, sy + sh - 6], [sx + sw - 10, sy + sh - 6]].forEach(pt => {
        ctx.fillRect(pt[0], pt[1], 4, 8);
    });

    // Sehpa Üst Tablası (Ceviz Ağacı Çerçeveli & Siyah/Yeşil Damarlı Mermer)
    ctx.fillStyle = "#3b1a08";
    ctx.beginPath();
    ctx.roundRect(sx, sy, sw, sh, 10);
    ctx.fill();
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Mermer İç Tabla
    let marbleGrad = ctx.createLinearGradient(sx, sy, sx + sw, sy + sh);
    if (!isRightSide) {
        marbleGrad.addColorStop(0, '#064e3b');
        marbleGrad.addColorStop(0.5, '#022c22');
        marbleGrad.addColorStop(1, '#064e3b');
    } else {
        marbleGrad.addColorStop(0, '#1e293b');
        marbleGrad.addColorStop(0.5, '#0f172a');
        marbleGrad.addColorStop(1, '#1e293b');
    }
    ctx.fillStyle = marbleGrad;
    ctx.beginPath();
    ctx.roundRect(sx + 5, sy + 5, sw - 10, sh - 10, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(250, 204, 21, 0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Mermer orta pirinç desen
    ctx.strokeStyle = "rgba(250, 204, 21, 0.35)";
    ctx.beginPath();
    ctx.arc(sx + sw / 2, sy + sh / 2, 14, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
}

function drawSilkPillow(ctx, px, py, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(px, py, 14, 14, 3);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 1;
    ctx.stroke();
    // Altın püskül ucu
    ctx.fillStyle = "#facc15";
    ctx.beginPath(); ctx.arc(px + 7, py + 7, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawLoungeHoverOverlay(ctx, x, y, w, h, title, isHover) {
    if (!isHover) return;
    ctx.save();
    // Altın ışıma aurası
    ctx.strokeStyle = "rgba(250, 204, 21, 0.8)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x - 5, y - 5, w + 10, h + 10, 12);
    ctx.stroke();

    // Loca Başlığı Rozeti
    let badgeW = 200;
    let badgeH = 22;
    let bx = x + w / 2 - badgeW / 2;
    let by = y - 18;

    ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
    ctx.beginPath();
    ctx.roundRect(bx, by, badgeW, badgeH, 6);
    ctx.fill();
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = "#facc15";
    ctx.font = "bold 10px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${title} (Tıkla & Sipariş)`, x + w / 2, by + 15);
    ctx.restore();
}

function drawHookahCounter(ctx, x, y) {
    ctx.fillStyle = "#78350f";
    ctx.fillRect(x - 30, y, 90, 40);
    ctx.fillStyle = "#b45309";
    ctx.beginPath(); ctx.arc(x + 15, y - 5, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath(); ctx.arc(x + 15, y - 7, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#facc15";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🔥 Köz & Nargile", x + 15, y + 24);
}

// ==========================================
// 8.8 CANLI BLACKJACK 21 MASASI ÇİZİMİ (KAFE İÇİ)
// ==========================================
function drawBlackjackTableObj(x, y, w, h, isHover) {
    ctx.save();
    // Masa taban gölgesi
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    ctx.ellipse(x + w / 2 + 4, y + h / 2 + 6, w / 2, h / 2.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hover parlaması (Altın Işıma)
    if (isHover) {
        ctx.strokeStyle = "rgba(250, 204, 21, 0.7)";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, w / 2 + 4, h / 2.3 + 4, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Ahşap / Deri Kenarlık (Armrest)
    ctx.fillStyle = isHover ? "#78350f" : "#451a03";
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isHover ? "#facc15" : "#b45309";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Yeşil Çuha Masası (Casino Felt)
    ctx.fillStyle = "#047857";
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2 - 12, h / 2.4 - 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Masa Damgası (Felt Text)
    ctx.fillStyle = "rgba(254, 240, 138, 0.85)";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BLACKJACK 3:2", x + w / 2, y + h / 2 - 10);
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "8px sans-serif";
    ctx.fillText("Kasa 17'de Durur", x + w / 2, y + h / 2 + 2);

    // Kasa / Krupiye Çip Tepsisi (Chip Rack)
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.roundRect(x + w / 2 - 20, y + 14, 40, 10, 3);
    ctx.fill();
    const chipColors = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981'];
    chipColors.forEach((cc, ci) => {
        ctx.fillStyle = cc;
        ctx.beginPath();
        ctx.arc(x + w / 2 - 12 + ci * 8, y + 19, 3.5, 0, Math.PI * 2);
        ctx.fill();
    });

    // 3 Oyuncu Koltuğu / Bahis Halkaları
    const seatOffsets = [-36, 0, 36];
    seatOffsets.forEach(so => {
        ctx.strokeStyle = "rgba(250, 204, 21, 0.75)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x + w / 2 + so, y + h / 2 + 24, 9, 0, Math.PI * 2);
        ctx.stroke();

        // Koltuk Taburesi
        ctx.fillStyle = "#78350f";
        ctx.beginPath();
        ctx.arc(x + w / 2 + so, y + h / 2 + 48, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#d97706";
        ctx.beginPath();
        ctx.arc(x + w / 2 + so, y + h / 2 + 47, 6, 0, Math.PI * 2);
        ctx.fill();
    });

    // Hover Tooltip
    if (isHover) {
        ctx.fillStyle = "#facc15";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🃏 Canlı Blackjack 21 Masası - Tıkla ve Masaya Otur", x + w / 2, y - 6);
    }
    ctx.restore();
}

// ==========================================
// 8.9 GANYAN BAYİİ & CANLI HİPODROM PİSTİ ÇİZİMİ
// ==========================================
function renderStaticGanyanTo(bctx, width, height) {
    // 1. Zemin: Çim Saha ve Hipodrom Zemin (Biçilmiş çim deseni)
    bctx.fillStyle = "#0f3d1f";
    bctx.fillRect(0, 0, width, height);

    // Çim çizgileri (Lawn mower stripes)
    bctx.fillStyle = "#14532d";
    for (let y = 0; y < 240; y += 24) {
        bctx.fillRect(0, y, width, 12);
    }

    // 2. Hipodrom Pist Çerçevesi (Grandstand & Track Frame)
    bctx.fillStyle = "#1e3a1f";
    bctx.beginPath();
    bctx.roundRect(10, 14, width - 20, 216, 24);
    bctx.fill();
    bctx.strokeStyle = "#166534";
    bctx.lineWidth = 3;
    bctx.stroke();

    // 3. Alt Taraf Zemin (Kaldırım & Ahşap Güverte)
    bctx.fillStyle = "#0f172a";
    bctx.fillRect(0, 235, width, height - 235);

    bctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    bctx.lineWidth = 1;
    for (let x = 0; x < width; x += 32) {
        bctx.beginPath(); bctx.moveTo(x, 235); bctx.lineTo(x, height); bctx.stroke();
    }

    // 4. SOL ALT: 777 Nolu GANYAN BAYİİ & KUPON GİŞESİ (Görsel Olarak Gelişmiş Tasarım)
    // Dış Çerçeve & Gövde
    bctx.fillStyle = "rgba(10, 24, 18, 0.98)";
    bctx.beginPath();
    bctx.roundRect(20, 248, 245, 184, 14);
    bctx.fill();
    bctx.strokeStyle = "#059669";
    bctx.lineWidth = 3;
    bctx.stroke();

    // Bayi Işıklı Neon Tabelası
    bctx.fillStyle = "linear-gradient(135deg, #065f46, #047857)";
    bctx.beginPath();
    bctx.roundRect(28, 256, 229, 36, 8);
    bctx.fill();
    bctx.strokeStyle = "#facc15";
    bctx.lineWidth = 2;
    bctx.stroke();

    bctx.fillStyle = "#fef08a";
    bctx.font = "bold 12px sans-serif";
    bctx.textAlign = "center";
    bctx.fillText("🏇 TJK 777 NOLU GANYAN BAYİİ 🏇", 142, 278);

    // TV Monitörleri (Canlı TJK TV + Resmi Bülten)
    // TV 1: TJK TV
    bctx.fillStyle = "#090d16";
    bctx.beginPath();
    bctx.roundRect(35, 300, 102, 60, 6);
    bctx.fill();
    bctx.strokeStyle = "#38bdf8";
    bctx.lineWidth = 2;
    bctx.stroke();

    bctx.fillStyle = "#0284c7";
    bctx.fillRect(38, 303, 96, 12);
    bctx.fillStyle = "#ffffff";
    bctx.font = "bold 8px sans-serif";
    bctx.fillText("🔴 TJK TV CANLI", 86, 312);

    bctx.fillStyle = "#38bdf8";
    bctx.font = "bold 9px sans-serif";
    bctx.fillText("📺 Hipodrom Canlı", 86, 334);
    bctx.fillStyle = "#67e8f9";
    bctx.font = "8px sans-serif";
    bctx.fillText("Canlı Oranlar & Sonuç", 86, 348);

    // TV 2: Resmi Koşu Bülteni
    bctx.fillStyle = "#090d16";
    bctx.beginPath();
    bctx.roundRect(147, 300, 102, 60, 6);
    bctx.fill();
    bctx.strokeStyle = "#f59e0b";
    bctx.lineWidth = 2;
    bctx.stroke();

    bctx.fillStyle = "#b45309";
    bctx.fillRect(150, 303, 96, 12);
    bctx.fillStyle = "#ffffff";
    bctx.font = "bold 8px sans-serif";
    bctx.fillText("📋 GÜNLÜK BÜLTEN", 198, 312);

    bctx.fillStyle = "#fde047";
    bctx.font = "bold 9px sans-serif";
    bctx.fillText("💰 6'lı Ganyan", 198, 334);
    bctx.fillStyle = "#fcd34d";
    bctx.font = "8px sans-serif";
    bctx.fillText("Banko: Şahbatur", 198, 348);

    // Gişe Bankosu & Kupon Doldurma Masası
    bctx.fillStyle = "#78350f";
    bctx.beginPath();
    bctx.roundRect(28, 370, 229, 54, 8);
    bctx.fill();
    bctx.strokeStyle = "#d97706";
    bctx.lineWidth = 2;
    bctx.stroke();

    // Gişe Parmaklıkları / Pirinç Demirler
    bctx.strokeStyle = "#fde047";
    bctx.lineWidth = 1.5;
    for (let gx = 45; gx <= 235; gx += 16) {
        bctx.beginPath();
        bctx.moveTo(gx, 372);
        bctx.lineTo(gx, 386);
        bctx.stroke();
    }

    bctx.fillStyle = "#ffffff";
    bctx.font = "bold 12px sans-serif";
    bctx.fillText("🎫 Kupon Doldurmak İçin Tıkla", 142, 404);
    bctx.fillStyle = "#fde047";
    bctx.font = "9px sans-serif";
    bctx.fillText("Tek At • Tek Kupon • 30s Bahis / 50s Koşu", 142, 417);

    // 4.6 CADDE ÇIKIŞ KAPISI (Ortada)
    drawExitDoor(bctx, width / 2 - 35, height - 65, "🚪 CADDE", 70, 60);

    // 5. SAĞ ALT: BİNEK ATI HARASI & SEYİS DURSUN (Görsel Olarak Gelişmiş Tasarım)
    bctx.fillStyle = "rgba(42, 22, 14, 0.98)";
    bctx.beginPath();
    bctx.roundRect(525, 245, 255, 187, 14);
    bctx.fill();
    bctx.strokeStyle = "#f59e0b";
    bctx.lineWidth = 3;
    bctx.stroke();

    // Ahşap Tabela
    bctx.fillStyle = "#78350f";
    bctx.beginPath();
    bctx.roundRect(535, 253, 235, 38, 8);
    bctx.fill();
    bctx.strokeStyle = "#facc15";
    bctx.lineWidth = 2;
    bctx.stroke();

    bctx.fillStyle = "#fde047";
    bctx.font = "bold 12px sans-serif";
    bctx.textAlign = "center";
    bctx.fillText("🐎 SEYİS DURSUN BİNEK HARASI", 652, 276);

    // Ahır Bölmesi ve Çitler
    bctx.fillStyle = "#451a03";
    bctx.fillRect(538, 300, 115, 52);
    bctx.strokeStyle = "#92400e";
    bctx.lineWidth = 2;
    bctx.strokeRect(538, 300, 115, 52);

    // Saman Balyaları
    bctx.fillStyle = "#ca8a04";
    bctx.beginPath();
    bctx.roundRect(544, 320, 36, 26, 4);
    bctx.roundRect(584, 324, 34, 22, 4);
    bctx.fill();

    // Ahır Nalı
    bctx.fillStyle = "#e2e8f0";
    bctx.font = "14px sans-serif";
    bctx.fillText("🧲", 632, 324);

    // Ahırdan Bakan At Başı Çizimi
    bctx.fillStyle = "#78350f";
    bctx.beginPath();
    bctx.ellipse(688, 320, 16, 22, 0.2, 0, Math.PI * 2);
    bctx.fill();
    // Atın Beyaz Alın Akıtması
    bctx.fillStyle = "#ffffff";
    bctx.beginPath();
    bctx.ellipse(688, 318, 4, 10, 0.2, 0, Math.PI * 2);
    bctx.fill();
    // Atın Kulakları
    bctx.fillStyle = "#78350f";
    bctx.beginPath();
    bctx.moveTo(678, 302); bctx.lineTo(683, 290); bctx.lineTo(687, 302);
    bctx.moveTo(691, 302); bctx.lineTo(695, 290); bctx.lineTo(699, 302);
    bctx.fill();
    // Göz
    bctx.fillStyle = "#000000";
    bctx.beginPath();
    bctx.arc(684, 314, 2.5, 0, Math.PI * 2);
    bctx.fill();

    // Seyis Kulübesi Butonu
    bctx.fillStyle = "linear-gradient(135deg, #10b981, #059669)";
    bctx.beginPath();
    bctx.roundRect(535, 362, 235, 62, 8);
    bctx.fill();
    bctx.strokeStyle = "#86efac";
    bctx.lineWidth = 2;
    bctx.stroke();

    bctx.fillStyle = "#ffffff";
    bctx.font = "bold 13px sans-serif";
    bctx.fillText("🐎 Binek Atı Kirala (200 TL)", 652, 386);
    bctx.fillStyle = "#fde047";
    bctx.font = "bold 11px sans-serif";
    bctx.fillText("⚡ 5 Dakika Boyunca 2.5X Hız!", 652, 403);
    bctx.fillStyle = "#e2e8f0";
    bctx.font = "9px sans-serif";
    bctx.fillText("Tüm mekanlarda rüzgar gibi dörtnal koş", 652, 417);
}

function drawGanyanEnvironment() {
    let bg = bgCache.getCanvas('ganyan', canvas.width, canvas.height);
    ctx.drawImage(bg, 0, 0);

    const gState = window.ganyanState || {};
    const horses = gState.horses || [];
    const raceProg = gState.raceProgress || {};
    const isRacing = (gState.phase === 'RACING');

    // 1. PİST BOYUTLARI VE SANAL UZATILMIŞ PİST (2800px)
    const tvX = 14;
    const tvY = 18;
    const tvW = canvas.width - 28;
    const tvH = 208;

    const VIRTUAL_TRACK_LENGTH = 2800;
    const START_GATE_X = 65;
    const FINISH_LINE_X = 2620;
    const TRACK_RUN_DISTANCE = FINISH_LINE_X - START_GATE_X; // 2555px

    // 60 FPS / 120 FPS / Yüksek Yenileme Hızlı Akıcı Zaman Adımı (Delta-time)
    let now = performance.now();
    let dt = window._ganyanLastFrame ? Math.min(0.05, (now - window._ganyanLastFrame) / 1000) : 0.016;
    window._ganyanLastFrame = now;

    // 60 FPS İstemci İlerleme İnterpolasyonu (Client-side smooth continuous extrapolation)
    window._ganyanHorses = window._ganyanHorses || {};
    let leaderProg = 0;
    let leaderHorse = null;
    let leaderVirtualX = START_GATE_X;

    const durationSec = gState.durationSeconds || 30;
    const baseSpeed = 100 / durationSec; // ~3.33 % / sn

    horses.forEach((h, idx) => {
        let hData = window._ganyanHorses[h.id];
        if (!hData) {
            hData = window._ganyanHorses[h.id] = { curProg: 0, targetProg: 0, gallopPhase: idx * 1.5 };
        }
        let srvProg = (raceProg[h.id] && raceProg[h.id].pos) || 0;

        if (!isRacing) {
            // Bahis fazında atlar başlangıç kapısına yumuşakça döner
            hData.curProg += (0 - hData.curProg) * Math.min(1, dt * 5.0);
            if (hData.curProg < 0.02) hData.curProg = 0;
            hData.targetProg = 0;
            hData.gallopPhase = (hData.gallopPhase || 0) + dt * 2.0; // Kapıda hafif soluma
        } else {
            hData.targetProg = srvProg;

            // Kesintisiz, akıcı ileri hareket (Işınlanma/teleport kesinlikle engellendi)
            if (hData.curProg < hData.targetProg) {
                let dist = hData.targetProg - hData.curProg;
                // İleri akış hızı + mesafeyi pürüzsüz kapatan elastik yaklaşım
                let stepSpeed = Math.max(baseSpeed * 0.9, baseSpeed + dist * 4.5);
                hData.curProg = Math.min(hData.targetProg, hData.curProg + stepSpeed * dt);
            } else if (hData.curProg < 100 && (gState.secondsLeft || 0) > 0) {
                // Paketler arasındaki milisaniyelerde sabit akıcı hızla ilerle
                hData.curProg = Math.min(100, hData.curProg + baseSpeed * 0.96 * dt);
            }

            // Dörtnal koşu fazı: İlerleme hızına tam senkron
            hData.gallopPhase = (hData.gallopPhase || 0) + dt * 24.0;
        }

        let vX = START_GATE_X + (hData.curProg / 100) * TRACK_RUN_DISTANCE;
        if (hData.curProg > leaderProg || !leaderHorse) {
            leaderProg = hData.curProg;
            leaderHorse = h;
            leaderVirtualX = vX;
        }
    });

    // Akıcı Dinamik Kamera (Smooth Camera Lerp - Titremesiz Glide)
    let targetCamX = 0;
    if (isRacing) {
        // Atları ekranın sol-orta bölümünde tutup önlerindeki pisti aç
        targetCamX = Math.max(0, Math.min(VIRTUAL_TRACK_LENGTH - tvW, leaderVirtualX - tvW * 0.35));
    } else {
        targetCamX = 0;
    }

    if (window._ganyanCamX === undefined) {
        window._ganyanCamX = targetCamX;
    } else {
        let camLerp = 1.0 - Math.exp(-dt * 4.5);
        window._ganyanCamX += (targetCamX - window._ganyanCamX) * camLerp;
    }
    const camX = window._ganyanCamX;

    // 2. HİPODROM PİSTİNİ ÇİZ (Sadece tvX, tvY, tvW, tvH içine clip edilir)
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(tvX, tvY, tvW, tvH, 18);
    ctx.clip();

    // 2.A ZEMİN: EQUESTRIAN DIRT TRACK (Toprak Pisti Gradyanı)
    let dirtGrad = ctx.createLinearGradient(0, tvY, 0, tvY + tvH);
    dirtGrad.addColorStop(0, "#68390d");
    dirtGrad.addColorStop(0.3, "#854d0e");
    dirtGrad.addColorStop(0.7, "#78350f");
    dirtGrad.addColorStop(1, "#522504");
    ctx.fillStyle = dirtGrad;
    ctx.fillRect(tvX, tvY, tvW, tvH);

    // Hızlı koşan zemin hissi için kayan toprak dokuları
    ctx.strokeStyle = "rgba(254, 215, 170, 0.12)";
    ctx.lineWidth = 1;
    let stripeOffset = -Math.floor(camX * 1.5) % 40;
    for (let sx = tvX + stripeOffset - 40; sx < tvX + tvW + 40; sx += 40) {
        ctx.beginPath();
        ctx.moveTo(sx, tvY + 8);
        ctx.lineTo(sx - 15, tvY + tvH - 8);
        ctx.stroke();
    }

    // 2.B KULVAR ÇİZGİLERİ (5 Kulvar)
    const laneHeight = (tvH - 42) / 5;
    ctx.strokeStyle = "rgba(254, 240, 138, 0.28)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([16, 12]);
    ctx.lineDashOffset = -camX; // Kesintisiz kayan kesik çizgiler
    for (let l = 1; l <= 4; l++) {
        let ly = tvY + 24 + l * laneHeight;
        ctx.beginPath();
        ctx.moveTo(tvX, ly);
        ctx.lineTo(tvX + tvW, ly);
        ctx.stroke();
    }
    ctx.setLineDash([]); // Sıfırla

    // 2.C KORKULUKLAR (White Running Rails)
    // Korkuluk rayları
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(tvX, tvY + 14);
    ctx.lineTo(tvX + tvW, tvY + 14);
    ctx.moveTo(tvX, tvY + tvH - 12);
    ctx.lineTo(tvX + tvW, tvY + tvH - 12);
    ctx.stroke();

    // Kayan Korkuluk Direkleri (Scrolling Railing Posts)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 2;
    let postSpacing = 32;
    let postStart = Math.floor(camX / postSpacing) * postSpacing;
    for (let px = postStart; px < camX + tvW + postSpacing; px += postSpacing) {
        let sx = tvX + (px - camX);
        if (sx >= tvX && sx <= tvX + tvW) {
            // Üst korkuluk ayağı
            ctx.beginPath();
            ctx.moveTo(sx, tvY + 8);
            ctx.lineTo(sx, tvY + 18);
            ctx.stroke();
            // Alt korkuluk ayağı
            ctx.beginPath();
            ctx.moveTo(sx, tvY + tvH - 18);
            ctx.lineTo(sx, tvY + tvH - 6);
            ctx.stroke();
        }
    }

    // 2.D TJK MESAFE TABELALARI (Authentic Distance Markers along the Track)
    const distanceMarkers = [
        { vX: 400, label: "2400m", sub: "START SONRASI", color: "#38bdf8" },
        { vX: 850, label: "2000m", sub: "1. VİRAJ", color: "#38bdf8" },
        { vX: 1300, label: "1600m", sub: "KARŞI DÜZLÜK", color: "#38bdf8" },
        { vX: 1750, label: "1200m", sub: "2. VİRAJ", color: "#38bdf8" },
        { vX: 2100, label: "⚡ 800m", sub: "SON DÜZLÜK", color: "#facc15" },
        { vX: 2350, label: "🔥 400m", sub: "SON ATAK", color: "#fb923c" },
        { vX: 2500, label: "🚨 200m", sub: "DİREK", color: "#ef4444" }
    ];

    distanceMarkers.forEach(m => {
        let sx = tvX + (m.vX - camX);
        if (sx >= tvX - 60 && sx <= tvX + tvW + 60) {
            // Direk Gövdesi
            ctx.fillStyle = "#cbd5e1";
            ctx.fillRect(sx - 2, tvY + 14, 4, 28);

            // Tabela Kutusu
            ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
            ctx.beginPath();
            ctx.roundRect(sx - 34, tvY + 18, 68, 22, 5);
            ctx.fill();
            ctx.strokeStyle = m.color;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Metinler
            ctx.fillStyle = m.color;
            ctx.font = "bold 9px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(m.label, sx, tvY + 29);
            ctx.fillStyle = "#94a3b8";
            ctx.font = "7px sans-serif";
            ctx.fillText(m.sub, sx, tvY + 37);
        }
    });

    // 2.E BAŞLANGIÇ BOKS KAPILARI (Starting Gate at START_GATE_X = 65)
    let startGateSX = tvX + (START_GATE_X - 35 - camX);
    if (startGateSX >= tvX - 80 && startGateSX <= tvX + tvW + 80) {
        // İskelet Kafesi
        ctx.fillStyle = "rgba(30, 41, 59, 0.95)";
        ctx.fillRect(startGateSX, tvY + 20, 24, tvH - 40);
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 2;
        ctx.strokeRect(startGateSX, tvY + 20, 24, tvH - 40);

        // Başlangıç Lambası
        let isGreen = isRacing;
        ctx.fillStyle = isGreen ? "#22c55e" : "#ef4444";
        ctx.beginPath();
        ctx.arc(startGateSX + 12, tvY + 12, 5, 0, Math.PI * 2);
        ctx.fill();

        for (let s = 0; s < 5; s++) {
            let sy = tvY + 24 + s * laneHeight;
            // Boks Bölmesi
            ctx.fillStyle = "#0f172a";
            ctx.fillRect(startGateSX + 2, sy + 2, 20, laneHeight - 4);
            ctx.fillStyle = "#facc15";
            ctx.font = "bold 10px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText((s + 1).toString(), startGateSX + 12, sy + laneHeight / 2 + 3);

            // Boks Kapısı (Yarışta açık, bahiste kapalı)
            ctx.strokeStyle = isRacing ? "#22c55e" : "#ef4444";
            ctx.lineWidth = 2;
            ctx.beginPath();
            if (isRacing) {
                // Açılmış kapı kanadı
                ctx.moveTo(startGateSX + 22, sy + 2);
                ctx.lineTo(startGateSX + 34, sy + 8);
            } else {
                // Kapalı kilitli kapı
                ctx.moveTo(startGateSX + 22, sy + 2);
                ctx.lineTo(startGateSX + 22, sy + laneHeight - 2);
            }
            ctx.stroke();
        }
    }

    // 2.F FİNİŞ ÇİZGİSİ & FOTO-FİNİŞ KULESİ (Finish Line at FINISH_LINE_X = 2620)
    let finishSX = tvX + (FINISH_LINE_X - camX);
    if (finishSX >= tvX - 80 && finishSX <= tvX + tvW + 80) {
        // Dama Taşı Desenli Finiş Çizgisi
        for (let fy = tvY + 16; fy < tvY + tvH - 16; fy += 10) {
            let alt = Math.floor((fy - tvY) / 10) % 2 === 0;
            ctx.fillStyle = alt ? "#ffffff" : "#000000";
            ctx.fillRect(finishSX, fy, 7, 10);
            ctx.fillStyle = alt ? "#000000" : "#ffffff";
            ctx.fillRect(finishSX + 7, fy, 7, 10);
        }

        // Finiş Takı & Tabela
        ctx.fillStyle = "#dc2626";
        ctx.beginPath();
        ctx.roundRect(finishSX - 24, tvY + 4, 62, 18, 4);
        ctx.fill();
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🏁 FİNİŞ", finishSX + 7, tvY + 16);

        // Foto-Finiş Sensör Flaşı (At potaya yaklaşırken veya geçerken)
        if (isRacing && leaderProg > 96) {
            let flashAlpha = (Math.sin(Date.now() / 60) + 1) * 0.25;
            ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
            ctx.fillRect(finishSX - 15, tvY + 16, 44, tvH - 32);
        }
    }

    // 2.G KOŞAN ATLAR (Yüksek Hızlı 60 FPS Gallop Kinematiği)
    horses.forEach((h, idx) => {
        let hData = window._ganyanHorses[h.id] || { curProg: 0 };
        let horseProg = hData.curProg;
        let horseVX = START_GATE_X + (horseProg / 100) * TRACK_RUN_DISTANCE;
        let horseSX = tvX + (horseVX - camX);
        let horseSY = tvY + 28 + idx * laneHeight + laneHeight / 2;

        // Görünmeyen atları ekran dışında optimize et
        if (horseSX < tvX - 90 || horseSX > tvX + tvW + 90) return;

        ctx.save();

        // Koşu Dörtnal Kinematik Salınımı (Delta-time ile tam senkronize)
        let gallopTime = (hData.gallopPhase !== undefined) ? hData.gallopPhase : (Date.now() / 36 + idx * 1.6);
        let runBounce = isRacing ? Math.sin(gallopTime) * 3.2 : Math.sin(Date.now() / 400) * 0.8;
        ctx.translate(horseSX, horseSY + runBounce);

        // A. PİSTTEKİ GÖLGE
        ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
        ctx.beginPath();
        ctx.ellipse(2, 14, 18, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // B. NAL TOZU / TOZ BULUTLARI (Hızlı dörtnalda arkaya savrulan tozlar)
        if (isRacing && horseProg > 1) {
            ctx.fillStyle = "rgba(245, 158, 11, 0.4)";
            for (let d = 0; d < 4; d++) {
                let dustOffX = -18 - d * 9 + Math.sin(gallopTime + d) * 4;
                let dustOffY = 10 + Math.cos(gallopTime + d) * 3;
                let dustR = 3 + Math.sin(gallopTime * 2 + d) * 2;
                ctx.beginPath();
                ctx.arc(dustOffX, dustOffY, Math.max(1, dustR), 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // C. KOŞAN ATIN BACAKLARI (4 Dinamik Bacak - Geniş Koşu Adımı)
        let horseColor = h.coatColor || (idx === 0 ? '#852e16' : (idx === 1 ? '#1c1917' : (idx === 2 ? '#b45309' : (idx === 3 ? '#64748b' : '#451a03'))));
        ctx.strokeStyle = horseColor;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";

        let legFront1 = isRacing ? Math.sin(gallopTime) * 14 : 2;
        let legFront2 = isRacing ? Math.sin(gallopTime + 1.2) * 11 : 0;
        let legBack1 = isRacing ? -Math.cos(gallopTime) * 14 : -2;
        let legBack2 = isRacing ? -Math.cos(gallopTime + 1.2) * 11 : 0;

        // Arka Bacaklar
        ctx.beginPath();
        ctx.moveTo(-10, 4);
        ctx.lineTo(-14 + legBack1, 14);
        ctx.moveTo(-8, 4);
        ctx.lineTo(-12 + legBack2, 14);
        ctx.stroke();

        // Ön Bacaklar
        ctx.beginPath();
        ctx.moveTo(10, 4);
        ctx.lineTo(14 + legFront1, 14);
        ctx.moveTo(8, 4);
        ctx.lineTo(12 + legFront2, 14);
        ctx.stroke();

        // D. AT GÖVDESİ (Thoroughbred Kaslı Gövde)
        ctx.fillStyle = horseColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, 19, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // E. AT BOYNU & BAŞI (Aerodynamic Gallop Position)
        ctx.beginPath();
        ctx.moveTo(11, -2);
        ctx.lineTo(18, -13);
        ctx.lineTo(26, -10);
        ctx.lineTo(22, 2);
        ctx.closePath();
        ctx.fill();

        // Kulaklar
        ctx.beginPath();
        ctx.moveTo(17, -13); ctx.lineTo(19, -19); ctx.lineTo(21, -13);
        ctx.fill();

        // Dalgalanan Yele (Mane)
        ctx.strokeStyle = (h.id === 'batangemi') ? "#cbd5e1" : "#0f172a";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(14, -6);
        ctx.lineTo(9, -11 + Math.sin(gallopTime) * 3);
        ctx.moveTo(16, -9);
        ctx.lineTo(12, -14 + Math.sin(gallopTime) * 3);
        ctx.stroke();

        // Dalgalanan Kuyruk (Tail)
        ctx.strokeStyle = (h.id === 'batangemi') ? "#cbd5e1" : "#0f172a";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-18, -2);
        ctx.quadraticCurveTo(-27, -6 + Math.sin(gallopTime) * 7, -35, -3 + Math.sin(gallopTime) * 9);
        ctx.stroke();

        // F. GÖZ & DİZGİN (Reins)
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(22, -9, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(22.5, -9, 1, 0, Math.PI * 2);
        ctx.fill();

        // Dizginler
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(24, -6);
        ctx.lineTo(3, -4);
        ctx.stroke();

        // G. JOKEY
        // Jokey Pantolonu (Beyaz)
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.ellipse(-2, -3, 6, 4, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Jokey Çizmesi (Siyah)
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(-4, 0, 3, 5);

        // Jokey Forması (Atın Takım Rengi)
        ctx.fillStyle = h.color;
        ctx.beginPath();
        ctx.arc(1, -7, 6.5, 0, Math.PI * 2);
        ctx.fill();

        // Jokey Formasındaki Numara
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 8px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(h.number.toString(), 1, -4);

        // Jokey Kaskı
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(4, -13, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = h.color;
        ctx.fillRect(4, -13, 5, 2.5);

        // H. LİDERLİK TACI (Lider olan atın üzerinde parlar)
        let isCurrentLeader = leaderHorse && (h.id === leaderHorse.id);
        if (isRacing && isCurrentLeader && horseProg > 6) {
            ctx.fillStyle = "#facc15";
            ctx.font = "14px sans-serif";
            ctx.fillText("👑", 0, -32);
        }

        // I. AT İSMİ & ORAN ETİKETİ
        ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
        ctx.beginPath();
        ctx.roundRect(-25, -28, 50, 14, 4);
        ctx.fill();
        ctx.strokeStyle = isCurrentLeader ? "#facc15" : "rgba(255,255,255,0.2)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = isCurrentLeader ? "#fde047" : "#ffffff";
        ctx.font = "bold 8px sans-serif";
        ctx.fillText(`${h.number}. ${h.name}`, 0, -18);

        ctx.restore();
    });

    // 2.H İÇ GÖLGE / STADYUM DERİNLİĞİ (Vignette & Track Border)
    ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
    ctx.lineWidth = 4;
    ctx.strokeRect(tvX, tvY, tvW, tvH);

    ctx.restore(); // Clip sonu

    // 3. TEPE DİJİTAL JUMBOTRON HUD (LED Skor Tabelası)
    ctx.save();
    let hudW = 340;
    let hudH = 26;
    let hudX = canvas.width / 2 - hudW / 2;
    let hudY = tvY + 4;

    ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
    ctx.beginPath();
    ctx.roundRect(hudX, hudY, hudW, hudH, 6);
    ctx.fill();
    ctx.strokeStyle = isRacing ? "#ef4444" : "#10b981";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (isRacing) {
        let leaderName = leaderHorse ? `#${leaderHorse.number} ${leaderHorse.name}` : '-';
        ctx.fillStyle = "#f87171";
        ctx.font = "bold 10px sans-serif";
        ctx.fillText(`🔴 CANLI ${gState.raceNumber}. KOŞU | ⏱️ ${gState.secondsLeft || 0}s | 👑 Lider: ${leaderName} (%${Math.floor(leaderProg)})`, canvas.width / 2, hudY + hudH / 2);
    } else {
        if (gState.lastWinner) {
            ctx.fillStyle = "#facc15";
            ctx.font = "bold 10px sans-serif";
            ctx.fillText(`🟢 BAHİSLER AÇIK (15s) | ⏱️ ${gState.secondsLeft || 0}s | 🏆 Son Kazanan: #${gState.lastWinner.number} ${gState.lastWinner.name}`, canvas.width / 2, hudY + hudH / 2);
        } else {
            ctx.fillStyle = "#34d399";
            ctx.font = "bold 10px sans-serif";
            ctx.fillText(`🟢 ${gState.raceNumber}. KOŞU BAHİSLERİ AÇIK (15s) | ⏱️ ${gState.secondsLeft || 0}s Kaldı`, canvas.width / 2, hudY + hudH / 2);
        }
    }
    ctx.restore();

    // Ganyan Bayii Duvar TV'si (Orta Koridor Duvarında - Büyütülmüş)
    if (typeof drawVenueTV === 'function') {
        drawVenueTV(ctx, 325, 236, 150, 76);
    }

    // 3. HOVER ETKİLEŞİMLERİ (TJK GİŞESİ VE BİNEK HARASI)
    let isTjkHover = (canvasMouseX >= 20 && canvasMouseX <= 265 && canvasMouseY >= 248 && canvasMouseY <= 432);
    let isStableHover = (canvasMouseX >= 525 && canvasMouseX <= 780 && canvasMouseY >= 245 && canvasMouseY <= 440);

    if (isTjkHover) {
        hoveredTableId = 'tjk_counter';
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.roundRect(20, 248, 245, 184, 14);
        ctx.stroke();

        ctx.fillStyle = "#facc15";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🎫 Ganyan Kuponu Yatırmak İçin Tıkla", 142, 240);
    } else if (isStableHover) {
        hoveredTableId = 'horse_stable';
        ctx.strokeStyle = "#86efac";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.roundRect(525, 245, 255, 187, 14);
        ctx.stroke();

        ctx.fillStyle = "#86efac";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🐎 5 Dakikalık Binek Atı Kirala (200 TL / 2.5X Hız)", 652, 238);
    }

    let isExitDoorHover = (canvasMouseX >= canvas.width / 2 - 45 && canvasMouseX <= canvas.width / 2 + 45 && canvasMouseY >= canvas.height - 75 && canvasMouseY <= canvas.height - 5);
    if (isExitDoorHover) {
        hoveredTableId = 'ganyan_exit';
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 3;
        ctx.strokeRect(canvas.width / 2 - 37, canvas.height - 67, 74, 64);
    } else {
        if (hoveredTableId === 'ganyan_exit' || (!isTjkHover && !isStableHover && (hoveredTableId === 'tjk_counter' || hoveredTableId === 'horse_stable'))) {
            hoveredTableId = null;
        }
    }

    canvas.style.cursor = (isTjkHover || isStableHover || isExitDoorHover) ? 'pointer' : 'default';
}

// ============================================================================
// 12. YENİ CADDE (CADDE ENVIRONMENT - GANYAN BAYİİ & DEDENİN YERİ CASINO BULVARI)
// ============================================================================
function renderStaticCaddeTo(bctx, width, height) {
    // 1. Zemin & Gökyüzü / Cadde Arka Planı
    bctx.fillStyle = isNightMode ? "#090d16" : "#1e293b";
    bctx.fillRect(0, 0, width, height);

    // Gece gökyüzü / Yıldızlar (Y < 130)
    if (isNightMode) {
        bctx.fillStyle = "rgba(255, 255, 255, 0.75)";
        for (let i = 0; i < 30; i++) {
            let sx = (i * 137) % width;
            let sy = (i * 73) % 115;
            bctx.beginPath();
            bctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
            bctx.fill();
        }
    }

    // 2. Geniş Asfalt Bulvar Yolu (Ortadan Geçen Cadde)
    let roadY = 135, roadH = 175;
    bctx.fillStyle = isNightMode ? "#1e293b" : "#334155";
    bctx.fillRect(0, roadY, width, roadH);

    // Yol Kenarı Bordür Taşları (Granit Kaldırım Kenarı)
    bctx.fillStyle = isNightMode ? "#475569" : "#64748b";
    bctx.fillRect(0, roadY - 6, width, 6);
    bctx.fillRect(0, roadY + roadH, width, 6);

    // Asfalt Dokusu ve Şerit Çizgileri
    bctx.strokeStyle = "#facc15";
    bctx.lineWidth = 3;
    bctx.setLineDash([24, 18]);
    bctx.beginPath();
    bctx.moveTo(0, roadY + roadH / 2);
    bctx.lineTo(width, roadY + roadH / 2);
    bctx.stroke();
    bctx.setLineDash([]); // Çizgiyi sıfırla

    // Üst Kaldırım Taşları (y: 110..130)
    bctx.fillStyle = isNightMode ? "#1e293b" : "#475569";
    bctx.fillRect(0, 110, width, 25);
    bctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    bctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
        bctx.beginPath(); bctx.moveTo(x, 110); bctx.lineTo(x, 135); bctx.stroke();
    }

    // Sol Yol Çıkışı: Türkiye Karayolları Tipi Çiftli Yol Tabelası (Kaldırım / Yol Üstü Yeşil Alanında - TAMAMEN GÖRÜNÜR)
    // Üstte: ⬅ MEYDAN, Altta: ⬅ SAHİL
    drawStackedTurkishSigns(bctx, 12, 80, [
        { text: "MEYDAN", dir: "left" },
        { text: "SAHİL", dir: "left" }
    ], 134);

    // 3. ÜST BİNALAR VE CEPHESİ (%10 YATAY KÜÇÜLTÜLMÜŞ GANYAN VE DEDENİN YERİ)
    // A) 🏇 GANYAN BAYİİ & HİPODROM CEPHESİ (Sol Üst: x: 90, y: 12, w: 300, h: 105)
    let gX = 90, gY = 12, gW = 300, gH = 105;
    bctx.fillStyle = isNightMode ? "#042f2e" : "#064e3b";
    bctx.beginPath(); bctx.roundRect(gX, gY, gW, gH, 12); bctx.fill();
    bctx.strokeStyle = "#f59e0b"; bctx.lineWidth = 2.5; bctx.stroke();

    // Tente (Koyu Yeşil - Beyaz Çizgili Tente)
    let gStripeW = gW / 12;
    for (let i = 0; i < 12; i++) {
        bctx.fillStyle = i % 2 === 0 ? "#10b981" : "#ffffff";
        bctx.fillRect(gX + i * gStripeW, gY + 30, gStripeW, 16);
    }

    // Işıklı Tabela
    bctx.fillStyle = "#facc15";
    bctx.font = "bold 12.5px sans-serif";
    bctx.textAlign = "center";
    bctx.fillText("🏇 TJK GANYAN BAYİİ & HİPODROM", gX + gW / 2, gY + 22);

    // Sol Vitrin: Canlı Yarış TV Ekranı
    bctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    bctx.fillRect(gX + 14, gY + 52, 85, 48);
    bctx.strokeStyle = "#10b981"; bctx.lineWidth = 1.5; bctx.strokeRect(gX + 14, gY + 52, 85, 48);
    bctx.fillStyle = "#34d399"; bctx.font = "bold 8.5px sans-serif";
    bctx.fillText("🔴 TJK TV CANLI", gX + 56, gY + 70);
    bctx.fillStyle = "#fde047"; bctx.font = "8px sans-serif";
    bctx.fillText("Canlı Hipodrom", gX + 56, gY + 84);

    // Ganyan Giriş Kapısı (x: 215, y: 50, w: 48, h: 54)
    bctx.fillStyle = "#78350f";
    bctx.beginPath(); bctx.roundRect(gX + 125, gY + 50, 48, 54, 6); bctx.fill();
    bctx.strokeStyle = "#facc15"; bctx.lineWidth = 2; bctx.stroke();
    bctx.fillStyle = "#facc15"; bctx.beginPath(); bctx.arc(gX + 162, gY + 77, 3, 0, Math.PI * 2); bctx.fill();
    bctx.fillStyle = "#facc15"; bctx.font = "bold 9px sans-serif";
    bctx.fillText("GİRİŞ", gX + 149, gY + 75);

    // Sağ Bilgi Panosu: Oranlar & Atlar
    bctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    bctx.fillRect(gX + 195, gY + 52, 90, 48);
    bctx.strokeStyle = "#f59e0b"; bctx.lineWidth = 1; bctx.strokeRect(gX + 195, gY + 52, 90, 48);
    bctx.fillStyle = "#fde047"; bctx.font = "bold 8px sans-serif";
    bctx.fillText("💰 6'lı Ganyan", gX + 240, gY + 68);
    bctx.fillStyle = "#ffffff"; bctx.font = "8px sans-serif";
    bctx.fillText("Seyis Binek Harası", gX + 240, gY + 82);

    // B) ⚡ DEDENİN YERİ KUMARHANESİ (Sağ Üst: x: 440, y: 12, w: 300, h: 105)
    let cX = 440, cY = 12, cW = 300, cH = 105;
    bctx.fillStyle = isNightMode ? "#09041a" : "#1e113a";
    bctx.beginPath(); bctx.roundRect(cX, cY, cW, cH, 12); bctx.fill();
    bctx.strokeStyle = "#06b6d4"; bctx.lineWidth = 2.5; bctx.stroke();

    // Altın ve Mor Neon Saçak
    bctx.fillStyle = "rgba(234, 179, 8, 0.25)";
    bctx.fillRect(cX, cY + 28, cW, 16);
    bctx.strokeStyle = "#facc15"; bctx.lineWidth = 1; bctx.strokeRect(cX, cY + 28, cW, 16);

    // GÖRKEMLİ DEDENİN YERİ TABELASI (ŞİMŞEK LOGOLU ⚡)
    bctx.fillStyle = "#fde047";
    bctx.font = "bold 13.5px sans-serif";
    bctx.textAlign = "center";
    bctx.fillText("⚡ DEDENİN YERİ ⚡", cX + cW / 2, cY + 22);

    bctx.fillStyle = "#22d3ee";
    bctx.font = "bold 8px sans-serif";
    bctx.fillText("🎰 VIP CASINO & CANLI BLACKJACK 21", cX + cW / 2, cY + 40);

    // Sol Vitrin: Neon İskambil & Rulet Figürleri
    bctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    bctx.fillRect(cX + 14, cY + 52, 85, 48);
    bctx.strokeStyle = "#e11d48"; bctx.lineWidth = 1.5; bctx.strokeRect(cX + 14, cY + 52, 85, 48);
    bctx.fillStyle = "#ef4444"; bctx.font = "15px sans-serif";
    bctx.fillText("♠️ ♥️ ♣️ ♦️", cX + 56, cY + 74);
    bctx.fillStyle = "#facc15"; bctx.font = "8px sans-serif";
    bctx.fillText("Blackjack 3:2", cX + 56, cY + 90);

    // Casino Giriş Kapısı (Altın Yaldızlı Çift Kanat Kapı)
    bctx.fillStyle = "#450a0a";
    bctx.beginPath(); bctx.roundRect(cX + 125, cY + 50, 50, 54, 6); bctx.fill();
    bctx.strokeStyle = "#facc15"; bctx.lineWidth = 2; bctx.stroke();
    bctx.fillStyle = "#facc15";
    bctx.beginPath(); bctx.arc(cX + 143, cY + 77, 3, 0, Math.PI * 2); bctx.fill();
    bctx.beginPath(); bctx.arc(cX + 157, cY + 77, 3, 0, Math.PI * 2); bctx.fill();
    bctx.font = "bold 9px sans-serif";
    bctx.fillText("GİRİŞ", cX + 150, cY + 92);

    // Sağ Vitrin: Slot Çarkı & Jackpot Grafiği
    bctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    bctx.fillRect(cX + 195, cY + 52, 90, 48);
    bctx.strokeStyle = "#facc15"; bctx.lineWidth = 1.5; bctx.strokeRect(cX + 195, cY + 52, 90, 48);
    bctx.fillStyle = "#facc15"; bctx.font = "14px sans-serif";
    bctx.fillText("7️⃣ 7️⃣ 7️⃣", cX + 240, cY + 73);
    bctx.fillStyle = "#38bdf8"; bctx.font = "8px sans-serif";
    bctx.fillText("VIP Jackpot", cX + 240, cY + 89);

    // 4. ALT PARK PROMENADI VE AÇIK HAVA ALANI (y: 315..500)
    let parkY = 320, parkH = height - parkY;
    bctx.fillStyle = isNightMode ? "#064e3b" : "#15803d";
    bctx.fillRect(0, parkY, width, parkH);

    // Minik Kır Çiçekleri & Çim Detayı (Park alanında)
    for (let i = 0; i < 22; i++) {
        let fx = ((i * 113) % 430) + 15;
        let fy = parkY + ((i * 67) % (parkH - 25)) + 10;
        bctx.fillStyle = i % 2 === 0 ? "#fef08a" : "#fca5a5";
        bctx.beginPath(); bctx.arc(fx, fy, 2, 0, Math.PI * 2); bctx.fill();
    }

    // Sol Parkta Klasik Mermer Süs Havuzu (Fountain)
    let fX = 220, fY = 415;
    bctx.fillStyle = "#334155";
    bctx.beginPath(); bctx.arc(fX, fY, 38, 0, Math.PI * 2); bctx.fill();
    bctx.strokeStyle = "#cbd5e1"; bctx.lineWidth = 3; bctx.stroke();

    bctx.fillStyle = "#0284c7";
    bctx.beginPath(); bctx.arc(fX, fY, 33, 0, Math.PI * 2); bctx.fill();
    bctx.strokeStyle = "#38bdf8"; bctx.lineWidth = 1.5; bctx.stroke();

    bctx.fillStyle = "#cbd5e1";
    bctx.beginPath(); bctx.arc(fX, fY, 12, 0, Math.PI * 2); bctx.fill();
    bctx.fillStyle = "#f8fafc";
    bctx.beginPath(); bctx.arc(fX, fY, 6, 0, Math.PI * 2); bctx.fill();

    // Park Bankları ve Sokak Lambaları
    drawBench(bctx, 100, 410);
    drawBench(bctx, 340, 410);
    drawBench(bctx, 380, 225);

    drawLampPost(bctx, 50, 220);
    drawLampPost(bctx, 320, 220);
    drawLampPost(bctx, 420, 360);
    drawTree(bctx, 50, 400);
}

function drawCaddeEnvironment() {
    let bg = bgCache.getCanvas('cadde', canvas.width, canvas.height);
    ctx.drawImage(bg, 0, 0);

    let now = Date.now();

    // Süs Havuzu Su Çırpıntısı Animasyonu (Sol Park Alanında: x: 220, y: 415)
    let fX = 220, fY = 415;
    let ripRad = 12 + ((now / 50) % 20);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(fX, fY, ripRad, 0, Math.PI * 2);
    ctx.stroke();

    // Fıskiye Su Sıçraması
    ctx.fillStyle = "#ffffff";
    for (let k = 0; k < 6; k++) {
        let ang = (k * Math.PI / 3) + (now / 400);
        let dist = 10 + Math.sin(now / 150 + k) * 6;
        ctx.beginPath();
        ctx.arc(fX + Math.cos(ang) * dist, fY + Math.sin(ang) * dist - 3, 1.8, 0, Math.PI * 2);
        ctx.fill();
    }

    // Dedenin Yeri Şimşek Tabelası Nabız Parıltısı (Pulse)
    let pulse = (Math.sin(now / 200) + 1) / 2;
    ctx.fillStyle = `rgba(250, 204, 21, ${0.12 + pulse * 0.18})`;
    ctx.fillRect(440, 12, 300, 40);

    // Açık Hava Reklam Panosu (Cadde Sağ Alt: x: 470, y: 345, w: 260, h: 125)
    let isBillboardCaddeHover = (canvasMouseX >= 470 && canvasMouseX <= 730 && canvasMouseY >= 345 && canvasMouseY <= 470);
    if (typeof drawOutdoorBillboard === 'function') {
        drawOutdoorBillboard(ctx, 470, 345, 260, 125, isBillboardCaddeHover);
    }

    // Hover Etkileşim Kontrolleri
    let isGanyanHover = (canvasMouseX >= 90 && canvasMouseX <= 390 && canvasMouseY >= 12 && canvasMouseY <= 125);
    let isCasinoHover = (canvasMouseX >= 440 && canvasMouseX <= 740 && canvasMouseY >= 12 && canvasMouseY <= 125);
    let isExitStreetHover = (canvasMouseX <= 66 && canvasMouseY >= 140 && canvasMouseY <= 315);

    if (isBillboardCaddeHover) {
        hoveredTableId = 'billboard_cadde';
        canvas.style.cursor = 'pointer';
    } else if (isGanyanHover) {
        hoveredTableId = 'cadde_ganyan';
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 3;
        ctx.strokeRect(90, 12, 300, 105);
        ctx.fillStyle = "#facc15";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🏇 Ganyan Bayii & Hipodrom'a Gir", 240, 132);
        canvas.style.cursor = 'pointer';
    } else if (isCasinoHover) {
        hoveredTableId = 'cadde_casino';
        ctx.strokeStyle = "#22d3ee";
        ctx.lineWidth = 3;
        ctx.strokeRect(440, 12, 300, 105);
        ctx.fillStyle = "#fde047";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("⚡ Dedenin Yeri Casino'ya Gir (Blackjack 21)", 590, 132);
        canvas.style.cursor = 'pointer';
    } else if (isExitStreetHover) {
        hoveredTableId = 'cadde_to_street';
        ctx.strokeStyle = "#34d399";
        ctx.lineWidth = 2.5;
        ctx.strokeRect(4, 180, 64, 60);
        canvas.style.cursor = 'pointer';
    } else {
        if (hoveredTableId === 'cadde_ganyan' || hoveredTableId === 'cadde_casino' || hoveredTableId === 'cadde_to_street' || hoveredTableId === 'billboard_cadde') {
            hoveredTableId = null;
        }
        canvas.style.cursor = 'default';
    }
}

// ============================================================================
// 13. DEDENİN YERİ CASINO & BLACKJACK 21 SALONU (İÇ MEKAN)
// ============================================================================
function renderStaticDedeninYeriTo(bctx, width, height) {
    // 1. Zemin: Kraliyet Kırmızısı Altın Geometrik Casino Halısı
    bctx.fillStyle = "#4c0519";
    bctx.fillRect(0, 0, width, height);

    // Kırmızı & Altın Elmas Baklava Deseni
    bctx.strokeStyle = "rgba(250, 204, 21, 0.15)";
    bctx.lineWidth = 1;
    for (let x = -width; x < width * 2; x += 36) {
        bctx.beginPath(); bctx.moveTo(x, 0); bctx.lineTo(x + height, height); bctx.stroke();
        bctx.beginPath(); bctx.moveTo(x, 0); bctx.lineTo(x - height, height); bctx.stroke();
    }

    // 2. Duvarlar (Maun Wainscoting Panel & Altın Aplikler)
    bctx.fillStyle = "#1e050b";
    bctx.fillRect(0, 0, width, 115);
    bctx.strokeStyle = "#facc15";
    bctx.lineWidth = 2.5;
    bctx.beginPath(); bctx.moveTo(0, 115); bctx.lineTo(width, 115); bctx.stroke();

    // Altın Çerçeveli Büyük Casino Tabelası
    bctx.fillStyle = "rgba(15, 23, 42, 0.95)";
    bctx.beginPath();
    bctx.roundRect(width / 2 - 230, 16, 460, 66, 12);
    bctx.fill();
    bctx.strokeStyle = "#facc15";
    bctx.lineWidth = 2.5;
    bctx.stroke();

    // Neon Şimşekler ve Tabela Yazısı
    bctx.fillStyle = "#facc15";
    bctx.font = "bold 20px sans-serif";
    bctx.textAlign = "center";
    bctx.fillText("⚡ DEDENİN YERİ CASINO ⚡", width / 2, 45);

    bctx.fillStyle = "#38bdf8";
    bctx.font = "bold 11px sans-serif";
    bctx.fillText("♠️ VIP CANLI BLACKJACK 21 • 3:2 ÖDEME • KASA 17'DE KALIR ♣️", width / 2, 68);

    // 3. Sol Duvar: Işıltılı Retro Slot Makineleri (🎰)
    for (let i = 0; i < 3; i++) {
        let smX = 35 + i * 50;
        let smY = 125;
        // Kasa
        bctx.fillStyle = "#1e293b";
        bctx.beginPath(); bctx.roundRect(smX, smY, 42, 60, 6); bctx.fill();
        bctx.strokeStyle = "#f59e0b"; bctx.lineWidth = 1.5; bctx.stroke();
        // Üst Işık
        bctx.fillStyle = i % 2 === 0 ? "#ef4444" : "#facc15";
        bctx.beginPath(); bctx.arc(smX + 21, smY + 8, 4, 0, Math.PI * 2); bctx.fill();
        // Ekran & Çarklar
        bctx.fillStyle = "#0f172a";
        bctx.fillRect(smX + 6, smY + 16, 30, 22);
        bctx.fillStyle = "#fde047";
        bctx.font = "bold 9px sans-serif";
        bctx.fillText("7 7 7", smX + 21, smY + 31);
        // Jeton Bölmesi
        bctx.fillStyle = "#475569";
        bctx.fillRect(smX + 8, smY + 44, 26, 10);
    }

    // 4. Sağ Duvar: Rulet Masası & VIP Çemberi
    let rX = 635, rY = 135;
    bctx.fillStyle = "#064e3b";
    bctx.beginPath(); bctx.roundRect(rX, rY, 130, 85, 10); bctx.fill();
    bctx.strokeStyle = "#facc15"; bctx.lineWidth = 2; bctx.stroke();

    // Rulet Çarkı
    bctx.fillStyle = "#78350f";
    bctx.beginPath(); bctx.arc(rX + 32, rY + 42, 22, 0, Math.PI * 2); bctx.fill();
    bctx.fillStyle = "#facc15";
    bctx.beginPath(); bctx.arc(rX + 32, rY + 42, 12, 0, Math.PI * 2); bctx.fill();
    bctx.fillStyle = "#ef4444";
    bctx.beginPath(); bctx.arc(rX + 32, rY + 42, 5, 0, Math.PI * 2); bctx.fill();

    // Bahis Izgarası
    bctx.fillStyle = "#ffffff";
    bctx.font = "bold 8px sans-serif";
    bctx.fillText("RULET", rX + 88, rY + 36);
    bctx.fillStyle = "#fde047";
    bctx.fillText("0-36 VIP", rX + 88, rY + 54);

    // 5. Çıkış Kapısı (Orta Altta: Caddeye Açılır)
    drawExitDoor(bctx, width / 2 - 35, height - 65, "🚪 CADDE", 70, 60);
}

function drawDedeninYeriEnvironment() {
    let bg = bgCache.getCanvas('dedenin_yeri', canvas.width, canvas.height);
    ctx.drawImage(bg, 0, 0);

    // Dedenin Yeri VIP TV Ekranı (Üst Sol Duvarda - Büyütülmüş)
    if (typeof drawVenueTV === 'function') {
        drawVenueTV(ctx, 30, 14, 150, 76);
    }

    // Canlı Blackjack Masası Çizimi (Ortada: x: 310, y: 155, w: 180, h: 135)
    let t = { x: 310, y: 155, w: 180, h: 135 };
    let isTableHover = (canvasMouseX >= t.x && canvasMouseX <= t.x + t.w && canvasMouseY >= t.y && canvasMouseY <= t.y + t.h);
    let isExitHover = (canvasMouseX >= canvas.width / 2 - 45 && canvasMouseX <= canvas.width / 2 + 45 && canvasMouseY >= canvas.height - 75 && canvasMouseY <= canvas.height - 5);

    // Slot Makineleri Sırası (Sol: x: 25..185, y: 115..195)
    let isSlotHover = (canvasMouseX >= 25 && canvasMouseX <= 185 && canvasMouseY >= 115 && canvasMouseY <= 195);

    // Rulet Masası (Sağ: x: 625..775, y: 125..235)
    let isRouletteHover = (canvasMouseX >= 625 && canvasMouseX <= 775 && canvasMouseY >= 125 && canvasMouseY <= 235);

    drawBlackjackTableObj(t.x, t.y, t.w, t.h, isTableHover);

    // Hover Etiketleri & Vurguları
    if (isTableHover) {
        hoveredTableId = 'blackjack';
    } else if (isSlotHover) {
        hoveredTableId = 'slot_machine';
        // Slot Çevresi Parlama Vurgusu
        ctx.save();
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "rgba(250, 204, 21, 0.8)";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.roundRect(30, 118, 150, 72, 8);
        ctx.stroke();

        // Slot Hover Etiketi
        ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
        ctx.beginPath();
        ctx.roundRect(40, 92, 130, 22, 6);
        ctx.fill();
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = "#facc15";
        ctx.font = "bold 9.5px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🎰 777 Slot (Tıkla / E)", 105, 107);
        ctx.restore();
    } else if (isRouletteHover) {
        hoveredTableId = 'roulette';
        // Rulet Çevresi Parlama Vurgusu
        ctx.save();
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "rgba(16, 185, 129, 0.85)";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.roundRect(630, 130, 140, 95, 12);
        ctx.stroke();

        // Rulet Hover Etiketi
        ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
        ctx.beginPath();
        ctx.roundRect(635, 102, 130, 22, 6);
        ctx.fill();
        ctx.strokeStyle = "#34d399";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = "#34d399";
        ctx.font = "bold 9.5px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🎡 VIP Rulet (Tıkla / E)", 700, 117);
        ctx.restore();
    } else if (isExitHover) {
        hoveredTableId = 'casino_exit';
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 3;
        ctx.strokeRect(canvas.width / 2 - 37, canvas.height - 67, 74, 64);
    } else {
        if (hoveredTableId === 'blackjack' || hoveredTableId === 'casino_exit' || hoveredTableId === 'slot_machine' || hoveredTableId === 'roulette') {
            hoveredTableId = null;
        }
    }

    canvas.style.cursor = (isTableHover || isExitHover || isSlotHover || isRouletteHover) ? 'pointer' : 'default';
}

// ============================================================================
// 14. PRESTİJ GAYRİMENKUL & EMLAK OFİSİ (EMLAKCI SHOWROOM - MAKETLER & TUR)
// ============================================================================
function renderStaticEmlakciTo(bctx, width, height) {
    // 1. Zemin: Parlak İtalyan Mermer Karo (Kare Mermer & Altın Çıta)
    bctx.fillStyle = "#0f172a";
    bctx.fillRect(0, 0, width, height);

    // Mermer Karo Zemin (Geniş salon boyunca 40x40 karolar)
    let tileSize = 42;
    for (let ty = 0; ty < height; ty += tileSize) {
        for (let tx = 0; tx < width; tx += tileSize) {
            let isAlt = ((tx / tileSize + ty / tileSize) % 2 === 0);
            bctx.fillStyle = isAlt ? "#1e293b" : "#0f172a";
            bctx.fillRect(tx, ty, tileSize, tileSize);
            bctx.strokeStyle = "rgba(56, 189, 248, 0.08)";
            bctx.lineWidth = 1;
            bctx.strokeRect(tx, ty, tileSize, tileSize);
        }
    }

    // 2. Lüks Kraliyet Mavisi & Altın Çerçeveli Merkez Halısı
    let rugX = 65, rugY = 175, rugW = 670, rugH = 215;
    bctx.save();
    let rugGrad = bctx.createLinearGradient(rugX, rugY, rugX + rugW, rugY + rugH);
    rugGrad.addColorStop(0, '#0c4a6e');
    rugGrad.addColorStop(0.5, '#075985');
    rugGrad.addColorStop(1, '#0369a1');
    bctx.fillStyle = rugGrad;
    bctx.beginPath();
    bctx.roundRect(rugX, rugY, rugW, rugH, 18);
    bctx.fill();

    bctx.strokeStyle = "#facc15";
    bctx.lineWidth = 3;
    bctx.stroke();

    // Halı Saçakları ve İç Geometrik Bordür
    bctx.strokeStyle = "rgba(250, 204, 21, 0.4)";
    bctx.lineWidth = 1.2;
    bctx.strokeRect(rugX + 8, rugY + 8, rugW - 16, rugH - 16);
    bctx.restore();

    // 3. Üst Mimari Duvar ve Tavandaki Sıcak Spot Işıklar
    bctx.fillStyle = "#090d16";
    bctx.fillRect(0, 0, width, 65);
    bctx.strokeStyle = "rgba(255,255,255,0.1)";
    bctx.lineWidth = 1.5;
    bctx.beginPath(); bctx.moveTo(0, 65); bctx.lineTo(width, 65); bctx.stroke();

    // Duvara Asılı Mimari Çizimler / Çerçeveli Tablolar
    // Sol Proje Tablosu: Standart Şehir Projesi
    bctx.fillStyle = "#1e293b";
    bctx.fillRect(80, 12, 110, 44);
    bctx.strokeStyle = "#38bdf8"; bctx.lineWidth = 1.5; bctx.strokeRect(80, 12, 110, 44);
    bctx.fillStyle = "#38bdf8"; bctx.font = "bold 8px sans-serif"; bctx.textAlign = "center";
    bctx.fillText("🏢 ŞEHİR REZİDANSLARI", 135, 26);
    bctx.fillStyle = "#94a3b8"; bctx.font = "7px sans-serif";
    bctx.fillText("Mimari Kesit & Planlar", 135, 42);

    // Sağ Proje Tablosu: Doğa & Villa Projesi
    bctx.fillStyle = "#1e293b";
    bctx.fillRect(width - 190, 12, 110, 44);
    bctx.strokeStyle = "#facc15"; bctx.lineWidth = 1.5; bctx.strokeRect(width - 190, 12, 110, 44);
    bctx.fillStyle = "#facc15"; bctx.font = "bold 8px sans-serif"; bctx.textAlign = "center";
    bctx.fillText("🏰 PANORAMİK VİLLALAR", width - 135, 26);
    bctx.fillStyle = "#94a3b8"; bctx.font = "7px sans-serif";
    bctx.fillText("Bahçe & Peyzaj Tasarımı", width - 135, 42);

    // Ana Tabela (Ortada: x: 220, y: 8, w: 360, h: 48)
    bctx.fillStyle = "#0f172a";
    bctx.beginPath(); bctx.roundRect(220, 8, 360, 48, 8); bctx.fill();
    bctx.strokeStyle = "#38bdf8"; bctx.lineWidth = 2; bctx.stroke();

    bctx.fillStyle = "#38bdf8";
    bctx.font = "bold 13px sans-serif";
    bctx.textAlign = "center";
    bctx.fillText("🏢 PRESTİJ GAYRİMENKUL & EMLAK OFİSİ 🏢", 400, 26);
    bctx.fillStyle = "#fde047";
    bctx.font = "bold 9px sans-serif";
    bctx.fillText("Maketleri İnceleyin • Satın Almadan Önce Evi Gezin", 400, 43);

    // 4. Satış Danışmanı Danışma & Karşılama Bankosu (Orta Üst: x: 310..490, y: 70..130)
    let dX = 320, dY = 75, dW = 160, dH = 55;
    bctx.fillStyle = "rgba(0,0,0,0.4)";
    bctx.fillRect(dX + 6, dY + 8, dW, dH);

    // Banko Gövdesi (Ceviz Ağacı Kaplama & Beyaz Mermer Üst)
    bctx.fillStyle = "#451a03";
    bctx.beginPath(); bctx.roundRect(dX, dY, dW, dH, 10); bctx.fill();
    bctx.strokeStyle = "#ca8a04"; bctx.lineWidth = 2; bctx.stroke();

    // Mermer Üst Yüzey
    bctx.fillStyle = "#f8fafc";
    bctx.beginPath(); bctx.roundRect(dX - 2, dY, dW + 4, 14, 4); bctx.fill();
    bctx.strokeStyle = "#e2e8f0"; bctx.lineWidth = 1; bctx.stroke();

    // Masa Üstündeki Bilgisayar & Mimari Plan Rulosu
    bctx.fillStyle = "#334155";
    bctx.fillRect(dX + 20, dY - 6, 26, 16);
    bctx.fillStyle = "#38bdf8";
    bctx.fillRect(dX + 22, dY - 4, 22, 10);
    // Mimari Plan Rulosu
    bctx.fillStyle = "#fef08a";
    bctx.fillRect(dX + 110, dY + 2, 32, 6);
    bctx.strokeStyle = "#ca8a04"; bctx.lineWidth = 1; bctx.strokeRect(dX + 110, dY + 2, 32, 6);

    // Danışman İsimliği
    bctx.fillStyle = "#1e293b";
    bctx.fillRect(dX + 50, dY + 28, 60, 16);
    bctx.strokeStyle = "#facc15"; bctx.lineWidth = 1; bctx.strokeRect(dX + 50, dY + 28, 60, 16);
    bctx.fillStyle = "#facc15"; bctx.font = "bold 8px sans-serif";
    bctx.fillText("MERT BEY", dX + 80, dY + 40);

    // =========================================================================
    // 5. ÜÇ ADET 3D MİMARİ EV MAKETİ (AYNI MARKETTEKİ PODYUMLAR GİBİ!)
    // =========================================================================
    // Podyum 1: 🏢 Standart Şehir Dairesi (Sol: x: 90, y: 215, w: 160, h: 140)
    drawMaketPedestal(bctx, 90, 215, 160, 140, "🏢 Standart Daire (1.250 TL)", "#38bdf8");
    drawMiniApartmentBuilding(bctx, 170, 255);

    // Podyum 2: 🏡 Verandalı Bahçeli Ev (Orta: x: 320, y: 215, w: 160, h: 140)
    drawMaketPedestal(bctx, 320, 215, 160, 140, "🏡 Bahçeli Ev (2.500 TL)", "#22c55e");
    drawMiniCountryHouse(bctx, 400, 255);

    // Podyum 3: 🏰 Bahçeli & Havuzlu Villa (Sağ: x: 550, y: 215, w: 160, h: 140)
    drawMaketPedestal(bctx, 550, 215, 160, 140, "🏰 Havuzlu Villa (3.750 TL)", "#f59e0b");
    drawMiniLuxuryVilla(bctx, 630, 255);

    // 6. Sol Alt: Müşteri Bekleme & Dinlenme Köşesi (Deri Kanepe & Sehpa)
    let sX = 25, sY = 395;
    // Sehpa
    bctx.fillStyle = "#78350f";
    bctx.beginPath(); bctx.roundRect(sX + 80, sY + 12, 38, 48, 6); bctx.fill();
    bctx.strokeStyle = "#ca8a04"; bctx.lineWidth = 1.5; bctx.stroke();
    bctx.fillStyle = "#38bdf8"; bctx.font = "bold 7px sans-serif";
    bctx.fillText("Katalog", sX + 99, sY + 38);

    // Kanepe
    bctx.fillStyle = "#475569";
    bctx.beginPath(); bctx.roundRect(sX, sY, 68, 60, 8); bctx.fill();
    bctx.strokeStyle = "#94a3b8"; bctx.lineWidth = 1.5; bctx.stroke();
    bctx.fillStyle = "#f8fafc";
    bctx.font = "bold 8px sans-serif";
    bctx.fillText("🛋️ Dinlenme", sX + 34, sY + 35);

    // 7. Çıkış Kapısı (Orta Altta: Caddeye Açılır)
    drawExitDoor(bctx, width / 2 - 35, height - 65, "🚪 CADDE", 70, 60);
}

// Maket Podyumu Çizim Yardımcısı
function drawMaketPedestal(ctx, x, y, w, h, label, accentColor) {
    ctx.save();
    // Podyum Taban Gölgesi
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.beginPath(); ctx.roundRect(x + 6, y + 8, w, h, 14); ctx.fill();

    // Ahşap Gövde (Ceviz & Bronz)
    ctx.fillStyle = "#1e293b";
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cam Teşhir Tablası (Spot Işıklı Zemin)
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.beginPath(); ctx.roundRect(x + 8, y + 8, w - 16, h - 42, 8); ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Alt Pirinç Plaka & Ev Adı
    ctx.fillStyle = "#0f172a";
    ctx.beginPath(); ctx.roundRect(x + 10, y + h - 30, w - 20, 22, 6); ctx.fill();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9.5px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, x + w / 2, y + h - 15);
    ctx.restore();
}

// 1. Minyatür Standart Şehir Dairesi Maketi
function drawMiniApartmentBuilding(ctx, cx, cy) {
    ctx.save();
    // Bina Gövdesi (Modern Şehir Bloğu)
    let bW = 54, bH = 68;
    let bX = cx - bW / 2, bY = cy - bH / 2;

    // Bina Gölgesi
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(bX + 5, bY + 6, bW, bH);

    // Cephe Rengi (Antrasit & Beyaz)
    ctx.fillStyle = "#334155";
    ctx.fillRect(bX, bY, bW, bH);
    ctx.strokeStyle = "#0284c7"; ctx.lineWidth = 1.5; ctx.strokeRect(bX, bY, bW, bH);

    // Minik Işıklı Pencereler (3 Kat x 3 Sütun)
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            let pX = bX + 6 + c * 16;
            let pY = bY + 8 + r * 18;
            ctx.fillStyle = "#fef08a"; // Sıcak lamba ışığı
            ctx.fillRect(pX, pY, 10, 11);
            ctx.strokeStyle = "#d97706"; ctx.lineWidth = 0.8; ctx.strokeRect(pX, pY, 10, 11);
        }
    }

    // Minyatür Giriş Kapısı & Çatı Anteni
    ctx.fillStyle = "#0284c7";
    ctx.fillRect(bX + bW / 2 - 5, bY + bH - 12, 10, 12);
    ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, bY); ctx.lineTo(cx, bY - 10); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, bY - 10, 2, 0, Math.PI * 2); ctx.fillStyle = "#ef4444"; ctx.fill();
    ctx.restore();
}

// 2. Minyatür Verandalı Bahçeli Ev Maketi
function drawMiniCountryHouse(ctx, cx, cy) {
    ctx.save();
    let bW = 60, bH = 46;
    let bX = cx - bW / 2, bY = cy - bH / 2 + 10;

    // Çim Bahçe Zemini
    ctx.fillStyle = "#15803d";
    ctx.beginPath(); ctx.roundRect(cx - 42, cy - 25, 84, 76, 6); ctx.fill();
    ctx.strokeStyle = "#86efac"; ctx.lineWidth = 1; ctx.stroke();

    // Minik Çitler
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 7; i++) {
        ctx.fillRect(cx - 38 + i * 12, cy + 42, 6, 8);
    }

    // Ev Gövdesi (Ahşap & Taş)
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(bX, bY, bW, bH);
    ctx.strokeStyle = "#78350f"; ctx.lineWidth = 1.5; ctx.strokeRect(bX, bY, bW, bH);

    // Kırmızı Üçgen Çatı
    ctx.fillStyle = "#dc2626";
    ctx.beginPath();
    ctx.moveTo(bX - 4, bY);
    ctx.lineTo(cx, bY - 20);
    ctx.lineTo(bX + bW + 4, bY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#991b1b"; ctx.lineWidth = 1.2; ctx.stroke();

    // Minik Baca
    ctx.fillStyle = "#78350f";
    ctx.fillRect(cx + 12, bY - 24, 7, 12);

    // Ahşap Veranda & Kapı
    ctx.fillStyle = "#b45309";
    ctx.fillRect(cx - 6, bY + bH - 14, 12, 14);

    // Minik Elma Ağacı (Bahçede)
    ctx.fillStyle = "#78350f";
    ctx.fillRect(cx + 26, cy - 8, 4, 16);
    ctx.fillStyle = "#16a34a";
    ctx.beginPath(); ctx.arc(cx + 28, cy - 14, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath(); ctx.arc(cx + 25, cy - 16, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 31, cy - 12, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

// 3. Minyatür Lüks Havuzlu Villa Maketi
function drawMiniLuxuryVilla(ctx, cx, cy) {
    ctx.save();
    // Mermer Bahçe Zemini
    ctx.fillStyle = "#cbd5e1";
    ctx.beginPath(); ctx.roundRect(cx - 44, cy - 25, 88, 76, 6); ctx.fill();

    // 2 Katlı Beyaz Villa
    let vW = 46, vH = 50;
    let vX = cx - 40, vY = cy - 20;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(vX, vY, vW, vH);
    ctx.strokeStyle = "#0284c7"; ctx.lineWidth = 1.5; ctx.strokeRect(vX, vY, vW, vH);

    // Panoramik Cam Pencereler
    ctx.fillStyle = "rgba(56, 189, 248, 0.75)";
    ctx.fillRect(vX + 6, vY + 6, 34, 15);
    ctx.fillRect(vX + 6, vY + 28, 22, 16);

    // Kristal Turkuaz Yüzme Havuzu (Işıltılı)
    let pX = cx + 12, pY = cy - 15, pW = 28, pH = 44;
    ctx.fillStyle = "#06b6d4";
    ctx.beginPath(); ctx.roundRect(pX, pY, pW, pH, 4); ctx.fill();
    ctx.strokeStyle = "#e0f2fe"; ctx.lineWidth = 1.5; ctx.stroke();

    // Havuz Su Dalgası
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pX + 4, pY + 12); ctx.lineTo(pX + pW - 4, pY + 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pX + 4, pY + 28); ctx.lineTo(pX + pW - 4, pY + 28); ctx.stroke();

    // Minik Şezlong & Şemsiye
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(pX - 4, pY + 4, 3, 10);
    // Minik Palmiye Ağacı
    ctx.fillStyle = "#78350f";
    ctx.fillRect(cx - 36, cy + 34, 3, 12);
    ctx.fillStyle = "#22c55e";
    ctx.beginPath(); ctx.arc(cx - 35, cy + 32, 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawEmlakciEnvironment() {
    let bg = bgCache.getCanvas('emlakci', canvas.width, canvas.height);
    ctx.drawImage(bg, 0, 0);

    let now = Date.now();

    // 1. Satış Danışmanı NPC (Mert Bey) Çizimi (x: 400, y: 72)
    let nX = 400, nY = 72;
    ctx.save();
    // Beden & Lacivert Takım Elbise
    ctx.fillStyle = "#1e3a8a";
    ctx.beginPath(); ctx.roundRect(nX - 12, nY + 10, 24, 20, 4); ctx.fill();
    // Beyaz Gömlek & Kırmızı İpek Kravat
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(nX - 4, nY + 10, 8, 12);
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(nX - 1.5, nY + 12, 3, 10);

    // Kafa & Yüz
    ctx.fillStyle = "#fbcfe8";
    ctx.beginPath(); ctx.arc(nX, nY + 2, 8, 0, Math.PI * 2); ctx.fill();
    // Stilize Saç
    ctx.fillStyle = "#451a03";
    ctx.beginPath(); ctx.arc(nX, nY, 8.5, Math.PI, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Satış Danışmanı Baş Üstü Canlı Konuşma Baloncuğu
    let bubbleY = nY - 26 + Math.sin(now / 350) * 2;
    ctx.save();
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath(); ctx.roundRect(nX - 145, bubbleY - 14, 290, 24, 8); ctx.fill();
    ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 1.5; ctx.stroke();

    // Balon Okcuğu
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.moveTo(nX - 6, bubbleY + 10);
    ctx.lineTo(nX, bubbleY + 17);
    ctx.lineTo(nX + 6, bubbleY + 10);
    ctx.fill();

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 9.5px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🤵 \"Hoş geldiniz! Satın almadan önce evleri gezmek ister misiniz?\"", nX, bubbleY + 2);
    ctx.restore();

    // 2. Maketlerin Üzerindeki Işık Parıltısı / Nabız Efekti
    let pulse = (Math.sin(now / 250) + 1) / 2;

    // Hover Etkileşim Kontrolleri
    let isDeskHover = (canvasMouseX >= 310 && canvasMouseX <= 490 && canvasMouseY >= 65 && canvasMouseY <= 145);
    let isMaket1Hover = (canvasMouseX >= 85 && canvasMouseX <= 255 && canvasMouseY >= 210 && canvasMouseY <= 360);
    let isMaket2Hover = (canvasMouseX >= 315 && canvasMouseX <= 485 && canvasMouseY >= 210 && canvasMouseY <= 360);
    let isMaket3Hover = (canvasMouseX >= 545 && canvasMouseX <= 715 && canvasMouseY >= 210 && canvasMouseY <= 360);
    let isExitHover = (canvasMouseX >= canvas.width / 2 - 45 && canvasMouseX <= canvas.width / 2 + 45 && canvasMouseY >= canvas.height - 75 && canvasMouseY <= canvas.height - 5);

    if (isDeskHover) {
        hoveredTableId = 'emlakci_desk';
        ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 3;
        ctx.strokeRect(320, 75, 160, 55);
        ctx.fillStyle = "#38bdf8"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("🤵 Satış Danışmanı Mert Bey ile Konuş (Tıkla / E)", 400, 148);
    } else if (isMaket1Hover) {
        hoveredTableId = 'maket_standart';
        ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 3.5;
        ctx.strokeRect(90, 215, 160, 140);
        ctx.fillStyle = "#38bdf8"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("👁️ Maketi İncele & Evi Gez (Tıkla / E)", 170, 205);
    } else if (isMaket2Hover) {
        hoveredTableId = 'maket_garden';
        ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 3.5;
        ctx.strokeRect(320, 215, 160, 140);
        ctx.fillStyle = "#86efac"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("👁️ Maketi İncele & Evi Gez (Tıkla / E)", 400, 205);
    } else if (isMaket3Hover) {
        hoveredTableId = 'maket_pool';
        ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 3.5;
        ctx.strokeRect(550, 215, 160, 140);
        ctx.fillStyle = "#fde047"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("👁️ Maketi İncele & Evi Gez (Tıkla / E)", 630, 205);
    } else if (isExitHover) {
        hoveredTableId = 'emlakci_exit';
        ctx.strokeStyle = "#facc15"; ctx.lineWidth = 3;
        ctx.strokeRect(canvas.width / 2 - 37, canvas.height - 67, 74, 64);
        ctx.fillStyle = "#facc15"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("🚪 Caddeye Çık", canvas.width / 2, canvas.height - 72);
    } else {
        if (hoveredTableId && hoveredTableId.startsWith('emlakci_') || hoveredTableId && hoveredTableId.startsWith('maket_')) {
            hoveredTableId = null;
        }
    }

    canvas.style.cursor = (isDeskHover || isMaket1Hover || isMaket2Hover || isMaket3Hover || isExitHover) ? 'pointer' : 'default';
}
