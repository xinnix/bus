# HTML + Tailwind CSS 转 uni-app + UnoCSS 完整指南

> **适用于**: 从 Stitch/Figma 导出的 HTML 代码转换为微信小程序
> **最后更新**: 2026-04-01

---

## 🎯 核心原则

虽然 UnoCSS 与 Tailwind CSS 语法 95% 兼容，但由于**小程序环境限制**和**UnoCSS 的按需编译机制**，需要特别注意以下关键点。

---

## ⚠️ 7 大核心差异

### 1. 字符转义问题 ⭐⭐⭐⭐⭐

**问题**: 小程序对类名中的特殊字符敏感

```html
<!-- ❌ 小程序不支持 -->
<view class="w-[100px]"></view>
<view class="top-1/2"></view>
<view class="bg-blue-500/50"></view>
```

**原因**: 包含 `[`, `]`, `/`, `:`, `.` 等特殊字符

**解决方案**: 安装并配置 `@unocss/transformer-applet`

```bash
pnpm add @unocss/transformer-applet -D
```

```typescript
// uno.config.ts
import transformerApplet from '@unocss/transformer-applet';

export default defineConfig({
  transformers: [
    transformerApplet(), // ⭐ 必须放在最前面！
    // ... 其他 transformers
  ],
});
```

**自动转换结果**:

```html
<!-- ✅ 自动转换为小程序兼容格式 -->
<view class="w-_100px_"></view>
<view class="top-1_2"></view>
<view class="bg-blue-500_50"></view>
```

---

### 2. 单位转换 (px → rpx) ⭐⭐⭐⭐

**问题**: Web 使用 `px`，小程序需要 `rpx` 实现响应式

**默认行为**:

- `w-10` → Web: `2.5rem (40px)` → 小程序: `10rpx`
- 数值直接映射为 `rpx`

**解决方案**: 使用 `@uni-helper/unocss-preset-uni`

```typescript
// uno.config.ts
import { presetUni } from '@uni-helper/unocss-preset-uni';

export default defineConfig({
  presets: [
    presetUni(), // 自动处理 rpx 转换
  ],
});
```

**转换规则** (基于 375px 设计稿):

```html
<!-- Stitch 导出: width: 100px -->
<view class="w-100"></view>
<!-- ✅ 自动识别为 100rpx -->
<view class="w-100rpx"></view>
<!-- ✅ 显式写法 -->
<view class="w-[100px]"></view>
<!-- ⚠️ 需要 transformer 处理 -->
```

**强制使用 px**:

```html
<view class="w-[100px]px"></view>
<!-- 明确指定单位 -->
```

---

### 3. 标签选择器差异 ⭐⭐⭐

**问题**: 小程序没有 `html`, `body`, `*` 选择器

```css
/* ❌ Web 中的 Reset */
* {
  margin: 0;
}
body {
  font-family: sans-serif;
}
html {
  font-size: 16px;
}
```

**解决方案**:

```css
/* ✅ 小程序中 */
page {
  font-family: sans-serif;
}
view,
text {
  margin: 0;
}
```

**UnoCSS 自动处理**:

```typescript
// presetUni 会自动过滤不支持的 Reset 样式
presets: [
  presetUni(), // ✅ 已内置处理
];
```

---

### 4. 属性化模式 (Attributify) ⭐⭐⭐⭐

**问题**: 小程序不支持属性化写法

```html
<!-- ❌ Web/UnoCSS 属性化写法 -->
<view border="2 red" text="center"></view>
<view flex="~ col" gap="4"></view>
```

**解决方案**: 必须使用传统 class 写法

```html
<!-- ✅ 传统 class 写法 -->
<view class="border-2 border-red text-center"></view>
<view class="flex flex-col gap-4"></view>
```

**配置禁用**:

```typescript
// uno.config.ts
export default defineConfig({
  presets: [
    presetUni({
      attributify: false, // ⭐ 禁用属性化模式
    }),
  ],
});
```

---

### 5. 动态类名 (最易出错) ⭐⭐⭐⭐⭐

**问题**: UnoCSS 是静态分析，无法识别动态拼接的类名

```html
<!-- ❌ 错误：动态拼接 -->
<view :class="'text-' + color"></view>
<view :class="`bg-${theme}-500`"></view>

<!-- ❌ 错误：对象简写 -->
<view :class="{ active: isActive }"></view>
```

**原因**: UnoCSS 编译时无法知道 `color` 和 `theme` 的值

