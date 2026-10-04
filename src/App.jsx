import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getWeekSchedule, copyWeekForward, getSession, createSession, updateSession, sessionValidationErrors } from './services/sessionsService.js';
import { startOfWeek } from './services/scheduleDates.js';
import {
  createTutor,
  deactivateTutor,
  getTutorDirectory,
  getTutorSchedule,
  getTutors,
  getTutorSubjects,
  tutorValidationErrors,
  updateTutor,
} from './services/tutorsService.js';
import { getStudents } from './services/studentsService.js';

// Seed data based on Redgum Tutoring requirements
const SEED_DATA = {
  students: [
    { id: 'S-0287', name: 'Ella Nguyen', year: 11, school: 'Ipswich State High School', guardian: 'Minh Nguyen', phone: '0412 530 184', email: 'minh.nguyen@example.com', subjects: ['Physics'], active: true },
    { id: 'S-0294', name: 'Jayden Pike', year: 10, school: 'St Edmund’s College', guardian: 'Kara Pike', phone: '0438 114 520', email: 'kara.pike@example.com', subjects: ['Mathematics'], active: true },
    { id: 'S-0302', name: 'Sara Habib', year: 12, school: 'Bremer State High School', guardian: 'Nadia Habib', phone: '0402 771 305', email: 'nadia.habib@example.com', subjects: ['Chemistry'], active: true },
    { id: 'S-0305', name: 'Oliver Brandt', year: 9, school: 'Ipswich Grammar School', guardian: 'Rachel Brandt', phone: '0421 680 944', email: 'r.brandt@example.com', subjects: ['Mathematics'], active: true },
    { id: 'S-0308', name: 'Mia Okafor', year: 12, school: 'St Mary’s College', guardian: 'Adaeze Okafor', phone: '0408 214 667', email: 'adaeze.o@example.com', subjects: ['Maths Methods'], active: true },
    { id: 'S-0311', name: 'Kai Lombardo', year: 11, school: 'Willowbank State High School', guardian: 'Gina Lombardo', phone: '0418 330 297', email: 'g.lombardo@example.com', subjects: ['Physics', 'Maths Methods'], active: true },
    { id: 'S-0251', name: 'Noah Chen', year: 8, school: 'St Peter Claver College', guardian: 'Jo Chen', phone: '0415 220 971', email: 'jo.chen@example.com', subjects: ['Mathematics'], active: false }
  ],
  tutors: [
    { id: 'T-001', name: 'Helen Vasquez', firstName: 'Helen', lastName: 'Vasquez', preferredName: '', phone: '0411 800 221', subjects: ['Mathematics', 'Maths Methods'], active: true, cap: 12, windows: [['Tuesday', '15:00', '20:00'], ['Wednesday', '15:00', '20:00'], ['Thursday', '15:00', '20:00'], ['Friday', '15:00', '20:00'], ['Saturday', '08:30', '13:00']] },
    { id: 'T-004', name: 'Tomás Ferreira', firstName: 'Tomás', lastName: 'Ferreira', preferredName: '', phone: '0407 512 884', subjects: ['Physics', 'Chemistry', 'Maths Methods'], active: true, cap: 8, windows: [['Tuesday', '15:30', '19:00'], ['Wednesday', '15:30', '18:00'], ['Thursday', '16:00', '18:30'], ['Saturday', '09:00', '12:30']] },
    { id: 'T-006', name: 'Priyanka Shah', firstName: 'Priyanka', lastName: 'Shah', preferredName: '', phone: '0422 410 337', subjects: ['English', 'Mathematics'], active: true, cap: 10, windows: [['Tuesday', '15:00', '19:00'], ['Thursday', '15:00', '20:00'], ['Friday', '15:00', '19:00'], ['Saturday', '08:30', '12:00']] },
    { id: 'T-008', name: 'Liam O’Connor', firstName: 'Liam', lastName: 'O’Connor', preferredName: '', phone: '0431 665 109', subjects: ['English', 'Modern History'], active: true, cap: 7, windows: [['Wednesday', '15:00', '20:00'], ['Friday', '15:30', '20:00']] },
    { id: 'T-009', name: 'Grace Wu', firstName: 'Grace', lastName: 'Wu', preferredName: '', phone: '0403 929 140', subjects: ['Chemistry', 'Biology'], active: true, cap: 8, windows: [['Tuesday', '16:00', '20:00'], ['Thursday', '15:00', '19:30'], ['Saturday', '09:00', '13:00']] },
    { id: 'T-010', name: 'Daniel Brooks', firstName: 'Daniel', lastName: 'Brooks', preferredName: '', phone: '0419 235 885', subjects: ['Mathematics', 'Physics'], active: false, cap: 8, windows: [] }
  ],
  sessions: [
    { id: 1, date: iso(new Date()), time: '15:30', duration: 60, student: 'S-0287', tutor: 'T-004', subject: 'Physics', status: 'Booked' },
    { id: 2, date: iso(new Date()), time: '16:45', duration: 60, student: 'S-0294', tutor: 'T-004', subject: 'Mathematics', status: 'Booked' },
    { id: 3, date: iso(new Date()), time: '18:00', duration: 60, student: 'S-0302', tutor: 'T-004', subject: 'Chemistry', status: 'Booked' },
    { id: 4, date: '2026-09-23', time: '15:30', duration: 60, student: 'S-0305', tutor: 'T-001', subject: 'Mathematics', status: 'Booked' },
    { id: 5, date: '2026-09-23', time: '16:45', duration: 90, student: 'S-0308', tutor: 'T-001', subject: 'Maths Methods', status: 'Booked' },
    { id: 6, date: '2026-09-24', time: '16:00', duration: 60, student: 'S-0287', tutor: 'T-004', subject: 'Physics', status: 'Booked' },
    { id: 7, date: '2026-09-24', time: '17:15', duration: 60, student: 'S-0311', tutor: 'T-004', subject: 'Physics', status: 'Booked' },
    { id: 8, date: '2026-09-25', time: '15:30', duration: 60, student: 'S-0305', tutor: 'T-006', subject: 'Mathematics', status: 'Booked' },
    { id: 9, date: '2026-09-25', time: '17:00', duration: 60, student: 'S-0294', tutor: 'T-008', subject: 'English', status: 'Cancelled' },
    { id: 10, date: '2026-09-26', time: '09:00', duration: 60, student: 'S-0294', tutor: 'T-004', subject: 'Mathematics', status: 'Booked' },
    { id: 11, date: '2026-09-26', time: '10:15', duration: 90, student: 'S-0302', tutor: 'T-001', subject: 'Chemistry', status: 'Booked' },
    { id: 12, date: '2026-08-11', time: '15:30', duration: 60, student: 'S-0287', tutor: 'T-004', subject: 'Physics', status: 'Attended' },
    { id: 13, date: '2026-08-11', time: '16:45', duration: 60, student: 'S-0294', tutor: 'T-004', subject: 'Mathematics', status: 'Missed' },
    { id: 14, date: '2026-08-13', time: '17:15', duration: 60, student: 'S-0311', tutor: 'T-004', subject: 'Physics', status: 'Cancelled' }
  ]
};

