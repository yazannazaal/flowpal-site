// Concept 1 — Premium Sports Retail: header, footer, product card, product page fill.
(function () {
  const ic = BS.ic;
  const page = document.body.dataset.page;
  const nav = [['وصل حديثاً', 'shop.html'], ['رجال', 'shop.html', 'men'], ['نساء', 'shop.html'], ['أطفال', 'shop.html'], ['اكسسوارات', 'shop.html'], ['العلامات التجارية', 'index.html#brands'], ['تخفيضات', 'shop.html', 'sale']];

  const header = `
  <div class="announce"><div class="announce-track"><span>توصيل مجاني للطلبات فوق 300 ₪</span><span>استبدال سهل خلال 14 يوماً</span><span>منتجات أصلية 100٪ من الوكيل</span><span>الدفع عند الاستلام</span></div></div>
  <header class="hdr">
    <div class="hdr-in">
      <button class="hdr-burger" data-menu-open aria-label="القائمة">${ic('menu')}</button>
      <a class="logo" href="index.html" aria-label="Brands Sport"><b>BRANDS</b><small>SPORT · JENIN</small></a>
      <nav class="hdr-nav">${nav.map(([t, h, k]) => `<a href="${h}" class="${k === 'sale' ? 'sale' : ''}${page === 'shop' && k === 'men' ? ' on' : ''}">${t}</a>`).join('')}</nav>
      <div class="hdr-tools">
        <label class="hdr-search">${ic('search', 18)}<input data-search placeholder="ابحث عن منتج أو ماركة" aria-label="بحث"></label>
        <button class="hdr-lang" data-lang>EN</button>
        <a href="#" data-soon class="hdr-ic" aria-label="حسابي">${ic('user')}</a>
        <a href="#" data-soon class="hdr-ic hide-sm" aria-label="المفضلة">${ic('heart')}</a>
        <a href="#" data-cart-open class="hdr-ic" aria-label="السلة">${ic('bag')}<i data-cart-count hidden>0</i></a>
      </div>
    </div>
    <label class="m-search">${ic('search', 18)}<input placeholder="ابحث عن منتج أو ماركة" aria-label="بحث"></label>
  </header>
  <div class="m-menu"><div class="m-scrim" data-menu-close></div><div class="m-panel">
    <div class="m-top"><a class="logo" href="index.html"><b>BRANDS</b><small>SPORT · JENIN</small></a><button data-menu-close aria-label="إغلاق">${ic('x')}</button></div>
    ${nav.map(([t, h]) => `<a href="${h}" class="m-link">${t}<span>${ic('chev', 18)}</span></a>`).join('')}
    <div class="m-foot"><a href="${BS.waLink}">${ic('wa', 18)} واتساب ${BS.whatsapp}</a><button data-lang>English</button></div>
  </div></div>`;

  const footer = `
  <section class="perks">
    <div class="wrap perks-in">
      <div>${ic('truck', 26, 1.4)}<b>توصيل لباب البيت</b><span>لكل مناطق الضفة خلال 2–4 أيام</span></div>
      <div>${ic('cash', 26, 1.4)}<b>الدفع عند الاستلام</b><span>ادفع نقداً عند وصول طلبك</span></div>
      <div>${ic('shield', 26, 1.4)}<b>أصلي 100٪</b><span>كل منتج من وكيل أو مصدر معتمد</span></div>
      <div>${ic('chat', 26, 1.4)}<b>مساعدة على واتساب</b><span class="ltr">${BS.whatsapp}</span></div>
    </div>
  </section>
  <footer class="ftr">
    <div class="wrap ftr-in">
      <div class="ftr-brand"><a class="logo light" href="index.html"><b>BRANDS</b><small>SPORT · JENIN</small></a>
        <p>متجر الأحذية والملابس الرياضية الأصلية في فلسطين، للرجال والنساء والأطفال.</p>
        <form class="news" onsubmit="event.preventDefault();say('شكراً! سنرسل لك أحدث العروض')"><input type="email" placeholder="بريدك الإلكتروني" aria-label="بريدك الإلكتروني"><button>اشترك</button></form>
      </div>
      <div><h4>تسوّق</h4><a href="shop.html">رجال</a><a href="shop.html">نساء</a><a href="shop.html">أطفال</a><a href="shop.html">اكسسوارات</a><a href="shop.html">تخفيضات</a></div>
      <div><h4>المساعدة</h4><a href="#" data-soon>تتبّع طلبي</a><a href="#" data-soon>مناطق التوصيل</a><a href="#" data-soon>دليل المقاسات</a><a href="#" data-soon>سياسة الاستبدال</a></div>
      <div><h4>تواصل معنا</h4><a href="${BS.waLink}" class="ic-link">${ic('wa', 16)} <span class="ltr">${BS.whatsapp}</span></a><a href="#" data-soon class="ic-link">${ic('ig', 16)} brands.sport1</a><a href="#" data-soon class="ic-link">${ic('fb', 16)} Brands Sport Jenin</a><a href="#" data-soon class="ic-link">${ic('pin', 16)} جنين، فلسطين</a></div>
    </div>
    <div class="wrap ftr-bottom"><span>© 2026 Brands Sport</span><span>العربية · <button data-lang>English</button></span></div>
  </footer>
  <nav class="tabbar">
    <a href="index.html" class="${page === 'home' ? 'on' : ''}">${ic('home', 22)}<span>الرئيسية</span></a>
    <a href="shop.html" class="${page === 'shop' ? 'on' : ''}">${ic('grid', 22)}<span>الأقسام</span></a>
    <a href="#" data-soon>${ic('heart', 22)}<span>المفضلة</span></a>
    <a href="#" data-cart-open>${ic('bag', 22)}<span>السلة</span><i data-cart-count hidden>0</i></a>
    <a href="#" data-soon>${ic('user', 22)}<span>حسابي</span></a>
  </nav>`;

  document.querySelector('[data-header]').outerHTML = header;
  document.querySelector('[data-footer]').outerHTML = footer;

  window.card = p => {
    const off = BS.off(p);
    return `<article class="card">
      <a class="card-media" href="product.html?id=${p.id}">
        <img src="${BS.img(p.img)}" alt="${p.brand} ${p.name}" loading="lazy">
        ${off ? `<span class="badge">−${off}٪</span>` : ''}
        ${p.tag ? `<span class="tag">${p.tag}</span>` : ''}
        <button class="card-quick" data-quick="${p.id}">إضافة سريعة +</button>
      </a>
      <button class="card-fav" data-fav aria-label="المفضلة">${BS.ic('heart', 18)}</button>
      <div class="card-body">
        <small>${p.brand}</small>
        <a href="product.html?id=${p.id}"><h3>${p.name}</h3></a>
        <div class="card-price"><b>${money(p.price)}</b>${p.old ? `<s>${money(p.old)}</s>` : ''}</div>
        <div class="card-meta"><span class="dots">${p.colors.map(c => `<i style="background:${c}"></i>`).join('')}</span><span>المقاسات ${BS.sizeRange(p)}</span></div>
      </div>
    </article>`;
  };

  window.fillProduct = p => {
    window.currentId = p.id;
    const set = (s, v) => document.querySelectorAll(s).forEach(e => (e.innerHTML = v));
    set('[data-p-brand]', p.brand); set('[data-p-name]', p.name); set('[data-p-type]', p.type);
    set('[data-p-price]', money(p.price));
    set('[data-p-old]', p.old ? money(p.old) : '');
    set('[data-p-save]', p.old ? `وفّر ${money(p.old - p.price)}` : '');
    set('[data-p-off]', BS.off(p) ? `−${BS.off(p)}٪` : '');
    const main = document.querySelector('[data-main]');
    if (p.id !== 'moab3-mid') {
      main.src = BS.img(p.img);
      document.querySelectorAll('[data-thumb]').forEach((t, i) => { if (i > 0) t.remove(); else { t.dataset.thumb = BS.img(p.img); t.querySelector('img').src = BS.img(p.img); } });
      document.querySelectorAll('[data-moab]').forEach(e => e.remove());
    }
    const sz = document.querySelector('[data-sizes]');
    sz.innerHTML = p.sizes.map(s => `<button class="size${(p.out || []).includes(s) ? ' na' : ''}" data-s="${s}">${s}</button>`).join('');
    document.title = `${p.name} | Brands Sport — مفهوم 1`;
  };
})();
