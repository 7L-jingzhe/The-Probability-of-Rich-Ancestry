/**
 * 渲染验证：用本机浏览器的 headless 模式 + CDP 真跑一遍页面，确认它确实渲染出了内容。
 *
 * 为什么需要它：
 *  - `vite build` 的产物用 <script type="module" src="...">，在 file:// 下会被浏览器
 *    按 CORS 拦掉，页面是白的；光看构建日志发现不了，必须真的用浏览器打开一次。
 *  - 只检查 HTML 文本里有没有关键字也不行：内联脚本本身也含这些字符串，会造成假阳性。
 *    所以这里读的是浏览器里的真实 DOM（#app 的子节点、canvas 数量、统计数值）。
 *
 * 用法：
 *   node scripts/verify-render.mjs                          # 验证 standalone/index.html（file:// 双击场景）
 *   node scripts/verify-render.mjs http://127.0.0.1:4173/    # 验证已启动的服务
 *   node scripts/verify-render.mjs dist/index.html           # 验证构建产物（会以 file:// 打开）
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const arg = process.argv[2] || 'standalone/index.html';
const url = /^https?:\/\//.test(arg) ? arg : pathToFileURL(resolve(root, arg)).href;

const BROWSERS = [
  process.env.DSH_BROWSER,
  process.env.CHROME_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const browser = BROWSERS.find((p) => existsSync(p));
if (!browser) {
  console.error('没找到浏览器，可用 DSH_BROWSER=/path/to/chrome 指定');
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9400 + Math.floor(Math.random() * 500);
const child = spawn(browser, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-extensions',
  '--user-data-dir=' + mkdtempSync(join(tmpdir(), 'render-check-')),
  '--remote-debugging-port=' + port, url,
], { stdio: 'ignore' });

let ws;
try {
  let page = null;
  for (let i = 0; i < 80 && !page; i++) {
    try {
      const list = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
      page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl) || null;
    } catch {}
    if (!page) await sleep(250);
  }
  if (!page) throw new Error('浏览器调试端口没有就绪');

  ws = new WebSocket(page.webSocketDebuggerUrl);
  const logs = [];
  let seq = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); return; }
    if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
      logs.push('[' + msg.params.type + '] ' + msg.params.args.map((a) => a.value ?? a.description ?? a.type).join(' '));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      logs.push('[exception] ' + (d.exception?.description || d.text));
    }
  });
  await new Promise((r) => ws.addEventListener('open', r));
  const call = (method, params = {}) => new Promise((r) => {
    const id = ++seq;
    pending.set(id, r);
    ws.send(JSON.stringify({ id, method, params }));
  });

  await call('Runtime.enable');
  await call('Page.enable');
  await sleep(2500); // 等首帧渲染完成

  const probe = await call('Runtime.evaluate', {
    returnByValue: true,
    expression: 'JSON.stringify({' +
      'appChildren: document.getElementById("app")?.children.length ?? -1,' +
      'canvases: document.querySelectorAll("canvas").length,' +
      'sliders: document.querySelectorAll("input[type=range]").length,' +
      'statCards: document.querySelectorAll(".stat").length,' +
      'firstStat: document.querySelector(".stat .v")?.textContent ?? null,' +
      'text: document.body.innerText,' +
      'canvasPainted: (function(){ var c = document.querySelector("canvas"); if (!c) return false;' +
      '  try { var d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;' +
      '    for (var i = 3; i < d.length; i += 4) if (d[i] !== 0) return true; return false; } catch (e) { return "err"; } })()' +
    '})',
  });
  const result = JSON.parse(probe.result.value);
  const text = result.text || '';

  const checks = [
    ['#app 已挂载', result.appChildren > 0],
    ['三张图表画布', result.canvases === 3],
    ['画布真的画了像素', result.canvasPainted === true],
    ['滑杆数量正确(16)', result.sliders === 16],
    ['四张统计卡片', result.statCards === 4],
    ['统计数值已计算', /[\d,.]+[万亿%]/.test(result.firstStat || '')],
    ['侧栏标题', text.includes('古代阶层延续模拟器')],
    ['分组齐全', ['血统判定', '人口与生育', '人口承载力', '阶层流动', '天灾'].every((g) => text.includes(g))],
    ['图表标题', text.includes('血统人口结构') && text.includes('至少有一位是富人的概率')],
    ['模型说明已渲染', text.includes('模型设定')],
    ['未建模提示', text.includes('阶级洗牌')],
    ['无控制台报错', logs.length === 0],
  ];

  console.log('目标: ' + url);
  let failed = 0;
  for (const [name, ok] of checks) {
    if (!ok) failed++;
    console.log((ok ? '  OK   ' : '  FAIL ') + name);
  }
  console.log('  统计卡片示例: ' + result.firstStat);
  if (logs.length) console.log('\n控制台输出:\n' + logs.slice(0, 20).join('\n'));
  console.log(failed ? '\n✗ ' + failed + ' 项失败' : '\n✓ 页面渲染验证通过');
  process.exitCode = failed ? 1 : 0;
} finally {
  try { ws?.close(); } catch {}
  child.kill();
}
