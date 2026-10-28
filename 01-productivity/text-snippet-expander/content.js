// 글 입력칸에서 Tab을 누르면 커서 앞의 단축어를 저장된 문구로 바꾼다
(function () {
  var snippets = {};

  chrome.storage.local.get("snippets", function (r) {
    snippets = r.snippets || {};
  });
  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area === "local" && changes.snippets) snippets = changes.snippets.newValue || {};
  });

  var TEXT_TYPES = ["text", "search", "url", "tel", ""];

  function onKeyDown(e) {
    if (e.key !== "Tab" || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
    var el = e.composedPath ? e.composedPath()[0] : e.target;
    if (!el) return;

    // 1) 일반 입력칸, 여러 줄 입력칸
    var isTextarea = el.tagName === "TEXTAREA";
    var isInput = el.tagName === "INPUT" && TEXT_TYPES.indexOf((el.getAttribute("type") || "").toLowerCase()) !== -1;
    if (isTextarea || isInput) {
      var start = el.selectionStart;
      if (start === null || start !== el.selectionEnd) return;
      var hit = ExpandCore.expandAt(el.value.slice(0, start), snippets);
      if (!hit) return; // 단축어가 아니면 Tab 원래 동작(다음 칸 이동)을 그대로 둔다
      e.preventDefault();
      el.setRangeText(hit.replacement, start - hit.tokenLength, start, "end");
      el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: hit.replacement }));
      return;
    }

    // 2) 서식 있는 입력칸(contenteditable): 같은 글 조각 안에 있는 단축어만 바꾼다
    if (el.isContentEditable) {
      var sel = window.getSelection();
      if (!sel || !sel.isCollapsed || !sel.anchorNode || sel.anchorNode.nodeType !== 3) return;
      var node = sel.anchorNode;
      var offset = sel.anchorOffset;
      var hit2 = ExpandCore.expandAt(node.textContent.slice(0, offset), snippets);
      if (!hit2) return;
      e.preventDefault();
      var range = document.createRange();
      range.setStart(node, offset - hit2.tokenLength);
      range.setEnd(node, offset);
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand("insertText", false, hit2.replacement);
    }
  }

  document.addEventListener("keydown", onKeyDown, true);
})();
