import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getWeekSchedule, copyWeekForward, getSession, createSession, updateSession, sessionValidationErrors, getSessions, getStudentHistory, updateSessionStatus } from './services/sessionsService.js';
import { startOfWeek } from './services/scheduleDates.js';
import {
  addTutorAvailability,
  removeTutorAvailability,
  createTutor,
  deactivateTutor,
  getTutorDirectory,
  getTutorSchedule,
  getTutors,
  getTutorSubjects,
  tutorValidationErrors,
  updateTutor,
} from './services/tutorsService.js';
import { getStudents, getStudent, createStudent, updateStudent, deactivateStudent, studentToUI, studentPayload, studentValidationErrors, emptyStudentForm, studentFormErrors } from './services/studentsService.js';
import LoadingScreen from './LoadingScreen.jsx';
import StudentFields from './StudentFields.jsx';
import DateRangePicker from './DateRangePicker.jsx';
import SubjectMultiSelect from './SubjectMultiSelect.jsx';

const TUTOR_DAY_NAMES = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday'
};

// Date & Time utility functions
function initials(name) {
  if (!name) return '';
  return name.split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();
}

function localDate(s) {
  return new Date(s + 'T12:00:00');
}

function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDate(s, opts = { day: 'numeric', month: 'short' }) {
  return localDate(s).toLocaleDateString('en-AU', opts);
}

function dayName(s) {
  return localDate(s).toLocaleDateString('en-AU', { weekday: 'long' });
}

function mins(v) {
  if (!v) return 0;
  const [h, m] = v.split(':').map(Number);
  return h * 60 + m;
}

function endTime(t, d) {
  const n = mins(t) + Number(d);
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
}

