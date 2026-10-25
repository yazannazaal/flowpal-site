// Concept 3 — High-Converting Commercial Store: header, footer, product card, product page fill.
(function () {
  const ic = BS.ic;
  const page = document.body.dataset.page;
  const nav = ['رجال', 'نساء', 'أطفال', 'أحذية رياضية', 'جاكيتات', 'بساطير وهايكنج', 'شنط واكسسوارات', 'الماركات'];

  const header = `
  <div class="util"><div class="wrap util-in">
    <div class="util-l"><a href="#" data-soon>${ic('wa', 15)} واتساب: <span class="ltr">${BS.whatsapp}</span></a><span class="hide-md">${ic('truck', 15)} توصيل لكل مناطق الضفة خلال 2–4 أيام</span></div>
    <div class="util-r"><a href="#" data-soon>تتبّع طلبك</a><a href="#" data-soon class="hide-md">فروعنا</a><button data-lang>English</button></div>
  </div></div>
  <header class="hdr">
    <div class="wrap hdr-in">
      <button class="hdr-burger" data-menu-open aria-label="القائمة">${ic('menu', 24, 2)}</button>
      <a class="logo" href="index.html" aria-label="Mamsha Sport"><span class="logo-mark">M</span><span><b>MAMSHA</b><small>SPORT · فلسطين</small></span></a>
      <form class="search" onsubmit="event.preventDefault();say('البحث يعمل في التنفيذ النهائي')">
        <select aria-label="القسم"><option>كل الأقسام</option><option>رجال</option><option>نساء</option><option>أطفال</option></select>
        <input data-search placeholder="ابحث عن حذاء، جاكيت، ماركة… مثلاً: Skechers مقاس 43" aria-label="بحث">
        <button aria-label="بحث">${ic('search', 20, 2.2)}<span>بحث</span></button>
      </form>
      <div class="hdr-acts">
        <a href="#" data-soon class="act hide-md">${ic('user', 24, 1.7)}<span><small>أهلاً، سجّل دخول</small><b>حسابي</b></span></a>
        <a href="#" data-soon class="act hide-sm">${ic('heart', 24, 1.7)}<span><small>المفضلة</small><b>3 منتجات</b></span></a>
        <a href="#" data-cart-open class="act act-cart">${ic('bag', 24, 1.7)}<i data-cart-count hidden>0</i><span><small>السلة</small><b class="cart-sum">0 ₪</b></span></a>
      </div>
    </div>
    <nav class="catbar"><div class="wrap catbar-in">
      <button class="cat-all" data-menu-open>${ic('menu', 18, 2)} كل الأقسام</button>
      ${nav.map((t, i) => `<a href="shop.html" class="${page === 'shop' && i === 0 ? 'on' : ''}">${t}</a>`).join('')}
      <a href="shop.html" class="deal">${ic('bolt', 16, 2)} عروض اليوم</a>
    </div></nav>
  </header>
  <div class="m-menu"><div class="m-scrim" data-menu-close></div><div class="m-panel">
    <div class="m-top"><b>كل الأقسام</b><button data-menu-close aria-label="إغلاق">${ic('x', 22, 2)}</button></div>
    ${BS.cats.map(c => `<a href="shop.html" class="m-cat"><img src="${BS.img(c.img)}" alt=""><span><b>${c.name}</b><small>${c.count} منتج</small></span>${ic('chev', 18)}</a>`).join('')}
    ${nav.slice(3).map(t => `<a href="shop.html" class="m-link">${t}${ic('chev', 18)}</a>`).join('')}
    <a href="shop.html" class="m-link deal">${ic('bolt', 16, 2)} عروض اليوم${ic('chev', 18)}</a>
    <a class="m-wa" href="#" data-soon>${ic('wa', 20)} اطلب أو اسأل على واتساب</a>
  </div></div>`;

  const footer = `
  <section class="trust-band"><div class="wrap trust-in">
    <div>${ic('truck', 30, 1.5)}<span><b>توصيل سريع</b><small>2–4 أيام لكل الضفة · مجاني فوق 300 ₪</small></span></div>
    <div>${ic('cash', 30, 1.5)}<span><b>الدفع عند الاستلام</b><small>افحص طلبك وادفع للمندوب</small></span></div>
    <div>${ic('swap', 30, 1.5)}<span><b>استبدال 14 يوم</b><small>المقاس ما ضبط؟ نبدّله مجاناً</small></span></div>
    <div>${ic('shield', 30, 1.5)}<span><b>أصلي 100٪</b><small>ضمان أصالة على كل منتج</small></span></div>
  </div></section>
  <footer class="ftr">
    <div class="wrap ftr-in">
      <div class="ftr-about"><a class="logo light" href="index.html"><span class="logo-mark">M</span><span><b>MAMSHA</b><small>SPORT · فلسطين</small></span></a>
        <p>متجر ممشى للأحذية والملابس الرياضية الأصلية. أكثر من 850 منتج من 24 ماركة عالمية للرجال والنساء والأطفال.</p>
        <div class="ftr-social"><a href="#" data-soon aria-label="Instagram">${ic('ig', 18)}</a><a href="#" data-soon aria-label="Facebook">${ic('fb', 18)}</a><a href="#" data-soon aria-label="WhatsApp">${ic('wa', 18)}</a></div>
      </div>
      <div><h4>تسوّق</h4><a href="shop.html">رجال</a><a href="shop.html">نساء</a><a href="shop.html">أطفال</a><a href="shop.html">عروض اليوم</a><a href="shop.html">وصل حديثاً</a></div>
      <div><h4>خدمة الزبائن</h4><a href="#" data-soon>تتبّع طلبك</a><a href="#" data-soon>مناطق وأسعار التوصيل</a><a href="#" data-soon>سياسة الاستبدال والإرجاع</a><a href="#" data-soon>دليل المقاسات</a><a href="#" data-soon>الأسئلة الشائعة</a></div>
      <div class="ftr-contact"><h4>تواصل معنا</h4>
        <a href="#" data-soon>${ic('wa', 18)}<span><small>واتساب (رد سريع)</small><b class="ltr">${BS.whatsapp}</b></span></a>
        <a href="#" data-soon>${ic('clock', 18)}<span><small>ساعات العمل</small><b>السبت – الخميس، 9:00 – 21:00</b></span></a>
        <a href="#" data-soon>${ic('pin', 18)}<span><small>الفرع</small><b>الضفة الغربية، فلسطين</b></span></a>
      </div>
    </div>
    <div class="wrap ftr-pay"><span>طرق الدفع:</span><em>الدفع عند الاستلام</em><em>Visa</em><em>Mastercard</em><em>تحويل بنكي</em><span class="sp"></span><span>نوصل إلى: جنين · نابلس · رام الله · طولكرم · الخليل · بيت لحم · قلقيلية · وكل الضفة</span></div>
    <div class="wrap ftr-bottom"><span>© 2026 Mamsha Sport. جميع الحقوق محفوظة.</span><span><a href="#" data-soon>الخصوصية</a> · <a href="#" data-soon>الشروط</a></span></div>
  </footer>
  <nav class="tabbar">
    <a href="index.html" class="${page === 'home' ? 'on' : ''}">${ic('home', 22, 1.8)}<span>الرئيسية</span></a>
    <a href="shop.html" class="${page === 'shop' ? 'on' : ''}">${ic('grid', 22, 1.8)}<span>الأقسام</span></a>
    <a href="#" data-soon class="tab-wa">${ic('wa', 24, 1.8)}<span>واتساب</span></a>
    <a href="#" data-cart-open>${ic('bag', 22, 1.8)}<span>السلة</span><i data-cart-count hidden>0</i></a>
    <a href="#" data-soon>${ic('user', 22, 1.8)}<span>حسابي</span></a>
  </nav>`;

  document.querySelector('[data-header]').outerHTML = header;
  document.querySelector('[data-footer]').outerHTML = footer;

  const stars = r => `<span class="stars" style="--r:${(r / 5) * 100}%" aria-label="${r} من 5"></span>`;
  window.stars = stars;
  window.card = (p, i) => {
    const off = BS.off(p);
    const sz = p.sizes.slice(0, 4).map(s => `<i>${s}</i>`).join('') + (p.sizes.length > 4 ? `<i class="more">+${p.sizes.length - 4}</i>` : '');
    return `<article class="card">
      <a class="card-media" href="product.html?id=${p.id}">
        <img src="${BS.img(p.img)}" alt="${p.brand} ${p.name}" loading="lazy">
        <div class="card-badges">${off ? `<span class="b-off">−${off}٪</span>` : ''}${p.tag === 'جديد' || p.hot ? '<span class="b-new">جديد</span>' : ''}${p.stock ? '<span class="b-last">آخر قطع</span>' : ''}</div>
        ${off >= 20 ? '<span class="b-free">توصيل مجاني</span>' : ''}
      </a>
      <button class="card-fav" data-fav aria-label="المفضلة">${ic('heart', 18, 1.8)}</button>
      <div class="card-body">
        <small>${p.brand}</small>
        <a href="product.html?id=${p.id}"><h3>${p.name}</h3></a>
        <div class="card-rate">${stars(p.rating)}<span>(${p.reviews})</span></div>
        <div class="card-price"><b>${money(p.price)}</b>${p.old ? `<s>${money(p.old)}</s>` : ''}</div>
        ${p.old ? `<div class="card-save">وفّر ${money(p.old - p.price)}</div>` : '<div class="card-save none">سعر ثابت</div>'}
        <div class="card-sizes">${sz}</div>
        <button class="card-btn" data-quick="${p.id}">${ic('bag', 17, 2)} أضف للسلة</button>
      </div>
    </article>`;
  };

  window.fillProduct = p => {
    window.currentId = p.id;
    const set = (s, v) => document.querySelectorAll(s).forEach(e => (e.innerHTML = v));
    set('[data-p-brand]', p.brand); set('[data-p-name]', p.name); set('[data-p-type]', p.type);
    set('[data-p-price]', money(p.price)); set('[data-p-old]', p.old ? money(p.old) : '');
    set('[data-p-save]', p.old ? `وفّر ${money(p.old - p.price)} (${BS.off(p)}٪)` : '');
    set('[data-p-rate]', stars(p.rating) + ` <b>${p.rating}</b> <a href="#reviews">${p.reviews} تقييم</a>`);
    if (p.id !== 'moab3-mid') {
      document.querySelector('[data-main]').src = BS.img(p.img);
      document.querySelectorAll('[data-thumb]').forEach((t, i) => { if (i) t.remove(); else { t.dataset.thumb = BS.img(p.img); t.querySelector('img').src = BS.img(p.img); } });
    }
    document.querySelector('[data-sizes]').innerHTML = p.sizes.map(s => `<button class="size${(p.out || []).includes(s) ? ' na' : ''}" data-s="${s}">${s}${(p.out || []).includes(s) ? '<small>نفد</small>' : s === 43 && p.stock ? '<small class="low">باقي 2</small>' : ''}</button>`).join('');
    document.title = `${p.name} | Mamsha Sport — مفهوم 3`;
  };

  // live cart total in header
  const sum = document.querySelector('.cart-sum');
  const upd = () => { try { const c = JSON.parse(sessionStorage.getItem('bs-cart-3')) || []; sum.textContent = money(c.reduce((s, i) => s + BS.get(i.id).price * i.q, 0)); } catch (e) {} };
  upd(); setInterval(upd, 800);
})();
