import { describe, expect, it } from 'vitest';
import { createTicketToken, verifyTicketToken } from './ticket-token';

describe('ticket-token', () => {
  it('签名 token 可往返解析', () => {
    const token = createTicketToken('ticket-1', 'trip-1', Date.now() + 60_000);
    const payload = verifyTicketToken(token);
    expect(payload).toMatchObject({ ticketId: 'ticket-1', tripId: 'trip-1' });
  });

  it('默认过期时间为发车后 12 小时内可扫', () => {
    const token = createTicketToken('ticket-2', 'trip-2');
    const payload = verifyTicketToken(token);
    expect(payload?.expireAt).toBeGreaterThan(Date.now());
  });

  it('过期 token 被拒绝', () => {
    const token = createTicketToken('ticket-3', 'trip-3', Date.now() - 1_000);
    expect(verifyTicketToken(token)).toBeNull();
  });

  it('篡改签名被拒绝', () => {
    const token = createTicketToken('ticket-4', 'trip-4', Date.now() + 60_000);
    const raw = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
    const forged = Buffer.from(
      JSON.stringify({ ...raw, ticketId: 'ticket-hacked' }),
      'utf8',
    ).toString('base64url');
    expect(verifyTicketToken(forged)).toBeNull();
  });

  it('非法输入被拒绝', () => {
    expect(verifyTicketToken('not-a-token')).toBeNull();
    expect(verifyTicketToken('')).toBeNull();
  });
});
