import { z } from 'zod';
import { publicProcedure, router } from '../../../trpc/trpc';

export const permissionRouter = router({
  getMany: publicProcedure
    .input(
      z.object({
        page: z.number().optional().default(1),
        limit: z.number().optional().default(100),
        resource: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page = 1, limit = 100, resource } = input;
      const where: any = {};

      if (resource) {
        where.resource = resource;
      }

      const [items, total] = await Promise.all([
        ctx.prisma.permission.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: [{ resource: 'asc' }, { action: 'asc' }],
        }),
        ctx.prisma.permission.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
      };
    }),

  getOne: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.permission.findUnique({
        where: { id: input.id },
      });
    }),

  getByResource: publicProcedure.query(async ({ ctx }) => {
    const permissions = await ctx.prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });

    const grouped: Record<string, typeof permissions> = {};
    for (const permission of permissions) {
      if (!grouped[permission.resource]) {
        grouped[permission.resource] = [];
      }
      grouped[permission.resource].push(permission);
    }
    return grouped;
  }),
});
