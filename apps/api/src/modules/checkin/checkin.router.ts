import { Permission } from '@sanqin/shared';
import { createCrudRouter } from '../../trpc/trpc.helper';

/**
 * 管理端核销记录 Router
 * 资源名：checkin
 */
export const checkinRouter = createCrudRouter(
  'checkIn',
  {},
  {
    includeCreate: false,
    includeUpdate: false,
    includeDelete: false,
    includeDeleteMany: false,
    filterableFields: ['tripId', 'checkerId'],
    permissionRead: Permission.checkin.read,
  },
);
