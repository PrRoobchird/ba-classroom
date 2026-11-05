import { DatabaseStudent, Round, StudentStatus, User } from './types';

export const ADMIN_EMAIL = 'p.roobchird@gmail.com';
export const ADMIN_PASSWORD = '21052528mM';
export const GAS_URL = 'https://script.google.com/macros/s/AKfycbxG0CApkmtC_4f4a90PinAlXC-OIAIEymJLt1jaBmEY5EGE9Rr_9siDfoETCwX8v_WQ/exec';

export const STUDENT_STATUSES: Record<StudentStatus, { bg: string; text: string }> = {
  'ต่อคอร์ส': { bg: 'bg-[#4a7a58]', text: 'text-white' },
  'นักเรียนใหม่': { bg: 'bg-[#4c7285]', text: 'text-white' },
  'กลับมาเรียน': { bg: 'bg-[#c6893b]', text: 'text-white' },
  'เลิกเรียน': { bg: 'bg-[#b2534e]', text: 'text-white' },
  'พักคอร์ส': { bg: 'bg-[#ba6a38]', text: 'text-white' },
};

export const ATTENDANCE_STATUSES: Record<string, { bg: string; text: string }> = {
  '-': { bg: 'bg-[#e8e2d8] text-[#5c554b]', text: 'text-[#5c554b]' },
  'มา': { bg: 'bg-[#4a7a58] text-white', text: 'text-white' },
  'สาย': { bg: 'bg-[#c6893b] text-white', text: 'text-white' },
  'ลา': { bg: 'bg-[#ba6a38] text-white', text: 'text-white' },
  'ขาด': { bg: 'bg-[#b2534e] text-white', text: 'text-white' },
  'ชดเชย': { bg: 'bg-[#745f82] text-white', text: 'text-white' },
};

export const ARCH_COURSES = ['Arch 1', 'Arch 2', 'Arch 3'];

export const INT_COURSES = [
  'Int 1(Draw)', 'Int 2', 'Int 3',
  'VCD 1(Draw)', 'VCD 2', 'VCD 3',
  'Digi 1(Draw)', 'Digi 2', 'Digi 3',
  'Fas 1(Draw)', 'Fas 2', 'Fas 3',
];

export const DEFAULT_USERS: User[] = [
  { id: 1, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, name: 'Admin (คุณ)', role: 'Admin', createdAt: '2026-01-10 09:00' },
  { id: 2, email: 'staff@ba.com', password: 'password123', name: 'พี่โอม', role: 'Staff', createdAt: '2026-02-15 11:30' },
];

