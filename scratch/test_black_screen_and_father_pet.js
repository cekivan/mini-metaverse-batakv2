// scratch/test_black_screen_and_father_pet.js
const io = require('socket.io-client');
const assert = require('assert');
const http = require('http');

async function testAll() {
    console.log('1. Checking HTTP HTML delivery and canvas...');
    await new Promise((resolve, reject) => {
        http.get('http://localhost:3000/', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                assert.ok(data.includes('id="gameCanvas"'), 'gameCanvas must exist in HTML');
                assert.ok(!data.includes('blackjackModal"><canvas'), 'gameCanvas must not be inside blackjackModal');
                console.log('✓ HTML delivered properly and gameCanvas is at body level!');
                resolve();
            });
        }).on('error', reject);
    });

    console.log('2. Connecting test players...');
    const p1 = io('http://localhost:3000', { forceNew: true });
    const p2 = io('http://localhost:3000', { forceNew: true });

    await Promise.all([
        new Promise(r => p1.on('connect', r)),
        new Promise(r => p2.on('connect', r))
    ]);

    const u1 = 'p1_' + Math.floor(Math.random() * 90000 + 10000);
    const u2 = 'p2_' + Math.floor(Math.random() * 90000 + 10000);

    await new Promise(r => {
        p1.emit('register', { name: u1, pass: '123456', gender: 'male' });
        p1.on('loginSuccess', () => r());
    });

    await new Promise(r => {
        p2.emit('register', { name: u2, pass: '123456', gender: 'female' });
        p2.on('loginSuccess', () => r());
    });
    console.log('✓ Both players registered and logged in!');

    // P1 goes to sahil
    p1.emit('changeRoom', 'sahil');
    await new Promise(r => setTimeout(r, 200));

    // P1 catches father pet
    console.log('3. Triggering father catch and spawning pet in sahil...');
    const caughtPromise = new Promise(r => p1.on('fatherCaughtPrompt', r));
    p1.emit('devTriggerFatherCatch');
    await caughtPromise;

    const spawnPromise = new Promise(r => {
        p1.on('fatherMiracleSpawn', data => {
            r(data.pet);
        });
    });
    p1.emit('fatherChoice', { choice: 'spare' });
    const spawnedPet = await spawnPromise;
    assert.strictEqual(spawnedPet.room, 'sahil', 'Pet must spawn in sahil');
    assert.ok(spawnedPet.expiresAt > Date.now(), 'Pet must have expiresAt set');
    console.log('✓ Father pet spawned in sahil with expiresAt!');

    // Test traveling through rooms
    const testRooms = ['sokak', 'kafe', 'nargile_cafe', 'cadde', 'ganyan', 'dedenin_yeri', 'emlakci', 'market', 'house_' + u1 + '_standart'];

    for (let targetRoom of testRooms) {
        console.log('4. Testing travel to ' + targetRoom + '...');
        p2.emit('changeRoom', targetRoom);
        await new Promise(r => setTimeout(r, 100));

        let p1PetInNewRoom = null;
        let p2SawPet = null;

        const checkP1 = new Promise(resolve => {
            const onActive = (pets) => {
                let myPet = pets.find(p => p.ownerName === u1 && p.room === targetRoom);
                if (myPet) {
                    p1.off('activeFatherPets', onActive);
                    p1.off('fatherPetSpawned', onSpawn);
                    resolve(myPet);
                }
            };
            const onSpawn = (data) => {
                if (data && data.pet && data.pet.ownerName === u1 && data.pet.room === targetRoom) {
                    p1.off('activeFatherPets', onActive);
                    p1.off('fatherPetSpawned', onSpawn);
                    resolve(data.pet);
                }
            };
            p1.on('activeFatherPets', onActive);
            p1.on('fatherPetSpawned', onSpawn);
        });

        const checkP2 = new Promise(resolve => {
            const onActive = (pets) => {
                let found = pets.find(p => p.ownerName === u1 && p.room === targetRoom);
                if (found) {
                    p2.off('activeFatherPets', onActive);
                    p2.off('fatherPetSpawned', onSpawn);
                    resolve(found);
                }
            };
            const onSpawn = (data) => {
                if (data && data.pet && data.pet.ownerName === u1 && data.pet.room === targetRoom) {
                    p2.off('activeFatherPets', onActive);
                    p2.off('fatherPetSpawned', onSpawn);
                    resolve(data.pet);
                }
            };
            p2.on('activeFatherPets', onActive);
            p2.on('fatherPetSpawned', onSpawn);
        });

        p1.emit('changeRoom', targetRoom);

        p1PetInNewRoom = await checkP1;
        assert.ok(p1PetInNewRoom, 'Pet must accompany owner into ' + targetRoom);
        assert.strictEqual(p1PetInNewRoom.room, targetRoom);
        console.log('   ✓ P1 pet followed into ' + targetRoom);

        p2SawPet = await checkP2;
        assert.ok(p2SawPet, 'P2 in ' + targetRoom + ' must see P1 father pet');
        console.log('   ✓ P2 witnessed father pet in ' + targetRoom);
    }

    // 5. Test movement synchronization
    console.log('5. Testing playerMovement sync for father pet...');
    p1.emit('playerMovement', { x: 500, y: 350, isMoving: true });
    await new Promise(r => setTimeout(r, 150));
    const p3 = io('http://localhost:3000', { forceNew: true });
    await new Promise(r => p3.on('connect', r));
    const u3 = 'p3_' + Math.floor(Math.random() * 90000 + 10000);
    p3.emit('register', { name: u3, pass: '123456', gender: 'male' });
    await new Promise(r => p3.on('loginSuccess', r));

    const lastRoom = testRooms[testRooms.length - 1];
    p3.emit('changeRoom', lastRoom);
    const p3Saw = await new Promise(resolve => {
        p3.on('activeFatherPets', pets => {
            let found = pets.find(p => p.ownerName === u1);
            if (found) resolve(found);
        });
    });
    assert.ok(p3Saw.x >= 500, 'Father pet position must be synchronized with owner movement');
    console.log('✓ Father pet position accurately synchronized with owner movement!');

    console.log('\n🎉 ALL TESTS PASSED! Black screen fixed and Father pet travels to all rooms!');
    p1.disconnect();
    p2.disconnect();
    p3.disconnect();
    process.exit(0);
}

testAll().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
