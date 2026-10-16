// public/js/authUI.js - Giriş, Kayıt, Şifre Değiştirme ve Kimlik Doğrulama Arayüzü

window.selectedGender = 'male';
window.selectedRegisterGender = 'male';

function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginFormContainer');
    const registerForm = document.getElementById('registerFormContainer');
    const tabBtnLogin = document.getElementById('tabBtnLogin');
    const tabBtnRegister = document.getElementById('tabBtnRegister');
    const loginErr = document.getElementById('loginError');
    const regErr = document.getElementById('regError');

    if (loginErr) loginErr.style.display = 'none';
    if (regErr) regErr.style.display = 'none';

    if (tab === 'register') {
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'block';
        if (tabBtnLogin) {
            tabBtnLogin.style.background = 'transparent';
            tabBtnLogin.style.color = '#94a3b8';
        }
        if (tabBtnRegister) {
            tabBtnRegister.style.background = '#10b981';
            tabBtnRegister.style.color = 'white';
        }
        const regName = document.getElementById('regUsernameInput');
        if (regName) regName.focus();
    } else {
        if (registerForm) registerForm.style.display = 'none';
        if (loginForm) loginForm.style.display = 'block';
        if (tabBtnLogin) {
            tabBtnLogin.style.background = '#3b82f6';
            tabBtnLogin.style.color = 'white';
        }
        if (tabBtnRegister) {
            tabBtnRegister.style.background = 'transparent';
            tabBtnRegister.style.color = '#94a3b8';
        }
        const userInp = document.getElementById('usernameInput');
        if (userInp) userInp.focus();
    }
}

function selectRegisterGender(gender) {
    window.selectedRegisterGender = gender;
    window.selectedGender = gender;
    const btnMale = document.getElementById('regGenderBtnMale');
    const btnFemale = document.getElementById('regGenderBtnFemale');
    if (gender === 'female') {
        if (btnFemale) {
            btnFemale.style.border = '2px solid #ec4899';
            btnFemale.style.background = 'rgba(236, 72, 153, 0.25)';
            btnFemale.style.color = 'white';
        }
        if (btnMale) {
            btnMale.style.border = '2px solid rgba(255,255,255,0.15)';
            btnMale.style.background = 'rgba(15, 23, 42, 0.6)';
            btnMale.style.color = '#94a3b8';
        }
    } else {
        if (btnMale) {
            btnMale.style.border = '2px solid #38bdf8';
            btnMale.style.background = 'rgba(56, 189, 248, 0.25)';
            btnMale.style.color = 'white';
        }
        if (btnFemale) {
            btnFemale.style.border = '2px solid rgba(255,255,255,0.15)';
            btnFemale.style.background = 'rgba(15, 23, 42, 0.6)';
            btnFemale.style.color = '#94a3b8';
        }
    }
}
function selectLoginGender(g) { selectRegisterGender(g); }

function attemptLogin() {
    let name = (document.getElementById('usernameInput')?.value || "").trim();
    let pass = (document.getElementById('passwordInput')?.value || "").trim();
    const err = document.getElementById('loginError');

    if (!name) {
        if (err) {
            err.innerHTML = "❌ Lütfen kullanıcı adınızı yazın!";
            err.style.display = 'block';
        }
        return;
    }
    if (pass.length < 3) {
        if (err) {
            err.innerHTML = "❌ Şifreniz en az 3 karakter olmalıdır!";
            err.style.display = 'block';
        }
        return;
    }
    if (err) err.style.display = 'none';
    if (window.socket) window.socket.emit('login', { name: name, pass: pass });
}

function attemptRegister() {
    let name = (document.getElementById('regUsernameInput')?.value || "").trim();
    let pass = (document.getElementById('regPasswordInput')?.value || "").trim();
    let passConfirm = (document.getElementById('regPasswordConfirmInput')?.value || "").trim();
    const err = document.getElementById('regError');

    if (!name || name.length < 2) {
        if (err) {
            err.innerHTML = "❌ Kullanıcı adı en az 2 karakter olmalıdır!";
            err.style.display = 'block';
        }
        return;
    }
    if (name.length > 20) {
        if (err) {
            err.innerHTML = "❌ Kullanıcı adı en fazla 20 karakter olabilir!";
            err.style.display = 'block';
        }
        return;
    }
    if (pass.length < 3) {
        if (err) {
            err.innerHTML = "❌ Şifre en az 3 karakter olmalıdır!";
            err.style.display = 'block';
        }
        return;
    }
    if (pass !== passConfirm) {
        if (err) {
            err.innerHTML = "❌ Şifreler eşleşmiyor! Lütfen iki şifreyi de aynı girin.";
            err.style.display = 'block';
        }
        return;
    }
    if (err) err.style.display = 'none';
    if (window.socket) {
        window.socket.emit('register', {
            name: name,
            pass: pass,
            gender: window.selectedRegisterGender || 'male'
        });
    }
}

