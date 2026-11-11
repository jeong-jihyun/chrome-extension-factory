(function () {
  var $ = function (id) { return document.getElementById(id); };
  var state = { templates: [], current: null, editingId: null };

  function msg(t) { $('msg').textContent = t || ''; }
  function persist(cb) { chrome.storage.local.set({ templates: state.templates, current: state.current }, cb); }
  function cur() { return state.templates.filter(function (t) { return t.id === state.current; })[0] || null; }

  function renderPicker() {
    var sel = $('pick');
    sel.textContent = '';
    state.templates.forEach(function (t) {
      var o = document.createElement('option');
      o.value = t.id; o.textContent = t.name;
      sel.appendChild(o);
    });
    if (cur()) sel.value = state.current;
    $('empty').hidden = state.templates.length > 0;
  }

  function renderUse() {
    var t = cur();
    $('useArea').hidden = !t || !$('editArea').hidden;
    if (!t) return;
    var box = $('vars');
    var old = {};
    Array.prototype.forEach.call(box.querySelectorAll('input'), function (i) { old[i.dataset.name] = i.value; });
    box.textContent = '';
    TemplateCore.extractVars(t.body).forEach(function (name) {
      var l = document.createElement('label'); l.textContent = name;
      var i = document.createElement('input'); i.type = 'text'; i.dataset.name = name; i.value = old[name] || '';
      i.addEventListener('input', renderPreview);
      l.appendChild(i); box.appendChild(l);
    });
    renderPreview();
  }

  function values() {
    var v = {};
    Array.prototype.forEach.call($('vars').querySelectorAll('input'), function (i) { v[i.dataset.name] = i.value; });
    return v;
  }

  function renderPreview() {
    var t = cur(); if (!t) return;
    $('preview').textContent = TemplateCore.fill(t.body, values());
  }

  function showEdit(t) {
    state.editingId = t ? t.id : null;
    $('name').value = t ? t.name : '';
    $('body').value = t ? t.body : '';
    $('del').hidden = !t;
    $('editArea').hidden = false; $('useArea').hidden = true;
    $('name').focus();
  }
  function hideEdit() { $('editArea').hidden = true; renderUse(); }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return Promise.reject(new Error('no clipboard'));
  }

  $('pick').addEventListener('change', function () { state.current = $('pick').value; persist(); renderUse(); msg(''); });
  $('new').addEventListener('click', function () { showEdit(null); msg(''); });
  $('edit').addEventListener('click', function () { showEdit(cur()); msg(''); });
  $('cancel').addEventListener('click', function () { hideEdit(); msg(''); });
  $('save').addEventListener('click', function () {
    var name = $('name').value.trim(), body = $('body').value;
    if (!name) { msg('이름을 적어 주세요.'); return; }
    if (!body.trim()) { msg('내용을 적어 주세요.'); return; }
    if (state.editingId) {
      var t = state.templates.filter(function (x) { return x.id === state.editingId; })[0];
      t.name = name; t.body = body;
    } else {
      var n = { id: TemplateCore.newId(), name: name, body: body };
      state.templates.push(n); state.current = n.id;
    }
    persist(function () { renderPicker(); hideEdit(); msg('저장했습니다.'); });
  });
  $('del').addEventListener('click', function () {
    if (!state.editingId) return;
    if (!confirm('이 템플릿을 지울까요? 되돌릴 수 없습니다.')) return;
    state.templates = state.templates.filter(function (x) { return x.id !== state.editingId; });
    state.current = state.templates[0] ? state.templates[0].id : null;
    persist(function () { renderPicker(); hideEdit(); msg('지웠습니다.'); });
  });
  $('copy').addEventListener('click', function () {
    var t = cur(); if (!t) return;
    var miss = TemplateCore.missing(t.body, values());
    var text = TemplateCore.fill(t.body, values());
    copyText(text).then(function () {
      msg(miss.length ? '복사했습니다. 비어 있는 칸: ' + miss.join(', ') : '복사했습니다.');
    }, function () { msg('복사하지 못했습니다. 아래 글을 직접 선택해 복사해 주세요.'); });
  });
  $('export').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify({ templates: state.templates }, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'prompt-templates.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    msg('내보냈습니다.');
  });
  $('import').addEventListener('click', function () { $('file').click(); });
  $('file').addEventListener('change', function () {
    var f = $('file').files[0]; if (!f) return;
    f.text().then(function (txt) {
      var add = TemplateCore.normalizeImport(txt);
      state.templates = state.templates.concat(add);
      if (!state.current && add[0]) state.current = add[0].id;
      persist(function () { renderPicker(); renderUse(); msg(add.length + '개를 불러왔습니다.'); });
    }).catch(function (e) { msg('불러오지 못했습니다: ' + e.message); });
    $('file').value = '';
  });

  chrome.storage.local.get(['templates', 'current'], function (d) {
    state.templates = (d && d.templates) || [];
    state.current = (d && d.current) || (state.templates[0] && state.templates[0].id) || null;
    renderPicker(); renderUse();
  });
})();
