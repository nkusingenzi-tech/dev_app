import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NavigationContainer, type NavigationProp, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');

const COLORS = {
  background: '#020817',
  surface: 'rgba(7,16,42,0.88)',
  card: 'rgba(12,18,55,0.82)',
  cardRaised: 'rgba(18,25,69,0.92)',
  accent: '#04F5E5',
  gold: '#FFB800',
  red: '#FF3448',
  purple: '#A78BFA',
  blue: '#0B4D9B',
  text: '#F7F8FF',
  muted: 'rgba(255,255,255,0.62)',
  dim: 'rgba(255,255,255,0.3)',
  border: 'rgba(255,255,255,0.12)',
};

const FONT = 'System';

type RootTabParamList = {
  HomeTab: undefined;
  AnalyticsTab: undefined;
  LibraryTab: undefined;
  CommunityTab: undefined;
  ProfileTab: undefined;
};

type HomeStackParamList = {
  Home: undefined;
  Blocker: undefined;
  Therapist: undefined;
  Games: undefined;
  MathQuiz: undefined;
  WordScramble: undefined;
  MemoryMatch: undefined;
  TapTarget: undefined;
  GameWin: { title: string };
  SOS: undefined;
};

type LibraryStackParamList = {
  Library: undefined;
  Article: { title: string; body: string; topic: string };
};

type GameKey = 'MathQuiz' | 'WordScramble' | 'MemoryMatch' | 'TapTarget';

type GamificationState = {
  xp: number;
  streak: number;
  bestStreak: number;
  cleanDays: number;
  relapses: number;
  level: number;
  moodHistory: string[];
  xpPopup: { visible: boolean; amount: number };
  addXp: (amount: number) => void;
  logMood: (mood: string) => void;
};

type ChatMessage = {
  id: string;
  role: 'coach' | 'user';
  text: string;
};

const GamificationContext = createContext<GamificationState | null>(null);

function useGame() {
  const value = useContext(GamificationContext);
  if (!value) {
    throw new Error('useGame must be used inside GamificationProvider');
  }
  return value;
}

function GamificationProvider({ children }: { children: React.ReactNode }) {
  const [xp, setXp] = useState(120);
  const [moodHistory, setMoodHistory] = useState(['😤', '😐', '🙂', '💪', '🧠', '🙂', '🔥']);
  const [xpPopup, setXpPopup] = useState({ visible: false, amount: 0 });
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function addXp(amount: number) {
    setXp((current) => current + amount);
    setXpPopup({ visible: true, amount });
    if (timeout.current) {
      clearTimeout(timeout.current);
    }
    timeout.current = setTimeout(() => setXpPopup({ visible: false, amount: 0 }), 1200);
  }

  function logMood(mood: string) {
    setMoodHistory((current) => [...current.slice(-6), mood]);
    addXp(10);
  }

  const value = useMemo<GamificationState>(
    () => ({
      xp,
      streak: 17,
      bestStreak: 31,
      cleanDays: 68,
      relapses: 2,
      level: Math.max(1, Math.floor(xp / 250) + 1),
      moodHistory,
      xpPopup,
      addXp,
      logMood,
    }),
    [moodHistory, xp, xpPopup],
  );

  return (
    <GamificationContext.Provider value={value}>
      {children}
      <XPPopup visible={xpPopup.visible} amount={xpPopup.amount} />
    </GamificationContext.Provider>
  );
}

const Tab = createBottomTabNavigator<RootTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const LibraryStack = createNativeStackNavigator<LibraryStackParamList>();

const STARS = Array.from({ length: 86 }, (_, index) => ({
  id: index,
  left: ((index * 37) % 100) / 100,
  top: ((index * 61) % 100) / 100,
  opacity: 0.22 + ((index * 13) % 58) / 100,
  size: index % 7 === 0 ? 2 : 1,
}));

export function FreemanApp() {
  return (
    <GamificationProvider>
      <NavigationContainer>
        <Tab.Navigator
          id="RootTabs"
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarStyle: styles.tabBar,
            tabBarActiveTintColor: COLORS.accent,
            tabBarInactiveTintColor: COLORS.dim,
            tabBarLabelStyle: styles.tabLabel,
            tabBarIcon: ({ color }) => <TabGlyph routeName={route.name} color={color} />,
          })}
        >
          <Tab.Screen name="HomeTab" component={HomeNavigator} options={{ title: 'Home' }} />
          <Tab.Screen name="AnalyticsTab" component={AnalyticsScreen} options={{ title: 'Analytics' }} />
          <Tab.Screen name="LibraryTab" component={LibraryNavigator} options={{ title: 'Library' }} />
          <Tab.Screen name="CommunityTab" component={CommunityScreen} options={{ title: 'Community' }} />
          <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profile' }} />
        </Tab.Navigator>
      </NavigationContainer>
    </GamificationProvider>
  );
}

function HomeNavigator() {
  return (
    <HomeStack.Navigator id="HomeStack" screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.background } }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="Blocker" component={BlockerScreen} />
      <HomeStack.Screen name="Therapist" component={TherapistScreen} />
      <HomeStack.Screen name="Games" component={GamesScreen} />
      <HomeStack.Screen name="MathQuiz" component={MathQuizScreen} />
      <HomeStack.Screen name="WordScramble" component={WordScrambleScreen} />
      <HomeStack.Screen name="MemoryMatch" component={MemoryMatchScreen} />
      <HomeStack.Screen name="TapTarget" component={TapTargetScreen} />
      <HomeStack.Screen name="GameWin" component={GameWinScreen} />
      <HomeStack.Screen name="SOS" component={SOSScreen} />
    </HomeStack.Navigator>
  );
}

function LibraryNavigator() {
  return (
    <LibraryStack.Navigator id="LibraryStack" screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.background } }}>
      <LibraryStack.Screen name="Library" component={LibraryScreen} />
      <LibraryStack.Screen name="Article" component={ArticleScreen} />
    </LibraryStack.Navigator>
  );
}

function TabGlyph({ routeName, color }: { routeName: keyof RootTabParamList; color: string }) {
  const glyphs: Record<keyof RootTabParamList, string> = {
    HomeTab: '⌂',
    AnalyticsTab: '◷',
    LibraryTab: '♪',
    CommunityTab: '◉',
    ProfileTab: '♙',
  };
  return <Text style={[styles.tabIcon, { color }]}>{glyphs[routeName]}</Text>;
}

function ScreenShell({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  const body = scroll ? (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.screenContent}>
      {children}
    </ScrollView>
  ) : (
    <View style={styles.flex}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StarField />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        {body}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StarField() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.starGradientTop} />
      <View style={styles.starGradientBottom} />
      {STARS.map((star) => (
        <View
          key={star.id}
          style={[
            styles.star,
            {
              left: star.left * width,
              top: star.top * height,
              opacity: star.opacity,
              width: star.size,
              height: star.size,
              borderRadius: star.size / 2,
            },
          ]}
        />
      ))}
    </View>
  );
}

function Header({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

function BackHeader({ title }: { title: string }) {
  const navigation = useNavigation();
  return (
    <View style={styles.header}>
      <AnimatedPressable style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>‹</Text>
      </AnimatedPressable>
      <Text style={styles.backTitle}>{title}</Text>
      <View style={styles.backSpacer} />
    </View>
  );
}

function AnimatedPressable({
  children,
  style,
  onPress,
  disabled,
}: {
  children: React.ReactNode;
  style?: object;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function setPressed(pressed: boolean) {
    Animated.spring(scale, {
      toValue: pressed ? 0.96 : 1,
      friction: 5,
      tension: 180,
      useNativeDriver: true,
    }).start();
  }

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
    >
      <Animated.View style={[style, { transform: [{ scale }], opacity: disabled ? 0.5 : 1 }]}>{children}</Animated.View>
    </Pressable>
  );
}

function XPPopup({ visible, amount }: { visible: boolean; amount: number }) {
  const motion = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      return;
    }
    motion.setValue(0);
    Animated.sequence([
      Animated.timing(motion, { toValue: 1, duration: 220, easing: Easing.out(Easing.back(1.8)), useNativeDriver: true }),
      Animated.timing(motion, { toValue: 0, duration: 360, delay: 520, useNativeDriver: true }),
    ]).start();
  }, [motion, visible]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.xpPopup,
        {
          opacity: motion,
          transform: [
            { translateY: motion.interpolate({ inputRange: [0, 1], outputRange: [20, -16] }) },
            { scale: motion.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.05] }) },
          ],
        },
      ]}
    >
      <Text style={styles.xpPopupText}>{`+${amount} XP`}</Text>
    </Animated.View>
  );
}

