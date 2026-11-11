// 영어 단어 상자 - 공통 로직 (배경·팝업·테스트에서 함께 씀)
(function (root) {
  const MIN = 60 * 1000;
  const DAY = 24 * 60 * MIN;
  // 복습 단계 1~6 에서 다음 복습까지의 간격. 몰랐어요 -> 1단계, 알았어요 -> 한 단계 위로.
  const INTERVALS = [10 * MIN, 1 * DAY, 3 * DAY, 7 * DAY, 14 * DAY, 30 * DAY];
  const MAX_BOX = INTERVALS.length;

  // 앞뒤의 따옴표·마침표 같은 기호를 떼고 공백을 정리합니다.
  function normalizeWord(raw) {
    const s = String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim();
    return s.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  }

  // 단어 또는 짧은 표현만 담습니다. (6낱말, 60자 이하)
  function isValidWord(w) {
    return w.length >= 1 && w.length <= 60 && w.split(' ').length <= 6;
  }

  // 글 전체에서 선택한 말이 들어 있는 문장을 잘라 냅니다.
  function sentenceAround(text, selected) {
    if (!text || !selected) return '';
    const idx = text.indexOf(selected);
    if (idx < 0) return '';
    const stops = /[.!?。\n]/;
    let start = idx;
    while (start > 0 && !stops.test(text[start - 1])) start--;
    let end = idx + selected.length;
    while (end < text.length && !stops.test(text[end])) end++;
    if (end < text.length && text[end] !== '\n') end++; // 마침표까지 포함
    let s = text.slice(start, end).replace(/\s+/g, ' ').trim();
    if (s.length > 300) {
      const pos = s.indexOf(selected);
      const from = Math.max(0, pos - 120);
      s = (from > 0 ? '…' : '') + s.slice(from, from + 280) + '…';
    }
    return s;
  }

  function makeId(now) {
    return now.toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // 같은 단어(대소문자 무시)는 한 번만 담고, 예문이 비어 있으면 새 예문으로 채웁니다.
  function addWord(words, input, now) {
    const word = normalizeWord(input.word);
    if (!isValidWord(word)) return { words, added: false, reason: 'invalid' };
    const key = word.toLowerCase();
    const found = words.find((w) => w.word.toLowerCase() === key);
    if (found) {
      let changed = false;
      if (!found.sentence && input.sentence) { found.sentence = input.sentence; found.url = input.url || found.url; found.title = input.title || found.title; changed = true; }
      if (!found.meaning && input.meaning) { found.meaning = input.meaning; changed = true; }
      return { words, added: false, reason: 'duplicate', changed, item: found };
    }
    const item = {
      id: makeId(now),
      word,
      meaning: (input.meaning || '').trim(),
      sentence: input.sentence || '',
      url: input.url || '',
      title: input.title || '',
      added: now,
      box: 1,
      due: now,
      reviews: 0
    };
    words.push(item);
    return { words, added: true, item };
  }

  function review(item, knew, now) {
    const box = knew ? Math.min(item.box + 1, MAX_BOX) : 1;
    return { ...item, box, due: now + INTERVALS[box - 1], reviews: item.reviews + 1 };
  }

  function dueWords(words, now) {
    return words.filter((w) => w.due <= now).sort((a, b) => a.due - b.due);
  }

  // 엑셀에서 수식으로 실행되지 않게, = + - @ 로 시작하는 글자 앞에 ' 를 붙입니다.
  function csvCell(v) {
    let s = String(v == null ? '' : v).replace(/\r?\n/g, ' ');
    if (/^[=+\-@\t]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }

  function ymd(ms) {
    const d = new Date(ms);
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function toCsv(words) {
    const rows = [['단어', '뜻', '예문', '출처', '담은 날', '복습 단계']];
    for (const w of words) rows.push([w.word, w.meaning, w.sentence, w.url, ymd(w.added), w.box]);
    return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
  }

  root.WordBoxCore = { INTERVALS, MAX_BOX, normalizeWord, isValidWord, sentenceAround, addWord, review, dueWords, csvCell, toCsv };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.WordBoxCore;
})(typeof self !== 'undefined' ? self : globalThis);
