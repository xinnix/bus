'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await apiClient.post('/auth/me', { firstName, lastName });
      await refreshUser();
      setMessage('保存成功');
    } catch {
      setMessage('保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-neutral-900">个人中心</h1>

      <form
        onSubmit={handleSave}
        className="mt-8 space-y-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label className="block text-sm font-medium text-neutral-700">用户名</label>
          <p className="mt-1 text-sm text-neutral-900">{user?.username}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">邮箱</label>
          <p className="mt-1 text-sm text-neutral-900">{user?.email || '未设置'}</p>
        </div>

        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-neutral-700">
            名
          </label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-neutral-700">
            姓
          </label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        {message && (
          <p
            className={`text-sm ${message === '保存成功' ? 'text-success-600' : 'text-error-600'}`}
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </form>
    </div>
  );
}
