// Concept 2 home: trending rank + lookbook list
document.querySelector('[data-trend]').innerHTML = BS.pick(['handball-spezial', 'nb530', 'airmax-women', 'agility-peak6']).map((p, i) => `
  <a class="trend-card" href="product.html?id=${p.id}">
    <div class="tm"><img src="${BS.img(p.img)}" alt="${p.name}" loading="lazy"><span class="trend-n">0${i + 1}</span>
      <div class="trend-meta"><span>${BS.ic('fire', 13, 2)} ${[312, 248, 196, 151][i]} طلب هالشهر</span></div></div>
    <div class="trend-b"><div><small>${p.brand}</small><h3>${p.name}</h3></div><b>${money(p.price)}</b></div>
  </a>`).join('');
document.querySelector('[data-look]').innerHTML = BS.pick(['nb530', 'velociti-jacket', 'backpack']).map(p => `
  <a class="look-item" href="product.html?id=${p.id}"><img src="${BS.img(p.img)}" alt=""><div><small>${p.brand}</small><b>${p.name}</b></div><span>${money(p.price)}</span></a>`).join('');
