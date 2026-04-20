import axios from 'axios';
import { getMsalInstanceSync, managementRequest } from './authConfig';

const MSA_TENANT_ID = '9188040d-6c67-4c5b-b112-36a304b66dad';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use(async (config) => {
  const instance = getMsalInstanceSync();
  if (!instance) return config;

  const accounts = instance.getAllAccounts();
  if (accounts.length === 0) return config;

  const account = accounts[0];
  const tid = account.tenantId || account.idTokenClaims?.tid;
  // Personal accounts cannot access Azure Management API
  if (tid === MSA_TENANT_ID) return config;

  try {
    const resp = await instance.acquireTokenSilent({
      ...managementRequest,
      account,
    });
    config.headers.Authorization = `Bearer ${resp.accessToken}`;
  } catch {
    // Don't popup here — let pages handle errors
  }
  return config;
});

export const resources = {
  getSubscriptions: () => api.get('/resources/subscriptions'),
  getResources: (subId) => api.get(`/resources/subscriptions/${subId}/resources`),
  getAccountType: (subId) => api.get(`/resources/subscriptions/${subId}/account-type`),
};

export const assessment = {
  run: (body) => api.post('/assessment/run', body),
  assessSingle: (subId, body) => api.post(`/assessment/assess-single/${subId}`, body),
};

export const report = {
  getHtml: (body) => api.post('/report/html', body),
  getPdf: (body) => api.post('/report/pdf', body, { responseType: 'blob' }),
  getJson: (body) => api.post('/report/json', body),
};

export default api;
