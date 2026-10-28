// 메모 저장 키 만들기, 검색, 내보내기용 글 만들기 (Node에서도 테스트 가능)
(function (root) {
  var TRACKING = /^(utm_[a-z]+|fbclid|gclid|msclkid|igshid|mc_cid|mc_eid|yclid|_ga)$/i;

  // scope가 "page"면 페이지 단위, "site"면 사이트(주소의 도메인) 단위 키를 만든다
  function makeKey(rawUrl, scope) {
    var u;
    try {
      u = new URL(rawUrl);
    } catch (e) {
      return null;
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (scope === "site") return "site:" + u.host.toLowerCase();
    u.hash = "";
    var keep = [];
    u.searchParams.forEach(function (v, k) {
      if (!TRACKING.test(k)) keep.push([k, v]);
    });
    keep.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
    var qs = keep.map(function (p) { return encodeURIComponent(p[0]) + "=" + encodeURIComponent(p[1]); }).join("&");
    var path = u.pathname.length > 1 ? u.pathname.replace(/\/+$/, "") : u.pathname;
    return "page:" + u.host.toLowerCase() + path + (qs ? "?" + qs : "");
  }

  // 검색어가 메모 글, 제목, 주소 중 어디에든 있으면 통과 (대소문자 무시)
  function search(notes, query) {
    var q = (query || "").trim().toLowerCase();
    var rows = Object.keys(notes).map(function (k) { return Object.assign({ key: k }, notes[k]); });
    if (q) {
      rows = rows.filter(function (n) {
        return (n.text + " " + (n.title || "") + " " + (n.url || "")).toLowerCase().indexOf(q) !== -1;
      });
    }
    return rows.sort(function (a, b) { return (b.updated || 0) - (a.updated || 0); });
  }

  // 모든 메모를 사람이 읽기 쉬운 글 파일로 만든다
  function toText(notes) {
    return search(notes, "")
      .map(function (n) {
        var d = new Date(n.updated || 0).toLocaleString("ko-KR");
        return "## " + (n.title || n.key) + "\n" + (n.url || "") + "\n(" + (n.scope === "site" ? "사이트 메모" : "페이지 메모") + " · " + d + ")\n\n" + n.text + "\n";
      })
      .join("\n---\n\n");
  }

  var api = { makeKey: makeKey, search: search, toText: toText };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.NotesCore = api;
})(typeof self !== "undefined" ? self : this);
