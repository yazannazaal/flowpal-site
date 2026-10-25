// Concept 3 product: "bought together" bundle
(() => {
  const items = BS.pick(['moab3-mid', 'bonno-fleece', 'backpack']);
  const total = items.reduce((s, p) => s + p.price, 0), old = items.reduce((s, p) => s + (p.old || p.price), 0);
  document.querySelector('[data-bundle]').innerHTML = items.map((p, i) => `
    ${i ? '<span class="bundle-plus">+</span>' : ''}
    <div class="bundle-item"><img src="${BS.img(p.img)}" alt=""><label><input type="checkbox" checked>${p.name}</label><b>${money(p.price)}</b></div>`).join('') + `
    <div class="bundle-total"><small>السعر للثلاثة</small><b>${money(total - 30)}</b><em>وفّرت ${money(old - total + 30)} مع خصم الباقة</em><button class="btn btn-amber" onclick="${items.map(p => `addToCart('${p.id}')`).join(';')}">أضف الثلاثة للسلة</button></div>`;
})();
