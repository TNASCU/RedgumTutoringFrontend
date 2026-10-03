/**
 * Session API Service for Redgum Tutoring
 * 
 * Communicates with ASP.NET Core API at http://localhost:5000/api/Sessions
 * Endpoints:
 *   GET   /api/Sessions/week-schedule?weekStart=YYYY-MM-DD[&tutorId=N]
 *   POST  /api/Sessions
 */

import { extractNumericStudentId, formatStudentId } from './studentService.js';
import { extractNumericTutorId, formatTutorId } from './tutorService.js';

const API_BASE_URL = 'http://localhost:5000/api/Sessions';
const PROXY_BASE_URL = '/api/Sessions';

/**
 * Subject name <-> ID cache to facilitate mapping between
 * frontend subject strings and backend integer IDs.
 */
const subjectNameToIdMap = new Map([
  ['General Mathematics', 18],
  ['Mathematics', 18],
  ['Math Methods', 1],
  ['Maths Methods', 1],
  ['Specialist Mathematics', 1],
  ['Physics', 4],
  ['Science', 20],
  ['Science (Junior)', 20],
  ['English', 21],
  ['English Literature', 21],
  ['Chemistry', 20],
  ['Biology', 20],
  ['Modern History', 21],
  ['Ancient History', 21],
  ['Legal Studies', 21],
  ['Business Studies', 21],
  ['Economics', 18],
  ['Psychology', 20]
]);

const subjectIdToNameMap = new Map([
  [18, 'General Mathematics'],
  [1, 'Math Methods'],
  [2, 'Math Methods'],
  [3, 'Math Methods'],
  [21, 'English'],
  [19, 'English'],
  [17, 'English'],
  [4, 'Physics'],
  [5, 'Physics'],
  [6, 'Physics'],
  [20, 'Science']
]);

/**
 * Register subjects dynamically into local cache.
 */
export function registerSubjects(subjects) {
  if (!Array.isArray(subjects)) return;
  subjects.forEach(sub => {
    if (sub && sub.subjectId && sub.subjectName) {
      subjectNameToIdMap.set(sub.subjectName, sub.subjectId);
      subjectIdToNameMap.set(sub.subjectId, sub.subjectName);
    }
  });
}

/**
 * Get subject name by ID.
 */
export function getSubjectNameById(id) {
  if (subjectIdToNameMap.has(id)) {
    return subjectIdToNameMap.get(id);
  }
  return `Subject #${id}`;
}

/**
 * Get subject ID by name, with case-insensitive fallback.
 */
export function getSubjectIdByName(name) {
  if (!name) return null;
  const trimmed = name.trim();
  if (subjectNameToIdMap.has(trimmed)) {
    return subjectNameToIdMap.get(trimmed);
  }
  for (const [key, val] of subjectNameToIdMap.entries()) {
    if (key.toLowerCase() === trimmed.toLowerCase()) {
      return val;
    }
  }
  return null;
}

/**
 * Resolve the appropriate subject ID given the student, tutor, and subject name.
 * Inspects shared subjects between student and tutor to find an exact database match.
 */
export function resolveSubjectId({ studentId, tutorId, subjectName, subjectId, students = [], tutors = [] }) {
  if (typeof subjectId === 'number' && subjectId > 0) {
    return subjectId;
  }

  const sId = extractNumericStudentId(studentId);
  const tId = extractNumericTutorId(tutorId);
  const cleanName = (subjectName || '').trim().toLowerCase();

  // Find student and tutor in provided lists
  const sObj = students.find(s => extractNumericStudentId(s.id || s.backendId || s.studentId) === sId);
  const tObj = tutors.find(t => extractNumericTutorId(t.id || t.backendId || t.tutorId) === tId);

  // Look for shared subjects in student & tutor raw subject objects if present
  if (sObj && tObj && cleanName) {
    const sSubjects = Array.isArray(sObj.subjects) ? sObj.subjects : [];
    const tSubjects = Array.isArray(tObj.subjects) ? tObj.subjects : [];

    // Check if both have subject objects with subjectId
    for (const ss of sSubjects) {
      const sSubId = typeof ss === 'object' ? ss.subjectId : null;
      const sSubName = typeof ss === 'object' ? ss.subjectName : String(ss);
      if (sSubName.toLowerCase().includes(cleanName) || cleanName.includes(sSubName.toLowerCase())) {
        for (const ts of tSubjects) {
          const tSubId = typeof ts === 'object' ? ts.subjectId : null;
          const tSubName = typeof ts === 'object' ? ts.subjectName : String(ts);
          if (sSubId && tSubId && sSubId === tSubId) {
            return sSubId;
          }
          if (tSubName.toLowerCase().includes(cleanName) || cleanName.includes(tSubName.toLowerCase())) {
            if (sSubId) return sSubId;
            if (tSubId) return tSubId;
          }
        }
      }
    }
  }

  // Fallback to name map
  const mapped = getSubjectIdByName(subjectName);
  return mapped || 1; // default fallback
}

