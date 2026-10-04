import { addTutorAvailability, removeTutorAvailability, tutorValidationErrors } from '../src/services/tutorsService.js';
import { getPendingRequests, subscribeToRequests } from '../src/services/requestActivity.js';
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { apiClient } from '../src/services/apiClient.js';
import { getSessions, getStudentHistory, updateSessionStatus, copyWeekForward, createSession, getWeekSchedule } from '../src/services/sessionsService.js';
import { studentPayload, studentToUI, emptyStudentForm, emptyGuardian, studentFormErrors, createStudent, updateStudent, deactivateStudent } from '../src/services/studentsService.js';
import { currentDatePresets } from '../src/services/scheduleDates.js';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
function mockFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    const call = { url: new URL(url), ...options, body: options.body ? JSON.parse(options.body) : undefined };
    calls.push(call);
    const result = await handler(call, calls.length);
    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  return calls;
}
const session = { sessionId: 3, studentId: 7, tutorId: 9, subjectId: 42, sessionDate: '2026-10-06', startTime: '15:30:00', duration: 90, status: 'booked', notes: 'Keep admin notes', lessonNotes: 'Keep lesson notes', student: { studentName: 'Student' }, tutor: { tutorName: 'Tutor' }, subject: { subjectName: 'Physics' } };

test('date filtering is sent to the server; clearing omits empty query values', async () => {
  const calls = mockFetch(() => [session]);
  const rows = await getSessions({ startDate: '2026-10-06', endDate: '2026-10-06' });
  assert.equal(calls[0].url.searchParams.get('startDate'), '2026-10-06');
  assert.equal(calls[0].url.searchParams.get('endDate'), '2026-10-06');
  assert.equal(rows[0].studentName, 'Student');
  assert.equal(rows[0].subjectId, 42);
  await getSessions({ startDate: '', endDate: '' });
  assert.equal(calls[1].url.search, '');
});

test('student history is independent of the sessions page range', async () => {
  const calls = mockFetch(() => [session]);
  assert.equal((await getStudentHistory(7))[0].id, 3);
  assert.equal(calls[0].url.pathname, '/api/Sessions/student/7/history');
  assert.equal(calls[0].url.search, '');
});

test('status actions only PATCH status', async () => {
  const calls = mockFetch(() => session);
  await updateSessionStatus(3, 'Missed');
  assert.equal(calls[0].method, 'PATCH');
  assert.equal(calls[0].url.pathname, '/api/Sessions/3/status');
  assert.deepEqual(calls[0].body, { status: 'missed' });
});

test('preprod copy week and booking contracts are retained', async () => {
  const calls = mockFetch(() => session);
  await copyWeekForward('2026-10-05');
  await createSession({ student: '7', tutor: '9', subjectId: '42', date: '2026-10-06', time: '15:30', duration: '90' });
  assert.equal(calls[0].url.pathname, '/api/Sessions/copy-week-forward');
  assert.deepEqual(calls[0].body, { weekStart: '2026-10-05' });
  assert.deepEqual(calls[1].body, { tutorId: 9, studentId: 7, subjectId: 42, sessionDate: '2026-10-06', startTime: '15:30:00', duration: 90, status: 'booked' });
});

test('weekly schedule still resolves names from backend records', async () => {
  mockFetch(({ url }) => url.pathname.endsWith('week-schedule') ? { tuesday: { sessions: [session] } }
    : url.pathname.endsWith('Students') ? [{ studentId: 7, studentName: 'Real student', subjects: [{ subjectId: 42, subjectName: 'Real subject' }] }]
    : [{ tutorId: 9, tutorName: 'Real tutor' }]);
  const week = await getWeekSchedule('2026-10-05');
  assert.equal(week.sessions[0].studentName, 'Real student');
  assert.equal(week.sessions[0].subject, 'Real subject');
});

const profile = { studentId: 7, studentName: 'Original', isActive: true, mediaConsent: true, firstAidNeeded: null, shareProgress: false, availabilityNotes: 'Tuesday only', notes: 'Keep this note\n\nAnd this paragraph\nYear: 10\nSchool: Old school', guardians: [{ guardianId: 12, guardianName: 'Secondary', guardianPhone: '0400000002', guardianEmail: 'two@example.com', relationship: 'Aunt', isPrimary: false }, { guardianId: 11, guardianName: 'Primary', guardianPhone: '0400000001', guardianEmail: null, relationship: 'Parent', isPrimary: true }], subjects: [{ subjectId: 42, subjectName: 'Physics', subjectClass: 'Year 11' }, { subjectId: 43, subjectName: 'Physics', subjectClass: 'Year 12' }] };

