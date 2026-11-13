const $ = (id) => document.getElementById(id);
const MAX_SHOW = 1000000;
let lastOrigin = null;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

async function send() {
  $('cors').hidden = true; $('result').hidden = true; $('state').textContent = '';
  const v = validateUrl($('url').value);
  if (!v.ok) { $('state').textContent = v.message; return; }
  const ph = parseHeaders($('headers').value);
  if (ph.bad.length) { $('state').textContent = '헤더 ' + ph.bad.join(', ') + '번째 줄이 "이름: 값" 형식이 아닙니다.'; return; }
  const method = $('method').value;
  const opts = { method, headers: ph.headers, redirect: 'follow', cache: 'no-store', credentials: 'omit' };
  const body = $('body').value;
  if (body && method !== 'GET' && method !== 'HEAD') opts.body = body;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  opts.signal = ctrl.signal;
  $('state').textContent = '보내는 중...';
  const t0 = performance.now();
  try {
    const res = await fetch(v.url, opts);
    const text = await res.text();
    const ms = Math.round(performance.now() - t0);
    show(res, text, ms);
    $('state').textContent = '';
    remember(method, v.url);
  } catch (e) {
    lastOrigin = v.origin;
    $('state').textContent = '';
    $('cors').hidden = false;
    $('corsText').textContent = e && e.name === 'AbortError'
      ? '30초 안에 응답이 없어 중단했습니다. 주소와 서버 상태를 확인하세요.'
      : '요청이 막혔거나 연결에 실패했습니다. 서버가 꺼져 있거나, 서버가 다른 사이트의 요청(CORS)을 허용하지 않을 수 있습니다. 아래 버튼으로 이 사이트(' + v.origin + ')에 한해 접근을 허용하면 다시 시도할 수 있습니다.';
    $('grant').hidden = e && e.name === 'AbortError';
  } finally { clearTimeout(timer); }
}

function show(res, text, ms) {
  $('result').hidden = false;
  const sum = $('summary'); sum.textContent = '';
  sum.appendChild(el('span', res.ok ? 'good' : 'bad', res.status + ' ' + (res.statusText || statusKorean(res.status))));
  sum.appendChild(el('span', '', ' · ' + statusKorean(res.status) + ' · ' + ms + ' ms · ' + formatSize(text.length)));
  const hl = []; res.headers.forEach((v, k) => hl.push(k + ': ' + v));
  $('resHeaders').textContent = hl.join('\n') || '(없음)';
  let shown = prettyBody(text, res.headers.get('content-type'));
  if (shown.length > MAX_SHOW) shown = shown.slice(0, MAX_SHOW) + '\n... (너무 길어 여기까지만 표시)';
  $('resBody').textContent = shown || '(본문 없음)';
}

async function grant() {
  if (!lastOrigin) return;
  let ok = false;
  try { ok = await chrome.permissions.request({ origins: [lastOrigin + '/*'] }); } catch (e) { ok = false; }
  if (ok) send(); else $('corsText').textContent = '접근을 허용하지 않아 다시 보내지 않았습니다.';
}

function remember(method, url) {
  chrome.storage.local.get({ history: [] }, (s) => {
    const key = method + ' ' + url;
    const h = [key].concat(s.history.filter((x) => x !== key)).slice(0, 10);
    chrome.storage.local.set({ history: h }, renderHistory);
  });
}
function renderHistory() {
  chrome.storage.local.get({ history: [] }, (s) => {
    const box = $('history'); box.textContent = '';
    if (!s.history.length) box.appendChild(el('div', 'note', '아직 없습니다.'));
    s.history.forEach((k) => {
      const b = el('button', 'hist', k);
      b.addEventListener('click', () => {
        const i = k.indexOf(' ');
        $('method').value = k.slice(0, i); $('url').value = k.slice(i + 1);
      });
      box.appendChild(b);
    });
  });
}

$('send').addEventListener('click', send);
$('grant').addEventListener('click', grant);
$('copyBody').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('resBody').textContent); $('state').textContent = '복사했습니다.'; }
  catch (e) { $('state').textContent = '복사에 실패했습니다.'; }
});
renderHistory();
