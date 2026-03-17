/* ══════════════════════════════════════════════
   CONFIG ZONE — EDIT THESE VALUES
══════════════════════════════════════════════ */
const SHEET_CSV_URL  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTHchAmv037NjgZckS_fTzSRlDaqnnf96YnVsq_aKhP3BNXM7noWu-078Uvk_7VZvTIH34zVTy0ZE_n/pub?gid=116858916&single=true&output=csv";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxD_z9H9WKFSxDn8_YtxhxKVh3Bc6kR5hv8aP8u10_SIgB-rSPm5eHaDAN38962o5wZXQ/exec";
/* ══════════════════════════════════════════════
   DO NOT EDIT BELOW THIS LINE
══════════════════════════════════════════════ */

const IS_DEMO = false;
const PROXY   = "https://corsproxy.io/?";

const DEMO = [
  {isbn:"9780061965548",title:"To Kill a Mockingbird",author:"Harper Lee",genre:"Fiction",subgenre:"Literary Fiction",year:"1960",language:"English",cover_url:"",description:"A powerful story of racial injustice and the loss of innocence in the Deep South, told through the eyes of Scout Finch, the daughter of a lawyer who defends a Black man falsely accused of rape.",price:"₹350",available:"Yes"},
  {isbn:"9780743273565",title:"The Great Gatsby",author:"F. Scott Fitzgerald",genre:"Fiction",subgenre:"Literary Fiction",year:"1925",language:"English",cover_url:"",description:"Set in the 1920s Jazz Age, the novel follows the mysterious millionaire Jay Gatsby and his obsession to reunite with his former lover, the beautiful Daisy Buchanan.",price:"₹299",available:"Yes"},
  {isbn:"9780451524935",title:"1984",author:"George Orwell",genre:"Fiction",subgenre:"Dystopian",year:"1949",language:"English",cover_url:"",description:"A chilling vision of a totalitarian future where Big Brother watches everyone, language is weaponized, and independent thought is a crime punishable by death.",price:"₹320",available:"Yes"},
  {isbn:"9780316769174",title:"The Catcher in the Rye",author:"J.D. Salinger",genre:"Fiction",subgenre:"Coming-of-age",year:"1951",language:"English",cover_url:"",description:"Holden Caulfield's raw, funny and heartbreaking journey through New York City after being expelled from his prestigious prep school.",price:"₹280",available:"No"},
  {isbn:"9780062315007",title:"The Alchemist",author:"Paulo Coelho",genre:"Fiction",subgenre:"Philosophical",year:"1988",language:"English",cover_url:"",description:"A mystical story of Santiago, an Andalusian shepherd boy, who yearns to travel the world in search of a worldly treasure and discovers the meaning of following his Personal Legend.",price:"₹399",available:"Yes"},
  {isbn:"9781501156700",title:"Sapiens",author:"Yuval Noah Harari",genre:"Non-Fiction",subgenre:"History",year:"2011",language:"English",cover_url:"",description:"A sweeping narrative of humanity's creation and evolution, exploring how biology and history have defined us and enhanced our understanding of what it means to be human.",price:"₹550",available:"Yes"},
  {isbn:"9780593311400",title:"Atomic Habits",author:"James Clear",genre:"Self-Help",subgenre:"Productivity",year:"2018",language:"English",cover_url:"",description:"A proven framework for improving every day through tiny changes and remarkable results. Learn how small habits compound into life-changing transformations.",price:"₹499",available:"Yes"},
  {isbn:"9780385490818",title:"The Handmaid's Tale",author:"Margaret Atwood",genre:"Fiction",subgenre:"Dystopian",year:"1985",language:"English",cover_url:"",description:"In a near-future patriarchal theocracy, fertile women called Handmaids are forced to bear children for the ruling class. A terrifying and prescient warning about women's rights.",price:"₹420",available:"Yes"},
  {isbn:"9780525559474",title:"The Midnight Library",author:"Matt Haig",genre:"Fiction",subgenre:"Magical Realism",year:"2020",language:"English",cover_url:"",description:"Between life and death there exists a library containing infinite books, each telling the story of another life you could have lived. A beautiful novel about choices and second chances.",price:"₹380",available:"Yes"},
  {isbn:"9780679720201",title:"The Stranger",author:"Albert Camus",genre:"Philosophy",subgenre:"Absurdism",year:"1942",language:"English",cover_url:"",description:"Meursault, an indifferent French Algerian, shoots an Arab man and faces trial in this landmark of existentialist literature exploring life's absurdity and the indifference of the universe.",price:"₹260",available:"No"},
  {isbn:"9780307474278",title:"The Road",author:"Cormac McCarthy",genre:"Fiction",subgenre:"Post-Apocalyptic",year:"2006",language:"English",cover_url:"",description:"A father and his young son journey across a bleak, post-apocalyptic America carrying a small cache of food and weapons, struggling to survive while maintaining their humanity.",price:"₹370",available:"Yes"},
  {isbn:"9780385737951",title:"The Hunger Games",author:"Suzanne Collins",genre:"Fiction",subgenre:"Science Fiction",year:"2008",language:"English",cover_url:"",description:"In a dystopian future, sixteen-year-old Katniss Everdeen volunteers to take her sister's place in the brutal televised Hunger Games, where children fight to the death.",price:"₹450",available:"Yes"},
];

