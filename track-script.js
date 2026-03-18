/* Track Order Script */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxD_z9H9WKFSxDn8_YtxhxKVh3Bc6kR5hv8aP8u10_SIgB-rSPm5eHaDAN38962o5wZXQ/exec";

function $(id) { 
  const el = document.getElementById(id);
  if (!el) console.warn("Element not found: " + id);
  return el;
}

/* Mobile menu toggle */
document.addEventListener('DOMContentLoaded', function() {
  const mobileMenuBtn = $('mobileMenuBtn');
  const mobileNav = $('mobileNav');
  
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', function() {
      this.classList.toggle('active');
      if (mobileNav) mobileNav.classList.toggle('open');
    });
  }
  
  // Close menu when link clicked
  if (mobileNav) {
    const mobileLinks = mobileNav.querySelectorAll('a');
    mobileLinks.forEach(link => {
      link.addEventListener('click', function() {
        if (mobileMenuBtn) mobileMenuBtn.classList.remove('active');
        if (mobileNav) mobileNav.classList.remove('open');
      });
    });
  }
  
  // Handle form submission
  const trackForm = $('trackForm');
  if (trackForm) {
    trackForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      await searchOrder();
    });
  }
  
  // Allow Enter key
  const orderId = $('orderId');
  const orderEmail = $('orderEmail');
  if (orderId) orderId.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') searchOrder();
  });
  if (orderEmail) orderEmail.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') searchOrder();
  });
});

/* Search order */
async function searchOrder() {
  console.log('searchOrder called');
  
  const orderId = $('orderId');
  const orderEmail = $('orderEmail');
  const btn = $('trackBtn');
  const resultsDiv = $('trackResults');
  
  if (!orderId || !orderEmail) {
    console.error('Form elements not found');
    showError('Form elements not found. Please refresh the page.');
    return;
  }
  
  const orderIdValue = orderId.value.trim();
  const orderEmailValue = orderEmail.value.trim();
  
  console.log('Order ID:', orderIdValue);
  console.log('Email:', orderEmailValue);
  
  if (!orderIdValue || !orderEmailValue) {
    showError('Please fill in all fields');
    return;
  }
  
  // Show loading state
  if (btn) {
    btn.disabled = true;
    btn.classList.add('loading');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<div class="spinner"></div>Searching...';
  }
  
  try {
    const url = APPS_SCRIPT_URL + '?action=track&orderId=' + encodeURIComponent(orderIdValue) + '&email=' + encodeURIComponent(orderEmailValue);
    console.log('Fetching:', url);
    
    const response = await fetch(url);
    console.log('Response status:', response.status);
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (data.status === 'success' && data.order) {
      console.log('Order found:', data.order);
      displayOrder(data.order);
    } else {
      console.log('Order not found or error:', data.message);
      showError(data.message || 'Order not found. Please check your Order ID and email address.');
    }
  } catch (error) {
    console.error('Fetch error:', error);
    showError('An error occurred: ' + error.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('loading');
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Track Order';
    }
  }
}

/* Show error */
function showError(message) {
  const resultsDiv = $('trackResults');
  const errorDiv = $('errorMessage');
  const errorText = $('errorText');
  const orderCard = $('orderCard');
  
  if (errorText) errorText.textContent = message;
  if (errorDiv) errorDiv.style.display = 'block';
  if (orderCard) orderCard.style.display = 'none';
  if (resultsDiv) {
    resultsDiv.classList.add('show');
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/* Display order */
function displayOrder(order) {
  const resultsDiv = $('trackResults');
  const errorDiv = $('errorMessage');
  const orderCard = $('orderCard');
  
  if (errorDiv) errorDiv.style.display = 'none';
  
  // Fill order details
  const displayOrderId = $('displayOrderId');
  if (displayOrderId) displayOrderId.textContent = order.orderId || '—';
  
  const orderDate = $('orderDate');
  if (orderDate) orderDate.textContent = order.date || '—';
  
  const orderAmount = $('orderAmount');
  if (orderAmount) orderAmount.textContent = order.amount || '—';
  
  const orderName = $('orderName');
  if (orderName) orderName.textContent = order.name || '—';
  
  const orderPhone = $('orderPhone');
  if (orderPhone) orderPhone.textContent = order.phone || '—';
  
  const orderAddress = $('orderAddress');
  if (orderAddress) orderAddress.textContent = order.address || '—';
  
  const orderBooks = $('orderBooks');
  if (orderBooks) orderBooks.textContent = order.books || '—';
  
  // Show/hide note
  const noteItem = $('noteItem');
  if (order.note && order.note.trim()) {
    if (noteItem) noteItem.style.display = 'block';
    const orderNote = $('orderNote');
    if (orderNote) orderNote.textContent = order.note;
  } else {
    if (noteItem) noteItem.style.display = 'none';
  }
  
  // Update status
  updateStatus(order.status || 'New');
  
  if (orderCard) orderCard.style.display = 'block';
  if (resultsDiv) {
    resultsDiv.classList.add('show');
    orderCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/* Update status display */
function updateStatus(status) {
  const statusMap = {
    'New': { badge: 'status-new', icon: '📋', label: 'Order Received' },
    'Confirmed': { badge: 'status-confirmed', icon: '✅', label: 'Order Confirmed' },
    'Packed': { badge: 'status-packed', icon: '📦', label: 'Packed & Ready' },
    'Shipped': { badge: 'status-shipped', icon: '🚚', label: 'On the Way' },
    'Delivered': { badge: 'status-delivered', icon: '✨', label: 'Delivered' }
  };
  
  const statusInfo = statusMap[status] || statusMap['New'];
  
  // Update badge
  const badgeEl = $('statusBadge');
  if (badgeEl) {
    badgeEl.className = 'status-badge ' + statusInfo.badge;
    badgeEl.innerHTML = `<span class="status-icon">${statusInfo.icon}</span><span id="statusText">${statusInfo.label}</span>`;
  }
  
  // Update timeline
  const statuses = ['New', 'Confirmed', 'Packed', 'Shipped', 'Delivered'];
  const currentIndex = statuses.indexOf(status);
  
  let timelineHtml = '';
  statuses.forEach((s, index) => {
    let stepClass = 'timeline-step';
    if (index < currentIndex) stepClass += ' completed';
    if (index === currentIndex) stepClass += ' active';
    
    const stepNum = index + 1;
    const icon = statusMap[s].icon;
    
    timelineHtml += `
      <div class="${stepClass}">
        <div class="timeline-dot">${stepNum}</div>
        <div class="timeline-label">${statusMap[s].label}</div>
      </div>
    `;
  });
  
  const statusTimeline = $('statusTimeline');
  if (statusTimeline) statusTimeline.innerHTML = timelineHtml;
}

/* Reset and search again */
function resetTrack() {
  const orderId = $('orderId');
  const orderEmail = $('orderEmail');
  const resultsDiv = $('trackResults');
  
  if (orderId) orderId.value = '';
  if (orderEmail) orderEmail.value = '';
  if (resultsDiv) resultsDiv.classList.remove('show');
  if (orderId) orderId.focus();
}
