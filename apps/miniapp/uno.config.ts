import { presetUni } from '@uni-helper/unocss-preset-uni';
import { defineConfig, transformerDirectives, transformerVariantGroup } from 'unocss';

/**
 * UnoCSS 配置 - 小程序版本
 *
 * 重要说明：
 * 1. presetUni() 已内置 presetUno + 小程序适配
 * 2. 自动处理 rpx 转换
 * 3. 对于特殊字符（如 [、]、/），建议使用自定义 SCSS 类替代
 * 4. 不使用属性化模式（小程序不支持）
 */

export default defineConfig({
  // 预设配置
  presets: [
    presetUni({
      // 小程序自动适配，已内置以下功能：
      // - presetUno / presetApplet
      // - presetAttributify (自动适配小程序)
      // - presetRemRpx (rpx 转换)
    }),
  ],

  // 转换器配置
  transformers: [
    transformerDirectives(), // 处理 @apply 等指令
    transformerVariantGroup(), // 处理变体组语法
  ],
  theme: {
    colors: {
      surface: '#f5faff',
      'secondary-container': '#b9e2ff',
      'on-primary-fixed-variant': '#004c6b',
      'surface-container-low': '#eff4fa',
      'on-primary': '#ffffff',
      tertiary: '#8d4f00',
      'on-primary-fixed': '#001e2d',
      'inverse-on-surface': '#ecf1f7',
      'secondary-fixed': '#c6e7ff',
      outline: '#6e7881',
      'on-secondary-container': '#3d657e',
      'on-primary-container': '#003e58',
      'on-secondary': '#ffffff',
      'on-tertiary': '#ffffff',
      'tertiary-fixed-dim': '#ffb876',
      'surface-container-high': '#e4e9ee',
      'on-secondary-fixed': '#001e2d',
      'surface-variant': '#dee3e8',
      'on-error-container': '#93000a',
      'on-tertiary-fixed-variant': '#6b3b00',
      'primary-container': '#00aeef',
      'inverse-primary': '#82cfff',
      'surface-tint': '#00658d',
      'secondary-fixed-dim': '#a3cce8',
      'surface-dim': '#d6dae0',
      'on-tertiary-fixed': '#2d1600',
      'on-tertiary-container': '#572f00',
      'primary-fixed-dim': '#82cfff',
      'tertiary-container': '#ea8c21',
      'surface-container-lowest': '#ffffff',
      'error-container': '#ffdad6',
      'tertiary-fixed': '#ffdcc0',
      'inverse-surface': '#2c3135',
      'surface-bright': '#f5faff',
      background: '#f5faff',
      'on-error': '#ffffff',
      'surface-container': '#eaeef4',
      'primary-fixed': '#c6e7ff',
      error: '#ba1a1a',
      secondary: '#3a637c',
      primary: '#00658d',
      'on-background': '#171c20',
      'surface-container-highest': '#dee3e8',
      'outline-variant': '#bdc8d1',
      'on-surface': '#171c20',
      'on-surface-variant': '#3e4850',
      'on-secondary-fixed-variant': '#204b63',
    },
    fontFamily: {
      headline: '"Plus Jakarta Sans", sans-serif',
      body: '"Plus Jakarta Sans", sans-serif',
      label: '"Plus Jakarta Sans", sans-serif',
    },
  },
  shortcuts: {
    'no-scrollbar': 'overflow-x-auto overflow-y-hidden',
    // 激活态缩放
    'active-scale-95': 'transition-transform duration-200',
    'active-scale-98': 'transition-transform duration-200',
  },
  rules: [
    // 自定义阴影
    ['shadow-ambient', { 'box-shadow': '0 4px 16px rgba(23, 28, 32, 0.04)' }],
    ['shadow-card', { 'box-shadow': '0 2px 8px rgba(23, 28, 32, 0.03)' }],
    // mix-blend-mode
    ['mix-blend-multiply', { 'mix-blend-mode': 'multiply' }],
    // 文字截断
    [
      'line-clamp-2',
      {
        display: '-webkit-box',
        '-webkit-box-orient': 'vertical',
        '-webkit-line-clamp': '2',
        overflow: 'hidden',
      },
    ],
  ],
});
