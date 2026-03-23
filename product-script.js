/* Product Page Script */
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTHchAmv037NjgZckS_fTzSRlDaqnnf96YnVsq_aKhP3BNXM7noWu-078Uvk_7VZvTIH34zVTy0ZE_n/pub?gid=116858916&single=true&output=csv";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxD_z9H9WKFSxDn8_YtxhxKVh3Bc6kR5hv8aP8u10_SIgB-rSPm5eHaDAN38962o5wZXQ/exec";
const PROXY = "https://corsproxy.io/?";

let allBooks = [];
let cart = {};
let currentBook = null;

function $(id) { return document.getElementById(id); }
function esc(s) { const div = document.createElement('div'); div.textContent = s; return div.innerHTML; }

function px(b) {
  return parseFloat((b.price || '0').replace(/,/g, '').replace(/[^\d.]/g, '')) || 0;
}

/* ══ CUSTOM ORDER FORM - SAME AS INDEX.HTML ══ */
function openOrderForm() {
  const items = Object.values(cart);
  if (!items.length) return;

  // Build cart summary - same format as index.html
  let summaryHtml = items.map(({book:b, qty}) => {
    const img = b.cover_url || (b.isbn ? `https://covers.openlibrary.org/b/isbn/${b.isbn}-M.jpg` : '');
    return `<div class="om-cart-item">
      ${img ? `<img class="om-ci-img" src="${esc(img)}" onerror="this.style.display='none'"/>` : '<div class="om-ci-img"></div>'}
      <div class="om-ci-info">
        <div class="om-ci-title">${esc(b.title)}</div>
        <div class="om-ci-meta">${esc(b.author||'')} · Qty: ${qty}</div>
      </div>
      <div class="om-ci-price">${qty>1?`₹${px(b)*qty} <small style='font-weight:400;font-size:0.72rem;opacity:0.7'>(${esc(b.price||'')} × ${qty})</small>`:`${esc(b.price||'—')}`}</div>
    </div>`;
  }).join('');

  const subtotal  = items.reduce((s,i) => s + px(i.book)*i.qty, 0);
  const delivery  = subtotal >= 499 ? 0 : 50;
  const grandTotal = subtotal + delivery;
  summaryHtml += `
    <div class="om-total-row" style="border-top:1px solid var(--border);">
      <span style="font-weight:500;color:var(--text-secondary)">Subtotal</span><span style="color:var(--text-primary)">₹${subtotal.toFixed(0)}</span>
    </div>
    <div class="om-total-row" style="border-top:1px solid var(--border);">
      <span style="font-weight:500;color:var(--text-secondary)">Delivery</span>
      <span style="color:${delivery===0?'var(--green)':'var(--text-secondary)'};font-weight:700">${delivery===0?'FREE 🎉':'₹50'}</span>
    </div>
    <div class="om-total-row" style="border-top:2px solid var(--border);background:var(--accent-bg);">
      <span>Total Payable</span><span>₹${grandTotal.toFixed(0)}</span>
    </div>
    <div style="padding:0.5rem 1rem;background:var(--amber-bg);border-top:1px solid rgba(217,119,6,0.15);font-size:0.76rem;font-weight:600;color:var(--amber);text-align:center;">
      💵 Cash on Delivery · Pay when your books arrive
    </div>`;
  
  $('omCartSummary').innerHTML = summaryHtml;

  // Clear form
  ['omName','omPhone','omEmail','omAddress'].forEach(id => $( id).classList.remove('error'));
  $('omSubmit').disabled = false;
  $('omSubmit').classList.remove('loading');
  $('omSubmit').querySelector('.om-btn-text').innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    Confirm Order`;

  // Close cart and show order form
  $('cartOverlay').classList.remove('open');
  $('orderOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('omName').focus(), 350);
}

function closeOrderForm() {
  $('orderOverlay').classList.remove('show');
  document.body.style.overflow = '';
}

async function submitOrder() {
  // Validate
  const name    = $('omName').value.trim();
  const phone   = $('omPhone').value.trim();
  const email   = $('omEmail').value.trim();
  const address = $('omAddress').value.trim();
  const note    = $('omNote').value.trim();
  let valid = true;

  [['omName', name], ['omPhone', phone], ['omEmail', email], ['omAddress', address]].forEach(([id, val]) => {
    if (!val) { $(id).classList.add('error'); valid = false; }
    else $(id).classList.remove('error');
  });
  if (!valid) { showToast('Please fill all required fields'); return; }

  // Loading state
  const btn = $('omSubmit');
  btn.disabled = true;
  btn.classList.add('loading');

  // Build order payload
  const items     = Object.values(cart);
  const titles    = items.map(i => `${i.book.title} (x${i.qty})`).join(', ');
  const isbns     = items.map(i => `${i.book.isbn||'—'} (x${i.qty})`).join(', ');
  const totalQty  = items.reduce((s,i) => s + i.qty, 0);
  const subAmt    = items.reduce((s,i) => s + px(i.book)*i.qty, 0);
  const delAmt    = subAmt >= 499 ? 0 : 50;
  const totalAmt  = subAmt + delAmt;
  const orderId   = generateOrderId();
  const timestamp = new Date().toLocaleString('en-IN', {timeZone:'Asia/Kolkata'});

  const payload = { orderId, timestamp, name, phone, email, address, note, titles, isbns, totalQty,
    subtotal: `₹${subAmt.toFixed(0)}`, delivery: delAmt===0?'FREE':`₹${delAmt}`, totalAmt: `₹${totalAmt.toFixed(0)}` };

  // Send to Apps Script
  if (APPS_SCRIPT_URL) {
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('Apps Script fetch error:', e);
    }
  }

  closeOrderForm();
  showSuccessScreen(orderId, false);
  cart = {};
  saveCartToStorage();
  updateCartUI();
  updateCartCount();
}

function showSuccessScreen(orderId, demoMode) {
  $('osOrderId').textContent = `Order #${orderId}`;
  $('os-sub-msg').textContent = "We've saved your order. Our team will contact you to confirm delivery!";
  launchConfetti();
  $('orderSuccessOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeSuccessScreen() {
  $('orderSuccessOverlay').classList.remove('show');
  document.body.style.overflow = '';
}

function generateOrderId() {
  const now    = new Date();
  const yy     = now.getFullYear().toString().slice(-2);
  const mm     = String(now.getMonth()+1).padStart(2,'0');
  const dd     = String(now.getDate()).padStart(2,'0');
  const hh     = String(now.getHours()).padStart(2,'0');
  const min    = String(now.getMinutes()).padStart(2,'0');
  const sec    = String(now.getSeconds()).padStart(2,'0');
  const rand   = Math.random().toString(36).substring(2,5).toUpperCase();
  return `BK-${yy}${mm}${dd}-${hh}${min}${sec}-${rand}`;
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2500);
}

