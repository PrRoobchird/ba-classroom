export type StudentStatus = 'ต่อคอร์ส' | 'นักเรียนใหม่' | 'กลับมาเรียน' | 'เลิกเรียน' | 'พักคอร์ส';

export type AttendanceStatus = '-' | 'มา' | 'สาย' | 'ลา' | 'ขาด' | 'ชดเชย';

export type UserRole = 'Admin' | 'Staff' | 'Visitor' | 'รออนุมัติ';

export interface User {
  id: number | string;
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface DatabaseStudent {
  code: string;
  nickname: string;
  yearModel: string;
  status: StudentStatus;
  lastRoom?: string;
}

export interface RoomStudent {
  code: string;
  nickname: string;
  yearModel: string;
  status: StudentStatus;
  course: string;
  attendance: Record<string, string>;
}

export interface Classroom {
  id: string;
  name: string;
  time: string;
  dates: string[];
  students: RoomStudent[];
}

export interface Round {
  id: string;
  name: string;
  classrooms: Classroom[];
}

export type ActiveTab = 'overview' | 'rounds' | 'attendance' | 'database' | 'approval';
