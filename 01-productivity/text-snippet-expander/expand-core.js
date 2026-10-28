// 단축어 확장의 순수 함수 모음 (화면과 무관해서 Node에서도 테스트할 수 있다)
(function (root) {
  var DAYS = ["일", "월", "화", "수", "목", "금", "토"];

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  // {날짜} {시간} {요일} 자리표시자를 현재 값으로 바꾼다
  function applyPlaceholders(text, now) {
    now = now || new Date();
    return text
      .replace(/\{날짜\}/g, now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()))
      .replace(/\{시간\}/g, pad(now.getHours()) + ":" + pad(now.getMinutes()))
      .replace(/\{요일\}/g, DAYS[now.getDay()]);
  }

  // 커서 앞 글자에서 마지막 "공백 아닌 덩어리"를 꺼낸다
  function lastToken(textBeforeCaret) {
    var m = /(\S+)$/.exec(textBeforeCaret);
    return m ? m[1] : "";
  }

  // 커서 앞 글자 끝이 저장된 단축어와 같으면 바꿀 길이와 문구를 돌려준다
  function expandAt(textBeforeCaret, snippets, now) {
    var token = lastToken(textBeforeCaret);
    if (!token || !snippets || !Object.prototype.hasOwnProperty.call(snippets, token)) return null;
    return { tokenLength: token.length, replacement: applyPlaceholders(String(snippets[token]), now) };
  }

  // 새 단축어가 규칙에 맞는지 검사한다. 문제가 없으면 null
  function validateShortcut(shortcut, content) {
    if (!shortcut || /\s/.test(shortcut)) return "단축어에는 공백을 넣을 수 없습니다.";
    if (shortcut.length < 2 || shortcut.length > 20) return "단축어는 2~20글자로 입력하세요.";
    if (!content || !content.trim()) return "바꿔 넣을 내용을 입력하세요.";
    if (content.length > 2000) return "내용은 2000글자까지 입력할 수 있습니다.";
    return null;
  }

  var api = { applyPlaceholders: applyPlaceholders, lastToken: lastToken, expandAt: expandAt, validateShortcut: validateShortcut };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ExpandCore = api;
})(typeof self !== "undefined" ? self : this);
