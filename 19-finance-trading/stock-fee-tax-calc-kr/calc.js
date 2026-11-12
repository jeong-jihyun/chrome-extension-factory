'use strict';
// 세율(%)은 2026년 1월 이후 매도분 기준 참고값입니다. 반드시 공식 자료로 확인하고 필요하면 고쳐 쓰세요.
const MARKETS = {
  kospi: { label: '코스피 (거래세 0.05% + 농어촌특별세 0.15%)', tax: 0.20 },
  kosdaq: { label: '코스닥 (거래세 0.20%)', tax: 0.20 },
  none: { label: '세금 없음 (면세 상품 확인 시)', tax: 0 },
  custom: { label: '직접 입력', tax: null }
};
function calc(i) {
  const buy = Number(i.buy), sell = Number(i.sell), qty = Number(i.qty);
  const fb = Number(i.feeBuy || 0) / 100, fs = Number(i.feeSell || 0) / 100, tx = Number(i.tax || 0) / 100;
  if (!(buy > 0) || !(sell > 0) || !(qty > 0)) return null;
  if (fb < 0 || fs < 0 || tx < 0 || fs + tx >= 1) return null;
  const buyAmt = buy * qty, sellAmt = sell * qty;
  // 증권사는 원 단위 미만을 버립니다(절사).
  const buyFee = Math.floor(buyAmt * fb);
  const sellFee = Math.floor(sellAmt * fs);
  const tax = Math.floor(sellAmt * tx);
  const cost = buyAmt + buyFee;
  const net = sellAmt - sellFee - tax - cost;
  const breakEven = Math.ceil(cost / (qty * (1 - fs - tx)));
  return { buyAmt, buyFee, sellAmt, sellFee, tax, cost, net, rate: net / cost * 100, breakEven,
    gross: sellAmt - buyAmt };
}
if (typeof module !== 'undefined') module.exports = { calc, MARKETS };
