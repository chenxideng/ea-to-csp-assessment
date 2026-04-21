import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Typography,
  Alert,
  Button,
  Space,
  Input,
  Select,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  ReloadOutlined,
  SearchOutlined,
  CloudOutlined,
  AppstoreOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { resources } from '../api';
import { useAuth } from '../components/AuthProvider';
import { useLanguage } from '../components/LanguageProvider';

const { Title, Text } = Typography;
const { Option } = Select;

const ResourcesPage = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [allResources, setAllResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterSub, setFilterSub] = useState('all');
  const { isPersonal, account } = useAuth();
  const { t } = useLanguage();

  const loadAllResources = async () => {
    setLoading(true);
    setError(null);
    try {
      const subRes = await resources.getSubscriptions();
      const subs = subRes.data.subscriptions;
      setSubscriptions(subs);

      const resourcePromises = subs.map((sub) =>
        resources
          .getResources(sub.subscription_id)
          .then((r) =>
            r.data.resources.map((res) => ({
              ...res,
              subscription_name: sub.display_name,
              subscription_id: sub.subscription_id,
            }))
          )
          .catch(() => [])
      );

      const results = await Promise.all(resourcePromises);
      setAllResources(results.flat());
    } catch (err) {
      const msg =
        err?.response?.status === 401
          ? t('resourcesPage.accessError')
          : t('resourcesPage.loadError');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isPersonal) {
      loadAllResources();
    } else {
      setLoading(false);
    }
  }, [isPersonal]);

  // Get unique resource types for filter
  const resourceTypes = [
    ...new Set(allResources.map((r) => r.resource_type)),
  ].sort();

  // Filter resources
  const filteredResources = allResources.filter((r) => {
    const matchesSearch =
      !searchText ||
      r.name.toLowerCase().includes(searchText.toLowerCase()) ||
      r.resource_type.toLowerCase().includes(searchText.toLowerCase()) ||
      r.resource_group.toLowerCase().includes(searchText.toLowerCase());
    const matchesType =
      filterType === 'all' || r.resource_type === filterType;
    const matchesSub =
      filterSub === 'all' || r.subscription_id === filterSub;
    return matchesSearch && matchesType && matchesSub;
  });

  const exportCsv = () => {
    const headers = [
      t('resourcesPage.resourceName'),
      t('resourcesPage.type'),
      t('resourcesPage.resourceGroup'),
      t('resourcesPage.location'),
      t('resourcesPage.subscription'),
      t('dashboard.subscriptionId'),
    ];
    const rows = filteredResources.map((r) => [
      r.name,
      r.resource_type,
      r.resource_group,
      r.location,
      r.subscription_name,
      r.subscription_id,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = t('resourcesPage.csvName');
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    {
      title: t('resourcesPage.resourceName'),
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: t('resourcesPage.type'),
      dataIndex: 'resource_type',
      key: 'resource_type',
      sorter: (a, b) => a.resource_type.localeCompare(b.resource_type),
      render: (text) => {
        const shortType = text.split('/').pop();
        return <Tag color="blue">{shortType}</Tag>;
      },
    },
    {
      title: t('resourcesPage.resourceGroup'),
      dataIndex: 'resource_group',
      key: 'resource_group',
      sorter: (a, b) => a.resource_group.localeCompare(b.resource_group),
    },
    {
      title: t('resourcesPage.location'),
      dataIndex: 'location',
      key: 'location',
      sorter: (a, b) => a.location.localeCompare(b.location),
      render: (text) => <Tag>{text}</Tag>,
    },
    {
      title: t('resourcesPage.subscription'),
      dataIndex: 'subscription_name',
      key: 'subscription_name',
      sorter: (a, b) =>
        a.subscription_name.localeCompare(b.subscription_name),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#e2e8f0' }}>
            {t('resourcesPage.title')}
          </Title>
          <div style={{ width: 40, height: 3, background: 'linear-gradient(90deg, #00d4ff, #7c3aed)', marginTop: 6, borderRadius: 2 }} />
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadAllResources} disabled={isPersonal}>
            {t('common.refresh')}
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={exportCsv}
            disabled={filteredResources.length === 0}
          >
            {t('common.exportCsv')}
          </Button>
        </Space>
      </Row>

      {isPersonal && (
        <Alert
          message={t('resourcesPage.personalTitle')}
          description={t('resourcesPage.personalDescription', { username: account?.username || 'personal user' })}
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
              value={allResources.length}
              prefix={<AppstoreOutlined style={{ color: '#7c3aed' }} />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="stat-card" style={{ borderTop: '2px solid #10b981' }}>
            <Statistic
              title={t('common.resourceTypes')}
              value={resourceTypes.length}
              prefix={<AppstoreOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Space style={{ marginBottom: 16, width: '100%' }} wrap>
          <Input
            placeholder={t('resourcesPage.searchPlaceholder')}
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 320 }}
            allowClear
          />
          <Select
            value={filterSub}
            onChange={setFilterSub}
            style={{ width: 250 }}
          >
            <Option value="all">{t('common.allSubscriptions')}</Option>
            {subscriptions.map((s) => (
              <Option key={s.subscription_id} value={s.subscription_id}>
                {s.display_name}
              </Option>
            ))}
          </Select>
          <Select
            value={filterType}
            onChange={setFilterType}
            style={{ width: 300 }}
            showSearch
            optionFilterProp="children"
          >
            <Option value="all">{t('common.allResourceTypes')}</Option>
            {resourceTypes.map((t) => (
              <Option key={t} value={t}>
                {t.split('/').pop()}
              </Option>
            ))}
          </Select>
        </Space>

        <Table
          dataSource={filteredResources}
          columns={columns}
          rowKey={(r) => `${r.subscription_id}-${r.name}-${r.resource_type}`}
          loading={loading}
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100', '200'],
            showTotal: (total) => t('resourcesPage.totalLabel', { count: total }),
          }}
          scroll={{ x: 900 }}
          size="middle"
          locale={{ emptyText: t('common.noData') }}
        />
      </Card>
    </div>
  );
};

export default ResourcesPage;
