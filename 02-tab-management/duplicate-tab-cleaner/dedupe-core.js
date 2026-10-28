// 중복 탭을 찾는 순수 함수 모음 (Node에서도 테스트 가능)
(function (root) {
  // 광고 추적용 주소 꼬리표. 페이지 내용과 상관없어서 비교할 때 무시한다
  var TRACKING = /^(utm_[a-z]+|fbclid|gclid|msclkid|igshid|mc_cid|mc_eid|yclid|_ga)$/i;

  // 같은 페이지인지 비교하기 위해 주소를 한 가지 모양으로 맞춘다
  function normalizeUrl(raw, opts) {
    opts = opts || {};
    var ignoreHash = opts.ignoreHash !== false;
    var ignoreTracking = opts.ignoreTracking !== false;
    var u;
    try {
      u = new URL(raw);
    } catch (e) {
      return null;
    }
    if (u.protocol !== "http:" && u.protocol !== "https:" && u.protocol !== "file:") return null;
    if (ignoreHash) u.hash = "";
    var params = [];
    u.searchParams.forEach(function (v, k) {
      if (!(ignoreTracking && TRACKING.test(k))) params.push([k, v]);
    });
    params.sort(function (a, b) {
      return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0;
    });
    var qs = params
      .map(function (p) {
        return encodeURIComponent(p[0]) + "=" + encodeURIComponent(p[1]);
      })
      .join("&");
    var path = u.pathname.length > 1 ? u.pathname.replace(/\/+$/, "") : u.pathname;
    return u.protocol + "//" + u.host.toLowerCase() + path + (qs ? "?" + qs : "") + (ignoreHash ? "" : u.hash);
  }

  // 탭 목록에서 중복 묶음을 만든다. 각 묶음의 keep은 남길 탭, close는 닫을 탭들
  // 남기는 순서: 고정된 탭 > 지금 보고 있는 탭 > 번호가 작은(먼저 열린) 탭
  function findDuplicates(tabs, opts) {
    var groups = {};
    tabs.forEach(function (t) {
      if (!t.url) return;
      var key = normalizeUrl(t.url, opts);
      if (!key) return;
      (groups[key] = groups[key] || []).push(t);
    });
    var out = [];
    Object.keys(groups).forEach(function (key) {
      var list = groups[key];
      if (list.length < 2) return;
      list = list.slice().sort(function (a, b) {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
        if (!!a.active !== !!b.active) return a.active ? -1 : 1;
        return a.id - b.id;
      });
      var keep = list[0];
      // 고정된 탭은 중복이어도 닫지 않는다
      var close = list.slice(1).filter(function (t) {
        return !t.pinned;
      });
      if (close.length) out.push({ key: key, keep: keep, close: close });
    });
    return out;
  }

  var api = { normalizeUrl: normalizeUrl, findDuplicates: findDuplicates };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.DedupeCore = api;
})(typeof self !== "undefined" ? self : this);
