import { Controller, Get, Param, Query } from '@nestjs/common';
import { isTripPurchasable } from '@sanqin/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('lines')
export class LineController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    const lines = await this.prisma.line.findMany({
      where: { publishStatus: 'PUBLISHED', deletedAt: null },
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
    });
    return { success: true, data: lines };
  }

  @Get(':id/stations')
  async stations(@Param('id') id: string) {
    const stations = await this.prisma.lineStation.findMany({
      where: { lineId: id, station: { status: 'ACTIVE', deletedAt: null } },
      include: { station: true },
      orderBy: { sort: 'asc' },
    });
    return { success: true, data: stations };
  }

  @Get(':id/trips')
  async trips(@Param('id') id: string, @Query('date') date?: string) {
    const serviceDate = date || new Date().toISOString().slice(0, 10);
    const trips = await this.prisma.trip.findMany({
      where: { lineId: id, serviceDate, status: 'ON_SALE' },
      include: { line: true },
      orderBy: { departureTime: 'asc' },
    });
    const stations = await this.prisma.lineStation.findMany({
      where: { lineId: id, station: { status: 'ACTIVE', deletedAt: null } },
      include: { station: true },
      orderBy: { sort: 'asc' },
    });
    // 停售标注：发车时间已过 30 分钟的班次前端展示「已停售」并禁止选择
    return {
      success: true,
      data: {
        trips: trips.map((trip) => ({
          ...trip,
          purchasable: isTripPurchasable(trip.serviceDate, trip.departureTime),
        })),
        stations,
      },
    };
  }
}