const ALL_SUBJECTS = [
  'Mathematics',
  'Maths Methods',
  'Specialist Mathematics',
  'General Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'English Literature',
  'Modern History',
  'Ancient History',
  'Legal Studies',
  'Business Studies',
  'Economics',
  'Psychology',
  'Science (Junior)'
];

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
  // Master persistent state initialized from localStorage
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem('redgum-centre-v2');
      return saved ? JSON.parse(saved) : SEED_DATA;
    } catch {
      return SEED_DATA;
    }
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('redgum-centre-v2', JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
    }
  }, [data]);

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

  // Students View States
  const [studentSearch, setStudentSearch] = useState('');
  const [studentState, setStudentState] = useState('active'); // 'active' | 'all' | 'inactive'
  const [studentSelected, setStudentSelected] = useState(() => data.students[0]?.id || null);

  // Tutors View States
  const [tutorSearch, setTutorSearch] = useState('');
  const [tutorState, setTutorState] = useState('active'); // 'active' | 'all' | 'inactive'
  const [tutorDirectory, setTutorDirectory] = useState({ items: [], loading: true, error: '' });
  const [tutorSubjectCatalog, setTutorSubjectCatalog] = useState([]);
  const [tutorCapacity, setTutorCapacity] = useState({});
  const [tutorRefresh, setTutorRefresh] = useState(0);
  const [tutorSaving, setTutorSaving] = useState(false);
  const tutorSavingRef = useRef(false);

  useEffect(() => {
    if (currentPage !== 'tutors' && currentPage !== 'availability') return;
    const controller = new AbortController();

    const loadTutorArea = async () => {
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
        setTutorDirectory({ items: normalizedTutors, loading: false, error: '' });

        let students = [];
        try {
          students = await getStudents({ signal: controller.signal });
        } catch (error) {
          if (controller.signal.aborted || error.name === 'AbortError') return;
        }

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

  const [studentForm, setStudentForm] = useState({
    name: '',
    year: 10,
    school: '',
    guardian: '',
    phone: '',
    email: '',
    subjects: '',
    active: true
  });

  const [tutorForm, setTutorForm] = useState({
    firstName: '',
    lastName: '',
    preferredName: '',
    name: '',
    phone: '',
    subjects: [],
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
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const subjectDropdownRef = useRef(null);

  // Close subject dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(event.target)) {
        setIsSubjectDropdownOpen(false);
      }
    };

    if (isSubjectDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isSubjectDropdownOpen]);

  // Aggregate all unique subjects from catalog, tutors, students, and sessions
  const allAvailableSubjects = useMemo(() => {
    const set = new Set(ALL_SUBJECTS);
    tutorSubjectCatalog.forEach(subject => subject.subjectName && set.add(subject.subjectName.trim()));
    (data.tutors || []).forEach(t => (t.subjects || []).forEach(s => s && set.add(s.trim())));
    (data.students || []).forEach(st => (st.subjects || []).forEach(s => s && set.add(s.trim())));
    (data.sessions || []).forEach(se => se.subject && set.add(se.subject.trim()));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [tutorSubjectCatalog, data.tutors, data.students, data.sessions]);

  // Filtered subjects based on search query inside dropdown
  const displayedSubjects = useMemo(() => {
    if (!subjectSearchQuery.trim()) return allAvailableSubjects;
    const q = subjectSearchQuery.toLowerCase();
    return allAvailableSubjects.filter(s => s.toLowerCase().includes(q));
  }, [allAvailableSubjects, subjectSearchQuery]);

  // Toggle selection of a subject in tutorForm
  const toggleSubject = (subjectName) => {
    setTutorForm(prev => {
      const current = Array.isArray(prev.subjects) ? prev.subjects : [];
      if (current.includes(subjectName)) {
        return { ...prev, subjects: current.filter(s => s !== subjectName) };
      } else {
        return { ...prev, subjects: [...current, subjectName] };
      }
    });
  };

  const selectAllFiltered = () => {
    setTutorForm(prev => {
      const current = Array.isArray(prev.subjects) ? prev.subjects : [];
      const combined = Array.from(new Set([...current, ...displayedSubjects]));
      return { ...prev, subjects: combined };
    });
  };

  const clearAllFiltered = () => {
    setTutorForm(prev => {
      const current = Array.isArray(prev.subjects) ? prev.subjects : [];
      const filtered = current.filter(s => !displayedSubjects.includes(s));
      return { ...prev, subjects: filtered };
    });
  };

  const handleAddCustomSubject = () => {
    const trimmed = customSubjectInput.trim();
    if (!trimmed) return;
    setTutorForm(prev => {
      const current = Array.isArray(prev.subjects) ? prev.subjects : [];
      if (!current.includes(trimmed)) {
        return { ...prev, subjects: [...current, trimmed] };
      }
      return prev;
    });
    setCustomSubjectInput('');
  };

  const [availabilityForm, setAvailabilityForm] = useState({
    tutor: '',
    day: 'Tuesday',
    start: '15:00',
    end: '18:00'
  });

  // Entity lookup helpers
  const student = (id) => data.students.find(x => x.id === id);
  const tutor = (id) => tutorDirectory.items.find(x => String(x.id) === String(id))
    || data.tutors.find(x => String(x.id) === String(id));

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
      if (id) {
        const item = student(id);
        if (item) {
          setStudentForm({
            name: item.name,
            year: item.year,
            school: item.school,
            guardian: item.guardian,
            phone: item.phone,
            email: item.email,
            subjects: item.subjects.join(', '),
            active: item.active
          });
        }
      } else {
        setStudentForm({
          name: '',
          year: 10,
          school: '',
          guardian: '',
          phone: '',
          email: '',
          subjects: '',
          active: true
        });
      }
    } else if (mode === 'tutor') {
      setIsSubjectDropdownOpen(false);
      setSubjectSearchQuery('');
      setCustomSubjectInput('');
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
            subjects: Array.isArray(item.subjects) ? [...item.subjects] : (item.subjects ? [item.subjects] : []),
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
          subjects: [],
          cap: 8,
          active: true
        });
      }
    } else if (mode === 'availability') {
      const firstActiveTutor = data.tutors.find(t => t.active)?.id || '';
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
    if (sessionSavingRef.current || tutorSavingRef.current) return;
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
      subjects: [],
      cap: 8,
      active: true
    });
    setIsSubjectDropdownOpen(false);
    setSubjectSearchQuery('');
    setCustomSubjectInput('');
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
      const subjectsList = studentForm.subjects.split(',').map(s => s.trim()).filter(Boolean);
      if (editId) {
        setData(prev => ({
          ...prev,
          students: prev.students.map(s => s.id === editId ? {
            ...s,
            name: studentForm.name.trim(),
            year: Number(studentForm.year),
            school: studentForm.school.trim(),
            guardian: studentForm.guardian.trim(),
            phone: studentForm.phone.trim(),
            email: studentForm.email.trim(),
            subjects: subjectsList,
            active: Boolean(studentForm.active)
          } : s)
        }));
        triggerToast('Changes saved.');
      } else {
        const maxNum = Math.max(0, ...data.students.map(s => Number(s.id.split('-')[1]) || 0));
        const newId = 'S-' + String(maxNum + 1).padStart(4, '0');
        const newStudent = {
          id: newId,
          name: studentForm.name.trim(),
          year: Number(studentForm.year),
          school: studentForm.school.trim(),
          guardian: studentForm.guardian.trim(),
          phone: studentForm.phone.trim(),
          email: studentForm.email.trim(),
          subjects: subjectsList,
          active: true
        };
        setData(prev => ({
          ...prev,
          students: [...prev.students, newStudent]
        }));
        setStudentSelected(newId);
        triggerToast('Record added to the centre system.');
      }
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

      const subjectsList = Array.isArray(tutorForm.subjects)
        ? tutorForm.subjects.map(s => s.trim()).filter(Boolean)
        : tutorForm.subjects.split(',').map(s => s.trim()).filter(Boolean);

      if (subjectsList.length === 0) {
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

      const subjectIdByName = new Map();
      tutorSubjectCatalog.forEach(subject => {
        if (!subjectIdByName.has(subject.subjectName)) {
          subjectIdByName.set(subject.subjectName, subject.subjectId);
        }
      });
      originalTutor?.subjects.forEach((subjectName, index) => {
        subjectIdByName.set(subjectName, originalTutor.subjectIds[index]);
      });
      const missingSubjects = subjectsList.filter(subjectName => !subjectIdByName.has(subjectName));
      if (missingSubjects.length > 0) {
        setFormError(`These subjects are not available in the backend: ${missingSubjects.join(', ')}.`);
        return;
      }

      const payload = {
        tutorName: finalName,
        phone: tutorForm.phone.trim(),
        maxSessionsPw: Number(tutorForm.cap) || 8,
        subjectIds: [...new Set(subjectsList.map(subjectName => subjectIdByName.get(subjectName)))],
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
      if (mins(availabilityForm.end) <= mins(availabilityForm.start)) {
        setFormError('The finish time must be later than the start time.');
        return;
      }
      setData(prev => ({
        ...prev,
        tutors: prev.tutors.map(t => t.id === availabilityForm.tutor ? {
          ...t,
          windows: [...(t.windows || []), [availabilityForm.day, availabilityForm.start, availabilityForm.end]]
        } : t)
      }));
      triggerToast('Record added to the centre system.');
    }

    closeModal();
  };

  // Remove availability window
  const handleRemoveWindow = (tutorId, day, index) => {
    setData(prev => ({
      ...prev,
      tutors: prev.tutors.map(t => {
        if (t.id !== tutorId) return t;
        const matchingWindows = (t.windows || []).map((w, i) => ({ w, i })).filter(item => item.w[0] === day);
        if (!matchingWindows[index]) return t;
        const realIndex = matchingWindows[index].i;
        const updated = [...t.windows];
        updated.splice(realIndex, 1);
        return { ...t, windows: updated };
      })
    }));
    triggerToast('Availability window removed.');
  };

  // Direct status action on session
  const handleSetStatus = (id, newStatus) => {
    setData(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => s.id === id ? { ...s, status: newStatus } : s)
    }));
    triggerToast(`Session marked ${newStatus.toLowerCase()}.`);
  };

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
    data.sessions.forEach(s => {
      if (counts[s.status] !== undefined) counts[s.status]++;
    });
    return counts;
  }, [data.sessions]);

  // Filtered sessions list for Sessions page
  const filteredSessions = useMemo(() => {
    const q = sessionSearch.toLowerCase();
    return data.sessions
      .filter(s => {
        const matchesStatus = !sessionFilter || s.status === sessionFilter;
        const studentName = student(s.student)?.name?.toLowerCase() || '';
        const tutorName = tutor(s.tutor)?.name?.toLowerCase() || '';
        const subjectName = s.subject?.toLowerCase() || '';
        const matchesQuery = !q || studentName.includes(q) || tutorName.includes(q) || subjectName.includes(q);
        return matchesStatus && matchesQuery;
      })
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }, [data.sessions, sessionFilter, sessionSearch]);

  // Filtered students for Students page
  const filteredStudents = useMemo(() => {
    const q = studentSearch.toLowerCase();
    return data.students.filter(s => {
      const matchesState = studentState === 'all' || (studentState === 'active' ? s.active : !s.active);
      const matchesQuery = !q ||
        s.name.toLowerCase().includes(q) ||
        s.guardian.toLowerCase().includes(q) ||
        s.subjects.join(' ').toLowerCase().includes(q);
      return matchesState && matchesQuery;
    });
  }, [data.students, studentState, studentSearch]);

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

  const activeTutors = useMemo(() => tutorDirectory.items.filter(t => t.active), [tutorDirectory.items]);
  const activeStudents = useMemo(() => data.students.filter(s => s.active), [data.students]);
  const editingTutor = modalMode === 'tutor' && editId
    ? tutorDirectory.items.find(item => String(item.id) === String(editId))
    : null;

  // Selected student details & history
  const selectedStudentObj = student(studentSelected) || filteredStudents[0] || null;
  const studentHistory = useMemo(() => {
    if (!selectedStudentObj) return [];
    return data.sessions
      .filter(s => s.student === selectedStudentObj.id)
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }, [data.sessions, selectedStudentObj]);

  return (
    <div className="app">
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
                    <p>Live schedule, Tuesday to Saturday. Create a new booking to add a session.</p>
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
                          className="dropzone"
                        >
                          {items.length > 0 ? (
                            items.map(x => {
                              const s = { name: x.studentName };
                              const t = { name: x.tutorName };
                              return (
                                <div
                                  key={x.id}
                                  className="session-card"
                                >
                                  <div className="session-top">
                                    <span className="time">{x.time} · {x.duration} min</span>
                                    <span className={`badge ${x.status.toLowerCase()}`}>{x.status}</span>
                                  </div>
                                  <div className="student-name">{s?.name || 'Unknown student'}</div>
                                  <div className="session-meta">{t?.name || 'Unknown tutor'}</div>
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

                  <div className="search">
                    <input
                      type="search"
                      placeholder="Find a session"
                      value={sessionSearch}
                      onChange={(e) => setSessionSearch(e.target.value)}
                    />
                  </div>
                </div>

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
                            const s = student(x.student);
                            const t = tutor(x.tutor);
                            return (
                              <tr key={x.id}>
                                <td>
                                  <b>{fmtDate(x.date, { weekday: 'short', day: 'numeric', month: 'short' })}</b><br />
                                  <span className="session-meta">{x.time}–{endTime(x.time, x.duration)}</span>
                                </td>
                                <td>{s?.name || 'Unknown student'}</td>
                                <td>{t?.name || 'Unknown tutor'}</td>
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
                                          onClick={() => handleSetStatus(x.id, 'Attended')}
                                        >
                                          Attended
                                        </button>
                                        <button
                                          className="btn small danger"
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
                              <div className="empty">No sessions match this view.</div>
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
                            <th>Year</th>
                            <th>Subjects</th>
                            <th>Family contact</th>
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
                                      <small>{x.id} · {x.school || 'Unspecified'}</small>
                                    </span>
                                  </div>
                                </td>
                                <td>Year {x.year}</td>
                                <td>
                                  <div className="chips">
                                    {x.subjects.map(sub => (
                                      <span key={sub} className="chip">{sub}</span>
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
                              <td colSpan="5">
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
                          <p>{selectedStudentObj.id} · Year {selectedStudentObj.year}</p>
                        </div>
                        <div className="facts">
                          <div className="fact">
                            <label>Family contact</label>
                            <div>
                              {selectedStudentObj.guardian}<br />
                              {selectedStudentObj.phone}<br />
                              {selectedStudentObj.email}
                            </div>
                          </div>
                          <div className="fact">
                            <label>School</label>
                            <div>{selectedStudentObj.school || 'Not specified'}</div>
                          </div>
                          <div className="fact">
                            <label>Subjects</label>
                            <div className="chips">
                              {selectedStudentObj.subjects.map(s => (
                                <span key={s} className="chip">{s}</span>
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
                          {studentHistory.length > 0 ? (
                            studentHistory.map(s => (
                              <div key={s.id} className="history-row">
                                <div className="history-date">
                                  {fmtDate(s.date, { day: 'numeric', month: 'short' })}
                                </div>
                                <div>
                                  <b>{s.subject}</b>
                                  <span>{tutor(s.tutor)?.name || 'Unknown tutor'} · {s.duration} min</span>
                                </div>
                                <span className={`badge ${s.status.toLowerCase()}`}>{s.status}</span>
                              </div>
                            ))
                          ) : (
                            <div className="empty">No sessions recorded yet.</div>
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
                  <button className="btn primary" disabled title="Availability changes are not supported by the backend API.">＋ Add availability</button>
                </div>

                <div className="notice">
                  <b>Rule:</b>
                  <span>The system checks the tutor, day, start time, and full session length before saving or moving any booking. Invalid bookings are refused with a reason.</span>
                  <span>Availability is read-only because the backend does not provide add or remove endpoints.</span>
                </div>

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
                              dayWindows.map((w, index) => (
                                <div key={index} className="window">
                                  <span>{w[1]}–{w[2]}</span>
                                  <button
                                    aria-label="Remove availability"
                                    disabled
                                    title="Availability changes are not supported by the backend API."
                                    onClick={() => handleRemoveWindow(t.id, day, index)}
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
            {modalMode === 'session' && editId && sessionDetails.loading && <p role="status">Loading session details...</p>}
            {modalMode === 'session' && editId && sessionDetails.error && <div role="alert">{sessionDetails.error}<button type="button" className="btn" onClick={() => { setSessionDetails({ loading: true, error: '' }); setDetailsRetry(value => value + 1); }}>Retry</button></div>}
            {modalMode === 'session' && editId && !sessionDetails.loading && !sessionDetails.error && <p>Session #{editId}. {sessionEditMode ? 'Update the details and save your changes.' : 'Select Edit to change this session.'}</p>}
            <fieldset disabled={sessionSaving || tutorSaving || (modalMode === 'session' && Boolean(editId) && (!sessionEditMode || sessionDetails.loading || Boolean(sessionDetails.error)))} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
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
                      {bookingStudents.items.map(student => <option key={student.studentId} value={student.studentId}>{student.studentName}</option>)}
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

              {/* Student Modal Fields */}
              {modalMode === 'student' && (
                <>
                  <div className="field">
                    <label htmlFor="f_name">Student name *</label>
                    <input
                      id="f_name"
                      type="text"
                      value={studentForm.name}
                      onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="f_year">Year level *</label>
                    <input
                      id="f_year"
                      type="number"
                      min="5"
                      max="12"
                      value={studentForm.year}
                      onChange={(e) => setStudentForm({ ...studentForm, year: e.target.value })}
                      required
                    />
                  </div>

                  <div className="field full">
                    <label htmlFor="f_school">School</label>
                    <input
                      id="f_school"
                      type="text"
                      value={studentForm.school}
                      onChange={(e) => setStudentForm({ ...studentForm, school: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="f_guardian">Family contact *</label>
                    <input
                      id="f_guardian"
                      type="text"
                      value={studentForm.guardian}
                      onChange={(e) => setStudentForm({ ...studentForm, guardian: e.target.value })}
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="f_phone">Phone *</label>
                    <input
                      id="f_phone"
                      type="tel"
                      value={studentForm.phone}
                      onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                      required
                    />
                  </div>

                  <div className="field full">
                    <label htmlFor="f_email">Email</label>
                    <input
                      id="f_email"
                      type="email"
                      value={studentForm.email}
                      onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                    />
                  </div>

                  <div className="field full">
                    <label htmlFor="f_subjects">Subjects *</label>
                    <input
                      id="f_subjects"
                      type="text"
                      placeholder="e.g. Mathematics, Chemistry (comma separated)"
                      value={studentForm.subjects}
                      onChange={(e) => setStudentForm({ ...studentForm, subjects: e.target.value })}
                      required
                    />
                  </div>

                  {editId && (
                    <div className="field full">
                      <label htmlFor="f_active">Status</label>
                      <select
                        id="f_active"
                        value={studentForm.active ? 'true' : 'false'}
                        onChange={(e) => setStudentForm({ ...studentForm, active: e.target.value === 'true' })}
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>
                  )}
                </>
              )}

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

                  <div className="field full">
                    <label id="label_tutor_subjects">Subjects *</label>
                    <div className="subject-multiselect-container" ref={subjectDropdownRef}>
                      <button
                        type="button"
                        id="f_tutor_subjects_btn"
                        className={`subject-dropdown-btn ${isSubjectDropdownOpen ? 'open' : ''}`}
                        onClick={() => setIsSubjectDropdownOpen(prev => !prev)}
                        aria-expanded={isSubjectDropdownOpen}
                        aria-haspopup="listbox"
                        aria-labelledby="label_tutor_subjects"
                      >
                        <span className="dropdown-btn-label">
                          <span className="dropdown-btn-icon">📚</span>
                          {(!tutorForm.subjects || tutorForm.subjects.length === 0) ? (
                            <span className="placeholder">Select teaching subjects...</span>
                          ) : (
                            <span className="selected-summary">
                              <b>{tutorForm.subjects.length}</b> {tutorForm.subjects.length === 1 ? 'subject' : 'subjects'} selected
                            </span>
                          )}
                        </span>
                        <span className="dropdown-chevron">{isSubjectDropdownOpen ? '▲' : '▼'}</span>
                      </button>

                      {/* Dropdown Menu */}
                      {isSubjectDropdownOpen && (
                        <div className="subject-dropdown-menu" role="listbox" aria-multiselectable="true">
                          <div className="subject-dropdown-header">
                            <input
                              type="text"
                              className="subject-search-input"
                              placeholder="Search subjects..."
                              value={subjectSearchQuery}
                              onChange={(e) => setSubjectSearchQuery(e.target.value)}
                              autoFocus
                            />
                            <div className="subject-quick-actions">
                              <span className="subject-counter">
                                {displayedSubjects.length} subjects
                              </span>
                              <div className="subject-action-links">
                                <button
                                  type="button"
                                  className="quick-action-btn"
                                  onClick={selectAllFiltered}
                                >
                                  Select all
                                </button>
                                <span className="action-sep">·</span>
                                <button
                                  type="button"
                                  className="quick-action-btn"
                                  onClick={clearAllFiltered}
                                >
                                  Clear
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="subject-options-list">
                            {displayedSubjects.map(sub => {
                              const isSelected = Array.isArray(tutorForm.subjects) && tutorForm.subjects.includes(sub);
                              return (
                                <div
                                  key={sub}
                                  className={`subject-option-item ${isSelected ? 'selected' : ''}`}
                                  onClick={() => toggleSubject(sub)}
                                  role="option"
                                  aria-selected={isSelected}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}}
                                    tabIndex={-1}
                                  />
                                  <span className="subject-option-name">{sub}</span>
                                  {isSelected && <span className="subject-check-icon">✓</span>}
                                </div>
                              );
                            })}
                            {displayedSubjects.length === 0 && (
                              <div className="no-subjects-found">
                                No subjects match "{subjectSearchQuery}"
                              </div>
                            )}
                          </div>

                          <div className="subject-dropdown-footer">
                            <input
                              type="text"
                              className="custom-subject-input"
                              placeholder="Add other subject..."
                              value={customSubjectInput}
                              onChange={(e) => setCustomSubjectInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddCustomSubject();
                                }
                              }}
                            />
                            <button
                              type="button"
                              className="btn small soft"
                              onClick={handleAddCustomSubject}
                              disabled={!customSubjectInput.trim()}
                            >
                              ＋ Add
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Selected Tags / Chips Display */}
                      {Array.isArray(tutorForm.subjects) && tutorForm.subjects.length > 0 && (
                        <div className="selected-subject-chips">
                          {tutorForm.subjects.map(sub => (
                            <span key={sub} className="subject-chip">
                              <span>{sub}</span>
                              <button
                                type="button"
                                className="chip-remove"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSubject(sub);
                                }}
                                title={`Remove ${sub}`}
                                aria-label={`Remove ${sub}`}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          <button
                            type="button"
                            className="clear-all-chips-btn"
                            onClick={() => setTutorForm(prev => ({ ...prev, subjects: [] }))}
                          >
                            Clear all
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

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
              <button type="button" className="btn" disabled={sessionSaving || tutorSaving} onClick={closeModal}>Cancel</button>
              {modalMode === 'session' && editId && !sessionEditMode ? (
                <button type="button" className="btn primary" disabled={sessionDetails.loading || Boolean(sessionDetails.error) || !bookingStudents.ready || !bookingTutors.ready || subjectsLoading || Boolean(bookingStudents.error || bookingTutors.error || bookingSubjects.error)} onClick={() => { setFormError(''); setSessionErrors([]); setSessionEditMode(true); }}>Edit</button>
              ) : (
                <>
                  {modalMode === 'session' && editId && <button type="button" className="btn" disabled={sessionSaving} onClick={() => { setSessionForm({ ...savedSessionForm.current }); setSessionEditMode(false); setFormError(''); setSessionErrors([]); }}>Cancel editing</button>}
                  <button type="submit" className="btn primary" disabled={sessionSaving || tutorSaving || (modalMode === 'session' && (!sessionForm.subjectId || subjectsLoading || !bookingStudents.ready || !bookingTutors.ready || Boolean(bookingStudents.error || bookingTutors.error || bookingSubjects.error)))}>
                    {sessionSaving || tutorSaving ? 'Saving...' : editId ? 'Save changes' : 'Add ' + modalMode}
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
