// 한글 읽기 모드 - 페이지 안에서 실행되는 코드
// 팝업이 누를 때마다 주입합니다. 여러 번 주입되어도 한 번만 정의됩니다.
(() => {
  if (window.__hangulReader) return;

  const HOST_ID = 'hangul-reader-host';
  const MAX_ELEMENTS = 6000; // 아주 큰 페이지에서 멈추지 않게 하는 상한
  const READ_CHARS_PER_MIN = 500; // 한국어 묵독 속도 어림값(분당 글자 수)

  const THEMES = {
    light: { bg: '#ffffff', fg: '#1f2328', sub: '#6b7280', link: '#0b57d0', line: '#e5e7eb', quote: '#f3f4f6' },
    sepia: { bg: '#f6efe0', fg: '#3b3226', sub: '#7a6a55', link: '#8a4b08', line: '#e3d7bf', quote: '#efe5cf' },
    dark: { bg: '#16181d', fg: '#e6e6e6', sub: '#9aa0a6', link: '#8ab4f8', line: '#2d3138', quote: '#1f232a' }
  };
  const FONTS = {
    sans: '"Pretendard","Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif',
    serif: '"Noto Serif KR","Nanum Myeongjo","AppleMyungjo","Batang",serif'
  };
  const DEFAULTS = { fontSize: 19, lineHeight: 1.9, width: 720, theme: 'light', font: 'sans' };

  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'NAV', 'ASIDE', 'FOOTER', 'FORM', 'BUTTON', 'IFRAME', 'SVG',
    'INPUT', 'SELECT', 'TEXTAREA', 'CANVAS', 'VIDEO', 'AUDIO', 'OBJECT', 'EMBED', 'DIALOG', 'TEMPLATE', 'LINK', 'META']);
  const KEEP = new Set(['H1', 'H2', 'H3', 'H4', 'P', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'FIGURE', 'FIGCAPTION',
    'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'HR']);
  const INLINE = new Set(['A', 'STRONG', 'B', 'EM', 'I', 'CODE', 'BR', 'SUB', 'SUP', 'MARK', 'U']);
  const BLOCKS = new Set(['DIV', 'SECTION', 'ARTICLE', 'MAIN', 'P', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'TABLE', 'BLOCKQUOTE', 'PRE', 'FIGURE', 'HR', 'HEADER']);
  // 이름이 정확히 이 낱말일 때만 잡음으로 봅니다(예: "comment", "sidebar"). 부분 일치는 쓰지 않습니다.
  const NOISE_TOKENS = new Set(['comment', 'comments', 'sidebar', 'advert', 'ads', 'ad', 'promo', 'related', 'share',
    'social', 'footer', 'cookie', 'popup', 'modal', 'newsletter', 'subscribe', 'breadcrumb', 'breadcrumbs', 'widget']);

  const state = { host: null, prevOverflow: '', onKey: null, settings: { ...DEFAULTS } };

  const textLen = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim().length;

  function hasNoiseToken(el) {
    if (el === document.body || el === document.documentElement) return false;
    const tokens = String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '')
      .toLowerCase().split(/\s+/);
    if (el.id) tokens.push(String(el.id).toLowerCase());
    return tokens.some((t) => NOISE_TOKENS.has(t));
  }

  function isHidden(el) {
    if (el.hidden || el.getAttribute('aria-hidden') === 'true') return true;
    const cs = getComputedStyle(el);
    return cs.display === 'none' || cs.visibility === 'hidden';
  }

  function inNoise(el, stopAt) {
    for (let e = el; e && e !== stopAt && e !== document.body; e = e.parentElement) {
      if (SKIP.has(e.tagName.toUpperCase()) || hasNoiseToken(e)) return true;
    }
    return false;
  }

  // 본문이 들어 있을 만한 요소를 점수로 고릅니다. (문단 길이가 긴 곳, 링크가 적은 곳)
  function findMainElement() {
    const scores = new Map();
    for (const p of document.querySelectorAll('p, pre, blockquote, div')) {
      if (p.tagName === 'DIV' && [...p.children].some((c) => BLOCKS.has(c.tagName))) continue; // 글자만 직접 가진 div만
      const len = textLen(p);
      if (len < 25 || inNoise(p, null)) continue;
      let linkLen = 0;
      p.querySelectorAll('a').forEach((a) => { linkLen += textLen(a); });
      const score = Math.max(0, len - linkLen * 1.5) + Math.min(len / 100, 3) * 10;
      let el = p.parentElement;
      for (let level = 0; el && el !== document.body && level < 3; level++, el = el.parentElement) {
        scores.set(el, (scores.get(el) || 0) + score / (level === 0 ? 1 : level * 2));
      }
    }
    let best = null;
    let bestScore = 0;
    for (const [el, s] of scores) {
      if (s > bestScore) { best = el; bestScore = s; }
    }
    if (best) {
      const art = best.closest('article');
      if (art && textLen(art) < textLen(best) * 2.5) best = art;
    }
    return best;
  }

  function safeUrl(raw) {
    try {
      const u = new URL(raw, location.href);
      return /^https?:$/.test(u.protocol) ? u.href : '';
    } catch (e) {
      return '';
    }
  }

  function addImage(img, out) {
    let src = img.currentSrc || img.getAttribute('src') || img.dataset.src || img.dataset.lazySrc || '';
    if (/^data:image\//i.test(src)) {
      // 인라인 그림은 그대로 허용
    } else {
      src = safeUrl(src);
    }
    if (!src) return;
    if (img.naturalWidth && img.naturalWidth < 80) return; // 아이콘·추적용 작은 그림은 뺍니다
    const el = document.createElement('img');
    el.src = src;
    el.alt = img.alt || '';
    el.loading = 'lazy';
    out.appendChild(el);
  }

  function build(src, out, ctx) {
    for (const node of src.childNodes) {
      if (ctx.count++ > MAX_ELEMENTS) return;
      if (node.nodeType === 3) {
        out.appendChild(document.createTextNode(node.nodeValue));
        continue;
      }
      if (node.nodeType !== 1) continue;
      const tag = node.tagName.toUpperCase();
      if (SKIP.has(tag) || hasNoiseToken(node) || isHidden(node)) continue;
      if (tag === 'IMG') { addImage(node, out); continue; }
      if (tag === 'PICTURE') { const im = node.querySelector('img'); if (im) addImage(im, out); continue; }
      if (tag === 'H1' && ctx.title && node.textContent.trim() === ctx.title) continue; // 제목은 위에서 따로 보여 줍니다
      if (KEEP.has(tag) || INLINE.has(tag)) {
        const el = document.createElement(tag.toLowerCase());
        if (tag === 'A') {
          const href = safeUrl(node.getAttribute('href') || '');
          if (href) { el.href = href; el.target = '_blank'; el.rel = 'noopener noreferrer'; }
        }
        build(node, el, ctx);
        if (el.querySelector('img') || el.textContent.trim() || tag === 'BR' || tag === 'HR') out.appendChild(el);
      } else if (BLOCKS.has(tag) || tag === 'CENTER') {
        // div·section 등: 안에 블록이 없고 글자만 있으면 한 문단으로 묶고, 아니면 펼쳐서 안쪽을 처리
        const hasBlockChild = [...node.children].some((c) => BLOCKS.has(c.tagName.toUpperCase()));
        if (!hasBlockChild && node.textContent.trim()) {
          const p = document.createElement('p');
          build(node, p, ctx);
          if (p.textContent.trim() || p.querySelector('img')) out.appendChild(p);
        } else {
          build(node, out, ctx);
        }
      } else {
        build(node, out, ctx); // span 등은 펼쳐서 글자만 남깁니다
      }
    }
  }

  function applySettings(s) {
    state.settings = { ...DEFAULTS, ...s };
    const host = state.host;
    if (!host) return;
    const t = THEMES[state.settings.theme] || THEMES.light;
    const set = (k, v) => host.style.setProperty(k, v);
    set('--fs', state.settings.fontSize + 'px');
    set('--lh', String(state.settings.lineHeight));
    set('--w', state.settings.width + 'px');
    set('--ff', FONTS[state.settings.font] || FONTS.sans);
    set('--bg', t.bg); set('--fg', t.fg); set('--sub', t.sub); set('--link', t.link);
    set('--line', t.line); set('--quote', t.quote);
  }

  function close() {
    if (state.host) state.host.remove();
    state.host = null;
    document.documentElement.style.overflow = state.prevOverflow;
    if (state.onKey) window.removeEventListener('keydown', state.onKey, true);
    state.onKey = null;
  }

  const CSS = `
    :host { all: initial; }
    .wrap { position: fixed; inset: 0; z-index: 2147483647; overflow-y: auto; background: var(--bg); color: var(--fg);
      font-family: var(--ff); font-size: var(--fs); line-height: var(--lh); }
    .progress { position: sticky; top: 0; height: 3px; background: transparent; z-index: 2; }
    .progress i { display: block; height: 100%; width: 0; background: var(--link); }
    .bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; max-width: var(--w); margin: 0 auto;
      padding: 14px 20px; font-size: 13px; line-height: 1.4; color: var(--sub); }
    .bar button { font: inherit; color: var(--fg); background: transparent; border: 1px solid var(--line); border-radius: 6px;
      padding: 4px 10px; cursor: pointer; }
    .bar button:hover { border-color: var(--link); }
    .page { max-width: var(--w); margin: 0 auto; padding: 8px 20px 120px; }
    h1.title { font-size: 1.7em; line-height: 1.35; margin: 0.4em 0 0.3em; word-break: keep-all; }
    .meta { color: var(--sub); font-size: 13px; line-height: 1.5; margin-bottom: 1.6em; padding-bottom: 1em; border-bottom: 1px solid var(--line); }
    .meta a { color: var(--link); }
    .body { word-break: keep-all; overflow-wrap: break-word; }
    .body p { margin: 0 0 1.1em; }
    .body h1, .body h2, .body h3, .body h4 { line-height: 1.4; margin: 1.6em 0 0.6em; }
    .body a { color: var(--link); }
    .body img { max-width: 100%; height: auto; display: block; margin: 1.2em auto; border-radius: 4px; }
    .body blockquote { margin: 1.2em 0; padding: 0.4em 1em; background: var(--quote); border-left: 3px solid var(--line); }
    .body pre { overflow-x: auto; background: var(--quote); padding: 0.8em 1em; border-radius: 6px; font-size: 0.85em; line-height: 1.5; }
    .body code { font-family: ui-monospace, Consolas, monospace; font-size: 0.9em; }
    .body table { border-collapse: collapse; max-width: 100%; display: block; overflow-x: auto; margin: 1em 0; }
    .body th, .body td { border: 1px solid var(--line); padding: 4px 8px; font-size: 0.9em; line-height: 1.5; }
    .body hr { border: 0; border-top: 1px solid var(--line); margin: 2em 0; }
    .body li { margin-bottom: 0.3em; }
    .empty { color: var(--sub); text-align: center; padding: 80px 0; }
  `;

  function open(settings) {
    const root = findMainElement();
    const h1 = (root && root.querySelector('h1')) || document.querySelector('h1');
    const title = ((h1 && h1.textContent.trim()) || document.title || '').trim();

    const body = document.createElement('article');
    body.className = 'body';
    if (root) build(root, body, { count: 0, title });
    const chars = (body.textContent || '').replace(/\s+/g, '').length;
    const found = chars >= 150;

    const host = document.createElement('div');
    host.id = HOST_ID;
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = CSS;
    shadow.appendChild(style);

    const wrap = document.createElement('div');
    wrap.className = 'wrap';
    wrap.tabIndex = -1;

    const prog = document.createElement('div');
    prog.className = 'progress';
    prog.appendChild(document.createElement('i'));

    const bar = document.createElement('div');
    bar.className = 'bar';
    const site = document.createElement('span');
    site.textContent = location.hostname;
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = '닫기 (Esc)';
    closeBtn.addEventListener('click', close);
    bar.append(site, closeBtn);

    const page = document.createElement('main');
    page.className = 'page';
    if (found) {
      const h = document.createElement('h1');
      h.className = 'title';
      h.textContent = title;
      const meta = document.createElement('div');
      meta.className = 'meta';
      const minutes = Math.max(1, Math.round(chars / READ_CHARS_PER_MIN));
      meta.append(`약 ${minutes}분 읽기 · ${chars.toLocaleString('ko-KR')}자 · 원문: `);
      const orig = document.createElement('a');
      orig.textContent = location.hostname;
      orig.href = location.href;
      orig.target = '_blank';
      orig.rel = 'noopener noreferrer';
      meta.appendChild(orig);
      page.append(h, meta, body);
    } else {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = '이 페이지에서 읽을 만한 긴 글을 찾지 못했습니다. 로그인 후 보이는 글이나 앱처럼 만든 페이지는 지원하지 않을 수 있습니다.';
      page.appendChild(empty);
    }

    wrap.append(prog, bar, page);
    wrap.addEventListener('scroll', () => {
      const max = wrap.scrollHeight - wrap.clientHeight;
      prog.firstChild.style.width = (max > 0 ? Math.min(100, (wrap.scrollTop / max) * 100) : 0) + '%';
    });
    shadow.appendChild(wrap);

    state.host = host;
    state.prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    applySettings(settings);
    document.documentElement.appendChild(host);
    wrap.focus();

    state.onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
    };
    window.addEventListener('keydown', state.onKey, true);
    return { ok: true, found, chars };
  }

  window.__hangulReader = {
    isOpen: () => !!state.host,
    toggle(settings) {
      if (state.host) { close(); return { ok: true, open: false }; }
      const r = open(settings);
      return { ok: true, open: true, found: r.found, chars: r.chars };
    },
    update(settings) { applySettings(settings); return { ok: true, open: !!state.host }; }
  };
})();
