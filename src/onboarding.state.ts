export type ThemeMode = 'light' | 'dark';

export type Theme = {
  mode: ThemeMode;
  colors: {
    background: string;
    surface: string;
    surfaceRaised: string;
    accent: string;
    accentSoft: string;
    gold: string;
    red: string;
    blue: string;
    purple: string;
    pink: string;
    text: string;
    textMuted: string;
    border: string;
    black: string;
    white: string;
    orbA: string;
    orbB: string;
    grid: string;
    sceneBase: string;
  };
};

export const FONT_FAMILY = 'System';

export const GLYPHS = {
  lock: '\uD83D\uDD13',
  fire: '\uD83D\uDD25',
  sad: '\uD83D\uDE14',
  heart: '\u2764\uFE0F',
  bolt: '\u26A1',
  flex: '\uD83D\uDCAA',
  target: '\uD83C\uDFAF',
  coffee: '\u2615',
  apple: '\uF8FF',
  mail: '\u2709',
  shield: '\uD83D\uDEE1',
  chart: '\uD83D\uDCC8',
  people: '\uD83D\uDC65',
  seed: '\uD83C\uDF31',
  tree: '\uD83C\uDF33',
  google: '\u25CF',
  brain: '\uD83E\uDDE0',
  thought: '\uD83D\uDCAD',
  fog: '\uD83C\uDF2B\uFE0F',
  lowBattery: '\uD83E\uDEAB',
  chartDown: '\uD83D\uDCC9',
  warning: '\u26A0\uFE0F',
  muted: '\uD83E\uDEE5',
  avoid: '\uD83D\uDE36',
  phone: '\uD83D\uDCF5',
  brokenHeart: '\uD83D\uDC94',
  cloud: '\uD83C\uDF27\uFE0F',
  lockSmall: '\uD83D\uDD12',
  sparkles: '\u2728',
  handshake: '\uD83E\uDD1D',
  runner: '\uD83C\uDFC3',
  sun: '\u2600\uFE0F',
  crown: '\uD83D\uDC51',
  rocket: '\uD83D\uDE80',
};

export type QuizKey =
  | 'gender'
  | 'ageRange'
  | 'firstExposure'
  | 'pornFrequency'
  | 'goonFrequency'
  | 'sessionLength'
  | 'triedBefore'
  | 'quitReason';

export type AnswerField = keyof Omit<Answers, 'symptoms'>;

export type Answers = {
  gender: string;
  ageRange: string;
  firstExposure: string;
  pornFrequency: string;
  goonFrequency: string;
  sessionLength: string;
  triedBefore: string;
  quitReason: string;
  firstName: string;
  exactAge: string;
  symptoms: string[];
};

export type QuizScreen = {
  key: QuizKey;
  title: string;
  subtitle: string;
  options: string[];
};

export type IllustrationMood =
  | 'brainFog'
  | 'lowDrive'
  | 'socialShutdown'
  | 'intimacyFailure'
  | 'relationshipAlive'
  | 'energyUnlocked'
  | 'confidenceUp'
  | 'purposeLocked';

export type IllustrationScreen = {
  label: string;
  title: string;
  mood: IllustrationMood;
  accent: string;
  bullets: string[];
  floaters: [string, string, string];
};

const SHARED = {
  accent: '#00E5A0',
  gold: '#FFB800',
  red: '#FF4757',
  blue: '#52C7FF',
  purple: '#7D6BFF',
  pink: '#FF6A93',
  black: '#000000',
  white: '#FFFFFF',
};

export function createTheme(mode: ThemeMode): Theme {
  return {
    mode: 'dark',
    colors: {
      ...SHARED,
      accent: '#4ADE80',
      gold: '#F4D35E',
      red: '#FF7D7D',
      blue: '#7BD9FF',
      purple: '#9488FF',
      pink: '#FF8FB1',
      background: '#0A0F14',
      surface: '#151D24',
      surfaceRaised: '#1A252D',
      accentSoft: 'rgba(74,222,128,0.14)',
      text: '#F3F7FB',
      textMuted: '#97A7B3',
      border: 'rgba(134,149,161,0.22)',
      orbA: 'rgba(74,222,128,0.16)',
      orbB: 'rgba(182,233,53,0.10)',
      grid: 'rgba(255,255,255,0.035)',
      sceneBase: '#1A242C',
    },
  };
}

