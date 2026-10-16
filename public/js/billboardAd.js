// public/js/billboardAd.js - Canlı Reklam Panosu ve Mekan İçi TV Ağı İstemci Modülü
let currentBillboardAd = {
    activeAd: null, // { username, text, secondsLeft }
    queueLength: 0,
    adPrice: 1000,
    adDuration: 60
};

// 1. Soket Dinleyicileri
if (typeof socket !== 'undefined' && socket) {
    socket.on('billboardAdUpdate', (data) => {
        if (!data) return;
        currentBillboardAd = data;
        // Reklam durumu değiştiğinde TV'lerin ve panoların anında güncellenmesi için zemin önbelleğini tazele
        if (typeof bgCache !== 'undefined') bgCache.invalidate();
    });

    socket.on('billboardAdSuccess', (data) => {
        let msg = (data && data.message) ? data.message : "Reklamınız başarıyla sıraya alındı!";
        showAdToast(msg, false);
        closeBillboardAdModal();
        if (window.playSound) window.playSound('coins');
    });

    socket.on('billboardAdError', (msg) => {
        showAdToast(msg || "Reklam verilemedi!", true);
        if (window.playSound) window.playSound('error');
    });
}

// 2. Bildirim Toast
function showAdToast(msg, isError = false) {
    let existing = document.getElementById('billboardAdToast');
    if (existing) existing.remove();

    let toast = document.createElement('div');
    toast.id = 'billboardAdToast';
    toast.style.cssText = `
        position: fixed;
        top: 75px;
        left: 50%;
        transform: translateX(-50%);
        background: ${isError ? 'rgba(220, 38, 38, 0.95)' : 'linear-gradient(135deg, #059669, #0d9488)'};
        color: white;
        padding: 12px 24px;
        border-radius: 14px;
        border: 2px solid ${isError ? '#f87171' : '#34d399'};
        font-weight: 800;
        font-size: 14px;
        z-index: 38000;
        box-shadow: 0 12px 35px rgba(0,0,0,0.7);
        pointer-events: none;
        animation: popIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        text-align: center;
        max-width: 90%;
    `;
    toast.innerText = msg;
    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3800);
}

// 3. Reklam Panosu Modal Aç / Kapat
function openBillboardAdModal() {
    const modal = document.getElementById('billboardAdModal');
    if (!modal) return;

    let userMoney = 0;
    if (typeof myMoney !== 'undefined') userMoney = myMoney;
    else if (typeof myId !== 'undefined' && typeof players !== 'undefined' && players[myId]) userMoney = players[myId].money || 0;

    const moneyEl = document.getElementById('adModalUserMoney');
    if (moneyEl) moneyEl.innerText = userMoney;

    const queueInfoEl = document.getElementById('adModalQueueInfo');
    if (queueInfoEl) {
        if (currentBillboardAd.activeAd) {
            let qLen = currentBillboardAd.queueLength || 0;
            queueInfoEl.innerHTML = `⚠️ Şu an <b>${currentBillboardAd.activeAd.username}</b> kullanıcısının reklamı yayında (${currentBillboardAd.activeAd.secondsLeft} sn kaldı). ${qLen > 0 ? `Sırada <b>${qLen}</b> reklam var.` : 'Sırada bekleyen başka reklam yok, sizinki sıradaki olacak!'}`;
        } else {
            queueInfoEl.innerHTML = `✨ Şu an pano boştur! Verdiğiniz reklam <b>hemen</b> yayına girecektir.`;
        }
    }

    const input = document.getElementById('billboardAdTextInput');
    if (input) {
        input.value = '';
        updateAdPreview('');
    }

    modal.style.display = 'flex';
    if (window.playSound) window.playSound('click');
}
window.openBillboardAdModal = openBillboardAdModal;

function closeBillboardAdModal() {
    const modal = document.getElementById('billboardAdModal');
    if (modal) modal.style.display = 'none';
}
window.closeBillboardAdModal = closeBillboardAdModal;

