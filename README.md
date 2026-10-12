# The Probability of Rich Ancestry · 祖上富过的概率

> 一个用来推演「**任意一个人的祖先里，到底有没有出现过富人**」的模拟器，
> 并把血统扩散、阶层流动与天灾冲击的结果做成图表统计可视化。

纯前端、零后端，所有计算都在浏览器里完成：构建好的 `standalone/index.html` 双击就能打开，
不需要 Node，也不需要任何服务器。

---

## 它在回答什么问题

「祖上富过」这句话经常被当作血统论或阶层固化的证据。这个项目把它拆成两个**完全不同**的指标来观察：

| 指标 | 含义 | 直觉 |
| --- | --- | --- |
| **有富人祖先的比例** | 随机抽一个人，其祖先（或父系祖先）中至少有一位曾是富人 | 只要存在跨阶层通婚，这个比例就会单调爬升，**最终必然趋近 100%**，它不回答阶层是否固化 |
| **当前富人占比** | 随机抽一个人，他**现在**仍属于富人阶层 | 这才是阶层是否延续的真正指标，取决于滑落率、攀升率、生育与死亡率 |

人群中每个人都带两个属性：**有没有富人血统** × **当前是不是富人**，于是整个社会被分成 4 组：

```
有血统 · 富 (FR)   有血统 · 穷 (FP)
无血统 · 富 (NR)   无血统 · 穷 (NP)
```

每一代依次施加四步演化：

1. **跨阶层婚配抑制** —— 阶层内婚程度决定跨阶层夫妻数量（抑制系数 0% = 完全随机配对，此时跨阶层夫妻对数 = R·P/(R+P)；100% = 完全阶层内婚）；
2. **密度依赖生育** —— 按阶层分别计算每对夫妻的存活子女数（富人/穷人子女存活率不同），人口向承载力 K 收敛；
3. **阶层流动** —— 富→穷滑落、穷→富攀升，只改变当前阶层，不改变血统标记；
4. **天灾** —— 每隔固定年数发生一次，按当前阶层施加不同死亡率，并在曲线上以红色竖虚线标出。

关于血统传递、父系单线模式、承载力等完整假设，见页面底部「模型设定」一节（`src/components/ModelDocs.vue`）。

---

## 尚未建模：改朝换代时的阶级洗牌

**目前版本只模拟了天灾这类外生死亡率冲击**（以及阶层内婚、阶层流动、生育存活率等人**口学过程**）。

**还没有考虑改朝换代带来的阶级洗牌**：战乱屠戮、土地与财富的重新分配、旧贵族被清算、新贵崛起、
王朝崩溃期的超常死亡率、以及「一朝天子一朝臣」式的阶层结构重置。

因此当前模型给出的「当前富人占比」长期走势**会比真实历史更平滑**：
它缺少那种能把整个阶层结构一次性打散、让血统与财富的对应关系被强行切断的外生冲击。
真实历史里，正是这种洗牌让「祖上富过」变得普遍，同时让「一直富下去」变得困难。

计划中的建模方向（见 `src/constants/model.js` 里的 `TODO(改朝换代)`）：

- 改朝换代周期（年）与发生时的随机性；
- 洗牌强度：一次性抹掉多少比例的财富/阶层标记；
- 对富人群体的冲击倍率（改朝换代对顶层往往更致命）；
- 洗牌后的阶层重置与「新贵」注入比例。

---

## 技术栈与结构

重构后使用 **Vue 3（`<script setup>` 组合式 API）+ Vite**，不再是一个塞满命令式 DOM 操作的单文件页面。

```
.
├─ index.html                     # Vite 入口，挂载 #app
├─ package.json
├─ vite.config.js                 # 常规多文件构建（dist/，用于部署）
├─ vite.single.config.js          # 单文件构建（standalone/，双击即用）
├─ standalone/index.html          # 产物：全部内联的一个 HTML，无需服务器
├─ scripts/
│  ├─ check-model.mjs             # 模型回归基线：npm test
│  └─ verify-render.mjs           # 用本机浏览器真跑一遍验证渲染：npm run verify:render
├─ src/
│  ├─ main.js                     # createApp 启动
│  ├─ App.vue                     # 页面骨架：侧栏 + 统计卡片 + 三张图表 + 模型说明
│  ├─ styles/app.css              # 全局主题（暗色 + 金色点缀），沿用旧版视觉
│  ├─ constants/model.js          # DEFAULTS + 控件描述表（表驱动 UI，加参数只改这一处）
│  ├─ core/
│  │  ├─ simulation.js            # 模型内核：simulate() 纯函数，无框架依赖
│  │  ├─ viewModel.js             # 把时间序列整理成模板可用的视图模型
│  │  └─ format.js                # 数值格式化（万/亿、坐标轴刻度）
│  ├─ charts/lineChart.js         # Canvas 折线图渲染器（DPR 适配、网格、天灾标记）
│  ├─ composables/useSimulation.js# 响应式参数 + computed 派生结果 + 重置
│  └─ components/
│     ├─ ControlPanel.vue  ParamSlider.vue  ParamSegment.vue
│     ├─ StatGrid.vue      SimInfo.vue
│     ├─ ChartCard.vue     LineChart.vue
│     └─ ModelDocs.vue
```

