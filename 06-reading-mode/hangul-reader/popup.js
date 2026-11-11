// 한글 읽기 모드 - 팝업
const DEFAULTS = { fontSize: 19, lineHeight: 1.9, width: 720, theme: 'light', font: 'sans' };
const $ = (id) => document.getElementById(id);
let settings = { ...DEFAULTS };
let tabId = null;
let isOpen = false;

function showMsg(text) { $('msg').textContent = text || ''; }

function render() {
  $('fontSize').value = settings.fontSize;
  $('lineHeight').value = settings.lineHeight;
  $('width').value = settings.width;
  $('fsOut').textContent = settings.fontSize + 'px';
  $('lhOut').textContent = Number(settings.lineHeight).toFixed(1);
  $('wOut').textContent = settings.width + 'px';
  for (const group of ['theme', 'font']) {
    document.querySelectorAll(`#${group} button`).forEach((b) => b.classList.toggle('on', b.dataset.v === settings[group]));
  }
  $('toggle').textContent = isOpen ? '읽기 모드 끄기' : '읽기 모드 켜기';
}

async function run(func, args = []) {
  const [res] = await chrome.scripting.executeScript({ target: { tabId }, func, args });
  return res && res.result;
}

async function inject() {
  await chrome.scripting.executeScript({ target: { tabId }, files: ['reader.js'] });
}

async function save() {
  await chrome.storage.local.set({ readerSettings: settings });
  if (isOpen) {
    try { await run((s) => window.__hangulReader.update(s), [settings]); } catch (e) { /* 탭이 바뀐 경우 무시 */ }
  }
}

async function toggle() {
  showMsg('');
  try {
    await inject();
    const r = await run((s) => window.__hangulReader.toggle(s), [settings]);
    isOpen = !!(r && r.open);
    if (r && r.open && r.found === false) showMsg('읽을 만한 긴 글을 찾지 못했습니다.');
  } catch (e) {
    showMsg('이 페이지에서는 사용할 수 없습니다. (크롬 설정·웹 스토어 등 보호된 페이지)');
  }
  render();
}

async function init() {
  const stored = await chrome.storage.local.get('readerSettings');
  settings = { ...DEFAULTS, ...(stored.readerSettings || {}) };
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab && tab.id;
  try {
    await inject();
    isOpen = !!(await run(() => window.__hangulReader.isOpen()));
    $('toggle').disabled = false;
  } catch (e) {
    showMsg('이 페이지에서는 사용할 수 없습니다. (크롬 설정·웹 스토어 등 보호된 페이지)');
    $('toggle').disabled = true;
  }
  render();
}

$('toggle').addEventListener('click', toggle);
for (const [id, key, num] of [['fontSize', 'fontSize', 1], ['lineHeight', 'lineHeight', 1], ['width', 'width', 1]]) {
  $(id).addEventListener('input', (e) => {
    settings[key] = num ? Number(e.target.value) : e.target.value;
    render();
    save();
  });
}
for (const group of ['theme', 'font']) {
  $(group).addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    settings[group] = b.dataset.v;
    render();
    save();
  });
}
init();
