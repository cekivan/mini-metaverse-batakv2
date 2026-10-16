// src/handlers/blackjackHandler.js - Multiplayer Blackjack Table Engine & Socket Controller
const dataManager = require('../dataManager');

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function createShoe(deckCount = 6) {
    let shoe = [];
    for (let d = 0; d < deckCount; d++) {
        for (let suit of SUITS) {
            for (let rank of RANKS) {
                let color = (suit === '♥' || suit === '♦') ? 'red' : 'black';
                shoe.push({ suit, rank, color, id: `${rank}_${suit}_${d}` });
            }
        }
    }
    // Fisher-Yates shuffle
    for (let i = shoe.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
    }
    return shoe;
}

function evaluateHand(cards) {
    if (!cards || cards.length === 0) {
        return { total: 0, isSoft: false, isBust: false, isBlackjack: false };
    }

    let total = 0;
    let aces = 0;

    for (let card of cards) {
        if (card.rank === 'A') {
            aces++;
            total += 11;
        } else if (['K', 'Q', 'J'].includes(card.rank)) {
            total += 10;
        } else {
            total += parseInt(card.rank, 10);
        }
    }

    // Convert Aces from 11 to 1 dynamically if bust
    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }

    const isBlackjack = (cards.length === 2 && total === 21);
    const isBust = total > 21;
    const isSoft = aces > 0 && total <= 21;

    return { total, score: total, isSoft, isBust, isBlackjack };
}

// Global Single Blackjack Table (Multiplayer Room)
const blackjackTable = {
    id: 'blackjack_table_1',
    roomName: 'blackjack_room_1',
    state: 'WAITING', // 'WAITING', 'BETTING', 'DEALING', 'PLAYER_TURNS', 'DEALER_TURN', 'PAYOUT', 'RESET'
    shoe: createShoe(6),
    dealerHand: [],
    dealerScore: 0,
    dealerHidden: true,
    seats: [
        { seatIndex: 0, socketId: null, username: null, bet: 0, hasPlacedBet: false, cards: [], score: 0, status: 'EMPTY', result: null, payout: 0 },
        { seatIndex: 1, socketId: null, username: null, bet: 0, hasPlacedBet: false, cards: [], score: 0, status: 'EMPTY', result: null, payout: 0 },
        { seatIndex: 2, socketId: null, username: null, bet: 0, hasPlacedBet: false, cards: [], score: 0, status: 'EMPTY', result: null, payout: 0 }
    ],
    activeTurnSeatIndex: -1,
    turnTimer: null,
    turnSecondsLeft: 0,
    stateTimer: null,
    stateSecondsLeft: 0,
    spectators: new Set()
};

let serverPlayers = {};

function getSanitizedTableState() {
    return {
        id: blackjackTable.id,
        state: blackjackTable.state,
        dealerHand: blackjackTable.dealerHidden && blackjackTable.dealerHand.length >= 2
            ? [blackjackTable.dealerHand[0], { hidden: true }]
            : blackjackTable.dealerHand,
        dealerScore: blackjackTable.dealerHidden && blackjackTable.dealerHand.length >= 2
            ? evaluateHand([blackjackTable.dealerHand[0]]).total
            : blackjackTable.dealerScore,
        dealerHidden: blackjackTable.dealerHidden,
        seats: blackjackTable.seats.map(seat => ({
            seatIndex: seat.seatIndex,
            socketId: seat.socketId,
            username: seat.username,
            bet: seat.bet,
            hasPlacedBet: seat.hasPlacedBet,
            cards: seat.cards,
            score: seat.score,
            status: seat.status,
            result: seat.result,
            payout: seat.payout
        })),
        activeTurnSeatIndex: blackjackTable.activeTurnSeatIndex,
        turnSecondsLeft: blackjackTable.turnSecondsLeft,
        stateSecondsLeft: blackjackTable.stateSecondsLeft,
        spectatorCount: blackjackTable.spectators.size,
        shoeCardsLeft: blackjackTable.shoe.length
    };
}

function broadcastTableUpdate(io) {
    io.to(blackjackTable.roomName).emit('blackjack_state_update', getSanitizedTableState());
}

function clearAllTimers() {
    if (blackjackTable.stateTimer) {
        clearInterval(blackjackTable.stateTimer);
        blackjackTable.stateTimer = null;
    }
    if (blackjackTable.turnTimer) {
        clearInterval(blackjackTable.turnTimer);
        blackjackTable.turnTimer = null;
    }
}

