import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  CalendarRange,
  CheckSquare,
  Database,
  ArrowUpRight,
  Plus,
  PlusCircle,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  UserPlus,
  UserX,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  Zap,
} from 'lucide-react';
import { isSupabaseConfigured, fetchRemoteState, saveRemoteState } from './supabase';
import {
  ActiveTab,
  Classroom,
  DatabaseStudent,
  RoomStudent,
  Round,
  StudentStatus,
  User,
  UserRole,
} from './types';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ARCH_COURSES,
  ATTENDANCE_STATUSES,
  DEFAULT_ROUNDS,
  DEFAULT_STUDENTS,
  DEFAULT_USERS,
  formatDateShort,
  GAS_URL,
  INT_COURSES,
  STUDENT_STATUSES,
} from './constants';

export default function App() {
  // App Data States
  const [users, setUsers] = useState<User[]>(() => {
    let list: User[] = DEFAULT_USERS;
    const saved = localStorage.getItem('ba_users');
    if (saved) {
      try {
        list = JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    // Always guarantee p.roobchird@gmail.com is present with ADMIN_PASSWORD and Admin role
    const adminIdx = list.findIndex((u) => u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    if (adminIdx >= 0) {
      list[adminIdx] = {
        ...list[adminIdx],
        password: ADMIN_PASSWORD,
        role: 'Admin',
      };
    } else {
      list.unshift({
        id: 1,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        name: 'Admin (คุณ)',
        role: 'Admin',
        createdAt: '2026-01-10 09:00',
      });
    }
    return list;
  });

  const [databaseStudents, setDatabaseStudents] = useState<DatabaseStudent[]>(() => {
    const saved = localStorage.getItem('ba_students');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= DEFAULT_STUDENTS.length) {
          return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_STUDENTS;
  });

  const [rounds, setRounds] = useState<Round[]>(() => {
    const saved = localStorage.getItem('ba_rounds');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_ROUNDS;
  });

  // Current Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ba_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  });

  // Auth screen mode
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [regNickname, setRegNickname] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedOverviewRoundId, setSelectedOverviewRoundId] = useState<string>('');
  const [activeAttendanceRoundId, setActiveAttendanceRoundId] = useState<string>('');
  const [activeAttendanceRoomId, setActiveAttendanceRoomId] = useState<string>('');
  const [isGasSyncing, setIsGasSyncing] = useState(false);

  // Modals
  const [showAddRoundModal, setShowAddRoundModal] = useState(false);
  const [newRoundName, setNewRoundName] = useState('');

  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [targetRoundIdForRoom, setTargetRoundIdForRoom] = useState('');
  const [roomNameSelect, setRoomNameSelect] = useState('ห้องเรียนสถาปัตย์ วันเสาร์');
  const [roomNameCustom, setRoomNameCustom] = useState('');
  const [roomTime, setRoomTime] = useState('09.00 - 12.00 น. / 13.00 - 16.00 น.');
  const [selectedDatesTemp, setSelectedDatesTemp] = useState<string[]>([]);
  const [calendarSelectedDates, setCalendarSelectedDates] = useState<string[]>([]);
  const [calCurrentYear, setCalCurrentYear] = useState(() => new Date().getFullYear());
  const [calCurrentMonth, setCalCurrentMonth] = useState(() => new Date().getMonth());

  // Makeup Date Modal
  const [showMakeupModal, setShowMakeupModal] = useState(false);
  const [makeupInputDate, setMakeupInputDate] = useState('');
  const [pendingMakeupTarget, setPendingMakeupTarget] = useState<{
    roomId: string;
    studentIdx: number;
    dateKey: string;
  } | null>(null);

  // Add Student to Room Modal
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [targetRoomIdForAdd, setTargetRoomIdForAdd] = useState('');
  const [studentSearchInput, setStudentSearchInput] = useState('');
  const [showNewStudentForm, setShowNewStudentForm] = useState(false);
  const [newStudentCode, setNewStudentCode] = useState('');
  const [newStudentNickname, setNewStudentNickname] = useState('');
  const [newStudentYearModel, setNewStudentYearModel] = useState('69');

  // Search input and sort order for Database tab (default: ลำดับที่มากกว่าอยู่ด้านบนเสมอ)
  const [dbSearchTerm, setDbSearchTerm] = useState('');
  const [dbSortOrder, setDbSortOrder] = useState<'desc' | 'asc'>('desc');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Cloud Sync State
  const [cloudStatus, setCloudStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>(
    isSupabaseConfigured ? 'synced' : 'offline'
  );

  // References to prevent premature auto-saving before initial cloud fetch completes
  const isCloudLoadedRef = React.useRef(false);

  // Sync to localStorage as offline cache
  useEffect(() => {
    localStorage.setItem('ba_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('ba_students', JSON.stringify(databaseStudents));
  }, [databaseStudents]);

  useEffect(() => {
    localStorage.setItem('ba_rounds', JSON.stringify(rounds));
  }, [rounds]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('ba_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('ba_current_user');
    }
  }, [currentUser]);

  // Initial load from Supabase Cloud
  useEffect(() => {
    let isMounted = true;
    async function initCloudData() {
      if (!isSupabaseConfigured) {
        setCloudStatus('offline');
        isCloudLoadedRef.current = true;
        return;
      }

      setCloudStatus('syncing');
      try {
        // 1. Load rounds from Supabase
        const remoteRounds = await fetchRemoteState<Round[]>('rounds');
        if (isMounted) {
          if (remoteRounds && Array.isArray(remoteRounds) && remoteRounds.length > 0) {
            setRounds(remoteRounds);
          } else {
            // Initialize Supabase with current rounds
            await saveRemoteState('rounds', rounds);
          }
        }

        // 2. Load students from Supabase
        const remoteStudents = await fetchRemoteState<DatabaseStudent[]>('students');
        if (isMounted) {
          if (remoteStudents && Array.isArray(remoteStudents) && remoteStudents.length > 0) {
            setDatabaseStudents(remoteStudents);
          } else {
            await saveRemoteState('students', databaseStudents);
          }
        }

        // 3. Load users from Supabase
        const remoteUsers = await fetchRemoteState<User[]>('users');
        if (isMounted) {
          if (remoteUsers && Array.isArray(remoteUsers) && remoteUsers.length > 0) {
            const adminIdx = remoteUsers.findIndex((u) => u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
            if (adminIdx >= 0) {
              remoteUsers[adminIdx] = {
                ...remoteUsers[adminIdx],
                password: ADMIN_PASSWORD,
                role: 'Admin',
              };
            } else {
              remoteUsers.unshift({
                id: 1,
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD,
                name: 'Admin (คุณ)',
                role: 'Admin',
                createdAt: '2026-01-10 09:00',
              });
            }
            setUsers(remoteUsers);
          } else {
            await saveRemoteState('users', users);
          }
        }

        if (isMounted) {
          setCloudStatus('synced');
          isCloudLoadedRef.current = true;
        }
      } catch (err) {
        console.warn('Supabase cloud init error:', err);
        if (isMounted) {
          setCloudStatus('error');
          isCloudLoadedRef.current = true;
        }
      }
    }

    initCloudData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Debounced Auto-save rounds to Supabase when changed
  useEffect(() => {
    if (!isCloudLoadedRef.current || !isSupabaseConfigured) return;
    const timer = setTimeout(async () => {
      setCloudStatus('syncing');
      const ok = await saveRemoteState('rounds', rounds);
      setCloudStatus(ok ? 'synced' : 'error');
    }, 800);
    return () => clearTimeout(timer);
  }, [rounds]);

  // Debounced Auto-save students to Supabase when changed
  useEffect(() => {
    if (!isCloudLoadedRef.current || !isSupabaseConfigured) return;
    const timer = setTimeout(async () => {
      setCloudStatus('syncing');
      const ok = await saveRemoteState('students', databaseStudents);
      setCloudStatus(ok ? 'synced' : 'error');
    }, 800);
    return () => clearTimeout(timer);
  }, [databaseStudents]);

  // Debounced Auto-save users to Supabase when changed
  useEffect(() => {
    if (!isCloudLoadedRef.current || !isSupabaseConfigured) return;
    const timer = setTimeout(async () => {
      setCloudStatus('syncing');
      const ok = await saveRemoteState('users', users);
      setCloudStatus(ok ? 'synced' : 'error');
    }, 800);
    return () => clearTimeout(timer);
  }, [users]);

  // Manual Cloud Sync Function
  const handleManualSync = async () => {
    if (!isSupabaseConfigured) {
      showToast('ยังไม่ได้ตั้งค่า Supabase บน Vercel');
      return;
    }
    setCloudStatus('syncing');
    showToast('กำลังซิงค์ข้อมูลกับคลาวด์...');
    try {
      const remoteRounds = await fetchRemoteState<Round[]>('rounds');
      if (remoteRounds && Array.isArray(remoteRounds) && remoteRounds.length > 0) {
        setRounds(remoteRounds);
      } else {
        await saveRemoteState('rounds', rounds);
      }

      const remoteStudents = await fetchRemoteState<DatabaseStudent[]>('students');
      if (remoteStudents && Array.isArray(remoteStudents) && remoteStudents.length > 0) {
        setDatabaseStudents(remoteStudents);
      } else {
        await saveRemoteState('students', databaseStudents);
      }

      setCloudStatus('synced');
      showToast('ซิงค์ข้อมูลกับคลาวด์สำเร็จแล้ว');
    } catch (err) {
      setCloudStatus('error');
      showToast('การซิงค์ขัดข้อง โปรดตรวจสอบการเชื่อมต่อ');
    }
  };

  // Robust Google Sheet Data Parser supporting Thai columns and various JSON structures
  const parseGoogleSheetStudents = (raw: unknown): DatabaseStudent[] => {
    let list: Array<Record<string, unknown>> = [];
    if (Array.isArray(raw)) {
      list = raw as Array<Record<string, unknown>>;
    } else if (raw && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>;
      if (Array.isArray(obj.students)) {
        list = obj.students as Array<Record<string, unknown>>;
      } else if (Array.isArray(obj.data)) {
        list = obj.data as Array<Record<string, unknown>>;
      }
    }

    const validStatuses: StudentStatus[] = ['ต่อคอร์ส', 'นักเรียนใหม่', 'กลับมาเรียน', 'เลิกเรียน', 'พักคอร์ส'];

    return list
      .map((item) => {
        const code = String(
          item['รหัส'] || item['code'] || item['รหัสนักเรียน'] || item['ID'] || ''
        ).trim();
        const nickname = String(
          item['ชื่อเล่น'] || item['nickname'] || item['ชื่อ'] || ''
        ).trim();
        const yearModel = String(
          item['รุ่นปีการศึกษา'] || item['yearModel'] || item['รุ่น'] || ''
        ).trim();
        let status = String(
          item['สถานะ'] || item['status'] || 'ต่อคอร์ส'
        ).trim() as StudentStatus;
        if (!validStatuses.includes(status)) {
          status = 'ต่อคอร์ส';
        }
        const lastRoom = String(
          item['กลุ่มหลักสูตร'] || item['lastRoom'] || item['ห้องเรียนล่าสุด'] || ''
        ).trim();

        if (!code && !nickname) return null;
        return {
          code: code || 'N/A',
          nickname: nickname || '-',
          yearModel: yearModel || '-',
          status,
          lastRoom: lastRoom || undefined,
        } as DatabaseStudent;
      })
      .filter((s): s is DatabaseStudent => s !== null);
  };

  // Google Sheet Data Loader with optional user toast
  const loadDataFromGas = async (silent = true) => {
    if (!GAS_URL) return;
    setIsGasSyncing(true);
    try {
      // Append cache buster so Google does not return cached stale data
      const separator = GAS_URL.includes('?') ? '&' : '?';
      const fetchUrl = `${GAS_URL}${separator}action=getAllData&_t=${Date.now()}`;
      const res = await fetch(fetchUrl);
      const result = await res.json();

      const parsedStudents = parseGoogleSheetStudents(result);
      if (parsedStudents.length > 0) {
        setDatabaseStudents(parsedStudents);
        // Persist to Supabase Cloud so all devices receive the updated roster
        if (isSupabaseConfigured) {
          saveRemoteState('students', parsedStudents);
        }
        if (!silent) {
          showToast(`ซิงค์ข้อมูลนักเรียน ${parsedStudents.length} คน จาก Google Sheet สำเร็จ`);
        }
      } else if (!silent) {
        showToast('ดึงข้อมูลจาก Google Sheet สำเร็จ แต่ไม่พบรายการนักเรียน');
      }
    } catch (err) {
      console.warn('Google Sheet sync note:', err);
      if (!silent) {
        showToast('ไม่สามารถดึงข้อมูลจาก Google Sheet ได้ โปรดตรวจสอบสิทธิ์การแชร์ (Anyone)');
      }
    } finally {
      setIsGasSyncing(false);
    }
  };

  // Initial load and periodic polling (every 30 seconds) from Google Sheet
  useEffect(() => {
    loadDataFromGas(true);
    const interval = setInterval(() => {
      loadDataFromGas(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Set default selected round for Overview & Attendance
  useEffect(() => {
    if (rounds.length > 0) {
      if (!selectedOverviewRoundId || !rounds.some((r) => r.id === selectedOverviewRoundId)) {
        setSelectedOverviewRoundId(rounds[0].id);
      }
      if (!activeAttendanceRoundId || !rounds.some((r) => r.id === activeAttendanceRoundId)) {
        setActiveAttendanceRoundId(rounds[0].id);
      }
    }
  }, [rounds, selectedOverviewRoundId, activeAttendanceRoundId]);

  // Set default active room for attendance when round changes
  useEffect(() => {
    const curRound = rounds.find((r) => r.id === activeAttendanceRoundId);
    if (curRound && curRound.classrooms.length > 0) {
      if (!activeAttendanceRoomId || !curRound.classrooms.some((c) => c.id === activeAttendanceRoomId)) {
        setActiveAttendanceRoomId(curRound.classrooms[0].id);
      }
    } else {
      setActiveAttendanceRoomId('');
    }
  }, [activeAttendanceRoundId, rounds, activeAttendanceRoomId]);

  // Handlers for Auth
  const handleQuickAdminLogin = () => {
    setLoginEmail(ADMIN_EMAIL);
    setLoginPassword(ADMIN_PASSWORD);
    setAuthErrorMessage(null);
    let adminUser = users.find((u) => u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    if (!adminUser) {
      adminUser = {
        id: 1,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        name: 'Admin (คุณ)',
        role: 'Admin',
        createdAt: '2026-01-10 09:00',
      };
      setUsers((prev) => [adminUser!, ...prev.filter((u) => u.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase())]);
    } else {
      adminUser = { ...adminUser, password: ADMIN_PASSWORD, role: 'Admin' };
      setUsers((prev) =>
        prev.map((u) => (u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? adminUser! : u))
      );
    }
    setCurrentUser(adminUser);
    setActiveTab('overview');
    showToast(`ยินดีต้อนรับ ${adminUser.name}`);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErrorMessage(null);
    const email = loginEmail.trim().toLowerCase();
    const password = loginPassword.trim();

    if (!email || !password) {
      setAuthErrorMessage('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    // Check if logging in as predefined admin (รองรับทั้ง p.roobchird@gmail.com และ p.roobchird)
    const isAdminEmail = email === ADMIN_EMAIL.toLowerCase() || email === 'p.roobchird';
    const isMatchingAdminPass =
      password === ADMIN_PASSWORD || password.toLowerCase() === ADMIN_PASSWORD.toLowerCase();

    if (isAdminEmail) {
      if (!isMatchingAdminPass) {
        setAuthErrorMessage('รหัสผ่านไม่ถูกต้อง (รหัสผ่าน Admin คือ 21052528mM)');
        showToast('รหัสผ่านไม่ถูกต้อง');
        return;
      }
      let adminUser = users.find((u) => u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
      if (!adminUser) {
        adminUser = {
          id: 1,
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          name: 'Admin (คุณ)',
          role: 'Admin',
          createdAt: '2026-01-10 09:00',
        };
        setUsers((prev) => [adminUser!, ...prev.filter((u) => u.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase())]);
      } else {
        adminUser = { ...adminUser, password: ADMIN_PASSWORD, role: 'Admin' };
        setUsers((prev) =>
          prev.map((u) => (u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? adminUser! : u))
        );
      }
      setCurrentUser(adminUser);
      setActiveTab('overview');
      showToast(`ยินดีต้อนรับ ${adminUser.name}`);
      return;
    }

    const foundUser = users.find(
      (u) =>
        (u.email.toLowerCase() === email || u.email.toLowerCase().split('@')[0] === email) &&
        (u.password === password || u.password?.toLowerCase() === password.toLowerCase())
    );

    if (!foundUser) {
      setAuthErrorMessage('อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง หรือกดปุ่มเข้าสู่ระบบด่วน');
      showToast('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      return;
    }

    if (foundUser.role === 'รออนุมัติ') {
      setAuthErrorMessage('บัญชีนี้อยู่ระหว่างรอ Admin อนุมัติการใช้งาน');
      showToast('บัญชีนี้อยู่ระหว่างรอ Admin อนุมัติการใช้งาน');
      return;
    }

    setCurrentUser(foundUser);
    setActiveTab('overview');
    showToast(`ยินดีต้อนรับ ${foundUser.name}`);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const nickname = regNickname.trim();
    const email = regEmail.trim().toLowerCase();
    const password = regPassword.trim();

    if (users.some((u) => u.email.toLowerCase() === email)) {
      showToast('อีเมลนี้ถูกใช้งานในระบบแล้ว');
      return;
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    const initialRole: UserRole = email === ADMIN_EMAIL.toLowerCase() ? 'Admin' : 'รออนุมัติ';

    const newUser: User = {
      id: Date.now(),
      email,
      password,
      name: nickname,
      role: initialRole,
      createdAt: dateStr,
    };

    setUsers((prev) => [...prev, newUser]);
    showToast(
      initialRole === 'Admin' ? 'สมัครสมาชิกสำเร็จ!' : 'สมัครสมาชิกสำเร็จ! กรุณารอ Admin อนุมัติ'
    );
    setAuthMode('login');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    showToast('ออกจากระบบเรียบร้อย');
  };

  // Round Management
  const confirmCreateRound = () => {
    const name = newRoundName.trim();
    if (!name) {
      showToast('กรุณาระบุชื่อรอบเรียน');
      return;
    }
    const newRound: Round = {
      id: `round-${Date.now()}`,
      name: name,
      classrooms: [],
    };
    setRounds((prev) => [newRound, ...prev]);
    setShowAddRoundModal(false);
    setNewRoundName('');
    showToast(`สร้าง ${name} สำเร็จ`);
  };

  const moveRound = (index: number, direction: number) => {
    const target = index + direction;
    if (target < 0 || target >= rounds.length) return;
    const newRounds = [...rounds];
    const temp = newRounds[index];
    newRounds[index] = newRounds[target];
    newRounds[target] = temp;
    setRounds(newRounds);
  };

  const deleteRound = (index: number) => {
    const round = rounds[index];
    if (!round) return;
    if (window.confirm(`คุณต้องการลบ "${round.name}" และห้องเรียนทั้งหมดในรอบนี้ใช่หรือไม่?`)) {
      const newRounds = rounds.filter((_, i) => i !== index);
      setRounds(newRounds);
      showToast(`ลบ ${round.name} เรียบร้อยแล้ว`);
    }
  };

  // Classroom Management
  const openCreateRoomModal = (roundId: string) => {
    setTargetRoundIdForRoom(roundId);
    setRoomNameSelect('ห้องเรียนสถาปัตย์ วันเสาร์');
    setRoomNameCustom('');
    setRoomTime('09.00 - 12.00 น. / 13.00 - 16.00 น.');
    setSelectedDatesTemp([]);
    setCalendarSelectedDates([]);
    const now = new Date();
    setCalCurrentYear(now.getFullYear());
    setCalCurrentMonth(now.getMonth());
    setShowAddRoomModal(true);
  };

  const changeCalendarMonth = (delta: number) => {
    let newM = calCurrentMonth + delta;
    let newY = calCurrentYear;
    if (newM > 11) {
      newM = 0;
      newY += 1;
    } else if (newM < 0) {
      newM = 11;
      newY -= 1;
    }
    setCalCurrentMonth(newM);
    setCalCurrentYear(newY);
  };

  const toggleCalendarDate = (dateIso: string) => {
    setCalendarSelectedDates((prev) =>
      prev.includes(dateIso) ? prev.filter((d) => d !== dateIso) : [...prev, dateIso]
    );
  };

  const addPickedDatesToSelected = () => {
    const combined = Array.from(new Set([...selectedDatesTemp, ...calendarSelectedDates])).sort();
    setSelectedDatesTemp(combined);
    setCalendarSelectedDates([]);
  };

  const removeSelectedDate = (dateIso: string) => {
    setSelectedDatesTemp((prev) => prev.filter((d) => d !== dateIso));
  };

  const confirmCreateRoom = () => {
    const round = rounds.find((r) => r.id === targetRoundIdForRoom);
    if (!round) return;

    const finalName = roomNameSelect === 'custom' ? roomNameCustom.trim() : roomNameSelect;
    if (!finalName) {
      showToast('กรุณาระบุชื่อห้องเรียน');
      return;
    }

    const newRoom: Classroom = {
      id: `room-${Date.now()}`,
      name: finalName,
      time: roomTime.trim(),
      dates: [...selectedDatesTemp],
      students: [],
    };

    setRounds((prev) =>
      prev.map((r) => {
        if (r.id === targetRoundIdForRoom) {
          return {
            ...r,
            classrooms: [...r.classrooms, newRoom],
          };
        }
        return r;
      })
    );

    setShowAddRoomModal(false);
    showToast(`เพิ่มห้องเรียน ${finalName} สำเร็จ`);
  };

  const moveRoom = (roundId: string, roomIdx: number, direction: number) => {
    setRounds((prev) =>
      prev.map((r) => {
        if (r.id !== roundId) return r;
        const target = roomIdx + direction;
        if (target < 0 || target >= r.classrooms.length) return r;
        const newClassrooms = [...r.classrooms];
        const temp = newClassrooms[roomIdx];
        newClassrooms[roomIdx] = newClassrooms[target];
        newClassrooms[target] = temp;
        return { ...r, classrooms: newClassrooms };
      })
    );
  };

  const deleteRoom = (roundId: string, roomIdx: number) => {
    const round = rounds.find((r) => r.id === roundId);
    if (!round) return;
    const room = round.classrooms[roomIdx];
    if (!room) return;
    if (window.confirm(`คุณต้องการลบห้องเรียน "${room.name}" ใช่หรือไม่?`)) {
      setRounds((prev) =>
        prev.map((r) => {
          if (r.id !== roundId) return r;
          return {
            ...r,
            classrooms: r.classrooms.filter((_, idx) => idx !== roomIdx),
          };
        })
      );
      showToast(`ลบห้องเรียน ${room.name} เรียบร้อยแล้ว`);
    }
  };

  // Student Attendance & Status Operations
  const handleAttendanceChange = (
    roomId: string,
    studentIdx: number,
    dateKey: string,
    value: string
  ) => {
    setRounds((prev) =>
      prev.map((round) => {
        if (round.id !== activeAttendanceRoundId) return round;
        return {
          ...round,
          classrooms: round.classrooms.map((room) => {
            if (room.id !== roomId) return room;
            const updatedStudents = [...room.students];
            const student = { ...updatedStudents[studentIdx] };
            const newAttendance = { ...student.attendance, [dateKey]: value };

            if (value !== 'ชดเชย') {
              delete newAttendance[`makeup_${dateKey}`];
            }
            student.attendance = newAttendance;
            updatedStudents[studentIdx] = student;
            return { ...room, students: updatedStudents };
          }),
        };
      })
    );

    if (value === 'ชดเชย') {
      setPendingMakeupTarget({ roomId, studentIdx, dateKey });
      setMakeupInputDate('');
      setShowMakeupModal(true);
    }
  };

  const confirmMakeupDate = () => {
    if (makeupInputDate && pendingMakeupTarget) {
      const { roomId, studentIdx, dateKey } = pendingMakeupTarget;
      setRounds((prev) =>
        prev.map((round) => {
          if (round.id !== activeAttendanceRoundId) return round;
          return {
            ...round,
            classrooms: round.classrooms.map((room) => {
              if (room.id !== roomId) return room;
              const updatedStudents = [...room.students];
              const student = { ...updatedStudents[studentIdx] };
              student.attendance = {
                ...student.attendance,
                [`makeup_${dateKey}`]: formatDateShort(makeupInputDate),
              };
              updatedStudents[studentIdx] = student;
              return { ...room, students: updatedStudents };
            }),
          };
        })
      );
    }
    setShowMakeupModal(false);
    setPendingMakeupTarget(null);
  };

  const updateStudentStatus = (roomId: string, studentIdx: number, newStatus: StudentStatus) => {
    let studentCode = '';
    let studentName = '';
    let classroomName = '';

    setRounds((prev) =>
      prev.map((round) => {
        if (round.id !== activeAttendanceRoundId) return round;
        return {
          ...round,
          classrooms: round.classrooms.map((room) => {
            if (room.id !== roomId) return room;
            classroomName = room.name;
            const updatedStudents = [...room.students];
            const student = { ...updatedStudents[studentIdx], status: newStatus };
            studentCode = student.code;
            studentName = student.nickname;
            updatedStudents[studentIdx] = student;
            return { ...room, students: updatedStudents };
          }),
        };
      })
    );

    // Sync database student status
    if (studentCode) {
      setDatabaseStudents((prev) =>
        prev.map((s) =>
          s.code === studentCode ? { ...s, status: newStatus, lastRoom: classroomName } : s
        )
      );
      showToast(`อัปเดตสถานะของ ${studentName} เป็น ${newStatus}`);
    }
  };

  const updateStudentCourse = (roomId: string, studentIdx: number, courseVal: string) => {
    setRounds((prev) =>
      prev.map((round) => {
        if (round.id !== activeAttendanceRoundId) return round;
        return {
          ...round,
          classrooms: round.classrooms.map((room) => {
            if (room.id !== roomId) return room;
            const updatedStudents = [...room.students];
            updatedStudents[studentIdx] = {
              ...updatedStudents[studentIdx],
              course: courseVal,
            };
            return { ...room, students: updatedStudents };
          }),
        };
      })
    );
  };

  const moveStudentInRoom = (roomId: string, index: number, direction: number) => {
    setRounds((prev) =>
      prev.map((round) => {
        if (round.id !== activeAttendanceRoundId) return round;
        return {
          ...round,
          classrooms: round.classrooms.map((room) => {
            if (room.id !== roomId) return room;
            const target = index + direction;
            if (target < 0 || target >= room.students.length) return room;
            const newStudents = [...room.students];
            const temp = newStudents[index];
            newStudents[index] = newStudents[target];
            newStudents[target] = temp;
            return { ...room, students: newStudents };
          }),
        };
      })
    );
  };

  const deleteStudentFromRoom = (roomId: string, studentIdx: number) => {
    const round = rounds.find((r) => r.id === activeAttendanceRoundId);
    const room = round?.classrooms.find((r) => r.id === roomId);
    const student = room?.students[studentIdx];
    if (!student) return;

    if (window.confirm(`คุณต้องการลบ ${student.nickname} ออกจากห้องเรียนนี้ใช่หรือไม่?`)) {
      setRounds((prev) =>
        prev.map((r) => {
          if (r.id !== activeAttendanceRoundId) return r;
          return {
            ...r,
            classrooms: r.classrooms.map((rm) => {
              if (rm.id !== roomId) return rm;
              return {
                ...rm,
                students: rm.students.filter((_, idx) => idx !== studentIdx),
              };
            }),
          };
        })
      );
      showToast('ลบนักเรียนออกจากห้องแล้ว');
    }
  };

  const openAddStudentModal = (roomId: string) => {
    setTargetRoomIdForAdd(roomId);
    setStudentSearchInput('');
    setShowNewStudentForm(false);
    setNewStudentCode('');
    setNewStudentNickname('');
    setNewStudentYearModel('69');
    setShowAddStudentModal(true);
  };

  const addSelectedStudentToRoom = (studentCode: string) => {
    const dbStudent = databaseStudents.find((s) => s.code === studentCode);
    if (!dbStudent) return;

    const round = rounds.find((r) => r.id === activeAttendanceRoundId);
    const room = round?.classrooms.find((r) => r.id === targetRoomIdForAdd);
    if (!room) return;

    const defaultCourse = room.name.includes('สถาปัตย์') ? 'Arch 1' : 'Int 1(Draw)';
    const newRoomStudent: RoomStudent = {
      code: dbStudent.code,
      nickname: dbStudent.nickname,
      yearModel: dbStudent.yearModel,
      status: dbStudent.status || 'ต่อคอร์ส',
      course: defaultCourse,
      attendance: {},
    };

    setRounds((prev) =>
      prev.map((r) => {
        if (r.id !== activeAttendanceRoundId) return r;
        return {
          ...r,
          classrooms: r.classrooms.map((rm) => {
            if (rm.id !== targetRoomIdForAdd) return rm;
            return {
              ...rm,
              students: [newRoomStudent, ...rm.students],
            };
          }),
        };
      })
    );

    setDatabaseStudents((prev) =>
      prev.map((s) => (s.code === studentCode ? { ...s, lastRoom: room.name } : s))
    );

    showToast(`เพิ่ม ${dbStudent.nickname} เข้าห้องเรียนแล้ว (อยู่บนสุด)`);
  };

  const handleCreateCustomStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const code = newStudentCode.trim().toUpperCase();
    const nickname = newStudentNickname.trim();
    const yearModel = newStudentYearModel.trim() || '69';

    if (!code || !nickname) {
      showToast('กรุณากรอกรหัสและชื่อเล่นนักเรียน');
      return;
    }

    const round = rounds.find((r) => r.id === activeAttendanceRoundId);
    const room = round?.classrooms.find((r) => r.id === targetRoomIdForAdd);
    if (!room) return;

    const defaultCourse = room.name.includes('สถาปัตย์') ? 'Arch 1' : 'Int 1(Draw)';
    const newRoomStudent: RoomStudent = {
      code,
      nickname,
      yearModel,
      status: 'นักเรียนใหม่',
      course: defaultCourse,
      attendance: {},
    };

    setRounds((prev) =>
      prev.map((r) => {
        if (r.id !== activeAttendanceRoundId) return r;
        return {
          ...r,
          classrooms: r.classrooms.map((rm) => {
            if (rm.id !== targetRoomIdForAdd) return rm;
            return {
              ...rm,
              students: [newRoomStudent, ...rm.students],
            };
          }),
        };
      })
    );

    // Also add to databaseStudents at the top if not already present
    setDatabaseStudents((prev) => {
      const exists = prev.some((s) => s.code === code);
      if (exists) {
        return prev.map((s) => (s.code === code ? { ...s, lastRoom: room.name } : s));
      }
      return [
        {
          code,
          nickname,
          yearModel,
          status: 'นักเรียนใหม่',
          lastRoom: room.name,
        },
        ...prev,
      ];
    });

    setNewStudentCode('');
    setNewStudentNickname('');
    setShowNewStudentForm(false);
    showToast(`ลงทะเบียนและเพิ่ม ${nickname} สำเร็จ`);
  };

  // User Approval Operations
  const updateUserRole = (userId: number | string, newRole: UserRole) => {
    const target = users.find((u) => u.id === userId);
    if (target?.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && newRole !== 'Admin') {
      showToast('บัญชี Admin หลักไม่สามารถเปลี่ยนสิทธิ์ได้');
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
    showToast(`ปรับสิทธิ์เป็น ${newRole}`);
  };

  const deleteUser = (userId: number | string) => {
    if (currentUser && userId === currentUser.id) {
      showToast('ไม่สามารถลบบัญชีตัวเองได้');
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    showToast('ลบผู้ใช้สำเร็จ');
  };

  const navigateToAttendanceRoom = (roundId: string, roomId: string) => {
    setActiveAttendanceRoundId(roundId);
    setActiveAttendanceRoomId(roomId);
    setActiveTab('attendance');
  };

  // Calendar rendering helper for Add Room modal
  const monthsTH = [
    'มกราคม',
    'กุมภาพันธ์',
    'มีนาคม',
    'เมษายน',
    'พฤษภาคม',
    'มิถุนายน',
    'กรกฎาคม',
    'สิงหาคม',
    'กันยายน',
    'ตุลาคม',
    'พฤศจิกายน',
    'ธันวาคม',
  ];

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calCurrentYear, calCurrentMonth, 1);
    const dayOfWeek = firstDay.getDay();
    const mondayFirstOffset = (dayOfWeek + 6) % 7;
    const daysInMonth = new Date(calCurrentYear, calCurrentMonth + 1, 0).getDate();

    const blanks = Array.from({ length: mondayFirstOffset });
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const monthStr = String(calCurrentMonth + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      return {
        day: d,
        iso: `${calCurrentYear}-${monthStr}-${dayStr}`,
      };
    });

    return { blanks, days };
  }, [calCurrentYear, calCurrentMonth]);

  // Helper to count only active students (ต่อคอร์ส + นักเรียนใหม่ + กลับมาเรียน), strictly excluding พักคอร์ส and เลิกเรียน
  const getActiveStudentsCount = (students: RoomStudent[] | undefined): number => {
    if (!students || !Array.isArray(students)) return 0;
    return students.filter((st) => {
      const s = String(st.status || '').trim();
      if (s.includes('เลิกเรียน') || s.includes('พักคอร์ส')) return false;
      return true;
    }).length;
  };

  const getQuitPauseStudentsCount = (students: RoomStudent[] | undefined): number => {
    if (!students || !Array.isArray(students)) return 0;
    return students.filter((st) => {
      const s = String(st.status || '').trim();
      return s.includes('เลิกเรียน') || s.includes('พักคอร์ส');
    }).length;
  };

  // Overview calculations
  const overviewStats = useMemo(() => {
    const curRound = rounds.find((r) => r.id === selectedOverviewRoundId);
    if (!curRound) {
      return { totalEnrolled: 0, totalNewReturned: 0, totalQuitPause: 0, roomStats: [] };
    }

    let totalEnrolled = 0;
    let totalNewReturned = 0;
    let totalQuitPause = 0;

    const roomStats = curRound.classrooms.map((room) => {
      let rEnrolled = 0;
      let rNewReturned = 0;
      let rQuitPause = 0;

      room.students.forEach((st) => {
        const s = String(st.status || '').trim();
        if (s.includes('เลิกเรียน') || s.includes('พักคอร์ส')) {
          rQuitPause++;
        } else {
          // นับเฉพาะนักเรียนที่ต่อคอร์ส รวมกับนักเรียนใหม่ และนักเรียนที่กลับมาเรียน
          rEnrolled++;
          if (s.includes('นักเรียนใหม่') || s.includes('กลับมาเรียน')) {
            rNewReturned++;
          }
        }
      });

      totalEnrolled += rEnrolled;
      totalNewReturned += rNewReturned;
      totalQuitPause += rQuitPause;

      return {
        room,
        rEnrolled,
        rNewReturned,
        rQuitPause,
      };
    });

    return { totalEnrolled, totalNewReturned, totalQuitPause, roomStats };
  }, [rounds, selectedOverviewRoundId]);

  // If not logged in, render the Auth Screen (Minimal Muji Theme)
  if (!currentUser) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-[#f7f4ee] p-4 text-[#2d2825]">
        <div className="bg-[#fdfbf7] rounded-3xl shadow-[0_4px_24px_rgba(40,30,20,0.06)] w-full max-w-md p-8 border border-[#e7e1d8] transition-all">
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-[#c06a35] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-[#c06a35]/20 text-white font-extrabold text-3xl tracking-wider">
              BA
            </div>
            <h1 className="text-2xl font-bold text-[#2d2825]">Born to be Art</h1>
            <p className="text-[#7a7267] text-sm mt-1">ระบบจัดการและเช็คชื่อนักเรียน</p>
          </div>

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              {authErrorMessage && (
                <div className="p-3 bg-[#fdf0ef] border border-[#f3cecd] rounded-xl text-xs text-[#b2534e] space-y-1">
                  <p className="font-semibold">{authErrorMessage}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#5c554b] mb-1">
                  อีเมล (Email)
                </label>
                <input
                  type="text"
                  required
                  placeholder="yourname@gmail.com"
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    setAuthErrorMessage(null);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#ded7cc] bg-white text-sm text-[#2d2825] focus:outline-none focus:ring-2 focus:ring-[#c06a35]/30 focus:border-[#c06a35] transition"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#5c554b]">
                    รหัสผ่าน (Password)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="text-[11px] text-[#8c5025] hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    {showLoginPassword ? (
                      <>
                        <EyeOff className="w-3 h-3" />
                        <span>ซ่อนรหัส</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" />
                        <span>แสดงรหัส</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      setAuthErrorMessage(null);
                    }}
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-[#ded7cc] bg-white text-sm text-[#2d2825] focus:outline-none focus:ring-2 focus:ring-[#c06a35]/30 focus:border-[#c06a35] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-2.5 text-[#9e9589] hover:text-[#2d2825] cursor-pointer"
                    tabIndex={-1}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#282523] hover:bg-[#38332f] text-white font-medium rounded-xl text-sm shadow-sm transition duration-200 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-[#e8c599]" />
                <span>เข้าสู่ระบบ</span>
              </button>

              <button
                type="button"
                onClick={handleQuickAdminLogin}
                className="w-full py-2.5 bg-[#fbf4eb] hover:bg-[#f5e9d9] text-[#9a4f21] font-semibold rounded-xl text-xs border border-[#edd7c4] transition duration-200 flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                title="เข้าสู่ระบบทันทีด้วยบัญชีผู้ดูแลระบบ"
              >
                <Zap className="w-3.5 h-3.5 text-[#c06a35]" />
                <span>เข้าสู่ระบบด่วน (Admin p.roobchird@gmail.com)</span>
              </button>

              <div className="pt-4 border-t border-[#ede7dd] text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthErrorMessage(null);
                    setAuthMode('signup');
                  }}
                  className="text-xs text-[#c06a35] font-medium hover:underline cursor-pointer"
                >
                  ยังไม่มีบัญชี? สมัครสมาชิกก่อนใช้งานครั้งแรก (Sign up)
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5c554b] mb-1">
                  ชื่อเล่น (เช่น พี่เอ็ม)
                </label>
                <input
                  type="text"
                  required
                  placeholder="พี่เอ็ม"
                  value={regNickname}
                  onChange={(e) => setRegNickname(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#ded7cc] bg-white text-sm text-[#2d2825] focus:outline-none focus:ring-2 focus:ring-[#c06a35]/30 focus:border-[#c06a35] transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5c554b] mb-1">
                  อีเมล (เช่น yourname@gmail.com)
                </label>
                <input
                  type="email"
                  required
                  placeholder="yourname@gmail.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#ded7cc] bg-white text-sm text-[#2d2825] focus:outline-none focus:ring-2 focus:ring-[#c06a35]/30 focus:border-[#c06a35] transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5c554b] mb-1">
                  พาสเวิร์ด (อย่างน้อย 8 ตัว)
                </label>
                <input
                  type="password"
                  minLength={8}
                  required
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#ded7cc] bg-white text-sm text-[#2d2825] focus:outline-none focus:ring-2 focus:ring-[#c06a35]/30 focus:border-[#c06a35] transition"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-[#c06a35] hover:bg-[#aa5b2b] text-white font-medium rounded-xl text-sm shadow-sm transition duration-200 cursor-pointer"
              >
                สมัครสมาชิก
              </button>
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="text-xs text-[#7a7267] hover:underline cursor-pointer"
                >
                  มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 bg-[#282523] text-[#f7f4ee] px-4 py-3 rounded-xl text-xs shadow-xl border border-[#443f3a] transition z-50 flex items-center space-x-2">
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    );
  }

  // Active round and room for Attendance
  const activeAttendanceRound = rounds.find((r) => r.id === activeAttendanceRoundId);
  const activeAttendanceRoom = activeAttendanceRound?.classrooms.find(
    (c) => c.id === activeAttendanceRoomId
  );
  const canEditAttendance = currentUser.role === 'Admin' || currentUser.role === 'Staff';

  // Filtered and sorted students for database view (ค่าเริ่มต้นเรียงลำดับที่มากกว่าไว้ด้านบนเสมอ)
  const filteredDbStudents = useMemo(() => {
    return [...databaseStudents]
      .filter(
        (s) =>
          s.code.toLowerCase().includes(dbSearchTerm.toLowerCase()) ||
          s.nickname.toLowerCase().includes(dbSearchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const cmp = b.code.localeCompare(a.code, undefined, { numeric: true, sensitivity: 'base' });
        return dbSortOrder === 'desc' ? cmp : -cmp;
      });
  }, [databaseStudents, dbSearchTerm, dbSortOrder]);

  return (
    <div className="w-full h-screen flex flex-col md:flex-row overflow-hidden bg-[#f7f4ee] font-sans text-[#2d2825]">
      {/* Mobile Topbar */}
      <div className="md:hidden bg-[#282523] text-[#f7f4ee] p-4 flex items-center justify-between border-b border-[#3b3530] shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-[#c06a35] rounded-lg flex items-center justify-center font-bold text-xs text-white">
            BA
          </div>
          <span className="font-bold text-sm tracking-wide">Born to be Art</span>
        </div>
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="p-1 rounded text-[#d6cebf] hover:text-white cursor-pointer"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`w-full md:w-64 bg-[#282523] text-[#d6cebf] flex flex-col flex-shrink-0 z-30 fixed md:relative inset-0 transform ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } transition-transform duration-200 ease-in-out`}
      >
        {/* Logo Header */}
        <div className="p-5 border-b border-[#3b3530] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#c06a35] rounded-xl flex items-center justify-center font-extrabold text-white text-lg shadow-md shadow-[#c06a35]/25">
              BA
            </div>
            <div>
              <h2 className="font-bold text-[#f7f4ee] leading-tight">Born to be Art</h2>
              <p className="text-xs text-[#9e9589]">Student Portal</p>
            </div>
          </div>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="md:hidden text-[#9e9589] hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info Card */}
        <div className="px-4 py-3 mx-3 my-3 bg-[#332f2b] rounded-xl flex items-center justify-between border border-[#443f3a]">
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-[#f7f4ee] truncate">{currentUser.name}</p>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-[#c06a35] text-white uppercase">
                {currentUser.role.toUpperCase()}
              </span>
              <span className="text-[11px] text-[#a89f92] truncate max-w-[100px]">
                {currentUser.email}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="ออกจากระบบ"
            className="text-[#9e9589] hover:text-[#d97736] p-1 rounded transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          <button
            onClick={() => {
              setActiveTab('overview');
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#c06a35] text-white shadow-sm'
                : 'text-[#d6cebf] hover:bg-[#34302c] hover:text-[#f7f4ee]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>ภาพรวม</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('rounds');
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
              activeTab === 'rounds'
                ? 'bg-[#c06a35] text-white shadow-sm'
                : 'text-[#d6cebf] hover:bg-[#34302c] hover:text-[#f7f4ee]'
            }`}
          >
            <CalendarRange className="w-4 h-4" />
            <span>รอบเรียน</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('attendance');
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-[#c06a35] text-white shadow-sm'
                : 'text-[#d6cebf] hover:bg-[#34302c] hover:text-[#f7f4ee]'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>เช็คชื่อ</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('database');
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
              activeTab === 'database'
                ? 'bg-[#c06a35] text-white shadow-sm'
                : 'text-[#d6cebf] hover:bg-[#34302c] hover:text-[#f7f4ee]'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>ฐานข้อมูล</span>
          </button>

          {currentUser.role === 'Admin' && (
            <button
              onClick={() => {
                setActiveTab('approval');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                activeTab === 'approval'
                  ? 'bg-[#c06a35] text-white shadow-sm'
                  : 'text-[#d6cebf] hover:bg-[#34302c] hover:text-[#f7f4ee]'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>อนุมัติสมาชิก</span>
            </button>
          )}
        </nav>

        <div className="p-3 border-t border-[#3b3530] flex items-center justify-between text-xs text-[#a89f92]">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2 h-2 rounded-full ${
                cloudStatus === 'synced'
                  ? 'bg-emerald-400'
                  : cloudStatus === 'syncing'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-red-400'
              }`}
            />
            <span className="text-[11px]">
              {cloudStatus === 'synced'
                ? 'ซิงค์คลาวด์แล้ว'
                : cloudStatus === 'syncing'
                ? 'กำลังซิงค์...'
                : cloudStatus === 'error'
                ? 'เชื่อมต่อคลาวด์ไม่สำเร็จ'
                : 'ออฟไลน์ (Local)'}
            </span>
          </div>
          <button
            onClick={handleManualSync}
            title="กดเพื่อซิงค์ข้อมูลกับคลาวด์ทันที"
            className="p-1 rounded-md hover:bg-[#3b3530] text-[#d6cebf] hover:text-white transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cloudStatus === 'syncing' ? 'animate-spin text-[#c06a35]' : ''}`} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-[#f7f4ee] flex flex-col h-full overflow-y-auto">
        {/* VIEW 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <section className="p-4 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e7e1d8]">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-[#2d2825]">ภาพรวม (Overview)</h2>
                <p className="text-xs md:text-sm text-[#7a7267]">สรุปสถิตินักเรียนและห้องเรียนทั้งหมด</p>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-xs font-medium text-[#7a7267]">เลือกรอบเรียน:</label>
                <select
                  value={selectedOverviewRoundId}
                  onChange={(e) => setSelectedOverviewRoundId(e.target.value)}
                  className="bg-[#fdfbf7] border border-[#ded7cc] rounded-xl px-3 py-1.5 text-xs md:text-sm font-medium text-[#2d2825] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#c06a35]/30 focus:border-[#c06a35]"
                >
                  {rounds.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3 Stat Cards in Muji Calm Earth Tones */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#fdfbf7] p-5 rounded-2xl border border-[#e7e1d8] shadow-[0_2px_8px_rgba(40,30,20,0.03)] flex flex-col justify-between">
                <span className="text-xs font-semibold text-[#7a7267] uppercase tracking-wider">
                  นักเรียนทั้งหมดในรอบนี้
                </span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-extrabold text-[#2d2825]">
                    {overviewStats.totalEnrolled}
                  </span>
                  <span className="text-xs text-[#7a7267] font-normal">คน</span>
                </div>
              </div>

              <div className="bg-[#f7f9f7] p-5 rounded-2xl border border-[#d5e2d7] shadow-[0_2px_8px_rgba(40,30,20,0.03)] flex flex-col justify-between">
                <span className="text-xs font-semibold text-[#4a7a58] uppercase tracking-wider">
                  นักเรียนใหม่ / กลับมาเรียน
                </span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-extrabold text-[#4a7a58]">
                    {overviewStats.totalNewReturned}
                  </span>
                  <span className="text-xs text-[#4a7a58]/80 font-normal">+ เพิ่มขึ้นจากรอบก่อน</span>
                </div>
              </div>

              <div className="bg-[#fcf7f6] p-5 rounded-2xl border border-[#e9d6d5] shadow-[0_2px_8px_rgba(40,30,20,0.03)] flex flex-col justify-between">
                <span className="text-xs font-semibold text-[#b2534e] uppercase tracking-wider">
                  เลิกเรียน / พักคอร์ส
                </span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-extrabold text-[#b2534e]">
                    {overviewStats.totalQuitPause}
                  </span>
                  <span className="text-xs text-[#b2534e]/80 font-normal">- ลดลงจากรอบก่อน</span>
                </div>
              </div>
            </div>

            {/* Classrooms Overview Cards */}
            <div>
              <h3 className="text-base font-bold text-[#2d2825] mb-3">จำนวนนักเรียนแยกตามห้องเรียน</h3>
              {overviewStats.roomStats.length === 0 ? (
                <p className="text-xs text-[#7a7267]">ยังไม่มีห้องเรียนในรอบนี้</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {overviewStats.roomStats.map(({ room, rEnrolled, rNewReturned, rQuitPause }) => (
                    <div
                      key={room.id}
                      onClick={() => navigateToAttendanceRoom(selectedOverviewRoundId, room.id)}
                      className="bg-[#fdfbf7] p-5 rounded-2xl border border-[#e7e1d8] hover:border-[#c06a35]/60 hover:shadow-md cursor-pointer transition space-y-3 group shadow-[0_2px_8px_rgba(40,30,20,0.03)]"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-[#2d2825] text-sm truncate group-hover:text-[#c06a35] transition flex items-center space-x-1">
                          <span>{room.name}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
                        </h4>
                        <span className="text-xs md:text-sm bg-[#eee7dc] text-[#2d2825] px-2.5 py-0.5 rounded-full font-bold">
                          {rEnrolled} คน
                        </span>
                      </div>
                      <div className="space-y-1.5 pt-1 text-xs">
                        <div className="flex justify-between text-[#4a7a58]">
                          <span>นักเรียนใหม่ + กลับมาเรียน:</span>
                          <span className="font-semibold">{rNewReturned} คน</span>
                        </div>
                        <div className="flex justify-between text-[#b2534e]">
                          <span>เลิกเรียน + พักคอร์ส:</span>
                          <span className="font-semibold">{rQuitPause} คน</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* VIEW 2: ROUNDS & CLASSROOMS */}
        {activeTab === 'rounds' && (
          <section className="p-4 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e7e1d8]">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-[#2d2825]">
                  รอบเรียน (Rounds & Classrooms)
                </h2>
                <p className="text-xs md:text-sm text-[#7a7267]">
                  สร้างและจัดลำดับรอบเรียน รวมทั้งห้องเรียน
                </p>
              </div>
              {currentUser.role === 'Admin' && (
                <button
                  onClick={() => {
                    setNewRoundName('');
                    setShowAddRoundModal(true);
                  }}
                  className="bg-[#c06a35] hover:bg-[#aa5b2b] text-white font-medium px-4 py-2 rounded-xl text-xs md:text-sm shadow-sm flex items-center space-x-2 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มรอบเรียน</span>
                </button>
              )}
            </div>

            <div className="space-y-6">
              {rounds.length === 0 ? (
                <div className="text-center py-10 text-[#7a7267]">ยังไม่มีรอบเรียนที่สร้างขึ้น</div>
              ) : (
                rounds.map((round, rIdx) => (
                  <div
                    key={round.id}
                    className="bg-[#fdfbf7] rounded-2xl border border-[#e7e1d8] shadow-[0_2px_8px_rgba(40,30,20,0.03)] p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-[#ede7dd]">
                      <div className="flex items-center space-x-3">
                        {currentUser.role === 'Admin' && (
                          <div className="flex flex-col text-[#9e9589]">
                            <button
                              onClick={() => moveRound(rIdx, -1)}
                              disabled={rIdx === 0}
                              className="hover:text-[#2d2825] disabled:opacity-30 cursor-pointer"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => moveRound(rIdx, 1)}
                              disabled={rIdx === rounds.length - 1}
                              className="hover:text-[#2d2825] disabled:opacity-30 cursor-pointer"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        <h3 className="text-lg font-bold text-[#2d2825]">{round.name}</h3>
                        <span className="text-xs bg-[#f4ece1] text-[#8c5025] font-semibold px-2.5 py-0.5 rounded-full">
                          {round.classrooms.length} ห้องเรียน
                        </span>
                      </div>

                      {currentUser.role === 'Admin' && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openCreateRoomModal(round.id)}
                            className="bg-[#fbf3eb] hover:bg-[#f6e6d8] text-[#9a4f21] font-medium px-3 py-1.5 rounded-xl text-xs border border-[#edd5c3] flex items-center space-x-1 transition cursor-pointer"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>เพิ่มห้องเรียน</span>
                          </button>
                          <button
                            onClick={() => deleteRound(rIdx)}
                            className="p-1.5 bg-[#fdf0ef] text-[#b2534e] hover:bg-[#fae2e0] border border-[#f3cecd] rounded-xl transition cursor-pointer"
                            title="ลบรอบเรียน"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {round.classrooms.length === 0 ? (
                      <p className="text-xs text-[#7a7267] py-2">ยังไม่มีห้องเรียนในรอบนี้</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {round.classrooms.map((room, rmIdx) => (
                          <div
                            key={room.id}
                            onClick={() => navigateToAttendanceRoom(round.id, room.id)}
                            className="bg-[#f9f6f0] border border-[#e4ded4] hover:border-[#c06a35]/60 hover:shadow-md cursor-pointer transition rounded-xl p-4 space-y-2 relative group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {currentUser.role === 'Admin' && (
                                  <div
                                    className="flex flex-col text-[#9e9589]"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={() => moveRoom(round.id, rmIdx, -1)}
                                      disabled={rmIdx === 0}
                                      className="hover:text-[#2d2825] disabled:opacity-30 cursor-pointer"
                                    >
                                      <ChevronUp className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => moveRoom(round.id, rmIdx, 1)}
                                      disabled={rmIdx === round.classrooms.length - 1}
                                      className="hover:text-[#2d2825] disabled:opacity-30 cursor-pointer"
                                    >
                                      <ChevronDown className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                                <h4 className="font-bold text-[#2d2825] text-sm group-hover:text-[#c06a35] transition flex items-center space-x-1">
                                  <span>{room.name}</span>
                                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
                                </h4>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span
                                  title="จำนวนนักเรียนที่เรียนจริง (ต่อคอร์ส + นักเรียนใหม่ + กลับมาเรียน ไม่รวมพักคอร์สหรือเลิกเรียน)"
                                  className="text-xs md:text-sm text-[#2d2825] font-bold bg-[#fdfbf7] px-2.5 py-0.5 rounded-lg border border-[#ded7cc]"
                                >
                                  {getActiveStudentsCount(room.students)} คน
                                </span>
                                {currentUser.role === 'Admin' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteRoom(round.id, rmIdx);
                                    }}
                                    className="text-[#9e9589] hover:text-[#b2534e] p-1 cursor-pointer"
                                    title="ลบห้องเรียน"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-[#7a7267] flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-[#9e9589]" />
                              <span>{room.time || 'ไม่ระบุเวลา'}</span>
                            </p>
                            <div className="pt-1">
                              <p className="text-[11px] font-semibold text-[#8f8679] mb-1">
                                วันเรียน:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {room.dates && room.dates.length > 0 ? (
                                  room.dates.map((d) => (
                                    <span
                                      key={d}
                                      className="bg-[#fdfbf7] border border-[#ded7cc] text-[#4d463e] px-2 py-0.5 rounded text-[10px]"
                                    >
                                      {formatDateShort(d)}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[11px] text-[#7a7267]">
                                    ยังไม่ได้เพิ่มวันเรียน
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* VIEW 3: ATTENDANCE */}
        {activeTab === 'attendance' && (
          <section className="p-4 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#e7e1d8]">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-[#2d2825]">
                  เช็คชื่อ (Attendance)
                </h2>
                <p className="text-xs md:text-sm text-[#7a7267]">
                  บันทึกสถานะการเรียน มา สาย ลา ขาด หรือชดเชย
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-xs font-medium text-[#7a7267]">รอบเรียน:</label>
                <select
                  value={activeAttendanceRoundId}
                  onChange={(e) => setActiveAttendanceRoundId(e.target.value)}
                  className="bg-[#fdfbf7] border border-[#ded7cc] rounded-xl px-3 py-1.5 text-xs md:text-sm font-medium text-[#2d2825] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#c06a35]/30 focus:border-[#c06a35]"
                >
                  {rounds.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Classroom tabs left menu */}
              <div className="w-full lg:w-64 bg-[#fdfbf7] p-4 rounded-2xl border border-[#e7e1d8] shadow-[0_2px_8px_rgba(40,30,20,0.03)] flex-shrink-0">
                <h3 className="text-xs font-bold text-[#8f8679] uppercase tracking-wider mb-3">
                  รายชื่อห้องเรียน
                </h3>
                {activeAttendanceRound && activeAttendanceRound.classrooms.length > 0 ? (
                  <div className="space-y-1.5">
                    {activeAttendanceRound.classrooms.map((room) => (
                      <button
                        key={room.id}
                        onClick={() => setActiveAttendanceRoomId(room.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                          room.id === activeAttendanceRoomId
                            ? 'bg-[#c06a35] text-white shadow-sm'
                            : 'bg-[#f9f6f0] text-[#4d463e] hover:bg-[#eee7dc]'
                        }`}
                      >
                        {room.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#7a7267]">ไม่มีห้องเรียนในรอบนี้</p>
                )}
              </div>

              {/* Attendance Table Panel */}
              <div className="flex-1 bg-[#fdfbf7] rounded-2xl border border-[#e7e1d8] shadow-[0_2px_8px_rgba(40,30,20,0.03)] p-4 overflow-x-auto min-h-[400px]">
                {!activeAttendanceRoom ? (
                  <p className="text-xs text-[#7a7267]">โปรดเลือกห้องเรียน</p>
                ) : (
                  <div>
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-[#2d2825] text-base">
                          {activeAttendanceRoom.name}
                        </h3>
                        <p className="text-xs text-[#7a7267]">
                          {activeAttendanceRoom.time || 'ไม่ระบุเวลาเรียน'}
                        </p>
                      </div>
                      {currentUser.role === 'Admin' && (
                        <button
                          onClick={() => openAddStudentModal(activeAttendanceRoom.id)}
                          className="bg-[#282523] text-white px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-[#3c3732] transition flex items-center space-x-1 w-fit cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>+ เพิ่มนักเรียนเข้าห้อง</span>
                        </button>
                      )}
                    </div>

                    {activeAttendanceRoom.students.length === 0 ? (
                      <div className="text-center py-8 text-[#7a7267] text-xs">
                        ยังไม่มีนักเรียนในห้องนี้
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-[#e7e1d8] bg-[#f4efe6] text-[#5c554b]">
                              <th className="p-2 min-w-[220px]">ข้อมูลนักเรียน</th>
                              {activeAttendanceRoom.dates.map((dateStr) => (
                                <th
                                  key={dateStr}
                                  className="p-2 text-center border-l border-[#e7e1d8] min-w-[140px]"
                                  colSpan={2}
                                >
                                  <div className="font-bold text-[#2d2825]">{formatDateShort(dateStr)}</div>
                                  <div className="grid grid-cols-2 text-[10px] text-[#7a7267] mt-0.5 border-t border-[#ded7cc] pt-0.5">
                                    <span>เช้า</span>
                                    <span>บ่าย</span>
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#ede7dd]">
                            {activeAttendanceRoom.students.map((student, stIdx) => {
                              const isArchRoom = activeAttendanceRoom.name.includes('สถาปัตย์');
                              const courseOptions = isArchRoom ? ARCH_COURSES : INT_COURSES;
                              const statusBadge =
                                STUDENT_STATUSES[student.status] || {
                                  bg: 'bg-[#ded7cc]',
                                  text: 'text-[#2d2825]',
                                };

                              return (
                                <tr key={`${student.code}-${stIdx}`}>
                                  {/* Student info cell */}
                                  <td className="p-2 align-top">
                                    <div className="flex items-center space-x-2">
                                      {currentUser.role === 'Admin' && (
                                        <div className="flex flex-col text-[#9e9589]">
                                          <button
                                            onClick={() =>
                                              moveStudentInRoom(
                                                activeAttendanceRoom.id,
                                                stIdx,
                                                -1
                                              )
                                            }
                                            disabled={stIdx === 0}
                                            className="hover:text-[#2d2825] disabled:opacity-30 cursor-pointer"
                                          >
                                            <ChevronUp className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={() =>
                                              moveStudentInRoom(
                                                activeAttendanceRoom.id,
                                                stIdx,
                                                1
                                              )
                                            }
                                            disabled={
                                              stIdx === activeAttendanceRoom.students.length - 1
                                            }
                                            className="hover:text-[#2d2825] disabled:opacity-30 cursor-pointer"
                                          >
                                            <ChevronDown className="w-3 h-3" />
                                          </button>
                                        </div>
                                      )}
                                      <div className="flex-1 space-y-1">
                                        <div className="flex flex-wrap items-center gap-1.5 font-medium">
                                          <span className="text-[#7a7267] font-mono text-[11px]">
                                            {student.code}
                                          </span>
                                          <span className="font-bold text-[#2d2825]">
                                            {student.nickname}
                                          </span>
                                          <span className="text-[10px] text-[#8f8679]">
                                            รุ่น {student.yearModel}
                                          </span>

                                          {currentUser.role === 'Admin' ? (
                                            <>
                                              <select
                                                value={student.status}
                                                onChange={(e) =>
                                                  updateStudentStatus(
                                                    activeAttendanceRoom.id,
                                                    stIdx,
                                                    e.target.value as StudentStatus
                                                  )
                                                }
                                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusBadge.bg} ${statusBadge.text} focus:outline-none cursor-pointer`}
                                              >
                                                {Object.keys(STUDENT_STATUSES).map((stKey) => (
                                                  <option
                                                    key={stKey}
                                                    value={stKey}
                                                    className="bg-white text-[#2d2825]"
                                                  >
                                                    {stKey}
                                                  </option>
                                                ))}
                                              </select>
                                              <button
                                                onClick={() =>
                                                  deleteStudentFromRoom(
                                                    activeAttendanceRoom.id,
                                                    stIdx
                                                  )
                                                }
                                                className="text-[#9e9589] hover:text-[#b2534e] p-0.5 ml-auto cursor-pointer"
                                                title="ลบนักเรียนออกจากห้อง"
                                              >
                                                <UserX className="w-3.5 h-3.5" />
                                              </button>
                                            </>
                                          ) : (
                                            <span
                                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusBadge.bg} ${statusBadge.text}`}
                                            >
                                              {student.status}
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex items-center space-x-1 flex-wrap gap-y-1">
                                          <span className="text-[10px] text-[#7a7267]">
                                            หลักสูตร:
                                          </span>
                                          {canEditAttendance ? (
                                            <>
                                              <select
                                                value={
                                                  courseOptions.includes(student.course)
                                                    ? student.course
                                                    : 'custom'
                                                }
                                                onChange={(e) =>
                                                  updateStudentCourse(
                                                    activeAttendanceRoom.id,
                                                    stIdx,
                                                    e.target.value
                                                  )
                                                }
                                                className="text-[11px] bg-[#f4efe6] border border-[#ded7cc] rounded px-1.5 py-0.5 text-[#2d2825] focus:outline-none focus:ring-1 focus:ring-[#c06a35] cursor-pointer"
                                              >
                                                {courseOptions.map((c) => (
                                                  <option key={c} value={c}>
                                                    {c}
                                                  </option>
                                                ))}
                                                <option value="custom">อื่นๆ</option>
                                              </select>
                                              {!courseOptions.includes(student.course) && (
                                                <input
                                                  type="text"
                                                  value={
                                                    student.course === 'custom'
                                                      ? ''
                                                      : student.course
                                                  }
                                                  placeholder="ระบุหลักสูตร..."
                                                  onChange={(e) =>
                                                    updateStudentCourse(
                                                      activeAttendanceRoom.id,
                                                      stIdx,
                                                      e.target.value
                                                    )
                                                  }
                                                  className="text-[11px] bg-white border border-[#ded7cc] rounded px-2 py-0.5 text-[#2d2825] focus:outline-none focus:ring-1 focus:ring-[#c06a35] w-36 shadow-sm"
                                                />
                                              )}
                                            </>
                                          ) : (
                                            <span className="text-[11px] font-medium text-[#2d2825]">
                                              {student.course}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Attendance columns (AM / PM) */}
                                  {activeAttendanceRoom.dates.map((dateStr) => {
                                    const amKey = `${dateStr}_am`;
                                    const pmKey = `${dateStr}_pm`;
                                    const amVal = student.attendance[amKey] || '-';
                                    const pmVal = student.attendance[pmKey] || '-';
                                    const amStyle =
                                      ATTENDANCE_STATUSES[amVal] || ATTENDANCE_STATUSES['-'];
                                    const pmStyle =
                                      ATTENDANCE_STATUSES[pmVal] || ATTENDANCE_STATUSES['-'];
                                    const amMakeup = student.attendance[`makeup_${amKey}`];
                                    const pmMakeup = student.attendance[`makeup_${pmKey}`];

                                    return (
                                      <React.Fragment key={dateStr}>
                                        <td className="p-1 border-l border-[#ede7dd] align-top">
                                          <div className="flex flex-col items-center">
                                            {canEditAttendance ? (
                                              <select
                                                value={amVal}
                                                onChange={(e) =>
                                                  handleAttendanceChange(
                                                    activeAttendanceRoom.id,
                                                    stIdx,
                                                    amKey,
                                                    e.target.value
                                                  )
                                                }
                                                className={`w-full text-center text-[11px] font-bold rounded py-1 ${amStyle.bg} focus:outline-none cursor-pointer`}
                                              >
                                                {Object.keys(ATTENDANCE_STATUSES).map((stKey) => (
                                                  <option
                                                    key={stKey}
                                                    value={stKey}
                                                    className="bg-white text-[#2d2825]"
                                                  >
                                                    {stKey}
                                                  </option>
                                                ))}
                                              </select>
                                            ) : (
                                              <span
                                                className={`w-full text-center text-[11px] font-bold rounded py-1 ${amStyle.bg}`}
                                              >
                                                {amVal}
                                              </span>
                                            )}
                                            {amVal === 'ชดเชย' && amMakeup && (
                                              <span className="text-[9px] text-[#745f82] font-semibold mt-0.5">
                                                {amMakeup}
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="p-1 border-r border-[#ede7dd] align-top">
                                          <div className="flex flex-col items-center">
                                            {canEditAttendance ? (
                                              <select
                                                value={pmVal}
                                                onChange={(e) =>
                                                  handleAttendanceChange(
                                                    activeAttendanceRoom.id,
                                                    stIdx,
                                                    pmKey,
                                                    e.target.value
                                                  )
                                                }
                                                className={`w-full text-center text-[11px] font-bold rounded py-1 ${pmStyle.bg} focus:outline-none cursor-pointer`}
                                              >
                                                {Object.keys(ATTENDANCE_STATUSES).map((stKey) => (
                                                  <option
                                                    key={stKey}
                                                    value={stKey}
                                                    className="bg-white text-[#2d2825]"
                                                  >
                                                    {stKey}
                                                  </option>
                                                ))}
                                              </select>
                                            ) : (
                                              <span
                                                className={`w-full text-center text-[11px] font-bold rounded py-1 ${pmStyle.bg}`}
                                              >
                                                {pmVal}
                                              </span>
                                            )}
                                            {pmVal === 'ชดเชย' && pmMakeup && (
                                              <span className="text-[9px] text-[#745f82] font-semibold mt-0.5">
                                                {pmMakeup}
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                      </React.Fragment>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* VIEW 4: DATABASE */}
        {activeTab === 'database' && (
          <section className="p-4 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e7e1d8]">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-[#2d2825]">
                  ฐานข้อมูล (Database)
                </h2>
                <p className="text-xs md:text-sm text-[#7a7267]">ข้อมูลรวมทั้งหมดจาก Google Sheets</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => loadDataFromGas(false)}
                  disabled={isGasSyncing}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#c06a35] hover:bg-[#aa5b2b] text-white text-xs md:text-sm font-medium shadow-sm transition cursor-pointer disabled:opacity-50"
                  title="ดึงข้อมูลล่าสุดจาก Google Sheet ทันที"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGasSyncing ? 'animate-spin' : ''}`} />
                  <span>{isGasSyncing ? 'กำลังดึงข้อมูล...' : 'ซิงค์ Google Sheet'}</span>
                </button>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#9e9589]" />
                  <input
                    type="text"
                    value={dbSearchTerm}
                    onChange={(e) => setDbSearchTerm(e.target.value)}
                    placeholder="ค้นหา รหัส, ชื่อเล่น..."
                    className="pl-9 pr-3 py-1.5 rounded-xl border border-[#ded7cc] bg-[#fdfbf7] text-xs md:text-sm text-[#2d2825] focus:outline-none focus:ring-2 focus:ring-[#c06a35]/30 focus:border-[#c06a35]"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#fdfbf7] rounded-2xl border border-[#e7e1d8] shadow-[0_2px_8px_rgba(40,30,20,0.03)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm text-[#2d2825]">
                  <thead className="bg-[#f4efe6] text-[#696156] font-semibold border-b border-[#e7e1d8]">
                    <tr>
                      <th
                        onClick={() => setDbSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                        className="px-4 py-3 cursor-pointer select-none hover:text-[#c06a35] transition"
                        title="คลิกเพื่อสลับเรียงลำดับมากไปน้อย / น้อยไปมาก"
                      >
                        <div className="flex items-center space-x-1.5">
                          <span>รหัส</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#e8e0d5] text-[#5c554b]">
                            {dbSortOrder === 'desc' ? 'มาก ➔ น้อย' : 'น้อย ➔ มาก'}
                          </span>
                        </div>
                      </th>
                      <th className="px-4 py-3">ชื่อเล่น</th>
                      <th className="px-4 py-3">รุ่นปีการศึกษา</th>
                      <th className="px-4 py-3">สถานะ (อัปเดตล่าสุด)</th>
                      <th className="px-4 py-3">ห้องล่าสุด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ede7dd]">
                    {filteredDbStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-[#7a7267]">
                          ไม่พบข้อมูลนักเรียน
                        </td>
                      </tr>
                    ) : (
                      filteredDbStudents.map((st) => {
                        const badge =
                          STUDENT_STATUSES[st.status] || {
                            bg: 'bg-[#ded7cc]',
                            text: 'text-[#2d2825]',
                          };
                        return (
                          <tr key={st.code} className="hover:bg-[#f9f6f0] transition">
                            <td className="px-4 py-3 font-mono font-bold text-[#2d2825]">
                              {st.code}
                            </td>
                            <td className="px-4 py-3 font-semibold text-[#2d2825]">
                              {st.nickname}
                            </td>
                            <td className="px-4 py-3 text-[#7a7267]">รุ่น {st.yearModel}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-bold ${badge.bg} ${badge.text}`}
                              >
                                {st.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-[#7a7267]">
                              {st.lastRoom || '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* VIEW 5: USER APPROVAL (ADMIN ONLY) */}
        {activeTab === 'approval' && currentUser.role === 'Admin' && (
          <section className="p-4 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e7e1d8]">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-[#2d2825]">
                  อนุมัติสมาชิก (User Approval)
                </h2>
                <p className="text-xs md:text-sm text-[#7a7267]">
                  จัดการระดับสิทธิ์ Admin, Staff, Visitor หรืออนุมัติการใช้งาน
                </p>
              </div>
            </div>

            <div className="bg-[#fdfbf7] rounded-2xl border border-[#e7e1d8] shadow-[0_2px_8px_rgba(40,30,20,0.03)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm text-[#2d2825]">
                  <thead className="bg-[#f4efe6] text-[#696156] font-semibold border-b border-[#e7e1d8]">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Password</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">CreatedAt</th>
                      <th className="px-4 py-3 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ede7dd]">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-[#f9f6f0] transition">
                        <td className="px-4 py-3 font-semibold text-[#2d2825]">{user.name}</td>
                        <td className="px-4 py-3 text-[#5c554b]">{user.email}</td>
                        <td className="px-4 py-3 text-[#9e9589] font-mono text-xs">••••••••</td>
                        <td className="px-4 py-3">
                          <select
                            value={user.role}
                            onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                            className="bg-[#f4efe6] border border-[#ded7cc] rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#c06a35]/30 cursor-pointer"
                          >
                            <option value="Admin">Admin</option>
                            <option value="Staff">Staff</option>
                            <option value="Visitor">Visitor</option>
                            <option value="รออนุมัติ">รออนุมัติ</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#8f8679]">{user.createdAt}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="text-[#b2534e] hover:text-[#8a3330] p-1 cursor-pointer"
                            title="ลบผู้ใช้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* MODAL: ADD ROUND */}
      {showAddRoundModal && (
        <div className="fixed inset-0 bg-[#282523]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#fdfbf7] rounded-3xl p-6 w-full max-w-sm shadow-xl border border-[#e7e1d8]">
            <h3 className="text-base font-bold text-[#2d2825] mb-4">เพิ่มรอบเรียนใหม่</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5c554b] mb-1">
                  ชื่อรอบเรียน
                </label>
                <input
                  type="text"
                  placeholder="เช่น รอบ 10"
                  value={newRoundName}
                  onChange={(e) => setNewRoundName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#ded7cc] bg-white text-sm text-[#2d2825] focus:outline-none focus:ring-2 focus:ring-[#c06a35]/30 focus:border-[#c06a35]"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setShowAddRoundModal(false)}
                  className="px-4 py-2 bg-[#ede7dd] text-[#5c554b] rounded-xl text-xs font-medium hover:bg-[#e2dad0] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmCreateRound}
                  className="px-4 py-2 bg-[#c06a35] text-white rounded-xl text-xs font-medium hover:bg-[#aa5b2b] cursor-pointer"
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD CLASSROOM */}
      {showAddRoomModal && (
        <div className="fixed inset-0 bg-[#282523]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#fdfbf7] rounded-3xl p-6 w-full max-w-md shadow-xl border border-[#e7e1d8] max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-[#2d2825] mb-4">เพิ่มห้องเรียน</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5c554b] mb-1">
                  ชื่อห้องเรียน
                </label>
                <select
                  value={roomNameSelect}
                  onChange={(e) => setRoomNameSelect(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#ded7cc] bg-white text-sm text-[#2d2825] focus:outline-none focus:ring-2 focus:ring-[#c06a35]/30 mb-2 cursor-pointer"
                >
                  <option value="ห้องเรียนสถาปัตย์ วันเสาร์">ห้องเรียนสถาปัตย์ วันเสาร์</option>
                  <option value="ห้องเรียนสถาปัตย์ วันอาทิตย์">ห้องเรียนสถาปัตย์ วันอาทิตย์</option>
                  <option value="ห้องเรียนมัณฑนศิลป์ วันเสาร์">ห้องเรียนมัณฑนศิลป์ วันเสาร์</option>
                  <option value="ห้องเรียนมัณฑนศิลป์ วันอาทิตย์">
                    ห้องเรียนมัณฑนศิลป์ วันอาทิตย์
                  </option>
                  <option value="custom">ห้องเรียนอื่นๆ (ระบุเอง)</option>
                </select>
                {roomNameSelect === 'custom' && (
                  <input
                    type="text"
                    placeholder="พิมพ์ชื่อห้องเรียน"
                    value={roomNameCustom}
                    onChange={(e) => setRoomNameCustom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#ded7cc] bg-white text-sm text-[#2d2825] focus:outline-none focus:ring-2 focus:ring-[#c06a35]/30"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5c554b] mb-1">เวลาเรียน</label>
                <input
                  type="text"
                  value={roomTime}
                  onChange={(e) => setRoomTime(e.target.value)}
                  placeholder="เช่น 09.00 - 12.00 น. / 13.00 - 16.00 น."
                  className="w-full px-3 py-2 rounded-xl border border-[#ded7cc] bg-white text-sm text-[#2d2825] focus:outline-none focus:ring-2 focus:ring-[#c06a35]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5c554b] mb-1">
                  วันเรียน (เลือกได้พร้อมกันหลายวัน)
                </label>
                <div className="border border-[#e7e1d8] rounded-2xl p-3 bg-white space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#2d2825]">
                    <button
                      type="button"
                      onClick={() => changeCalendarMonth(-1)}
                      className="p-1 hover:bg-[#f0ebe2] rounded cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span>
                      {monthsTH[calCurrentMonth]} {calCurrentYear + 543}
                    </span>
                    <button
                      type="button"
                      onClick={() => changeCalendarMonth(1)}
                      className="p-1 hover:bg-[#f0ebe2] rounded cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 text-center text-[11px] font-bold text-[#8f8679] py-1">
                    <span>จ</span>
                    <span>อ</span>
                    <span>พ</span>
                    <span>พฤ</span>
                    <span>ศ</span>
                    <span className="text-[#c06a35]">ส</span>
                    <span className="text-[#b2534e]">อา</span>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center text-xs">
                    {calendarDays.blanks.map((_, idx) => (
                      <div key={`blank-${idx}`} />
                    ))}
                    {calendarDays.days.map(({ day, iso }) => {
                      const isPicked = calendarSelectedDates.includes(iso);
                      const isAlreadyAdded = selectedDatesTemp.includes(iso);
                      let style = 'hover:bg-[#f4efe6] text-[#4d463e]';
                      if (isPicked) {
                        style = 'bg-[#c06a35] text-white font-bold rounded-lg shadow-sm';
                      } else if (isAlreadyAdded) {
                        style = 'bg-[#e8efe9] text-[#2e5938] font-semibold rounded-lg';
                      }

                      return (
                        <button
                          key={iso}
                          type="button"
                          onClick={() => toggleCalendarDate(iso)}
                          className={`py-1.5 rounded-lg transition text-xs cursor-pointer ${style}`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 mb-1">
                  <span className="text-[11px] font-semibold text-[#7a7267]">
                    วันที่ถูกเลือกในห้องนี้:
                  </span>
                  <button
                    type="button"
                    onClick={addPickedDatesToSelected}
                    className="px-2.5 py-1 bg-[#c06a35] hover:bg-[#aa5b2b] text-white text-[11px] font-medium rounded-lg shadow-sm transition flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>เพิ่มวัน</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 p-2 bg-[#f9f6f0] border border-[#e7e1d8] rounded-xl min-h-[42px]">
                  {selectedDatesTemp.length === 0 ? (
                    <span className="text-xs text-[#8f8679]">ยังไม่มีวันที่เลือก</span>
                  ) : (
                    selectedDatesTemp.map((d) => (
                      <span
                        key={d}
                        className="inline-flex items-center space-x-1 bg-[#f4ece1] text-[#8c5025] px-2 py-1 rounded-lg text-xs"
                      >
                        <span>{formatDateShort(d)}</span>
                        <button
                          type="button"
                          onClick={() => removeSelectedDate(d)}
                          className="hover:text-[#b2534e] cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#ede7dd]">
                <button
                  onClick={() => setShowAddRoomModal(false)}
                  className="px-4 py-2 bg-[#ede7dd] text-[#5c554b] rounded-xl text-xs font-medium hover:bg-[#e2dad0] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmCreateRoom}
                  className="px-4 py-2 bg-[#c06a35] text-white rounded-xl text-xs font-medium hover:bg-[#aa5b2b] cursor-pointer"
                >
                  ยืนยันสร้างห้องเรียน
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PICK MAKEUP DATE (ชดเชย) */}
      {showMakeupModal && (
        <div className="fixed inset-0 bg-[#282523]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#fdfbf7] rounded-3xl p-5 w-full max-w-xs shadow-xl border border-[#e7e1d8] text-center">
            <h3 className="text-sm font-bold text-[#2d2825] mb-3">เลือกวันเรียนชดเชย</h3>
            <input
              type="date"
              value={makeupInputDate}
              onChange={(e) => setMakeupInputDate(e.target.value)}
              className="w-full px-3 py-2 border border-[#ded7cc] bg-white rounded-xl text-sm mb-4 text-[#2d2825]"
            />
            <div className="flex justify-center space-x-2">
              <button
                onClick={() => {
                  setShowMakeupModal(false);
                  setPendingMakeupTarget(null);
                }}
                className="px-3 py-1.5 bg-[#ede7dd] text-[#5c554b] rounded-xl text-xs cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmMakeupDate}
                className="px-4 py-1.5 bg-[#745f82] text-white rounded-xl text-xs font-medium hover:bg-[#635070] cursor-pointer"
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD STUDENT TO ROOM */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-[#282523]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#fdfbf7] rounded-3xl p-6 w-full max-w-md shadow-xl border border-[#e7e1d8] max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#ede7dd] mb-3">
              <h3 className="text-base font-bold text-[#2d2825]">เพิ่มนักเรียนเข้าห้องเรียน</h3>
              <button
                onClick={() => setShowAddStudentModal(false)}
                className="text-[#9e9589] hover:text-[#2d2825] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {showNewStudentForm ? (
              <form onSubmit={handleCreateCustomStudent} className="space-y-3 py-2">
                <div className="bg-[#fcf8f2] border border-[#ecd9c7] rounded-xl p-3 text-xs text-[#8c5025] mb-2">
                  ลงทะเบียนนักเรียนใหม่และเพิ่มเข้าห้องนี้ทันที
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5c554b] mb-1">
                    รหัสนักเรียน (เช่น BA6905)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="BA6905"
                    value={newStudentCode}
                    onChange={(e) => setNewStudentCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#ded7cc] bg-white text-sm text-[#2d2825] focus:outline-none focus:ring-2 focus:ring-[#c06a35]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5c554b] mb-1">
                    ชื่อเล่น (เช่น น้องจูน)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="น้องจูน"
                    value={newStudentNickname}
                    onChange={(e) => setNewStudentNickname(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#ded7cc] bg-white text-sm text-[#2d2825] focus:outline-none focus:ring-2 focus:ring-[#c06a35]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5c554b] mb-1">
                    รุ่นปีการศึกษา (เช่น 69)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="69"
                    value={newStudentYearModel}
                    onChange={(e) => setNewStudentYearModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#ded7cc] bg-white text-sm text-[#2d2825] focus:outline-none focus:ring-2 focus:ring-[#c06a35]/30"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewStudentForm(false)}
                    className="px-3 py-1.5 bg-[#ede7dd] text-[#5c554b] rounded-xl text-xs font-medium cursor-pointer"
                  >
                    ย้อนกลับ
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#c06a35] hover:bg-[#aa5b2b] text-white rounded-xl text-xs font-medium cursor-pointer"
                  >
                    บันทึกและเพิ่มเข้าห้อง
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="relative mb-3">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#9e9589]" />
                  <input
                    type="text"
                    value={studentSearchInput}
                    onChange={(e) => setStudentSearchInput(e.target.value)}
                    placeholder="ค้นหารหัส หรือชื่อเล่นนักเรียน..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#ded7cc] bg-white text-xs md:text-sm text-[#2d2825] focus:outline-none focus:ring-2 focus:ring-[#c06a35]/30"
                  />
                </div>

                <p className="text-[11px] font-semibold text-[#8f8679] mb-2">
                  รายชื่อนักเรียนในระบบ (ลงทะเบียนล่าสุดอยู่บนสุด):
                </p>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
                  {(() => {
                    const room = rounds
                      .find((r) => r.id === activeAttendanceRoundId)
                      ?.classrooms.find((c) => c.id === targetRoomIdForAdd);
                    const existingCodes = room ? room.students.map((s) => s.code) : [];
                    const search = studentSearchInput.toLowerCase().trim();

                    const reversedDb = [...databaseStudents].reverse();
                    const filtered = reversedDb.filter(
                      (s) =>
                        s.code.toLowerCase().includes(search) ||
                        s.nickname.toLowerCase().includes(search)
                    );

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-6 text-[#7a7267] text-xs">
                          ไม่พบรายชื่อนักเรียนที่ค้นหา
                        </div>
                      );
                    }

                    return filtered.map((st) => {
                      const isAlreadyInRoom = existingCodes.includes(st.code);
                      const badge =
                        STUDENT_STATUSES[st.status] || {
                          bg: 'bg-[#ded7cc]',
                          text: 'text-[#2d2825]',
                        };

                      return (
                        <div
                          key={st.code}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-[#e7e1d8] bg-[#f9f6f0] hover:bg-white hover:border-[#ded7cc] transition"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-xs font-bold text-[#2d2825]">
                                {st.code}
                              </span>
                              <span className="font-bold text-[#2d2825] text-xs">
                                {st.nickname}
                              </span>
                              <span className="text-[10px] text-[#8f8679]">
                                รุ่น {st.yearModel}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-[10px]">
                              <span
                                className={`px-1.5 py-0.2 rounded font-semibold ${badge.bg} ${badge.text}`}
                              >
                                {st.status}
                              </span>
                              <span className="text-[#7a7267]">
                                ห้องล่าสุด: {st.lastRoom || '-'}
                              </span>
                            </div>
                          </div>
                          {isAlreadyInRoom ? (
                            <span className="text-[10px] bg-[#ede7dd] text-[#7a7267] px-2 py-1 rounded-lg font-medium">
                              อยู่ในห้องแล้ว
                            </span>
                          ) : (
                            <button
                              onClick={() => addSelectedStudentToRoom(st.code)}
                              className="px-3 py-1 bg-[#c06a35] hover:bg-[#aa5b2b] text-white rounded-lg text-xs font-medium shadow-sm transition flex items-center space-x-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>เพิ่ม</span>
                            </button>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>

                <div className="pt-3 border-t border-[#ede7dd] mt-3 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setShowNewStudentForm(true)}
                    className="text-xs text-[#c06a35] font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ ลงทะเบียนนักเรียนคนใหม่เข้าระบบ</span>
                  </button>
                  <button
                    onClick={() => setShowAddStudentModal(false)}
                    className="px-4 py-1.5 bg-[#ede7dd] text-[#5c554b] rounded-xl text-xs font-medium hover:bg-[#e2dad0] cursor-pointer"
                  >
                    ปิด
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 bg-[#282523] text-[#f7f4ee] px-4 py-3 rounded-xl text-xs shadow-xl border border-[#443f3a] transition transform z-50 flex items-center space-x-2">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
