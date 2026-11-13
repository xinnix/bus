import { createHmac } from 'crypto';

// 优先使用独立密钥，未配置时退回 JWT_SECRET（与 jwt.strategy 一致的兜底约定）
const SECRET =
  process.env.TICKET_TOKEN_SECRET || process.env.JWT_SECRET || 'sanqin-ticket-secret-change-me';

/** 电子票二维码默认有效期：发车后 12 小时内可扫 */
export const TICKET_TOKEN_DEFAULT_TTL_MS = 12 * 60 * 60 * 1000;

export interface TicketTokenPayload {
  ticketId: string;
  tripId: string;
  expireAt: number;
}

/**
 * 生成电子票二维码 token：HMAC-SHA256 签名，包含过期时间，不暴露签名前的原文结构。
 */
export function createTicketToken(
  ticketId: string,
  tripId: string,
  expireAt: number = Date.now() + TICKET_TOKEN_DEFAULT_TTL_MS,
): string {
  const payload = `${ticketId}.${tripId}.${expireAt}`;
  const sig = createHmac('sha256', SECRET).update(payload).digest('base64url');
  const body = Buffer.from(JSON.stringify({ ticketId, tripId, expireAt, sig }), 'utf8').toString(
    'base64url',
  );
  return body;
}

export function verifyTicketToken(token: string): TicketTokenPayload | null {
  try {
    const raw = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
    if (!raw?.ticketId || !raw?.tripId || !raw?.expireAt || !raw?.sig) return null;
    if (typeof raw.expireAt !== 'number' || raw.expireAt < Date.now()) return null;
    const payload = `${raw.ticketId}.${raw.tripId}.${raw.expireAt}`;
    const expected = createHmac('sha256', SECRET).update(payload).digest('base64url');
    if (expected !== raw.sig) return null;
    return { ticketId: raw.ticketId, tripId: raw.tripId, expireAt: raw.expireAt };
  } catch {
    return null;
  }
}
