'use strict';
const $ = (id) => document.getElementById(id);
function mk(tag, props) { return Object.assign(document.createElement(tag), props || {}); }
let lots = [{ price: '', qty: '' }];
const state = () => ({ lots, cur: $('cur').value, pbuy: $('pbuy').value, tgt: $('tgt').value, qbuy: $('qbuy').value });
function save() { chrome.storage.local.set({ state: state() }); }

function renderLots() {
  const box = $('lots');
  box.replaceChildren();
  lots.forEach((l, i) => {
    const row = mk('div', { className: 'row', style: 'margin-top:4px' });
    const p = mk('input', { type: 'number', min: '0', step: 'any', placeholder: '산 가격', value: l.price });
    const q = mk('input', { type: 'number', min: '0', step: 'any', placeholder: '수량', value: l.qty });
    p.dataset.k = 'price'; q.dataset.k = 'qty';
    p.addEventListener('input', () => { l.price = p.value; refresh(); });
    q.addEventListener('input', () => { l.qty = q.value; refresh(); });
    const d = mk('button', { textContent: '×', title: '이 줄 삭제' });
    d.addEventListener('click', () => { lots.splice(i, 1); if (!lots.length) lots.push({ price: '', qty: '' }); renderLots(); refresh(); });
    row.append(p, q, d);
    box.append(row);
  });
}
function refresh() {
  const s = summary(lots, $('cur').value);
  const sum = $('sum'); sum.replaceChildren();
  if (!s) sum.append(mk('div', { className: 'muted', textContent: '매수 내역을 넣어 주세요.' }));
  else {
    sum.append(mk('div', { className: 'big', textContent: '평균 단가 ' + fmt(s.avg) }));
    sum.append(mk('div', { className: 'muted', textContent: '보유 ' + fmt(s.qty) + ' · 총 매수금액 ' + fmt(s.cost) }));
    if (s.rate !== undefined) sum.append(mk('div', { className: s.pl >= 0 ? 'plus' : 'minus',
      textContent: '평가손익 ' + (s.pl >= 0 ? '+' : '') + fmt(s.pl) + ' (' + (s.pl >= 0 ? '+' : '') + s.rate.toFixed(2) + '%)' }));
  }
  const plan = $('plan'); plan.replaceChildren();
  const lines = [];
  if ($('tgt').value) {
    const n = needQty(s, $('tgt').value, $('pbuy').value);
    if (n.error) lines.push([n.error, true]);
    else lines.push(['목표 평단 ' + fmt(Number($('tgt').value)) + '에 닿으려면 ' + fmt(n.qty) + '개(주)를 더 사야 합니다. 필요한 돈: ' + fmt(n.money), false]);
  }
  if ($('qbuy').value && $('pbuy').value) {
    const a = afterBuy(s, $('pbuy').value, $('qbuy').value);
    if (a) lines.push([fmt(Number($('qbuy').value)) + '개를 사면 평단은 ' + fmt(a.avg) + ', 보유 ' + fmt(a.qty) + '개가 됩니다.', false]);
  }
  if (!lines.length) lines.push(['추가 매수가와 목표 평단(또는 살 수량)을 넣으세요.', false]);
  for (const [t, err] of lines) plan.append(mk('div', { className: err ? 'msg err' : '', textContent: t }));
  save();
}
$('addLot').addEventListener('click', () => { lots.push({ price: '', qty: '' }); renderLots(); save(); });
$('reset').addEventListener('click', () => { lots = [{ price: '', qty: '' }]; for (const id of ['cur', 'pbuy', 'tgt', 'qbuy']) $(id).value = ''; renderLots(); refresh(); });
for (const id of ['cur', 'pbuy', 'tgt', 'qbuy']) $(id).addEventListener('input', refresh);
chrome.storage.local.get('state').then((d) => {
  const s = d.state;
  if (s && Array.isArray(s.lots) && s.lots.length) lots = s.lots;
  if (s) for (const id of ['cur', 'pbuy', 'tgt', 'qbuy']) $(id).value = s[id] || '';
  renderLots(); refresh();
});