**解决方案 1**: 完整路径写法

```html
<!-- ✅ 完整类名 -->
<view :class="isActive ? 'text-red' : 'text-blue'"></view>
<view :class="theme === 'dark' ? 'bg-gray-900' : 'bg-white'"></view>
```

**解决方案 2**: 使用方法返回

```typescript
function getTextClass(color: string) {
  const colorMap = {
    red: 'text-red',
    blue: 'text-blue',
    green: 'text-green',
  };
  return colorMap[color];
}
```

```html
<view :class="getTextClass(color)"></view>
```

**解决方案 3**: Safelist 预生成

```typescript
// uno.config.ts
export default defineConfig({
  safelist: [
    'text-red',
    'text-blue',
    'text-green',
    // 或者使用模式
    ...['red', 'blue', 'green'].map((c) => `text-${c}`),
  ],
});
```

---

### 6. 背景图片限制 ⭐⭐⭐

**问题**: 小程序不支持外部 CSS 引用本地图片

```css
/* ❌ 不支持 */
.bg-pattern {
  background-image: url('@/assets/pattern.png');
}
```

**解决方案**:

**方案 1**: 网络图片

```css
.bg-pattern {
  background-image: url('https://cdn.example.com/pattern.png');
}
```

**方案 2**: Base64

```css
.bg-pattern {
  background-image: url('data:image/png;base64,...');
}
```

**方案 3**: 使用 UnoCSS Icons (推荐)

```typescript
// uno.config.ts
import { presetIcons } from 'unocss';

export default defineConfig({
  presets: [
    presetIcons(), // ⚠️ 小程序可能不支持，建议用 Emoji
  ],
});
```

```html
<!-- 使用图标代替背景图 -->
<view class="i-carbon-logo-github"></view>

<!-- 或使用 Emoji -->
<text>🔍</text>
```

---

### 7. 颜色透明度 ⭐⭐

**问题**: 旧版小程序对 CSS 变量支持不佳

```html
<!-- Tailwind 默认写法 -->
<view class="text-black/50"></view>
```

**现代小程序** (基础库 2.x+): ✅ 支持

**旧版小程序解决方案**:

```html
<!-- ✅ 分离写法 -->
<view class="text-black text-opacity-50"></view>
```

**配置自定义透明度**:

```scss
// 在 <style> 中定义
.text-black-50 {
  color: rgba(0, 0, 0, 0.5);
}
```

---

## 🔧 完整配置示例

### 1. 安装依赖

```bash
pnpm add -D unocss @uni-helper/unocss-preset-uni @unocss/transformer-applet
```

### 2. uno.config.ts

```typescript
import { presetUni } from '@uni-helper/unocss-preset-uni';
import transformerApplet from '@unocss/transformer-applet';
import { defineConfig, transformerDirectives, transformerVariantGroup } from 'unocss';

export default defineConfig({
  // ⭐ 预设配置
  presets: [
    presetUni(), // 已内置 presetUno + 小程序适配
  ],

  // ⭐ 转换器配置 (顺序很重要!)
  transformers: [
    transformerApplet(), // 1️⃣ 必须放最前：处理特殊字符
    transformerDirectives(), // 2️⃣ 处理 @apply 等指令
    transformerVariantGroup(), // 3️⃣ 处理变体组
  ],

  // ⭐ 主题配置
  theme: {
    colors: {
      primary: '#00aeef',
      secondary: '#00658d',
      // ... 其他颜色
    },
  },

  // ⭐ 快捷方式
  shortcuts: {
    btn: 'px-4 py-2 rounded bg-primary text-white',
    'no-scrollbar': 'overflow-x-auto overflow-y-hidden',
  },

  // ⭐ 自定义规则
  rules: [['shadow-card', { 'box-shadow': '0 2px 8px rgba(0,0,0,0.1)' }]],

  // ⭐ 安全列表 (动态类名需要)
  safelist: [
    'text-red',
    'text-blue',
    // ...
  ],
});
```

### 3. vite.config.ts

```typescript
import UnoCSS from 'unocss/vite';
import Uni from '@dcloudio/vite-plugin-uni';

export default defineConfig({
  plugins: [
    Uni(),
    UnoCSS(), // 添加 UnoCSS 插件
  ],
});
```

---

## 📋 转换检查清单

在每次转换时，使用此清单验证：

### 基础检查

