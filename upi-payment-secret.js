/* ════════════════════════════════════════════════════════════
   HIDDEN UPI PAYMENT ADDON FOR BUUKS.IN
   Secret "Pay Online" button at checkout only
   User: amanthakur386@ptaxis
   ════════════════════════════════════════════════════════════ */

// ⚙️ CONFIGURATION
const UPI_CONFIG = {
  UPI_ID: 'amanthakur386@ptaxis',
  MERCHANT_NAME: 'BUUKS.IN',
  MERCHANT_NOTES: 'Book Order Payment',
};

// ════════════════════════════════════════════════════════════
// STEP 1: Add hidden "Pay Online" button to order form
// ════════════════════════════════════════════════════════════

function addPayOnlineButton() {
  const formElement = $('omForm');
  if (!formElement) return;

  // Insert "Pay Online" button RIGHT AFTER the main submit button
  const payOnlineBtn = document.createElement('button');
  payOnlineBtn.id = 'payOnlineBtn';
  payOnlineBtn.type = 'button';
  payOnlineBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
    Pay Online
  `;
  payOnlineBtn.style.cssText = `
    height: 44px;
    padding: 0 1.5rem;
    background: #1d9e75;
    color: #fff;
    border: none;
    border-radius: 12px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    text-decoration: none;
    transition: background 0.15s;
    margin-top: 0.75rem;
    letter-spacing: -0.01em;
    width: 100%;
  `;
  
  payOnlineBtn.addEventListener('mouseover', () => {
    payOnlineBtn.style.background = '#0d8344';
  });
  payOnlineBtn.addEventListener('mouseout', () => {
    payOnlineBtn.style.background = '#1d9e75';
  });
  payOnlineBtn.addEventListener('click', handlePayOnlineClick);

  // Find the last button in the form and insert after it
  const lastButton = formElement.querySelector('.om-submit');
  if (lastButton) {
    lastButton.parentElement.appendChild(payOnlineBtn);
  }
}

// ════════════════════════════════════════════════════════════
// STEP 2: Generate UPI string and QR code
// ════════════════════════════════════════════════════════════

function generateUPIString(amount, orderId) {
  const upiString = `upi://pay?pa=${UPI_CONFIG.UPI_ID}&pn=${UPI_CONFIG.MERCHANT_NAME}&am=${amount}&tn=${encodeURIComponent(UPI_CONFIG.MERCHANT_NOTES)}&tr=${orderId}`;
  return upiString;
}

