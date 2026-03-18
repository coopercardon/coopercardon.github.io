/* Track Order Script */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxD_z9H9WKFSxDn8_YtxhxKVh3Bc6kR5hv8aP8u10_SIgB-rSPm5eHaDAN38962o5wZXQ/exec";

function $(id) { return document.getElementById(id); }

/* Mobile menu toggle */
document.addEventListener('DOMContentLoaded', function() {
  const mobileMenuBtn = $('mobileMenuBtn');
  const mobileNav = $('mobileNav');
  
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', function() {
      this.classList.toggle('active');
      mobileNav.classList.toggle('open');
    });
  }
  
  // Close menu when link clicked
  const mobileLinks = mobileNav.querySelectorAll('a');
  mobileLinks.forEach(link => {
    link.addEventListener('click', function() {
      mobileMenuBtn.classList.remove('active');
      mobileNav.classList.remove('open');
    });
  });
  
  // Handle form submission
  const trackForm = $('trackForm');
  if (trackForm) {
    trackForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      await searchOrder();
    });
  }
});

/* Search order */
async function searchOrder() {
  const orderId = $('orderId').value.trim();
  const orderEmail = $('orderEmail').value.trim();
  const btn = $('trackBtn');
  const resultsDiv = $('trackResults');
  
  if (!orderId || !orderEmail) {
    showError('Please fill in all fields');
    return;
  }
  
  // Show loading state
  btn.disabled = true;
  btn.classList.add('loading');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<div class="spinner"></div>Searching...';
  
  try {
    const response = await fetch(
      APPS_SCRIPT_URL + '?action=track&orderId=' + encodeURIComponent(orderId) + '&email=' + encodeURIComponent(orderEmail)
    );
    
    const data = await response.json();
    
    if (data.status === 'success' && data.order) {
      displayOrder(data.order);
    } else {
      showError(data.message || 'Order not found. Please check your Order ID and email address.');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('An error occurred. Please try again.');
  } finally {
    btn.disabled = false;
    btn.classList.remove('loading');
    btn.innerHTML = originalText;
  }
}

/* Show error */
function showError(message) {
  const resultsDiv = $('trackResults');
  const errorDiv = $('errorMessage');
  const errorText = $('errorText');
  const orderCard = $('orderCard');
  
  errorText.textContent = message;
  errorDiv.style.display = 'block';
  orderCard.style.display = 'none';
  resultsDiv.classList.add('show');
  
  // Scroll to results
  resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* Display order */
function displayOrder(order) {
  const resultsDiv = $('trackResults');
  const errorDiv = $('errorMessage');
  const orderCard = $('orderCard');
  
  errorDiv.style.display = 'none';
  
  // Fill order details
  $('displayOrderId').textContent = order.orderId || '—';
  $('orderDate').textContent = order.date || '—';
  $('orderAmount').textContent = order.amount || '—';
  $('orderName').textContent = order.name || '—';
  $('orderPhone').textContent = order.phone || '—';
  $('orderEmail').textContent = order.email || '—';
  $('orderAddress').textContent = order.address || '—';
  $('orderBooks').textContent = order.books || '—';
  
  // Show/hide note
  if (order.note && order.note.trim()) {
    $('noteItem').style.display = 'block';
    $('orderNote').textContent = order.note;
  } else {
    $('noteItem').style.display = 'none';
  }
  
  // Update status
  updateStatus(order.status || 'New');
  
  orderCard.style.display = 'block';
  resultsDiv.classList.add('show');
  
  // Scroll to results
  orderCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
  badgeEl.className = 'status-badge ' + statusInfo.badge;
  badgeEl.innerHTML = `<span class="status-icon">${statusInfo.icon}</span><span id="statusText">${statusInfo.label}</span>`;
  
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
  
  $('statusTimeline').innerHTML = timelineHtml;
}

/* Reset and search again */
function resetTrack() {
  $('orderId').value = '';
  $('orderEmail').value = '';
  $('trackResults').classList.remove('show');
  $('orderId').focus();
}

/* Allow Enter key to submit form */
document.addEventListener('DOMContentLoaded', function() {
  const inputs = document.querySelectorAll('#orderId, #orderEmail');
  inputs.forEach(input => {
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        searchOrder();
      }
    });
  });
});