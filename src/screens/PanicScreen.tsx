import React, { useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PanicGamesScreen } from './PanicGamesScreen';
import type { AppModel, TabKey } from './screenTypes';
import { colors, isSmall } from '../theme';

type BreathPhase = 'ready' | 'inhale' | 'hold' | 'exhale';
const BREATH_CYCLE_COUNT = 5;

type DistractionGame = {
  title: string;
  type: 'math' | 'scramble' | 'memory' | 'tap';
  subtitle: string;
  icon: string;
};

type PanicScreenProps = {
  app: AppModel;
  goTo: (tab: TabKey) => void;
  panicMessages: string[];
  distractionGames: DistractionGame[];
};

export function PanicScreen({ app, goTo, panicMessages, distractionGames }: PanicScreenProps) {
  const breathScale = useRef(new Animated.Value(0)).current;
  const [messageIndex] = useState(0);
  const [breathPhase, setBreathPhase] = useState<BreathPhase>('ready');
  const [isBreathing, setIsBreathing] = useState(false);
  const [view, setView] = useState<'emergency' | 'games'>('emergency');
  const gamesButtonScale = useRef(new Animated.Value(1)).current;
  const goodButtonScale = useRef(new Animated.Value(1)).current;
  const relapseButtonScale = useRef(new Animated.Value(1)).current;
  const breathTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  React.useEffect(() => {
    return () => {
      breathTimers.current.forEach(clearTimeout);
      breathScale.stopAnimation();
    };
  }, [breathScale]);

  function animateButton(scale: Animated.Value, toValue: number) {
    Animated.spring(scale, {
      toValue,
      friction: 5,
      tension: 190,
      useNativeDriver: true,
    }).start();
  }

  function startBreathing() {
    if (isBreathing) return;
    breathTimers.current.forEach(clearTimeout);
    breathTimers.current = [];
    setIsBreathing(true);
    setBreathPhase('inhale');
    breathScale.setValue(0);

    const animationSteps = Array.from({ length: BREATH_CYCLE_COUNT }).flatMap(() => [
      Animated.timing(breathScale, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breathScale, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(breathScale, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]);

    Animated.sequence(animationSteps).start(({ finished }) => {
      if (!finished) return;
      setBreathPhase('ready');
      setIsBreathing(false);
    });

    breathTimers.current = Array.from({ length: BREATH_CYCLE_COUNT }).flatMap((_, index) => {
      const offset = index * 14000;
      return [
        setTimeout(() => {
          setBreathPhase('inhale');
        }, offset),
        setTimeout(() => setBreathPhase('hold'), offset + 4000),
        setTimeout(() => setBreathPhase('exhale'), offset + 8000),
      ];
    });
  }

  const breathLabel = breathPhase === 'ready' ? 'Start' : breathPhase === 'inhale' ? 'Inhale' : breathPhase === 'hold' ? 'Hold' : 'Exhale';
  const breathInstruction = breathPhase === 'ready' ? 'breathing' : breathPhase === 'exhale' ? '6 seconds' : '4 seconds';

  return view === 'games' ? (
    <PanicGamesScreen onBack={() => setView('emergency')} distractionGames={distractionGames} />
  ) : (
    <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Urge emergency</Text>
      <Text style={styles.subtitle}>Do this before you make any decision.</Text>

      <View style={styles.panicCard}>
        <Pressable onPress={startBreathing} disabled={isBreathing}>
          <Animated.View style={[styles.breathCircle, styles.breathCircleButton, { transform: [{ scale: breathScale.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1.18] }) }] }]}>
            <Text style={styles.breathMain}>{breathLabel}</Text>
            <Text style={styles.breathSub}>{breathInstruction}</Text>
          </Animated.View>
        </Pressable>
        <Text style={styles.motivationText}>{panicMessages[messageIndex]}</Text>
      </View>

      <Pressable onPress={() => setView('games')} onPressIn={() => animateButton(gamesButtonScale, 0.95)} onPressOut={() => animateButton(gamesButtonScale, 1)}>
        <Animated.View style={[styles.gamesButton, { transform: [{ scale: gamesButtonScale }] }]}>
          <View style={styles.gamesButtonFace}>
            <View style={styles.gamesButtonCopy}>
              <Text style={styles.gamesButtonKicker}>Distraction games</Text>
              <Text style={styles.gamesButtonText}>Start challenges</Text>
            </View>
          </View>
        </Animated.View>
      </Pressable>

      <Pressable
        onPress={() => app.resetStreak('Relapse logged from panic flow', 'urge')}
        onPressIn={() => animateButton(relapseButtonScale, 0.96)}
        onPressOut={() => animateButton(relapseButtonScale, 1)}
      >
        <Animated.View style={[styles.relapseButton, { transform: [{ scale: relapseButtonScale }] }]}>
          <Text style={styles.relapseText}>I relapsed - reset streak</Text>
        </Animated.View>
      </Pressable>
      <Pressable onPress={() => goTo('Dashboard')} onPressIn={() => animateButton(goodButtonScale, 0.96)} onPressOut={() => animateButton(goodButtonScale, 1)}>
        <Animated.View style={[styles.goodButton, { transform: [{ scale: goodButtonScale }] }]}>
          <Text style={styles.goodText}>I'm good now</Text>
        </Animated.View>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 110 },
  title: { color: colors.text, fontSize: isSmall ? 32 : 38, lineHeight: isSmall ? 38 : 44, fontWeight: '900', letterSpacing: -1.2 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: 10, marginBottom: 20 },
  panicCard: { borderRadius: 30, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 22, alignItems: 'center', marginBottom: 16 },
  breathCircle: { width: 190, height: 190, borderRadius: 95, borderWidth: 13, borderColor: colors.green, alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
  breathCircleButton: {
    backgroundColor: 'rgba(0,229,160,0.05)',
    borderTopColor: '#7DFFD9',
    borderLeftColor: '#34F5BC',
    borderRightColor: '#079B72',
    borderBottomColor: '#03563F',
  },
  breathMain: { color: colors.text, fontSize: 34, fontWeight: '900' },
  breathSub: { color: colors.muted, fontSize: 14, fontWeight: '800', marginTop: 4 },
  motivationText: { color: colors.text, fontSize: 21, lineHeight: 29, fontWeight: '900', textAlign: 'center' },
  gamesButton: {
    minHeight: 88,
    borderRadius: 24,
    backgroundColor: '#034231',
    borderWidth: 3,
    borderTopColor: '#16A77B',
    borderLeftColor: '#0E8F6A',
    borderRightColor: '#026047',
    borderBottomColor: '#01291F',
    padding: 6,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 4,
    justifyContent: 'center',
  },
  gamesButtonFace: {
    flex: 1,
    minHeight: 74,
    borderRadius: 18,
    backgroundColor: colors.green,
    borderWidth: 2,
    borderTopColor: '#56E5B8',
    borderLeftColor: '#24C99A',
    borderRightColor: '#08AD7D',
    borderBottomColor: '#047B5B',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gamesButtonCopy: { alignItems: 'center', justifyContent: 'center' },
  gamesButtonKicker: { color: 'rgba(7,7,16,0.68)', fontSize: 11, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase', textAlign: 'center' },
  gamesButtonText: { color: colors.bg, fontSize: 20, fontWeight: '900', marginTop: 4, textAlign: 'center' },
  relapseButton: {
    minHeight: 66,
    borderRadius: 20,
    backgroundColor: '#5D0913',
    borderWidth: 3,
    borderTopColor: '#FF7B88',
    borderLeftColor: '#E84152',
    borderRightColor: '#9A1523',
    borderBottomColor: '#3A050C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  relapseText: { color: colors.text, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  goodButton: {
    minHeight: 62,
    borderRadius: 20,
    backgroundColor: '#0E6F53',
    borderWidth: 3,
    borderTopColor: '#57DDB8',
    borderLeftColor: '#22B98B',
    borderRightColor: '#087054',
    borderBottomColor: '#044132',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 9,
    elevation: 4,
  },
  goodText: { color: colors.text, fontSize: 16, fontWeight: '900', textAlign: 'center' },
});
