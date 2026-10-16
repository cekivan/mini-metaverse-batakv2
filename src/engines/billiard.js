// billiard.js (SUNUCU TARAFI)

function isAnyBallMoving(gameData) {
    if (!gameData || !gameData.balls) return false;
    for (let key in gameData.balls) {
        let b = gameData.balls[key];
        if (b && b.active && b.x !== -100) {
            if (Math.abs(b.vx || 0) > 0.02 || Math.abs(b.vy || 0) > 0.02) return true;
        }
    }
    return false;
}

function startBilliardGame(players) {
    let balls = {
        white: { x: 150, y: 150, vx: 0, vy: 0, type: 'white', active: true }
    };

    let startX = 420;
    let startY = 150;
    let spacing = 18; 

    // WPA Resmi 8-Top Üçgen Dizilimi:
    // 1. Tepe topu (Apex): Düz (1)
    // 2. Sıra: Çizgili (9), Düz (2)
    // 3. Sıra: Çizgili (10), 8-Numaralı Siyah Top TAM MERKEZDE (8), Düz (3)
    // 4. Sıra: Düz (4), Çizgili (11), Düz (5), Çizgili (12)
    // 5. Taban Sırası: Sol Köşe: Düz (7), Çizgili (13), Düz (6), Çizgili (14), Sağ Köşe: Çizgili (15)
    // *Kural gereği tabandaki iki köşe topu farklı gruplardan olmalıdır (7 Düz vs 15 Çizgili).
    // *Siyah top 3. sıranın ortasında yer alır ve tüm toplar homojen karışık dağıtılır.
    let positions = [
        {x: startX, y: startY}, 
        {x: startX + spacing, y: startY - 10}, {x: startX + spacing, y: startY + 10}, 
        {x: startX + spacing*2, y: startY - 20}, {x: startX + spacing*2, y: startY}, {x: startX + spacing*2, y: startY + 20}, 
        {x: startX + spacing*3, y: startY - 30}, {x: startX + spacing*3, y: startY - 10}, {x: startX + spacing*3, y: startY + 10}, {x: startX + spacing*3, y: startY + 30}, 
        {x: startX + spacing*4, y: startY - 40}, {x: startX + spacing*4, y: startY - 20}, {x: startX + spacing*4, y: startY}, {x: startX + spacing*4, y: startY + 20}, {x: startX + spacing*4, y: startY + 40} 
    ];

    const rackOrder = [
        1,              // Apex (Düz 1)
        9, 2,           // 2. Sıra (Çizgili 9, Düz 2)
        10, 8, 3,       // 3. Sıra (Çizgili 10, SİYAH 8 [Merkez], Düz 3)
        4, 11, 5, 12,   // 4. Sıra (Düz 4, Çizgili 11, Düz 5, Çizgili 12)
        7, 13, 6, 14, 15// 5. Sıra (Sol Köşe: Düz 7, Çizgili 13, Düz 6, Çizgili 14, Sağ Köşe: Çizgili 15)
    ];

    positions.forEach((pos, index) => {
        let num = rackOrder[index];
        let type = (num === 8) ? 'black' : (num < 8 ? 'solid' : 'stripe');
        balls['ball_' + num] = { x: pos.x, y: pos.y, vx: 0, vy: 0, number: num, type: type, active: true };
    });

    let gameData = {
        players: [...players], 
        turnIndex: 0,
        tableWidth: 600,
        tableHeight: 300,
        balls: balls,
        playerSuits: {}, 
        ballInHand: false,
        winner: null,
        gameOver: false,
        firstHit: null, 
        pottedThisTurn: [], 
        shotActive: false,
        soundEvents: []
    };
    
    gameData.playerSuits[players[0]] = null;
    gameData.playerSuits[players[1]] = null;

    return gameData;
}

function shootBall(gameData, playerId, angle, power, spinX = 0, spinY = 0) {
    let currentPlayer = gameData.players[gameData.turnIndex];
    if (currentPlayer !== playerId || gameData.ballInHand || gameData.gameOver) return false;

    // Kritik Kural: Atış aktifken veya masada herhangi bir top hareket ederken ikinci vuruş KESİNLİKLE yapılamaz!
    if (gameData.shotActive || isAnyBallMoving(gameData)) return false;

    let white = gameData.balls.white;
    if (!white || !white.active || Math.abs(white.vx) > 0.02 || Math.abs(white.vy) > 0.02) return false;

    let clampedPower = Math.min(24, Math.max(1, power));
    let rad = angle * (Math.PI / 180);
    white.vx = Math.cos(rad) * clampedPower;
    white.vy = Math.sin(rad) * clampedPower;
    white.spinX = 0; // Masadan falso spin kaldırıldı
    white.spinY = 0;
    
    // Vuruş anında sunucu durumunu kilitler
    gameData.shotActive = true;
    gameData.firstHit = null;
    gameData.pottedThisTurn = [];
    return true;
}

