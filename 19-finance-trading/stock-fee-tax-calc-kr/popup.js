'use strict';
const $ = (id) => document.getElementById(id);
function mk(tag, props) { return Object.assign(document.createElement(tag), props || {}); }
const IDS = ['market', 'buy', 'sell', 'qty', 'feeBuy', 'feeSell', 'tax'];
const DEFAULTS = { market: 'kospi', buy: '', sell: '', qty: '', feeBuy: '0.015', feeSell: '0.015', tax: '0.2' };
const won = (n) => Math.round(n).toLocaleString('ko-KR') + '원';

function read() { const v = {}; for (const id of IDS) v[id] = $(id).value; return v; }
function show() {
  const v = read();
  const res = $('result');
  res.replaceChildren();
  const r = calc({ buy: v.buy, sell: v.sell, qty: v.qty, feeBuy: v.feeBuy, feeSell: v.feeSell, tax: v.tax });
  if (!r) { res.append(mk('div', { className: 'muted', textContent: '매수가·매도가·수량을 넣어 주세요. (수수료+세금은 100% 미만)' })); return; }
  const head = mk('div', { className: 'big ' + (r.net > 0 ? 'plus' : r.net < 0 ? 'minus' : ''),
    textContent: (r.net > 0 ? '+' : '') + won(r.net) + ' (' + (r.net > 0 ? '+' : '') + r.rate.toFixed(2) + '%)' });
  res.append(head, mk('div', { className: 'muted', textContent: '실제로 손에 남는 순손익입니다.' }));
  const t = mk('table');
  const rows = [['매수 금액', r.buyAmt], ['매수 수수료', r.buyFee], ['매도 금액', r.sellAmt], ['매도 수수료', r.sellFee], ['거래세 등 세금', r.tax],
    ['수수료·세금 전 손익', r.gross], ['손익분기 매도가', r.breakEven]];
  for (const [k, n] of rows) {
    const tr = mk('tr');
    tr.append(mk('td', { textContent: k }), mk('td', { textContent: won(n) }));
    t.append(tr);
  }
  res.append(t);
}
function save() { chrome.storage.local.set({ form: read() }); }
for (const m of Object.keys(MARKETS)) $('market').append(mk('option', { value: m, textContent: MARKETS[m].label }));
$('market').addEventListener('change', () => {
  const t = MARKETS[$('market').value].tax;
  if (t !== null) $('tax').value = String(t);
  show(); save();
});
for (const id of IDS.filter((x) => x !== 'market')) $(id).addEventListener('input', () => {
  if (id === 'tax' && MARKETS[$('market').value].tax !== null && Number($('tax').value) !== MARKETS[$('market').value].tax) $('market').value = 'custom';
  show(); save();
});
chrome.storage.local.get('form').then((d) => {
  const f = Object.assign({}, DEFAULTS, d.form || {});
  for (const id of IDS) $(id).value = f[id];
  show();
});
