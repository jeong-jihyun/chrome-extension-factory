const $ = (id) => document.getElementById(id);

function mk(tag, text, cls) { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (cls) e.className = cls; return e; }

function render() {
  const fg = parseColor($('fg').value), bg = parseColor($('bg').value);
  const msg = $('msg'), table = $('table'), sug = $('suggest');
  table.textContent = ''; sug.textContent = ''; msg.textContent = '';
  if (!fg || !bg) {
    msg.textContent = '색은 #333, #333333, rgb(51,51,51) 형식으로 넣어 주세요.';
    $('ratio').textContent = ''; $('formats').textContent = ''; return;
  }
  const fgHex = toHex(fg), bgHex = toHex(bg);
  $('fgPick').value = fgHex; $('bgPick').value = bgHex;
  const pv = $('preview'); pv.style.color = fgHex; pv.style.background = bgHex;
  const ratio = contrastRatio(fg, bg);
  $('ratio').textContent = '대비 ' + (Math.floor(ratio * 100) / 100).toFixed(2) + ' : 1';
  const lv = levels(ratio);
  const head = mk('tr'); ['', '보통 글자', '큰 글자(18pt↑ 또는 굵게 14pt↑)'].forEach((t) => head.appendChild(mk('th', t)));
  table.appendChild(head);
  [['AA (최소 기준)', lv.aaNormal, lv.aaLarge], ['AAA (권장)', lv.aaaNormal, lv.aaaLarge]].forEach((r) => {
    const tr = mk('tr'); tr.appendChild(mk('td', r[0]));
    [r[1], r[2]].forEach((ok) => tr.appendChild(mk('td', ok ? '통과' : '미달', ok ? 'pass' : 'fail')));
    table.appendChild(tr);
  });
  const ui = mk('tr'); ui.appendChild(mk('td', '아이콘·입력칸 테두리(3:1)'));
  const uc = mk('td', lv.ui ? '통과' : '미달', lv.ui ? 'pass' : 'fail'); uc.colSpan = 2; ui.appendChild(uc); table.appendChild(ui);

  if (!lv.aaNormal) {
    sug.appendChild(mk('div', '보통 글자 AA(4.5:1)를 넘는 가까운 글자색:'));
    const s = suggestFor(fg, bg, 4.5);
    let any = false;
    [['darker', '더 어둡게'], ['lighter', '더 밝게']].forEach(([k, label]) => {
      if (!s[k]) return; any = true;
      const hex = toHex(s[k]);
      const b = mk('button', label + ' ' + hex + ' (' + contrastRatio(s[k], bg).toFixed(2) + ':1)');
      b.style.borderLeft = '14px solid ' + hex;
      b.addEventListener('click', () => { $('fg').value = hex; render(); save(); });
      sug.appendChild(b);
    });
    if (!any) sug.appendChild(mk('div', '글자색만 바꿔서는 기준을 넘기 어렵습니다. 배경색도 조정해 보세요.'));
  }
  const hsl = rgbToHsl(fg);
  $('formats').textContent = '글자색 ' + fgHex + ' · rgb(' + fg.join(',') + ') · hsl(' + Math.round(hsl[0]) + ',' + Math.round(hsl[1] * 100) + '%,' + Math.round(hsl[2] * 100) + '%)';
}

function save() { chrome.storage.local.set({ fg: $('fg').value, bg: $('bg').value }); }
['fg', 'bg'].forEach((id) => {
  $(id).addEventListener('input', () => { render(); save(); });
  $(id + 'Pick').addEventListener('input', () => { $(id).value = $(id + 'Pick').value; render(); save(); });
  if (window.EyeDropper) {
    const btn = $(id + 'Drop'); btn.hidden = false;
    btn.addEventListener('click', async () => {
      try { const r = await new EyeDropper().open(); $(id).value = r.sRGBHex; render(); save(); }
      catch (e) { /* 취소 */ }
    });
  }
});
$('swap').addEventListener('click', () => { const t = $('fg').value; $('fg').value = $('bg').value; $('bg').value = t; render(); save(); });
chrome.storage.local.get({ fg: '#333333', bg: '#ffffff' }, (s) => { $('fg').value = s.fg; $('bg').value = s.bg; render(); });
