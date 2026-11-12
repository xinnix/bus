import type { ReactNode, CSSProperties } from 'react';
import type { ButtonType } from 'antd/es/button';

/**
 * 字段类型
 */
export type DetailFieldType =
  | 'text'
  | 'datetime'
  | 'date'
  | 'boolean'
  | 'number'
  | 'currency'
  | 'percent'
  | 'tag'
  | 'image'
  | 'relation'
  | 'email'
  | 'url'
  | 'custom';

/**
 * 字段配置
 */
export interface DetailFieldConfig {
  key: string;
  label: string;
  type?: DetailFieldType;
  span?: number;
  labelStyle?: CSSProperties;
  fallback?: string;

  // boolean
  booleanLabels?: [string, string];
  booleanColors?: [string, string];

  // tag
  tagColors?: Record<string, string>;
  tagLabels?: Record<string, string>;

  // relation
  relationFields?: string[];

  // image
  imageWidth?: number;
  imageHeight?: number;

  // currency
  currencySymbol?: string;
  currencyPrecision?: number;

  // url
  urlTarget?: string;

  // custom
  render?: (value: any, entity: any) => ReactNode;

  // conditional
  showCondition?: (entity: any) => boolean;
}

/**
 * 状态配置
 */
export interface StatusConfig {
  color: string;
  text: string;
}

/**
 * Header 标签
 */
export interface HeaderTagConfig {
  field?: string;
  color?: string;
  text?: string;
  render?: (entity: any) => ReactNode;
}

/**
 * Tab 配置
 */
export interface DetailTabConfig {
  key: string;
  label: string;
  render?: (entity: any) => ReactNode;
  component?: ReactNode;
  countField?: string;
}

/**
 * 操作按钮配置
 */
export interface DetailActionConfig {
  key: string;
  label: string;
  icon?: ReactNode;
  type?: ButtonType;
  danger?: boolean;
  permission?: { resource: string; action: string };
  handler?: (entity: any) => void;
  confirm?: string;
}

/**
 * 统计卡片配置
 */
export interface StatisticConfig {
  title: string;
  field?: string;
  value?: number;
  icon?: ReactNode;
  color?: string;
  precision?: number;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

/**
 * 权限配置
 */
export interface PermissionConfig {
  update?: string;
  delete?: string;
}

/**
 * Header 类型
 */
export type HeaderType = 'simple' | 'avatar' | 'none';

/**
 * StandardDetailPage Props
 */
export interface StandardDetailPageProps<T = any> {
  resource: string;

  // layout
  maxWidth?: number;

  // header
  headerType?: HeaderType;
  title?: string;
  titleField?: string;
  avatarField?: string;
  statusField?: string;
  statusConfig?: Record<string, StatusConfig>;
  headerTags?: HeaderTagConfig[];

  // fields
  fields?: DetailFieldConfig[];
  bordered?: boolean;
  column?: number;

  // tabs
  tabs?: DetailTabConfig[];
  defaultTab?: string;

  // statistics
  statistics?: StatisticConfig[];

  // actions
  actions?: DetailActionConfig[];
  hideBackButton?: boolean;
  backPath?: string;
  backLabel?: string;

  // card extra
  cardExtra?: ReactNode | ((entity: any) => ReactNode);

  // permissions
  permissions?: PermissionConfig;

  // refine meta
  meta?: any;

  // custom rendering
  renderHeader?: (entity: T) => ReactNode;
  renderDescriptions?: (entity: T) => ReactNode;
  renderTabContent?: (tabKey: string, entity: T) => ReactNode;
  renderActions?: (entity: T) => ReactNode;

  // callbacks
  onLoaded?: (entity: T) => void;
}