function placeWhiteBall(gameData, playerId, x, y) {
    if (gameData.players[gameData.turnIndex] !== playerId || !gameData.ballInHand) return false;
    
    for (let key in gameData.balls) {
        if (key === 'white' || !gameData.balls[key].active) continue;
        let dx = gameData.balls[key].x - x;
        let dy = gameData.balls[key].y - y;
        if (Math.sqrt(dx*dx + dy*dy) < 16) return false; 
    }

    gameData.balls.white.x = x;
    gameData.balls.white.y = y;
    gameData.balls.white.vx = 0;
    gameData.balls.white.vy = 0;
    gameData.ballInHand = false;
    return true;
}

function evaluateShot(gameData) {
    if (gameData.gameOver) return;

    let foul = false;
    let keepTurn = false;
    let currentPlayer = gameData.players[gameData.turnIndex];
    let oppPlayer = gameData.players[(gameData.turnIndex + 1) % 2];
    let mySuit = gameData.playerSuits[currentPlayer];

    // Fauller
    if (mySuit) {
        if (!gameData.firstHit) foul = true; 
        else if (gameData.firstHit === 'black') {
            let ownBallsLeft = Object.values(gameData.balls).filter(b => b.active && b.type === mySuit).length;
            if (ownBallsLeft > 0) foul = true;
        }
        else if (gameData.firstHit !== mySuit) foul = true; 
    } else {
        if (!gameData.firstHit || gameData.firstHit === 'black') foul = true; 
    }

    if (gameData.pottedThisTurn.includes('white')) foul = true;

    if (mySuit) {
        let oppSuit = mySuit === 'solid' ? 'stripe' : 'solid';
        if (gameData.pottedThisTurn.includes(oppSuit)) foul = true; 
        if (!foul && gameData.pottedThisTurn.includes(mySuit)) keepTurn = true;
    } else {
        if (!foul && gameData.pottedThisTurn.length > 0) keepTurn = true;
    }

    // Oyun Bitişi
    if (gameData.pottedThisTurn.includes('black')) {
        gameData.gameOver = true;
        if (mySuit) {
            let ownBallsLeft = Object.values(gameData.balls).filter(b => b.active && b.type === mySuit).length;
            if (ownBallsLeft === 0 && !foul) gameData.winner = currentPlayer;
            else gameData.winner = oppPlayer; 
        } else {
            gameData.winner = oppPlayer; 
        }
        return;
    }

    // Renk Seçimi
    if (!mySuit && !foul) {
        let firstValid = gameData.pottedThisTurn.find(t => t === 'solid' || t === 'stripe');
        if (firstValid) {
            gameData.playerSuits[currentPlayer] = firstValid;
            gameData.playerSuits[oppPlayer] = firstValid === 'solid' ? 'stripe' : 'solid';
            keepTurn = true; 
        }
    }

    if (foul) {
        gameData.ballInHand = true;
        gameData.turnIndex = (gameData.turnIndex + 1) % 2;
        gameData.balls.white.vx = 0; gameData.balls.white.vy = 0;
    } else {
        if (!keepTurn) gameData.turnIndex = (gameData.turnIndex + 1) % 2;
    }
}function updatePhysics(gameData) {
    if (gameData.gameOver) return false;
    const SUB_STEPS = 8;
    const subDt = 1 / SUB_STEPS;
    const subFriction = Math.pow(0.985, subDt);
    const radius = 8;
    const minDist = radius * 2; // 16px
    const pockets = [
        { x: 14, y: 14 }, { x: 300, y: 10 }, { x: 586, y: 14 },
        { x: 14, y: 286 }, { x: 300, y: 290 }, { x: 586, y: 286 }
    ];

    const minX = 14 + radius;
    const maxX = 586 - radius;
    const minY = 14 + radius;
    const maxY = 286 - radius;

    let ballKeys = Object.keys(gameData.balls);

    for (let step = 0; step < SUB_STEPS; step++) {
        // 1. Pozisyon Güncelleme ve Sürtünme
        for (let i = 0; i < ballKeys.length; i++) {
            let ball = gameData.balls[ballKeys[i]];
            if (!ball.active || ball.x === -100) continue;

            if (Math.abs(ball.vx) > 0.001 || Math.abs(ball.vy) > 0.001) {
                ball.x += ball.vx * subDt;
                ball.y += ball.vy * subDt;
                ball.vx *= subFriction;
                ball.vy *= subFriction;

                // Delik Kontrolü
                for (let pIdx = 0; pIdx < pockets.length; pIdx++) {
                    let pocket = pockets[pIdx];
                    let pdx = ball.x - pocket.x;
                    let pdy = ball.y - pocket.y;
                    if (pdx * pdx + pdy * pdy < 17 * 17) {
                        gameData.pottedThisTurn.push(ballKeys[i] === 'white' ? 'white' : ball.type);
                        gameData.soundEvents = gameData.soundEvents || [];
                        gameData.soundEvents.push('pocket');
                        if (ballKeys[i] === 'white') {
                            ball.x = -100; ball.y = -100; ball.vx = 0; ball.vy = 0;
                        } else {
                            ball.active = false; ball.vx = 0; ball.vy = 0;
                        }
                        break;
                    }
                }

                if (!ball.active || ball.x === -100) continue;

                // Bantlardan Sekme (Cushion Bounces)
                let spinTangent = (ball.type === 'white' && ball.spinX) ? ball.spinX * 0.8 : 0;

                if (ball.x < minX) {
                    ball.x = minX;
                    ball.vx = Math.abs(ball.vx) * 0.95;
                    ball.vy += spinTangent;
                    if (ball.type === 'white') ball.spinX *= 0.4;
                } else if (ball.x > maxX) {
                    ball.x = maxX;
                    ball.vx = -Math.abs(ball.vx) * 0.95;
                    ball.vy -= spinTangent;
                    if (ball.type === 'white') ball.spinX *= 0.4;
                }

                if (ball.y < minY) {
                    ball.y = minY;
                    ball.vy = Math.abs(ball.vy) * 0.95;
                    ball.vx += spinTangent;
                    if (ball.type === 'white') ball.spinX *= 0.4;
                } else if (ball.y > maxY) {
                    ball.y = maxY;
                    ball.vy = -Math.abs(ball.vy) * 0.95;
                    ball.vx -= spinTangent;
                    if (ball.type === 'white') ball.spinX *= 0.4;
                }
            }
        }

        // 2. Top-Top Çarpışma Tespiti ve Elastik Momentum Aktarımı (Continuous Contact Resolution)
        for (let i = 0; i < ballKeys.length; i++) {
            let b1 = gameData.balls[ballKeys[i]];
            if (!b1.active || b1.x === -100) continue;

            for (let j = i + 1; j < ballKeys.length; j++) {
                let b2 = gameData.balls[ballKeys[j]];
                if (!b2.active || b2.x === -100) continue;

                let dx = b2.x - b1.x;
                let dy = b2.y - b1.y;
                let distSq = dx * dx + dy * dy;

                if (distSq < minDist * minDist && distSq > 0.00001) {
                    let dist = Math.sqrt(distSq);

                    if (b1.type === 'white' && !gameData.firstHit) gameData.firstHit = b2.type;
                    if (b2.type === 'white' && !gameData.firstHit) gameData.firstHit = b1.type;

                    // İç içe geçmeyi ve tünelleşmeyi (tunneling) engelleyen hassas pozisyon düzeltmesi
                    let overlap = 0.5 * (minDist - dist);
                    let nx = dx / dist;
                    let ny = dy / dist;

                    b1.x -= nx * overlap;
                    b1.y -= ny * overlap;
                    b2.x += nx * overlap;
                    b2.y += ny * overlap;

                    // 2D Elastik Çarpışma İmpulsu
                    let kx = b1.vx - b2.vx;
                    let ky = b1.vy - b2.vy;
                    let p = nx * kx + ny * ky;

                    if (p > 0) {
                        let elasticity = 0.96;
                        let impulse = p * elasticity;
                        b1.vx -= impulse * nx;
                        b1.vy -= impulse * ny;
                        b2.vx += impulse * nx;
                        b2.vy += impulse * ny;

                        if (p > 0.4) {
                            gameData.soundEvents = gameData.soundEvents || [];
                            if (!gameData.soundEvents.includes('hit')) {
                                gameData.soundEvents.push('hit');
                            }
                        }
                    }
                }
            }
        }
    }

    // 3. Hız Eşik Kontrolü ve Dönüş Animasyonu
    let movingBalls = false;
    for (let i = 0; i < ballKeys.length; i++) {
        let ball = gameData.balls[ballKeys[i]];
        if (!ball.active || ball.x === -100) continue;

        let spd = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (spd > 0.03) {
            movingBalls = true;
            ball.rollAngle = ((ball.rollAngle || 0) + spd * 0.14) % (Math.PI * 2);
        } else {
            ball.vx = 0;
            ball.vy = 0;
        }
    }

    if (movingBalls) {
        gameData.shotActive = true;
    } else if (gameData.shotActive) {
        gameData.shotActive = false;
        evaluateShot(gameData);
    }

    return movingBalls;
}

module.exports = { startBilliardGame, shootBall, placeWhiteBall, updatePhysics, isAnyBallMoving };