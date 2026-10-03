/**
 * Student API Service for Redgum Tutoring
 * 
 * Communicates with ASP.NET Core API at http://localhost:5000/api/Students
 * Endpoints:
 *   GET    /api/Students             - Get all students
 *   POST   /api/Students             - Create a student
 *   GET    /api/Students/{id}        - Get a student by ID
 *   PUT    /api/Students/{id}        - Update a student
 *   PATCH  /api/Students/{id}/deactivate - Deactivate a student
 */

const API_BASE_URL = 'http://localhost:5000/api/Students';
const PROXY_BASE_URL = '/api/Students';

/**
 * Subject name <-> ID cache to facilitate mapping between
 * frontend subject strings and backend integer IDs.
 */
const subjectNameToIdMap = new Map([
  ['Math Methods', 1],
  ['Maths Methods', 1],
  ['Mathematics', 18],
  ['General Mathematics', 18],
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

const subjectIdToNameMap = new Map();
subjectNameToIdMap.forEach((id, name) => subjectIdToNameMap.set(id, name));

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
 * Get subject ID by name, with year-level awareness and case-insensitive fallback.
 */
export function getSubjectIdByName(name, yearLevel = null) {
  if (!name) return null;
  const trimmed = name.trim();

  // Year level specific overrides for multi-year subjects in the database
  const year = Number(yearLevel);
  if (year === 11) {
    if (trimmed.toLowerCase().includes('physics')) return 5;
    if (trimmed.toLowerCase().includes('english')) return 19;
    if (trimmed.toLowerCase().includes('math methods') || trimmed.toLowerCase().includes('maths methods')) return 2;
  } else if (year === 12) {
    if (trimmed.toLowerCase().includes('physics')) return 6;
    if (trimmed.toLowerCase().includes('english')) return 17;
    if (trimmed.toLowerCase().includes('math methods') || trimmed.toLowerCase().includes('maths methods')) return 3;
  }

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
 * Convert an array of subject names, IDs, or objects to valid integer IDs.
 */
export function mapSubjectNamesToIds(subjects = [], yearLevel = null) {
  if (!Array.isArray(subjects)) return [];
  const ids = [];

  subjects.forEach(item => {
    if (typeof item === 'number') {
      if (!ids.includes(item)) ids.push(item);
    } else if (item && typeof item === 'object' && item.subjectId) {
      if (!ids.includes(item.subjectId)) ids.push(item.subjectId);
    } else if (typeof item === 'string') {
      const id = getSubjectIdByName(item, yearLevel);
      if (id !== null && !ids.includes(id)) {
        ids.push(id);
      }
    }
  });

  return ids;
}

/**
 * Helper to extract numeric student ID from 'S-0003', 'S-0287', '3', or 3.
 */
export function extractNumericStudentId(id) {
  if (typeof id === 'number') return id;
  if (!id) return 0;
  if (typeof id === 'object' && (id.studentId || id.backendId)) {
    return id.studentId || id.backendId;
  }
  const cleaned = String(id).replace(/\D/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Helper to format numeric ID to UI format 'S-0003'.
 */
export function formatStudentId(numericId) {
  return `S-${String(numericId).padStart(4, '0')}`;
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

  if (response.status === 404) return 'The requested student was not found.';
  if (response.status === 400) return 'Invalid request data. Please check the fields and try again.';
  if (response.status === 500) {
    return 'Backend server is running, but the database connection timed out. If Proton VPN is active, please disconnect it or allow port 5432.';
  }
  return `Server returned HTTP status ${response.status}.`;
}

/**
 * Fetch wrapper that contacts http://localhost:5000/api/Students with fallback to proxy
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
    // Fall back to relative /api/Students if direct fails (e.g. CORS preflight blocked)
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
 * GET ALL STUDENTS: GET /api/Students
 * @param {Object} options - Optional query parameters: { search?: string, isActive?: boolean }
 */
export async function getStudents({ search, isActive } = {}) {
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
  if (Array.isArray(list)) {
    list.forEach(student => {
      if (student.subjects) {
        registerSubjects(student.subjects);
      }
    });
    return list;
  }
  return [];
}

/**
 * GET STUDENT BY ID: GET /api/Students/{id}
 */
export async function getStudent(id) {
  const numId = extractNumericStudentId(id);
  if (!numId) throw new Error('Invalid student ID.');

  const res = await apiFetch(`/${numId}`, { method: 'GET' });
  if (!res.ok) {
    const errMsg = await parseResponseError(res);
    throw new Error(errMsg);
  }

  const student = await res.json();
  if (student && student.subjects) {
    registerSubjects(student.subjects);
  }
  return student;
}

export const getStudentById = getStudent;

/**
 * CREATE STUDENT: POST /api/Students
 * Expects CreateStudentRequest:
 * {
 *   studentName: string,
 *   mediaConsent?: boolean,
 *   firstAidNeeded?: boolean,
 *   shareProgress?: boolean,
 *   availabilityNotes?: string,
 *   notes?: string,
 *   guardians: [ { guardianName, guardianPhone, guardianEmail, relationship } ],
 *   subjects: [ { subjectId } ]
 * }
 */
export async function createStudent(studentData) {
  const studentName = (studentData.studentName || studentData.name || '').trim();

  // Guardians
  let guardians = [];
  if (Array.isArray(studentData.guardians) && studentData.guardians.length > 0) {
    guardians = studentData.guardians.map((g, idx) => ({
      guardianName: (g.guardianName || g.name || '').trim(),
      guardianPhone: (g.guardianPhone || g.phone || '').trim().slice(0, 12),
      guardianEmail: (g.guardianEmail || g.email || '').trim() || null,
      relationship: (g.relationship || (idx === 0 ? 'Parent' : 'Guardian')).trim()
    }));
  } else if (studentData.guardian || studentData.guardianName) {
    guardians = [
      {
        guardianName: (studentData.guardian || studentData.guardianName || '').trim(),
        guardianPhone: (studentData.phone || studentData.guardianPhone || '').trim().slice(0, 12),
        guardianEmail: (studentData.email || studentData.guardianEmail || '').trim() || null,
        relationship: (studentData.relationship || 'Parent').trim()
      }
    ];
  }

  // Subjects
  let subjectIds = [];
  if (Array.isArray(studentData.subjects)) {
    subjectIds = mapSubjectNamesToIds(studentData.subjects, Number(studentData.year));
  } else if (Array.isArray(studentData.subjectIds)) {
    subjectIds = studentData.subjectIds;
  }
  if (subjectIds.length === 0) {
    subjectIds = [18]; // Default to General Mathematics (ID: 18)
  }
  const subjects = subjectIds.map(id => ({ subjectId: id }));

  // Notes & school
  let notes = studentData.notes?.trim() || null;
  if (!notes && studentData.school?.trim()) {
    notes = `School: ${studentData.school.trim()}`;
  } else if (notes && studentData.school?.trim() && !notes.includes('School:')) {
    notes = `${notes} (School: ${studentData.school.trim()})`;
  }

  const payload = {
    studentName,
    mediaConsent: studentData.mediaConsent !== undefined ? Boolean(studentData.mediaConsent) : false,
    firstAidNeeded: studentData.firstAidNeeded !== undefined ? Boolean(studentData.firstAidNeeded) : true,
    shareProgress: studentData.shareProgress !== undefined ? Boolean(studentData.shareProgress) : false,
    availabilityNotes: studentData.availabilityNotes?.trim() || null,
    notes,
    guardians,
    subjects
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
  if (created && created.subjects) {
    registerSubjects(created.subjects);
  }
  return created;
}

/**
 * UPDATE STUDENT: PUT /api/Students/{id}
 * Expects UpdateStudentRequest:
 * {
 *   studentName: string,
 *   mediaConsent?: boolean,
 *   firstAidNeeded?: boolean,
 *   shareProgress?: boolean,
 *   availabilityNotes?: string,
 *   notes?: string,
 *   guardians: [ { guardianId?, guardianName, guardianPhone, guardianEmail, relationship } ],
 *   subjects: [ { subjectId } ]
 * }
 */
export async function updateStudent(id, studentData) {
  const numId = extractNumericStudentId(id);
  if (!numId) throw new Error('Invalid student ID.');

  const studentName = (studentData.studentName || studentData.name || '').trim();

  // Guardians
  let guardians = [];
  if (Array.isArray(studentData.guardians) && studentData.guardians.length > 0) {
    guardians = studentData.guardians.map((g, idx) => ({
      ...(g.guardianId ? { guardianId: g.guardianId } : {}),
      guardianName: (g.guardianName || g.name || '').trim(),
      guardianPhone: (g.guardianPhone || g.phone || '').trim().slice(0, 12),
      guardianEmail: (g.guardianEmail || g.email || '').trim() || null,
      relationship: (g.relationship || (idx === 0 ? 'Parent' : 'Guardian')).trim()
    }));
  } else if (studentData.guardian || studentData.guardianName) {
    const existingGuardianId = studentData.primaryGuardianId || studentData.guardianId || null;
    guardians = [
      {
        ...(existingGuardianId ? { guardianId: existingGuardianId } : {}),
        guardianName: (studentData.guardian || studentData.guardianName || '').trim(),
        guardianPhone: (studentData.phone || studentData.guardianPhone || '').trim().slice(0, 12),
        guardianEmail: (studentData.email || studentData.guardianEmail || '').trim() || null,
        relationship: (studentData.relationship || 'Parent').trim()
      }
    ];
  }

  // Subjects
  let subjectIds = [];
  if (Array.isArray(studentData.subjects)) {
    subjectIds = mapSubjectNamesToIds(studentData.subjects, Number(studentData.year));
  } else if (Array.isArray(studentData.subjectIds)) {
    subjectIds = studentData.subjectIds;
  }
  if (subjectIds.length === 0) {
    subjectIds = [18];
  }
  const subjects = subjectIds.map(id => ({ subjectId: id }));

  // Notes & school
  let notes = studentData.notes !== undefined ? (studentData.notes?.trim() || null) : null;
  if (!notes && studentData.school?.trim()) {
    notes = `School: ${studentData.school.trim()}`;
  } else if (notes && studentData.school?.trim() && !notes.includes('School:')) {
    notes = `${notes} (School: ${studentData.school.trim()})`;
  }

  const payload = {
    studentName,
    mediaConsent: studentData.mediaConsent !== undefined ? Boolean(studentData.mediaConsent) : false,
    firstAidNeeded: studentData.firstAidNeeded !== undefined ? Boolean(studentData.firstAidNeeded) : true,
    shareProgress: studentData.shareProgress !== undefined ? Boolean(studentData.shareProgress) : false,
    availabilityNotes: studentData.availabilityNotes !== undefined ? (studentData.availabilityNotes?.trim() || null) : null,
    notes,
    guardians,
    subjects
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
  if (updated && updated.subjects) {
    registerSubjects(updated.subjects);
  }
  return updated;
}

/**
 * DEACTIVATE STUDENT: PATCH /api/Students/{id}/deactivate
 */
export async function deactivateStudent(id) {
  const numId = extractNumericStudentId(id);
  if (!numId) throw new Error('Invalid student ID.');

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
 * Transforms an API StudentProfileResponse into the UI student object.
 */
export function transformStudentProfileToUI(profile, existingStudent = null) {
  const studentId = profile.studentId;
  const uiId = formatStudentId(studentId);
  const fullName = profile.studentName || '';

  // Primary guardian
  const guardians = Array.isArray(profile.guardians) ? profile.guardians : [];
  const primaryGuardian = guardians.find(g => g.isPrimary) || guardians[0] || null;

  // Subjects
  const subjectsList = Array.isArray(profile.subjects) && profile.subjects.length > 0
    ? profile.subjects.map(s => (typeof s === 'string' ? s : s.subjectName))
    : (existingStudent?.subjects || []);

  // Determine year level:
  let year = existingStudent?.year || 10;
  if (Array.isArray(profile.subjects)) {
    for (const sub of profile.subjects) {
      if (sub?.subjectClass) {
        const parsedYear = parseInt(String(sub.subjectClass).replace(/\D/g, ''), 10);
        if (!isNaN(parsedYear) && parsedYear >= 5 && parsedYear <= 12) {
          year = parsedYear;
          break;
        }
      }
    }
  }

  // School extraction (from notes or existing student)
  let school = existingStudent?.school || '';
  if (!school && profile.notes && profile.notes.includes('School:')) {
    const match = profile.notes.match(/School:\s*([^;)\n]+)/i);
    if (match) school = match[1].trim();
  }

  return {
    id: uiId,
    backendId: studentId,
    name: fullName,
    year,
    school: school || 'Unspecified',
    guardian: primaryGuardian?.guardianName || existingStudent?.guardian || '',
    phone: primaryGuardian?.guardianPhone || existingStudent?.phone || '',
    email: primaryGuardian?.guardianEmail || existingStudent?.email || '',
    relationship: primaryGuardian?.relationship || 'Parent',
    subjects: subjectsList,
    active: Boolean(profile.isActive),
    guardians,
    mediaConsent: profile.mediaConsent,
    firstAidNeeded: profile.firstAidNeeded,
    shareProgress: profile.shareProgress,
    availabilityNotes: profile.availabilityNotes || '',
    notes: profile.notes || '',
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt
  };
}
