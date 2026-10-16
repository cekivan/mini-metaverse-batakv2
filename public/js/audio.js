const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Ana Ses Düzeyi Yöneticisi (Settings Paneli ile Senkron)
const sfxGainNode = audioCtx.createGain();
sfxGainNode.connect(audioCtx.destination);

const musicGainNode = audioCtx.createGain();
musicGainNode.connect(audioCtx.destination);

let sfxVolume = parseFloat(localStorage.getItem('mm_sfxVolume') ?? '0.8');
let musicVolume = parseFloat(localStorage.getItem('mm_musicVolume') ?? '0.7');
sfxGainNode.gain.setValueAtTime(sfxVolume, audioCtx.currentTime);
musicGainNode.gain.setValueAtTime(musicVolume, audioCtx.currentTime);

function setSfxVolume(val) {
    sfxVolume = Math.max(0, Math.min(1, val));
    localStorage.setItem('mm_sfxVolume', sfxVolume);
    if (sfxGainNode) sfxGainNode.gain.setValueAtTime(sfxVolume, audioCtx.currentTime);
}
window.setSfxVolume = setSfxVolume;

function setMusicVolume(val) {
    musicVolume = Math.max(0, Math.min(1, val));
    localStorage.setItem('mm_musicVolume', musicVolume);
    if (musicGainNode) musicGainNode.gain.setValueAtTime(musicVolume, audioCtx.currentTime);
}
window.setMusicVolume = setMusicVolume;

window.getAudioSettings = () => ({ sfx: sfxVolume, music: musicVolume });

// Pre-generated SFX Noise Buffers (Performans & Sıfır GC Havuzlama)
let cardNoiseBuffer = null;
let splashNoiseBuffer = null;

function initNoiseBuffers() {
    if (!audioCtx) return;
    try {
        let sampleRate = audioCtx.sampleRate || 44100;
        // Kart hışırtısı tamponu (0.08s)
        let cSize = Math.floor(sampleRate * 0.08);
        cardNoiseBuffer = audioCtx.createBuffer(1, cSize, sampleRate);
        let cData = cardNoiseBuffer.getChannelData(0);
        for (let i = 0; i < cSize; i++) {
            cData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (cSize * 0.3));
        }

        // Su şapırtısı tamponu (0.22s)
        let sSize = Math.floor(sampleRate * 0.22);
        splashNoiseBuffer = audioCtx.createBuffer(1, sSize, sampleRate);
        let sData = splashNoiseBuffer.getChannelData(0);
        for (let i = 0; i < sSize; i++) {
            sData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sSize * 0.35));
        }
    } catch (e) {
        console.warn("Noise buffer havuzlama uyarısı:", e);
    }
}
try { initNoiseBuffers(); } catch (_) {}

// Nostaljik Gramofon Melodi Döngüsü
let gramophoneLoopInterval = null;
let isGramophonePlaying = false;

function playGramophoneMusic() {
    if (isGramophonePlaying) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    isGramophonePlaying = true;

    // Nostaljik Retro Melodi Notaları (Frekanslar ve Vuruşlar)
    const melodyNotes = [
        392.00, 440.00, 523.25, 587.33, 659.25, 587.33, 523.25, 440.00,
        349.23, 392.00, 440.00, 523.25, 587.33, 523.25, 440.00, 392.00,
        329.63, 392.00, 440.00, 523.25, 659.25, 783.99, 659.25, 523.25,
        587.33, 659.25, 587.33, 523.25, 440.00, 392.00, 329.63, 261.63
    ];
    let noteIdx = 0;

    function playNextNote() {
        if (!isGramophonePlaying) return;
        let freq = melodyNotes[noteIdx % melodyNotes.length];
        noteIdx++;

        let now = audioCtx.currentTime;
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();

        // Hafif nostaljik plak/müzik kutusu tınısı (warm sine + slight vibrato)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

        osc.connect(gain);
        gain.connect(musicGainNode);

        osc.start(now);
        osc.stop(now + 0.40);
    }

    playNextNote();
    gramophoneLoopInterval = setInterval(playNextNote, 240);
}
window.playGramophoneMusic = playGramophoneMusic;