function updateAdPreview(val) {
    const previewEl = document.getElementById('billboardAdPreviewText');
    const counterEl = document.getElementById('adCharCounter');
    let txt = (typeof val === 'string') ? val.trim() : '';

    if (counterEl) counterEl.innerText = (60 - (val ? val.length : 0));
    if (previewEl) {
        if (!txt) {
            previewEl.innerText = 'Örnek: "Tavla masasına 50 TL\'sine rakip aranıyor! Masa 1\'e gelin!"';
            previewEl.style.color = '#94a3b8';
            previewEl.style.fontStyle = 'italic';
        } else {
            previewEl.innerText = `"${txt}"`;
            previewEl.style.color = '#fef08a';
            previewEl.style.fontStyle = 'normal';
        }
    }
}
window.updateAdPreview = updateAdPreview;

function submitBillboardAdForm() {
    const input = document.getElementById('billboardAdTextInput');
    if (!input) return;
    let text = input.value.trim();
    if (text.length < 3) {
        showAdToast("Lütfen en az 3 karakterlik bir reklam metni yazın!", true);
        return;
    }
    if (window.socket) {
        window.socket.emit('submitBillboardAd', { text: text });
    }
}
window.submitBillboardAdForm = submitBillboardAdForm;

// 4. Çizim Motoru: Açık Hava LED Reklam Panosu (Meydan ve Cadde)
function drawOutdoorBillboard(bctx, x, y, w, h, isHover = false) {
    let now = Date.now();
    bctx.save();

    // Ayaklar / Çelik Taşıyıcı Direkler
    bctx.fillStyle = "#334155";
    bctx.fillRect(x + 28, y + h - 6, 12, 28);
    bctx.fillRect(x + w - 40, y + h - 6, 12, 28);
    bctx.fillStyle = "#1e293b";
    bctx.fillRect(x + 24, y + h + 18, 20, 6);
    bctx.fillRect(x + w - 44, y + h + 18, 20, 6);

    // Dış Kasa (Alüminyum & Grafit Çerçeve)
    bctx.fillStyle = "#0f172a";
    bctx.beginPath();
    bctx.roundRect(x, y, w, h, 14);
    bctx.fill();

    // Dış Neon Çerçeve
    bctx.strokeStyle = isHover ? "#38bdf8" : (currentBillboardAd.activeAd ? "#facc15" : "#64748b");
    bctx.lineWidth = isHover ? 3 : 2;
    bctx.stroke();

    // Üst Başlık Şeridi
    bctx.fillStyle = isHover ? "#0284c7" : (currentBillboardAd.activeAd ? "#b45309" : "#1e293b");
    bctx.beginPath();
    bctx.roundRect(x + 6, y + 6, w - 12, 22, 6);
    bctx.fill();

    bctx.fillStyle = "#ffffff";
    bctx.font = "bold 11px sans-serif";
    bctx.textAlign = "center";
    bctx.fillText("📢 METAVERSE CANLI REKLAM PANOSU", x + w / 2, y + 21);

    // İç LED Ekran Alanı
    let scrX = x + 8, scrY = y + 32, scrW = w - 16, scrH = h - 40;
    let active = currentBillboardAd.activeAd;

    if (active) {
        // Canlı Reklam Var: Parlayan Neon Ekran
        let ledGrad = bctx.createLinearGradient(scrX, scrY, scrX, scrY + scrH);
        ledGrad.addColorStop(0, '#1e1b4b');
        ledGrad.addColorStop(0.5, '#090d16');
        ledGrad.addColorStop(1, '#020617');
        bctx.fillStyle = ledGrad;
        bctx.beginPath();
        bctx.roundRect(scrX, scrY, scrW, scrH, 8);
        bctx.fill();
        bctx.strokeStyle = "#a855f7";
        bctx.lineWidth = 1.5;
        bctx.stroke();

        // Reklam Veren Kullanıcı Rozeti & Süre Sayacı
        bctx.fillStyle = "#38bdf8";
        bctx.font = "bold 10px sans-serif";
        bctx.textAlign = "left";
        bctx.fillText(`👤 ${active.username}:`, scrX + 10, scrY + 16);

        bctx.fillStyle = "#facc15";
        bctx.font = "bold 10px sans-serif";
        bctx.textAlign = "right";
        bctx.fillText(`⏱️ ${active.secondsLeft} sn`, scrX + scrW - 10, scrY + 16);

        // Reklam Metni (Büyük & Vurgulu)
        bctx.fillStyle = "#fef08a";
        bctx.font = "bold 12px sans-serif";
        bctx.textAlign = "center";
        
        // Metin iki satıra sığacak şekilde ortalanır
        let words = active.text.split(" ");
        let line1 = "", line2 = "";
        for (let w of words) {
            if ((line1 + " " + w).length <= 26) {
                line1 += (line1 ? " " : "") + w;
            } else {
                line2 += (line2 ? " " : "") + w;
            }
        }
        bctx.fillText(`"${line1}"`, scrX + scrW / 2, scrY + 36);
        if (line2) {
            bctx.fillText(`"${line2}"`, scrX + scrW / 2, scrY + 52);
        }

        // Alt Bilgi: Sıradaki Kuyruk
        bctx.fillStyle = "#94a3b8";
        bctx.font = "9px sans-serif";
        let qCount = currentBillboardAd.queueLength || 0;
        bctx.fillText(qCount > 0 ? `⏳ Sırada ${qCount} reklam var • Tıkla Reklam Ver` : `💡 Sıradaki sen ol! • Tıkla Reklam Ver (1000 TL)`, scrX + scrW / 2, scrY + scrH - 6);

    } else {
        // Reklam Yok: Kocaman "REKLAM PANOSU - Reklam verebilirsiniz" yazısı!
        let emptyGrad = bctx.createLinearGradient(scrX, scrY, scrX + scrW, scrY + scrH);
        emptyGrad.addColorStop(0, '#042f2e');
        emptyGrad.addColorStop(0.5, '#064e3b');
        emptyGrad.addColorStop(1, '#022c22');
        bctx.fillStyle = emptyGrad;
        bctx.beginPath();
        bctx.roundRect(scrX, scrY, scrW, scrH, 8);
        bctx.fill();
        bctx.strokeStyle = "#10b981";
        bctx.lineWidth = 1.5;
        bctx.stroke();

        // Dikkat Çeken Parlayan Başlık
        bctx.fillStyle = "#facc15";
        bctx.font = "bold 13px sans-serif";
        bctx.textAlign = "center";
        bctx.fillText("📢 REKLAM PANOSU", scrX + scrW / 2, scrY + 22);

        bctx.fillStyle = "#ffffff";
        bctx.font = "bold 11px sans-serif";
        bctx.fillText("✨ Reklam Verebilirsiniz! ✨", scrX + scrW / 2, scrY + 39);

        // Çağrı Butonu / Açıklama
        bctx.fillStyle = isHover ? "#38bdf8" : "#34d399";
        bctx.font = "bold 10px sans-serif";
        bctx.fillText("💰 1 Dakika • 1000 TL (Tıkla ve Yaz)", scrX + scrW / 2, scrY + 56);

        bctx.fillStyle = "#cbd5e1";
        bctx.font = "9px sans-serif";
        bctx.fillText("Tüm mekanlardaki TV'lerde de canlı yayınlanır!", scrX + scrW / 2, scrY + scrH - 6);
    }

    bctx.restore();
}
window.drawOutdoorBillboard = drawOutdoorBillboard;