function launchConfetti() {
  const container = $('osConfetti');
  if(!container) return;
  container.innerHTML = '';
  const colors = ['#6366f1','#15a05b','#f59e0b','#e5495e','#06b6d4','#a78bfa','#34d399','#fb923c'];
  for (let i = 0; i < 65; i++) {
    const dot = document.createElement('div');
    dot.className = 'cdot';
    const size = Math.random() * 9 + 5;
    dot.style.cssText = `
      left:${Math.random()*100}%;
      width:${size}px;height:${size}px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      animation-duration:${Math.random()*2+1.8}s;
      animation-delay:${Math.random()*0.7}s;
      border-radius:${Math.random()>0.4?'50%':'3px'};
      opacity:1;
    `;
    dot.style.position = 'fixed';
    dot.style.top = '-10px';
    dot.style.pointerEvents = 'none';
    dot.style.animation = `fall ${Math.random()*2+1.8}s linear forwards`;
    container.appendChild(dot);
  }
}

function isAvail(val) {
  const v = (val||'').toString().trim().toLowerCase();
  return v === 'yes' || v === 'y' || v === 'true' || v === '1';
}

function sheetUrl() {
  const bust = '&t=' + Date.now();
  return window.location.protocol === 'file:'
    ? PROXY + encodeURIComponent(SHEET_CSV_URL + bust)
    : SHEET_CSV_URL + bust;
}

function parseCSV(txt) {
  const lines = txt.trim().split('\n');
  if (lines.length < 2) return [];
  const hdrs = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,''));
  return lines.slice(1).map(line => {
    const cols = []; let cur = '', q = false;
    for(const c of line) {
      if(c === '"') { q = !q; continue; }
      if(c === ',' && !q) { cols.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    cols.push(cur.trim());
    const o = {}; 
    hdrs.forEach((h,i) => { o[h] = (cols[i]||'').trim(); });
    return o;
  });
}

async function loadBooks() {
  try {
    console.log('Fetching books from Google Sheet...');
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Loading took too long')), 15000)
    );
    
    const fetchPromise = fetch(sheetUrl(), { cache: 'no-store' }).then(r => r.text());
    const result = await Promise.race([fetchPromise, timeoutPromise]);
    
    allBooks = parseCSV(result);
    console.log('Books loaded:', allBooks.length);
    loadCartFromStorage();
    initPage();
  } catch (e) {
    console.error('Error loading books:', e);
    renderError('Failed to load book data', 'Please try refreshing the page. Error: ' + e.message);
  }
}

