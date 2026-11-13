function round(n, d) { const p = Math.pow(10, d === undefined ? 4 : d); return Math.round(n * p) / p; }

// 입력 단위를 px로 바꾼 뒤 나머지 단위로 변환합니다 (rem·em은 같은 기준 글자 크기를 씁니다)
function convert(value, unit, base, vwPx) {
  let px;
  if (unit === 'px') px = value;
  else if (unit === 'rem' || unit === 'em') px = value * base;
  else if (unit === 'vw') px = value * vwPx / 100;
  else return null;
  return { px: round(px), rem: round(px / base), em: round(px / base), vw: round(px / vwPx * 100) };
}

function makeClamp(minSize, maxSize, minVw, maxVw, base) {
  if ([minSize, maxSize, minVw, maxVw, base].some((n) => typeof n !== 'number' || !isFinite(n))) return { error: '숫자를 모두 넣어 주세요.' };
  if (base <= 0) return { error: '기준 글자 크기는 0보다 커야 합니다.' };
  if (minVw >= maxVw) return { error: '작은 화면 너비는 큰 화면 너비보다 작아야 합니다.' };
  if (minSize > maxSize) return { error: '가장 작을 때 글자는 가장 클 때 글자보다 클 수 없습니다.' };
  const slope = (maxSize - minSize) / (maxVw - minVw);
  const intercept = minSize - slope * minVw;
  const minRem = round(minSize / base), maxRem = round(maxSize / base);
  const interRem = round(intercept / base);
  const vwPart = round(slope * 100);
  return { css: 'clamp(' + minRem + 'rem, ' + (interRem < 0 ? '-' : '') + Math.abs(interRem) + 'rem + ' + vwPart + 'vw, ' + maxRem + 'rem)', slope, intercept, minRem, maxRem };
}

// 주어진 화면 너비에서 clamp()가 실제로 몇 px이 되는지 (확인용)
function evalClamp(minSize, maxSize, minVw, maxVw, width) {
  const slope = (maxSize - minSize) / (maxVw - minVw);
  const v = minSize + slope * (width - minVw);
  return round(Math.min(maxSize, Math.max(minSize, v)));
}
if (typeof module !== 'undefined') module.exports = { convert, makeClamp, evalClamp, round };
