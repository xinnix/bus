import { Tag } from 'antd';
import { StandardListPage } from '../../../shared/components/StandardListPage';
import type { StandardListPageProps } from '../../../shared/components/StandardListPage/types';
import { ScheduleTemplateForm } from '../components';
import { Permission } from '@sanqin/shared';

export function ScheduleTemplateListPage() {
  const columns: StandardListPageProps['columns'] = [
    { title: '线路', dataIndex: ['line', 'name'], key: 'lineName', width: 220, ellipsis: true },
    { title: '班次名称', dataIndex: 'name', key: 'name', width: 200, ellipsis: true },
    { title: '发车时间', dataIndex: 'departureTime', key: 'departureTime', width: 100 },
    {
      title: '票价',
      dataIndex: 'priceCents',
      key: 'priceCents',
      width: 100,
      render: (v: number) => `¥${(v / 100).toFixed(2)}`,
    },
    { title: '总放票数', dataIndex: 'totalSeats', key: 'totalSeats', width: 100 },
    { title: '发车星期', dataIndex: 'weekdays', key: 'weekdays', width: 140 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v: string) => (
        <Tag color={v === 'ACTIVE' ? 'green' : 'default'}>{v === 'ACTIVE' ? '启用' : '停用'}</Tag>
      ),
    },
  ];

  return (
    <StandardListPage
      resource="scheduleTemplate"
      title="班次模板"
      columns={columns}
      formComponent={ScheduleTemplateForm}
      formWidth={600}
      meta={{ include: { line: true } }}
      searchFields={[{ field: 'name', placeholder: '班次名称' }]}
      filterFields={[
        {
          field: 'status',
          type: 'select',
          placeholder: '状态',
          options: [
            { value: 'ACTIVE', label: '启用' },
            { value: 'INACTIVE', label: '停用' },
          ],
        },
      ]}
      permissions={{
        create: Permission.scheduleTemplate.create,
        update: Permission.scheduleTemplate.update,
        delete: Permission.scheduleTemplate.delete,
      }}
    />
  );
}
