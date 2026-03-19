/* ═══════════════════════════════════════════════════════════════
   order-history.js — buuks.in
   Fetches order history from Apps Script spreadsheet.
   Only works when user is logged in via Firebase Auth.
   Include this AFTER firebase-auth.js in index.html:
     <script src="order-history.js"></script>
═══════════════════════════════════════════════════════════════ */

const OH_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxD_z9H9WKFSxDn8_YtxhxKVh3Bc6kR5hv8aP8u10_SIgB-rSPm5eHaDAN38962o5wZXQ/exec";

/* ─── Fetch orders from Apps Script for logged-in user ─── */
async function fetchOrdersFromSheet() {
  const email = window.firebaseAuth?.getUserEmail();
  const uid   = window.firebaseAuth?.getUserUID();
  if (!email) return [];

  try {
    const url = OH_APPS_SCRIPT_URL
      + '?action=getOrders'
      + '&email=' + encodeURIComponent(email)
      + '&uid='   + encodeURIComponent(uid || '');

    const res  = await fetch(url);
    const data = await res.json();

    if (data.success && Array.isArray(data.orders)) {
      return data.orders; /* newest first (handled by Apps Script) */
    }
    return [];
  } catch (err) {
    console.error('Order history fetch error:', err);
    return [];
  }
}

