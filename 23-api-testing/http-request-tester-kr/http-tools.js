function parseHeaders(text) {
  const headers = {}; const bad = [];
  text.split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const idx = line.indexOf(':');
    if (idx < 1) { bad.push(i + 1); return; }
    const name = line.slice(0, idx).trim();
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)) { bad.push(i + 1); return; }
    headers[name] = line.slice(idx + 1).trim();
  });
  return { headers, bad };
}
function validateUrl(s) {
  let u;
  try { u = new URL(s.trim()); } catch (e) { return { ok: false, message: '주소 형식이 올바르지 않습니다. https:// 로 시작하는 전체 주소를 넣어 주세요.' }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { ok: false, message: 'http 또는 https 주소만 보낼 수 있습니다.' };
  return { ok: true, url: u.href, origin: u.origin };
}
function prettyBody(text, contentType) {
  if (/json/i.test(contentType || '') || /^\s*[\[{]/.test(text)) {
    try { return JSON.stringify(JSON.parse(text), null, 2); } catch (e) { /* 그대로 */ }
  }
  return text;
}
function formatSize(n) { return n < 1024 ? n + ' B' : (n / 1024).toFixed(1) + ' KB'; }
function statusKorean(s) {
  if (s >= 200 && s < 300) return '성공';
  if (s >= 300 && s < 400) return '다른 곳으로 이동';
  if (s === 401 || s === 403) return '권한 없음';
  if (s === 404) return '찾을 수 없음';
  if (s >= 400 && s < 500) return '요청에 문제가 있음';
  if (s >= 500) return '서버 오류';
  return '';
}
if (typeof module !== 'undefined') module.exports = { parseHeaders, validateUrl, prettyBody, formatSize, statusKorean };