test('student edits preserve secondary guardians, nullable consents, notes, and exact subject IDs', () => {
  const form = { ...studentToUI(profile), name: 'Updated', subjectIds: [43] };
  form.guardians[0].guardianPhone = '0499999999';
  const payload = studentPayload(form, profile);
  assert.equal(payload.guardians.length, 2);
  assert.equal(payload.guardians[0].guardianId, 11);
  assert.equal(payload.guardians[0].guardianPhone, '0499999999');
  assert.equal(payload.guardians[1].guardianId, 12);
  assert.equal(payload.guardians[1].relationship, 'Aunt');
  assert.equal(payload.firstAidNeeded, null);
  assert.equal(payload.mediaConsent, true);
  assert.equal(payload.availabilityNotes, 'Tuesday only');
  assert.equal(payload.notes, profile.notes);
  assert.deepEqual(payload.subjects, [{ subjectId: 43 }]);
  assert.equal('school' in payload, false);
  assert.equal('year' in payload, false);
  assert.equal(profile.guardians[0].guardianId, 12);
});

test('removing all subjects does not restore old assignments', () => {
  assert.deepEqual(studentPayload({ ...studentToUI(profile), subjectIds: [] }, profile).subjects, []);
  assert.deepEqual(studentToUI({ ...profile, subjects: [] }).subjectIds, []);
});

test('student create, update and deactivate use the shared client and backend routes', async () => {
  const calls = mockFetch(() => profile);
  const payload = studentPayload({ ...emptyStudentForm(), name: 'New', guardians: [{ ...emptyGuardian(), guardianName: 'Parent', guardianPhone: '0400000000', relationship: 'Parent' }], subjectIds: [43] });
  await createStudent(payload);
  await updateStudent(7, payload);
  await deactivateStudent(7);
  assert.deepEqual(calls.map(c => [c.method, c.url.pathname]), [['POST', '/api/Students'], ['PUT', '/api/Students/7'], ['PATCH', '/api/Students/7/deactivate']]);
  assert.equal(calls[0].body.guardians[0].guardianId, undefined);
  assert.equal(calls[0].body.mediaConsent, false);
});

test('aborted requests retain their cancellation signal', async () => {
  const controller = new AbortController();
  controller.abort();
  globalThis.fetch = async (_url, { signal }) => { assert.equal(signal, controller.signal); throw signal.reason; };
  await assert.rejects(getSessions({ signal: controller.signal }), { name: 'AbortError' });
});

test('API errors preserve structured validation details', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ errors: { guardians: ['Required'] } }), { status: 400, headers: { 'Content-Type': 'application/problem+json' } });
  await assert.rejects(apiClient.post('Students', {}), error => error.status === 400 && error.data.errors.guardians[0] === 'Required');
});

test('calendar presets follow today across year boundaries and leap months', () => {
  assert.deepEqual(currentDatePresets(new Date(2027, 0, 1)).week, { from: '2026-12-28', to: '2027-01-03' });
  assert.deepEqual(currentDatePresets(new Date(2028, 1, 10)).month, { from: '2028-02-01', to: '2028-02-29' });
  assert.deepEqual(currentDatePresets(new Date(2026, 9, 4)).week, { from: '2026-09-28', to: '2026-10-04' });
});


test('student history works against preprod before its dedicated route is deployed', async () => {
  let calls = 0;
  globalThis.fetch = async () => ++calls === 1
    ? new Response(null, { status: 404 })
    : new Response(JSON.stringify([session, { ...session, sessionId: 4, studentId: 8 }]), { headers: { 'Content-Type': 'application/json' } });
  const history = await getStudentHistory(7);
  assert.deepEqual(history.map(item => item.id), [3]);
  assert.equal(calls, 2);
});

test('history does not hide server errors with a fallback', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response(null, { status: 500 }); };
  await assert.rejects(getStudentHistory(7), error => error.status === 500);
  assert.equal(calls, 1);
});


test('the visible first guardian becomes primary by payload order, even after promotion', () => {
  const form = studentToUI(profile);
  form.guardians.reverse();
  const payload = studentPayload(form);
  assert.deepEqual(payload.guardians.map(g => g.guardianId), [12, 11]);
  assert.ok(payload.guardians.every(g => !('isPrimary' in g)));
  assert.equal(profile.guardians[0].guardianId, 12);
});

test('guardian additions and removals keep existing IDs and omit IDs for new guardians', () => {
  const form = studentToUI(profile);
  form.guardians = [form.guardians[1], { ...emptyGuardian(), guardianName: 'New', guardianPhone: '0400000003', relationship: 'Uncle' }];
  const payload = studentPayload(form);
  assert.equal(payload.guardians[0].guardianId, 12);
  assert.ok(!('guardianId' in payload.guardians[1]));
  assert.equal(payload.guardians.length, 2);
});

