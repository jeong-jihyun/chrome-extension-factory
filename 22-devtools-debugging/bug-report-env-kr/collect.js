// 이 함수는 버그가 난 탭 안에서 실행됩니다. 바깥 변수를 쓰지 않아야 합니다.
function collectEnv() {
  const nav = navigator;
  const conn = nav.connection || {};
  const media = (q) => { try { return window.matchMedia(q).matches; } catch (e) { return false; } };
  return {
    url: location.href,
    title: document.title,
    referrer: document.referrer,
    userAgent: nav.userAgent,
    platform: (nav.userAgentData && nav.userAgentData.platform) || nav.platform || '',
    language: nav.language,
    languages: (nav.languages || []).join(', '),
    viewport: window.innerWidth + ' x ' + window.innerHeight,
    screen: screen.width + ' x ' + screen.height,
    dpr: window.devicePixelRatio,
    zoomHint: Math.round((window.outerWidth / window.innerWidth) * 100) / 100,
    darkMode: media('(prefers-color-scheme: dark)'),
    reducedMotion: media('(prefers-reduced-motion: reduce)'),
    online: nav.onLine,
    connection: conn.effectiveType || '알 수 없음',
    cookiesEnabled: nav.cookieEnabled,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    readyState: document.readyState,
    time: new Date().toString()
  };
}
function formatReport(env, stripQuery) {
  let url = env.url;
  let ref = env.referrer;
  if (stripQuery) {
    url = url.split('#')[0].split('?')[0];
    ref = ref ? ref.split('#')[0].split('?')[0] : '';
  }
  const yn = (b) => (b ? '예' : '아니오');
  return [
    '## 버그 신고',
    '',
    '### 무엇이 문제인가요?',
    '(여기에 적어 주세요)',
    '',
    '### 재현 순서',
    '1. ',
    '2. ',
    '3. ',
    '',
    '### 기대한 결과',
    '',
    '### 실제 결과',
    '',
    '### 환경 정보',
    '- 주소: ' + url,
    '- 페이지 제목: ' + env.title,
    ref ? '- 이전 주소: ' + ref : '- 이전 주소: 없음',
    '- 브라우저: ' + env.userAgent,
    '- 운영체제: ' + env.platform,
    '- 언어: ' + env.language + ' (' + env.languages + ')',
    '- 화면 안쪽 크기: ' + env.viewport + ' / 모니터: ' + env.screen,
    '- 화면 배율(DPR): ' + env.dpr + ' / 확대 추정: ' + env.zoomHint,
    '- 다크 모드: ' + yn(env.darkMode) + ' / 동작 줄이기: ' + yn(env.reducedMotion),
    '- 인터넷 연결: ' + yn(env.online) + ' (' + env.connection + ')',
    '- 쿠키 사용: ' + yn(env.cookiesEnabled),
    '- 시간대: ' + env.timezone,
    '- 페이지 상태: ' + env.readyState,
    '- 확인 시각: ' + env.time
  ].join('\n');
}
if (typeof module !== 'undefined') module.exports = { collectEnv, formatReport };
