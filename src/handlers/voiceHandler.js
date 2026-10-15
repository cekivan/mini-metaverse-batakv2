// src/handlers/voiceHandler.js - WebRTC Tabanlı Masa İçi Sesli Sohbet (Peer-to-Peer Voice Chat) Sinyal Yöneticisi

const voiceRooms = {}; // tableId -> Set of socketId

function registerVoiceHandlers(io, socket, players) {

    // 1. Masanın Sesli Sohbet Kanalına Katılma
    socket.on('voiceJoinRoom', (data) => {
        if (!data || !data.tableId) return;
        let tableId = data.tableId;
        let roomKey = `voice_${tableId}`;

        if (!voiceRooms[tableId]) {
            voiceRooms[tableId] = new Set();
        }

        let existingPeers = Array.from(voiceRooms[tableId]).filter(id => id !== socket.id);

        voiceRooms[tableId].add(socket.id);
        socket.join(roomKey);

        let myName = players[socket.id]?.name || "Oyuncu";

        // Mevcut odadaki kişilerin listesini yeni bağlanana gönder
        socket.emit('voicePeersList', {
            tableId: tableId,
            peers: existingPeers.map(pid => ({
                socketId: pid,
                username: players[pid]?.name || "Oyuncu"
            }))
        });

        // Diğer odadaki kişilere yeni oyuncunun bağlandığını bildir
        socket.to(roomKey).emit('voiceUserJoined', {
            socketId: socket.id,
            username: myName
        });

        console.log(`[VoiceChat] ${myName} (${socket.id}) ${tableId} masasının sesli sohbetine katıldı.`);
    });

    // 2. WebRTC Sinyal İletimi (Offer / Answer / ICE Candidate)
    socket.on('voiceSignal', (data) => {
        if (!data || !data.to || !data.signal) return;
        let targetSocketId = data.to;

        io.to(targetSocketId).emit('voiceSignal', {
            from: socket.id,
            username: players[socket.id]?.name || "Oyuncu",
            signal: data.signal
        });
    });

    // 3. Konuşma Durumu (Ses Dalgası Göstergesi - Speaking Indicator)
    socket.on('voiceSpeaking', (data) => {
        if (!data || !data.tableId) return;
        let roomKey = `voice_${data.tableId}`;
        socket.to(roomKey).emit('voiceUserSpeaking', {
            socketId: socket.id,
            username: players[socket.id]?.name || "Oyuncu",
            isSpeaking: !!data.isSpeaking
        });
    });

    // 4. Masanın Sesli Sohbet Kanalından Ayrılma
    socket.on('voiceLeaveRoom', (data) => {
        if (!data || !data.tableId) return;
        leaveVoiceRoom(socket, data.tableId);
    });
}

function leaveVoiceRoom(socket, tableId) {
    if (!voiceRooms[tableId]) return;
    if (voiceRooms[tableId].has(socket.id)) {
        voiceRooms[tableId].delete(socket.id);
        socket.leave(`voice_${tableId}`);
        socket.to(`voice_${tableId}`).emit('voiceUserLeft', {
            socketId: socket.id
        });
        if (voiceRooms[tableId].size === 0) {
            delete voiceRooms[tableId];
        }
    }
}

function cleanupSocketVoice(socket) {
    for (let tableId in voiceRooms) {
        if (voiceRooms[tableId].has(socket.id)) {
            leaveVoiceRoom(socket, tableId);
        }
    }
}

module.exports = {
    registerVoiceHandlers,
    cleanupSocketVoice,
    voiceRooms
};
