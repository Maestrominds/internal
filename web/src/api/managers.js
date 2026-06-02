import api from './axios';

export const getManagers = () => api.get('/managers');

export const addManager = (name, email) =>
  api.post('/managers', { name, email });

export const deleteManager = (id) => api.delete(`/managers/${id}`);

export const resetManagerPassword = (id) =>
  api.post(`/managers/${id}/reset-password`);
