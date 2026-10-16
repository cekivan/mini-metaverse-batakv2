const { io } = require("socket.io-client");
const { evaluateHand, createShoe } = require("../src/handlers/blackjackHandler");

console.log("==================================================");
console.log("♠️♥️ CASINO BLACKJACK REAL-TIME TEST SUITE ♦️♣️");
console.log("==================================================");

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`✅ [PASS] ${message}`);
        testsPassed++;
    } else {
        console.error(`❌ [FAIL] ${message}`);
        testsFailed++;
    }
}

async function runTests() {
    // ----------------------------------------------------
    // TEST 1: 6-Deck Shoe & Dynamic Ace Evaluation Tests
    // ----------------------------------------------------
    console.log("\n--- TEST 1: Shoe & Card Evaluation Engine ---");
    const shoe = createShoe(6);
    assert(shoe.length === 312, `6-deck shoe should have 312 cards (Got: ${shoe.length})`);

    // Dynamic Ace tests
    // Ace + 8 = 19 (soft)
    const hand1 = evaluateHand([{ rank: 'A', value: 11 }, { rank: '8', value: 8 }]);
    assert(hand1.score === 19 && hand1.isSoft === true, `Ace + 8 should evaluate to 19 (soft) (Got: ${hand1.score}, soft: ${hand1.isSoft})`);

    // Ace + 8 + 5 = 14 (hard, Ace dynamically reduced to 1)
    const hand2 = evaluateHand([{ rank: 'A', value: 11 }, { rank: '8', value: 8 }, { rank: '5', value: 5 }]);
    assert(hand2.score === 14 && hand2.isSoft === false, `Ace + 8 + 5 should dynamically reduce Ace to 1, score 14 (Got: ${hand2.score}, soft: ${hand2.isSoft})`);

    // Ace + Ace + 9 = 21 (11 + 1 + 9)
    const hand3 = evaluateHand([{ rank: 'A', value: 11 }, { rank: 'A', value: 11 }, { rank: '9', value: 9 }]);
    assert(hand3.score === 21 && hand3.isSoft === true, `A + A + 9 should evaluate to 21 (Got: ${hand3.score})`);

    // Ace + King (2 cards) = Blackjack
    const hand4 = evaluateHand([{ rank: 'A', value: 11 }, { rank: 'K', value: 10 }]);
    assert(hand4.isBlackjack === true && hand4.score === 21, `Ace + King must be Blackjack (Got: ${hand4.score}, isBJ: ${hand4.isBlackjack})`);

    // Bust test: 10 + 7 + 8 = 25
    const hand5 = evaluateHand([{ rank: '10', value: 10 }, { rank: '7', value: 7 }, { rank: '8', value: 8 }]);
    assert(hand5.isBust === true && hand5.score === 25, `10 + 7 + 8 must be Bust (25) (Got: ${hand5.score}, isBust: ${hand5.isBust})`);

    // ----------------------------------------------------
    // TEST 2: Real-time Socket.io Multiplayer & Economy
    // ----------------------------------------------------
    console.log("\n--- TEST 2: Real-time Multiplayer Blackjack & Fastest-Finger Seating ---");
    const SERVER_URL = "http://localhost:3000";

    const timestamp = Date.now();
    const p1Name = `bj_p1_${timestamp}`;
    const p2Name = `bj_p2_${timestamp}`;
    const p3Name = `bj_p3_${timestamp}`;
    const p4Name = `bj_p4_spec_${timestamp}`;

    const client1 = io(SERVER_URL);
    const client2 = io(SERVER_URL);
    const client3 = io(SERVER_URL);
    const client4 = io(SERVER_URL);

    await Promise.all([
        new Promise(res => client1.on("connect", res)),
        new Promise(res => client2.on("connect", res)),
        new Promise(res => client3.on("connect", res)),
        new Promise(res => client4.on("connect", res)),
    ]);
    console.log("All 4 clients connected to server.");

    // Helper to register / login with 1000 TL default balance
    function registerPlayer(client, username) {
        return new Promise(resolve => {
            client.emit("register", { name: username, pass: "pass123", gender: "male" });
            client.once("loginSuccess", (res) => {
                resolve(res);
            });
            client.once("registerFailed", () => {
                client.emit("login", { name: username, pass: "pass123" });
                client.once("loginSuccess", resolve);
            });
        });
    }

    const [auth1, auth2, auth3, auth4] = await Promise.all([
        registerPlayer(client1, p1Name),
        registerPlayer(client2, p2Name),
        registerPlayer(client3, p3Name),
        registerPlayer(client4, p4Name)
    ]);

    assert(auth1.money === 1000, `New player 1 gets starting balance of 1000 TL (Got: ${auth1.money})`);
    assert(auth2.money === 1000, `New player 2 gets starting balance of 1000 TL (Got: ${auth2.money})`);
    assert(auth3.money === 1000, `New player 3 gets starting balance of 1000 TL (Got: ${auth3.money})`);
    assert(auth4.money === 1000, `New player 4 gets starting balance of 1000 TL (Got: ${auth4.money})`);

    await new Promise(r => setTimeout(r, 300));

    // Client init blackjack
    client1.emit("blackjack_init");
    client2.emit("blackjack_init");
    client3.emit("blackjack_init");
    client4.emit("blackjack_init");

    await new Promise(r => setTimeout(r, 400));

    // TEST 3: Fastest Finger Seating
    console.log("\n--- TEST 3: Fastest-Finger Seating Claim (3 Seats Max) ---");
    // Client1 claims Seat 0
    client1.emit("blackjack_sit", { seatIndex: 0 });
    // Client2 simultaneously tries to claim Seat 0 (conflict)
    let p2ConflictError = false;
    client2.once("blackjack_error", (msg) => {
        if (msg.includes("kapıldı") || msg.includes("dolu") || msg.includes("başka bir oyuncu")) {
            p2ConflictError = true;
        }
    });
    client2.emit("blackjack_sit", { seatIndex: 0 });

    await new Promise(r => setTimeout(r, 400));
    assert(p2ConflictError === true, "Fastest-finger seat 0: Client 2 was rejected because Client 1 claimed it first");

    // Client 2 sits at Seat 1
    client2.emit("blackjack_sit", { seatIndex: 1 });
    // Client 3 sits at Seat 2
    client3.emit("blackjack_sit", { seatIndex: 2 });

    await new Promise(r => setTimeout(r, 400));

    // Client 4 tries to sit at Seat 1 (already occupied)
    let p4Conflict = false;
    client4.once("blackjack_error", (msg) => {
        if (msg.includes("kapıldı") || msg.includes("dolu") || msg.includes("başka bir oyuncu")) {
            p4Conflict = true;
        }
    });
    client4.emit("blackjack_sit", { seatIndex: 1 });

    await new Promise(r => setTimeout(r, 400));
    assert(p4Conflict === true, "Client 4 could not sit at Seat 1 (Seat is occupied, remains Spectator)");

    // ----------------------------------------------------
    // TEST 4: Seated Player Betting & 0 TL Skip Hand Rule
    // ----------------------------------------------------
    console.log("\n--- TEST 4: Betting & 0 TL Skip Hand Rule ---");
    // Place bets:
    // Client 1 places 100 TL
    client1.emit("blackjack_place_bet", { amount: 100 });
    // Client 2 places 50 TL
    client2.emit("blackjack_place_bet", { amount: 50 });
    // Client 3 places 0 TL (skip hand)

    await new Promise(r => setTimeout(r, 500));

    // Let's inspect latest table state received
    let latestState = null;
    const stateHandler = (state) => {
        if (state && state.seats) latestState = state;
    };
    client1.on("blackjack_state_update", stateHandler);
    client1.on("blackjack_init", stateHandler);
    client1.emit("blackjack_init");
    await new Promise(r => setTimeout(r, 600));

    assert(latestState !== null, "Received valid table state update");
    assert(latestState.seats[0].bet === 100, `Seat 0 has 100 TL bet (Got: ${latestState.seats[0].bet})`);
    assert(latestState.seats[1].bet === 50, `Seat 1 has 50 TL bet (Got: ${latestState.seats[1].bet})`);
    assert(latestState.seats[2].bet === 0, `Seat 2 has 0 TL bet (Got: ${latestState.seats[2].bet})`);

    // ----------------------------------------------------
    // TEST 5: Disconnect Mid-Game Edge Case
    // ----------------------------------------------------
    console.log("\n--- TEST 5: Disconnect Mid-Game Edge Case ---");
    // Connect a 5th player who sits at table
    const p5Name = `bj_p5_dc_${timestamp}`;
    const client5 = io(SERVER_URL);
    await new Promise(res => client5.on("connect", res));
    await registerPlayer(client5, p5Name);
    client5.emit("blackjack_init");
    await new Promise(r => setTimeout(r, 300));

    // Client 1 leaves seat 0 so Client 5 can sit
    client1.emit("blackjack_leave_seat");
    await new Promise(r => setTimeout(r, 400));

    client5.emit("blackjack_sit", { seatIndex: 0 });
    client5.emit("blackjack_place_bet", { amount: 100 });
    await new Promise(r => setTimeout(r, 400));

    // Now disconnect Client 5 mid-game
    console.log("Disconnecting Client 5 to verify edge case handling...");
    client5.disconnect();
    await new Promise(r => setTimeout(r, 700));

    // Query state on client 2
    let stateAfterDc = null;
    const dcHandler = (state) => {
        if (state && state.seats) stateAfterDc = state;
    };
    client2.on("blackjack_state_update", dcHandler);
    client2.on("blackjack_init", dcHandler);
    client2.emit("blackjack_init");
    await new Promise(r => setTimeout(r, 600));

    assert(stateAfterDc !== null, "State update received after mid-game disconnect");
    assert(stateAfterDc.seats[0].socketId === null && stateAfterDc.seats[0].status === 'EMPTY', "Seat 0 was immediately cleared and folded without freezing the game");

    // ----------------------------------------------------
    // TEST 6: Complete Round Flow (Dealing, Hit, Stand, Dealer Turn & Payout)
    // ----------------------------------------------------
    console.log("\n--- TEST 6: Dealing, Hit/Stand, Dealer Turn & Payout Flow ---");
    // Connect new test client
    const p6Name = `bj_p6_round_${timestamp}`;
    const client6 = io(SERVER_URL);
    await new Promise(res => client6.on("connect", res));
    await registerPlayer(client6, p6Name);
    client6.emit("blackjack_init");
    await new Promise(r => setTimeout(r, 400));

    // Sit client 6 at seat 0 (now empty)
    client6.emit("blackjack_sit", { seatIndex: 0 });
    await new Promise(r => setTimeout(r, 400));

    // Wait until state === 'BETTING' if not already
    await new Promise((resolve) => {
        let resolved = false;
        const checkBetting = (state) => {
            if (state && state.state === 'BETTING' && !resolved) {
                resolved = true;
                client6.off("blackjack_state_update", checkBetting);
                client6.off("blackjack_init", checkBetting);
                resolve();
            }
        };
        client6.on("blackjack_state_update", checkBetting);
        client6.on("blackjack_init", checkBetting);
        client6.emit("blackjack_init");
        // Fallback in case already in BETTING
        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                resolve();
            }
        }, 3000);
    });

    // Client 6 bets 100 TL
    client6.emit("blackjack_place_bet", { amount: 100 });
    console.log("Client 6 placed bet 100 TL. Waiting for round completion...");

    // Listen for DEALING, PLAYER_TURNS, DEALER_TURN, and PAYOUT
    let gotDealing = false;
    let gotPlayerTurn = false;
    let gotDealerTurn = false;
    let gotPayout = false;

    const roundTimeout = new Promise((resolve) => {
        client6.on("blackjack_state_update", (state) => {
            if (state.state === 'DEALING') {
                gotDealing = true;
            }
            if (state.state === 'PLAYER_TURNS' && state.activeTurnSeatIndex === 0) {
                gotPlayerTurn = true;
                // Seat 0 has turn: execute Stand
                client6.emit("blackjack_stand");
            }
            if (state.state === 'DEALER_TURN') {
                gotDealerTurn = true;
            }
            if (state.state === 'PAYOUT') {
                gotPayout = true;
                resolve();
            }
        });
        setTimeout(resolve, 25000);
    });

    await roundTimeout;

    assert(gotDealing === true, "State machine transitioned to DEALING phase");
    assert(gotPlayerTurn === true, "Active bettor received turn in PLAYER_TURNS phase");
    assert(gotDealerTurn === true, "Dealer revealed card and played in DEALER_TURN phase");
    assert(gotPayout === true, "Payout phase reached and results calculated");

    client6.disconnect();

    // Clean up
    client1.disconnect();
    client2.disconnect();
    client3.disconnect();
    client4.disconnect();

    console.log("\n==================================================");
    console.log(`TEST RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
    console.log("==================================================");

    process.exit(testsFailed === 0 ? 0 : 1);
}

runTests().catch(err => {
    console.error("Test execution error:", err);
    process.exit(1);
});
