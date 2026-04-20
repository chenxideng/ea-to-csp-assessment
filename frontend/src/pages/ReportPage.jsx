import { useState } from 'react';
import {
  Card,
  Button,
  Typography,
  Space,
  Spin,
  Alert,
  Radio,
  message,
} from 'antd';
import {
  FilePdfOutlined,
  Html5Outlined,
  DownloadOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { report } from '../api';

const { Title, Paragraph } = Typography;

const ReportPage = () => {
  const [format, setFormat] = useState('html');
  const [loading, setLoading] = useState(false);
  const [htmlContent, setHtmlContent] = useState(null);
  const [error, setError] = useState(null);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    setHtmlContent(null);

    try {
      if (format === 'html') {
        const res = await report.getHtml();
        setHtmlContent(res.data);
      } else if (format === 'pdf') {
        const res = await report.getPdf();
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'csp-assessment-report.pdf';
        link.click();
        window.URL.revokeObjectURL(url);
        message.success('PDF report downloaded');
      } else {
        const res = await report.getJson();
        const blob = new Blob([JSON.stringify(res.data, null, 2)], {
          type: 'application/json',
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'csp-assessment-report.json';
        link.click();
        window.URL.revokeObjectURL(url);
        message.success('JSON report downloaded');
      }
    } catch (err) {
      setError('Failed to generate report. Run an assessment first.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={3}>Generate Report</Title>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      <Card style={{ marginBottom: 24 }}>
        <Paragraph>
          Generate a comprehensive migration assessment report in your preferred
          format. The report includes readiness scores, per-resource analysis,
          risk assessments, and actionable recommendations.
        </Paragraph>

        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Title level={5}>Report Format</Title>
            <Radio.Group
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              optionType="button"
              buttonStyle="solid"
              size="large"
            >
              <Radio.Button value="html">
                <Html5Outlined /> HTML Preview
              </Radio.Button>
              <Radio.Button value="pdf">
                <FilePdfOutlined /> Download PDF
              </Radio.Button>
              <Radio.Button value="json">
                <FileTextOutlined /> Download JSON
              </Radio.Button>
            </Radio.Group>
          </div>

          <Button
            type="primary"
            size="large"
            icon={<DownloadOutlined />}
            loading={loading}
            onClick={generateReport}
          >
            Generate Report
          </Button>
        </Space>
      </Card>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>Generating report...</p>
        </div>
      )}

      {htmlContent && (
        <Card title="Report Preview" style={{ marginBottom: 24 }}>
          <div
            dangerouslySetInnerHTML={{ __html: htmlContent }}
            style={{ maxHeight: '80vh', overflow: 'auto' }}
          />
        </Card>
      )}
    </div>
  );
};

export default ReportPage;