function stopGramophoneMusic() {
    isGramophonePlaying = false;
    if (gramophoneLoopInterval) {
        clearInterval(gramophoneLoopInterval);
        gramophoneLoopInterval = null;
    }
}
window.stopGramophoneMusic = stopGramophoneMusic;

// Kullanıcı etkileşiminde (tıklama/tuş) AudioContext'i otomatik uyandırma
const unlockAudio = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
};
['click', 'keydown', 'touchstart'].forEach(evt => window.addEventListener(evt, unlockAudio, { once: true, passive: true }));

function playSound(type) {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    try {
        if (type === 'footstep') {
            // Ritmik, hafif ve doğal zemin adım sesi
            let osc = audioCtx.createOscillator();
            let gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(100 + Math.random() * 25, now);
            osc.frequency.exponentialRampToValueAtTime(45, now + 0.035);

            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

            osc.connect(gain);
            gain.connect(sfxGainNode);
            osc.start(now);
            osc.stop(now + 0.04);
        }
        else if (type === 'card') {
            // İskambil kart atma / hışırtı sesi (Havuzlanmış tampon)
            if (!cardNoiseBuffer) initNoiseBuffers();
            let noise = audioCtx.createBufferSource();
            noise.buffer = cardNoiseBuffer;
            let filter = audioCtx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1200, now);
            filter.Q.setValueAtTime(2, now);

            let gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(sfxGainNode);
            noise.start(now);
        }
        else if (type === 'billiardHit') {
            // Bilardo toplarının çarpışma sesi (tok reçine sesi)
            let osc = audioCtx.createOscillator();
            let gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1800, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

            osc.connect(gain);
            gain.connect(sfxGainNode);
            osc.start(now);
            osc.stop(now + 0.05);
        }
        else if (type === 'cueShoot') {
            // Istaka vuruş sesi
            let osc = audioCtx.createOscillator();
            let gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(450, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            osc.connect(gain);
            gain.connect(sfxGainNode);
            osc.start(now);
            osc.stop(now + 0.08);
        }
        else if (type === 'pocket') {
            // Topun cebe düşme sesi
            let osc = audioCtx.createOscillator();
            let gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);

            gain.gain.setValueAtTime(0.6, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

            osc.connect(gain);
            gain.connect(sfxGainNode);
            osc.start(now);
            osc.stop(now + 0.15);
        }
        else if (type === 'chatPop') {
            // Sohbet balonu patlama sesi
            let osc = audioCtx.createOscillator();
            let gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(950, now + 0.06);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

            osc.connect(gain);
            gain.connect(sfxGainNode);
            osc.start(now);
            osc.stop(now + 0.07);
        }
        else if (type === 'win') {
            // El kazanma sevinç melodisi
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
                let osc = audioCtx.createOscillator();
                let gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.08);
                gain.gain.setValueAtTime(0.2, now + idx * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.2);
                osc.connect(gain);
                gain.connect(sfxGainNode);
                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + 0.2);
            });
        }
        else if (type === 'splash') {
            // Su şapırtısı sesi (balık vurma / olta atma - Havuzlanmış tampon)
            if (!splashNoiseBuffer) initNoiseBuffers();
            let noise = audioCtx.createBufferSource();
            noise.buffer = splashNoiseBuffer;
            let filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(550, now);
            filter.frequency.exponentialRampToValueAtTime(90, now + 0.22);
            let gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0.45, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(sfxGainNode);
            noise.start(now);
        }
        else if (type === 'reel') {
            // Olta sarma dişli tıkırtısı
            for (let i = 0; i < 5; i++) {
                let osc = audioCtx.createOscillator();
                let gain = audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(1300 + i * 160, now + i * 0.04);
                gain.gain.setValueAtTime(0.18, now + i * 0.04);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.025);
                osc.connect(gain);
                gain.connect(sfxGainNode);
                osc.start(now + i * 0.04);
                osc.stop(now + i * 0.04 + 0.025);
            }
        }
        else if (type === 'coin') {
            // Para kazanma şıngırtısı
            [1046.50, 1318.51, 1567.98].forEach((freq, idx) => {
                let osc = audioCtx.createOscillator();
                let gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.06);
                gain.gain.setValueAtTime(0.25, now + idx * 0.06);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.2);
                osc.connect(gain);
                gain.connect(sfxGainNode);
                osc.start(now + idx * 0.06);
                osc.stop(now + idx * 0.06 + 0.2);
            });
        }
        else if (type === 'okeyTile') {
            // Okey taşı vurma / çekme / masaya atma sesi (tok melamin 'tak' sesi)
            let osc = audioCtx.createOscillator();
            let gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(860, now);
            osc.frequency.exponentialRampToValueAtTime(140, now + 0.045);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.connect(gain);
            gain.connect(sfxGainNode);
            osc.start(now);
            osc.stop(now + 0.05);
        }
        else if (type === 'tick') {
            // Süre sayacı tik-tak sesi
            let osc = audioCtx.createOscillator();
            let gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.03);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
            osc.connect(gain);
            gain.connect(sfxGainNode);
            osc.start(now);
            osc.stop(now + 0.03);
        }
        else if (type === 'fanfare') {
            // Zafer & Okey Bitiş Fanfarı
            [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, idx) => {
                let osc = audioCtx.createOscillator();
                let gain = audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.09);
                gain.gain.setValueAtTime(0.3, now + idx * 0.09);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.35);
                osc.connect(gain);
                gain.connect(sfxGainNode);
                osc.start(now + idx * 0.09);
                osc.stop(now + idx * 0.09 + 0.35);
            });
        }
        else if (type === 'miracle') {
            // Mucizevi İlahi Göksel İniş Melodisi (Harp / Celestial Chime)
            [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00].forEach((freq, idx) => {
                let osc = audioCtx.createOscillator();
                let gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.07);
                gain.gain.setValueAtTime(0.22, now + idx * 0.07);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.5);
                osc.connect(gain);
                gain.connect(sfxGainNode);
                osc.start(now + idx * 0.07);
                osc.stop(now + idx * 0.07 + 0.5);
            });
        }
        else if (type === 'nom' || type === 'gulp') {
            // Çizgi film "Ham / Çomp / Yutma" Komik Sesi
            let osc = audioCtx.createOscillator();
            let gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(280, now);
            osc.frequency.exponentialRampToValueAtTime(650, now + 0.08);
            osc.frequency.exponentialRampToValueAtTime(180, now + 0.18);
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.connect(gain);
            gain.connect(sfxGainNode);
            osc.start(now);
            osc.stop(now + 0.2);
        }
        else if (type === 'turn' || type === 'turnBell') {
            // Kullanıcı Talebi: Oyunlardaki gibi sıranın geldiğini bildiren iki tonlu şık ding-dong melodisi
            [880.00, 1174.66].forEach((freq, idx) => {
                let osc = audioCtx.createOscillator();
                let gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.1);
                gain.gain.setValueAtTime(0.3, now + idx * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35);
                osc.connect(gain);
                gain.connect(sfxGainNode);
                osc.start(now + idx * 0.1);
                osc.stop(now + idx * 0.1 + 0.35);
            });
        }
        else if (type === 'smokeBlast') {
            // Yoğun nargile dumanı patlama ve gürleme efekti
            let osc = audioCtx.createOscillator();
            let gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(120, now);
            osc.frequency.exponentialRampToValueAtTime(45, now + 0.5);
            gain.gain.setValueAtTime(0.45, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.connect(gain);
            gain.connect(sfxGainNode);
            osc.start(now);
            osc.stop(now + 0.5);
        }
    } catch(e) {
        // Tarayıcı otomatik ses engeli durumunda sessizce devam eder
    }
}

window.playSound = playSound;
