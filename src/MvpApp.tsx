import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, StatusBar as NativeStatusBar, StyleSheet, Text, View } from 'react-native';
import { NativeModules } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  sendEmailVerification,
} from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { BottomTabs as BottomTabsView } from './components/BottomTabs';
import { DailyCheckInPrompt as DailyCheckInPromptView } from './components/DailyCheckInPrompt';
import { PostOnboardingPrompts as PostOnboardingPromptsView } from './components/PostOnboardingPrompts';
import { AssistantScreen as AssistantScreenView } from './screens/AssistantScreen';
import { AuthScreen as AuthScreenView } from './screens/AuthScreen';
import { CheckInScreen as CheckInScreenView } from './screens/CheckInScreen';
import { DashboardScreen as DashboardScreenView } from './screens/DashboardScreen';
import { LessonsScreen as LessonsScreenView } from './screens/LessonsScreen';
import { PanicScreen as PanicScreenView } from './screens/PanicScreen';
import { ProfileScreen as ProfileScreenView } from './screens/ProfileScreen';
import { TreeScreen as TreeScreenView } from './screens/TreeScreen';
import { OnboardingScreen as OnboardingScreenView, type OnboardingPlan } from './screens/OnboardingScreen';
import type { AppModel, CheckIn, TabKey, User, WeeklyDay } from './screens/screenTypes';
import { colors, getRankTheme } from './theme';
import { firebaseAuth } from './lib/firebase';
import { loadUserProfile, syncUserProfile } from './lib/profileSync';

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
  checkIns: CheckIn[];
  onboardingPlan?: OnboardingPlan | null;
  onboardingCompleted?: boolean;
};

const localAppState = NativeModules.LocalAppState as
  | {
      load: () => Promise<string | null>;
      save: (snapshotJson: string) => Promise<boolean>;
      clear: () => Promise<boolean>;
    }
  | undefined;

