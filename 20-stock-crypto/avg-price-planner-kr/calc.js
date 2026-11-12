'use strict';
function summary(lots, current) {
  let qty = 0, cost = 0;
  for (const l of lots) {
    const p = Number(l.price), q = Number(l.qty);
    if (p > 0 && q > 0) { qty += q; cost += p * q; }
  }
  if (qty <= 0) return null;
  const avg = cost / qty;
  const cur = Number(current);
  const out = { qty, cost, avg };
  if (cur > 0) { out.value = cur * qty; out.pl = out.value - cost; out.rate = out.pl / cost * 100; }
  return out;
}
// 목표 평단 target을 맞추려면 buyPrice에 몇 개를 더 사야 하는가
function needQty(s, target, buyPrice) {
  const T = Number(target), p = Number(buyPrice);
  if (!s || !(T > 0) || !(p > 0)) return { error: '목표 평단과 추가 매수가를 넣어 주세요.' };
  if (T >= s.avg) return { error: '목표 평단은 지금 평단(' + fmt(s.avg) + ')보다 낮아야 합니다.' };
  if (p >= T) return { error: '추가 매수가가 목표 평단보다 낮아야 목표에 닿을 수 있습니다.' };
  const x = (s.cost - T * s.qty) / (T - p);
  const q = Math.ceil(x * 1e8) / 1e8; // 코인 소수 수량을 위해 소수 8자리 올림
  return { qty: q, money: q * p, newAvg: (s.cost + q * p) / (s.qty + q) };
}
function afterBuy(s, price, qty) {
  const p = Number(price), q = Number(qty);
  if (!s || !(p > 0) || !(q > 0)) return null;
  return { qty: s.qty + q, avg: (s.cost + p * q) / (s.qty + q), money: p * q };
}
function fmt(n) { return Number.isInteger(n) ? n.toLocaleString('ko-KR') : n.toLocaleString('ko-KR', { maximumFractionDigits: 4 }); }
if (typeof module !== 'undefined') module.exports = { summary, needQty, afterBuy, fmt };
