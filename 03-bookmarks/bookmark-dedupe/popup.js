// 팝업 동작: 검사 → 남길 것 고르기 → 백업 저장 → 정리
var $ = function (id) { return document.getElementById(id); };
var scanResult = null;
var backedUp = false;

function say(text) {
  $("msg").textContent = text;
}

async function scan() {
  var tree = await chrome.bookmarks.getTree();
  scanResult = BookmarkCore.scanTree(tree);
  backedUp = false;
  $("result").textContent = "";

  scanResult.groups.forEach(function (g, gi) {
    var box = document.createElement("div");
    box.className = "grp";
    var u = document.createElement("span");
    u.className = "u";
    u.textContent = g.items[0].title || g.key;
    u.title = g.key;
    box.appendChild(u);
    g.items.forEach(function (b, i) {
      var label = document.createElement("label");
      var radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "keep-" + gi;
      radio.value = b.id;
      radio.checked = i === 0; // 가장 먼저 저장한 북마크를 기본으로 남긴다
      var p = document.createElement("span");
      p.className = "p";
      p.textContent = " " + (b.path || "(최상위)") + " · " + new Date(b.dateAdded).toLocaleDateString("ko-KR");
      label.appendChild(radio);
      label.appendChild(document.createTextNode("남김"));
      label.appendChild(p);
      box.appendChild(label);
    });
    $("result").appendChild(box);
  });

  if (scanResult.emptyFolders.length) {
    var h = document.createElement("h2");
    h.textContent = "빈 폴더 " + scanResult.emptyFolders.length + "개";
    $("result").appendChild(h);
    scanResult.emptyFolders.forEach(function (f) {
      var label = document.createElement("label");
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "emptyFolder";
      cb.value = f.id;
      cb.checked = true;
      label.appendChild(cb);
      label.appendChild(document.createTextNode(" " + f.path));
      $("result").appendChild(label);
      $("result").appendChild(document.createElement("br"));
    });
  }

  var dupCount = scanResult.groups.reduce(function (s, g) { return s + g.items.length - 1; }, 0);
  $("summary").textContent = "북마크 " + scanResult.total + "개 검사 · 중복 " + dupCount + "개 · 빈 폴더 " + scanResult.emptyFolders.length + "개";
  $("backup").disabled = dupCount === 0 && scanResult.emptyFolders.length === 0;
  $("apply").disabled = true;
}

async function backup() {
  var tree = await chrome.bookmarks.getTree();
  var blob = new Blob([JSON.stringify(tree, null, 2)], { type: "application/json" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "bookmarks-backup-" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
  URL.revokeObjectURL(a.href);
  backedUp = true;
  $("apply").disabled = false;
  say("백업 파일을 저장했습니다. 이제 정리할 수 있습니다.");
}

async function apply() {
  if (!backedUp) return say("먼저 백업을 저장하세요.");
  var removed = 0;
  for (var gi = 0; gi < scanResult.groups.length; gi++) {
    var sel = document.querySelector('input[name="keep-' + gi + '"]:checked');
    var keepId = sel ? sel.value : null;
    for (var i = 0; i < scanResult.groups[gi].items.length; i++) {
      var b = scanResult.groups[gi].items[i];
      if (b.id !== keepId) {
        await chrome.bookmarks.remove(b.id);
        removed++;
      }
    }
  }
  var folders = document.querySelectorAll(".emptyFolder:checked");
  for (var j = 0; j < folders.length; j++) {
    try {
      await chrome.bookmarks.removeTree(folders[j].value);
      removed++;
    } catch (e) {
      // 이미 지워졌거나 지울 수 없는 폴더면 넘어간다
    }
  }
  await scan();
  say(removed + "개를 정리했습니다.");
}

$("scan").addEventListener("click", function () { say(""); scan(); });
$("backup").addEventListener("click", backup);
$("apply").addEventListener("click", apply);
