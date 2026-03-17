/* ════════════════════════════════════════════════════════════
   ENHANCED UPI PAYMENT - Light Theme + Auto Confirmation
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
// Add Pay Online button to form (Light Theme)
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

  // Create Pay Online button - Light theme vibrant green
  const payOnlineBtn = document.createElement('button');
  payOnlineBtn.id = 'payOnlineBtn';
  payOnlineBtn.type = 'button';
  payOnlineBtn.className = 'om-submit'
  payOnlineBtn.style.cssText = `
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    margin-top: 0.75rem;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  `;
  
  payOnlineBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
    Pay Online
  `;

  payOnlineBtn.addEventListener('mouseover', () => {
    payOnlineBtn.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
    payOnlineBtn.style.transform = 'translateY(-2px)';
  });
  
  payOnlineBtn.addEventListener('mouseout', () => {
    payOnlineBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
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
      background: rgba(28, 29, 48, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      padding: 1rem;
      backdrop-filter: blur(8px);
      animation: fadeIn 0.25s ease-out;
    ">
      <div style="
        background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%);
        border-radius: 24px;
        padding: 2.5rem;
        max-width: 460px;
        width: 100%;
        text-align: center;
        box-shadow: 0 20px 60px rgba(28, 29, 48, 0.15), 0 0 1px rgba(28, 29, 48, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.1);
        animation: modalSlideUp 0.35s cubic-bezier(0.34, 1.2, 0.64, 1);
      ">
        <!-- Header -->
        <div style="margin-bottom: 1.75rem;">
          <div style="
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #ecfdf5 0%, #dcfce7 100%);
            border-radius: 16px;
            margin: 0 auto 1rem;
            border: 2px solid #10b981;
            font-size: 1.75rem;
          ">🔐</div>
          <div style="font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #10b981; margin-bottom: 0.5rem;">Secure Payment</div>
          <h2 style="font-size: 1.6rem; font-weight: 800; color: #1c1d30; margin: 0; letter-spacing: -0.02em;">Pay via UPI</h2>
          <p style="font-size: 0.85rem; color: #9496b2; margin-top: 0.5rem; margin-bottom: 0;">Order #${orderId}</p>
        </div>

        <!-- QR Code Section -->
        <div style="
          background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
          border: 2px dashed #10b981;
          border-radius: 18px;
          padding: 1.75rem 1.5rem;
          margin-bottom: 1.75rem;
        ">
          <p style="font-size: 0.72rem; color: #10b981; margin: 0 0 1rem 0; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">📱 Scan QR Code</p>
          <img src="${qrURL}" alt="UPI QR Code" style="
            width: 220px;
            height: 220px;
            margin: 0 auto;
            display: block;
            border-radius: 12px;
            background: white;
            padding: 8px;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
          "/>
          <p style="font-size: 0.72rem; color: #059669; margin-top: 1rem; margin-bottom: 0; font-weight: 600;">Using Google Pay, PhonePe, or BHIM</p>
        </div>

        <!-- Amount Card -->
        <div style="
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
          border: 2px solid #10b981;
          border-radius: 14px;
          padding: 1.25rem;
          margin-bottom: 1.75rem;
        ">
          <div style="font-size: 0.72rem; color: #059669; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 0.5rem;">💵 Amount to Pay</div>
          <div style="font-size: 2.2rem; font-weight: 800; color: #10b981; letter-spacing: -0.02em;">₹${amount}</div>
        </div>

        <!-- Open Payment Link -->
        <a href="${upiString}" style="
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          letter-spacing: -0.01em;
        " onmouseover="
          this.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
          this.style.transform = 'translateY(-2px)';
          this.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.35)';
        " onmouseout="
          this.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
          this.style.transform = 'translateY(0)';
          this.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          <span>Open in Google Pay / PhonePe</span>
        </a>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 0.75rem; margin-bottom: 1.5rem;">
          <button id="paymentDoneBtn" onclick="confirmUPIPaymentWithAnimation('${orderId}', ${amount}, '${name}', '${phone}', '${email}', '${address}')" style="
            flex: 1;
            padding: 13px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            border: none;
            border-radius: 11px;
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 0.9rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
            letter-spacing: -0.01em;
          " onmouseover="
            this.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
            this.style.transform = 'translateY(-1px)';
            this.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
          " onmouseout="
            this.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.2)';
          ">
            <span class="payment-done-text">✓ Payment Done</span>
            <span class="payment-spinner" style="display: none; margin-left: 0.5rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation: spin 0.8s linear infinite;">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </span>
          </button>
          <button onclick="closeUPIModal()" style="
            flex: 1;
            padding: 13px;
            background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
            color: #6b7280;
            border: 1.5px solid #d1d5db;
            border-radius: 11px;
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 0.9rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            letter-spacing: -0.01em;
          " onmouseover="
            this.style.background = 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)';
            this.style.transform = 'translateY(-1px)';
          " onmouseout="
            this.style.background = 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)';
            this.style.transform = 'translateY(0)';
          ">
            Cancel
          </button>
        </div>

        <!-- Info Text -->
        <p style="font-size: 0.74rem; color: #6b7280; margin: 0; line-height: 1.6;">
          🔒 <strong style="color: #374151;">Secure payment link</strong> — Complete payment in your UPI app, then click "Payment Done" to confirm your order.
        </p>
      </div>

      <style>
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes modalSlideUp {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
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
  if (modal) {
    modal.style.animation = 'fadeIn 0.25s ease-out reverse';
    setTimeout(() => {
      modal.remove();
    }, 250);
  }
  document.body.style.overflow = '';
}

// ════════════════════════════════════════════════════════════
// Confirm UPI Payment with Auto Animation
// ════════════════════════════════════════════════════════════

function confirmUPIPaymentWithAnimation(orderId, amount, name, phone, email, address) {
  console.log('✅ Payment confirmed with animation:', orderId);
  
  // Show loading state in button
  const doneBtn = document.getElementById('paymentDoneBtn');
  if (doneBtn) {
    doneBtn.disabled = true;
    doneBtn.style.opacity = '0.7';
    const textSpan = doneBtn.querySelector('.payment-done-text');
    const spinnerSpan = doneBtn.querySelector('.payment-spinner');
    if (textSpan) textSpan.style.display = 'none';
    if (spinnerSpan) spinnerSpan.style.display = 'inline';
  }

  // Close modal after brief delay
  setTimeout(() => {
    closeUPIModal();
    
    // Show processing overlay
    showProcessingOverlay(orderId);
    
    // Process payment
    processUPIPayment(orderId, amount, name, phone, email, address);
  }, 800);
}

// ════════════════════════════════════════════════════════════
// Processing Overlay (Buffer between modal close & success)
// ════════════════════════════════════════════════════════════

function showProcessingOverlay(orderId) {
  console.log('⏳ Showing processing overlay...');
  
  const overlayHTML = `
    <div id="processingOverlay" style="
      position: fixed;
      inset: 0;
      background: rgba(28, 29, 48, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1500;
      backdrop-filter: blur(8px);
      animation: fadeIn 0.3s ease-out;
    ">
      <div style="
        text-align: center;
        color: white;
      ">
        <!-- Animated Spinner -->
        <div style="
          width: 80px;
          height: 80px;
          margin: 0 auto 2rem;
          position: relative;
        ">
          <!-- Outer rotating ring -->
          <div style="
            position: absolute;
            inset: 0;
            border: 4px solid rgba(16, 185, 129, 0.2);
            border-top-color: #10b981;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          "></div>
          
          <!-- Inner pulsing circle -->
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 24px;
            height: 24px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            border-radius: 50%;
            animation: pulse 1.5s ease-in-out infinite;
          "></div>
        </div>

        <!-- Processing Text -->
        <h2 style="
          font-size: 1.4rem;
          font-weight: 800;
          margin: 0 0 0.75rem 0;
          letter-spacing: -0.02em;
        ">Confirming Order</h2>
        
        <p style="
          font-size: 0.95rem;
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
          line-height: 1.6;
          max-width: 280px;
          margin: 0 auto;
        ">
          Please wait while we verify your payment and confirm your order...
        </p>

        <!-- Order ID -->
        <div style="
          margin-top: 1.5rem;
          padding: 0.75rem 1.25rem;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 10px;
          font-family: monospace;
          font-size: 0.8rem;
          color: #10b981;
          letter-spacing: 0.05em;
          font-weight: 600;
        ">
          Order #${orderId}
        </div>
      </div>

      <style>
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.5;
            transform: translate(-50%, -50%) scale(0.85);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      </style>
    </div>
  `;

  // Remove any existing overlay
  const existing = document.getElementById('processingOverlay');
  if (existing) existing.remove();

  // Add processing overlay
  document.body.insertAdjacentHTML('beforeend', overlayHTML);
  document.body.style.overflow = 'hidden';
  console.log('✅ Processing overlay shown');
}

function closeProcessingOverlay() {
  console.log('✅ Closing processing overlay');
  const overlay = document.getElementById('processingOverlay');
  if (overlay) {
    overlay.style.animation = 'fadeIn 0.3s ease-out reverse';
    setTimeout(() => {
      overlay.remove();
    }, 300);
  }
}

function processUPIPayment(orderId, amount, name, phone, email, address) {
  console.log('💳 Processing UPI payment...');

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
    paymentStatus: 'Verified'
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
  console.log('🎉 Completing payment flow with animation...');
  
  // Close order form
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

  // Wait a moment, then close processing overlay and show success
  setTimeout(() => {
    // Close processing overlay
    closeProcessingOverlay();
    
    // Brief pause before success screen
    setTimeout(() => {
      if (typeof showSuccessScreen === 'function') {
        showSuccessScreen(orderId, false);
      }
      console.log('✅ Success screen displayed!');
    }, 400);
  }, 1500);
}

console.log('✅ UPI Payment Script fully loaded and ready');