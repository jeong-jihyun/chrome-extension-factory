// 표 → 글자 격자 → CSV/TSV 변환 (Node에서도 테스트 가능)
(function (root) {
  // 엑셀에서 열 때 수식으로 실행될 수 있는 값(=, @, 숫자가 아닌 +/- 시작)은 앞에 ' 를 붙여 안전하게 만든다
  function neutralize(cell) {
    var s = String(cell);
    if (/^[=@]/.test(s)) return "'" + s;
    if (/^[+-]/.test(s) && !/^[+-]\s?[\d.,]/.test(s)) return "'" + s;
    return s;
  }

  function csvCell(cell) {
    var s = neutralize(cell);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  // withBom이 true면 맨 앞에 UTF-8 표시(BOM)를 붙여 엑셀에서 한글이 깨지지 않게 한다
  function toCsv(grid, withBom) {
    var body = grid.map(function (row) { return row.map(csvCell).join(","); }).join("\r\n");
    return (withBom ? "﻿" : "") + body + "\r\n";
  }

  // 엑셀에 바로 붙여넣기 좋은 탭 구분 글. 칸 안의 탭/줄바꿈은 공백으로 바꾼다
  function toTsv(grid) {
    return grid
      .map(function (row) {
        return row.map(function (c) { return neutralize(c).replace(/[\t\r\n]+/g, " "); }).join("\t");
      })
      .join("\n");
  }

  var api = { neutralize: neutralize, toCsv: toCsv, toTsv: toTsv };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TableCore = api;
})(typeof self !== "undefined" ? self : this);