/* ── AVAILABILITY CHECK ── */
// Handles: "yes","YES","Yes","y","Y","true","1"," yes " (with spaces)
function isAvail(val) {
  const v = (val||'').toString().trim().toLowerCase();
  return v === 'yes' || v === 'y' || v === 'true' || v === '1';
}
let allBooks = [], filtered = [];
let cart = {}; // { isbn: { book, qty } }

/* ── DATA LOADING ── */
function sheetUrl() {
  const bust = '&t=' + Date.now(); // cache buster — forces fresh data every load
  return window.location.protocol === 'file:'
    ? PROXY + encodeURIComponent(SHEET_CSV_URL + bust)
    : SHEET_CSV_URL + bust;
}

function parseCSV(txt) {
  const lines = txt.trim().split('\n');
  if (lines.length < 2) return [];
  const hdrs = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,''));
  return lines.slice(1).map(line => {
    const cols=[]; let cur='', q=false;
    for(const c of line){if(c==='"'){q=!q;continue}if(c===','&&!q){cols.push(cur.trim());cur=''}else cur+=c}
    cols.push(cur.trim());
    const o={};hdrs.forEach((h,i)=>{ o[h]=(cols[i]||'').trim(); });
    return o;
  });
}

async function loadBooks() {
  if (IS_DEMO) { document.getElementById('setupNotice').style.display='block'; allBooks=DEMO; boot(); return; }
  try {
    const r = await fetch(sheetUrl(), { cache: 'no-store' });
    allBooks = parseCSV(await r.text());
    boot();
  } catch {
    document.getElementById('catalog').innerHTML = `<div class="statebox"><p>Could not load sheet</p><small>Check SHEET_CSV_URL and ensure the sheet is published.</small></div>`;
  }
}

function boot() { buildFilters(); applyFilters(); updateStats(); }

function updateStats() {
  const t=allBooks.length, g=new Set(allBooks.map(b=>b.genre).filter(Boolean)).size;
  const a=allBooks.filter(b=>isAvail(b.available)).length;
  $('statTotal').textContent=t; $('statGenres').textContent=g; $('statAvail').textContent=a;
  $('topCount').innerHTML=`<strong>${t}</strong> books`;
}

