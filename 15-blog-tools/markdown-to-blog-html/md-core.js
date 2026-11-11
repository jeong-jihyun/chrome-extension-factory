// 작은 마크다운 변환기. 결과를 "노드 트리"로 만들고, 같은 트리로 (1) HTML 글자열 (2) 화면용 DOM 을 만듭니다.
// 원본 글의 HTML 태그는 해석하지 않고 글자 그대로 보여 줍니다(안전).
(function (root) {
  function node(tag, attrs, children) { return { tag: tag, attrs: attrs || {}, children: children || [] }; }
  function text(s) { return { text: s }; }

  function safeUrl(u) {
    u = String(u || '').trim();
    return /^(https?:\/\/|mailto:)/i.test(u) ? u : null;
  }

  // 글 안쪽: `코드`, **굵게**, *기울임*, ![alt](url), [글](url)
  function inline(s) {
    var out = [], i = 0, buf = '';
    function flush() { if (buf) { out.push(text(buf)); buf = ''; } }
    while (i < s.length) {
      var rest = s.slice(i), m;
      if ((m = /^`([^`]+)`/.exec(rest))) { flush(); out.push(node('code', {}, [text(m[1])])); i += m[0].length; continue; }
      if ((m = /^!\[([^\]]*)\]\(([^)\s]+)\)/.exec(rest)) && safeUrl(m[2])) { flush(); out.push(node('img', { src: safeUrl(m[2]), alt: m[1] })); i += m[0].length; continue; }
      if ((m = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(rest)) && safeUrl(m[2])) { flush(); out.push(node('a', { href: safeUrl(m[2]) }, inline(m[1]))); i += m[0].length; continue; }
      if ((m = /^\*\*([^*]+)\*\*/.exec(rest))) { flush(); out.push(node('strong', {}, inline(m[1]))); i += m[0].length; continue; }
      if ((m = /^\*([^*\s][^*]*)\*/.exec(rest))) { flush(); out.push(node('em', {}, inline(m[1]))); i += m[0].length; continue; }
      buf += s[i]; i++;
    }
    flush();
    return out;
  }

  function parse(md) {
    var lines = String(md || '').replace(/\r\n?/g, '\n').split('\n');
    var blocks = [], i = 0, m;
    function isSpecial(l) { return /^(#{1,6})\s+/.test(l) || /^```/.test(l) || /^>\s?/.test(l) || /^\s*[-*]\s+/.test(l) || /^\s*\d+\.\s+/.test(l) || /^(-{3,}|\*{3,})\s*$/.test(l); }
    while (i < lines.length) {
      var l = lines[i];
      if (!l.trim()) { i++; continue; }
      if ((m = /^```\s*(\S*)\s*$/.exec(l))) {
        var code = []; i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) { code.push(lines[i]); i++; }
        i++;
        blocks.push(node('pre', {}, [node('code', {}, [text(code.join('\n'))])]));
        continue;
      }
      if ((m = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(l))) { blocks.push(node('h' + m[1].length, {}, inline(m[2]))); i++; continue; }
      if (/^(-{3,}|\*{3,})\s*$/.test(l)) { blocks.push(node('hr')); i++; continue; }
      if (/^>\s?/.test(l)) {
        var q = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, '')); i++; }
        blocks.push(node('blockquote', {}, parse(q.join('\n'))));
        continue;
      }
      if (/^\s*[-*]\s+/.test(l) || /^\s*\d+\.\s+/.test(l)) {
        var ordered = /^\s*\d+\.\s+/.test(l), items = [];
        var re = ordered ? /^\s*\d+\.\s+(.*)$/ : /^\s*[-*]\s+(.*)$/;
        while (i < lines.length && re.test(lines[i])) { items.push(node('li', {}, inline(re.exec(lines[i])[1]))); i++; }
        blocks.push(node(ordered ? 'ol' : 'ul', {}, items));
        continue;
      }
      var para = [];
      while (i < lines.length && lines[i].trim() && !isSpecial(lines[i])) { para.push(lines[i].trim()); i++; }
      blocks.push(node('p', {}, inline(para.join(' '))));
    }
    return blocks;
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var VOID = { hr: 1, img: 1 };

  function toHtml(nodes, opts, depth) {
    opts = opts || {}; depth = depth || 0;
    return nodes.map(function (n) {
      if (n.text !== undefined) return esc(n.text);
      var attrs = Object.keys(n.attrs).map(function (k) { return ' ' + k + '="' + esc(n.attrs[k]) + '"'; }).join('');
      if (n.tag === 'a' && opts.newWindow && /^https?:/i.test(n.attrs.href)) attrs += ' target="_blank" rel="noopener noreferrer"';
      if (VOID[n.tag]) return '<' + n.tag + attrs + '>' + (n.tag === 'hr' && depth === 0 ? '\n' : '');
      var inner = toHtml(n.children, opts, depth + 1);
      var blockLevel = /^(p|h[1-6]|ul|ol|pre|blockquote)$/.test(n.tag);
      return '<' + n.tag + attrs + '>' + inner + '</' + n.tag + '>' + (blockLevel && depth === 0 ? '\n' : '');
    }).join('');
  }

  // 화면용: innerHTML 을 쓰지 않고 요소를 직접 만듭니다.
  function toDom(nodes, doc, opts) {
    opts = opts || {};
    var frag = doc.createDocumentFragment();
    nodes.forEach(function (n) {
      if (n.text !== undefined) { frag.appendChild(doc.createTextNode(n.text)); return; }
      var el = doc.createElement(n.tag);
      Object.keys(n.attrs).forEach(function (k) { el.setAttribute(k, n.attrs[k]); });
      if (n.tag === 'a') { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener noreferrer'); }
      if (!VOID[n.tag]) el.appendChild(toDom(n.children, doc, opts));
      frag.appendChild(el);
    });
    return frag;
  }

  function convert(md, opts) { return toHtml(parse(md), opts).trim(); }

  var api = { parse: parse, toHtml: toHtml, toDom: toDom, convert: convert };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MdCore = api;
})(typeof self !== 'undefined' ? self : this);
