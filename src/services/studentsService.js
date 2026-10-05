import { apiClient } from './apiClient.js';

export const getStudents = ({ search, isActive, signal } = {}) =>
  apiClient.get('Students', { query: { search, isActive }, signal });
export const getStudent = (id, { signal } = {}) => apiClient.get('Students/' + encodeURIComponent(id), { signal });
export const createStudent = payload => apiClient.post('Students', payload);
export const updateStudent = (id, payload) => apiClient.put('Students/' + encodeURIComponent(id), payload);
export const deactivateStudent = id => apiClient.patch('Students/' + encodeURIComponent(id) + '/deactivate');

export const emptyGuardian = () => ({ guardianName: '', guardianPhone: '', guardianEmail: '', relationship: '' });

export const emptyStudentForm = () => ({
  name: '', guardians: [emptyGuardian()], subjectIds: [], active: true,
  mediaConsent: false, firstAidNeeded: true, shareProgress: false,
  availabilityNotes: '', notes: '', profile: null,
});

export function studentToUI(profile) {
  // Responses identify the existing primary guardian. Display that guardian first;
  // thereafter the user's visible order is the exact order submitted to the API.
  const guardians = [...(profile.guardians ?? [])]
    .sort((a, b) => Number(b.isPrimary === true) - Number(a.isPrimary === true))
    .map(g => ({ guardianId: g.guardianId, guardianName: g.guardianName ?? '',
      guardianPhone: g.guardianPhone ?? '', guardianEmail: g.guardianEmail ?? '', relationship: g.relationship ?? '' }));
  const primary = guardians[0];
  return {
    id: profile.studentId, name: profile.studentName, active: profile.isActive === true,
    guardian: primary?.guardianName ?? '', phone: primary?.guardianPhone ?? '', email: primary?.guardianEmail ?? '',
    guardians: guardians.length ? guardians : [emptyGuardian()],
    mediaConsent: profile.mediaConsent ?? null, firstAidNeeded: profile.firstAidNeeded ?? null,
    shareProgress: profile.shareProgress ?? null, availabilityNotes: profile.availabilityNotes ?? '', notes: profile.notes ?? '',
    subjects: (profile.subjects ?? []).map(s => s.subjectName),
    subjectIds: (profile.subjects ?? []).map(s => s.subjectId), profile,
  };
}

export function studentFormErrors(form) {
  const errors = [];
  const text = (value, label, max, required = false) => {
    if (required && !value?.trim()) errors.push(label + ' is required.');
    else if (max && value?.trim().length > max) errors.push(label + ' must be at most ' + max + ' characters.');
  };
  text(form.name, 'Student name', 100, true);
  text(form.availabilityNotes, 'Availability notes', 255);
  if (!form.guardians?.length) errors.push('At least one guardian is required. The first guardian is primary.');
  form.guardians?.forEach((guardian, index) => {
    const label = 'Guardian ' + (index + 1);
    text(guardian.guardianName, label + ' name', 100, true);
    text(guardian.guardianPhone, label + ' phone', 12, true);
    text(guardian.guardianEmail, label + ' email', 100);
    text(guardian.relationship, label + ' relationship', 20, true);
  });
  return errors;
}

export function studentPayload(form) {
  return {
    studentName: form.name.trim(),
    mediaConsent: form.mediaConsent, firstAidNeeded: form.firstAidNeeded, shareProgress: form.shareProgress,
    availabilityNotes: form.availabilityNotes.trim() || null,
    notes: form.notes.trim() || null,
    // Do not sort or send isPrimary: the backend makes guardians[0] primary.
    guardians: form.guardians.map(g => ({
      ...(g.guardianId != null ? { guardianId: g.guardianId } : {}),
      guardianName: g.guardianName.trim(), guardianPhone: g.guardianPhone.trim(),
      guardianEmail: g.guardianEmail.trim() || null, relationship: g.relationship.trim(),
    })),
    subjects: [...new Set(form.subjectIds)].map(subjectId => ({ subjectId: Number(subjectId) })),
  };
}

export function studentValidationErrors(error) {
  const errors = error.data?.errors ?? error.data;
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return [];
  return Object.entries(errors).flatMap(([field, messages]) => Array.isArray(messages)
    ? messages.filter(message => typeof message === 'string').map(message => field + ': ' + message) : []);
}
