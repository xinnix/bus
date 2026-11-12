import { useParams, useNavigate } from 'react-router-dom';
import { useOne } from '@refinedev/core';
import {
  Card,
  Button,
  Space,
  Tabs,
  Descriptions,
  Tag,
  Avatar,
  Row,
  Col,
  Spin,
  Empty,
  Statistic,
  Popconfirm,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { PermissionGuard } from '../PermissionGuard';
import type { StandardDetailPageProps, DetailFieldConfig, DetailTabConfig } from './types';

export function StandardDetailPage<T extends Record<string, any> = any>(
  props: StandardDetailPageProps<T>,
) {
  const {
    resource,
    maxWidth = 1200,
    headerType = 'simple',
    titleField = 'name',
    avatarField,
    statusField = 'status',
    statusConfig,
    headerTags,
    fields = [],
    bordered = true,
    column = 2,
    tabs,
    defaultTab,
    statistics = [],
    actions,
    hideBackButton = false,
    backPath,
    backLabel = '返回',
    cardExtra,
    meta,
    renderHeader,
    renderDescriptions,
    renderTabContent,
    renderActions,
    onLoaded,
  } = props;

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(defaultTab || tabs?.[0]?.key || 'info');

  const { result, query } = useOne<T>({
    resource,
    id: id!,
    meta,
    queryOptions: { enabled: !!id },
  });

  const entity = result as T | undefined;
  const isLoading = query.isLoading;
  const isError = query.isError;

  useEffect(() => {
    if (entity && onLoaded) {
      onLoaded(entity);
    }
  }, [entity]);

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth, margin: '0 auto', padding: '24px' }}>
        <Card>
          <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />
        </Card>
      </div>
    );
  }

  if (isError || !entity) {
    return (
      <div style={{ maxWidth, margin: '0 auto', padding: '24px' }}>
        <Card>
          <Empty description="数据不存在或加载失败" />
          {!hideBackButton && (
            <Button type="link" icon={<ArrowLeftOutlined />} onClick={handleBack}>
              {backLabel}
            </Button>
          )}
        </Card>
      </div>
    );
  }

  const getFieldValue = (key: string): any => {
    const keys = key.split('.');
    let value: any = entity;
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) return undefined;
    }
    return value;
  };

  // Header
  const renderDefaultHeader = () => {
    const displayTitle = props.title || getFieldValue(titleField) || '详情';
    const avatar = avatarField ? getFieldValue(avatarField) : undefined;
    const status = statusField ? getFieldValue(statusField) : undefined;
    const statusInfo = status !== undefined && statusConfig?.[String(status)];

    if (headerType === 'avatar') {
      return (
        <Space size="large" align="start">
          {avatar && <Avatar size={64} src={avatar} shape="square" />}
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 'bold' }}>{displayTitle}</h1>
            <Space style={{ marginTop: 8 }}>
              {statusInfo && <Tag color={statusInfo.color}>{statusInfo.text}</Tag>}
              {headerTags?.map((tag, i) => (
                <Tag key={i} color={tag.color}>
                  {tag.text ||
                    (tag.field ? getFieldValue(tag.field) : '') ||
                    (tag.render ? tag.render(entity) : '')}
                </Tag>
              ))}
            </Space>
          </div>
        </Space>
      );
    }

    return (
      <Space>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 'bold' }}>{displayTitle}</h1>
        {statusInfo && <Tag color={statusInfo.color}>{statusInfo.text}</Tag>}
        {headerTags?.map((tag, i) => (
          <Tag key={i} color={tag.color}>
            {tag.text ||
              (tag.field ? getFieldValue(tag.field) : '') ||
              (tag.render ? tag.render(entity) : '')}
          </Tag>
        ))}
      </Space>
    );
  };

  // Field rendering
  const renderField = (field: DetailFieldConfig) => {
    const value = getFieldValue(field.key);
    const fb = field.fallback ?? '-';

    if (field.render) {
      return field.render(value, entity);
    }

    if (value === null || value === undefined) {
      return fb;
    }

    switch (field.type) {
      case 'datetime':
        return new Date(value).toLocaleString('zh-CN');
      case 'date':
        return new Date(value).toLocaleDateString('zh-CN');
      case 'boolean': {
        const labels = field.booleanLabels || ['否', '是'];
        const colors = field.booleanColors || ['default', 'success'];
        const boolVal = !!value;
        return <Tag color={boolVal ? colors[1] : colors[0]}>{boolVal ? labels[1] : labels[0]}</Tag>;
      }
      case 'tag': {
        const color = field.tagColors?.[String(value)];
        const text = field.tagLabels?.[String(value)] || String(value);
        return <Tag color={color}>{text}</Tag>;
      }
      case 'number':
        return String(value);
      case 'currency': {
        const symbol = field.currencySymbol || '¥';
        const precision = field.currencyPrecision ?? 2;
        return `${symbol}${Number(value).toFixed(precision)}`;
      }
      case 'percent':
        return `${value}%`;
      case 'image':
        return (
          <img
            src={value}
            alt={field.label}
            style={{
              maxWidth: field.imageWidth || 200,
              maxHeight: field.imageHeight || 200,
              objectFit: 'cover',
            }}
          />
        );
      case 'relation': {
        const tryFields = field.relationFields || ['name', 'title', 'username'];
        for (const f of tryFields) {
          if (value?.[f]) return value[f];
        }
        return fb;
      }
      case 'email':
        return <a href={`mailto:${value}`}>{value}</a>;
      case 'url':
        return (
          <a href={value} target={field.urlTarget || '_blank'} rel="noreferrer">
            {value}
          </a>
        );
      case 'text':
      default:
        return value || fb;
    }
  };

  // Descriptions
  const renderDefaultDescriptions = () => (
    <Descriptions bordered={bordered} column={column}>
      {fields
        .filter((f) => !f.showCondition || f.showCondition(entity))
        .map((field) => (
          <Descriptions.Item
            key={field.key}
            label={field.label}
            span={field.span}
            labelStyle={field.labelStyle}
          >
            {renderField(field)}
          </Descriptions.Item>
        ))}
    </Descriptions>
  );

  // Statistics
  const renderStatistics = () => {
    if (statistics.length === 0) return null;

    return (
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {statistics.map((stat, index) => {
          const value = stat.value ?? (stat.field ? getFieldValue(stat.field) : 0);

          return (
            <Col span={6} key={index}>
              <Card>
                <Statistic
                  title={stat.title}
                  value={value}
                  prefix={stat.icon}
                  suffix={stat.suffix}
                  precision={stat.precision || 0}
                  valueStyle={{ color: stat.color }}
                />
              </Card>
            </Col>
          );
        })}
      </Row>
    );
  };

  // Actions
  const renderDefaultActions = () => {
    if (!actions || actions.length === 0) return null;

    return (
      <Space style={{ marginTop: 16 }}>
        {actions.map((action) => {
          const button = (
            <Button
              key={action.key}
              type={action.type || 'default'}
              icon={action.icon}
              danger={action.danger}
              onClick={() => action.handler?.(entity)}
            >
              {action.label}
            </Button>
          );

          const wrappedButton = action.confirm ? (
            <Popconfirm title={action.confirm} onConfirm={() => action.handler?.(entity)}>
              <Button type={action.type || 'default'} icon={action.icon} danger={action.danger}>
                {action.label}
              </Button>
            </Popconfirm>
          ) : (
            button
          );

          if (action.permission) {
            return (
              <PermissionGuard
                key={action.key}
                resource={action.permission.resource}
                action={action.permission.action}
              >
                {wrappedButton}
              </PermissionGuard>
            );
          }

          return <span key={action.key}>{wrappedButton}</span>;
        })}
      </Space>
    );
  };

  // Tab content
  const renderTabPane = (tab: DetailTabConfig) => {
    if (renderTabContent) {
      return renderTabContent(tab.key, entity);
    }

    if (tab.render) {
      return tab.render(entity);
    }

    if (tab.component) {
      return tab.component;
    }

    if (tab.key === 'info') {
      return renderDefaultDescriptions();
    }

    return <Empty description="暂无数据" />;
  };

  const resolvedCardExtra = typeof cardExtra === 'function' ? cardExtra(entity) : cardExtra;

  return (
    <div style={{ maxWidth, margin: '0 auto', padding: '24px' }}>
      <Card extra={resolvedCardExtra}>
        {!hideBackButton && (
          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
            style={{ marginBottom: 16 }}
          >
            {backLabel}
          </Button>
        )}

        {headerType !== 'none' && (renderHeader ? renderHeader(entity) : renderDefaultHeader())}

        {renderActions ? renderActions(entity) : renderDefaultActions()}

        {renderStatistics()}

        {tabs && tabs.length > 0 ? (
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabs.map((tab) => ({
              key: tab.key,
              label: tab.countField
                ? `${tab.label} (${getFieldValue(tab.countField) ?? 0})`
                : tab.label,
              children: renderTabPane(tab),
            }))}
          />
        ) : renderDescriptions ? (
          renderDescriptions(entity)
        ) : (
          renderDefaultDescriptions()
        )}
      </Card>
    </div>
  );
}
