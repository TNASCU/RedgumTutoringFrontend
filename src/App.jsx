import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getWeekSchedule } from './services/sessionsService.js';
import { startOfWeek } from './services/scheduleDates.js';

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
function validateAvailability(tutorObj, date, time, duration) {
  if (!tutorObj || !tutorObj.active) {
    return 'That tutor is inactive and cannot receive new bookings.';
  }
  const day = dayName(date);
  const start = mins(time);
  const end = start + Number(duration);
  const matches = (tutorObj.windows || []).filter(w => w[0] === day);

  if (!matches.length) {
    return `${tutorObj.name} has no availability recorded on ${day}.`;
  }

  const fitsInWindow = matches.some(w => start >= mins(w[1]) && end <= mins(w[2]));
  if (!fitsInWindow) {
    const windowTimes = matches.map(w => `${w[1]}–${w[2]}`).join(', ');
    return `${time}–${endTime(time, duration)} falls outside ${tutorObj.name}’s ${day} availability (${windowTimes}).`;
  }

  return '';
}

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
    const firstActiveStudent = data.students.find(s => s.active)?.id || '';
    const firstActiveTutor = data.tutors.find(t => t.active)?.id || '';
    return {
      student: firstActiveStudent,
      tutor: firstActiveTutor,
      date: scheduleMode === 'day' ? selectedDay : iso(new Date()),
      time: '15:30',
      duration: 60,
      subject: '',
      status: 'Booked'
    };
  };

  // Form states for modals
  const [sessionForm, setSessionForm] = useState(getInitialSessionForm);

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
    (data.tutors || []).forEach(t => (t.subjects || []).forEach(s => s && set.add(s.trim())));
    (data.students || []).forEach(st => (st.subjects || []).forEach(s => s && set.add(s.trim())));
    (data.sessions || []).forEach(se => se.subject && set.add(se.subject.trim()));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data.tutors, data.students, data.sessions]);

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
  const tutor = (id) => data.tutors.find(x => x.id === id);

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
      if (id) {
        const item = data.sessions.find(s => s.id === id);
        if (item) {
          setSessionForm({
            student: item.student || '',
            tutor: item.tutor || '',
            date: item.date || '2026-09-22',
            time: item.time || '15:30',
            duration: Number(item.duration) || 60,
            subject: item.subject || '',
            status: item.status || 'Booked'
          });
        } else {
          setSessionForm(getInitialSessionForm());
        }
      } else {
        setSessionForm(getInitialSessionForm());
      }
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
  const handleModalSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (modalMode === 'session') {
      const assignedTutor = tutor(sessionForm.tutor);
      const error = validateAvailability(assignedTutor, sessionForm.date, sessionForm.time, Number(sessionForm.duration));

      const assignedStudent = student(sessionForm.student);
      if (!assignedStudent?.active && !editId) {
        setFormError('Inactive students cannot receive new bookings.');
        return;
      }

      if (error) {
        setFormError(error);
        return;
      }

      if (editId) {
        setData(prev => ({
          ...prev,
          sessions: prev.sessions.map(s => s.id === editId ? {
            ...s,
            student: sessionForm.student,
            tutor: sessionForm.tutor,
            date: sessionForm.date,
            time: sessionForm.time,
            duration: Number(sessionForm.duration),
            subject: sessionForm.subject.trim(),
            status: sessionForm.status
          } : s)
        }));
        triggerToast('Changes saved.');
      } else {
        const nextId = Math.max(0, ...data.sessions.map(s => s.id)) + 1;
        const newSession = {
          id: nextId,
          student: sessionForm.student,
          tutor: sessionForm.tutor,
          date: sessionForm.date,
          time: sessionForm.time,
          duration: Number(sessionForm.duration),
          subject: sessionForm.subject.trim(),
          status: 'Booked'
        };
        setData(prev => ({
          ...prev,
          sessions: [...prev.sessions, newSession]
        }));
        triggerToast('Record added to the centre system.');
      }
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

      if (editId) {
        setData(prev => ({
          ...prev,
          tutors: prev.tutors.map(t => t.id === editId ? {
            ...t,
            name: finalName,
            firstName: fName,
            lastName: lName,
            preferredName: pName,
            phone: tutorForm.phone.trim(),
            subjects: subjectsList,
            cap: Number(tutorForm.cap) || 8,
            active: Boolean(tutorForm.active)
          } : t)
        }));
        triggerToast('Changes saved.');
      } else {
        const maxNum = Math.max(0, ...data.tutors.map(t => Number(t.id.split('-')[1]) || 0));
        const newId = 'T-' + String(maxNum + 1).padStart(3, '0');
        const newTutor = {
          id: newId,
          name: finalName,
          firstName: fName,
          lastName: lName,
          preferredName: pName,
          phone: tutorForm.phone.trim(),
          subjects: subjectsList,
          cap: Number(tutorForm.cap) || 8,
          active: true,
          windows: []
        };
        setData(prev => ({
          ...prev,
          tutors: [...prev.tutors, newTutor]
        }));
        triggerToast('Record added to the centre system.');
      }
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
    const t = tutor(tutorId);
    setCurrentPage('sessions');
    setSessionFilter('');
    setSessionSearch(t?.name || '');
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
    return data.tutors.filter(t => {
      const matchesState = tutorState === 'all' || (tutorState === 'active' ? t.active : !t.active);
      const matchesQuery = !q ||
        t.name.toLowerCase().includes(q) ||
        (Array.isArray(t.subjects) ? t.subjects : []).join(' ').toLowerCase().includes(q);
      return matchesState && matchesQuery;
    });
  }, [data.tutors, tutorState, tutorSearch]);

  const activeTutors = useMemo(() => data.tutors.filter(t => t.active), [data.tutors]);
  const activeStudents = useMemo(() => data.students.filter(s => s.active), [data.students]);

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
                    <p>Live schedule, Tuesday to Saturday. Booking changes are not connected yet.</p>
                  </div>
                  <div className="head-actions">
                    <button className="btn ghost" onClick={() => window.print()}>Print week</button>
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
                    <div className="eyebrow">{data.tutors.length} tutors · centre-wide</div>
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
                  {filteredTutors.length > 0 ? (
                    filteredTutors.map(x => {
                      const booked = data.sessions.filter(s => s.tutor === x.id && s.status === 'Booked').length;
                      const cap = x.cap || 8;
                      const pct = Math.min(100, Math.round((booked / cap) * 100));

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
                            <span>{booked} / {cap}</span>
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
                  <button className="btn primary" onClick={() => openModal('availability')}>＋ Add availability</button>
                </div>

                <div className="notice">
                  <b>Rule:</b>
                  <span>The system checks the tutor, day, start time, and full session length before saving or moving any booking. Invalid bookings are refused with a reason.</span>
                </div>

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
                {modalMode === 'session' && (editId ? 'Update session' : 'Book a session')}
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
            <div className="form-grid">
              {/* Session Modal Fields */}
              {modalMode === 'session' && (
                <>
                  <div className="field">
                    <label htmlFor="f_student">Student *</label>
                    <select
                      id="f_student"
                      value={sessionForm.student}
                      onChange={(e) => setSessionForm({ ...sessionForm, student: e.target.value })}
                      required
                    >
                      {data.students
                        .filter(s => s.active || s.id === sessionForm.student)
                        .map(s => (
                          <option key={s.id} value={s.id}>{s.name} · Year {s.year}</option>
                        ))}
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="f_tutor">Tutor *</label>
                    <select
                      id="f_tutor"
                      value={sessionForm.tutor}
                      onChange={(e) => setSessionForm({ ...sessionForm, tutor: e.target.value })}
                      required
                    >
                      {data.tutors
                        .filter(t => t.active || t.id === sessionForm.tutor)
                        .map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
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
                      <option value={30}>30 minutes</option>
                      <option value={60}>60 minutes</option>
                      <option value={90}>90 minutes</option>
                    </select>
                  </div>

                  <div className="field full">
                    <label htmlFor="f_subject">Subject *</label>
                    <input
                      id="f_subject"
                      type="text"
                      placeholder="e.g. Mathematics, Physics"
                      value={sessionForm.subject}
                      onChange={(e) => setSessionForm({ ...sessionForm, subject: e.target.value })}
                      required
                    />
                  </div>

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
                        <option value="true">Active</option>
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

            {formError && (
              <div className="form-error" role="alert" style={{ display: 'block' }}>
                {formError}
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="btn" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn primary">
                {editId ? 'Save changes' : `Add ${modalMode}`}
              </button>
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
