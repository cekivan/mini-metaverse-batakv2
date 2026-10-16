// src/adManager.js - Canlı Reklam Panosu ve TV Ağı Motoru (Billboard & TV Network)
const dataManager = require('./dataManager');

class AdManager {
    constructor() {
        this.activeAd = null; // { id, username, text, expiresAt, secondsLeft }
        this.queue = [];      // [{ id, username, text, duration: 60 }]
        this.adTimer = null;
        this.io = null;
        this.players = null;
        this.AD_PRICE = 1000;
        this.AD_DURATION_SEC = 60;
    }

    init(io, players) {
        this.io = io;
        this.players = players;
        this.startTimer();
    }

    startTimer() {
        if (this.adTimer) clearInterval(this.adTimer);
        this.adTimer = setInterval(() => {
            this.tick();
        }, 1000);
    }

    tick() {
        if (this.activeAd) {
            let left = Math.ceil((this.activeAd.expiresAt - Date.now()) / 1000);
            if (left <= 0) {
                // Mevcut reklamın 1 dakikalık süresi doldu!
                this.activeAd = null;
                this.advanceQueue();
            } else {
                this.activeAd.secondsLeft = left;
                this.broadcastState();
            }
        } else if (this.queue.length > 0) {
            this.advanceQueue();
        }
    }

    advanceQueue() {
        if (this.queue.length > 0) {
            let next = this.queue.shift();
            this.activeAd = {
                id: next.id,
                username: next.username,
                text: next.text,
                expiresAt: Date.now() + this.AD_DURATION_SEC * 1000,
                secondsLeft: this.AD_DURATION_SEC
            };
            if (this.io) {
                this.io.emit('systemMessage', `📢 [${this.activeAd.username}] kullanıcısının reklamı panolarda ve tüm televizyonlarda yayında!`);
            }
            this.broadcastState();
        } else {
            this.activeAd = null;
            this.broadcastState();
        }
    }

    broadcastState() {
        if (!this.io) return;
        this.io.emit('billboardAdUpdate', this.getState());
    }

    getState() {
        return {
            activeAd: this.activeAd ? {
                username: this.activeAd.username,
                text: this.activeAd.text,
                secondsLeft: this.activeAd.secondsLeft
            } : null,
            queueLength: this.queue.length,
            adPrice: this.AD_PRICE,
            adDuration: this.AD_DURATION_SEC
        };
    }

    handleClientConnect(socket) {
        socket.emit('billboardAdUpdate', this.getState());
    }

    submitAd(socket, text) {
        if (!this.players || !this.players[socket.id]) {
            socket.emit('billboardAdError', "Oturum açmadınız!");
            return;
        }

        const player = this.players[socket.id];
        const username = player.name;

        // Bakiye kontrolü
        let currentMoney = (player.money !== undefined) ? player.money : 0;
        if (currentMoney < this.AD_PRICE) {
            socket.emit('billboardAdError', `Yetersiz bakiye! Reklam vermek için ${this.AD_PRICE} TL gereklidir. Bakiyeniz: ${currentMoney} TL.`);
            return;
        }

        // Metin sanitizasyonu ve uzunluk kontrolü
        let cleanText = (typeof text === 'string') ? text.trim() : '';
        if (cleanText.length < 3) {
            socket.emit('billboardAdError', "Reklam metni en az 3 karakter olmalıdır!");
            return;
        }
        if (cleanText.length > 60) {
            cleanText = cleanText.substring(0, 60);
        }

        // Küfür/Spam temel temizliği
        cleanText = dataManager.sanitizeString ? dataManager.sanitizeString(cleanText, 60) : cleanText;

        // Para düşümü
        player.money -= this.AD_PRICE;
        let uData = dataManager.persistentData.users[username];
        if (uData) {
            uData.money = player.money;
            dataManager.savePersistentData();
        }

        socket.emit('updateMoney', player.money);

        // Reklam kuyruğuna ekle (FIFO)
        let adEntry = {
            id: 'ad_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            username: username,
            text: cleanText,
            duration: this.AD_DURATION_SEC
        };

        let queuePos = this.activeAd ? this.queue.length + 1 : 0;
        this.queue.push(adEntry);

        socket.emit('billboardAdSuccess', {
            message: queuePos === 0
                ? "🎉 Reklamınız hemen yayına alındı!"
                : `⏳ Reklamınız sıraya alındı! Sırada ${queuePos}. sıradasınız (Her reklam 1 dk döner).`,
            queuePos: queuePos
        });

        // Eğer şu anda aktif reklam yoksa hemen yayına al
        if (!this.activeAd) {
            this.advanceQueue();
        } else {
            this.broadcastState();
        }
    }
}

const adManager = new AdManager();
module.exports = adManager;
