import type { FieldDefinition } from '../../../shared/components/StandardForm/types';
import { StandardForm } from '../../../shared/components/StandardForm';
import type { FormInstance } from 'antd/es/form';

const lineFields: FieldDefinition[] = [
  {
    key: 'name',
    label: '线路名称',
    type: 'input',
    required: true,
    placeholder: '如：明德理工学院-常宁宫地铁站',
  },
  { key: 'startCity', label: '出发地', type: 'input', required: true, placeholder: '如：西安' },
  { key: 'endCity', label: '到达地', type: 'input', required: true, placeholder: '如：太乙宫' },
  {
    key: 'publishStatus',
    label: '发布状态',
    type: 'select',
    options: [
      { value: 'DRAFT', label: '草稿' },
      { value: 'PUBLISHED', label: '已发布' },
    ],
    initialValue: 'DRAFT',
  },
  { key: 'sort', label: '排序', type: 'number', min: 0, initialValue: 0 },
];

const stationFields: FieldDefinition[] = [
  {
    key: 'name',
    label: '站点名称',
    type: 'input',
    required: true,
    placeholder: '如：明德理工学院东门外50米路南',
  },
  { key: 'address', label: '详细地址', type: 'input', required: true, placeholder: '用于乘客导航' },
  { key: 'lng', label: '经度', type: 'number', precision: 6, placeholder: '如：108.788552' },
  { key: 'lat', label: '纬度', type: 'number', precision: 6, placeholder: '如：34.045429' },
  { key: 'sort', label: '排序', type: 'number', min: 0, initialValue: 0 },
  {
    key: 'status',
    label: '状态',
    type: 'select',
    options: [
      { value: 'ACTIVE', label: '启用' },
      { value: 'INACTIVE', label: '停用' },
    ],
    initialValue: 'ACTIVE',
  },
];

const templateFields: FieldDefinition[] = [
  { key: 'lineId', label: '所属线路', type: 'select', resource: 'line', required: true },
  {
    key: 'name',
    label: '班次名称',
    type: 'input',
    required: true,
    placeholder: '如：12:00 明德→常宁宫',
  },
  {
    key: 'departureTime',
    label: '发车时间',
    type: 'input',
    required: true,
    placeholder: 'HH:mm，如 12:00',
  },
  {
    key: 'priceCents',
    label: '票价（分）',
    type: 'number',
    required: true,
    min: 0,
    tooltip: '金额单位为分，例如 790 = 7.90 元',
  },
  {
    key: 'totalSeats',
    label: '总放票数',
    type: 'number',
    required: true,
    min: 1,
    initialValue: 50,
  },
  {
    key: 'weekdays',
    label: '发车星期',
    type: 'input',
    initialValue: '1,2,3,4,5,6,7',
    tooltip: '1=周一 … 7=周日，逗号分隔',
  },
  {
    key: 'status',
    label: '状态',
    type: 'select',
    options: [
      { value: 'ACTIVE', label: '启用' },
      { value: 'INACTIVE', label: '停用' },
    ],
    initialValue: 'ACTIVE',
  },
];

const checkerFields: FieldDefinition[] = [
  { key: 'name', label: '姓名', type: 'input', required: true, placeholder: '核销员姓名' },
  { key: 'phone', label: '手机号', type: 'input', required: true, placeholder: '11位手机号' },
  {
    key: 'password',
    label: '密码',
    type: 'input',
    required: true,
    showOnlyInCreate: true,
    placeholder: '至少6位',
  },
];

export function CheckerForm({ form, isEdit }: { form: FormInstance; isEdit: boolean }) {
  return <StandardForm form={form} isEdit={isEdit} fields={checkerFields} />;
}

export function LineForm({ form, isEdit }: { form: FormInstance; isEdit: boolean }) {
  return <StandardForm form={form} isEdit={isEdit} fields={lineFields} />;
}

export function StationForm({ form, isEdit }: { form: FormInstance; isEdit: boolean }) {
  return <StandardForm form={form} isEdit={isEdit} fields={stationFields} />;
}

export function ScheduleTemplateForm({ form, isEdit }: { form: FormInstance; isEdit: boolean }) {
  return <StandardForm form={form} isEdit={isEdit} fields={templateFields} />;
}

export const LINE_STATUS_LABELS: Record<string, string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
};

export const TRIP_STATUS_LABELS: Record<string, string> = {
  ON_SALE: '售票中',
  STOPPED: '已停售',
  DEPARTED: '已发车',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: '待支付',
  PAID: '已支付',
  COMPLETED: '已完成',
  CLOSED: '已关闭',
};

export const PAY_STATUS_LABELS: Record<string, string> = {
  UNPAID: '未支付',
  PENDING: '支付中',
  PAID: '已支付',
  CLOSED: '已关闭',
};
