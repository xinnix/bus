import {
  useQuery,
  useMutation,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { trpcClient } from '../dataProvider/dataProvider';

/**
 * Generic tRPC query hook
 * Usage: useTrpcQuery("statistics.getOverview", { startDate, endDate })
 */
export function useTrpcQuery<TData = unknown, TError = unknown, TParams = unknown>(
  path: string,
  params?: TParams,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>,
) {
  const keys = path.split('.');

  return useQuery({
    ...options,
    queryKey: [path, params],
    queryFn: async () => {
      let result: any = trpcClient as any;
      for (const key of keys) {
        result = result[key];
      }
      return (result as any).query(params);
    },
  });
}

/**
 * Generic tRPC mutation hook
 * Usage: useTrpcMutation("statistics.update", { onSuccess: ... })
 */
export function useTrpcMutation<TData = unknown, TError = unknown, TVariables = unknown>(
  path: string,
  options?: UseMutationOptions<TData, TError, TVariables>,
) {
  const keys = path.split('.');

  return useMutation({
    ...options,
    mutationFn: async (variables: TVariables) => {
      let result: any = trpcClient as any;
      for (const key of keys) {
        result = result[key];
      }
      return (result as any).mutate(variables);
    },
  });
}
