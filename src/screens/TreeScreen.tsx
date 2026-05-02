import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AppModel } from './screenTypes';
import { colors, isSmall } from '../theme';

const MAX_STREAK = 90;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function getSwordPhase(streak: number) {
  if (streak <= 0) return 'Broken';
  if (streak <= 25) return 'Forging';
  if (streak <= 55) return 'Tempered';
  if (streak < MAX_STREAK) return 'Honed';
  return 'Legendary';
}

function getStreakLevel(streak: number) {
  if (streak <= 3) return 'Noob';
  if (streak <= 10) return 'Beginner';
  if (streak <= 21) return 'Amateur';
  if (streak <= 35) return 'Disciplined';
  if (streak <= 55) return 'Warrior';
  if (streak <= 75) return 'Elite';
  if (streak < MAX_STREAK) return 'Master';
  return 'Legend';
}

export function TreeScreen({ app }: { app: AppModel }) {
  const initialProgress = clamp(app.currentStreak / MAX_STREAK, 0, 1);
  const progress = useRef(new Animated.Value(initialProgress)).current;
  const pulse = useRef(new Animated.Value(0.42)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const burstOpacity = useRef(new Animated.Value(0)).current;
  const burstScale = useRef(new Animated.Value(0.76)).current;
  const prevStreak = useRef(app.currentStreak);

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.9, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0.42, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ]),
    );

    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -4, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(bob, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ]),
    );

    pulseLoop.start();
    bobLoop.start();

    return () => {
      pulseLoop.stop();
      bobLoop.stop();
    };
  }, [bob, pulse]);

  useEffect(() => {
    const target = clamp(app.currentStreak / MAX_STREAK, 0, 1);
    const previous = prevStreak.current;
    const gained = app.currentStreak > previous;
    const relapsed = app.currentStreak < previous;

    Animated.timing(progress, {
      toValue: target,
      duration: 620,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    if (gained) {
      burstOpacity.setValue(0.66);
      burstScale.setValue(0.76);
      Animated.parallel([
        Animated.timing(burstOpacity, { toValue: 0, duration: 680, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(burstScale, { toValue: 1.38, duration: 680, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]).start();
    }

    if (relapsed) {
      flashOpacity.setValue(0.52);
      Animated.parallel([
        Animated.timing(flashOpacity, { toValue: 0, duration: 560, easing: Easing.out(Easing.quad), useNativeDriver: false }),
        Animated.sequence([
          Animated.timing(shakeX, { toValue: -8, duration: 52, useNativeDriver: false }),
          Animated.timing(shakeX, { toValue: 8, duration: 72, useNativeDriver: false }),
          Animated.timing(shakeX, { toValue: -5, duration: 60, useNativeDriver: false }),
          Animated.timing(shakeX, { toValue: 0, duration: 60, useNativeDriver: false }),
        ]),
      ]).start();
    }

    prevStreak.current = app.currentStreak;
  }, [app.currentStreak, burstOpacity, burstScale, flashOpacity, progress, shakeX]);

  const phase = getSwordPhase(app.currentStreak);
  const level = getStreakLevel(app.currentStreak);
  const ratio = clamp(app.currentStreak / MAX_STREAK, 0, 1);
  const percent = Math.round(ratio * 100);

  const chamberFill = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 280] });
  const auraOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.92] });
  const bladeShine = progress.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.9] });
  const bladeGlow = progress.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.68] });
  const bladeShorten = progress.interpolate({ inputRange: [0, 1], outputRange: [42, 0] });
  const tipHalfBase = progress.interpolate({ inputRange: [0, 1], outputRange: [22, 12] });
  const tipHeight = progress.interpolate({ inputRange: [0, 1], outputRange: [12, 28] });

  return (
    <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Sword meter</Text>
      <Text style={styles.subtitle}>Clean days forge the blade. Relapses chip its edge.</Text>

      <View style={styles.card}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.dayLabel}>Day {app.currentStreak} / {MAX_STREAK}</Text>
            <Text style={styles.phaseLabel}>{phase} phase</Text>
          </View>
          <Text style={styles.percentLabel}>{percent}%</Text>
        </View>

        <View style={styles.chamber}>
          <Animated.View style={[styles.chamberFill, { height: chamberFill, opacity: auraOpacity }]} />
          <Animated.View style={[styles.chamberPulse, { opacity: pulse }]} />
          <Animated.View style={[styles.impactFlash, { opacity: flashOpacity }]} />
          <Animated.View style={[styles.burstRing, { opacity: burstOpacity, transform: [{ scale: burstScale }] }]} />

          <Animated.View style={[styles.swordWrap, { transform: [{ translateX: shakeX }, { translateY: bob }] }]}>
            <Animated.View style={[styles.bladeGroup, { marginTop: bladeShorten, opacity: bladeGlow }]}>
              <Animated.View style={[styles.bladeTip, { borderLeftWidth: tipHalfBase, borderRightWidth: tipHalfBase, borderBottomWidth: tipHeight }]} />
              <Animated.View style={styles.blade}>
                <Animated.View style={[styles.bladeShine, { opacity: bladeShine }]} />
                <View style={styles.bladeFuller} />
                <View style={styles.bladeEdge} />
              </Animated.View>
            </Animated.View>
            <View style={styles.guard}>
              <View style={[styles.quillon, styles.quillonLeft]} />
              <View style={styles.guardCore} />
              <View style={[styles.quillon, styles.quillonRight]} />
            </View>
            <View style={styles.grip}>
              <View style={styles.gripCore} />
              <View style={[styles.gripBand, styles.gripBandOne]} />
              <View style={[styles.gripBand, styles.gripBandTwo]} />
              <View style={[styles.gripBand, styles.gripBandThree]} />
              <View style={[styles.gripBand, styles.gripBandFour]} />
            </View>
            <View style={styles.pommel}>
              <View style={[styles.pommelLobe, styles.pommelTopLeft]} />
              <View style={[styles.pommelLobe, styles.pommelTopMid]} />
              <View style={[styles.pommelLobe, styles.pommelTopRight]} />
              <View style={[styles.pommelLobe, styles.pommelBottomLeft]} />
              <View style={[styles.pommelLobe, styles.pommelBottomRight]} />
            </View>
          </Animated.View>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaCard}>
          <Text style={styles.metaValue}>{app.currentStreak}</Text>
          <Text style={styles.metaLabel}>current streak</Text>
        </View>
        <View style={styles.metaCard}>
          <Text style={styles.metaValue}>{app.longestStreak}</Text>
          <Text style={styles.metaLabel}>best streak</Text>
        </View>
      </View>

      <View style={styles.tipCard}>
        <Text style={styles.levelKicker}>Level</Text>
        <Text style={styles.levelValue}>{level}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 110 },
  title: { color: colors.text, fontSize: isSmall ? 31 : 37, lineHeight: isSmall ? 37 : 43, fontWeight: '900', letterSpacing: -1.1 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 18 },
  card: { borderRadius: 30, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 18 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  dayLabel: { color: colors.text, fontSize: 24, fontWeight: '900' },
  phaseLabel: { color: colors.muted, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.3, marginTop: 4 },
  percentLabel: { color: colors.green, fontSize: 30, fontWeight: '900' },
  chamber: {
    height: 312,
    borderRadius: 26,
    backgroundColor: '#0A0A16',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  chamberFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(183,197,221,0.24)',
  },
  chamberPulse: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    bottom: 56,
    backgroundColor: 'rgba(185,198,223,0.18)',
  },
  impactFlash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,71,87,0.22)' },
  burstRing: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 3,
    borderColor: 'rgba(255,184,0,0.72)',
    bottom: 46,
  },
  swordWrap: { width: 148, height: 242, alignItems: 'center', justifyContent: 'flex-end', marginBottom: 22 },
  bladeGroup: { alignItems: 'center', marginBottom: 0 },
  bladeTip: {
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#E7EDF6',
    marginBottom: -1,
  },
  blade: {
    width: 38,
    height: 124,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: '#D8E1EC',
    borderWidth: 1.4,
    borderColor: '#97A4B6',
    shadowColor: '#E5EEFB',
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  bladeShine: { position: 'absolute', left: 4, top: 8, bottom: 8, width: 7, borderRadius: 8, backgroundColor: 'rgba(248,251,255,0.9)' },
  bladeFuller: { position: 'absolute', left: 15, right: 15, top: 10, bottom: 18, borderRadius: 8, backgroundColor: 'rgba(129,143,164,0.52)' },
  bladeEdge: { position: 'absolute', right: 3, top: 0, bottom: 0, width: 3, backgroundColor: 'rgba(95,109,127,0.9)' },
  guard: {
    marginTop: 3,
    width: 106,
    height: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardCore: {
    width: 68,
    height: 11,
    borderRadius: 8,
    backgroundColor: '#BAC6D8',
    borderWidth: 1,
    borderColor: '#EBF2FC',
  },
  quillon: {
    width: 21,
    height: 8,
    borderRadius: 8,
    backgroundColor: '#AAB8CC',
    borderWidth: 1,
    borderColor: '#E1EAF7',
    marginHorizontal: 2,
  },
  quillonLeft: { transform: [{ rotate: '-20deg' }] },
  quillonRight: { transform: [{ rotate: '20deg' }] },
  grip: {
    marginTop: 0,
    width: 24,
    height: 50,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: '#2E2A26',
    borderWidth: 1,
    borderColor: '#4D453D',
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  gripCore: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#3A332C' },
  gripBand: {
    position: 'absolute',
    left: -3,
    right: -3,
    height: 8,
    backgroundColor: '#C5CDD9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(242,247,255,0.82)',
  },
  gripBandOne: { top: 6 },
  gripBandTwo: { top: 17 },
  gripBandThree: { top: 28 },
  gripBandFour: { top: 39 },
  pommel: {
    marginTop: 3,
    width: 32,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pommelLobe: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#C0CADB',
    borderWidth: 1,
    borderColor: '#ECF2FA',
  },
  pommelTopLeft: { left: 2, top: 4 },
  pommelTopMid: { left: 11, top: 0 },
  pommelTopRight: { right: 2, top: 4 },
  pommelBottomLeft: { left: 8, bottom: 2 },
  pommelBottomRight: { right: 8, bottom: 2 },
  metaRow: { marginTop: 14, flexDirection: 'row', gap: 12 },
  metaCard: {
    flex: 1,
    minHeight: 96,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaValue: { color: colors.text, fontSize: 36, lineHeight: 42, fontWeight: '900' },
  metaLabel: { color: colors.muted, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.1, marginTop: 6 },
  tipCard: { marginTop: 12, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, paddingVertical: 14 },
  levelKicker: { color: colors.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, textAlign: 'center' },
  levelValue: { color: colors.gold, fontSize: 28, lineHeight: 34, fontWeight: '900', textAlign: 'center', marginTop: 4 },
});
