import api from './axios';

export const getManagers = () => api.get('/managers');

export const addManager = (name, email, password) =>
  api.post('/managers', { name, email, password });

export const deleteManager = (id) => api.delete(`/managers/${id}`);

export const resetManagerPassword = (id) =>
  api.post(`/managers/${id}/reset-password`);
