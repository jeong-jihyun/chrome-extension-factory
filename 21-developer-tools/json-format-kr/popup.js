const $ = (id) => document.getElementById(id);
const input = $('input'), statusEl = $('status');

function setStatus(text, ok) {
  statusEl.textContent = text;
  statusEl.className = text ? (ok ? 'ok' : 'err') : '';
}

function goTo(loc) {
  if (!loc) return;
  const lines = input.value.split('\n');
  let pos = 0;
  for (let i = 0; i < loc.line - 1 && i < lines.length; i++) pos += lines[i].length + 1;
  pos += loc.col - 1;
  input.focus();
  input.setSelectionRange(Math.min(pos, input.value.length), Math.min(pos + 1, input.value.length));
}

function run(mode) {
  const r = runJson(input.value, mode, $('indent').value, $('sort').checked);
  setStatus(r.message, r.ok);
  if (r.ok && r.output !== null) input.value = r.output;
  if (!r.ok) goTo(r.loc);
}

$('format').addEventListener('click', () => run('format'));
$('minify').addEventListener('click', () => run('minify'));
$('check').addEventListener('click', () => run('check'));
$('clear').addEventListener('click', () => { input.value = ''; setStatus('', true); input.focus(); });
$('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(input.value); setStatus('복사했습니다.', true); }
  catch (e) { input.select(); setStatus('자동 복사에 실패했습니다. 선택된 글을 Ctrl+C로 복사하세요.', false); }
});

// 설정 저장 (입력한 JSON 내용은 저장하지 않습니다)
function save() { chrome.storage.local.set({ indent: $('indent').value, sort: $('sort').checked }); }
$('indent').addEventListener('change', save);
$('sort').addEventListener('change', save);
chrome.storage.local.get({ indent: '2', sort: false }, (s) => {
  $('indent').value = s.indent; $('sort').checked = s.sort;
});
