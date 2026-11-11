// 영어 단어 상자 - 팝업
const C = WordBoxCore;
const $ = (id) => document.getElementById(id);
let words = [];
let current = null; // 지금 복습 중인 단어
let revealed = false;

async function load() {
  const s = await chrome.storage.local.get('words');
  words = s.words || [];
}
async function save() {
  await chrome.storage.local.set({ words });
}

function renderCounts() {
  const due = C.dueWords(words, Date.now()).length;
  $('counts').textContent = `복습할 단어 ${due}개 · 전체 ${words.length}개`;
}

// ── 복습 ──
function highlight(el, sentence, word) {
  el.textContent = '';
  const i = sentence.toLowerCase().indexOf(word.toLowerCase());
  if (i < 0) { el.textContent = sentence; return; }
  const mark = document.createElement('mark');
  mark.textContent = sentence.slice(i, i + word.length);
  el.append(sentence.slice(0, i), mark, sentence.slice(i + word.length));
}

function renderReview() {
  const due = C.dueWords(words, Date.now());
  current = due[0] || null;
  revealed = false;
  $('card').hidden = !current;
  $('reviewEmpty').hidden = !!current;
  if (!current) {
    $('reviewEmpty').textContent = words.length
      ? '지금 복습할 단어가 없습니다. 잘하셨어요!'
      : '아직 담은 단어가 없습니다. 웹페이지에서 단어를 드래그하고 우클릭해 보세요.';
    return;
  }
  $('cWord').textContent = current.word;
  highlight($('cSentence'), current.sentence || '', current.word);
  $('cMeaning').value = current.meaning || '';
  $('cDict').href = 'https://en.dict.naver.com/#/search?query=' + encodeURIComponent(current.word);
  $('cBack').hidden = true;
  $('btnShow').hidden = false;
  $('btnNo').hidden = true;
  $('btnYes').hidden = true;
}

function reveal() {
  revealed = true;
  $('cBack').hidden = false;
  $('btnShow').hidden = true;
  $('btnNo').hidden = false;
  $('btnYes').hidden = false;
  $('cMeaning').focus();
}

async function grade(knew) {
  if (!current || !revealed) return;
  const i = words.findIndex((w) => w.id === current.id);
  if (i < 0) return;
  const meaning = $('cMeaning').value.trim();
  words[i] = { ...C.review(words[i], knew, Date.now()), meaning };
  await save();
  renderCounts();
  renderReview();
}

// ── 목록 ──
function renderList() {
  const q = $('search').value.trim().toLowerCase();
  const ul = $('items');
  ul.textContent = '';
  const shown = [...words].reverse().filter((w) => !q || w.word.toLowerCase().includes(q) || (w.meaning || '').toLowerCase().includes(q));
  if (!shown.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = words.length ? '검색 결과가 없습니다.' : '아직 담은 단어가 없습니다.';
    ul.appendChild(li);
    return;
  }
  for (const w of shown) {
    const li = document.createElement('li');
    const top = document.createElement('div');
    top.className = 'top';
    const name = document.createElement('span');
    name.className = 'w';
    name.textContent = w.word;
    const box = document.createElement('span');
    box.className = 'box';
    box.textContent = `${w.box}단계`;
    name.appendChild(box);
    top.appendChild(name);
    const s = document.createElement('div');
    s.className = 's';
    s.textContent = w.sentence || '';
    const meaning = document.createElement('input');
    meaning.value = w.meaning || '';
    meaning.placeholder = '뜻을 적어 두세요';
    meaning.maxLength = 200;
    meaning.addEventListener('change', async () => {
      const i = words.findIndex((x) => x.id === w.id);
      if (i >= 0) { words[i].meaning = meaning.value.trim(); await save(); }
    });
    const acts = document.createElement('div');
    acts.className = 'acts';
    const dict = document.createElement('a');
    dict.textContent = '사전 ↗';
    dict.href = 'https://en.dict.naver.com/#/search?query=' + encodeURIComponent(w.word);
    dict.target = '_blank';
    dict.rel = 'noopener noreferrer';
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'del';
    del.textContent = '삭제';
    del.addEventListener('click', async () => {
      words = words.filter((x) => x.id !== w.id);
      await save();
      renderAll();
    });
    acts.append(dict, del);
    li.append(top, s, meaning, acts);
    ul.appendChild(li);
  }
}

// ── 추가·내보내기 ──
function moreMsg(t) { $('moreMsg').textContent = t || ''; }

$('addForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const r = C.addWord(words, {
    word: $('aWord').value,
    meaning: $('aMeaning').value,
    sentence: $('aSentence').value.trim()
  }, Date.now());
  if (r.added) {
    await save();
    $('addForm').reset();
    moreMsg(`'${r.item.word}'를 담았습니다.`);
  } else if (r.reason === 'duplicate') {
    if (r.changed) await save();
    moreMsg('이미 담긴 단어입니다.');
  } else {
    moreMsg('영어 단어나 짧은 표현(6낱말 이하)만 담을 수 있습니다.');
  }
  renderAll();
});

$('btnCsv').addEventListener('click', () => {
  if (!words.length) { moreMsg('내보낼 단어가 없습니다.'); return; }
  const blob = new Blob([C.toCsv(words)], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `단어상자_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  moreMsg(`${words.length}개를 CSV로 저장했습니다.`);
});

let armed = false;
$('btnClear').addEventListener('click', async () => {
  const btn = $('btnClear');
  if (!armed) {
    armed = true;
    btn.classList.add('armed');
    btn.textContent = '한 번 더 누르면 모두 지워집니다';
    setTimeout(() => { armed = false; btn.classList.remove('armed'); btn.textContent = '전체 지우기'; }, 4000);
    return;
  }
  words = [];
  await save();
  armed = false;
  btn.classList.remove('armed');
  btn.textContent = '전체 지우기';
  moreMsg('모든 단어를 지웠습니다.');
  renderAll();
});

// ── 공통 ──
function renderAll() {
  renderCounts();
  renderReview();
  renderList();
}

$('tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  document.querySelectorAll('#tabs button').forEach((x) => x.classList.toggle('on', x === b));
  for (const t of ['review', 'list', 'more']) $('tab-' + t).hidden = t !== b.dataset.tab;
});
$('btnShow').addEventListener('click', reveal);
$('btnYes').addEventListener('click', () => grade(true));
$('btnNo').addEventListener('click', () => grade(false));
$('search').addEventListener('input', renderList);

(async () => {
  await load();
  chrome.action.setBadgeText({ text: '' });
  renderAll();
})();
