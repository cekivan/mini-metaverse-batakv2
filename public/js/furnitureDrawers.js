/**
 * Mini Metaverse - Özgün 4 Yönlü İzometrik Mobilya Çizim Motoru
 * Her eşya 0°, 90°, 180° ve 270° olmak üzere 4 özgün izometrik açıya sahiptir.
 * Simetrik ayna yansıtma (scale(-1,1)) yerine gerçek 3D izometrik perspektif kullanılır.
 */

window.FURNITURE_DRAWERS = {
    // 1. OTANTİK ŞARK SEDİRİ (94x54 / 52x88)
    'sedir': function(ctx, x, y, rot, now) {
        if (rot === 0) {
            // ÖN - AŞAĞI (0° Geniş Ön Görünüm)
            ctx.fillStyle = "#451a03";
            ctx.beginPath(); ctx.roundRect(x - 47, y + 8, 94, 18, 4); ctx.fill();
            ctx.strokeStyle = "#78350f"; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.fillStyle = "#d97706";
            for (let bx = x - 38; bx <= x + 38; bx += 18) {
                ctx.beginPath(); ctx.arc(bx, y + 17, 3, 0, Math.PI * 2); ctx.fill();
            }
            let cushionGrad = ctx.createLinearGradient(0, y - 6, 0, y + 10);
            cushionGrad.addColorStop(0, '#9d174d'); cushionGrad.addColorStop(0.5, '#831843'); cushionGrad.addColorStop(1, '#500724');
            ctx.fillStyle = cushionGrad;
            ctx.beginPath(); ctx.roundRect(x - 46, y - 8, 92, 18, 5); ctx.fill();
            ctx.strokeStyle = "rgba(250, 204, 21, 0.75)"; ctx.lineWidth = 1.2; ctx.stroke();
            let backGrad = ctx.createLinearGradient(0, y - 27, 0, y - 8);
            backGrad.addColorStop(0, '#be185d'); backGrad.addColorStop(1, '#831843');
            ctx.fillStyle = backGrad;
            ctx.beginPath(); ctx.roundRect(x - 46, y - 27, 92, 20, [8, 8, 0, 0]); ctx.fill();
            ctx.fillStyle = "#facc15";
            for (let kx = x - 36; kx <= x + 36; kx += 16) {
                ctx.beginPath(); ctx.moveTo(kx, y - 23); ctx.lineTo(kx + 5, y - 18); ctx.lineTo(kx, y - 13); ctx.lineTo(kx - 5, y - 18); ctx.closePath(); ctx.fill();
            }
            // Sol ve Sağ Altın Silindirik Kırlentler
            ctx.fillStyle = "#f59e0b"; ctx.beginPath(); ctx.roundRect(x - 44, y - 22, 16, 22, 6); ctx.fill();
            ctx.fillStyle = "#fbbf24"; ctx.fillRect(x - 42, y - 20, 12, 18);
            ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(x - 46, y - 11, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#f59e0b"; ctx.beginPath(); ctx.roundRect(x + 28, y - 22, 16, 22, 6); ctx.fill();
            ctx.fillStyle = "#fbbf24"; ctx.fillRect(x + 30, y - 20, 12, 18);
            ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(x + 46, y - 11, 2.5, 0, Math.PI * 2); ctx.fill();
            // Orta Turkuaz Kırlent
            ctx.fillStyle = "#0284c7"; ctx.beginPath(); ctx.roundRect(x - 10, y - 22, 20, 16, 4); ctx.fill();
            ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 1; ctx.stroke();
        } else if (rot === 1) {
            // YAN - SOL (90° Derinlik Profili: Sedir Sağa/Odaya Bakar)
            ctx.fillStyle = "#451a03";
            ctx.beginPath(); ctx.roundRect(x - 22, y - 40, 44, 80, 4); ctx.fill();
            ctx.strokeStyle = "#78350f"; ctx.lineWidth = 1.5; ctx.stroke();
            // Sol Sırtlık (Sol duvar boyunca yükselen kilim bordürü)
            let backGrad = ctx.createLinearGradient(x - 24, 0, x - 8, 0);
            backGrad.addColorStop(0, '#be185d'); backGrad.addColorStop(1, '#831843');
            ctx.fillStyle = backGrad;
            ctx.beginPath(); ctx.roundRect(x - 24, y - 42, 16, 84, [6, 0, 0, 6]); ctx.fill();
            ctx.fillStyle = "#facc15";
            for (let ky = y - 32; ky <= y + 32; ky += 16) {
                ctx.beginPath(); ctx.moveTo(x - 16, ky - 4); ctx.lineTo(x - 12, ky); ctx.lineTo(x - 16, ky + 4); ctx.lineTo(x - 20, ky); ctx.closePath(); ctx.fill();
            }
            // Oturma Alanı (Sağda)
            let seatGrad = ctx.createLinearGradient(x - 8, 0, x + 20, 0);
            seatGrad.addColorStop(0, '#9d174d'); seatGrad.addColorStop(1, '#500724');
            ctx.fillStyle = seatGrad;
            ctx.beginPath(); ctx.roundRect(x - 8, y - 38, 28, 76, 4); ctx.fill();
            ctx.strokeStyle = "rgba(250, 204, 21, 0.75)"; ctx.lineWidth = 1.2; ctx.stroke();
            // Üst ve Alt Kırlentler
            ctx.fillStyle = "#f59e0b"; ctx.beginPath(); ctx.roundRect(x - 6, y - 36, 24, 14, 5); ctx.fill();
            ctx.fillStyle = "#fbbf24"; ctx.fillRect(x - 4, y - 34, 20, 10);
            ctx.fillStyle = "#f59e0b"; ctx.beginPath(); ctx.roundRect(x - 6, y + 22, 24, 14, 5); ctx.fill();
            ctx.fillStyle = "#fbbf24"; ctx.fillRect(x - 4, y + 24, 20, 10);
            // Orta Kırlent
            ctx.fillStyle = "#0284c7"; ctx.beginPath(); ctx.roundRect(x - 4, y - 8, 20, 16, 4); ctx.fill();
        } else if (rot === 2) {
            // ARKA (180° Geniş Arka Görünüm: Sedir Odanın İçine Doğru Bakar)
            ctx.fillStyle = "#451a03";
            ctx.beginPath(); ctx.roundRect(x - 47, y + 10, 94, 16, 4); ctx.fill();
            // Masif Meşe Oymalı Sırt Paneli
            let oakGrad = ctx.createLinearGradient(0, y - 26, 0, y + 12);
            oakGrad.addColorStop(0, '#78350f'); oakGrad.addColorStop(0.5, '#451a03'); oakGrad.addColorStop(1, '#290e03');
            ctx.fillStyle = oakGrad;
            ctx.beginPath(); ctx.roundRect(x - 46, y - 26, 92, 38, [8, 8, 2, 2]); ctx.fill();
            ctx.strokeStyle = "#ca8a04"; ctx.lineWidth = 1.5; ctx.stroke();
            // Dikey ahşap çıtalar ve altın kabara perçinleri
            ctx.strokeStyle = "rgba(202, 138, 4, 0.4)"; ctx.lineWidth = 1;
            for (let px = x - 36; px <= x + 36; px += 18) {
                ctx.beginPath(); ctx.moveTo(px, y - 24); ctx.lineTo(px, y + 10); ctx.stroke();
                ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(px, y - 20, 2, 0, Math.PI * 2); ctx.fill();
            }
        } else if (rot === 3) {
            // YAN - SAĞ (270° Derinlik Profili: Sedir Sola/Odaya Bakar)
            ctx.fillStyle = "#451a03";
            ctx.beginPath(); ctx.roundRect(x - 22, y - 40, 44, 80, 4); ctx.fill();
            ctx.strokeStyle = "#78350f"; ctx.lineWidth = 1.5; ctx.stroke();
            // Sağ Sırtlık
            let backGrad = ctx.createLinearGradient(x + 8, 0, x + 24, 0);
            backGrad.addColorStop(0, '#831843'); backGrad.addColorStop(1, '#be185d');
            ctx.fillStyle = backGrad;
            ctx.beginPath(); ctx.roundRect(x + 8, y - 42, 16, 84, [0, 6, 6, 0]); ctx.fill();
            ctx.fillStyle = "#facc15";
            for (let ky = y - 32; ky <= y + 32; ky += 16) {
                ctx.beginPath(); ctx.moveTo(x + 16, ky - 4); ctx.lineTo(x + 20, ky); ctx.lineTo(x + 16, ky + 4); ctx.lineTo(x + 12, ky); ctx.closePath(); ctx.fill();
            }
            // Oturma Alanı (Solda)
            let seatGrad = ctx.createLinearGradient(x - 20, 0, x + 8, 0);
            seatGrad.addColorStop(0, '#500724'); seatGrad.addColorStop(1, '#9d174d');
            ctx.fillStyle = seatGrad;
            ctx.beginPath(); ctx.roundRect(x - 20, y - 38, 28, 76, 4); ctx.fill();
            ctx.strokeStyle = "rgba(250, 204, 21, 0.75)"; ctx.lineWidth = 1.2; ctx.stroke();
            // Üst ve Alt Kırlentler
            ctx.fillStyle = "#f59e0b"; ctx.beginPath(); ctx.roundRect(x - 18, y - 36, 24, 14, 5); ctx.fill();
            ctx.fillStyle = "#fbbf24"; ctx.fillRect(x - 16, y - 34, 20, 10);
            ctx.fillStyle = "#f59e0b"; ctx.beginPath(); ctx.roundRect(x - 18, y + 22, 24, 14, 5); ctx.fill();
            ctx.fillStyle = "#fbbf24"; ctx.fillRect(x - 16, y + 24, 20, 10);
            // Orta Kırlent
            ctx.fillStyle = "#0284c7"; ctx.beginPath(); ctx.roundRect(x - 16, y - 8, 20, 16, 4); ctx.fill();
        }
    },

    // 2. LÜKS DERİ BERJER (56x52 / 46x54)
    'berjer': function(ctx, x, y, rot, now) {
        if (rot === 0) {
            // ÖN (0° Geniş Ön Görünüm)
            ctx.fillStyle = "#451a03";
            ctx.fillRect(x - 22, y + 16, 6, 8); ctx.fillRect(x + 16, y + 16, 6, 8);
            let bGrad = ctx.createLinearGradient(0, y - 24, 0, y + 16);
            bGrad.addColorStop(0, '#78350f'); bGrad.addColorStop(0.6, '#451a03'); bGrad.addColorStop(1, '#290e03');
            ctx.fillStyle = bGrad;
            ctx.beginPath(); ctx.roundRect(x - 25, y - 24, 50, 40, 10); ctx.fill();
            ctx.strokeStyle = "rgba(245, 158, 11, 0.4)"; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x - 16, y - 18); ctx.lineTo(x, y - 6); ctx.lineTo(x + 16, y - 18);
            ctx.moveTo(x - 16, y - 8); ctx.lineTo(x, y + 4); ctx.lineTo(x + 16, y - 8);
            ctx.stroke();
            ctx.fillStyle = "#facc15";
            [[x, y - 6], [x - 10, y - 14], [x + 10, y - 14], [x, y + 2]].forEach(b => {
                ctx.beginPath(); ctx.arc(b[0], b[1], 1.8, 0, Math.PI * 2); ctx.fill();
            });
            ctx.fillStyle = "#92400e";
            ctx.beginPath(); ctx.roundRect(x - 20, y + 2, 40, 15, 6); ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.stroke();
            ctx.fillStyle = "#5c2306";
            ctx.beginPath(); ctx.roundRect(x - 27, y - 8, 10, 22, 5); ctx.fill();
            ctx.beginPath(); ctx.roundRect(x + 17, y - 8, 10, 22, 5); ctx.fill();
        } else if (rot === 1) {
            // YAN - SOL (90° Profil: Sağa Bakar)
            ctx.fillStyle = "#451a03";
            ctx.fillRect(x - 18, y + 16, 5, 8); ctx.fillRect(x + 10, y + 16, 5, 8);
            // Sol Sırtlık
            let bGrad = ctx.createLinearGradient(x - 22, 0, x - 6, 0);
            bGrad.addColorStop(0, '#78350f'); bGrad.addColorStop(1, '#3b1402');
            ctx.fillStyle = bGrad;
            ctx.beginPath(); ctx.roundRect(x - 22, y - 26, 16, 42, [8, 4, 2, 4]); ctx.fill();
            // Oturma Minderi
            ctx.fillStyle = "#92400e";
            ctx.beginPath(); ctx.roundRect(x - 6, y - 4, 24, 18, 5); ctx.fill();
            // Kolçak (Önde)
            ctx.fillStyle = "#5c2306";
            ctx.beginPath(); ctx.roundRect(x - 10, y - 6, 22, 16, 6); ctx.fill();
            ctx.strokeStyle = "rgba(245, 158, 11, 0.4)"; ctx.lineWidth = 1; ctx.stroke();
        } else if (rot === 2) {
            // ARKA (180° Arkadan Görünüm)
            ctx.fillStyle = "#451a03";
            ctx.fillRect(x - 20, y + 16, 6, 8); ctx.fillRect(x + 14, y + 16, 6, 8);
            let bGrad = ctx.createLinearGradient(0, y - 26, 0, y + 16);
            bGrad.addColorStop(0, '#5c2306'); bGrad.addColorStop(0.6, '#381402'); bGrad.addColorStop(1, '#1c0800');
            ctx.fillStyle = bGrad;
            ctx.beginPath(); ctx.roundRect(x - 25, y - 26, 50, 42, [10, 10, 4, 4]); ctx.fill();
            ctx.strokeStyle = "#78350f"; ctx.lineWidth = 1.5; ctx.stroke();
            // Sırt dikişi ve altın kabara perçinleri
            ctx.strokeStyle = "rgba(202, 138, 4, 0.4)"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x, y - 24); ctx.lineTo(x, y + 14); ctx.stroke();
        } else if (rot === 3) {
            // YAN - SAĞ (270° Profil: Sola Bakar)
            ctx.fillStyle = "#451a03";
            ctx.fillRect(x - 15, y + 16, 5, 8); ctx.fillRect(x + 13, y + 16, 5, 8);
            // Sağ Sırtlık
            let bGrad = ctx.createLinearGradient(x + 6, 0, x + 22, 0);
            bGrad.addColorStop(0, '#3b1402'); bGrad.addColorStop(1, '#78350f');
            ctx.fillStyle = bGrad;
            ctx.beginPath(); ctx.roundRect(x + 6, y - 26, 16, 42, [4, 8, 4, 2]); ctx.fill();
            // Oturma Minderi
            ctx.fillStyle = "#92400e";
            ctx.beginPath(); ctx.roundRect(x - 18, y - 4, 24, 18, 5); ctx.fill();
            // Kolçak (Önde)
            ctx.fillStyle = "#5c2306";
            ctx.beginPath(); ctx.roundRect(x - 12, y - 6, 22, 16, 6); ctx.fill();
            ctx.strokeStyle = "rgba(245, 158, 11, 0.4)"; ctx.lineWidth = 1; ctx.stroke();
        }
    },

    // 3. ANADOLU DOKUMA HALISI (126x76 / 76x126)
    'hali': function(ctx, x, y, rot, now) {
        if (rot === 0 || rot === 2) {
            // YATAY HALI
            ctx.strokeStyle = "#f8fafc"; ctx.lineWidth = 1.2;
            for (let fx = x - 58; fx <= x + 58; fx += 4) {
                ctx.beginPath(); ctx.moveTo(fx, y - 37); ctx.lineTo(fx, y - 34); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(fx, y + 34); ctx.lineTo(fx, y + 37); ctx.stroke();
            }
            let rugGrad = ctx.createLinearGradient(x - 60, 0, x + 60, 0);
            rugGrad.addColorStop(0, '#881337'); rugGrad.addColorStop(0.5, '#9f1239'); rugGrad.addColorStop(1, '#881337');
            ctx.fillStyle = rugGrad; ctx.fillRect(x - 60, y - 34, 120, 68);
            ctx.strokeStyle = "#facc15"; ctx.lineWidth = 2.5; ctx.strokeRect(x - 55, y - 30, 110, 60);
            ctx.strokeStyle = "#1e3a8a"; ctx.lineWidth = 1.5; ctx.strokeRect(x - 50, y - 25, 100, 50);
            ctx.fillStyle = "#1e3a8a"; ctx.beginPath(); ctx.ellipse(x, y, 22, 14, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#0284c7"; ctx.beginPath(); ctx.ellipse(x, y, 14, 9, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
        } else {
            // DİKEY / DERİNLİK HALI (90° / 270°)
            ctx.strokeStyle = "#f8fafc"; ctx.lineWidth = 1.2;
            for (let fy = y - 58; fy <= y + 58; fy += 4) {
                ctx.beginPath(); ctx.moveTo(x - 37, fy); ctx.lineTo(x - 34, fy); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x + 34, fy); ctx.lineTo(x + 37, fy); ctx.stroke();
            }
            let rugGrad = ctx.createLinearGradient(0, y - 60, 0, y + 60);
            rugGrad.addColorStop(0, '#881337'); rugGrad.addColorStop(0.5, '#9f1239'); rugGrad.addColorStop(1, '#881337');
            ctx.fillStyle = rugGrad; ctx.fillRect(x - 34, y - 60, 68, 120);
            ctx.strokeStyle = "#facc15"; ctx.lineWidth = 2.5; ctx.strokeRect(x - 30, y - 55, 60, 110);
            ctx.strokeStyle = "#1e3a8a"; ctx.lineWidth = 1.5; ctx.strokeRect(x - 25, y - 50, 50, 100);
            ctx.fillStyle = "#1e3a8a"; ctx.beginPath(); ctx.ellipse(x, y, 14, 22, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#0284c7"; ctx.beginPath(); ctx.ellipse(x, y, 9, 14, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
        }
    },

    // 4. SMART CURVED TV & LAKE KONSOL (90x62 / 46x62)
    'tv': function(ctx, x, y, rot, now) {
        if (rot === 0) {
            // ÖN (0°)
            ctx.fillStyle = "#f1f5f9"; ctx.beginPath(); ctx.roundRect(x - 42, y + 12, 84, 18, 4); ctx.fill();
            ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 1.2; ctx.stroke();
            ctx.fillStyle = "#0f172a"; ctx.fillRect(x - 18, y + 16, 36, 8);
            ctx.fillStyle = "#22c55e"; ctx.beginPath(); ctx.arc(x - 13, y + 20, 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#64748b"; ctx.fillRect(x - 14, y + 8, 28, 4); ctx.fillRect(x - 3, y + 2, 6, 8);
            ctx.fillStyle = "#0f172a"; ctx.beginPath(); ctx.roundRect(x - 44, y - 26, 88, 38, 5); ctx.fill();
            ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 1.2; ctx.stroke();
            let tvHue = (now / 25) % 360;
            let screenGrad = ctx.createLinearGradient(x - 40, y - 24, x + 40, y + 8);
            screenGrad.addColorStop(0, `hsla(${tvHue}, 80%, 65%, 0.75)`);
            screenGrad.addColorStop(0.5, `hsla(${(tvHue + 60) % 360}, 85%, 60%, 0.75)`);
            screenGrad.addColorStop(1, `hsla(${(tvHue + 120) % 360}, 90%, 55%, 0.75)`);
            ctx.fillStyle = screenGrad; ctx.fillRect(x - 41, y - 23, 82, 32);
            ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
            ctx.beginPath(); ctx.moveTo(x - 41, y - 23); ctx.lineTo(x + 10, y - 23); ctx.lineTo(x - 15, y + 9); ctx.lineTo(x - 41, y + 9); ctx.closePath(); ctx.fill();
            ctx.fillStyle = "#38bdf8"; ctx.beginPath(); ctx.arc(x, y + 10, 1.2, 0, Math.PI * 2); ctx.fill();
        } else if (rot === 1) {
            // YAN - SOL (90° İnce Profil: Sağa Işık Yansıması)
            ctx.fillStyle = "#f1f5f9"; ctx.beginPath(); ctx.roundRect(x - 14, y + 10, 28, 20, 4); ctx.fill();
            ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 1.2; ctx.stroke();
            ctx.fillStyle = "#64748b"; ctx.fillRect(x - 3, y + 2, 6, 8);
            // Ekran yan kavis çizgisi
            ctx.fillStyle = "#0f172a"; ctx.beginPath(); ctx.roundRect(x - 5, y - 26, 10, 38, 3); ctx.fill();
            // Sağa doğru ekran ambiyans ışık aurası
            let tvHue = (now / 25) % 360;
            let glowGrad = ctx.createRadialGradient(x + 5, y - 8, 2, x + 25, y - 8, 30);
            glowGrad.addColorStop(0, `hsla(${tvHue}, 90%, 65%, 0.5)`);
            glowGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGrad; ctx.beginPath(); ctx.arc(x + 15, y - 8, 25, 0, Math.PI * 2); ctx.fill();
        } else if (rot === 2) {
            // ARKA (180° Arka Panel)
            ctx.fillStyle = "#e2e8f0"; ctx.beginPath(); ctx.roundRect(x - 42, y + 12, 84, 18, 4); ctx.fill();
            ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 1.2; ctx.stroke();
            ctx.fillStyle = "#0f172a"; ctx.beginPath(); ctx.roundRect(x - 44, y - 26, 88, 38, 5); ctx.fill();
            ctx.strokeStyle = "#334155"; ctx.lineWidth = 1.2; ctx.stroke();
            // Havalandırma ızgarası & VESA montajı
            ctx.fillStyle = "#1e293b"; ctx.fillRect(x - 20, y - 18, 40, 22);
            ctx.fillStyle = "#64748b";
            [[-8, -10], [8, -10], [-8, 0], [8, 0]].forEach(pt => {
                ctx.beginPath(); ctx.arc(x + pt[0], y + pt[1], 1.5, 0, Math.PI * 2); ctx.fill();
            });
        } else if (rot === 3) {
            // YAN - SAĞ (270° İnce Profil: Sola Işık Yansıması)
            ctx.fillStyle = "#f1f5f9"; ctx.beginPath(); ctx.roundRect(x - 14, y + 10, 28, 20, 4); ctx.fill();
            ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 1.2; ctx.stroke();
            ctx.fillStyle = "#64748b"; ctx.fillRect(x - 3, y + 2, 6, 8);
            ctx.fillStyle = "#0f172a"; ctx.beginPath(); ctx.roundRect(x - 5, y - 26, 10, 38, 3); ctx.fill();
            let tvHue = (now / 25) % 360;
            let glowGrad = ctx.createRadialGradient(x - 5, y - 8, 2, x - 25, y - 8, 30);
            glowGrad.addColorStop(0, `hsla(${tvHue}, 90%, 65%, 0.5)`);
            glowGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGrad; ctx.beginPath(); ctx.arc(x - 15, y - 8, 25, 0, Math.PI * 2); ctx.fill();
        }
    },

    // 5. DOĞAL TAŞ ŞÖMİNE (84x70 / 54x70)
    'somine': function(ctx, x, y, rot, now) {
        if (rot === 0) {
            // ÖN (0°)
            ctx.fillStyle = "#475569"; ctx.beginPath(); ctx.roundRect(x - 40, y - 28, 80, 60, 6); ctx.fill();
            ctx.strokeStyle = "rgba(15, 23, 42, 0.4)"; ctx.lineWidth = 1;
            for (let ty = y - 22; ty <= y + 26; ty += 10) {
                ctx.beginPath(); ctx.moveTo(x - 38, ty); ctx.lineTo(x + 38, ty); ctx.stroke();
            }
            ctx.fillStyle = "#78350f"; ctx.beginPath(); ctx.roundRect(x - 44, y - 34, 88, 8, 3); ctx.fill();
            ctx.fillStyle = "#facc15"; ctx.fillRect(x - 22, y - 40, 5, 6);
            ctx.fillStyle = "#ffffff"; ctx.fillRect(x - 21, y - 44, 3, 4);
            ctx.fillStyle = "#ea580c"; ctx.beginPath(); ctx.arc(x - 19.5, y - 46, 2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#0f172a"; ctx.beginPath(); ctx.roundRect(x - 26, y - 10, 52, 40, [14, 14, 0, 0]); ctx.fill();
            ctx.fillStyle = "#78350f";
            ctx.save(); ctx.translate(x, y + 20); ctx.rotate(0.25); ctx.fillRect(-18, -4, 36, 6); ctx.rotate(-0.5); ctx.fillRect(-18, -4, 36, 6); ctx.restore();
            let flameH = 14 + Math.sin(now / 90) * 4;
            let flameGrad = ctx.createRadialGradient(x, y + 16, 2, x, y + 14 - flameH * 0.4, 16);
            flameGrad.addColorStop(0, '#fef08a'); flameGrad.addColorStop(0.3, '#f59e0b'); flameGrad.addColorStop(0.7, '#ea580c'); flameGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = flameGrad; ctx.beginPath(); ctx.arc(x, y + 16, 15, 0, Math.PI * 2); ctx.fill();
        } else if (rot === 1) {
            // YAN - SOL (90° Sağa Alev Açıklığı)
            ctx.fillStyle = "#475569"; ctx.beginPath(); ctx.roundRect(x - 22, y - 28, 44, 60, 6); ctx.fill();
            ctx.fillStyle = "#78350f"; ctx.beginPath(); ctx.roundRect(x - 24, y - 34, 48, 8, 3); ctx.fill();
            // Sağ tarafta açık ocak
            ctx.fillStyle = "#0f172a"; ctx.beginPath(); ctx.roundRect(x - 4, y - 8, 22, 38, [8, 0, 0, 0]); ctx.fill();
            let flameGrad = ctx.createRadialGradient(x + 6, y + 14, 2, x + 8, y + 8, 14);
            flameGrad.addColorStop(0, '#fef08a'); flameGrad.addColorStop(0.5, '#ea580c'); flameGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = flameGrad; ctx.beginPath(); ctx.arc(x + 6, y + 14, 13, 0, Math.PI * 2); ctx.fill();
        } else if (rot === 2) {
            // ARKA (180° Masif Taş Duvar)
            ctx.fillStyle = "#475569"; ctx.beginPath(); ctx.roundRect(x - 40, y - 28, 80, 60, 6); ctx.fill();
            ctx.fillStyle = "#78350f"; ctx.beginPath(); ctx.roundRect(x - 44, y - 34, 88, 8, 3); ctx.fill();
            ctx.strokeStyle = "rgba(15, 23, 42, 0.4)"; ctx.lineWidth = 1;
            for (let ty = y - 22; ty <= y + 26; ty += 8) {
                ctx.beginPath(); ctx.moveTo(x - 38, ty); ctx.lineTo(x + 38, ty); ctx.stroke();
            }
        } else if (rot === 3) {
            // YAN - SAĞ (270° Sola Alev Açıklığı)
            ctx.fillStyle = "#475569"; ctx.beginPath(); ctx.roundRect(x - 22, y - 28, 44, 60, 6); ctx.fill();
            ctx.fillStyle = "#78350f"; ctx.beginPath(); ctx.roundRect(x - 24, y - 34, 48, 8, 3); ctx.fill();
            ctx.fillStyle = "#0f172a"; ctx.beginPath(); ctx.roundRect(x - 18, y - 8, 22, 38, [0, 8, 0, 0]); ctx.fill();
            let flameGrad = ctx.createRadialGradient(x - 6, y + 14, 2, x - 8, y + 8, 14);
            flameGrad.addColorStop(0, '#fef08a'); flameGrad.addColorStop(0.5, '#ea580c'); flameGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = flameGrad; ctx.beginPath(); ctx.arc(x - 6, y + 14, 13, 0, Math.PI * 2); ctx.fill();
        }
    },

    // 6. CANLI RESİF AKVARYUMU (76x56 / 50x56)
    'akvaryum': function(ctx, x, y, rot, now) {
        let isSide = (rot === 1 || rot === 3);
        let tw = isSide ? 44 : 72;
        let cw = isSide ? 42 : 70;
        ctx.fillStyle = "#1e293b"; ctx.beginPath(); ctx.roundRect(x - tw / 2, y + 12, tw, 14, 3); ctx.fill();
        let waterGrad = ctx.createLinearGradient(0, y - 20, 0, y + 12);
        waterGrad.addColorStop(0, '#38bdf8'); waterGrad.addColorStop(1, '#0284c7');
        ctx.fillStyle = waterGrad; ctx.beginPath(); ctx.roundRect(x - cw / 2, y - 20, cw, 32, 4); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = "#fde047"; ctx.fillRect(x - cw / 2 + 1, y + 7, cw - 2, 5);
        ctx.fillStyle = "#16a34a";
        ctx.beginPath(); ctx.arc(x - cw * 0.3, y + 4, 5, 0, Math.PI * 2); ctx.arc(x + cw * 0.3, y + 4, 5, 0, Math.PI * 2); ctx.fill();
        // Baloncuklar
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        let b1 = (now / 60) % 24;
        ctx.beginPath(); ctx.arc(x - 8, y + 8 - b1, 1.4, 0, Math.PI * 2); ctx.fill();
        // Yüzen Palyaço Balığı
        let fishAmp = isSide ? 8 : 16;
        let fishX = x + Math.sin(now / 500) * fishAmp;
        ctx.fillStyle = "#f97316"; ctx.beginPath(); ctx.ellipse(fishX, y - 4, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
    },

    // 7. ANTİKA PİRİNÇ GRAMOFON (54x54)
    'gramofon': function(ctx, x, y, rot, now) {
        // Sandık
        ctx.fillStyle = "#5c2306"; ctx.beginPath(); ctx.roundRect(x - 18, y + 2, 36, 18, 4); ctx.fill();
        ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 1; ctx.stroke();
        // Dönen Plak
        ctx.fillStyle = "#0f172a"; ctx.beginPath(); ctx.ellipse(x, y - 2, 15, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#dc2626"; ctx.beginPath(); ctx.ellipse(x, y - 2, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
        // Boru Açısı (4 Yöne Göre)
        let hornAngles = [
            { hx: 10, hy: -26, rot: -0.4 }, // rot 0: Ön-Sağ
            { hx: -10, hy: -26, rot: 0.4 },  // rot 1: Ön-Sol
            { hx: -14, hy: -32, rot: 0.7 },  // rot 2: Arka-Sol
            { hx: 14, hy: -32, rot: -0.7 }   // rot 3: Arka-Sağ
        ][rot];
        let hornGrad = ctx.createLinearGradient(x - 15, y - 26, x + 20, y - 10);
        hornGrad.addColorStop(0, '#fef08a'); hornGrad.addColorStop(0.4, '#facc15'); hornGrad.addColorStop(1, '#b45309');
        ctx.fillStyle = hornGrad;
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.quadraticCurveTo(x + hornAngles.hx * 0.5, y - 15, x + hornAngles.hx, y + hornAngles.hy);
        ctx.lineTo(x + hornAngles.hx * 0.6, y + hornAngles.hy - 4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#fef08a"; ctx.beginPath(); ctx.ellipse(x + hornAngles.hx, y + hornAngles.hy, 9, 5, hornAngles.rot, 0, Math.PI * 2); ctx.fill();
    },

    // 8. MASİF YEMEK MASASI (92x60 / 60x92)
    'yemek_masasi': function(ctx, x, y, rot, now) {
        if (rot === 0) {
            // YATAY - SANDALYELER ARKADA
            ctx.fillStyle = "#451a03";
            ctx.beginPath(); ctx.roundRect(x - 34, y - 26, 16, 20, 3); ctx.fill();
            ctx.beginPath(); ctx.roundRect(x + 18, y - 26, 16, 20, 3); ctx.fill();
            let tableGrad = ctx.createLinearGradient(0, y - 12, 0, y + 16);
            tableGrad.addColorStop(0, '#b45309'); tableGrad.addColorStop(1, '#451a03');
            ctx.fillStyle = tableGrad; ctx.beginPath(); ctx.roundRect(x - 44, y - 12, 88, 28, 6); ctx.fill();
            ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 1.2; ctx.stroke();
            ctx.fillStyle = "#f8fafc"; ctx.fillRect(x - 12, y - 12, 24, 28);
            ctx.fillStyle = "#0284c7"; ctx.beginPath(); ctx.ellipse(x, y + 2, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
        } else if (rot === 1) {
            // DİKEY - SANDALYELER SOLDA (90°)
            ctx.fillStyle = "#451a03";
            ctx.beginPath(); ctx.roundRect(x - 34, y - 24, 18, 16, 3); ctx.fill();
            ctx.beginPath(); ctx.roundRect(x - 34, y + 8, 18, 16, 3); ctx.fill();
            let tableGrad = ctx.createLinearGradient(x - 14, 0, x + 14, 0);
            tableGrad.addColorStop(0, '#b45309'); tableGrad.addColorStop(1, '#451a03');
            ctx.fillStyle = tableGrad; ctx.beginPath(); ctx.roundRect(x - 14, y - 44, 28, 88, 6); ctx.fill();
            ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 1.2; ctx.stroke();
            ctx.fillStyle = "#f8fafc"; ctx.fillRect(x - 14, y - 12, 28, 24);
            ctx.fillStyle = "#0284c7"; ctx.beginPath(); ctx.ellipse(x, y, 4, 6, 0, 0, Math.PI * 2); ctx.fill();
        } else if (rot === 2) {
            // YATAY - SANDALYELER ÖNDE (180°)
            let tableGrad = ctx.createLinearGradient(0, y - 20, 0, y + 8);
            tableGrad.addColorStop(0, '#b45309'); tableGrad.addColorStop(1, '#451a03');
            ctx.fillStyle = tableGrad; ctx.beginPath(); ctx.roundRect(x - 44, y - 20, 88, 28, 6); ctx.fill();
            ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 1.2; ctx.stroke();
            ctx.fillStyle = "#f8fafc"; ctx.fillRect(x - 12, y - 20, 24, 28);
            ctx.fillStyle = "#0284c7"; ctx.beginPath(); ctx.ellipse(x, y - 6, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
            // Önde 2 Sandalye (Arkası Dönük)
            ctx.fillStyle = "#451a03";
            ctx.beginPath(); ctx.roundRect(x - 34, y + 4, 16, 22, [2, 2, 4, 4]); ctx.fill();
            ctx.beginPath(); ctx.roundRect(x + 18, y + 4, 16, 22, [2, 2, 4, 4]); ctx.fill();
            ctx.strokeStyle = "#78350f"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x - 26, y + 6); ctx.lineTo(x - 26, y + 24); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x + 26, y + 6); ctx.lineTo(x + 26, y + 24); ctx.stroke();
        } else if (rot === 3) {
            // DİKEY - SANDALYELER SAĞDA (270°)
            ctx.fillStyle = "#451a03";
            ctx.beginPath(); ctx.roundRect(x + 16, y - 24, 18, 16, 3); ctx.fill();
            ctx.beginPath(); ctx.roundRect(x + 16, y + 8, 18, 16, 3); ctx.fill();
            let tableGrad = ctx.createLinearGradient(x - 14, 0, x + 14, 0);
            tableGrad.addColorStop(0, '#b45309'); tableGrad.addColorStop(1, '#451a03');
            ctx.fillStyle = tableGrad; ctx.beginPath(); ctx.roundRect(x - 14, y - 44, 28, 88, 6); ctx.fill();
            ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 1.2; ctx.stroke();
            ctx.fillStyle = "#f8fafc"; ctx.fillRect(x - 14, y - 12, 28, 24);
            ctx.fillStyle = "#0284c7"; ctx.beginPath(); ctx.ellipse(x, y, 4, 6, 0, 0, Math.PI * 2); ctx.fill();
        }
    },

    // 9. MONSTERA DEV SALON BİTKİSİ (48x62)
    'bitki': function(ctx, x, y, rot, now) {
        ctx.fillStyle = "#94a3b8"; ctx.beginPath(); ctx.ellipse(x, y + 24, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
        let potGrad = ctx.createLinearGradient(x - 12, 0, x + 12, 0);
        potGrad.addColorStop(0, '#f8fafc'); potGrad.addColorStop(1, '#94a3b8');
        ctx.fillStyle = potGrad;
        ctx.beginPath(); ctx.moveTo(x - 13, y + 8); ctx.lineTo(x + 13, y + 8); ctx.lineTo(x + 10, y + 22); ctx.lineTo(x - 10, y + 22); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#451a03"; ctx.beginPath(); ctx.ellipse(x, y + 8, 12, 3.5, 0, 0, Math.PI * 2); ctx.fill();
        // 4 Açıda farklı yaprak salınımları
        let leafOffsets = [[-12, 12], [12, -12], [-8, 8], [8, -8]][rot];
        ctx.fillStyle = "#15803d";
        ctx.beginPath(); ctx.ellipse(x + leafOffsets[0], y - 4, 13, 8, -0.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + leafOffsets[1], y - 6, 13, 8, 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#16a34a"; ctx.beginPath(); ctx.ellipse(x - 2, y - 16, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#22c55e"; ctx.beginPath(); ctx.ellipse(x + 4, y - 22, 9, 6, 0.3, 0, Math.PI * 2); ctx.fill();
    },

    // 10. RGB GAMING BATTLESTATION (88x64 / 52x64)
    'bilgisayar': function(ctx, x, y, rot, now) {
        let rgbHue = (now / 20) % 360;
        if (rot === 0) {
            // ÖN (0°)
            ctx.fillStyle = "#1e293b"; ctx.fillRect(x - 38, y + 14, 6, 16); ctx.fillRect(x + 32, y + 14, 6, 16);
            ctx.fillStyle = "#0f172a"; ctx.beginPath(); ctx.roundRect(x - 42, y, 84, 16, 4); ctx.fill();
            ctx.strokeStyle = `hsl(${rgbHue}, 100%, 60%)`; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(x - 42, y + 16); ctx.lineTo(x + 42, y + 16); ctx.stroke();
            // RGB Kasa
            ctx.fillStyle = "#020617"; ctx.beginPath(); ctx.roundRect(x + 18, y - 26, 22, 28, 3); ctx.fill();
            ctx.fillStyle = `hsl(${rgbHue}, 100%, 65%)`; ctx.beginPath(); ctx.arc(x + 29, y - 18, 4, 0, Math.PI * 2); ctx.fill();
            // Çift Monitör
            ctx.fillStyle = "#0f172a"; ctx.beginPath(); ctx.roundRect(x - 38, y - 26, 26, 22, 3); ctx.fill();
            ctx.beginPath(); ctx.roundRect(x - 10, y - 26, 26, 22, 3); ctx.fill();
            ctx.fillStyle = '#0284c7'; ctx.fillRect(x - 36, y - 24, 22, 18);
            ctx.fillStyle = '#ec4899'; ctx.fillRect(x - 8, y - 24, 22, 18);
            // Klavye & Mouse
            ctx.fillStyle = "#020617"; ctx.fillRect(x - 22, y + 3, 20, 8);
            ctx.strokeStyle = `hsl(${(rgbHue + 180) % 360}, 100%, 65%)`; ctx.lineWidth = 1; ctx.strokeRect(x - 22, y + 3, 20, 8);
        } else if (rot === 1 || rot === 3) {
            // YAN PROFİL (90° / 270°)
            ctx.fillStyle = "#1e293b"; ctx.fillRect(x - 16, y + 10, 32, 20);
            ctx.fillStyle = "#0f172a"; ctx.fillRect(x - 18, y, 36, 12);
            ctx.strokeStyle = `hsl(${rgbHue}, 100%, 60%)`; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x - 18, y + 12); ctx.lineTo(x + 18, y + 12); ctx.stroke();
            // Monitör Yan Profili
            ctx.fillStyle = "#0f172a"; ctx.fillRect(x - 4, y - 26, 8, 26);
            ctx.fillStyle = `hsl(${rgbHue}, 100%, 65%)`; ctx.beginPath(); ctx.arc(x + 6, y - 14, 4, 0, Math.PI * 2); ctx.fill();
        } else if (rot === 2) {
            // ARKA (180° Monitör ve Oyuncu Koltuğu Arkası)
            ctx.fillStyle = "#1e293b"; ctx.fillRect(x - 38, y + 14, 76, 16);
            ctx.fillStyle = "#0f172a"; ctx.beginPath(); ctx.roundRect(x - 42, y, 84, 16, 4); ctx.fill();
            // Monitörlerin Arkası & Stand Kolları
            ctx.fillStyle = "#09090b"; ctx.beginPath(); ctx.roundRect(x - 38, y - 26, 54, 22, 3); ctx.fill();
            ctx.fillStyle = "#64748b"; ctx.fillRect(x - 13, y - 16, 6, 16);
            // RGB Kasa Arkası
            ctx.fillStyle = "#020617"; ctx.beginPath(); ctx.roundRect(x + 18, y - 26, 22, 28, 3); ctx.fill();
            ctx.fillStyle = `hsl(${rgbHue}, 100%, 65%)`; ctx.fillRect(x + 24, y - 20, 10, 12);
        }
    },

    // 11. RETRO ATARİ / ARCADE KABİNİ (56x72 / 44x72)
    'arcade': function(ctx, x, y, rot, now) {
        if (rot === 0) {
            // ÖN (0°)
            ctx.fillStyle = "#09090b"; ctx.beginPath(); ctx.roundRect(x - 24, y - 36, 48, 72, 6); ctx.fill();
            ctx.strokeStyle = "#06b6d4"; ctx.lineWidth = 2; ctx.strokeRect(x - 24, y - 36, 48, 72);
            ctx.fillStyle = "#18181b"; ctx.fillRect(x - 20, y - 32, 40, 14);
            let arcGlow = Math.sin(now / 150) * 0.2 + 0.8;
            ctx.fillStyle = `rgba(250, 204, 21, ${arcGlow})`; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
            ctx.fillText("★ ARCADE ★", x, y - 22);
            ctx.fillStyle = "#020617"; ctx.fillRect(x - 18, y - 15, 36, 26);
            ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 1; ctx.strokeRect(x - 18, y - 15, 36, 26);
            ctx.fillStyle = "#22c55e"; let alienX = x + Math.sin(now / 300) * 8; ctx.fillRect(alienX - 4, y - 10, 8, 5);
            ctx.fillStyle = "#27272a"; ctx.beginPath(); ctx.roundRect(x - 22, y + 14, 44, 12, 3); ctx.fill();
            ctx.fillStyle = "#dc2626"; ctx.beginPath(); ctx.arc(x - 12, y + 14, 3, 0, Math.PI * 2); ctx.fill();
            ["#facc15", "#22c55e", "#3b82f6"].forEach((bc, bIdx) => {
                ctx.fillStyle = bc; ctx.beginPath(); ctx.arc(x + 2 + bIdx * 6, y + 19, 2, 0, Math.PI * 2); ctx.fill();
            });
            ctx.fillStyle = "#18181b"; ctx.fillRect(x - 14, y + 28, 28, 7);
        } else if (rot === 1 || rot === 3) {
            // YAN PROFİL (90° / 270° İkonik Açılı Atari Yan Silueti)
            ctx.fillStyle = "#09090b"; ctx.beginPath(); ctx.roundRect(x - 18, y - 36, 36, 72, 6); ctx.fill();
            ctx.strokeStyle = "#06b6d4"; ctx.lineWidth = 2; ctx.strokeRect(x - 18, y - 36, 36, 72);
            // Yan Panel Pikselli Uzay Gemisi Grafiği
            ctx.fillStyle = "#ec4899"; ctx.fillRect(x - 8, y - 12, 16, 12);
            ctx.fillStyle = "#facc15"; ctx.fillRect(x - 4, y - 6, 8, 4);
        } else if (rot === 2) {
            // ARKA (180° Metal Havalandırma ve Servis Kapağı)
            ctx.fillStyle = "#09090b"; ctx.beginPath(); ctx.roundRect(x - 24, y - 36, 48, 72, 4); ctx.fill();
            ctx.strokeStyle = "#27272a"; ctx.lineWidth = 2; ctx.strokeRect(x - 24, y - 36, 48, 72);
            ctx.fillStyle = "#18181b"; ctx.fillRect(x - 18, y - 28, 36, 16);
            ctx.fillStyle = "#27272a"; ctx.fillRect(x - 16, y + 10, 32, 24);
            ctx.fillStyle = "#eab308"; ctx.fillRect(x - 2, y + 20, 4, 3); // Kilit
        }
    },

    // 12. MASİF MEŞE KÜTÜPHANE (74x80 / 40x80)
    'kitaplik': function(ctx, x, y, rot, now) {
        if (rot === 0) {
            // ÖN (0°)
            let bookGrad = ctx.createLinearGradient(0, y - 40, 0, y + 40);
            bookGrad.addColorStop(0, '#78350f'); bookGrad.addColorStop(1, '#290e03');
            ctx.fillStyle = bookGrad; ctx.beginPath(); ctx.roundRect(x - 34, y - 40, 68, 80, 5); ctx.fill();
            ctx.strokeStyle = "#ca8a04"; ctx.lineWidth = 1.5; ctx.stroke();
            [y - 14, y + 12, y + 36].forEach(sy => { ctx.fillStyle = "#92400e"; ctx.fillRect(x - 32, sy, 64, 4); });
            // Kitaplar
            ["#991b1b", "#1e3a8a", "#15803d", "#b45309", "#ca8a04", "#7c3aed"].forEach((c, i) => {
                ctx.fillStyle = c; ctx.fillRect(x - 28 + i * 7, y - 34, 5, 19);
            });
            ["#1e293b", "#7f1d1d", "#065f46", "#854d0e"].forEach((c, i) => {
                ctx.fillStyle = c; ctx.fillRect(x - 28 + i * 8, y - 9, 6, 20);
            });
        } else if (rot === 1 || rot === 3) {
            // YAN PROFİL (90° / 270°)
            let bookGrad = ctx.createLinearGradient(0, y - 40, 0, y + 40);
            bookGrad.addColorStop(0, '#78350f'); bookGrad.addColorStop(1, '#290e03');
            ctx.fillStyle = bookGrad; ctx.beginPath(); ctx.roundRect(x - 16, y - 40, 32, 80, 5); ctx.fill();
            ctx.strokeStyle = "#ca8a04"; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.fillStyle = "#92400e"; ctx.fillRect(x - 14, y - 36, 28, 4); ctx.fillRect(x - 14, y + 34, 28, 4);
        } else if (rot === 2) {
            // ARKA PANEL (180°)
            let bookGrad = ctx.createLinearGradient(0, y - 40, 0, y + 40);
            bookGrad.addColorStop(0, '#5c2306'); bookGrad.addColorStop(1, '#220800');
            ctx.fillStyle = bookGrad; ctx.beginPath(); ctx.roundRect(x - 34, y - 40, 68, 80, 4); ctx.fill();
            ctx.strokeStyle = "#78350f"; ctx.lineWidth = 1.5; ctx.stroke();
            // Panel ahşap dikişleri
            ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x, y - 38); ctx.lineTo(x, y + 38); ctx.stroke();
        }
    },

    // 13. LÜKS KUYRUKLU KONSER PİYANOSU (96x78)
    'piyano': function(ctx, x, y, rot, now) {
        if (rot === 0) {
            // ÖN/AÇILI (0°)
            ctx.fillStyle = "#09090b"; ctx.beginPath();
            ctx.moveTo(x - 42, y + 20); ctx.lineTo(x + 36, y + 20);
            ctx.quadraticCurveTo(x + 46, y, x + 40, y - 22);
            ctx.quadraticCurveTo(x + 20, y - 36, x - 20, y - 36);
            ctx.lineTo(x - 42, y - 36); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = "#ca8a04"; ctx.lineWidth = 1.5; ctx.stroke();
            // Klavye
            ctx.fillStyle = "#ffffff"; ctx.fillRect(x - 38, y + 20, 72, 8);
            ctx.fillStyle = "#09090b";
            [1, 2, 4, 5, 6, 8, 9, 11].forEach(kIdx => { ctx.fillRect(x - 36 + (kIdx - 1) * 6 + 4, y + 20, 3.5, 5); });
            // Tabure
            ctx.fillStyle = "#78350f"; ctx.fillRect(x - 16, y + 36, 32, 6);
            ctx.fillStyle = "#dc2626"; ctx.beginPath(); ctx.roundRect(x - 18, y + 33, 36, 6, 2); ctx.fill();
        } else if (rot === 1 || rot === 3) {
            // DERİNLİK PROFİLİ (90° / 270°)
            ctx.fillStyle = "#09090b"; ctx.beginPath();
            ctx.roundRect(x - 32, y - 44, 64, 88, 8); ctx.fill();
            ctx.strokeStyle = "#ca8a04"; ctx.lineWidth = 1.5; ctx.stroke();
            // Açık kapak kanadı
            ctx.fillStyle = "#b45309"; ctx.beginPath(); ctx.ellipse(x, y - 10, 18, 26, 0.2, 0, Math.PI * 2); ctx.fill();
        } else if (rot === 2) {
            // ARKA (180° Kavisli Kuyruk İzlenceye Dönük)
            ctx.fillStyle = "#09090b"; ctx.beginPath();
            ctx.roundRect(x - 42, y - 36, 84, 68, [20, 20, 6, 6]); ctx.fill();
            ctx.strokeStyle = "#ca8a04"; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.fillStyle = "#ca8a04"; ctx.fillRect(x - 32, y + 24, 6, 8); ctx.fillRect(x + 26, y + 24, 6, 8);
        }
    },

    // 14. TAZE LİMONATA STANDI (ÖZGÜN İZOMETRİK TASARIM)
    'meyve_arabasi': function(ctx, x, y, rot, now) {
        if (rot === 0) {
            // EKRAN GÖRÜNTÜSÜ 1: Açılı Ön-Sol (Tente Kemeri Sol-Üstte, Büyük Tekerlek Altta, Kulp Solda)
            // 1. Zemin tekerlekleri
            // Büyük parmaklıklı tekerlek (Alt/Sol)
            ctx.strokeStyle = "#0d9488"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(x + 10, y + 26, 15, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = "#5eead4";
            for (let i = 0; i < 8; i++) {
                let ang = i * Math.PI / 4;
                ctx.beginPath(); ctx.moveTo(x + 10, y + 26); ctx.lineTo(x + 10 + Math.cos(ang) * 14, y + 26 + Math.sin(ang) * 14); ctx.stroke();
            }
            // Küçük destek tekerleği (Sağ)
            ctx.fillStyle = "#0f766e"; ctx.beginPath(); ctx.arc(x + 42, y + 22, 6, 0, Math.PI * 2); ctx.fill();

            // 2. Yeşil Araba Gövdesi
            ctx.fillStyle = "#10b981"; ctx.beginPath(); ctx.roundRect(x - 22, y + 4, 62, 24, 6); ctx.fill();
            ctx.strokeStyle = "#047857"; ctx.lineWidth = 1.5; ctx.stroke();
            // Gövde dalga çizgisi & Taze Limonata rozeti
            ctx.fillStyle = "#34d399"; ctx.beginPath(); ctx.ellipse(x + 14, y + 16, 16, 7, -0.2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#ffffff"; ctx.font = "bold 6px sans-serif"; ctx.textAlign = "center";
            ctx.fillText("LİMONATA", x + 14, y + 18);

            // Kulp (Solda)
            ctx.strokeStyle = "#047857"; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(x - 24, y + 10, 6, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();

            // 3. Ahşap Tezgah Tablası
            ctx.fillStyle = "#84cc16"; ctx.beginPath(); ctx.roundRect(x - 24, y - 4, 66, 8, 3); ctx.fill();

            // 4. Tezgah Üzerindeki Nesneler
            // Cam Fanus (Tatlı/Meyve Kapağı)
            ctx.fillStyle = "rgba(56, 189, 248, 0.4)"; ctx.beginPath(); ctx.arc(x + 14, y - 6, 10, Math.PI, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.8)"; ctx.lineWidth = 1; ctx.stroke();
            // Şişeler (Sol)
            ctx.fillStyle = "#059669"; ctx.fillRect(x - 18, y - 14, 4, 10);
            ctx.fillStyle = "#dc2626"; ctx.fillRect(x - 12, y - 12, 3, 8);
            // Bardak Kulesi (Sağ)
            ctx.fillStyle = "#e0f2fe";
            for (let c = 0; c < 4; c++) { ctx.fillRect(x + 30, y - 8 - c * 4, 5, 3.5); }

            // 5. Tente Direkleri
            ctx.strokeStyle = "#047857"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x - 16, y - 4); ctx.lineTo(x - 16, y - 28); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x + 32, y - 4); ctx.lineTo(x + 32, y - 28); ctx.stroke();

            // 6. Çizgili Tente (Mint Yeşili & Turkuaz Çizgiler, Kemerli Kubbe Sol-Üstte)
            ctx.fillStyle = "#86efac"; ctx.beginPath(); ctx.roundRect(x - 26, y - 56, 64, 30, [16, 6, 6, 6]); ctx.fill();
            ctx.fillStyle = "#67e8f9";
            for (let s = 0; s < 4; s++) { ctx.fillRect(x - 22 + s * 14, y - 56, 7, 30); }
            // Tente dalgalı alt bordür
            ctx.fillStyle = "#4ade80";
            for (let w = 0; w < 6; w++) {
                ctx.beginPath(); ctx.arc(x - 21 + w * 10, y - 26, 5, 0, Math.PI); ctx.fill();
            }

        } else if (rot === 1) {
            // EKRAN GÖRÜNTÜSÜ 2: 90° Dönmüş (Kara Tahta "%100 Organik" Sağ-Önde, Tente Kemeri Sağda)
            // Büyük ve küçük tekerlekler
            ctx.strokeStyle = "#0d9488"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(x - 14, y + 24, 14, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = "#0f766e"; ctx.beginPath(); ctx.arc(x + 16, y + 24, 6, 0, Math.PI * 2); ctx.fill();

            // Yeşil Gövde (Sol taraf Mutlu Meyve, Sağ kısa kenar Kara Tahta)
            ctx.fillStyle = "#10b981"; ctx.beginPath(); ctx.roundRect(x - 24, y + 4, 48, 22, 5); ctx.fill();
            // Kısa kenar Kara Tahta (%100 Organik)
            ctx.fillStyle = "#064e3b"; ctx.fillRect(x + 4, y + 6, 18, 16);
            ctx.strokeStyle = "#34d399"; ctx.lineWidth = 1; ctx.strokeRect(x + 4, y + 6, 18, 16);
            ctx.fillStyle = "#ffffff"; ctx.font = "bold 5px sans-serif"; ctx.textAlign = "center";
            ctx.fillText("Buz Gibi", x + 13, y + 13);
            ctx.fillText("15 TL", x + 13, y + 19);

            // Ahşap Tezgah
            ctx.fillStyle = "#84cc16"; ctx.beginPath(); ctx.roundRect(x - 26, y - 4, 52, 8, 3); ctx.fill();
            // Cam Fanus
            ctx.fillStyle = "rgba(56, 189, 248, 0.4)"; ctx.beginPath(); ctx.arc(x + 6, y - 6, 8, Math.PI, Math.PI * 2); ctx.fill();

            // Tente Direkleri
            ctx.strokeStyle = "#047857"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x - 18, y - 4); ctx.lineTo(x - 18, y - 28); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x + 18, y - 4); ctx.lineTo(x + 18, y - 28); ctx.stroke();

            // Tente (Kubbe/Kemer Sağda)
            ctx.fillStyle = "#86efac"; ctx.beginPath(); ctx.roundRect(x - 24, y - 56, 52, 30, [6, 16, 6, 6]); ctx.fill();
            ctx.fillStyle = "#67e8f9";
            for (let s = 0; s < 3; s++) { ctx.fillRect(x - 20 + s * 14, y - 56, 7, 30); }

        } else if (rot === 2) {
            // EKRAN GÖRÜNTÜSÜ 3: 180° Dönmüş (Kara Tahta "%100 Organik" Sol-Önde, Büyük Tekerlek Sağda)
            ctx.strokeStyle = "#0d9488"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(x + 14, y + 24, 14, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = "#0f766e"; ctx.beginPath(); ctx.arc(x - 16, y + 24, 6, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = "#10b981"; ctx.beginPath(); ctx.roundRect(x - 24, y + 4, 48, 22, 5); ctx.fill();
            // Kara Tahta Solda
            ctx.fillStyle = "#064e3b"; ctx.fillRect(x - 22, y + 6, 18, 16);
            ctx.strokeStyle = "#34d399"; ctx.lineWidth = 1; ctx.strokeRect(x - 22, y + 6, 18, 16);
            ctx.fillStyle = "#ffffff"; ctx.font = "bold 5px sans-serif"; ctx.textAlign = "center";
            ctx.fillText("Buz Gibi", x - 13, y + 13);
            ctx.fillText("15 TL", x - 13, y + 19);

            ctx.fillStyle = "#84cc16"; ctx.beginPath(); ctx.roundRect(x - 26, y - 4, 52, 8, 3); ctx.fill();
            ctx.fillStyle = "rgba(56, 189, 248, 0.4)"; ctx.beginPath(); ctx.arc(x - 6, y - 6, 8, Math.PI, Math.PI * 2); ctx.fill();

            ctx.strokeStyle = "#047857"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x - 18, y - 4); ctx.lineTo(x - 18, y - 28); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x + 18, y - 4); ctx.lineTo(x + 18, y - 28); ctx.stroke();

            ctx.fillStyle = "#86efac"; ctx.beginPath(); ctx.roundRect(x - 26, y - 56, 52, 30, [16, 6, 6, 6]); ctx.fill();
            ctx.fillStyle = "#67e8f9";
            for (let s = 0; s < 3; s++) { ctx.fillRect(x - 22 + s * 14, y - 56, 7, 30); }

        } else if (rot === 3) {
            // EKRAN GÖRÜNTÜSÜ 4: 270° Dönmüş (Araba Arkası, İtme Kulpu Sol-Önde, Tente Kemeri Sağ-Üstte)
            ctx.strokeStyle = "#0d9488"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(x + 12, y + 24, 14, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = "#0f766e"; ctx.beginPath(); ctx.arc(x - 24, y + 22, 6, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = "#059669"; ctx.beginPath(); ctx.roundRect(x - 28, y + 4, 58, 22, 5); ctx.fill();
            // İtme Kulpu
            ctx.strokeStyle = "#047857"; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(x - 30, y + 10, 6, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();

            ctx.fillStyle = "#65a30d"; ctx.beginPath(); ctx.roundRect(x - 30, y - 4, 62, 8, 3); ctx.fill();

            ctx.strokeStyle = "#047857"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x - 20, y - 4); ctx.lineTo(x - 20, y - 28); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x + 24, y - 4); ctx.lineTo(x + 24, y - 28); ctx.stroke();

            ctx.fillStyle = "#86efac"; ctx.beginPath(); ctx.roundRect(x - 30, y - 56, 60, 30, [6, 16, 6, 6]); ctx.fill();
            ctx.fillStyle = "#67e8f9";
            for (let s = 0; s < 4; s++) { ctx.fillRect(x - 26 + s * 14, y - 56, 7, 30); }
        }
    }
};