function StreakBadge() {
  const { streak } = useGame();
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);

  return (
    <Animated.View
      style={[
        styles.streakBadge,
        {
          opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] }),
          transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }],
        },
      ]}
    >
      <Text style={styles.streakText}>{`🔥 ${streak}`}</Text>
    </Animated.View>
  );
}

function LevelBadge({ compact = false }: { compact?: boolean }) {
  const { level } = useGame();
  return (
    <View style={[styles.levelBadge, compact && styles.levelBadgeCompact]}>
      <Text style={styles.levelBadgeText}>{`Lv ${level}`}</Text>
    </View>
  );
}

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (next: boolean) => void }) {
  const motion = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(motion, { toValue: value ? 1 : 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [motion, value]);

  return (
    <Pressable onPress={() => onChange(!value)}>
      <View style={[styles.toggleTrack, { backgroundColor: value ? COLORS.accent : COLORS.cardRaised }]}>
        <Animated.View
          style={[
            styles.toggleKnob,
            {
              left: motion.interpolate({ inputRange: [0, 1], outputRange: [4, 34] }),
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

function HomeScreen() {
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
  const game = useGame();
  const [moodOpen, setMoodOpen] = useState(false);
  const [mood, setMood] = useState('🧠');
  const carouselRef = useRef<ScrollView | null>(null);
  const carouselIndex = useRef(0);
  const moods = ['🧠', '🔥', '💪', '🙂', '😤', '😐', '😴', '🙏'];
  const cards = [
    { title: 'Current Streak', value: `${game.streak} days`, subtitle: 'clean momentum', color: COLORS.gold, icon: '🔥' },
    { title: 'Testosterone Rise', value: '+24%', subtitle: 'estimated rebound', color: COLORS.accent, icon: '▲' },
    { title: 'Hours Reclaimed', value: '46h', subtitle: 'back to your mission', color: COLORS.blue, icon: '◷' },
    { title: 'Sessions Avoided', value: '39', subtitle: 'urges beaten', color: COLORS.purple, icon: '✕' },
    { title: 'Clarity Score', value: '86', subtitle: 'mental sharpness', color: COLORS.accent, icon: '◉' },
    { title: 'Money Saved', value: '$126', subtitle: 'impulse cost avoided', color: COLORS.gold, icon: '$' },
  ];

  useEffect(() => {
    const id = setInterval(() => {
      carouselIndex.current = (carouselIndex.current + 1) % cards.length;
      carouselRef.current?.scrollTo({ x: carouselIndex.current * (width - 48), animated: true });
    }, 3200);
    return () => clearInterval(id);
  }, [cards.length]);

  return (
    <ScreenShell>
      <View style={styles.quittrHeader}>
        <Text style={styles.quittrLogo}>FREEMAN</Text>
        <View style={styles.headerIconRow}>
          <AnimatedPressable style={styles.roundIcon} onPress={() => navigation.navigate('Therapist')}>
            <Text style={styles.roundIconText}>♧</Text>
          </AnimatedPressable>
          <AnimatedPressable style={styles.roundIcon} onPress={() => navigation.navigate('Games')}>
            <Text style={styles.roundIconText}>🏆</Text>
          </AnimatedPressable>
        </View>
      </View>

      {moodOpen ? (
        <View style={styles.moodPickerRow}>
          {moods.map((item) => (
            <AnimatedPressable
              key={item}
              style={[styles.moodPick, mood === item && styles.moodPickActive]}
              onPress={() => {
                setMood(item);
                setMoodOpen(false);
                game.logMood(item);
              }}
            >
              <Text style={styles.moodPickText}>{item}</Text>
            </AnimatedPressable>
          ))}
        </View>
      ) : null}

      <AnimatedPressable style={styles.coinStage} onPress={() => navigation.navigate('Blocker')}>
        <View style={styles.coinOuter}>
          <View style={styles.coinMiddle}>
            <View style={styles.coinInner} />
          </View>
        </View>
        <Text style={styles.startJourney}>Start your journey!</Text>
        <View style={styles.journeyUnderline} />
      </AnimatedPressable>

      <AnimatedPressable
        style={styles.moodInline}
        onPress={() => {
          setMoodOpen((current) => !current);
          game.addXp(2);
        }}
      >
        <Text style={styles.moodInlineText}>{mood}</Text>
      </AnimatedPressable>

      <Text style={styles.relapseTitle}>Did you relapse? Let the community know</Text>
      <Text style={styles.heroNumber}>13,933</Text>
      <Text style={styles.heroSubcopy}>are still going strong</Text>

      <View style={styles.relapseButtons}>
        <AnimatedPressable style={styles.strongButton} onPress={() => game.addXp(20)}>
          <Text style={styles.strongButtonText}>No, still going strong 💪</Text>
        </AnimatedPressable>
        <AnimatedPressable style={styles.relapseButton} onPress={() => navigation.navigate('SOS')}>
          <Text style={styles.relapseButtonText}>⚠ Yes, I relapsed</Text>
        </AnimatedPressable>
      </View>

      <ScrollView
        ref={carouselRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.carousel}
        decelerationRate="fast"
      >
        {cards.map((card) => (
          <View key={card.title} style={[styles.calcCard, { borderColor: `${card.color}66` }]}>
            <Text style={[styles.calcIcon, { color: card.color }]}>{card.icon}</Text>
            <Text style={styles.calcTitle}>{card.title}</Text>
            <Text style={[styles.calcValue, { color: card.color }]}>{card.value}</Text>
            <Text style={styles.calcSubtitle}>{card.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.actionGrid}>
        <AnimatedPressable style={styles.actionButton} onPress={() => navigation.navigate('Therapist')}>
          <Text style={styles.actionIcon}>◌</Text>
          <Text style={styles.actionTitle}>AI Therapist</Text>
        </AnimatedPressable>
        <AnimatedPressable style={styles.actionButton} onPress={() => navigation.navigate('Games')}>
          <Text style={styles.actionIcon}>⚡</Text>
          <Text style={styles.actionTitle}>Urge Shield</Text>
        </AnimatedPressable>
      </View>

      <View style={styles.homeStatsRow}>
        <LevelBadge />
        <View style={styles.miniStat}>
          <Text style={styles.miniStatValue}>{game.xp}</Text>
          <Text style={styles.miniStatLabel}>Total XP</Text>
        </View>
      </View>

      <SOSButton onPress={() => navigation.navigate('SOS')} />
    </ScreenShell>
  );
}

function SOSButton({ onPress }: { onPress: () => void }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 780, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 780, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Pressable onPress={onPress} style={styles.sosWrap}>
      <Animated.View
        style={[
          styles.sosPulse,
          {
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }],
          },
        ]}
      />
      <Text style={styles.sosText}>SOS</Text>
    </Pressable>
  );
}

function BlockerScreen() {
  const [enabled, setEnabled] = useState(true);
  const game = useGame();

  return (
    <ScreenShell>
      <BackHeader title="Protection" />
      <View style={styles.blockerFullCard}>
        <Text style={styles.blockerBigStatus}>{enabled ? 'BLOCKER ACTIVE' : 'BLOCKER INACTIVE'}</Text>
        <Text style={styles.bigCopy}>
          {enabled ? 'NSFW websites and selected apps are blocked' : 'NSFW websites and selected apps are NOT blocked'}
        </Text>
        <Pressable
          style={[styles.powerButton, enabled ? styles.powerButtonActive : styles.powerButtonOff]}
          onPress={() => {
            setEnabled((current) => !current);
            game.addXp(enabled ? 0 : 15);
          }}
        >
          <Text style={styles.powerIcon}>⏻</Text>
        </Pressable>
        <View style={styles.blockerMetricRow}>
          <View style={styles.blockerMetricCard}>
            <Text style={styles.metricDash}>--</Text>
            <Text style={styles.blockerMetricLabel}>⏳ Screen time today</Text>
          </View>
          <View style={styles.blockerMetricCard}>
            <Text style={styles.metricDash}>--</Text>
            <Text style={styles.blockerMetricLabel}>✋ Pickups</Text>
          </View>
        </View>
        <AnimatedPressable style={styles.blockerListItem}>
          <Text style={styles.blockerListIcon}>⠿</Text>
          <View style={styles.blockerListCopy}>
            <Text style={styles.cardTitle}>Block Apps</Text>
            <Text style={styles.cardCopy}>0 selected</Text>
          </View>
          <Text style={styles.cardArrow}>›</Text>
        </AnimatedPressable>
        <AnimatedPressable style={styles.blockerListItem}>
          <Text style={styles.blockerListIcon}>▣</Text>
          <View style={styles.blockerListCopy}>
            <Text style={styles.cardTitle}>Desktop blocker</Text>
            <Text style={styles.cardCopy}>Install chrome extension</Text>
          </View>
          <Text style={styles.cardArrow}>›</Text>
        </AnimatedPressable>
      </View>
    </ScreenShell>
  );
}

const responseMap = [
  { key: 'urge', text: 'Name the urge, change rooms, and start a 90-second timer. Do not debate it.' },
  { key: 'slip', text: 'Log it without shame. The next clean decision matters more than the last bad one.' },
  { key: 'relapse', text: 'Remove the trigger, message support, and rebuild the next 24-hour plan now.' },
  { key: 'help', text: 'Use SOS breathing, drink water, and put the phone across the room for ten minutes.' },
  { key: 'tonight', text: 'Tonight: devices parked, shower, lights low, bed early. Win the room first.' },
  { key: 'plan', text: 'Plan: block triggers, schedule training, check in twice, and protect your sleep window.' },
];

function TherapistScreen() {
  const game = useGame();
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'coach', text: 'I am here. Tell me what is happening right now.' },
  ]);

  function send() {
    const value = text.trim();
    if (!value) {
      return;
    }
    const lower = value.toLowerCase();
    const matched = responseMap.find((item) => lower.includes(item.key));
    const response = matched?.text ?? 'Keep it simple: stand up, breathe slowly, and choose the next clean action.';
    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-u`, role: 'user', text: value },
      { id: `${Date.now()}-c`, role: 'coach', text: response },
    ]);
    setText('');
    game.addXp(10);
  }

  return (
    <ScreenShell scroll={false}>
      <View style={styles.therapyHeader}>
        <AnimatedPressable style={styles.therapyBack} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </AnimatedPressable>
        <View style={styles.therapyTitleBlock}>
          <Text style={styles.therapyTitle}>FREEMAN Therapy</Text>
          <Text style={styles.therapySubtitle}>Powered by AI</Text>
        </View>
        <Text style={styles.therapyMenu}>•••</Text>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.chatWrap}>
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatList}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.coachBubble]}>
              <Text style={styles.bubbleText}>{item.text}</Text>
            </View>
          )}
        />
        <View style={styles.inputBar}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type urge, relapse, tonight, plan..."
            placeholderTextColor={COLORS.dim}
            style={styles.chatInput}
          />
          <AnimatedPressable style={styles.sendButton} onPress={send}>
            <Text style={styles.sendText}>Send</Text>
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const games: Array<{ title: string; route: GameKey; copy: string; icon: string }> = [
  { title: 'Math Quiz', route: 'MathQuiz', copy: 'Five fast equations to interrupt the urge loop.', icon: '+' },
  { title: 'Word Scramble', route: 'WordScramble', copy: 'Unscramble power words under pressure.', icon: 'ABC' },
  { title: 'Memory Match', route: 'MemoryMatch', copy: 'Match 8 pairs and pull focus back online.', icon: '◫' },
  { title: 'Tap Target', route: 'TapTarget', copy: 'Tap 8 moving targets before the timer ends.', icon: '◎' },
];

function GamesScreen() {
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
  return (
    <ScreenShell>
      <BackHeader title="Urge Shield" />
      <View style={styles.gameGrid}>
        {games.map((game) => (
          <AnimatedPressable key={game.title} style={styles.gameCard} onPress={() => navigation.navigate(game.route)}>
            <Text style={styles.gameIcon}>{game.icon}</Text>
            <Text style={styles.gameTitle}>{game.title}</Text>
            <Text style={styles.gameCopy}>{game.copy}</Text>
          </AnimatedPressable>
        ))}
      </View>
    </ScreenShell>
  );
}

function MathQuizScreen() {
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [problem, setProblem] = useState(createProblem());

  function submit() {
    if (Number(answer) !== problem.answer) {
      setAnswer('');
      return;
    }
    if (index >= 4) {
      navigation.navigate('GameWin', { title: 'Math Quiz' });
      return;
    }
    setIndex((current) => current + 1);
    setProblem(createProblem());
    setAnswer('');
  }

  return (
    <ScreenShell>
      <BackHeader title="Math Quiz" />
      <View style={styles.challengeCard}>
        <Text style={styles.challengeMeta}>{`Problem ${index + 1}/5`}</Text>
        <Text style={styles.challengeQuestion}>{problem.label}</Text>
        <TextInput value={answer} onChangeText={setAnswer} keyboardType="number-pad" style={styles.answerInput} placeholder="Answer" placeholderTextColor={COLORS.dim} />
        <AnimatedPressable style={styles.primaryButton} onPress={submit}>
          <Text style={styles.primaryText}>Submit</Text>
        </AnimatedPressable>
      </View>
    </ScreenShell>
  );
}

function createProblem() {
  const a = Math.floor(Math.random() * 12) + 3;
  const b = Math.floor(Math.random() * 9) + 2;
  const op = ['+', '-', '×'][Math.floor(Math.random() * 3)];
  const answer = op === '+' ? a + b : op === '-' ? a - b : a * b;
  return { label: `${a} ${op} ${b}`, answer };
}

const powerWords = ['DISCIPLINE', 'PURPOSE', 'CONTROL', 'CLARITY', 'STRENGTH'];

function WordScrambleScreen() {
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const word = powerWords[index];
  const scrambled = useMemo(() => word.split('').sort(() => 0.5 - Math.random()).join(''), [word]);

  function submit() {
    if (answer.trim().toUpperCase() !== word) {
      setAnswer('');
      return;
    }
    if (index >= 2) {
      navigation.navigate('GameWin', { title: 'Word Scramble' });
      return;
    }
    setIndex((current) => current + 1);
    setAnswer('');
  }

  return (
    <ScreenShell>
      <BackHeader title="Word Scramble" />
      <View style={styles.challengeCard}>
        <Text style={styles.challengeMeta}>{`Word ${index + 1}/3`}</Text>
        <Text style={styles.challengeQuestion}>{scrambled}</Text>
        <TextInput value={answer} onChangeText={setAnswer} autoCapitalize="characters" style={styles.answerInput} placeholder="Recovery word" placeholderTextColor={COLORS.dim} />
        <AnimatedPressable style={styles.primaryButton} onPress={submit}>
          <Text style={styles.primaryText}>Submit</Text>
        </AnimatedPressable>
      </View>
    </ScreenShell>
  );
}

function MemoryMatchScreen() {
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
  const [cards, setCards] = useState(() => shuffle(['🔥', '🧠', '💪', '🛡', '⚡', '🎯', '🌱', '👑'].flatMap((item) => [item, item])));
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);

  useEffect(() => {
    if (matched.length === 16) {
      navigation.navigate('GameWin', { title: 'Memory Match' });
    }
  }, [matched.length, navigation]);

  function flip(cardIndex: number) {
    if (open.includes(cardIndex) || matched.includes(cardIndex) || open.length === 2) {
      return;
    }
    const next = [...open, cardIndex];
    setOpen(next);
    if (next.length === 2) {
      const [first, second] = next;
      if (cards[first] === cards[second]) {
        setMatched((current) => [...current, first, second]);
        setOpen([]);
      } else {
        setTimeout(() => setOpen([]), 650);
      }
    }
  }

  return (
    <ScreenShell>
      <BackHeader title="Memory Match" />
      <View style={styles.memoryGrid}>
        {cards.map((card, index) => {
          const visible = open.includes(index) || matched.includes(index);
          return (
            <AnimatedPressable key={`${card}-${index}`} style={[styles.memoryCard, visible && styles.memoryCardOpen]} onPress={() => flip(index)}>
              <Text style={styles.memoryCardText}>{visible ? card : '?'}</Text>
            </AnimatedPressable>
          );
        })}
      </View>
      <AnimatedPressable
        style={styles.secondaryButton}
        onPress={() => {
          setCards(shuffle(cards));
          setOpen([]);
          setMatched([]);
        }}
      >
        <Text style={styles.secondaryText}>Restart</Text>
      </AnimatedPressable>
    </ScreenShell>
  );
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => 0.5 - Math.random());
}

function TapTargetScreen() {
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
  const [hits, setHits] = useState(0);
  const [timeLeft, setTimeLeft] = useState(18);
  const [target, setTarget] = useState(randomTarget());

  useEffect(() => {
    if (hits >= 8) {
      navigation.navigate('GameWin', { title: 'Tap Target' });
      return;
    }
    if (timeLeft <= 0) {
      setHits(0);
      setTimeLeft(18);
      setTarget(randomTarget());
      return;
    }
    const id = setTimeout(() => setTimeLeft((current) => current - 1), 1000);
    return () => clearTimeout(id);
  }, [hits, navigation, timeLeft]);

  return (
    <ScreenShell>
      <BackHeader title="Tap Target" />
      <View style={styles.tapArena}>
        <Text style={styles.tapMeta}>{`${hits}/8 hits • ${timeLeft}s`}</Text>
        <Pressable
          style={[styles.target, { left: target.x, top: target.y }]}
          onPress={() => {
            setHits((current) => current + 1);
            setTarget(randomTarget());
          }}
        >
          <Text style={styles.targetText}>◎</Text>
        </Pressable>
      </View>
    </ScreenShell>
  );
}

function randomTarget() {
  return {
    x: Math.floor(Math.random() * Math.max(1, width - 116)) + 20,
    y: Math.floor(Math.random() * 330) + 80,
  };
}

function GameWinScreen({ route }: { route: { params: { title: string } } }) {
  const game = useGame();

  useEffect(() => {
    game.addXp(50);
  }, []);

  return (
    <ScreenShell>
      <BackHeader title="Victory" />
      <View style={styles.winCard}>
        <Text style={styles.winIcon}>🔥</Text>
        <Text style={styles.bigTitle}>{`${route.params.title} won`}</Text>
        <Text style={styles.bigCopy}>You interrupted the urge loop and earned discipline XP.</Text>
        <Text style={styles.winXp}>+50 XP</Text>
      </View>
    </ScreenShell>
  );
}

function SOSScreen() {
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
  const { streak } = useGame();
  const circle = useRef(new Animated.Value(0)).current;
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(20);
  const quotes = ['This urge is temporary.', 'You only need to win the next minute.', 'Leave the room before you negotiate.', 'Your future self needs this choice.'];

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(circle, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(circle, { toValue: 0.35, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(circle, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [circle]);

  useEffect(() => {
    const id = setInterval(() => setQuoteIndex((current) => (current + 1) % quotes.length), 4000);
    return () => clearInterval(id);
  }, [quotes.length]);

  useEffect(() => {
    if (!recording) {
      return;
    }
    if (seconds <= 0) {
      setRecording(false);
      setSeconds(20);
      return;
    }
    const id = setTimeout(() => setSeconds((current) => current - 1), 1000);
    return () => clearTimeout(id);
  }, [recording, seconds]);

  return (
    <ScreenShell>
      <BackHeader title="SOS Reset" />
      <View style={styles.sosScreenCard}>
        <Animated.View style={[styles.breathCircle, { transform: [{ scale: circle.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1.28] }) }] }]}>
          <Text style={styles.breathText}>4-4-6</Text>
        </Animated.View>
        <Text style={styles.quoteText}>{quotes[quoteIndex]}</Text>
        <AnimatedPressable style={[styles.recordButton, recording && styles.recordingButton]} onPress={() => setRecording(true)}>
          <Text style={styles.recordText}>{recording ? `${seconds}s commitment` : 'Voice commitment'}</Text>
        </AnimatedPressable>
        <AnimatedPressable style={styles.primaryButton} onPress={() => navigation.navigate('Therapist')}>
          <Text style={styles.primaryText}>AI Therapist</Text>
        </AnimatedPressable>
        <View style={styles.quickStats}>
          <StatChip label="Streak" value={`${streak}d`} />
          <StatChip label="T-rise" value="+24%" />
          <StatChip label="Hours" value="46h" />
        </View>
      </View>
    </ScreenShell>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statChipValue}>{value}</Text>
      <Text style={styles.statChipLabel}>{label}</Text>
    </View>
  );
}

function AnalyticsScreen() {
  const [tab, setTab] = useState<'Overview' | 'Mood'>('Overview');
  const game = useGame();
  const cleanPattern = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1];
  const moods = ['🧠', '🔥', '💪', '🙂', '😤', '😐', '😴', '🙏'];

  return (
    <ScreenShell>
      <Header title="Analytics" subtitle="Momentum, mood, and recovery signal" />
      <View style={styles.segment}>
        {(['Overview', 'Mood'] as const).map((item) => (
          <AnimatedPressable key={item} style={[styles.segmentButton, tab === item && styles.segmentButtonActive]} onPress={() => setTab(item)}>
            <Text style={[styles.segmentText, tab === item && styles.segmentTextActive]}>{item}</Text>
          </AnimatedPressable>
        ))}
      </View>

      {tab === 'Overview' ? (
        <>
          <View style={styles.arcWrap}>
            <View style={styles.arcTrack} />
            <View style={[styles.arcFill, { transform: [{ rotate: `${Math.min(320, (game.streak / 90) * 360)}deg` }] }]} />
            <View style={styles.arcCenter}>
              <Text style={styles.arcValue}>{game.streak}</Text>
              <Text style={styles.arcLabel}>of 90</Text>
            </View>
          </View>
          <View style={styles.barChart}>
            {cleanPattern.map((clean, index) => (
              <View key={`${clean}-${index}`} style={styles.barSlot}>
                <View style={[styles.bar, { height: clean ? 72 : 30, backgroundColor: clean ? COLORS.accent : COLORS.red }]} />
              </View>
            ))}
          </View>
          <View style={styles.statGrid}>
            <AnalyticsCard label="Current Streak" value={`${game.streak}`} />
            <AnalyticsCard label="Best Streak" value={`${game.bestStreak}`} />
            <AnalyticsCard label="Clean Days" value={`${game.cleanDays}`} />
            <AnalyticsCard label="Relapses" value={`${game.relapses}`} danger />
          </View>
        </>
      ) : (
        <>
          <View style={styles.moodGrid}>
            {moods.map((mood) => (
              <AnimatedPressable key={mood} style={styles.moodLogButton} onPress={() => game.logMood(mood)}>
                <Text style={styles.moodLogText}>{mood}</Text>
              </AnimatedPressable>
            ))}
          </View>
          <View style={styles.weekMoodRow}>
            {game.moodHistory.map((mood, index) => (
              <View key={`${mood}-${index}`} style={styles.weekMood}>
                <Text style={styles.weekMoodEmoji}>{mood}</Text>
                <Text style={styles.weekMoodDay}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScreenShell>
  );
}

function AnalyticsCard({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View style={styles.analyticsCard}>
      <Text style={[styles.analyticsValue, { color: danger ? COLORS.red : COLORS.accent }]}>{value}</Text>
      <Text style={styles.analyticsLabel}>{label}</Text>
    </View>
  );
}

const soundItems = [
  { emoji: '🌧', name: 'Rain', tag: 'Anxiety -35%', kind: 'noise' as const },
  { emoji: '🔥', name: 'Campfire', tag: 'Calm focus', kind: 'noise' as const },
  { emoji: '🌊', name: 'Ocean', tag: 'Breath sync', kind: 'noise' as const },
  { emoji: '💨', name: 'Wind', tag: 'Stress down', kind: 'noise' as const },
  { emoji: '🤎', name: 'Brown Noise', tag: 'Deep sleep', kind: 'noise' as const },
  { emoji: '⚪', name: 'White Noise', tag: 'Focus mask', kind: 'noise' as const },
  { emoji: '♬', name: '432 Hz', tag: 'Grounding', frequency: 432 },
  { emoji: '✦', name: '528 Hz', tag: 'Repair mood', frequency: 528 },
  { emoji: 'γ', name: '40 Hz Gamma', tag: 'Clarity', frequency: 40 },
  { emoji: '∞', name: 'Binaural', tag: 'Relaxation', frequency: 220 },
];

const articleItems = [
  { emoji: '🧠', title: 'Brain Fog Science', topic: 'Neurochemistry', read: '5 min', body: 'Brain fog is often a signal of overstimulation, poor sleep, and reward-system fatigue. Recovery starts by lowering stimulus intensity and rebuilding attention through repetition.' },
  { emoji: '▲', title: 'Testosterone Truth', topic: 'Hormones', read: '4 min', body: 'Recovery is not magic, but better sleep, training, and fewer compulsive sessions can improve drive, confidence, and energy markers over time.' },
  { emoji: '🎯', title: '90-Day Reset', topic: 'Protocol', read: '6 min', body: 'The 90-day reset works because identity changes through repeated clean decisions. Track triggers, protect sleep, and win the risky window daily.' },
  { emoji: '❤️', title: 'PIED', topic: 'Relationships', read: '7 min', body: 'Porn-induced erectile dysfunction is linked to novelty escalation and reduced sensitivity to real intimacy. Lower stimulation and rebuild real connection patiently.' },
  { emoji: '⚡', title: 'Energy Return', topic: 'Body', read: '3 min', body: 'Energy returns when sleep, dopamine, movement, and purpose stop fighting each other. Recovery gives attention back to the body.' },
  { emoji: '🛡', title: 'Relapse-Proof System', topic: 'Defense', read: '8 min', body: 'A relapse-proof system removes frictionless access, adds accountability, and gives you a default action before the urge peaks.' },
];

function LibraryScreen() {
  const [playing, setPlaying] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const game = useGame();
  const navigation = useNavigation<NavigationProp<LibraryStackParamList>>();

  async function playSound(item: (typeof soundItems)[number]) {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    if (playing === item.name) {
      setPlaying(null);
      return;
    }
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const uri = generateToneDataUri(item.frequency ?? 180, item.kind === 'noise');
    const { sound } = await Audio.Sound.createAsync({ uri }, { isLooping: true, volume: 0.35 });
    soundRef.current = sound;
    setPlaying(item.name);
    game.addXp(5);
    await sound.playAsync();
  }

  useEffect(() => {
    return () => {
      void soundRef.current?.unloadAsync();
    };
  }, []);

  return (
    <ScreenShell>
      <Header title="Library" subtitle="Sounds and recovery articles" />
      <Text style={styles.sectionTitle}>Sounds</Text>
      <View style={styles.soundGrid}>
        {soundItems.map((item) => (
          <View key={item.name} style={styles.soundCard}>
            <Text style={styles.soundEmoji}>{item.emoji}</Text>
            <Text style={styles.soundName}>{item.name}</Text>
            <Text style={styles.soundTag}>{item.tag}</Text>
            {playing === item.name ? <PlayingBars /> : null}
            <AnimatedPressable style={styles.smallButton} onPress={() => void playSound(item)}>
              <Text style={styles.smallButtonText}>{playing === item.name ? 'Stop' : 'Play'}</Text>
            </AnimatedPressable>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Articles</Text>
      {articleItems.map((article) => (
        <AnimatedPressable
          key={article.title}
          style={styles.articleCard}
          onPress={() => navigation.navigate('Article', { title: article.title, body: article.body, topic: article.topic })}
        >
          <Text style={styles.articleEmoji}>{article.emoji}</Text>
          <View style={styles.articleCopy}>
            <Text style={styles.articleTitle}>{article.title}</Text>
            <Text style={styles.articleTopic}>{article.topic}</Text>
          </View>
          <Text style={styles.readBadge}>{article.read}</Text>
        </AnimatedPressable>
      ))}
    </ScreenShell>
  );
}

function PlayingBars() {
  const bars = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    const loops = bars.map((bar, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 120),
          Animated.timing(bar, { toValue: 1, duration: 320, useNativeDriver: false }),
          Animated.timing(bar, { toValue: 0, duration: 320, useNativeDriver: false }),
        ]),
      ),
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [bars]);

  return (
    <View style={styles.playBars}>
      {bars.map((bar, index) => (
        <Animated.View
          key={index}
          style={[
            styles.playBar,
            { height: bar.interpolate({ inputRange: [0, 1], outputRange: [8, 22] }) },
          ]}
        />
      ))}
    </View>
  );
}

function generateToneDataUri(frequency: number, noise = false) {
  const sampleRate = 8000;
  const seconds = 1;
  const samples = sampleRate * seconds;
  const dataSize = samples * 2;
  const bytes: number[] = [];

  function writeString(value: string) {
    for (let i = 0; i < value.length; i += 1) bytes.push(value.charCodeAt(i));
  }
  function write32(value: number) {
    bytes.push(value & 255, (value >> 8) & 255, (value >> 16) & 255, (value >> 24) & 255);
  }
  function write16(value: number) {
    bytes.push(value & 255, (value >> 8) & 255);
  }

  writeString('RIFF');
  write32(36 + dataSize);
  writeString('WAVEfmt ');
  write32(16);
  write16(1);
  write16(1);
  write32(sampleRate);
  write32(sampleRate * 2);
  write16(2);
  write16(16);
  writeString('data');
  write32(dataSize);

  for (let i = 0; i < samples; i += 1) {
    const sample = noise ? (Math.random() * 2 - 1) * 0.28 : Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 0.32;
    const value = Math.max(-1, Math.min(1, sample)) * 32767;
    write16(value < 0 ? 65536 + value : value);
  }

  return `data:audio/wav;base64,${bytesToBase64(bytes)}`;
}

function bytesToBase64(bytes: number[]) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const triple = (a << 16) | (b << 8) | c;
    output += chars[(triple >> 18) & 63];
    output += chars[(triple >> 12) & 63];
    output += i + 1 < bytes.length ? chars[(triple >> 6) & 63] : '=';
    output += i + 2 < bytes.length ? chars[triple & 63] : '=';
  }
  return output;
}

function ArticleScreen({ route }: { route: { params: { title: string; body: string; topic: string } } }) {
  return (
    <ScreenShell>
      <BackHeader title="Article" />
      <Text style={styles.articleReaderTopic}>{route.params.topic}</Text>
      <Text style={styles.articleReaderTitle}>{route.params.title}</Text>
      <Text style={styles.articleBody}>{route.params.body}</Text>
      <Text style={styles.articleBody}>
        Build your system around prevention, not willpower. Keep high-risk windows structured, remove private access, and log each clean day as proof.
      </Text>
    </ScreenShell>
  );
}

const seedMessages = [
  { id: '1', avatar: '🔥', user: 'Mika', time: '09:14', text: 'Day 12. Morning gym helped me stop doom scrolling last night.', likes: 18 },
  { id: '2', avatar: '🧠', user: 'Ari', time: '09:26', text: 'Had a brutal urge. Did the breathing screen and walked outside.', likes: 24 },
  { id: '3', avatar: '💪', user: 'Sam', time: '10:02', text: 'Cold shower plus phone in another room is still undefeated.', likes: 31 },
  { id: '4', avatar: '🎯', user: 'Noah', time: '10:18', text: 'Reset my plan after a slip. Not hiding from it this time.', likes: 16 },
  { id: '5', avatar: '⚡', user: 'Leo', time: '11:44', text: 'Energy is coming back around week three.', likes: 27 },
  { id: '6', avatar: '🛡', user: 'Jay', time: '12:05', text: 'Blocker on before bed. That one switch changes the night.', likes: 21 },
  { id: '7', avatar: '👑', user: 'Ken', time: '12:40', text: 'Won the risky window yesterday. Going for another clean night.', likes: 14 },
  { id: '8', avatar: '🌱', user: 'Omar', time: '13:12', text: 'Sleep is better. Brain fog is finally lifting.', likes: 29 },
];

function CommunityScreen() {
  const pulse = useRef(new Animated.Value(0)).current;
  const [messages, setMessages] = useState(seedMessages);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [text, setText] = useState('');

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  function send() {
    const value = text.trim();
    if (!value) return;
    setMessages((current) => [
      ...current,
      { id: `${Date.now()}`, avatar: '🧠', user: 'You', time: 'now', text: value, likes: 0 },
    ]);
    setText('');
  }

  return (
    <ScreenShell scroll={false}>
      <View style={styles.communityHeader}>
        <View>
          <Text style={styles.headerTitle}>Community</Text>
          <View style={styles.onlineRow}>
            <Animated.View style={[styles.onlineDot, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) }]} />
            <Text style={styles.headerSubtitle}>2,847 online</Text>
          </View>
        </View>
      </View>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.communityList}
        renderItem={({ item }) => {
          const mine = item.user === 'You';
          return (
            <View style={[styles.communityBubbleRow, mine && styles.communityBubbleRowMine]}>
              {!mine ? <Text style={styles.communityAvatar}>{item.avatar}</Text> : null}
              <View style={[styles.communityBubble, mine ? styles.communityBubbleMine : styles.communityBubbleOther]}>
                {!mine ? <Text style={styles.communityMeta}>{`${item.user} • ${item.time}`}</Text> : null}
                <Text style={styles.communityText}>{item.text}</Text>
                {!mine ? (
                  <AnimatedPressable
                    style={styles.likeButton}
                    onPress={() => setLiked((current) => ({ ...current, [item.id]: !current[item.id] }))}
                  >
                    <Text style={[styles.likeText, liked[item.id] && styles.likeTextActive]}>{`♥ ${item.likes + (liked[item.id] ? 1 : 0)}`}</Text>
                  </AnimatedPressable>
                ) : null}
              </View>
            </View>
          );
        }}
      />
      <View style={styles.inputBar}>
        <TextInput value={text} onChangeText={setText} placeholder="Share a clean choice..." placeholderTextColor={COLORS.dim} style={styles.chatInput} />
        <AnimatedPressable style={styles.sendButton} onPress={send}>
          <Text style={styles.sendText}>Send</Text>
        </AnimatedPressable>
      </View>
    </ScreenShell>
  );
}

function ProfileScreen() {
  const game = useGame();
  const [settings, setSettings] = useState({ push: true, sound: true, reminder: false });
  const progress = useRef(new Animated.Value(0)).current;
  const xpIntoLevel = game.xp % 250;

  useEffect(() => {
    Animated.timing(progress, { toValue: xpIntoLevel / 250, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [progress, xpIntoLevel]);

  return (
    <ScreenShell>
      <Header title="Profile" subtitle="Identity, XP, and settings" />
      <View style={styles.profileHero}>
        <View style={styles.avatarBig}>
          <Text style={styles.avatarBigText}>🧠</Text>
          <View style={styles.avatarLevel}>
            <LevelBadge compact />
          </View>
        </View>
        <Text style={styles.profileName}>Freeman</Text>
        <Text style={styles.profileXp}>{`${game.xp} XP`}</Text>
        <View style={styles.xpTrack}>
          <Animated.View style={[styles.xpFill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
      </View>

      <View style={styles.profileStats}>
        <StatChip label="Streak" value={`${game.streak}`} />
        <StatChip label="Badges" value="7" />
        <StatChip label="Total XP" value={`${game.xp}`} />
      </View>

      <Text style={styles.sectionTitle}>Settings</Text>
      <SettingRow label="Push Notifications" value={settings.push} onChange={(push) => setSettings((current) => ({ ...current, push }))} />
      <SettingRow label="Sound Effects" value={settings.sound} onChange={(sound) => setSettings((current) => ({ ...current, sound }))} />
      <SettingRow label="Daily Reminder" value={settings.reminder} onChange={(reminder) => setSettings((current) => ({ ...current, reminder }))} />

      <Text style={styles.sectionTitle}>Account</Text>
      {['Privacy Policy', 'Terms of Service', 'Rate Freeman', 'Sign Out'].map((item) => (
        <AnimatedPressable key={item} style={styles.accountRow}>
          <Text style={styles.accountText}>{item}</Text>
          <Text style={styles.cardArrow}>›</Text>
        </AnimatedPressable>
      ))}
    </ScreenShell>
  );
}

function SettingRow({ label, value, onChange }: { label: string; value: boolean; onChange: (next: boolean) => void }) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <ToggleSwitch value={value} onChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: COLORS.background },
  starGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.48,
    backgroundColor: '#061A3B',
    opacity: 0.58,
  },
  starGradientBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.48,
    backgroundColor: '#041024',
    opacity: 0.8,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },
  screenContent: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 112 },
  tabBar: {
    backgroundColor: '#060723',
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: 72,
    paddingTop: 7,
    paddingBottom: 10,
  },
  tabLabel: { fontFamily: FONT, fontWeight: '600', fontSize: 11 },
  tabIcon: { fontFamily: FONT, fontWeight: '800', fontSize: 22 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  headerTitle: { color: COLORS.text, fontFamily: FONT, fontSize: 34, fontWeight: '800', letterSpacing: 0 },
  headerSubtitle: { color: COLORS.muted, fontFamily: FONT, fontSize: 14, fontWeight: '500', marginTop: 5 },
  backButton: { width: 42, height: 42, borderRadius: 8, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  backText: { color: COLORS.text, fontSize: 32, lineHeight: 36 },
  backTitle: { color: COLORS.text, fontFamily: FONT, fontWeight: '800', fontSize: 20 },
  backSpacer: { width: 42 },
  xpPopup: { position: 'absolute', top: 54, right: 18, zIndex: 50, backgroundColor: COLORS.accent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  xpPopupText: { color: COLORS.background, fontFamily: FONT, fontWeight: '800', fontSize: 14 },
  streakBadge: { backgroundColor: 'rgba(255,184,0,0.12)', borderColor: 'rgba(255,184,0,0.35)', borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  streakText: { color: COLORS.gold, fontFamily: FONT, fontSize: 24, fontWeight: '800' },
  levelBadge: { alignSelf: 'flex-start', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,229,160,0.3)', backgroundColor: 'rgba(0,229,160,0.12)', paddingHorizontal: 12, paddingVertical: 7 },
  levelBadgeCompact: { paddingHorizontal: 8, paddingVertical: 4 },
  levelBadgeText: { color: COLORS.accent, fontFamily: FONT, fontWeight: '800', fontSize: 13 },
  toggleTrack: { width: 64, height: 34, borderRadius: 8, padding: 4 },
  toggleKnob: { position: 'absolute', top: 4, width: 26, height: 26, borderRadius: 7, backgroundColor: COLORS.text },
  homeTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  quittrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 28,
  },
  quittrLogo: {
    color: COLORS.text,
    fontFamily: FONT,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0,
  },
  headerIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  roundIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5,18,48,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  roundIconText: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
  },
  moodButton: { width: 54, height: 54, borderRadius: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  moodButtonText: { fontSize: 26 },
  moodPickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, marginBottom: 14 },
  moodPick: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.card },
  moodPickActive: { borderWidth: 1, borderColor: COLORS.accent, backgroundColor: 'rgba(0,229,160,0.12)' },
  moodPickText: { fontSize: 20 },
  blockerCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 8, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, padding: 18, marginBottom: 18 },
  coinStage: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 250,
    marginBottom: 10,
  },
  coinOuter: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  coinMiddle: {
    width: 146,
    height: 146,
    borderRadius: 73,
    backgroundColor: '#C2A982',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinInner: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#8D744E',
    opacity: 0.48,
  },
  startJourney: {
    color: COLORS.text,
    fontFamily: FONT,
    fontWeight: '800',
    fontSize: 16,
    marginTop: 24,
  },
  journeyUnderline: {
    width: 92,
    height: 5,
    borderRadius: 4,
    backgroundColor: COLORS.text,
    marginTop: 10,
  },
  moodInline: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 18,
  },
  moodInlineText: {
    fontSize: 34,
  },
  relapseTitle: {
    color: COLORS.text,
    fontFamily: FONT,
    fontWeight: '800',
    fontSize: 28,
    lineHeight: 34,
    maxWidth: 340,
    marginBottom: 20,
  },
  heroNumber: {
    color: COLORS.text,
    fontFamily: FONT,
    fontWeight: '800',
    fontSize: 50,
    lineHeight: 56,
  },
  heroSubcopy: {
    color: COLORS.muted,
    fontFamily: FONT,
    fontWeight: '500',
    fontSize: 18,
    marginTop: 4,
    marginBottom: 18,
  },
  relapseButtons: {
    gap: 14,
    marginBottom: 26,
  },
  strongButton: {
    minHeight: 58,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#073B79',
  },
  strongButtonText: {
    color: COLORS.text,
    fontFamily: FONT,
    fontWeight: '800',
    fontSize: 17,
  },
  relapseButton: {
    minHeight: 58,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,52,72,0.18)',
    borderWidth: 1,
    borderColor: COLORS.red,
  },
  relapseButtonText: {
    color: COLORS.red,
    fontFamily: FONT,
    fontWeight: '800',
    fontSize: 17,
  },
  blockerIcon: { fontSize: 36 },
  blockerCopy: { flex: 1 },
  cardTitle: { color: COLORS.text, fontFamily: FONT, fontWeight: '800', fontSize: 19 },
  cardCopy: { color: COLORS.muted, fontFamily: FONT, fontWeight: '500', fontSize: 14, lineHeight: 20, marginTop: 5 },
  cardArrow: { color: COLORS.dim, fontSize: 28 },
  carousel: { marginHorizontal: -18, marginBottom: 18 },
  calcCard: { width: width - 36, minHeight: 168, borderRadius: 8, backgroundColor: COLORS.card, borderWidth: 1, padding: 20, marginHorizontal: 18 },
  calcIcon: { fontFamily: FONT, fontSize: 28, fontWeight: '800' },
  calcTitle: { color: COLORS.muted, fontFamily: FONT, fontWeight: '600', fontSize: 14, marginTop: 18 },
  calcValue: { fontFamily: FONT, fontSize: 34, fontWeight: '800', marginTop: 7 },
  calcSubtitle: { color: COLORS.dim, fontFamily: FONT, fontWeight: '500', fontSize: 13, marginTop: 4 },
  actionGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionButton: { flex: 1, minHeight: 104, borderRadius: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, padding: 16, justifyContent: 'space-between' },
  actionIcon: { color: COLORS.accent, fontFamily: FONT, fontSize: 28, fontWeight: '800' },
  actionTitle: { color: COLORS.text, fontFamily: FONT, fontWeight: '800', fontSize: 16 },
  homeStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  miniStat: { alignItems: 'flex-end' },
  miniStatValue: { color: COLORS.text, fontFamily: FONT, fontWeight: '800', fontSize: 22 },
  miniStatLabel: { color: COLORS.muted, fontFamily: FONT, fontSize: 12, marginTop: 2 },
  sosWrap: { position: 'absolute', right: 20, bottom: 90, width: 68, height: 68, borderRadius: 34, backgroundColor: COLORS.red, alignItems: 'center', justifyContent: 'center', zIndex: 20 },
  sosPulse: { position: 'absolute', width: 78, height: 78, borderRadius: 39, backgroundColor: COLORS.red },
  sosText: { color: COLORS.text, fontFamily: FONT, fontWeight: '800', fontSize: 16 },
  blockerFullCard: { minHeight: height * 0.78, alignItems: 'center', paddingTop: 20 },
  blockerBigIcon: { fontSize: 74, marginBottom: 18 },
  blockerBigStatus: {
    color: 'rgba(255,255,255,0.58)',
    fontFamily: FONT,
    fontWeight: '800',
    fontSize: 37,
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 8,
  },
  bigTitle: { color: COLORS.text, fontFamily: FONT, fontWeight: '800', fontSize: 30, textAlign: 'center' },
  bigCopy: { color: COLORS.muted, fontFamily: FONT, fontWeight: '500', fontSize: 16, lineHeight: 24, textAlign: 'center', marginTop: 12 },
  largeToggleWrap: { marginTop: 26, transform: [{ scale: 1.35 }] },
  powerButton: {
    width: 196,
    height: 196,
    borderRadius: 98,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 46,
    marginBottom: 46,
    shadowColor: '#123CFF',
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 10,
  },
  powerButtonActive: {
    backgroundColor: COLORS.accent,
  },
  powerButtonOff: {
    backgroundColor: COLORS.red,
  },
  powerIcon: {
    color: COLORS.text,
    fontFamily: FONT,
    fontSize: 78,
    fontWeight: '500',
  },
  blockerMetricRow: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: 18,
  },
  blockerMetricCard: {
    flex: 1,
    minHeight: 132,
    borderRadius: 18,
    backgroundColor: 'rgba(13,8,47,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.17)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  metricDash: {
    color: COLORS.text,
    fontFamily: FONT,
    fontWeight: '800',
    fontSize: 34,
    marginBottom: 22,
  },
  blockerMetricLabel: {
    color: COLORS.muted,
    fontFamily: FONT,
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
  blockerListItem: {
    width: '100%',
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(13,8,47,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.17)',
    padding: 18,
    marginBottom: 16,
  },
  blockerListIcon: {
    width: 54,
    height: 54,
    borderRadius: 14,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: COLORS.accent,
    backgroundColor: 'rgba(0,229,160,0.12)',
    fontSize: 28,
  },
  blockerListCopy: {
    flex: 1,
  },
  chatWrap: { flex: 1 },
  therapyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  therapyBack: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  therapyTitleBlock: {
    alignItems: 'center',
  },
  therapyTitle: {
    color: COLORS.text,
    fontFamily: FONT,
    fontSize: 25,
    fontWeight: '800',
  },
  therapySubtitle: {
    color: COLORS.muted,
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 5,
  },
  therapyMenu: {
    color: COLORS.text,
    fontSize: 28,
    width: 42,
    textAlign: 'center',
  },
  chatList: { paddingBottom: 14, gap: 12 },
  bubble: { maxWidth: '84%', borderRadius: 8, padding: 13, marginBottom: 10 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: COLORS.purple },
  coachBubble: { alignSelf: 'flex-start', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  bubbleText: { color: COLORS.text, fontFamily: FONT, fontWeight: '500', fontSize: 15, lineHeight: 21 },
  inputBar: { flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 14, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background },
  chatInput: { flex: 1, minHeight: 46, borderRadius: 8, backgroundColor: COLORS.surface, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 13, fontFamily: FONT, fontSize: 14 },
  sendButton: { minWidth: 72, borderRadius: 8, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  sendText: { color: COLORS.background, fontFamily: FONT, fontWeight: '800', fontSize: 14 },
  gameGrid: { gap: 12 },
  gameCard: { borderRadius: 8, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, padding: 18 },
  gameIcon: { color: COLORS.accent, fontFamily: FONT, fontSize: 28, fontWeight: '800' },
  gameTitle: { color: COLORS.text, fontFamily: FONT, fontSize: 20, fontWeight: '800', marginTop: 14 },
  gameCopy: { color: COLORS.muted, fontFamily: FONT, fontSize: 14, lineHeight: 20, marginTop: 6 },
  challengeCard: { borderRadius: 8, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, padding: 22 },
  challengeMeta: { color: COLORS.accent, fontFamily: FONT, fontWeight: '800', fontSize: 12, letterSpacing: 0 },
  challengeQuestion: { color: COLORS.text, fontFamily: FONT, fontSize: 44, fontWeight: '800', marginTop: 22, textAlign: 'center' },
  answerInput: { minHeight: 58, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, color: COLORS.text, fontSize: 20, fontFamily: FONT, paddingHorizontal: 14, marginTop: 22 },
  primaryButton: { minHeight: 56, borderRadius: 8, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  primaryText: { color: COLORS.background, fontFamily: FONT, fontWeight: '800', fontSize: 16 },
  secondaryButton: { minHeight: 52, borderRadius: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  secondaryText: { color: COLORS.text, fontFamily: FONT, fontWeight: '800', fontSize: 15 },
  memoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  memoryCard: { width: (width - 66) / 4, aspectRatio: 1, borderRadius: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  memoryCardOpen: { backgroundColor: 'rgba(0,229,160,0.12)', borderColor: COLORS.accent },
  memoryCardText: { color: COLORS.text, fontSize: 24, fontWeight: '800' },
  tapArena: { height: 520, borderRadius: 8, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  tapMeta: { color: COLORS.text, fontFamily: FONT, fontWeight: '800', fontSize: 18, margin: 16 },
  target: { position: 'absolute', width: 58, height: 58, borderRadius: 29, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  targetText: { color: COLORS.background, fontFamily: FONT, fontSize: 30, fontWeight: '800' },
  winCard: { minHeight: height * 0.58, borderRadius: 8, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', padding: 24 },
  winIcon: { fontSize: 72 },
  winXp: { color: COLORS.gold, fontFamily: FONT, fontWeight: '800', fontSize: 28, marginTop: 20 },
  sosScreenCard: { borderRadius: 8, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', padding: 22 },
  breathCircle: { width: 190, height: 190, borderRadius: 95, borderWidth: 14, borderColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', marginVertical: 34 },
  breathText: { color: COLORS.text, fontFamily: FONT, fontWeight: '800', fontSize: 24 },
  quoteText: { color: COLORS.text, fontFamily: FONT, fontWeight: '800', fontSize: 20, lineHeight: 28, textAlign: 'center' },
  recordButton: { minHeight: 54, borderRadius: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginTop: 22 },
  recordingButton: { borderColor: COLORS.red, backgroundColor: 'rgba(255,71,87,0.12)' },
  recordText: { color: COLORS.text, fontFamily: FONT, fontWeight: '800', fontSize: 15 },
  quickStats: { flexDirection: 'row', gap: 10, marginTop: 18 },
  statChip: { flex: 1, minWidth: 92, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 12, alignItems: 'center' },
  statChipValue: { color: COLORS.text, fontFamily: FONT, fontWeight: '800', fontSize: 18 },
  statChipLabel: { color: COLORS.muted, fontFamily: FONT, fontSize: 12, marginTop: 4 },
  segment: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, padding: 4, marginBottom: 18 },
  segmentButton: { flex: 1, borderRadius: 7, minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  segmentButtonActive: { backgroundColor: COLORS.accent },
  segmentText: { color: COLORS.muted, fontFamily: FONT, fontWeight: '800', fontSize: 14 },
  segmentTextActive: { color: COLORS.background },
  arcWrap: { alignSelf: 'center', width: 220, height: 220, borderRadius: 110, alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
  arcTrack: { position: 'absolute', width: 210, height: 210, borderRadius: 105, borderWidth: 14, borderColor: 'rgba(255,255,255,0.06)' },
  arcFill: { position: 'absolute', width: 210, height: 210, borderRadius: 105, borderTopWidth: 14, borderRightWidth: 14, borderColor: COLORS.accent },
  arcCenter: { width: 142, height: 142, borderRadius: 71, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  arcValue: { color: COLORS.text, fontFamily: FONT, fontWeight: '800', fontSize: 44 },
  arcLabel: { color: COLORS.muted, fontFamily: FONT, fontWeight: '600', fontSize: 14 },
  barChart: { height: 112, flexDirection: 'row', alignItems: 'flex-end', gap: 7, backgroundColor: COLORS.card, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginVertical: 18 },
  barSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '70%', borderRadius: 4 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  analyticsCard: { width: (width - 48) / 2, borderRadius: 8, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, padding: 16 },
  analyticsValue: { fontFamily: FONT, fontWeight: '800', fontSize: 30 },
  analyticsLabel: { color: COLORS.muted, fontFamily: FONT, fontWeight: '600', fontSize: 13, marginTop: 6 },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  moodLogButton: { width: (width - 72) / 4, aspectRatio: 1, borderRadius: 8, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  moodLogText: { fontSize: 30 },
  weekMoodRow: { flexDirection: 'row', gap: 8, marginTop: 24 },
  weekMood: { flex: 1, borderRadius: 8, backgroundColor: 'rgba(0,229,160,0.08)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.24)', alignItems: 'center', paddingVertical: 12 },
  weekMoodEmoji: { fontSize: 22 },
  weekMoodDay: { color: COLORS.muted, fontFamily: FONT, fontSize: 11, marginTop: 6 },
  sectionTitle: { color: COLORS.text, fontFamily: FONT, fontSize: 22, fontWeight: '800', marginTop: 12, marginBottom: 12 },
  soundGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  soundCard: { width: (width - 48) / 2, borderRadius: 8, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, padding: 14, minHeight: 176 },
  soundEmoji: { fontSize: 28 },
  soundName: { color: COLORS.text, fontFamily: FONT, fontWeight: '800', fontSize: 16, marginTop: 10 },
  soundTag: { color: COLORS.accent, fontFamily: FONT, fontWeight: '700', fontSize: 12, marginTop: 5 },
  smallButton: { marginTop: 'auto', minHeight: 36, borderRadius: 8, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  smallButtonText: { color: COLORS.text, fontFamily: FONT, fontWeight: '800', fontSize: 13 },
  playBars: { flexDirection: 'row', gap: 4, alignItems: 'flex-end', height: 28, marginTop: 8 },
  playBar: { width: 5, borderRadius: 3, backgroundColor: COLORS.accent },
  articleCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 8, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 10 },
  articleEmoji: { fontSize: 28 },
  articleCopy: { flex: 1 },
  articleTitle: { color: COLORS.text, fontFamily: FONT, fontWeight: '800', fontSize: 16 },
  articleTopic: { color: COLORS.muted, fontFamily: FONT, fontSize: 12, marginTop: 4 },
  readBadge: { color: COLORS.accent, fontFamily: FONT, fontWeight: '800', fontSize: 12 },
  articleReaderTopic: { color: COLORS.accent, fontFamily: FONT, fontWeight: '800', fontSize: 13, marginTop: 10 },
  articleReaderTitle: { color: COLORS.text, fontFamily: FONT, fontWeight: '800', fontSize: 32, lineHeight: 38, marginTop: 10 },
  articleBody: { color: COLORS.muted, fontFamily: FONT, fontWeight: '500', fontSize: 17, lineHeight: 27, marginTop: 18 },
  communityHeader: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent },
  communityList: { padding: 18, paddingBottom: 24 },
  communityBubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 14 },
  communityBubbleRowMine: { justifyContent: 'flex-end' },
  communityAvatar: { fontSize: 24, width: 34, textAlign: 'center' },
  communityBubble: { maxWidth: '80%', borderRadius: 8, padding: 12 },
  communityBubbleOther: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  communityBubbleMine: { backgroundColor: COLORS.purple },
  communityMeta: { color: COLORS.accent, fontFamily: FONT, fontWeight: '800', fontSize: 12, marginBottom: 6 },
  communityText: { color: COLORS.text, fontFamily: FONT, fontWeight: '500', fontSize: 15, lineHeight: 21 },
  likeButton: { alignSelf: 'flex-start', marginTop: 8 },
  likeText: { color: COLORS.dim, fontFamily: FONT, fontWeight: '800', fontSize: 13 },
  likeTextActive: { color: COLORS.red },
  profileHero: { borderRadius: 8, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', padding: 22 },
  avatarBig: { width: 104, height: 104, borderRadius: 52, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  avatarBigText: { fontSize: 48 },
  avatarLevel: { position: 'absolute', right: -8, bottom: 0 },
  profileName: { color: COLORS.text, fontFamily: FONT, fontWeight: '800', fontSize: 24, marginTop: 16 },
  profileXp: { color: COLORS.muted, fontFamily: FONT, fontWeight: '600', fontSize: 14, marginTop: 4 },
  xpTrack: { width: '100%', height: 12, borderRadius: 6, backgroundColor: COLORS.surface, overflow: 'hidden', marginTop: 18 },
  xpFill: { height: '100%', borderRadius: 6, backgroundColor: COLORS.accent },
  profileStats: { flexDirection: 'row', gap: 10, marginTop: 16 },
  settingRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 8, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, marginBottom: 10 },
  settingLabel: { color: COLORS.text, fontFamily: FONT, fontWeight: '700', fontSize: 15 },
  accountRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 8, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, marginBottom: 10 },
  accountText: { color: COLORS.text, fontFamily: FONT, fontWeight: '700', fontSize: 15 },
});
