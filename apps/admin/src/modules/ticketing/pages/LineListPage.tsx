import { Tag } from 'antd';
import dayjs from 'dayjs';
import { StandardListPage } from '../../../shared/components/StandardListPage';
import type { StandardListPageProps } from '../../../shared/components/StandardListPage/types';
import { LineForm, LINE_STATUS_LABELS } from '../components';
import { Permission } from '@sanqin/shared';

export function LineListPage() {
  const columns: StandardListPageProps['columns'] = [
    { title: '线路名称', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: '出发地', dataIndex: 'startCity', key: 'startCity', width: 120 },
    { title: '到达地', dataIndex: 'endCity', key: 'endCity', width: 120 },
    {
      title: '状态',
      dataIndex: 'publishStatus',
      key: 'publishStatus',
      width: 100,
      render: (v: string) => (
        <Tag color={v === 'PUBLISHED' ? 'green' : 'default'}>{LINE_STATUS_LABELS[v] || v}</Tag>
      ),
    },
    { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
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
      resource="line"
      title="线路管理"
      columns={columns}
      formComponent={LineForm}
      formWidth={560}
      searchFields={[
        { field: 'name', placeholder: '线路名称' },
        { field: 'startCity', placeholder: '出发地' },
        { field: 'endCity', placeholder: '到达地' },
      ]}
      filterFields={[
        {
          field: 'publishStatus',
          type: 'select',
          placeholder: '发布状态',
          options: [
            { value: 'DRAFT', label: '草稿' },
            { value: 'PUBLISHED', label: '已发布' },
          ],
        },
      ]}
      permissions={{
        create: Permission.line.create,
        update: Permission.line.update,
        delete: Permission.line.delete,
      }}
    />
  );
}
