/**
 * Tutor API Service for Redgum Tutoring
 * 
 * Communicates with ASP.NET Core API at http://localhost:5000/api/Tutors
 * Endpoints:
 *   GET    /api/Tutors
 *   POST   /api/Tutors
 *   GET    /api/Tutors/{id}
 *   PUT    /api/Tutors/{id}
 *   GET    /api/Tutors/{id}/schedule
 *   GET    /api/Tutors/{id}/subjects
 *   PUT    /api/Tutors/{id}/subjects
 *   PATCH  /api/Tutors/{id}/deactivate
 */

const API_BASE_URL = 'http://localhost:5000/api/Tutors';
const PROXY_BASE_URL = '/api/Tutors';

/**
 * Subject name <-> ID cache to facilitate mapping between
 * frontend subject strings and backend integer IDs.
 */
const subjectNameToIdMap = new Map([
  ['Physics', 1],
  ['Chemistry', 2],
  ['Maths Methods', 3],
  ['Mathematics', 4],
  ['Specialist Mathematics', 5],
  ['General Mathematics', 6],
  ['Biology', 7],
  ['English', 8],
  ['English Literature', 9],
  ['Modern History', 10],
  ['Ancient History', 11],
  ['Legal Studies', 12],
  ['Business Studies', 13],
  ['Economics', 14],
  ['Psychology', 15],
  ['Science (Junior)', 16]
]);

const subjectIdToNameMap = new Map();
subjectNameToIdMap.forEach((id, name) => subjectIdToNameMap.set(id, name));

/**
 * Register subjects into local cache.
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
 * Get subject name by ID.
 */
export function getSubjectNameById(id) {
  if (subjectIdToNameMap.has(id)) {
    return subjectIdToNameMap.get(id);
  }
  return `Subject #${id}`;
}

/**
 * Convert an array of subject names to valid integer IDs.
 */
export function mapSubjectNamesToIds(subjectNames = []) {
  if (!Array.isArray(subjectNames)) return [];
  const ids = [];
  subjectNames.forEach(name => {
    const id = getSubjectIdByName(name);
    if (id !== null && !ids.includes(id)) {
      ids.push(id);
    }
  });
  return ids;
}

/**
 * Helper to extract numeric tutor ID from 'T-001', '1', or 1.
 */
