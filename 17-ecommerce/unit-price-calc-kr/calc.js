'use strict';
// 단위를 비교 기준으로 바꿉니다. base: 기준 단위로 환산한 값, label: 표시 기준
const UNITS = {
  g: { kind: 'weight', factor: 1 },
  kg: { kind: 'weight', factor: 1000 },
  ml: { kind: 'volume', factor: 1 },
  L: { kind: 'volume', factor: 1000 },
  '개': { kind: 'count', factor: 1 },
  '장': { kind: 'count', factor: 1 },
  m: { kind: 'length', factor: 1 }
};
const KINDS = {
  weight: { per: 100, label: '100g당' },
  volume: { per: 100, label: '100ml당' },
  count: { per: 1, label: '1개(장)당' },
  length: { per: 1, label: '1m당' }
};
// price: 총 가격(원), amount: 한 묶음 용량, count: 묶음 수(기본 1)
function unitPrice(item) {
  const u = UNITS[item.unit];
  const price = Number(item.price), amount = Number(item.amount), count = Number(item.count || 1);
  if (!u || !(price > 0) || !(amount > 0) || !(count > 0)) return null;
  const total = amount * u.factor * count;
  const k = KINDS[u.kind];
  return { kind: u.kind, label: k.label, value: (price / total) * k.per };
}
function compare(items) {
  const rows = items.map((it, i) => ({ index: i, name: it.name || '상품 ' + (i + 1), result: unitPrice(it) }));
  const best = {};
  for (const r of rows) {
    if (!r.result) continue;
    const cur = best[r.result.kind];
    if (cur === undefined || r.result.value < rows[cur].result.value) best[r.result.kind] = r.index;
  }
  for (const r of rows) r.isBest = !!r.result && best[r.result.kind] === r.index &&
    rows.filter((x) => x.result && x.result.kind === r.result.kind).length > 1;
  return rows;
}
if (typeof module !== 'undefined') module.exports = { unitPrice, compare };
