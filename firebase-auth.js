/* firebase-auth.js — buuks.in
   Requires firebase-app-compat.js + firebase-auth-compat.js in index.html */

const firebaseConfig = {
  apiKey: "AIzaSyBknQAFZQpvUDuygVRsQf7tXoejyyPN7us",
  authDomain: "buuks-dcda2.firebaseapp.com",
  projectId: "buuks-dcda2",
  storageBucket: "buuks-dcda2.firebasestorage.app",
  messagingSenderId: "26513615422",
  appId: "1:26513615422:web:f62aab529417968f02bf6f",
  measurementId: "G-767K037H63"
};

let auth;
let currentUser = null;

function initializeFirebase() {
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();

  auth.getRedirectResult()
    .then((result) => { if (result && result.user) console.log('Redirect sign-in:', result.user.email); })
    .catch((err) => { if (err.code !== 'auth/no-current-user') console.error('Redirect error:', err.code); });

  auth.onAuthStateChanged((user) => {
    currentUser = user;
    updateUIAfterAuth();
    if (user) { saveUserToLocalStorage(user); closeSignInModal(); }
    else { clearUserFromLocalStorage(); }
  });
}

/* ── AUTH ── */
function signInWithEmail(email, password) {
  const btn = document.querySelector('#loginForm .signin-btn-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }
  auth.signInWithEmailAndPassword(email, password)
    .then(() => { if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; } })
    .catch((err) => {
      showAuthError(getFriendlyError(err.code));
      if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
    });
}

function registerWithEmail(name, email, password, confirmPassword) {
  if (password !== confirmPassword) { showAuthError('Passwords do not match'); return; }
  if (password.length < 6) { showAuthError('Password must be at least 6 characters'); return; }
  const btn = document.querySelector('#registerForm .signin-btn-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Creating account...'; }
  auth.createUserWithEmailAndPassword(email, password)
    .then(({ user }) => user.updateProfile({ displayName: name }))
    .then(() => {
      if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
      setTimeout(() => closeSignInModal(), 800);
    })
    .catch((err) => {
      showAuthError(getFriendlyError(err.code));
      if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
    });
}

function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  const googleBtn = document.getElementById('googleSignIn');
  if (googleBtn) { googleBtn.disabled = true; googleBtn.textContent = 'Opening Google...'; }
  auth.signInWithPopup(provider)
    .then((result) => {
      if (googleBtn) { googleBtn.disabled = false; googleBtn.textContent = 'Sign in with Google'; }
      setTimeout(() => closeSignInModal(), 500);
    })
    .catch((err) => {
      if (googleBtn) { googleBtn.disabled = false; googleBtn.textContent = 'Sign in with Google'; }
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return;
      if (err.code === 'auth/popup-blocked') {
        showAuthError('Popup blocked. Redirecting to Google...');
        setTimeout(() => auth.signInWithRedirect(provider), 1200);
        return;
      }
      if (err.code === 'auth/unauthorized-domain') {
        showAuthError('This domain is not authorised in Firebase Console \u2192 Authentication \u2192 Authorised Domains.');
        return;
      }
      showAuthError(getFriendlyError(err.code));
    });
}

function signOut() {
  closeUserMenu();
  auth.signOut().then(() => {
    currentUser = null;
    clearUserFromLocalStorage();
    setTimeout(() => window.location.reload(), 400);
  });
}

/* ── USER GETTERS ── */
function getCurrentUser() { return currentUser; }
function isUserLoggedIn() { return currentUser !== null; }
function getUserEmail()   { return currentUser ? currentUser.email : null; }
function getUserName()    { return currentUser ? (currentUser.displayName || currentUser.email) : null; }
function getUserUID()     { return currentUser ? currentUser.uid : null; }

/* ── LOCAL STORAGE ── */
function saveUserToLocalStorage(user) {
  localStorage.setItem('buuksUser', JSON.stringify({
    uid: user.uid, email: user.email,
    displayName: user.displayName, photoURL: user.photoURL
  }));
  localStorage.setItem('buuksUserLoggedIn', 'true');
}
function clearUserFromLocalStorage() {
  localStorage.removeItem('buuksUser');
  localStorage.removeItem('buuksUserLoggedIn');
}

