(function () {
  var $ = function (id) { return document.getElementById(id); };
  function msg(t) { $('msg').textContent = t || ''; }
  var timer = null;

  function render() {
    var md = $('src').value;
    var tree = MdCore.parse(md);
    var pv = $('preview');
    pv.textContent = '';
    pv.appendChild(MdCore.toDom(tree, document));
    $('html').value = MdCore.toHtml(tree, { newWindow: $('newWin').checked }).trim();
  }

  function save() {
    clearTimeout(timer);
    timer = setTimeout(function () {
      chrome.storage.local.set({ draft: $('src').value, newWin: $('newWin').checked });
    }, 300);
  }

  $('src').addEventListener('input', function () { render(); save(); });
  $('newWin').addEventListener('change', function () { render(); save(); });
  $('clear').addEventListener('click', function () { $('src').value = ''; render(); save(); msg(''); });
  $('copyHtml').addEventListener('click', function () {
    var h = $('html').value;
    if (!h) { msg('복사할 내용이 없습니다.'); return; }
    var p = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(h) : Promise.reject();
    p.then(function () { msg('HTML을 복사했습니다. 블로그 글쓰기 화면을 HTML 모드로 바꾸고 붙여 넣으세요.'); },
      function () { msg('복사하지 못했습니다. "변환된 HTML 보기"에서 직접 선택해 복사해 주세요.'); });
  });

  chrome.storage.local.get(['draft', 'newWin'], function (d) {
    $('src').value = (d && d.draft) || '';
    $('newWin').checked = !!(d && d.newWin);
    render();
  });
})();
