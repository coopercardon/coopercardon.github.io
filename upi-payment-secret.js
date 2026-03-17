/* ════════════════════════════════════════════════════════════
   FIXED UPI PAYMENT ADDON - Better timing & error handling
   ════════════════════════════════════════════════════════════ */

const UPI_CONFIG = {
  UPI_ID: 'amanthakur386@ptaxis',
  MERCHANT_NAME: 'BUUKS.IN',
  MERCHANT_NOTES: 'Book Order Payment',
};

console.log('✅ UPI Payment Script Loaded');

// ════════════════════════════════════════════════════════════
// Wait for DOM and main script to load, then initialize
// ════════════════════════════════════════════════════════════

function initializeUPIIntegration() {
  console.log('🔧 Initializing UPI Integration...');

  // Check if main functions exist
  if (typeof openOrderForm !== 'function') {
    console.warn('⏳ openOrderForm not ready yet, retrying...');
    setTimeout(initializeUPIIntegration, 500);
    return;
  }

  console.log('✓ Main functions are ready');

  // Wrap the openOrderForm function
  const originalOpenOrderForm = openOrderForm;
  window.openOrderForm = function() {
    console.log('📝 Opening order form...');
    originalOpenOrderForm.apply(this, arguments);
    
    // Give the form time to render
    setTimeout(() => {
      console.log('🎨 Injecting Pay Online button...');
      addPayOnlineButton();
    }, 200);
  };

  console.log('✅ UPI Integration Ready!');
}

// Wait for page to be fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializeUPIIntegration, 500);
  });
} else {
  setTimeout(initializeUPIIntegration, 500);
}

// ════════════════════════════════════════════════════════════
// Add Pay Online button to form
// ════════════════════════════════════════════════════════════

function addPayOnlineButton() {
  console.log('🔍 Looking for form...');
  const formElement = document.getElementById('omForm');
  
  if (!formElement) {
    console.warn('❌ omForm not found');
    return;
  }

  // Check if button already exists (don't add duplicates)
  if (document.getElementById('payOnlineBtn')) {
    console.log('✓ Pay Online button already exists');
    return;
  }

  console.log('✓ Found form, creating button...');

  // Find the submit button
  const submitBtn = formElement.querySelector('.om-submit');
  if (!submitBtn) {
    console.warn('❌ Submit button not found');
    return;
  }

  // Create Pay Online button
  const payOnlineBtn = document.createElement('button');
  payOnlineBtn.id = 'payOnlineBtn';
  payOnlineBtn.type = 'button';
  payOnlineBtn.className = 'om-submit' // Use same styling
  payOnlineBtn.style.cssText = `
    background: #1d9e75;
    margin-top: 0.75rem;
  `;
  
  payOnlineBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
    Pay Online
  `;

  payOnlineBtn.addEventListener('mouseover', () => {
    payOnlineBtn.style.background = '#0d8344';
  });
  
  payOnlineBtn.addEventListener('mouseout', () => {
    payOnlineBtn.style.background = '#1d9e75';
  });

  payOnlineBtn.addEventListener('click', function(e) {
    e.preventDefault();
    handlePayOnlineClick();
  });

  // Insert after submit button
  submitBtn.parentElement.appendChild(payOnlineBtn);
  console.log('✅ Pay Online button added successfully!');
}

// ════════════════════════════════════════════════════════════
// Handle Pay Online click
// ════════════════════════════════════════════════════════════

function handlePayOnlineClick() {
  console.log('💳 Pay Online clicked');
  
  // Validate fields
  const name    = document.getElementById('omName')?.value.trim();
  const phone   = document.getElementById('omPhone')?.value.trim();
  const email   = document.getElementById('omEmail')?.value.trim();
  const address = document.getElementById('omAddress')?.value.trim();

  // Mark errors
  let valid = true;
  [
    ['omName', name],
    ['omPhone', phone],
    ['omEmail', email],
    ['omAddress', address]
  ].forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) {
      if (!val) {
        el.classList.add('error');
        valid = false;
      } else {
        el.classList.remove('error');
      }
    }
  });

  if (!valid) {
    showToast('Please fill all required fields');
    return;
  }

  console.log('✓ Fields validated');

  // Calculate total (assuming cart global exists)
  if (typeof cart === 'undefined') {
    console.error('❌ Cart object not found');
    showToast('Error: Cart not found');
    return;
  }

  const items     = Object.values(cart);
  const subAmt    = items.reduce((s, i) => s + parseFloat((i.book.price || '0').replace(/[^\d.]/g, '')) * i.qty, 0);
  const delAmt    = subAmt >= 499 ? 0 : 50;
  const totalAmt  = subAmt + delAmt;
  
  const orderId = generateOrderId();

  console.log(`💰 Total: ₹${totalAmt}`);

  // Show UPI payment screen
  showUPIPaymentModal(totalAmt, orderId, name, phone, email, address);
}

// ════════════════════════════════════════════════════════════
// Generate UPI QR Code
// ════════════════════════════════════════════════════════════

function generateUPIString(amount, orderId) {
  const upiString = `upi://pay?pa=${UPI_CONFIG.UPI_ID}&pn=${UPI_CONFIG.MERCHANT_NAME}&am=${amount}&tn=${encodeURIComponent(UPI_CONFIG.MERCHANT_NOTES)}&tr=${orderId}`;
  console.log('Generated UPI string for amount:', amount);
  return upiString;
}

