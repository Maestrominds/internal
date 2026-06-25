import api from './axios';

export const getReports = (params = {}) =>
  api.get('/reports', { params });

export const getClients = () => api.get('/reports/clients');

export const getReportById = (id) => api.get(`/reports/${id}`);

export const createReport = (formData) =>
  api.post('/reports', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const updateReport = (id, formData) =>
  api.put(`/reports/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const exportClientExcel = (params = {}) =>
  api.get('/reports/export', { params, responseType: 'blob' });

export const downloadLedgerPdf = (params = {}) =>
  api.get('/reports/ledger-pdf', { params, responseType: 'blob' });

