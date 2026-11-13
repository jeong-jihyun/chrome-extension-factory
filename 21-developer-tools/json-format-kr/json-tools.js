// 화면과 상관없는 계산 함수 모음 (테스트하기 쉽게 따로 둡니다)
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    const out = {};
    Object.keys(v).sort().forEach((k) => { out[k] = sortKeys(v[k]); });
    return out;
  }
  return v;
}

function positionToLineCol(text, pos) {
  let line = 1, col = 1;
  for (let i = 0; i < pos && i < text.length; i++) {
    if (text[i] === '\n') { line++; col = 1; } else { col++; }
  }
  return { line, col };
}

// 위치를 알려 주지 않는 오류 메시지를 위해, 직접 문법을 훑어 틀린 자리를 찾습니다 (올바르면 -1)
function findErrorPos(t) {
  let i = 0; const n = t.length;
  const ws = () => { while (i < n && ' \t\n\r'.includes(t[i])) i++; };
  const fail = () => { throw i; };
  function str() {
    i++;
    while (i < n) {
      const c = t[i];
      if (c === '"') { i++; return; }
      if (c === '\\') { i++; if ('"\\/bfnrtu'.indexOf(t[i]) < 0) fail(); if (t[i] === 'u') { for (let k = 1; k <= 4; k++) if (!/[0-9a-fA-F]/.test(t[i + k] || '')) { i += k; fail(); } i += 4; } i++; continue; }
      if (c < ' ') fail();
      i++;
    }
    fail();
  }
  function val() {
    ws(); const c = t[i];
    if (c === '{') {
      i++; ws(); if (t[i] === '}') { i++; return; }
      for (;;) { ws(); if (t[i] !== '"') fail(); str(); ws(); if (t[i] !== ':') fail(); i++; val(); ws(); if (t[i] === ',') { i++; continue; } if (t[i] === '}') { i++; return; } fail(); }
    }
    if (c === '[') {
      i++; ws(); if (t[i] === ']') { i++; return; }
      for (;;) { val(); ws(); if (t[i] === ',') { i++; continue; } if (t[i] === ']') { i++; return; } fail(); }
    }
    if (c === '"') return str();
    const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?|^true|^false|^null/.exec(t.slice(i, i + 400));
    if (!m) fail();
    i += m[0].length;
  }
  try { val(); ws(); if (i < n) fail(); } catch (e) { if (typeof e === 'number') return e; throw e; }
  return -1;
}

// 오류 메시지에서 위치를 찾아 한글 설명으로 바꿉니다
function explainJsonError(text, err) {
  const msg = String(err && err.message || err);
  let loc = null;
  let m = msg.match(/line (\d+) column (\d+)/);
  if (m) loc = { line: +m[1], col: +m[2] };
  if (!loc) {
    m = msg.match(/position (\d+)/);
    if (m) loc = positionToLineCol(text, +m[1]);
  }
  if (!loc && /end of JSON input|Unexpected end/i.test(msg)) {
    loc = positionToLineCol(text, text.length);
  }
  if (!loc && text.length < 2000000) {
    const p = findErrorPos(text);
    if (p >= 0) loc = positionToLineCol(text, Math.min(p, text.length));
  }
  let why = '문법이 맞지 않습니다.';
  if (/Unexpected end/i.test(msg)) why = '글이 중간에 끝났습니다. 괄호나 따옴표를 닫았는지 확인하세요.';
  else if (/Unexpected token|Unexpected character|Expected/i.test(msg)) why = '여기에 올 수 없는 글자가 있습니다. 쉼표·따옴표·괄호를 확인하세요.';
  else if (/Unexpected non-whitespace/i.test(msg)) why = 'JSON이 끝난 뒤에 글자가 더 있습니다.';
  const where = loc ? loc.line + '째 줄 ' + loc.col + '번째 글자 근처: ' : '';
  return { text: where + why, loc };
}

function runJson(text, mode, indent, sort) {
  const src = text.trim();
  if (!src) return { ok: false, message: '먼저 JSON을 붙여 넣어 주세요.' };
  let data;
  try { data = JSON.parse(src); }
  catch (e) { const ex = explainJsonError(src, e); return { ok: false, message: ex.text, loc: ex.loc }; }
  if (sort) data = sortKeys(data);
  if (mode === 'check') return { ok: true, message: '올바른 JSON입니다.', output: null };
  const space = mode === 'minify' ? 0 : (indent === 'tab' ? '\t' : Number(indent));
  return { ok: true, message: mode === 'minify' ? '한 줄로 줄였습니다.' : '정리했습니다.', output: JSON.stringify(data, null, space) };
}

if (typeof module !== 'undefined') module.exports = { findErrorPos, runJson, explainJsonError, sortKeys, positionToLineCol };
