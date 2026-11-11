(function (root) {
  var RE = /\{\{\s*([^{}\n]+?)\s*\}\}/g;

  function extractVars(body) {
    var seen = [], m;
    RE.lastIndex = 0;
    while ((m = RE.exec(String(body || '')))) { if (seen.indexOf(m[1]) < 0) seen.push(m[1]); }
    return seen;
  }

  function fill(body, values) {
    values = values || {};
    return String(body || '').replace(RE, function (all, name) {
      return Object.prototype.hasOwnProperty.call(values, name) && values[name] !== '' ? values[name] : all;
    });
  }

  function missing(body, values) {
    values = values || {};
    return extractVars(body).filter(function (n) { return !values[n]; });
  }

  function newId() { return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function normalizeImport(json) {
    var data = typeof json === 'string' ? JSON.parse(json) : json;
    if (!data || !Array.isArray(data.templates)) throw new Error('형식이 맞지 않는 파일입니다.');
    return data.templates
      .filter(function (t) { return t && typeof t.name === 'string' && typeof t.body === 'string' && t.name.trim(); })
      .map(function (t) { return { id: newId(), name: t.name.trim().slice(0, 80), body: t.body.slice(0, 20000) }; });
  }

  var api = { extractVars: extractVars, fill: fill, missing: missing, newId: newId, normalizeImport: normalizeImport };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TemplateCore = api;
})(typeof self !== 'undefined' ? self : this);
