import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useOne } from '@refinedev/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Select,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { getTrpcClient } from '../../../shared/trpc/trpcClient';
import { StandardDetailPage } from '../../../shared/components/StandardDetailPage';
import type { DetailFieldConfig } from '../../../shared/components/StandardDetailPage/types';
import {
  ORDER_STATUS_LABELS,
  PAY_STATUS_LABELS,
  REFUND_STATUS_LABELS,
  TICKET_STATUS_LABELS,
} from '../components';

const PAY_STATUS_COLOR: Record<string, string> = {
  UNPAID: 'orange',
  PENDING: 'orange',
  PAID: 'green',
  REFUNDING: 'gold',
  PARTIAL_REFUND: 'gold',
  REFUNDED: 'red',
  CLOSED: 'default',
};

const ORDER_STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: 'orange',
  PAID: 'green',
  COMPLETED: 'green',
  REFUNDING: 'gold',
  PARTIALLY_REFUNDED: 'gold',
  REFUNDED: 'red',
  CLOSED: 'default',
};

const TICKET_STATUS_COLOR: Record<string, string> = {
  UNUSED: 'orange',
  CHECKED_IN: 'green',
  REFUNDING: 'gold',
  REFUNDED: 'red',
  CANCELLED: 'default',
};

const REFUND_STATUS_COLOR: Record<string, string> = {
  PENDING: 'orange',
  PROCESSING: 'gold',
  SUCCESS: 'green',
  FAILED: 'red',
};

const formatCents = (cents?: number | null): string => `¥${((cents ?? 0) / 100).toFixed(2)}`;
const formatDateTime = (v?: string | null): string =>
  v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-';

// ────────────────────────────── 整单退款 ──────────────────────────────