// Validation function enforcing business rule
export default function App() {
  // Server-owned records are never replaced by browser demo data.
  const [data, setData] = useState({ students: [], sessions: [] });

  // Navigation and active view
  const [currentPage, setCurrentPage] = useState('schedule');

  // Schedule View States
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [scheduleMode, setScheduleMode] = useState('week'); // 'week' | 'day'
  const [selectedDay, setSelectedDay] = useState(() => iso(new Date()));
  const [density, setDensity] = useState('detailed'); // 'detailed' | 'minimal'
  const [boardSearch, setBoardSearch] = useState('');
  const [boardTutor, setBoardTutor] = useState('');

  const [today, setToday] = useState(() => iso(new Date()));
  const [schedule, setSchedule] = useState({ key: '', sessions: [], tutors: [], loading: true, error: '' });
  const copyDialogRef = useRef(null);
  const copyPendingRef = useRef(false);
  const [copySourceWeek, setCopySourceWeek] = useState('');
  const [copyPending, setCopyPending] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [copyResult, setCopyResult] = useState(null);
  const copyTargetDate = copySourceWeek ? localDate(copySourceWeek) : null;
  if (copyTargetDate) copyTargetDate.setDate(copyTargetDate.getDate() + 7);
  const copyTargetWeek = copyTargetDate ? iso(copyTargetDate) : '';
  const weekRange = (date) => {
    const end = localDate(date);
    end.setDate(end.getDate() + 6);
    return fmtDate(date, { day: 'numeric', month: 'short', year: 'numeric' }) + ' to ' + fmtDate(iso(end), { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const handleCopyWeek = async () => {
    if (copyPendingRef.current || !copySourceWeek) return;
    copyPendingRef.current = true;
    setCopyPending(true);
    setCopyError('');
    try {
      const result = await copyWeekForward(copySourceWeek);
      setWeekStart(localDate(result.targetWeekStart));
      const tuesday = localDate(result.targetWeekStart);
      tuesday.setDate(tuesday.getDate() + 1);
      setSelectedDay(iso(tuesday));
      setScheduleMode('week');
      setBoardTutor('');
      setBoardSearch('');
      setScheduleRefresh(value => value + 1);
      setCopyResult(result);
      copyDialogRef.current.close();
    } catch (error) {
      const messages = sessionValidationErrors(error);
      setCopyError(messages.length ? messages.join(' ') : error.message);
    } finally {
      copyPendingRef.current = false;
      setCopyPending(false);
    }
  };
  const [scheduleRefresh, setScheduleRefresh] = useState(0);
  const scheduleWeek = iso(scheduleMode === 'day' ? startOfWeek(localDate(selectedDay)) : weekStart);
  const scheduleKey = scheduleWeek + ':' + scheduleRefresh;
  const scheduleLoading = schedule.loading || schedule.key !== scheduleKey;
  const scheduleSessions = scheduleLoading || schedule.error ? [] : schedule.sessions;

  useEffect(() => {
    const updateToday = () => setToday(iso(new Date()));
    const timer = setInterval(updateToday, 1000);
    window.addEventListener('focus', updateToday);
    return () => { clearInterval(timer); window.removeEventListener('focus', updateToday); };
  }, []);

  useEffect(() => {
    if (currentPage !== 'schedule') return;
    const controller = new AbortController();
    getWeekSchedule(scheduleWeek, { signal: controller.signal })
      .then(result => {
        if (!controller.signal.aborted) setSchedule({ ...result, key: scheduleKey, loading: false, error: '' });
      })
      .catch(error => {
        if (!controller.signal.aborted) setSchedule({ key: scheduleKey, sessions: [], tutors: [], loading: false, error: error.message });
      });
    return () => controller.abort();
  }, [scheduleWeek, scheduleKey, currentPage]);

  // Sessions View States
  const [sessionFilter, setSessionFilter] = useState('');
  const [sessionSearch, setSessionSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [appliedDateRange, setAppliedDateRange] = useState({ from: '', to: '' });
  const [listState, setListState] = useState({ loading: true, error: '', key: '' });
  const listKey = appliedDateRange.from + ':' + appliedDateRange.to + ':' + scheduleRefresh;
  const listLoading = listState.loading || listState.key !== listKey;
  const [actionError, setActionError] = useState('');
  const [sessionActionPending, setSessionActionPending] = useState(false);
  const sessionActionRef = useRef(false);

  useEffect(() => {
    if (currentPage !== 'sessions') return;
    const controller = new AbortController();
    // eslint-disable-next-line react/set-state-in-effect -- Reset the loading state for this external request.
    setListState({ loading: true, error: '', key: listKey });
    getSessions({ startDate: appliedDateRange.from, endDate: appliedDateRange.to, signal: controller.signal })
      .then(items => {
        if (controller.signal.aborted) return;
        setData(previous => ({ ...previous, sessions: items }));
        setListState({ loading: false, error: '', key: listKey });
      }).catch(error => {
        if (!controller.signal.aborted) setListState({ loading: false, error: error.message, key: listKey });
      });
    return () => controller.abort();
  }, [currentPage, listKey, appliedDateRange.from, appliedDateRange.to]);


  // Students View States
  const [studentSearch, setStudentSearch] = useState('');
  const [studentState, setStudentState] = useState('active'); // 'active' | 'all' | 'inactive'
  const [studentSelected, setStudentSelected] = useState(null);
  const [studentDirectory, setStudentDirectory] = useState({ loading: true, error: '' });
  const [studentRefresh, setStudentRefresh] = useState(0);
  const [studentSaving, setStudentSaving] = useState(false);
  const studentSavingRef = useRef(false);
  const [studentDetails, setStudentDetails] = useState({ loading: false, error: '' });
  const [studentDetailsRetry, setStudentDetailsRetry] = useState(0);
  const [historyState, setHistoryState] = useState({ id: null, items: [], loading: false, error: '' });

  useEffect(() => {
    if (currentPage !== 'students') return;
    const controller = new AbortController();
    // eslint-disable-next-line react/set-state-in-effect -- Reset the loading state for this external request.
    setStudentDirectory({ loading: true, error: '' });
    getStudents({ signal: controller.signal }).then(items => {
      if (controller.signal.aborted) return;
      setData(previous => ({ ...previous, students: items.map(studentToUI) }));
      setStudentSelected(previous => items.some(item => item.studentId === previous) ? previous : items[0]?.studentId ?? null);
      setStudentDirectory({ loading: false, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setStudentDirectory({ loading: false, error: error.message });
    });
    return () => controller.abort();
  }, [currentPage, studentRefresh]);


  // Tutors View States
  const [tutorSearch, setTutorSearch] = useState('');
  const [tutorState, setTutorState] = useState('active'); // 'active' | 'all' | 'inactive'
  const [tutorDirectory, setTutorDirectory] = useState({ items: [], loading: true, error: '' });
  const [tutorSubjectCatalog, setTutorSubjectCatalog] = useState([]);
  const [tutorCapacity, setTutorCapacity] = useState({});
  const [tutorRefresh, setTutorRefresh] = useState(0);
  const [tutorSaving, setTutorSaving] = useState(false);
  const tutorSavingRef = useRef(false);
  const activeTutors = useMemo(() => tutorDirectory.items.filter(t => t.active), [tutorDirectory.items]);

  useEffect(() => {
    if (!['tutors', 'availability', 'students'].includes(currentPage)) return;
    const controller = new AbortController();

    const loadTutorArea = async () => {
      setTutorDirectory(previous => ({ ...previous, loading: true, error: '' }));
      try {
        const tutors = await getTutorDirectory({ signal: controller.signal });
        if (controller.signal.aborted) return;

        const normalizedTutors = tutors.map(tutorItem => ({
          id: tutorItem.tutorId,
          name: tutorItem.tutorName,
          phone: tutorItem.phone ?? '',
          subjects: (tutorItem.subjects ?? []).map(subject => subject.subjectName),
          subjectIds: (tutorItem.subjects ?? []).map(subject => subject.subjectId),
          active: tutorItem.isActive,
          cap: tutorItem.maxSessionsPw,
          unavailabilityNotes: tutorItem.unavailabilityNotes ?? '',
          notes: tutorItem.notes ?? '',
          windows: (tutorItem.availability ?? []).map(slot => [
            TUTOR_DAY_NAMES[slot.dayOfWeek],
            slot.startTime.slice(0, 5),
            slot.endTime.slice(0, 5),
            slot.tutorAvailabilityId
          ])
        }));

        let students = [];
        try {
          students = await getStudents({ signal: controller.signal });
        } catch (error) {
          if (controller.signal.aborted || error.name === 'AbortError') return;
        }

        if (controller.signal.aborted) return;
        const subjectsById = new Map();
        for (const subject of tutors.flatMap(tutorItem => tutorItem.subjects ?? [])) {
          subjectsById.set(subject.subjectId, subject);
        }
        for (const subject of students.flatMap(studentItem => studentItem.subjects ?? [])) {
          subjectsById.set(subject.subjectId, subject);
        }
        setTutorSubjectCatalog([...subjectsById.values()].sort((a, b) =>
          a.subjectName.localeCompare(b.subjectName) || (a.subjectClass ?? '').localeCompare(b.subjectClass ?? '')
        ));

        setTutorDirectory({ items: normalizedTutors, loading: false, error: '' });
        if (currentPage !== 'tutors') return;
        const monday = iso(startOfWeek(new Date()));
        const scheduleResults = await Promise.allSettled(tutors.map(tutorItem =>
          getTutorSchedule(tutorItem.tutorId, monday, { signal: controller.signal })
        ));
        if (controller.signal.aborted) return;
        const capacity = {};
        scheduleResults.forEach((result, index) => {
          const tutorId = tutors[index].tutorId;
          capacity[tutorId] = result.status === 'fulfilled'
            ? result.value.days.flatMap(day => day.sessions ?? [])
                .filter(session => session.status?.toLowerCase() === 'booked').length
            : null;
        });
        setTutorCapacity(capacity);
      } catch (error) {
        if (!controller.signal.aborted) {
          setTutorDirectory({ items: [], loading: false, error: error.message });
          setTutorSubjectCatalog([]);
          setTutorCapacity({});
        }
      }
    };

    loadTutorArea();
    return () => controller.abort();
  }, [currentPage, tutorRefresh]);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const toastTimeoutRef = useRef(null);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setShowToast(false);
    }, 2400);
  };

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState(''); // 'session' | 'student' | 'tutor' | 'availability'
  const [editId, setEditId] = useState(null);
  const [formError, setFormError] = useState('');

  // Helper to initialize session form state safely
  const getInitialSessionForm = () => {
    const firstActiveStudent = ''; // Select a backend student.
    const firstActiveTutor = ''; // Backend tutor is chosen after opening the modal.
    return {
      student: firstActiveStudent,
      tutor: firstActiveTutor,
      date: scheduleMode === 'day' ? selectedDay : (() => {
        const now = new Date();
        if (iso(startOfWeek(now)) === iso(weekStart) && now.getDay() >= 2 && now.getDay() <= 6) return iso(now);
        const tuesday = new Date(weekStart);
        tuesday.setDate(tuesday.getDate() + 1);
        return iso(tuesday);
      })(),
      time: '15:30',
      duration: 60,
      subject: '',
      subjectId: '',
      status: 'Booked'
    };
  };

  // Form states for modals
  const [sessionForm, setSessionForm] = useState(getInitialSessionForm);

  const [sessionEditMode, setSessionEditMode] = useState(false);
  const savedSessionForm = useRef(null);
  const [sessionDetails, setSessionDetails] = useState({ loading: false, error: '' });
  const [detailsRetry, setDetailsRetry] = useState(0);
  useEffect(() => {
    if (!modalOpen || modalMode !== 'session' || !editId) return;
    const controller = new AbortController();
    getSession(editId, { signal: controller.signal }).then(session => {
      if (controller.signal.aborted) return;
      const loadedForm = {
        student: String(session.studentId), tutor: String(session.tutorId),
        subjectId: String(session.subjectId), subject: '', date: session.sessionDate,
        time: session.startTime.slice(0, 5), duration: session.duration,
        status: session.status ? session.status[0].toUpperCase() + session.status.slice(1).toLowerCase() : 'Unknown',
        notes: session.notes || '', lessonNotes: session.lessonNotes || '',
      };
      savedSessionForm.current = loadedForm;
      setSessionForm(loadedForm);
      setSessionDetails({ loading: false, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setSessionDetails({ loading: false, error: error.message });
    });
    return () => controller.abort();
  }, [modalOpen, modalMode, editId, detailsRetry]);

  const [bookingStudents, setBookingStudents] = useState({ items: [], ready: false, error: '' });
  const [sessionErrors, setSessionErrors] = useState([]);
  const [sessionSaving, setSessionSaving] = useState(false);
  const sessionSavingRef = useRef(false);
  const [bookingTutors, setBookingTutors] = useState({ items: [], ready: false, error: '' });
  const [bookingSubjects, setBookingSubjects] = useState({ tutorId: '', items: [], error: '' });
  const [bookingRetry, setBookingRetry] = useState(0);
  const subjectsLoading = Boolean(sessionForm.tutor) && bookingSubjects.tutorId !== sessionForm.tutor;
  const selectedBookingStudent = bookingStudents.items.find(student => String(student.studentId) === sessionForm.student);
  const subjectOptions = subjectsLoading ? [] : bookingSubjects.items.filter(subject =>
    (editId && String(subject.subjectId) === sessionForm.subjectId) || selectedBookingStudent?.subjects?.some(assigned => assigned.subjectId === subject.subjectId));

  useEffect(() => {
    if (!modalOpen || modalMode !== 'session') return;
    const controller = new AbortController();
    getStudents({ signal: controller.signal }).then(items => {
      if (!controller.signal.aborted) setBookingStudents({ items, ready: true, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setBookingStudents({ items: [], ready: true, error: error.message });
    });
    return () => controller.abort();
  }, [modalOpen, modalMode, bookingRetry]);

  useEffect(() => {
    if (!modalOpen || modalMode !== 'session') return;
    const controller = new AbortController();
    getTutors({ signal: controller.signal }).then(items => {
      if (!controller.signal.aborted) setBookingTutors({ items, ready: true, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setBookingTutors({ items: [], ready: true, error: error.message });
    });
    return () => controller.abort();
  }, [modalOpen, modalMode, bookingRetry]);

  useEffect(() => {
    if (!modalOpen || modalMode !== 'session' || !sessionForm.tutor) return;
    const controller = new AbortController();
    const tutorId = sessionForm.tutor;
    getTutorSubjects(tutorId, { signal: controller.signal }).then(items => {
      if (!controller.signal.aborted) setBookingSubjects({ tutorId, items, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setBookingSubjects({ tutorId, items: [], error: error.message });
    });
    return () => controller.abort();
  }, [modalOpen, modalMode, sessionForm.tutor, bookingRetry]);

  const [studentForm, setStudentForm] = useState(emptyStudentForm);

  const [tutorForm, setTutorForm] = useState({
    firstName: '',
    lastName: '',
    preferredName: '',
    name: '',
    phone: '',
    subjectIds: [],
    cap: 8,
    active: true
  });

  // Handle tutor personal detail field changes (MITP426PER2-212)
  const handleTutorPersonalChange = (field, value) => {
    setTutorForm(prev => {
      const next = { ...prev, [field]: value };
      const fName = (field === 'firstName' ? value : next.firstName) || '';
      const lName = (field === 'lastName' ? value : next.lastName) || '';
      const pName = (field === 'preferredName' ? value : next.preferredName) || '';
      const fullLegal = [fName.trim(), lName.trim()].filter(Boolean).join(' ');
      next.name = pName.trim()
        ? (lName.trim() ? `${pName.trim()} ${lName.trim()}` : pName.trim())
        : fullLegal;
      return next;
    });
  };
  const profileSubjectCatalog = new Map(tutorSubjectCatalog.map(subject => [subject.subjectId, subject]));
  for (const subject of studentForm.profile?.subjects ?? []) profileSubjectCatalog.set(subject.subjectId, subject);
  const subjectCatalogOptions = [...profileSubjectCatalog.values()].map(subject => ({
    value: subject.subjectId,
    label: subject.subjectName + (subject.subjectClass ? ' (' + subject.subjectClass + ')' : ''),
  }));

  useEffect(() => {
    if (!modalOpen || modalMode !== 'student' || !editId) return;
    const controller = new AbortController();
    // eslint-disable-next-line react/set-state-in-effect -- Reset the loading state for this external request.
    setStudentDetails({ loading: true, error: '' });
    getStudent(editId, { signal: controller.signal }).then(profile => {
      if (controller.signal.aborted) return;
      setStudentForm(studentToUI(profile));
      setStudentDetails({ loading: false, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setStudentDetails({ loading: false, error: error.message });
    });
    return () => controller.abort();
  }, [modalOpen, modalMode, editId, studentDetailsRetry]);

  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const availabilitySavingRef = useRef(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [availabilityForm, setAvailabilityForm] = useState({
    tutor: '',
    day: 'Tuesday',
    start: '15:00',
    end: '18:00'
  });

  // Entity lookup helpers
  const student = (id) => data.students.find(x => String(x.id) === String(id));
  const tutor = (id) => tutorDirectory.items.find(x => String(x.id) === String(id));

  // Week dates calculator (Tuesday through Saturday: +1 to +5 days from weekStart Monday)
  const weekDates = useMemo(() => {
    return [1, 2, 3, 4, 5].map(n => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + n);
      return d;
    });
  }, [weekStart]);

  // Navigate week
  const handlePrevWeek = () => {
    if (scheduleMode === 'week') {
      const nextD = new Date(weekStart);
      nextD.setDate(nextD.getDate() - 7);
      setWeekStart(nextD);
    } else {
      const d = localDate(selectedDay);
      d.setDate(d.getDate() - 1);
      setSelectedDay(iso(d));
    }
  };

  const handleNextWeek = () => {
    if (scheduleMode === 'week') {
      const nextD = new Date(weekStart);
      nextD.setDate(nextD.getDate() + 7);
      setWeekStart(nextD);
    } else {
      const d = localDate(selectedDay);
      d.setDate(d.getDate() + 1);
      setSelectedDay(iso(d));
    }
  };

  // Open modal handler
  const openModal = (mode, id = null) => {
    setModalMode(mode);
    setEditId(id);
    setFormError('');

    if (mode === 'session') {
      setSessionEditMode(false);
      savedSessionForm.current = null;
      setSessionErrors([]);
      setBookingStudents({ items: [], ready: false, error: '' });
      setBookingTutors({ items: [], ready: false, error: '' });
      setBookingSubjects({ tutorId: '', items: [], error: '' });
      setSessionDetails({ loading: Boolean(id), error: '' });
      setSessionForm(getInitialSessionForm());
    } else if (mode === 'student') {
      setStudentDetails({ loading: Boolean(id), error: '' });
      setStudentForm(id ? { ...student(id) } : emptyStudentForm());
    } else if (mode === 'tutor') {
      if (id) {
        const item = tutor(id);
        if (item) {
          let firstName = item.firstName || '';
          let lastName = item.lastName || '';
          const preferredName = item.preferredName || '';
          if (!firstName && !lastName && item.name) {
            const parts = item.name.trim().split(/\s+/);
            firstName = parts[0] || '';
            lastName = parts.slice(1).join(' ') || '';
          }
          setTutorForm({
            firstName,
            lastName,
            preferredName,
            name: item.name || '',
            phone: item.phone || '',
            subjectIds: [...item.subjectIds],
            cap: item.cap || 8,
            active: item.active !== false
          });
        }
      } else {
        setTutorForm({
          firstName: '',
          lastName: '',
          preferredName: '',
          name: '',
          phone: '',
          subjectIds: [],
          cap: 8,
          active: true
        });
      }
    } else if (mode === 'availability') {
      const firstActiveTutor = tutorDirectory.items.find(t => t.active)?.id || '';
      setAvailabilityForm({
        tutor: firstActiveTutor,
        day: 'Tuesday',
        start: '15:00',
        end: '18:00'
      });
    }

    setModalOpen(true);
  };

  const closeModal = () => {
    if (sessionSavingRef.current || tutorSavingRef.current || studentSavingRef.current || availabilitySavingRef.current) return;
    setModalOpen(false);
    setEditId(null);
    setFormError('');
    setSessionForm(getInitialSessionForm());
    setTutorForm({
      firstName: '',
      lastName: '',
      preferredName: '',
      name: '',
      phone: '',
      subjectIds: [],
      cap: 8,
      active: true
    });
  };

  // Submit modal form
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (modalMode === 'session') {
      if (sessionSavingRef.current) return;
      setSessionErrors([]);
      if (editId && !sessionEditMode) return;
      if (!sessionForm.student || !sessionForm.tutor || !sessionForm.subjectId ||
          !sessionForm.date || !sessionForm.time || ![60, 90].includes(Number(sessionForm.duration)) ||
          !subjectOptions.some(subject => String(subject.subjectId) === sessionForm.subjectId)) {
        setFormError('Choose a student, tutor, shared subject, date, start time, and a duration of 60 or 90 minutes.');
        return;
      }
      sessionSavingRef.current = true;
      setSessionSaving(true);
      try {
        if (editId) await updateSession(editId, sessionForm);
        else await createSession(sessionForm);
        setWeekStart(startOfWeek(localDate(sessionForm.date)));
        setSelectedDay(sessionForm.date);
        setScheduleRefresh(value => value + 1);
        setCurrentPage('schedule');
        setBoardTutor('');
        setBoardSearch('');
        setModalOpen(false);
        setEditId(null);
        triggerToast(editId ? 'Session updated successfully.' : 'Session booked successfully.');
      } catch (error) {
        const messages = sessionValidationErrors(error);
        setSessionErrors(messages);
        setFormError(messages.length ? 'Please correct the following booking details.' : error.message);
      } finally {
        sessionSavingRef.current = false;
        setSessionSaving(false);
      }
      return;
    } else if (modalMode === 'student') {
      if (studentSavingRef.current || studentDetails.loading || studentDetails.error) return;
      const inputErrors = studentFormErrors(studentForm);
      if (inputErrors.length) {
        setFormError(inputErrors.join(' '));
        return;
      }
      if (studentForm.profile?.isActive === false && studentForm.active) {
        setFormError('This student cannot be reactivated through the current API.');
        return;
      }
      studentSavingRef.current = true;
      setStudentSaving(true);
      let savedProfile;
      try {
        const payload = studentPayload(studentForm);
        savedProfile = editId ? await updateStudent(editId, payload) : await createStudent(payload);
        if (editId && savedProfile.isActive && !studentForm.active) {
          savedProfile = await deactivateStudent(editId);
        }
        setStudentSelected(savedProfile.studentId);
        setStudentRefresh(value => value + 1);
        setTutorRefresh(value => value + 1);
        setScheduleRefresh(value => value + 1);
        setModalOpen(false);
        setEditId(null);
        triggerToast(editId ? 'Student updated.' : 'Student added.');
      } catch (error) {
        if (savedProfile) {
          setStudentForm(previous => ({ ...studentToUI(savedProfile), active: previous.active }));
          setStudentRefresh(value => value + 1);
        }
        const messages = studentValidationErrors(error);
        setFormError((savedProfile ? 'Profile saved, but deactivation failed. ' : '') + (messages.length ? messages.join(' ') : error.message));
      } finally {
        studentSavingRef.current = false;
        setStudentSaving(false);
      }
      return;
    } else if (modalMode === 'tutor') {
      if (tutorSavingRef.current) return;
      const fName = (tutorForm.firstName || '').trim();
      const lName = (tutorForm.lastName || '').trim();
      const pName = (tutorForm.preferredName || '').trim();

      if (!fName) {
        setFormError('First name is required.');
        return;
      }
      if (!lName) {
        setFormError('Last name is required.');
        return;
      }

      if (!tutorForm.subjectIds?.length) {
        setFormError('Please select at least one teaching subject for the tutor.');
        return;
      }

      const fullLegalName = [fName, lName].filter(Boolean).join(' ');
      const displayName = pName
        ? (lName ? `${pName} ${lName}` : pName)
        : fullLegalName;
      const finalName = displayName || tutorForm.name?.trim() || 'New Tutor';

      const originalTutor = editId
        ? tutorDirectory.items.find(item => String(item.id) === String(editId))
        : null;
      if (originalTutor && !originalTutor.active && tutorForm.active) {
        setFormError('Inactive tutors cannot be reactivated because the backend does not provide a reactivation endpoint.');
        return;
      }

      const payload = {
        tutorName: finalName,
        phone: tutorForm.phone.trim(),
        maxSessionsPw: Number(tutorForm.cap) || 8,
        subjectIds: [...new Set(tutorForm.subjectIds)],
        unavailabilityNotes: originalTutor?.unavailabilityNotes || '',
        notes: originalTutor?.notes || ''
      };

      tutorSavingRef.current = true;
      setTutorSaving(true);
      try {
        if (editId) {
          await updateTutor(editId, payload);
          if (originalTutor?.active && !tutorForm.active) {
            await deactivateTutor(editId);
          }
        } else {
          await createTutor(payload);
        }
        setTutorRefresh(value => value + 1);
        triggerToast(editId ? 'Changes saved.' : 'Record added to the centre system.');
      } catch (error) {
        const messages = tutorValidationErrors(error);
        setFormError(messages.length ? messages.join(' ') : error.message);
        return;
      } finally {
        tutorSavingRef.current = false;
        setTutorSaving(false);
      }
      closeModal();
      return;
    } else if (modalMode === 'availability') {
      if (availabilitySavingRef.current) return;
      const dayOfWeek = Number(Object.keys(TUTOR_DAY_NAMES).find(key => TUTOR_DAY_NAMES[key] === availabilityForm.day));
      if (!activeTutors.some(tutor => String(tutor.id) === String(availabilityForm.tutor)) || !dayOfWeek || !availabilityForm.start || !availabilityForm.end) {
        setFormError('Choose a tutor, day, start time and end time.');
        return;
      }
      if (mins(availabilityForm.end) <= mins(availabilityForm.start)) {
        setFormError('End time must be after start time.');
        return;
      }
      availabilitySavingRef.current = true;
      setAvailabilitySaving(true);
      setAvailabilityError('');
      try {
        await addTutorAvailability(availabilityForm.tutor, { dayOfWeek, startTime: availabilityForm.start, endTime: availabilityForm.end });
        setTutorDirectory(previous => ({ ...previous, loading: true, error: '' }));
        setTutorRefresh(value => value + 1);
        setModalOpen(false);
        triggerToast('Availability added.');
      } catch (error) {
        const messages = tutorValidationErrors(error);
        setFormError(messages.length ? messages.join(' ') : error.message);
      } finally {
        availabilitySavingRef.current = false;
        setAvailabilitySaving(false);
      }
    }
  };

  const handleRemoveAvailability = async (tutorId, availabilityId) => {
    if (availabilitySavingRef.current || !availabilityId) return;
    availabilitySavingRef.current = true;
    setAvailabilitySaving(true);
    setAvailabilityError('');
    try {
      await removeTutorAvailability(tutorId, availabilityId);
      setTutorDirectory(previous => ({ ...previous, loading: true, error: '' }));
      setTutorRefresh(value => value + 1);
      triggerToast('Availability removed.');
    } catch (error) {
      const messages = tutorValidationErrors(error);
      setAvailabilityError(messages.length ? messages.join(' ') : error.message);
    } finally {
      availabilitySavingRef.current = false;
      setAvailabilitySaving(false);
    }
  };

  const runSessionAction = async (action, message) => {
    if (sessionActionRef.current) return;
    sessionActionRef.current = true;
    setSessionActionPending(true);
    setActionError('');
    try {
      await action();
      setScheduleRefresh(value => value + 1);
      setTutorRefresh(value => value + 1);
      triggerToast(message);
    } catch (error) {
      const messages = sessionValidationErrors(error);
      setActionError(messages.length ? messages.join(' ') : error.message);
    } finally {
      sessionActionRef.current = false;
      setSessionActionPending(false);
    }
  };

  const handleSetStatus = (id, status) => runSessionAction(
    () => updateSessionStatus(id, status), 'Session marked ' + status.toLowerCase() + '.');


  // Navigate to Sessions tab with Tutor filtered
  const showTutorSessions = (tutorId) => {
    setCurrentPage('schedule');
    setWeekStart(startOfWeek(new Date()));
    setScheduleMode('week');
    setBoardTutor(String(tutorId));
    setBoardSearch('');
  };

  // Filtered sessions for board
  const boardDates = scheduleMode === 'week' ? weekDates : [localDate(selectedDay)];
  const boardSearchLower = boardSearch.toLowerCase();

  // Session stats for Sessions page
  const sessionStats = useMemo(() => {
    const counts = { Booked: 0, Attended: 0, Cancelled: 0, Missed: 0 };
    (listLoading || listState.error ? [] : data.sessions).forEach(s => {
      if (counts[s.status] !== undefined) counts[s.status]++;
    });
    return counts;
  }, [data.sessions, listLoading, listState.error]);

  // Filtered sessions list for Sessions page
  const filteredSessions = useMemo(() => {
    const q = sessionSearch.toLowerCase();
    return (listLoading || listState.error ? [] : data.sessions)
      .filter(s => {
        const matchesStatus = !sessionFilter || s.status === sessionFilter;
        const studentName = s.studentName?.toLowerCase() || '';
        const tutorName = s.tutorName?.toLowerCase() || '';
        const subjectName = s.subject?.toLowerCase() || '';
        const matchesQuery = !q || studentName.includes(q) || tutorName.includes(q) || subjectName.includes(q);
        return matchesStatus && matchesQuery;
      })
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }, [data.sessions, sessionFilter, sessionSearch, listLoading, listState.error]);

  // Filtered students for Students page
  const filteredStudents = useMemo(() => {
    const q = studentSearch.toLowerCase();
    return (studentDirectory.loading || studentDirectory.error ? [] : data.students).filter(s => {
      const matchesState = studentState === 'all' || (studentState === 'active' ? s.active : !s.active);
      const matchesQuery = !q ||
        s.name.toLowerCase().includes(q) ||
        s.guardians.some(guardian => [guardian.guardianName, guardian.guardianPhone, guardian.guardianEmail].some(value => value.toLowerCase().includes(q))) ||
        s.subjects.join(' ').toLowerCase().includes(q);
      return matchesState && matchesQuery;
    });
  }, [data.students, studentState, studentSearch, studentDirectory]);

  // Filtered tutors for Tutors page
  const filteredTutors = useMemo(() => {
    const q = tutorSearch.toLowerCase();
    return tutorDirectory.items.filter(t => {
      const matchesState = tutorState === 'all' || (tutorState === 'active' ? t.active : !t.active);
      const matchesQuery = !q ||
        t.name.toLowerCase().includes(q) ||
        (Array.isArray(t.subjects) ? t.subjects : []).join(' ').toLowerCase().includes(q);
      return matchesState && matchesQuery;
    });
  }, [tutorDirectory.items, tutorState, tutorSearch]);

  const editingTutor = modalMode === 'tutor' && editId
    ? tutorDirectory.items.find(item => String(item.id) === String(editId))
    : null;

  // Selected student details & history
  const selectedStudentObj = filteredStudents.find(item => item.id === studentSelected) || filteredStudents[0] || null;
  const historyId = selectedStudentObj?.id ?? null;
  const historyLoading = historyState.loading || historyState.id !== historyId;
  const studentHistory = historyLoading || historyState.error ? [] : historyState.items;
  useEffect(() => {
    if (currentPage !== 'students' || historyId === null) return;
    const controller = new AbortController();
    // eslint-disable-next-line react/set-state-in-effect -- Reset the loading state for this external request.
    setHistoryState({ id: historyId, items: [], loading: true, error: '' });
    getStudentHistory(historyId, { signal: controller.signal }).then(items => {
      if (!controller.signal.aborted) setHistoryState({ id: historyId, items, loading: false, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setHistoryState({ id: historyId, items: [], loading: false, error: error.message });
    });
    return () => controller.abort();
  }, [currentPage, historyId, scheduleRefresh]);

  return (
    <div className="app">
      <LoadingScreen />
      <main className="shell">
        {/* Top Header */}
        <header className="topbar">
          <div className="brand">
            <div className="mark">R</div>
            <span>Redgum Tutoring</span>
          </div>
          <div className="centre-status">
            <span className="open-dot"></span>
            <span>Centre system</span>
            <span className="term-pill">Term 3 · 2026</span>
          </div>
        </header>

        {actionError && <div className="notice error" role="alert">{actionError}<button className="btn small" onClick={() => setActionError('')}>Dismiss</button></div>}
        {sessionActionPending && <p role="status">Saving session...</p>}
        <div className="layout">
          {/* Left Sidebar */}
          <aside className="sidebar">
            <div className="side-label">Centre</div>
            <button
              className={`nav ${currentPage === 'schedule' ? 'active' : ''}`}
              onClick={() => setCurrentPage('schedule')}
            >
              <span className="nav-icon">▦</span>Weekly schedule
            </button>
            <button
              className={`nav ${currentPage === 'sessions' ? 'active' : ''}`}
              onClick={() => setCurrentPage('sessions')}
            >
              <span className="nav-icon">◷</span>All sessions
            </button>
            <button
              className={`nav ${currentPage === 'students' ? 'active' : ''}`}
              onClick={() => setCurrentPage('students')}
            >
              <span className="nav-icon">○</span>Students
            </button>
            <button
              className={`nav ${currentPage === 'tutors' ? 'active' : ''}`}
              onClick={() => setCurrentPage('tutors')}
            >
              <span className="nav-icon">◇</span>Tutors
            </button>
            <button
              className={`nav ${currentPage === 'availability' ? 'active' : ''}`}
              onClick={() => setCurrentPage('availability')}
            >
              <span className="nav-icon">⌁</span>Availability
            </button>

            <div className="side-note">
              <b>Centre hours</b>
              <span>
                Tuesday–Friday · 3:00–8:00 pm<br />
                Saturday · 8:30 am–1:00 pm<br />
                Closed Monday & Sunday
              </span>
            </div>
          </aside>

          {/* Main Content Area */}
          <section className="main">
            {/* 1. Schedule View */}
            {currentPage === 'schedule' && (
              <section className={`page active ${density === 'minimal' ? 'minimal' : ''}`} id="page-schedule">
                <div className="page-head">
                  <div>
                    <div className="eyebrow">Week at a glance</div>
                    <h1>Centre schedule</h1>
                    <p>Live schedule, Tuesday to Saturday. Open a session to edit its booking details.</p>
                  </div>
                  <div className="head-actions">
                    <button className="btn ghost" onClick={() => window.print()}>Print week</button>
                    <button className="btn" onClick={() => { setCopySourceWeek(scheduleWeek); setCopyError(''); setCopyResult(null); copyDialogRef.current.showModal(); }}>Copy week forward</button>
                    <button className="btn primary" onClick={() => openModal('session')}>＋ New session</button>
                  </div>
                </div>

                <div className="toolbar">
                  <div className="week-nav">
                    <button onClick={handlePrevWeek} aria-label="Previous period">‹</button>
                    <span className="week-label">
                      {scheduleMode === 'week'
                        ? `${fmtDate(iso(boardDates[0]))} – ${fmtDate(iso(boardDates[4]), { day: 'numeric', month: 'long', year: 'numeric' })}`
                        : fmtDate(selectedDay, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={handleNextWeek} aria-label="Next period">›</button>
                  </div>

                  <button className="btn" onClick={() => { const now = new Date(); setToday(iso(now)); setSelectedDay(iso(now)); setWeekStart(startOfWeek(now)); }}>Today</button>
                  <div className="segment">
                    <button
                      className={scheduleMode === 'week' ? 'on' : ''}
                      onClick={() => { setWeekStart(startOfWeek(localDate(selectedDay))); setScheduleMode('week'); }}
                    >
                      Week
                    </button>
                    <button
                      className={scheduleMode === 'day' ? 'on' : ''}
                      onClick={() => { setSelectedDay(iso(startOfWeek(localDate(today))) === iso(weekStart) ? today : iso(weekDates[0])); setScheduleMode('day'); }}
                    >
                      Day
                    </button>
                  </div>

                  {scheduleMode === 'day' && (
                    <input
                      className="select"
                      type="date"
                      value={selectedDay}
                      onChange={(e) => { if (e.target.value) setSelectedDay(e.target.value); }}
                      aria-label="Choose day"
                    />
                  )}

                  <div className="segment">
                    <button
                      className={density === 'detailed' ? 'on' : ''}
                      onClick={() => setDensity('detailed')}
                    >
                      Detailed
                    </button>
                    <button
                      className={density === 'minimal' ? 'on' : ''}
                      onClick={() => setDensity('minimal')}
                    >
                      Minimal
                    </button>
                  </div>

                  <div className="search">
                    <input
                      type="search"
                      placeholder="Search student or tutor"
                      value={boardSearch}
                      onChange={(e) => setBoardSearch(e.target.value)}
                    />
                  </div>

                  <select
                    className="select"
                    value={boardTutor}
                    onChange={(e) => setBoardTutor(e.target.value)}
                  >
                    <option value="">All tutors</option>
                    {schedule.tutors.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {copyResult && (
                  <section className="copy-result" aria-label="Copy week result">
                    <div className="copy-result-icon" aria-hidden="true">&#10003;</div>
                    <div className="copy-result-content" role="status">
                      <h2>{copyResult.copiedCount > 0 ? 'Week copied successfully' : 'Copy complete - no sessions added'}</h2>
                      <p>Destination: {weekRange(copyResult.targetWeekStart)}</p>
                      <dl className="copy-result-counts">
                        <div><dt>Sessions copied</dt><dd>{copyResult.copiedCount}</dd></div>
                        <div className="copy-result-skipped"><dt>Sessions skipped</dt><dd>{copyResult.skippedCount}</dd></div>
                      </dl>
                    </div>
                    <button type="button" className="copy-result-dismiss" aria-label="Dismiss copy result" onClick={() => setCopyResult(null)}>&#215;</button>
                  </section>
                )}
                {scheduleLoading && <p role="status">Loading schedule...</p>}
                {!scheduleLoading && schedule.error && <div className="notice error" role="alert"><span>{schedule.error}</span><button className="btn" onClick={() => setScheduleRefresh(value => value + 1)}>Retry</button></div>}
                <div
                  aria-busy={scheduleLoading}
                  className="board"
                  style={{
                    gridTemplateColumns: scheduleMode === 'day' ? 'minmax(280px, 560px)' : undefined
                  }}
                >
                  {boardDates.map(d => {
                    const ds = iso(d);
                    const isToday = ds === today;
                    const items = scheduleSessions
                      .filter(x => {
                        const matchesDate = x.date === ds;
                        const sObj = { name: x.studentName };
                        const tObj = { name: x.tutorName };
                        const matchesSearch = !boardSearchLower ||
                          (sObj && sObj.name.toLowerCase().includes(boardSearchLower)) ||
                          (tObj && tObj.name.toLowerCase().includes(boardSearchLower));
                        const matchesTutor = !boardTutor || String(x.tutor) === boardTutor;
                        return matchesDate && matchesSearch && matchesTutor;
                      })
                      .sort((a, b) => a.time.localeCompare(b.time));

                    return (
                      <article key={ds} className={`day ${isToday ? 'today' : ''}`}>
                        <header className="day-head">
                          <div>
                            <div className="day-title">
                              {dayName(ds)}{isToday ? ' · Today' : ''}
                            </div>
                            <div className="day-date">
                              {fmtDate(ds, { day: 'numeric', month: 'long' })}
                            </div>
                          </div>
                          <span className="count">{items.length}</span>
                        </header>

                        <div
                          className="schedule-sessions"
                        >
                          {items.length > 0 ? (
                            items.map(x => {
                              return (
                                <div
                                  key={x.id}
                                  className="session-card"
                                >
                                  <div className="session-top">
                                    <span className="time">{x.time} · {x.duration} min</span>
                                    <span className={`badge ${x.status.toLowerCase()}`}>{x.status}</span>
                                  </div>
                                  <div className="student-name">{x.studentName}</div>
                                  <div className="session-meta">{x.tutorName}</div>
                                  <div className="subject-line">
                                    <span>{x.subject}</span>
                                    <button
                                      className="btn small ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openModal('session', x.id);
                                      }}
                                    >
                                      Open
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="empty">{scheduleLoading ? 'Loading...' : schedule.error ? 'Schedule unavailable.' : 'No sessions.'}</div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 2. All Sessions View */}
            {currentPage === 'sessions' && (
              <section className="page active" id="page-sessions">
                <div className="page-head">
                  <div>
                    <div className="eyebrow">Complete booking record</div>
                    <h1>All sessions</h1>
                    <p>Review, move, cancel, or record the outcome of every session.</p>
                  </div>
                  <button className="btn primary" onClick={() => openModal('session')}>＋ New session</button>
                </div>

                <div className="stats">
                  <div className="stat">
                    <div className="stat-label">Booked</div>
                    <div className="stat-value">{sessionStats.Booked}</div>
                    <div className="stat-note">session{sessionStats.Booked === 1 ? '' : 's'} in the record</div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Attended</div>
                    <div className="stat-value">{sessionStats.Attended}</div>
                    <div className="stat-note">session{sessionStats.Attended === 1 ? '' : 's'} in the record</div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Cancelled</div>
                    <div className="stat-value">{sessionStats.Cancelled}</div>
                    <div className="stat-note">session{sessionStats.Cancelled === 1 ? '' : 's'} in the record</div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Missed</div>
                    <div className="stat-value">{sessionStats.Missed}</div>
                    <div className="stat-note">session{sessionStats.Missed === 1 ? '' : 's'} in the record</div>
                  </div>
                </div>

                <div className="toolbar">
                  <div className="segment">
                    {['', 'Booked', 'Attended', 'Cancelled', 'Missed'].map(statusKey => (
                      <button
                        key={statusKey}
                        className={sessionFilter === statusKey ? 'on' : ''}
                        onClick={() => setSessionFilter(statusKey)}
                      >
                        {statusKey || 'All'}
                      </button>
                    ))}
                  </div>

                  <DateRangePicker fromDate={fromDate} setFromDate={setFromDate}
                    toDate={toDate} setToDate={setToDate} datePickerOpen={datePickerOpen}
                    setDatePickerOpen={setDatePickerOpen} appliedDateRange={appliedDateRange}
                    setAppliedDateRange={setAppliedDateRange} sessions={filteredSessions}
                    fmtDate={fmtDate} localDate={localDate} />

                  <div className="search">
                    <input
                      type="search"
                      placeholder="Find a session"
                      value={sessionSearch}
                      onChange={(e) => setSessionSearch(e.target.value)}
                    />
                  </div>
                </div>

                {listLoading && <p role="status">Loading sessions...</p>}
                {!listLoading && listState.error && <div className="notice error" role="alert">{listState.error}<button className="btn small" onClick={() => setScheduleRefresh(value => value + 1)}>Retry</button></div>}
                <div className="session-list-card">
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date & time</th>
                          <th>Student</th>
                          <th>Tutor</th>
                          <th>Subject</th>
                          <th>Length</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSessions.length > 0 ? (
                          filteredSessions.map(x => {
                            return (
                              <tr key={x.id}>
                                <td>
                                  <b>{fmtDate(x.date, { weekday: 'short', day: 'numeric', month: 'short' })}</b><br />
                                  <span className="session-meta">{x.time}–{endTime(x.time, x.duration)}</span>
                                </td>
                                <td>{x.studentName}</td>
                                <td>{x.tutorName}</td>
                                <td>{x.subject}</td>
                                <td>{x.duration} min</td>
                                <td>
                                  <span className={`badge ${x.status.toLowerCase()}`}>{x.status}</span>
                                </td>
                                <td>
                                  <div className="inline-actions">
                                    <button
                                      className="btn small ghost"
                                      onClick={() => openModal('session', x.id)}
                                    >
                                      Edit
                                    </button>
                                    {x.status === 'Booked' && (
                                      <>
                                        <button
                                          className="btn small"
                                          disabled={sessionActionPending || listLoading}
                                          onClick={() => handleSetStatus(x.id, 'Attended')}
                                        >
                                          Attended
                                        </button>
                                        <button className="btn small" disabled={sessionActionPending || listLoading} onClick={() => handleSetStatus(x.id, 'Missed')}>Missed</button>
                                        <button
                                          className="btn small danger"
                                          disabled={sessionActionPending || listLoading}
                                          onClick={() => handleSetStatus(x.id, 'Cancelled')}
                                        >
                                          Cancel
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="7">
                              <div className="empty">{listLoading ? 'Loading...' : listState.error ? 'Sessions unavailable.' : 'No sessions match this view.'}</div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* 3. Students View */}
            {currentPage === 'students' && (
              <section className="page active" id="page-students">
                {studentDirectory.loading && <p role="status">Loading students...</p>}
                {studentDirectory.error && <div className="notice error" role="alert">{studentDirectory.error}<button className="btn small" onClick={() => setStudentRefresh(value => value + 1)}>Retry</button></div>}
                <div className="page-head">
                  <div>
                    <div className="eyebrow">{data.students.filter(s => s.active).length} active students</div>
                    <h1>Students</h1>
                    <p>Family contacts, subjects, status, and complete session history in one place.</p>
                  </div>
                  <button className="btn primary" onClick={() => openModal('student')}>＋ Add student</button>
                </div>

                <div className="toolbar">
                  <div className="search">
                    <input
                      type="search"
                      placeholder="Search students or contacts"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                    />
                  </div>
                  <select
                    className="select"
                    value={studentState}
                    onChange={(e) => setStudentState(e.target.value)}
                  >
                    <option value="active">Active students</option>
                    <option value="all">All students</option>
                    <option value="inactive">Inactive only</option>
                  </select>
                </div>

                <div className="split">
                  <div className="panel">
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Subjects</th>
                            <th>Primary guardian</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStudents.length > 0 ? (
                            filteredStudents.map(x => (
                              <tr
                                key={x.id}
                                className={`clickable ${studentSelected === x.id ? 'selected' : ''}`}
                                onClick={() => setStudentSelected(x.id)}
                              >
                                <td>
                                  <div className="person">
                                    <span className="initial">{initials(x.name)}</span>
                                    <span>
                                      <b>{x.name}</b>
                                      <small>Student #{x.id}</small>
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <div className="chips">
                                    {x.subjects.map((sub, index) => (
                                      <span key={x.subjectIds[index]} className="chip">{sub}</span>
                                    ))}
                                  </div>
                                </td>
                                <td>
                                  {x.guardian}<br />
                                  <span className="session-meta">{x.phone}</span>
                                </td>
                                <td>
                                  <span className={`badge ${x.active ? 'active' : 'inactive'}`}>
                                    {x.active ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="4">
                                <div className="empty">No students match this view.</div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Student Details & Session History */}
                  <aside className="panel detail-panel">
                    {selectedStudentObj ? (
                      <>
                        <div className="detail-hero">
                          <span className="initial">{initials(selectedStudentObj.name)}</span>
                          <h2>{selectedStudentObj.name}</h2>
                          <p>Student #{selectedStudentObj.id}</p>
                        </div>
                        <div className="facts">
                          {['mediaConsent', 'firstAidNeeded', 'shareProgress'].map((field, index) => <div className="fact" key={field}>
                            <label>{['Media consent', 'First aid needed', 'Share progress'][index]}</label>
                            <div>{selectedStudentObj[field] == null ? 'Not specified' : selectedStudentObj[field] ? 'Yes' : 'No'}</div>
                          </div>)}
                          <div className="fact"><label>Availability notes</label><div className="student-notes">{selectedStudentObj.availabilityNotes || 'None'}</div></div>
                          <div className="fact"><label>Notes</label><div className="student-notes">{selectedStudentObj.notes || 'None'}</div></div>
                          <div className="fact">
                            <label>Subjects</label>
                            <div className="chips">
                              {selectedStudentObj.subjects.map((s, index) => (
                                <span key={selectedStudentObj.subjectIds[index]} className="chip">{s}</span>
                              ))}
                            </div>
                          </div>
                          <div className="fact">
                            <label>Status</label>
                            <div>
                              <span className={`badge ${selectedStudentObj.active ? 'active' : 'inactive'}`}>
                                {selectedStudentObj.active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <section className="guardian-history" aria-labelledby="student-guardians-title">
                          <h3 className="subhead" id="student-guardians-title">Guardians</h3>
                          <ul className="guardian-details-list">
                            {selectedStudentObj.guardians.map((guardian, index) => (
                              <li className="history-row" key={guardian.guardianId ?? index}>
                                <div>
                                  <b>{guardian.guardianName}</b>
                                  <span>{guardian.relationship}</span>
                                  <span>{guardian.guardianPhone}</span>
                                  {guardian.guardianEmail && <span>{guardian.guardianEmail}</span>}
                                </div>
                                {index === 0 && <span className="badge active">Primary</span>}
                              </li>
                            ))}
                          </ul>
                        </section>
                        <div className="history">
                          <div className="inline-actions" style={{ justifyContent: 'space-between', marginBottom: 11 }}>
                            <div className="subhead" style={{ margin: 0 }}>Session history</div>
                            <button
                              className="btn small ghost"
                              onClick={() => openModal('student', selectedStudentObj.id)}
                            >
                              Edit record
                            </button>
                          </div>
                          {historyLoading && <p role="status">Loading history...</p>}
                          {historyState.error && <div role="alert">{historyState.error}<button className="btn small" onClick={() => setScheduleRefresh(value => value + 1)}>Retry</button></div>}
                          {studentHistory.length > 0 ? (
                            studentHistory.map(s => (
                              <div key={s.id} className="history-row">
                                <div className="history-date">
                                  {fmtDate(s.date, { day: 'numeric', month: 'short' })}
                                </div>
                                <div>
                                  <b>{s.subject}</b>
                                  <span>{s.tutorName} · {s.duration} min</span>
                                </div>
                                <span className={`badge ${s.status.toLowerCase()}`}>{s.status}</span>
                              </div>
                            ))
                          ) : (
                            <div className="empty">{historyLoading ? 'Loading...' : historyState.error ? 'History unavailable.' : 'No sessions recorded yet.'}</div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="empty">Choose a student to see their record.</div>
                    )}
                  </aside>
                </div>
              </section>
            )}

            {/* 4. Tutors View */}
            {currentPage === 'tutors' && (
              <section className="page active" id="page-tutors">
                <div className="page-head">
                  <div>
                    <div className="eyebrow">{tutorDirectory.items.length} tutors · centre-wide</div>
                    <h1>Tutors</h1>
                    <p>Teaching subjects, weekly capacity, upcoming sessions, and active status.</p>
                  </div>
                  <button className="btn primary" onClick={() => openModal('tutor')}>＋ Add tutor</button>
                </div>

                <div className="toolbar">
                  <div className="search">
                    <input
                      type="search"
                      placeholder="Search tutors or subjects"
                      value={tutorSearch}
                      onChange={(e) => setTutorSearch(e.target.value)}
                    />
                  </div>
                  <select
                    className="select"
                    value={tutorState}
                    onChange={(e) => setTutorState(e.target.value)}
                  >
                    <option value="active">Active tutors</option>
                    <option value="all">All tutors</option>
                    <option value="inactive">Inactive only</option>
                  </select>
                </div>

                <div className="tutor-grid">
                  {tutorDirectory.loading ? (
                    <div className="empty" role="status">Loading tutors...</div>
                  ) : tutorDirectory.error ? (
                    <div className="empty" role="alert">
                      <p>{tutorDirectory.error}</p>
                      <button className="btn small" onClick={() => { setTutorDirectory(previous => ({ ...previous, loading: true, error: '' })); setTutorRefresh(value => value + 1); }}>Retry</button>
                    </div>
                  ) : filteredTutors.length > 0 ? (
                    filteredTutors.map(x => {
                      const booked = tutorCapacity[x.id];
                      const cap = x.cap || 8;
                      const pct = booked == null ? 0 : Math.min(100, Math.round((booked / cap) * 100));

                      return (
                        <article key={x.id} className="tutor-card">
                          <div className="tutor-card-top">
                            <div className="avatar">{initials(x.name)}</div>
                            <span className={`badge ${x.active ? 'active' : 'inactive'}`}>
                              {x.active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <h3>{x.name}</h3>
                          <p>
                            {(Array.isArray(x.subjects) ? x.subjects : []).join(' · ')}<br />
                            {x.phone}
                          </p>
                          <div className="capacity-row">
                            <span>Upcoming load</span>
                            <span>{booked == null ? 'Unavailable' : booked} / {cap}</span>
                          </div>
                          <div className="capacity">
                            <i style={{ width: `${pct}%` }}></i>
                          </div>
                          <div className="inline-actions" style={{ marginTop: 13 }}>
                            <button
                              className="btn small ghost"
                              onClick={() => openModal('tutor', x.id)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn small"
                              onClick={() => showTutorSessions(x.id)}
                            >
                              Upcoming sessions
                            </button>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className="empty">No tutors match this view.</div>
                  )}
                </div>
              </section>
            )}

            {/* 5. Tutor Availability View */}
            {currentPage === 'availability' && (
              <section className="page active" id="page-availability">
                <div className="page-head">
                  <div>
                    <div className="eyebrow">Term 3 teaching windows</div>
                    <h1>Tutor availability</h1>
                    <p>Bookings must start and finish inside one of these windows.</p>
                  </div>
                  <button className="btn primary" disabled={availabilitySaving || tutorDirectory.loading || Boolean(tutorDirectory.error) || !activeTutors.length} onClick={() => openModal('availability')}>＋ Add availability</button>
                </div>

                <div className="notice">
                  <b>Rule:</b>
                  <span>The system checks the tutor, day, start time, and full session length before saving or moving any booking. Invalid bookings are refused with a reason.</span>
                </div>

                {availabilityError && <div className="notice error" role="alert">{availabilityError}</div>}
                {!tutorDirectory.loading && !tutorDirectory.error && !activeTutors.length && <p className="empty">No active tutors available.</p>}
                {tutorDirectory.loading ? (
                  <div className="empty" role="status">Loading tutor availability...</div>
                ) : tutorDirectory.error ? (
                  <div className="empty" role="alert">
                    <p>{tutorDirectory.error}</p>
                    <button className="btn small" onClick={() => { setTutorDirectory(previous => ({ ...previous, loading: true, error: '' })); setTutorRefresh(value => value + 1); }}>Retry</button>
                  </div>
                ) : (
                  <div className="availability-grid">
                  <div className="grid-head">Tutor</div>
                  {['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                    <div key={day} className="grid-head">{day}</div>
                  ))}

                  {activeTutors.map(t => (
                    <React.Fragment key={t.id}>
                      <div className="tutor-label">
                        <b>{t.name}</b>
                        <span>{t.subjects.join(', ')}</span>
                      </div>
                      {['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                        const dayWindows = (t.windows || []).filter(w => w[0] === day);
                        return (
                          <div key={day}>
                            {dayWindows.length > 0 ? (
                              dayWindows.map(w => (
                                <div key={w[3]} className="window">
                                  <span>{w[1]}–{w[2]}</span>
                                  <button
                                    aria-label={"Remove " + t.name + " availability on " + day + " " + w[1] + " to " + w[2]}
                                    disabled={availabilitySaving || !w[3]}
                                    onClick={() => handleRemoveAvailability(t.id, w[3])}

                                  >
                                    ×
                                  </button>
                                </div>
                              ))
                            ) : (
                              <span className="session-meta">Unavailable</span>
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                  </div>
                )}
              </section>
            )}
          </section>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        <button
          className={currentPage === 'schedule' ? 'active' : ''}
          onClick={() => setCurrentPage('schedule')}
        >
          <span>▦</span>Week
        </button>
        <button
          className={currentPage === 'sessions' ? 'active' : ''}
          onClick={() => setCurrentPage('sessions')}
        >
          <span>◷</span>Sessions
        </button>
        <button
          className={currentPage === 'students' ? 'active' : ''}
          onClick={() => setCurrentPage('students')}
        >
          <span>○</span>Students
        </button>
        <button
          className={currentPage === 'tutors' ? 'active' : ''}
          onClick={() => setCurrentPage('tutors')}
        >
          <span>◇</span>Tutors
        </button>
        <button
          className={currentPage === 'availability' ? 'active' : ''}
          onClick={() => setCurrentPage('availability')}
        >
          <span>⌁</span>Hours
        </button>
      </nav>

      <dialog ref={copyDialogRef} className="modal copy-week-dialog" aria-labelledby="copy-week-title" aria-describedby="copy-week-description" onCancel={event => { if (copyPendingRef.current) event.preventDefault(); }}>
        <div className="modal-head"><h2 id="copy-week-title">Copy week forward?</h2></div>
        <p id="copy-week-description">Copy the full source week into the following week. This includes Monday and Sunday and is not limited by the schedule's search or tutor filter.</p>
        {copySourceWeek && <p><strong>From:</strong> {weekRange(copySourceWeek)}<br /><strong>To:</strong> {weekRange(copyTargetWeek)}</p>}
        {copyError && <div className="form-error" role="alert" style={{ display: 'block' }}>{copyError}</div>}
        {copyPending && <p role="status">Copying sessions...</p>}
        <div className="modal-actions">
          <button type="button" className="btn" autoFocus disabled={copyPending} onClick={() => copyDialogRef.current.close()}>Cancel</button>
          <button type="button" className="btn primary" disabled={copyPending} onClick={handleCopyWeek}>{copyPending ? 'Copying...' : 'Confirm copy'}</button>
        </div>
      </dialog>

      {/* Modal Dialog Layer */}
      <div
        className={`modal-layer ${modalOpen ? 'open' : ''}`}
        aria-hidden={!modalOpen}
        onClick={(e) => {
          if (e.target.classList.contains('modal-layer')) closeModal();
        }}
      >
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal-head">
            <div>
              {modalMode === 'tutor' && (
                <div className="eyebrow modal-profile-eyebrow">
                  {editId ? `Tutor Profile · Editing ${editId}` : 'Tutor Profile · New Tutor'}
                </div>
              )}
              <h2>
                {modalMode === 'session' && (editId ? (sessionEditMode ? 'Edit session' : 'Session details') : 'Book a session')}
                {modalMode === 'student' && (editId ? 'Edit student' : 'Add a student')}
                {modalMode === 'tutor' && (editId ? 'Edit tutor profile' : 'Add tutor profile')}
                {modalMode === 'availability' && 'Add availability'}
              </h2>
              <p>
                {modalMode === 'session' && 'The booking will be checked against the tutor’s availability before it is saved.'}
                {modalMode === 'student' && 'Record the details needed to identify the student, contact their family, and book tutoring.'}
                {modalMode === 'tutor' && (editId
                  ? 'Update tutor personal details and profile information.'
                  : 'Complete personal details to register a new tutor profile.')}
                {modalMode === 'availability' && 'A tutor can have several teaching windows across the week.'}
              </p>
            </div>
            <button className="close" onClick={closeModal} aria-label="Close">×</button>
          </div>

          <form onSubmit={handleModalSubmit}>
            {modalMode === 'student' && studentDetails.loading && <p role="status">Loading student profile...</p>}
            {modalMode === 'student' && studentDetails.error && <div role="alert">{studentDetails.error}<button type="button" className="btn" onClick={() => setStudentDetailsRetry(value => value + 1)}>Retry</button></div>}
            {['student', 'tutor'].includes(modalMode) && tutorDirectory.loading && <p role="status">Loading subjects...</p>}
            {['student', 'tutor'].includes(modalMode) && tutorDirectory.error && <div role="alert">{tutorDirectory.error}<button type="button" className="btn" onClick={() => setTutorRefresh(value => value + 1)}>Retry subjects</button></div>}
            {modalMode === 'session' && editId && sessionDetails.loading && <p role="status">Loading session details...</p>}
            {modalMode === 'session' && editId && sessionDetails.error && <div role="alert">{sessionDetails.error}<button type="button" className="btn" onClick={() => { setSessionDetails({ loading: true, error: '' }); setDetailsRetry(value => value + 1); }}>Retry</button></div>}
            <fieldset disabled={sessionSaving || tutorSaving || studentSaving || availabilitySaving || (modalMode === 'student' && (studentDetails.loading || Boolean(studentDetails.error))) || (modalMode === 'session' && Boolean(editId) && (!sessionEditMode || sessionDetails.loading || Boolean(sessionDetails.error)))} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <div className="form-grid">
              {/* Session Modal Fields */}
              {modalMode === 'session' && (
                <>
                  <div className="field">
                    <label htmlFor="f_student">Student *</label>
                    <select
                      id="f_student"
                      value={sessionForm.student}
                      onChange={(e) => setSessionForm({ ...sessionForm, student: e.target.value, subject: '', subjectId: '' })}
                      disabled={!bookingStudents.ready || Boolean(bookingStudents.error)}
                      required
                    >
                      <option value="">{bookingStudents.ready ? 'Select a student' : 'Loading students...'}</option>
                      {editId && sessionForm.student && !bookingStudents.items.some(student => String(student.studentId) === sessionForm.student) && <option value={sessionForm.student}>Student #{sessionForm.student}</option>}
                      {bookingStudents.items.filter(student => student.isActive || (editId && String(student.studentId) === sessionForm.student)).map(student => <option key={student.studentId} value={student.studentId}>{student.studentName}</option>)}
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="f_tutor">Tutor *</label>
                    <select
                      id="f_tutor"
                      value={sessionForm.tutor}
                      onChange={(e) => { setSessionForm({ ...sessionForm, tutor: e.target.value, subject: '', subjectId: '' }); setBookingSubjects({ tutorId: '', items: [], error: '' }); }}
                      disabled={!bookingTutors.ready || Boolean(bookingTutors.error)}
                      required
                    >
                      {<option value="">{bookingTutors.ready ? 'Select a tutor' : 'Loading tutors...'}</option>}
                      {editId && sessionForm.tutor && !bookingTutors.items.some(tutor => String(tutor.tutorId) === sessionForm.tutor) && <option value={sessionForm.tutor}>Tutor #{sessionForm.tutor}</option>}
                      {bookingTutors.items.filter(t => t.isActive || (editId && String(t.tutorId) === sessionForm.tutor)).map(t => <option key={t.tutorId} value={t.tutorId}>{t.tutorName}</option>)}
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="f_date">Date *</label>
                    <input
                      id="f_date"
                      type="date"
                      value={sessionForm.date}
                      onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="f_time">Start time *</label>
                    <input
                      id="f_time"
                      type="time"
                      value={sessionForm.time}
                      onChange={(e) => setSessionForm({ ...sessionForm, time: e.target.value })}
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="f_duration">Length *</label>
                    <select
                      id="f_duration"
                      value={sessionForm.duration}
                      onChange={(e) => setSessionForm({ ...sessionForm, duration: Number(e.target.value) })}
                    >
                      <option value={60}>60 minutes</option>
                      <option value={90}>90 minutes</option>
                    </select>
                  </div>

                  <div className="field full">
                    <label htmlFor="f_subject">Subject *</label>
                    <select
                      id="f_subject"
                      value={sessionForm.subjectId || ''}
                      onChange={(e) => {
                        const subject = subjectOptions.find(item => String(item.subjectId) === e.target.value);
                        setSessionForm({ ...sessionForm, subjectId: e.target.value, subject: subject?.subjectName || '' });
                      }}
                      disabled={!sessionForm.student || !sessionForm.tutor || subjectsLoading || !subjectOptions.length}
                      required
                    >
                      <option value="">{!sessionForm.student ? 'Select a student first' : !sessionForm.tutor ? 'Select a tutor first' : subjectsLoading ? 'Loading subjects...' : bookingSubjects.error ? 'Unable to load subjects' : !subjectOptions.length ? 'No shared subjects for this student and tutor' : 'Select a subject'}</option>
                      {editId && sessionForm.subjectId && !subjectOptions.some(subject => String(subject.subjectId) === sessionForm.subjectId) && <option value={sessionForm.subjectId}>Subject #{sessionForm.subjectId}</option>}
                      {subjectOptions.map(subject => <option key={subject.subjectId} value={subject.subjectId}>{subject.subjectName}{subject.subjectClass ? ' - Year ' + subject.subjectClass : ''}</option>)}
                    </select>
                    {(bookingStudents.error || bookingTutors.error || bookingSubjects.error) && <div role="alert"><span>{bookingStudents.error || bookingTutors.error || bookingSubjects.error}</span><button type="button" className="btn small" onClick={() => { setBookingSubjects({ tutorId: '', items: [], error: '' }); setBookingRetry(value => value + 1); }}>Retry</button></div>}
                    {bookingTutors.ready && !bookingTutors.error && !bookingTutors.items.length && <p role="status">No active tutors available.</p>}
                  </div>

                  {editId && <><div className="field full"><label htmlFor="f_notes">Notes</label><textarea id="f_notes" value={sessionForm.notes || ''} onChange={e => setSessionForm({ ...sessionForm, notes: e.target.value })} /></div><div className="field full"><label htmlFor="f_lesson_notes">Lesson notes</label><textarea id="f_lesson_notes" value={sessionForm.lessonNotes || ''} onChange={e => setSessionForm({ ...sessionForm, lessonNotes: e.target.value })} /></div></>}
                  {editId && (
                    <div className="field full">
                      <label htmlFor="f_status">Status</label>
                      <select
                        id="f_status"
                        value={sessionForm.status}
                        onChange={(e) => setSessionForm({ ...sessionForm, status: e.target.value })}
                      >
                        <option value="Booked">Booked</option>
                        <option value="Attended">Attended</option>
                        <option value="Cancelled">Cancelled</option>
                        <option value="Missed">Missed</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              {modalMode === 'student' && <StudentFields key={'student:' + modalOpen + ':' + editId}
                form={studentForm} setForm={setStudentForm} subjectOptions={subjectCatalogOptions} editing={Boolean(editId)} />}

              {/* Tutor Modal Fields */}
              {modalMode === 'tutor' && (
                <>
                  {/* Section 1: Personal Details (Jira MITP426PER2-212) */}
                  <div className="field full form-section-divider">
                    <div className="form-section-header">
                      <span className="form-section-icon" aria-hidden="true">👤</span>
                      <div>
                        <h3 className="form-section-title">Personal Details</h3>
                        <p className="form-section-subtitle">Tutor identification and name information.</p>
                      </div>
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="f_tutor_first_name">
                      First name <span className="req-asterisk" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="f_tutor_first_name"
                      name="firstName"
                      type="text"
                      placeholder="e.g. Helen"
                      value={tutorForm.firstName || ''}
                      onChange={(e) => handleTutorPersonalChange('firstName', e.target.value)}
                      required
                      autoComplete="given-name"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="f_tutor_last_name">
                      Last name <span className="req-asterisk" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="f_tutor_last_name"
                      name="lastName"
                      type="text"
                      placeholder="e.g. Vasquez"
                      value={tutorForm.lastName || ''}
                      onChange={(e) => handleTutorPersonalChange('lastName', e.target.value)}
                      required
                      autoComplete="family-name"
                    />
                  </div>

                  <div className="field full">
                    <label htmlFor="f_tutor_preferred_name">
                      Preferred / Display name
                    </label>
                    <input
                      id="f_tutor_preferred_name"
                      name="preferredName"
                      type="text"
                      placeholder="e.g. Elena (optional nickname or preferred name)"
                      value={tutorForm.preferredName || ''}
                      onChange={(e) => handleTutorPersonalChange('preferredName', e.target.value)}
                      autoComplete="nickname"
                    />
                    <span className="hint">
                      Optional. When specified, this name is displayed on cards, rosters, and session communications.
                    </span>
                  </div>

                  {/* Display Name Preview */}
                  {(tutorForm.firstName || tutorForm.lastName || tutorForm.preferredName) && (
                    <div className="field full name-preview-box">
                      <span className="name-preview-badge">Preview</span>
                      <div className="name-preview-text">
                        <span className="name-preview-main">
                          {tutorForm.preferredName?.trim()
                            ? `${tutorForm.preferredName.trim()} ${tutorForm.lastName?.trim() || ''}`.trim()
                            : `${tutorForm.firstName?.trim() || ''} ${tutorForm.lastName?.trim() || ''}`.trim()}
                        </span>
                        {tutorForm.preferredName?.trim() && tutorForm.firstName?.trim() && (
                          <span className="name-preview-sub">
                            (Legal: {tutorForm.firstName.trim()} {tutorForm.lastName?.trim() || ''})
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Section 2: Contact Details (Preserving existing phone field for MITP426PER2-213) */}
                  <div className="field full form-section-divider">
                    <div className="form-section-header">
                      <span className="form-section-icon" aria-hidden="true">📞</span>
                      <div>
                        <h3 className="form-section-title">Contact Details</h3>
                        <p className="form-section-subtitle">Phone number for centre coordination.</p>
                      </div>
                    </div>
                  </div>

                  <div className="field full">
                    <label htmlFor="f_tutor_phone">Phone</label>
                    <input
                      id="f_tutor_phone"
                      type="tel"
                      placeholder="e.g. 0411 800 221"
                      value={tutorForm.phone || ''}
                      onChange={(e) => setTutorForm(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>

                  {/* Section 3: Teaching Subjects & Capacity */}
                  <div className="field full form-section-divider">
                    <div className="form-section-header">
                      <span className="form-section-icon" aria-hidden="true">📚</span>
                      <div>
                        <h3 className="form-section-title">Teaching Subjects & Capacity</h3>
                        <p className="form-section-subtitle">Subjects qualified to teach and weekly session limit.</p>
                      </div>
                    </div>
                  </div>

                  <SubjectMultiSelect key={"tutor:" + modalOpen + ":" + editId} idPrefix="tutor_subjects" selectedSubjects={tutorForm.subjectIds}
                    availableSubjects={subjectCatalogOptions} onChange={subjectIds => setTutorForm(previous => ({ ...previous, subjectIds }))} />

                  <div className="field">
                    <label htmlFor="f_cap">Maximum sessions per week</label>
                    <input
                      id="f_cap"
                      type="number"
                      min="1"
                      max="30"
                      value={tutorForm.cap}
                      onChange={(e) => setTutorForm({ ...tutorForm, cap: e.target.value })}
                    />
                  </div>

                  {editId && (
                    <div className="field">
                      <label htmlFor="f_tutor_active">Status</label>
                      <select
                        id="f_tutor_active"
                        value={tutorForm.active ? 'true' : 'false'}
                        onChange={(e) => setTutorForm({ ...tutorForm, active: e.target.value === 'true' })}
                      >
                        <option value="true" disabled={Boolean(editingTutor && !editingTutor.active)}>Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* Availability Modal Fields */}
              {modalMode === 'availability' && (
                <>
                  <div className="field">
                    <label htmlFor="f_avail_tutor">Tutor *</label>
                    <select
                      id="f_avail_tutor"
                      value={availabilityForm.tutor}
                      onChange={(e) => setAvailabilityForm({ ...availabilityForm, tutor: e.target.value })}
                      required
                    >
                      <option value="">Select a tutor</option>
                      {activeTutors.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="f_avail_day">Day *</label>
                    <select
                      id="f_avail_day"
                      value={availabilityForm.day}
                      onChange={(e) => setAvailabilityForm({ ...availabilityForm, day: e.target.value })}
                      required
                    >
                      {['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="f_avail_start">Available from *</label>
                    <input
                      id="f_avail_start"
                      type="time"
                      value={availabilityForm.start}
                      onChange={(e) => setAvailabilityForm({ ...availabilityForm, start: e.target.value })}
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="f_avail_end">Available until *</label>
                    <input
                      id="f_avail_end"
                      type="time"
                      value={availabilityForm.end}
                      onChange={(e) => setAvailabilityForm({ ...availabilityForm, end: e.target.value })}
                      required
                    />
                  </div>
                </>
              )}
            </div>

            </fieldset>
            {formError && (
              <div className="form-error" role="alert" style={{ display: 'block' }}>
                {formError}
                {modalMode === 'session' && sessionErrors.length > 0 && <ul>{sessionErrors.map((message, index) => <li key={index}>{message}</li>)}</ul>}
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="btn" disabled={sessionSaving || tutorSaving || studentSaving || availabilitySaving} onClick={closeModal}>Cancel</button>
              {modalMode === 'session' && editId && !sessionEditMode ? (
                <button type="button" className="btn primary" disabled={sessionDetails.loading || Boolean(sessionDetails.error) || !bookingStudents.ready || !bookingTutors.ready || subjectsLoading || Boolean(bookingStudents.error || bookingTutors.error || bookingSubjects.error)} onClick={() => { setFormError(''); setSessionErrors([]); setSessionEditMode(true); }}>Edit</button>
              ) : (
                <>
                  {modalMode === 'session' && editId && <button type="button" className="btn" disabled={sessionSaving} onClick={() => { setSessionForm({ ...savedSessionForm.current }); setSessionEditMode(false); setFormError(''); setSessionErrors([]); }}>Cancel editing</button>}
                  <button type="submit" className="btn primary" disabled={(modalMode === 'availability' && (tutorDirectory.loading || Boolean(tutorDirectory.error) || !activeTutors.length)) || sessionSaving || tutorSaving || studentSaving || availabilitySaving || (['student', 'tutor'].includes(modalMode) && (tutorDirectory.loading || Boolean(tutorDirectory.error))) || (modalMode === 'student' && (studentDetails.loading || Boolean(studentDetails.error))) || (modalMode === 'session' && (!sessionForm.subjectId || subjectsLoading || !bookingStudents.ready || !bookingTutors.ready || Boolean(bookingStudents.error || bookingTutors.error || bookingSubjects.error)))}>
                    {sessionSaving || tutorSaving || studentSaving || availabilitySaving ? 'Saving...' : editId ? 'Save changes' : 'Add ' + modalMode}
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Floating Toast Notification */}
      <div className={`toast ${showToast ? 'show' : ''}`} aria-live="polite">
        {toastMessage}
      </div>
    </div>
  );
}
