// 글자·바이트 세기 - 팝업
const K = ByteCounterCore;
const $ = (id) => document.getElementById(id);
const fmt = (n) => n.toLocaleString('ko-KR');

function msg(t) { $('msg').textContent = t || ''; }

function settings() {
  const limit = parseInt($('limit').value, 10);
  return { mode: $('mode').value, crlf: $('crlf').checked, limit: Number.isFinite(limit) && limit > 0 ? limit : null };
}

function render() {
  const { mode, crlf, limit } = settings();
  const s = K.stats($('text').value, mode, crlf);
  $('sChars').textContent = fmt(s.chars);
  $('sNoSpace').textContent = fmt(s.charsNoSpace);
  $('sCp949').textContent = fmt(s.cp949);
  $('sUtf8').textContent = fmt(s.utf8);
  $('sWords').textContent = fmt(s.words);
  $('sLines').textContent = fmt(s.lines);
  const box = $('limitResult');
  box.className = 'limit';
  if (!limit) { box.textContent = ''; return; }
  const diff = limit - s.bytes;
  if (diff >= 0) {
    box.classList.add('ok');
    box.textContent = `${fmt(s.bytes)} / ${fmt(limit)} 바이트 · ${fmt(diff)}바이트 남음`;
  } else {
    box.classList.add('over');
    box.textContent = `${fmt(s.bytes)} / ${fmt(limit)} 바이트 · ${fmt(-diff)}바이트 초과`;
  }
}

async function persist() {
  const { mode, crlf } = settings();
  await chrome.storage.local.set({ bcSettings: { mode, crlf, limit: $('limit').value } });
}

// 선택한 글(일반 글 또는 입력칸 안의 선택)을 가져옵니다.
function readSelection() {
  const a = document.activeElement;
  if (a && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && /^(text|search|url|tel|email)?$/i.test(a.type)))) {
    try {
      const v = a.value.substring(a.selectionStart, a.selectionEnd);
      if (v) return v;
    } catch (e) { /* 선택 불가 입력칸 */ }
  }
  const s = window.getSelection();
  return s ? s.toString() : '';
}

async function fetchSelection() {
  msg('');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const results = await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, func: readSelection });
    const found = results.map((r) => r.result).find((t) => t && t.length);
    if (!found) { msg('선택된 글이 없습니다. 페이지에서 먼저 글을 드래그해 주세요.'); return; }
    $('text').value = found;
    render();
  } catch (e) {
    msg('이 페이지에서는 가져올 수 없습니다. (크롬 설정·웹 스토어 등 보호된 페이지) 글을 직접 붙여 넣어 주세요.');
  }
}

$('text').addEventListener('input', render);
$('limit').addEventListener('input', () => { render(); persist(); });
$('mode').addEventListener('change', () => { render(); persist(); });
$('crlf').addEventListener('change', () => { render(); persist(); });
$('btnSel').addEventListener('click', fetchSelection);
$('btnClr').addEventListener('click', () => { $('text').value = ''; msg(''); render(); });

$('btnCut').addEventListener('click', () => {
  const { mode, crlf, limit } = settings();
  if (!limit) { msg('바이트 한도를 먼저 입력해 주세요.'); return; }
  const before = K.chars($('text').value);
  $('text').value = K.truncate($('text').value, limit, mode, crlf);
  msg(`한도에 맞춰 ${fmt(before - K.chars($('text').value))}글자를 잘라 냈습니다.`);
  render();
});

$('btnPad').addEventListener('click', async () => {
  const { mode, crlf, limit } = settings();
  if (!limit) { msg('바이트 한도를 먼저 입력해 주세요.'); return; }
  const r = K.padRight($('text').value, limit, mode, crlf);
  try {
    await navigator.clipboard.writeText(r.text);
    msg(`오른쪽에 공백 ${fmt(r.filler)}칸을 채워 ${fmt(limit)}바이트로 복사했습니다.`);
  } catch (e) {
    msg('복사에 실패했습니다. 브라우저 권한을 확인해 주세요.');
  }
});

(async () => {
  const s = (await chrome.storage.local.get('bcSettings')).bcSettings;
  if (s) {
    $('mode').value = s.mode === 'utf8' ? 'utf8' : 'cp949';
    $('crlf').checked = !!s.crlf;
    $('limit').value = s.limit || '';
  }
  render();
})();
