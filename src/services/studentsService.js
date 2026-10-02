import { apiClient } from './apiClient.js';

export const getStudents = ({ signal } = {}) => apiClient.get('Students', { signal });
