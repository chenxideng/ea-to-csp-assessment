import { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Tag,
  Typography,
  Spin,
  Alert,
  Progress,
  Row,
  Col,
  Select,
  Checkbox,
  Collapse,
  Space,
  Divider,
  List,
  Tooltip,
} from 'antd';
import {
  PlayCircleOutlined,
  FileTextOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { resources, assessment } from '../api';

const { Title, Text, Paragraph } = Typography;

const difficultyConfig = {
  easy: { color: '#52c41a', icon: <CheckCircleOutlined />, label: 'Easy Transfer' },
  moderate: { color: '#faad14', icon: <ExclamationCircleOutlined />, label: 'Moderate' },
  hard: { color: '#ff4d4f', icon: <CloseCircleOutlined />, label: 'Hard / Redeploy' },
  not_supported: { color: '#8c8c8c', icon: <WarningOutlined />, label: 'Not Supported' },
  needs_review: { color: '#1890ff', icon: <QuestionCircleOutlined />, label: 'Needs Review' },
};

const AssessmentPage = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedSubs, setSelectedSubs] = useState([]);
  const [overrides, setOverrides] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    resources
      .getSubscriptions()
      .then((res) => {
        setSubscriptions(res.data.subscriptions);
        setSelectedSubs(res.data.subscriptions.map((s) => s.subscription_id));
      })
      .catch(() => setError('Failed to load subscriptions'))
      .finally(() => setLoadingSubs(false));
  }, []);

  const runAssessment = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await assessment.run({
        subscription_ids: selectedSubs,
        account_type_overrides: overrides,
      });
      setResult(res.data);
    } catch (err) {
      setError('Assessment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resourceColumns = [
    {
      title: 'Resource',
      dataIndex: ['resource', 'name'],
      key: 'name',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Type',
      dataIndex: ['resource', 'type'],
      key: 'type',
      render: (text) => <Text style={{ fontSize: 12 }}>{text}</Text>,
      ellipsis: true,
    },
    {
      title: 'Location',
      dataIndex: ['resource', 'location'],
      key: 'location',
    },
    {
      title: 'Difficulty',
      dataIndex: 'difficulty',
      key: 'difficulty',
      filters: Object.entries(difficultyConfig).map(([key, val]) => ({
        text: val.label,
        value: key,
      })),
      onFilter: (value, record) => record.difficulty === value,
      render: (diff) => {
        const cfg = difficultyConfig[diff] || {};
        return (
          <Tag color={cfg.color} icon={cfg.icon}>
            {cfg.label}
          </Tag>
        );
      },
    },
    {
      title: 'Downtime',
      dataIndex: 'estimated_downtime',
      key: 'downtime',
      render: (text) => text || 'N/A',
    },
  ];

  if (loadingSubs) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Loading subscriptions...</p>
      </div>
    );
  }

  return (
    <div>
      <Title level={3}>CSP Migration Assessment</Title>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Configuration Panel */}
      {!result && (
        <Card title="Configure Assessment" style={{ marginBottom: 24 }}>
          <Row gutter={24}>
            <Col span={12}>
              <Title level={5}>Select Subscriptions</Title>
              <Checkbox.Group
                value={selectedSubs}
                onChange={setSelectedSubs}
                style={{ width: '100%' }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  {subscriptions.map((sub) => (
                    <Checkbox key={sub.subscription_id} value={sub.subscription_id}>
                      {sub.display_name}
                      <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                        ({sub.subscription_id.slice(0, 8)}...)
                      </Text>
                    </Checkbox>
                  ))}
                </Space>
              </Checkbox.Group>
            </Col>
            <Col span={12}>
              <Title level={5}>
                Override Account Type{' '}
                <Tooltip title="Override the auto-detected account type if needed">
                  <QuestionCircleOutlined style={{ fontSize: 14 }} />
                </Tooltip>
              </Title>
              {subscriptions
                .filter((s) => selectedSubs.includes(s.subscription_id))
                .map((sub) => (
                  <div key={sub.subscription_id} style={{ marginBottom: 12 }}>
                    <Text>{sub.display_name}</Text>
                    <Select
                      placeholder="Auto-detect"
                      allowClear
                      style={{ width: '100%', marginTop: 4 }}
                      onChange={(val) =>
                        setOverrides((prev) => ({
                          ...prev,
                          [sub.subscription_id]: val,
                        }))
                      }
                      options={[
                        { label: 'Auto-detect', value: undefined },
                        { label: 'Direct EA', value: 'direct_ea' },
                        { label: 'Indirect EA', value: 'indirect_ea' },
                        { label: 'Web Direct / PAYG', value: 'web_direct' },
                      ]}
                    />
                  </div>
                ))}
            </Col>
          </Row>
          <Divider />
          <Button
            type="primary"
            size="large"
            icon={<PlayCircleOutlined />}
            loading={loading}
            disabled={selectedSubs.length === 0}
            onClick={runAssessment}
          >
            Run Assessment
          </Button>
        </Card>
      )}

      {/* Results */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>
            Scanning resources and generating assessment...
          </p>
        </div>
      )}

      {result && !loading && (
        <>
          {/* Summary */}
          <Card style={{ marginBottom: 24 }}>
            <Row gutter={16} align="middle">
              <Col span={6} style={{ textAlign: 'center' }}>
                <Progress
                  type="circle"
                  percent={result.summary.overall_readiness_score}
                  format={(pct) => `${pct}%`}
                  strokeColor={{
                    '0%': '#ff4d4f',
                    '50%': '#faad14',
                    '100%': '#52c41a',
                  }}
                  size={140}
                />
                <div style={{ marginTop: 8 }}>
                  <Text strong>Readiness Score</Text>
                </div>
              </Col>
              <Col span={18}>
                <Row gutter={12}>
                  {[
                    { key: 'easy_count', ...difficultyConfig.easy },
                    { key: 'moderate_count', ...difficultyConfig.moderate },
                    { key: 'hard_count', ...difficultyConfig.hard },
                    { key: 'not_supported_count', ...difficultyConfig.not_supported },
                    { key: 'needs_review_count', ...difficultyConfig.needs_review },
                  ].map((item) => (
                    <Col span={4} key={item.key}>
                      <Card
                        size="small"
                        style={{ textAlign: 'center', borderColor: item.color }}
                      >
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: item.color }}>
                          {result.summary[item.key]}
                        </div>
                        <div style={{ fontSize: 11, color: '#666' }}>{item.label}</div>
                      </Card>
                    </Col>
                  ))}
                </Row>
                <div style={{ marginTop: 16 }}>
                  <Text>
                    <strong>{result.summary.total_resources}</strong> resources across{' '}
                    <strong>{result.summary.total_subscriptions}</strong> subscription(s)
                  </Text>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Key Findings */}
          <Card title="Key Findings" style={{ marginBottom: 24 }}>
            <List
              dataSource={result.summary.key_findings}
              renderItem={(item) => (
                <List.Item>
                  <Text>{item}</Text>
                </List.Item>
              )}
            />
          </Card>

          {/* Per-subscription details */}
          <Collapse
            defaultActiveKey={result.subscriptions.map((_, i) => String(i))}
            style={{ marginBottom: 24 }}
            items={result.subscriptions.map((subAssessment, idx) => ({
              key: String(idx),
              label: (
                <Space>
                  <Text strong>
                    {subAssessment.subscription.display_name}
                  </Text>
                  <Tag color="blue">
                    {subAssessment.account_type.replace('_', ' ').toUpperCase()}
                  </Tag>
                  <Text type="secondary">
                    {subAssessment.total_resources} resources
                  </Text>
                </Space>
              ),
              children: (
                <Table
                  dataSource={subAssessment.resource_assessments}
                  columns={resourceColumns}
                  rowKey={(r) => r.resource.id}
                  size="small"
                  pagination={{ pageSize: 20 }}
                  expandable={{
                    expandedRowRender: (record) => (
                      <div style={{ padding: '8px 0' }}>
                        <Paragraph>
                          <strong>Reason:</strong> {record.reason}
                        </Paragraph>
                        {record.recommendations.length > 0 && (
                          <>
                            <strong>Recommendations:</strong>
                            <ul>
                              {record.recommendations.map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          </>
                        )}
                        {record.risks.length > 0 && (
                          <>
                            <strong style={{ color: '#ff4d4f' }}>Risks:</strong>
                            <ul>
                              {record.risks.map((r, i) => (
                                <li key={i} style={{ color: '#ff4d4f' }}>
                                  {r}
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    ),
                  }}
                />
              ),
            }))}
          />

          {/* Actions */}
          <Card>
            <Space>
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                onClick={() => navigate('/report')}
              >
                View Full Report
              </Button>
              <Button onClick={() => setResult(null)}>Run New Assessment</Button>
            </Space>
          </Card>
        </>
      )}
    </div>
  );
};

export default AssessmentPage;
