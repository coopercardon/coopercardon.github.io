/* Product Page Script */
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTHchAmv037NjgZckS_fTzSRlDaqnnf96YnVsq_aKhP3BNXM7noWu-078Uvk_7VZvTIH34zVTy0ZE_n/pub?gid=116858916&single=true&output=csv";
const PROXY = "https://corsproxy.io/?";

let allBooks = [];
let cart = {};
let currentBook = null;

function $(id) { return document.getElementById(id); }
function esc(s) { const div = document.createElement('div'); div.textContent = s; return div.innerHTML; }

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
    const r = await fetch(sheetUrl(), { cache: 'no-store' });
    allBooks = parseCSV(await r.text());
    loadCartFromStorage();
    initPage();
  } catch (e) {
    renderError('Failed to load book data', 'Please try refreshing the page.');
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

function findBook() {
  const isbn = getURLParam('isbn');
  if(!isbn) return null;
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
    const response = await fetch(descriptionUrl);
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

function initPage() {
  const book = findBook();
  if(!book) {
    renderError('Book not found', 'The book you are looking for does not exist or has been removed.');
    return;
  }
  currentBook = book;
  renderProduct(book);
  updateMetaTags(book);
  updateSchemaData(book);
  updateCartCount();
  
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
  const imgSrc = book.cover_url
    ? book.cover_url
    : cleanIsbn ? `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg` : '';

  const coverHtml = imgSrc
    ? `<img src="${esc(imgSrc)}" alt="${esc(book.title)}" loading="lazy" onerror="this.src='https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg'; this.onerror=null;"/>`
    : `<div class="detail-cover-ph" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--bg-secondary);">
        <div style="text-align:center;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom:12px;opacity:0.5;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          <p style="font-size:13px;color:var(--text-secondary);">${esc(book.title)}</p>
        </div>
      </div>`;

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

  const html = `
    <div class="product-hero">
      <div class="product-cover-box">
        <div class="product-cover">${coverHtml}</div>
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

    ${await getRelatedBooksHtml(book)}
  `;

  $('productContent').innerHTML = html;
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
  window.location.href = 'pages/hOrder.html';
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
  const url = `${window.location.protocol}//${window.location.host}${window.location.pathname}?isbn=${encodeURIComponent(book.isbn)}`;
  
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

  // Calculate summary
  const total = Object.values(cart).reduce((s,i)=>s+(parseFloat(i.book.price||0)*i.qty), 0);
  const count = Object.keys(cart).length;
  const delivery = total >= 499 ? 0 : 50;
  
  $('cartSumItems').textContent = count;
  $('cartSumTotal').textContent = '₹' + total.toFixed(0);
  $('cartDelivery').textContent = delivery === 0 ? 'FREE' : '₹' + delivery;
  $('cartGrandTotal').textContent = '₹' + (total + delivery).toFixed(0);

  if (total < 499 && delivery > 0) {
    $('freeAmt').textContent = '₹' + (499 - total).toFixed(0);
    $('freeTip').style.display = 'block';
  } else {
    $('freeTip').style.display = 'none';
  }
}


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

// Save cart to localStorage before page unload (for persistence on refresh)
window.addEventListener('beforeunload', () => {
  saveCartToStorage();
});

// Checkout button
if($('checkoutFormBtn')) {
  $('checkoutFormBtn').addEventListener('click', () => {
    saveCartToStorage();
    window.location.href = 'pages/hOrder.html';
  });
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

// Focus on cart when overlay opens
window.addEventListener('focus', () => {
  loadCartFromStorage();
  if($('cartOverlay').classList.contains('open')) {
    renderCart();
    updateCartUI();
  }
});
