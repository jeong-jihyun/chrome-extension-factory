(function () {
  var $ = function (id) { return document.getElementById(id); };
  var hist = [];
  var lastUrl = '';
  function msg(t) { $('msg').textContent = t || ''; }

  function fillPresets() {
    var sel = $('preset');
    var o0 = document.createElement('option'); o0.value = ''; o0.textContent = '직접 입력'; sel.appendChild(o0);
    UtmCore.PRESETS.forEach(function (p, i) {
      var o = document.createElement('option'); o.value = String(i); o.textContent = p.name; sel.appendChild(o);
    });
  }

  function params() {
    return { source: $('source').value, medium: $('medium').value, campaign: $('campaign').value, term: $('term').value, content: $('content').value };
  }

  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return Promise.reject(new Error('no clipboard'));
  }

  function renderHist() {
    var ul = $('hist'); ul.textContent = '';
    if (!hist.length) { var li = document.createElement('li'); li.textContent = '아직 기록이 없습니다.'; ul.appendChild(li); return; }
    hist.forEach(function (u) {
      var li = document.createElement('li'); li.className = 'hrow';
      var sp = document.createElement('span'); sp.textContent = u;
      var b = document.createElement('button'); b.type = 'button'; b.textContent = '복사';
      b.addEventListener('click', function () { copy(u).then(function () { msg('복사했습니다.'); }, function () { msg('복사하지 못했습니다.'); }); });
      li.appendChild(sp); li.appendChild(b); ul.appendChild(li);
    });
  }

  $('preset').addEventListener('change', function () {
    var v = $('preset').value; if (v === '') return;
    var p = UtmCore.PRESETS[Number(v)];
    $('source').value = p.source; $('medium').value = p.medium;
  });

  $('make').addEventListener('click', function () {
    var r = UtmCore.build($('url').value, params(), { lowerSnake: $('snake').checked });
    if (r.error) { msg(r.error); $('out').textContent = ''; lastUrl = ''; return; }
    lastUrl = r.url; $('out').textContent = r.url;
    msg(r.replaced.length ? '이미 있던 ' + r.replaced.join(', ') + ' 값은 새 값으로 바꿨습니다.' : '');
    hist = [r.url].concat(hist.filter(function (x) { return x !== r.url; })).slice(0, 20);
    chrome.storage.local.set({ hist: hist, form: Object.assign({ snake: $('snake').checked }, params()) });
    renderHist();
  });

  $('copy').addEventListener('click', function () {
    if (!lastUrl) { msg('먼저 링크 만들기를 눌러 주세요.'); return; }
    copy(lastUrl).then(function () { msg('복사했습니다.'); }, function () { msg('복사하지 못했습니다. 위 주소를 직접 선택해 복사해 주세요.'); });
  });
  $('clearHist').addEventListener('click', function () { hist = []; chrome.storage.local.set({ hist: hist }); renderHist(); });

  fillPresets();
  chrome.storage.local.get(['hist', 'form'], function (d) {
    hist = (d && d.hist) || [];
    var f = d && d.form;
    if (f) { ['source', 'medium', 'campaign', 'term', 'content'].forEach(function (k) { $(k).value = f[k] || ''; }); $('snake').checked = f.snake !== false; }
    renderHist();
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var t = tabs && tabs[0];
      if (t && t.url && /^https?:/.test(t.url) && !$('url').value) $('url').value = t.url;
    });
  });
})();