// Şifre Değiştirme Fonksiyonları (Oyun İçi)
function openChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    const oldP = document.getElementById('cpOldPassword');
    const newP = document.getElementById('cpNewPassword');
    const confirmP = document.getElementById('cpNewPasswordConfirm');
    const status = document.getElementById('changePasswordStatus');

    if (oldP) oldP.value = '';
    if (newP) newP.value = '';
    if (confirmP) confirmP.value = '';
    if (status) {
        status.style.display = 'none';
        status.innerHTML = '';
    }

    if (modal) {
        modal.style.display = 'flex';
        if (oldP) oldP.focus();
    }
}

function closeChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) modal.style.display = 'none';
}

function submitChangePassword() {
    const oldP = (document.getElementById('cpOldPassword')?.value || "").trim();
    const newP = (document.getElementById('cpNewPassword')?.value || "").trim();
    const confirmP = (document.getElementById('cpNewPasswordConfirm')?.value || "").trim();
    const status = document.getElementById('changePasswordStatus');

    if (!oldP) {
        showPasswordChangeFeedback(false, "❌ Lütfen mevcut eski şifrenizi girin!");
        return;
    }
    if (newP.length < 3) {
        showPasswordChangeFeedback(false, "❌ Yeni şifre en az 3 karakter olmalıdır!");
        return;
    }
    if (newP === oldP) {
        showPasswordChangeFeedback(false, "❌ Yeni şifre eskisiyle aynı olamaz!");
        return;
    }
    if (newP !== confirmP) {
        showPasswordChangeFeedback(false, "❌ Yeni şifreler eşleşmiyor!");
        return;
    }

    if (status) {
        status.style.display = 'block';
        status.style.background = 'rgba(59, 130, 246, 0.2)';
        status.style.border = '1px solid #3b82f6';
        status.style.color = '#93c5fd';
        status.innerHTML = '⏳ Şifre güncelleniyor...';
    }

    if (window.socket) window.socket.emit('changePassword', { oldPass: oldP, newPass: newP });
}

function showPasswordChangeFeedback(success, message) {
    const status = document.getElementById('changePasswordStatus');
    if (!status) return;
    status.style.display = 'block';
    if (success) {
        status.style.background = 'rgba(16, 185, 129, 0.2)';
        status.style.border = '1px solid #10b981';
        status.style.color = '#6ee7b7';
    } else {
        status.style.background = 'rgba(239, 68, 68, 0.2)';
        status.style.border = '1px solid #ef4444';
        status.style.color = '#fca5a5';
    }
    status.innerHTML = message;
}

// Socket Dinleyicileri
if (window.socket) {
    window.socket.on('loginFailed', (reason) => {
        const err = document.getElementById('loginError');
        if (err) {
            err.innerHTML = reason || "❌ Yanlış şifre!";
            err.style.display = 'block';
        } else {
            alert(reason);
        }
    });

    window.socket.on('registerFailed', (reason) => {
        const err = document.getElementById('regError');
        if (err) {
            err.innerHTML = reason || "❌ Kayıt başarısız!";
            err.style.display = 'block';
        } else {
            alert(reason);
        }
    });

    window.socket.on('passwordChangeResult', (data) => {
        if (!data) return;
        showPasswordChangeFeedback(data.success, data.message);
        if (data.success) {
            const oldP = document.getElementById('cpOldPassword');
            const newP = document.getElementById('cpNewPassword');
            const confirmP = document.getElementById('cpNewPasswordConfirm');
            if (oldP) oldP.value = '';
            if (newP) newP.value = '';
            if (confirmP) confirmP.value = '';
            setTimeout(() => {
                closeChangePasswordModal();
            }, 1600);
        }
    });
}

// --- YENİ GÜNCELLEMELER (BETA v1.3) MODAL KONTROLLERİ ---
function openUpdatesModal() {
    const modal = document.getElementById('updatesModal');
    if (modal) {
        modal.style.display = 'flex';
        if (typeof playSound === 'function') {
            try { playSound('pop'); } catch(e) {}
        }
    }
}

function closeUpdatesModal() {
    const modal = document.getElementById('updatesModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

window.openUpdatesModal = openUpdatesModal;
window.closeUpdatesModal = closeUpdatesModal;