function generateQRCodeURL(upiString) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(upiString)}&format=png`;
}

// ════════════════════════════════════════════════════════════
// Show UPI Payment Modal
// ════════════════════════════════════════════════════════════

function showUPIPaymentModal(amount, orderId, name, phone, email, address) {
  console.log('🎯 Showing UPI payment modal');
  
  const upiString = generateUPIString(amount, orderId);
  const qrURL = generateQRCodeURL(upiString);

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
        <div style="margin-bottom: 1.5rem;">
          <div style="font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #1d9e75; margin-bottom: 0.5rem;">🔐 Secure Payment</div>
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text); margin: 0;">Pay via UPI</h2>
          <p style="font-size: 0.85rem; color: var(--text3); margin-top: 0.5rem;">Order #${orderId}</p>
        </div>

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

        <p style="font-size: 0.75rem; color: var(--text3); margin-top: 1.25rem; margin-bottom: 0; line-height: 1.6;">
          🔒 <strong>Secure payment link</strong> — After payment, click "Payment Done" to confirm order.
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

  // Remove existing modal
  const existing = document.getElementById('upiPaymentModal');
  if (existing) existing.remove();

  // Add new modal
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  document.body.style.overflow = 'hidden';
  console.log('✅ Modal displayed');
}

function closeUPIModal() {
  console.log('❌ UPI modal closed');
  const modal = document.getElementById('upiPaymentModal');
  if (modal) modal.remove();
  document.body.style.overflow = '';
}

// ════════════════════════════════════════════════════════════
// Confirm UPI Payment
// ════════════════════════════════════════════════════════════

function confirmUPIPayment(orderId, amount, name, phone, email, address) {
  console.log('✅ Payment confirmed:', orderId);
  closeUPIModal();

  const note = document.getElementById('omNote')?.value.trim() || '';
  const items     = Object.values(cart);
  const titles    = items.map(i => `${i.book.title} (x${i.qty})`).join(', ');
  const isbns     = items.map(i => `${i.book.isbn||'—'} (x${i.qty})`).join(', ');
  const totalQty  = items.reduce((s, i) => s + i.qty, 0);
  const subAmt    = items.reduce((s, i) => s + parseFloat((i.book.price || '0').replace(/[^\d.]/g, '')) * i.qty, 0);
  const delAmt    = subAmt >= 499 ? 0 : 50;
  const totalAmt  = subAmt + delAmt;
  const timestamp = new Date().toLocaleString('en-IN', {timeZone:'Asia/Kolkata'});

  const payload = {
    orderId, timestamp, name, phone, email, address, note,
    titles, isbns, totalQty,
    subtotal: `₹${subAmt}`,
    delivery: delAmt === 0 ? 'FREE' : `₹${delAmt}`,
    totalAmt: `₹${totalAmt}`,
    paymentMethod: 'UPI',
    paymentStatus: 'Awaiting Verification'
  };

  console.log('📊 Order payload:', payload);

  // Send to Google Sheet
  if (typeof APPS_SCRIPT_URL !== 'undefined' && APPS_SCRIPT_URL && APPS_SCRIPT_URL !== 'YOUR_APPS_SCRIPT_URL_HERE') {
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(() => {
      console.log('✓ Order sent to sheet');
      completePaymentFlow(orderId);
    }).catch(err => {
      console.error('❌ Send error:', err);
      completePaymentFlow(orderId);
    });
  } else {
    console.log('⚠️ Apps Script URL not configured, skipping sheet save');
    completePaymentFlow(orderId);
  }
}

function completePaymentFlow(orderId) {
  console.log('🎉 Completing payment flow...');
  
  // Close form
  if (typeof closeOrderForm === 'function') {
    closeOrderForm();
  }

  // Clear cart
  if (typeof cart === 'object') {
    cart = {};
  }
  if (typeof updateCartUI === 'function') {
    updateCartUI();
  }
  if (typeof renderBooks === 'function') {
    renderBooks();
  }

  // Show success
  if (typeof showSuccessScreen === 'function') {
    showSuccessScreen(orderId, false);
  }

  console.log('✅ Order complete!');
}

console.log('✅ UPI Payment Script fully loaded and ready');
