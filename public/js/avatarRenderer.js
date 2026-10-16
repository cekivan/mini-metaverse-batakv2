// public/js/avatarRenderer.js - Karakter, Kıyafet, Saç, Oturma Pozu ve Aksesuar Çizim Motoru

// --- AVATAR ÇİZİM MODÜLLERİ (KADIN/ERKEK SAÇLAR, ELBİSELER, AYAKKABILAR) ---

function drawSingleShoe(targetCtx, x, y, shoeType, skinColor, angle = 0, isCrossed = false) {
    targetCtx.save();
    targetCtx.translate(x + 3.5, y + 2.5);
    if (angle !== 0) targetCtx.rotate(angle);
    targetCtx.translate(-(x + 3.5), -(y + 2.5));

    if (shoeType === 'classic') {
        // Cilalı Kösele Klasik Ayakkabı
        targetCtx.fillStyle = "#18181b";
        targetCtx.beginPath();
        targetCtx.roundRect(x, y, 8, 4.5, [2, 3, 1, 1]);
        targetCtx.fill();
        targetCtx.fillStyle = "rgba(255, 255, 255, 0.45)";
        targetCtx.fillRect(x + 2, y + 1, 3, 1);
        targetCtx.fillStyle = "#78350f";
        targetCtx.fillRect(x, y + 3.8, 8, 1);
    } else if (shoeType === 'boots') {
        // Kışlık Deri Bot (Tırtıklı tabanlı)
        targetCtx.fillStyle = "#78350f";
        targetCtx.beginPath();
        targetCtx.roundRect(x, y - 1, 8, 5.5, 2);
        targetCtx.fill();
        targetCtx.fillStyle = "#1c1917";
        targetCtx.fillRect(x, y + 3.5, 8.5, 2);
    } else if (shoeType === 'heels') {
        // Şık Topuklu Stiletto
        targetCtx.fillStyle = "#e11d48";
        targetCtx.beginPath();
        targetCtx.ellipse(x + 4, y + 2, 4, 2.5, 0, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.fillStyle = "#9f1239";
        targetCtx.fillRect(x, y + 2, 1.5, 4.5);
    } else if (shoeType === 'flats') {
        // Zarif Babet
        targetCtx.fillStyle = "#ec4899";
        targetCtx.beginPath();
        targetCtx.ellipse(x + 3.5, y + 2, 3.8, 2, 0, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.fillStyle = "#ffffff";
        targetCtx.beginPath(); targetCtx.arc(x + 4, y + 1.5, 1.2, 0, Math.PI * 2); targetCtx.fill();
    } else if (shoeType === 'none') {
        // Çıplak Ayak
        targetCtx.fillStyle = skinColor || "#ffd1a4";
        targetCtx.beginPath();
        targetCtx.ellipse(x + 3.5, y + 2, 3.5, 2, 0, 0, Math.PI * 2);
        targetCtx.fill();
    } else {
        // Varsayılan: Beyaz Tabanlı Sneaker
        targetCtx.fillStyle = "#ffffff";
        targetCtx.beginPath();
        targetCtx.roundRect(x, y + 2, 8, 2.8, 1);
        targetCtx.fill();
        targetCtx.fillStyle = "#0284c7";
        targetCtx.beginPath();
        targetCtx.roundRect(x, y, 7.5, 2.8, [2, 2, 0, 0]);
        targetCtx.fill();
        targetCtx.fillStyle = "#ffffff";
        targetCtx.fillRect(x + 2, y + 1, 3.5, 1);
    }

    targetCtx.restore();
}

function drawAvatarLegsAndShoes(targetCtx, pX, pY, legSwing = 0, skinColor = "#ffd1a4", shoeType = "sneakers", isSkirt = false, isSitting = false, facing = "down") {
    if (isSitting) {
        targetCtx.save();
        let legColor = isSkirt ? (skinColor || "#ffd1a4") : "#1e293b";
        let shadowColor = "rgba(0, 0, 0, 0.28)";

        if (facing === 'right') {
            // SAĞA DÖNÜK PROFİL OTURMA (Ayak ayak üstüne atmış şık profil)
            targetCtx.fillStyle = legColor;
            targetCtx.fillRect(pX - 4, pY + 8, 5, 12);
            drawSingleShoe(targetCtx, pX - 5, pY + 19, shoeType, skinColor, 0, false);

            targetCtx.fillStyle = legColor;
            targetCtx.beginPath();
            targetCtx.roundRect(pX - 5, pY + 6, 12, 6, [3, 4, 2, 2]);
            targetCtx.fill();
            targetCtx.fillRect(pX + 4, pY + 10, 5, 7);
            drawSingleShoe(targetCtx, pX + 4, pY + 16, shoeType, skinColor, 0.22, true);

        } else if (facing === 'left') {
            // SOLA DÖNÜK PROFİL OTURMA
            targetCtx.fillStyle = legColor;
            targetCtx.fillRect(pX - 1, pY + 8, 5, 12);
            drawSingleShoe(targetCtx, pX - 2, pY + 19, shoeType, skinColor, 0, false);

            targetCtx.fillStyle = legColor;
            targetCtx.beginPath();
            targetCtx.roundRect(pX - 7, pY + 6, 12, 6, [4, 3, 2, 2]);
            targetCtx.fill();
            targetCtx.fillRect(pX - 9, pY + 10, 5, 7);
            drawSingleShoe(targetCtx, pX - 11, pY + 16, shoeType, skinColor, -0.22, true);

        } else if (facing === 'up') {
            // ARKAYA DÖNÜK OTURMA (Piyano, bilgisayar vs.)
            targetCtx.fillStyle = legColor;
            targetCtx.fillRect(pX - 7, pY + 8, 5, 8);
            targetCtx.fillRect(pX + 2, pY + 8, 5, 8);
            targetCtx.fillStyle = "#1e1e1e";
            targetCtx.fillRect(pX - 7, pY + 16, 5, 4);
            targetCtx.fillRect(pX + 2, pY + 16, 5, 4);

        } else {
            // ÖNE DÖNÜK (facing === 'down') - ÖZGÜN SANALİKA AYAK AYAK ÜSTÜNE ATMA MODELİ
            
            // 1. Zemin ve Koltuk İçi Gölge Katmanı
            targetCtx.fillStyle = shadowColor;
            targetCtx.beginPath();
            targetCtx.ellipse(pX - 1, pY + 9, 12, 4, 0, 0, Math.PI * 2);
            targetCtx.fill();

            // 2. Alt Dinlenen Bacak (Sol bacak - dikey, tabanı yere yakın)
            targetCtx.fillStyle = legColor;
            targetCtx.beginPath();
            targetCtx.roundRect(pX - 9, pY + 7, 6, 8, [2, 2, 0, 0]);
            targetCtx.fill();
            targetCtx.fillRect(pX - 9, pY + 14, 5, 7);
            drawSingleShoe(targetCtx, pX - 10, pY + 20, shoeType, skinColor, 0, false);

            // 3. Üst Bacak (Sağ bacak - Dizin üstünden çapraz geçen "Ayak Ayak Üstü" duruşu)
            targetCtx.fillStyle = legColor;
            targetCtx.beginPath();
            targetCtx.moveTo(pX + 4, pY + 7);
            targetCtx.lineTo(pX - 7, pY + 9);
            targetCtx.quadraticCurveTo(pX - 10, pY + 11, pX - 7, pY + 14); // Sol diz üstündeki kıvrım
            targetCtx.lineTo(pX + 1, pY + 12);
            targetCtx.closePath();
            targetCtx.fill();

            // Diz ve pantolon kumaşı derinlik çizgisi (Shading highlight)
            targetCtx.strokeStyle = "rgba(0, 0, 0, 0.35)";
            targetCtx.lineWidth = 1;
            targetCtx.beginPath();
            targetCtx.arc(pX - 5, pY + 11, 3.5, Math.PI * 0.6, Math.PI * 1.6);
            targetCtx.stroke();

            // Çapraz sarkan alt bacak (Dizin üzerinden sağa/aşağıya havada süzülen kaval kemiği)
            targetCtx.fillStyle = legColor;
            targetCtx.beginPath();
            targetCtx.moveTo(pX - 6, pY + 12);
            targetCtx.lineTo(pX + 3, pY + 15);
            targetCtx.lineTo(pX + 2, pY + 19);
            targetCtx.lineTo(pX - 5, pY + 16);
            targetCtx.closePath();
            targetCtx.fill();

            // Kumaş dikiş / ışık vurgusu
            targetCtx.strokeStyle = "rgba(255, 255, 255, 0.22)";
            targetCtx.lineWidth = 1;
            targetCtx.beginPath();
            targetCtx.moveTo(pX - 4, pY + 13);
            targetCtx.lineTo(pX + 2, pY + 16);
            targetCtx.stroke();

            // 4. Havada Asılı Çapraz Ayakkabı (Sağ ayak - 15 derece açıyla havada sallanan şık duruş)
            drawSingleShoe(targetCtx, pX + 2, pY + 16, shoeType, skinColor, 0.24, true);

            // 5. Etek / Elbise Varsa Döküm Katmanı
            if (isSkirt) {
                targetCtx.fillStyle = legColor;
                targetCtx.beginPath();
                targetCtx.roundRect(pX - 11, pY + 6, 22, 6, [3, 3, 5, 5]);
                targetCtx.fill();
                targetCtx.strokeStyle = "rgba(0,0,0,0.15)";
                targetCtx.lineWidth = 0.8;
                targetCtx.stroke();
            }
        }

        targetCtx.restore();
        return;
    }

    // Bacaklar (Ayakta Yürüme / Durma)
    targetCtx.fillStyle = isSkirt ? (skinColor || "#ffd1a4") : "#1e293b";
    targetCtx.fillRect(pX - 8, pY + 12 - legSwing, 5, 8 + legSwing);
    targetCtx.fillRect(pX + 3, pY + 12 + legSwing, 5, 8 - legSwing);

    // Ayakkabılar
    let leftShoeY = pY + 18 - legSwing;
    let rightShoeY = pY + 18 + legSwing;

    drawSingleShoe(targetCtx, pX - 9, leftShoeY, shoeType, skinColor, 0, false);
    drawSingleShoe(targetCtx, pX + 2, rightShoeY, shoeType, skinColor, 0, false);
}

function drawAvatarBodyAndClothes(targetCtx, pX, pY, shirtColor = "#3b82f6", skinColor = "#ffd1a4") {
    if (shirtColor === 'dress_pink') {
        // Pembe Çiçekli Elbise
        targetCtx.fillStyle = "#f472b6";
        targetCtx.beginPath(); targetCtx.roundRect(pX - 9, pY - 10, 18, 12, [4, 4, 0, 0]); targetCtx.fill();
        // Etek kısmı
        targetCtx.fillStyle = "#ec4899";
        targetCtx.beginPath();
        targetCtx.moveTo(pX - 9, pY + 1);
        targetCtx.lineTo(pX - 14, pY + 14);
        targetCtx.quadraticCurveTo(pX, pY + 16, pX + 14, pY + 14);
        targetCtx.lineTo(pX + 9, pY + 1);
        targetCtx.closePath();
        targetCtx.fill();
        targetCtx.fillStyle = "#ffffff";
        targetCtx.fillRect(pX - 13, pY + 13, 26, 1.5); // Fırfır
    } else if (shirtColor === 'dress_black') {
        // Zarif Gece Elbisesi
        targetCtx.fillStyle = "#18181b";
        targetCtx.beginPath(); targetCtx.roundRect(pX - 9, pY - 10, 18, 12, [4, 4, 0, 0]); targetCtx.fill();
        // Etek
        targetCtx.beginPath();
        targetCtx.moveTo(pX - 9, pY + 1);
        targetCtx.lineTo(pX - 13, pY + 14);
        targetCtx.quadraticCurveTo(pX, pY + 16, pX + 13, pY + 14);
        targetCtx.lineTo(pX + 9, pY + 1);
        targetCtx.closePath();
        targetCtx.fill();
        // Altın Kemer
        targetCtx.fillStyle = "#facc15";
        targetCtx.fillRect(pX - 9, pY, 18, 2);
    } else if (shirtColor === 'dress_red') {
        // Kırmızı Kokteyl Elbisesi
        targetCtx.fillStyle = "#e11d48";
        targetCtx.beginPath(); targetCtx.roundRect(pX - 9, pY - 10, 18, 12, [4, 4, 0, 0]); targetCtx.fill();
        targetCtx.beginPath();
        targetCtx.moveTo(pX - 9, pY + 1);
        targetCtx.lineTo(pX - 14, pY + 14);
        targetCtx.quadraticCurveTo(pX, pY + 16, pX + 14, pY + 14);
        targetCtx.lineTo(pX + 9, pY + 1);
        targetCtx.closePath();
        targetCtx.fill();
    } else if (shirtColor === 'skirt_crop') {
        // Beyaz Crop + Pileli Pembe Mini Etek
        targetCtx.fillStyle = "#f8fafc";
        targetCtx.beginPath(); targetCtx.roundRect(pX - 9, pY - 10, 18, 9, [4, 4, 0, 0]); targetCtx.fill();
        // Göbek deliği ten
        targetCtx.fillStyle = skinColor || "#ffd1a4";
        targetCtx.fillRect(pX - 8, pY - 1, 16, 3);
        // Etek
        targetCtx.fillStyle = "#f43f5e";
        targetCtx.beginPath();
        targetCtx.moveTo(pX - 9, pY + 2);
        targetCtx.lineTo(pX - 13, pY + 12);
        targetCtx.lineTo(pX + 13, pY + 12);
        targetCtx.lineTo(pX + 9, pY + 2);
        targetCtx.closePath();
        targetCtx.fill();
    } else if (shirtColor === 'skirt_denim') {
        // Kot Etek & Üst
        targetCtx.fillStyle = "#f1f5f9";
        targetCtx.beginPath(); targetCtx.roundRect(pX - 9, pY - 10, 18, 11, [4, 4, 0, 0]); targetCtx.fill();
        // Denim Etek
        targetCtx.fillStyle = "#2563eb";
        targetCtx.beginPath();
        targetCtx.moveTo(pX - 9, pY + 1);
        targetCtx.lineTo(pX - 12, pY + 12);
        targetCtx.lineTo(pX + 12, pY + 12);
        targetCtx.lineTo(pX + 9, pY + 1);
        targetCtx.closePath();
        targetCtx.fill();
    } else if (shirtColor === 'polo') {
        // Polo Yaka
        targetCtx.fillStyle = "#f8fafc";
        targetCtx.beginPath(); targetCtx.roundRect(pX - 10, pY - 10, 20, 22, 5); targetCtx.fill();
        targetCtx.strokeStyle = "rgba(0,0,0,0.15)"; targetCtx.lineWidth = 1; targetCtx.stroke();
        // Yaka Plaketi
        targetCtx.fillStyle = "#3b82f6";
        targetCtx.beginPath();
        targetCtx.moveTo(pX - 5, pY - 10); targetCtx.lineTo(pX, pY - 4); targetCtx.lineTo(pX + 5, pY - 10);
        targetCtx.stroke();
    } else if (shirtColor === 'hoodie') {
        // Kapüşonlu Sweat
        targetCtx.fillStyle = "#6366f1";
        targetCtx.beginPath(); targetCtx.roundRect(pX - 10, pY - 10, 20, 22, 5); targetCtx.fill();
        // Kanguru cep
        targetCtx.fillStyle = "#4f46e5";
        targetCtx.beginPath(); targetCtx.roundRect(pX - 6, pY + 3, 12, 6, 2); targetCtx.fill();
        // İpler
        targetCtx.strokeStyle = "#ffffff"; targetCtx.lineWidth = 1;
        targetCtx.beginPath(); targetCtx.moveTo(pX - 3, pY - 8); targetCtx.lineTo(pX - 3, pY - 2); targetCtx.stroke();
        targetCtx.beginPath(); targetCtx.moveTo(pX + 3, pY - 8); targetCtx.lineTo(pX + 3, pY - 2); targetCtx.stroke();
    } else if (shirtColor === 'leather') {
        // Deri Ceket
        targetCtx.fillStyle = "#18181b";
        targetCtx.beginPath(); targetCtx.roundRect(pX - 10, pY - 10, 20, 22, 5); targetCtx.fill();
        // Fermuar & Yaka
        targetCtx.strokeStyle = "#94a3b8"; targetCtx.lineWidth = 1.2;
        targetCtx.beginPath(); targetCtx.moveTo(pX - 2, pY - 9); targetCtx.lineTo(pX + 3, pY + 11); targetCtx.stroke();
    } else {
        // Klasik Tişört
        targetCtx.fillStyle = shirtColor || "#3b82f6";
        targetCtx.beginPath(); targetCtx.roundRect(pX - 10, pY - 10, 20, 22, 5); targetCtx.fill();
        targetCtx.strokeStyle = "rgba(255,255,255,0.7)"; targetCtx.lineWidth = 1.5; targetCtx.stroke();
    }
}

function drawAvatarHairAndHats(targetCtx, pX, pY, hatType = "none", facing = "down") {
    if (hatType === 'bere') {
        // Kırmızı Bere & Ponpon
        targetCtx.fillStyle = "#e11d48";
        targetCtx.beginPath(); targetCtx.arc(pX, pY - 24, 8, Math.PI, 0); targetCtx.fill();
        targetCtx.fillStyle = "#ffffff";
        targetCtx.beginPath(); targetCtx.arc(pX, pY - 26, 3, 0, Math.PI * 2); targetCtx.fill();
    } else if (hatType === 'fes') {
        // Osmanlı Fesi
        targetCtx.fillStyle = "#991b1b";
        targetCtx.beginPath();
        targetCtx.moveTo(pX - 7, pY - 20); targetCtx.lineTo(-5 + pX, pY - 30);
        targetCtx.lineTo(5 + pX, pY - 30); targetCtx.lineTo(7 + pX, pY - 20);
        targetCtx.closePath(); targetCtx.fill();
        targetCtx.strokeStyle = "#0f172a"; targetCtx.lineWidth = 1.5;
        targetCtx.beginPath(); targetCtx.moveTo(pX, pY - 30); targetCtx.quadraticCurveTo(pX + 7, pY - 28, pX + 8, pY - 21); targetCtx.stroke();
        targetCtx.fillStyle = "#0f172a"; targetCtx.beginPath(); targetCtx.arc(pX + 8, pY - 21, 2, 0, Math.PI * 2); targetCtx.fill();
    } else if (hatType === 'kasket') {
        // Kasket
        targetCtx.fillStyle = "#334155";
        targetCtx.beginPath(); targetCtx.arc(pX, pY - 23, 9, Math.PI, 0); targetCtx.fill();
        let vDir = (facing === 'left') ? -6 : (facing === 'right') ? 6 : 0;
        targetCtx.fillStyle = "#1e293b";
        targetCtx.beginPath(); targetCtx.ellipse(pX + vDir, pY - 23, 9, 3, 0, 0, Math.PI * 2); targetCtx.fill();
        targetCtx.fillStyle = "#64748b";
        targetCtx.beginPath(); targetCtx.arc(pX, pY - 26, 2, 0, Math.PI * 2); targetCtx.fill();
    } else if (hatType === 'cowboy') {
        // Kovboy Şapkası
        targetCtx.fillStyle = "#78350f";
        targetCtx.beginPath(); targetCtx.ellipse(pX, pY - 22, 14, 4, 0, 0, Math.PI * 2); targetCtx.fill();
        targetCtx.beginPath(); targetCtx.roundRect(pX - 6, pY - 31, 12, 10, [4, 4, 0, 0]); targetCtx.fill();
        targetCtx.fillStyle = "#f59e0b"; targetCtx.fillRect(pX - 6, pY - 23, 12, 2);
    } else if (hatType === 'hair_long') {
        // Uzun Düz Saç (Omuzlara dökülen)
        targetCtx.fillStyle = "#451a03";
        // Sol ve sağ dökülen saç tutamları
        targetCtx.beginPath();
        targetCtx.moveTo(pX - 9, pY - 20); targetCtx.quadraticCurveTo(pX - 13, pY - 2, pX - 10, pY + 8);
        targetCtx.lineTo(pX - 6, pY + 8); targetCtx.quadraticCurveTo(pX - 7, pY - 2, pX - 5, pY - 14);
        targetCtx.closePath(); targetCtx.fill();

        targetCtx.beginPath();
        targetCtx.moveTo(pX + 9, pY - 20); targetCtx.quadraticCurveTo(pX + 13, pY - 2, pX + 10, pY + 8);
        targetCtx.lineTo(pX + 6, pY + 8); targetCtx.quadraticCurveTo(pX + 7, pY - 2, pX + 5, pY - 14);
        targetCtx.closePath(); targetCtx.fill();
        // Üst kubbe ve kakül
        targetCtx.beginPath(); targetCtx.arc(pX, pY - 19, 10.5, Math.PI * 0.95, Math.PI * 2.05); targetCtx.fill();
        targetCtx.beginPath();
        targetCtx.moveTo(pX - 9, pY - 21); targetCtx.quadraticCurveTo(pX - 2, pY - 17, pX, pY - 22);
        targetCtx.quadraticCurveTo(pX + 3, pY - 17, pX + 9, pY - 21);
        targetCtx.lineTo(pX + 8, pY - 24); targetCtx.lineTo(pX - 8, pY - 24);
        targetCtx.closePath(); targetCtx.fill();
    } else if (hatType === 'hair_wavy') {
        // Dalgalı Saç
        targetCtx.fillStyle = "#78350f";
        // Dalgalı yan bukleler
        targetCtx.beginPath();
        targetCtx.arc(pX - 10, pY - 12, 4, 0, Math.PI * 2);
        targetCtx.arc(pX - 11, pY - 5, 4.5, 0, Math.PI * 2);
        targetCtx.arc(pX - 9, pY + 3, 4, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.beginPath();
        targetCtx.arc(pX + 10, pY - 12, 4, 0, Math.PI * 2);
        targetCtx.arc(pX + 11, pY - 5, 4.5, 0, Math.PI * 2);
        targetCtx.arc(pX + 9, pY + 3, 4, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.beginPath(); targetCtx.arc(pX, pY - 19, 10.5, Math.PI * 0.95, Math.PI * 2.05); targetCtx.fill();
    } else if (hatType === 'hair_ponytail') {
        // At Kuyruğu Saç
        targetCtx.fillStyle = "#292524";
        targetCtx.beginPath(); targetCtx.arc(pX, pY - 19, 10.5, Math.PI * 0.95, Math.PI * 2.05); targetCtx.fill();
        // Saç Tokası
        targetCtx.fillStyle = "#ec4899";
        targetCtx.beginPath(); targetCtx.arc(pX + 8, pY - 25, 3, 0, Math.PI * 2); targetCtx.fill();
        // Sallanan At Kuyruğu
        targetCtx.fillStyle = "#292524";
        targetCtx.beginPath();
        targetCtx.moveTo(pX + 8, pY - 25);
        targetCtx.quadraticCurveTo(pX + 15, pY - 22, pX + 13, pY - 10);
        targetCtx.quadraticCurveTo(pX + 10, pY - 18, pX + 8, pY - 23);
        targetCtx.closePath(); targetCtx.fill();
    } else if (hatType === 'hair_braids') {
        // İki Yandan Örgülü Saç
        targetCtx.fillStyle = "#b45309";
        targetCtx.beginPath(); targetCtx.arc(pX, pY - 19, 10.5, Math.PI * 0.95, Math.PI * 2.05); targetCtx.fill();
        // Sol ve sağ örgüler
        [-1, 1].forEach(side => {
            let bx = pX + side * 10;
            targetCtx.fillStyle = "#b45309";
            targetCtx.beginPath(); targetCtx.arc(bx, pY - 12, 3, 0, Math.PI * 2); targetCtx.fill();
            targetCtx.beginPath(); targetCtx.arc(bx, pY - 7, 2.7, 0, Math.PI * 2); targetCtx.fill();
            targetCtx.beginPath(); targetCtx.arc(bx, pY - 2, 2.4, 0, Math.PI * 2); targetCtx.fill();
            // Uç fiyonk
            targetCtx.fillStyle = "#38bdf8";
            targetCtx.beginPath(); targetCtx.arc(bx, pY + 1, 2, 0, Math.PI * 2); targetCtx.fill();
        });
    } else if (hatType === 'hair_bob') {
        // Küt Kesim Bob Saç
        targetCtx.fillStyle = "#1e1b4b";
        targetCtx.beginPath();
        targetCtx.arc(pX, pY - 19, 11, Math.PI * 0.85, Math.PI * 2.15);
        targetCtx.lineTo(pX + 10, pY - 10);
        targetCtx.lineTo(pX - 10, pY - 10);
        targetCtx.closePath(); targetCtx.fill();
    } else if (hatType === 'hair_hijab') {
        // Şık Başörtüsü
        targetCtx.fillStyle = "#0284c7";
        targetCtx.beginPath(); targetCtx.arc(pX, pY - 19, 11.5, Math.PI * 0.85, Math.PI * 2.15); targetCtx.fill();
        // Omuzlara dökülen örtü
        targetCtx.fillStyle = "#38bdf8";
        targetCtx.beginPath();
        targetCtx.moveTo(pX - 11, pY - 14);
        targetCtx.quadraticCurveTo(pX - 13, pY - 2, pX - 9, pY + 5);
        targetCtx.lineTo(pX + 9, pY + 5);
        targetCtx.quadraticCurveTo(pX + 13, pY - 2, pX + 11, pY - 14);
        targetCtx.closePath(); targetCtx.fill();
    } else if (hatType === 'beret_pink') {
        // Pembe Fransız Bere
        targetCtx.fillStyle = "#f472b6";
        targetCtx.beginPath(); targetCtx.ellipse(pX - 1, pY - 24, 11, 5, -0.2, 0, Math.PI * 2); targetCtx.fill();
        targetCtx.fillStyle = "#facc15";
        targetCtx.beginPath(); targetCtx.arc(pX + 1, pY - 27, 2, 0, Math.PI * 2); targetCtx.fill();
    } else if (hatType === 'crown') {
        // Prenses Altın Tacı
        targetCtx.fillStyle = "#f59e0b";
        targetCtx.beginPath();
        targetCtx.moveTo(pX - 7, pY - 23);
        targetCtx.lineTo(pX - 7, pY - 29);
        targetCtx.lineTo(pX - 3, pY - 25);
        targetCtx.lineTo(pX, pY - 31);
        targetCtx.lineTo(pX + 3, pY - 25);
        targetCtx.lineTo(pX + 7, pY - 29);
        targetCtx.lineTo(pX + 7, pY - 23);
        targetCtx.closePath(); targetCtx.fill();
        // Mücevherler
        targetCtx.fillStyle = "#ef4444"; targetCtx.fillRect(pX - 1, pY - 29, 2, 2);
        targetCtx.fillStyle = "#38bdf8"; targetCtx.fillRect(pX - 6, pY - 27, 1.5, 1.5);
        targetCtx.fillRect(pX + 4.5, pY - 27, 1.5, 1.5);
    } else if (hatType === 'korsan') {
        // Korsan Kaptanı Şapkası (Nostaljik Kaptan Şapkası)
        targetCtx.save();
        // Şapka gövdesi (Tricorn)
        targetCtx.fillStyle = "#0f172a";
        targetCtx.beginPath();
        targetCtx.moveTo(pX - 15, pY - 21);
        targetCtx.quadraticCurveTo(pX - 8, pY - 33, pX, pY - 35);
        targetCtx.quadraticCurveTo(pX + 8, pY - 33, pX + 15, pY - 21);
        targetCtx.quadraticCurveTo(pX, pY - 24, pX - 15, pY - 21);
        targetCtx.closePath();
        targetCtx.fill();

        // Altın kenarlık yaldızı
        targetCtx.strokeStyle = "#f59e0b";
        targetCtx.lineWidth = 1.5;
        targetCtx.stroke();

        // Kuru kafa ve kemik motifi
        targetCtx.fillStyle = "#ffffff";
        targetCtx.beginPath();
        targetCtx.arc(pX, pY - 28, 2.5, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.fillRect(pX - 3.5, pY - 25.5, 7, 1.2);
        targetCtx.restore();
    } else if (hatType === 'sihirbaz') {
        // Sihirbaz Silindiri (Nostaljik Sihirbaz Şapkası)
        targetCtx.save();
        // Geniş Siperlik
        targetCtx.fillStyle = "#09090b";
        targetCtx.beginPath();
        targetCtx.ellipse(pX, pY - 22, 13, 3.8, 0, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.strokeStyle = "#27272a";
        targetCtx.lineWidth = 1;
        targetCtx.stroke();

        // Yüksek Silindir Gövde
        targetCtx.fillStyle = "#18181b";
        targetCtx.beginPath();
        targetCtx.roundRect(pX - 7, pY - 37, 14, 16, [2, 2, 0, 0]);
        targetCtx.fill();

        // Mor Kadife Kurdele
        targetCtx.fillStyle = "#9333ea";
        targetCtx.fillRect(pX - 7, pY - 25, 14, 3);
        // Kurdele tokası
        targetCtx.fillStyle = "#facc15";
        targetCtx.fillRect(pX - 2, pY - 25.5, 4, 4);

        // İnce parıltı efekti
        targetCtx.fillStyle = "rgba(255, 255, 255, 0.4)";
        targetCtx.fillRect(pX - 5, pY - 35, 2, 8);
        targetCtx.restore();
    } else if (hatType === 'kulaklik') {
        // DJ Kulaklığı (Nostaljik DJ Kulaklığı)
        targetCtx.save();
        // Kafa kemeri (Arch band)
        targetCtx.strokeStyle = "#334155";
        targetCtx.lineWidth = 3;
        targetCtx.beginPath();
        targetCtx.arc(pX, pY - 18, 11, Math.PI * 1.05, Math.PI * 1.95);
        targetCtx.stroke();

        // Sol ve Sağ Kulaklık Pedleri (Neon Cyan)
        [-1, 1].forEach(side => {
            let cx = pX + side * 11;
            let cy = pY - 18;
            targetCtx.fillStyle = "#06b6d4";
            targetCtx.beginPath();
            targetCtx.ellipse(cx, cy, 3, 5, 0, 0, Math.PI * 2);
            targetCtx.fill();
            targetCtx.strokeStyle = "#0891b2";
            targetCtx.lineWidth = 1;
            targetCtx.stroke();

            // Kulaklık iç yastığı
            targetCtx.fillStyle = "#0f172a";
            targetCtx.beginPath();
            targetCtx.ellipse(cx + (side * -0.5), cy, 1.8, 3.5, 0, 0, Math.PI * 2);
            targetCtx.fill();
        });
        targetCtx.restore();
    } else {
        // Sade Kısa Saç
        targetCtx.strokeStyle = "#451a03"; targetCtx.lineWidth = 2.5;
        targetCtx.beginPath(); targetCtx.arc(pX, pY - 23, 8, Math.PI * 1.15, Math.PI * 1.85); targetCtx.stroke();
    }
}

function drawAvatarFaceAndEyes(targetCtx, pX, pY, faceType = "none", eyeOffsetX = 0, eyeOffsetY = 0) {
    // Gözler
    targetCtx.fillStyle = "#0f172a";
    targetCtx.fillRect(pX - 4 + eyeOffsetX, pY - 20 + eyeOffsetY, 2.5, 3);
    targetCtx.fillRect(pX + 2 + eyeOffsetX, pY - 20 + eyeOffsetY, 2.5, 3);

    // Yüz Aksesuarları
    if (faceType === 'mustache') {
        targetCtx.fillStyle = "#1e1e1e";
        targetCtx.beginPath();
        targetCtx.moveTo(pX - 6, pY - 14);
        targetCtx.quadraticCurveTo(pX, pY - 12, pX + 6, pY - 14);
        targetCtx.quadraticCurveTo(pX, pY - 16, pX - 6, pY - 14);
        targetCtx.fill();
    } else if (faceType === 'sunglasses') {
        targetCtx.fillStyle = "#0f172a";
        targetCtx.fillRect(pX - 6 + eyeOffsetX, pY - 21 + eyeOffsetY, 5, 4.5);
        targetCtx.fillRect(pX + 1 + eyeOffsetX, pY - 21 + eyeOffsetY, 5, 4.5);
        targetCtx.strokeStyle = "#0f172a";
        targetCtx.lineWidth = 1;
        targetCtx.beginPath();
        targetCtx.moveTo(pX - 1 + eyeOffsetX, pY - 19 + eyeOffsetY);
        targetCtx.lineTo(pX + 1 + eyeOffsetX, pY - 19 + eyeOffsetY);
        targetCtx.stroke();
        targetCtx.fillStyle = "rgba(255,255,255,0.7)";
        targetCtx.fillRect(pX - 5 + eyeOffsetX, pY - 20 + eyeOffsetY, 1.5, 1.5);
        targetCtx.fillRect(pX + 2 + eyeOffsetX, pY - 20 + eyeOffsetY, 1.5, 1.5);
    } else if (faceType === 'beard') {
        targetCtx.fillStyle = "rgba(30, 20, 10, 0.45)";
        targetCtx.beginPath();
        targetCtx.arc(pX, pY - 16, 7.5, 0, Math.PI);
        targetCtx.fill();
    }
}

function avatarPreviewLoop() {
    if (!isWardrobeOpen) return;
    drawAvatarPreview();
    requestAnimationFrame(avatarPreviewLoop);
}

function drawAvatarPreview() {
    const previewCanvas = document.getElementById('avatarPreviewCanvas');
    if (!previewCanvas) return;
    const pCtx = previewCanvas.getContext('2d');
    pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    let cX = previewCanvas.width / 2;
    let cY = 138;

    // 1. Işıltılı Yuvarlak Podyum
    pCtx.fillStyle = "rgba(56, 189, 248, 0.12)";
    pCtx.beginPath();
    pCtx.ellipse(cX, cY + 20, 52, 16, 0, 0, Math.PI * 2);
    pCtx.fill();
    pCtx.strokeStyle = "rgba(56, 189, 248, 0.4)";
    pCtx.lineWidth = 1.5;
    pCtx.stroke();

    pCtx.fillStyle = "rgba(56, 189, 248, 0.25)";
    pCtx.beginPath();
    pCtx.ellipse(cX, cY + 20, 34, 10, 0, 0, Math.PI * 2);
    pCtx.fill();

    // 2. Karakter (Nefes Alma Canlı Salınımı)
    let idleBob = Math.sin(Date.now() / 260) * 2.5;

    pCtx.save();
    pCtx.translate(cX, cY + idleBob);
    pCtx.scale(1.9, 1.9);

    // Zemin Gölgesi
    pCtx.fillStyle = "rgba(0, 0, 0, 0.35)";
    pCtx.beginPath();
    pCtx.ellipse(0, 22, 12, 5, 0, 0, Math.PI * 2);
    pCtx.fill();

    let activeAv = (isWardrobeOpen && previewAvatar) ? previewAvatar : myAvatar;
    let isDressOrSkirt = (activeAv.color && (activeAv.color.startsWith('dress_') || activeAv.color.startsWith('skirt_')));

    // Bacaklar & Ayakkabılar
    drawAvatarLegsAndShoes(pCtx, 0, 0, 0, activeAv.skinColor, activeAv.shoes, isDressOrSkirt);

    // Gövde & Kıyafet
    drawAvatarBodyAndClothes(pCtx, 0, 0, activeAv.color, activeAv.skinColor);

    // Kafa (Ten Rengi)
    pCtx.fillStyle = activeAv.skinColor || "#ffd1a4";
    pCtx.beginPath();
    pCtx.arc(0, -18, 10, 0, Math.PI * 2);
    pCtx.fill();
    pCtx.strokeStyle = "rgba(0,0,0,0.2)";
    pCtx.lineWidth = 1.2;
    pCtx.stroke();

    // Şapkalar / Saç Modelleri
    drawAvatarHairAndHats(pCtx, 0, 0, activeAv.hat || 'none', 'down');

    // Gözler ve Yüz Aksesuarları
    drawAvatarFaceAndEyes(pCtx, 0, 0, activeAv.face || 'none', 0, 0);

    // Elde Taşınan Eşya (Preview Canlı Çizim)
    drawHeldItem(pCtx, 0, 0, activeAv.heldItem, true);

    pCtx.restore();
}

function drawHeldItem(targetCtx, pX, pY, heldItem, isPreview = false, facing = 'down') {
    if (!heldItem || heldItem === 'none') return;

    targetCtx.save();
    let handX = pX + (isPreview ? 12 : 11);
    let handY = pY + (isPreview ? 2 : 2);

    if (heldItem === 'tespih') {
        // Kehribar Tespih (Sallanan boncuklar ve püskül)
        let swing = Math.sin(Date.now() / 170) * 0.45;
        targetCtx.translate(handX, handY);
        targetCtx.rotate(swing);

        // Boncuk dizisi (halka)
        targetCtx.strokeStyle = "#b45309";
        targetCtx.lineWidth = 1;
        targetCtx.fillStyle = "#f59e0b";

        let beadRadius = isPreview ? 2.2 : 1.8;
        let ringR = isPreview ? 6.5 : 5.5;
        for (let i = 0; i < 9; i++) {
            let angle = (i * 2 * Math.PI) / 9;
            let bx = Math.cos(angle) * ringR;
            let by = Math.sin(angle) * ringR + (isPreview ? 7 : 6);
            targetCtx.beginPath();
            targetCtx.arc(bx, by, beadRadius, 0, Math.PI * 2);
            targetCtx.fill();
            targetCtx.stroke();
        }

        // Gümüş İmame ve Püskül
        targetCtx.strokeStyle = "#94a3b8";
        targetCtx.lineWidth = 1.5;
        targetCtx.beginPath();
        targetCtx.moveTo(0, ringR + (isPreview ? 7 : 6) + beadRadius);
        targetCtx.lineTo(0, ringR + (isPreview ? 15 : 13));
        targetCtx.stroke();
        targetCtx.fillStyle = "#cbd5e1";
        targetCtx.beginPath();
        targetCtx.arc(0, ringR + (isPreview ? 16 : 14), 1.8, 0, Math.PI * 2);
        targetCtx.fill();
    }
    else if (heldItem === 'balon') {
        // Uçan Kırmızı Balon (İple bağlı, havada salınan)
        let balloonSway = Math.sin(Date.now() / 320) * 4;
        let stringEndX = handX + balloonSway;
        let stringEndY = handY - (isPreview ? 36 : 30);

        // Beyaz Balon İpi
        targetCtx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        targetCtx.lineWidth = 1;
        targetCtx.beginPath();
        targetCtx.moveTo(handX, handY);
        targetCtx.quadraticCurveTo(handX + balloonSway * 0.5, handY - 15, stringEndX, stringEndY);
        targetCtx.stroke();

        // Kırmızı Balon Gövdesi
        let bW = isPreview ? 9 : 8;
        let bH = isPreview ? 12 : 10;
        targetCtx.fillStyle = "#ef4444";
        targetCtx.beginPath();
        targetCtx.ellipse(stringEndX, stringEndY - bH, bW, bH, 0, 0, Math.PI * 2);
        targetCtx.fill();

        // Balon Düğümü
        targetCtx.fillStyle = "#b91c1c";
        targetCtx.beginPath();
        targetCtx.moveTo(stringEndX - 2, stringEndY);
        targetCtx.lineTo(stringEndX + 2, stringEndY);
        targetCtx.lineTo(stringEndX, stringEndY - 2);
        targetCtx.closePath();
        targetCtx.fill();

        // Balon Parlaması
        targetCtx.fillStyle = "rgba(255, 255, 255, 0.65)";
        targetCtx.beginPath();
        targetCtx.ellipse(stringEndX - bW * 0.35, stringEndY - bH * 1.35, bW * 0.3, bH * 0.35, -0.2, 0, Math.PI * 2);
        targetCtx.fill();
    }
    else if (heldItem === 'cay') {
        // İnce Belli Çay Bardağı
        let teaX = handX, teaY = handY;
        targetCtx.fillStyle = "#f59e0b";
        targetCtx.fillRect(teaX - 4, teaY + 7, 8, 2);
        targetCtx.fillStyle = "rgba(255,255,255,0.7)";
        targetCtx.fillRect(teaX - 3, teaY - 3, 6, 9);
        targetCtx.fillStyle = "#b91c1c";
        targetCtx.fillRect(teaX - 2, teaY, 4, 6);
        let steamY = teaY - 6 - ((Date.now() / 40) % 8);
        targetCtx.strokeStyle = "rgba(255,255,255,0.6)";
        targetCtx.lineWidth = 1;
        targetCtx.beginPath();
        targetCtx.moveTo(teaX - 1, steamY + 4);
        targetCtx.quadraticCurveTo(teaX + 2, steamY + 2, teaX, steamY);
        targetCtx.stroke();
    }
    else if (heldItem === 'olta') {
        // Balıkçı Oltası
        targetCtx.save();
        targetCtx.translate(handX, handY);
        targetCtx.rotate(-0.55);
        targetCtx.fillStyle = "#d97706";
        targetCtx.fillRect(-2, -2, 4, 10);
        targetCtx.fillStyle = "#64748b";
        targetCtx.fillRect(-3, 3, 6, 4);
        targetCtx.strokeStyle = "#1e293b";
        targetCtx.lineWidth = 2;
        targetCtx.beginPath();
        targetCtx.moveTo(0, -2);
        targetCtx.lineTo(0, isPreview ? -36 : -30);
        targetCtx.stroke();
        targetCtx.strokeStyle = "rgba(255, 255, 255, 0.7)";
        targetCtx.lineWidth = 1;
        targetCtx.beginPath();
        targetCtx.moveTo(0, isPreview ? -36 : -30);
        targetCtx.lineTo(isPreview ? 6 : 5, isPreview ? -10 : -8);
        targetCtx.stroke();
        targetCtx.restore();
    }
    else if (heldItem === 'gazoz') {
        // Nostaljik Yeşil Cam Gazoz Şişesi
        let gX = handX, gY = handY;
        targetCtx.fillStyle = "#16a34a";
        targetCtx.beginPath();
        targetCtx.roundRect(gX - 2.5, gY - 1, 5, 10, 2);
        targetCtx.fill();
        targetCtx.fillStyle = "#15803d";
        targetCtx.fillRect(gX - 1.5, gY - 6, 3, 5);
        targetCtx.fillStyle = "#facc15";
        targetCtx.fillRect(gX - 2, gY - 7.5, 4, 1.5);
        targetCtx.fillStyle = "#ffffff";
        targetCtx.fillRect(gX - 2, gY + 2, 4, 4);
    }
    else if (heldItem === 'nargile') {
        // Geleneksel Dumanlı Nargile (Büyük boy, köz ve yükselen duman animasyonu)
        let now = Date.now();
        let nX = handX + (isPreview ? 8 : 7);
        let nY = handY + (isPreview ? 12 : 10);

        // 1. Şeffaf Cam Şişe / Gövde (Altta, geniş yuvarlak hazne)
        let vaseR = isPreview ? 8.5 : 7;
        targetCtx.fillStyle = "rgba(14, 165, 233, 0.45)"; // Mavi su
        targetCtx.beginPath();
        targetCtx.arc(nX, nY, vaseR, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        targetCtx.lineWidth = 1.2;
        targetCtx.stroke();

        // Cam Parlaması
        targetCtx.fillStyle = "rgba(255, 255, 255, 0.7)";
        targetCtx.beginPath();
        targetCtx.arc(nX - vaseR * 0.4, nY - vaseR * 0.3, vaseR * 0.35, 0, Math.PI * 2);
        targetCtx.fill();

        // Su içindeki minik hava kabarcıkları
        let bubAnim = (now / 180) % (vaseR * 1.5);
        targetCtx.fillStyle = "rgba(255, 255, 255, 0.8)";
        targetCtx.beginPath();
        targetCtx.arc(nX + 1, nY + vaseR * 0.6 - bubAnim, 1.2, 0, Math.PI * 2);
        targetCtx.fill();

        // 2. Pirinç Metal Ser (Gövde borusu)
        let stemTopY = nY - (isPreview ? 24 : 20);
        targetCtx.strokeStyle = "#eab308"; // Parlak pirinç sarısı
        targetCtx.lineWidth = isPreview ? 3 : 2.5;
        targetCtx.beginPath();
        targetCtx.moveTo(nX, nY - vaseR);
        targetCtx.lineTo(nX, stemTopY);
        targetCtx.stroke();

        // Ser süs halkası
        targetCtx.fillStyle = "#b45309";
        targetCtx.beginPath();
        targetCtx.arc(nX, nY - vaseR - (isPreview ? 6 : 5), isPreview ? 3 : 2.5, 0, Math.PI * 2);
        targetCtx.fill();

        // 3. Kül Tepsisi (Geniş altın tepsi)
        targetCtx.fillStyle = "#ca8a04";
        targetCtx.beginPath();
        targetCtx.ellipse(nX, stemTopY, isPreview ? 8.5 : 7, isPreview ? 2.8 : 2.2, 0, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.strokeStyle = "#78350f";
        targetCtx.lineWidth = 1;
        targetCtx.stroke();

        // 4. Lüle (Toprak Başlık) ve Yanan Közler
        let headH = isPreview ? 6.5 : 5.5;
        targetCtx.fillStyle = "#9a3412";
        targetCtx.fillRect(nX - (isPreview ? 4 : 3.5), stemTopY - headH, isPreview ? 8 : 7, headH);

        // Kırmızı akkor yanan közler (hafif parıldayan)
        let coalGlow = Math.sin(now / 150) * 0.25 + 0.75;
        targetCtx.fillStyle = `rgba(239, 68, 68, ${coalGlow})`;
        targetCtx.beginPath();
        targetCtx.arc(nX - 2, stemTopY - headH - 1, 2, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.fillStyle = `rgba(245, 158, 11, ${coalGlow})`;
        targetCtx.beginPath();
        targetCtx.arc(nX + 2, stemTopY - headH - 1.5, 1.8, 0, Math.PI * 2);
        targetCtx.fill();

        // 5. Marpuç (Şişeden ele uzanan kıvrımlı hortum)
        targetCtx.strokeStyle = "#991b1b"; // Bordo kadife marpuç
        targetCtx.lineWidth = isPreview ? 2.2 : 1.8;
        targetCtx.beginPath();
        targetCtx.moveTo(nX - vaseR * 0.6, nY - 2);
        targetCtx.quadraticCurveTo(nX - (isPreview ? 12 : 9), nY + 4, handX, handY);
        targetCtx.stroke();

        // Ele oturan ahşap ağızlık (Sipte)
        targetCtx.fillStyle = "#facc15";
        targetCtx.beginPath();
        targetCtx.arc(handX, handY, isPreview ? 3 : 2.5, 0, Math.PI * 2);
        targetCtx.fill();

        // 6. DUMAN ANİMASYONU (Lüleden ve ağızlıktan yükselen duman bulutları)
        for (let i = 0; i < 4; i++) {
            let cycle = ((now / (650 + i * 160)) + (i * 0.25)) % 1;
            let smX = nX + Math.sin((now / 260) + i * 1.5) * (3 + cycle * 6);
            let smY = (stemTopY - headH - 3) - (cycle * (isPreview ? 28 : 22));
            let smR = (isPreview ? 2.5 : 2) + cycle * (isPreview ? 7 : 5.5);
            let smA = Math.sin(cycle * Math.PI) * 0.42;
            targetCtx.fillStyle = `rgba(241, 245, 249, ${smA})`;
            targetCtx.beginPath();
            targetCtx.arc(smX, smY, smR, 0, Math.PI * 2);
            targetCtx.fill();
        }

        // Ağızlıktan tüten ikinci hafif duman
        let mouthCycle = (now / 1200) % 1;
        if (mouthCycle < 0.7) {
            let mP = mouthCycle / 0.7;
            let mX = handX + mP * (isPreview ? 7 : 5);
            let mY = handY - 2 - mP * (isPreview ? 10 : 8);
            let mA = (1 - mP) * 0.35;
            targetCtx.fillStyle = `rgba(241, 245, 249, ${mA})`;
            targetCtx.beginPath();
            targetCtx.arc(mX, mY, 1.8 + mP * 3, 0, Math.PI * 2);
            targetCtx.fill();
        }
    }
    else if (heldItem === 'baglama') {
        // Anadolu Bağlaması / Saz
        targetCtx.save();
        targetCtx.translate(handX, handY);
        targetCtx.rotate(0.35);

        // Armut Gövde (Tekne)
        let bodyW = isPreview ? 10 : 8.5;
        let bodyH = isPreview ? 14 : 12;
        targetCtx.fillStyle = "#b45309";
        targetCtx.beginPath();
        targetCtx.ellipse(0, 4, bodyW, bodyH, 0, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.strokeStyle = "#78350f";
        targetCtx.lineWidth = 1;
        targetCtx.stroke();

        // Ses Deliği
        targetCtx.fillStyle = "#451a03";
        targetCtx.beginPath();
        targetCtx.arc(0, 4, isPreview ? 3 : 2.5, 0, Math.PI * 2);
        targetCtx.fill();

        // Uzun Sap
        let neckH = isPreview ? 30 : 25;
        targetCtx.strokeStyle = "#78350f";
        targetCtx.lineWidth = isPreview ? 3.5 : 2.8;
        targetCtx.beginPath();
        targetCtx.moveTo(0, -bodyH + 6);
        targetCtx.lineTo(0, -neckH);
        targetCtx.stroke();

        // Burgular (Kulaklar)
        targetCtx.fillStyle = "#f8fafc";
        targetCtx.fillRect(-3, -neckH - 4, 6, 4);
        targetCtx.fillStyle = "#1e293b";
        targetCtx.fillRect(-5, -neckH - 3, 2, 2);
        targetCtx.fillRect(3, -neckH - 3, 2, 2);

        // Teller
        targetCtx.strokeStyle = "rgba(255,255,255,0.75)";
        targetCtx.lineWidth = 0.8;
        targetCtx.beginPath();
        targetCtx.moveTo(-1, 8);
        targetCtx.lineTo(-1, -neckH);
        targetCtx.moveTo(1, 8);
        targetCtx.lineTo(1, -neckH);
        targetCtx.stroke();

        targetCtx.restore();
    }
    else if (heldItem === 'asagold') {
        // Yıldızlı Büyü Asası (Parıldayan mücevher ve sihir kıvılcımları)
        let now = Date.now();
        targetCtx.save();
        targetCtx.translate(handX, handY);
        targetCtx.rotate(-0.25);

        let staffH = isPreview ? 32 : 27;

        // Parlak Altın Asa Gövdesi
        targetCtx.strokeStyle = "#d97706";
        targetCtx.lineWidth = isPreview ? 3.5 : 2.8;
        targetCtx.beginPath();
        targetCtx.moveTo(0, 6);
        targetCtx.lineTo(0, -staffH);
        targetCtx.stroke();

        // Asa Başı (Yıldız / Mücevher)
        let starGlow = Math.sin(now / 140) * 0.2 + 0.8;
        targetCtx.fillStyle = `rgba(56, 189, 248, ${starGlow})`;
        targetCtx.beginPath();
        targetCtx.arc(0, -staffH, isPreview ? 6.5 : 5.5, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.fillStyle = "#ffffff";
        targetCtx.beginPath();
        targetCtx.arc(0, -staffH, isPreview ? 3 : 2.5, 0, Math.PI * 2);
        targetCtx.fill();

        // Dönen Büyülü Kıvılcımlar
        for (let s = 0; s < 3; s++) {
            let sAngle = (now / 200) + (s * (Math.PI * 2 / 3));
            let sDist = isPreview ? 9 : 7.5;
            let spX = Math.cos(sAngle) * sDist;
            let spY = -staffH + Math.sin(sAngle) * sDist;
            targetCtx.fillStyle = "#facc15";
            targetCtx.beginPath();
            targetCtx.arc(spX, spY, 1.4, 0, Math.PI * 2);
            targetCtx.fill();
        }

        targetCtx.restore();
    }
    else if (heldItem === 'kahve') {
        // Közde Türk Kahvesi (Otantik porselen fincan ve duman)
        let kX = handX, kY = handY;

        // Altın Tabak
        targetCtx.fillStyle = "#ca8a04";
        targetCtx.beginPath();
        targetCtx.ellipse(kX, kY + 6, isPreview ? 7.5 : 6.5, 2, 0, 0, Math.PI * 2);
        targetCtx.fill();

        // Beyaz Fincan
        targetCtx.fillStyle = "#ffffff";
        targetCtx.beginPath();
        targetCtx.roundRect(kX - (isPreview ? 4.5 : 3.5), kY - 2, isPreview ? 9 : 7, isPreview ? 7.5 : 6, 2);
        targetCtx.fill();
        targetCtx.strokeStyle = "#d97706";
        targetCtx.lineWidth = 1;
        targetCtx.stroke();

        // Koyu Kahve Köpüğü
        targetCtx.fillStyle = "#451a03";
        targetCtx.fillRect(kX - (isPreview ? 3.5 : 2.8), kY - 1, isPreview ? 7 : 5.6, 2);

        // Fincan Kulpu
        targetCtx.strokeStyle = "#ca8a04";
        targetCtx.lineWidth = 1.2;
        targetCtx.beginPath();
        targetCtx.arc(kX + (isPreview ? 5 : 4), kY + 1.5, 2.2, -Math.PI * 0.5, Math.PI * 0.5);
        targetCtx.stroke();

        // Yükselen Kahve Buharı
        let steamY = kY - 4 - ((Date.now() / 40) % 8);
        targetCtx.strokeStyle = "rgba(255,255,255,0.6)";
        targetCtx.lineWidth = 1;
        targetCtx.beginPath();
        targetCtx.moveTo(kX - 1, steamY + 4);
        targetCtx.quadraticCurveTo(kX + 2, steamY + 2, kX, steamY);
        targetCtx.stroke();
    }
    else if (heldItem === 'kupa') {
        // Şampiyonluk Altın Kupası (İki kulplu ve kaideli)
        let tX = handX, tY = handY;

        // Kaide (Mermer Taban)
        targetCtx.fillStyle = "#1e293b";
        targetCtx.fillRect(tX - (isPreview ? 5 : 4), tY + 6, isPreview ? 10 : 8, isPreview ? 3 : 2.5);

        // Kupa Ayağı
        targetCtx.fillStyle = "#eab308";
        targetCtx.fillRect(tX - 1.5, tY + 2, 3, 4);

        // Kupa Kasesi
        let cupW = isPreview ? 7 : 6;
        let cupH = isPreview ? 9 : 7.5;
        targetCtx.fillStyle = "#facc15";
        targetCtx.beginPath();
        targetCtx.moveTo(tX - cupW, tY - cupH);
        targetCtx.lineTo(tX + cupW, tY - cupH);
        targetCtx.lineTo(tX + cupW * 0.5, tY + 2);
        targetCtx.lineTo(tX - cupW * 0.5, tY + 2);
        targetCtx.closePath();
        targetCtx.fill();
        targetCtx.strokeStyle = "#b45309";
        targetCtx.lineWidth = 1;
        targetCtx.stroke();

        // İki Kulp
        targetCtx.strokeStyle = "#ca8a04";
        targetCtx.lineWidth = 1.5;
        targetCtx.beginPath();
        targetCtx.arc(tX - cupW - 1.5, tY - cupH * 0.5, 3, Math.PI * 0.5, Math.PI * 1.5);
        targetCtx.stroke();
        targetCtx.beginPath();
        targetCtx.arc(tX + cupW + 1.5, tY - cupH * 0.5, 3, -Math.PI * 0.5, Math.PI * 0.5);
        targetCtx.stroke();

        // Altın Parıltısı
        targetCtx.fillStyle = "rgba(255, 255, 255, 0.75)";
        targetCtx.beginPath();
        targetCtx.arc(tX - 2, tY - cupH * 0.6, 1.5, 0, Math.PI * 2);
        targetCtx.fill();
    }
    else if (heldItem === 'gitar') {
        // Nostaljik Akustik Gitar (Askılı ve Telleri Olan)
        targetCtx.save();
        targetCtx.translate(handX, handY);
        let gRot = (facing === 'left') ? -0.45 : 0.45;
        targetCtx.rotate(gRot);

        // Gitar Gövdesi (Figure-8 ahşap akustik gövde)
        let scale = isPreview ? 1.15 : 1.0;
        targetCtx.fillStyle = "#b45309"; // Sıcak maun / kestane
        targetCtx.beginPath();
        targetCtx.ellipse(0, 8 * scale, 9 * scale, 11 * scale, 0, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.beginPath();
        targetCtx.ellipse(0, 0, 7 * scale, 7 * scale, 0, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.strokeStyle = "#78350f";
        targetCtx.lineWidth = 1.2;
        targetCtx.stroke();

        // Ses Deliği & Rozet
        targetCtx.fillStyle = "#1e1b4b";
        targetCtx.beginPath();
        targetCtx.arc(0, 3 * scale, 3 * scale, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.strokeStyle = "#fde047";
        targetCtx.lineWidth = 0.8;
        targetCtx.stroke();

        // Gitar Sapı
        targetCtx.fillStyle = "#78350f";
        targetCtx.fillRect(-2 * scale, -22 * scale, 4 * scale, 22 * scale);

        // Kafa ve Burgular
        targetCtx.fillStyle = "#b45309";
        targetCtx.fillRect(-3 * scale, -27 * scale, 6 * scale, 6 * scale);
        targetCtx.fillStyle = "#ffffff";
        targetCtx.fillRect(-4 * scale, -26 * scale, 1.5 * scale, 1.5 * scale);
        targetCtx.fillRect(2.5 * scale, -26 * scale, 1.5 * scale, 1.5 * scale);
        targetCtx.fillRect(-4 * scale, -23 * scale, 1.5 * scale, 1.5 * scale);
        targetCtx.fillRect(2.5 * scale, -23 * scale, 1.5 * scale, 1.5 * scale);

        // Teller (İnce beyaz)
        targetCtx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        targetCtx.lineWidth = 0.7;
        targetCtx.beginPath();
        targetCtx.moveTo(-1, 10 * scale);
        targetCtx.lineTo(-1, -24 * scale);
        targetCtx.moveTo(1, 10 * scale);
        targetCtx.lineTo(1, -24 * scale);
        targetCtx.stroke();

        // Omuz Askısı (Deri Kayış)
        targetCtx.strokeStyle = "rgba(120, 53, 15, 0.7)";
        targetCtx.lineWidth = 1.8;
        targetCtx.beginPath();
        targetCtx.moveTo(0, -18 * scale);
        targetCtx.quadraticCurveTo(-14 * scale, 0, 0, 14 * scale);
        targetCtx.stroke();

        targetCtx.restore();
    }
    else if (heldItem === 'sirtcantasi') {
        // Gezgin Sırt Çantası (Nostaljik Gezgin Çantası)
        targetCtx.save();
        let bpX = isPreview ? handX : (pX - 7);
        let bpY = isPreview ? handY : (pY - 4);
        let scale = isPreview ? 1.1 : 0.95;

        // Çanta Ana Gövdesi (Haki / Taba rengi kanvas)
        targetCtx.fillStyle = "#854d0e";
        targetCtx.beginPath();
        targetCtx.roundRect(bpX - 7 * scale, bpY - 8 * scale, 14 * scale, 18 * scale, 4);
        targetCtx.fill();
        targetCtx.strokeStyle = "#532e08";
        targetCtx.lineWidth = 1.2;
        targetCtx.stroke();

        // Üst Kapak (Flap)
        targetCtx.fillStyle = "#a16207";
        targetCtx.beginPath();
        targetCtx.roundRect(bpX - 7.5 * scale, bpY - 9 * scale, 15 * scale, 8 * scale, [4, 4, 1, 1]);
        targetCtx.fill();

        // Deri Kemerler ve Metal Tokalar
        [-3 * scale, 3 * scale].forEach(sx => {
            targetCtx.fillStyle = "#451a03";
            targetCtx.fillRect(bpX + sx - 1, bpY - 9 * scale, 2, 14 * scale);
            targetCtx.fillStyle = "#facc15";
            targetCtx.fillRect(bpX + sx - 1.5, bpY - 2 * scale, 3, 2.5);
        });

        // Ön Cep
        targetCtx.fillStyle = "#713f12";
        targetCtx.beginPath();
        targetCtx.roundRect(bpX - 5 * scale, bpY + 2 * scale, 10 * scale, 7 * scale, 2);
        targetCtx.fill();

        // Taşıma Kulpu
        targetCtx.strokeStyle = "#451a03";
        targetCtx.lineWidth = 1.5;
        targetCtx.beginPath();
        targetCtx.arc(bpX, bpY - 9 * scale, 3 * scale, Math.PI, 0);
        targetCtx.stroke();

        targetCtx.restore();
    }

    targetCtx.restore();
}


function drawAnimatedPlayer(p, id) {
    let isSitting = (p.action === 'sitting');
    let playerWalkCycle = (id === myId) ? walkCycle : (p.walkCycle || 0);
    let isMoving = (id === myId) ? (keys.w || keys.a || keys.s || keys.d) : !!p.isMoving;
    if (isSitting) isMoving = false;
    let bob = (isMoving && !isSitting) ? Math.sin(playerWalkCycle) * 2.5 : 0;
    let legSwing = (isMoving && !isSitting) ? Math.sin(playerWalkCycle) * 5 : 0;

    let pX = p.x;
    let pY = p.y + (isSitting ? 7 : bob);

    // Dans efekti (Gövde sağa-sola sallanır)
    let isDancing = (p.action === 'dance');
    let danceTilt = isDancing ? Math.sin(Date.now() / 140) * 0.15 : 0;

    ctx.save();
    if (isDancing) {
        ctx.translate(pX, pY);
        ctx.rotate(danceTilt);
        ctx.translate(-pX, -pY);
    }

    // 1. Yumuşak Zemin Gölgesi (Otururken koltuk/minderle bütünleşen geniş gölge)
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(pX, p.y + (isSitting ? 16 : 22), isSitting ? 14 : 12, isSitting ? 5.5 : 5, 0, 0, Math.PI * 2);
    ctx.fill();

    let isDressOrSkirt = (p.color && (p.color.startsWith('dress_') || p.color.startsWith('skirt_')));
    let facing = (id === myId) ? myFacing : (p.facing || 'down');

    // 2. Bacaklar & Ayakkabılar (Yürüme Salınımı ya da Oturma Pozisyonu)
    drawAvatarLegsAndShoes(ctx, pX, pY, legSwing, p.skinColor, p.shoes, isDressOrSkirt, isSitting, facing);

    // 3. Gövde & Kıyafet
    drawAvatarBodyAndClothes(ctx, pX, pY, p.color, p.skinColor);

    // 3.1 Oturmaya Özel Kollar ve Eller (Kucakta ve kolçakta dinlenen doğal kollar)
    let skin = p.skinColor || "#ffd1a4";
    if (isSitting) {
        ctx.save();
        let sleeveColor = p.color && p.color.startsWith('#') ? p.color : "#3b82f6";
        if (p.color && (p.color.startsWith('dress_') || p.color.startsWith('skirt_') || p.color === 'polo' || p.color === 'hoodie' || p.color === 'leather')) {
            if (p.color === 'dress_pink') sleeveColor = "#f472b6";
            else if (p.color === 'dress_black') sleeveColor = "#18181b";
            else if (p.color === 'dress_red') sleeveColor = "#e11d48";
            else if (p.color === 'skirt_crop') sleeveColor = skin;
            else if (p.color === 'skirt_denim') sleeveColor = "#f1f5f9";
            else if (p.color === 'polo') sleeveColor = "#f8fafc";
            else if (p.color === 'hoodie') sleeveColor = "#6366f1";
            else if (p.color === 'leather') sleeveColor = "#18181b";
        }

        if (facing === 'right') {
            ctx.fillStyle = sleeveColor;
            ctx.beginPath();
            ctx.roundRect(pX - 2, pY - 2, 11, 5, 2.5);
            ctx.fill();
            ctx.fillStyle = skin;
            ctx.beginPath();
            ctx.arc(pX + 9, pY, 2.5, 0, Math.PI * 2);
            ctx.fill();
        } else if (facing === 'left') {
            ctx.fillStyle = sleeveColor;
            ctx.beginPath();
            ctx.roundRect(pX - 9, pY - 2, 11, 5, 2.5);
            ctx.fill();
            ctx.fillStyle = skin;
            ctx.beginPath();
            ctx.arc(pX - 9, pY, 2.5, 0, Math.PI * 2);
            ctx.fill();
        } else if (facing === 'up') {
            ctx.fillStyle = sleeveColor;
            ctx.fillRect(pX - 11, pY - 2, 4, 8);
            ctx.fillRect(pX + 7, pY - 2, 4, 8);
            ctx.fillStyle = skin;
            ctx.beginPath(); ctx.arc(pX - 9, pY + 7, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(pX + 9, pY + 7, 2, 0, Math.PI * 2); ctx.fill();
        } else {
            // Öne dönük (facing === 'down')
            // Sol kol ve el (Çapraz atılmış dizin üstüne rahatça uzanır)
            ctx.fillStyle = sleeveColor;
            ctx.beginPath();
            ctx.moveTo(pX - 10, pY - 4);
            ctx.lineTo(pX - 4, pY + 6);
            ctx.lineTo(pX - 7, pY + 9);
            ctx.lineTo(pX - 12, pY - 2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = "rgba(0,0,0,0.15)";
            ctx.lineWidth = 0.8;
            ctx.stroke();

            // Sol el
            ctx.fillStyle = skin;
            ctx.beginPath();
            ctx.arc(pX - 5, pY + 8, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Sağ kol ve el (Koltuk kolçağı veya yan bacak üzerinde dinlenen)
            ctx.fillStyle = sleeveColor;
            ctx.beginPath();
            ctx.moveTo(pX + 10, pY - 4);
            ctx.lineTo(pX + 6, pY + 6);
            ctx.lineTo(pX + 3, pY + 5);
            ctx.lineTo(pX + 8, pY - 3);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = "rgba(0,0,0,0.15)";
            ctx.lineWidth = 0.8;
            ctx.stroke();

            // Sağ el
            ctx.fillStyle = skin;
            ctx.beginPath();
            ctx.arc(pX + 5, pY + 7, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // 4. Kafa (Özelleştirilebilir Ten Rengi)
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(pX, pY - 18, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 5. Şapkalar & Saç Modelleri
    drawAvatarHairAndHats(ctx, pX, pY, p.hat || 'none', facing);

    // 6. Gözler ve Yüz Aksesuarları
    let eyeOffsetX = 0, eyeOffsetY = 0;
    if (facing === 'left') eyeOffsetX = -3;
    else if (facing === 'right') eyeOffsetX = 3;
    else if (facing === 'up') eyeOffsetY = -2;
    else eyeOffsetY = 1;
    drawAvatarFaceAndEyes(ctx, pX, pY, p.face || 'none', eyeOffsetX, eyeOffsetY);

    // 7. Sosyal Aksesuarlar & Elde Taşınan Eşyalar (Balık Tutma, Tespih, Balon, Çay, Olta, Gazoz)
    if (p.isFishing) {
        // Balık tutma animasyonu (Misina, esneyen olta, kırmızı şamandıra ve su halkaları)
        ctx.save();
        let fishHandX = pX + 10;
        let fishHandY = pY + 2;
        let rodBend = Math.sin(Date.now() / 240) * 2;
        let tipX = fishHandX + 26;
        let tipY = fishHandY - 18 + rodBend;

        // Karbon Kamış Gövdesi
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(fishHandX, fishHandY);
        ctx.quadraticCurveTo(fishHandX + 13, fishHandY - 14, tipX, tipY);
        ctx.stroke();

        // Makara & Kol
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath(); ctx.arc(fishHandX + 4, fishHandY, 3, 0, Math.PI * 2); ctx.fill();

        // Misina
        let floatTargetX = tipX + 16;
        let floatTargetY = tipY + 40;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(floatTargetX, floatTargetY);
        ctx.stroke();

        // Kırmızı-Beyaz Şamandıra (Bobber)
        let bobberAnim = Math.sin(Date.now() / 180) * 2;
        ctx.fillStyle = "#ef4444";
        ctx.beginPath(); ctx.arc(floatTargetX, floatTargetY + bobberAnim, 3.5, Math.PI, 0); ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(floatTargetX, floatTargetY + bobberAnim, 3.5, 0, Math.PI); ctx.fill();

        // Su Halka Animasyonu (Dalgalanma)
        let rippleR = ((Date.now() / 35) % 14) + 2;
        let rippleAlpha = 1 - (rippleR / 16);
        ctx.strokeStyle = `rgba(255, 255, 255, ${rippleAlpha * 0.7})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(floatTargetX, floatTargetY + 3, rippleR, rippleR * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    } else {
        let activeHeld = p.heldItem || (p.hasTea ? 'cay' : 'none');
        drawHeldItem(ctx, pX, pY, activeHeld, false, facing);
    }

    // 8. El Sallama Animasyonu
    if (p.action === 'wave') {
        let waveArmAngle = Math.sin(Date.now() / 90) * 0.4 - 0.7;
        ctx.save();
        ctx.translate(pX + 10, pY - 5);
        ctx.rotate(waveArmAngle);
        ctx.fillStyle = p.color;
        ctx.fillRect(0, -12, 4, 12);
        ctx.fillStyle = "#facc15";
        ctx.beginPath(); ctx.arc(2, -14, 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    // 9. Alkış Animasyonu
    if (p.action === 'clap') {
        let clapOffset = Math.abs(Math.sin(Date.now() / 80)) * 4;
        ctx.fillStyle = "#facc15";
        ctx.beginPath(); ctx.arc(pX - 4 + clapOffset, pY + 2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(pX + 4 - clapOffset, pY + 2, 3, 0, Math.PI * 2); ctx.fill();
        // Kıvılcım
        ctx.fillStyle = "#facc15";
        ctx.font = "10px sans-serif";
        ctx.fillText("✨", pX + 8, pY);
    }

    // 10. Dans Eden Nota Simgeleri
    if (isDancing) {
        let noteY = pY - 38 - ((Date.now() / 50) % 12);
        ctx.fillStyle = "#ec4899";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText("♪ ♫", pX + 10, noteY);
    }

    ctx.restore(); // Dans tilt restorasyonu

    // 10.0 BİNEK ATI (5 Dakikalık Kiralık Hızlı Asil At - 2x Hız)
    if (p.hasHorse) {
        ctx.save();
        let isMoving = p.isMoving;
        let walkCycle = p.walkCycle || 0;
        let gallopBob = isMoving ? Math.sin(walkCycle * 2) * 3 : 0;
        let dir = p.facing || 'down';
        let flip = (dir === 'left') ? -1 : 1;

        ctx.translate(pX, pY + 12 + gallopBob);
        ctx.scale(flip, 1);

        // 1. Atın Gölgesi
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.beginPath();
        ctx.ellipse(0, 15, 24, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Dörtnal Toz Püskürtme
        if (isMoving) {
            ctx.fillStyle = 'rgba(217, 119, 6, 0.45)';
            ctx.beginPath();
            ctx.arc(-18 + Math.sin(walkCycle) * 3, 13, 4, 0, Math.PI * 2);
            ctx.arc(-24 - Math.cos(walkCycle) * 3, 15, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // 3. Arka & Ön Bacaklar
        let legSwingFront = isMoving ? Math.sin(walkCycle * 1.5) * 8 : 0;
        let legSwingBack = isMoving ? -Math.sin(walkCycle * 1.5) * 8 : 0;

        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(-10, 4);
        ctx.lineTo(-12 + legSwingBack, 15);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(10, 4);
        ctx.lineTo(12 + legSwingFront, 15);
        ctx.stroke();

        // Nallar
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-14 + legSwingBack, 13, 4, 3);
        ctx.fillRect(10 + legSwingFront, 13, 4, 3);

        // 4. Kestane At Gövdesi
        ctx.fillStyle = '#92400e';
        ctx.beginPath();
        ctx.ellipse(0, 2, 22, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 5. At Kuyruğu
        let tailWag = isMoving ? Math.sin(walkCycle * 2) * 6 : Math.sin(Date.now() / 300) * 2;
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.quadraticCurveTo(-28, 4 + tailWag, -25, 14 + tailWag);
        ctx.stroke();

        // 6. At Boynu ve Başı
        ctx.fillStyle = '#92400e';
        ctx.beginPath();
        ctx.moveTo(12, -2);
        ctx.lineTo(19, -17);
        ctx.lineTo(27, -15);
        ctx.lineTo(24, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // At Burnu & Ağzı
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.ellipse(27, -15, 6, 4.5, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Kulaklar
        ctx.fillStyle = '#92400e';
        ctx.beginPath();
        ctx.moveTo(18, -17); ctx.lineTo(20, -24); ctx.lineTo(23, -17);
        ctx.closePath();
        ctx.fill();

        // Yele
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.moveTo(14, -4); ctx.lineTo(19, -18); ctx.lineTo(16, -17); ctx.lineTo(11, -3);
        ctx.closePath();
        ctx.fill();

        // Göz
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(23, -16, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath(); ctx.arc(24, -16, 1.2, 0, Math.PI * 2); ctx.fill();

        // 7. Altın Eyer ve Dizgin
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.roundRect(-8, -4, 16, 8, 3);
        ctx.fill();
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(26, -13); ctx.lineTo(0, -2);
        ctx.stroke();

        ctx.restore();
    }

    // 10.1 Kuğu Deniz Bisikleti (Sahilde kiralanmışsa oyuncunun altındaki kuğu pedalo)
    if (currentRoom === 'sahil' && p.hasSwanBoat) {
        ctx.save();
        // Kuğu teknesi gövdesi
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(pX, pY + 16, 24, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Kuğu boynu ve başı
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(pX + 14, pY + 16);
        ctx.quadraticCurveTo(pX + 24, pY - 2, pX + 18, pY - 8);
        ctx.lineTo(pX + 13, pY - 8);
        ctx.quadraticCurveTo(pX + 16, pY + 4, pX + 10, pY + 16);
        ctx.closePath();
        ctx.fill();

        // Kuğu gagası (turuncu) & göz (siyah)
        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.moveTo(pX + 18, pY - 8);
        ctx.lineTo(pX + 24, pY - 5);
        ctx.lineTo(pX + 18, pY - 3);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(pX + 16, pY - 6, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Su köpüğü & dalgası
        let ripple = Math.sin(Date.now() / 200) * 2;
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pX, pY + 20, 26 + ripple, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // 10.2 Nargile Duman Efekti (Nargile tutulurken veya Nargile Cafe'deyken duman yükselir)
    if (p.heldItem === 'nargile' || currentRoom === 'nargile_cafe') {
        let smokeTime = Date.now();
        for (let i = 0; i < 3; i++) {
            let offsetTime = (smokeTime / 450 + i * 2) % 6;
            let smokeAlpha = Math.max(0, 1 - (offsetTime / 6));
            let smokeY = pY - 28 - (offsetTime * 8);
            let smokeX = pX + Math.sin(offsetTime * 1.5 + i) * 6;
            let smokeR = 3 + offsetTime * 2.2;

            ctx.fillStyle = `rgba(240, 240, 255, ${smokeAlpha * 0.45})`;
            ctx.beginPath();
            ctx.arc(smokeX, smokeY, smokeR, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // 11. Oyuncu İsmi Rozeti (Önbellekli Metin Genişliği ve Doğru Font Sıralaması)
    ctx.font = "bold 11px sans-serif";
    if (p._cachedNameWidth === undefined || p._cachedName !== p.name) {
        p._cachedName = p.name || '';
        p._cachedNameWidth = ctx.measureText(p._cachedName).width;
    }
    let nameWidth = p._cachedNameWidth;

    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    ctx.beginPath();
    ctx.roundRect(pX - nameWidth / 2 - 6, pY - 42, nameWidth + 12, 16, 6);
    ctx.fill();
    ctx.fillStyle = id === myId ? "#38bdf8" : "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(p.name, pX, pY - 30);

    // 11.1 Oturma & Kalkma İpucu Rozeti (Sadece Kendi Karakterimiz İçin)
    if (id === myId) {
        if (isSitting) {
            let hintText = "[E] / Yön: Kalk";
            ctx.save();
            ctx.font = "bold 9px sans-serif";
            let hintW = ctx.measureText(hintText).width + 12;
            let hintY = pY + 28;
            ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
            ctx.beginPath();
            ctx.roundRect(pX - hintW / 2, hintY, hintW, 15, 6);
            ctx.fill();
            ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = "#38bdf8";
            ctx.textAlign = "center";
            ctx.fillText(hintText, pX, hintY + 11);
            ctx.restore();
        } else {
            let nearbySeat = (typeof findNearestSittableSeat === 'function') ? findNearestSittableSeat() : null;
            if (nearbySeat) {
                let pulse = Math.sin(Date.now() / 180) * 2;
                let promptText = `🛋️ [E] Otur`;
                ctx.save();
                ctx.font = "bold 10px sans-serif";
                let promptW = ctx.measureText(promptText).width + 14;
                let promptY = pY - 60 + pulse;
                ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
                ctx.beginPath();
                ctx.roundRect(pX - promptW / 2, promptY, promptW, 17, 7);
                ctx.fill();
                ctx.strokeStyle = "#facc15";
                ctx.lineWidth = 1.2;
                ctx.stroke();
                ctx.fillStyle = "#facc15";
                ctx.textAlign = "center";
                ctx.fillText(promptText, pX, promptY + 12);
                ctx.restore();
            }
        }
    }

    // Canlı Sesli Konuşma Göstergesi (2D Dünyada Konuşan Oyuncu Etrafında Yeşil Dalga)
    if (p.isSpeaking) {
        ctx.save();
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        let pulseRadius = 24 + Math.sin(Date.now() / 150) * 3;
        ctx.arc(pX, pY - 14, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.font = "12px sans-serif";
        ctx.fillText("🎙️", pX + nameWidth / 2 + 12, pY - 30);
        ctx.restore();
    }

    // 12. Konuşma Baloncukları (Kuyruklu)
    if (activeChatBubbles[id] && activeChatBubbles[id].length > 0) {
        let bubbles = activeChatBubbles[id];
        let bubbleY = pY - 54;

        for (let i = bubbles.length - 1; i >= 0; i--) {
            let bObj = bubbles[i];
            let text = bObj.text;

            if (bObj._textWidth === undefined) {
                ctx.font = "12px sans-serif";
                bObj._textWidth = ctx.measureText(text).width;
            }
            let textWidth = bObj._textWidth;
            let boxWidth = Math.max(textWidth + 18, 44);
            let boxHeight = 26;

            // Balon gövdesi
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.roundRect(pX - boxWidth / 2, bubbleY - boxHeight, boxWidth, boxHeight, 8);
            ctx.fill();
            ctx.strokeStyle = "#334155";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Balon üçgen kuyruğu (ilk balon için kafaya işaret eder)
            if (i === bubbles.length - 1) {
                ctx.fillStyle = "#ffffff";
                ctx.beginPath();
                ctx.moveTo(pX - 4, bubbleY);
                ctx.lineTo(pX, bubbleY + 5);
                ctx.lineTo(pX + 4, bubbleY);
                ctx.fill();
            }

            ctx.fillStyle = "#0f172a";
            ctx.textAlign = "center";
            ctx.fillText(text, pX, bubbleY - 8);

            bubbleY -= (boxHeight + 6);
        }
    }

    // 13. Hızlı Emoji Tepkileri (Kafa üstünde süzülen baloncuk)
    if (typeof activePlayerEmojis !== 'undefined' && activePlayerEmojis[id]) {
        let emojiData = activePlayerEmojis[id];
        let elapsed = Date.now() - emojiData.start;
        if (elapsed < 3000) {
            let progress = elapsed / 3000;
            let alpha = progress > 0.7 ? 1 - ((progress - 0.7) / 0.3) : 1;
            let floatY = pY - 56 - (progress * 28);
            ctx.save();
            ctx.globalAlpha = Math.max(0, alpha);
            ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
            ctx.beginPath();
            ctx.arc(pX, floatY, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#cbd5e1";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.font = "18px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(emojiData.emoji, pX, floatY + 1);
            ctx.restore();
        } else {
            delete activePlayerEmojis[id];
        }
    }
}
