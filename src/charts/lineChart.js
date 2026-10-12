import { niceMax } from '../core/format';

/**
 * 在 canvas 上画一张折线图（带网格、坐标轴标签、天灾竖向虚线标记）。
 * 纯函数式渲染，不依赖任何框架，方便单独测试或复用。
 *
 * @param {HTMLCanvasElement} canvas
 * @param {number[]} xs x 轴刻度（年份）
 * @param {{values:number[], color:string, dashed?:boolean}[]} series
 * @param {{yMax?:number, yFmt?:(v:number)=>string, markers?:number[]}} [opts]
 */
export function drawLineChart(canvas, xs, series, opts = {}) {
  if (!canvas || !xs || !xs.length) return;

  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  if (!W || !H) return;

  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const pad = { l: 62, r: 14, t: 12, b: 26 };
  const pw = W - pad.l - pad.r;
  const ph = H - pad.t - pad.b;

  let maxV = 0;
  for (const s of series) for (const v of s.values) if (v > maxV) maxV = v;
  const yMax = opts.yMax != null ? opts.yMax : niceMax(maxV * 1.08);
  const yMin = 0;

  const t0 = xs[0];
  const t1 = xs[xs.length - 1];
  const X = (t) => pad.l + (t1 > t0 ? ((t - t0) / (t1 - t0)) * pw : 0);
  const Y = (v) => pad.t + ph - ((v - yMin) / (yMax - yMin)) * ph;

  ctx.font = '11px ui-sans-serif, system-ui, sans-serif';

  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const v = yMin + ((yMax - yMin) * i) / ticks;
    const y = Math.round(Y(v)) + 0.5;
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + pw, y);
    ctx.stroke();

    ctx.fillStyle = '#7d8998';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(opts.yFmt ? opts.yFmt(v) : String(Math.round(v)), pad.l - 8, y);
  }

  const xt = 5;
  for (let i = 0; i <= xt; i++) {
    const t = t0 + ((t1 - t0) * i) / xt;
    const x = Math.round(X(t)) + 0.5;
    ctx.strokeStyle = 'rgba(255,255,255,.035)';
    ctx.beginPath();
    ctx.moveTo(x, pad.t);
    ctx.lineTo(x, pad.t + ph);
    ctx.stroke();

    ctx.fillStyle = '#7d8998';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(Math.round(t) + '年', x, pad.t + ph + 7);
  }

  for (const dd of opts.markers || []) {
    if (dd < t0 || dd > t1) continue;
    const x = Math.round(X(dd)) + 0.5;
    ctx.save();
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = 'rgba(239,108,108,.5)';
    ctx.beginPath();
    ctx.moveTo(x, pad.t);
    ctx.lineTo(x, pad.t + ph);
    ctx.stroke();
    ctx.restore();
  }

  for (const s of series) {
    ctx.beginPath();
    for (let i = 0; i < xs.length; i++) {
      const x = X(xs[i]);
      const y = Y(s.values[i]);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.dashed ? 1.5 : 2.2;
    ctx.setLineDash(s.dashed ? [5, 4] : []);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