export const DEFAULT_STUDENTS: DatabaseStudent[] = [
  { code: '69-001', nickname: 'พฤกษ์', yearModel: '70', status: 'ต่อคอร์ส', lastRoom: 'ห้องเรียนสถาปัตย์ วันเสาร์' },
  { code: '69-002', nickname: 'เข็ม', yearModel: '72', status: 'ต่อคอร์ส', lastRoom: 'ห้องเรียนสถาปัตย์ วันเสาร์' },
  { code: '69-003', nickname: 'ข้าวนึ่ง', yearModel: '71', status: 'ต่อคอร์ส', lastRoom: 'ห้องเรียนสถาปัตย์ วันเสาร์' },
  { code: '69-004', nickname: 'ออโต้', yearModel: '70', status: 'ต่อคอร์ส', lastRoom: 'ห้องเรียนสถาปัตย์ วันเสาร์' },
  { code: '69-005', nickname: 'เฟย์', yearModel: '70', status: 'ต่อคอร์ส', lastRoom: 'ห้องเรียนสถาปัตย์ วันเสาร์' },
  { code: '69-006', nickname: 'ปั๊บ', yearModel: '71', status: 'ต่อคอร์ส', lastRoom: 'ห้องเรียนสถาปัตย์ วันเสาร์' },
  { code: '69-007', nickname: 'ปาล์ม', yearModel: '71', status: 'ต่อคอร์ส', lastRoom: 'ห้องเรียนสถาปัตย์ วันเสาร์' },
  { code: '69-008', nickname: 'อาร์ม', yearModel: '70', status: 'ต่อคอร์ส', lastRoom: 'ห้องเรียนมัณฑนศิลป์ วันเสาร์' },
  { code: '69-009', nickname: 'เอ็ม', yearModel: '71', status: 'ต่อคอร์ส', lastRoom: 'ห้องเรียนมัณฑนศิลป์ วันเสาร์' },
  { code: '69-010', nickname: 'อธิป', yearModel: '70', status: 'ต่อคอร์ส', lastRoom: 'ห้องเรียนมัณฑนศิลป์ วันเสาร์' },
  { code: '69-011', nickname: 'ซูกัส', yearModel: '70', status: 'ต่อคอร์ส', lastRoom: 'ห้องเรียนมัณฑนศิลป์ วันเสาร์' },
  { code: '69-012', nickname: 'โฟกัส', yearModel: '72', status: 'ต่อคอร์ส', lastRoom: 'ห้องเรียนมัณฑนศิลป์ วันเสาร์' },
  { code: '69-013', nickname: 'เฟม', yearModel: '71', status: 'ต่อคอร์ส', lastRoom: 'ห้องเรียนมัณฑนศิลป์ วันเสาร์' },
  { code: '69-014', nickname: 'ญาญ่า', yearModel: '71', status: 'ต่อคอร์ส', lastRoom: 'ห้องเรียนมัณฑนศิลป์ วันเสาร์' },
  { code: '69-015', nickname: 'อันนา', yearModel: '71', status: 'ต่อคอร์ส', lastRoom: 'ห้องเรียนมัณฑนศิลป์ วันเสาร์' },
  { code: '69-016', nickname: 'พัชร์', yearModel: '70', status: 'ต่อคอร์ส', lastRoom: 'ห้องเรียนมัณฑนศิลป์ วันเสาร์' },
  { code: '69-017', nickname: 'มีนา', yearModel: '70', status: 'ต่อคอร์ส', lastRoom: 'ห้องเรียนมัณฑนศิลป์ วันเสาร์' },
  { code: '69-018', nickname: 'เอ็ม', yearModel: '70', status: 'ต่อคอร์ส', lastRoom: 'ห้องเรียนมัณฑนศิลป์ วันเสาร์' },
  { code: '69-019', nickname: 'สิตางศุ์', yearModel: '71', status: 'ต่อคอร์ส', lastRoom: 'ห้องเรียนมัณฑนศิลป์ วันเสาร์' },
  { code: '69-020', nickname: 'พุทโธ', yearModel: '71', status: 'ต่อคอร์ส', lastRoom: 'ห้องเรียนมัณฑนศิลป์ วันเสาร์' },
  { code: '69-021', nickname: 'แสงรุ้ง', yearModel: '70', status: 'ต่อคอร์ส', lastRoom: 'ห้องเรียนมัณฑนศิลป์ วันเสาร์' },
  { code: '69-022', nickname: 'ปริม', yearModel: '70', status: 'ต่อคอร์ส', lastRoom: 'ห้องเรียนมัณฑนศิลป์ วันเสาร์' },
  { code: '69-023', nickname: 'มะม่วง', yearModel: '70', status: 'ต่อคอร์ส', lastRoom: 'ห้องเรียนมัณฑนศิลป์ วันเสาร์' },
  { code: '69-024', nickname: 'โมจิ', yearModel: '70', status: 'ต่อคอร์ส', lastRoom: 'ห้องเรียนมัณฑนศิลป์ วันเสาร์' },
  { code: '69-025', nickname: 'ปุญญ์', yearModel: '70', status: 'ต่อคอร์ส', lastRoom: 'ห้องเรียนมัณฑนศิลป์ วันเสาร์' },
  { code: '69-026', nickname: 'นัท', yearModel: '70', status: 'ต่อคอร์ส', lastRoom: 'ห้องเรียนมัณฑนศิลป์ วันเสาร์' },
  { code: '69-027', nickname: 'โอกุน', yearModel: '70', status: 'ต่อคอร์ส', lastRoom: 'ห้องเรียนมัณฑนศิลป์ วันเสาร์' },
];

export const DEFAULT_ROUNDS: Round[] = [
  {
    id: 'round-10',
    name: 'รอบ 10',
    classrooms: [
      {
        id: 'room-10-1',
        name: 'ห้องเรียนสถาปัตย์ วันเสาร์',
        time: '09.00 - 12.00 น. / 13.00 - 16.00 น.',
        dates: ['2026-10-03', '2026-10-10'],
        students: [
          {
            code: '69-001',
            nickname: 'พฤกษ์',
            yearModel: '70',
            status: 'ต่อคอร์ส',
            course: 'Arch 1',
            attendance: {},
          },
        ],
      },
    ],
  },
];

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const day = parseInt(parts[2], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  return `${day} ${months[monthIdx] || ''}`;
}
