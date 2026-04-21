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
import { useLanguage } from '../components/LanguageProvider';

const { Title, Paragraph } = Typography;

const ReportPage = () => {
  const [format, setFormat] = useState('html');
  const [loading, setLoading] = useState(false);
  const [htmlContent, setHtmlContent] = useState(null);
  const [error, setError] = useState(null);
  const { t } = useLanguage();

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
        link.download = t('reportPage.pdfName');
        link.click();
        window.URL.revokeObjectURL(url);
        message.success(t('reportPage.successPdf'));
      } else {
        const res = await report.getJson();
        const blob = new Blob([JSON.stringify(res.data, null, 2)], {
          type: 'application/json',
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = t('reportPage.jsonName');
        link.click();
        window.URL.revokeObjectURL(url);
        message.success(t('reportPage.successJson'));
      }
    } catch (err) {
      setError(t('reportPage.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={3}>{t('reportPage.title')}</Title>

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
          {t('reportPage.description')}
        </Paragraph>

        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Title level={5}>{t('reportPage.reportFormat')}</Title>
            <Radio.Group
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              optionType="button"
              buttonStyle="solid"
              size="large"
            >
              <Radio.Button value="html">
                <Html5Outlined /> {t('reportPage.htmlPreview')}
              </Radio.Button>
              <Radio.Button value="pdf">
                <FilePdfOutlined /> {t('reportPage.downloadPdf')}
              </Radio.Button>
              <Radio.Button value="json">
                <FileTextOutlined /> {t('reportPage.downloadJson')}
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
            {t('reportPage.generate')}
          </Button>
        </Space>
      </Card>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>{t('reportPage.generating')}</p>
        </div>
      )}

      {htmlContent && (
        <Card title={t('reportPage.preview')} style={{ marginBottom: 24 }}>
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
