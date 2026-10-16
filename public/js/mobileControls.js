// public/js/mobileControls.js - Mobil Dokunmatik Ekran & Sanal D-Pad Kontrolleri

function checkMobileDeviceHUD() {
    let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (window.innerWidth <= 860) ||
        ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0);
    let dpad = document.getElementById('mobileControlsOverlay');
    let actionBtn = document.getElementById('mobileActionBtn');
    if (dpad) dpad.style.display = isMobile ? 'block' : 'none';
    if (actionBtn) actionBtn.style.display = isMobile ? 'flex' : 'none';
}

function initMobileDpadTracking() {
    const dpad = document.getElementById('mobileControlsOverlay');
    if (!dpad) return;

    let touchId = null;

    dpad.addEventListener('touchstart', (e) => {
        if (e.changedTouches.length > 0) {
            let t = e.changedTouches[0];
            touchId = t.identifier;
            updateDpadFromTouch(t.clientX, t.clientY);
        }
    }, { passive: false });

    dpad.addEventListener('touchmove', (e) => {
        if (e.cancelable) e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            let t = e.changedTouches[i];
            if (t.identifier === touchId) {
                updateDpadFromTouch(t.clientX, t.clientY);
                break;
            }
        }
    }, { passive: false });

    const endTouch = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === touchId) {
                touchId = null;
                if (typeof keys !== 'undefined') {
                    keys.w = false;
                    keys.a = false;
                    keys.s = false;
                    keys.d = false;
                }
                break;
            }
        }
    };

    dpad.addEventListener('touchend', endTouch);
    dpad.addEventListener('touchcancel', endTouch);
}

function updateDpadFromTouch(clientX, clientY) {
    const dpad = document.getElementById('mobileControlsOverlay');
    if (!dpad) return;
    if (typeof targetWalkPos !== 'undefined') targetWalkPos = null;
    let rect = dpad.getBoundingClientRect();
    let centerX = rect.left + rect.width / 2;
    let centerY = rect.top + rect.height / 2;
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    let dist = Math.hypot(dx, dy);

    if (dist < 12) {
        if (typeof keys !== 'undefined') {
            keys.w = false; keys.a = false; keys.s = false; keys.d = false;
        }
        return;
    }

    if (typeof standUpIfSitting === 'function') {
        standUpIfSitting();
    }

    if (typeof keys !== 'undefined') {
        keys.d = (dx > 14);
        keys.a = (dx < -14);
        keys.s = (dy > 14);
        keys.w = (dy < -14);
    }

    if (Math.abs(dx) > Math.abs(dy)) {
        if (typeof myFacing !== 'undefined') myFacing = dx > 0 ? 'right' : 'left';
    } else {
        if (typeof myFacing !== 'undefined') myFacing = dy > 0 ? 'down' : 'up';
    }
}

// Global Event Listeners
window.addEventListener('resize', () => {
    checkMobileDeviceHUD();
    if (typeof bgCache !== 'undefined') bgCache.invalidate();
});
window.addEventListener('orientationchange', () => {
    checkMobileDeviceHUD();
    if (typeof bgCache !== 'undefined') bgCache.invalidate();
});
document.addEventListener('DOMContentLoaded', () => {
    checkMobileDeviceHUD();
    initMobileDpadTracking();
});
setTimeout(() => {
    checkMobileDeviceHUD();
    initMobileDpadTracking();
}, 600);