function getSeatedCount() {
    return blackjackTable.seats.filter(s => s.socketId !== null).length;
}

function getActiveBettors() {
    return blackjackTable.seats.filter(s => s.socketId !== null && s.hasPlacedBet && s.bet > 0);
}

// 1. WAITING STATE
function checkOrEnterWaitingState(io) {
    if (getSeatedCount() === 0) {
        clearAllTimers();
        blackjackTable.state = 'WAITING';
        blackjackTable.activeTurnSeatIndex = -1;
        blackjackTable.dealerHand = [];
        blackjackTable.dealerScore = 0;
        blackjackTable.dealerHidden = true;
        blackjackTable.stateSecondsLeft = 0;
        blackjackTable.turnSecondsLeft = 0;
        blackjackTable.seats.forEach(s => {
            s.cards = [];
            s.score = 0;
            s.bet = 0;
            s.hasPlacedBet = false;
            s.result = null;
            s.payout = 0;
            if (s.socketId) s.status = 'SEATED';
        });
        broadcastTableUpdate(io);
    } else if (blackjackTable.state === 'WAITING') {
        startBettingPhase(io);
    }
}

// 2. BETTING STATE (10 seconds)
function startBettingPhase(io) {
    if (getSeatedCount() === 0) {
        checkOrEnterWaitingState(io);
        return;
    }

    clearAllTimers();
    blackjackTable.state = 'BETTING';
    blackjackTable.stateSecondsLeft = 15;
    blackjackTable.activeTurnSeatIndex = -1;
    blackjackTable.dealerHand = [];
    blackjackTable.dealerScore = 0;
    blackjackTable.dealerHidden = true;

    // Reset round fields for seated players
    blackjackTable.seats.forEach(seat => {
        seat.cards = [];
        seat.score = 0;
        seat.bet = 0;
        seat.hasPlacedBet = false;
        seat.result = null;
        seat.payout = 0;
        if (seat.socketId) {
            seat.status = 'SEATED';
        } else {
            seat.status = 'EMPTY';
        }
    });

    broadcastTableUpdate(io);

    blackjackTable.stateTimer = setInterval(() => {
        blackjackTable.stateSecondsLeft--;
        if (blackjackTable.stateSecondsLeft <= 0) {
            clearInterval(blackjackTable.stateTimer);
            blackjackTable.stateTimer = null;
            startDealingPhase(io);
        } else {
            broadcastTableUpdate(io);
        }
    }, 1000);
}

// 3. DEALING STATE
function startDealingPhase(io) {
    clearAllTimers();
    blackjackTable.state = 'DEALING';
    blackjackTable.stateSecondsLeft = 2;
    blackjackTable.activeTurnSeatIndex = -1;

    const activeBettors = getActiveBettors();

    // If no one placed a bet, skip dealing and reset
    if (activeBettors.length === 0) {
        broadcastTableUpdate(io);
        setTimeout(() => {
            startResetPhase(io);
        }, 1500);
        return;
    }

    // Check shoe penetration (< 52 cards remaining -> shuffle new 6 decks)
    if (blackjackTable.shoe.length < 52) {
        blackjackTable.shoe = createShoe(6);
        io.to(blackjackTable.roomName).emit('blackjack_system_message', "🃏 Deste karıştırıldı (6 deste yenilendi).");
    }

    // Round 1: Deal 1 card to each active bettor
    activeBettors.forEach(seat => {
        const card = blackjackTable.shoe.pop();
        seat.cards = [card];
        seat.status = 'PLAYING';
    });
    // 1 card to dealer (face up)
    blackjackTable.dealerHand = [blackjackTable.shoe.pop()];

    // Round 2: Deal 2nd card to each active bettor
    activeBettors.forEach(seat => {
        const card = blackjackTable.shoe.pop();
        seat.cards.push(card);
        const evalResult = evaluateHand(seat.cards);
        seat.score = evalResult.total;
        if (evalResult.isBlackjack) {
            seat.status = 'BLACKJACK';
        }
    });
    // 2nd card to dealer (hidden)
    blackjackTable.dealerHand.push(blackjackTable.shoe.pop());
    blackjackTable.dealerHidden = true;
    blackjackTable.dealerScore = evaluateHand(blackjackTable.dealerHand).total;

    broadcastTableUpdate(io);

    // After brief dealing pause, proceed to player turns
    setTimeout(() => {
        startPlayerTurns(io);
    }, 1200);
}

