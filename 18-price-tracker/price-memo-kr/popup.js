'use strict';
const $ = (id) => document.getElementById(id);
function mk(tag, props) { return Object.assign(document.createElement(tag), props || {}); }
const won = (n) => n.toLocaleString('ko-KR') + '원';
const day = (t) => { const d = new Date(t); return (d.getMonth() + 1) + '/' + d.getDate(); };
function say(t, err) { $('msg').textContent = t; $('msg').className = 'msg' + (err ? ' err' : ''); }

async function render() {
  const { products = {} } = await chrome.storage.local.get('products');
  const list = $('list');
  list.replaceChildren();
  const arr = Object.values(products).sort((a, b) => b.history[b.history.length - 1].t - a.history[a.history.length - 1].t);
  $('empty').hidden = arr.length > 0;
  for (const p of arr) {
    const h = p.history;
    const cur = h[h.length - 1].price;
    const min = Math.min(...h.map((x) => x.price));
    const card = mk('div', { className: 'card' });
    card.append(mk('div', { textContent: p.title, style: 'font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }));
    const line = mk('div', { className: 'big', textContent: won(cur) });
    if (h.length > 1) {
      const prev = h[h.length - 2].price;
      const diff = cur - prev;
      if (diff !== 0) {
        const pct = Math.round((diff / prev) * 1000) / 10;
        line.append(mk('span', { className: diff > 0 ? 'plus' : 'minus', style: 'font-size:12px;margin-left:8px',
          textContent: (diff > 0 ? '▲ ' : '▼ ') + won(Math.abs(diff)) + ' (' + (diff > 0 ? '+' : '') + pct + '%)' }));
      }
    }
    card.append(line);
    card.append(mk('div', { className: 'muted', textContent: '최저 ' + won(min) + ' · 기록 ' + h.length + '번 · ' +
      h.slice(-4).map((x) => day(x.t) + ' ' + x.price.toLocaleString('ko-KR')).join(' → ') }));
    const row = mk('div', { className: 'row', style: 'margin-top:6px' });
    const open = mk('button', { textContent: '페이지 열기' });
    open.addEventListener('click', () => chrome.tabs.create({ url: p.url }));
    const del = mk('button', { textContent: '삭제', className: 'danger' });
    del.addEventListener('click', async () => {
      delete products[p.url];
      await chrome.storage.local.set({ products });
      render();
    });
    row.append(open, del);
    card.append(row);
    list.append(card);
  }
}
$('rec').addEventListener('click', async () => {
  const price = Number($('price').value);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return say('현재 탭 주소를 읽지 못했습니다. 페이지에서 확장 아이콘을 다시 눌러 주세요.', true);
  const res = await recordPrice(tab.url, tab.title, price);
  if (!res.ok) return say(res.reason, true);
  say('기록했습니다.');
  $('price').value = '';
  render();
});
render();
