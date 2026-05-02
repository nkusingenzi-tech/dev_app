import React, { useEffect, useState } from 'react';
import { Platform, SafeAreaView, StatusBar as NativeStatusBar, StyleSheet, View } from 'react-native';
import { NativeModules } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BottomTabs as BottomTabsView } from './components/BottomTabs';
import { AuthScreen as AuthScreenView } from './screens/AuthScreen';
import { CheckInScreen as CheckInScreenView } from './screens/CheckInScreen';
import { DashboardScreen as DashboardScreenView } from './screens/DashboardScreen';
import { LessonsScreen as LessonsScreenView } from './screens/LessonsScreen';
import { PanicScreen as PanicScreenView } from './screens/PanicScreen';
import { ProfileScreen as ProfileScreenView } from './screens/ProfileScreen';
import { TreeScreen as TreeScreenView } from './screens/TreeScreen';
import type { AppModel, CheckIn, TabKey, User, WeeklyDay } from './screens/screenTypes';
import { colors } from './theme';

function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const todayKey = () => dateKey();

const lessons = [
  {
    title: 'Dopamine Basics',
    time: '3 min',
    body: 'Bad habits train the brain to expect fast reward. Recovery works by lowering easy stimulation and proving you can sit with discomfort.',
  },
  {
    title: 'The Urge Wave',
    time: '2 min',
    body: 'An urge rises, peaks, and falls. You do not need to defeat your whole life today. You need to survive the next ten minutes.',
  },
  {
    title: 'Discipline Mindset',
    time: '4 min',
    body: 'Discipline is not motivation. It is a default action chosen before the emotional moment arrives.',
  },
  {
    title: 'Relapse Triggers',
    time: '3 min',
    body: 'Most relapses are predictable: late night, isolation, stress, boredom, and unrestricted phone access.',
  },
  {
    title: 'Repair Protocol',
    time: '2 min',
    body: 'If you relapse, do not spiral. Log it, remove the trigger, reset the room, and win the next decision.',
  },
  {
    title: 'Night Defense',
    time: '3 min',
    body: 'Your night routine protects tomorrow. Charge your phone away from bed, shower, dim lights, and sleep early.',
  },
];

const panicMessages = [
  'This urge is temporary. Do not negotiate with it.',
  'Stand up now. Change rooms before the urge gets stronger.',
  'You only need to win the next ten minutes.',
  'Your future self is built by this exact decision.',
];

const distractionGames = [
  { title: 'Math Quiz', type: 'math' as const, subtitle: 'Solve 5 equations', icon: '123' },
  { title: 'Word Scramble', type: 'scramble' as const, subtitle: 'Decode 3 power words', icon: 'ABC' },
  { title: 'Memory Match', type: 'memory' as const, subtitle: 'Clear 8 hidden pairs', icon: '16' },
  { title: 'Tap Target', type: 'tap' as const, subtitle: 'Hit 8 moving targets', icon: '8x' },
];

type LocalSnapshot = {
  version: 1;
  users: User[];
  userId: string | null;
  checkIns: CheckIn[];
};

const localAppState = NativeModules.LocalAppState as
  | {
      load: () => Promise<string | null>;
      save: (snapshotJson: string) => Promise<boolean>;
      clear: () => Promise<boolean>;
    }
  | undefined;

