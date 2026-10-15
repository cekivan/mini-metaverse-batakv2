// public/js/voiceChat.js - WebRTC Tabanlı Masa İçi Canlı Sesli Sohbet Motoru (Peer-to-Peer Voice Chat)

(function () {
    const RTC_CONFIG = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
        ]
    };

    let localVoiceStream = null;
    let currentVoiceTableId = null;
    let isVoiceConnected = false;
    let isMicMuted = false;
    let peerConnections = {};      // remoteSocketId -> RTCPeerConnection
    let remoteAudioElements = {};  // remoteSocketId -> HTMLAudioElement
    let vadInterval = null;
    let audioContext = null;
    let analyser = null;
    let isSpeakingLocal = false;
    let speakingPeers = new Set(); // socketIds currently speaking

    // 1. Masaya Bağlanıldığında Ses Kanalı Hazırlığı
    function setVoiceTable(tableId) {
        if (!tableId) return;
        if (currentVoiceTableId && currentVoiceTableId !== tableId) {
            leaveTableVoiceChat();
        }
        currentVoiceTableId = tableId;
        updateVoiceButtonUI();
    }
    window.setVoiceTable = setVoiceTable;

    // 2. Sesli Sohbeti Aç / Kapat / Sessize Al Toggle
    async function toggleTableVoiceChat() {
        if (!currentVoiceTableId) {
            // Eğer aktif masa ID'si window üzerinden varsa al
            currentVoiceTableId = window.currentActiveTableId || (window.okey101Data ? window.okey101Data.tableId : null);
            if (!currentVoiceTableId) {
                showVoiceToast("⚠️ Önce bir oyun masasına oturmalısınız!");
                return;
            }
        }

        if (!isVoiceConnected) {
            // Sesli sohbete bağlan
            await joinTableVoiceChat();
        } else {
            // Zaten bağlıysa: Mikrofonu Aç/Kapat (Mute/Unmute)
            toggleMicMute();
        }
    }
    window.toggleTableVoiceChat = toggleTableVoiceChat;

    // 3. Masanın Sesli Sohbet Kanalına Katıl
    async function joinTableVoiceChat() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showVoiceToast("⚠️ Tarayıcınız sesli sohbeti (WebRTC) desteklemiyor.");
            return;
        }

        try {
            showVoiceToast("🎤 Mikrofon açılıyor, lütfen tarayıcı iznini onaylayın...");
            localVoiceStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });
        } catch (err) {
            console.error("Mikrofon izni alınamadı:", err);
            let msg = "⚠️ Mikrofon izni verilmedi veya mikrofon bulunamadı!";
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                msg = "⚠️ Mikrofon izni engellendi! Lütfen adres çubuğundaki kilit simgesinden mikrofona izin verin.";
            }
            showVoiceToast(msg);
            return;
        }

        isVoiceConnected = true;
        isMicMuted = false;

        // VAD (Voice Activity Detection - Konuşma Algılama) Başlat
        startVoiceActivityDetection();

        // Sunucuya ses odasına katıldığımızı bildir
        socket.emit('voiceJoinRoom', { tableId: currentVoiceTableId });

        updateVoiceButtonUI();
        showVoiceToast("✅ Sesli sohbete bağlandınız! Masadakilerle konuşabilirsiniz.");
    }
    window.joinTableVoiceChat = joinTableVoiceChat;

    // 4. Mikrofonu Sessize Al / Aç (Mute / Unmute)
    function toggleMicMute() {
        if (!localVoiceStream) return;
        isMicMuted = !isMicMuted;
        localVoiceStream.getAudioTracks().forEach(track => {
            track.enabled = !isMicMuted;
        });

        if (isMicMuted && isSpeakingLocal) {
            isSpeakingLocal = false;
            socket.emit('voiceSpeaking', { tableId: currentVoiceTableId, isSpeaking: false });
            updateSpeakingUI(socket.id, false);
        }

        updateVoiceButtonUI();
        showVoiceToast(isMicMuted ? "🔇 Mikrofonunuz sessize alındı." : "🎙️ Mikrofonunuz açıldı.");
    }
    window.toggleMicMute = toggleMicMute;

    // 5. Sesli Sohbetten Tamamen Ayrıl
    function leaveTableVoiceChat() {
        if (!isVoiceConnected && !currentVoiceTableId) return;

        if (vadInterval) {
            clearInterval(vadInterval);
            vadInterval = null;
        }

        if (audioContext && audioContext.state !== 'closed') {
            try { audioContext.close(); } catch (e) {}
            audioContext = null;
        }

        if (localVoiceStream) {
            localVoiceStream.getTracks().forEach(t => t.stop());
            localVoiceStream = null;
        }

        // Tüm peer bağlantılarını temizle
        for (let pid in peerConnections) {
            try { peerConnections[pid].close(); } catch (e) {}
        }
        peerConnections = {};

        // Uzak ses etiketlerini temizle
        for (let pid in remoteAudioElements) {
            if (remoteAudioElements[pid]) {
                remoteAudioElements[pid].srcObject = null;
                remoteAudioElements[pid].remove();
            }
        }
        remoteAudioElements = {};

        speakingPeers.clear();

        if (currentVoiceTableId) {
            socket.emit('voiceLeaveRoom', { tableId: currentVoiceTableId });
        }

        isVoiceConnected = false;
        isMicMuted = false;
        isSpeakingLocal = false;

        updateVoiceButtonUI();
        updateSpeakingUI(socket.id, false);
    }
    window.leaveTableVoiceChat = leaveTableVoiceChat;

    // 6. Konuşma Algılama (Voice Activity Detection - VAD)
    function startVoiceActivityDetection() {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(localVoiceStream);
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            vadInterval = setInterval(() => {
                if (!localVoiceStream || isMicMuted) {
                    if (isSpeakingLocal) {
                        isSpeakingLocal = false;
                        socket.emit('voiceSpeaking', { tableId: currentVoiceTableId, isSpeaking: false });
                        updateSpeakingUI(socket.id, false);
                    }
                    return;
                }

                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                let average = sum / bufferLength;

                let speaking = average > 18; // Konuşma hassasiyet eşiği
                if (speaking !== isSpeakingLocal) {
                    isSpeakingLocal = speaking;
                    socket.emit('voiceSpeaking', { tableId: currentVoiceTableId, isSpeaking: speaking });
                    updateSpeakingUI(socket.id, speaking);
                }
            }, 120);
        } catch (e) {
            console.error("VAD başlatma hatası:", e);
        }
    }

    // 7. WebRTC Peer Connection Oluşturucu
    function createPeerConnection(remoteSocketId, isInitiator) {
        if (peerConnections[remoteSocketId]) {
            try { peerConnections[remoteSocketId].close(); } catch (e) {}
        }

        const pc = new RTCPeerConnection(RTC_CONFIG);
        peerConnections[remoteSocketId] = pc;

        // Yerel ses kanalını ekle
        if (localVoiceStream) {
            localVoiceStream.getAudioTracks().forEach(track => {
                pc.addTrack(track, localVoiceStream);
            });
        }

        // ICE Adayları Gönderimi
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('voiceSignal', {
                    to: remoteSocketId,
                    signal: { type: 'candidate', candidate: event.candidate }
                });
            }
        };

        // Karşıdan Gelen Sesi Dinle ve Çal
        pc.ontrack = (event) => {
            let remoteStream = event.streams[0];
            let audioEl = remoteAudioElements[remoteSocketId];
            if (!audioEl) {
                audioEl = document.createElement('audio');
                audioEl.id = `remoteAudio_${remoteSocketId}`;
                audioEl.autoplay = true;
                audioEl.playsInline = true;
                document.body.appendChild(audioEl);
                remoteAudioElements[remoteSocketId] = audioEl;
            }
            audioEl.srcObject = remoteStream;
            audioEl.play().catch(e => {
                console.log("Ses otomatik oynatma engeli (kullanıcı etkileşimi gerekebilir):", e);
            });
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                if (remoteAudioElements[remoteSocketId]) {
                    remoteAudioElements[remoteSocketId].srcObject = null;
                    remoteAudioElements[remoteSocketId].remove();
                    delete remoteAudioElements[remoteSocketId];
                }
                updateSpeakingUI(remoteSocketId, false);
            }
        };

        if (isInitiator) {
            pc.onnegotiationneeded = async () => {
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    socket.emit('voiceSignal', {
                        to: remoteSocketId,
                        signal: { type: 'offer', sdp: pc.localDescription }
                    });
                } catch (err) {
                    console.error("Offer oluşturma hatası:", err);
                }
            };
        }

        return pc;
    }

    // --- SOKET DİNLEYİCİLERİ ---

    // Odadaki Mevcut Kullanıcıların Listesi Geldiğinde (Ben yeni katıldım)
    socket.on('voicePeersList', ({ tableId, peers }) => {
        if (!peers || peers.length === 0) return;
        peers.forEach(peer => {
            createPeerConnection(peer.socketId, true);
        });
        showVoiceToast(`👥 Masada ${peers.length + 1} kişi sesli sohbette.`);
    });

    // Odaya Yeni Bir Kullanıcı Katıldığında (Diğer biri katıldı)
    socket.on('voiceUserJoined', ({ socketId, username }) => {
        if (isVoiceConnected) {
            createPeerConnection(socketId, false);
            showVoiceToast(`🎙️ ${username} masanın sesli sohbetine bağlandı.`);
        }
    });

    // WebRTC Sinyali Alındığında (Offer / Answer / ICE Candidate)
    socket.on('voiceSignal', async ({ from, username, signal }) => {
        let pc = peerConnections[from];
        if (!pc) {
            pc = createPeerConnection(from, false);
        }

        try {
            if (signal.type === 'offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit('voiceSignal', {
                    to: from,
                    signal: { type: 'answer', sdp: pc.localDescription }
                });
            } else if (signal.type === 'answer') {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            } else if (signal.type === 'candidate' && signal.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            }
        } catch (err) {
            console.error("Sinyal işleme hatası:", err);
        }
    });

    // Bir Kullanıcı Odadan Ayrıldığında
    socket.on('voiceUserLeft', ({ socketId }) => {
        if (peerConnections[socketId]) {
            try { peerConnections[socketId].close(); } catch (e) {}
            delete peerConnections[socketId];
        }
        if (remoteAudioElements[socketId]) {
            remoteAudioElements[socketId].srcObject = null;
            remoteAudioElements[socketId].remove();
            delete remoteAudioElements[socketId];
        }
        speakingPeers.delete(socketId);
        updateSpeakingUI(socketId, false);
    });

    // Biri Konuştuğunda (Yeşil Dalgayı Göster)
    socket.on('voiceUserSpeaking', ({ socketId, username, isSpeaking }) => {
        if (isSpeaking) {
            speakingPeers.add(socketId);
        } else {
            speakingPeers.delete(socketId);
        }
        updateSpeakingUI(socketId, isSpeaking);
    });

    // --- ARAYÜZ VE GÖRSEL GÖSTERGELER (UI) ---

    function updateVoiceButtonUI() {
        const btn = document.getElementById('tableVoiceBtn');
        const icon = document.getElementById('tableVoiceIcon');
        const text = document.getElementById('tableVoiceText');

        const okeyBtn = document.getElementById('okey101VoiceToggleBtn');
        const okeyIcon = document.getElementById('okey101VoiceIcon');
        const okeyText = document.getElementById('okey101VoiceText');
        const okeyInd = document.getElementById('okey101VoiceIndicator');
        const okeyStatText = document.getElementById('okey101VoiceStatusText');

        if (!isVoiceConnected) {
            if (btn) {
                btn.style.background = 'linear-gradient(135deg, #475569, #334155)';
                btn.style.boxShadow = 'none';
            }
            if (icon) icon.innerText = '🎤';
            if (text) text.innerText = 'Ses Aç';

            if (okeyBtn) {
                okeyBtn.style.background = 'linear-gradient(135deg, #475569, #334155)';
                okeyBtn.style.boxShadow = 'none';
            }
            if (okeyIcon) okeyIcon.innerText = '🎤';
            if (okeyText) okeyText.innerText = 'Sesli Konuş';
            if (okeyInd) okeyInd.style.background = '#64748b';
            if (okeyStatText) okeyStatText.innerText = 'Ses Kapalı';
        } else if (isMicMuted) {
            if (btn) {
                btn.style.background = 'linear-gradient(135deg, #eab308, #ca8a04)';
                btn.style.boxShadow = '0 0 10px rgba(234,179,8,0.5)';
            }
            if (icon) icon.innerText = '🔇';
            if (text) text.innerText = 'Sessizde';

            if (okeyBtn) {
                okeyBtn.style.background = 'linear-gradient(135deg, #eab308, #ca8a04)';
                okeyBtn.style.boxShadow = '0 0 10px rgba(234,179,8,0.5)';
            }
            if (okeyIcon) okeyIcon.innerText = '🔇';
            if (okeyText) okeyText.innerText = 'Sessizde (Tıkla Aç)';
            if (okeyInd) okeyInd.style.background = '#eab308';
            if (okeyStatText) okeyStatText.innerText = 'Mikrofon Sessiz';
        } else {
            if (btn) {
                btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                btn.style.boxShadow = '0 0 12px rgba(16,185,129,0.7)';
            }
            if (icon) icon.innerText = '🎙️';
            if (text) text.innerText = 'Ses Açık';

            if (okeyBtn) {
                okeyBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                okeyBtn.style.boxShadow = '0 0 12px rgba(16,185,129,0.7)';
            }
            if (okeyIcon) okeyIcon.innerText = '🎙️';
            if (okeyText) okeyText.innerText = 'Mikrofon Açık';
            if (okeyInd) okeyInd.style.background = '#10b981';
            if (okeyStatText) okeyStatText.innerText = 'Canlı Ses Bağlı';
        }
    }

    function updateSpeakingUI(socketId, isSpeaking) {
        // 1. 101 Okey Skorbord Kartı
        const card = document.getElementById(`okey101PlayerCard_${socketId}`);
        if (card) {
            if (isSpeaking) {
                card.classList.add('voice-speaking');
                let badge = card.querySelector('.voice-speaking-badge');
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'voice-speaking-badge';
                    badge.innerHTML = ' 🎙️<span class="voice-wave-bars"><span></span><span></span><span></span></span>';
                    let nameEl = card.querySelector('b');
                    if (nameEl) nameEl.appendChild(badge);
                }
            } else {
                card.classList.remove('voice-speaking');
                let badge = card.querySelector('.voice-speaking-badge');
                if (badge) badge.remove();
            }
        }

        // 2. 2D Metaverse Canvas / Çevrimiçi Oyuncu Tag'i
        if (window.players && window.players[socketId]) {
            window.players[socketId].isSpeaking = isSpeaking;
        }
    }

    function showVoiceToast(msg) {
        let toast = document.getElementById('voiceNotificationToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'voiceNotificationToast';
            toast.className = 'voice-toast';
            document.body.appendChild(toast);
        }
        toast.innerText = msg;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3500);
    }
    window.showVoiceToast = showVoiceToast;

    // Sayfadan veya masadan ayrılınca temizlik
    window.addEventListener('beforeunload', () => {
        leaveTableVoiceChat();
    });

})();
