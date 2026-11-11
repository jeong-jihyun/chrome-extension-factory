(function (root) {
  var PRESETS = [
    { name: '네이버 블로그', source: 'naver_blog', medium: 'social' },
    { name: '네이버 카페', source: 'naver_cafe', medium: 'social' },
    { name: '카카오톡 공유', source: 'kakaotalk', medium: 'messenger' },
    { name: '카카오 채널 메시지', source: 'kakao_channel', medium: 'crm' },
    { name: '인스타그램', source: 'instagram', medium: 'social' },
    { name: '유튜브 설명란', source: 'youtube', medium: 'video' },
    { name: '뉴스레터', source: 'newsletter', medium: 'email' },
    { name: '네이버 검색광고', source: 'naver', medium: 'cpc' }
  ];
  var KEYS = ['source', 'medium', 'campaign', 'term', 'content'];

  function clean(v, opts) {
    v = String(v == null ? '' : v).trim();
    if (opts && opts.lowerSnake) v = v.toLowerCase().replace(/\s+/g, '_');
    return v;
  }

  // base: 주소 문자열, params: {source, medium, campaign, term, content}
  function build(base, params, opts) {
    var u;
    try { u = new URL(String(base || '').trim()); } catch (e) { return { error: '올바른 주소가 아닙니다. https:// 로 시작하는 주소를 넣어 주세요.' }; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return { error: '웹 주소(http, https)만 지원합니다.' };
    var s = clean(params.source, opts), m = clean(params.medium, opts), c = clean(params.campaign, opts);
    var missing = [];
    if (!s) missing.push('source(채널)');
    if (!m) missing.push('medium(방식)');
    if (!c) missing.push('campaign(캠페인 이름)');
    if (missing.length) return { error: '꼭 필요한 칸이 비었습니다: ' + missing.join(', ') };
    var replaced = [];
    KEYS.forEach(function (k) { if (u.searchParams.has('utm_' + k)) { replaced.push('utm_' + k); u.searchParams.delete('utm_' + k); } });
    KEYS.forEach(function (k) {
      var v = clean(params[k], opts);
      if (v) u.searchParams.set('utm_' + k, v);
    });
    return { url: u.toString(), replaced: replaced };
  }

  var api = { PRESETS: PRESETS, KEYS: KEYS, build: build };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.UtmCore = api;
})(typeof self !== 'undefined' ? self : this);