/* ── ORDER HISTORY STORAGE ── */
function saveOrderToHistory(orderPayload) {
  const uid = getUserUID();
  if (!uid) return;
  const key = 'buuksOrders_' + uid;
  let orders = [];
  try { orders = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) { orders = []; }
  orders.unshift(orderPayload); // newest first
  if (orders.length > 50) orders = orders.slice(0, 50); // cap at 50
  localStorage.setItem(key, JSON.stringify(orders));
}

function getOrderHistory() {
  const uid = getUserUID();
  if (!uid) return [];
  try { return JSON.parse(localStorage.getItem('buuksOrders_' + uid) || '[]'); } catch(e) { return []; }
}

/* ══ USER MENU DROPDOWN ══ */
function buildUserMenu() {
  // Remove any existing menu
  document.getElementById('buuksUserMenu')?.remove();

  const name  = getUserName() || 'Account';
  const email = getUserEmail() || '';
  const initial = name.charAt(0).toUpperCase();

  const menu = document.createElement('div');
  menu.id = 'buuksUserMenu';
  menu.style.cssText = `
    position:absolute;top:calc(100% + 8px);right:0;
    width:280px;background:#fff;
    border:1px solid #e0e2f0;border-radius:14px;
    box-shadow:0 12px 40px rgba(28,29,48,0.15);
    z-index:9999;overflow:hidden;
    animation:buuksMenuIn 0.18s cubic-bezier(0.34,1.3,0.64,1);
  `;

  menu.innerHTML = `
    <style>
      @keyframes buuksMenuIn {
        from { opacity:0; transform:translateY(-6px) scale(0.97); }
        to   { opacity:1; transform:translateY(0) scale(1); }
      }
      .bum-item {
        display:flex;align-items:center;gap:0.75rem;
        width:100%;padding:0.75rem 1rem;
        background:transparent;border:none;
        font-family:'Plus Jakarta Sans',sans-serif;
        font-size:0.875rem;font-weight:500;
        color:#374151;cursor:pointer;text-align:left;
        transition:background 0.15s;
      }
      .bum-item:hover { background:#f5f6fd; }
      .bum-item svg   { flex-shrink:0;color:#9496b2; }
      .bum-item.danger{ color:#e5495e; }
      .bum-item.danger svg { color:#e5495e; }
      .bum-item.danger:hover { background:#fff0f2; }
    </style>

    <!-- User header -->
    <div style="padding:1rem;display:flex;gap:0.75rem;align-items:center;border-bottom:1px solid #f3f4f6;">
      <div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#4f46e5);
                  color:#fff;display:flex;align-items:center;justify-content:center;
                  font-weight:700;font-size:1rem;flex-shrink:0;">
        ${initial}
      </div>
      <div style="min-width:0;">
        <div style="font-weight:700;font-size:0.9rem;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(name)}</div>
        <div style="font-size:0.75rem;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(email)}</div>
      </div>
    </div>

    <!-- Menu items -->
    <div style="padding:0.4rem 0;">
      <button class="bum-item" id="bumOrderHistory">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
        </svg>
        Order History
      </button>
      <div style="height:1px;background:#f3f4f6;margin:0.3rem 0;"></div>
      <button class="bum-item danger" id="bumSignOut">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Sign Out
      </button>
    </div>
  `;

  document.getElementById('bumOrderHistory', menu)?.addEventListener('click', () => { closeUserMenu(); openOrderHistory(); });
  menu.querySelector('#bumOrderHistory')?.addEventListener('click', () => { closeUserMenu(); openOrderHistory(); });
  menu.querySelector('#bumSignOut')?.addEventListener('click', signOut);

  return menu;
}

let menuOpen = false;

function toggleUserMenu() {
  if (menuOpen) { closeUserMenu(); return; }
  openUserMenu();
}

function openUserMenu() {
  const signInBtn = document.getElementById('signInBtn');
  if (!signInBtn) return;

  // Make sure parent is positioned
  signInBtn.parentElement.style.position = 'relative';

  const menu = buildUserMenu();
  signInBtn.parentElement.appendChild(menu);
  menuOpen = true;

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', outsideMenuClick);
  }, 10);
}