function generateQRCodeURL(upiString) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(upiString)}&format=png`;
}

// ════════════════════════════════════════════════════════════
// STEP 3: Handle "Pay Online" button click
// ════════════════════════════════════════════════════════════

function handlePayOnlineClick() {
  // Validate all fields first
  const name    = $('omName').value.trim();
  const phone   = $('omPhone').value.trim();
  const email   = $('omEmail').value.trim();
  const address = $('omAddress').value.trim();
  let valid = true;

  [['omName', name], ['omPhone', phone], ['omEmail', email], ['omAddress', address]].forEach(([id, val]) => {
    if (!val) { $(id).classList.add('error'); valid = false; }
    else $(id).classList.remove('error');
  });

  if (!valid) { 
    showToast('Please fill all required fields');
    return; 
  }

  // Calculate total
  const items     = Object.values(cart);
  const subAmt    = items.reduce((s,i) => s + px(i.book)*i.qty, 0);
  const delAmt    = subAmt >= 499 ? 0 : 50;
  const totalAmt  = subAmt + delAmt;
  const orderId   = generateOrderId();

  // Show UPI payment screen
  showUPIPaymentModal(totalAmt, orderId, name, phone, email, address);
}

// ════════════════════════════════════════════════════════════
// STEP 4: Show UPI Payment Modal (beautiful design)
// ════════════════════════════════════════════════════════════

function showUPIPaymentModal(amount, orderId, name, phone, email, address) {
  const upiString = generateUPIString(amount, orderId);
  const qrURL = generateQRCodeURL(upiString);

  // Create modal overlay
  const modalHTML = `
    <div id="upiPaymentModal" style="
      position: fixed;
      inset: 0;
      background: rgba(28, 29, 48, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      padding: 1rem;
      backdrop-filter: blur(4px);
    ">
      <div style="
        background: var(--white);
        border-radius: 20px;
        padding: 2rem;
        max-width: 440px;
        width: 100%;
        text-align: center;
        box-shadow: 0 20px 60px rgba(28, 29, 48, 0.2);
        animation: modalSlideUp 0.3s ease-out;
      ">
        <!-- Header -->
        <div style="margin-bottom: 1.5rem;">
          <div style="font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #1d9e75; margin-bottom: 0.5rem;">🔐 Secure Payment</div>
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text); margin: 0;">Pay via UPI</h2>
          <p style="font-size: 0.85rem; color: var(--text3); margin-top: 0.5rem;">Order #${orderId}</p>
        </div>

        <!-- QR Code -->
        <div style="
          background: var(--surface);
          border: 2px dashed var(--border);
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        ">
          <p style="font-size: 0.75rem; color: var(--text3); margin: 0 0 0.75rem 0; text-transform: uppercase; font-weight: 600;">Scan QR Code</p>
          <img src="${qrURL}" alt="UPI QR Code" style="width: 200px; height: 200px; margin: 0 auto; display: block; border-radius: 8px;"/>
          <p style="font-size: 0.75rem; color: var(--text3); margin-top: 0.75rem; margin-bottom: 0;">With Google Pay, PhonePe, or BHIM</p>
        </div>

        <!-- Amount Box -->
        <div style="
          background: #e8faf2;
          border: 1.5px solid #15a05b;
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        ">
          <div style="font-size: 0.75rem; color: #15a05b; text-transform: uppercase; font-weight: 600; margin-bottom: 0.25rem;">💵 Amount to Pay</div>
          <div style="font-size: 2rem; font-weight: 800; color: #15a05b; letter-spacing: -0.02em;">₹${amount}</div>
        </div>

        <!-- Direct Link -->
        <a href="${upiString}" style="
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 14px;
          background: #1d9e75;
          color: white;
          border: none;
          border-radius: 12px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          margin-bottom: 1rem;
          transition: background 0.15s;
        " onmouseover="this.style.background = '#0d8344'" onmouseout="this.style.background = '#1d9e75'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          Open in Google Pay / PhonePe
        </a>

        <!-- Confirmation Buttons -->
        <div style="display: flex; gap: 0.75rem;">
          <button onclick="confirmUPIPayment('${orderId}', ${amount}, '${name}', '${phone}', '${email}', '${address}')" style="
            flex: 1;
            padding: 12px;
            background: #15a05b;
            color: white;
            border: none;
            border-radius: 10px;
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 0.9rem;
            font-weight: 700;
            cursor: pointer;
            transition: background 0.15s;
          " onmouseover="this.style.background = '#0d8344'" onmouseout="this.style.background = '#15a05b'">
            ✓ Payment Done
          </button>
          <button onclick="closeUPIModal()" style="
            flex: 1;
            padding: 12px;
            background: var(--surface);
            color: var(--text2);
            border: 1.5px solid var(--border);
            border-radius: 10px;
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 0.9rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.15s;
          " onmouseover="this.style.background = 'var(--border)'" onmouseout="this.style.background = 'var(--surface)'">
            Cancel
          </button>
        </div>

        <!-- Security Note -->
        <p style="font-size: 0.75rem; color: var(--text3); margin-top: 1.25rem; line-height: 1.6;">
          🔒 <strong>Secure payment link</strong> — You'll be back here after payment. Click "Payment Done" to confirm order.
        </p>
      </div>

      <style>
        @keyframes modalSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      </style>
    </div>
  `;

  // Remove existing modal if any
  const existing = document.getElementById('upiPaymentModal');
  if (existing) existing.remove();

  // Add new modal
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  document.body.style.overflow = 'hidden';
}

function closeUPIModal() {
  const modal = document.getElementById('upiPaymentModal');
  if (modal) modal.remove();
  document.body.style.overflow = '';
}

// ════════════════════════════════════════════════════════════
// STEP 5: Confirm payment and submit order
// ════════════════════════════════════════════════════════════

function confirmUPIPayment(orderId, amount, name, phone, email, address) {
  closeUPIModal();

  const note = $('omNote').value.trim();
  const items     = Object.values(cart);
  const titles    = items.map(i => `${i.book.title} (x${i.qty})`).join(', ');
  const isbns     = items.map(i => `${i.book.isbn||'—'} (x${i.qty})`).join(', ');
  const totalQty  = items.reduce((s,i) => s + i.qty, 0);
  const subAmt    = items.reduce((s,i) => s + px(i.book)*i.qty, 0);
  const delAmt    = subAmt >= 499 ? 0 : 50;
  const totalAmt  = subAmt + delAmt;
  const timestamp = new Date().toLocaleString('en-IN', {timeZone:'Asia/Kolkata'});

  const payload = {
    orderId: orderId,
    timestamp: timestamp,
    name: name,
    phone: phone,
    email: email,
    address: address,
    note: note,
    titles: titles,
    isbns: isbns,
    totalQty: totalQty,
    subtotal: `₹${subAmt}`,
    delivery: delAmt === 0 ? 'FREE' : `₹${delAmt}`,
    totalAmt: `₹${totalAmt}`,
    paymentMethod: 'UPI',
    paymentStatus: 'Awaiting Verification'
  };

  // Send to Google Sheet
  if (APPS_SCRIPT_URL && APPS_SCRIPT_URL !== 'https://script.google.com/macros/s/AKfycbxD_z9H9WKFSxDn8_YtxhxKVh3Bc6kR5hv8aP8u10_SIgB-rSPm5eHaDAN38962o5wZXQ/exec') {
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(() => {
      completePaymentFlow(orderId);
    }).catch(err => {
      console.error('Error submitting order:', err);
      completePaymentFlow(orderId);
    });
  } else {
    console.log('Order placed (Apps Script not configured):', payload);
    completePaymentFlow(orderId);
  }
}

function completePaymentFlow(orderId) {
  // Close form
  closeOrderForm();

  // Clear cart
  cart = {};
  updateCartUI();
  renderBooks();

  // Show success screen
  showSuccessScreen(orderId, false);
}

// ════════════════════════════════════════════════════════════
// STEP 6: Initialize when order form opens
// ════════════════════════════════════════════════════════════

const originalOpenOrderForm = openOrderForm;
openOrderForm = function() {
  originalOpenOrderForm.apply(this, arguments);
  setTimeout(() => {
    addPayOnlineButton();
  }, 100);
};

// ════════════════════════════════════════════════════════════
// Done! Silent integration complete.
// ════════════════════════════════════════════════════════════