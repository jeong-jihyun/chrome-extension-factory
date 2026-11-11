(function (root) {
  var DEFAULT_LIMITS = { titleMax: 30, descMin: 70, descMax: 90 };

  // 탭 안에서 실행되는 수집 함수(자체 완결이어야 함). 페이지 내용을 읽기만 하고 바꾸지 않습니다.
  function collectInPage() {
    function meta(sel) { var e = document.querySelector(sel); return e ? (e.getAttribute('content') || '').trim() : ''; }
    function attr(sel, a) { var e = document.querySelector(sel); return e ? (e.getAttribute(a) || '').trim() : ''; }
    var imgs = Array.prototype.slice.call(document.images);
    return {
      url: location.href,
      title: (document.title || '').trim(),
      description: meta('meta[name="description"]'),
      robots: meta('meta[name="robots"]'),
      canonical: attr('link[rel="canonical"]', 'href'),
      lang: (document.documentElement.getAttribute('lang') || '').trim(),
      viewport: meta('meta[name="viewport"]'),
      ogTitle: meta('meta[property="og:title"]'),
      ogDescription: meta('meta[property="og:description"]'),
      ogImage: meta('meta[property="og:image"]'),
      ogLocale: meta('meta[property="og:locale"]'),
      naverVerify: meta('meta[name="naver-site-verification"]'),
      googleVerify: meta('meta[name="google-site-verification"]'),
      h1: Array.prototype.map.call(document.querySelectorAll('h1'), function (h) { return (h.textContent || '').trim(); }),
      h2Count: document.querySelectorAll('h2').length,
      imgCount: imgs.length,
      imgNoAlt: imgs.filter(function (i) { return !i.hasAttribute('alt'); }).length,
      imgEmptyAlt: imgs.filter(function (i) { return i.hasAttribute('alt') && !i.getAttribute('alt').trim(); }).length
    };
  }

  function len(s) { return Array.from(s || '').length; }

  function analyze(d, limits) {
    var L = Object.assign({}, DEFAULT_LIMITS, limits || {});
    var out = [];
    function add(level, name, text) { out.push({ level: level, name: name, text: text }); }

    var tl = len(d.title);
    if (!tl) add('bad', '제목', '제목(title)이 없습니다.');
    else if (tl > L.titleMax) add('warn', '제목', tl + '자 — 기준(' + L.titleMax + '자)보다 길어 검색 결과에서 잘릴 수 있습니다.');
    else add('ok', '제목', tl + '자 — 적당합니다.');

    var dl = len(d.description);
    if (!dl) add('bad', '설명', '메타 설명(description)이 없습니다.');
    else if (dl < L.descMin) add('warn', '설명', dl + '자 — 기준(' + L.descMin + '~' + L.descMax + '자)보다 짧습니다.');
    else if (dl > L.descMax) add('warn', '설명', dl + '자 — 기준(' + L.descMin + '~' + L.descMax + '자)보다 길어 잘릴 수 있습니다.');
    else add('ok', '설명', dl + '자 — 적당합니다.');

    if (!d.canonical) add('warn', '대표 주소', 'canonical 주소가 없습니다. 같은 글이 여러 주소로 열리면 검색에서 분산될 수 있습니다.');
    else add('ok', '대표 주소', d.canonical);

    if (/noindex/i.test(d.robots || '')) add('bad', '검색 노출', 'robots 에 noindex 가 있어 검색에 나오지 않습니다.');
    else add('ok', '검색 노출', d.robots ? 'robots: ' + d.robots : '막는 설정이 없습니다.');

    if (!d.lang) add('warn', '언어', 'html lang 이 없습니다. 한국어 글이면 lang="ko" 를 권장합니다.');
    else if (!/^ko/i.test(d.lang)) add('warn', '언어', 'lang="' + d.lang + '" — 한국어 글이라면 ko 가 맞는지 확인하세요.');
    else add('ok', '언어', 'lang="' + d.lang + '"');

    if (!d.viewport) add('warn', '모바일', 'viewport 설정이 없어 모바일 화면에서 작게 보일 수 있습니다.');
    else add('ok', '모바일', 'viewport 설정이 있습니다.');

    var h1n = (d.h1 || []).length;
    if (h1n === 0) add('warn', 'H1', 'H1 제목이 없습니다.');
    else if (h1n > 1) add('warn', 'H1', 'H1 이 ' + h1n + '개입니다. 보통 1개를 권장합니다.');
    else add('ok', 'H1', '1개 — ' + d.h1[0].slice(0, 40));

    if (!d.ogTitle || !d.ogImage) {
      var miss = [!d.ogTitle ? 'og:title' : '', !d.ogImage ? 'og:image' : ''].filter(Boolean).join(', ');
      add('warn', '공유 미리보기', miss + ' 가 없습니다. 카카오톡·SNS 에 링크를 올릴 때 미리보기가 빈약할 수 있습니다.');
    } else add('ok', '공유 미리보기', 'og:title, og:image 가 있습니다.');

    if (d.imgCount) {
      var bad = d.imgNoAlt + d.imgEmptyAlt;
      if (d.imgNoAlt) add('warn', '이미지 alt', '이미지 ' + d.imgCount + '개 중 alt 속성이 없는 것 ' + d.imgNoAlt + '개' + (d.imgEmptyAlt ? ', 비어 있는 것 ' + d.imgEmptyAlt + '개' : '') + '. (꾸밈용 이미지는 빈 alt 가 맞을 수 있습니다.)');
      else if (d.imgEmptyAlt) add('ok', '이미지 alt', '이미지 ' + d.imgCount + '개, alt 가 비어 있는 것 ' + d.imgEmptyAlt + '개 (꾸밈용이면 정상).');
      else add('ok', '이미지 alt', '이미지 ' + d.imgCount + '개 모두 alt 가 있습니다.');
    } else add('ok', '이미지 alt', '이미지가 없습니다.');

    add(d.naverVerify ? 'ok' : 'warn', '네이버 서치어드바이저', d.naverVerify ? '소유확인 태그가 있습니다.' : '소유확인 메타 태그는 없습니다. (HTML 파일이나 DNS 방식으로 확인했다면 무시해도 됩니다.)');
    return out;
  }

  function clip(s, n) { var a = Array.from(s || ''); return a.length > n ? a.slice(0, n).join('') + '…' : a.join(''); }

  function preview(d) {
    return { title: clip(d.title || '(제목 없음)', 40), url: d.url || '', description: clip(d.description || '(설명 없음)', 100) };
  }

  var api = { DEFAULT_LIMITS: DEFAULT_LIMITS, collectInPage: collectInPage, analyze: analyze, preview: preview };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SeoCore = api;
})(typeof self !== 'undefined' ? self : this);
