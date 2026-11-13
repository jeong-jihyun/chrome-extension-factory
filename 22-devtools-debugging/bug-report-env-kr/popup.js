const $ = (id) => document.getElementById(id);
const statusEl = $('status');
function setStatus(t, ok) { statusEl.textContent = t; statusEl.className = ok ? 'ok' : 'err'; }

$('collect').addEventListener('click', async () => {
  setStatus('', true);
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab || tab.id === undefined) { setStatus('열려 있는 탭을 찾지 못했습니다.', false); return; }
    const res = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: collectEnv });
    const env = res && res[0] && res[0].result;
    if (!env) { setStatus('정보를 가져오지 못했습니다.', false); return; }
    $('out').value = formatReport(env, $('strip').checked);
    setStatus('모았습니다. 위 빈칸을 채운 뒤 복사하세요.', true);
  } catch (e) {
    setStatus('이 탭에서는 정보를 가져올 수 없습니다(크롬 설정 페이지·웹스토어 등). 일반 웹 페이지에서 다시 눌러 주세요.', false);
  }
});

$('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('out').value); setStatus('복사했습니다.', true); }
  catch (e) { $('out').select(); setStatus('자동 복사에 실패했습니다. Ctrl+C로 복사하세요.', false); }
});

$('strip').addEventListener('change', () => chrome.storage.local.set({ strip: $('strip').checked }));
chrome.storage.local.get({ strip: true }, (s) => { $('strip').checked = s.strip; });