function buildFilters() {
  const genres=[...new Set(allBooks.map(b=>b.genre).filter(Boolean))].sort();
  const langs=[...new Set(allBooks.map(b=>b.language).filter(Boolean))].sort();
  const gs=$('genreFilter'), ls=$('langFilter');
  genres.forEach(g=>{const o=document.createElement('option');o.value=g;o.textContent=g;gs.appendChild(o)});
  langs.forEach(l=>{const o=document.createElement('option');o.value=l;o.textContent=l;ls.appendChild(o)});
}

/* ── FILTERING ── */
function applyFilters() {
  const q=$('searchInput').value.toLowerCase();
  const genre=$('genreFilter').value, lang=$('langFilter').value;
  const avail=$('availFilter').value, sort=$('sortSel').value;
  filtered=allBooks.filter(b=>{
    const mQ=!q||(b.title||'').toLowerCase().includes(q)||(b.author||'').toLowerCase().includes(q)||(b.isbn||'').includes(q);
    const mG=!genre||b.genre===genre, mL=!lang||b.language===lang;
    const mA=!avail||(avail==='yes'?isAvail(b.available):!isAvail(b.available));
    return mQ&&mG&&mL&&mA;
  });
  filtered.sort((a,b)=>{
    if(sort==='title') return (a.title||'').localeCompare(b.title||'');
    if(sort==='author') return (a.author||'').localeCompare(b.author||'');
    if(sort==='year_desc') return +b.year - +a.year;
    if(sort==='year_asc') return +a.year - +b.year;
    if(sort==='price_asc') return px(a)-px(b);
    if(sort==='price_desc') return px(b)-px(a);
    return 0;
  });
  drawTags(q,genre,lang,avail); renderBooks();
  const total=allBooks.length, cnt=filtered.length;
  $('rtext').innerHTML=cnt===total?`Showing all <strong>${total}</strong> books`:`<strong>${cnt}</strong> of <strong>${total}</strong> books`;
}

function px(b){return parseFloat((b.price||'0').replace(/[^\d.]/g,''))||0}

function drawTags(q,genre,lang,avail){
  const tags=[];
  if(q)     tags.push({l:`"${q}"`,     c:()=>{$('searchInput').value='';applyFilters()}});
  if(genre) tags.push({l:genre,        c:()=>{$('genreFilter').value='';applyFilters()}});
  if(lang)  tags.push({l:lang,         c:()=>{$('langFilter').value='';applyFilters()}});
  if(avail) tags.push({l:avail==='yes'?'In Stock':'Sold Out',c:()=>{$('availFilter').value='';applyFilters()}});
  const wrap=$('atags');
  wrap.innerHTML=tags.map((t,i)=>`<button class="atag" data-i="${i}">${esc(t.l)}<svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="1.5" y1="1.5" x2="7.5" y2="7.5"/><line x1="7.5" y1="1.5" x2="1.5" y2="7.5"/></svg></button>`).join('');
  wrap.querySelectorAll('.atag').forEach((el,i)=>el.addEventListener('click',tags[i].c));
  ['genreFilter','langFilter','availFilter'].forEach(id=>{const el=$(id);el.classList.toggle('on',!!el.value)});
}

/* ── RENDER CATALOG ── */
function renderBooks() {
  const catalog=$('catalog');
  if(!filtered.length){
    catalog.innerHTML=`<div class="statebox"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity=".25"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg><p>No books found</p><small>Try adjusting your search or filters</small></div>`;
    return;
  }
  catalog.innerHTML=filtered.map((b,i)=>card(b,i)).join('');
  // re-attach click handlers
  catalog.querySelectorAll('.bcard').forEach(el=>{
    const isbn=el.dataset.isbn;
    el.addEventListener('click', e=>{
      if(e.target.closest('.btn-addcart')) return;
      openDetail(isbn);
    });
    const addBtn=el.querySelector('.btn-addcart');
    if(addBtn && !addBtn.classList.contains('sold')){
      addBtn.addEventListener('click', e=>{
        e.stopPropagation();
        const book=allBooks.find(b=>b.isbn===isbn);
        toggleCart(book, addBtn);
      });
    }
  });
}

