import { describe, it, expect } from 'vitest';
import {
  LoginSchema,
  RegisterSchema,
  RefreshTokenSchema,
  CreateUserSchema,
  UpdateUserSchema,
  CreateRoleSchema,
  UpdateRoleSchema,
  CreateAgentSchema,
  UpdateAgentSchema,
  AssignRoleSchema,
  BatchAssignRolesSchema,
  ResetPasswordSchema,
  getDepartureAt,
  getRefundTier,
  computeRefundFee,
  canChangeTrip,
  RequestRefundSchema,
} from './index';

describe('Auth Schemas', () => {
  describe('LoginSchema', () => {
    it('accepts valid login', () => {
      expect(LoginSchema.parse({ username: 'admin', password: 'pass123' })).toEqual({
        username: 'admin',
        password: 'pass123',
      });
    });

    it('rejects empty username', () => {
      expect(() => LoginSchema.parse({ username: '', password: 'pass' })).toThrow();
    });

    it('rejects empty password', () => {
      expect(() => LoginSchema.parse({ username: 'admin', password: '' })).toThrow();
    });
  });

  describe('RegisterSchema', () => {
    it('accepts valid registration', () => {
      const result = RegisterSchema.parse({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.username).toBe('testuser');
      expect(result.email).toBe('test@example.com');
    });

    it('rejects short username', () => {
      expect(() =>
        RegisterSchema.parse({ username: 'ab', email: 'a@b.com', password: 'password123' }),
      ).toThrow();
    });

    it('rejects invalid email', () => {
      expect(() =>
        RegisterSchema.parse({ username: 'test', email: 'invalid', password: 'password123' }),
      ).toThrow();
    });

    it('rejects short password', () => {
      expect(() =>
        RegisterSchema.parse({ username: 'test', email: 'a@b.com', password: 'short' }),
      ).toThrow();
    });
  });

  describe('RefreshTokenSchema', () => {
    it('accepts valid token', () => {
      expect(RefreshTokenSchema.parse({ refreshToken: 'abc123' })).toEqual({
        refreshToken: 'abc123',
      });
    });
  });
});

describe('User Management Schemas', () => {
  describe('CreateUserSchema', () => {
    it('accepts valid input', () => {
      const result = CreateUserSchema.parse({
        username: 'newuser',
        email: 'new@example.com',
        password: 'securepass123',
      });
      expect(result.username).toBe('newuser');
    });

    it('rejects short username', () => {
      expect(() =>
        CreateUserSchema.parse({ username: 'ab', email: 'a@b.com', password: 'password123' }),
      ).toThrow();
    });
  });

  describe('UpdateUserSchema', () => {
    it('accepts partial update', () => {
      expect(UpdateUserSchema.parse({ isActive: false })).toEqual({ isActive: false });
    });

    it('accepts empty object', () => {
      expect(UpdateUserSchema.parse({})).toEqual({});
    });
  });

  describe('AssignRoleSchema', () => {
    it('accepts valid input', () => {
      expect(AssignRoleSchema.parse({ userId: '1', roleId: '2' })).toEqual({
        userId: '1',
        roleId: '2',
      });
    });
  });

  describe('BatchAssignRolesSchema', () => {
    it('accepts arrays', () => {
      expect(BatchAssignRolesSchema.parse({ userIds: ['1', '2'], roleIds: ['3', '4'] })).toEqual({
        userIds: ['1', '2'],
        roleIds: ['3', '4'],
      });
    });
  });

  describe('ResetPasswordSchema', () => {
    it('accepts valid input', () => {
      expect(ResetPasswordSchema.parse({ userId: '1', newPassword: 'newpass123' })).toEqual({
        userId: '1',
        newPassword: 'newpass123',
      });
    });

    it('rejects short password', () => {
      expect(() => ResetPasswordSchema.parse({ userId: '1', newPassword: 'short' })).toThrow();
    });
  });
});

describe('Role Management Schemas', () => {
  describe('CreateRoleSchema', () => {
    it('accepts valid input with defaults', () => {
      const result = CreateRoleSchema.parse({ name: 'Editor', slug: 'editor' });
      expect(result.level).toBe(100);
    });

    it('rejects empty name', () => {
      expect(() => CreateRoleSchema.parse({ name: '', slug: 'editor' })).toThrow();
    });
  });

  describe('UpdateRoleSchema', () => {
    it('accepts partial update', () => {
      expect(UpdateRoleSchema.parse({ name: 'New Name' })).toEqual({ name: 'New Name' });
    });
  });
});

describe('Agent Schemas', () => {
  describe('CreateAgentSchema', () => {
    it('accepts valid input with defaults', () => {
      const result = CreateAgentSchema.parse({
        name: 'My Agent',
        slug: 'my-agent',
      });
      expect(result.isActive).toBe(true);
      expect(result.sort).toBe(0);
    });

    it('rejects empty name', () => {
      expect(() => CreateAgentSchema.parse({ name: '', slug: 'test' })).toThrow();
    });
  });

  describe('UpdateAgentSchema', () => {
    it('accepts partial update', () => {
      expect(UpdateAgentSchema.parse({ name: 'Updated' })).toEqual({ name: 'Updated' });
    });

    it('accepts nullable fields', () => {
      expect(UpdateAgentSchema.parse({ description: null })).toEqual({ description: null });
    });
  });
});

describe('退票/改签规则（P0.5）', () => {
  // 发车时刻固定为本地 2026-11-15 10:00，now 相对发车时刻偏移
  const departureBase = new Date(2026, 10, 15, 10, 0, 0);
  const spec = { serviceDate: '2026-11-15', departureTime: '10:00' };
  const nowAt = (offsetHours: number) => departureBase.getTime() + offsetHours * 3600_000;

  it('getDepartureAt 合成本地发车时刻，非法输入返回 null', () => {
    expect(getDepartureAt('2026-11-15', '10:00')).toBe(departureBase.getTime());
    expect(getDepartureAt('bad-date', '10:00')).toBeNull();
    expect(getDepartureAt('2026-11-15', '25:00')).toBeNull();
  });

  it('发车前 ≥24h 全额退（FREE 档）', () => {
    expect(getRefundTier(spec.serviceDate, spec.departureTime, nowAt(-25))).toBe('FREE');
    expect(getRefundTier(spec.serviceDate, spec.departureTime, nowAt(-24))).toBe('FREE');
  });

  it('发车前 2h–24h 收 5% 手续费（FEE 档）', () => {
    expect(getRefundTier(spec.serviceDate, spec.departureTime, nowAt(-5))).toBe('FEE');
    // 恰好 2h（120 分钟）仍属 FEE（< 120 分钟才 BLOCKED）
    expect(getRefundTier(spec.serviceDate, spec.departureTime, nowAt(-2))).toBe('FEE');
  });

  it('发车前 <2h 不可退（BLOCKED 档）', () => {
    expect(getRefundTier(spec.serviceDate, spec.departureTime, nowAt(-1.9))).toBe('BLOCKED');
    // 发车后同样不可退
    expect(getRefundTier(spec.serviceDate, spec.departureTime, nowAt(1))).toBe('BLOCKED');
    // 班次时间解析失败视为不可退
    expect(getRefundTier('bad', 'bad')).toBe('BLOCKED');
  });

  it('computeRefundFee 各档位计算，手续费四舍五入到分', () => {
    expect(computeRefundFee(1000, 'FREE')).toEqual({ feeCents: 0, refundCents: 1000 });
    // 999 × 5% = 49.95 → 50
    expect(computeRefundFee(999, 'FEE')).toEqual({ feeCents: 50, refundCents: 949 });
    expect(computeRefundFee(1000, 'FEE')).toEqual({ feeCents: 50, refundCents: 950 });
    // BLOCKED 输出零可退（前置校验兜底）
    expect(computeRefundFee(1000, 'BLOCKED')).toEqual({ feeCents: 1000, refundCents: 0 });
  });

  it('canChangeTrip 与退票共用窗口：≥2h 可改，<2h 不可改', () => {
    expect(canChangeTrip(spec.serviceDate, spec.departureTime, nowAt(-25))).toBe(true);
    expect(canChangeTrip(spec.serviceDate, spec.departureTime, nowAt(-2))).toBe(true);
    expect(canChangeTrip(spec.serviceDate, spec.departureTime, nowAt(-1.9))).toBe(false);
    expect(canChangeTrip(spec.serviceDate, spec.departureTime, nowAt(0.5))).toBe(false);
    expect(canChangeTrip('bad', 'bad')).toBe(false);
  });

  it('RequestRefundSchema 校验：至少一张票、orderId 必填', () => {
    expect(() => RequestRefundSchema.parse({ orderId: 'o1', ticketIds: [] })).toThrow();
    expect(() => RequestRefundSchema.parse({ ticketIds: ['t1'] })).toThrow();
    expect(RequestRefundSchema.parse({ orderId: 'o1', ticketIds: ['t1'] })).toBeTruthy();
  });
});