function loadCartFromStorage() {
  try {
    const stored = localStorage.getItem('buuksCart');
    if(stored) cart = JSON.parse(stored);
  } catch (e) {
    cart = {};
  }
}

function saveCartToStorage() {
  try {
    localStorage.setItem('buuksCart', JSON.stringify(cart));
  } catch (e) {}
}

function getURLParam(param) {
  const params = new URLSearchParams(window.location.search);
  return params.get(param);
}

function slugify(title) {
  return (title||'').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function findBook() {
  // New: match by title slug (?book=the-alchemist)
  const bookParam = getURLParam('book');
  if (bookParam) {
    return allBooks.find(b => slugify(b.title) === bookParam.toLowerCase());
  }
  // Legacy: match by ISBN (?isbn=...)
  const isbn = getURLParam('isbn');
  if (!isbn) return null;
  return allBooks.find(b => {
    const bookIsbn = (b.isbn || '').replace(/[\s\-]/g, '');
    const paramIsbn = isbn.replace(/[\s\-]/g, '');
    return bookIsbn === paramIsbn;
  });
}

async function fetchMarkdownDescription(descriptionUrl) {
  try {
    if(!descriptionUrl || descriptionUrl.trim() === '') {
      console.log('No description URL provided');
      return null;
    }
    
    console.log('Fetching from URL:', descriptionUrl);
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Description fetch timeout')), 8000)
    );
    
    const fetchPromise = fetch(descriptionUrl);
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    
    console.log('Fetch response status:', response.status, response.ok);
    
    if(!response.ok) {
      console.log('Fetch failed with status:', response.status);
      return null;
    }
    
    const mdText = await response.text();
    console.log('Content fetched, length:', mdText.length);
    console.log('First 200 chars:', mdText.substring(0, 200));
    return mdText;
  } catch (e) {
    console.log('Fetch error:', e);
    return null;
  }
}

