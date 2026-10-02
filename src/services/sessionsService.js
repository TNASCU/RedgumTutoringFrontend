import { apiClient } from './apiClient.js';

export async function getWeekSchedule(weekStart, { signal } = {}) {
  const [days, students, tutors] = await Promise.all([
    apiClient.get('Sessions/week-schedule', { query: { weekStart }, signal }),
    apiClient.get('Students', { signal }),
    apiClient.get('Tutors', { signal }),
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