function closeUserMenu() {
  document.getElementById('buuksUserMenu')?.remove();
  menuOpen = false;
  document.removeEventListener('click', outsideMenuClick);
}

function outsideMenuClick(e) {
  const menu = document.getElementById('buuksUserMenu');
  const btn  = document.getElementById('signInBtn');
  if (menu && !menu.contains(e.target) && btn && !btn.contains(e.target)) {
    closeUserMenu();
  }
}

/* ══ ORDER HISTORY PANEL ══ */
function openOrderHistory() {
  document.getElementById('buuksOrderHistoryPanel')?.remove();

  const orders = getOrderHistory();

  const overlay = document.createElement('div');
  overlay.id = 'buuksOrderHistoryPanel';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:1200;
    display:flex;align-items:flex-end;justify-content:center;
  `;

  const ordersHtml = orders.length === 0
    ? `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                   padding:3rem 1rem;gap:0.75rem;color:#9496b2;">
         <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity=".4">
           <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
           <polyline points="14 2 14 8 20 8"/>
         </svg>
         <p style="font-size:1rem;font-weight:600;color:#52546e;">No orders yet</p>
         <small style="font-size:0.82rem;">Your orders will appear here after checkout</small>
       </div>`
    : orders.map(o => `
        <div style="border:1px solid #e0e2f0;border-radius:12px;overflow:hidden;margin-bottom:0.75rem;">
          <!-- Order header -->
          <div style="background:#f5f6fd;padding:0.75rem 1rem;
                      display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
            <div>
              <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#9496b2;">Order ID</div>
              <div style="font-size:0.85rem;font-weight:700;color:#1c1d30;font-family:monospace;">${escHtml(o.orderId || '—')}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#9496b2;">Date</div>
              <div style="font-size:0.8rem;color:#52546e;">${escHtml(o.timestamp || '—')}</div>
            </div>
          </div>
          <!-- Books -->
          <div style="padding:0.75rem 1rem;border-top:1px solid #e0e2f0;">
            <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#9496b2;margin-bottom:0.4rem;">Books</div>
            <div style="font-size:0.85rem;color:#1c1d30;line-height:1.6;">${escHtml(o.titles || '—')}</div>
          </div>
          <!-- Footer -->
          <div style="padding:0.65rem 1rem;background:#eef0ff;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;border-top:1px solid #dde0ff;">
            <div style="display:flex;gap:1rem;flex-wrap:wrap;">
              <div>
                <span style="font-size:0.72rem;color:#9496b2;font-weight:600;">DELIVERY</span>
                <span style="font-size:0.82rem;color:#52546e;margin-left:0.4rem;">${escHtml(o.delivery || '—')}</span>
              </div>
            </div>
            <div style="font-size:1rem;font-weight:800;color:#6366f1;">${escHtml(o.totalAmt || '—')}</div>
          </div>
        </div>
      `).join('');

  overlay.innerHTML = `
    <style>
      @keyframes ohPanelIn {
        from { transform:translateY(100%); }
        to   { transform:translateY(0); }
      }
      @keyframes ohFadeIn {
        from { opacity:0; }
        to   { opacity:1; }
      }
    </style>

    <!-- Backdrop -->
    <div id="ohBackdrop" style="position:absolute;inset:0;background:rgba(28,29,48,0.5);backdrop-filter:blur(4px);animation:ohFadeIn 0.25s ease;"></div>

    <!-- Panel -->
    <div style="
      position:relative;z-index:1;
      width:100%;max-width:520px;
      max-height:85vh;
      background:#fff;
      border-radius:20px 20px 0 0;
      display:flex;flex-direction:column;
      box-shadow:0 -8px 40px rgba(28,29,48,0.18);
      animation:ohPanelIn 0.3s cubic-bezier(0.34,1.1,0.64,1);
    ">
      <!-- Handle -->
      <div style="display:flex;justify-content:center;padding:0.75rem 0 0;">
        <div style="width:40px;height:4px;background:#e0e2f0;border-radius:2px;"></div>
      </div>

      <!-- Header -->
      <div style="padding:1rem 1.25rem 0.75rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f3f4f6;flex-shrink:0;">
        <div>
          <div style="font-size:0.68rem;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#6366f1;margin-bottom:0.2rem;">buuks.in</div>
          <div style="font-size:1.1rem;font-weight:800;color:#1c1d30;">
            Order History
            ${orders.length ? '<span style="font-size:0.75rem;font-weight:600;background:#eef0ff;color:#6366f1;padding:0.15rem 0.55rem;border-radius:20px;margin-left:0.5rem;">'+orders.length+'</span>' : ''}
          </div>
        </div>
        <button id="ohClose" style="
          width:34px;height:34px;border:1.5px solid #e0e2f0;border-radius:9px;
          background:#f5f6fd;cursor:pointer;display:grid;place-items:center;color:#52546e;
          font-size:1.1rem;font-family:inherit;
        ">&times;</button>
      </div>

      <!-- Body -->
      <div style="flex:1;overflow-y:auto;padding:1rem 1.25rem 1.5rem;scrollbar-width:none;">
        ${ordersHtml}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  overlay.querySelector('#ohClose')?.addEventListener('click', closeOrderHistory);
  overlay.querySelector('#ohBackdrop')?.addEventListener('click', closeOrderHistory);
}

