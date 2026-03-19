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
  auth.signInWithPopup(provider)
    .then(() => setTimeout(() => closeSignInModal(), 500))
    .catch((err) => showAuthError(getFriendlyError(err.code)));
}

function signOut() {
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

/* ── UI ── */
function updateUIAfterAuth() {
  const signInBtn = document.getElementById('signInBtn');
  if (!signInBtn) return;
  if (isUserLoggedIn()) {
    const name = getUserName() || 'Account';
    const initial = name.charAt(0).toUpperCase();
    signInBtn.innerHTML =
      '<span style="width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,0.25);display:inline-flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700">'
      + initial + '</span>'
      + '<span style="max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'
      + name.split(' ')[0] + '</span>';
    signInBtn.title   = getUserEmail();
    signInBtn.onclick = () => { if (confirm('Sign out of ' + getUserEmail() + '?')) signOut(); };
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

/* ── ERRORS ── */
function getFriendlyError(code) {
  const map = {
    'auth/user-not-found':         'No account found with this email.',
    'auth/wrong-password':         'Incorrect password. Please try again.',
    'auth/invalid-credential':     'Incorrect email or password.',
    'auth/email-already-in-use':   'This email is already registered.',
    'auth/invalid-email':          'Please enter a valid email address.',
    'auth/weak-password':          'Password must be at least 6 characters.',
    'auth/too-many-requests':      'Too many attempts. Please try again later.',
    'auth/popup-closed-by-user':   'Google sign-in was cancelled.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}
function showAuthError(message) {
  document.querySelectorAll('.auth-inline-error').forEach(el => el.remove());
  const lf = document.getElementById('loginForm');
  const rf = document.getElementById('registerForm');
  const form = (lf && lf.style.display !== 'none') ? lf : rf;
  if (!form) return;
  const div = document.createElement('div');
  div.className = 'auth-inline-error';
  div.style.cssText = 'background:#fee2e2;border:1px solid #fecaca;border-radius:8px;padding:.65rem .9rem;font-size:.82rem;color:#991b1b;margin-bottom:.25rem;';
  div.textContent = '\u26A0\uFE0F ' + message;
  const btn = form.querySelector('.signin-btn-submit');
  if (btn) form.insertBefore(div, btn); else form.prepend(div);
  setTimeout(() => div.remove(), 4500);
}

/* ── CHECKOUT / ORDER HELPERS ── */
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

  /* Sign In button opens modal */
  document.getElementById('signInBtn')?.addEventListener('click', openSignInModal);

  /* Close modal */
  document.getElementById('signinModalClose')?.addEventListener('click', closeSignInModal);
  document.getElementById('signinModalOverlay')?.addEventListener('click', closeSignInModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSignInModal(); });

  /* Tab buttons */
  document.querySelectorAll('.signin-tab-btn').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
  );
  document.querySelectorAll('.switch-tab').forEach(link =>
    link.addEventListener('click', e => { e.preventDefault(); switchTab(link.dataset.tab); })
  );

  /* Login form */
  document.getElementById('loginForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const pass  = document.getElementById('loginPassword').value;
    if (!email || !pass) { showAuthError('Please fill in all fields'); return; }
    signInWithEmail(email, pass);
  });

  /* Register form */
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

  /* Google */
  document.getElementById('googleSignIn')?.addEventListener('click', signInWithGoogle);

  /* Forgot password */
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
};