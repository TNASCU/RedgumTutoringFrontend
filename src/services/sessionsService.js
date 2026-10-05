import { apiClient } from './apiClient.js';
import { getStudents } from './studentsService.js';
import { getTutors } from './tutorsService.js';

export async function getWeekSchedule(weekStart, { signal } = {}) {
  const [days, students, tutors] = await Promise.all([
    apiClient.get('Sessions/week-schedule', { query: { weekStart }, signal }),
    getStudents({ signal }),
    getTutors({ signal }),
  ]);
  const studentNames = new Map(students.map(s => [s.studentId, s.studentName]));
  const tutorNames = new Map(tutors.map(t => [t.tutorId, t.tutorName]));
  const subjects = new Map(students.flatMap(s => (s.subjects ?? []).map(subject => [subject.subjectId, subject.subjectName])));
  return {
    tutors: tutors.map(t => ({ id: t.tutorId, name: t.tutorName })),
    sessions: ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].flatMap(key => (days[key]?.sessions ?? []).map(session => ({
      id: session.sessionId,
      date: session.sessionDate,
      time: session.startTime.slice(0, 5),
      duration: session.duration,
      student: session.studentId,
      tutor: session.tutorId,
      studentName: studentNames.get(session.studentId) ?? `Student #${session.studentId}`,
      tutorName: tutorNames.get(session.tutorId) ?? `Tutor #${session.tutorId}`,
      subject: subjects.get(session.subjectId) ?? `Subject #${session.subjectId}`,
      status: session.status ? session.status[0].toUpperCase() + session.status.slice(1).toLowerCase() : 'Unknown',
    }))),
  };
}

export function createSession(form) {
  return apiClient.post('Sessions', {
    tutorId: Number(form.tutor),
    studentId: Number(form.student),
    subjectId: Number(form.subjectId),
    sessionDate: form.date,
    startTime: form.time.length === 5 ? `${form.time}:00` : form.time,
    duration: Number(form.duration),
    status: 'booked',
  });
}

export function sessionValidationErrors(error) {
  const errors = error.data?.errors ?? error.data;
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return [];
  const labels = { tutorId: 'Tutor', studentId: 'Student', subjectId: 'Subject', sessionDate: 'Date', startTime: 'Start time', duration: 'Duration', status: 'Status' };
  return Object.entries(errors).flatMap(([key, messages]) => {
    if (!Array.isArray(messages)) return [];
    const field = key.replace(/^\$\./, '').split('.').pop();
    const normalized = field.charAt(0).toLowerCase() + field.slice(1);
    return messages.filter(message => typeof message === 'string').map(message => `${labels[normalized] || field}: ${message}`);
  });
}

export const getSession = (id, { signal } = {}) =>
  apiClient.get(`Sessions/${encodeURIComponent(id)}`, { signal });

export function updateSession(id, form) {
  return apiClient.put('Sessions/' + encodeURIComponent(id), {
    tutorId: Number(form.tutor),
    studentId: Number(form.student),
    subjectId: Number(form.subjectId),
    sessionDate: form.date,
    startTime: form.time.length === 5 ? form.time + ':00' : form.time,
    duration: Number(form.duration),
    status: form.status.toLowerCase(),
    notes: form.notes ?? '',
    lessonNotes: form.lessonNotes ?? '',
  });
}

export const copyWeekForward = weekStart =>
  apiClient.post('Sessions/copy-week-forward', { weekStart });

export function sessionToUI(session) {
  return {
    id: session.sessionId, date: session.sessionDate, time: session.startTime.slice(0, 5),
    duration: session.duration, student: session.studentId, tutor: session.tutorId,
    subjectId: session.subjectId,
    studentName: session.student?.studentName ?? 'Student #' + session.studentId,
    tutorName: session.tutor?.tutorName ?? 'Tutor #' + session.tutorId,
    subject: session.subject?.subjectName ?? 'Subject #' + session.subjectId,
    status: session.status ? session.status[0].toUpperCase() + session.status.slice(1).toLowerCase() : 'Unknown',
    notes: session.notes ?? '', lessonNotes: session.lessonNotes ?? '',
  };
}

export async function getSessions({ startDate, endDate, tutorId, signal } = {}) {
  const sessions = await apiClient.get('Sessions', { query: { startDate: startDate || undefined, endDate: endDate || undefined, tutorId: tutorId || undefined }, signal });
  return sessions.map(sessionToUI);
}

export async function getStudentHistory(studentId, { signal } = {}) {
  try {
    const sessions = await apiClient.get('Sessions/student/' + encodeURIComponent(studentId) + '/history', { signal });
    return sessions.map(sessionToUI);
  } catch (error) {
    // StudentEpic adds the history route. Older preprod deployments expose only
    // the all-sessions route; never fall back for network/validation failures.
    if (error.status !== 404) throw error;
    const sessions = await getSessions({ signal });
    return sessions.filter(session => session.student === Number(studentId))
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }
}

export const updateSessionStatus = (id, status) =>
  apiClient.patch('Sessions/' + encodeURIComponent(id) + '/status', { status: status.toLowerCase() });
