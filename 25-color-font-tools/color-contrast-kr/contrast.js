// 색 계산 함수 모음 (WCAG 2.x 상대 휘도·대비 공식)
function parseColor(s) {
  s = String(s || '').trim().toLowerCase();
  let m = s.match(/^#?([0-9a-f]{3})$/);
  if (m) { const h = m[1]; return [0, 1, 2].map((i) => parseInt(h[i] + h[i], 16)); }
  m = s.match(/^#?([0-9a-f]{6})$/);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  m = s.match(/^rgb\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*\)$/);
  if (m) { const v = [+m[1], +m[2], +m[3]]; if (v.every((n) => n <= 255)) return v; }
  return null;
}
function toHex(rgb) { return '#' + rgb.map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join(''); }
function luminance(rgb) {
  const c = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrastRatio(a, b) {
  const l1 = luminance(a), l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
function rgbToHsl(rgb) {
  const [r, g, b] = rgb.map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b); let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0); else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h * 360, s, l];
}
function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) { const v = l * 255; return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
// 글자색의 밝기만 조금씩 바꿔 목표 대비를 처음 넘는 색을 찾습니다 (어둡게/밝게 두 방향)
function suggestFor(fg, bg, target) {
  const [h, s, l] = rgbToHsl(fg);
  const result = {};
  [['darker', -1], ['lighter', 1]].forEach(([name, dir]) => {
    for (let i = 0; i <= 100; i++) {
      const nl = l + dir * i / 100;
      if (nl < 0 || nl > 1) break;
      const rgb = hslToRgb(h, s, nl).map(Math.round);
      if (contrastRatio(rgb, bg) >= target) { result[name] = rgb; break; }
    }
  });
  return result;
}
function levels(ratio) {
  return { aaNormal: ratio >= 4.5, aaLarge: ratio >= 3, aaaNormal: ratio >= 7, aaaLarge: ratio >= 4.5, ui: ratio >= 3 };
}
if (typeof module !== 'undefined') module.exports = { parseColor, toHex, luminance, contrastRatio, suggestFor, levels, rgbToHsl };
