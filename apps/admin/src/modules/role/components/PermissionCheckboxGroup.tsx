// apps/admin/src/modules/role/components/PermissionCheckboxGroup.tsx
import { useEffect, useState } from 'react';
import { Checkbox, Space, Spin, Alert } from 'antd';
import { getTrpcClient } from '../../../shared/trpc/trpcClient';

const trpcClient = getTrpcClient();

interface PermissionCheckboxGroupProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

interface Permission {
  id: string;
  resource: string;
  action: string;
  description?: string;
}

const RESOURCE_LABELS: Record<string, string> = {
  menu: '菜单权限',
  todo: '待办事项',
  user: '用户管理',
  role: '角色管理',
  handler: '核销员管理',
  admin: '管理员管理',
  merchant: '商户管理',
  merchantCategory: '商户分类管理',
  news: '新闻管理',
  couponTemplate: '券模板管理',
  order: '订单管理',
  settlement: '结算管理',
  settings: '系统设置',
};

const ACTION_LABELS: Record<string, string> = {
  // 菜单权限 action
  dashboard: '仪表盘',
  merchants: '商户管理',
  merchant_categories: '商户分类管理',
  coupon_templates: '券模板管理',
  orders: '订单管理',
  settlements: '结算管理',
  redemptions: '核销记录',
  users: '用户管理',
  news: '新闻管理',
  admins: '管理员管理',
  roles: '角色管理',
  // 标准 CRUD action
  create: '创建',
  read: '读取',
  update: '更新',
  delete: '删除',
  // 特殊 action
  manage_roles: '管理角色',
  adjust_stock: '调整库存',
  approve_refund: '审批退款',
  reject_refund: '拒绝退款',
  confirm: '确认结算',
  mark_paid: '标记已支付',
};

export const PermissionCheckboxGroup = ({
  selectedIds,
  onChange,
}: PermissionCheckboxGroupProps) => {
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPermissions = async () => {
      setLoading(true);
      try {
        // Call the getByResource endpoint to get grouped permissions
        const data = await (trpcClient as any).permission.getByResource.query();

        if (data) {
          // The data is already grouped by resource from the backend
          setGroupedPermissions(data);
        } else {
          setGroupedPermissions({});
        }
      } catch (err) {
        console.error('Failed to load permissions:', err);
        setError('加载权限失败');
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, []);

  const handleToggle = (permissionId: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedIds, permissionId]);
    } else {
      onChange(selectedIds.filter((id) => id !== permissionId));
    }
  };

  const handleToggleGroup = (resource: string, checked: boolean) => {
    const permissions = groupedPermissions[resource] || [];
    const permissionIds = permissions.map((p) => p.id);

    if (checked) {
      // Add all permissions from this group
      const newIds = [...new Set([...selectedIds, ...permissionIds])];
      onChange(newIds);
    } else {
      // Remove all permissions from this group
      onChange(selectedIds.filter((id) => !permissionIds.includes(id)));
    }
  };

  const isGroupFullySelected = (resource: string) => {
    const permissions = groupedPermissions[resource] || [];
    if (permissions.length === 0) return false;
    return permissions.every((p) => selectedIds.includes(p.id));
  };

  const isGroupPartiallySelected = (resource: string) => {
    const permissions = groupedPermissions[resource] || [];
    const selectedCount = permissions.filter((p) => selectedIds.includes(p.id)).length;
    return selectedCount > 0 && selectedCount < permissions.length;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 24 }}>
        <Spin tip="加载权限中..." />
      </div>
    );
  }

  if (error) {
    return <Alert message={error} type="error" showIcon />;
  }

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {Object.entries(groupedPermissions).map(([resource, permissions]) => {
          const fullySelected = isGroupFullySelected(resource);
          const partiallySelected = isGroupPartiallySelected(resource);

          return (
            <div key={resource}>
              <div style={{ marginBottom: 12, fontWeight: 'bold' }}>
                <Checkbox
                  indeterminate={partiallySelected}
                  checked={fullySelected}
                  onChange={(e) => handleToggleGroup(resource, e.target.checked)}
                >
                  {RESOURCE_LABELS[resource] || resource}
                </Checkbox>
              </div>
              <div style={{ marginLeft: 24 }}>
                {permissions.map((permission) => {
                  const label = ACTION_LABELS[permission.action] || permission.action;

                  return (
                    <Checkbox
                      key={permission.id}
                      checked={selectedIds.includes(permission.id)}
                      onChange={(e) => handleToggle(permission.id, e.target.checked)}
                      style={{ display: 'block', marginBottom: 8 }}
                    >
                      <Space size="small">
                        <span>{label}</span>
                        <span style={{ color: '#999' }}>
                          ({permission.resource}:{permission.action})
                        </span>
                        {permission.description && (
                          <span style={{ color: '#999', fontSize: 12 }}>
                            - {permission.description}
                          </span>
                        )}
                      </Space>
                    </Checkbox>
                  );
                })}
              </div>
            </div>
          );
        })}
      </Space>
    </div>
  );
};
