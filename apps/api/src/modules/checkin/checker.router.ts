import { z } from 'zod';
import * as bcrypt from 'bcryptjs';
import { Permission } from '@sanqin/shared';
import { CreateCheckerSchema, UpdateCheckerSchema } from '@sanqin/shared';
import { permissionProcedure, router } from '../../trpc/trpc';

const getManySchema = z.object({
  page: z.number().optional().default(1),
  limit: z.number().optional().default(20),
  where: z.any().optional(),
  orderBy: z.any().optional(),
  include: z.any().optional(),
  select: z.any().optional(),
});

/**
 * 核销员管理 Router（P0）
 * 资源名：checker
 */
export const checkerRouter = router({
  getMany: permissionProcedure(Permission.checker.read)
    .input(getManySchema)
    .query(async ({ ctx, input }) => {
      const page = input.page || 1;
      const limit = input.limit || 20;
      const where: any = { ...(input.where || {}) };
      if (where.search) delete where.search;
      const [items, total] = await Promise.all([
        ctx.prisma.checker.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: input.orderBy || { createdAt: 'desc' },
        }),
        ctx.prisma.checker.count({ where }),
      ]);
      return { items, total, page, pageSize: limit, totalPages: Math.ceil(total / limit) };
    }),

  getOne: permissionProcedure(Permission.checker.read)
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.checker.findUnique({ where: { id: input.id } });
    }),

  create: permissionProcedure(Permission.checker.create)
    .input(z.object({ data: CreateCheckerSchema }))
    .mutation(async ({ ctx, input }) => {
      const passwordHash = await bcrypt.hash(input.data.password, 10);
      return ctx.prisma.checker.create({
        data: {
          phone: input.data.phone,
          name: input.data.name,
          passwordHash,
        },
      });
    }),

  update: permissionProcedure(Permission.checker.update)
    .input(z.object({ id: z.string(), data: UpdateCheckerSchema }))
    .mutation(async ({ ctx, input }) => {
      const data: any = { ...input.data };
      if (data.password) {
        data.passwordHash = await bcrypt.hash(data.password, 10);
      }
      delete data.password;
      return ctx.prisma.checker.update({ where: { id: input.id }, data });
    }),

  delete: permissionProcedure(Permission.checker.delete)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.checker.delete({ where: { id: input.id } });
    }),
});
