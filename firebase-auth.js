/* firebase-auth.js — buuks.in
   Requires in index.html:
     firebase-app-compat.js
     firebase-auth-compat.js                     */

const firebaseConfig = {
  apiKey: "AIzaSyBknQAFZQpvUDuygVRsQf7tXoejyyPN7us",
  authDomain: "buuks-dcda2.firebaseapp.com",
  projectId: "buuks-dcda2",
  storageBucket: "buuks-dcda2.firebasestorage.app",
  messagingSenderId: "26513615422",
  appId: "1:26513615422:web:f62aab529417968f02bf6f",
  measurementId: "G-767K037H63"
};

/* ── STATE ── */
let auth;
let currentUser = null;
let _menuOpen   = false;

/* ════════════════════════════════
   INIT
════════════════════════════════ */
function initializeFirebase() {
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  auth.getRedirectResult().catch(function() {});
  auth.onAuthStateChanged(function(user) {
    currentUser = user;
    _renderBtn();
    if (user) {
      _saveLocal(user);
      closeSignInModal();
    } else {
      _clearLocal();
    }
  });
}

/* ════════════════════════════════
   BUTTON RENDERER
   Only this function changes the button HTML.
════════════════════════════════ */
function _renderBtn() {
  var btn = document.getElementById('signInBtn');
  if (!btn) return;
  if (currentUser) {
    var name    = currentUser.displayName || currentUser.email || 'Account';
    var initial = name.charAt(0).toUpperCase();
    btn.innerHTML =
      '<span style="width:24px;height:24px;border-radius:50%;'
      + 'background:rgba(255,255,255,.28);display:inline-flex;align-items:center;'
      + 'justify-content:center;font-size:.72rem;font-weight:700;flex-shrink:0;">'
      + _esc(initial) + '</span>'
      + '<span style="max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'
      + _esc(name.split(' ')[0]) + '</span>'
      + '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor"'
      + ' stroke-width="2" style="flex-shrink:0;opacity:.7;">'
      + '<polyline points="1,3 5,7 9,3"/></svg>';
    btn.title = currentUser.email || '';
  } else {
    btn.innerHTML =
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
      + ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>'
      + '<circle cx="12" cy="7" r="4"/></svg> Sign In';
    btn.title = '';
  }
}

/* ════════════════════════════════
   SIGN-IN BUTTON — single permanent click handler
════════════════════════════════ */
function _onSignInBtnClick(e) {
  e.stopPropagation();
  if (currentUser) {
    _menuOpen ? _closeMenu() : _openMenu();
  } else {
    openSignInModal();
  }
}

