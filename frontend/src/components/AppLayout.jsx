import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Typography, Space, Button } from 'antd';
import {
  DashboardOutlined,
  AuditOutlined,
  FileTextOutlined,
  UserOutlined,
  LogoutOutlined,
  CloudServerOutlined,
  UnorderedListOutlined,
  MenuOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useAuth } from './AuthProvider';
import { useLanguage } from './LanguageProvider';

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;

const AppLayout = () => {
  const { account, logout } = useAuth();
  const { locale, setLocale, t, languageOptions } = useLanguage();
  const isMobile = window.innerWidth <= 768;
  const [collapsed, setCollapsed] = useState(isMobile);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: t('layout.dashboard') },
    { key: '/resources', icon: <UnorderedListOutlined />, label: t('layout.resources') },
    { key: '/assessment', icon: <AuditOutlined />, label: t('layout.assessment') },
    { key: '/report', icon: <FileTextOutlined />, label: t('layout.reports') },
  ];

  const userMenu = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: t('layout.logout'),
        onClick: handleLogout,
      },
    ],
  };

  const languageMenu = {
    items: languageOptions.map((option) => ({
      key: option.value,
      label: option.label,
      onClick: () => setLocale(option.value),
    })),
  };

  const currentLanguageLabel = languageOptions.find((option) => option.value === locale)?.label || locale;

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
          ...(isMobile && !collapsed
            ? {
                position: 'fixed',
                zIndex: 200,
                height: '100vh',
                boxShadow: '4px 0 20px rgba(0,0,0,0.5)',
              }
            : {}),
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
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(124,58,237,0.15))',
              border: '1px solid rgba(0,212,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CloudServerOutlined style={{ fontSize: 18, color: '#00d4ff' }} />
          </div>
          {!collapsed && (
            <Text strong style={{ color: '#00d4ff', marginLeft: 10, fontSize: 14, letterSpacing: '0.5px' }}>
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
      <Layout style={{ background: '#0a0e1a', minHeight: '100vh' }}>
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
          {isMobile ? (
            <Button
              type="text"
              icon={<MenuOutlined style={{ color: '#00d4ff', fontSize: 20 }} />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ padding: '4px 8px' }}
            />
          ) : (
            <div />
          )}
          <Space size="middle">
            <Dropdown menu={languageMenu} placement="bottomRight" trigger={['click']}>
              <Button icon={<GlobalOutlined />}>
                {isMobile ? currentLanguageLabel.slice(0, 2) : currentLanguageLabel}
              </Button>
            </Dropdown>
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
          </Space>
        </Header>
        <Content className="tech-grid" style={{ margin: 24, flex: 1 }}>
          <Outlet />
        </Content>
        <Footer style={{ textAlign: 'center', color: '#64748b', background: 'transparent', borderTop: '1px solid rgba(0,212,255,0.08)' }}>
          {t('common.designedBy')}
        </Footer>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