export function extractNumericTutorId(id) {
  if (typeof id === 'number') return id;
  if (!id) return 0;
  const cleaned = String(id).replace(/\D/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Helper to format numeric ID to UI format 'T-001'.
 */
export function formatTutorId(numericId) {
  return `T-${String(numericId).padStart(3, '0')}`;
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

  if (response.status === 404) return 'The requested tutor was not found.';
  if (response.status === 400) return 'Invalid request data. Please check the fields and try again.';
  if (response.status === 500) {
    return 'Backend server is running, but the database connection timed out. If Proton VPN is active, please disconnect it or allow port 5432.';
  }
  return `Server returned HTTP status ${response.status}.`;
}

/**
 * Fetch wrapper that contacts http://localhost:5000/api/Tutors with fallback to proxy
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
    // Fall back to relative /api/Tutors if direct fails (e.g. CORS preflight blocked)
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
 * A. LOAD TUTORS: GET /api/Tutors
 * @param {Object} options - Optional query parameters: { search?: string, isActive?: boolean }
 */
export async function getTutors({ search, isActive } = {}) {
  const params = new URLSearchParams();
  if (search && search.trim()) {
    params.set('search', search.trim());
  }
  if (typeof isActive === 'boolean') {
    params.set('isActive', String(isActive));
  }

  const queryString = params.toString() ? `?${params.toString()}` : '';
  const res = await apiFetch(`${queryString}`, { method: 'GET' });

  if (!res.ok) {
    const errMsg = await parseResponseError(res);
    throw new Error(errMsg);
  }

  const list = await res.json();
  return Array.isArray(list) ? list : [];
}

/**
 * C. GET TUTOR PROFILE: GET /api/Tutors/{id}
 */
export async function getTutorById(id) {
  const numId = extractNumericTutorId(id);
  if (!numId) throw new Error('Invalid tutor ID.');

  const res = await apiFetch(`/${numId}`, { method: 'GET' });
  if (!res.ok) {
    const errMsg = await parseResponseError(res);
    throw new Error(errMsg);
  }

  const profile = await res.json();
  if (profile.subjects) {
    registerSubjects(profile.subjects);
  }
  return profile;
}

/**
 * D. GET TUTOR SUBJECTS: GET /api/Tutors/{id}/subjects
 */
export async function getTutorSubjects(id) {
  const numId = extractNumericTutorId(id);
  if (!numId) throw new Error('Invalid tutor ID.');

  const res = await apiFetch(`/${numId}/subjects`, { method: 'GET' });
  if (!res.ok) {
    const errMsg = await parseResponseError(res);
    throw new Error(errMsg);
  }

  const subjects = await res.json();
  registerSubjects(subjects);
  return subjects;
}

/**
 * B. ADD TUTOR: POST /api/Tutors
 * Maps form to CreateTutorRequest: { tutorName, phone, maxSessionsPw, subjectIds, unavailabilityNotes, notes }
 */
export async function createTutor(data) {
  const subjectIds = Array.isArray(data.subjectIds) && data.subjectIds.length > 0
    ? data.subjectIds
    : mapSubjectNamesToIds(data.subjects);

  const payload = {
    tutorName: (data.tutorName || data.name || '').trim(),
    phone: (data.phone || '').trim(),
    maxSessionsPw: Number(data.maxSessionsPw || data.cap) >= 0 ? Number(data.maxSessionsPw || data.cap) : 8,
    subjectIds: subjectIds.length > 0 ? subjectIds : [1], // Backend requires >= 1 subject ID
    unavailabilityNotes: data.unavailabilityNotes?.trim() || null,
    notes: data.notes?.trim() || null
  };

  const res = await apiFetch('', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errMsg = await parseResponseError(res);
    throw new Error(errMsg);
  }

  const created = await res.json();
  if (created.subjects) {
    registerSubjects(created.subjects);
  }
  return created;
}

/**
 * C. EDIT TUTOR: PUT /api/Tutors/{id}
 * Maps form to UpdateTutorRequest: { tutorName, phone, maxSessionsPw, subjectIds, unavailabilityNotes, notes }
 */
export async function updateTutor(id, data) {
  const numId = extractNumericTutorId(id);
  if (!numId) throw new Error('Invalid tutor ID.');

  const subjectIds = Array.isArray(data.subjectIds) && data.subjectIds.length > 0
    ? data.subjectIds
    : mapSubjectNamesToIds(data.subjects);

  const payload = {
    tutorName: (data.tutorName || data.name || '').trim(),
    phone: (data.phone || '').trim(),
    maxSessionsPw: Number(data.maxSessionsPw || data.cap) >= 0 ? Number(data.maxSessionsPw || data.cap) : 8,
    subjectIds: subjectIds.length > 0 ? subjectIds : [1],
    unavailabilityNotes: data.unavailabilityNotes?.trim() || null,
    notes: data.notes?.trim() || null
  };

  const res = await apiFetch(`/${numId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errMsg = await parseResponseError(res);
    throw new Error(errMsg);
  }

  const updated = await res.json();
  if (updated.subjects) {
    registerSubjects(updated.subjects);
  }
  return updated;
}

/**
 * D. UPDATE TUTOR SUBJECTS: PUT /api/Tutors/{id}/subjects
 * Expects UpdateTutorSubjectsRequest: { subjectIds: number[] }
 */
export async function updateTutorSubjects(id, subjectIds) {
  const numId = extractNumericTutorId(id);
  if (!numId) throw new Error('Invalid tutor ID.');

  const res = await apiFetch(`/${numId}/subjects`, {
    method: 'PUT',
    body: JSON.stringify({ subjectIds: Array.isArray(subjectIds) ? subjectIds : [] })
  });

  if (!res.ok) {
    const errMsg = await parseResponseError(res);
    throw new Error(errMsg);
  }

  const updatedSubjects = await res.json();
  registerSubjects(updatedSubjects);
  return updatedSubjects;
}

/**
 * E. DEACTIVATE TUTOR: PATCH /api/Tutors/{id}/deactivate
 */
export async function deactivateTutor(id) {
  const numId = extractNumericTutorId(id);
  if (!numId) throw new Error('Invalid tutor ID.');

  const res = await apiFetch(`/${numId}/deactivate`, {
    method: 'PATCH'
  });

  if (!res.ok) {
    const errMsg = await parseResponseError(res);
    throw new Error(errMsg);
  }

  return await res.json();
}

/**
 * F. TUTOR SCHEDULE: GET /api/Tutors/{id}/schedule?weekStart=YYYY-MM-DD
 * weekStart must be a Monday DateOnly string.
 */
export async function getTutorSchedule(id, weekStart) {
  const numId = extractNumericTutorId(id);
  if (!numId) throw new Error('Invalid tutor ID.');

  let mondayStr = weekStart;
  if (!mondayStr) {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(today.setDate(diff));
    mondayStr = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`;
  }

  const res = await apiFetch(`/${numId}/schedule?weekStart=${encodeURIComponent(mondayStr)}`, {
    method: 'GET'
  });

  if (!res.ok) {
    const errMsg = await parseResponseError(res);
    throw new Error(errMsg);
  }

  return await res.json();
}

/**
 * Transforms an API TutorListItemResponse into the UI tutor object.
 */
export function transformTutorListItemToUI(item, existingTutor = null, subjectsList = null) {
  const tutorId = item.tutorId;
  const uiId = formatTutorId(tutorId);
  const fullName = item.tutorName || '';

  let fName = existingTutor?.firstName || '';
  let lName = existingTutor?.lastName || '';
  let pName = existingTutor?.preferredName || '';

  if (!fName && !lName && fullName) {
    const parts = fullName.trim().split(/\s+/);
    fName = parts[0] || '';
    lName = parts.slice(1).join(' ') || '';
  }

  let subjects = existingTutor?.subjects || [];
  if (Array.isArray(subjectsList) && subjectsList.length > 0) {
    subjects = subjectsList.map(s => (typeof s === 'string' ? s : s.subjectName));
  }

  return {
    id: uiId,
    backendId: tutorId,
    name: fullName,
    firstName: fName,
    lastName: lName,
    preferredName: pName,
    phone: item.phone || '',
    subjects,
    active: Boolean(item.isActive),
    cap: Number(item.maxSessionsPw) || 8,
    windows: existingTutor?.windows || []
  };
}

/**
 * Transforms an API TutorProfileResponse into the UI tutor object.
 */
export function transformTutorProfileToUI(profile, existingTutor = null) {
  const tutorId = profile.tutorId;
  const uiId = formatTutorId(tutorId);
  const fullName = profile.tutorName || '';

  let fName = existingTutor?.firstName || '';
  let lName = existingTutor?.lastName || '';
  let pName = existingTutor?.preferredName || '';

  if (!fName && !lName && fullName) {
    const parts = fullName.trim().split(/\s+/);
    fName = parts[0] || '';
    lName = parts.slice(1).join(' ') || '';
  }

  const subjects = Array.isArray(profile.subjects)
    ? profile.subjects.map(s => s.subjectName)
    : (existingTutor?.subjects || []);

  const dayMap = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const windows = Array.isArray(profile.availability) && profile.availability.length > 0
    ? profile.availability.map(a => [
        dayMap[a.dayOfWeek] || 'Tuesday',
        String(a.startTime).slice(0, 5),
        String(a.endTime).slice(0, 5)
      ])
    : (existingTutor?.windows || []);

  return {
    id: uiId,
    backendId: tutorId,
    name: fullName,
    firstName: fName,
    lastName: lName,
    preferredName: pName,
    phone: profile.phone || '',
    subjects,
    active: Boolean(profile.isActive),
    cap: Number(profile.maxSessionsPw) || 8,
    unavailabilityNotes: profile.unavailabilityNotes || '',
    notes: profile.notes || '',
    windows
  };
}
