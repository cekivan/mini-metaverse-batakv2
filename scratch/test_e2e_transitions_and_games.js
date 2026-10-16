// scratch/test_e2e_transitions_and_games.js
const io = require('socket.io-client');

async function run() {
    console.log('Connecting test client to http://localhost:3000...');
    const socket = io('http://localhost:3000', { reconnection: false });

    await new Promise((resolve, reject) => {
        socket.on('connect', resolve);
        socket.on('connect_error', reject);
    });
    console.log('✓ Connected with ID:', socket.id);

    // 1. Register test user
    const testUsername = 'testuser_' + Date.now().toString().slice(-5);
    console.log('Registering test user:', testUsername);
    socket.emit('register', {
        name: testUsername,
        pass: '123456',
        gender: 'male'
    });

    let currentPlayers = await new Promise((resolve) => {
        socket.once('currentPlayers', resolve);
    });
    console.log('✓ Logged in and received currentPlayers in sokak:', Object.keys(currentPlayers).length);

    // 2. Change room to sahil
    console.log('Emitting changeRoom -> sahil...');
    socket.emit('changeRoom', 'sahil');
    let sahilPlayers = await new Promise((resolve) => {
        socket.once('currentPlayers', resolve);
    });
    console.log('✓ Received currentPlayers in sahil. My position:', sahilPlayers[socket.id]);
    if (sahilPlayers[socket.id].x !== 680 || sahilPlayers[socket.id].y !== 270) {
        throw new Error('Expected sahil position to be (680, 270), got: ' + JSON.stringify(sahilPlayers[socket.id]));
    }
    console.log('✓ Sahil position correctly set to (680, 270)');

    // 3. Return to sokak
    console.log('Emitting changeRoom -> sokak...');
    socket.emit('changeRoom', 'sokak');
    let sokakPlayers = await new Promise((resolve) => {
        socket.once('currentPlayers', resolve);
    });
    console.log('✓ Returned to sokak. My position:', sokakPlayers[socket.id]);
    if (sokakPlayers[socket.id].x !== 85 || sokakPlayers[socket.id].y !== 240) {
        throw new Error('Expected sokak return position to be (85, 240), got: ' + JSON.stringify(sokakPlayers[socket.id]));
    }
    console.log('✓ Sokak position correctly set to (85, 240)');

    // 4. Request table options for batak, tavla
    console.log('Testing requestTableOptions for games...');
    socket.emit('requestTableOptions', 'batak');
    let batakRes = await new Promise(resolve => socket.once('tableOptionsModal', resolve));
    console.log('✓ Batak table options received:', batakRes.title || 'OK');

    socket.emit('requestTableOptions', 'tavla');
    let tavlaRes = await new Promise(resolve => socket.once('tableOptionsModal', resolve));
    console.log('✓ Tavla table options received:', tavlaRes.title || 'OK');

    // 5. Test Blackjack join
    console.log('Testing Blackjack join...');
    socket.emit('blackjack_join');
    let bjTable = await new Promise(resolve => socket.once('blackjack_init', resolve));
    console.log('✓ Blackjack init received, table state:', bjTable.state);

    socket.disconnect();
    console.log('\n=======================================');
    console.log('E2E TEST PASSED COMPLETELY WITHOUT ANY ISSUES!');
    console.log('=======================================');
    process.exit(0);
}

run().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
