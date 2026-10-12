/**
 * 模型默认参数与控件描述表。
 * 控件表驱动 UI：新增一个参数只需要在这里加一行，控件面板会自动渲染。
 */

export const DEFAULTS = {
  ancMode: 1, // 1 = 父母任一方；2 = 仅父系
  pop0: 3000,
  richPct: 10,
  richAnc0: 100, // 初始富人中本身有富人祖先的比例
  poorAnc0: 0, // 初始穷人中本身有富人祖先的比例
  years: 750,
  genLen: 30,
  birth: 5,
  richSurvive: 80, // 富人子女存活至成年 %
  poorSurvive: 50, // 穷人子女存活至成年 %
  K: 12000,
  crossSuppress: 70, // 跨阶层婚配抑制系数（0 = 随机配对，100 = 完全内婚）
  down: 50,
  up: 10,
  disasterGap: 30,
  poorDeath: 10,
  richDeath: 5,
};

/**
 * @typedef {object} ControlDef
 * @property {string} group 分组标题
 * @property {string} key 对应 DEFAULTS 里的字段
 * @property {string} label 中文标签
 * @property {'slider'|'segment'} [type] 默认 slider
 * @property {string} [unit] 数值单位
 * @property {number} [min]
 * @property {number} [max]
 * @property {number} [step]
 * @property {string} [hint] 说明文字
 * @property {{v:number,label:string}[]} [options] segment 类型的选项
 */

/** @type {ControlDef[]} */
export const CONTROLS = [
  {
    group: '血统判定',
    key: 'ancMode',
    label: '祖上富过的判定方式',
    type: 'segment',
    options: [
      { v: 1, label: '父母任一方' },
      { v: 2, label: '仅父系（父亲）' },
    ],
    hint: '父母任一方：父母任意一方祖上富过即算，血统双侧扩散；同时父母当前是富人，也视为子女的富人祖先。仅父系：只有父亲的父系血统计入，母亲一方富过不算；跨阶层婚配中假设富方为父与穷方为父各占一半。',
  },

  { group: '人口与生育', key: 'pop0', label: '初始总人口', unit: '万', min: 100, max: 20000, step: 100 },
  { group: '人口与生育', key: 'richPct', label: '初始富人占比', unit: '%', min: 1, max: 50, step: 1 },
  {
    group: '人口与生育',
    key: 'richAnc0',
    label: '初始富人中本身有富人祖先',
    unit: '%',
    min: 0,
    max: 100,
    step: 5,
    hint: '100% = 所有初始富人都是“纯血统”；调低表示初始富人中混入了新贵',
  },
  {
    group: '人口与生育',
    key: 'poorAnc0',
    label: '初始穷人中本身有富人祖先',
    unit: '%',
    min: 0,
    max: 100,
    step: 5,
    hint: '反映初始时已有部分穷人祖上富过（如家道中落者）',
  },
  { group: '人口与生育', key: 'years', label: '模拟年数', unit: '年', min: 60, max: 900, step: 30 },
  { group: '人口与生育', key: 'genLen', label: '一代时长', unit: '年', min: 15, max: 40, step: 1 },
  { group: '人口与生育', key: 'birth', label: '每对夫妻生育数', unit: '个', min: 1, max: 10, step: 0.5 },
  {
    group: '人口与生育',
    key: 'richSurvive',
    label: '富人子女存活至成年',
    unit: '%',
    min: 10,
    max: 95,
    step: 1,
    hint: '富×富婚配使用；跨阶层婚配取两档平均',
  },
  {
    group: '人口与生育',
    key: 'poorSurvive',
    label: '穷人子女存活至成年',
    unit: '%',
    min: 10,
    max: 95,
    step: 1,
    hint: '穷×穷婚配使用。若富人存活率更高，富人阶层净增长更快，会推高当前富人占比',
  },

  {
    group: '人口承载力',
    key: 'K',
    label: '人口承载力 K',
    unit: '万',
    min: 1000,
    max: 50000,
    step: 500,
    hint: '人口会稳定在 K 附近（密度依赖生育）',
  },

  {
    group: '阶层流动',
    key: 'crossSuppress',
    label: '跨阶层婚配抑制系数',
    unit: '%',
    min: 0,
    max: 100,
    step: 5,
    hint: '0% = 随机配对（跨阶层对数 = R·P/(R+P)，占比 = 2r(1-r)）；100% = 完全阶层内婚。数值越大，跨阶层婚配越少',
  },
  { group: '阶层流动', key: 'down', label: '富→穷滑落率', unit: '%', min: 0, max: 80, step: 1 },
  { group: '阶层流动', key: 'up', label: '穷→富攀升率', unit: '%', min: 0, max: 30, step: 1 },

  { group: '天灾', key: 'disasterGap', label: '天灾间隔', unit: '年', min: 20, max: 200, step: 5 },
  { group: '天灾', key: 'poorDeath', label: '天灾·穷人死亡率', unit: '%', min: 0, max: 90, step: 1 },
  { group: '天灾', key: 'richDeath', label: '天灾·富人死亡率', unit: '%', min: 0, max: 90, step: 1 },

  // TODO(改朝换代)：阶级洗牌尚未建模。计划新增一组参数（改朝换代周期、洗牌强度、
  // 对富人群体的冲击倍率、洗牌后阶层重置比例），并在 simulate() 中作为独立事件施加。
];

/** 按分组切分控件表，方便模板里先渲染分组标题。 */
export function groupControls(controls = CONTROLS) {
  const groups = [];
  for (const c of controls) {
    let g = groups.find((it) => it.title === c.group);
    if (!g) {
      g = { title: c.group, items: [] };
      groups.push(g);
    }
    g.items.push({ type: 'slider', ...c });
  }
  return groups;
}
