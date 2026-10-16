// public/js/cocktailBar.js - Tropik Sahil Barı ve Kokteyl Menüsü İstemcisi

const COCKTAIL_ITEMS = [
    { id: 'coconut', name: 'Tropik Hindistan Cevizi Kokteyli', price: 25, icon: '🥥', desc: 'Buzlu, taze hindistan cevizi suyu, pipetli egzotik kokteyl.' },
    { id: 'pineapple', name: 'Buzlu Ananaslı Frappé', price: 30, icon: '🍍', desc: 'Ferahlatıcı tropik ananas ve nane karışımı.' },
    { id: 'mojito', name: 'Çilekli Sahil Mojito', price: 35, icon: '🍓', desc: 'Nane yaprakları ve taze çilek aromalı plaj kokteyli.' },
    { id: 'sunset', name: 'Sunset Horizon (Güneş Batımı)', price: 45, icon: '🍹', desc: 'Portakal, nar ve buzlu şurup katmanlı lüks kokteyl.' },
    { id: 'lemonade', name: 'Buzlu Nane & Limonata', price: 20, icon: '🍋', desc: 'Buz gibi ferahlatıcı plaj limonatası.' }
];

function ensureCocktailBarModal() {
    if (document.getElementById('cocktailBarModal')) return;

    const modal = document.createElement('div');
    modal.id = 'cocktailBarModal';
    modal.style.cssText = `
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.75);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 36000;
        align-items: center;
        justify-content: center;
        padding: 16px;
        box-sizing: border-box;
    `;

    modal.innerHTML = `
        <div style="background: linear-gradient(145deg, #0f172a, #1e293b); border: 2px solid #ca8a04; border-radius: 20px; width: 100%; max-width: 480px; box-shadow: 0 25px 60px rgba(0,0,0,0.85); overflow: hidden; display: flex; flex-direction: column;">
            <!-- Başlık -->
            <div style="padding: 16px 20px; background: linear-gradient(90deg, #78350f, #92400e); border-bottom: 2px solid #ca8a04; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 26px;">🍹</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; font-weight: 800; color: #fef08a; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">Tropik Sahil Barı</h2>
                        <p style="margin: 2px 0 0 0; font-size: 11px; color: #fde68a;">Buz gibi ferahlatıcı sahil kokteylleri ve egzotik içecekler</p>
                    </div>
                </div>
                <button type="button" onclick="closeCocktailBarModal()" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); color: white; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;">✕</button>
            </div>

            <!-- Kokteyl Listesi -->
            <div style="padding: 16px; display: flex; flex-direction: column; gap: 10px; max-height: 60vh; overflow-y: auto;">
                ${COCKTAIL_ITEMS.map(item => `
                    <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(202, 138, 4, 0.35); border-radius: 14px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; transition: all 0.2s;" onmouseenter="this.style.borderColor='#facc15'; this.style.background='rgba(51, 65, 85, 0.8)'" onmouseleave="this.style.borderColor='rgba(202, 138, 4, 0.35)'; this.style.background='rgba(30, 41, 59, 0.7)'">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="font-size: 28px; background: rgba(0,0,0,0.25); width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.1);">${item.icon}</div>
                            <div>
                                <div style="font-weight: 800; font-size: 14px; color: #ffffff;">${item.name}</div>
                                <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">${item.desc}</div>
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px; min-width: 80px;">
                            <span style="font-weight: 900; font-size: 14px; color: #facc15;">${item.price} TL</span>
                            <button onclick="orderCocktail('${item.id}')" style="background: linear-gradient(135deg, #f59e0b, #d97706); border: none; color: #0f172a; font-weight: 800; font-size: 12px; padding: 6px 12px; border-radius: 8px; cursor: pointer; box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);">Sipariş Ver</button>
                        </div>
                    </div>
                `).join('')}
            </div>

            <!-- Alt Kısım -->
            <div style="padding: 12px 20px; background: rgba(0,0,0,0.3); border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px; color: #94a3b8;">Bar Sandalyesine oturduğunda menü otomatik açılır</span>
                <button onclick="closeCocktailBarModal()" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 7px 16px; border-radius: 8px; font-weight: 600; font-size: 12px; cursor: pointer;">Kapat</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeCocktailBarModal();
    });
}

function openCocktailBarModal() {
    ensureCocktailBarModal();
    const modal = document.getElementById('cocktailBarModal');
    if (modal) {
        modal.style.display = 'flex';
        if (window.playSound) window.playSound('click');
    }
}
window.openCocktailBarModal = openCocktailBarModal;

function closeCocktailBarModal() {
    const modal = document.getElementById('cocktailBarModal');
    if (modal) modal.style.display = 'none';
}
window.closeCocktailBarModal = closeCocktailBarModal;

function orderCocktail(itemId) {
    if (window.socket) {
        window.socket.emit('buyCocktail', { id: itemId });
    }
}
window.orderCocktail = orderCocktail;

// Satın alma bildirimi dinleyicisi
if (typeof socket !== 'undefined' && socket) {
    socket.on('cocktailPurchasedSuccess', (item) => {
        if (window.playSound) window.playSound('coins');
        closeCocktailBarModal();
    });
}
