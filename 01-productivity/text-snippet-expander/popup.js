// 단축어 목록을 보여 주고 추가·삭제·내보내기·가져오기를 처리한다
var listEl = document.getElementById("list");
var msgEl = document.getElementById("msg");
var snippets = {};

function say(text, ok) {
  msgEl.textContent = text;
  msgEl.className = ok ? "ok" : "";
}

function save() {
  return chrome.storage.local.set({ snippets: snippets });
}

function render() {
  listEl.textContent = "";
  var keys = Object.keys(snippets).sort();
  if (keys.length === 0) {
    var empty = document.createElement("li");
    empty.textContent = "저장된 단축어가 없습니다.";
    listEl.appendChild(empty);
    return;
  }
  keys.forEach(function (key) {
    var li = document.createElement("li");
    var code = document.createElement("code");
    code.textContent = key;
    var span = document.createElement("span");
    span.textContent = snippets[key].replace(/\n/g, " ↵ ");
    span.title = snippets[key];
    var del = document.createElement("button");
    del.textContent = "삭제";
    del.addEventListener("click", function () {
      delete snippets[key];
      save().then(function () {
        render();
        say("삭제했습니다.", true);
      });
    });
    li.appendChild(code);
    li.appendChild(span);
    li.appendChild(del);
    listEl.appendChild(li);
  });
}

chrome.storage.local.get("snippets", function (r) {
  if (r.snippets === undefined) {
    // 처음 열었을 때만 예시 2개를 넣어 준다
    snippets = { ";인사": "안녕하세요.", ";날짜": "{날짜}" };
    save().then(render);
  } else {
    snippets = r.snippets;
    render();
  }
});

document.getElementById("add").addEventListener("click", function () {
  var shortcut = document.getElementById("shortcut").value.trim();
  var content = document.getElementById("content").value;
  var problem = ExpandCore.validateShortcut(shortcut, content);
  if (problem) return say(problem, false);
  snippets[shortcut] = content;
  save().then(function () {
    document.getElementById("shortcut").value = "";
    document.getElementById("content").value = "";
    render();
    say("저장했습니다.", true);
  });
});

document.getElementById("export").addEventListener("click", function () {
  var blob = new Blob([JSON.stringify(snippets, null, 2)], { type: "application/json" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "snippets.json";
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById("importBtn").addEventListener("click", function () {
  document.getElementById("importFile").click();
});

document.getElementById("importFile").addEventListener("change", function (e) {
  var file = e.target.files[0];
  if (!file) return;
  file.text().then(function (text) {
    var data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      return say("JSON 파일이 올바르지 않습니다.", false);
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) return say("단축어 목록 형식이 아닙니다.", false);
    var added = 0;
    Object.keys(data).forEach(function (k) {
      if (typeof data[k] === "string" && !ExpandCore.validateShortcut(k, data[k])) {
        snippets[k] = data[k];
        added++;
      }
    });
    save().then(function () {
      render();
      say(added + "개를 가져왔습니다.", true);
    });
  });
});