// 4. PLAYER TURNS
function startPlayerTurns(io) {
    blackjackTable.state = 'PLAYER_TURNS';
    advanceToNextPlayerTurn(io, -1);
}

function advanceToNextPlayerTurn(io, fromSeatIndex) {
    clearAllTimers();

    // Find next active bettor whose status is 'PLAYING' (i.e. Not Blackjack, not busted, not stood)
    let nextSeat = null;
    for (let i = fromSeatIndex + 1; i < blackjackTable.seats.length; i++) {
        let seat = blackjackTable.seats[i];
        if (seat.socketId && seat.hasPlacedBet && seat.cards.length >= 2 && seat.status === 'PLAYING') {
            nextSeat = seat;
            break;
        }
    }

    if (nextSeat) {
        blackjackTable.activeTurnSeatIndex = nextSeat.seatIndex;
        blackjackTable.turnSecondsLeft = 15;
        broadcastTableUpdate(io);

        blackjackTable.turnTimer = setInterval(() => {
            blackjackTable.turnSecondsLeft--;
            if (blackjackTable.turnSecondsLeft <= 0) {
                clearInterval(blackjackTable.turnTimer);
                blackjackTable.turnTimer = null;
                // Auto stand on turn timeout
                handleStand(io, nextSeat.seatIndex, true);
            } else {
                broadcastTableUpdate(io);
            }
        }, 1000);
    } else {
        // All active players finished their turns
        blackjackTable.activeTurnSeatIndex = -1;
        broadcastTableUpdate(io);
        setTimeout(() => {
            startDealerTurn(io);
        }, 800);
    }
}

function handleHit(io, seatIndex) {
    let seat = blackjackTable.seats[seatIndex];
    if (!seat || blackjackTable.activeTurnSeatIndex !== seatIndex || seat.status !== 'PLAYING') return;

    if (blackjackTable.shoe.length < 1) {
        blackjackTable.shoe = createShoe(6);
    }

    const card = blackjackTable.shoe.pop();
    seat.cards.push(card);
    const evalResult = evaluateHand(seat.cards);
    seat.score = evalResult.total;

    if (evalResult.isBust) {
        seat.status = 'BUSTED';
        broadcastTableUpdate(io);
        setTimeout(() => {
            advanceToNextPlayerTurn(io, seatIndex);
        }, 800);
    } else if (evalResult.total === 21) {
        seat.status = 'STOOD';
        broadcastTableUpdate(io);
        setTimeout(() => {
            advanceToNextPlayerTurn(io, seatIndex);
        }, 800);
    } else {
        // Reset timer to 15s for next hit/stand decision
        blackjackTable.turnSecondsLeft = 15;
        broadcastTableUpdate(io);
    }
}

function handleStand(io, seatIndex, isTimeout = false) {
    let seat = blackjackTable.seats[seatIndex];
    if (!seat || blackjackTable.activeTurnSeatIndex !== seatIndex) return;

    seat.status = 'STOOD';
    broadcastTableUpdate(io);
    advanceToNextPlayerTurn(io, seatIndex);
}

// 5. DEALER TURN
function startDealerTurn(io) {
    clearAllTimers();
    blackjackTable.state = 'DEALER_TURN';
    blackjackTable.dealerHidden = false;
    blackjackTable.dealerScore = evaluateHand(blackjackTable.dealerHand).total;
    broadcastTableUpdate(io);

    const activeBettors = getActiveBettors();
    // If all active players busted, dealer doesn't need to draw
    const allBusted = activeBettors.length > 0 && activeBettors.every(s => s.status === 'BUSTED');

    function dealerStep() {
        if (!allBusted && blackjackTable.dealerScore < 17) {
            setTimeout(() => {
                if (blackjackTable.shoe.length < 1) blackjackTable.shoe = createShoe(6);
                const card = blackjackTable.shoe.pop();
                blackjackTable.dealerHand.push(card);
                blackjackTable.dealerScore = evaluateHand(blackjackTable.dealerHand).total;
                broadcastTableUpdate(io);
                dealerStep();
            }, 1000);
        } else {
            setTimeout(() => {
                startPayoutPhase(io);
            }, 1000);
        }
    }

    setTimeout(dealerStep, 800);
}

