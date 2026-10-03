import { apiClient } from './apiClient.js';

export const getTutors = ({ search, isActive, signal } = {}) =>
  apiClient.get('Tutors', { query: { search, isActive }, signal });

export const getTutor = (tutorId, { signal } = {}) =>
  apiClient.get(`Tutors/${encodeURIComponent(tutorId)}`, { signal });

export const getTutorSubjects = (tutorId, { signal } = {}) =>
  apiClient.get(`Tutors/${encodeURIComponent(tutorId)}/subjects`, { signal });

export const getTutorSchedule = (tutorId, weekStart, { signal } = {}) =>
  apiClient.get(`Tutors/${encodeURIComponent(tutorId)}/schedule`, {
    query: { weekStart },
    signal,
  });

export const createTutor = payload => apiClient.post('Tutors', payload);

export const updateTutor = (tutorId, payload) =>
  apiClient.put(`Tutors/${encodeURIComponent(tutorId)}`, payload);

export const deactivateTutor = tutorId =>
  apiClient.patch(`Tutors/${encodeURIComponent(tutorId)}/deactivate`);

export async function getTutorDirectory({ signal } = {}) {
  const tutors = await getTutors({ signal });
  return Promise.all(tutors.map(tutor => getTutor(tutor.tutorId, { signal })));
}

export function tutorValidationErrors(error) {
  const errors = error.data?.errors ?? error.data;
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return [];
  const labels = {
    tutorName: 'Tutor name',
    phone: 'Phone',
    maxSessionsPw: 'Maximum sessions per week',
    subjectIds: 'Subjects',
  };
  return Object.entries(errors).flatMap(([key, messages]) => {
    if (!Array.isArray(messages)) return [];
    return messages
      .filter(message => typeof message === 'string')
      .map(message => `${labels[key] || key}: ${message}`);
  });
}
