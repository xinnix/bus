import dayjs from 'dayjs';
import { StandardListPage } from '../../../shared/components/StandardListPage';
import type { StandardListPageProps } from '../../../shared/components/StandardListPage/types';

export function CheckinListPage() {
  const columns: StandardListPageProps['columns'] = [
    {
      title: '核销时间',
      dataIndex: 'checkedAt',
      key: 'checkedAt',
      width: 170,
      render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    { title: '票号', dataIndex: ['ticket', 'ticketNo'], key: 'ticketNo', width: 180 },
    { title: '乘车人', dataIndex: ['ticket', 'passengerName'], key: 'passengerName', width: 100 },
    {
      title: '线路',
      dataIndex: ['ticket', 'order', 'line', 'name'],
      key: 'lineName',
      width: 220,
      ellipsis: true,
    },
    {
      title: '乘车日期',
      dataIndex: ['ticket', 'order', 'trip', 'serviceDate'],
      key: 'serviceDate',
      width: 110,
    },
    {
      title: '发车时间',
      dataIndex: ['ticket', 'order', 'trip', 'departureTime'],
      key: 'departureTime',
      width: 100,
    },
    { title: '核销员', dataIndex: ['checker', 'name'], key: 'checkerName', width: 100 },
    {
      title: '方式',
      dataIndex: 'method',
      key: 'method',
      width: 80,
      render: (v: string) => (v === 'QR' ? '扫码' : '手输'),
    },
  ];

  return (
    <StandardListPage
      resource="checkin"
      title="核销记录"
      columns={columns}
      hideCreateButton
      meta={{
        include: {
          ticket: { include: { order: { include: { line: true, trip: true } } } },
          checker: true,
        },
      }}
      filterFields={[{ field: 'tripId', type: 'select', placeholder: '班次ID', options: [] }]}
    />
  );
}