// 5. Çizim Motoru: Mekan İçi Duvar Televizyonu (TV Screen)
// Kullanıcı kuralı: "eğer biri reklam vermiş olursa bu televizyonlar açılsın ve o reklamdaki yazı televizyona gesin. kimse reklam vermemiş olursa televizyonlar kapalı kalsın."
function drawVenueTV(ctx, x, y, w = 150, h = 76) {
    ctx.save();

    // 1. Şık Mat Titanyum TV Kasası & İnce Dış Çerçeve
    ctx.fillStyle = "#09090b";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = "#3f3f46";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // TV Duvar Montaj Konsolu (Alt & Üst Braket)
    ctx.fillStyle = "#18181b";
    ctx.fillRect(x + w / 2 - 16, y + h, 32, 5);
    ctx.fillRect(x + w / 2 - 12, y - 4, 24, 4);

    let scrX = x + 4, scrY = y + 4, scrW = w - 8, scrH = h - 8;
    let active = currentBillboardAd.activeAd;

    if (active) {
        // TV AÇIK! (Ultra HD Sinematik Canlı Yayın Ekranı)
        let onGrad = ctx.createLinearGradient(scrX, scrY, scrX, scrY + scrH);
        onGrad.addColorStop(0, '#0c4a6e');
        onGrad.addColorStop(0.5, '#075985');
        onGrad.addColorStop(1, '#02131f');
        ctx.fillStyle = onGrad;
        ctx.beginPath();
        ctx.roundRect(scrX, scrY, scrW, scrH, 5);
        ctx.fill();

        // Üst Bilgi Barı: Kırmızı Canlı Yayın Rozeti
        ctx.fillStyle = "rgba(220, 38, 38, 0.95)";
        ctx.beginPath();
        ctx.roundRect(scrX + 6, scrY + 6, 44, 15, 3);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🔴 CANLI", scrX + 28, scrY + 17);

        // Reklam Veren Kullanıcı (Sağ Üstte Altın Renk)
        ctx.fillStyle = "#facc15";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(`📢 ${active.username}`, scrX + scrW - 8, scrY + 17);

        // Ekran İçi Ayraç Çizgisi
        ctx.strokeStyle = "rgba(56, 189, 248, 0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(scrX + 8, scrY + 25);
        ctx.lineTo(scrX + scrW - 8, scrY + 25);
        ctx.stroke();

        // Büyük Reklam Metni (Ekran Ortasında Parlak Beyaz)
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        let sub = active.text || "";
        if (sub.length > 30) sub = sub.substring(0, 28) + "..";
        ctx.fillText(`"${sub}"`, scrX + scrW / 2, scrY + 42);

        // Alt Panel: Kalan Süre Rozeti
        ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
        ctx.beginPath();
        ctx.roundRect(scrX + scrW / 2 - 38, scrY + scrH - 18, 76, 14, 4);
        ctx.fill();
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 9px sans-serif";
        ctx.fillText(`⏱️ ${active.secondsLeft}s Kaldı`, scrX + scrW / 2, scrY + scrH - 8);

        // Parlak Yeşil Güç LED Lambası
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.arc(x + w - 8, y + h - 6, 2.2, 0, Math.PI * 2);
        ctx.fill();

    } else {
        // TV KAPALI! (Siyah Yansımalı Ekran & Kırmızı Standby LED)
        ctx.fillStyle = "#030712";
        ctx.beginPath();
        ctx.roundRect(scrX, scrY, scrW, scrH, 5);
        ctx.fill();

        // Kapalı Ekran Camı Köşe Işık Parlaması
        ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(scrX + 8, scrY + scrH - 8);
        ctx.lineTo(scrX + scrW - 8, scrY + 8);
        ctx.stroke();

        // TV Kapalı Yazısı & İkon
        ctx.fillStyle = "#475569";
        ctx.font = "bold 9.5px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("📺 REKLAM TELEVİZYONU", scrX + scrW / 2, scrY + scrH / 2 - 2);

        ctx.fillStyle = "#334155";
        ctx.font = "8px sans-serif";
        ctx.fillText("STANDBY • YAYIN BEKLENİYOR", scrX + scrW / 2, scrY + scrH / 2 + 12);

        // Kırmızı Standby LED Lambası
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(x + w - 8, y + h - 6, 2.2, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}
window.drawVenueTV = drawVenueTV;
