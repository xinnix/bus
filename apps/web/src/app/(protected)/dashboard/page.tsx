'use client';

import { useAuth } from '@/hooks/use-auth';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">
        你好，{user?.firstName || user?.username || '用户'}
      </h1>
      <p className="mt-2 text-neutral-500">欢迎回来</p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* 占位卡片 */}
        {['功能一', '功能二', '功能三'].map((title) => (
          <div key={title} className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="font-medium text-neutral-900">{title}</h3>
            <p className="mt-2 text-sm text-neutral-500">即将推出</p>
          </div>
        ))}
      </div>
    </div>
  );
}
