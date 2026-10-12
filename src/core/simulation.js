/**
 * 模型内核：把一组参数推演成「血统 × 阶层」四组人口的时间序列。
 *
 * 人群被分成 4 组：
 *   FR 有富人血统 · 当前富
 *   FP 有富人血统 · 当前穷
 *   NR 无富人血统 · 当前富
 *   NP 无富人血统 · 当前穷
 *
 * 每一代依次施加：跨阶层婚配抑制 -> 密度依赖生育 -> 阶层流动 -> 天灾死亡率。
 *
 * 注意：当前版本只建模了「天灾」这一类外生冲击。
 * 改朝换代带来的阶级洗牌（战乱、土地重新分配、旧贵族被清算等）尚未建模，
 * 见 README「尚未建模」一节。
 */

/** 把任意数值夹到 [0, 1]。 */
export const clamp01 = (v) => Math.min(1, Math.max(0, v));

/**
 * 跑完整场模拟。
 * @param {object} p 参数（见 src/constants/model.js 的 DEFAULTS）
 * @returns {{pts: Array<{t:number,FR:number,FP:number,NR:number,NP:number}>, disasters:number[], gens:number, L:number}}
 */
export function simulate(p) {
  const gens = Math.max(1, Math.floor(p.years / p.genLen));
  const L = p.genLen;

  const sR = clamp01(p.richSurvive / 100);
  const sP = clamp01(p.poorSurvive / 100);
  const e = clamp01(p.crossSuppress / 100);
  const d = clamp01(p.down / 100);
  const u = clamp01(p.up / 100);
  const rD = clamp01(p.richDeath / 100);
  const pD = clamp01(p.poorDeath / 100);
  const K = Math.max(1e-6, p.K);

  // 是否父系单线判定
  const pat = p.ancMode === 2;

  // 初始条件：富人中只有 richAnc0 比例「本身就有富人祖先」
  const rich0 = (p.pop0 * p.richPct) / 100;
  const rich0A = rich0 * clamp01(p.richAnc0 / 100);
  const poor0 = Math.max(0, p.pop0 - rich0);
  const poor0A = poor0 * clamp01((p.poorAnc0 || 0) / 100);

  let FR = rich0A;
  let NR = rich0 - rich0A;
  let FP = poor0A;
  let NP = poor0 - poor0A;

  const pts = [{ t: 0, FR, FP, NR, NP }];

  // 天灾年份
  const disasters = [];
  if (p.disasterGap > 0) {
    for (let dd = p.disasterGap; dd <= p.years + 1e-9; dd += p.disasterGap) {
      disasters.push(dd);
    }
  }

  // 低密度时每对夫妻的存活子女数（按阶层分开）
  const maxKidsR = p.birth * sR;
  const maxKidsP = p.birth * sP;

  // 密度依赖生育：
  //   maxKids >= 2 时，N=0 为 maxKids，N=K 平滑降到 2；
  //   maxKids <  2 时，人口本来就在下降，密度依赖让其进一步下降，不反向拉升。
  function kidsAtDensity(maxKids, N) {
    const f = Math.min(1, Math.max(0, N / K));
    if (maxKids >= 2) {
      const denom = 1 + (maxKids / 2 - 1) * f;
      return denom > 0.15 ? maxKids / denom : 0.02;
    }
    return Math.max(0.005, maxKids * (1 - 0.6 * f));
  }

  for (let i = 1; i <= gens; i++) {
    const t0 = (i - 1) * L;
    const t1 = i * L;

    const N = FR + FP + NR + NP;
    if (N < 1e-9) {
      FR = 0;
      FP = 0;
      NR = 0;
      NP = 0;
      pts.push({ t: t1, FR: 0, FP: 0, NR: 0, NP: 0 });
      continue;
    }

    const R = FR + NR; // 当前富人
    const P = FP + NP; // 当前穷人

    // 阶层内部，有富人血统的比例（穷人群体的 y 是血统传递概率的关键输入）
    const y = P > 0 ? FP / P : 0;

    // ---- 密度依赖生育 ----
    const kidsR = kidsAtDensity(maxKidsR, N);
    const kidsP = kidsAtDensity(maxKidsP, N);
    const kidsCM = (kidsR + kidsP) / 2; // 跨阶层婚配取平均

    // ---- 婚配结构（随机配对基准 × 抑制系数）----
    //   随机配对下，跨阶层夫妻对数 = R·P/(R+P)
    //   e = 0 时跨阶层夫妻占比 = 2·r·(1-r)
    const C0 = R + P > 0 ? (R * P) / (R + P) : 0;
    const C = (1 - e) * C0;

    const ffM = Math.max(0, R - C) / 2; // 富×富夫妻对数
    const ppM = Math.max(0, P - C) / 2; // 穷×穷夫妻对数
    const cmM = C; // 富×穷夫妻对数

    const ffKids = ffM * kidsR;
    const ppKids = ppM * kidsP;
    const cmKids = cmM * kidsCM;

    // ---- 子代获得富人血统的概率 ----
    let pFF;
    let pPP;
    let pCM;
    if (pat) {
      // 仅父系：血统只随父亲传递
      //   富×富：父亲是富人 -> 必然
      //   穷×穷：父亲是穷人，概率 = y（父亲本身已有父系血统）
      //   跨阶层：假设一半父亲是富人、一半父亲是穷人
      pFF = 1;
      pPP = y;
      pCM = 0.5 * (1 + y);
    } else {
      // 双侧：父母任一方有即可
      //   富×富：父母均富人 -> 必然
      //   穷×穷：双方都无标记才无标记
      //   跨阶层：有一方是富人 -> 必然
      pFF = 1;
      pPP = 1 - (1 - y) * (1 - y);
      pCM = 1;
    }

    // ---- 出生人口按 (血统 × 阶层) 分布 ----
    // 跨阶层婚配的子女按 50/50 分到富/穷两组
    const FR2 = ffKids * pFF + cmKids * pCM * 0.5;
    const NR2 = ffKids * (1 - pFF) + cmKids * (1 - pCM) * 0.5;
    const FP2 = ppKids * pPP + cmKids * pCM * 0.5;
    const NP2 = ppKids * (1 - pPP) + cmKids * (1 - pCM) * 0.5;

    // ---- 阶层流动（不改变血统，只改变当前阶层）----
    const nFR = FR2 * (1 - d) + FP2 * u;
    const nFP = FP2 * (1 - u) + FR2 * d;
    const nNR = NR2 * (1 - d) + NP2 * u;
    const nNP = NP2 * (1 - u) + NR2 * d;

    // ---- 天灾（按当前阶层施加死亡率）----
    let rMul = 1;
    let pMul = 1;
    for (const dd of disasters) {
      if (dd > t0 + 1e-9 && dd <= t1 + 1e-9) {
        rMul *= 1 - rD;
        pMul *= 1 - pD;
      }
    }
    FR = nFR * rMul;
    NR = nNR * rMul;
    FP = nFP * pMul;
    NP = nNP * pMul;

    pts.push({ t: t1, FR, FP, NR, NP });
  }

  return { pts, disasters, gens, L };
}
