// Shared behaviour for all three concepts. Each concept defines window.card(product) for its grids.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const money = n => n.toLocaleString('en-US') + ' ₪';
  window.money = money;

  // Icon placeholders: <span data-i="name">
  $$('[data-i]').forEach(e => e.insertAdjacentHTML('afterbegin', BS.ic(e.dataset.i, +(e.dataset.s || 18))));
  $$('[data-stars]').forEach(e => (e.innerHTML = BS.ic('star', 14).repeat(5)));

  // Grids: data-grid="id,id,..." | "cat:men" | "all"
  $$('[data-grid]').forEach(el => {
    const spec = el.dataset.grid;
    let list = spec === 'all' ? BS.products
      : spec.startsWith('cat:') ? BS.products.filter(p => p.cat === spec.slice(4))
      : BS.pick(spec.split(','));
    if (el.dataset.limit) list = list.slice(0, +el.dataset.limit);
    el.innerHTML = list.map((p, i) => window.card(p, i)).join('');
  });

  // Product page: fill from ?id=
  const pid = new URLSearchParams(location.search).get('id');
  if (window.fillProduct && $('[data-sizes]')) window.fillProduct(BS.get(pid || document.body.dataset.default || 'moab3-mid'));

  // Cart (kept per concept for the session)
  const key = 'bs-cart-' + (document.body.dataset.concept || 'x');
  let cart = [];
  try { cart = JSON.parse(sessionStorage.getItem(key)) || []; } catch (e) {}
  const save = () => { try { sessionStorage.setItem(key, JSON.stringify(cart)); } catch (e) {} };

  const drawer = document.createElement('div');
  drawer.className = 'cart-wrap';
  drawer.innerHTML = `
    <div class="cart-scrim" data-cart-close></div>
    <aside class="cart" role="dialog" aria-label="سلة التسوق">
      <header class="cart-head"><strong>سلة التسوق</strong><button class="cart-x" data-cart-close aria-label="إغلاق">✕</button></header>
      <div class="cart-free"></div>
      <div class="cart-items"></div>
      <footer class="cart-foot">
        <div class="cart-row"><span>المجموع</span><strong class="cart-total"></strong></div>
        <p class="cart-note">الدفع عند الاستلام · توصيل لكل مناطق الضفة</p>
        <button class="cart-cta" data-checkout>إتمام الطلب</button>
        <a class="cart-wa" href="${BS.waLink}" target="_blank" rel="noopener">أو اطلب عبر واتساب</a>
      </footer>
    </aside>`;
  document.body.appendChild(drawer);

  function renderCart() {
    const total = cart.reduce((s, i) => s + BS.get(i.id).price * i.q, 0);
    const count = cart.reduce((s, i) => s + i.q, 0);
    $$('[data-cart-count]').forEach(b => { b.textContent = count; b.hidden = !count; });
    $('.cart-total', drawer).textContent = money(total);
    const left = 300 - total;
    $('.cart-free', drawer).innerHTML = total === 0 ? '' : left > 0
      ? `<span>أضف <b>${money(left)}</b> للحصول على توصيل مجاني</span><i style="--p:${Math.min(100, total / 3)}%"></i>`
      : `<span>🎉 طلبك مؤهل للتوصيل المجاني</span><i style="--p:100%"></i>`;
    $('.cart-items', drawer).innerHTML = cart.length ? cart.map((i, n) => {
      const p = BS.get(i.id);
      return `<div class="cart-item"><img src="${BS.img(p.img)}" alt=""><div><small>${p.brand}</small><b>${p.name}</b><span>المقاس: ${i.s} · الكمية: ${i.q}</span><strong>${money(p.price * i.q)}</strong></div><button data-rm="${n}" aria-label="حذف">✕</button></div>`;
    }).join('') : '<p class="cart-empty">سلتك فارغة حالياً</p>';
  }
  window.addToCart = (id, s, q = 1) => {
    const p = BS.get(id);
    s = s || p.sizes[Math.floor(p.sizes.length / 2)];
    const found = cart.find(i => i.id === id && i.s == s);
    found ? (found.q += q) : cart.push({ id, s, q });
    save(); renderCart(); openCart();
  };
  const openCart = () => document.body.classList.add('cart-open');
  renderCart();

  // Toast
  const toast = document.createElement('div');
  toast.className = 'toast';
  document.body.appendChild(toast);
  let tt;
  window.say = msg => { toast.textContent = msg; toast.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('on'), 2600); };

  // Concept ribbon
  const n = document.body.dataset.concept;
  const rib = document.createElement('div');
  rib.className = 'concept-ribbon';
  rib.innerHTML = `<span>نموذج تصميم مقترح من <b>Flowpal</b> · المفهوم ${n} · ليس الموقع الرسمي</span><nav><a href="index.html">الرئيسية</a><a href="shop.html">قائمة المنتجات</a><a href="product.html">صفحة المنتج</a><a href="../index.html">كل المفاهيم</a></nav><button aria-label="إخفاء">✕</button>`;
  document.body.prepend(rib);
  rib.querySelector('button').onclick = () => rib.remove();
  if (window.self !== window.top) rib.remove();

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-cart-open],[data-cart-close],[data-rm],[data-add],[data-quick],[data-checkout],[data-menu-open],[data-menu-close],[data-fav],[data-toggle],[data-lang],[data-thumb],[data-qty],.size,.swatch,[data-search-open],[data-filters-open],[data-filters-close],[data-soon]');
    if (!t) return;
    if (t.matches('a[href="#"], button')) e.preventDefault();
    if (t.matches('[data-cart-open]')) { e.preventDefault(); openCart(); }
    else if (t.matches('[data-cart-close]')) document.body.classList.remove('cart-open');
    else if (t.matches('[data-rm]')) { cart.splice(+t.dataset.rm, 1); save(); renderCart(); }
    else if (t.matches('[data-quick]')) { e.preventDefault(); addToCart(t.dataset.quick); }
    else if (t.matches('[data-add]')) {
      const box = $('[data-sizes]');
      const s = box && $('.size.on', box);
      if (box && !s) { box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); say('اختر المقاس أولاً'); return; }
      const q = +($('[data-qty-val]')?.textContent || 1);
      addToCart(t.dataset.add || window.currentId, s && s.dataset.s, q);
    }
    else if (t.matches('[data-checkout]')) say('هذا نموذج تصميم. صفحة الدفع تُبنى في المرحلة التالية.');
    else if (t.matches('[data-menu-open]')) document.body.classList.add('menu-open');
    else if (t.matches('[data-menu-close]')) document.body.classList.remove('menu-open');
    else if (t.matches('[data-filters-open]')) document.body.classList.add('filters-open');
    else if (t.matches('[data-filters-close]')) document.body.classList.remove('filters-open');
    else if (t.matches('[data-fav]')) { e.preventDefault(); t.classList.toggle('on'); say(t.classList.contains('on') ? 'أُضيف إلى المفضلة' : 'أُزيل من المفضلة'); }
    else if (t.matches('[data-toggle]')) { e.preventDefault(); const g = t.dataset.toggle; if (g) $$(`[data-toggle="${g}"]`).forEach(x => x !== t && x.classList.remove('on')); t.classList.toggle('on'); }
    else if (t.matches('[data-lang]')) say('النسخة الإنجليزية (English) جزء من التنفيذ النهائي');
    else if (t.matches('[data-soon]')) { e.preventDefault(); say('متاح في التنفيذ النهائي للموقع'); }
    else if (t.matches('[data-search-open]')) $('[data-search]')?.focus();
    else if (t.matches('[data-thumb]')) {
      $$('[data-thumb]').forEach(x => x.classList.toggle('on', x === t));
      const m = $('[data-main]'); m.style.opacity = 0;
      setTimeout(() => { m.src = t.dataset.thumb; m.style.opacity = 1; }, 150);
    }
    else if (t.matches('[data-qty]')) { const v = $('[data-qty-val]'); v.textContent = Math.max(1, Math.min(9, +v.textContent + +t.dataset.qty)); }
    else if (t.matches('.size')) {
      if (t.classList.contains('na')) { say('هذا المقاس غير متوفر حالياً'); return; }
      $$('.size', t.parentNode).forEach(x => x.classList.toggle('on', x === t));
      const lbl = $('[data-size-label]'); if (lbl) lbl.textContent = t.dataset.s;
    }
    else if (t.matches('.swatch')) {
      $$('.swatch', t.parentNode).forEach(x => x.classList.toggle('on', x === t));
      const lbl = $('[data-color-label]'); if (lbl && t.title) lbl.textContent = t.title;
    }
  });

  // Countdown
  $$('[data-countdown]').forEach(el => {
    const end = Date.now() + (+el.dataset.countdown) * 3600e3;
    const tick = () => {
      let s = Math.max(0, Math.floor((end - Date.now()) / 1000));
      const parts = [Math.floor(s / 86400), Math.floor(s % 86400 / 3600), Math.floor(s % 3600 / 60), s % 60];
      $$('[data-cd]', el).forEach((b, i) => b.textContent = String(parts[i]).padStart(2, '0'));
    };
    tick(); setInterval(tick, 1000);
  });

  // Reveal on scroll
  const io = 'IntersectionObserver' in window && new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach(el => io ? io.observe(el) : el.classList.add('in'));
})();
