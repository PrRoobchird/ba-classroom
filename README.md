# Born to be Art - Student Portal

A modern React application for student management and attendance tracking for Born to be Art classroom.

## Features

- **Authentication & Role-Based Access Control**:
  - Roles: `Admin`, `Staff`, `Visitor`, and pending approval (`รออนุมัติ`).
  - Preconfigured admin credentials and self-service registration.
  - Admin approval dashboard for assigning roles or removing users.

- **Overview Dashboard**:
  - Round summary metrics (total students enrolled, new & returning students, discontinued/paused students).
  - Quick classroom status cards with direct navigation to attendance sheets.

- **Rounds & Classrooms Management**:
  - Create and reorder study rounds.
  - Add and reorder classrooms with schedule timings.
  - Interactive multi-date Buddhist Era Thai calendar selector for class scheduling.

- **Attendance Tracker**:
  - Multi-session morning (เช้า) and afternoon (บ่าย) attendance marking: มา, สาย, ลา, ขาด, and ชดเชย (Make-up).
  - Makeup date scheduling modal with automatic badge indication.
  - Student course track selector with custom course input support.
  - Student reordering and room enrollment controls.

- **Central Student Database**:
  - Searchable student catalog with real-time status and classroom history.
  - Synchronization with Google Apps Script Web App endpoints and localStorage persistence.

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS
- Lucide React Icons
