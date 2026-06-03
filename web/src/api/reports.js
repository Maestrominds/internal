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
