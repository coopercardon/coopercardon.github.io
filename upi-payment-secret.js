/* ════════════════════════════════════════════════════════════
   FIXED UPI PAYMENT - With Auto-Confirm Animation & Light Theme
   ════════════════════════════════════════════════════════════
   
   🎨 LIGHT THEME COLOR PALETTE:
   ─────────────────────────────────
   Primary (Green):      #15a05b (dark), #0d8344 (darker)
   Primary BG:           #e8faf2 (light), #d4f5e8 (lighter)
   Secondary (Indigo):   #6366f1 (medium), #5b63e3 (dark)
   Light Gray:           #f5f6fd (page bg), #eceef8 (surface)
   Text Dark:            #1c1d30 (primary), #52546e (secondary)
   Text Light:           #9496b2 (tertiary), #c9ccdf (borders)
   
   Features:
   ✓ Light, airy design with soft colors
   ✓ High contrast for readability
   ✓ Green theme for payment (trust/success)
   ✓ Smooth animations & shadows
   ✓ Mobile responsive
   ════════════════════════════════════════════════════════════ */

const UPI_CONFIG = {
  UPI_ID: 'amanthakur386@ptaxis',
  MERCHANT_NAME: 'BUUKS.IN',
  MERCHANT_NOTES: 'Book Order Payment',
};

