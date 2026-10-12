/** 数值格式化工具。 */

/** 以「万」为单位的可读人口（>= 1 亿时自动切换单位）。 */
export function fmtWan(v) {
  if (v >= 1e4) return (v / 1e4).toFixed(2) + '亿';
  return Math.round(v).toLocaleString('zh-CN') + '万';
}

/** 把坐标轴上限取到一个「好看」的整数刻度。 */
export function niceMax(v) {
  if (!(v > 0)) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / e;
  let nf;
  if (f <= 1) nf = 1;
  else if (f <= 2) nf = 2;
  else if (f <= 2.5) nf = 2.5;
  else if (f <= 5) nf = 5;
  else nf = 10;
  return nf * e;
}

/** 滑杆数值的显示文本：整数不带小数，小数保留一位。 */
export function formatVal(v, unit) {
  return (Number.isInteger(v) ? v : v.toFixed(1)) + unit;
}
