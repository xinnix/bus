/**
 * Permission Registry - 类型安全的权限定义单一真理源
 *
 * 所有权限集中定义在此。新增模块时在此添加一行，
 * 前端和后端自动获得类型安全和编译期校验。
 *
 * 格式: resource: { action: 'resource:action' }
 * 使用: permissionProcedure(Permission.role.read)
 */

export const Permission = {
  admin: {
    create: 'admin:create',
    read: 'admin:read',
    update: 'admin:update',
    delete: 'admin:delete',
    manage_roles: 'admin:manage_roles',
  },
  user: {
    create: 'user:create',
    read: 'user:read',
    update: 'user:update',
    delete: 'user:delete',
  },
  role: {
    create: 'role:create',
    read: 'role:read',
    update: 'role:update',
    delete: 'role:delete',
  },
  agent: {
    read: 'agent:read',
    run: 'agent:run',
    // 部署期绑定（llmConfigId 模型绑定），不涉及 YML 编排内容——编排真理源仍在 YML
    update: 'agent:update',
  },
  llmConfig: {
    create: 'llmConfig:create',
    read: 'llmConfig:read',
    update: 'llmConfig:update',
    delete: 'llmConfig:delete',
  },
  aiTool: {
    read: 'aiTool:read',
  },
  agentTrigger: {
    create: 'agentTrigger:create',
    read: 'agentTrigger:read',
    update: 'agentTrigger:update',
    delete: 'agentTrigger:delete',
    run: 'agentTrigger:run',
  },
  llmusage: {
    read: 'llmusage:read',
  },
  line: {
    create: 'line:create',
    read: 'line:read',
    update: 'line:update',
    delete: 'line:delete',
  },
  station: {
    create: 'station:create',
    read: 'station:read',
    update: 'station:update',
    delete: 'station:delete',
  },
  scheduleTemplate: {
    create: 'scheduleTemplate:create',
    read: 'scheduleTemplate:read',
    update: 'scheduleTemplate:update',
    delete: 'scheduleTemplate:delete',
  },
  trip: {
    create: 'trip:create',
    read: 'trip:read',
    update: 'trip:update',
    delete: 'trip:delete',
  },
  order: {
    read: 'order:read',
    update: 'order:update',
    refund: 'order:refund',
  },
  ticket: {
    read: 'ticket:read',
  },
  checkin: {
    read: 'checkin:read',
    create: 'checkin:create',
  },
  checker: {
    create: 'checker:create',
    read: 'checker:read',
    update: 'checker:update',
    delete: 'checker:delete',
  },
  settings: {
    read: 'settings:read',
    update: 'settings:update',
  },
  changelog: {
    read: 'changelog:read',
  },
  wecom: {
    create: 'wecom:create',
    read: 'wecom:read',
    update: 'wecom:update',
    delete: 'wecom:delete',
  },
  menu: {
    agents: 'menu:agents',
    llmConfigs: 'menu:llmConfigs',
    aiTools: 'menu:aiTools',
    agentTriggers: 'menu:agentTriggers',
    llmUsage: 'menu:llmUsage',
    settings: 'menu:settings',
    changelog: 'menu:changelog',
    admins: 'menu:admins',
    roles: 'menu:roles',
    wecom: 'menu:wecom',
    lines: 'menu:lines',
    stations: 'menu:stations',
    scheduleTemplates: 'menu:scheduleTemplates',
    trips: 'menu:trips',
    orders: 'menu:orders',
    checkins: 'menu:checkins',
    checkers: 'menu:checkers',
  },
} as const;

// ============================================
// 派生类型 —— 自动从 registry 推导
// ============================================

/**
 * 所有权限字符串的联合类型
 * 例如: "admin:create" | "role:read" | "menu:agents" | ...
 */
export type PermissionKey = {
  [R in keyof typeof Permission]: (typeof Permission)[R][keyof (typeof Permission)[R]];
}[keyof typeof Permission];

/**
 * 权限资源名称的联合类型
 * 例如: "admin" | "user" | "role" | ...
 */
export type PermissionResource = keyof typeof Permission;

/**
 * 给定资源的操作类型的联合
 */
export type PermissionAction<R extends PermissionResource> = keyof (typeof Permission)[R];

// ============================================
// 向后兼容别名（旧代码可逐步迁移）
// ============================================

/** @deprecated 请使用 Permission 常量 */
export const PERMISSIONS_BY_RESOURCE = Permission;
