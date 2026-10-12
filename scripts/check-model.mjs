/**
 * 模型回归基线：确认模拟内核的输出没有被后续改动意外改变。
 *
 * 背景：重构时用 `scripts/check-parity.mjs` 与旧版单文件实现逐点对拍（41 组参数），
 * 但那个脚本需要读取 legacy/ 里的旧实现，而 legacy/ 已经删掉了。
 * 所以这里改成**自包含的基线快照**：把当初验证通过的锚点数值冻结在 EXPECTED 里，
 * 不依赖任何历史文件，跑一次就能发现模型被人无意改动。
 *
 * 有意修改模型时（例如将来真的加入「改朝换代阶级洗牌」），
 * 用 `node scripts/check-model.mjs --print` 打印新结果，确认符合预期后更新 EXPECTED。
 *
 *   npm test
 *   node scripts/check-model.mjs --print
 */
import { DEFAULTS } from '../src/constants/model.js';
import { simulate } from '../src/core/simulation.js';

/** 每个用例：参数 + 末代锚点期望值（相对误差 ≤ 1e-9） */
const CASES = [
  {
    label: '默认参数',
    params: { ...DEFAULTS },
    expect: { gens: 25, t: 750, disasters: 25, FR: 1493.822546, FP: 6313.924952, NR: 0, NP: 0, total: 7807.747497, ancPct: 100, richPct: 19.13256731 },
  },
  {
    label: '仅父系判定 + 存活率差距小',
    params: { ...DEFAULTS, ancMode: 2, richSurvive: 60, poorSurvive: 55 },
    expect: { gens: 25, t: 750, disasters: 25, FR: 1436.84777, FP: 6360.766724, NR: 35.78744978, NP: 271.4918534, total: 8104.893798, ancPct: 96.20871894, richPct: 18.16970409 },
  },
  {
    label: '完全随机婚配 + 高流动 + 重灾',
    params: { ...DEFAULTS, crossSuppress: 0, down: 70, up: 25, disasterGap: 25, poorDeath: 20, richDeath: 15, birth: 4, richSurvive: 75, poorSurvive: 60, years: 600, K: 5000, pop0: 1500 },
    expect: { gens: 20, t: 600, disasters: 24, FR: 150.4811835, FP: 370.0737265, NR: 0, NP: 0, total: 520.55491, ancPct: 100, richPct: 28.90784058 },
  },
  {
    label: '低承载力 + 长周期',
    params: { ...DEFAULTS, K: 2000, pop0: 1800, years: 900, genLen: 35, disasterGap: 90, poorDeath: 25, richDeath: 20, crossSuppress: 40, down: 20, up: 5 },
    expect: { gens: 25, t: 875, disasters: 10, FR: 366.9625697, FP: 1015.170848, NR: 0, NP: 0, total: 1382.133418, ancPct: 100, richPct: 26.55044477 },
  },
];

const print = process.argv.includes('--print');
const round = (v) => Number(v.toPrecision(10));
const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));

/** 取末代锚点：四组人口、总数、以及两个关键比例 */
function anchors(params) {
  const { pts, disasters, gens } = simulate(params);
  const last = pts[pts.length - 1];
  const total = last.FR + last.FP + last.NR + last.NP;
  return {
    gens,
    t: last.t,
    disasters: disasters.length,
    FR: round(last.FR),
    FP: round(last.FP),
    NR: round(last.NR),
    NP: round(last.NP),
    total: round(total),
    ancPct: round((100 * (last.FR + last.FP)) / total),
    richPct: round((100 * (last.FR + last.NR)) / total),
  };
}

let failed = 0;

for (const { label, params, expect } of CASES) {
  const actual = anchors(params);

  if (print) {
    console.log(label + ': ' + JSON.stringify(actual));
    continue;
  }

  // 1) 基线比对
  const diff = Object.keys(expect).filter((k) => !close(actual[k], expect[k]));

  // 2) 与基线无关的硬不变量：不管参数怎么调都必须成立
  const { pts } = simulate(params);
  const invariants = [];
  if (pts.length !== actual.gens + 1) invariants.push('时间序列点数应为代数 + 1');
  if (pts.some((d) => [d.FR, d.FP, d.NR, d.NP].some((v) => !Number.isFinite(v) || v < 0))) invariants.push('存在 NaN / 负数人口');

  if (diff.length || invariants.length) {
    failed++;
    console.log('  FAIL ' + label);
    for (const k of diff) console.log('        ' + k + ': 期望 ' + expect[k] + '，实际 ' + actual[k]);
    for (const msg of invariants) console.log('        ' + msg);
  } else {
    console.log('  OK   ' + label + '（末代 ' + actual.total.toFixed(1) + ' 万，富人占比 ' + actual.richPct.toFixed(1) + '%）');
  }
}

if (print) {
  console.log('\n把上面的数值填回 EXPECTED 即可更新基线。');
  process.exit(0);
}

console.log(failed ? '\n✗ ' + failed + ' / ' + CASES.length + ' 个用例偏离基线' : '\n✓ ' + CASES.length + ' 个用例全部命中基线');
process.exit(failed ? 1 : 0);
