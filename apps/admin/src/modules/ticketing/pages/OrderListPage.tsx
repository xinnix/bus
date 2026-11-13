import { useNavigate } from 'react-router-dom';
import { Button, Space, Tag } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { StandardListPage } from '../../../shared/components/StandardListPage';
import type { StandardListPageProps } from '../../../shared/components/StandardListPage/types';
import { ORDER_STATUS_LABELS, PAY_STATUS_LABELS } from '../components';

export function OrderListPage() {
  const navigate = useNavigate();
  const columns: StandardListPageProps['columns'] = [
    { title: '订单号', dataIndex: 'orderNo', key: 'orderNo', width: 180 },
    { title: '联系人', dataIndex: 'contactName', key: 'contactName', width: 100 },
    { title: '手机号', dataIndex: 'contactPhone', key: 'contactPhone', width: 120 },
    { title: '线路', dataIndex: ['line', 'name'], key: 'lineName', width: 220, ellipsis: true },
    { title: '乘车日期', dataIndex: ['trip', 'serviceDate'], key: 'serviceDate', width: 110 },
    { title: '发车时间', dataIndex: ['trip', 'departureTime'], key: 'departureTime', width: 100 },
    { title: '票数', dataIndex: 'ticketCount', key: 'ticketCount', width: 70 },
    {
      title: '金额',
      dataIndex: 'totalAmountCents',
      key: 'totalAmountCents',
      width: 100,
      render: (v: number) => `¥${(v / 100).toFixed(2)}`,
    },
    {
      title: '支付状态',
      dataIndex: 'payStatus',
      key: 'payStatus',
      width: 100,
      render: (v: string) => (
        <Tag color={v === 'PAID' ? 'green' : v === 'CLOSED' ? 'default' : 'orange'}>
          {PAY_STATUS_LABELS[v] || v}
        </Tag>
      ),
    },
    {
      title: '订单状态',
      dataIndex: 'orderStatus',
      key: 'orderStatus',
      width: 100,
      render: (v: string) => <Tag>{ORDER_STATUS_LABELS[v] || v}</Tag>,
    },
    {
      title: '下单时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'),
    },
  ];

  return (
    <StandardListPage
      resource="order"
      title="订单记录"
      columns={columns}
      hideCreateButton
      meta={{ include: { line: true, trip: true } }}
      searchFields={[
        { field: 'orderNo', placeholder: '订单号' },
        { field: 'contactPhone', placeholder: '手机号' },
        { field: 'contactName', placeholder: '姓名' },
      ]}
      filterFields={[
        {
          field: 'orderStatus',
          type: 'select',
          placeholder: '订单状态',
          options: [
            { value: 'PENDING_PAYMENT', label: '待支付' },
            { value: 'PAID', label: '已支付' },
            { value: 'COMPLETED', label: '已完成' },
            { value: 'CLOSED', label: '已关闭' },
          ],
        },
      ]}
      renderRowActions={(record: any) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/orders/${record.id}`)}
          >
            详情
          </Button>
        </Space>
      )}
    />
  );
}
