/* ═══════════════════════════════════════════════════════════════
   firebase-auth.js — buuks.in
   Requires in index.html (in this order):
     firebase-app-compat.js
     firebase-auth-compat.js
     firebase-firestore-compat.js
═══════════════════════════════════════════════════════════════ */

/* ── CONFIG ── */
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
let db;
let currentUser = null;
let menuOpen    = false;

/* ═══════════════════════════════════
   INIT
═══════════════════════════════════ */
function initializeFirebase() {
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db   = firebase.firestore();

  /* Handle redirect result (popup-blocked fallback) */
  auth.getRedirectResult().catch(() => {});

  /* Auth state listener */
  auth.onAuthStateChanged(function(user) {
    currentUser = user;
    renderSignInButton(); /* always re-render the button */
    if (user) {
      saveUserToLocalStorage(user);
      closeSignInModal();
      /* Sync cart from Firestore on login */
      loadCartFromFirestore().then(function(firestoreCart) {
        if (firestoreCart && Object.keys(firestoreCart).length > 0) {
          localStorage.setItem('buuksCart', JSON.stringify(firestoreCart));
          /* Tell script.js to reload cart if available */
          if (typeof loadCartFromStorage === 'function') {
            loadCartFromStorage();
            if (typeof updateCartUI === 'function') updateCartUI();
          }
        }
      });
    } else {
      clearUserFromLocalStorage();
    }
  });
}

/* ═══════════════════════════════════
   RENDER SIGN-IN BUTTON
   Called every time auth state changes.
   ONLY this function touches the button HTML.
═══════════════════════════════════ */
function renderSignInButton() {
  const btn = document.getElementById('signInBtn');
  if (!btn) return;

  if (currentUser) {
    const name    = currentUser.displayName || currentUser.email || 'Account';
    const initial = name.charAt(0).toUpperCase();
    btn.innerHTML =
      '<span style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.28);'
      + 'display:inline-flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;flex-shrink:0;">'
      + escHtml(initial) + '</span>'
      + '<span style="max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'
      + escHtml(name.split(' ')[0]) + '</span>'
      + '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2"'
      + ' style="flex-shrink:0;opacity:.7;"><polyline points="1,3 5,7 9,3"/></svg>';
    btn.title = currentUser.email || '';
  } else {
    btn.innerHTML =
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
      + ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>'
      + '<circle cx="12" cy="7" r="4"/></svg>'
      + ' Sign In';
    btn.title = '';
  }
}

/* ═══════════════════════════════════
   SIGN-IN BUTTON CLICK HANDLER
   One permanent listener. Routes based on auth state.
═══════════════════════════════════ */
function handleSignInBtnClick(e) {
  e.stopPropagation();
  if (currentUser) {
    /* logged in → toggle dropdown menu */
    if (menuOpen) {
      closeUserMenu();
    } else {
      openUserMenu();
    }
  } else {
    /* not logged in → open sign-in modal */
    openSignInModal();
  }
}

