// public/js/chatBubbles.js - Konuşma Baloncukları, Hızlı Emoji ve Yan Panel Sohbeti

let activeChatBubbles = {};
let chatMessagesLog = [];
const MAX_CHAT_LOG = 15;
let activePlayerEmojis = {};

function appendChatMessageToHistory(name, msg) {
    const historyDiv = document.getElementById('chatHistory');
    if (!historyDiv) return;

    let line = document.createElement('div');
    line.style.wordBreak = 'break-word';
    line.style.margin = '2px 0';

    let b = document.createElement('b');
    b.textContent = name + ': ';
    line.appendChild(b);

    let span = document.createElement('span');
    span.textContent = msg;
    line.appendChild(span);

    historyDiv.appendChild(line);

    while (historyDiv.children.length > MAX_CHAT_LOG) {
        historyDiv.removeChild(historyDiv.firstChild);
    }
    historyDiv.scrollTop = historyDiv.scrollHeight;
}

function renderChatHistory() {
    const historyDiv = document.getElementById('chatHistory');
    if (!historyDiv) return;
    historyDiv.innerHTML = "";
    chatMessagesLog.forEach(item => {
        appendChatMessageToHistory(item.name, item.msg);
    });
}

function sendSideChat() {
    const input = document.getElementById('sideChatInput');
    if (!input) return;
    let msg = input.value.trim();
    if (msg.length > 50) {
        msg = msg.substring(0, 50);
    }
    if (msg !== "" && window.socket) {
        window.socket.emit('chatMessage', msg);
        input.value = "";
        updateChatCharCounter();
    }
}

function updateChatCharCounter() {
    const input = document.getElementById('sideChatInput');
    const counter = document.getElementById('chatCharCounter');
    if (input && counter) {
        counter.textContent = `${input.value.length}/50`;
    }
}

function sendQuickEmoji(emoji) {
    if (!window.socket || !emoji) return;
    window.socket.emit('playerEmoji', emoji);
    if (typeof myId !== 'undefined' && myId) {
        activePlayerEmojis[myId] = { emoji: emoji, start: Date.now() };
    }
}

// Ayarlar Penceresi (SFX, Müzik, Sesli Sohbet)
function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;
    modal.style.display = 'flex';
    if (typeof getAudioSettings === 'function') {
        const audioSettings = getAudioSettings();
        const sfxSlider = document.getElementById('sfxVolumeSlider');
        const sfxVal = document.getElementById('sfxVolumeVal');
        const musSlider = document.getElementById('musicVolumeSlider');
        const musVal = document.getElementById('musicVolumeVal');
        if (sfxSlider) {
            sfxSlider.value = Math.round(audioSettings.sfx * 100);
            if (sfxVal) sfxVal.innerText = `${sfxSlider.value}%`;
        }
        if (musSlider) {
            musSlider.value = Math.round(audioSettings.music * 100);
            if (musVal) musVal.innerText = `${musSlider.value}%`;
        }
    }
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;
    modal.style.display = 'none';
}

function handleSfxVolumeChange(val) {
    const label = document.getElementById('sfxVolumeVal');
    if (label) label.innerText = `${val}%`;
    if (typeof setSfxVolume === 'function') {
        setSfxVolume(val / 100);
    }
}

function handleMusicVolumeChange(val) {
    const label = document.getElementById('musicVolumeVal');
    if (label) label.innerText = `${val}%`;
    if (typeof setMusicVolume === 'function') {
        setMusicVolume(val / 100);
    }
}

function handleVoiceVolumeChange(val) {
    const label = document.getElementById('voiceVolumeVal');
    if (label) label.innerText = `${val}%`;
    if (window.voiceManager && typeof window.voiceManager.setVolume === 'function') {
        window.voiceManager.setVolume(val / 100);
    }
}

function toggleChatPanel() {
    const panel = document.getElementById('sideChatContainer');
    const toggleBtn = document.getElementById('chatToggleBtn');
    if (panel.style.display === 'none') {
        panel.style.display = 'flex';
        toggleBtn.innerText = '💬 Chat Kapat';
    } else {
        panel.style.display = 'none';
        toggleBtn.innerText = '💬 Chat Aç';
    }
}

// Socket Dinleyicileri
if (window.socket) {
    window.socket.on('chatUpdate', (data) => {
        if (data.msg && data.msg.trim() !== "") {
            if (window.playSound) window.playSound('chatPop');
            let senderName = (typeof players !== 'undefined' && players[data.id]) ? players[data.id].name : "Biri";

            chatMessagesLog.push({ name: senderName, msg: data.msg });
            if (chatMessagesLog.length > MAX_CHAT_LOG) chatMessagesLog.shift();
            appendChatMessageToHistory(senderName, data.msg);

            if (!activeChatBubbles[data.id]) activeChatBubbles[data.id] = [];
            if (activeChatBubbles[data.id].length >= 4) {
                let oldBubble = activeChatBubbles[data.id].shift();
                clearTimeout(oldBubble.timer);
            }

            let timer = setTimeout(() => {
                if (activeChatBubbles[data.id]) {
                    activeChatBubbles[data.id] = activeChatBubbles[data.id].filter(b => b.timer !== timer);
                }
            }, 5000);

            activeChatBubbles[data.id].push({ text: data.msg, name: senderName, timer: timer });
        }
    });
}
