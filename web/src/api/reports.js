import api from './axios';

export const getReports = (search = '') =>
  api.get('/reports', { params: search ? { search } : {} });

export const getReportById = (id) => api.get(`/reports/${id}`);

export const createReport = (formData) =>
  api.post('/reports', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