// 6. PAYOUT PHASE
function startPayoutPhase(io) {
    clearAllTimers();
    blackjackTable.state = 'PAYOUT';

    const dealerResult = evaluateHand(blackjackTable.dealerHand);
    const dealerScore = dealerResult.total;
    const dealerBust = dealerResult.isBust;
    const dealerBlackjack = dealerResult.isBlackjack;

    blackjackTable.seats.forEach(seat => {
        if (!seat.socketId || !seat.hasPlacedBet || seat.bet <= 0) return;

        let payout = 0;
        let result = 'LOSS';

        if (seat.status === 'BUSTED') {
            result = 'LOSS';
            payout = 0;
        } else if (seat.status === 'BLACKJACK') {
            if (dealerBlackjack) {
                result = 'PUSH';
                payout = seat.bet; // return bet
            } else {
                result = 'BLACKJACK';
                payout = Math.floor(seat.bet * 2.5); // 3:2 payout (bet + 1.5x)
            }
        } else {
            // Player stood with <= 21
            if (dealerBust) {
                result = 'WIN';
                payout = seat.bet * 2; // 1:1 win
            } else if (dealerBlackjack) {
                result = 'LOSS';
                payout = 0;
            } else if (seat.score > dealerScore) {
                result = 'WIN';
                payout = seat.bet * 2;
            } else if (seat.score === dealerScore) {
                result = 'PUSH';
                payout = seat.bet;
            } else {
                result = 'LOSS';
                payout = 0;
            }
        }

        seat.result = result;
        seat.payout = payout;

        // Credit payout to player balance
        if (payout > 0 && seat.socketId) {
            let socket = io.sockets.sockets.get(seat.socketId);
            if (socket) {
                if (seat.username && dataManager.persistentData.users[seat.username]) {
                    let uData = dataManager.persistentData.users[seat.username];
                    uData.money = (uData.money || 0) + payout;
                    dataManager.savePersistentData();
                    if (serverPlayers && serverPlayers[seat.socketId]) {
                        serverPlayers[seat.socketId].money = uData.money;
                    }
                    socket.emit('moneyUpdate', uData.money);
                }
            }
        }
    });

    broadcastTableUpdate(io);

    setTimeout(() => {
        startResetPhase(io);
    }, 3500);
}

// 7. RESET PHASE
function startResetPhase(io) {
    clearAllTimers();
    blackjackTable.state = 'RESET';

    if (getSeatedCount() === 0) {
        checkOrEnterWaitingState(io);
    } else {
        startBettingPhase(io);
    }
}

// --- DISCONNECT & SEAT REMOVAL HANDLER ---
function removePlayerFromBlackjack(io, socketId, players) {
    let wasSeated = false;
    blackjackTable.spectators.delete(socketId);

    blackjackTable.seats.forEach(seat => {
        if (seat.socketId === socketId) {
            wasSeated = true;
            let wasActiveTurn = (blackjackTable.activeTurnSeatIndex === seat.seatIndex);

            // Fold mid-game hand to ensure turn cycle never hangs
            seat.socketId = null;
            seat.username = null;
            seat.bet = 0;
            seat.hasPlacedBet = false;
            seat.cards = [];
            seat.score = 0;
            seat.status = 'EMPTY';
            seat.result = null;
            seat.payout = 0;

            if (wasActiveTurn && blackjackTable.state === 'PLAYER_TURNS') {
                advanceToNextPlayerTurn(io, seat.seatIndex);
            }
        }
    });

    if (wasSeated) {
        if (getSeatedCount() === 0) {
            checkOrEnterWaitingState(io);
        } else {
            broadcastTableUpdate(io);
        }
    }
}

