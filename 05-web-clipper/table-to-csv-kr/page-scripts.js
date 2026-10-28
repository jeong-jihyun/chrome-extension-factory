// 아래 함수들은 chrome.scripting.executeScript로 "웹페이지 안에서" 실행된다.
// 그래서 각 함수는 바깥 변수를 쓰지 않고, 필요한 것을 전부 안에 담고 있어야 한다.

// 페이지의 표 목록을 모은다 (칸 수, 행 수, 첫 줄 미리보기)
function pageListTables() {
  var tables = Array.prototype.slice.call(document.querySelectorAll("table"));
  return tables
    .map(function (t, i) {
      var rows = t.rows.length;
      var first = t.rows[0] ? Array.prototype.map.call(t.rows[0].cells, function (c) { return c.innerText.trim(); }) : [];
      // 열 수는 병합 칸(rowspan/colspan)까지 계산해야 정확하다. 점유 표시판을 만들어 가장 넓은 줄을 구한다
      var used = [];
      var cols = 0;
      Array.prototype.forEach.call(t.rows, function (tr, r) {
        used[r] = used[r] || [];
        var c = 0;
        Array.prototype.forEach.call(tr.cells, function (cell) {
          while (used[r][c]) c++;
          var rs = Math.max(1, cell.rowSpan || 1);
          var cs = Math.max(1, cell.colSpan || 1);
          for (var a = 0; a < rs; a++) {
            used[r + a] = used[r + a] || [];
            for (var b = 0; b < cs; b++) used[r + a][c + b] = true;
          }
          c += cs;
        });
        cols = Math.max(cols, used[r].length);
      });
      return { index: i, rows: rows, cols: cols, preview: first.join(" | ").slice(0, 80) };
    })
    .filter(function (t) { return t.rows > 0; });
}

// 표 하나를 병합 칸(rowspan/colspan)까지 펼친 글자 격자로 바꾼다
function pageExtractTable(index) {
  var t = document.querySelectorAll("table")[index];
  if (!t) return null;
  var grid = [];
  Array.prototype.forEach.call(t.rows, function (tr, r) {
    grid[r] = grid[r] || [];
    var c = 0;
    Array.prototype.forEach.call(tr.cells, function (cell) {
      while (grid[r][c] !== undefined) c++; // 위쪽 병합 칸이 이미 차지한 자리는 건너뛴다
      var text = cell.innerText.replace(/\s+/g, " ").trim();
      var rs = Math.max(1, cell.rowSpan || 1);
      var cs = Math.max(1, cell.colSpan || 1);
      for (var i = 0; i < rs; i++) {
        grid[r + i] = grid[r + i] || [];
        for (var j = 0; j < cs; j++) grid[r + i][c + j] = text;
      }
      c += cs;
    });
  });
  var width = grid.reduce(function (m, row) { return Math.max(m, row.length); }, 0);
  return grid.map(function (row) {
    var out = [];
    for (var k = 0; k < width; k++) out.push(row[k] === undefined ? "" : row[k]);
    return out;
  });
}

// 고른 표를 파란 테두리로 표시하고 화면 가운데로 옮긴다 (pageHighlight(-1)이면 표시 제거)
function pageHighlight(index) {
  var prev = document.querySelector("[data-tcsv-hl]");
  if (prev) {
    prev.style.outline = prev.getAttribute("data-tcsv-hl");
    prev.removeAttribute("data-tcsv-hl");
  }
  if (index < 0) return;
  var t = document.querySelectorAll("table")[index];
  if (!t) return;
  t.setAttribute("data-tcsv-hl", t.style.outline || "");
  t.style.outline = "3px solid #1a73e8";
  t.scrollIntoView({ block: "center", behavior: "smooth" });
}
