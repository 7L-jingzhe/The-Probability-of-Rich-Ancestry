import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * 单文件构建配置：把所有 JS/CSS 内联进一个 HTML。
 *
 * 为什么需要它：普通 `vite build` 产出的是 <script type="module" src="...">，
 * 在 file:// 协议下会被浏览器以 CORS 为由拦掉（模块脚本不允许跨源加载本地文件），
 * 双击 index.html 只会看到空白页。这里把产物压成「一个 HTML + 一段普通 <script>」，
 * 于是双击就能直接跑，不需要任何服务器（也方便随手发给别人）。
 *
 * 代价：产物是给现代浏览器看的单一文件，不适合做多页站点或需要缓存拆分的部署。
 * 要部署到服务器 / GitHub Pages，请用 `npm run build` 产出的 dist/。
 */

/** 构建结束后，把构建产物里的 JS/CSS 内联进 HTML，并删掉独立的资源文件。 */
function inlineAssets() {
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  return {
    name: 'inline-assets',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const htmlAsset = Object.values(bundle).find(
        (item) => item.type === 'asset' && item.fileName.endsWith('.html'),
      )
      if (!htmlAsset) return

      let html = String(htmlAsset.source)
      const inlineScripts = []

      for (const [key, item] of Object.entries(bundle)) {
        if (item === htmlAsset) continue

        if (item.type === 'asset' && item.fileName.endsWith('.css')) {
          const tag = new RegExp('<link[^>]*href="[^"]*' + escapeRe(item.fileName) + '"[^>]*>')
          html = html.replace(tag, '<style>\n' + String(item.source) + '\n</style>')
          delete bundle[key]
        } else if (item.type === 'chunk') {
          const tag = new RegExp('<script[^>]*src="[^"]*' + escapeRe(item.fileName) + '"[^>]*></script>')
          // 内联的 JS 里若出现 </script 会提前结束脚本，按 HTML 规范转义成 <\/script
          const code = item.code.replace(/<\/script/gi, '<\\/script')
          inlineScripts.push('<script>\n' + code + '\n</script>')
          // 关键：普通 <script> 不会像 type="module" 那样自动 defer，
          // 留在 <head> 里会在 #app 解析出来之前执行，导致挂载失败、页面空白。
          // 所以先摘掉原标签，统一挪到 </body> 之前。
          html = html.replace(tag, '')
          delete bundle[key]
        }
      }

      if (inlineScripts.length) {
        const scripts = inlineScripts.join('\n')
        html = html.includes('</body>')
          ? html.replace('</body>', scripts + '\n</body>')
          : html + scripts
      }

      htmlAsset.source = html
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [vue(), inlineAssets()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'standalone',
    emptyOutDir: true,
    target: 'es2019',
    cssCodeSplit: false,
    modulePreload: false,
    assetsInlineLimit: 100 * 1024 * 1024,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        // 普通 <script> 不能有 import/export，所以打成 iife
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'app.js',
        assetFileNames: 'app.[ext]',
      },
    },
  },
})