// --- REGISTER BLACKJACK SOCKET HANDLERS ---
function registerBlackjackHandlers(io, socket, players) {
    if (players) serverPlayers = players;

    // 1. Join Blackjack Room (as Spectator)
    const handleJoin = () => {
        socket.join(blackjackTable.roomName);
        if (!blackjackTable.seats.some(s => s.socketId === socket.id)) {
            blackjackTable.spectators.add(socket.id);
        }
        socket.emit('blackjack_init', getSanitizedTableState());
        broadcastTableUpdate(io);
    };
    socket.on('blackjack_join', handleJoin);
    socket.on('blackjack_init', handleJoin);

    // 2. Leave Blackjack Room
    socket.on('blackjack_leave', () => {
        removePlayerFromBlackjack(io, socket.id, players);
        socket.leave(blackjackTable.roomName);
    });

    // 3. Sit At Seat (Fastest-finger seat acquisition)
    socket.on('blackjack_sit', (data) => {
        let seatIndex = (typeof data === 'object' && data !== null) ? data.seatIndex : data;
        seatIndex = parseInt(seatIndex, 10);
        if (isNaN(seatIndex) || seatIndex < 0 || seatIndex >= 3) return;

        // Check if player is already seated in any seat
        const alreadySeated = blackjackTable.seats.some(s => s.socketId === socket.id);
        if (alreadySeated) {
            socket.emit('blackjack_error', "Zaten masada bir koltukta oturuyorsunuz!");
            return;
        }

        const seat = blackjackTable.seats[seatIndex];
        // Fastest finger atomic check: is seat still empty?
        if (seat.socketId !== null) {
            socket.emit('blackjack_error', "Bu koltuk az önce başka bir oyuncu tarafından kapıldı!");
            return;
        }

        // Sit player
        seat.socketId = socket.id;
        seat.username = players[socket.id]?.name || "Oyuncu";
        seat.status = 'SEATED';
        seat.bet = 0;
        seat.hasPlacedBet = false;
        seat.cards = [];
        seat.score = 0;
        seat.result = null;
        seat.payout = 0;

        // Remove from spectator set since they are seated
        blackjackTable.spectators.delete(socket.id);

        io.to(blackjackTable.roomName).emit('blackjack_system_message', `🪑 ${seat.username} ${seatIndex + 1}. koltuğa oturdu.`);

        // If table was waiting, kickstart the betting countdown
        if (blackjackTable.state === 'WAITING') {
            startBettingPhase(io);
        } else {
            broadcastTableUpdate(io);
        }
    });

    // 4. Stand Up / Leave Seat
    socket.on('blackjack_leave_seat', (data) => {
        const seat = blackjackTable.seats.find(s => s.socketId === socket.id);
        if (!seat) return;

        io.to(blackjackTable.roomName).emit('blackjack_system_message', `🚪 ${seat.username} masadan kalktı.`);
        removePlayerFromBlackjack(io, socket.id, players);

        // Put them back into spectators list
        blackjackTable.spectators.add(socket.id);
        broadcastTableUpdate(io);
    });

    // 5. Place Bet (10s Betting window)
    socket.on('blackjack_place_bet', (data) => {
        if (blackjackTable.state !== 'BETTING') {
            socket.emit('blackjack_error', "Bahis süresi sona erdi veya şu anda bahisler kapalı!");
            return;
        }

        const seat = blackjackTable.seats.find(s => s.socketId === socket.id);
        if (!seat) {
            socket.emit('blackjack_error', "Bahis yapmak için önce masada bir koltuğa oturmalısınız!");
            return;
        }

        let amount = parseInt(data && data.amount, 10);
        if (isNaN(amount) || amount < 10) {
            socket.emit('blackjack_error', "Minimum bahis miktarı 10 TL'dir!");
            return;
        }

        let p = players[socket.id];
        let curMoney = p && p.money !== undefined ? p.money : 0;
        if (amount > curMoney) {
            socket.emit('blackjack_error', `Yetersiz bakiye! Mevcut bakiyeniz: ${curMoney} TL.`);
            return;
        }

        // Deduct bet atomically from balance
        p.money -= amount;
        if (p.name && dataManager.persistentData.users[p.name]) {
            dataManager.persistentData.users[p.name].money = p.money;
            dataManager.savePersistentData();
        }
        socket.emit('moneyUpdate', p.money);

        seat.bet = amount;
        seat.hasPlacedBet = true;
        seat.status = 'SEATED';

        broadcastTableUpdate(io);
    });

    // 6. Player Actions: Hit, Stand, Double Down
    socket.on('blackjack_hit', () => {
        if (blackjackTable.state !== 'PLAYER_TURNS') return;
        const seat = blackjackTable.seats[blackjackTable.activeTurnSeatIndex];
        if (seat && seat.socketId === socket.id) {
            handleHit(io, seat.seatIndex);
        }
    });

    socket.on('blackjack_stand', () => {
        if (blackjackTable.state !== 'PLAYER_TURNS') return;
        const seat = blackjackTable.seats[blackjackTable.activeTurnSeatIndex];
        if (seat && seat.socketId === socket.id) {
            handleStand(io, seat.seatIndex, false);
        }
    });
}

module.exports = {
    blackjackTable,
    createShoe,
    evaluateHand,
    registerBlackjackHandlers,
    removePlayerFromBlackjack
};