/* ─── Open the Order History bottom-sheet ─── */
async function openOrderHistory() {
  /* Must be logged in */
  if (!window.firebaseAuth?.isUserLoggedIn()) {
    window.firebaseAuth?.openSignInModal();
    return;
  }

  /* Remove any existing panel */
  document.getElementById('_ohPanel')?.remove();

  /* ── Build panel shell with loading state ── */
  const overlay = document.createElement('div');
  overlay.id = '_ohPanel';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9998;display:flex;align-items:flex-end;justify-content:center;';

  overlay.innerHTML = `
    <style>
      @keyframes _ohBg  { from { opacity:0 } to { opacity:1 } }
      @keyframes _ohUp  { from { transform:translateY(100%) } to { transform:translateY(0) } }
      @keyframes _ohSpin{ to   { transform:rotate(360deg) } }
      ._oh-row { border:1px solid #e0e2f0; border-radius:12px; overflow:hidden; margin-bottom:.7rem; }
      ._oh-sec { padding:.7rem 1rem; }
      ._oh-lbl { font-size:.63rem; font-weight:700; letter-spacing:.06em;
                 text-transform:uppercase; color:#9496b2; margin-bottom:.18rem; }
      ._oh-val { font-size:.84rem; color:#1c1d30; line-height:1.55; }
      ._oh-ft  { padding:.6rem 1rem; background:#eef0ff; border-top:1px solid #dde0ff;
                 display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:.3rem; }
    </style>

    <!-- backdrop -->
    <div id="_ohBg" style="position:absolute;inset:0;background:rgba(28,29,48,.52);
         backdrop-filter:blur(4px);animation:_ohBg .22s ease;"></div>

    <!-- sheet -->
    <div id="_ohSheet" style="position:relative;z-index:1;width:100%;max-width:520px;max-height:86vh;
         background:#fff;border-radius:20px 20px 0 0;display:flex;flex-direction:column;
         box-shadow:0 -8px 40px rgba(28,29,48,.18);animation:_ohUp .28s cubic-bezier(.34,1.05,.64,1);">

      <!-- drag handle -->
      <div style="display:flex;justify-content:center;padding:.7rem 0 0;">
        <div style="width:38px;height:4px;background:#e0e2f0;border-radius:2px;"></div>
      </div>

      <!-- header -->
      <div style="padding:1rem 1.25rem .8rem;display:flex;align-items:center;
                  justify-content:space-between;border-bottom:1px solid #f3f4f6;flex-shrink:0;">
        <div>
          <div style="font-size:.65rem;font-weight:700;letter-spacing:.09em;
                      text-transform:uppercase;color:#6366f1;margin-bottom:.18rem;">buuks.in</div>
          <div id="_ohTitle" style="font-size:1.1rem;font-weight:800;color:#1c1d30;">Order History</div>
        </div>
        <button id="_ohClose" style="width:34px;height:34px;border:1.5px solid #e0e2f0;border-radius:9px;
          background:#f5f6fd;cursor:pointer;display:grid;place-items:center;
          color:#52546e;font-size:1.3rem;line-height:1;font-family:inherit;">&times;</button>
      </div>

      <!-- body -->
      <div id="_ohBody" style="flex:1;overflow-y:auto;padding:1.1rem 1.15rem 1.5rem;scrollbar-width:none;">
        <!-- loading spinner -->
        <div style="display:flex;flex-direction:column;align-items:center;padding:3rem 1rem;gap:.75rem;">
          <div style="width:28px;height:28px;border:2.5px solid #e0e2f0;
                      border-top-color:#6366f1;border-radius:50%;animation:_ohSpin .7s linear infinite;"></div>
          <p style="font-size:.88rem;color:#52546e;font-weight:500;">Fetching your orders…</p>
        </div>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  overlay.querySelector('#_ohClose').addEventListener('click', closeOrderHistory);
  overlay.querySelector('#_ohBg').addEventListener('click', closeOrderHistory);

  /* ── Fetch orders ── */
  const orders = await fetchOrdersFromSheet();
  const body   = document.getElementById('_ohBody');
  if (!body) return;

  /* ── Empty state ── */
  if (!orders.length) {
    body.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;
                  justify-content:center;padding:3rem 1rem;gap:.75rem;color:#9496b2;">
        <svg width="46" height="46" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="1" opacity=".35">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <p style="font-size:1rem;font-weight:600;color:#52546e;">No orders yet</p>
        <small style="font-size:.8rem;text-align:center;max-width:220px;">
          Your orders will appear here once you place one while signed in.
        </small>
      </div>`;
    return;
  }

  /* ── Update header count ── */
  const titleEl = document.getElementById('_ohTitle');
  if (titleEl) titleEl.innerHTML =
    'Order History <span style="font-size:.72rem;font-weight:600;background:#eef0ff;color:#6366f1;'
    + 'padding:.12rem .5rem;border-radius:20px;margin-left:.4rem;">' + orders.length + '</span>';

  /* ── Render order cards ── */
  body.innerHTML = orders.map(function(o) {
    const isFreeDel = (o.delivery || '').toString().toUpperCase() === 'FREE';
    return `
      <div class="_oh-row">

        <!-- order id + date -->
        <div class="_oh-sec" style="background:#f5f6fd;display:flex;
             justify-content:space-between;flex-wrap:wrap;gap:.3rem;">
          <div>
            <div class="_oh-lbl">Order ID</div>
            <div style="font-size:.8rem;font-weight:700;color:#1c1d30;font-family:monospace;">
              ${esc(o.orderId || '—')}
            </div>
          </div>
          <div style="text-align:right;">
            <div class="_oh-lbl">Date</div>
            <div style="font-size:.76rem;color:#52546e;">${esc(o.timestamp || '—')}</div>
          </div>
        </div>

        <!-- books -->
        <div class="_oh-sec" style="border-top:1px solid #e0e2f0;">
          <div class="_oh-lbl">Books Ordered</div>
          <div class="_oh-val">${esc(o.titles || '—')}</div>
        </div>

        <!-- address -->
        ${o.address ? `
        <div class="_oh-sec" style="border-top:1px solid #f3f4f6;">
          <div class="_oh-lbl">Delivery To</div>
          <div class="_oh-val" style="color:#52546e;">${esc(o.address)}</div>
        </div>` : ''}

        <!-- totals footer -->
        <div class="_oh-ft">
          <div style="display:flex;gap:1rem;flex-wrap:wrap;">
            <div>
              <span style="font-size:.65rem;color:#9496b2;font-weight:700;text-transform:uppercase;">
                Items&nbsp;
              </span>
              <span style="font-size:.82rem;color:#52546e;font-weight:600;">
                ${esc(String(o.totalQty || '—'))}
              </span>
            </div>
            <div>
              <span style="font-size:.65rem;color:#9496b2;font-weight:700;text-transform:uppercase;">
                Delivery&nbsp;
              </span>
              <span style="font-size:.82rem;font-weight:600;
                           color:${isFreeDel ? '#15a05b' : '#52546e'};">
                ${isFreeDel ? 'FREE 🎉' : esc(o.delivery || '—')}
              </span>
            </div>
          </div>
          <div style="font-size:1.05rem;font-weight:800;color:#6366f1;">
            ${esc(o.totalAmt || '—')}
          </div>
        </div>

      </div>`;
  }).join('');
}

/* ─── Close panel ─── */
function closeOrderHistory() {
  document.getElementById('_ohPanel')?.remove();
  document.body.style.overflow = '';
}

/* ─── HTML escape util ─── */
function esc(s) {
  return String(s || '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

/* ─── Expose globally so firebase-auth.js user menu can call it ─── */
window.openOrderHistory  = openOrderHistory;
window.closeOrderHistory = closeOrderHistory;

console.log('\u2713 order-history.js loaded');
