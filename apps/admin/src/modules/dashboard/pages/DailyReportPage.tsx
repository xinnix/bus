import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Col, DatePicker, Row, Space, Statistic, Table, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getTrpcClient } from '../../../shared/trpc/trpcClient';

/** 分 → 元 展示 */
function formatCents(cents?: number | null): string {
  return `¥${((cents ?? 0) / 100).toFixed(2)}`;
}

interface DailyRow {
  date: string;
  orderCount: number;
  ticketCount: number;
  paidCents: number;
  refundCents: number;
  netCents: number;
}

interface DailyReport {
  rows: DailyRow[];
  totals: {
    orderCount: number;
    ticketCount: number;
    paidCents: number;
    refundCents: number;
    netCents: number;
  };
}

const MAX_RANGE_DAYS = 92;

/**
 * P0.5 简单日报表：按支付完成日逐日聚合订单数/票数/支付金额，退款金额按退款完成日归日，
 * 输出净额与合计（与支付流水一致口径：支付含后续退款订单，退款只计 SUCCESS）。
 */
export function DailyReportPage() {
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(6, 'day'),
    dayjs(),
  ]);
  const [queryRange, setQueryRange] = useState<[string, string]>([
    dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
    dayjs().format('YYYY-MM-DD'),
  ]);

  const { data, isLoading, refetch, isFetching } = useQuery<DailyReport>({
    queryKey: ['dashboard', 'daily', queryRange],
    queryFn: () =>
      (getTrpcClient() as any).dashboard.daily.query({
        startDate: queryRange[0],
        endDate: queryRange[1],
      }),
    staleTime: 30_000,
  });

  const onQuery = () => {
    setQueryRange([range[0].format('YYYY-MM-DD'), range[1].format('YYYY-MM-DD')]);
  };

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16 }} wrap>
        <DatePicker.RangePicker
          value={range}
          onChange={(v) => v && v[0] && v[1] && setRange([v[0], v[1]])}
          disabledDate={(current) => {
            if (!range?.[0]) return false;
            return Math.abs(current.diff(range[0], 'day')) > MAX_RANGE_DAYS - 1;
          }}
          allowClear={false}
        />
        <Button type="primary" onClick={onQuery}>
          查询
        </Button>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isFetching} />
        <Typography.Text type="secondary">
          口径：支付金额按支付完成日（含后续发生退款的订单），退款金额按退款完成日（仅成功退款）
        </Typography.Text>
      </Space>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={8} lg={4}>
          <Card size="small">
            <Statistic title="订单数" value={data?.totals?.orderCount ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={8} lg={4}>
          <Card size="small">
            <Statistic title="票数" value={data?.totals?.ticketCount ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={8} lg={4}>
          <Card size="small">
            <Statistic title="支付金额" value={formatCents(data?.totals?.paidCents)} />
          </Card>
        </Col>
        <Col xs={12} md={8} lg={4}>
          <Card size="small">
            <Statistic
              title="退款金额"
              value={formatCents(data?.totals?.refundCents)}
              valueStyle={{ color: data?.totals?.refundCents ? '#cf1322' : undefined }}
            />
          </Card>
        </Col>
        <Col xs={12} md={8} lg={4}>
          <Card size="small">
            <Statistic
              title="净收入"
              value={formatCents(data?.totals?.netCents)}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      <Card size="small" title={`逐日报表（${queryRange[0]} ~ ${queryRange[1]}）`}>
        <Table<DailyRow>
          rowKey="date"
          loading={isLoading}
          dataSource={data?.rows || []}
          pagination={false}
          size="small"
          columns={[
            { title: '日期', dataIndex: 'date', width: 130 },
            { title: '订单数', dataIndex: 'orderCount', width: 100 },
            { title: '票数', dataIndex: 'ticketCount', width: 100 },
            { title: '支付金额', dataIndex: 'paidCents', width: 120, render: formatCents },
            {
              title: '退款金额',
              dataIndex: 'refundCents',
              width: 120,
              render: (v: number) =>
                v ? <span style={{ color: '#cf1322' }}>{formatCents(v)}</span> : formatCents(v),
            },
            {
              title: '净收入',
              dataIndex: 'netCents',
              width: 120,
              render: (v: number) => <span style={{ color: '#3f8600' }}>{formatCents(v)}</span>,
            },
          ]}
          summary={(pageData) => {
            if (!pageData.length) return null;
            const sum = pageData.reduce(
              (acc, r) => ({
                orderCount: acc.orderCount + r.orderCount,
                ticketCount: acc.ticketCount + r.ticketCount,
                paidCents: acc.paidCents + r.paidCents,
                refundCents: acc.refundCents + r.refundCents,
                netCents: acc.netCents + r.netCents,
              }),
              { orderCount: 0, ticketCount: 0, paidCents: 0, refundCents: 0, netCents: 0 },
            );
            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>
                  <b>当前页合计</b>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>{sum.orderCount}</Table.Summary.Cell>
                <Table.Summary.Cell index={2}>{sum.ticketCount}</Table.Summary.Cell>
                <Table.Summary.Cell index={3}>{formatCents(sum.paidCents)}</Table.Summary.Cell>
                <Table.Summary.Cell index={4}>{formatCents(sum.refundCents)}</Table.Summary.Cell>
                <Table.Summary.Cell index={5}>{formatCents(sum.netCents)}</Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </Card>
    </div>
  );
}
