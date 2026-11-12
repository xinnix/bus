---
description: 启动小程序开发服务（uni-app）
---

启动小程序开发服务器，使用 Monitor 工具实时监控日志。

微信小程序启动命令：

```typescript
Monitor({
  command: 'cd apps/miniapp && pnpm dev:mp-weixin',
  description: '小程序开发服务监控（微信小程序）',
  persistent: true,
  timeout_ms: 3600000,
});
```

服务说明：

- 微信小程序: 在微信开发者工具中打开 `dist/dev/mp-weixin` 目录
- 实时编译：文件修改后自动重新编译

停止服务：
使用 `/tasks` 命令查看运行中的任务 ID，然后使用 TaskStop 工具停止服务。