test('student input validation matches backend required fields and limits', () => {
  const form = { ...emptyStudentForm(), name: 'Valid', guardians: [{ guardianName: 'Valid', guardianPhone: '123456789012', guardianEmail: '', relationship: 'Parent' }] };
  assert.deepEqual(studentFormErrors(form), []);
  form.guardians[0].guardianPhone += '3';
  assert.ok(studentFormErrors(form).some(error => error.includes('12 characters')));
  form.guardians[0].relationship = '   ';
  form.availabilityNotes = 'a'.repeat(256);
  form.name = 'a'.repeat(101);
  const errors = studentFormErrors(form);
  assert.ok(errors.some(error => error.includes('relationship is required')));
  assert.ok(errors.some(error => error.includes('255 characters')));
  assert.ok(errors.some(error => error.includes('100 characters')));
  assert.ok(studentFormErrors({ ...form, guardians: [] }).some(error => error.includes('At least one guardian')));
});

test('editable student flags and notes round-trip without repurposing Notes', () => {
  const form = { ...studentToUI(profile), mediaConsent: null, firstAidNeeded: false, shareProgress: true, availabilityNotes: ' Friday ', notes: ' Updated notes ' };
  const payload = studentPayload(form);
  assert.equal(payload.mediaConsent, null);
  assert.equal(payload.firstAidNeeded, false);
  assert.equal(payload.shareProgress, true);
  assert.equal(payload.availabilityNotes, 'Friday');
  assert.equal(payload.notes, 'Updated notes');
  assert.equal(emptyStudentForm().firstAidNeeded, true);
});


test('loading tracks overlapping requests until the final response finishes', async () => {
  const resolve = [];
  const counts = [];
  const unsubscribe = subscribeToRequests(() => counts.push(getPendingRequests()));
  globalThis.fetch = () => new Promise(done => resolve.push(done));
  const first = apiClient.get('Students');
  const second = apiClient.get('Tutors');
  assert.equal(getPendingRequests(), 2);
  resolve[0](new Response('[]'));
  await first;
  assert.equal(getPendingRequests(), 1);
  resolve[1](new Response('[]'));
  await second;
  assert.equal(getPendingRequests(), 0);
  unsubscribe();
  assert.deepEqual(counts, [1, 2, 1, 0]);
});

test('loading is cleared for network errors, HTTP errors and cancellation', async () => {
  for (const failure of [new TypeError('Network failure'), new DOMException('Aborted', 'AbortError')]) {
    globalThis.fetch = async () => { throw failure; };
    await assert.rejects(apiClient.get('Students'));
    assert.equal(getPendingRequests(), 0);
  }
  globalThis.fetch = async () => new Response(null, { status: 500 });
  await assert.rejects(apiClient.get('Students'));
  assert.equal(getPendingRequests(), 0);
});


test('a failed request does not clear loading while another request is pending', async () => {
  let rejectFirst;
  let finishLast;
  let calls = 0;
  globalThis.fetch = () => ++calls === 1
    ? new Promise((_resolve, reject) => { rejectFirst = reject; })
    : new Promise(resolve => { finishLast = resolve; });
  const first = apiClient.get('Students');
  const last = apiClient.get('Tutors');
  const failed = assert.rejects(first);
  rejectFirst(new TypeError('Failed request'));
  await failed;
  assert.equal(getPendingRequests(), 1);
  finishLast(new Response('[]'));
  await last;
  assert.equal(getPendingRequests(), 0);
});


test('add availability uses the tutor route, numeric ISO day and TimeOnly strings', async () => {
  const calls = mockFetch(() => ({ tutorAvailabilityId: 12 }));
  const result = await addTutorAvailability('9', { dayOfWeek: '3', startTime: '15:00', endTime: '18:30' });
  assert.equal(calls[0].url.pathname, '/api/Tutors/9/availability');
  assert.equal(calls[0].method, 'POST');
  assert.deepEqual(calls[0].body, { dayOfWeek: 3, startTime: '15:00:00', endTime: '18:30:00' });
  assert.equal(result.tutorAvailabilityId, 12);
});

test('removing availability uses its persisted ID and accepts 204 No Content', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url).pathname, '/api/Tutors/9/availability/72');
    assert.equal(options.method, 'DELETE');
    assert.equal(options.body, undefined);
    return new Response(null, { status: 204 });
  };
  assert.equal(await removeTutorAvailability(9, 72), null);
  assert.equal(getPendingRequests(), 0);
});

test('availability overlap errors retain backend messages', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ availability: ['Availability overlaps an existing slot.'] }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  await assert.rejects(addTutorAvailability(9, { dayOfWeek: 2, startTime: '15:00', endTime: '17:00' }), error => {
    assert.deepEqual(tutorValidationErrors(error), ['Availability: Availability overlaps an existing slot.']);
    return true;
  });
});
