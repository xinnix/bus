import { useParams } from 'react-router-dom';
import { useOne } from '@refinedev/core';
import { Tag, Spin, Empty, Descriptions, Table } from 'antd';
import dayjs from 'dayjs';
import { StandardDetailPage } from '../../../shared/components/StandardDetailPage';
import type { DetailFieldConfig } from '../../../shared/components/StandardDetailPage/types';
import { ORDER_STATUS_LABELS, PAY_STATUS_LABELS } from '../components';

const payStatusColor = (v: string) =>
  v === 'PAID' ? 'green' : v === 'CLOSED' ? 'default' : 'orange';

const orderDetailFields: DetailFieldConfig[] = [
  { key: 'orderNo', label: '订单号', type: 'text' },
  {
    key: 'orderStatus',
    label: '订单状态',
    type: 'custom',
    render: (v: string) => (
      <Tag color={v === 'PAID' ? 'green' : v === 'CLOSED' ? 'default' : 'orange'}>
        {ORDER_STATUS_LABELS[v] || v}
      </Tag>
    ),
  },
  {
    key: 'payStatus',
    label: '支付状态',
    type: 'custom',
    render: (v: string) => <Tag color={payStatusColor(v)}>{PAY_STATUS_LABELS[v] || v}</Tag>,
  },
  { key: 'totalAmountCents', label: '订单金额', type: 'currency' },
  {
    key: 'line',
    label: '线路',
    type: 'custom',
    render: (_: any, entity: any) => entity?.line?.name || '-',
  },
  {
    key: 'trip',
    label: '班次',
    type: 'custom',
    render: (_: any, entity: any) =>
      entity?.trip ? `${entity.trip.serviceDate} ${entity.trip.departureTime}` : '-',
  },
  { key: 'contactName', label: '联系人', type: 'text' },
  { key: 'contactPhone', label: '联系手机号', type: 'text' },
  { key: 'ticketCount', label: '票数', type: 'number' },
  { key: 'expiresAt', label: '支付截止', type: 'datetime', fallback: '-' },
  { key: 'paidAt', label: '支付时间', type: 'datetime', fallback: '-' },
  { key: 'createdAt', label: '下单时间', type: 'datetime' },
];

/**
 * 订单详情页（P0）：基本信息 + 车票 + 支付流水。
 */
export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { result: order, query } = useOne<any>({
    resource: 'order',
    id: id || '',
    meta: {
      include: { line: true, trip: true, tickets: true, payment: true },
    },
    queryOptions: { enabled: !!id },
  });

  if (query?.isLoading) {
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!order) {
    return <Empty description="订单不存在" />;
  }

  return (
    <StandardDetailPage
      resource="order"
      title="订单详情"
      backPath="/orders"
      backLabel="返回列表"
      headerType="none"
      fields={orderDetailFields}
      column={2}
      maxWidth={1000}
      tabs={[
        { key: 'info', label: '基本信息' },
        {
          key: 'tickets',
          label: `车票 (${order.tickets?.length || 0})`,
          render: (entity: any) => (
            <Table
              rowKey="id"
              dataSource={entity?.tickets || []}
              pagination={false}
              columns={[
                { title: '票号', dataIndex: 'ticketNo', width: 180 },
                { title: '乘客', dataIndex: 'passengerName', width: 120 },
                {
                  title: '票价',
                  dataIndex: 'priceCents',
                  width: 100,
                  render: (v: number) => `¥${(v / 100).toFixed(2)}`,
                },
                { title: '核销码', dataIndex: 'checkCode', width: 100 },
                {
                  title: '票状态',
                  dataIndex: 'status',
                  width: 100,
                  render: (v: string) => (
                    <Tag
                      color={
                        v === 'CHECKED_IN' ? 'green' : v === 'CANCELLED' ? 'default' : 'orange'
                      }
                    >
                      {v === 'CHECKED_IN' ? '已核销' : v === 'CANCELLED' ? '已取消' : '未使用'}
                    </Tag>
                  ),
                },
                {
                  title: '核销时间',
                  dataIndex: 'checkedAt',
                  width: 160,
                  render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-'),
                },
              ]}
            />
          ),
        },
        {
          key: 'payment',
          label: '支付流水',
          render: (entity: any) => {
            const payment = entity?.payment;
            if (!payment) return <Empty description="暂无支付记录" />;
            return (
              <Descriptions bordered column={2} size="small" style={{ marginTop: 8 }}>
                <Descriptions.Item label="支付流水号">{payment.paymentNo}</Descriptions.Item>
                <Descriptions.Item label="商户订单号">{payment.outTradeNo}</Descriptions.Item>
                <Descriptions.Item label="微信交易号">
                  {payment.transactionId || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="金额">
                  ¥{((payment.amountCents || 0) / 100).toFixed(2)}
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={payStatusColor(payment.status)}>
                    {PAY_STATUS_LABELS[payment.status] || payment.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="支付时间">
                  {payment.paidAt ? dayjs(payment.paidAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
                </Descriptions.Item>
              </Descriptions>
            );
          },
        },
      ]}
    />
  );
}
