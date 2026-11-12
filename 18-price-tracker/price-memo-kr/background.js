'use strict';
importScripts('lib.js');
const MENU_ID = 'record-price';
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: '가격 메모에 기록: "%s"',
    contexts: ['selection']
  });
});
function flash(text, color) {
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeText({ text });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000);
}
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  const price = parsePrice(info.selectionText);
  const res = await recordPrice(info.pageUrl || (tab && tab.url), tab && tab.title, price);
  flash(res.ok ? '저장' : '실패', res.ok ? '#2b8a3e' : '#c92a2a');
});