function closeOrderHistory() {
  document.getElementById('buuksOrderHistoryPanel')?.remove();
  document.body.style.overflow = '';
}

/* ── UI UPDATE ── */
function updateUIAfterAuth() {
  const signInBtn = document.getElementById('signInBtn');
  if (!signInBtn) return;

  if (isUserLoggedIn()) {
    const name    = getUserName() || 'Account';
    const initial = name.charAt(0).toUpperCase();
    signInBtn.innerHTML =
      '<span style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.3);display:inline-flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;flex-shrink:0;">'
      + initial + '</span>'
      + '<span style="max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'
      + escHtml(name.split(' ')[0]) + '</span>'
      + '<svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;opacity:0.7;"><polyline points="2,4 6,8 10,4"/></svg>';
    signInBtn.title   = getUserEmail();
    signInBtn.onclick = (e) => { e.stopPropagation(); toggleUserMenu(); };
  } else {
    signInBtn.innerHTML =
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>'
      + '<circle cx="12" cy="7" r="4"></circle></svg> Sign In';
    signInBtn.onclick = openSignInModal;
  }
}

/* ── MODAL ── */
function openSignInModal() {
  document.getElementById('signinModal')?.classList.add('show');
  document.getElementById('signinModalOverlay')?.classList.add('show');
  document.body.style.overflow = 'hidden';
  switchTab('login');
}
function closeSignInModal() {
  document.getElementById('signinModal')?.classList.remove('show');
  document.getElementById('signinModalOverlay')?.classList.remove('show');
  document.body.style.overflow = '';
}

/* ── TABS ── */
function switchTab(tab) {
  document.querySelectorAll('.signin-tab-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.tab === tab)
  );
  const lf = document.getElementById('loginForm');
  const rf = document.getElementById('registerForm');
  if (lf) lf.style.display = tab === 'login'    ? 'flex' : 'none';
  if (rf) rf.style.display = tab === 'register' ? 'flex' : 'none';
}

/* ── ERROR MESSAGES ── */
function getFriendlyError(code) {
  const map = {
    'auth/user-not-found':          'No account found with this email.',
    'auth/wrong-password':          'Incorrect password. Please try again.',
    'auth/invalid-credential':      'Incorrect email or password.',
    'auth/email-already-in-use':    'This email is already registered.',
    'auth/invalid-email':           'Please enter a valid email address.',
    'auth/weak-password':           'Password must be at least 6 characters.',
    'auth/too-many-requests':       'Too many attempts. Please try again later.',
    'auth/popup-closed-by-user':    'Google sign-in was cancelled.',
    'auth/cancelled-popup-request': 'Google sign-in was cancelled.',
    'auth/popup-blocked':           'Popup blocked. Trying redirect...',
    'auth/network-request-failed':  'Network error. Check your connection.',
    'auth/unauthorized-domain':     'This domain is not authorised in Firebase Console.',
    'auth/operation-not-allowed':   'Google sign-in is not enabled. Enable it in Firebase Console \u2192 Authentication \u2192 Sign-in methods.',
  };
  return map[code] || 'Something went wrong (' + code + '). Please try again.';
}
function showAuthError(message) {
  document.querySelectorAll('.auth-inline-error').forEach(el => el.remove());
  const lf = document.getElementById('loginForm');
  const rf = document.getElementById('registerForm');
  const form = (lf && lf.style.display !== 'none') ? lf : rf;
  if (!form) return;
  const div = document.createElement('div');
  div.className = 'auth-inline-error';
  div.style.cssText = 'background:#fee2e2;border:1px solid #fecaca;border-radius:8px;padding:.65rem .9rem;font-size:.82rem;color:#991b1b;margin-bottom:.25rem;line-height:1.5;';
  div.textContent = '\u26A0\uFE0F ' + message;
  const btn = form.querySelector('.signin-btn-submit');
  if (btn) form.insertBefore(div, btn); else form.prepend(div);
  setTimeout(() => div.remove(), 6000);
}

