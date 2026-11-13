import { Tag } from 'antd';
import { StandardListPage } from '../../../shared/components/StandardListPage';
import type { StandardListPageProps } from '../../../shared/components/StandardListPage/types';
import { StationForm } from '../components';
import { Permission } from '@sanqin/shared';

export function StationListPage() {
  const columns: StandardListPageProps['columns'] = [
    { title: '站点名称', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: '详细地址', dataIndex: 'address', key: 'address', ellipsis: true },
    { title: '经度', dataIndex: 'lng', key: 'lng', width: 110 },
    { title: '纬度', dataIndex: 'lat', key: 'lat', width: 110 },
    { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
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
      resource="station"
      title="上下车点"
      columns={columns}
      formComponent={StationForm}
      formWidth={560}
      searchFields={[
        { field: 'name', placeholder: '站点名称' },
        { field: 'address', placeholder: '站点地址' },
      ]}
      permissions={{
        create: Permission.station.create,
        update: Permission.station.update,
        delete: Permission.station.delete,
      }}
    />
  );
}
