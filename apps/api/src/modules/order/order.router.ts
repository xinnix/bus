import { Permission } from '@sanqin/shared';
import { createCrudRouter } from '../../trpc/trpc.helper';

/**
 * 管理端订单查询 Router
 * 资源名：order
 * P0 仅提供查询/详情；退票/改签在 P0.5 增加。
 */
export const orderRouter = createCrudRouter(
  'order',
  {},
  {
    includeCreate: false,
    includeUpdate: false,
    includeDelete: false,
    includeDeleteMany: false,
    searchFields: ['orderNo', 'contactPhone', 'contactName'],
    filterableFields: ['orderStatus', 'payStatus', 'tripId', 'lineId'],
    permissionRead: Permission.order.read,
  },
);
