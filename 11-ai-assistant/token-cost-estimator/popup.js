(function () {
  var $ = function (id) { return document.getElementById(id); };
  var KEYS = ['inPrice', 'outPrice', 'outTokens', 'ctx', 'unit', 'hangul', 'latin', 'other'];
  var settings = Object.assign({}, TokenCore.DEFAULTS);

  function readSettings() {
    KEYS.forEach(function (k) {
      var v = $(k).value;
      settings[k] = k === 'unit' ? (v || '원') : (v === '' ? TokenCore.DEFAULTS[k] : Number(v));
    });
  }

  function render() {
    readSettings();
    var s = TokenCore.summarize($('text').value, settings);
    var u = settings.unit;
    $('rChars').textContent = s.chars.toLocaleString('ko-KR');
    $('rTokens').textContent = '약 ' + s.tokens.toLocaleString('ko-KR');
    $('rIn').textContent = TokenCore.fmtMoney(s.inCost) + ' ' + u;
    $('rOut').textContent = TokenCore.fmtMoney(s.outCost) + ' ' + u;
    $('rTotal').textContent = TokenCore.fmtMoney(s.total) + ' ' + u;
    var c = $('rCtx');
    if (s.ctxPercent === null) { c.textContent = '-'; c.className = ''; }
    else {
      c.textContent = s.ctxPercent.toFixed(1) + '%';
      c.className = s.ctxPercent > 100 ? 'bad' : (s.ctxPercent > 80 ? 'warn' : 'ok');
    }
  }

  function save() {
    readSettings();
    chrome.storage.local.set({ settings: settings });
  }

  function msg(t) { $('msg').textContent = t; }

  function getSelection() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var tab = tabs && tabs[0];
      if (!tab) { msg('현재 탭을 찾지 못했습니다.'); return; }
      chrome.scripting.executeScript({ target: { tabId: tab.id }, func: function () { return String(window.getSelection()); } }, function (res) {
        if (chrome.runtime.lastError || !res || !res[0]) { msg('이 페이지에서는 글을 가져올 수 없습니다. 직접 붙여 넣어 주세요.'); return; }
        var t = res[0].result || '';
        if (!t) { msg('선택한 글이 없습니다. 페이지에서 글을 드래그한 뒤 다시 눌러 주세요.'); return; }
        $('text').value = t; msg(''); render();
      });
    });
  }

  chrome.storage.local.get('settings', function (d) {
    Object.assign(settings, d && d.settings);
    KEYS.forEach(function (k) { $(k).value = settings[k]; });
    render();
  });
  $('text').addEventListener('input', render);
  KEYS.forEach(function (k) { $(k).addEventListener('input', function () { render(); save(); }); });
  $('getSel').addEventListener('click', getSelection);
  $('clear').addEventListener('click', function () { $('text').value = ''; msg(''); render(); });
})();
