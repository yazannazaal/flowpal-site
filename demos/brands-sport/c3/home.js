// Concept 3 home: flash deals with stock bars
document.querySelector('[data-flash]').innerHTML = BS.pick(['moab3-mid', 'slade-ronan', 'hillcrest-cedar', 'agility-peak6', 'gorun-consistent3']).map((p, i) => {
  const left = [2, 5, 3, 7, 4][i], sold = [86, 64, 78, 52, 70][i];
  return window.card(p).replace('<button class="card-btn"', `<div class="stockbar">باقي ${left} قطع فقط · انباع ${sold}٪<i style="--s:${sold}%"></i></div><button class="card-btn"`);
}).join('');
