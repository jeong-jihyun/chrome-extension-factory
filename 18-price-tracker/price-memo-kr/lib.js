'use strict';
// 선택한 글에서 원 단위 가격을 찾습니다. 예: "29,900원", "₩ 1,250,000", "할인가 9900"
function parsePrice(text) {
  if (typeof text !== 'string') return null;
  const m = text.match(/\d{1,3}(?:,\d{3})+|\d+/g);
  if (!m) return null;
  const nums = m.map((s) => Number(s.replace(/,/g, ''))).filter((n) => n > 0 && n < 1e10);
  // 여러 숫자면 가장 먼저 나온 것을 가격으로 봅니다.
  return nums.length ? nums[0] : null;
}
// 주소에서 추적용 값과 #부분을 빼서 같은 상품이 한 줄로 모이게 합니다.
function cleanUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    u.hash = '';
    for (const k of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|n_media|n_query|n_rank|n_ad_group|NaPm)/i.test(k)) u.searchParams.delete(k);
    }
    return u.toString();
  } catch (e) { return null; }
}
async function recordPrice(url, title, price, now) {
  const key = cleanUrl(url);
  if (!key) return { ok: false, reason: '이 페이지는 기록할 수 없습니다.' };
  if (!(price > 0)) return { ok: false, reason: '가격 숫자를 찾지 못했습니다.' };
  const data = await chrome.storage.local.get('products');
  const products = data.products && typeof data.products === 'object' ? data.products : {};
  const p = products[key] || { url: key, title: (title || key).slice(0, 120), history: [] };
  if (title) p.title = title.slice(0, 120);
  const last = p.history[p.history.length - 1];
  const t = now || Date.now();
  // 같은 가격을 같은 날 또 기록하면 중복으로 쌓지 않습니다.
  if (!(last && last.price === price && new Date(last.t).toDateString() === new Date(t).toDateString())) {
    p.history.push({ t, price });
    if (p.history.length > 200) p.history.shift();
  }
  products[key] = p;
  await chrome.storage.local.set({ products });
  return { ok: true, product: p, prev: last ? last.price : null };
}
if (typeof module !== 'undefined') module.exports = { parsePrice, cleanUrl };
