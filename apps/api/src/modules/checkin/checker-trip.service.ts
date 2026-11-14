import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  isTripPurchasable,
  TRIP_CHECKER_EDITABLE_STATUSES,
  type CheckerAdjustTripSeatsInput,
  type CheckerSetTripStatusInput,
} from '@sanqin/shared';
import { PrismaService } from '../../prisma/prisma.service';

const EDITABLE_STATUSES: string[] = [...TRIP_CHECKER_EDITABLE_STATUSES];

/**
 * 核销员端班次处置（P0.5 现场灵活处置）：
 * 查看班次余票看板、调整总票数（加车放量/换车缩容）、上下线班次。
 * 写操作一律条件原子更新防并发，并落 TripOperation 审计（重建方案 §9.4：停班类危险操作必留痕）。
 */
@Injectable()
export class CheckerTripService {
  constructor(private readonly prismaService: PrismaService) {}

  /** 按日期查班次运营看板：余票/已售/已核销 + 可购状态，按发车时间排序 */
  async listTrips(date?: string) {
    const serviceDate = date ?? this.today();
    const trips = await this.prismaService.trip.findMany({
      where: { serviceDate },
      include: { line: { select: { name: true } } },
      orderBy: { departureTime: 'asc' },
    });
    const checkedCounts = await this.prismaService.checkIn.groupBy({
      by: ['tripId'],
      where: { trip: { serviceDate } },
      _count: { tripId: true },
    });
    const checkedMap = new Map(checkedCounts.map((c) => [c.tripId, c._count.tripId]));

    return trips.map((trip) => ({
      id: trip.id,
      lineName: trip.line.name,
      serviceDate: trip.serviceDate,
      departureTime: trip.departureTime,
      priceCents: trip.priceCents,
      totalSeats: trip.totalSeats,
      soldSeats: trip.soldSeats,
      remainingSeats: Math.max(trip.totalSeats - trip.soldSeats, 0),
      status: trip.status,
      checkedInCount: checkedMap.get(trip.id) ?? 0,
      purchasable: isTripPurchasable(trip.serviceDate, trip.departureTime),
    }));
  }

  /** 调整班次总票数：soldSeats 条件下穿防护（不得低于已售，含待支付占座） */
  async adjustSeats(tripId: string, checkerId: string, input: CheckerAdjustTripSeatsInput) {
    const trip = await this.mustFindTrip(tripId);
    if (trip.totalSeats === input.totalSeats) return { changed: false };

    await this.prismaService.$transaction(async (tx) => {
      const result = await tx.trip.updateMany({
        where: {
          id: tripId,
          status: { in: EDITABLE_STATUSES },
          soldSeats: { lte: input.totalSeats },
        },
        data: { totalSeats: input.totalSeats },
      });
      if (result.count === 0) {
        throw new BadRequestException(
          this.explainBlocked(trip, `总票数不能低于已售座位数（${trip.soldSeats}）`),
        );
      }
      await tx.tripOperation.create({
        data: {
          tripId,
          checkerId,
          action: 'ADJUST_SEATS',
          before: { totalSeats: trip.totalSeats, soldSeats: trip.soldSeats, status: trip.status },
          after: { totalSeats: input.totalSeats, soldSeats: trip.soldSeats, status: trip.status },
        },
      });
    });

    return { changed: true };
  }

  /** 上下线班次：仅在售 ⇄ 停售，已发车/已完成/已取消不可操作 */
  async setTripStatus(tripId: string, checkerId: string, input: CheckerSetTripStatusInput) {
    const trip = await this.mustFindTrip(tripId);
    if (trip.status === input.status) return { changed: false };

    await this.prismaService.$transaction(async (tx) => {
      const result = await tx.trip.updateMany({
        where: { id: tripId, status: { in: EDITABLE_STATUSES } },
        data: { status: input.status },
      });
      if (result.count === 0) {
        throw new BadRequestException(this.explainBlocked(trip, '班次当前状态不可上下线'));
      }
      await tx.tripOperation.create({
        data: {
          tripId,
          checkerId,
          action: 'SET_STATUS',
          before: { totalSeats: trip.totalSeats, soldSeats: trip.soldSeats, status: trip.status },
          after: { totalSeats: trip.totalSeats, soldSeats: trip.soldSeats, status: input.status },
        },
      });
    });

    return { changed: true };
  }

  private async mustFindTrip(tripId: string) {
    const trip = await this.prismaService.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('班次不存在');
    return trip;
  }

  /** updateMany 命中 0 行时给出可读原因：优先解释状态不可操作，否则为座位数约束 */
  private explainBlocked(trip: { status: string }, fallback: string) {
    const labels: Record<string, string> = {
      DEPARTED: '班次已发车，不可操作',
      COMPLETED: '班次已完成，不可操作',
      CANCELLED: '班次已取消，不可操作',
    };
    return labels[trip.status] ?? fallback;
  }

  /** 服务端本地日期兜底（小程序端总是显式传 date） */
  private today(): string {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${mm}-${dd}`;
  }
}
