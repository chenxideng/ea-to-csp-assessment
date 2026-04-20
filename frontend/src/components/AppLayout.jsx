import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Typography,
  Space,
  Button,
} from 'antd';
import {
  DashboardOutlined,
  AuditOutlined,
  FileTextOutlined,
  UserOutlined,
  LogoutOutlined,
  CloudServerOutlined,
  UnorderedListOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { useAuth } from './AuthProvider';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const AppLayout = () => {
  const { account, logout } = useAuth();
  const isMobile = window.innerWidth <= 768;
  const [collapsed, setCollapsed] = useState(isMobile);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/resources',
      icon: <UnorderedListOutlined />,
      label: 'Resources',
    },
    {
      key: '/assessment',
      icon: <AuditOutlined />,
      label: 'Assessment',
    },
    {
      key: '/report',
      icon: <FileTextOutlined />,
      label: 'Reports',
    },
  ];

  const userMenu = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Logout',
        onClick: handleLogout,
      },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="md"
        collapsedWidth={isMobile ? 0 : 80}
        trigger={isMobile ? null : undefined}
        style={{
          background: 'linear-gradient(180deg, #0d1225 0%, #111827 100%)',
          borderRight: '1px solid rgba(0,212,255,0.1)',
          ...(isMobile && !collapsed ? {
            position: 'fixed', zIndex: 200, height: '100vh',
            boxShadow: '4px 0 20px rgba(0,0,0,0.5)',
          } : {}),
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid rgba(0,212,255,0.1)',
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(124,58,237,0.15))',
            border: '1px solid rgba(0,212,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CloudServerOutlined style={{ fontSize: 18, color: '#00d4ff' }} />
          </div>
          {!collapsed && (
            <Text
              strong
              style={{ color: '#00d4ff', marginLeft: 10, fontSize: 14, letterSpacing: '0.5px' }}
            >
              EA→CSP
            </Text>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => {
            navigate(key);
            if (isMobile) setCollapsed(true);
          }}
          style={{ background: 'transparent', borderRight: 0 }}
        />
      </Sider>
      <Layout style={{ background: '#0a0e1a' }}>
        <Header
          style={{
            background: 'rgba(17, 24, 39, 0.8)',
            backdropFilter: 'blur(10px)',
            padding: '0 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(0,212,255,0.1)',
          }}
        >
          {isMobile && (
            <Button
              type="text"
              icon={<MenuOutlined style={{ color: '#00d4ff', fontSize: 20 }} />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ padding: '4px 8px' }}
            />
          )}
          {!isMobile && <div />}
          {account && (
            <Dropdown menu={userMenu} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar
                  icon={<UserOutlined />}
                  style={{
                    background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
                    border: '2px solid rgba(0,212,255,0.3)',
                  }}
                />
                <Text style={{ color: '#e2e8f0' }}>{account.name || account.username}</Text>
              </Space>
            </Dropdown>
          )}
        </Header>
        <Content className="tech-grid" style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
