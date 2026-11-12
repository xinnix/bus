// apps/admin/src/modules/user/components/RoleAssignmentModal.tsx
import { useState, useEffect } from 'react';
import { Modal, Select, Tag, Space, List, Button, Spin, App } from 'antd';
import { useList, useUpdate } from '@refinedev/core';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';

interface Role {
  id: string;
  name: string;
  slug: string;
  level: number;
  description?: string;
  assignedAt?: Date;
}

interface User {
  id: string;
  username: string;
  roles: Role[];
}

interface RoleAssignmentModalProps {
  open: boolean;
  user: User | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export const RoleAssignmentModal = ({
  open,
  user,
  onCancel,
  onSuccess,
}: RoleAssignmentModalProps) => {
  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();

  const { result: allRolesResult, query: rolesQuery } = useList<Role>({
    resource: 'role',
    pagination: { pageSize: 100 },
    queryOptions: {
      enabled: open,
    },
  });

  const { mutate: assignRole } = useUpdate();
  const { mutate: removeRole } = useUpdate();

  const allRoles = allRolesResult?.data || [];
  const userRoles = user?.roles || [];
  const userRoleIds = userRoles.map((r) => r.id);

  // Available roles are those not already assigned to the user
  const availableRoles = allRoles.filter((role) => !userRoleIds.includes(role.id));

  const handleAssignRole = () => {
    if (!user || !selectedRoleId) {
      message.warning('请选择角色');
      return;
    }

    setLoading(true);

    assignRole(
      {
        resource: 'user',
        id: user.id,
        values: {
          userId: user.id,
          roleId: selectedRoleId,
        },
        meta: {
          method: 'assignRole',
        },
      },
      {
        onSuccess: () => {
          message.success('角色分配成功');
          setSelectedRoleId(undefined);
          onSuccess();
        },
        onError: () => {
          message.error('角色分配失败');
        },
        onSettled: () => {
          setLoading(false);
        },
      },
    );
  };

  const handleRemoveRole = (roleId: string) => {
    if (!user) return;

    setLoading(true);

    removeRole(
      {
        resource: 'user',
        id: user.id,
        values: {
          userId: user.id,
          roleId: roleId,
        },
        meta: {
          method: 'removeRole',
        },
      },
      {
        onSuccess: () => {
          message.success('角色移除成功');
          onSuccess();
        },
        onError: () => {
          message.error('角色移除失败');
        },
        onSettled: () => {
          setLoading(false);
        },
      },
    );
  };

  useEffect(() => {
    if (open) {
      rolesQuery.refetch();
    }
  }, [open]);

  return (
    <Modal
      title={`管理用户角色 - ${user?.username || ''}`}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <Spin spinning={loading}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* Assign new role */}
          <div>
            <div style={{ marginBottom: 8, fontWeight: 'bold' }}>分配角色</div>
            <Space.Compact style={{ width: '100%' }}>
              <Select
                placeholder="选择要分配的角色"
                value={selectedRoleId}
                onChange={setSelectedRoleId}
                style={{ flex: 1 }}
                options={availableRoles.map((role) => ({
                  label: (
                    <Space>
                      <span>{role.name}</span>
                      <Tag
                        color={role.level < 50 ? 'red' : role.level < 100 ? 'orange' : 'default'}
                      >
                        {role.slug}
                      </Tag>
                    </Space>
                  ),
                  value: role.id,
                }))}
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAssignRole}
                disabled={!selectedRoleId}
              >
                分配
              </Button>
            </Space.Compact>
          </div>

          {/* Current roles */}
          <div>
            <div style={{ marginBottom: 8, fontWeight: 'bold' }}>当前角色</div>
            <List
              dataSource={userRoles}
              renderItem={(role) => (
                <List.Item
                  actions={[
                    <Button
                      key="remove"
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveRole(role.id)}
                    >
                      移除
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <span>{role.name}</span>
                        <Tag
                          color={role.level < 50 ? 'red' : role.level < 100 ? 'orange' : 'default'}
                        >
                          {role.slug}
                        </Tag>
                      </Space>
                    }
                    description={role.description || `层级: ${role.level}`}
                  />
                </List.Item>
              )}
              locale={{ emptyText: '暂无角色' }}
            />
          </div>
        </Space>
      </Spin>
    </Modal>
  );
};
