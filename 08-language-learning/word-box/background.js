// 영어 단어 상자 - 배경(서비스 워커)
importScripts('core.js');

const MENU_ID = 'word-box-add';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: MENU_ID, title: '단어 상자에 담기', contexts: ['selection'] });
  });
});

function flash(text, color) {
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeText({ text });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2500);
}

// 선택한 글이 들어 있는 덩어리(문단 등)의 글자를 가져옵니다.
function readContainerText() {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return '';
  const n = sel.anchorNode;
  let el = n && (n.nodeType === 1 ? n : n.parentElement);
  while (el && el.parentElement && (el.innerText || '').length < 60 && el.tagName !== 'BODY') el = el.parentElement;
  return el ? (el.innerText || '').slice(0, 5000) : '';
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  const selected = WordBoxCore.normalizeWord(info.selectionText);
  if (!WordBoxCore.isValidWord(selected)) {
    flash('!', '#b45309'); // 너무 길거나 비어 있음
    return;
  }
  let sentence = '';
  try {
    const target = { tabId: tab.id };
    if (typeof info.frameId === 'number') target.frameIds = [info.frameId];
    const [res] = await chrome.scripting.executeScript({ target, func: readContainerText });
    const container = (res && res.result) || '';
    // 선택 그대로(쉼표 포함)로 먼저 찾고, 없으면 기호를 뗀 단어로 다시 찾습니다.
    sentence = WordBoxCore.sentenceAround(container, (info.selectionText || '').trim()) ||
      WordBoxCore.sentenceAround(container, selected);
  } catch (e) {
    sentence = ''; // 예문을 못 가져와도 단어는 담습니다
  }
  const { words = [] } = await chrome.storage.local.get('words');
  const r = WordBoxCore.addWord(words, { word: selected, sentence, url: tab.url || '', title: tab.title || '' }, Date.now());
  if (r.added || r.changed) await chrome.storage.local.set({ words: r.words });
  flash(r.added ? '+1' : '이미', r.added ? '#2563eb' : '#6b7280');
});
