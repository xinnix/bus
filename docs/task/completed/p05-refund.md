# 任务：P0.5 退票与运营安全阀（简化版）

## 元信息

- **状态**：`completed`（2026-11-14 开发完成、按用户反馈简化后通过全部检查）
- **分支**：`main`
- **创建**：2026-11-14
- **标签**：`feature`
- **关联**：`docs/P0-买票核销最小闭环方案.md` §8、`docs/product/prd.md` F7/F8（决策 D6–D8）

## 目标

公开推广前的运营安全阀（按用户拍板的简化范围）：乘客可自助退票（按票分别退/整单全退，全额退款），客服可在后台处理异常订单，日报表与支付流水一致；订单确认/发车提醒有订阅消息触达。**改签不做（后置 P1）。**

## 检查清单

- [x] 数据层：`Refund`（refundNo=out_refund_no 幂等键）+ `Ticket.departureNotifiedAt`（迁移 `p05_refund_change`）；曾实现改签（OrderChange/changedAt）后按用户拍板移除（迁移 `drop_order_change`）；状态机注释扩值（无 DDL）
- [x] 规则 SSOT：`@sanqin/shared` 仅保留发车前 2h 停退窗口（`REFUND_STOP_MINUTES` + `canRefundTrip`）；手续费阶梯随用户反馈移除（全额退）
- [x] 权限：`order:refund`（registry + seed-base.sql p82 幂等追加）；p83（order:change）随改签移除（含 dev/test 库孤儿行清理）
- [x] RefundService：request（票冻结 REFUNDING + 网关调用 + 失败回滚）/ handleRefundResult（幂等落地 + 库存释放 + 订单两口径聚合）/ adminRefundOrder / retry / reconcile / autoRefundClosedOrder / 每小时兜底对账 cron
- [x] 端点：REST 乘客侧 refunds/listRefunds（quote 预估接口随简化移除，金额前端本地计算）；tRPC 管理端 refund/retryRefund/reconcileRefund/refunds；退款回调空壳接业务；WechatPayService.queryRefund
- [x] 回调竞态自动退款：CLOSED+PAID → autoRefundClosedOrder（AUTO_REFUND_ENABLED，operatorType=SYSTEM）
- [x] 日报表：`dashboard.daily`（按支付完成日聚合 + 退款按完成日 + 净额/合计，≤92 天）+ Admin `/reports/daily` 页 + 菜单
- [x] 订阅消息：WechatService.sendSubscribeMessage + NotifyService（出票通知 + 发车提醒 cron）+ Settings subscribe 组 + `GET /api/subscribe/templates` + 小程序支付成功授权与车票页提醒入口
- [x] 三端界面：Admin 订单详情（整单退款、退款记录 Tab、重试/对账按钮、状态标签扩展）+ 日报表页；小程序订单详情退票弹层（到账金额本地计算明示）+ 退款态展示 + 状态标签扩展
- [x] 测试：shared 单测（窗口规则）、API 单测 175 绿、集成测试 17/17（退票全流程/部分退/停退窗口/回调幂等/网关失败回滚/竞态自动退款）、Admin E2E 4/4（含日报表可达）
- [x] 文档：PRD（F7/F8 + D6–D8）、P0 方案 §8 落点记录、ROADMAP（P0 ✅ + P0.5 节）、CHANGELOG 1.6.0

## 完成记录

- 2026-11-14：计划模式三路探索 → 按推荐默认实现完整版（含退票阶梯与改签）并交付（5cc3170）→ 用户反馈「退款不要做的这么复杂（按票分别退 + 整单全退即可）；改签暂不做」→ 当日简化：移除改签全家桶（迁移 drop_order_change + 权限 p83 清理）、移除手续费阶梯与 quote 接口（全额退、前端本地算金额），重新全绿。
- 测试期间发现并修复：E2E 连跑触发登录限流（ThrottlerGuard，窗口过后恢复，非缺陷）；admin 构建缺标签桶导出；CHANGELOG 1.5.0 标题行编辑事故（当场修复）；清理测试库 `_prisma_migrations` 残留失败行；`apps/api/.env` 补 `AI_ENCRYPTION_KEY`。
- ⚠️ 过程事故：清理进程时 `pkill -f "apps/admin"` 误杀 weSale admin（5173）与 miniapp H5（5174，命令行参数含 5175 实际绑定 5174）——已按原命令形态恢复两进程（教训：勿用宽泛 pkill 模式，改用精确 PID）。

## 遗留与上线前清单（部署时执行）

1. 生产 `.env.prod` 确认 `WX_PAY_REFUND_NOTIFY_URL=https://chuxing-api.classmaster.cn/api/payments/wechat/refund-callback`（缺失则退款回调会打到支付回调端点验签失败）
2. 镜像发布后 entrypoint 自动 `migrate deploy`（p05_refund_change + drop_order_change）
3. seed-base.sql 重跑一次（p82 幂等执行）
4. 微信公众平台申请两类订阅消息模板（关键词顺序：出票通知=线路/发车时间/订单号，发车提醒=线路/发车时间/上车点）→ Admin `/settings` subscribe 组填模板 ID 并启用
5. 真实小额退款一笔验证微信退款回调链路
6. 试点 50 笔真实订单验收（P0 §7 末条，随试点运营累计）

## 备注

- 明确不做（留 P1）：**改签**（用户拍板）、退票手续费阶梯、短信通道、按线路差异化退改规则、OperationLog 全局审计表（Refund 自带 operator 字段承载）、结算单/微信账单对账、报表 Excel 导出。
- RefundService 经 bridge（refund.bridge.ts，同 settings 模式）供 PaymentModule 回调与 tRPC 过程使用，避免 PaymentModule ↔ RefundModule 循环依赖；tRPC 侧亦可经 ctx.app.get() 取 Nest 服务。
