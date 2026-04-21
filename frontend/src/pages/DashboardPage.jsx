import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Tag,
  Typography,
  Spin,
  Alert,
  Statistic,
  Badge,
  Button,
  Space,
} from 'antd';
import {
  CloudOutlined,
  CheckCircleOutlined,
  AppstoreOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { resources } from '../api';
import { useAuth } from '../components/AuthProvider';
import { useLanguage } from '../components/LanguageProvider';

const { Title, Text } = Typography;

const accountTypeColors = {
  direct_ea: 'blue',
  indirect_ea: 'purple',
  web_direct: 'green',
  csp: 'orange',
  unknown: 'default',
};

const accountTypeLabels = {
  direct_ea: 'Direct EA',
  indirect_ea: 'Indirect EA',
  web_direct: 'Web Direct',
  csp: 'CSP',
  unknown: 'Unknown',
};

const DashboardPage = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accountTypes, setAccountTypes] = useState({});
  const [resourceCounts, setResourceCounts] = useState({});
  const navigate = useNavigate();
  const { isPersonal, account } = useAuth();
  const { t } = useLanguage();

  const loadSubscriptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await resources.getSubscriptions();
      const subs = res.data.subscriptions;
      setSubscriptions(subs);

      // Load account types and resource counts in parallel
      const typePromises = subs.map((sub) =>
        resources
          .getAccountType(sub.subscription_id)
          .then((r) => [sub.subscription_id, r.data.account_type])
          .catch(() => [sub.subscription_id, 'unknown'])
      );
      const countPromises = subs.map((sub) =>
        resources
          .getResources(sub.subscription_id)
          .then((r) => [sub.subscription_id, r.data.total])
          .catch(() => [sub.subscription_id, 0])
      );

      const types = await Promise.all(typePromises);
      const counts = await Promise.all(countPromises);

      setAccountTypes(Object.fromEntries(types));
      setResourceCounts(Object.fromEntries(counts));
    } catch (err) {
      const msg = err?.response?.status === 401
        ? t('dashboard.accessError')
        : t('dashboard.loadError');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isPersonal) {
      loadSubscriptions();
    } else {
      setLoading(false);
    }
  }, [isPersonal]);

  const columns = [
    {
      title: t('dashboard.subscriptionName'),
      dataIndex: 'display_name',
      key: 'display_name',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: t('dashboard.subscriptionId'),
      dataIndex: 'subscription_id',
      key: 'subscription_id',
      render: (text) => <Text copyable={{ text }}>{text.slice(0, 13)}...</Text>,
    },
    {
      title: t('dashboard.state'),
      dataIndex: 'state',
      key: 'state',
      render: (state) => (
        <Badge
          status={state === 'Enabled' ? 'success' : 'warning'}
          text={state}
        />
      ),
    },
    {
      title: t('dashboard.accountType'),
      key: 'account_type',
      render: (_, record) => {
        const type = accountTypes[record.subscription_id];
        return type ? (
          <Tag color={accountTypeColors[type]}>
            {t(`dashboard.accountTypes.${type}`) || accountTypeLabels[type] || type}
          </Tag>
        ) : (
          <Spin size="small" />
        );
      },
    },
    {
      title: t('dashboard.resources'),
      key: 'resources',
      render: (_, record) => {
        const count = resourceCounts[record.subscription_id];
        return count !== undefined ? count : <Spin size="small" />;
      },
    },
  ];

  const totalResources = Object.values(resourceCounts).reduce(
    (sum, c) => sum + (c || 0),
    0
  );

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#e2e8f0' }}>
            {t('dashboard.title')}
          </Title>
          <div style={{ width: 40, height: 3, background: 'linear-gradient(90deg, #00d4ff, #7c3aed)', marginTop: 6, borderRadius: 2 }} />
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadSubscriptions} disabled={isPersonal}>
            {t('common.refresh')}
          </Button>
          <Button type="primary" onClick={() => navigate('/assessment')} disabled={isPersonal}>
            {t('dashboard.runAssessment')}
          </Button>
        </Space>
      </Row>

      {isPersonal && (
        <Alert
          message={t('dashboard.personalDetected')}
          description={t('dashboard.personalDescription', { username: account?.username || 'personal user' })}
          type="info"
          showIcon
          style={{ marginBottom: 16, background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.2)' }}
        />
      )}

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}
        />
      )}

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card className="stat-card" style={{ borderTop: '2px solid #00d4ff' }}>
            <Statistic
              title={t('common.subscriptions')}
              value={subscriptions.length}
              prefix={<CloudOutlined style={{ color: '#00d4ff' }} />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="stat-card" style={{ borderTop: '2px solid #7c3aed' }}>
            <Statistic
              title={t('common.totalResources')}
              value={totalResources}
              prefix={<AppstoreOutlined style={{ color: '#7c3aed' }} />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="stat-card" style={{ borderTop: '2px solid #10b981' }}>
            <Statistic
              title={t('dashboard.readyForAssessment')}
              value={subscriptions.filter((s) => s.state === 'Enabled').length}
              prefix={<CheckCircleOutlined style={{ color: '#10b981' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Card title={<span style={{ color: '#e2e8f0' }}>{t('dashboard.azureSubscriptions')}</span>}>
        <Table
          dataSource={subscriptions}
          columns={columns}
          rowKey="subscription_id"
          loading={loading}
          pagination={false}
          locale={{ emptyText: t('common.noData') }}
        />
      </Card>
    </div>
  );
};

export default DashboardPage;
