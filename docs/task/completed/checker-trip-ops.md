# 任务：核销端班次处置（E18）

## 元信息

- **状态**：`completed`
- **分支**：`main`
- **创建**：2026-11-14
- **标签**：`feature`
- **关联**：[p0-ticketing-core.md](../active/p0-ticketing-core.md)（核销端基础）、PRD F5 增补 / D9、backlog E18

## 目标

验票员小程序端从「仅核销」升级为现场处置工作台：按日期查看班次运营看板（已售/余票/已核销）、调整班次总票数（余票自动变化）、上下线班次（在售 ⇄ 停售），写操作原子条件更新防并发并落 `TripOperation` 审计。

## 决策上下文（PRD D9）

- 「调整余票」= 修改 `totalSeats`（加车放量/换车缩容），不做占座锁票、不做取消班次（涉退款归管理端）
- 所有 ACTIVE 核销员可用（P0 单管理员信任模型，账号即边界；不做按人分权）
- 能力边界收敛：仅在售 ⇄ 停售流转、总票数 ≥ 已售；停班/调余票属危险操作必留痕（重建方案 §9.4）

## 检查清单

- [x] `infra/shared`：`CheckerAdjustTripSeatsSchema` / `CheckerSetTripStatusSchema` / `CheckerTripListQuerySchema` / `TRIP_CHECKER_EDITABLE_STATUSES`（验证 SSOT）
- [x] `schema.prisma`：`TripOperation` 审计模型（迁移 `20261114145906_checker_trip_operations`）
- [x] `apps/api`：`checker-trip.service.ts`（listTrips/adjustSeats/setTripStatus，事务 + 条件 updateMany + 审计）；`checkin.controller.ts` 追加 `GET /checker/trips`、`PUT /checker/trips/:id/seats|status`（assertChecker + zod parse）；CheckinModule 注册
- [x] `apps/miniapp`：`checkerApi` 扩展 trips/adjustSeats/setTripStatus（checkerAuthHeader）；`pages/checker/trips.vue` 班次管理页（日期 chips + picker、看板卡片、停售/恢复确认、调余票弹层）；`pages.config.ts` 登记；核销页工作台入口
- [x] 文档：backlog E18、PRD F5/D9、ROADMAP P0.5、CHANGELOG 1.7.0
- [x] 验证：type-check（api tsc + miniapp vue-tsc 全绿）；mp-weixin 生产构建通过（pages.json 含新页）；API 冒烟 10 例——看板查询、调余票 50→60、非法值拦截（0/1000，zod 500 与既有 REST 端点行为一致）、低于已售 400「总票数不能低于已售座位数（10）」、停售→乘客端立即不可见→恢复复见、同值短路 changed:false、COMPLETED 状态调余票/上下线均被拦「班次已完成，不可操作」、乘客 token 403、无 token 401、`trip_operations` 审计落库（操作人/前后快照）；集成测试 17/17 无回归

## 当前状态

> **做到哪了：** 开发、文档、验证全部完成，2026-11-14 收尾
> **卡在哪：** 无。已知既有行为（非本次引入）：REST 控制器内 zod parse 失败落 500（与 checker login/verify 一致，全局 ZodError 过滤器待后续统一）
> **下一步：** 无；小程序端真机走查（微信开发者工具导入 dist/build/mp-weixin）由试点运营中完成
> **决策上下文：** 见上方「决策上下文」；http 客户端无 patch 方法故用 PUT；showModal editable 类型不支持故调余票用手写弹层；验证期间注意到工作区有并发会话在推进 p05 第二批（order/refund 文件有非本任务改动，本任务未触碰）

## 变更文件清单

| 文件                                                   | 变更                               | 原因             |
| ------------------------------------------------------ | ---------------------------------- | ---------------- |
| `infra/shared/src/index.ts`                            | +3 Schema + 状态常量               | 验证 SSOT        |
| `infra/database/prisma/schema.prisma`                  | +TripOperation 模型与关系          | 停班/调余票审计  |
| `apps/api/src/modules/checkin/checker-trip.service.ts` | 新增                               | 班次处置业务逻辑 |
| `apps/api/src/modules/checkin/checkin.controller.ts`   | +3 路由                            | 核销员端 REST    |
| `apps/api/src/modules/checkin/module.ts`               | 注册 provider                      | DI               |
| `apps/miniapp/src/api/ticketing.ts`                    | checkerApi 扩展 + CheckerTrip 类型 | 前端 API         |
| `apps/miniapp/src/pages/checker/trips.vue`             | 新增页面                           | 班次管理 UI      |
| `apps/miniapp/src/pages/checker/index.vue`             | +工作台入口                        | 导航             |
| `apps/miniapp/pages.config.ts`                         | +页面登记                          | 路由 SSOT        |
| `docs/*`、`CHANGELOG.md`                               | 回写                               | 开发后必做       |
