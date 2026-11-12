import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

/**
 * 401 登录过期页面
 * 当用户的认证 token 过期或无效时显示此页面
 */
export const SessionExpiredPage: React.FC = () => {
  const navigate = useNavigate();

  // 清除过期的认证信息
  const handleLogin = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f0f2f5',
      }}
    >
      <Result
        status="warning"
        title="登录已过期"
        subTitle="您的登录状态已过期，请重新登录后继续操作"
        extra={
          <Button type="primary" size="large" onClick={handleLogin}>
            重新登录
          </Button>
        }
      />
    </div>
  );
};

/**
 * 403 权限不足页面
 * 当用户没有权限访问某个资源时显示此页面
 */
export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f0f2f5',
      }}
    >
      <Result
        status="403"
        title="权限不足"
        subTitle="抱歉，您没有权限访问此页面"
        extra={
          <Button type="primary" onClick={() => navigate('/dashboard')}>
            返回首页
          </Button>
        }
      />
    </div>
  );
};

/**
 * 404 页面不存在
 */
export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f0f2f5',
      }}
    >
      <Result
        status="404"
        title="404"
        subTitle="抱歉，您访问的页面不存在"
        extra={
          <Button type="primary" onClick={() => navigate('/dashboard')}>
            返回首页
          </Button>
        }
      />
    </div>
  );
};