/* ── HELPERS ── */
function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── CHECKOUT / CART HELPERS ── */
function requireAuthForCheckout() {
  if (!isUserLoggedIn()) { openSignInModal(); return false; }
  return true;
}
function saveCartToUser() {
  if (!isUserLoggedIn()) return;
  const d = localStorage.getItem('buuksCart');
  if (d) localStorage.setItem('buuksCart_' + getUserUID(), d);
}
function loadCartForUser() {
  if (!isUserLoggedIn()) return;
  const d = localStorage.getItem('buuksCart_' + getUserUID());
  if (d) localStorage.setItem('buuksCart', d);
}
function prepareOrderWithUserInfo(orderData) {
  if (!isUserLoggedIn()) return orderData;
  return { ...orderData, userId: getUserUID(), userEmail: getUserEmail(), userName: getUserName() || 'Guest' };
}

/* ── DOM READY ── */
document.addEventListener('DOMContentLoaded', () => {
  initializeFirebase();

  document.getElementById('signInBtn')?.addEventListener('click', openSignInModal);
  document.getElementById('signinModalClose')?.addEventListener('click', closeSignInModal);
  document.getElementById('signinModalOverlay')?.addEventListener('click', closeSignInModal);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeUserMenu(); closeOrderHistory(); closeSignInModal(); }
  });

  document.querySelectorAll('.signin-tab-btn').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
  );
  document.querySelectorAll('.switch-tab').forEach(link =>
    link.addEventListener('click', e => { e.preventDefault(); switchTab(link.dataset.tab); })
  );

  document.getElementById('loginForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const pass  = document.getElementById('loginPassword').value;
    if (!email || !pass) { showAuthError('Please fill in all fields'); return; }
    signInWithEmail(email, pass);
  });

  document.getElementById('registerForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const name    = document.getElementById('registerName').value.trim();
    const email   = document.getElementById('registerEmail').value.trim();
    const pass    = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerConfirm').value;
    const agreed  = document.getElementById('agreeTerms').checked;
    if (!name || !email || !pass || !confirm) { showAuthError('Please fill in all fields'); return; }
    if (!agreed) { showAuthError('Please agree to the Terms & Conditions'); return; }
    registerWithEmail(name, email, pass, confirm);
  });

  document.getElementById('googleSignIn')?.addEventListener('click', signInWithGoogle);

  document.querySelector('.forgot-link')?.addEventListener('click', e => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    if (!email) { showAuthError('Enter your email above first'); return; }
    auth.sendPasswordResetEmail(email)
      .then(() => showAuthError('\u2705 Reset email sent \u2014 check your inbox!'))
      .catch(err => showAuthError(getFriendlyError(err.code)));
  });

  console.log('\u2713 Firebase Auth module loaded');
});

/* ── EXPORT ── */
window.firebaseAuth = {
  signInWithEmail, registerWithEmail, signInWithGoogle, signOut,
  getCurrentUser, isUserLoggedIn, getUserEmail, getUserName, getUserUID,
  requireAuthForCheckout, saveCartToUser, loadCartForUser,
  prepareOrderWithUserInfo, openSignInModal, closeSignInModal,
  saveOrderToHistory, getOrderHistory, openOrderHistory,
};
