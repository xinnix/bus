import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 班次查询（P0 小程序 REST）：GET /api/trips/:id
 */
@Controller('trips')
export class TripsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':id')
  async detail(@Param('id') id: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: { line: true },
    });
    if (!trip || trip.line.deletedAt) throw new NotFoundException('班次不存在');

    const lineStations = await this.prisma.lineStation.findMany({
      where: { lineId: trip.lineId, station: { status: 'ACTIVE', deletedAt: null } },
      include: { station: true },
      orderBy: { sort: 'asc' },
    });

    const boarding = lineStations.filter((ls) => ls.type === 'BOARD');
    const alighting = lineStations.filter((ls) => ls.type === 'ALIGHT');
    const remainingSeats = Math.max(trip.totalSeats - trip.soldSeats, 0);

    return {
      success: true,
      data: {
        ...trip,
        line: trip.line,
        remainingSeats,
        boardingStations: boarding.map((ls) => ({ ...ls.station, sort: ls.sort })),
        alightingStations: alighting.map((ls) => ({ ...ls.station, sort: ls.sort })),
      },
    };
  }
}
