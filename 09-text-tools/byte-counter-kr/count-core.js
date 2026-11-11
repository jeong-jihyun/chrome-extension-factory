// 글자·바이트 세기 - 계산 로직 (팝업과 테스트에서 함께 씀)
(function (root) {
  function chars(text) {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      let n = 0;
      for (const _ of new Intl.Segmenter('ko', { granularity: 'grapheme' }).segment(text)) n++;
      return n;
    }
    return Array.from(text).length;
  }

  // 줄바꿈을 \r\n(2바이트)로 쳐야 하는 곳이 많아서 선택 옵션으로 둡니다.
  function prep(text, crlf) {
    const t = String(text).replace(/\r\n/g, '\n');
    return crlf ? t.replace(/\n/g, '\r\n') : t;
  }

  function utf8Bytes(text, crlf) {
    return new TextEncoder().encode(prep(text, crlf)).length;
  }

  // 한 글자(코드포인트)의 EUC-KR/CP949 방식 바이트 수 어림값.
  // 영문·숫자·기호(ASCII)=1, 한글(가~힣, 자모)=2, 한자·특수기호 등 그 밖의 BMP 문자=2,
  // BMP 밖 문자(이모지 등)는 CP949로 표현할 수 없어 '?' 한 글자(1바이트)로 바뀌는 것으로 쳐요.
  function cp949Of(cp) {
    if (cp <= 0x7f) return 1;
    if (cp > 0xffff) return 1;
    return 2;
  }

  function cp949Bytes(text, crlf) {
    let n = 0;
    for (const ch of prep(text, crlf)) n += cp949Of(ch.codePointAt(0));
    return n;
  }

  function bytes(text, mode, crlf) {
    return mode === 'utf8' ? utf8Bytes(text, crlf) : cp949Bytes(text, crlf);
  }

  function words(text) {
    const m = String(text).trim().match(/\S+/g);
    return m ? m.length : 0;
  }

  function lines(text) {
    return text === '' ? 0 : String(text).split(/\r\n|\r|\n/).length;
  }

  function stats(text, mode, crlf) {
    const t = String(text);
    return {
      chars: chars(t),
      charsNoSpace: chars(t.replace(/\s/g, '')),
      bytes: bytes(t, mode, crlf),
      utf8: utf8Bytes(t, crlf),
      cp949: cp949Bytes(t, crlf),
      words: words(t),
      lines: lines(t)
    };
  }

  // 정해진 바이트를 넘지 않도록 글자 단위로 자릅니다. (글자 한가운데는 자르지 않음)
  function truncate(text, limit, mode, crlf) {
    const t = prep(text, crlf);
    let out = '';
    let used = 0;
    for (const ch of Array.from(t)) {
      const b = bytes(ch, mode, false);
      if (used + b > limit) break;
      out += ch;
      used += b;
    }
    return out;
  }

  // 오른쪽을 공백으로 채워 정확히 limit 바이트로 맞춥니다. 넘치면 먼저 자릅니다.
  function padRight(text, limit, mode, crlf) {
    const cut = truncate(text, limit, mode, crlf);
    const used = bytes(cut, mode, false);
    return { text: cut + ' '.repeat(Math.max(0, limit - used)), used, filler: Math.max(0, limit - used) };
  }

  root.ByteCounterCore = { chars, utf8Bytes, cp949Bytes, bytes, words, lines, stats, truncate, padRight };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.ByteCounterCore;
})(typeof self !== 'undefined' ? self : globalThis);
