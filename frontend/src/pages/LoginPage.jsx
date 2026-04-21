import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Typography, Space, Card, Alert, Dropdown } from 'antd';
import { LoginOutlined, CloudServerOutlined, GlobalOutlined } from '@ant-design/icons';
import { useAuth } from '../components/AuthProvider';
import { useLanguage } from '../components/LanguageProvider';

const { Title, Paragraph, Text } = Typography;

const LoginPage = () => {
  const { login, isAuthenticated } = useAuth();
  const { locale, setLocale, t, languageOptions } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const languageMenu = {
    items: languageOptions.map((option) => ({
      key: option.value,
      label: option.label,
      onClick: () => setLocale(option.value),
    })),
  };

  const currentLanguageLabel = languageOptions.find((option) => option.value === locale)?.label || locale;

  if (isAuthenticated) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await login();
      navigate('/dashboard');
    } catch (err) {
      if (err.errorCode !== 'user_cancelled') {
        setError(err.message || t('login.loginFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="tech-grid"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 0%, #1a1040 0%, #0a0e1a 60%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated background orbs */}
      <div className="bg-orb" style={{
        position: 'absolute', top: '-20%', left: '-10%', width: 500, height: 500,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)',
        filter: 'blur(40px)', animation: 'pulse-glow 4s ease-in-out infinite',
      }} />
      <div className="bg-orb" style={{
        position: 'absolute', bottom: '-20%', right: '-10%', width: 400, height: 400,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
        filter: 'blur(40px)', animation: 'pulse-glow 5s ease-in-out infinite',
      }} />

      <Card
        style={{
          width: '100%',
          maxWidth: 500,
          margin: '0 16px',
          textAlign: 'center',
          borderRadius: 16,
          background: 'rgba(26, 31, 53, 0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 212, 255, 0.2)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(0,212,255,0.1)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <Dropdown menu={languageMenu} placement="bottomRight" trigger={['click']}>
              <Button icon={<GlobalOutlined />} aria-label={t('languageLabel')}>
                {t('languageLabel')}: {currentLanguageLabel}
              </Button>
            </Dropdown>
          </div>

          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(0,212,255,0.1), rgba(124,58,237,0.1))',
            border: '2px solid rgba(0,212,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto',
          }}>
            <CloudServerOutlined style={{ fontSize: 40, color: '#00d4ff' }} />
          </div>
          <div>
            <Title level={2} style={{ marginBottom: 4, color: '#e2e8f0' }}>
              {t('login.title')}
            </Title>
            <div style={{ width: 60, height: 3, background: 'linear-gradient(90deg, #00d4ff, #7c3aed)', margin: '8px auto 0', borderRadius: 2 }} />
          </div>
          <Paragraph style={{ color: '#94a3b8', fontSize: 14 }}>
            {t('login.description')}
          </Paragraph>
          <div
            style={{
              background: 'rgba(0, 212, 255, 0.03)',
              padding: 16,
              borderRadius: 10,
              textAlign: 'left',
              border: '1px solid rgba(0, 212, 255, 0.1)',
            }}
          >
            <Text strong style={{ color: '#00d4ff', fontSize: 13 }}>{t('login.supportedAccountTypes')}</Text>
            <ul style={{ marginTop: 8, paddingLeft: 20, color: '#94a3b8', fontSize: 13 }}>
              <li>{t('login.directEa')}</li>
              <li>{t('login.indirectEa')}</li>
              <li>{t('login.webDirect')}</li>
            </ul>
          </div>
          {error && (
            <Alert message={error} type="error" showIcon closable />
          )}
          <Button
            type="primary"
            size="large"
            icon={<LoginOutlined />}
            onClick={handleLogin}
            loading={loading}
            style={{
              width: '100%',
              height: 52,
              fontSize: 16,
              borderRadius: 10,
              fontWeight: 600,
              letterSpacing: '0.5px',
            }}
          >
            {t('login.signIn')}
          </Button>
          <Text style={{ fontSize: 12, color: '#64748b' }}>
            {t('login.secureSso')}
            <br />
            {t('login.credentialsHandled')}
          </Text>
        </Space>
      </Card>

      <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, textAlign: 'center', color: '#64748b', fontSize: 12, zIndex: 2 }}>
        {t('common.designedBy')}
      </div>
    </div>
  );
};

export default LoginPage;
