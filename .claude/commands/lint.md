运行 ESLint 代码质量检查。

根据参数执行：

- 无参数：对整个 monorepo 运行 lint
- `--fix`：自动修复可修复的问题

```bash
# 检查所有
pnpm -r run lint

# 自动修复
pnpm -r run lint --fix
```

如果项目尚未配置 ESLint，提示用户需要先配置。
