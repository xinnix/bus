import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { BaseService } from '../../common/base.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { VerifyTicketInput } from '@sanqin/shared';
import { verifyTicketToken } from '../order/ticket-token';

@Injectable()
export class CheckinService extends BaseService<'checkIn'> {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {
    super(prismaService, 'checkIn');
  }

  async login(phone: string, password: string) {
    const checker = await this.prismaService.checker.findUnique({ where: { phone } });
    if (!checker || checker.status !== 'ACTIVE') {
      throw new UnauthorizedException('核销员账号不存在或已停用');
    }
    const ok = await bcrypt.compare(password, checker.passwordHash);
    if (!ok) throw new UnauthorizedException('密码错误');
    const accessToken = await this.issueCheckerToken(checker);
    return { accessToken, checker: { id: checker.id, name: checker.name, phone: checker.phone } };
  }

  /**
   * 检查当前用户是否具有核销员身份（手机号一致性绑定）：
   * 1. openid 已绑定的既往识别成果直接生效；
   * 2. 用户手机号与管理端录入的核销员手机号一致时，回填 openid 完成绑定。
   */
  async identity(userId: string) {
    const user = await this.prismaService.user.findUnique({ where: { id: userId } });
    if (!user) return { isChecker: false };

    if (user.openid) {
      const bound = await this.prismaService.checker.findFirst({
        where: { openid: user.openid, status: 'ACTIVE' },
      });
      if (bound) return { isChecker: true, checker: this.sanitizeChecker(bound) };
    }

    if (user.phone) {
      const byPhone = await this.prismaService.checker.findFirst({
        where: { phone: user.phone, status: 'ACTIVE' },
      });
      if (byPhone) {
        if (user.openid && !byPhone.openid) {
          try {
            await this.prismaService.checker.update({
              where: { id: byPhone.id },
              data: { openid: user.openid },
            });
          } catch {
            // openid 唯一冲突（已绑定到其他核销员）：放弃回填，识别结果仍按手机号生效
          }
        }
        return { isChecker: true, checker: this.sanitizeChecker(byPhone) };
      }
    }

    return { isChecker: false };
  }

  /**
   * 已绑定 openid 的核销员免密登录：按当前用户 openid 查核销员并签发 checker JWT。
   */
  async openidLogin(userId: string) {
    const user = await this.prismaService.user.findUnique({ where: { id: userId } });
    const checker = user?.openid
      ? await this.prismaService.checker.findFirst({
          where: { openid: user.openid, status: 'ACTIVE' },
        })
      : null;
    if (!checker) throw new ForbiddenException('未绑定核销员身份');
    const accessToken = await this.issueCheckerToken(checker);
    return { accessToken, checker: this.sanitizeChecker(checker) };
  }

  private async issueCheckerToken(checker: { id: string; name: string }) {
    return this.jwtService.signAsync({
      sub: checker.id,
      type: 'checker',
      name: checker.name,
    });
  }

  private sanitizeChecker(checker: { id: string; name: string; phone: string }) {
    return { id: checker.id, name: checker.name, phone: checker.phone };
  }

  async verify(checkerId: string, input: VerifyTicketInput) {
    let ticketId: string | undefined;
    let tripId: string | undefined;

    if (input.qrToken) {
      const payload = verifyTicketToken(input.qrToken);
      if (!payload) throw new BadRequestException('二维码无效或已损坏');
      ticketId = payload.ticketId;
      tripId = payload.tripId;
    } else if (input.code) {
      const ticket = await this.prismaService.ticket.findUnique({
        where: { checkCode: input.code },
        include: { order: true },
      });
      if (!ticket) throw new BadRequestException('核销码不存在');
      ticketId = ticket.id;
      tripId = ticket.order.tripId;
    } else {
      throw new BadRequestException('请提供核销码或二维码');
    }

    const ticket = await this.prismaService.ticket.findUnique({
      where: { id: ticketId },
      include: { order: { include: { trip: true, line: true } } },
    });
    if (!ticket) throw new BadRequestException('车票不存在');
    if (tripId && ticket.order.tripId !== tripId) {
      throw new BadRequestException('车票不属于当前班次');
    }
    if (ticket.status === 'CHECKED_IN') {
      const existing = await this.prismaService.checkIn.findUnique({
        where: { ticketId: ticket.id },
        include: { checker: true },
      });
      return {
        success: false,
        reason: 'ALREADY_CHECKED_IN',
        message: `该票已于 ${existing?.checkedAt.toLocaleString('zh-CN')} 由 ${existing?.checker.name || '其他核销员'} 核销`,
        ticket: { ticketNo: ticket.ticketNo, passengerName: ticket.passengerName },
      };
    }
    if (ticket.status !== 'UNUSED') {
      throw new BadRequestException('车票当前不可核销');
    }

    const checkedAt = new Date();
    await this.prismaService.$transaction(async (tx) => {
      const updated = await tx.ticket.updateMany({
        where: { id: ticket.id, status: 'UNUSED' },
        data: { status: 'CHECKED_IN', checkedAt, checkedBy: checkerId },
      });
      if (updated.count === 0) {
        throw new BadRequestException('车票已被其他核销员核销');
      }
      await tx.checkIn.create({
        data: {
          ticketId: ticket.id,
          tripId: ticket.order.tripId,
          checkerId,
          method: input.qrToken ? 'QR' : 'MANUAL',
          checkedAt,
        },
      });
      // 全部票核销（或已取消）后订单进入「已完成」：仅从 PAID 流转，不覆盖关闭/退款等中间态
      const remaining = await tx.ticket.count({
        where: { orderId: ticket.order.id, status: 'UNUSED' },
      });
      if (remaining === 0) {
        await tx.order.updateMany({
          where: { id: ticket.order.id, orderStatus: 'PAID' },
          data: { orderStatus: 'COMPLETED' },
        });
      }
    });

    return {
      success: true,
      message: '核销成功',
      ticket: {
        ticketNo: ticket.ticketNo,
        passengerName: ticket.passengerName,
        priceCents: ticket.priceCents,
        lineName: ticket.order.line?.name,
        serviceDate: ticket.order.trip?.serviceDate,
        departureTime: ticket.order.trip?.departureTime,
      },
      checkedAt,
    };
  }

  async records(checkerId?: string, filters?: { tripId?: string; date?: string }) {
    const where: any = {};
    if (checkerId) where.checkerId = checkerId;
    if (filters?.tripId) where.tripId = filters.tripId;
    if (filters?.date) where.trip = { serviceDate: filters.date };
    return this.prismaService.checkIn.findMany({
      where,
      include: {
        ticket: { include: { order: { include: { line: true, trip: true } } } },
        checker: true,
      },
      orderBy: { checkedAt: 'desc' },
      take: 200,
    });
  }
}