export function MvpApp() {
  const [users, setUsers] = useState<User[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [tab, setTab] = useState<TabKey>('Dashboard');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (!localAppState) {
        setIsHydrated(true);
        return;
      }

      try {
        const raw = await localAppState.load();
        if (!raw || cancelled) {
          setIsHydrated(true);
          return;
        }

        const snapshot = JSON.parse(raw) as Partial<LocalSnapshot>;
        const restoredUsers = Array.isArray(snapshot.users) ? snapshot.users : [];
        const restoredCheckIns = Array.isArray(snapshot.checkIns) ? snapshot.checkIns : [];
        const restoredUser = snapshot.userId ? restoredUsers.find((item) => item.id === snapshot.userId) ?? null : null;

        setUsers(restoredUsers);
        setCheckIns(restoredCheckIns);
        setUser(restoredUser);
      } catch {
        setUsers([]);
        setCheckIns([]);
        setUser(null);
      } finally {
        if (!cancelled) {
          setIsHydrated(true);
        }
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated || !localAppState) return;

    const snapshot: LocalSnapshot = {
      version: 1,
      users,
      userId: user?.id ?? null,
      checkIns,
    };

    localAppState.save(JSON.stringify(snapshot)).catch(() => {
      // Local persistence is best effort while testing.
    });
  }, [checkIns, isHydrated, user?.id, users]);

  function signup(email: string, password: string, username: string) {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || password.length < 6 || !username.trim()) {
      return 'Enter username, valid email, and a 6+ character password.';
    }
    if (users.some((item) => item.email === cleanEmail)) {
      return 'Account already exists. Log in instead.';
    }
    const nextUser: User = {
      id: `${Date.now()}`,
      email: cleanEmail,
      password,
      username: username.trim(),
      startDate: todayKey(),
    };
    setUsers((current) => [...current, nextUser]);
    setUser(nextUser);
    return null;
  }

  function login(email: string, password: string) {
    const found = users.find((item) => item.email === email.trim().toLowerCase() && item.password === password);
    if (!found) {
      return 'No local account found for those credentials.';
    }
    setUser(found);
    return null;
  }

  function logout() {
    setUser(null);
    setTab('Dashboard');
  }

  if (!isHydrated) {
    return (
      <SafeAreaView style={shellStyles.safe}>
        <StatusBar style="light" />
      </SafeAreaView>
    );
  }

  if (!user) {
    return <AuthScreenView onSignup={signup} onLogin={login} />;
  }

  const userCheckIns = checkIns.filter((item) => item.userId === user.id);
  const stats = calculateStats(userCheckIns);

  function completeCheckIn(relapsed: boolean, note: string, trigger?: string) {
    const date = todayKey();
    const entry: CheckIn = {
      id: `${Date.now()}`,
      userId: user.id,
      date,
      relapsed,
      note: note.trim(),
      trigger: trigger?.trim() || undefined,
    };
    setCheckIns((current) => [...current.filter((item) => !(item.userId === user.id && item.date === date)), entry]);
    setTab('Dashboard');
  }

  function resetStreak(note = 'Manual reset', trigger?: string) {
    completeCheckIn(true, note, trigger);
  }

  const contextValue: AppModel = {
    user,
    checkIns: userCheckIns,
    currentStreak: stats.currentStreak,
    longestStreak: stats.longestStreak,
    relapseCount: stats.relapseCount,
    disciplineScore: stats.disciplineScore,
    completeCheckIn,
    resetStreak,
    logout,
  };

  return (
    <SafeAreaView style={shellStyles.safe}>
      <StatusBar style="light" />
      {tab === 'Sword' ? null : (
        <View style={shellStyles.stars} pointerEvents="none">
          {Array.from({ length: 48 }).map((_, index) => (
            <View
              key={index}
              style={[
                shellStyles.star,
                {
                  left: `${(index * 37) % 100}%`,
                  top: `${(index * 53) % 100}%`,
                  opacity: 0.18 + ((index * 11) % 50) / 100,
                },
              ]}
            />
          ))}
        </View>
      )}
      <View style={shellStyles.appBody}>
        {tab === 'Dashboard' ? <DashboardScreenView app={contextValue} goTo={setTab} lastSevenDays={lastSevenDays} topTrigger={topTrigger} formatShortDate={formatShortDate} /> : null}
        {tab === 'Check-in' ? <CheckInScreenView app={contextValue} /> : null}
        {tab === 'Panic' ? <PanicScreenView app={contextValue} goTo={setTab} panicMessages={panicMessages} distractionGames={distractionGames} /> : null}
        {tab === 'Sword' ? <TreeScreenView app={contextValue} /> : null}
        {tab === 'Lessons' ? <LessonsScreenView lessons={lessons} /> : null}
        {tab === 'Profile' ? <ProfileScreenView app={contextValue} formatShortDate={formatShortDate} /> : null}
      </View>
      <BottomTabsView active={tab} onChange={setTab} />
    </SafeAreaView>
  );
}

function calculateStats(checkIns: CheckIn[]) {
  const sorted = [...checkIns].sort((a, b) => a.date.localeCompare(b.date));
  let longestStreak = 0;
  let running = 0;
  let relapseCount = 0;

  sorted.forEach((item) => {
    if (item.relapsed) {
      relapseCount += 1;
      running = 0;
    } else {
      running += 1;
      longestStreak = Math.max(longestStreak, running);
    }
  });

  const latest = sorted[sorted.length - 1];
  const currentStreak = latest?.relapsed ? 0 : running;
  const cleanCount = sorted.filter((item) => !item.relapsed).length;
  const disciplineScore = Math.max(0, cleanCount * 10 - relapseCount * 5 + currentStreak * 3);

  return { currentStreak, longestStreak, relapseCount, disciplineScore };
}

function lastSevenDays(checkIns: CheckIn[]): WeeklyDay[] {
  const byDate = new Map(checkIns.map((item) => [item.date, item]));
  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = dateKey(date);
    const entry = byDate.get(key);
    return {
      date: key,
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      status: entry ? (entry.relapsed ? 'relapse' : 'clean') : 'empty',
    };
  });
}

function topTrigger(checkIns: CheckIn[]) {
  const counts = new Map<string, number>();
  checkIns.forEach((item) => {
    if (!item.trigger) return;
    counts.set(item.trigger, (counts.get(item.trigger) ?? 0) + 1);
  });
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return top ? `Most common trigger: ${top[0]} (${top[1]} time${top[1] === 1 ? '' : 's'})` : '';
}

function formatShortDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const shellStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  stars: { ...StyleSheet.absoluteFillObject },
  star: { position: 'absolute', width: 2, height: 2, borderRadius: 1, backgroundColor: colors.text },
  appBody: { flex: 1, paddingTop: Platform.OS === 'android' ? (NativeStatusBar.currentHeight ?? 0) + 10 : 0 },
});