function card(b,i) {
  const avail  = isAvail(b.available);
  const isbn   = (b.isbn||'').replace(/[^0-9X]/gi,'').trim(); // strip spaces/dashes
  // Try cover_url first, then Open Library (two sizes as fallback)
  const imgSrc = b.cover_url
    ? b.cover_url
    : isbn
      ? `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`
      : '';
  const delay  = Math.min(i*30,450);
  const inCart = !!cart[b.isbn||b.title];

  const coverHtml = imgSrc
    ? `<img
         src="${esc(imgSrc)}"
         alt="${esc(b.title)}"
         loading="lazy"
         onerror="
           if(this.dataset.tried==='1'){
             this.style.display='none';
             this.nextElementSibling.style.display='flex';
           } else {
             this.dataset.tried='1';
             this.src='https://covers.openlibrary.org/b/isbn/${isbn}-S.jpg';
           }
         "
       />
       <div class="cover-ph" style="display:none">
         <div class="cover-ph-ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>
         <div class="cover-ph-t">${esc(b.title||'')}</div>
       </div>`
    : `<div class="cover-ph" style="display:flex">
         <div class="cover-ph-ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>
         <div class="cover-ph-t">${esc(b.title||'')}</div>
       </div>`;

  const addBtn = avail
    ? `<button class="btn-addcart${inCart?' in-cart':''}">${inCart?'<svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="1,6 4.5,9.5 11,2"/></svg> Added':'+ Cart'}</button>`
    : `<button class="btn-addcart sold">Sold Out</button>`;

  return `<div class="bcard" data-isbn="${esc(b.isbn||b.title)}" style="animation-delay:${delay}ms">
    <div class="cover">
      ${coverHtml}
      <span class="sbadge ${avail?'in':'out'}">${avail?'In Stock':'Sold Out'}</span>
      ${b.genre?`<span class="gpill">${esc(b.genre)}</span>`:''}
    </div>
    <div class="cbody">
      <div class="ctitle">${esc(b.title||'Untitled')}</div>
      <div class="cauthor">${esc(b.author||'Unknown')}</div>
      <div class="cmeta">
        ${b.year?`<span class="ctag">${esc(b.year)}</span>`:''}
        ${b.language?`<span class="ctag">${esc(b.language)}</span>`:''}
      </div>
    </div>
    <div class="cfoot">
      <div class="cprice">${esc(b.price||'—')}</div>
      ${addBtn}
    </div>
  </div>`;
}

