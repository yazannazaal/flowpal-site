// Al-Yasmeen demo store on Flowpal's concept 3 layout: header, footer, cards, listing, product page, cart.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const page = document.body.dataset.page;

  // ---------- store facts (from yasmeenhome.com) ----------
  const S = {
    name: 'الياسمين', full: 'مؤسسة الياسمين للأدوات المنزلية',
    wa: '0598844197', waLink: 'https://wa.me/972598844197',
    ig: 'https://www.instagram.com/yasmeen._.home', tt: 'https://www.tiktok.com/@yasmeen._.home',
    fb: 'https://www.facebook.com/share/1BKHNQR2wr/',
    zones: [['جنين', 20], ['طوباس', 20], ['نابلس', 20], ['سلفيت', 20], ['طولكرم', 20], ['قلقيلية', 20], ['رام الله والبيرة', 20], ['ضواحي القدس', 20], ['أريحا', 20], ['الخليل', 20], ['بيت لحم', 20], ['قباطية', 10], ['القدس', 30], ['أبو غوش', 45], ['الداخل 48', 70]]
  };
  window.S = S;

  // ---------- catalog helpers ----------
  const byId = {}; YH.products.forEach(p => (byId[p.id] = p));
  const catName = {}; YH.cats.forEach(c => (catName[c.id] = c.name));
  YH.get = id => byId[id] || YH.products[0];
  YH.pick = ids => ids.map(id => byId[id]).filter(Boolean);
  YH.cat = id => YH.cats.find(c => c.id === id);
  YH.off = p => (p.old ? Math.round((1 - p.price / p.old) * 100) : 0);
  YH.img = (p, k = 0) => 'assets/img/p/' + p.id + '-' + k + '.webp';
  YH.cimg = id => { const l = YH.bycat[id] || []; return l.length ? YH.img(byId[l[0]]) : ''; };
  const money = n => n.toLocaleString('en-US') + ' ₪';
  const price = p => (p.to ? `${p.price} – ${p.to} ₪` : money(p.price));
  window.money = money;

  // ---------- icons ----------
  const I = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    bag: '<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    swap: '<path d="M4 9h13l-3-3M20 15H7l3 3"/>',
    shield: '<path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
    cash: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
    wa: '<path d="M4 20l1.3-3.9A8.5 8.5 0 1 1 8 19l-4 1Z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .8a5 5 0 0 1-2.2-2.2l.8-1-1-2L9.5 8Z"/>',
    home: '<path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
    arrow: '<path d="M19 12H5m6-6-6 6 6 6"/>',
    chev: '<path d="m15 6-6 6 6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
    bolt: '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
    ig: '<rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.5"/><circle cx="17" cy="7" r=".6"/>',
    fb: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8Z"/>',
    tt: '<path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 4c.5 2.5 2.3 4 5 4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8L3 12Z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
    store: '<path d="M4 9h16l-1-4H5L4 9Z"/><path d="M5 9v11h14V9M9 20v-6h6v6"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z"/>'
  };
  const ic = (n, s = 22, w = 1.6) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;
  window.ic = ic;

  // ---------- header / footer ----------
  const nav = ['5', '10', '3', '8', '18', '6', '61', '27', '47', '70'];
  const curCat = new URLSearchParams(location.search).get('cat');
  const logo = (light = '') => `<a class="logo ${light}" href="index.html" aria-label="${S.full}"><img src="assets/img/logo.png" alt=""><span><b>${S.name}</b><small>للأدوات المنزلية</small></span></a>`;
  const header = `
  <div class="util"><div class="wrap util-in">
    <div class="util-l"><a href="${S.waLink}" target="_blank" rel="noopener">${ic('wa', 15)} واتساب: <span class="ltr">${S.wa}</span></a><span class="hide-md ann">${ic('truck', 15)} التوصيل: الضفة 20 ₪ · القدس 30 ₪ · الداخل 70 ₪</span></div>
    <div class="util-r"><a href="#" data-soon>طلباتي السابقة</a><a href="#" data-soon class="hide-md">دخول تجار الجملة</a><a href="index.html#delivery" class="hide-md">مناطق التوصيل</a></div>
  </div></div>
  <header class="hdr">
    <div class="wrap hdr-in">
      <button class="hdr-burger" data-menu-open aria-label="القائمة">${ic('menu', 24, 2)}</button>
      ${logo()}
      <form class="search" action="shop.html">
        <select aria-label="القسم" name="cat"><option value="">كل الأقسام</option>${YH.cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select>
        <input name="q" data-search placeholder="ابحث عن طقم فناجين، ترمس، طنجرة…" aria-label="بحث">
        <button aria-label="بحث">${ic('search', 20, 2.2)}<span>بحث</span></button>
      </form>
      <div class="hdr-acts">
        <a href="#" data-soon class="act hide-md">${ic('user', 24, 1.7)}<span><small>أهلاً بك</small><b>حسابي</b></span></a>
        <a href="#" data-soon class="act hide-sm">${ic('heart', 24, 1.7)}<span><small>المفضلة</small><b>منتجاتي</b></span></a>
        <a href="#" data-cart-open class="act act-cart">${ic('bag', 24, 1.7)}<i data-cart-count hidden>0</i><span><small>السلة</small><b class="cart-sum">0 ₪</b></span></a>
      </div>
    </div>
    <nav class="catbar"><div class="wrap catbar-in">
      <button class="cat-all" data-menu-open>${ic('menu', 18, 2)} كل الأقسام</button>
      ${nav.map(id => `<a href="shop.html?cat=${id}" class="${curCat === id ? 'on' : ''}">${catName[id]}</a>`).join('')}
      <a href="shop.html?sec=offers" class="deal">${ic('bolt', 16, 2)} عروض لفترة محدودة</a>
    </div></nav>
  </header>
  <div class="m-menu"><div class="m-scrim" data-menu-close></div><div class="m-panel">
    <div class="m-top"><b>كل الأقسام (${YH.cats.length})</b><button data-menu-close aria-label="إغلاق">${ic('x', 22, 2)}</button></div>
    <a href="shop.html?sec=offers" class="m-link deal">${ic('bolt', 16, 2)} عروض وخصومات${ic('chev', 18)}</a>
    <a href="shop.html?sec=new" class="m-link">وصل حديثاً${ic('chev', 18)}</a>
    ${YH.cats.map(c => `<a href="shop.html?cat=${c.id}" class="m-cat"><img src="assets/img/c/${c.id}.webp" alt="" loading="lazy"><span><b>${c.name}</b><small>${c.n} منتج</small></span>${ic('chev', 18)}</a>`).join('')}
    <a class="m-wa" href="${S.waLink}" target="_blank" rel="noopener">${ic('wa', 20)} اطلب أو اسأل على واتساب</a>
  </div></div>`;

  const footer = `
  <section class="trust-band"><div class="wrap trust-in">
    <div>${ic('truck', 30, 1.5)}<span><b>توصيل لكل فلسطين</b><small>الضفة 20 ₪ · القدس 30 ₪ · الداخل 70 ₪</small></span></div>
    <div>${ic('cash', 30, 1.5)}<span><b>الدفع عند الاستلام</b><small>تدفع لموظف التوصيل لما يوصلك الطلب</small></span></div>
    <div>${ic('clock', 30, 1.5)}<span><b>يوصلك خلال 3 أيام عمل</b><small>والمندوب بيتصل فيك قبل ما يوصل</small></span></div>
    <div>${ic('swap', 30, 1.5)}<span><b>تبديل خلال 24 ساعة</b><small>مع الفاتورة · التوصيل على الزبون</small></span></div>
  </div></section>
  <footer class="ftr">
    <div class="wrap ftr-in">
      <div class="ftr-about">${logo('light')}
        <p>${S.full}: أطقم صحون وفناجين، ترامس، طناجر، صواني تقديم، أدوات كهربائية ونثريات بيت. أكثر من ${YH.total} منتج في ${YH.cats.length} قسم، والعروض عنا كثير.</p>
        <div class="ftr-social"><a href="${S.ig}" target="_blank" rel="noopener" aria-label="Instagram">${ic('ig', 18)}</a><a href="${S.fb}" target="_blank" rel="noopener" aria-label="Facebook">${ic('fb', 18)}</a><a href="${S.tt}" target="_blank" rel="noopener" aria-label="TikTok">${ic('tt', 18)}</a><a href="${S.waLink}" target="_blank" rel="noopener" aria-label="WhatsApp">${ic('wa', 18)}</a></div>
      </div>
      <div><h4>تسوّق</h4><a href="shop.html?sec=offers">عروض وخصومات</a><a href="shop.html?sec=new">وصل حديثاً</a><a href="shop.html?cat=5">أطقم صحون فاخرة</a><a href="shop.html?cat=10">فناجين قهوة</a><a href="shop.html?cat=3">ترامس</a><a href="shop.html?cat=6">قسم الكهرباء</a></div>
      <div><h4>خدمة الزبائن</h4><a href="index.html#delivery">مناطق وأسعار التوصيل</a><a href="index.html#policy">سياسة التوصيل والتبديل والإلغاء</a><a href="#" data-soon>طلباتي السابقة</a><a href="#" data-soon>دخول تجار الجملة</a><a href="#" data-soon>تثبيت تطبيقنا</a></div>
      <div class="ftr-contact"><h4>تواصل معنا</h4>
        <a href="${S.waLink}" target="_blank" rel="noopener">${ic('wa', 18)}<span><small>واتساب</small><b class="ltr">${S.wa}</b></span></a>
        <a href="${S.ig}" target="_blank" rel="noopener">${ic('ig', 18)}<span><small>إنستغرام وتيك توك</small><b class="ltr">@yasmeen._.home</b></span></a>
        <a href="index.html#delivery">${ic('pin', 18)}<span><small>التوصيل</small><b>لكل مناطق الضفة والقدس والداخل</b></span></a>
      </div>
    </div>
    <div class="wrap ftr-pay"><span>طريقة الدفع:</span><em>الدفع عند الاستلام</em><span class="sp"></span><span>نوصل إلى: جنين · نابلس · رام الله · طولكرم · الخليل · بيت لحم · قلقيلية · أريحا · القدس · الداخل</span></div>
    <div class="wrap ftr-bottom"><span>© 2026 ${S.full}</span><span>نموذج تصميم مقترح من Flowpal</span></div>
  </footer>
  <nav class="tabbar">
    <a href="index.html" class="${page === 'home' ? 'on' : ''}">${ic('home', 22, 1.8)}<span>الرئيسية</span></a>
    <a href="#" data-menu-open class="${page === 'shop' ? 'on' : ''}">${ic('grid', 22, 1.8)}<span>الأقسام</span></a>
    <a href="${S.waLink}" target="_blank" rel="noopener" class="tab-wa">${ic('wa', 24, 1.8)}<span>واتساب</span></a>
    <a href="#" data-cart-open>${ic('bag', 22, 1.8)}<span>السلة</span><i data-cart-count hidden>0</i></a>
    <a href="shop.html?sec=offers">${ic('tag', 22, 1.8)}<span>العروض</span></a>
  </nav>`;
  $('[data-header]').outerHTML = header;
  $('[data-footer]').outerHTML = footer;

  // ---------- product card ----------
  window.card = p => {
    const off = YH.off(p);
    return `<article class="card">
      <a class="card-media" href="product.html?id=${p.id}">
        <img src="${YH.img(p)}" alt="${p.name}" loading="lazy">
        <div class="card-badges">${off ? `<span class="b-off">−${off}٪</span>` : ''}${YH.secs.new.includes(p.id) ? '<span class="b-new">جديد</span>' : ''}</div>
      </a>
      <button class="card-fav" data-fav aria-label="المفضلة">${ic('heart', 18, 1.8)}</button>
      <div class="card-body">
        <small>${catName[p.c] || ''}</small>
        <a href="product.html?id=${p.id}"><h3>${p.name}</h3></a>
        ${p.opts ? `<div class="card-opts"><i></i>${p.opts.length} خيارات متوفرة</div>` : ''}
        <div class="card-price"><b>${price(p)}</b>${p.old ? `<s>${money(p.old)}</s>` : ''}</div>
        ${p.old ? `<div class="card-save">وفّر ${money(p.old - p.price)}</div>` : ''}
        <button class="card-btn" data-quick="${p.id}">${ic('bag', 17, 2)} أضف للسلة</button>
      </div>
    </article>`;
  };
  $$('[data-i]').forEach(e => e.insertAdjacentHTML('afterbegin', ic(e.dataset.i, +(e.dataset.s || 18))));
  $$('[data-grid]').forEach(el => {
    const spec = el.dataset.grid;
    let list = spec.startsWith('sec:') ? YH.pick(YH.secs[spec.slice(4)])
      : spec.startsWith('cat:') ? YH.pick(YH.bycat[spec.slice(4)] || [])
      : YH.pick(spec.split(','));
    if (el.dataset.limit) list = list.slice(0, +el.dataset.limit);
    el.innerHTML = list.map(card).join('');
  });

  // ---------- cart ----------
  const key = 'yh-cart';
  let cart = [];
  try { cart = JSON.parse(sessionStorage.getItem(key)) || []; } catch (e) {}
  const save = () => { try { sessionStorage.setItem(key, JSON.stringify(cart)); } catch (e) {} };
  const drawer = document.createElement('div');
  drawer.className = 'cart-wrap';
  drawer.innerHTML = `
    <div class="cart-scrim" data-cart-close></div>
    <aside class="cart" role="dialog" aria-label="سلة التسوق">
      <header class="cart-head"><strong>سلة التسوق</strong><button class="cart-x" data-cart-close aria-label="إغلاق">✕</button></header>
      <div class="cart-items"></div>
      <footer class="cart-foot">
        <div class="cart-row"><span>المجموع</span><strong class="cart-total"></strong></div>
        <p class="cart-note">+ التوصيل: الضفة 20 ₪ · القدس 30 ₪ · الداخل 70 ₪ · الدفع عند الاستلام</p>
        <button class="cart-cta" data-checkout>إتمام الطلب</button>
        <a class="cart-wa" href="${S.waLink}" target="_blank" rel="noopener">أو اطلب عبر واتساب</a>
      </footer>
    </aside>`;
  document.body.appendChild(drawer);
  const sumEl = $('.cart-sum');
  function renderCart() {
    const total = cart.reduce((s, i) => s + YH.get(i.id).price * i.q, 0);
    const count = cart.reduce((s, i) => s + i.q, 0);
    $$('[data-cart-count]').forEach(b => { b.textContent = count; b.hidden = !count; });
    $('.cart-total', drawer).textContent = money(total);
    if (sumEl) sumEl.textContent = money(total);
    $('.cart-items', drawer).innerHTML = cart.length ? cart.map((i, n) => {
      const p = YH.get(i.id);
      return `<div class="cart-item"><img src="${YH.img(p)}" alt=""><div><small>${catName[p.c] || ''}</small><b>${p.name}</b><span>${i.o ? 'الخيار: ' + i.o + ' · ' : ''}الكمية: ${i.q}</span><strong>${money(p.price * i.q)}</strong></div><button data-rm="${n}" aria-label="حذف">✕</button></div>`;
    }).join('') : '<p class="cart-empty">سلتك فارغة حالياً</p>';
  }
  window.addToCart = (id, o, q = 1) => {
    const found = cart.find(i => i.id === id && i.o == o);
    found ? (found.q += q) : cart.push({ id, o: o || '', q });
    save(); renderCart(); document.body.classList.add('cart-open');
  };
  renderCart();

  // ---------- toast + ribbon ----------
  const toast = document.createElement('div');
  toast.className = 'toast';
  document.body.appendChild(toast);
  let tt;
  window.say = msg => { toast.textContent = msg; toast.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('on'), 2600); };
  const rib = document.createElement('div');
  rib.className = 'concept-ribbon';
  rib.innerHTML = `<span>تصميم مقترح من <b>Flowpal</b> لمتجر الياسمين · بيانات ومنتجات حقيقية من المتجر</span><nav><a href="index.html">الرئيسية</a><a href="shop.html?cat=5">قائمة منتجات</a><a href="product.html?id=1980">صفحة منتج</a></nav><button aria-label="إخفاء">✕</button>`;
  document.body.prepend(rib);
  rib.querySelector('button').onclick = () => rib.remove();
  if (window.self !== window.top) rib.remove();

  // ---------- clicks ----------
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-cart-open],[data-cart-close],[data-rm],[data-add],[data-quick],[data-checkout],[data-menu-open],[data-menu-close],[data-fav],[data-toggle],[data-thumb],[data-qty],.opt,[data-filters-open],[data-filters-close],[data-soon]');
    if (!t) return;
    if (t.matches('a[href="#"], button')) e.preventDefault();
    if (t.matches('[data-cart-open]')) document.body.classList.add('cart-open');
    else if (t.matches('[data-cart-close]')) document.body.classList.remove('cart-open');
    else if (t.matches('[data-rm]')) { cart.splice(+t.dataset.rm, 1); save(); renderCart(); }
    else if (t.matches('[data-quick]')) {
      const p = YH.get(t.dataset.quick);
      if (p.opts) { location.href = 'product.html?id=' + p.id; return; }
      addToCart(p.id);
    }
    else if (t.matches('[data-add]')) {
      const box = $('[data-opts]');
      const o = box && $('.opt.on', box);
      if (box && box.children.length && !o) { box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); say('اختر اللون أو الموديل أولاً'); box.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
      addToCart(window.currentId, o && o.dataset.o, +($('[data-qty-val]')?.textContent || 1));
    }
    else if (t.matches('[data-checkout]')) say('هذا نموذج تصميم. صفحة إتمام الطلب تُربط بنظام المتجر في التنفيذ.');
    else if (t.matches('[data-menu-open]')) document.body.classList.add('menu-open');
    else if (t.matches('[data-menu-close]')) document.body.classList.remove('menu-open');
    else if (t.matches('[data-filters-open]')) document.body.classList.add('filters-open');
    else if (t.matches('[data-filters-close]')) document.body.classList.remove('filters-open');
    else if (t.matches('[data-fav]')) { t.classList.toggle('on'); say(t.classList.contains('on') ? 'أُضيف إلى المفضلة' : 'أُزيل من المفضلة'); }
    else if (t.matches('[data-toggle]')) { const g = t.dataset.toggle; if (g) $$(`[data-toggle="${g}"]`).forEach(x => x !== t && x.classList.remove('on')); t.classList.add('on'); }
    else if (t.matches('[data-soon]')) say('متاح في التنفيذ النهائي للموقع');
    else if (t.matches('[data-thumb]')) {
      $$('[data-thumb]').forEach(x => x.classList.toggle('on', x === t));
      const m = $('[data-main]'); m.style.opacity = 0;
      setTimeout(() => { m.src = t.dataset.thumb; m.style.opacity = 1; }, 150);
    }
    else if (t.matches('[data-qty]')) { const v = $('[data-qty-val]'); v.textContent = Math.max(1, Math.min(20, +v.textContent + +t.dataset.qty)); }
    else if (t.matches('.opt')) {
      $$('.opt', t.parentNode).forEach(x => x.classList.toggle('on', x === t));
      const lbl = $('[data-opt-label]'); if (lbl) lbl.textContent = t.dataset.o;
    }
  });

  // ---------- countdown (ends at local midnight) ----------
  $$('[data-countdown]').forEach(el => {
    const end = new Date(); end.setHours(24, 0, 0, 0);
    const tick = () => {
      const s = Math.max(0, Math.floor((end - Date.now()) / 1000));
      [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60].forEach((v, i) => ($$('[data-cd]', el)[i].textContent = String(v).padStart(2, '0')));
    };
    tick(); setInterval(tick, 1000);
  });

  // ---------- listing page ----------
  if (page === 'shop') {
    const qs = new URLSearchParams(location.search);
    const sec = qs.get('sec'), q = (qs.get('q') || '').trim();
    let cat = qs.get('cat') || '';
    let title, list;
    if (q) { list = YH.products.filter(p => p.name.includes(q) && (!cat || p.c === cat)); title = `نتائج البحث: «${q}»`; }
    else if (sec === 'offers') { list = YH.pick(YH.offers); title = 'عروض وخصومات لفترة محدودة'; }
    else if (sec === 'new') { list = YH.products.slice().sort((a, b) => b.id - a.id).slice(0, 60); title = 'وصل حديثاً'; }
    else { if (!YH.bycat[cat]) cat = '5'; list = YH.pick(YH.bycat[cat]); title = catName[cat]; }
    document.title = `${title} | ${S.full}`;
    $('[data-title]').innerHTML = `${title} <small>${list.length} منتج</small>`;
    $('[data-crumb]').textContent = title;
    $('[data-cats]').innerHTML = YH.cats.map(c => `<a href="shop.html?cat=${c.id}" class="${c.id === cat && !sec && !q ? 'on' : ''}">${c.name}<em>${c.n}</em></a>`).join('');
    // quick chips: sibling categories with photo
    const chips = (sec || q) ? ['5', '10', '3', '8', '18', '6', '47'] : nav;
    $('[data-quick-cats]').innerHTML = chips.map(id => `<a class="qchip ${id === cat && !sec && !q ? 'on' : ''}" href="shop.html?cat=${id}"><img src="assets/img/c/${id}.webp" alt="">${catName[id]}</a>`).join('');
    const grid = $('[data-list]');
    let shown = list;
    const draw = () => {
      const sort = $('[data-sort]').value, only = $('[data-only-sale]').checked;
      const min = +$('[data-min]').value || 0, max = +$('[data-max]').value || 1e9;
      shown = list.filter(p => (!only || p.old) && p.price >= min && p.price <= max);
      if (sort === 'low') shown = shown.slice().sort((a, b) => a.price - b.price);
      if (sort === 'high') shown = shown.slice().sort((a, b) => b.price - a.price);
      if (sort === 'off') shown = shown.slice().sort((a, b) => YH.off(b) - YH.off(a));
      if (sort === 'new') shown = shown.slice().sort((a, b) => b.id - a.id);
      grid.innerHTML = shown.length ? shown.map(card).join('') : '<p class="empty-cat">ما في منتجات بهالفلتر. جرّب تغيّر السعر أو اسألنا على واتساب.</p>';
      $$('[data-count]').forEach(x => (x.textContent = shown.length));
    };
    $$('[data-sort],[data-only-sale],[data-min],[data-max]').forEach(x => x.addEventListener('change', draw));
    $('[data-apply]').addEventListener('click', draw);
    $('[data-clear]').addEventListener('click', () => { $('[data-only-sale]').checked = false; $('[data-min]').value = ''; $('[data-max]').value = ''; draw(); });
    $('[data-sort-m]').addEventListener('click', () => { const s = $('[data-sort]'); s.selectedIndex = (s.selectedIndex + 1) % s.options.length; draw(); say('الترتيب: ' + s.options[s.selectedIndex].text); });
    draw();
  }

  // ---------- product page ----------
  if (page === 'product') {
    const p = YH.get(new URLSearchParams(location.search).get('id') || '1980');
    window.currentId = p.id;
    const off = YH.off(p);
    document.title = `${p.name} | ${S.full}`;
    $$('[data-p-name]').forEach(e => (e.textContent = p.name));
    $$('[data-p-cat]').forEach(e => { e.textContent = catName[p.c] || ''; if (e.tagName === 'A') e.href = 'shop.html?cat=' + p.c; });
    $$('[data-p-price]').forEach(e => (e.textContent = price(p)));
    $$('[data-p-old]').forEach(e => (e.textContent = p.old ? money(p.old) : ''));
    $('[data-p-save]').textContent = p.old ? `وفّر ${money(p.old - p.price)} (${off}٪)` : '';
    $('[data-p-save]').hidden = !p.old;
    $('.pricebox').classList.toggle('sale', !!p.old);
    $('[data-p-off]').outerHTML = off ? `<span class="b-off">−${off}٪</span>` : '';
    $('[data-p-sku]').textContent = 'رقم المنتج: ' + p.id;
    const n = p.n || 1;
    $('[data-main]').src = YH.img(p);
    $('[data-main]').alt = p.name;
    $('[data-thumbs]').innerHTML = n > 1 ? Array.from({ length: n }, (_, k) => `<button class="${k ? '' : 'on'}" data-thumb="${YH.img(p, k)}"><img src="${YH.img(p, k)}" alt=""></button>`).join('') : '';
    const opts = $('[data-opts]');
    if (p.opts) {
      opts.innerHTML = p.opts.map(o => `<button class="opt" data-o="${o}">${o}</button>`).join('');
      $('[data-opt-row]').hidden = false;
    }
    const zone = $('[data-zone]');
    zone.innerHTML = S.zones.map(z => `<option value="${z[1]}">${z[0]}</option>`).join('');
    const fee = () => { $('[data-fee]').textContent = money(+zone.value); };
    zone.addEventListener('change', fee); fee();
    $('[data-wa-order]').href = S.waLink + '?text=' + encodeURIComponent(`مرحبا، بدي أطلب: ${p.name} (رقم المنتج ${p.id})`);
    $('[data-spec]').innerHTML = `<tr><td>رقم المنتج</td><td>${p.id}</td></tr><tr><td>القسم</td><td>${catName[p.c] || ''}</td></tr><tr><td>السعر</td><td>${price(p)}${p.old ? ` بدل ${money(p.old)}` : ''}</td></tr>${p.opts ? `<tr><td>الخيارات</td><td>${p.opts.join(' · ')}</td></tr>` : ''}<tr><td>طريقة الدفع</td><td>الدفع عند الاستلام</td></tr>`;
    const sim = (YH.bycat[p.c] || []).filter(id => id !== p.id).slice(0, 10);
    $('[data-similar]').innerHTML = YH.pick(sim).map(card).join('');
    $('[data-similar-link]').href = 'shop.html?cat=' + p.c;
    // "complete your table": three items from serving/coffee categories
    const pairs = YH.pick([...(YH.bycat['10'] || []).slice(0, 1), ...(YH.bycat['8'] || []).slice(0, 1), ...(YH.bycat['3'] || []).slice(0, 1)]).filter(x => x.id !== p.id).slice(0, 2);
    const items = [p, ...pairs], total = items.reduce((s, x) => s + x.price, 0);
    $('[data-bundle]').innerHTML = items.map((x, i) => `${i ? '<span class="bundle-plus">+</span>' : ''}<div class="bundle-item"><img src="${YH.img(x)}" alt=""><label>${x.name}</label><b>${price(x)}</b></div>`).join('') +
      `<div class="bundle-total"><small>المجموع</small><b>${money(total)}</b><em>توصيل واحد لكل الطلب</em><button class="btn btn-amber" data-bundle-add>أضف الثلاثة للسلة</button></div>`;
    $('[data-bundle-add]').onclick = () => items.forEach(x => addToCart(x.id, x.opts ? x.opts[0] : ''));
  }
})();