- [ ] **标签转换**: `div` → `view`, `span` → `text`, `img` → `image`
- [ ] **特殊字符**: 是否使用了 `[`, `]`, `/` 等字符？
- [ ] **动态类名**: 是否使用了字符串拼接？
- [ ] **背景图片**: 是否使用了本地图片路径？

### 单位检查

- [ ] **px 转 rpx**: `width: 100px` → `w-100`
- [ ] **明确单位**: 需要强制 px 时使用 `w-[100px]px`

### 样式检查

- [ ] **透明度**: `/50` 写法是否有兼容问题？
- [ ] **选择器**: 是否使用了 `*`, `html`, `body`？
- [ ] **属性化**: 是否错误使用了属性化语法？

### 配置检查

- [ ] **transformer-applet**: 是否已安装并配置？
- [ ] **presetUni**: 是否仅使用 presetUni？
- [ ] **safelist**: 动态类名是否已加入 safelist？

---

## 🚀 Claude Code 转换指令模板

复制以下指令给 Claude Code，确保转换正确：

```
请将这段 HTML + Tailwind CSS 代码转换为 uni-app (微信小程序) + UnoCSS 代码。

必须遵循以下规则：

1. 【标签转换】
   - 将所有 div/section/article 替换为 view
   - 将所有 span/p 替换为 text
   - 将所有 img 替换为 image，并添加 mode 属性

2. 【类名处理】
   - 不要使用属性化 (Attributify) 语法，必须使用传统 class
   - 遇到 [、]、/ 等特殊字符时，确保 transformer-applet 能处理
   - 避免使用动态拼接类名 (如 'text-' + color)

3. 【单位转换】
   - 自动将 px 数值转换为 rpx (如 width: 100px → w-100)
   - 如需强制使用 px，使用 w-[100px]px 写法

4. 【小程序限制】
   - 移除 backdrop-filter 等不支持的 CSS 属性
   - 背景图片改用网络地址或 Base64
   - 图标使用 Emoji 或图片，不要用图标预设

5. 【动态类名】
   - 使用完整的三元表达式，或提取为方法
   - 避免字符串拼接

请输出完整的 .vue 文件代码。
```

---

## 📊 常见错误对照表

| 错误类型 | 错误示例                 | 正确方案                             | 优先级     |
| -------- | ------------------------ | ------------------------------------ | ---------- |
| 特殊字符 | `w-[100px]`              | 安装 transformer-applet              | ⭐⭐⭐⭐⭐ |
| 动态类名 | `:class="'text-'+color"` | 使用完整类名或 safelist              | ⭐⭐⭐⭐⭐ |
| 属性化   | `border="2 red"`         | `class="border-2 border-red"`        | ⭐⭐⭐⭐   |
| 标签错误 | `<div>`                  | `<view>`                             | ⭐⭐⭐⭐   |
| 单位错误 | `w-[100px]`              | `w-100` 或 `w-[100px]` + transformer | ⭐⭐⭐⭐   |
| 背景图   | `url(@/assets/bg.png)`   | 网络图片或 Base64                    | ⭐⭐⭐     |
| 透明度   | `text-black/50`          | `text-black text-opacity-50`         | ⭐⭐       |

---

## 🛠 故障排查

### 问题 1: 类名不生效

**症状**: 写了类名但没有样式

**排查步骤**:

1. 检查是否安装了 `@unocss/transformer-applet`
2. 检查类名是否包含特殊字符
3. 检查是否是动态类名（需要 safelist）

### 问题 2: 编译报错

**症状**: `Unexpected token` 或解析错误

**排查步骤**:

1. 检查 `:` 绑定的表达式是否过于复杂
2. 尝试简化三元表达式为方法
3. 检查是否使用了属性化语法

### 问题 3: 样式在真机不显示

**症状**: 开发工具正常，真机异常

**排查步骤**:

1. 检查是否使用了不支持的 CSS 属性
2. 检查 CSS 变量是否在目标基础库支持
3. 检查背景图片路径是否正确

---

## 📚 参考资料

- [UnoCSS 官方文档](https://unocss.dev/)
- [uni-helper/unocss-preset-uni](https://uni-helper.js.org/unocss-preset-uni)
- [微信小程序 CSS 支持](https://developers.weixin.qq.com/miniprogram/dev/framework/view/wxss.html)
- [UnoCSS transformer-applet](https://github.com/unocss-community/transformer-applet)

---

**维护者**: Claude Code
**项目**: coupon-miniapp
**版本**: 1.0.0
