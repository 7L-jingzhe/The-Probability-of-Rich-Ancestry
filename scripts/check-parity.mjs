/**
 * 重构对拍脚本：确认 Vue 版本里的模拟内核与旧版单文件实现逐点一致。
 *
 * 做法是从 legacy/古代阶层延续模拟器.html 里抽出原始 simulate() 源码，
 * 用 new Function 求值，然后和 src/core/simulation.js 的导出在随机参数下比对时间序列。
 *
 *   node scripts/check-parity.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULTS } from '../src/constants/model.js';
import { simulate } from '../src/core/simulation.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const legacyHtml = readFileSync(join(root, 'legacy', '古代阶层延续模拟器.html'), 'utf8');

const start = legacyHtml.indexOf('/* ============ 默认参数');
const end = legacyHtml.indexOf('/* ============ 格式化');
if (start < 0 || end < 0) throw new Error('无法在旧版 HTML 中定位 simulate 源码');
const legacySource = legacyHtml.slice(start, end);
const legacySimulate = new Function(legacySource + '\nreturn simulate;')();

/** 可复现的伪随机数（mulberry32） */
function rng(seed) {
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = rng(20240607);
const pick = (min, max, step) => {
  const steps = Math.round((max - min) / step);
  return min + Math.round(rand() * steps) * step;
};

function randomParams() {
  return {
    ancMode: rand() < 0.5 ? 1 : 2,
    pop0: pick(100, 20000, 100),
    richPct: pick(1, 50, 1),
    richAnc0: pick(0, 100, 5),
    poorAnc0: pick(0, 100, 5),
    years: pick(60, 900, 30),
    genLen: pick(15, 40, 1),
    birth: pick(1, 10, 0.5),
    richSurvive: pick(10, 95, 1),
    poorSurvive: pick(10, 95, 1),
    K: pick(1000, 50000, 500),
    crossSuppress: pick(0, 100, 5),
    down: pick(0, 80, 1),
    up: pick(0, 30, 1),
    disasterGap: pick(20, 200, 5),
    poorDeath: pick(0, 90, 1),
    richDeath: pick(0, 90, 1),
  };
}

function compare(params, label) {
  const a = simulate(params);
  const b = legacySimulate(params);
  const problems = [];
  if (a.pts.length !== b.pts.length) problems.push('点数不同: ' + a.pts.length + ' vs ' + b.pts.length);
  if (a.gens !== b.gens) problems.push('代数不同: ' + a.gens + ' vs ' + b.gens);
  if (a.disasters.length !== b.disasters.length) problems.push('天灾次数不同');
  const n = Math.min(a.pts.length, b.pts.length);
  for (let i = 0; i < n; i++) {
    for (const key of ['t', 'FR', 'FP', 'NR', 'NP']) {
      const x = a.pts[i][key];
      const y = b.pts[i][key];
      if (!(Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(y)))) {
        problems.push(label + ' 第 ' + i + ' 点 ' + key + ' 不一致: ' + x + ' vs ' + y);
        break;
      }
    }
    if (problems.length > 3) break;
  }
  return problems;
}

const cases = [['默认参数', { ...DEFAULTS }]];
for (let i = 0; i < 40; i++) cases.push(['随机参数 #' + (i + 1), randomParams()]);

let failed = 0;
for (const [label, params] of cases) {
  const problems = compare(params, label);
  if (problems.length) {
    failed++;
    console.error('✗ ' + label + '\n  ' + problems.join('\n  '));
  }
}
if (failed) {
  console.error('\n对拍失败：' + failed + ' / ' + cases.length + ' 组参数结果不一致');
  process.exit(1);
}
console.log('✓ 对拍通过：' + cases.length + ' 组参数下，新旧实现对每一个时间点的结果完全一致');
