// 영문 약어 한글 풀이 - 팝업
const $ = (id) => document.getElementById(id);
let tabId = null;
let isOn = false;
let userTerms = {}; // { 약어: [영문 풀이, 한글 이름, 설명] }
let useBuiltin = true;

function showMsg(text, warn) {
  $('msg').textContent = text || '';
  $('msg').classList.toggle('warn', !!warn);
}

function currentDict() {
  return { ...(useBuiltin ? self.ACRO_BUILTIN : {}), ...userTerms }; // 내 용어가 내장 사전보다 우선
}

function renderList() {
  const ul = $('userList');
  ul.textContent = '';
  const keys = Object.keys(userTerms);
  if (!keys.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = '아직 추가한 용어가 없습니다.';
    ul.appendChild(li);
    return;
  }
  for (const k of keys) {
    const li = document.createElement('li');
    const label = document.createElement('span');
    const kk = document.createElement('span');
    kk.className = 'k';
    kk.textContent = k;
    label.append(kk, userTerms[k][1]);
    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = '삭제';
    del.addEventListener('click', async () => {
      delete userTerms[k];
      await chrome.storage.local.set({ userTerms });
      renderList();
    });
    li.append(label, del);
    ul.appendChild(li);
  }
}

function renderButton() {
  $('toggle').textContent = isOn ? '약어 풀이 끄기' : '이 페이지 약어 풀이 켜기';
}

async function inject() {
  await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
}

async function exec(func, args = []) {
  const [res] = await chrome.scripting.executeScript({ target: { tabId }, func, args });
  return res && res.result;
}

async function toggle() {
  showMsg('');
  try {
    await inject();
    if (isOn) {
      await exec(() => window.__acroKr.clear());
      isOn = false;
    } else {
      const r = await exec((d) => window.__acroKr.run(d), [currentDict()]);
      isOn = true;
      if (r && r.count === 0) showMsg('이 페이지에서 사전에 있는 약어를 찾지 못했습니다.', true);
      else if (r) showMsg(`약어 ${r.kinds}종, ${r.count}곳에 점선 밑줄을 표시했습니다. 마우스를 올려 보세요.`);
    }
  } catch (e) {
    showMsg('이 페이지에서는 사용할 수 없습니다. (크롬 설정·웹 스토어 등 보호된 페이지)', true);
  }
  renderButton();
}

$('toggle').addEventListener('click', toggle);

$('useBuiltin').addEventListener('change', async (e) => {
  useBuiltin = e.target.checked;
  await chrome.storage.local.set({ useBuiltin });
  if (isOn) showMsg('사전 설정이 바뀌었습니다. 껐다가 다시 켜면 적용됩니다.');
});

$('addForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const key = $('fKey').value.trim();
  const ko = $('fKo').value.trim();
  if (!key || !ko) return;
  if (/[\s]/.test(key)) { showMsg('약어에는 띄어쓰기를 넣을 수 없습니다.', true); return; }
  userTerms[key] = [$('fEn').value.trim() || key, ko, $('fDesc').value.trim()];
  await chrome.storage.local.set({ userTerms });
  $('addForm').reset();
  showMsg(`'${key}'를 추가했습니다. 켜져 있다면 껐다가 다시 켜 주세요.`);
  renderList();
});

async function init() {
  $('builtinCount').textContent = Object.keys(self.ACRO_BUILTIN).length;
  const stored = await chrome.storage.local.get(['userTerms', 'useBuiltin']);
  userTerms = stored.userTerms || {};
  useBuiltin = stored.useBuiltin !== false;
  $('useBuiltin').checked = useBuiltin;
  renderList();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab && tab.id;
  try {
    await inject();
    isOn = !!(await exec(() => window.__acroKr.isOn()));
    $('toggle').disabled = false;
  } catch (e) {
    showMsg('이 페이지에서는 사용할 수 없습니다. (크롬 설정·웹 스토어 등 보호된 페이지)', true);
    $('toggle').disabled = true;
  }
  renderButton();
}
init();
