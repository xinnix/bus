# 任务：P0.5 退改签与运营安全阀

## 元信息

- **状态**：`completed`（2026-11-14 开发完成并通过全部检查）
- **分支**：`main`
- **创建**：2026-11-14
- **标签**：`feature`
- **关联**：`docs/P0-买票核销最小闭环方案.md` §8、`docs/product/prd.md` F7/F8（决策 D6–D8）

## 目标

公开推广前的运营安全阀：乘客可自助退票/改签，客服可在后台处理异常订单，日报表与支付流水一致；订单确认/发车提醒有订阅消息触达。

## 检查清单

- [x] 数据层：`Refund`（refundNo=out_refund_no 幂等键）+ `OrderChange` 模型 + `Ticket.changedAt`/`departureNotifiedAt`（迁移 `p05_refund_change`）；状态机注释扩值（无 DDL）
- [x] 规则 SSOT：`@sanqin/shared` 退票阶梯（≥24h 全额 / 2–24h 5% / <2h 停退）+ 改签窗口 + `computeRefundFee`/`getRefundTier`/`canChangeTrip` + RequestRefund/ChangeTrip Schema
- [x] 权限：`order:refund` / `order:change`（registry + seed-base.sql p82/p83 幂等追加，r1/r2 SELECT 式自动授予）
- [x] RefundService：quote / request（票冻结 REFUNDING + 网关调用）/ handleRefundResult（幂等落地 + 库存释放 + 订单两口径聚合）/ adminRefundOrder / retry / reconcile / autoRefundClosedOrder / 每小时兜底对账 cron
- [x] 改签：OrderService.changeTrip（每单一次 + 窗口 + 低价方向 + 原子库存转移 + 新票 changedAt + OrderChange 落库 + 差价 refundDiff）
- [x] 端点：REST 乘客侧 quote/refunds/change/listRefunds；tRPC 管理端 refund/change/retryRefund/reconcileRefund/refunds/changes；退款回调空壳接业务；WechatPayService.queryRefund
- [x] 回调竞态自动退款：CLOSED+PAID → autoRefundClosedOrder（AUTO_REFUND_ENABLED，operatorType=SYSTEM）
- [x] 日报表：`dashboard.daily`（按支付完成日聚合 + 退款按完成日 + 净额/合计，≤92 天）+ Admin `/reports/daily` 页 + 菜单
- [x] 订阅消息：WechatService.sendSubscribeMessage + NotifyService（出票通知 + 发车提醒 cron）+ Settings subscribe 组 + `GET /api/subscribe/templates` + 小程序支付成功授权与车票页提醒入口
- [x] 三端界面：Admin 订单详情（整单退款/改签操作、退款/改签记录 Tab、重试/对账按钮、状态标签扩展）+ 日报表页；小程序订单详情退票弹层（手续费明示）+ 改签页 + 退款态/改签角标 + 状态标签扩展
- [x] 测试：shared 单测 7 例、API 单测 175 绿、集成测试 19/19（新增 9 例）、Admin E2E 4/4（新增日报表可达）
- [x] 文档：PRD（F7/F8 + D6–D8）、P0 方案 §8 落点记录、ROADMAP（P0 ✅ + P0.5 节）、CHANGELOG 1.6.0

## 完成记录

- 2026-11-14：计划模式探索三路（后端基建/前端模式/业务规则文档）→ 用户未答复手续费/改签差价两项拍板 → 按推荐默认实施（PRD D6/D7 记录，SSOT 一处可调）→ 五阶段顺序交付，全部检查绿。
- 测试期间发现并修复：E2E 连跑触发登录限流（ThrottlerGuard，窗口过后恢复，非缺陷）；admin 构建缺 TICKET_STATUS_LABELS/REFUND_STATUS_LABELS 桶导出；CHANGELOG 1.5.0 标题行编辑事故（当场修复）。
- 本地环境顺手修复：测试库 `_prisma_migrations` 残留失败行致 migrate 误判 reset；`apps/api/.env` 补 `AI_ENCRYPTION_KEY`（llm_configs 空表，新密钥无兼容风险）。

## 遗留与上线前清单（部署时执行）

1. 生产 `.env.prod` 确认 `WX_PAY_REFUND_NOTIFY_URL=https://chuxing-api.classmaster.cn/api/payments/wechat/refund-callback`（缺失则退款回调会打到支付回调端点验签失败）
2. 镜像发布后 entrypoint 自动 `migrate deploy`（p05_refund_change）
3. seed p82/p83 幂等执行一次（`seed-base.sql` 重跑即可）
4. 微信公众平台申请两类订阅消息模板（关键词顺序：出票通知=线路/发车时间/订单号，发车提醒=线路/发车时间/上车点）→ Admin `/settings` subscribe 组填模板 ID 并启用
5. 真实小额退款一笔验证微信退款回调链路（与 P0 支付回调验证同法）
6. 试点 50 笔真实订单验收（P0 §7 末条，随试点运营累计）

## 备注

- 明确不做（留 P1）：短信通道、改签补差价支付流、按线路差异化退改规则、OperationLog 全局审计表（Refund/OrderChange 自带 operator 字段承载）、结算单/微信账单对账、报表 Excel 导出。
- RefundService 经 bridge（refund.bridge.ts，同 settings 模式）供 PaymentModule 回调与 tRPC 过程使用，避免 PaymentModule ↔ RefundModule 循环依赖；tRPC 侧亦可经 ctx.app.get() 取 Nest 服务。
