// 영문 약어 한글 풀이 - 페이지 안에서 실행되는 코드
// 팝업이 '켜기'를 누를 때만 주입됩니다. 페이지 글자를 서버로 보내지 않습니다.
(() => {
  if (window.__acroKr) return;

  const MAX_TEXT_NODES = 30000; // 아주 큰 페이지 보호용 상한
  const MAX_MATCHES = 2000;
  const CLS = 'acro-kr-term';
  const SKIP_PARENT = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'TITLE', 'HEAD']);

  const st = { dict: null, tip: null, onOver: null, onOut: null, onScroll: null, count: 0, kinds: 0 };

  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');

  function makeRegex(keys) {
    const sorted = [...keys].sort((a, b) => b.length - a.length);
    // 앞뒤에 영문·숫자가 붙어 있으면(예: "SAPI") 다른 낱말이므로 건너뜁니다.
    return new RegExp('(?<![A-Za-z0-9])(' + sorted.map(escapeRe).join('|') + ')(?![A-Za-z0-9])', 'g');
  }

  function editable(node) {
    for (let e = node.parentElement; e; e = e.parentElement) {
      if (e.isContentEditable) return true;
    }
    return false;
  }

  function showTip(target) {
    const key = target.getAttribute('data-acro');
    const info = st.dict[key];
    if (!info) return;
    hideTip();
    const tip = document.createElement('div');
    Object.assign(tip.style, {
      position: 'fixed', zIndex: '2147483647', maxWidth: '320px', padding: '10px 12px', borderRadius: '8px',
      background: '#111827', color: '#f9fafb', font: '13px/1.5 "Malgun Gothic","Apple SD Gothic Neo",sans-serif',
      boxShadow: '0 6px 20px rgba(0,0,0,.35)', pointerEvents: 'none', textAlign: 'left', wordBreak: 'keep-all'
    });
    const head = document.createElement('div');
    head.style.fontWeight = '700';
    head.textContent = key + ' · ' + info[1];
    const en = document.createElement('div');
    en.style.cssText = 'color:#9ca3af;font-size:12px;margin-bottom:4px';
    en.textContent = info[0];
    const body = document.createElement('div');
    body.textContent = info[2] || '';
    tip.append(head, en);
    if (info[2]) tip.appendChild(body);
    document.documentElement.appendChild(tip);
    const r = target.getBoundingClientRect();
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    let left = Math.min(Math.max(8, r.left), window.innerWidth - tw - 8);
    let top = r.bottom + 6;
    if (top + th > window.innerHeight - 8) top = Math.max(8, r.top - th - 6);
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
    st.tip = tip;
  }

  function hideTip() {
    if (st.tip) st.tip.remove();
    st.tip = null;
  }

  function run(dict) {
    clear();
    st.dict = dict; // clear()가 비우므로 그 뒤에 지정합니다
    const keys = Object.keys(dict);
    if (!keys.length) return { count: 0, kinds: 0 };
    const re = makeRegex(keys);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let n;
    while ((n = walker.nextNode()) && nodes.length < MAX_TEXT_NODES) {
      const p = n.parentElement;
      if (!p || SKIP_PARENT.has(p.tagName) || p.classList.contains(CLS)) continue;
      if (!n.nodeValue || n.nodeValue.length < 2) continue;
      nodes.push(n);
    }
    const seen = new Set();
    let count = 0;
    for (const node of nodes) {
      if (count >= MAX_MATCHES) break;
      const text = node.nodeValue;
      re.lastIndex = 0;
      if (!re.test(text)) continue;
      if (editable(node)) continue;
      re.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let last = 0;
      let m;
      while ((m = re.exec(text)) && count < MAX_MATCHES) {
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        const span = document.createElement('span');
        span.className = CLS;
        span.setAttribute('data-acro', m[1]);
        span.textContent = m[1];
        span.style.borderBottom = '1.5px dotted #2563eb';
        span.style.cursor = 'help';
        span.style.background = 'rgba(37,99,235,.08)';
        frag.appendChild(span);
        seen.add(m[1]);
        count++;
        last = m.index + m[1].length;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
    }
    st.count = count;
    st.kinds = seen.size;

    st.onOver = (e) => {
      const t = e.target.closest && e.target.closest('.' + CLS);
      if (t) showTip(t);
    };
    st.onOut = (e) => {
      const t = e.target.closest && e.target.closest('.' + CLS);
      if (t) hideTip();
    };
    st.onScroll = hideTip;
    document.addEventListener('mouseover', st.onOver, true);
    document.addEventListener('mouseout', st.onOut, true);
    window.addEventListener('scroll', st.onScroll, true);
    return { count, kinds: seen.size };
  }

  function clear() {
    hideTip();
    if (st.onOver) document.removeEventListener('mouseover', st.onOver, true);
    if (st.onOut) document.removeEventListener('mouseout', st.onOut, true);
    if (st.onScroll) window.removeEventListener('scroll', st.onScroll, true);
    st.onOver = st.onOut = st.onScroll = null;
    const parents = new Set();
    document.querySelectorAll('.' + CLS).forEach((span) => {
      const p = span.parentNode;
      if (!p) return;
      p.replaceChild(document.createTextNode(span.textContent), span);
      parents.add(p);
    });
    parents.forEach((p) => p.normalize());
    st.count = 0;
    st.kinds = 0;
    st.dict = null;
  }

  window.__acroKr = {
    isOn: () => st.dict !== null,
    run,
    clear,
    stats: () => ({ count: st.count, kinds: st.kinds })
  };
})();
