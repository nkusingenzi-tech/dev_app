import React, { useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AppModel, CheckIn, TabKey, WeeklyDay } from './screenTypes';
import { colors, isSmall, width } from '../theme';

type DashboardScreenProps = {
  app: AppModel;
  goTo: (tab: TabKey) => void;
  lastSevenDays: (checkIns: CheckIn[]) => WeeklyDay[];
  topTrigger: (checkIns: CheckIn[]) => string;
  formatShortDate: (date: string) => string;
};

function StatCard({ label, value, tone }: { label: string; value: string; tone: 'red' | 'green' | 'blue' | 'gold' }) {
  const color = tone === 'red' ? colors.red : tone === 'green' ? colors.green : tone === 'blue' ? colors.blue : colors.gold;
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function DashboardScreen({ app, goTo, lastSevenDays, topTrigger, formatShortDate }: DashboardScreenProps) {
  const weekly = lastSevenDays(app.checkIns);
  const panicScale = useRef(new Animated.Value(1)).current;

  function animatePanic(toValue: number) {
    Animated.spring(panicScale, {
      toValue,
      friction: 5,
      tension: 180,
      useNativeDriver: true,
    }).start();
  }

  return (
    <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.title}>Today, {app.user.username}</Text>
        </View>
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreValue}>{app.disciplineScore}</Text>
          <Text style={styles.scoreLabel}>score</Text>
        </View>
      </View>

      <View style={styles.streakHero}>
        <Text style={styles.streakNumber}>{app.currentStreak}</Text>
        <Text style={styles.streakLabel}>days clean</Text>
        <Text style={styles.streakCopy}>Longest streak: {app.longestStreak} days</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => goTo('Panic')} onPressIn={() => animatePanic(0.94)} onPressOut={() => animatePanic(1)}>
          <Animated.View style={[styles.panicButton, { transform: [{ scale: panicScale }] }]}>
            <View style={styles.panicOuterRing}>
              <View style={styles.panicInnerRing}>
                <View style={styles.panicButtonHighlight} />
                <View style={styles.panicButtonCap}>
                  <Text style={styles.panicButtonText}>I feel an urge</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        </Pressable>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Relapses" value={`${app.relapseCount}`} tone="red" />
        <StatCard label="Clean week" value={`${weekly.filter((item) => item.status === 'clean').length}/7`} tone="green" />
        <StatCard label="Check-ins" value={`${app.checkIns.length}`} tone="blue" />
        <StatCard label="Start date" value={formatShortDate(app.user.startDate)} tone="gold" />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Weekly progress</Text>
        <View style={styles.weekRow}>
          {weekly.map((day) => (
            <View key={day.date} style={styles.weekItem}>
              <View style={[styles.weekDot, day.status === 'clean' && styles.weekDotClean, day.status === 'relapse' && styles.weekDotRelapse]} />
              <Text style={styles.weekText}>{day.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Trigger pattern</Text>
        <Text style={styles.bodyText}>{topTrigger(app.checkIns) || 'No trigger logged yet. Add one during check-in after an urge or relapse.'}</Text>
      </View>
    </ScrollView>
  );
}

const panicSize = Math.min(width - 120, 230);

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 110 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 },
  title: { color: colors.text, fontSize: isSmall ? 32 : 38, lineHeight: isSmall ? 38 : 44, fontWeight: '900', letterSpacing: -1.2 },
  scoreBadge: { minWidth: 72, borderRadius: 18, backgroundColor: 'rgba(0,229,160,0.12)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.32)', padding: 10, alignItems: 'center' },
  scoreValue: { color: colors.green, fontSize: 24, fontWeight: '900' },
  scoreLabel: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  streakHero: { minHeight: 240, borderRadius: 30, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 22, marginBottom: 16 },
  streakNumber: { color: colors.text, fontSize: 92, lineHeight: 100, fontWeight: '900' },
  streakLabel: { color: colors.green, fontSize: 22, fontWeight: '900' },
  streakCopy: { color: colors.muted, fontSize: 15, marginTop: 10 },
  actionRow: { gap: 12, marginBottom: 16, alignItems: 'center' },
  panicButton: {
    width: panicSize,
    height: panicSize,
    borderRadius: panicSize / 2,
    backgroundColor: '#26050B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#140206',
    padding: 10,
    shadowColor: colors.red,
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 12,
  },
  panicOuterRing: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderWidth: 10,
    borderTopColor: '#FF9AA4',
    borderLeftColor: '#FF6A78',
    borderRightColor: '#6D0712',
    borderBottomColor: '#3A0209',
    backgroundColor: '#6A0713',
    padding: 10,
  },
  panicInnerRing: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 5,
    borderTopColor: '#FFBAC1',
    borderLeftColor: '#FF7E8A',
    borderRightColor: '#9E101F',
    borderBottomColor: '#640712',
    backgroundColor: '#A61121',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    overflow: 'hidden',
  },
  panicButtonHighlight: {
    position: 'absolute',
    top: 18,
    width: '58%',
    height: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.34)',
    opacity: 0.75,
  },
  panicButtonCap: {
    width: '88%',
    height: '88%',
    borderRadius: 999,
    backgroundColor: '#E51F34',
    borderWidth: 3,
    borderTopColor: '#FFAFB7',
    borderLeftColor: '#FF7D8A',
    borderRightColor: '#B71325',
    borderBottomColor: '#8F0C1A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  panicButtonText: { color: colors.text, fontSize: isSmall ? 22 : 25, lineHeight: isSmall ? 27 : 30, fontWeight: '900', textAlign: 'center', textTransform: 'uppercase' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: { width: (width - 48) / 2, minHeight: 112, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 16, justifyContent: 'center' },
  statValue: { fontSize: isSmall ? 28 : 34, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 14, fontWeight: '700', marginTop: 8 },
  card: { borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 16 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginBottom: 12 },
  bodyText: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  weekItem: { flex: 1, alignItems: 'center', gap: 8 },
  weekDot: { width: '100%', height: 44, borderRadius: 14, backgroundColor: colors.raised, borderWidth: 1, borderColor: colors.border },
  weekDotClean: { backgroundColor: colors.green },
  weekDotRelapse: { backgroundColor: colors.red },
  weekText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
});
