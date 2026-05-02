import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, AppState, NativeModules, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AppModel } from './screenTypes';
import { colors, isSmall } from '../theme';

type ProfileTab = 'Settings' | 'Account' | 'Terms and condition' | 'Privacy';
type SettingsScreen = 'main' | 'contentBlockerAgreement' | 'contentBlocker';

const profileTabs: ProfileTab[] = ['Settings', 'Account', 'Terms and condition', 'Privacy'];
const contentBlocker = NativeModules.ContentBlocker as
    | {
      start: () => Promise<'started' | 'permission_required'>;
      stop: () => Promise<'stopped'>;
      isEnabled: () => Promise<boolean>;
      isRunning?: () => Promise<boolean>;
      hasAcceptedAgreement?: () => Promise<boolean>;
      setAgreementAccepted?: (accepted: boolean) => Promise<boolean>;
      openVpnSettings: () => Promise<'opened'>;
    }
  | undefined;

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.profileRow}>
      <Text style={styles.profileLabel}>{label}</Text>
      <Text style={styles.profileValue}>{value}</Text>
    </View>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function ProfileScreen({ app, formatShortDate }: { app: AppModel; formatShortDate: (date: string) => string }) {
  const [activeTab, setActiveTab] = useState<ProfileTab | null>(null);
  const [settingsScreen, setSettingsScreen] = useState<SettingsScreen>('main');
  const [contentBlockerEnabled, setContentBlockerEnabled] = useState(false);
  const [contentBlockerAgreementAccepted, setContentBlockerAgreementAccepted] = useState(false);
  const logoutScale = useRef(new Animated.Value(1)).current;
  const contentBlockerRowScale = useRef(new Animated.Value(1)).current;
  const enableBlockerScale = useRef(new Animated.Value(1)).current;

  const refreshContentBlockerState = useCallback(async () => {
    if (Platform.OS !== 'android' || !contentBlocker) return;

    try {
      const [isRunning, isEnabled] = await Promise.all([
        contentBlocker.isRunning?.().catch(() => false),
        contentBlocker.isEnabled().catch(() => false),
      ]);
      setContentBlockerEnabled(Boolean(isRunning ?? isEnabled));
    } catch {
      setContentBlockerEnabled(false);
    }

    contentBlocker
      .hasAcceptedAgreement?.()
      .then(setContentBlockerAgreementAccepted)
      .catch(() => setContentBlockerAgreementAccepted(false));
  }, []);

  useEffect(() => {
    refreshContentBlockerState();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshContentBlockerState();
      }
    });

    return () => subscription.remove();
  }, [refreshContentBlockerState]);

  function animateLogout(toValue: number) {
    Animated.spring(logoutScale, {
      toValue,
      friction: 5,
      tension: 180,
      useNativeDriver: true,
    }).start();
  }

  function animateContentBlockerRow(toValue: number) {
    Animated.spring(contentBlockerRowScale, {
      toValue,
      friction: 5,
      tension: 180,
      useNativeDriver: true,
    }).start();
  }

  function animateEnableBlocker(toValue: number) {
    Animated.spring(enableBlockerScale, {
      toValue,
      friction: 5,
      tension: 180,
      useNativeDriver: true,
    }).start();
  }

  async function toggleContentBlocker() {
    if (Platform.OS !== 'android' || !contentBlocker) {
      Alert.alert('Android build required', 'The content blocker needs the native Android build. It cannot run inside Expo Go.');
      return;
    }

    try {
      if (contentBlockerEnabled) {
        await contentBlocker.stop();
        await refreshContentBlockerState();
        return;
      }

      const result = await contentBlocker.start();
      if (result === 'permission_required') {
        setContentBlockerEnabled(false);
        Alert.alert('VPN permission required', 'Allow Freeman to create a VPN connection, then tap Enable blocker again.');
        return;
      }

      await refreshContentBlockerState();
    } catch {
      setContentBlockerEnabled(false);
      Alert.alert('Could not start blocker', 'Try again, or open Android VPN settings to check Freeman permission.');
    }
  }

  async function openVpnLockdownSettings() {
    if (Platform.OS !== 'android' || !contentBlocker) {
      Alert.alert('Android build required', 'VPN settings require the native Android build.');
      return;
    }

    Alert.alert(
      'VPN settings',
      'Enable Always-on VPN for Freeman if you want Android to restart it automatically. You can also enable “Block connections without VPN” after confirming the blocker works on your phone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open settings',
          onPress: async () => {
            try {
              await contentBlocker.openVpnSettings();
            } catch {
              Alert.alert('VPN settings unavailable', 'Open Android Settings and search for VPN.');
            }
          },
        },
      ],
    );
  }

  async function acceptContentBlockerAgreement() {
    try {
      await contentBlocker?.setAgreementAccepted?.(true);
    } finally {
      setContentBlockerAgreementAccepted(true);
      setSettingsScreen('contentBlocker');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
      {!activeTab ? (
        <>
          <Text style={styles.title}>Profile</Text>

          <View style={styles.menuList}>
            {profileTabs.map((tab) => (
              <Pressable key={tab} onPress={() => setActiveTab(tab)} style={styles.menuItem}>
                <Text style={styles.menuText}>{tab}</Text>
                <Text style={styles.menuArrow}>&gt;</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.detailHeader}>
          <Pressable
            onPress={() => {
              if (activeTab === 'Settings' && settingsScreen !== 'main') {
                setSettingsScreen('main');
                return;
              }
              setActiveTab(null);
            }}
            style={styles.inlineBackButton}
          >
            <Text style={styles.backText}>{'<'}</Text>
          </Pressable>
          <Text style={styles.detailTitle}>{settingsScreen === 'contentBlockerAgreement' ? 'Agreement' : settingsScreen === 'contentBlocker' ? 'Content blocker' : activeTab}</Text>
        </View>
      )}

      {activeTab === 'Settings' && settingsScreen === 'main' ? (
        <>
          <SectionCard title="Settings">
            <ProfileRow label="Daily check-in" value="Enabled" />
            <ProfileRow label="Theme" value="Dark" />
            <ProfileRow label="Panic tools" value="Enabled" />
            <Pressable
              onPress={() => setSettingsScreen(contentBlockerAgreementAccepted ? 'contentBlocker' : 'contentBlockerAgreement')}
              onPressIn={() => animateContentBlockerRow(0.97)}
              onPressOut={() => animateContentBlockerRow(1)}
            >
              <Animated.View style={[styles.settingsLink, { transform: [{ scale: contentBlockerRowScale }] }]}>
                <View style={styles.settingsLinkTextWrap}>
                  <Text style={styles.settingsLinkText}>Content blocker</Text>
                  <Text style={styles.settingsLinkHint}>Open protection settings</Text>
                </View>
                <View style={styles.settingsLinkRight}>
                  <Text style={[styles.settingsLinkStatus, contentBlockerEnabled && styles.settingsLinkStatusOn]}>{contentBlockerEnabled ? 'On' : 'Off'}</Text>
                </View>
              </Animated.View>
            </Pressable>
          </SectionCard>
        </>
      ) : null}

      {activeTab === 'Settings' && settingsScreen === 'contentBlockerAgreement' ? (
        <View style={styles.agreementCard}>
          <Text style={styles.agreementTitle}>Before using Content blocker</Text>
          <Text style={styles.agreementBody}>
            Freeman uses Android VPN protection to filter blocked content and forward normal internet traffic through a local tunnel on this device.
          </Text>
          <Text style={styles.agreementBody}>
            Stronger Android VPN settings can affect internet access if the blocker is stopped, so test the blocker first before turning on full lockdown.
          </Text>
          <Text style={styles.agreementNotice}>Only continue if you understand this and agree to use the blocker responsibly.</Text>
          <Pressable onPress={acceptContentBlockerAgreement} style={styles.agreementButton}>
            <Text style={styles.agreementButtonText}>I understand and agree</Text>
          </Pressable>
          <Pressable onPress={() => setSettingsScreen('main')} style={styles.agreementCancelButton}>
            <Text style={styles.agreementCancelText}>Not now</Text>
          </Pressable>
        </View>
      ) : null}

      {activeTab === 'Settings' && settingsScreen === 'contentBlocker' ? (
        <>
          <Pressable
            onPress={toggleContentBlocker}
            onPressIn={() => animateEnableBlocker(0.97)}
            onPressOut={() => animateEnableBlocker(1)}
          >
            <Animated.View style={[styles.contentBlockerRow, { transform: [{ scale: enableBlockerScale }] }]}>
              <View style={styles.contentBlockerTextWrap}>
                <Text style={styles.contentBlockerRowTitle}>Enable blocker</Text>
                <Text style={styles.contentBlockerRowHint}>Filter blocked content using Android VPN</Text>
              </View>
              <View style={[styles.contentBlockerToggle, contentBlockerEnabled && styles.contentBlockerToggleOn]}>
                <Text style={[styles.contentBlockerToggleText, contentBlockerEnabled && styles.contentBlockerToggleTextOn]}>
                  {contentBlockerEnabled ? 'On' : 'Off'}
                </Text>
              </View>
            </Animated.View>
          </Pressable>
          <View style={styles.lockdownCard}>
            <Text style={styles.lockdownTitle}>VPN settings</Text>
            <Text style={styles.lockdownBody}>Always-on VPN can restart Freeman automatically. Lockdown blocks internet if Freeman is off.</Text>
            <View style={styles.lockdownSteps}>
              <Text style={styles.lockdownStep}>1. Choose Freeman in VPN settings</Text>
              <Text style={styles.lockdownStep}>2. Enable Always-on VPN</Text>
              <Text style={styles.lockdownStep}>3. Enable Block connections without VPN after testing</Text>
            </View>
            <Pressable onPress={openVpnLockdownSettings} style={styles.lockdownButton}>
              <Text style={styles.lockdownButtonText}>Open VPN settings</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {activeTab === 'Account' ? (
        <>
          <SectionCard title="Account">
            <ProfileRow label="Username" value={app.user.username} />
            <ProfileRow label="Email" value={app.user.email} />
            <ProfileRow label="Start date" value={formatShortDate(app.user.startDate)} />
            <ProfileRow label="Current streak" value={`${app.currentStreak} days`} />
            <ProfileRow label="Longest streak" value={`${app.longestStreak} days`} />
            <ProfileRow label="Relapses" value={`${app.relapseCount}`} />
          </SectionCard>

          <Pressable onPress={app.logout} onPressIn={() => animateLogout(0.96)} onPressOut={() => animateLogout(1)}>
            <Animated.View style={[styles.logoutButton, { transform: [{ scale: logoutScale }] }]}>
              <Text style={styles.logoutText}>Log out</Text>
            </Animated.View>
          </Pressable>
        </>
      ) : null}

      {activeTab === 'Terms and condition' ? (
        <SectionCard title="Terms and condition">
          <Text style={styles.bodyText}>
            Freeman is a personal recovery tracker. It does not replace professional medical, mental health, or emergency support. You are responsible for how you use the app and for keeping your account details accurate.
          </Text>
          <Text style={styles.bodyText}>
            Do not use the app for illegal activity, harassment, or storing sensitive information that you would not want saved locally on this device.
          </Text>
        </SectionCard>
      ) : null}

      {activeTab === 'Privacy' ? (
        <SectionCard title="Privacy">
          <Text style={styles.bodyText}>
            This MVP stores your profile and check-ins locally in the app session. No cloud sync, analytics, or third-party sharing is active in this build.
          </Text>
          <Text style={styles.bodyText}>
            If cloud accounts are added later, authentication, encryption, and clear data deletion controls should be implemented before release.
          </Text>
        </SectionCard>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 110 },
  title: { color: colors.text, fontSize: isSmall ? 32 : 38, lineHeight: isSmall ? 38 : 44, fontWeight: '900', letterSpacing: -1.2, marginBottom: 18 },
  menuList: { gap: 12 },
  menuItem: {
    minHeight: 68,
    borderRadius: 18,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  menuText: { color: colors.text, fontSize: 17, fontWeight: '900' },
  menuArrow: { color: colors.green, fontSize: 30, lineHeight: 32, fontWeight: '900' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  inlineBackButton: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  backText: { color: colors.green, fontSize: 27, lineHeight: 29, fontWeight: '900' },
  detailTitle: { color: colors.text, fontSize: isSmall ? 32 : 38, lineHeight: isSmall ? 38 : 44, fontWeight: '900', letterSpacing: -1.2, flex: 1 },
  card: { borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 16 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginBottom: 12 },
  profileRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  profileLabel: { color: colors.muted, fontSize: 15, fontWeight: '700', flex: 1 },
  profileValue: { color: colors.text, fontSize: 15, fontWeight: '900', textAlign: 'right', flex: 1 },
  settingsLink: {
    minHeight: 76,
    borderRadius: 18,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: '#275B47',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    marginTop: 14,
  },
  settingsLinkTextWrap: { flex: 1 },
  settingsLinkText: { color: colors.text, fontSize: 16, fontWeight: '900' },
  settingsLinkHint: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 4 },
  settingsLinkRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingsLinkStatus: {
    minWidth: 44,
    borderRadius: 999,
    backgroundColor: '#3A1016',
    color: '#E7828E',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    paddingVertical: 5,
    paddingHorizontal: 9,
    overflow: 'hidden',
  },
  settingsLinkStatusOn: { backgroundColor: '#143326', color: colors.green },
  bodyText: { color: colors.muted, fontSize: 15, lineHeight: 23, marginBottom: 12 },
  agreementCard: {
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 16,
  },
  agreementTitle: { color: colors.text, fontSize: 21, lineHeight: 27, fontWeight: '900', marginBottom: 10 },
  agreementBody: { color: colors.muted, fontSize: 14, lineHeight: 22, fontWeight: '700', marginBottom: 12 },
  agreementNotice: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '900',
    backgroundColor: '#1B1512',
    borderWidth: 1,
    borderColor: '#4D3025',
    borderRadius: 14,
    padding: 12,
    marginTop: 2,
    marginBottom: 16,
  },
  agreementButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#143326',
    borderWidth: 1,
    borderColor: '#2E6A52',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  agreementButtonText: { color: colors.green, fontSize: 15, fontWeight: '900', textAlign: 'center' },
  agreementCancelButton: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  agreementCancelText: { color: colors.muted, fontSize: 14, fontWeight: '900', textAlign: 'center' },
  contentBlockerRow: {
    minHeight: 82,
    borderRadius: 18,
    backgroundColor: colors.raised,
    borderWidth: 2,
    borderTopColor: '#33334E',
    borderLeftColor: '#282843',
    borderRightColor: '#111120',
    borderBottomColor: '#080811',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 9,
    elevation: 4,
  },
  contentBlockerTextWrap: { flex: 1 },
  contentBlockerRowTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  contentBlockerRowHint: { color: colors.muted, fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 4 },
  contentBlockerToggle: {
    minWidth: 66,
    minHeight: 38,
    borderRadius: 999,
    backgroundColor: '#3A1016',
    borderWidth: 2,
    borderTopColor: '#7A2630',
    borderLeftColor: '#641C26',
    borderRightColor: '#24090D',
    borderBottomColor: '#160508',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  contentBlockerToggleOn: {
    backgroundColor: '#143326',
    borderTopColor: '#3B7D62',
    borderLeftColor: '#2E6A52',
    borderRightColor: '#0A2017',
    borderBottomColor: '#06140F',
  },
  contentBlockerToggleText: { color: '#E7828E', fontSize: 13, fontWeight: '900' },
  contentBlockerToggleTextOn: { color: colors.green },
  lockdownCard: {
    borderRadius: 20,
    backgroundColor: '#101F19',
    borderWidth: 1,
    borderColor: '#275B47',
    padding: 16,
    marginTop: 18,
    marginBottom: 16,
  },
  lockdownTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 8 },
  lockdownBody: { color: colors.muted, fontSize: 14, lineHeight: 21, fontWeight: '700', marginBottom: 12 },
  lockdownSteps: { gap: 8, marginBottom: 14 },
  lockdownStep: { color: colors.text, fontSize: 13, lineHeight: 19, fontWeight: '800' },
  lockdownButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  lockdownButtonText: { color: colors.bg, fontSize: 14, fontWeight: '900', textAlign: 'center' },
  logoutButton: {
    minHeight: 62,
    borderRadius: 20,
    backgroundColor: '#252542',
    borderWidth: 3,
    borderTopColor: '#565680',
    borderLeftColor: '#44446E',
    borderRightColor: '#17172B',
    borderBottomColor: '#090914',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 9,
    elevation: 4,
  },
  logoutText: { color: colors.text, fontSize: 16, fontWeight: '900', textAlign: 'center' },
});
