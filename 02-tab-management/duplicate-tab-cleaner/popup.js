// 팝업 동작: 검사 → 목록 보기 → 닫기 → 되살리기
var $ = function (id) { return document.getElementById(id); };
var groups = [];

function options() {
  return { ignoreHash: $("ignoreHash").checked, ignoreTracking: $("ignoreTracking").checked };
}

function say(text) {
  $("msg").textContent = text;
}

function queryTabs() {
  var q = $("allWindows").checked ? {} : { currentWindow: true };
  return chrome.tabs.query(q);
}

async function scan() {
  var tabs = await queryTabs();
  groups = DedupeCore.findDuplicates(tabs, options());
  var closeCount = groups.reduce(function (sum, g) { return sum + g.close.length; }, 0);

  $("list").textContent = "";
  groups.forEach(function (g) {
    var li = document.createElement("li");
    var title = document.createElement("span");
    title.className = "t";
    title.textContent = g.keep.title || g.keep.url;
    title.title = g.keep.url;
    var note = document.createElement("span");
    note.className = "n";
    note.textContent = "남김 1개 · 닫을 탭 " + g.close.length + "개";
    li.appendChild(title);
    li.appendChild(note);
    $("list").appendChild(li);
  });

  $("summary").textContent = closeCount
    ? "중복된 페이지 " + groups.length + "곳, 닫을 탭 " + closeCount + "개"
    : "중복 탭이 없습니다.";
  $("clean").disabled = closeCount === 0;

  var saved = await chrome.storage.local.get("lastClosed");
  $("undo").disabled = !(saved.lastClosed && saved.lastClosed.length);
}

async function clean() {
  var urls = [];
  var ids = [];
  groups.forEach(function (g) {
    g.close.forEach(function (t) {
      ids.push(t.id);
      urls.push(t.url);
    });
  });
  if (!ids.length) return;
  // 닫기 전에 주소를 저장해 둬야 되살릴 수 있다
  await chrome.storage.local.set({ lastClosed: urls });
  await chrome.tabs.remove(ids);
  await scan();
  say(ids.length + "개를 닫았습니다.");
}

async function undo() {
  var saved = await chrome.storage.local.get("lastClosed");
  var urls = saved.lastClosed || [];
  for (var i = 0; i < urls.length; i++) {
    await chrome.tabs.create({ url: urls[i], active: false });
  }
  await chrome.storage.local.remove("lastClosed");
  await scan();
  say(urls.length + "개를 다시 열었습니다.");
}

$("scan").addEventListener("click", function () { say(""); scan(); });
$("clean").addEventListener("click", clean);
$("undo").addEventListener("click", undo);
["ignoreHash", "ignoreTracking", "allWindows"].forEach(function (id) {
  $(id).addEventListener("change", scan);
});
scan();