export const QUIZ_SCREENS: QuizScreen[] = [
  {
    key: 'gender',
    title: 'Who are you?',
    subtitle: 'Choose the identity that fits your journey.',
    options: ['Man', 'Woman', 'Non-binary', 'Prefer not to say'],
  },
  {
    key: 'ageRange',
    title: 'What is your age range?',
    subtitle: 'We use this to calibrate your recovery plan.',
    options: ['13-17', '18-24', '25-34', '35-44', '45+'],
  },
  {
    key: 'firstExposure',
    title: 'When were you first exposed to porn?',
    subtitle: 'Early exposure usually makes the loop harder to break.',
    options: ['Before 10', '10-12', '13-15', '16-18', '19+'],
  },
  {
    key: 'pornFrequency',
    title: 'How often do you watch porn?',
    subtitle: 'Answer honestly. Freeman works better with real data.',
    options: ['Rarely', '1-2 times a week', '3-5 times a week', 'Daily', 'Multiple times a day'],
  },
  {
    key: 'goonFrequency',
    title: 'How often do you goon?',
    subtitle: 'This helps estimate how deep the habit loop runs.',
    options: ['1-2 times a month', 'A few times a week', 'Daily', 'Multiple times a day'],
  },
  {
    key: 'sessionLength',
    title: 'How long does a typical gooning session last?',
    subtitle: 'Longer sessions usually mean stronger compulsion patterns.',
    options: ['Under 15 min', '15-30 min', '30-60 min', '1-2 hours', '2+ hours'],
  },
  {
    key: 'triedBefore',
    title: 'Have you tried to quit before?',
    subtitle: 'Relapse history helps us personalize support.',
    options: ['Never', 'Once', 'A few times', 'Too many times to count'],
  },
  {
    key: 'quitReason',
    title: 'Why do you want to quit?',
    subtitle: 'Your reason becomes your anchor when urges hit.',
    options: ['Mental clarity', 'Better relationships', 'More energy', 'Confidence', 'All of the above'],
  },
];

export const SYMPTOMS = [
  'Brain fog',
  'Low energy',
  'Social anxiety',
  'No motivation',
  'Mood swings',
  'Poor sleep',
  'Low confidence',
  'Compulsive urges',
  'Lost purpose',
];

export const EFFECT_SCREENS: IllustrationScreen[] = [
  {
    label: 'Effect 1',
    title: 'Brain Fog & Cognitive Damage',
    mood: 'brainFog',
    accent: SHARED.red,
    bullets: ['Focus fragments faster', 'Memory feels dull', 'Deep work becomes exhausting'],
    floaters: [GLYPHS.brain, GLYPHS.thought, GLYPHS.fog],
  },
  {
    label: 'Effect 2',
    title: 'Testosterone Crash',
    mood: 'lowDrive',
    accent: SHARED.gold,
    bullets: ['Drive gets flattened', 'Training intensity drops', 'Masculine edge starts fading'],
    floaters: [GLYPHS.lowBattery, GLYPHS.chartDown, GLYPHS.warning],
  },
  {
    label: 'Effect 3',
    title: 'Social Shutdown',
    mood: 'socialShutdown',
    accent: SHARED.purple,
    bullets: ['Eye contact gets harder', 'Charm turns awkward', 'Isolation starts feeling normal'],
    floaters: [GLYPHS.muted, GLYPHS.avoid, GLYPHS.phone],
  },
  {
    label: 'Effect 4',
    title: 'Intimacy Failure',
    mood: 'intimacyFailure',
    accent: SHARED.pink,
    bullets: ['Connection feels distant', 'Real attraction gets muted', 'Romance loses its spark'],
    floaters: [GLYPHS.brokenHeart, GLYPHS.cloud, GLYPHS.lockSmall],
  },
];

export const LIFE_AFTER_SCREENS: IllustrationScreen[] = [
  {
    label: 'Life 1',
    title: `Relationships Come Alive ${GLYPHS.heart}`,
    mood: 'relationshipAlive',
    accent: SHARED.pink,
    bullets: ['Presence replaces numbness', 'Connection feels natural', 'Affection becomes easy again'],
    floaters: [GLYPHS.heart, GLYPHS.sparkles, GLYPHS.handshake],
  },
  {
    label: 'Life 2',
    title: `Energy Unleashed ${GLYPHS.bolt}`,
    mood: 'energyUnlocked',
    accent: SHARED.gold,
    bullets: ['Mornings start with momentum', 'Workouts feel explosive', 'Your body carries fire again'],
    floaters: [GLYPHS.bolt, GLYPHS.runner, GLYPHS.sun],
  },
  {
    label: 'Life 3',
    title: `Unshakeable Confidence ${GLYPHS.flex}`,
    mood: 'confidenceUp',
    accent: SHARED.accent,
    bullets: ['Posture changes first', 'You speak with conviction', 'Discipline feels natural'],
    floaters: [GLYPHS.flex, GLYPHS.fire, GLYPHS.crown],
  },
  {
    label: 'Life 4',
    title: `Crystal Clear Purpose ${GLYPHS.target}`,
    mood: 'purposeLocked',
    accent: SHARED.blue,
    bullets: ['Mission beats distraction', 'Your time compounds', 'You move with direction'],
    floaters: [GLYPHS.target, GLYPHS.rocket, GLYPHS.chart],
  },
];

export const FEATURE_STRIP = [
  `${GLYPHS.chart} AI Therapist`,
  `${GLYPHS.shield} Urge Shield`,
  `${GLYPHS.bolt} 90-Day Program`,
  `${GLYPHS.people} Community`,
];

export const FINAL_FEATURE_ICONS = [GLYPHS.chart, GLYPHS.shield, GLYPHS.bolt, GLYPHS.people];

export const INITIAL_ANSWERS: Answers = {
  gender: '',
  ageRange: '',
  firstExposure: '',
  pornFrequency: '',
  goonFrequency: '',
  sessionLength: '',
  triedBefore: '',
  quitReason: '',
  firstName: '',
  exactAge: '',
  symptoms: [],
};