function RefundModal({ order, open, onClose }: { order: any; open: boolean; onClose: () => void }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const refundable = (order?.tickets || []).filter(
    (t: any) => t.status === 'UNUSED' && !t.changedAt,
  );
  const refundCents = refundable.reduce((sum: number, t: any) => sum + t.priceCents, 0);
  const closedPaid = order?.orderStatus === 'CLOSED' && order?.payment?.status === 'PAID';
  const amount =
    closedPaid && order?.payment?.amountCents
      ? order.payment.amountCents -
        (order.tickets || []).reduce(
          (s: number, t: any) => (t.status === 'REFUNDED' ? s + t.priceCents : s),
          0,
        )
      : refundCents;

  const submit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      await (getTrpcClient() as any).order.refund.mutate({
        orderId: order.id,
        reason: values.reason || '客服整单退款',
      });
      message.success('退款已提交，结果以退款记录为准');
      await queryClient.invalidateQueries({ queryKey: ['order'] });
      onClose();
    } catch (error: any) {
      message.error(error?.message || '退款提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="整单退款（已支付订单取消）"
      open={open}
      onCancel={onClose}
      onOk={submit}
      confirmLoading={submitting}
      okText="确认退款"
      okButtonProps={{ danger: true }}
    >
      <Typography.Paragraph type="warning">
        客服操作全额退款（手续费 0），微信原路退回，结果异步生效。危险操作请谨慎确认。
      </Typography.Paragraph>
      {closedPaid ? (
        <Descriptions size="small" column={1}>
          <Descriptions.Item label="订单状态">
            已关闭（超时竞态等），按支付金额全额退
          </Descriptions.Item>
          <Descriptions.Item label="退款金额">{formatCents(amount)}</Descriptions.Item>
        </Descriptions>
      ) : (
        <Descriptions size="small" column={1}>
          <Descriptions.Item label="可退车票">
            {refundable.length} 张（未核销且非改签票）
          </Descriptions.Item>
          <Descriptions.Item label="退款金额">{formatCents(amount)}</Descriptions.Item>
        </Descriptions>
      )}
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item name="reason" label="退款原因（写入退款单）">
          <Input.TextArea rows={2} maxLength={200} placeholder="如：乘客误购申请取消 / 班次取消" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ────────────────────────────── 整单改签 ──────────────────────────────

function ChangeModal({ order, open, onClose }: { order: any; open: boolean; onClose: () => void }) {
  const [form] = Form.useForm();
  const [serviceDate, setServiceDate] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const unusedTickets = (order?.tickets || []).filter((t: any) => t.status === 'UNUSED');

  const tripsQuery = useQuery({
    queryKey: ['trip', 'change-options', order?.id, serviceDate],
    enabled: open && !!order && !!serviceDate,
    queryFn: () =>
      (getTrpcClient() as any).trip.list.query({
        page: 1,
        limit: 50,
        filter: [
          { field: 'lineId', operator: 'eq', value: order.lineId },
          { field: 'serviceDate', operator: 'eq', value: serviceDate },
          { field: 'status', operator: 'eq', value: 'ON_SALE' },
        ],
      }),
  });
  const tripRows: any[] = tripsQuery.data?.data?.items || tripsQuery.data?.items || [];

  const selectedTripId = Form.useWatch('newTripId', form);
  const selectedTrip = tripRows.find((t: any) => t.id === selectedTripId);
  const priceDiff =
    selectedTrip && order?.trip
      ? (order.trip.priceCents - selectedTrip.priceCents) * unusedTickets.length
      : null;

  const submit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      await (getTrpcClient() as any).order.change.mutate({
        orderId: order.id,
        newTripId: values.newTripId,
      });
      message.success('改签成功，新票已生成；如产生差价将原路退回');
      await queryClient.invalidateQueries({ queryKey: ['order'] });
      onClose();
    } catch (error: any) {
      message.error(error?.message || '改签失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="整单改签"
      open={open}
      onCancel={onClose}
      onOk={submit}
      confirmLoading={submitting}
      okText="确认改签"
    >
      <Typography.Paragraph type="secondary">
        每单仅可改签一次；仅支持改到同线路同价或更低票价班次，差价自动原路退回；改签后车票不可再退。
      </Typography.Paragraph>
      <Form form={form} layout="vertical">
        <Form.Item label="目标乘车日期" required>
          <DatePicker
            style={{ width: '100%' }}
            disabledDate={(d) => d.isBefore(dayjs().startOf('day'))}
            onChange={(d) => {
              setServiceDate(d ? d.format('YYYY-MM-DD') : null);
              form.setFieldValue('newTripId', undefined);
            }}
          />
        </Form.Item>
        <Form.Item
          name="newTripId"
          label="目标班次"
          rules={[{ required: true, message: '请选择目标班次' }]}
        >
          <Select
            placeholder={serviceDate ? '选择班次' : '先选择乘车日期'}
            loading={tripsQuery.isLoading}
            options={tripRows
              .filter((t: any) => t.id !== order?.tripId && t.priceCents <= order?.trip?.priceCents)
              .map((t: any) => ({
                value: t.id,
                label: `${t.departureTime} 发车 · 余票 ${Math.max(0, t.totalSeats - t.soldSeats)} · ${formatCents(t.priceCents)}`,
              }))}
            notFoundContent={
              tripsQuery.isLoading ? <Spin size="small" /> : '无可改班次（更高票价班次不支持）'
            }
          />
        </Form.Item>
        {priceDiff !== null && selectedTrip && (
          <Typography.Paragraph>
            {priceDiff > 0 ? (
              <>
                改签后差价 <b>{formatCents(priceDiff)}</b> 将原路退回
              </>
            ) : (
              '同价改签，无差价'
            )}
            · 涉及车票 {unusedTickets.length} 张
          </Typography.Paragraph>
        )}
      </Form>
    </Modal>
  );
}

// ────────────────────────────── 退款 / 改签记录 Tab ──────────────────────────────

function RefundsTab({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();
  const [acting, setActing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['order', 'refunds', orderId],
    queryFn: () => (getTrpcClient() as any).order.refunds.query({ orderId }),
  });
  const refunds: any[] = data?.data || data || [];

  const act = async (action: 'retryRefund' | 'reconcileRefund', refundId: string, tip: string) => {
    setActing(true);
    try {
      await (getTrpcClient() as any).order[action].mutate({ refundId });
      message.success(tip);
      await queryClient.invalidateQueries({ queryKey: ['order', 'refunds', orderId] });
    } catch (error: any) {
      message.error(error?.message || '操作失败');
    } finally {
      setActing(false);
    }
  };

  if (isLoading) return <Spin />;
  if (!refunds.length) return <Empty description="暂无退款记录" />;

  return (
    <Table
      rowKey="id"
      dataSource={refunds}
      pagination={false}
      size="small"
      style={{ marginTop: 8 }}
      columns={[
        { title: '退款单号', dataIndex: 'refundNo', width: 190 },
        { title: '退款金额', dataIndex: 'amountCents', width: 100, render: formatCents },
        { title: '手续费', dataIndex: 'feeCents', width: 90, render: formatCents },
        {
          title: '状态',
          dataIndex: 'status',
          width: 100,
          render: (v: string) => (
            <Tag color={REFUND_STATUS_COLOR[v]}>{REFUND_STATUS_LABELS[v] || v}</Tag>
          ),
        },
        {
          title: '来源',
          dataIndex: 'operatorType',
          width: 80,
          render: (v: string) => (v === 'USER' ? '乘客' : v === 'ADMIN' ? '客服' : '系统'),
        },
        { title: '原因', dataIndex: 'reason', ellipsis: true, render: (v) => v || '-' },
        {
          title: '失败原因',
          dataIndex: 'failReason',
          ellipsis: true,
          render: (v) => (v ? <Typography.Text type="danger">{v}</Typography.Text> : '-'),
        },
        {
          title: '微信退款单号',
          dataIndex: 'gatewayRefundNo',
          width: 180,
          render: (v) => v || '-',
        },
        { title: '发起时间', dataIndex: 'createdAt', width: 160, render: formatDateTime },
        { title: '完成时间', dataIndex: 'completedAt', width: 160, render: formatDateTime },
        {
          title: '操作',
          width: 150,
          render: (_: any, record: any) => (
            <Space>
              {record.status === 'PROCESSING' && (
                <Button
                  size="small"
                  disabled={acting}
                  onClick={() => act('reconcileRefund', record.id, '已查询微信侧退款状态')}
                >
                  查询状态
                </Button>
              )}
              {record.status === 'FAILED' && (
                <>
                  <Button
                    size="small"
                    danger
                    disabled={acting}
                    onClick={() => act('retryRefund', record.id, '退款重试已提交')}
                  >
                    重试
                  </Button>
                  <Button
                    size="small"
                    disabled={acting}
                    onClick={() => act('reconcileRefund', record.id, '已查询微信侧退款状态')}
                  >
                    查询状态
                  </Button>
                </>
              )}
            </Space>
          ),
        },
      ]}
    />
  );
}

function ChangesTab({ orderId }: { orderId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['order', 'changes', orderId],
    queryFn: () => (getTrpcClient() as any).order.changes.query({ orderId }),
  });
  const changes: any[] = data?.data || data || [];

  if (isLoading) return <Spin />;
  if (!changes.length) return <Empty description="暂无改签记录" />;

  return (
    <Table
      rowKey="id"
      dataSource={changes}
      pagination={false}
      size="small"
      style={{ marginTop: 8 }}
      columns={[
        { title: '改签单号', dataIndex: 'changeNo', width: 190 },
        {
          title: '原班次',
          dataIndex: 'oldTrip',
          width: 180,
          render: (t: any) => (t ? `${t.serviceDate} ${t.departureTime}` : '-'),
        },
        {
          title: '新班次',
          dataIndex: 'newTrip',
          width: 180,
          render: (t: any) => (t ? `${t.serviceDate} ${t.departureTime}` : '-'),
        },
        {
          title: '车票数',
          dataIndex: 'oldTicketIds',
          width: 80,
          render: (v: any) => (Array.isArray(v) ? v.length : 0),
        },
        { title: '退回差价', dataIndex: 'priceDiffCents', width: 100, render: formatCents },
        {
          title: '来源',
          dataIndex: 'operatorType',
          width: 80,
          render: (v: string) => (v === 'USER' ? '乘客' : '客服'),
        },
        { title: '改签时间', dataIndex: 'createdAt', width: 160, render: formatDateTime },
      ]}
    />
  );
}

// ────────────────────────────── 主页面 ──────────────────────────────

const orderDetailFields: DetailFieldConfig[] = [
  { key: 'orderNo', label: '订单号', type: 'text' },
  {
    key: 'orderStatus',
    label: '订单状态',
    type: 'custom',
    render: (v: string) => <Tag color={ORDER_STATUS_COLOR[v]}>{ORDER_STATUS_LABELS[v] || v}</Tag>,
  },
  {
    key: 'payStatus',
    label: '支付状态',
    type: 'custom',
    render: (v: string) => <Tag color={PAY_STATUS_COLOR[v]}>{PAY_STATUS_LABELS[v] || v}</Tag>,
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
 * 订单详情页（P0 基础信息 + 车票 + 支付流水；P0.5 整单退款/改签 + 退款/改签记录）。
 */
export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [refundOpen, setRefundOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);

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
    <>
      <StandardDetailPage
        resource="order"
        title="订单详情"
        backPath="/orders"
        backLabel="返回列表"
        headerType="none"
        fields={orderDetailFields}
        column={2}
        maxWidth={1000}
        actions={[
          {
            key: 'refund',
            label: '整单退款',
            danger: true,
            permission: { resource: 'order', action: 'refund' },
            handler: () => setRefundOpen(true),
          },
          {
            key: 'change',
            label: '整单改签',
            permission: { resource: 'order', action: 'change' },
            handler: () => setChangeOpen(true),
          },
        ]}
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
                    render: formatCents,
                  },
                  { title: '核销码', dataIndex: 'checkCode', width: 100 },
                  {
                    title: '票状态',
                    dataIndex: 'status',
                    width: 110,
                    render: (v: string, record: any) => (
                      <>
                        <Tag color={TICKET_STATUS_COLOR[v]}>{TICKET_STATUS_LABELS[v] || v}</Tag>
                        {record.changedAt && <Tag color="purple">改签票</Tag>}
                      </>
                    ),
                  },
                  {
                    title: '核销时间',
                    dataIndex: 'checkedAt',
                    width: 160,
                    render: formatDateTime,
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
                    {formatCents(payment.amountCents)}
                  </Descriptions.Item>
                  <Descriptions.Item label="状态">
                    <Tag color={PAY_STATUS_COLOR[payment.status]}>
                      {PAY_STATUS_LABELS[payment.status] || payment.status}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="支付时间">
                    {formatDateTime(payment.paidAt)}
                  </Descriptions.Item>
                </Descriptions>
              );
            },
          },
          { key: 'refunds', label: '退款记录', component: <RefundsTab orderId={order.id} /> },
          { key: 'changes', label: '改签记录', component: <ChangesTab orderId={order.id} /> },
        ]}
      />
      <RefundModal order={order} open={refundOpen} onClose={() => setRefundOpen(false)} />
      <ChangeModal order={order} open={changeOpen} onClose={() => setChangeOpen(false)} />
    </>
  );
}
