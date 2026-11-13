import { useState } from 'react';
import { Button, DatePicker, Form, InputNumber, Modal, Select, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useList } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { StandardListPage } from '../../../shared/components/StandardListPage';
import type { StandardListPageProps } from '../../../shared/components/StandardListPage/types';
import { TRIP_STATUS_LABELS } from '../components';
import { Permission } from '@sanqin/shared';
import { trpcClient } from '../../../shared/dataProvider/dataProvider';

function GenerateTripsButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { result: lines } = useList({ resource: 'line', pagination: { pageSize: 100 } });

  const onGenerate = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const result = await (trpcClient as any).trip.generate.mutate({
        lineId: values.lineId,
        startDate: values.startDate.format('YYYY-MM-DD'),
        days: values.days,
      });
      message.success(result.message || '生成完成');
      setOpen(false);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ['trip'] });
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error?.message || '生成失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
        按模板生成班次
      </Button>
      <Modal
        title="按班次模板生成班次"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onGenerate}
        confirmLoading={loading}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ days: 7 }}>
          <Form.Item name="lineId" label="线路" rules={[{ required: true, message: '请选择线路' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={(lines?.data || []).map((item: any) => ({
                value: item.id,
                label: item.name,
              }))}
              placeholder="请选择线路"
            />
          </Form.Item>
          <Form.Item
            name="startDate"
            label="开始日期"
            rules={[{ required: true, message: '请选择日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="days" label="生成天数" rules={[{ required: true }]}>
            <InputNumber min={1} max={31} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export function TripListPage() {
  const columns: StandardListPageProps['columns'] = [
    { title: '线路', dataIndex: ['line', 'name'], key: 'lineName', width: 220, ellipsis: true },
    { title: '乘车日期', dataIndex: 'serviceDate', key: 'serviceDate', width: 110 },
    { title: '发车时间', dataIndex: 'departureTime', key: 'departureTime', width: 100 },
    {
      title: '票价',
      dataIndex: 'priceCents',
      key: 'priceCents',
      width: 100,
      render: (v: number) => `¥${(v / 100).toFixed(2)}`,
    },
    { title: '总票数', dataIndex: 'totalSeats', key: 'totalSeats', width: 90 },
    { title: '已售', dataIndex: 'soldSeats', key: 'soldSeats', width: 80 },
    {
      title: '余票',
      key: 'remaining',
      width: 80,
      render: (_: unknown, record: any) => record.totalSeats - record.soldSeats,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string) => (
        <Tag color={v === 'ON_SALE' ? 'green' : 'default'}>{TRIP_STATUS_LABELS[v] || v}</Tag>
      ),
    },
  ];

  return (
    <StandardListPage
      resource="trip"
      title="班次管理"
      columns={columns}
      hideCreateButton
      meta={{ include: { line: true } }}
      specialActions={<GenerateTripsButton />}
      searchFields={[{ field: 'departureTime', placeholder: '发车时间' }]}
      filterFields={[
        {
          field: 'status',
          type: 'select',
          placeholder: '班次状态',
          options: [
            { value: 'ON_SALE', label: '售票中' },
            { value: 'STOPPED', label: '已停售' },
            { value: 'CANCELLED', label: '已取消' },
          ],
        },
      ]}
      permissions={{ update: Permission.trip.update }}
    />
  );
}