export default function MvpApp() {
  const [user, setUser] = useState<User | null>(null);
  const [localPendingPlan, setLocalPendingPlan] = useState<OnboardingPlan | null>(null);
  const [localOnboardingCompleted, setLocalOnboardingCompleted] = useState(false);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [tab, setTab] = useState<TabKey>('Dashboard');
  const [isHydrated, setIsHydrated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [showCheckInPrompt, setShowCheckInPrompt] = useState(false);
  const [postOnboardingDone, setPostOnboardingDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthLoading((current) => (current ? false : current));
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Configure Google Sign-In
  useEffect(() => {
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '940102468451-v36707m4uu7evduv779ua973p3jh69pl.apps.googleusercontent.com';
    GoogleSignin.configure({
      webClientId,
      offlineAccess: true,
      forceCodeForRefreshToken: false,
    });
  }, []);

  // Sync with Firebase Auth
  useEffect(() => {
    if (!firebaseAuth) {
      setAuthLoading(false);
      return;
    }

    return onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        // Force reload to get the latest emailVerified status from Firebase
        try {
          await firebaseUser.reload();
        } catch (e) {
          console.error("Failed to reload user:", e);
        }

        const freshUser = firebaseAuth.currentUser;
        if (!freshUser) return;

        // Enforce email verification for email/password users
        if (!freshUser.emailVerified && freshUser.providerData.some(p => p.providerId === 'password')) {
          await signOut(firebaseAuth);
          setUser(null);
          setAuthLoading(false);
          return;
        }

        const baseUser: User = {
          id: freshUser.uid,
          authUserId: freshUser.uid,
          authProvider: freshUser.providerData.some(p => p.providerId === 'google.com') ? 'google' : 'firebase',
          email: freshUser.email || '',
          username: freshUser.displayName || 'Freeman',
          startDate: todayKey(),
        };
        const profile = await loadUserProfile(baseUser);
        
        // If the user is from Google, they are pre-verified.
        // We also check if we should skip onboarding for them.
        const isGoogleUser = freshUser.providerData.some(p => p.providerId === 'google.com');

        if (profile.onboardingCompleted || localOnboardingCompleted) {
          setLocalOnboardingCompleted(true);
        }
        
        // If we have a pending plan from guest onboarding, merge it now
        if (localPendingPlan && !profile.onboardingCompleted) {
          const updatedProfile: User = {
            ...profile,
            ...localPendingPlan,
            onboardingCompleted: true,
          };
          // CRITICAL: Ensure this is synced to Firestore so it's not asked again
          await syncUserProfile(updatedProfile);
          setUser(updatedProfile);
          setLocalPendingPlan(null);
          setLocalOnboardingCompleted(true);
        } else if ((isGoogleUser || localOnboardingCompleted) && !profile.onboardingCompleted) {
           // For Google users or users who already did local onboarding
           setLocalOnboardingCompleted(true); 
           const updatedProfile: User = { ...profile, onboardingCompleted: true };
           await syncUserProfile(updatedProfile);
           setUser(updatedProfile);
        } else {
          setUser(profile);
        }
        
        setShowCheckInPrompt(true);
      } else {
        setUser(null);
        setShowCheckInPrompt(false);
      }
      setAuthLoading(false);
    });
  }, [localPendingPlan, localOnboardingCompleted]);

  // Hydrate local check-ins
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
        const restoredCheckIns = Array.isArray(snapshot.checkIns) ? snapshot.checkIns : [];

        setCheckIns(restoredCheckIns);
        if (snapshot.onboardingPlan) setLocalPendingPlan(snapshot.onboardingPlan);
        if (snapshot.onboardingCompleted) setLocalOnboardingCompleted(true);
      } catch {
        setCheckIns([]);
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

  // Save local check-ins
  useEffect(() => {
    if (!isHydrated || !localAppState) return;

    const snapshot: LocalSnapshot = {
      version: 1,
      checkIns,
      onboardingPlan: localPendingPlan,
      onboardingCompleted: localOnboardingCompleted,
    };

    localAppState.save(JSON.stringify(snapshot)).catch(() => {
      // Local persistence is best effort while testing.
    });
  }, [checkIns, isHydrated]);

  async function signup(email: string, password: string, username: string) {
    try {
      // Use the custom proxy for signup to utilize the SMTP/Resend server
      const response = await fetch('https://www.freemanapp.online/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      // Automatically log them in (session will be caught by onAuthStateChanged)
      // Note: onAuthStateChanged will handle the "not verified" check
      await signInWithEmailAndPassword(firebaseAuth!, email, password);
      
      return 'Account created! Verification email sent.';
    } catch (error: any) {
      return error.message || 'Could not create account.';
    }
  }

  async function resendVerification(email: string) {
    try {
      const response = await fetch('https://www.freemanapp.online/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Could not resend verification');
      }
      return 'Verification email sent! Check your inbox.';
    } catch (error: any) {
      return error.message || 'Could not resend verification email.';
    }
  }

  async function login(email: string, password: string) {
    if (!firebaseAuth) return 'Firebase not configured.';
    try {
      const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
      
      // Force reload to check if they verified their email since the last attempt
      await cred.user.reload();
      
      if (!cred.user.emailVerified) {
        await signOut(firebaseAuth);
        return 'Please verify your email before logging in. Check your inbox.';
      }
      
      return null;
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        return 'Invalid email or password.';
      }
      return error.message || 'Could not log in.';
    }
  }

  async function googleSignIn() {
    if (!firebaseAuth) return 'Firebase not configured.';
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      if (result.type !== 'success') {
        return 'Google sign-in was cancelled.';
      }

      let idToken = result.data.idToken;
      if (!idToken) {
        const tokens = await GoogleSignin.getTokens();
        idToken = tokens.idToken;
      }

      if (!idToken) throw new Error('No ID token found');
      
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(firebaseAuth, credential);
      return null;
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      if (error.code === '7') return 'Network error. Check your connection.';
      if (error.code === 'DEVELOPER_ERROR') {
        return `Developer Error: Verify SHA-1 in Firebase. (Code: ${error.code})`;
      }
      if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') return 'Google Play Services is missing or outdated.';
      if (error.code === 'SIGN_IN_CANCELLED') return 'Google sign-in was cancelled.';
      return error.message || 'Google sign-in failed.';
    }
  }

  async function logout() {
    if (firebaseAuth) {
      await signOut(firebaseAuth);
    }
    setUser(null);
    setTab('Dashboard');
    setLocalPendingPlan(null);
  }

  if (!isHydrated || authLoading) {
    return (
      <SafeAreaView style={shellStyles.safe}>
        <StatusBar style="light" />
        <View style={shellStyles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={shellStyles.loadingText}>Loading Freeman</Text>
        </View>
      </SafeAreaView>
    );
  }

  // SEQUENCE 2: Onboarding (if guest hasn't done it yet)
  if (!user && !localOnboardingCompleted && !localPendingPlan) {
    return (
      <OnboardingScreenView
        username="Freeman"
        onComplete={(plan: OnboardingPlan) => {
          setLocalPendingPlan(plan);
          setLocalOnboardingCompleted(true);
        }}
      />
    );
  }

  // SEQUENCE 1: Auth (after onboarding or if returning user)
  if (!user) {
    return (
      <AuthScreenView
        onSignup={signup}
        onLogin={login}
        onGoogleSignIn={googleSignIn}
        onResendVerification={resendVerification}
      />
    );
  }

  // Ensure authenticated user finishes onboarding if they skipped guest flow
  if (!user.onboardingCompleted && !localOnboardingCompleted) {
    return (
      <OnboardingScreenView
        username={user.username}
        onComplete={async (plan: OnboardingPlan) => {
          const nextUser: User = {
            ...user,
            ...plan,
            onboardingCompleted: true,
          };
          await syncUserProfile(nextUser);
          setUser(nextUser);
          setLocalOnboardingCompleted(true);
        }}
      />
    );
  }

  // SEQUENCE 3: Main App

  const userCheckIns = checkIns.filter((item) => item.userId === user.id);
  const stats = calculateStats(userCheckIns);
  const rankTheme = getRankTheme(stats.currentStreak);

  function completeCheckIn(relapsed: boolean, note: string, trigger?: string) {
    const date = todayKey();
    const entry: CheckIn = {
      id: `${Date.now()}`,
      userId: user!.id,
      date,
      relapsed,
      note: note.trim(),
      trigger: trigger?.trim() || undefined,
    };
    setCheckIns((current) => [...current.filter((item) => !(item.userId === user!.id && item.date === date)), entry]);
    setTab('Dashboard');
  }

  async function resetStreak(note = 'Manual reset', trigger?: string) {
    completeCheckIn(true, note, trigger);
  }

  async function updateUserProfile(updates: Partial<User>) {
    if (!user) return;
    const nextUser = { ...user, ...updates };
    setUser(nextUser);
    await syncUserProfile(nextUser);
  }

  const contextValue: AppModel = {
    user,
    checkIns: userCheckIns,
    currentStreak: stats.currentStreak,
    longestStreak: stats.longestStreak,
    relapseCount: stats.relapseCount,
    disciplineScore: stats.disciplineScore,
    canFinishToday: true,
    streakFrozen: false,
    frozenStreak: 0,
    unfreezeCost: 0,
    unfreezeProgress: 0,
    canUnfreeze: false,
    rankTheme,
    completeCheckIn,
    reviseTodayCheckIn: completeCheckIn,
    resolvePendingCheckIn: (_date: string, relapsed: boolean, note: string, trigger?: string) => completeCheckIn(relapsed, note, trigger),
    resetStreak,
    unfreezeStreak: () => {},
    updateUserProfile,
    requestBrowserAccess: () => Promise.resolve(null),
    logout,
  };

  return (
    <View style={shellStyles.safe}>
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
        {tab === 'Assistant' ? <AssistantScreenView username={user.username} rankTheme={rankTheme} /> : null}
        {tab === 'Lessons' ? <LessonsScreenView lessons={lessons} rankTheme={rankTheme} /> : null}
        {tab === 'Panic' ? <PanicScreenView app={contextValue} goTo={setTab} panicMessages={panicMessages} distractionGames={distractionGames} /> : null}
        {tab === 'Sword' ? <TreeScreenView app={contextValue} /> : null}
        {tab === 'Profile' ? <ProfileScreenView app={contextValue} formatShortDate={formatShortDate} initialSettingsScreen={!user.contentBlockerGuideSeen ? 'contentBlockerAgreement' : null} /> : null}
      </View>
      <DailyCheckInPromptView
        app={contextValue}
        mode="start"
        visible={showCheckInPrompt && tab === 'Dashboard'}
        onDone={() => setShowCheckInPrompt(false)}
      />
      <PostOnboardingPromptsView
        app={contextValue}
        visible={tab === 'Dashboard' && !showCheckInPrompt}
        onDone={() => setPostOnboardingDone(true)}
        onAction={(action) => {
          if (action === 'blocker') {
            setTab('Profile');
          }
        }}
      />
      <BottomTabsView active={tab} onChange={setTab} rankTheme={rankTheme} />
    </View>
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
  appBody: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.text, fontSize: 16, fontWeight: '600', letterSpacing: 0 },
});