/**
 * Ensures a date is formatted as YYYY-MM-DD Monday for the API.
 */
export function formatMonday(inputDate) {
  if (!inputDate) return '2026-09-21';

  let d;
  if (typeof inputDate === 'string') {
    const match = inputDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    } else {
      d = new Date(inputDate);
    }
  } else if (inputDate instanceof Date) {
    d = new Date(inputDate.getTime());
  } else {
    d = new Date();
  }

  if (isNaN(d.getTime())) {
    return '2026-09-21';
  }

  const day = d.getDay(); // 0 is Sunday, 1 is Monday
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const dateNum = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${dateNum}`;
}

/**
 * Formats a time string to HH:mm:ss for backend TimeOnly.
 */
export function formatTimeOnly(timeStr) {
  if (!timeStr) return '09:00:00';
  const parts = String(timeStr).trim().split(':');
  const h = String(parts[0] || '0').padStart(2, '0');
  const m = String(parts[1] || '0').padStart(2, '0');
  const s = String(parts[2] || '0').padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Parses user-friendly error message from ASP.NET Core response.
 */
async function parseResponseError(response) {
  try {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json') || contentType.includes('problem+json')) {
      const data = await response.json();
      if (data.errors && typeof data.errors === 'object') {
        const errorMessages = [];
        for (const [, msgs] of Object.entries(data.errors)) {
          if (Array.isArray(msgs)) {
            errorMessages.push(...msgs);
          } else if (typeof msgs === 'string') {
            errorMessages.push(msgs);
          }
        }
        if (errorMessages.length > 0) {
          return errorMessages.join(' ');
        }
      }
      if (typeof data === 'object' && !data.title && !data.message) {
        // Raw Dictionary<string, string[]> returned from controller
        const errorMessages = [];
        for (const [, msgs] of Object.entries(data)) {
          if (Array.isArray(msgs)) {
            errorMessages.push(...msgs);
          } else if (typeof msgs === 'string') {
            errorMessages.push(msgs);
          }
        }
        if (errorMessages.length > 0) {
          return errorMessages.join(' ');
        }
      }
      if (data.detail) return data.detail;
      if (data.title) return data.title;
      if (data.message) return data.message;
    } else {
      const text = await response.text();
      if (text) {
        if (text.includes('Timeout during reading attempt') || text.includes('NpgsqlException') || text.includes('transient failure')) {
          return 'Backend server is running, but the PostgreSQL database connection timed out. If Proton VPN is active, please disconnect it or allow port 5432.';
        }
        if (text.length < 200 && !text.includes('<!DOCTYPE')) {
          return text;
        }
      }
    }
  } catch {
    // Ignore JSON parse errors
  }

  if (response.status === 404) return 'The requested session was not found.';
  if (response.status === 400) return 'Invalid request data. Please check the session details and try again.';
  if (response.status === 500) {
    return 'Backend server is running, but the database connection timed out. If Proton VPN is active, please disconnect it or allow port 5432.';
  }
  return `Server returned HTTP status ${response.status}.`;
}

/**
 * Fetch wrapper that contacts http://localhost:5000/api/Sessions with fallback to proxy
 * if CORS or connection issues occur in development.
 */
async function apiFetch(path = '', options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers || {})
  };

  try {
    const directUrl = `${API_BASE_URL}${path}`;
    const response = await fetch(directUrl, { ...options, headers });
    return response;
  } catch (directErr) {
    // Fall back to relative /api/Sessions if direct fails (e.g. CORS preflight blocked)
    try {
      const proxyUrl = `${PROXY_BASE_URL}${path}`;
      const fallbackResponse = await fetch(proxyUrl, { ...options, headers });
      return fallbackResponse;
    } catch {
      const isNetworkErr = directErr.message?.includes('Failed to fetch') || directErr.name === 'TypeError';
      if (isNetworkErr) {
        throw new Error('Unable to reach the backend API at http://localhost:5000. Please ensure the backend is running.');
      }
      throw directErr;
    }
  }
}

/**
 * GET /api/Sessions/week-schedule
 * Returns a Monday–Sunday schedule, optionally filtered by tutor.
 * 
 * Supports:
 *   getWeekSchedule()
 *   getWeekSchedule('2026-09-21')
 *   getWeekSchedule({ weekStart: '2026-09-21', tutorId: 1 })
 *   getWeekSchedule('2026-09-21', 1)
 * 
 * @param {string|Date|Object} arg1 - weekStart or options object
 * @param {number|string} arg2 - optional tutorId
 * @returns {Promise<Object>} Map of lowercase day names ('monday'..'sunday') to ScheduleDayResponse
 */
export async function getWeekSchedule(arg1, arg2) {
  let weekStart;
  let tutorId;

  if (arg1 && typeof arg1 === 'object' && !(arg1 instanceof Date)) {
    weekStart = arg1.weekStart;
    tutorId = arg1.tutorId;
  } else {
    weekStart = arg1;
    tutorId = arg2;
  }

  const mondayStr = formatMonday(weekStart);
  const params = new URLSearchParams();
  params.set('weekStart', mondayStr);

  const numTutorId = tutorId ? extractNumericTutorId(tutorId) : null;
  if (numTutorId && numTutorId > 0) {
    params.set('tutorId', String(numTutorId));
  }

  const res = await apiFetch(`/week-schedule?${params.toString()}`, {
    method: 'GET'
  });

  if (!res.ok) {
    const errMsg = await parseResponseError(res);
    throw new Error(errMsg);
  }

  return await res.json();
}

/**
 * POST /api/Sessions
 * Creates a booked session for a shared student and tutor subject within tutor availability.
 * 
 * @param {Object} sessionData - Session creation parameters from form/modal
 * @param {Object} context - Optional context { students: [], tutors: [] } to resolve shared subject IDs
 * @returns {Promise<Object>} SessionResponse from the backend
 */
export async function createSession(sessionData, context = {}) {
  const tutorId = extractNumericTutorId(sessionData.tutor || sessionData.tutorId);
  const studentId = extractNumericStudentId(sessionData.student || sessionData.studentId);

  if (!tutorId || tutorId <= 0) {
    throw new Error('A valid tutor must be selected.');
  }
  if (!studentId || studentId <= 0) {
    throw new Error('A valid student must be selected.');
  }

  const date = sessionData.date || sessionData.sessionDate;
  if (!date) {
    throw new Error('Session date is required.');
  }

  const time = sessionData.time || sessionData.startTime;
  if (!time) {
    throw new Error('Start time is required.');
  }

  const duration = Number(sessionData.duration) || 60;
  if (duration !== 60 && duration !== 90) {
    throw new Error('Duration must be either 60 or 90 minutes.');
  }

  const subjectId = resolveSubjectId({
    studentId,
    tutorId,
    subjectName: sessionData.subject,
    subjectId: sessionData.subjectId,
    students: context.students || [],
    tutors: context.tutors || []
  });

  const payload = {
    tutorId,
    studentId,
    subjectId,
    sessionDate: date,
    startTime: formatTimeOnly(time),
    duration,
    lessonNotes: sessionData.lessonNotes ? String(sessionData.lessonNotes).trim() : null,
    notes: sessionData.notes ? String(sessionData.notes).trim() : null
  };

  const res = await apiFetch('', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errMsg = await parseResponseError(res);
    throw new Error(errMsg);
  }

  return await res.json();
}

/**
 * Transforms an API SessionResponse into the UI session format used by App.jsx.
 */
export function transformApiSessionToUI(sess, existingSession = null) {
  const id = sess.sessionId;
  const statusStr = sess.status
    ? sess.status.charAt(0).toUpperCase() + sess.status.slice(1).toLowerCase()
    : 'Booked';

  const subjectName = getSubjectNameById(sess.subjectId);

  return {
    id,
    backendId: sess.sessionId,
    date: sess.sessionDate,
    time: String(sess.startTime).slice(0, 5),
    duration: Number(sess.duration) || 60,
    student: formatStudentId(sess.studentId),
    studentId: sess.studentId,
    tutor: formatTutorId(sess.tutorId),
    tutorId: sess.tutorId,
    subject: subjectName,
    subjectId: sess.subjectId,
    status: statusStr,
    notes: sess.notes || existingSession?.notes || '',
    lessonNotes: sess.lessonNotes || existingSession?.lessonNotes || '',
    createdAt: sess.createdAt,
    updatedAt: sess.updatedAt
  };
}

/**
 * Transforms the week-schedule dictionary response into an array of UI sessions.
 * 
 * @param {Object} scheduleData - Response from getWeekSchedule()
 * @returns {Array<Object>} List of UI session objects
 */
export function transformWeekScheduleResponse(scheduleData) {
  if (!scheduleData || typeof scheduleData !== 'object') return [];

  const sessions = [];
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  days.forEach(dayKey => {
    const day = scheduleData[dayKey];
    if (day && Array.isArray(day.sessions)) {
      day.sessions.forEach(sess => {
        sessions.push(transformApiSessionToUI(sess));
      });
    }
  });

  return sessions;
}
