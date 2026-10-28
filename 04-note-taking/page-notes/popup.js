// 팝업 동작: 현재 페이지(또는 사이트)의 메모를 자동 저장하고, 전체 메모를 검색·내보낸다
var $ = function (id) { return document.getElementById(id); };
var scope = "page";
var tab = null;
var notes = {};
var saveTimer = null;

function say(text) {
  $("msg").textContent = text;
}

function currentKey() {
  return tab && tab.url ? NotesCore.makeKey(tab.url, scope) : null;
}

function showWrite() {
  var key = currentKey();
  if (!key) {
    $("target").textContent = "이 페이지에는 메모를 남길 수 없습니다. (일반 웹페이지만 가능)";
    $("text").disabled = true;
    $("text").value = "";
    return;
  }
  $("text").disabled = false;
  $("target").textContent = scope === "site" ? "사이트: " + new URL(tab.url).host : "페이지: " + tab.url;
  $("text").value = notes[key] ? notes[key].text : "";
}

function persist() {
  return chrome.storage.local.set({ notes: notes });
}

function onType() {
  var key = currentKey();
  if (!key) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async function () {
    var text = $("text").value;
    if (text.trim() === "") {
      delete notes[key];
    } else {
      notes[key] = { text: text, title: tab.title || "", url: tab.url, scope: scope, updated: Date.now() };
    }
    await persist();
    $("saved").textContent = "저장됨 " + new Date().toLocaleTimeString("ko-KR");
  }, 300);
}

function renderList() {
  var rows = NotesCore.search(notes, $("q").value);
  $("list").textContent = "";
  if (!rows.length) {
    var li = document.createElement("li");
    li.textContent = "메모가 없습니다.";
    $("list").appendChild(li);
    return;
  }
  rows.forEach(function (n) {
    var li = document.createElement("li");
    var h = document.createElement("span");
    h.className = "h";
    h.textContent = (n.scope === "site" ? "[사이트] " : "") + (n.title || n.url || n.key);
    h.title = n.url || "";
    h.addEventListener("click", function () {
      if (n.url) chrome.tabs.create({ url: n.url });
    });
    var b = document.createElement("span");
    b.className = "b";
    b.textContent = n.text.replace(/\s+/g, " ");
    li.appendChild(h);
    li.appendChild(b);
    $("list").appendChild(li);
  });
}

function download(name, type, content) {
  var a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type: type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function setScope(s) {
  scope = s;
  $("scopePage").className = s === "page" ? "on" : "";
  $("scopeSite").className = s === "site" ? "on" : "";
  showWrite();
}

function setView(v) {
  $("write").hidden = v !== "write";
  $("all").hidden = v !== "all";
  $("tabWrite").className = v === "write" ? "on" : "";
  $("tabList").className = v === "all" ? "on" : "";
  if (v === "all") renderList();
}

$("tabWrite").addEventListener("click", function () { setView("write"); });
$("tabList").addEventListener("click", function () { setView("all"); });
$("scopePage").addEventListener("click", function () { setScope("page"); });
$("scopeSite").addEventListener("click", function () { setScope("site"); });
$("text").addEventListener("input", onType);
$("q").addEventListener("input", renderList);
$("remove").addEventListener("click", async function () {
  var key = currentKey();
  if (key && notes[key]) {
    delete notes[key];
    await persist();
  }
  $("text").value = "";
  say("메모를 지웠습니다.");
});
$("exportTxt").addEventListener("click", function () {
  download("page-notes.txt", "text/plain;charset=utf-8", NotesCore.toText(notes));
});
$("exportJson").addEventListener("click", function () {
  download("page-notes.json", "application/json", JSON.stringify(notes, null, 2));
});

(async function init() {
  var stored = await chrome.storage.local.get("notes");
  notes = stored.notes || {};
  var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  tab = tabs[0] || null;
  showWrite();
})();
