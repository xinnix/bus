import { useQuery } from '@tanstack/react-query';
import { Button, Card, Col, Row, Statistic, Table, Tag, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getTrpcClient } from '../../../shared/trpc/trpcClient';
import { ORDER_STATUS_LABELS, PAY_STATUS_LABELS } from '../../ticketing/components';

/** 分 → 元 展示 */
function formatCents(cents?: number | null): string {
  return `¥${((cents ?? 0) / 100).toFixed(2)}`;
}

const PAY_TAG_COLOR: Record<string, string> = {
  PAID: 'green',
  CLOSED: 'default',
};

const RECENT_PAGE_SIZE = 8;

interface RecentOrderRow {
  id: string;
  orderNo: string;
  contactName: string;
  ticketCount: number;
  totalAmountCents: number;
  payStatus: string;
  orderStatus: string;
  createdAt: string;
}

/** createCrudRouter 生成的过程在 client 侧是 query|mutate 联合类型，按最小结构收窄（同 dataProvider 的 as-any 惯例但不引入 any） */
type OrderListClient = {
  order: {
    list: {
      query: (input: { page: number; limit: number }) => Promise<{
        items: RecentOrderRow[];
        total: number;
      }>;
    };
  };
};

export function DashboardPage() {
  const stats = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => getTrpcClient().dashboard.stats.query(),
    // 看板要新鲜数据，不走全局 5 分钟 staleTime
    staleTime: 30 * 1000,
  });
  const recent = useQuery({
    queryKey: ['dashboard', 'recentOrders'],
    queryFn: () =>
      (getTrpcClient() as unknown as OrderListClient).order.list.query({
        page: 1,
        limit: RECENT_PAGE_SIZE,
      }),
    staleTime: 30 * 1000,
  });

  const today = stats.data?.today;
  const total = stats.data?.total;

  const columns = [
    { title: '订单号', dataIndex: 'orderNo', key: 'orderNo' },
    { title: '联系人', dataIndex: 'contactName', key: 'contactName', width: 110 },
    { title: '票数', dataIndex: 'ticketCount', key: 'ticketCount', width: 80 },
    {
      title: '金额',
      dataIndex: 'totalAmountCents',
      key: 'totalAmountCents',
      width: 110,
      render: (v: number) => formatCents(v),
    },
    {
      title: '支付状态',
      dataIndex: 'payStatus',
      key: 'payStatus',
      width: 100,
      render: (v: string) => (
        <Tag color={PAY_TAG_COLOR[v] ?? 'orange'}>{PAY_STATUS_LABELS[v] || v}</Tag>
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
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          数据看板
        </Typography.Title>
        <Button
          icon={<ReloadOutlined />}
          loading={stats.isFetching || recent.isFetching}
          onClick={() => {
            stats.refetch();
            recent.refetch();
          }}
        >
          刷新
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={12} md={8} lg={5}>
          <Card loading={stats.isLoading}>
            <Statistic title="今日收款" value={formatCents(today?.paidCents)} />
          </Card>
        </Col>
        <Col xs={12} md={8} lg={5}>
          <Card loading={stats.isLoading}>
            <Statistic title="今日订单" value={today?.orders ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={8} lg={5}>
          <Card loading={stats.isLoading}>
            <Statistic title="今日核销（张）" value={today?.checkins ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={8} lg={5}>
          <Card loading={stats.isLoading}>
            <Statistic title="今日发车班次" value={today?.trips ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={8} lg={4}>
          <Card loading={stats.isLoading}>
            <Statistic title="今日新增用户" value={today?.newUsers ?? 0} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={12} md={8} lg={6}>
          <Card loading={stats.isLoading}>
            <Statistic title="用户总数" value={total?.users ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={8} lg={6}>
          <Card loading={stats.isLoading}>
            <Statistic title="累计订单" value={total?.orders ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={8} lg={6}>
          <Card loading={stats.isLoading}>
            <Statistic title="累计收款" value={formatCents(total?.paidCents)} />
          </Card>
        </Col>
        <Col xs={12} md={8} lg={6}>
          <Card loading={stats.isLoading}>
            <Statistic title="线路总数" value={total?.lines ?? 0} />
          </Card>
        </Col>
      </Row>

      <Card title="最近订单" style={{ marginTop: 24 }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={recent.data?.items ?? []}
          loading={recent.isLoading}
          pagination={false}
          size="middle"
        />
      </Card>
    </div>
  );
}
