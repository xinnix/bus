import { Permission } from '@sanqin/shared';
import { CreateLineSchema, UpdateLineSchema } from '@sanqin/shared';
import { createCrudRouter } from '../../trpc/trpc.helper';

/**
 * 线路管理 tRPC Router
 * 资源名：line（Admin 端 StandardListPage resource="line"）
 */
export const lineRouter = createCrudRouter(
  'line',
  {
    create: CreateLineSchema,
    update: UpdateLineSchema,
  },
  {
    searchFields: ['name', 'startCity', 'endCity'],
    filterableFields: ['publishStatus'],
    permissionRead: Permission.line.read,
    permissionCreate: Permission.line.create,
    permissionUpdate: Permission.line.update,
    permissionDelete: Permission.line.delete,
  },
);
