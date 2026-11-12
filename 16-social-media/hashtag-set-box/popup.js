'use strict';
const $ = (id) => document.getElementById(id);
const LIMIT = 30; // 인스타그램 게시물 해시태그 한도(안내용)
let sets = [];
let editingId = null;

function normalize(text) {
  const seen = new Set();
  const out = [];
  for (const raw of text.split(/[\s,，、]+/)) {
    const t = raw.replace(/^#+/, '').replace(/[#]+/g, '');
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push('#' + t);
  }
  return out;
}
function say(text, isErr) {
  const m = $('msg');
  m.textContent = text;
  m.className = 'msg' + (isErr ? ' err' : '');
}
async function load() {
  const data = await chrome.storage.local.get('sets');
  sets = Array.isArray(data.sets) ? data.sets : [];
}
async function persist() { await chrome.storage.local.set({ sets }); }

function updateCount() {
  const n = normalize($('tags').value).length;
  $('count').textContent = n + '개' + (n > LIMIT ? ' (인스타그램 한도 30개 초과)' : '');
}
function render() {
  const list = $('list');
  list.replaceChildren();
  $('empty').hidden = sets.length > 0;
  for (const s of sets) {
    const card = document.createElement('div');
    card.className = 'card';
    const title = document.createElement('div');
    title.className = 'big';
    title.style.fontSize = '14px';
    title.textContent = s.name + ' (' + s.tags.length + '개)';
    const body = document.createElement('div');
    body.className = 'muted';
    body.textContent = s.tags.join(' ');
    const row = document.createElement('div');
    row.className = 'row';
    row.style.marginTop = '6px';
    const copy = document.createElement('button');
    copy.textContent = '복사';
    copy.className = 'primary';
    copy.dataset.act = 'copy';
    copy.addEventListener('click', () => copySet(s));
    const edit = document.createElement('button');
    edit.textContent = '고치기';
    edit.dataset.act = 'edit';
    edit.addEventListener('click', () => {
      editingId = s.id;
      $('name').value = s.name;
      $('tags').value = s.tags.join(' ');
      updateCount();
      say('고친 뒤 [저장]을 누르면 덮어씁니다.');
    });
    const del = document.createElement('button');
    del.textContent = '지우기';
    del.className = 'danger';
    del.dataset.act = 'del';
    del.addEventListener('click', async () => {
      sets = sets.filter((x) => x.id !== s.id);
      await persist();
      render();
      say('"' + s.name + '" 세트를 지웠습니다.');
    });
    row.append(copy, edit, del);
    card.append(title, body, row);
    list.append(card);
  }
}
async function copySet(s) {
  const text = s.tags.join(' ');
  try {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e1) {
      // 예비 방법: 임시 글상자를 선택해 복사
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.append(ta);
      ta.select();
      const okCopy = document.execCommand('copy');
      ta.remove();
      if (!okCopy) throw e1;
    }
    say('복사했습니다: ' + s.tags.length + '개' + (s.tags.length > LIMIT ? ' (인스타그램은 30개까지만 붙습니다)' : ''));
  } catch (e) {
    say('복사하지 못했습니다. 글자를 직접 선택해 복사해 주세요.', true);
  }
}
async function save() {
  const name = $('name').value.trim();
  const tags = normalize($('tags').value);
  if (!name) return say('세트 이름을 적어 주세요.', true);
  if (tags.length === 0) return say('해시태그를 한 개 이상 적어 주세요.', true);
  if (editingId) {
    const target = sets.find((x) => x.id === editingId);
    if (target) { target.name = name; target.tags = tags; }
  } else {
    sets.unshift({ id: String(Date.now()) + Math.random().toString(36).slice(2, 6), name, tags });
  }
  editingId = null;
  await persist();
  $('name').value = '';
  $('tags').value = '';
  updateCount();
  render();
  say('저장했습니다.');
}
function exportFile() {
  const blob = new Blob([JSON.stringify({ app: 'hashtag-set-box', sets }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'hashtag-sets.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  say('백업 파일을 저장했습니다.');
}
async function importFile(file) {
  try {
    const data = JSON.parse(await file.text());
    if (!data || !Array.isArray(data.sets)) throw new Error('형식');
    let added = 0;
    for (const s of data.sets) {
      if (!s || typeof s.name !== 'string' || !Array.isArray(s.tags)) continue;
      const tags = normalize(s.tags.filter((t) => typeof t === 'string').join(' '));
      if (!tags.length) continue;
      sets.push({ id: String(Date.now()) + Math.random().toString(36).slice(2, 6), name: s.name.slice(0, 40), tags });
      added++;
    }
    await persist();
    render();
    say(added + '개 세트를 불러왔습니다.');
  } catch (e) {
    say('백업 파일 형식이 맞지 않습니다.', true);
  }
}
$('tags').addEventListener('input', updateCount);
$('save').addEventListener('click', save);
$('clear').addEventListener('click', () => { editingId = null; $('name').value = ''; $('tags').value = ''; updateCount(); say(''); });
$('export').addEventListener('click', exportFile);
$('import').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', (e) => { if (e.target.files[0]) importFile(e.target.files[0]); e.target.value = ''; });
load().then(() => { render(); updateCount(); });
