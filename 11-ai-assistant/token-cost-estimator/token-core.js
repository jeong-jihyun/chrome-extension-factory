// 토큰 수를 "어림"하는 순수 계산 코드. 실제 토크나이저가 아니라 글자 종류별 비율로 추정합니다.
(function (root) {
  var DEFAULTS = { hangul: 1.5, latin: 0.25, other: 0.6, inPrice: 0, outPrice: 0, outTokens: 500, ctx: 128000, unit: '원' };

  function classify(ch) {
    var c = ch.codePointAt(0);
    if ((c >= 0xAC00 && c <= 0xD7A3) || (c >= 0x1100 && c <= 0x11FF) || (c >= 0x3130 && c <= 0x318F)) return 'hangul';
    if (c <= 0x7F) return /\s/.test(ch) ? 'space' : 'latin';
    return 'other';
  }

  function estimate(text, f) {
    f = Object.assign({}, DEFAULTS, f || {});
    var count = { hangul: 0, latin: 0, other: 0, space: 0 };
    var chars = 0;
    for (var ch of String(text || '')) { count[classify(ch)]++; chars++; }
    // 공백은 앞뒤 낱말에 붙어 세어지므로 영문 비율의 절반만 반영
    var tokens = count.hangul * f.hangul + count.latin * f.latin + count.other * f.other + count.space * f.latin * 0.5;
    return { chars: chars, hangul: count.hangul, latin: count.latin, other: count.other, space: count.space, tokens: Math.ceil(tokens) };
  }

  function cost(tokens, pricePerMillion) {
    var p = Number(pricePerMillion);
    if (!isFinite(p) || p <= 0) return 0;
    return tokens / 1e6 * p;
  }

  function summarize(text, f) {
    f = Object.assign({}, DEFAULTS, f || {});
    var e = estimate(text, f);
    var outTokens = Math.max(0, Number(f.outTokens) || 0);
    var inCost = cost(e.tokens, f.inPrice);
    var outCost = cost(outTokens, f.outPrice);
    var ctx = Number(f.ctx) || 0;
    return {
      chars: e.chars, tokens: e.tokens, outTokens: outTokens,
      inCost: inCost, outCost: outCost, total: inCost + outCost,
      ctxPercent: ctx > 0 ? (e.tokens + outTokens) / ctx * 100 : null
    };
  }

  function fmtMoney(n) {
    if (n === 0) return '0';
    if (n < 1) return n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
    return n.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  }

  var api = { DEFAULTS: DEFAULTS, estimate: estimate, cost: cost, summarize: summarize, fmtMoney: fmtMoney };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TokenCore = api;
})(typeof self !== 'undefined' ? self : this);