function parseMarkdown(mdText) {
  if(!mdText) return '';
  let html = mdText
    .replace(/^### (.*?)$/gm, '<h3 style="margin-top:16px;margin-bottom:8px;">$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2 style="margin-top:20px;margin-bottom:10px;">$1</h2>')
    .replace(/^# (.*?)$/gm, '<h1 style="margin-top:24px;margin-bottom:12px;">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^\- (.*?)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul style="margin-left:20px;margin-top:8px;">$1</ul>')
    .replace(/\n\n+/g, '</p><p style="margin-top:12px;">');
  return `<p>${html}</p>`;
}

async function initPage() {
  const book = findBook();
  console.log('=== INIT PAGE CALLED ===');
  console.log('All books loaded:', allBooks.length);
  console.log('Looking for ISBN:', getURLParam('isbn'));
  
  if(!book) {
    console.log('❌ Book not found!');
    renderError('Book not found', 'The book you are looking for does not exist or has been removed.');
    return;
  }
  currentBook = book;
  console.log('✓ Book found:', book.title);
  console.log('Starting renderProduct...');
  await renderProduct(book);  // ← AWAIT THE ASYNC FUNCTION
  console.log('✓ renderProduct completed');
  updateMetaTags(book);
  updateSchemaData(book);
  updateCartCount();
  console.log('=== INIT PAGE COMPLETE ===');
  
  // Update button state if book is already in cart
  setTimeout(() => {
    const key = book.isbn || book.title;
    if(cart[key]) {
      updateCartUI();
    }
  }, 100);
}

async function renderProduct(book) {
  const avail = isAvail(book.available);
  const cleanIsbn = (book.isbn || '').replace(/[^0-9X]/gi, '').trim();

  // ── Debug: log all book keys to confirm column name ──
  console.log('Book keys:', Object.keys(book));
  console.log('book.images raw value:', JSON.stringify(book.images));

  // ── Collect all images ──
  // Primary image: cover_url or OpenLibrary fallback
  const primaryImg = book.cover_url
    ? book.cover_url
    : cleanIsbn ? `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg` : '';

  // Extra images from "images" column — try both | and , as separator
  const imagesRaw = book.images || '';
  const sep = imagesRaw.includes('|') ? '|' : ',';
  const extraImages = imagesRaw.split(sep).map(s => s.trim()).filter(Boolean);

  // Build final list: primary first, then all extras
  const allImages = [];
  if (primaryImg) allImages.push(primaryImg);
  extraImages.forEach(u => { if (u) allImages.push(u); });

  console.log('allImages:', allImages);

  // Store globally for slider navigation
  window._galleryImages = allImages;
  window._galleryIndex  = 0;

  // ── Build slider HTML ──
  let coverHtml;
  if (allImages.length === 0) {
    coverHtml = `
      <div class="product-cover">
        <div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--bg-secondary);text-align:center;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="opacity:0.5;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        </div>
      </div>`;
  } else {
    const showArrows = allImages.length > 1;
    coverHtml = `
      <div class="product-cover" style="position:relative;">
        <img id="sliderImg" src="${esc(allImages[0])}" alt="${esc(book.title)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;transition:opacity 0.2s;"/>
        ${showArrows ? `
          <button onclick="sliderNav(-1)" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.45);color:#fff;border:none;border-radius:50%;width:36px;height:36px;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2;">&#8249;</button>
          <button onclick="sliderNav(1)"  style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.45);color:#fff;border:none;border-radius:50%;width:36px;height:36px;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2;">&#8250;</button>
          <div style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:2;">
            ${allImages.map((_, i) => `<span id="sliderDot${i}" onclick="sliderGoTo(${i})" style="width:8px;height:8px;border-radius:50%;background:${i===0?'#fff':'rgba(255,255,255,0.5)'};cursor:pointer;transition:background 0.2s;"></span>`).join('')}
          </div>
        ` : ''}
      </div>`;
  }

  const inCart = !!cart[book.isbn || book.title];

  let metaHtml = '';
  if(book.year) metaHtml += `<div class="pmeta-item"><div class="pmeta-label">Year</div><div class="pmeta-val">${esc(book.year)}</div></div>`;
  if(book.language) metaHtml += `<div class="pmeta-item"><div class="pmeta-label">Language</div><div class="pmeta-val">${esc(book.language)}</div></div>`;
  if(book.isbn) metaHtml += `<div class="pmeta-item"><div class="pmeta-label">ISBN</div><div class="pmeta-val">${esc(book.isbn)}</div></div>`;
  if(book.genre) metaHtml += `<div class="pmeta-item"><div class="pmeta-label">Genre</div><div class="pmeta-val">${esc(book.genre)}${book.subgenre ? ' — ' + esc(book.subgenre) : ''}</div></div>`;

  $('breadcrumbTitle').textContent = book.title || 'Book';

  // Try to fetch markdown description from URL in Google Sheet
  let descriptionHtml = '';
  const descriptionUrl = book.description_url || book.full_description_url || '';
  console.log('Book object:', book);
  console.log('Description URL from sheet:', descriptionUrl);
  const mdContent = await fetchMarkdownDescription(descriptionUrl);
  
  if(mdContent) {
    const parsedMd = parseMarkdown(mdContent);
    descriptionHtml = `
      <div class="product-desc">
        <div class="product-desc-label">About this book</div>
        <div class="product-desc-content" style="line-height:1.8;color:var(--text-primary);">${parsedMd}</div>
      </div>
    `;
  } else if(book.description) {
    descriptionHtml = `
      <div class="product-desc">
        <div class="product-desc-label">About this book</div>
        <p>${esc(book.description)}</p>
      </div>
    `;
  }

  // Fetch related books BEFORE building template
  const relatedBooksHtml = await getRelatedBooksHtml(book);

  const html = `
    <div class="product-hero">
      <div class="product-cover-box">
        ${coverHtml}
      </div>
      <div class="product-info">
        <div class="status-badge ${avail ? 'in-stock' : 'sold-out'}">
          ${avail ? '✓ In Stock' : '❌ Sold Out'}
        </div>
        <h1>${esc(book.title || 'Untitled')}</h1>
        <div class="product-author">by ${esc(book.author || 'Unknown Author')}</div>
        
        <div class="product-meta">
          ${metaHtml}
        </div>

        ${descriptionHtml}

        <div class="product-price">${esc(book.price || '—')}</div>

        <div class="product-actions">
          ${avail ? `
            <button class="btn-add-cart${inCart ? ' in-cart' : ''}" id="addCartBtn" onclick="toggleCart(this)">
              ${inCart 
                ? '<svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="1,6 4.5,9.5 11,2"/></svg> Added to Cart'
                : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Add to Cart'
              }
            </button>
            <button class="btn-order" id="orderBtn" onclick="orderNow()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
              Order Now
            </button>
          ` : `
            <button class="btn-add-cart" disabled style="opacity:0.5;cursor:not-allowed;">Sold Out</button>
          `}
        </div>

        <div style="margin-top:24px;">
          <a href="index.html" style="color:var(--accent);text-decoration:none;font-weight:500;">← Back to catalog</a>
        </div>
      </div>
    </div>

    ${relatedBooksHtml}
  `;

  $('productContent').innerHTML = html;
  // inside renderProduct, at the very end
// ...
setTimeout(setupProductImageClick, 100);   // small delay to ensure DOM updated
// inside renderProduct
const extra = (book.images || '').split(/[\s|,|]+/).filter(Boolean);
viewerImages = [primaryImg, ...extra].filter(Boolean);
}


