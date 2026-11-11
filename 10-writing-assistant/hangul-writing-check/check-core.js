// 한글 글쓰기 점검기 - 규칙 검사 로직 (팝업과 테스트에서 함께 씀)
// 형태소 분석기를 쓰지 않고 글자 모양(규칙)만 보는 '참고용' 검사입니다. 서버로 아무것도 보내지 않습니다.
(function (root) {
  const DEFAULTS = { longLen: 80, paraMax: 300, repeatMin: 5 };
  const READ_CHARS_PER_MIN = 500;
  const MAX_ITEMS = 5;

  const CONJUNCTIONS = ['그렇지만', '그리고', '그래서', '하지만', '그런데', '그러나', '또한', '따라서', '그러므로', '그러면', '게다가', '한편', '결국'];
  const PARTICLES = ['에서는', '에게는', '으로는', '이라는', '이라고', '에서', '에게', '으로', '까지', '부터', '보다', '처럼', '라고', '이나',
    '에는', '에도', '와', '과', '은', '는', '이', '가', '을', '를', '의', '에', '로', '도', '만'];
  // 낱말이 아니라 풀이말(동사·형용사) 꼴로 보이는 끝, 너무 흔한 말은 '반복 낱말'에서 뺍니다.
  const NOT_NOUN = /(다|요|죠|까|는데|으며|하고|하게|하는|하여|해서|했던|했고|한다|된다|되는|되고|있는|없는|같은|있고|없고|합니다|입니다)$/;
  const STOP = new Set(['때문', '경우', '정도', '이후', '이전', '우리', '이것', '그것', '저것', '사람', '모든', '다른', '하지', '그리고', '하지만', '그러나',
    '그래서', '그런데', '또한', '따라서', '이런', '그런', '저런', '여기', '거기', '지금', '오늘', '이제', '다시', '아직', '모두']);

  const WORDY = [
    { name: '“~ㄹ 수 있다”', re: /수\s*있(다|습니다|어요|을|는|었|고|지)/g, min: 4, hint: '꼭 필요하지 않으면 “~한다”, “~합니다”로 줄여 보세요.' },
    { name: '“~것 같다”', re: /것\s*같(다|습니다|아요|은|았)/g, min: 3, hint: '확신이 있다면 “~이다”로 분명히 쓰세요.' },
    { name: '“~에 대해(서)”', re: /에\s*대(해서?|한)/g, min: 3, hint: '“~을/를”, “~의”로 바꿀 수 있는지 보세요.' },
    { name: '“~을 통해(서)”', re: /(을|를)\s*통(해서?|한)/g, min: 3, hint: '“~으로”로 줄일 수 있는지 보세요.' },
    { name: '“~에 있어(서)”', re: /에\s*있어서?/g, min: 2, hint: '“~에서”, “~할 때”로 바꿔 보세요.' },
    { name: '“~것이다/것입니다”', re: /것(이다|입니다)/g, min: 3, hint: '“~한다”, “~합니다”로 끝맺으면 짧아집니다.' },
    { name: '“~하게 되다”', re: /하게\s*(되|됩|된)/g, min: 3, hint: '주어가 직접 하는 일이면 “~한다”로 쓰세요.' },
    { name: '“생각합니다/생각된다”', re: /(생각합니다|생각된다|생각해요|생각한다)/g, min: 3, hint: '의견임이 분명하면 “~다”로 바로 써도 됩니다.' },
    { name: '강조어 (매우·정말·너무·아주 …)', re: /(매우|정말|너무|아주|굉장히|상당히|엄청|진짜)/g, min: 5, hint: '강조어가 많으면 힘이 약해집니다. 숫자나 사실로 보여 주세요.' }
  ];
  // 피동 줄기 + 어지다(지·진·집: "보여지다", "보여진", "보여집니다")
  const DOUBLE_PASSIVE = new RegExp('(' + ['되어', '보여', '쓰여', '나뉘어', '짜여', '불려', '불리워', '잊혀']
    .map((s) => s + '(?:지|진|집)').join('|') + ')', 'g');

  const clip = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s);

  function splitSentences(text) {
    return text.split(/(?<=[.!?。…])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  }

  function stripParticle(w) {
    for (const p of PARTICLES) {
      if (w.length - p.length >= 2 && w.endsWith(p)) return w.slice(0, -p.length);
    }
    return w;
  }

  function limitItems(items) {
    return items.length > MAX_ITEMS ? [...items.slice(0, MAX_ITEMS), `… 외 ${items.length - MAX_ITEMS}곳`] : items;
  }

  function analyze(text, options) {
    const o = { ...DEFAULTS, ...(options || {}) };
    const t = String(text || '').replace(/\r\n/g, '\n');
    const sentences = splitSentences(t);
    const paragraphs = t.split(/\n+/).map((p) => p.trim()).filter(Boolean);
    const charCount = t.replace(/\s/g, '').length;
    const lens = sentences.map((s) => s.length);
    const longestIdx = lens.length ? lens.indexOf(Math.max(...lens)) : -1;

    const summary = {
      chars: charCount,
      sentences: sentences.length,
      paragraphs: paragraphs.length,
      avgLen: sentences.length ? Math.round(lens.reduce((a, b) => a + b, 0) / sentences.length) : 0,
      longest: longestIdx >= 0 ? lens[longestIdx] : 0,
      readMin: charCount ? Math.max(1, Math.round(charCount / READ_CHARS_PER_MIN)) : 0
    };

    const issues = [];

    // 1. 긴 문장
    const longs = sentences.filter((s) => s.length > o.longLen);
    if (longs.length) {
      issues.push({
        id: 'long-sentence', title: `긴 문장 ${longs.length}개 (${o.longLen}자 넘음)`,
        hint: '두 문장으로 나누거나, 빼도 뜻이 같은 말을 덜어 내 보세요.',
        items: limitItems(longs.map((s) => `${clip(s, 50)} (${s.length}자)`))
      });
    }

    // 2. 비슷한 끝말이 이어지는 문장
    const ends = sentences.map((s) => {
      const core = s.replace(/[^가-힣A-Za-z0-9]+$/g, '');
      return core.length >= 5 ? core.slice(-2) : null;
    });
    const runs = [];
    for (let i = 0; i < ends.length;) {
      let j = i;
      while (j + 1 < ends.length && ends[i] && ends[j + 1] === ends[i]) j++;
      if (ends[i] && j - i + 1 >= 4) runs.push(`${i + 1}~${j + 1}번째 문장이 모두 “…${ends[i]}”로 끝남 (${j - i + 1}문장 연속)`);
      i = j + 1;
    }
    if (runs.length) {
      issues.push({
        id: 'same-ending', title: '같은 끝말이 이어짐',
        hint: '일부러 리듬을 준 게 아니라면, 끝맺음을 한두 군데 바꿔 보세요.',
        items: limitItems(runs)
      });
    }

    // 3. 문장 첫머리 접속어
    const starts = {};
    let startTotal = 0;
    for (const s of sentences) {
      const c = CONJUNCTIONS.find((w) => s.startsWith(w) && (s.length === w.length || /[,\s]/.test(s[w.length])));
      if (c) { starts[c] = (starts[c] || 0) + 1; startTotal++; }
    }
    const heavy = Object.entries(starts).filter(([, n]) => n >= 3);
    if (heavy.length || (startTotal >= 3 && sentences.length && startTotal / sentences.length >= 0.3)) {
      issues.push({
        id: 'conjunction', title: `접속어로 시작하는 문장 ${startTotal}개 (전체 ${sentences.length}문장 중)`,
        hint: '접속어를 빼도 뜻이 이어지면 지우는 편이 읽기 편합니다.',
        items: Object.entries(starts).sort((a, b) => b[1] - a[1]).map(([w, n]) => `“${w}” ${n}번`)
      });
    }

    // 4. 같은 낱말 반복 (조사를 떼어 어림)
    const counts = new Map();
    for (const w of t.match(/[가-힣]{2,}/g) || []) {
      const base = stripParticle(w);
      if (base.length < 2 || NOT_NOUN.test(base) || STOP.has(base)) continue;
      counts.set(base, (counts.get(base) || 0) + 1);
    }
    const reps = [...counts.entries()].filter(([, n]) => n >= o.repeatMin).sort((a, b) => b[1] - a[1]);
    if (reps.length) {
      issues.push({
        id: 'repeat-word', title: `자주 반복되는 낱말 ${reps.length}개 (${o.repeatMin}번 이상)`,
        hint: '핵심어면 괜찮지만, 아니라면 “이것”, “해당” 같은 말이나 다른 표현으로 바꿔 보세요. (조사를 어림으로 떼므로 틀릴 수 있습니다.)',
        items: limitItems(reps.map(([w, n]) => `${w} ${n}번`))
      });
    }

    // 5. 군더더기 표현
    for (const rule of WORDY) {
      const n = (t.match(rule.re) || []).length;
      if (n >= rule.min) issues.push({ id: 'wordy', title: `${rule.name} ${n}번`, hint: rule.hint, items: [] });
    }

    // 6. 이중 피동
    const dp = [];
    let m;
    const re = new RegExp(DOUBLE_PASSIVE.source, 'g');
    while ((m = re.exec(t))) {
      const from = Math.max(0, m.index - 8);
      dp.push(clip(t.slice(from, m.index + m[0].length + 6).replace(/\n/g, ' '), 30));
    }
    if (dp.length) {
      issues.push({
        id: 'double-passive', title: `이중 피동 표현 ${dp.length}곳`,
        hint: '“되어지다”, “보여지다”처럼 피동을 겹쳐 쓰면 어색합니다. “되다”, “보이다”로 충분합니다.',
        items: limitItems(dp)
      });
    }

    // 7. 긴 문단
    const longParas = paragraphs.filter((p) => p.length > o.paraMax);
    if (longParas.length) {
      issues.push({
        id: 'long-paragraph', title: `긴 문단 ${longParas.length}개 (${o.paraMax}자 넘음)`,
        hint: '문단이 길면 화면(특히 모바일)에서 읽기 힘들 수 있습니다. 줄을 바꿔 나눠 보세요.',
        items: limitItems(longParas.map((p) => `${clip(p, 40)} (${p.length}자)`))
      });
    }

    return { summary, issues, options: o };
  }

  root.WritingCheckCore = { DEFAULTS, analyze, splitSentences, stripParticle };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.WritingCheckCore;
})(typeof self !== 'undefined' ? self : globalThis);
