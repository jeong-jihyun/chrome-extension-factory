// 한글 글쓰기 점검기 - 팝업
const W = WritingCheckCore;
const $ = (id) => document.getElementById(id);
const fmt = (n) => n.toLocaleString('ko-KR');
let timer = null;

function msg(t) { $('msg').textContent = t || ''; }

function options() {
  const num = (id, def) => {
    const v = parseInt($(id).value, 10);
    return Number.isFinite(v) && v > 0 ? v : def;
  };
  return {
    longLen: num('longLen', W.DEFAULTS.longLen),
    paraMax: num('paraMax', W.DEFAULTS.paraMax),
    repeatMin: num('repeatMin', W.DEFAULTS.repeatMin)
  };
}

function cell(label, value) {
  const d = document.createElement('div');
  const b = document.createElement('b');
  b.textContent = value;
  const s = document.createElement('span');
  s.textContent = label;
  d.append(b, s);
  return d;
}

function render() {
  const text = $('text').value;
  const result = $('result');
  const summary = $('summary');
  result.textContent = '';
  if (!text.trim()) { summary.hidden = true; return; }
  const r = W.analyze(text, options());
  const s = r.summary;
  summary.hidden = false;
  summary.textContent = '';
  summary.append(
    cell('글자 수(공백 제외)', fmt(s.chars)),
    cell('문장 수', fmt(s.sentences)),
    cell('평균 문장 길이', s.avgLen + '자'),
    cell('가장 긴 문장', s.longest + '자'),
    cell('문단 수', fmt(s.paragraphs)),
    cell('읽는 시간', '약 ' + s.readMin + '분')
  );
  if (!r.issues.length) {
    const ok = document.createElement('div');
    ok.className = 'ok';
    ok.textContent = '이 기준으로는 눈에 띄는 문제를 찾지 못했습니다.';
    result.appendChild(ok);
    return;
  }
  for (const issue of r.issues) {
    const box = document.createElement('div');
    box.className = 'issue';
    const h = document.createElement('h3');
    h.textContent = issue.title;
    const p = document.createElement('p');
    p.textContent = issue.hint;
    box.append(h, p);
    if (issue.items.length) {
      const ul = document.createElement('ul');
      for (const it of issue.items) {
        const li = document.createElement('li');
        li.textContent = it;
        ul.appendChild(li);
      }
      box.appendChild(ul);
    }
    result.appendChild(box);
  }
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(render, 250);
}

async function persist() {
  const o = options();
  await chrome.storage.local.set({ wcOptions: o });
}

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

$('text').addEventListener('input', schedule);
$('btnSel').addEventListener('click', fetchSelection);
$('btnClr').addEventListener('click', () => { $('text').value = ''; msg(''); render(); });
for (const id of ['longLen', 'paraMax', 'repeatMin']) {
  $(id).addEventListener('input', () => { render(); persist(); });
}

(async () => {
  const stored = (await chrome.storage.local.get('wcOptions')).wcOptions || {};
  const o = { ...W.DEFAULTS, ...stored };
  $('longLen').value = o.longLen;
  $('paraMax').value = o.paraMax;
  $('repeatMin').value = o.repeatMin;
  render();
})();
