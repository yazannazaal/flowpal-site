// Concept 2 — Modern Sport & Streetwear: header, footer, product card, product page fill.
(function () {
  const ic = BS.ic;
  const page = document.body.dataset.page;
  const nav = [['جديد', 'shop.html'], ['رجال', 'shop.html', 'men'], ['نساء', 'shop.html'], ['أطفال', 'shop.html'], ['سنيكرز', 'shop.html'], ['ستريت وير', 'shop.html'], ['ماركات', 'index.html#brands'], ['SALE', 'shop.html', 'sale']];

  const header = `
  <div class="ticker"><div class="ticker-track">${'<span>توصيل مجاني فوق 300 ₪</span><b>✦</b><span>FREE DELIVERY</span><b>✦</b><span>تبديل خلال 14 يوم</span><b>✦</b><span>100% ORIGINAL</span><b>✦</b><span>الدفع عند الاستلام</span><b>✦</b>'.repeat(4)}</div></div>
  <header class="hdr">
    <div class="hdr-in">
      <button class="hdr-burger" data-menu-open aria-label="القائمة">${ic('menu', 24, 2)}</button>
      <a class="logo" href="index.html" aria-label="Mamsha Sport">MAMSHA<i>®</i><small>SPORT</small></a>
      <nav class="hdr-nav">${nav.map(([t, h, k]) => `<a href="${h}" class="${k === 'sale' ? 'sale' : ''}${page === 'shop' && k === 'men' ? ' on' : ''}">${t}</a>`).join('')}</nav>
      <div class="hdr-tools">
        <label class="hdr-search">${ic('search', 18, 2)}<input data-search placeholder="دوّر على سنيكرز، ماركة…" aria-label="بحث"></label>
        <button class="hdr-lang" data-lang>EN</button>
        <a href="#" data-soon class="hdr-ic hide-sm" aria-label="المفضلة">${ic('heart', 22, 2)}</a>
        <a href="#" data-soon class="hdr-ic hide-sm" aria-label="حسابي">${ic('user', 22, 2)}</a>
        <a href="#" data-cart-open class="hdr-ic hdr-bag" aria-label="السلة">${ic('bag', 22, 2)}<i data-cart-count hidden>0</i></a>
      </div>
    </div>
    <div class="m-strip"><label class="m-search">${ic('search', 18, 2)}<input placeholder="دوّر على سنيكرز، ماركة…" aria-label="بحث"></label>
      <nav class="m-pills">${nav.map(([t, h, k]) => `<a href="${h}" class="${k === 'sale' ? 'sale' : ''}">${t}</a>`).join('')}</nav></div>
  </header>
  <div class="m-menu"><div class="m-scrim" data-menu-close></div><div class="m-panel">
    <div class="m-top"><a class="logo" href="index.html">MAMSHA<i>®</i></a><button data-menu-close aria-label="إغلاق">${ic('x', 24, 2)}</button></div>
    ${nav.map(([t, h]) => `<a href="${h}" class="m-link">${t}<span>${ic('arrow', 20, 2)}</span></a>`).join('')}
    <a class="m-wa" href="#" data-soon>${ic('wa', 20)} محتار بالمقاس؟ احكي معنا</a>
  </div></div>`;

  const footer = `
  <section class="join">
    <div class="wrap"><div class="join-in">
      <div><h3>خلّيك أول واحد<br><em>يعرف بالـDROP.</em></h3><p>عروض حصرية، وصول جديد، وتخفيضات قبل الكل. على واتساب أو الإيميل.</p></div>
      <form onsubmit="event.preventDefault();say('تمام! رح توصلك العروض أول بأول')"><input type="email" placeholder="إيميلك" aria-label="إيميلك"><button>اشترك ${ic('arrow', 18, 2)}</button></form>
    </div></div>
  </section>
  <footer class="ftr">
    <div class="wrap ftr-in">
      <div><h4>تسوّق</h4><a href="shop.html">رجال</a><a href="shop.html">نساء</a><a href="shop.html">أطفال</a><a href="shop.html">سنيكرز</a><a href="shop.html">تخفيضات</a></div>
      <div><h4>مساعدة</h4><a href="#" data-soon>تتبّع طلبك</a><a href="#" data-soon>مناطق التوصيل</a><a href="#" data-soon>دليل المقاسات</a><a href="#" data-soon>التبديل والإرجاع</a></div>
      <div><h4>تابعنا</h4><a href="#" data-soon>Instagram · mamsha.sport</a><a href="#" data-soon>Facebook · Mamsha Sport</a><a href="#" data-soon>TikTok</a></div>
      <div><h4>احكي معنا</h4><a href="#" data-soon class="ltr" style="text-align:right">WhatsApp ${BS.whatsapp}</a><a href="#" data-soon>فرعنا: الضفة الغربية</a><a href="#" data-soon>يومياً 9:00 – 21:00</a></div>
    </div>
    <div class="ftr-mark" aria-hidden="true">MAMSHA®</div>
    <div class="wrap ftr-bottom"><span>© 2026 Mamsha Sport</span><span><button data-lang>English</button> · العربية</span></div>
  </footer>
  <nav class="tabbar">
    <a href="index.html" class="${page === 'home' ? 'on' : ''}">${ic('home', 22, 1.8)}<span>الرئيسية</span></a>
    <a href="shop.html" class="${page === 'shop' ? 'on' : ''}">${ic('search', 22, 1.8)}<span>اكتشف</span></a>
    <a href="#" data-cart-open class="tab-bag">${ic('bag', 22, 1.8)}<i data-cart-count hidden>0</i></a>
    <a href="#" data-soon>${ic('heart', 22, 1.8)}<span>المفضلة</span></a>
    <a href="#" data-soon>${ic('user', 22, 1.8)}<span>حسابي</span></a>
  </nav>`;

  document.querySelector('[data-header]').outerHTML = header;
  document.querySelector('[data-footer]').outerHTML = footer;

  window.card = (p, i) => {
    const off = BS.off(p);
    return `<article class="card">
      <a class="card-media" href="product.html?id=${p.id}">
        <img src="${BS.img(p.img)}" alt="${p.brand} ${p.name}" loading="lazy">
        <div class="card-flags">${p.hot ? `<span class="f-hot">${ic('fire', 13, 2)} HOT</span>` : ''}${off ? `<span class="f-off">−${off}%</span>` : ''}${p.tag && !p.hot ? `<span class="f-tag">${p.tag}</span>` : ''}</div>
        <button class="card-add" data-quick="${p.id}" aria-label="أضف للسلة">${ic('plus', 20, 2.2)}</button>
      </a>
      <button class="card-fav" data-fav aria-label="المفضلة">${ic('heart', 18, 2)}</button>
      <div class="card-body">
        <div class="card-top"><small>${p.brand}</small><span class="dots">${p.colors.map(c => `<i style="background:${c}"></i>`).join('')}</span></div>
        <a href="product.html?id=${p.id}"><h3>${p.name}</h3></a>
        <div class="card-price"><b>${money(p.price)}</b>${p.old ? `<s>${money(p.old)}</s>` : ''}</div>
      </div>
    </article>`;
  };

  window.fillProduct = p => {
    window.currentId = p.id;
    const set = (s, v) => document.querySelectorAll(s).forEach(e => (e.innerHTML = v));
    set('[data-p-brand]', p.brand); set('[data-p-name]', p.name); set('[data-p-type]', p.type);
    set('[data-p-price]', money(p.price)); set('[data-p-old]', p.old ? money(p.old) : '');
    set('[data-p-off]', BS.off(p) ? `−${BS.off(p)}%` : 'NEW');
    set('[data-p-rate]', `${p.rating} (${p.reviews})`);
    const main = document.querySelector('[data-main]'); main.src = BS.img(p.img); main.alt = p.name;
    const t0 = document.querySelector('[data-thumb]'); if (t0) { t0.dataset.thumb = BS.img(p.img); t0.querySelector('img').src = BS.img(p.img); }
    document.querySelector('[data-sizes]').innerHTML = p.sizes.map(s => `<button class="size${(p.out || []).includes(s) ? ' na' : ''}" data-s="${s}">${s}</button>`).join('');
    document.querySelector('[data-swatches]').innerHTML = p.colors.map((c, i) => `<button class="swatch${i ? '' : ' on'}" style="--c:${c}" title="لون ${i + 1}"></button>`).join('');
    document.title = `${p.name} | Mamsha Sport — مفهوم 2`;
  };
})();
