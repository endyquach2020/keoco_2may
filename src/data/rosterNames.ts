import { TeamMember } from '../types/game';

// Danh sách tên học sinh / thành viên thực tế từ bảng danh sách người dùng cung cấp
export const STUDENT_ROSTER: string[] = [
  'Cẩm Gấm',
  'Đức Mạnh',
  'Phước An',
  'Đan Quỳnh',
  'Quang Thắng',
  'Phúc Thịnh',
  'Thảo Vân',
  'Hồng Ngân',
  'Huy Giáp',
  'Phương Thùy',
  'Bình An',
  'Duy Anh',
  'Minh Đạt',
  'Gia Hân',
  'Duy Hậu',
  'Gia Thành',
  'Hoàng Minh',
  'Tài Phát',
  'Phúc Tài',
  'Tường Vy',
  'Minh Huy',
  'Quốc Bảo',
  'Tường Nguyên',
  'Bảo Châu',
  'Khánh An',
  'Ngọc Mai',
];

export const FUN_ICONS: string[] = [
  '🦁', '🐯', '🦊', '🐼', '🐨', '🐵', '🐸', '🦄',
  '🦅', '🦈', '🦖', '🐙', '⚡', '🔥', '🚀', '🤖',
  '🦸', '🥷', '👑', '⭐', '💥', '🎯', '🏆', '💎',
  '🐺', '🦏', '🐲', '🐉', '🐾', '🌪️', '⚔️', '🛡️',
];

export const TEAM_MASCOT_ICONS = [
  { icon: '🔥', label: 'Ngọn Lửa' },
  { icon: '⚡', label: 'Tia Chớp' },
  { icon: '🦁', label: 'Sư Tử' },
  { icon: '🐉', label: 'Rồng Thần' },
  { icon: '🦅', label: 'Đại Bàng' },
  { icon: '🦈', label: 'Cá Mập' },
  { icon: '🚀', label: 'Tên Lửa' },
  { icon: '👑', label: 'Vương Miện' },
  { icon: '🤖', label: 'Robot' },
  { icon: '🦖', label: 'Khủng Long' },
  { icon: '🐺', label: 'Sói Xám' },
  { icon: '🌪️', label: 'Cơn Lốc' },
];

/** Sinh 7 thành viên ngẫu nhiên kèm icon vui nhộn */
export function generateRandomTeamMembers(count = 7, startIndex = 0): TeamMember[] {
  const shuffledNames = [...STUDENT_ROSTER].sort(() => 0.5 - Math.random());
  const shuffledIcons = [...FUN_ICONS].sort(() => 0.5 - Math.random());

  const members: TeamMember[] = [];
  for (let i = 0; i < count; i++) {
    const name = shuffledNames[(startIndex + i) % shuffledNames.length];
    const icon = shuffledIcons[i % shuffledIcons.length];
    members.push({
      id: `m_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`,
      name,
      icon,
    });
  }
  return members;
}