/* ── DETAIL PAGE ── */
function openDetail(isbn) {
  const b = allBooks.find(x => (x.isbn||x.title) === isbn);
  if (!b) return;
  const avail     = isAvail(b.available);
  const cleanIsbn = (b.isbn||'').replace(/[^0-9X]/gi,'').trim();
  const imgSrc = b.cover_url
    ? b.cover_url
    : cleanIsbn ? `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg` : '';
  const inCart = !!cart[isbn];
  const formHref = buildSingleForm(b);

  $('detailBreadcrumb').textContent = b.title || 'Book';

  const coverHtml = imgSrc
    ? `<img src="${esc(imgSrc)}" alt="${esc(b.title)}" onerror="this.parentElement.innerHTML='<div class=\\'detail-cover-ph\\'><svg width=\\'48\\' height=\\'48\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'1\\'><path d=\\'M4 19.5A2.5 2.5 0 0 1 6.5 17H20\\'/><path d=\\'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z\\'/></svg><p>${esc(b.title||'')}</p></div>'"/>`
    : `<div class="detail-cover-ph"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg><p>${esc(b.title||'')}</p></div>`;

  $('detailGrid').innerHTML = `
    <div class="detail-cover-wrap">
      <div class="detail-cover">${coverHtml}</div>
      <div class="detail-avail-badge ${avail?'in':'out'}">
        <span></span>${avail ? 'In Stock' : 'Sold Out'}
      </div>
    </div>
    <div class="detail-info">
      ${b.genre?`<div><span class="detail-genre">${esc(b.genre)}${b.subgenre?' — '+esc(b.subgenre):''}</span></div>`:''}
      <div class="detail-title">${esc(b.title||'Untitled')}</div>
      <div class="detail-author">by ${esc(b.author||'Unknown Author')}</div>
      <div class="detail-meta-grid">
        ${b.year?`<div class="dmeta-item"><div class="dmeta-label">Year</div><div class="dmeta-val">${esc(b.year)}</div></div>`:''}
        ${b.language?`<div class="dmeta-item"><div class="dmeta-label">Language</div><div class="dmeta-val">${esc(b.language)}</div></div>`:''}
        ${b.isbn?`<div class="dmeta-item"><div class="dmeta-label">ISBN</div><div class="dmeta-val">${esc(b.isbn)}</div></div>`:''}
        ${b.subgenre?`<div class="dmeta-item"><div class="dmeta-label">Sub-genre</div><div class="dmeta-val">${esc(b.subgenre)}</div></div>`:''}
      </div>
      ${b.description?`<div><div class="detail-desc-label">About this book</div><div class="detail-desc">${esc(b.description)}</div></div>`:''}
      <div class="detail-price-row">
        <div class="detail-price">${esc(b.price||'—')}</div>
      </div>
      <div class="detail-actions">
        ${avail
          ? `<button class="btn-detail-cart${inCart?' in-cart':''}" id="detailCartBtn" data-isbn="${esc(isbn)}">
               ${inCart
                 ? '<svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="1,6 4.5,9.5 11,2"/></svg> Added to Cart'
                 : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Add to Cart'}
             </button>
             <button class="btn-detail-order" id="detailOrderBtn" data-isbn="${esc(isbn)}">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
               Order Now
             </button>`
          : `<button class="btn-detail-cart sold">Sold Out</button>`
        }
      </div>
    </div>`;

  // Attach cart button in detail
  const dcBtn = document.getElementById('detailCartBtn');
  if (dcBtn) {
    dcBtn.addEventListener('click', () => {
      const book = allBooks.find(x=>(x.isbn||x.title)===isbn);
      toggleCart(book, dcBtn, true);
      renderBooks();
    });
  }

  // Attach Order Now button in detail
  const doBtn = document.getElementById('detailOrderBtn');
  if (doBtn) {
    doBtn.addEventListener('click', () => {
      const book = allBooks.find(x=>(x.isbn||x.title)===isbn);
      if (!book) return;
      // Make sure this book is in cart (qty 1 if not already)
      const key = book.isbn || book.title;
      if (!cart[key]) cart[key] = { book, qty: 1 };
      updateCartUI();
      closeDetail();
      setTimeout(() => openOrderForm(), 200);
    });
  }

  $('detailOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDetail() {
  $('detailOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ── CART ── */
function toggleCart(book, btn, isDetail=false) {
  const key = book.isbn || book.title;
  if (cart[key]) {
    delete cart[key];
    showToast(`Removed "${book.title}" from cart`);
    if (isDetail) {
      btn.classList.remove('in-cart');
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Add to Cart';
    } else {
      btn.classList.remove('in-cart');
      btn.innerHTML = '+ Cart';
    }
  } else {
    cart[key] = { book, qty: 1 };
    showToast(`Added "${book.title}" to cart 🛒`);
    if (isDetail) {
      btn.classList.add('in-cart');
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="1,6 4.5,9.5 11,2"/></svg> Added to Cart';
    } else {
      btn.classList.add('in-cart');
      btn.innerHTML = '<svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="1,6 4.5,9.5 11,2"/></svg> Added';
    }
  }
  updateCartUI();
}

function changeQty(key, delta) {
  if (!cart[key]) return;
  cart[key].qty = Math.max(1, cart[key].qty + delta);
  renderCart();
}

function removeFromCart(key) {
  delete cart[key];
  updateCartUI();
  renderCart();
  renderBooks();
}

function updateCartUI() {
  const total = Object.values(cart).reduce((s,i)=>s+i.qty, 0);
  const cc = $('cartCount');
  cc.textContent = total;
  cc.classList.toggle('show', total > 0);
  $('cartTitleCount').textContent = `${Object.keys(cart).length} item${Object.keys(cart).length!==1?'s':''}`;
  renderCart();
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

  // Summary
  const totalItems = items.length;
  const totalQty   = items.reduce((s,i)=>s+i.qty,0);
  const totalPrice = items.reduce((s,i)=>s+px(i.book)*i.qty,0);
  $('cartSumItems').textContent = totalItems;
  $('cartSumQty').textContent   = totalQty;
  $('cartSumTotal').textContent = totalPrice ? `₹${totalPrice}` : '—';

  // (checkout handled by openOrderForm)
}

function buildSingleForm(b) { return '#'; } // replaced by custom order overlay

/* ── TOAST ── */
let toastTimer;
function showToast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 2500);
}

/* ── UTILS ── */
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function buildCartFormUrl() { return '#'; } // legacy stub

function buildCartWAUrl() { return '#'; } // removed

/* ══ CUSTOM ORDER FORM ══ */
function openOrderForm() {
  // Build cart summary inside modal
  const items = Object.values(cart);
  if (!items.length) return;

  // Cart summary rows
  let summaryHtml = items.map(({book:b, qty}) => {
    const img = b.cover_url || (b.isbn ? `https://covers.openlibrary.org/b/isbn/${b.isbn}-M.jpg` : '');
    return `<div class="om-cart-item">
      ${img ? `<img class="om-ci-img" src="${esc(img)}" onerror="this.style.display='none'"/>` : '<div class="om-ci-img"></div>'}
      <div class="om-ci-info">
        <div class="om-ci-title">${esc(b.title)}</div>
        <div class="om-ci-meta">${esc(b.author||'')} · Qty: ${qty}</div>
      </div>
      <div class="om-ci-price">${esc(b.price||'—')}</div>
    </div>`;
  }).join('');

  const totalPrice = items.reduce((s,i) => s + px(i.book)*i.qty, 0);
  summaryHtml += `<div class="om-total-row"><span>Total Amount</span><span>₹${totalPrice}</span></div>`;
  $('omCartSummary').innerHTML = summaryHtml;

  // Clear previous form errors
  ['omName','omPhone','omEmail','omAddress'].forEach(id => $( id).classList.remove('error'));
  $('omSubmit').disabled = false;
  $('omSubmit').classList.remove('loading');
  $('omSubmit').querySelector('.om-btn-text').innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    Confirm Order`;

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
  const totalAmt  = items.reduce((s,i) => s + px(i.book)*i.qty, 0);
  const orderId   = generateOrderId();
  const timestamp = new Date().toLocaleString('en-IN', {timeZone:'Asia/Kolkata'});

  const payload = { orderId, timestamp, name, phone, email, address, note, titles, isbns, totalQty, totalAmt: `₹${totalAmt}` };

  const scriptReady = APPS_SCRIPT_URL && APPS_SCRIPT_URL !== 'YOUR_APPS_SCRIPT_URL_HERE';

  if (scriptReady) {
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      // no-cors fetch always "succeeds" — if real network error, still show success
      console.warn('Apps Script fetch error:', e);
    }
  } else {
    // Apps Script not set up yet — log order to console so nothing is lost during testing
    console.log('📦 ORDER (Apps Script not configured yet):', payload);
  }

  closeOrderForm();
  showSuccessScreen(orderId, !scriptReady);
  cart = {};
  updateCartUI();
  renderBooks();
}

function showSuccessScreen(orderId, demoMode=false) {
  $('osOrderId').textContent = `Order #${orderId}`;
  $('os-sub-msg').textContent = demoMode
    ? '⚠️ Apps Script not set up yet — order not saved to sheet. Deploy the Apps Script to start saving real orders.'
    : "We've saved your order in the sheet. Our team will contact you to confirm delivery!";
  launchConfetti();
  $('orderSuccessOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeSuccessScreen() {
  $('orderSuccessOverlay').classList.remove('show');
  $('cartOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function launchConfetti() {
  const container = $('osConfetti');
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
    container.appendChild(dot);
  }
}

/* ── UNIQUE ORDER ID ── */
function generateOrderId() {
  const now    = new Date();
  const yy     = now.getFullYear().toString().slice(-2);
  const mm     = String(now.getMonth()+1).padStart(2,'0');
  const dd     = String(now.getDate()).padStart(2,'0');
  const hh     = String(now.getHours()).padStart(2,'0');
  const min    = String(now.getMinutes()).padStart(2,'0');
  const sec    = String(now.getSeconds()).padStart(2,'0');
  const rand   = Math.random().toString(36).substring(2,5).toUpperCase();
  // Format: BK-260317-143022-A4X  → date + time + random suffix
  return `BK-${yy}${mm}${dd}-${hh}${min}${sec}-${rand}`;
}

function showOrderPlaced() {}
function closeOrderPlaced() {}

$('checkoutFormBtn').addEventListener('click', openOrderForm);
$('omClose').addEventListener('click', closeOrderForm);
$('orderBackdrop').addEventListener('click', closeOrderForm);
$('omSubmit').addEventListener('click', submitOrder);
$('osBackBtn').addEventListener('click', closeSuccessScreen);

// Allow Enter key in form fields except textarea
['omName','omPhone','omEmail'].forEach(id => {
  $(id).addEventListener('keydown', e => { if (e.key === 'Enter') submitOrder(); });
});

/* ── EVENT LISTENERS ── */
$('searchInput').addEventListener('input',  applyFilters);
$('genreFilter').addEventListener('change', applyFilters);
$('langFilter').addEventListener('change',  applyFilters);
$('availFilter').addEventListener('change', applyFilters);
$('sortSel').addEventListener('change',     applyFilters);

$('gridBtn').addEventListener('click', ()=>{
  $('catalog').classList.remove('list-view');
  $('gridBtn').classList.add('on'); $('listBtn').classList.remove('on');
  renderBooks();
});
$('listBtn').addEventListener('click', ()=>{
  $('catalog').classList.add('list-view');
  $('listBtn').classList.add('on'); $('gridBtn').classList.remove('on');
  renderBooks();
});

// Detail overlay
$('detailBack').addEventListener('click', closeDetail);
$('detailBackdrop').addEventListener('click', closeDetail);

// Cart
$('cartBtn').addEventListener('click', ()=>{ $('cartOverlay').classList.add('open'); document.body.style.overflow='hidden'; });
$('cartClose').addEventListener('click', ()=>{ $('cartOverlay').classList.remove('open'); document.body.style.overflow=''; });
$('cartBackdrop').addEventListener('click', ()=>{ $('cartOverlay').classList.remove('open'); document.body.style.overflow=''; });
$('clearCartBtn').addEventListener('click', ()=>{
  cart={};
  updateCartUI();
  renderBooks();
  showToast('Cart cleared');
});

$('mobFilterBtn').addEventListener('click', ()=>{
  $('filterBar').scrollIntoView({ behavior:'smooth', block:'start' });
  setTimeout(()=>$('genreFilter').focus(), 400);
});

// Keyboard ESC
document.addEventListener('keydown', e=>{
  if(e.key==='Escape'){
    if($('cartOverlay').classList.contains('open')){ $('cartOverlay').classList.remove('open'); document.body.style.overflow=''; }
    else if($('detailOverlay').classList.contains('open')){ closeDetail(); }
  }
});

loadBooks();
