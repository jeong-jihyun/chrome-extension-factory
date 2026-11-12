'use strict';
const $ = (id) => document.getElementById(id);
let items = [];
const blank = () => ({ name: '', price: '', amount: '', unit: 'g', count: '1' });

function mk(tag, props) { return Object.assign(document.createElement(tag), props || {}); }
async function persist() { await chrome.storage.local.set({ items }); }

function field(placeholder, key, i, type) {
  const inp = mk('input', { type: type || 'number', placeholder, value: items[i][key] });
  if (type !== 'text') { inp.min = '0'; inp.step = 'any'; inp.inputMode = 'decimal'; }
  inp.dataset.key = key;
  inp.addEventListener('input', () => { items[i][key] = inp.value; showResult(); persist(); });
  return inp;
}
function renderItems() {
  const box = $('items');
  box.replaceChildren();
  items.forEach((it, i) => {
    const wrap = mk('div', { className: 'card item' });
    const name = field('상품 이름 (선택)', 'name', i, 'text');
    name.classList.add('wide');
    const price = field('가격(원)', 'price', i);
    const amount = field('용량/수량', 'amount', i);
    const unit = mk('select');
    for (const u of Object.keys(UNITS)) unit.append(mk('option', { value: u, textContent: u, selected: it.unit === u }));
    unit.dataset.key = 'unit';
    unit.addEventListener('change', () => { items[i].unit = unit.value; showResult(); persist(); });
    const count = field('묶음 수', 'count', i);
    const del = mk('button', { textContent: '삭제', className: 'danger' });
    del.addEventListener('click', () => { items.splice(i, 1); if (!items.length) items.push(blank()); renderItems(); showResult(); persist(); });
    const r2 = mk('div', { className: 'row2' });
    r2.append(unit, count);
    wrap.append(name, price, amount, r2, del);
    box.append(wrap);
  });
}
function won(n) { return n >= 100 ? Math.round(n).toLocaleString('ko-KR') : n.toFixed(1); }
function showResult() {
  const res = $('result');
  res.replaceChildren();
  const rows = compare(items);
  const valid = rows.filter((r) => r.result);
  if (!valid.length) { res.append(mk('div', { className: 'muted', textContent: '숫자를 입력하면 결과가 나옵니다.' })); return; }
  const table = mk('table');
  const head = mk('tr');
  for (const h of ['상품', '기준', '단위가격']) head.append(mk('th', { textContent: h }));
  table.append(head);
  for (const r of valid) {
    const tr = mk('tr', { className: r.isBest ? 'best' : '' });
    tr.append(mk('td', { textContent: r.name + (r.isBest ? ' ★최저' : '') }),
      mk('td', { textContent: r.result.label }),
      mk('td', { textContent: won(r.result.value) + '원' }));
    table.append(tr);
  }
  res.append(table);
  const kinds = new Set(valid.map((r) => r.result.kind));
  if (kinds.size > 1) res.append(mk('div', { className: 'muted', textContent: '무게·부피·개수는 서로 비교할 수 없어 종류별로 따로 비교합니다.' }));
}
$('add').addEventListener('click', () => { items.push(blank()); renderItems(); persist(); });
$('reset').addEventListener('click', () => { items = [blank(), blank()]; renderItems(); showResult(); persist(); });
chrome.storage.local.get('items').then((d) => {
  items = Array.isArray(d.items) && d.items.length ? d.items : [blank(), blank()];
  renderItems(); showResult();
});