// Light theme color constants
const LIGHT_THEME = {
  // Primary Colors (Green - for payment/trust)
  green: {
    dark: '#0d8344',
    medium: '#15a05b',
    light: '#d4f5e8',
    lighter: '#e8faf2'
  },
  // Secondary Colors (Indigo - for actions)
  indigo: {
    dark: '#5b63e3',
    medium: '#6366f1'
  },
  // Backgrounds
  bg: {
    page: '#f5f6fd',
    surface: '#eceef8',
    card: '#ffffff'
  },
  // Text
  text: {
    primary: '#1c1d30',
    secondary: '#52546e',
    tertiary: '#9496b2'
  },
  // Borders
  border: {
    light: '#e0e2f0',
    medium: '#c9ccdf'
  }
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
  payOnlineBtn.className = 'om-submit'
  payOnlineBtn.style.cssText = `
    background: linear-gradient(135deg, #15a05b 0%, #1d9e75 100%);
    margin-top: 0.75rem;
    box-shadow: 0 4px 16px rgba(21, 160, 91, 0.2);
  `;
  
  payOnlineBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
    Pay Online
  `;

  payOnlineBtn.addEventListener('mouseover', () => {
    payOnlineBtn.style.boxShadow = '0 6px 24px rgba(21, 160, 91, 0.3)';
    payOnlineBtn.style.transform = 'translateY(-2px)';
  });
  
  payOnlineBtn.addEventListener('mouseout', () => {
    payOnlineBtn.style.boxShadow = '0 4px 16px rgba(21, 160, 91, 0.2)';
    payOnlineBtn.style.transform = 'translateY(0)';
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

  // Calculate total
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
// Show UPI Payment Modal (Light Theme)
// ════════════════════════════════════════════════════════════

function showUPIPaymentModal(amount, orderId, name, phone, email, address) {
  console.log('🎯 Showing UPI payment modal');
  
  const upiString = generateUPIString(amount, orderId);
  const qrURL = generateQRCodeURL(upiString);

  const modalHTML = `
    <div id="upiPaymentModal" style="
      position: fixed;
      inset: 0;
      background: rgba(28, 29, 48, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      padding: 1rem;
      backdrop-filter: blur(4px);
    ">
      <div style="
        background: #ffffff;
        border-radius: 24px;
        padding: 2.5rem 2rem;
        max-width: 460px;
        width: 100%;
        text-align: center;
        box-shadow: 0 20px 60px rgba(28, 29, 48, 0.15);
        animation: modalSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        border: 1px solid rgba(99, 102, 241, 0.1);
      ">
        <!-- Header -->
        <div style="margin-bottom: 2rem;">
          <div style="
            font-size: 0.7rem;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: #15a05b;
            margin-bottom: 0.75rem;
            display: inline-block;
            background: #e8faf2;
            padding: 0.4rem 0.9rem;
            border-radius: 20px;
            border: 1px solid #15a05b;
          ">🔐 Secure Payment</div>
          <h2 style="
            font-size: 1.6rem;
            font-weight: 800;
            color: #1c1d30;
            margin: 0.75rem 0 0 0;
            letter-spacing: -0.02em;
          ">Pay via UPI</h2>
          <p style="
            font-size: 0.85rem;
            color: #9496b2;
            margin-top: 0.5rem;
          ">Order #${orderId}</p>
        </div>

        <!-- QR Code -->
        <div style="
          background: linear-gradient(135deg, #f5f6fd 0%, #eceef8 100%);
          border: 2px dashed #e0e2f0;
          border-radius: 18px;
          padding: 1.75rem;
          margin-bottom: 1.75rem;
        ">
          <p style="
            font-size: 0.72rem;
            color: #52546e;
            margin: 0 0 1rem 0;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.05em;
          ">Scan QR Code</p>
          <img src="${qrURL}" alt="UPI QR Code" style="
            width: 200px;
            height: 200px;
            margin: 0 auto;
            display: block;
            border-radius: 12px;
            background: white;
            padding: 8px;
            box-shadow: 0 2px 8px rgba(28, 29, 48, 0.08);
          "/>
          <p style="
            font-size: 0.73rem;
            color: #9496b2;
            margin-top: 1rem;
            margin-bottom: 0;
          ">With Google Pay, PhonePe, or BHIM</p>
        </div>

        <!-- Amount Box (Light Green) -->
        <div style="
          background: linear-gradient(135deg, #e8faf2 0%, #d4f5e8 100%);
          border: 1.5px solid #15a05b;
          border-radius: 14px;
          padding: 1.25rem;
          margin-bottom: 1.75rem;
        ">
          <div style="
            font-size: 0.7rem;
            color: #0d8344;
            text-transform: uppercase;
            font-weight: 700;
            margin-bottom: 0.5rem;
            letter-spacing: 0.06em;
          ">💵 Amount to Pay</div>
          <div style="
            font-size: 2.2rem;
            font-weight: 800;
            color: #15a05b;
            letter-spacing: -0.02em;
          ">₹${amount}</div>
        </div>

        <!-- Direct Link Button -->
        <a href="${upiString}" style="
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #15a05b 0%, #0d8344 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          margin-bottom: 1.25rem;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(21, 160, 91, 0.25);
        " onmouseover="this.style.boxShadow = '0 6px 20px rgba(21, 160, 91, 0.35)'; this.style.transform = 'translateY(-1px)'" onmouseout="this.style.boxShadow = '0 4px 12px rgba(21, 160, 91, 0.25)'; this.style.transform = 'translateY(0)'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          Open in Google Pay / PhonePe
        </a>

        <!-- Confirmation Buttons -->
        <div style="display: flex; gap: 0.75rem;">
          <button onclick="showPaymentConfirmation('${orderId}', ${amount}, '${name}', '${phone}', '${email}', '${address}')" style="
            flex: 1;
            padding: 13px;
            background: linear-gradient(135deg, #15a05b 0%, #0d8344 100%);
            color: white;
            border: none;
            border-radius: 11px;
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 0.9rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 12px rgba(21, 160, 91, 0.2);
          " onmouseover="this.style.boxShadow = '0 6px 16px rgba(21, 160, 91, 0.3)'; this.style.transform = 'translateY(-1px)'" onmouseout="this.style.boxShadow = '0 4px 12px rgba(21, 160, 91, 0.2)'; this.style.transform = 'translateY(0)'">
            ✓ Payment Done
          </button>
          <button onclick="closeUPIModal()" style="
            flex: 1;
            padding: 13px;
            background: #f5f6fd;
            color: #52546e;
            border: 1.5px solid #e0e2f0;
            border-radius: 11px;
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 0.9rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
          " onmouseover="this.style.background = '#eceef8'; this.style.borderColor = '#c9ccdf'" onmouseout="this.style.background = '#f5f6fd'; this.style.borderColor = '#e0e2f0'">
            Cancel
          </button>
        </div>

        <!-- Security Note -->
        <p style="
          font-size: 0.74rem;
          color: #9496b2;
          margin-top: 1.5rem;
          margin-bottom: 0;
          line-height: 1.6;
        ">
          🔒 <strong style="color: #52546e;">Secure payment link</strong> — After payment, click "Payment Done" to confirm order.
        </p>
      </div>

      <style>
        @keyframes modalSlideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes checkmarkPop {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes confettiPop {
          0% {
            transform: translateY(-10px) scale(0);
            opacity: 1;
          }
          100% {
            transform: translateY(100px) scale(1);
            opacity: 0;
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
// Show Payment Confirmation Animation
// ════════════════════════════════════════════════════════════

function showPaymentConfirmation(orderId, amount, name, phone, email, address) {
  console.log('✅ Payment Confirmed - Showing animation');
  
  // Close the UPI modal
  closeUPIModal();

  // Create confirmation overlay with animation
  const confirmationHTML = `
    <div id="paymentConfirmation" style="
      position: fixed;
      inset: 0;
      background: rgba(28, 29, 48, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2001;
      backdrop-filter: blur(4px);
    ">
      <div style="
        background: white;
        border-radius: 24px;
        padding: 3rem 2rem;
        max-width: 360px;
        text-align: center;
        animation: modalSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      ">
        <!-- Checkmark -->
        <div style="
          width: 90px;
          height: 90px;
          margin: 0 auto 1.5rem;
          background: linear-gradient(135deg, #e8faf2 0%, #d4f5e8 100%);
          border: 2.5px solid #15a05b;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: checkmarkPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s backwards;
        ">
          <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#15a05b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>

        <!-- Label -->
        <div style="
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #15a05b;
          margin-bottom: 0.5rem;
          animation: fadeIn 0.6s ease 0.5s backwards;
        ">Payment Confirmed</div>

        <!-- Title -->
        <h2 style="
          font-size: 1.5rem;
          font-weight: 800;
          color: #1c1d30;
          margin: 0 0 0.5rem 0;
          animation: fadeIn 0.6s ease 0.6s backwards;
        ">Order Confirmed!</h2>

        <!-- Subtitle -->
        <p style="
          font-size: 0.9rem;
          color: #52546e;
          margin-bottom: 1.5rem;
          line-height: 1.6;
          animation: fadeIn 0.6s ease 0.7s backwards;
        ">
          Your payment has been received. Order is being processed.
        </p>

        <!-- Order Details Box -->
        <div style="
          background: #f5f6fd;
          border: 1px solid #e0e2f0;
          border-radius: 14px;
          padding: 1rem;
          margin-bottom: 1.5rem;
          animation: fadeIn 0.6s ease 0.8s backwards;
        ">
          <div style="
            font-size: 0.72rem;
            color: #9496b2;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 0.5rem;
          ">Order ID</div>
          <div style="
            font-family: monospace;
            font-size: 0.9rem;
            font-weight: 600;
            color: #6366f1;
            letter-spacing: 0.05em;
          ">${orderId}</div>
        </div>

        <!-- Confirm Button -->
        <button onclick="completeUPIPaymentFlow('${orderId}', '${name}', '${phone}', '${email}', '${address}')" style="
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #6366f1 0%, #5b63e3 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
          animation: fadeIn 0.6s ease 0.9s backwards;
        " onmouseover="this.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.3)'; this.style.transform = 'translateY(-1px)'" onmouseout="this.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.2)'; this.style.transform = 'translateY(0)'">
          Continue to Order
        </button>
      </div>

      <style>
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes modalSlideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes checkmarkPop {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      </style>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', confirmationHTML);
}

// ════════════════════════════════════════════════════════════
// Complete Payment Flow & Save Order
// ════════════════════════════════════════════════════════════

function completeUPIPaymentFlow(orderId, name, phone, email, address) {
  console.log('🎉 Completing payment flow...');
  
  // Close confirmation modal
  const confirmation = document.getElementById('paymentConfirmation');
  if (confirmation) confirmation.remove();

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
    paymentStatus: 'Paid via UPI'
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
      finalizeOrder(orderId);
    }).catch(err => {
      console.error('❌ Send error:', err);
      finalizeOrder(orderId);
    });
  } else {
    console.log('⚠️ Apps Script URL not configured, skipping sheet save');
    finalizeOrder(orderId);
  }
}

function finalizeOrder(orderId) {
  console.log('🎉 Order finalized!');
  
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

  // Show success screen with confetti
  if (typeof showSuccessScreen === 'function') {
    showSuccessScreen(orderId, false);
  }

  console.log('✅ Order complete!');
}

console.log('✅ UPI Payment Script fully loaded with auto-confirm animation');