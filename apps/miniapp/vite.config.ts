import Uni from '@uni-helper/plugin-uni';
import UniHelperComponents from '@uni-helper/vite-plugin-uni-components';
import UniHelperLayouts from '@uni-helper/vite-plugin-uni-layouts';
import UniHelperManifest from '@uni-helper/vite-plugin-uni-manifest';
import UniHelperPages from '@uni-helper/vite-plugin-uni-pages';
import UnoCSS from 'unocss/vite';
import AutoImport from 'unplugin-auto-import/vite';
import { defineConfig, loadEnv } from 'vite';
import UniPolyfill from 'vite-plugin-uni-polyfill';

// https://vitejs.dev/config/
// as any：部分 uni 插件随 vite8 类型包声明返回类型，与锁定的 vite5 类型形参不兼容（运行时兼容）
export default defineConfig((({ mode }: { mode: string }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL),
    },
    plugins: [
      // https://uni-helper.js.org/vite-plugin-uni-manifest
      UniHelperManifest(),
      // https://uni-helper.js.org/vite-plugin-uni-pages
      UniHelperPages({
        dts: 'src/uni-pages.d.ts',
        // 关闭与旧 src/pages.json 的合并，避免脚手架遗留死页面永远回流
        mergePages: false,
      }),
      // https://uni-helper.js.org/vite-plugin-uni-layouts
      UniHelperLayouts(),
      // https://uni-helper.js.org/vite-plugin-uni-components
      UniHelperComponents({
        dts: 'src/components.d.ts',
        directoryAsNamespace: true,
      }),
      // https://uni-helper.js.org/plugin-uni
      Uni(),
      UniPolyfill(),
      // https://github.com/antfu/unplugin-auto-import
      AutoImport({
        imports: ['vue', '@vueuse/core', 'uni-app'],
        dts: 'src/auto-imports.d.ts',
        dirs: ['src/composables', 'src/stores', 'src/utils'],
        vueTemplate: true,
      }),
      // https://github.com/antfu/unocss
      // see unocss.config.ts for config
      UnoCSS(),
    ],
  };
}) as any);
