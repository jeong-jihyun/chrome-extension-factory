const $ = (id) => document.getElementById(id);
const nums = ['val', 'base', 'vwpx', 'minSize', 'maxSize', 'minVw', 'maxVw'];

function line(key, value) {
  const d = document.createElement('div'); d.className = 'line';
  const k = document.createElement('span'); k.className = 'k'; k.textContent = key;
  const v = document.createElement('span'); v.className = 'v'; v.textContent = value;
  const b = document.createElement('button'); b.textContent = '복사';
  b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(value); b.textContent = '복사됨'; }
    catch (e) { b.textContent = '실패'; }
    setTimeout(() => { b.textContent = '복사'; }, 1200);
  });
  d.append(k, v, b);
  return d;
}

function update() {
  const base = parseFloat($('base').value), vwpx = parseFloat($('vwpx').value), val = parseFloat($('val').value);
  const conv = $('conv'); conv.textContent = '';
  if ([base, vwpx, val].every(isFinite) && base > 0 && vwpx > 0) {
    const r = convert(val, $('unit').value, base, vwpx);
    conv.append(line('px', r.px + 'px'), line('rem', r.rem + 'rem'), line('em', r.em + 'em'), line('vw', r.vw + 'vw'));
  } else { conv.textContent = '값·기준 글자 크기·화면 너비에 0보다 큰 숫자를 넣어 주세요.'; }

  const out = $('clampOut'); out.textContent = ''; $('clampMsg').textContent = '';
  const a = ['minSize', 'maxSize', 'minVw', 'maxVw'].map((id) => parseFloat($(id).value));
  const c = makeClamp(a[0], a[1], a[2], a[3], isFinite(base) ? base : NaN);
  if (c.error) { $('clampMsg').textContent = c.error; return; }
  out.append(line('CSS', 'font-size: ' + c.css + ';'));
  const mid = Math.round((a[2] + a[3]) / 2);
  $('clampMsg').textContent = '확인: 화면 ' + a[2] + 'px → ' + evalClamp(a[0], a[1], a[2], a[3], a[2]) + 'px, ' + mid + 'px → ' + evalClamp(a[0], a[1], a[2], a[3], mid) + 'px, ' + a[3] + 'px → ' + evalClamp(a[0], a[1], a[2], a[3], a[3]) + 'px';
}

nums.concat(['unit']).forEach((id) => $(id).addEventListener('input', () => {
  update();
  const o = { unit: $('unit').value }; nums.forEach((n) => { o[n] = $(n).value; });
  chrome.storage.local.set({ saved: o });
}));
chrome.storage.local.get({ saved: null }, (s) => {
  if (s.saved) { Object.keys(s.saved).forEach((k) => { if ($(k)) $(k).value = s.saved[k]; }); }
  update();
});
