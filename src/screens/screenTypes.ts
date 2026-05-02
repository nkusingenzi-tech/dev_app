export type TabKey = 'Dashboard' | 'Check-in' | 'Panic' | 'Sword' | 'Lessons' | 'Profile';

export type User = {
  id: string;
  email: string;
  password: string;
  username: string;
  startDate: string;
};

export type CheckIn = {
  id: string;
  userId: string;
  date: string;
  relapsed: boolean;
  note: string;
  trigger?: string;
};

export type WeeklyDay = {
  date: string;
  label: string;
  status: 'empty' | 'clean' | 'relapse';
};

export type AppModel = {
  user: User;
  checkIns: CheckIn[];
  currentStreak: number;
  longestStreak: number;
  relapseCount: number;
  disciplineScore: number;
  completeCheckIn: (relapsed: boolean, note: string, trigger?: string) => void;
  resetStreak: (note?: string, trigger?: string) => void;
  logout: () => void;
};
