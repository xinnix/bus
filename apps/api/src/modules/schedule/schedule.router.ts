import { z } from 'zod';
import { Permission } from '@sanqin/shared';
import {
  CreateScheduleTemplateSchema,
  UpdateScheduleTemplateSchema,
  UpdateTripSchema,
} from '@sanqin/shared';
import { protectedProcedure } from '../../trpc/trpc';
import { createCrudRouter, createCrudRouterWithCustom } from '../../trpc/trpc.helper';

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function weekdayNumber(date: Date): number {
  const day = date.getUTCDay(); // 0=Sunday
  return day === 0 ? 7 : day;
}

/**
 * 班次模板 Router
 * 资源名：scheduleTemplate
 */
export const scheduleTemplateRouter = createCrudRouter(
  'scheduleTemplate',
  {
    create: CreateScheduleTemplateSchema,
    update: UpdateScheduleTemplateSchema,
  },
  {
    searchFields: ['name'],
    filterableFields: ['lineId', 'status'],
    permissionRead: Permission.scheduleTemplate.read,
    permissionCreate: Permission.scheduleTemplate.create,
    permissionUpdate: Permission.scheduleTemplate.update,
    permissionDelete: Permission.scheduleTemplate.delete,
  },
);

/**
 * 班次 Router
 * 资源名：trip
 * 自定义 generate：按线路的班次模板批量生成未来 N 天班次。
 */
export const tripRouter = createCrudRouterWithCustom(
  'trip',
  {
    update: UpdateTripSchema,
  },
  () => ({
    generate: protectedProcedure
      .input(
        z.object({
          lineId: z.string().min(1),
          startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          days: z.number().int().min(1).max(31),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const templates = await ctx.prisma.scheduleTemplate.findMany({
          where: { lineId: input.lineId, status: 'ACTIVE', deletedAt: null },
        });

        if (templates.length === 0) {
          return { created: 0, skipped: 0, message: '该线路没有启用的班次模板' };
        }

        let created = 0;
        let skipped = 0;
        const start = new Date(`${input.startDate}T00:00:00.000Z`);

        for (let offset = 0; offset < input.days; offset++) {
          const date = new Date(start.getTime() + offset * 86400000);
          const dateStr = formatDate(date);
          const weekday = weekdayNumber(date);

          for (const template of templates) {
            const weekdays = (template.weekdays || '')
              .split(',')
              .map((v) => Number(v.trim()))
              .filter((v) => Number.isInteger(v));
            if (weekdays.length > 0 && !weekdays.includes(weekday)) continue;

            try {
              await ctx.prisma.trip.create({
                data: {
                  templateId: template.id,
                  lineId: input.lineId,
                  serviceDate: dateStr,
                  departureTime: template.departureTime,
                  priceCents: template.priceCents,
                  totalSeats: template.totalSeats,
                  status: 'ON_SALE',
                },
              });
              created += 1;
            } catch (error: any) {
              if (error?.code === 'P2002') {
                skipped += 1;
              } else {
                throw error;
              }
            }
          }
        }

        return {
          created,
          skipped,
          message: `已生成 ${created} 个班次，跳过 ${skipped} 个已存在班次`,
        };
      }),
  }),
  {
    includeCreate: false,
    includeDelete: false,
    includeDeleteMany: false,
    searchFields: ['departureTime'],
    filterableFields: ['lineId', 'serviceDate', 'status'],
    permissionRead: Permission.trip.read,
    permissionUpdate: Permission.trip.update,
  },
);
