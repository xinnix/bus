import { Tag } from 'antd';
import dayjs from 'dayjs';
import { StandardListPage } from '../../../shared/components/StandardListPage';
import type { StandardListPageProps } from '../../../shared/components/StandardListPage/types';
import { CheckerForm } from '../components';
import { Permission } from '@sanqin/shared';

export function CheckerListPage() {
  const columns: StandardListPageProps['columns'] = [
    { title: '姓名', dataIndex: 'name', key: 'name', width: 120 },
    { title: '手机号', dataIndex: 'phone', key: 'phone', width: 140 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v: string) => (
        <Tag color={v === 'ACTIVE' ? 'green' : 'default'}>{v === 'ACTIVE' ? '启用' : '停用'}</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'),
    },
  ];

  return (
    <StandardListPage
      resource="checker"
      title="核销员管理"
      columns={columns}
      formComponent={CheckerForm}
      formWidth={480}
      searchFields={[
        { field: 'name', placeholder: '姓名' },
        { field: 'phone', placeholder: '手机号' },
      ]}
      permissions={{
        create: Permission.checker.create,
        update: Permission.checker.update,
        delete: Permission.checker.delete,
      }}
    />
  );
}
