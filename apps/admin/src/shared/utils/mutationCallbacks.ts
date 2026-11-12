/**
 * Standard mutation callbacks for Refine mutations (context-aware)
 *
 * Uses App.useApp() to get a context-aware message instance.
 * Must be called inside a component wrapped by <AntApp>.
 *
 * Usage:
 * ```tsx
 * const { message } = App.useApp();
 * const { mutate: deleteOne } = useDelete();
 *
 * deleteOne(
 *   { resource: "couponTemplate", id: "123" },
 *   createMutationCallbacks("删除", query, message)
 * );
 * ```
 */

import type { MessageInstance } from 'antd/es/message/interface';
import { queryClient } from '../dataProvider/dataProvider';

/**
 * Create standard mutation callbacks with success/error notifications
 */
export function createMutationCallbacks(
  actionName: string,
  query?: { refetch: () => void },
  onSuccessCallback?: () => void,
  messageApi?: MessageInstance,
) {
  const msg = messageApi || { success: console.log, error: console.error };

  return {
    onSuccess: () => {
      msg.success(`${actionName}成功`);
      onSuccessCallback?.();
      query?.refetch();
    },
    onError: (error: any) => {
      console.error(`${actionName}失败:`, error);
      query?.refetch();
    },
  };
}

/**
 * Create batch mutation callbacks
 */
export function createBatchMutationCallbacks(
  actionName: string,
  count: number,
  query?: { refetch: () => void },
  clearSelection?: () => void,
  messageApi?: MessageInstance,
) {
  const msg = messageApi || { success: console.log, error: console.error };

  return {
    onSuccess: () => {
      msg.success(`成功${actionName} ${count} 项`);
      clearSelection?.();
      query?.refetch();
    },
    onError: (error: any) => {
      console.error(`${actionName}失败:`, error);
      clearSelection?.();
      query?.refetch();
    },
  };
}

/**
 * Create optimistic update callbacks for TanStack Query
 *
 * Immediately updates the UI before server confirmation.
 * On error, rolls back to the previous state.
 *
 * Usage:
 * ```tsx
 * const { mutate: updateOne } = useUpdate();
 * updateOne(
 *   { resource, id, values },
 *   createOptimisticUpdateCallbacks('更新', resource, message)
 * );
 * ```
 */
export function createOptimisticUpdateCallbacks(
  actionName: string,
  resource: string,
  messageApi?: MessageInstance,
) {
  return {
    onMutate: async (variables: { id?: string; values?: Record<string, any> }) => {
      await queryClient.cancelQueries({ queryKey: [resource] });

      const previousData = queryClient.getQueriesData({ queryKey: [resource] });

      if (variables.id && variables.values) {
        queryClient.setQueriesData({ queryKey: [resource] }, (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((item: any) =>
              item.id === variables.id ? { ...item, ...variables.values } : item,
            ),
          };
        });
      }

      return { previousData };
    },
    onError: (_err: any, _variables: any, context: any) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]: [any, any]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      messageApi?.error(`${actionName}失败`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [resource] });
    },
  };
}