/* ═══════════════════════════════════
   AUTH FUNCTIONS
═══════════════════════════════════ */
function signInWithEmail(email, password) {
  const btn = document.querySelector('#loginForm .signin-btn-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }
  auth.signInWithEmailAndPassword(email, password)
    .then(function() {
      if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
    })
    .catch(function(err) {
      showAuthError(getFriendlyError(err.code));
      if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
    });
}

function registerWithEmail(name, email, password, confirmPassword) {
  if (password !== confirmPassword) { showAuthError('Passwords do not match'); return; }
  if (password.length < 6)          { showAuthError('Password must be at least 6 characters'); return; }
  const btn = document.querySelector('#registerForm .signin-btn-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Creating account...'; }
  auth.createUserWithEmailAndPassword(email, password)
    .then(function(cred) { return cred.user.updateProfile({ displayName: name }); })
    .then(function() {
      if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
      setTimeout(closeSignInModal, 800);
    })
    .catch(function(err) {
      showAuthError(getFriendlyError(err.code));
      if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
    });
}

function signInWithGoogle() {
  const provider  = new firebase.auth.GoogleAuthProvider();
  const googleBtn = document.getElementById('googleSignIn');
  if (googleBtn) { googleBtn.disabled = true; googleBtn.textContent = 'Opening Google...'; }

  auth.signInWithPopup(provider)
    .then(function() {
      if (googleBtn) { googleBtn.disabled = false; googleBtn.textContent = 'Sign in with Google'; }
      setTimeout(closeSignInModal, 500);
    })
    .catch(function(err) {
      if (googleBtn) { googleBtn.disabled = false; googleBtn.textContent = 'Sign in with Google'; }
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return;
      if (err.code === 'auth/popup-blocked') {
        showAuthError('Popup blocked — redirecting to Google...');
        setTimeout(function() { auth.signInWithRedirect(provider); }, 1200);
        return;
      }
      showAuthError(getFriendlyError(err.code));
    });
}

function signOut() {
  closeUserMenu();
  auth.signOut().then(function() {
    currentUser = null;
    clearUserFromLocalStorage();
    renderSignInButton();
    setTimeout(function() { window.location.reload(); }, 300);
  });
}

/* ═══════════════════════════════════
   USER GETTERS
═══════════════════════════════════ */
function getCurrentUser() { return currentUser; }
function isUserLoggedIn() { return currentUser !== null; }
function getUserEmail()   { return currentUser ? currentUser.email : null; }
function getUserName()    { return currentUser ? (currentUser.displayName || currentUser.email) : null; }
function getUserUID()     { return currentUser ? currentUser.uid : null; }

/* ═══════════════════════════════════
   LOCAL STORAGE
═══════════════════════════════════ */
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

/* ═══════════════════════════════════
   FIRESTORE — ORDERS
═══════════════════════════════════ */
async function saveOrderToFirestore(orderPayload) {
  if (!currentUser || !db) return;
  try {
    await db.collection('users').doc(currentUser.uid)
            .collection('orders').doc(orderPayload.orderId)
            .set(Object.assign({}, orderPayload, {
              savedAt: firebase.firestore.FieldValue.serverTimestamp()
            }));
    console.log('Order saved to Firestore:', orderPayload.orderId);
  } catch(err) {
    console.error('Firestore save error:', err);
  }
}

async function fetchOrdersFromFirestore() {
  if (!currentUser || !db) return [];
  try {
    const snap = await db.collection('users').doc(currentUser.uid)
                         .collection('orders')
                         .orderBy('savedAt', 'desc')
                         .limit(50).get();
    return snap.docs.map(function(d) { return d.data(); });
  } catch(err) {
    console.error('Firestore fetch error:', err);
    return [];
  }
}

/* ═══════════════════════════════════
   FIRESTORE — CART
═══════════════════════════════════ */

/* Save entire cart object to Firestore */
async function saveCartToFirestore(cartData) {
  if (!currentUser || !db) return;
  try {
    await db.collection('users').doc(currentUser.uid)
            .collection('cart').doc('current')
            .set({ items: cartData, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
  } catch(err) {
    console.error('Cart save error:', err);
  }
}

/* Load cart from Firestore — returns cart object or null */
async function loadCartFromFirestore() {
  if (!currentUser || !db) return null;
  try {
    const doc = await db.collection('users').doc(currentUser.uid)
                        .collection('cart').doc('current').get();
    if (doc.exists && doc.data().items) return doc.data().items;
    return null;
  } catch(err) {
    console.error('Cart load error:', err);
    return null;
  }
}

/* ═══════════════════════════════════
   USER MENU DROPDOWN
═══════════════════════════════════ */
function openUserMenu() {
  const signInBtn = document.getElementById('signInBtn');
  if (!signInBtn) return;

  /* Ensure parent is relatively positioned */
  var parent = signInBtn.parentElement;
  if (getComputedStyle(parent).position === 'static') {
    parent.style.position = 'relative';
  }

  document.getElementById('buuksUserMenu')?.remove();

  const name    = getUserName() || 'Account';
  const email   = getUserEmail() || '';
  const initial = name.charAt(0).toUpperCase();

  const menu = document.createElement('div');
  menu.id = 'buuksUserMenu';
  menu.setAttribute('role', 'menu');
  menu.style.cssText =
    'position:absolute;top:calc(100% + 8px);right:0;'
    + 'width:272px;background:#fff;'
    + 'border:1px solid #e0e2f0;border-radius:14px;'
    + 'box-shadow:0 12px 40px rgba(28,29,48,.16);'
    + 'z-index:99999;overflow:hidden;'
    + 'animation:_bumIn .17s cubic-bezier(.34,1.4,.64,1);';

  menu.innerHTML = ''
    + '<style>'
    + '@keyframes _bumIn{from{opacity:0;transform:translateY(-5px) scale(.97)}to{opacity:1;transform:none}}'
    + '._bi{display:flex;align-items:center;gap:.7rem;width:100%;padding:.72rem 1rem;'
    + 'background:none;border:none;font-family:"Plus Jakarta Sans",sans-serif;'
    + 'font-size:.875rem;font-weight:500;color:#374151;cursor:pointer;text-align:left;transition:background .12s;}'
    + '._bi:hover{background:#f5f6fd;}'
    + '._bi svg{flex-shrink:0;color:#9496b2;}'
    + '._bi.red{color:#e5495e;}'
    + '._bi.red svg{color:#e5495e;}'
    + '._bi.red:hover{background:#fff0f2;}'
    + '</style>'
    /* Header */
    + '<div style="padding:1rem;display:flex;gap:.75rem;align-items:center;border-bottom:1px solid #f3f4f6;">'
    +   '<div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#4f46e5);'
    +        'color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem;flex-shrink:0;">'
    +     escHtml(initial)
    +   '</div>'
    +   '<div style="min-width:0;">'
    +     '<div style="font-weight:700;font-size:.9rem;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escHtml(name) + '</div>'
    +     '<div style="font-size:.73rem;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escHtml(email) + '</div>'
    +   '</div>'
    + '</div>'
    /* Items */
    + '<div style="padding:.35rem 0;">'
    +   '<button class="_bi" id="_bumHistory">'
    +     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    +       '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>'
    +       '<polyline points="14 2 14 8 20 8"/>'
    +       '<line x1="16" y1="13" x2="8" y2="13"/>'
    +       '<line x1="16" y1="17" x2="8" y2="17"/>'
    +     '</svg>'
    +     'Order History'
    +   '</button>'
    +   '<div style="height:1px;background:#f3f4f6;margin:.3rem 0;"></div>'
    +   '<button class="_bi red" id="_bumSignOut">'
    +     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    +       '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>'
    +       '<polyline points="16 17 21 12 16 7"/>'
    +       '<line x1="21" y1="12" x2="9" y2="12"/>'
    +     '</svg>'
    +     'Sign Out'
    +   '</button>'
    + '</div>';

  menu.querySelector('#_bumHistory').addEventListener('click', function() {
    closeUserMenu();
    openOrderHistory();
  });
  menu.querySelector('#_bumSignOut').addEventListener('click', signOut);

  parent.appendChild(menu);
  menuOpen = true;

  /* Close when clicking anywhere outside */
  setTimeout(function() {
    document.addEventListener('click', _outsideMenuClick, true);
  }, 0);
}

function closeUserMenu() {
  document.getElementById('buuksUserMenu')?.remove();
  document.removeEventListener('click', _outsideMenuClick, true);
  menuOpen = false;
}

function _outsideMenuClick(e) {
  const menu = document.getElementById('buuksUserMenu');
  const btn  = document.getElementById('signInBtn');
  if (!menu) { closeUserMenu(); return; }
  if (!menu.contains(e.target) && btn && !btn.contains(e.target)) {
    closeUserMenu();
  }
}

/* ═══════════════════════════════════
   ORDER HISTORY PANEL
═══════════════════════════════════ */
async function openOrderHistory() {
  document.getElementById('_ohPanel')?.remove();

  const overlay = document.createElement('div');
  overlay.id = '_ohPanel';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9998;display:flex;align-items:flex-end;justify-content:center;';
  overlay.innerHTML = ''
    + '<style>'
    + '@keyframes _ohBg{from{opacity:0}to{opacity:1}}'
    + '@keyframes _ohUp{from{transform:translateY(100%)}to{transform:translateY(0)}}'
    + '</style>'
    + '<div id="_ohBg" style="position:absolute;inset:0;background:rgba(28,29,48,.52);backdrop-filter:blur(4px);animation:_ohBg .22s ease;"></div>'
    + '<div id="_ohSheet" style="position:relative;z-index:1;width:100%;max-width:520px;max-height:86vh;'
    +   'background:#fff;border-radius:20px 20px 0 0;display:flex;flex-direction:column;'
    +   'box-shadow:0 -8px 40px rgba(28,29,48,.18);animation:_ohUp .28s cubic-bezier(.34,1.05,.64,1);">'
    +   '<div style="display:flex;justify-content:center;padding:.7rem 0 0;">'
    +     '<div style="width:38px;height:4px;background:#e0e2f0;border-radius:2px;"></div>'
    +   '</div>'
    +   '<div style="padding:1rem 1.25rem .8rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f3f4f6;flex-shrink:0;">'
    +     '<div>'
    +       '<div style="font-size:.65rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#6366f1;margin-bottom:.18rem;">buuks.in</div>'
    +       '<div id="_ohTitle" style="font-size:1.1rem;font-weight:800;color:#1c1d30;">Order History</div>'
    +     '</div>'
    +     '<button id="_ohClose" style="width:34px;height:34px;border:1.5px solid #e0e2f0;border-radius:9px;'
    +       'background:#f5f6fd;cursor:pointer;display:grid;place-items:center;color:#52546e;font-size:1.3rem;'
    +       'line-height:1;font-family:inherit;">&times;</button>'
    +   '</div>'
    +   '<div id="_ohBody" style="flex:1;overflow-y:auto;padding:1.1rem 1.15rem 1.5rem;scrollbar-width:none;">'
    +     '<div style="display:flex;flex-direction:column;align-items:center;padding:3rem 1rem;gap:.7rem;">'
    +       '<div style="width:26px;height:26px;border:2.5px solid #e0e2f0;border-top-color:#6366f1;border-radius:50%;animation:spin .7s linear infinite;"></div>'
    +       '<p style="font-size:.88rem;color:#52546e;font-weight:500;">Loading orders…</p>'
    +     '</div>'
    +   '</div>'
    + '</div>';

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  overlay.querySelector('#_ohClose').addEventListener('click', closeOrderHistory);
  overlay.querySelector('#_ohBg').addEventListener('click', closeOrderHistory);

  const orders = await fetchOrdersFromFirestore();
  const body   = document.getElementById('_ohBody');
  if (!body) return;

  if (!orders.length) {
    body.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem 1rem;gap:.7rem;color:#9496b2;">'
      + '<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity=".35">'
      + '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>'
      + '</svg>'
      + '<p style="font-size:1rem;font-weight:600;color:#52546e;">No orders yet</p>'
      + '<small style="font-size:.8rem;text-align:center;">Your orders will appear here once you place one</small>'
      + '</div>';
    return;
  }

  const titleEl = document.getElementById('_ohTitle');
  if (titleEl) titleEl.innerHTML = 'Order History '
    + '<span style="font-size:.72rem;font-weight:600;background:#eef0ff;color:#6366f1;'
    + 'padding:.12rem .5rem;border-radius:20px;margin-left:.4rem;">' + orders.length + '</span>';

  body.innerHTML = orders.map(function(o) {
    return '<div style="border:1px solid #e0e2f0;border-radius:12px;overflow:hidden;margin-bottom:.7rem;">'
      + '<div style="background:#f5f6fd;padding:.7rem 1rem;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:.3rem;">'
      +   '<div><div style="font-size:.63rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#9496b2;margin-bottom:.1rem;">Order ID</div>'
      +   '<div style="font-size:.8rem;font-weight:700;color:#1c1d30;font-family:monospace;">' + escHtml(o.orderId||'—') + '</div></div>'
      +   '<div style="text-align:right;"><div style="font-size:.63rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#9496b2;margin-bottom:.1rem;">Date</div>'
      +   '<div style="font-size:.76rem;color:#52546e;">' + escHtml(o.timestamp||'—') + '</div></div>'
      + '</div>'
      + '<div style="padding:.7rem 1rem;border-top:1px solid #e0e2f0;">'
      +   '<div style="font-size:.63rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#9496b2;margin-bottom:.3rem;">Books Ordered</div>'
      +   '<div style="font-size:.85rem;color:#1c1d30;line-height:1.6;">' + escHtml(o.titles||'—') + '</div>'
      + '</div>'
      + (o.address
          ? '<div style="padding:.6rem 1rem;border-top:1px solid #f3f4f6;">'
            + '<div style="font-size:.63rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#9496b2;margin-bottom:.22rem;">Delivery To</div>'
            + '<div style="font-size:.82rem;color:#52546e;line-height:1.5;">' + escHtml(o.address) + '</div></div>'
          : '')
      + '<div style="padding:.6rem 1rem;background:#eef0ff;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.3rem;border-top:1px solid #dde0ff;">'
      +   '<div style="display:flex;gap:1rem;flex-wrap:wrap;">'
      +     '<span style="font-size:.68rem;color:#9496b2;font-weight:700;text-transform:uppercase;">Delivery '
      +       '<span style="color:#52546e;font-weight:600;">' + escHtml(o.delivery||'—') + '</span></span>'
      +     '<span style="font-size:.68rem;color:#9496b2;font-weight:700;text-transform:uppercase;">Items '
      +       '<span style="color:#52546e;font-weight:600;">' + escHtml(String(o.totalQty||'—')) + '</span></span>'
      +   '</div>'
      +   '<div style="font-size:1.05rem;font-weight:800;color:#6366f1;">' + escHtml(o.totalAmt||'—') + '</div>'
      + '</div>'
      + '</div>';
  }).join('');
}

function closeOrderHistory() {
  document.getElementById('_ohPanel')?.remove();
  document.body.style.overflow = '';
}

/* ═══════════════════════════════════
   SIGN IN MODAL
═══════════════════════════════════ */
function openSignInModal() {
  const modal   = document.getElementById('signinModal');
  const overlay = document.getElementById('signinModalOverlay');
  if (!modal || !overlay) return;
  modal.classList.add('show');
  overlay.classList.add('show');
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
  document.querySelectorAll('.signin-tab-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  var lf = document.getElementById('loginForm');
  var rf = document.getElementById('registerForm');
  if (lf) lf.style.display = (tab === 'login')    ? 'flex' : 'none';
  if (rf) rf.style.display = (tab === 'register') ? 'flex' : 'none';
}

/* ═══════════════════════════════════
   ERROR MESSAGES
═══════════════════════════════════ */
function getFriendlyError(code) {
  var map = {
    'auth/user-not-found':          'No account found with this email.',
    'auth/wrong-password':          'Incorrect password. Please try again.',
    'auth/invalid-credential':      'Incorrect email or password.',
    'auth/email-already-in-use':    'This email is already registered.',
    'auth/invalid-email':           'Please enter a valid email address.',
    'auth/weak-password':           'Password must be at least 6 characters.',
    'auth/too-many-requests':       'Too many attempts. Please try again later.',
    'auth/popup-closed-by-user':    'Google sign-in was cancelled.',
    'auth/cancelled-popup-request': 'Google sign-in was cancelled.',
    'auth/popup-blocked':           'Popup blocked — trying redirect.',
    'auth/network-request-failed':  'Network error. Check your connection.',
    'auth/unauthorized-domain':     'Domain not authorised in Firebase Console.',
    'auth/operation-not-allowed':   'Google sign-in not enabled in Firebase Console.'
  };
  return map[code] || 'Something went wrong (' + code + '). Please try again.';
}

function showAuthError(message) {
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
  var submitBtn = form.querySelector('.signin-btn-submit');
  if (submitBtn) form.insertBefore(div, submitBtn); else form.prepend(div);
  setTimeout(function() { div.remove(); }, 6000);
}

/* ── UTIL ── */
function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ═══════════════════════════════════
   CHECKOUT / CART HELPERS
═══════════════════════════════════ */
function requireAuthForCheckout() {
  if (!currentUser) { openSignInModal(); return false; }
  return true;
}
function saveCartToUser() {
  if (!currentUser) return;
  var d = localStorage.getItem('buuksCart');
  if (d) localStorage.setItem('buuksCart_' + currentUser.uid, d);
}
function loadCartForUser() {
  if (!currentUser) return;
  var d = localStorage.getItem('buuksCart_' + currentUser.uid);
  if (d) localStorage.setItem('buuksCart', d);
}
function prepareOrderWithUserInfo(orderData) {
  if (!currentUser) return orderData;
  return Object.assign({}, orderData, {
    userId:    currentUser.uid,
    userEmail: currentUser.email,
    userName:  currentUser.displayName || 'Guest'
  });
}

/* ═══════════════════════════════════
   DOM READY — attach all listeners ONCE
═══════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function() {
  initializeFirebase();

  /* ── Sign In button: ONE listener, checks currentUser at call time ── */
  var signInBtn = document.getElementById('signInBtn');
  if (signInBtn) signInBtn.addEventListener('click', handleSignInBtnClick);

  /* ── Modal close ── */
  document.getElementById('signinModalClose')?.addEventListener('click', closeSignInModal);
  document.getElementById('signinModalOverlay')?.addEventListener('click', closeSignInModal);

  /* ── ESC key ── */
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    closeUserMenu();
    closeOrderHistory();
    closeSignInModal();
  });

  /* ── Tabs ── */
  document.querySelectorAll('.signin-tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { switchTab(btn.dataset.tab); });
  });
  document.querySelectorAll('.switch-tab').forEach(function(link) {
    link.addEventListener('click', function(e) { e.preventDefault(); switchTab(link.dataset.tab); });
  });

  /* ── Login form ── */
  var loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var email = document.getElementById('loginEmail').value.trim();
      var pass  = document.getElementById('loginPassword').value;
      if (!email || !pass) { showAuthError('Please fill in all fields'); return; }
      signInWithEmail(email, pass);
    });
  }

  /* ── Register form ── */
  var registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var name    = document.getElementById('registerName').value.trim();
      var email   = document.getElementById('registerEmail').value.trim();
      var pass    = document.getElementById('registerPassword').value;
      var confirm = document.getElementById('registerConfirm').value;
      var agreed  = document.getElementById('agreeTerms').checked;
      if (!name || !email || !pass || !confirm) { showAuthError('Please fill in all fields'); return; }
      if (!agreed) { showAuthError('Please agree to the Terms & Conditions'); return; }
      registerWithEmail(name, email, pass, confirm);
    });
  }

  /* ── Google button ── */
  document.getElementById('googleSignIn')?.addEventListener('click', signInWithGoogle);

  /* ── Forgot password ── */
  var forgotLink = document.querySelector('.forgot-link');
  if (forgotLink) {
    forgotLink.addEventListener('click', function(e) {
      e.preventDefault();
      var email = document.getElementById('loginEmail').value.trim();
      if (!email) { showAuthError('Enter your email above first'); return; }
      auth.sendPasswordResetEmail(email)
        .then(function()  { showAuthError('\u2705 Reset email sent \u2014 check your inbox!'); })
        .catch(function(err) { showAuthError(getFriendlyError(err.code)); });
    });
  }

  console.log('\u2713 Firebase Auth loaded');
});

/* ═══════════════════════════════════
   PUBLIC API
═══════════════════════════════════ */
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
  saveCartToUser,
  loadCartForUser,
  prepareOrderWithUserInfo,
  openSignInModal,
  closeSignInModal,
  saveCartToFirestore,
  loadCartFromFirestore,
  saveOrderToFirestore,
  fetchOrdersFromFirestore,
  openOrderHistory
};