async function getRelatedBooksHtml(book) {
  const related = allBooks
    .filter(b => 
      (b.genre === book.genre || b.author === book.author) && 
      b.isbn !== book.isbn
    )
    .slice(0, 8);

  if(related.length === 0) return '';

  const cardsHtml = related.map(b => {
    const cleanIsbn = (b.isbn || '').replace(/[^0-9X]/gi, '').trim();
    const imgSrc = b.cover_url
      ? b.cover_url
      : cleanIsbn ? `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg` : '';
    const avail = isAvail(b.available);

    return `
      <a href="product.html?isbn=${encodeURIComponent(b.isbn)}" style="text-decoration:none;color:inherit;">
        <div style="cursor:pointer;">
          <div style="aspect-ratio:3/4;background:var(--bg-secondary);border-radius:8px;overflow:hidden;margin-bottom:12px;display:flex;align-items:center;justify-content:center;">
            ${imgSrc 
              ? `<img src="${imgSrc}" alt="${esc(b.title)}" style="width:100%;height:100%;object-fit:cover;" loading="lazy"/>` 
              : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="opacity:0.5;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`
            }
          </div>
          <div style="font-weight:500;font-size:14px;line-height:1.3;margin-bottom:4px;">${esc(b.title)}</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">${esc(b.author)}</div>
          <div style="font-weight:600;font-size:14px;">${esc(b.price)}</div>
        </div>
      </a>
    `;
  }).join('');

  return `
    <div class="related-books">
      <h2>More from ${book.genre || 'our collection'}</h2>
      <div class="related-grid">
        ${cardsHtml}
      </div>
    </div>
  `;
}

function toggleCart(btn) {
  if(!currentBook) return;
  const key = currentBook.isbn || currentBook.title;
  
  if(cart[key]) {
    delete cart[key];
  } else {
    cart[key] = { book: currentBook, qty: 1 };
  }
  
  // Save to localStorage immediately
  saveCartToStorage();
  
  // Update UI immediately
  updateCartUI();
  updateCartCount();
  
  // Log for debugging
  console.log('Cart updated:', cart);
}

function orderNow() {
  if(!currentBook) return;
  const key = currentBook.isbn || currentBook.title;
  if(!cart[key]) {
    cart[key] = { book: currentBook, qty: 1 };
    saveCartToStorage();
  }
  updateCartCount();
  
  // Just open cart sidebar - that's it
  $('cartOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  renderCart();
  updateCartUI();
}

function updateCartUI() {
  const btn = $('addCartBtn');
  if(!btn) return;
  const key = currentBook.isbn || currentBook.title;
  const inCart = !!cart[key];
  btn.classList.toggle('in-cart', inCart);
  btn.innerHTML = inCart
    ? '<svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="1,6 4.5,9.5 11,2"/></svg> Added to Cart'
    : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Add to Cart';
}

function updateCartCount() {
  const count = Object.keys(cart).length;
  const totalQty = Object.values(cart).reduce((sum, item) => sum + (item.qty || 1), 0);
  
  const topCount = $('topCount');
  if(topCount) {
    topCount.textContent = count > 0 ? `${totalQty} in cart` : '0 items';
    topCount.classList.toggle('show', count > 0);
  }
  
  const cartCountEl = $('cartCount');
  if(cartCountEl) {
    cartCountEl.textContent = totalQty;
    cartCountEl.classList.toggle('show', count > 0);
  }
  
  console.log('Cart count updated:', totalQty, 'items');
}

function cartCheckout() {
  saveCartToStorage();
  window.location.href = 'pages/hOrder.html';
}

function updateMetaTags(book) {
  const cleanIsbn = (book.isbn || '').replace(/[^0-9X]/gi, '').trim();
  const coverUrl = book.cover_url || (cleanIsbn ? `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg` : '');
  const url = `${window.location.protocol}//${window.location.host}${window.location.pathname}?book=${encodeURIComponent(slugify(book.title))}`;
  
  document.title = `${book.title} by ${book.author} — Buuks.in`;
  
  updateMetaTag('description', `Buy "${book.title}" by ${book.author} at Buuks.in. ${book.price}. ${book.description ? book.description.substring(0, 100) : 'Discover great books online.'}`);
  updateMetaTag('keywords', `${book.title}, ${book.author}, ${book.genre || 'book'}, buy books online, Indian bookstore`);
  updateMetaTag('og:title', `${book.title} by ${book.author} — Buuks.in`);
  updateMetaTag('og:description', book.description ? book.description.substring(0, 160) : `Buy ${book.title} online`);
  updateMetaTag('og:image', coverUrl);
  updateMetaTag('og:url', url);
  updateMetaTag('twitter:title', `${book.title} by ${book.author}`);
  updateMetaTag('twitter:description', book.description ? book.description.substring(0, 160) : `Buy ${book.title} at Buuks.in`);
  updateMetaTag('twitter:image', coverUrl);
}

function updateMetaTag(name, content) {
  let tag = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
  if(!tag) {
    tag = document.createElement('meta');
    if(name.startsWith('og:') || name.startsWith('twitter:')) {
      tag.setAttribute(name.startsWith('og:') ? 'property' : 'name', name);
    } else {
      tag.setAttribute('name', name);
    }
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function updateSchemaData(book) {
  const cleanIsbn = (book.isbn || '').replace(/[^0-9X]/gi, '').trim();
  const coverUrl = book.cover_url || (cleanIsbn ? `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg` : '');
  const avail = isAvail(book.available);
  
  const schema = {
    "@context": "https://schema.org/",
    "@type": "Book",
    "name": book.title,
    "author": {
      "@type": "Person",
      "name": book.author
    },
    "image": coverUrl,
    "description": book.description,
    "isbn": book.isbn,
    "inLanguage": book.language || "en",
    "datePublished": book.year,
    "genre": book.genre,
    "offers": {
      "@type": "Offer",
      "price": (book.price || '').replace(/[^\d.]/g, ''),
      "priceCurrency": "INR",
      "availability": avail ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": "Buuks.in"
      }
    }
  };

  $('bookSchemaScript').textContent = JSON.stringify(schema);
}

function renderError(title, message) {
  $('productContent').innerHTML = `
    <div class="error-box">
      <h2>${esc(title)}</h2>
      <p>${esc(message)}</p>
      <a href="index.html">← Back to catalog</a>
    </div>
  `;
}

function changeQty(key, delta) {
  if (!cart[key]) return;
  cart[key].qty = Math.max(1, cart[key].qty + delta);
  saveCartToStorage();
  renderCart();
}

function removeFromCart(key) {
  delete cart[key];
  saveCartToStorage();
  updateCartUI();
  renderCart();
  updateCartCount();
}

function renderCart() {
  const items = Object.values(cart);
  const cartItems = $('cartItems');
  const cartFooter = $('cartFooter');
  
  if (!items.length) {
    cartItems.innerHTML = `<div class="cart-empty">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity=".25"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
      <p>Your cart is empty</p><small>Tap a book to add it to your cart</small>
    </div>`;
    cartFooter.style.display = 'none';
    return;
  }
  
  cartFooter.style.display = 'flex';
  cartItems.innerHTML = items.map(({book: b, qty}) => {
    const key = b.isbn || b.title;
    const img = b.cover_url || (b.isbn ? `https://covers.openlibrary.org/b/isbn/${b.isbn}-M.jpg` : '');
    return `<div class="cart-item">
      ${img ? `<img class="cart-item-img" src="${esc(img)}" alt="${esc(b.title)}" onerror="this.style.display='none'"/>` : '<div class="cart-item-img"></div>'}
      <div class="cart-item-info">
        <div class="cart-item-title">${esc(b.title)}</div>
        <div class="cart-item-author">${esc(b.author||'')}</div>
        <div class="cart-item-price">${esc(b.price||'—')}</div>
        <div class="cart-item-actions">
          <button class="qty-btn" data-key="${esc(key)}" data-d="-1">−</button>
          <span class="qty-num">${qty}</span>
          <button class="qty-btn" data-key="${esc(key)}" data-d="1">+</button>
          <button class="cart-item-remove" data-key="${esc(key)}">
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="1" y1="1" x2="10" y2="10"/><line x1="10" y1="1" x2="1" y2="10"/></svg>
          </button>
        </div>
      </div>
    </div>`;
  }).join('');

  // Qty buttons
  cartItems.querySelectorAll('.qty-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{ changeQty(btn.dataset.key, +btn.dataset.d); });
  });
  cartItems.querySelectorAll('.cart-item-remove').forEach(btn=>{
    btn.addEventListener('click', ()=>{ removeFromCart(btn.dataset.key); });
  });

  // Calculate summary - Fix NaN issue by properly extracting price numbers
  const total = Object.values(cart).reduce((s, i) => {
    // Extract numeric price value from price string like "₹350" or "₹299"
    const priceStr = (i.book.price || '0').toString();
    const priceNum = parseFloat(priceStr.replace(/[^\d.]/g, '')) || 0;
    return s + (priceNum * (i.qty || 1));
  }, 0);
  
  const count = Object.keys(cart).length;
  const delivery = total >= 499 ? 0 : 50;
  
  $('cartSumItems').textContent = count;
  $('cartSumTotal').textContent = '₹' + Math.round(total);
  $('cartDelivery').textContent = delivery === 0 ? 'FREE' : '₹' + delivery;
  $('cartGrandTotal').textContent = '₹' + Math.round(total + delivery);

  if (total < 499 && delivery > 0) {
    $('freeAmt').textContent = '₹' + Math.round(499 - total);
    $('freeTip').style.display = 'block';
  } else {
    $('freeTip').style.display = 'none';
  }
}

// Cart button handler
$('cartBtn').addEventListener('click', () => {
  saveCartToStorage();
  if(Object.keys(cart).length > 0) {
    $('cartOverlay').classList.add('open');
    document.body.style.overflow='hidden';
    renderCart();
    updateCartUI();
  } else {
    alert('Your cart is empty');
  }
});

// Cart close button handler
$('cartClose').addEventListener('click', () => {
  $('cartOverlay').classList.remove('open');
  document.body.style.overflow='';
});

// Cart backdrop close handler
$('cartBackdrop').addEventListener('click', () => {
  $('cartOverlay').classList.remove('open');
  document.body.style.overflow='';
});

loadBooks();

console.log('Product page initialized. Waiting for books to load...');

// Save cart to localStorage before page unload (for persistence on refresh)
window.addEventListener('beforeunload', () => {
  saveCartToStorage();
});

// Checkout button - same behavior as index.html
if($('checkoutFormBtn')) {
  $('checkoutFormBtn').addEventListener('click', openOrderForm);
}

// Clear cart button
if($('clearCartBtn')) {
  $('clearCartBtn').addEventListener('click', () => {
    if(confirm('Are you sure you want to clear your cart?')) {
      cart = {};
      saveCartToStorage();
      updateCartUI();
      renderCart();
      $('cartOverlay').classList.remove('open');
      document.body.style.overflow='';
    }
  });
}

// Order form event listeners
if($('omClose')) {
  $('omClose').addEventListener('click', closeOrderForm);
}
if($('orderBackdrop')) {
  $('orderBackdrop').addEventListener('click', closeOrderForm);
}
if($('omSubmit')) {
  $('omSubmit').addEventListener('click', submitOrder);
}
if($('osBackBtn')) {
  $('osBackBtn').addEventListener('click', closeSuccessScreen);
}

// Cart overlay listeners
if($('cartClose')) {
  $('cartClose').addEventListener('click', () => {
    $('cartOverlay').classList.remove('open');
    document.body.style.overflow = '';
  });
}
if($('cartBackdrop')) {
  $('cartBackdrop').addEventListener('click', () => {
    $('cartOverlay').classList.remove('open');
    document.body.style.overflow = '';
  });
}

// Allow Enter key in form fields
['omName','omPhone','omEmail'].forEach(id => {
  const el = $(id);
  if(el) {
    el.addEventListener('keydown', e => { if (e.key === 'Enter') submitOrder(); });
  }
});

// Focus on cart when overlay opens
window.addEventListener('focus', () => {
  loadCartFromStorage();
  if($('cartOverlay').classList.contains('open')) {
    renderCart();
    updateCartUI();
  }
});

/* ══ MOBILE MENU ══ */
function initMobileMenu() {
  const mobileMenuBtn = $('mobileMenuBtn');
  const mobileNav = $('mobileNav');
  
  if (!mobileMenuBtn) return;
  
  mobileMenuBtn.addEventListener('click', function() {
    this.classList.toggle('active');
    mobileNav.classList.toggle('open');
  });
  
  // Close menu when link clicked
  const mobileLinks = mobileNav.querySelectorAll('a');
  mobileLinks.forEach(link => {
    link.addEventListener('click', function() {
      mobileMenuBtn.classList.remove('active');
      mobileNav.classList.remove('open');
    });
  });
}

/* ══ IMAGE SLIDER ══ */
function sliderNav(dir) {
  const images = window._galleryImages || [];
  if (images.length < 2) return;
  sliderGoTo((window._galleryIndex + dir + images.length) % images.length);
}

function sliderGoTo(idx) {
  const images = window._galleryImages || [];
  if (!images[idx]) return;
  window._galleryIndex = idx;
  const img = document.getElementById('sliderImg');
  if (img) {
    img.style.opacity = '0';
    setTimeout(() => { img.src = images[idx]; img.style.opacity = '1'; }, 180);
  }
  images.forEach((_, i) => {
    const dot = document.getElementById('sliderDot' + i);
    if (dot) dot.style.background = i === idx ? '#fff' : 'rgba(255,255,255,0.5)';
  });
}
// ── Fullscreen Image Viewer ──
let viewerModal = null;
let viewerImg = null;
let viewerImages = [];       // array of image URLs
let currentViewerIndex = 0;

function initImageViewer() {
  viewerModal = $('imageViewerModal');
  viewerImg   = $('viewerImg');
  if (!viewerModal) return;

  const closeBtn   = $('viewerClose');
  const backdrop   = $('viewerBackdrop');
  const prevBtn    = $('viewerPrev');
  const nextBtn    = $('viewerNext');

  // Close handlers
  closeBtn.addEventListener('click', closeViewer);
  backdrop.addEventListener('click', closeViewer);
  viewerModal.addEventListener('click', e => {
    if (e.target === viewerModal || e.target === backdrop) closeViewer();
  });

  // Navigation
  prevBtn.addEventListener('click', () => navigateViewer(-1));
  nextBtn.addEventListener('click', () => navigateViewer(1));

  // Keyboard
  document.addEventListener('keydown', e => {
    if (!viewerModal.classList.contains('show')) return;
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowLeft')  navigateViewer(-1);
    if (e.key === 'ArrowRight') navigateViewer(1);
  });

  // Touch swipe
  let touchStartX = 0;
  let touchEndX = 0;

  viewerImg.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  viewerImg.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 60) { // swipe threshold
      navigateViewer(diff > 0 ? 1 : -1);
    }
  }
}

