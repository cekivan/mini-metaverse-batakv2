const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scripts = [
  'js/audio.js', 'js/authUI.js', 'js/chatBubbles.js', 'js/wardrobe.js',
  'js/avatarRenderer.js', 'js/worldRenderer.js', 'js/seatRegistry.js',
  'js/fishing.js', 'js/adminPanel.js', 'js/mobileControls.js', 'js/social.js',
  'js/furnitureDrawers.js', 'js/housing.js', 'js/main.js', 'js/fatherPet.js'
];

const mockCtx = new Proxy({}, {
  get: (target, prop) => {
    if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
      return () => ({ addColorStop: () => {} });
    }
    if (prop === 'measureText') {
      return (txt) => ({ width: (txt || '').length * 7 });
    }
    return () => {};
  }
});

const mockCanvas = {
  width: 800,
  height: 500,
  getContext: () => mockCtx,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 500 }),
  addEventListener: () => {}
};

const sandbox = {
  window: {},
  document: {
    getElementById: (id) => {
      if (id === 'gameCanvas') return mockCanvas;
      return { style: {}, classList: { add: ()=>{}, remove: ()=>{} }, innerText: '', addEventListener: ()=>{} };
    },
    createElement: (tag) => {
      if (tag === 'canvas') return { width: 800, height: 500, getContext: () => mockCtx };
      return { style: {}, appendChild: ()=>{} };
    },
    addEventListener: () => {},
    body: { appendChild: () => {}, style: {} }
  },
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  requestAnimationFrame: () => {},
  performance: { now: () => Date.now() },
  Date: Date,
  Math: Math,
  Image: function() { this.src = ''; },
  AudioContext: function() {
    this.createBuffer = () => {};
    this.createGain = () => ({ gain: { value: 1, setValueAtTime: () => {} }, connect: () => {} });
    this.destination = {};
  },
  webkitAudioContext: function() { this.createBuffer = () => {}; },
  localStorage: { getItem: () => null, setItem: () => {} },
  socket: { emit: () => {}, on: () => {} }
};
sandbox.window = sandbox;
sandbox.addEventListener = () => {};
sandbox.canvas = mockCanvas;
sandbox.ctx = mockCtx;

const context = vm.createContext(sandbox);
for (const s of scripts) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'public', s), 'utf8');
  vm.runInContext(code, context);
}

// Mock player login
vm.runInContext(`
  myId = 'test_p1';
  players = {
    'test_p1': {
      x: 100, y: 240, room: 'sokak', name: 'TestUser',
      skinColor: '#ffd1a4', color: '#3b82f6', shoes: 'sneakers',
      action: null, isMoving: false
    }
  };
`, context);

console.log('Testing changeRoom to sahil...');
try {
  vm.runInContext("changeRoom('sahil');", context);
  console.log('✓ changeRoom sahil succeeded, currentRoom:', sandbox.currentRoom);
  console.log('p.x:', sandbox.players['test_p1'].x, 'p.y:', sandbox.players['test_p1'].y);

  vm.runInContext("gameLoop(Date.now());", context);
  console.log('✓ gameLoop sahil frame 1 executed');

  // Now test walking in sahil
  sandbox.keys = { a: true, w: false, s: false, d: false };
  for (let i = 0; i < 20; i++) {
    vm.runInContext("gameLoop(Date.now());", context);
  }
  console.log('✓ 20 walking frames in sahil executed without crash!');
  console.log('p.x:', sandbox.players['test_p1'].x, 'p.y:', sandbox.players['test_p1'].y);
} catch (e) {
  console.error('✗ ERROR during sahil transition:', e);
}
