// 북마크 트리에서 중복과 빈 폴더를 찾는 순수 함수 모음 (Node에서도 테스트 가능)
(function (root) {
  var TRACKING = /^(utm_[a-z]+|fbclid|gclid|msclkid|igshid|mc_cid|mc_eid|yclid|_ga)$/i;

  // 같은 주소인지 비교하기 위해 한 가지 모양으로 맞춘다
  function normalizeUrl(raw) {
    var u;
    try {
      u = new URL(raw);
    } catch (e) {
      return null;
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    var params = [];
    u.searchParams.forEach(function (v, k) {
      if (!TRACKING.test(k)) params.push([k, v]);
    });
    params.sort(function (a, b) {
      return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0;
    });
    var qs = params.map(function (p) { return encodeURIComponent(p[0]) + "=" + encodeURIComponent(p[1]); }).join("&");
    var path = u.pathname.length > 1 ? u.pathname.replace(/\/+$/, "") : u.pathname;
    return u.protocol + "//" + u.host.toLowerCase() + path + (qs ? "?" + qs : "");
  }

  // 트리를 한 번 훑어서 북마크 목록(폴더 경로 포함)과 빈 폴더 목록을 만든다
  function walk(node, path, out) {
    var isRoot = !node.parentId; // 맨 위 가짜 루트
    var isTopFolder = node.parentId === "0"; // 북마크바, 기타 북마크 등 지울 수 없는 폴더
    // 눈에 보이지 않는 가짜 루트만 경로에서 뺀다. 북마크바/기타 북마크는 위치를 구분하려고 경로에 넣는다
    var here = isRoot ? path : path.concat(node.title || "(이름 없음)");
    if (node.url) {
      out.bookmarks.push({ id: node.id, title: node.title, url: node.url, dateAdded: node.dateAdded || 0, path: path.join(" / ") });
      return { hasBookmark: true };
    }
    var any = false;
    var emptyChildren = [];
    (node.children || []).forEach(function (c) {
      var r = walk(c, here, out);
      if (r.hasBookmark) any = true;
      else if (r.folderId) emptyChildren.push(r);
    });
    if (any) {
      // 이 폴더에는 북마크가 있으므로, 빈 하위 폴더들만 각각 후보에 올린다
      emptyChildren.forEach(function (r) { out.emptyFolders.push({ id: r.folderId, path: r.path }); });
      return { hasBookmark: true };
    }
    if (isRoot || isTopFolder) {
      // 지울 수 없는 폴더 안의 빈 하위 폴더는 각각 후보에 올린다
      emptyChildren.forEach(function (r) { out.emptyFolders.push({ id: r.folderId, path: r.path }); });
      return { hasBookmark: false };
    }
    return { hasBookmark: false, folderId: node.id, path: here.join(" / ") };
  }

  function scanTree(tree) {
    var out = { bookmarks: [], emptyFolders: [] };
    (tree || []).forEach(function (n) { walk(n, [], out); });
    var map = {};
    out.bookmarks.forEach(function (b) {
      var key = normalizeUrl(b.url);
      if (!key) return;
      (map[key] = map[key] || []).push(b);
    });
    var groups = [];
    Object.keys(map).forEach(function (key) {
      if (map[key].length < 2) return;
      var items = map[key].slice().sort(function (a, b) { return a.dateAdded - b.dateAdded; });
      groups.push({ key: key, items: items });
    });
    return { groups: groups, emptyFolders: out.emptyFolders, total: out.bookmarks.length };
  }

  var api = { normalizeUrl: normalizeUrl, scanTree: scanTree };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BookmarkCore = api;
})(typeof self !== "undefined" ? self : this);