function openViewer(index = 0) {
  if (viewerImages.length === 0) return;

  currentViewerIndex = Math.max(0, Math.min(index, viewerImages.length - 1));
  viewerImg.src = viewerImages[currentViewerIndex];
  viewerImg.alt = `Book image ${currentViewerIndex + 1} of ${viewerImages.length}`;

  updateNavButtons();

  viewerModal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeViewer() {
  viewerModal.classList.remove('show');
  document.body.style.overflow = '';
  // Optional: reset src to stop loading if needed
  setTimeout(() => { viewerImg.src = ''; }, 300);
}

function navigateViewer(direction) {
  currentViewerIndex = (currentViewerIndex + direction + viewerImages.length) % viewerImages.length;
  viewerImg.src = viewerImages[currentViewerIndex];
  viewerImg.alt = `Book image ${currentViewerIndex + 1} of ${viewerImages.length}`;
  updateNavButtons();
}

function updateNavButtons() {
  $('viewerPrev').disabled = viewerImages.length <= 1;
  $('viewerNext').disabled = viewerImages.length <= 1;
}

// ── Connect to product image ──
function setupProductImageClick() {
  const mainCover = document.querySelector('.product-cover img');
  if (!mainCover) return;

  // Get current book (we already have currentBook from renderProduct)
  if (!currentBook) return;

  // Primary image
  let primary = mainCover.src;

  // Extra images from sheet column "images" or "extra_images" – change column name if different
  const extraRaw = (currentBook.images || currentBook.extra_images || '').trim();
  
  let extras = [];
  if (extraRaw) {
    // Split on | or , or spaces – be flexible
    extras = extraRaw
      .split(/[\s|,|\|]+/)
      .map(url => url.trim())
      .filter(url => url && url.startsWith('http')); // only valid URLs
  }

  // Combine – primary first
  viewerImages = [primary, ...extras].filter(Boolean); // remove any empty

  // If no valid images → fallback to just primary
  if (viewerImages.length === 0) {
    viewerImages = [primary];
  }

  mainCover.style.cursor = viewerImages.length > 1 ? 'zoom-in' : 'pointer';
  mainCover.title = viewerImages.length > 1 
    ? 'Click to view gallery' 
    : 'Click to enlarge';

  mainCover.addEventListener('click', () => {
    openViewer(0);           // always start with main image
  });
}

// Call these when page is ready
document.addEventListener('DOMContentLoaded', () => {
  initImageViewer();
  // Wait until renderProduct finishes (or call it after await renderProduct)
  // For simplicity — call it after a small delay or hook into renderProduct end
  setTimeout(setupProductImageClick, 800); // adjust timing if needed
});

initMobileMenu();
