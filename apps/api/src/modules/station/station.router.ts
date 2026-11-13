import { Permission } from '@sanqin/shared';
import { CreateStationSchema, UpdateStationSchema } from '@sanqin/shared';
import { createCrudRouter } from '../../trpc/trpc.helper';

/**
 * 站点管理 tRPC Router
 * 资源名：station
 */
export const stationRouter = createCrudRouter(
  'station',
  {
    create: CreateStationSchema,
    update: UpdateStationSchema,
  },
  {
    searchFields: ['name', 'address'],
    filterableFields: ['status'],
    permissionRead: Permission.station.read,
    permissionCreate: Permission.station.create,
    permissionUpdate: Permission.station.update,
    permissionDelete: Permission.station.delete,
  },
);
