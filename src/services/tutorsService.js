import { apiClient } from './apiClient.js';

export const getTutors = ({ signal } = {}) => apiClient.get('Tutors', { signal });
export const getTutorSubjects = (tutorId, { signal } = {}) =>
  apiClient.get(`Tutors/${encodeURIComponent(tutorId)}/subjects`, { signal });
