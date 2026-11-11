(function () {
  var $ = function (id) { return document.getElementById(id); };
  var KEYS = ['titleMax', 'descMin', 'descMax'];
  var limits = Object.assign({}, SeoCore.DEFAULT_LIMITS);
  var LABEL = { ok: '양호', warn: '확인', bad: '문제' };
  function msg(t) { $('msg').textContent = t || ''; }

  function readLimits() {
    KEYS.forEach(function (k) { var v = Number($(k).value); if (v > 0) limits[k] = v; });
  }

  function render(d) {
    var p = SeoCore.preview(d);
    $('pvT').textContent = p.title; $('pvU').textContent = p.url; $('pvD').textContent = p.description;
    var ul = $('list'); ul.textContent = '';
    SeoCore.analyze(d, limits).forEach(function (r) {
      var li = document.createElement('li');
      var pill = document.createElement('span'); pill.className = 'pill ' + r.level; pill.textContent = LABEL[r.level];
      var nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = r.name;
      li.appendChild(pill); li.appendChild(nm); li.appendChild(document.createTextNode(r.text));
      ul.appendChild(li);
    });
    $('result').hidden = false;
  }

  $('run').addEventListener('click', function () {
    readLimits();
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var tab = tabs && tabs[0];
      if (!tab) { msg('현재 탭을 찾지 못했습니다.'); return; }
      chrome.scripting.executeScript({ target: { tabId: tab.id }, func: SeoCore.collectInPage }, function (res) {
        if (chrome.runtime.lastError || !res || !res[0] || !res[0].result) {
          msg('이 페이지는 점검할 수 없습니다. (크롬 설정·웹 스토어 같은 보호된 페이지일 수 있습니다.)'); return;
        }
        msg(''); render(res[0].result);
      });
    });
  });
  KEYS.forEach(function (k) {
    $(k).addEventListener('input', function () { readLimits(); chrome.storage.local.set({ limits: limits }); });
  });
  chrome.storage.local.get('limits', function (d) {
    Object.assign(limits, d && d.limits);
    KEYS.forEach(function (k) { $(k).value = limits[k]; });
  });
})();