/* ════════════════════════════════
   AUTH
════════════════════════════════ */
function signInWithEmail(email, password) {
  var btn = document.querySelector('#loginForm .signin-btn-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }
  auth.signInWithEmailAndPassword(email, password)
    .then(function() {
      if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
    })
    .catch(function(err) {
      _showErr(getFriendlyError(err.code));
      if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
    });
}

function registerWithEmail(name, email, password, confirm) {
  if (password !== confirm)  { _showErr('Passwords do not match'); return; }
  if (password.length < 6)   { _showErr('Password must be at least 6 characters'); return; }
  var btn = document.querySelector('#registerForm .signin-btn-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Creating account...'; }
  auth.createUserWithEmailAndPassword(email, password)
    .then(function(c) { return c.user.updateProfile({ displayName: name }); })
    .then(function() {
      if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
      setTimeout(closeSignInModal, 800);
    })
    .catch(function(err) {
      _showErr(getFriendlyError(err.code));
      if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
    });
}

function signInWithGoogle() {
  var provider = new firebase.auth.GoogleAuthProvider();
  var gBtn = document.getElementById('googleSignIn');
  if (gBtn) { gBtn.disabled = true; gBtn.textContent = 'Opening Google...'; }
  auth.signInWithPopup(provider)
    .then(function() {
      if (gBtn) { gBtn.disabled = false; gBtn.textContent = 'Sign in with Google'; }
      setTimeout(closeSignInModal, 400);
    })
    .catch(function(err) {
      if (gBtn) { gBtn.disabled = false; gBtn.textContent = 'Sign in with Google'; }
      if (err.code === 'auth/popup-closed-by-user' ||
          err.code === 'auth/cancelled-popup-request') return;
      if (err.code === 'auth/popup-blocked') {
        _showErr('Popup blocked — redirecting to Google...');
        setTimeout(function() { auth.signInWithRedirect(provider); }, 1200);
        return;
      }
      _showErr(getFriendlyError(err.code));
    });
}

function signOut() {
  _closeMenu();
  auth.signOut().then(function() {
    currentUser = null;
    _clearLocal();
    _renderBtn();
    setTimeout(function() { window.location.reload(); }, 300);
  });
}

/* ════════════════════════════════
   USER GETTERS
════════════════════════════════ */
function getCurrentUser() { return currentUser; }
function isUserLoggedIn() { return currentUser !== null; }
function getUserEmail()   { return currentUser ? currentUser.email : null; }
function getUserName()    { return currentUser ? (currentUser.displayName || currentUser.email) : null; }
function getUserUID()     { return currentUser ? currentUser.uid : null; }

/* ════════════════════════════════
   LOCAL STORAGE (session cache only)
════════════════════════════════ */
function _saveLocal(user) {
  localStorage.setItem('buuksUser', JSON.stringify({
    uid: user.uid, email: user.email,
    displayName: user.displayName, photoURL: user.photoURL
  }));
  localStorage.setItem('buuksUserLoggedIn', 'true');
}
function _clearLocal() {
  localStorage.removeItem('buuksUser');
  localStorage.removeItem('buuksUserLoggedIn');
}

/* ════════════════════════════════
   USER MENU DROPDOWN
════════════════════════════════ */
function _openMenu() {
  var btn = document.getElementById('signInBtn');
  if (!btn) return;
  var parent = btn.parentElement;
  if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
  document.getElementById('_buuksMenu')?.remove();

  var name    = getUserName() || 'Account';
  var email   = getUserEmail() || '';
  var initial = name.charAt(0).toUpperCase();

  var menu = document.createElement('div');
  menu.id = '_buuksMenu';
  menu.style.cssText =
    'position:absolute;top:calc(100% + 8px);right:0;width:272px;background:#fff;'
    + 'border:1px solid #e0e2f0;border-radius:14px;'
    + 'box-shadow:0 12px 40px rgba(28,29,48,.16);z-index:99999;overflow:hidden;'
    + 'animation:_mIn .17s cubic-bezier(.34,1.4,.64,1);';

  menu.innerHTML = ''
    + '<style>@keyframes _mIn{from{opacity:0;transform:translateY(-5px) scale(.97)}to{opacity:1;transform:none}}'
    + '._mi{display:flex;align-items:center;gap:.7rem;width:100%;padding:.72rem 1rem;'
    + 'background:none;border:none;font-family:"Plus Jakarta Sans",sans-serif;'
    + 'font-size:.875rem;font-weight:500;color:#374151;cursor:pointer;text-align:left;transition:background .12s;}'
    + '._mi:hover{background:#f5f6fd;}._mi svg{flex-shrink:0;color:#9496b2;}'
    + '._mi.red{color:#e5495e;}._mi.red svg{color:#e5495e;}._mi.red:hover{background:#fff0f2;}</style>'
    /* header */
    + '<div style="padding:1rem;display:flex;gap:.75rem;align-items:center;border-bottom:1px solid #f3f4f6;">'
    +   '<div style="width:42px;height:42px;border-radius:50%;'
    +        'background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;'
    +        'display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem;flex-shrink:0;">'
    +     _esc(initial)
    +   '</div>'
    +   '<div style="min-width:0;">'
    +     '<div style="font-weight:700;font-size:.9rem;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + _esc(name) + '</div>'
    +     '<div style="font-size:.73rem;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + _esc(email) + '</div>'
    +   '</div>'
    + '</div>'
    /* items */
    + '<div style="padding:.35rem 0;">'
    +   '<button class="_mi" id="_mHistory">'
    +     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    +       '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>'
    +       '<polyline points="14 2 14 8 20 8"/>'
    +       '<line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>'
    +     '</svg>Order History'
    +   '</button>'
    +   '<div style="height:1px;background:#f3f4f6;margin:.3rem 0;"></div>'
    +   '<button class="_mi red" id="_mSignOut">'
    +     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    +       '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>'
    +       '<polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>'
    +     '</svg>Sign Out'
    +   '</button>'
    + '</div>';

  menu.querySelector('#_mHistory').addEventListener('click', function() {
    _closeMenu();
    if (typeof openOrderHistory === 'function') openOrderHistory();
  });
  menu.querySelector('#_mSignOut').addEventListener('click', signOut);

  parent.appendChild(menu);
  _menuOpen = true;
  setTimeout(function() {
    document.addEventListener('click', _outsideClick, true);
  }, 0);
}

function _closeMenu() {
  document.getElementById('_buuksMenu')?.remove();
  document.removeEventListener('click', _outsideClick, true);
  _menuOpen = false;
}

function _outsideClick(e) {
  var menu = document.getElementById('_buuksMenu');
  var btn  = document.getElementById('signInBtn');
  if (menu && !menu.contains(e.target) && btn && !btn.contains(e.target)) {
    _closeMenu();
  }
}

/* ════════════════════════════════
   SIGN-IN MODAL
════════════════════════════════ */
function openSignInModal() {
  document.getElementById('signinModal')?.classList.add('show');
  document.getElementById('signinModalOverlay')?.classList.add('show');
  document.body.style.overflow = 'hidden';
  _switchTab('login');
}
function closeSignInModal() {
  document.getElementById('signinModal')?.classList.remove('show');
  document.getElementById('signinModalOverlay')?.classList.remove('show');
  document.body.style.overflow = '';
}

function _switchTab(tab) {
  document.querySelectorAll('.signin-tab-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  var lf = document.getElementById('loginForm');
  var rf = document.getElementById('registerForm');
  if (lf) lf.style.display = tab === 'login'    ? 'flex' : 'none';
  if (rf) rf.style.display = tab === 'register' ? 'flex' : 'none';
}

/* ════════════════════════════════
   ERRORS
════════════════════════════════ */
function getFriendlyError(code) {
  var m = {
    'auth/user-not-found':          'No account found with this email.',
    'auth/wrong-password':          'Incorrect password.',
    'auth/invalid-credential':      'Incorrect email or password.',
    'auth/email-already-in-use':    'This email is already registered.',
    'auth/invalid-email':           'Please enter a valid email address.',
    'auth/weak-password':           'Password must be at least 6 characters.',
    'auth/too-many-requests':       'Too many attempts. Try again later.',
    'auth/popup-closed-by-user':    'Google sign-in was cancelled.',
    'auth/cancelled-popup-request': 'Google sign-in was cancelled.',
    'auth/popup-blocked':           'Popup blocked.',
    'auth/network-request-failed':  'Network error. Check your connection.',
    'auth/unauthorized-domain':     'Domain not authorised in Firebase Console.',
    'auth/operation-not-allowed':   'Google sign-in not enabled in Firebase Console.'
  };
  return m[code] || 'Something went wrong (' + code + '). Please try again.';
}

function _showErr(message) {
  document.querySelectorAll('.auth-inline-error').forEach(function(el) { el.remove(); });
  var lf   = document.getElementById('loginForm');
  var rf   = document.getElementById('registerForm');
  var form = (lf && lf.style.display !== 'none') ? lf : rf;
  if (!form) return;
  var div = document.createElement('div');
  div.className = 'auth-inline-error';
  div.style.cssText = 'background:#fee2e2;border:1px solid #fecaca;border-radius:8px;'
    + 'padding:.65rem .9rem;font-size:.82rem;color:#991b1b;margin-bottom:.3rem;line-height:1.5;';
  div.textContent = '\u26A0\uFE0F ' + message;
  var sb = form.querySelector('.signin-btn-submit');
  if (sb) form.insertBefore(div, sb); else form.prepend(div);
  setTimeout(function() { div.remove(); }, 6000);
}

function _esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ════════════════════════════════
   CHECKOUT / CART HELPERS
════════════════════════════════ */
function requireAuthForCheckout() {
  if (!currentUser) { openSignInModal(); return false; }
  return true;
}
function prepareOrderWithUserInfo(orderData) {
  if (!currentUser) return orderData;
  return Object.assign({}, orderData, {
    userId:    currentUser.uid,
    userEmail: currentUser.email,
    userName:  currentUser.displayName || 'Guest'
  });
}

/* ════════════════════════════════
   DOM READY
════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function() {
  initializeFirebase();

  /* ── Sign In button — ONE listener, never removed ── */
  var signInBtn = document.getElementById('signInBtn');
  if (signInBtn) signInBtn.addEventListener('click', _onSignInBtnClick);

  /* ── Modal close ── */
  document.getElementById('signinModalClose')?.addEventListener('click', closeSignInModal);
  document.getElementById('signinModalOverlay')?.addEventListener('click', closeSignInModal);

  /* ── ESC ── */
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    _closeMenu();
    if (typeof closeOrderHistory === 'function') closeOrderHistory();
    closeSignInModal();
  });

  /* ── Tabs ── */
  document.querySelectorAll('.signin-tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { _switchTab(btn.dataset.tab); });
  });
  document.querySelectorAll('.switch-tab').forEach(function(link) {
    link.addEventListener('click', function(e) { e.preventDefault(); _switchTab(link.dataset.tab); });
  });

  /* ── Login form ── */
  var lf = document.getElementById('loginForm');
  if (lf) lf.addEventListener('submit', function(e) {
    e.preventDefault();
    var email = document.getElementById('loginEmail').value.trim();
    var pass  = document.getElementById('loginPassword').value;
    if (!email || !pass) { _showErr('Please fill in all fields'); return; }
    signInWithEmail(email, pass);
  });

  /* ── Register form ── */
  var rf = document.getElementById('registerForm');
  if (rf) rf.addEventListener('submit', function(e) {
    e.preventDefault();
    var name    = document.getElementById('registerName').value.trim();
    var email   = document.getElementById('registerEmail').value.trim();
    var pass    = document.getElementById('registerPassword').value;
    var confirm = document.getElementById('registerConfirm').value;
    var agreed  = document.getElementById('agreeTerms').checked;
    if (!name || !email || !pass || !confirm) { _showErr('Please fill in all fields'); return; }
    if (!agreed) { _showErr('Please agree to the Terms & Conditions'); return; }
    registerWithEmail(name, email, pass, confirm);
  });

  /* ── Google ── */
  document.getElementById('googleSignIn')?.addEventListener('click', signInWithGoogle);

  /* ── Forgot password ── */
  var forgot = document.querySelector('.forgot-link');
  if (forgot) forgot.addEventListener('click', function(e) {
    e.preventDefault();
    var email = document.getElementById('loginEmail').value.trim();
    if (!email) { _showErr('Enter your email above first'); return; }
    auth.sendPasswordResetEmail(email)
      .then(function() { _showErr('\u2705 Reset email sent \u2014 check your inbox!'); })
      .catch(function(err) { _showErr(getFriendlyError(err.code)); });
  });

  console.log('\u2713 firebase-auth.js loaded');
});

/* ════════════════════════════════
   PUBLIC API
════════════════════════════════ */
window.firebaseAuth = {
  signInWithEmail,
  registerWithEmail,
  signInWithGoogle,
  signOut,
  getCurrentUser,
  isUserLoggedIn,
  getUserEmail,
  getUserName,
  getUserUID,
  requireAuthForCheckout,
  prepareOrderWithUserInfo,
  openSignInModal,
  closeSignInModal
};
