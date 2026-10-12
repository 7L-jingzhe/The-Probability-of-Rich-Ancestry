import { clamp01 } from './simulation';
import { fmtWan } from './format';

/** 三条曲线的配色，和全局主题保持一致。 */
export const COLORS = {
  anc: '#f2b544', // 有富人祖先
  noAnc: '#5b8def', // 无富人祖先
  total: '#e6ebf2', // 总人口
  rich: '#5bddc0', // 当前富人占比
  disaster: '#ef6c6c', // 天灾标记
};

/**
 * 把 simulate() 的原始时间序列整理成「模板直接可用」的视图模型：
 * 曲线数据、坐标轴上限、统计卡片、文案与说明行都在这里算完，
 * 组件里只剩渲染，不再有业务计算。
 *
 * @param {ReturnType<import('./simulation').simulate>} sim
 * @param {object} params
 */
export function buildViewModel(sim, params) {
  const { pts, disasters, gens, L } = sim;
  const pat = params.ancMode === 2;

  const xs = pts.map((d) => d.t);
  const withAnc = pts.map((d) => d.FR + d.FP);
  const withoutAnc = pts.map((d) => d.NR + d.NP);
  const total = pts.map((d) => d.FR + d.FP + d.NR + d.NP);
  const fracAnc = pts.map((d, i) => (total[i] > 0 ? (100 * withAnc[i]) / total[i] : 0));
  const fracRich = pts.map((d, i) => (total[i] > 0 ? (100 * (d.FR + d.NR)) / total[i] : 0));

  const last = pts[pts.length - 1];
  const totalNow = last.FR + last.FP + last.NR + last.NP;
  const ancNow = last.FR + last.FP;
  const richNow = last.FR + last.NR;
  const fracAncNow = totalNow > 0 ? (100 * ancNow) / totalNow : 0;
  const fracRichNow = totalNow > 0 ? (100 * richNow) / totalNow : 0;

  const ancWord = pat ? '富人父系血统' : '富人血统';
  const simYears = gens * L;
  const initRich = (params.pop0 * params.richPct) / 100;
  const initAnc =
    initRich * clamp01(params.richAnc0 / 100) +
    Math.max(0, params.pop0 - initRich) * clamp01((params.poorAnc0 || 0) / 100);

  // 第二、三张图按数据量级自适应 y 轴上限（上限固定为 100%）
  const maxFrac = Math.max(...fracAnc, 1);
  const y2 = Math.min(100, Math.max(20, Math.ceil((maxFrac * 1.1) / 10) * 10));
  const maxRich = Math.max(...fracRich, 1);
  const y3 = Math.min(100, Math.max(10, Math.ceil((maxRich * 1.15) / 5) * 5));

  return {
    pat,
    ancWord,
    xs,
    disasters,
    gens,
    genLen: L,
    simYears,

    charts: {
      population: {
        series: [
          { key: 'noAnc', color: COLORS.noAnc, values: withoutAnc },
          { key: 'anc', color: COLORS.anc, values: withAnc },
          { key: 'total', color: COLORS.total, values: total, dashed: true },
        ],
        yMax: null, // 自适应
        yFmt: 'wan',
      },
      ancestry: {
        series: [{ key: 'anc', color: COLORS.anc, values: fracAnc }],
        yMax: y2,
        yFmt: 'percent',
      },
      currentRich: {
        series: [{ key: 'rich', color: COLORS.rich, values: fracRich }],
        yMax: y3,
        yFmt: 'percent',
      },
    },

    labels: {
      kRichAnc: pat ? '有富人父系祖先的比例' : '有富人祖先的比例',
      kRichPop: pat ? '有富人父系血统的人数' : '有富人血统的人数',
      lgAnc: pat ? '有富人父系祖先' : '有富人祖先',
      lgNoAnc: pat ? '无富人父系祖先' : '无富人祖先',
      title2: pat
        ? '随机抽一人：其父系祖先中至少有一位是富人的概率'
        : '随机抽一人：祖先中至少有一位是富人的概率',
    },

    stats: {
      pop: fmtWan(totalNow),
      richPct: fracRichNow.toFixed(1) + '%',
      ancPct: fracAncNow.toFixed(1) + '%',
      richPop: fmtWan(ancNow),
    },

    /** 侧栏说明区：结构化的「标签 + 值」，模板循环渲染即可。 */
    info: [
      { label: '血统判定', value: pat ? '仅父系（只随父亲传递）' : '父母任一方（双侧扩散）' },
      { label: '子女存活率', value: '富人 ' + params.richSurvive + '% ／ 穷人 ' + params.poorSurvive + '%' },
      { label: '跨阶层婚配抑制', value: params.crossSuppress + '%（0 = 随机配对，100 = 完全内婚）' },
      {
        label: '实际模拟',
        value: gens + ' 代 × ' + L + ' 年 / 代 = ' + simYears + ' 年（设定 ' + params.years + ' 年）',
      },
      // 注意：fmtWan 已经自带「万 / 亿」单位，这里不要再拼一次「万」
      { label: '初始有' + ancWord + '人数', value: fmtWan(initAnc) },
      {
        label: simYears + ' 年后有' + ancWord,
        value: fmtWan(ancNow) + '（' + fracAncNow.toFixed(1) + '%）',
      },
      {
        label: simYears + ' 年后仍是富人',
        value: fmtWan(richNow) + '（' + fracRichNow.toFixed(1) + '%）',
      },
    ],
  };
}
