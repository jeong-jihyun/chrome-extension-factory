// 팝업 동작: 표 찾기 → 고르기(페이지에 파란 테두리) → CSV 저장 / 복사
var $ = function (id) { return document.getElementById(id); };
var tabId = null;
var found = []; // { frameId, index, rows, cols, preview }
var selected = null;

function say(text, isErr) {
  $("msg").textContent = text;
  $("msg").className = isErr ? "err" : "";
}

async function run(frameId, func, args) {
  var res = await chrome.scripting.executeScript({ target: { tabId: tabId, frameIds: [frameId] }, func: func, args: args || [] });
  return res[0] ? res[0].result : null;
}

async function find() {
  say("");
  var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs[0]) return say("현재 탭을 찾을 수 없습니다.", true);
  tabId = tabs[0].id;
  found = [];
  selected = null;
  try {
    // 페이지 안의 iframe까지 모두 찾는다
    var results = await chrome.scripting.executeScript({ target: { tabId: tabId, allFrames: true }, func: pageListTables });
    results.forEach(function (r) {
      (r.result || []).forEach(function (t) {
        found.push({ frameId: r.frameId, index: t.index, rows: t.rows, cols: t.cols, preview: t.preview });
      });
    });
  } catch (e) {
    return say("이 페이지에서는 표를 읽을 수 없습니다. (크롬 설정 화면, 스토어 등은 불가)", true);
  }
  render();
}

function render() {
  $("list").textContent = "";
  found.forEach(function (t, i) {
    var li = document.createElement("li");
    var n = document.createElement("span");
    n.className = "n";
    n.textContent = "표 " + (i + 1) + " · " + t.rows + "행 × " + t.cols + "열";
    var p = document.createElement("span");
    p.className = "p";
    p.textContent = t.preview || "(첫 줄이 비어 있음)";
    li.appendChild(n);
    li.appendChild(p);
    li.addEventListener("click", function () { choose(i); });
    $("list").appendChild(li);
  });
  $("summary").textContent = found.length ? "표 " + found.length + "개를 찾았습니다. 하나를 고르세요." : "표를 찾지 못했습니다.";
  $("save").disabled = true;
  $("copy").disabled = true;
}

async function choose(i) {
  selected = found[i];
  Array.prototype.forEach.call($("list").children, function (li, k) { li.className = k === i ? "sel" : ""; });
  $("save").disabled = false;
  $("copy").disabled = false;
  // 모든 프레임의 이전 표시를 지우고, 고른 표만 표시한다
  for (var k = 0; k < found.length; k++) await run(found[k].frameId, pageHighlight, [-1]);
  await run(selected.frameId, pageHighlight, [selected.index]);
}

async function getGrid() {
  if (!selected) return null;
  return run(selected.frameId, pageExtractTable, [selected.index]);
}

$("save").addEventListener("click", async function () {
  var grid = await getGrid();
  if (!grid) return say("표를 읽지 못했습니다. 다시 찾아 주세요.", true);
  var csv = TableCore.toCsv(grid, $("bom").checked);
  var a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = "table-" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click();
  URL.revokeObjectURL(a.href);
  say(grid.length + "행을 저장했습니다.");
});

$("copy").addEventListener("click", async function () {
  var grid = await getGrid();
  if (!grid) return say("표를 읽지 못했습니다. 다시 찾아 주세요.", true);
  try {
    await navigator.clipboard.writeText(TableCore.toTsv(grid));
    say(grid.length + "행을 복사했습니다. 엑셀에서 붙여넣으세요.");
  } catch (e) {
    say("복사에 실패했습니다: " + e.message, true);
  }
});

$("find").addEventListener("click", find);
find();