数据流很简单：**参数（reactive）→ `simulate()` → 视图模型（computed）→ 组件渲染**。
拖动任意滑杆，computed 自动重算整条曲线，组件层不再有任何手动重绘逻辑。

---

## 怎么运行

### 方式一：双击运行（不需要 Node、不需要服务器）

仓库里已经带了一份构建好的**单文件版本**：

```
standalone/index.html        # 全部 JS/CSS 内联在这一个文件里，双击就能用
```

克隆/下载后用浏览器打开它即可，也可以直接发给别人，或丢到 U 盘里。

> ⚠️ 注意 **不要** 双击 `dist/index.html`：常规构建产出的是
> `<script type="module" src="./assets/…js">`，浏览器在 `file://` 协议下会以 CORS 为由
> 拒绝加载模块脚本，你只会看到一个空白页。`dist/` 是给 HTTP 服务器用的，
> 想双击运行请用 `standalone/index.html`。

### 方式二：开发模式

```bash
npm install           # 安装依赖（Vue 3 + Vite）
npm run dev           # 开发服务器，默认 http://localhost:5173，支持热更新
```

### 方式三：构建部署

```bash
npm run build            # -> dist/            多文件，用于部署到静态服务器 / GitHub Pages
npm run build:standalone # -> standalone/      单文件，双击即用
npm run build:all        # 两个都构建
npm run preview          # 本地起服务预览 dist/
```

### 校验脚本

```bash
npm test                # 模型回归基线：默认参数等 4 组用例的末代人口与比例必须命中冻结值，
                        # 同时检查时间序列点数、NaN / 负数人口等硬不变量
npm run verify:render   # 用本机 headless 浏览器真的打开页面，检查 #app 挂载、3 张 canvas
                        # 是否画出像素、16 个滑杆、统计数值、无控制台报错
```

模型基线是**自包含**的（不依赖任何历史文件）。有意修改模型时（例如将来真的加入改朝换代洗牌），
用 `node scripts/check-model.mjs --print` 打印新结果，确认符合预期后更新脚本里的 `EXPECTED` 即可。

`verify:render` 默认验证 `standalone/index.html`，也可以指定目标：

```bash
node scripts/verify-render.mjs http://127.0.0.1:4173/   # 验证已启动的服务
node scripts/verify-render.mjs dist/index.html          # 验证构建产物（file:// 打开，会如预期失败）
```

> 说明：这两个脚本都是这次重构里加的。`vite build` 成功 ≠ 页面能跑——
> ES module 在 `file://` 下会静默失败，只看构建日志和 DOM 文本都会得出错误结论，
> 所以验证方式是让真实浏览器渲染一遍再读 DOM 与 canvas 像素。

## 参数一览

| 分组 | 参数 |
| --- | --- |
| 血统判定 | 祖上富过的判定方式（父母任一方 / 仅父系） |
| 人口与生育 | 初始总人口、初始富人占比、初始有富人祖先的比例（富/穷各一）、模拟年数、一代时长、每对夫妻生育数、富人/穷人子女存活至成年 |
| 人口承载力 | 人口承载力 K |
| 阶层流动 | 跨阶层婚配抑制系数、富→穷滑落率、穷→富攀升率 |
| 天灾 | 天灾间隔、天灾·穷人死亡率、天灾·富人死亡率 |

## 关于本次重构

- 旧版 686 行的单文件页面（命令式 `document.getElementById` + 手写 DOM 拼装），以及目录里那份
  未被任何代码引用的 Vue 2.6.10 副本（`vue.js`），在重构验证完成后已从仓库移除，依赖改为 npm 安装的 Vue 3；
- 数值结果**完全一致**：重构时曾用对拍脚本抽出旧版 `simulate()` 源码，以 41 组参数（默认参数 + 40 组随机参数）
  逐时间点比对四组人口，误差 ≤ 1e-9，全部通过；旧实现删除后，这份保证改为 `npm test` 的冻结基线（4 组代表性参数）长期守着；
- 顺手修掉了旧版说明区里 `300万 万` 这种「单位重复」的显示 bug（`fmtWan()` 本身已带单位）；
- 保留「一个 HTML 双击就能看图表」这个最实用的特性：`npm run build:standalone` 会打成
  `standalone/index.html`（Rollup 输出 iife + 内联脚本样式，并把 `<script>` 挪到 `</body>` 之前，
  因为普通脚本不像 `type="module"` 那样自动 defer，留在 `<head>` 会在 `#app` 出现前执行导致白屏）。

## 许可

MIT
