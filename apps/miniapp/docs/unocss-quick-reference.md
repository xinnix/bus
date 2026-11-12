# UnoCSS 小程序快速参考

## ⚡ 快速修复清单

### ❌ 不支持的语法

| 问题语法   | 错误示例                      | 正确方案     |
| ---------- | ----------------------------- | ------------ |
| 透明度     | `bg-color/50`                 | 自定义 SCSS  |
| 图标       | `i-icon-name`                 | Emoji / 图片 |
| 纵横比     | `aspect-16/9`                 | 自定义 SCSS  |
| 复杂动态类 | `:class="[cond ? 'a' : 'b']"` | 使用方法     |
| Ring       | `ring-1 ring-color/10`        | box-shadow   |

### ✅ 必要配置

```typescript
// uno.config.ts
import { presetUni } from '@uni-helper/unocss-preset-uni';
import { defineConfig, presetUno } from 'unocss';

export default defineConfig({
  presets: [
    presetUni(), // 必须
    presetUno(), // 必须
    // 不要用 presetIcons
  ],
});
```

### 🎯 转换模板

**透明度**:

```scss
// bg-surface/90 →
.custom-bg {
  background: rgba(245, 250, 255, 0.9);
}
```

**动态类名**:

```typescript
// ❌ :class="[isActive ? 'active' : 'inactive']"
// ✅
function getClass() {
  return isActive.value ? 'active' : 'inactive';
}
```

**图标**:

```html
<!-- ❌ <text class="i-icon-search"></text> -->
<!-- ✅ -->
<text>🔍</text>
```

## 📝 检查命令

```bash
# 查找所有问题类名
grep -n 'class="[^"]*/[0-9]' src/pages/*.vue

# 查找图标类名
grep -n 'i-[a-z-]*:' src/pages/*.vue

# 运行测试
pnpm dev:mp-weixin
```

## 🚨 常见错误

### 1. Unexpected token ","

**原因**: 动态类名使用了复杂的三元表达式
**修复**: 使用方法返回类名

### 2. Failed to load icon

**原因**: 使用了图标预设
**修复**: 移除图标类名，使用 Emoji

### 3. 样式不生效

**原因**: 使用了 `/` 透明度语法
**修复**: 创建自定义 SCSS 类

---

**完整文档**: `unocss-conversion.md`
