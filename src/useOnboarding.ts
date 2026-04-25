import { useColorScheme } from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated } from 'react-native';

import {
  createTheme,
  INITIAL_ANSWERS,
  type AnswerField,
  type Answers,
  type QuizKey,
} from './onboarding.state';
import {
  applyFieldValue,
  applyQuizAnswer,
  buildStats,
  canContinuePersonalInfo,
  toggleSymptomValue,
} from './onboarding.handlers';

export type OnboardingController = {
  theme: ReturnType<typeof createTheme>;
  colors: ReturnType<typeof createTheme>['colors'];
  screenIndex: number;
  answers: Answers;
  xp: number;
  xpPopup: { visible: boolean; amount: number };
  finalBurstKey: number;
  stats: ReturnType<typeof buildStats>;
  opacity: Animated.Value;
  translateY: Animated.Value;
  coffeePulse: Animated.Value;
  personalPulse: Animated.Value;
  canContinuePersonalInfo: boolean;
  setFieldValue: (field: AnswerField, value: string) => void;
  handleQuizSelect: (key: QuizKey, option: string) => void;
  toggleSymptom: (symptom: string) => void;
  goNext: (amount?: number) => void;
  triggerFinalBurst: () => void;
};

export function useOnboarding(): OnboardingController {
  const scheme = useColorScheme();
  const theme = useMemo(() => createTheme(scheme === 'light' ? 'light' : 'dark'), [scheme]);
  const colors = theme.colors;

  const [screenIndex, setScreenIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>(INITIAL_ANSWERS);
  const [xp, setXp] = useState(0);
  const [xpPopup, setXpPopup] = useState({ visible: false, amount: 10 });
  const [finalBurstKey, setFinalBurstKey] = useState(0);

  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const coffeePulse = useRef(new Animated.Value(0)).current;
  const personalPulse = useRef(new Animated.Value(0)).current;
  const transitionLock = useRef(false);
  const quizTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalBonusGiven = useRef(false);

  const stats = useMemo(() => buildStats(answers), [answers]);

  useEffect(() => {
    return () => {
      if (quizTimer.current) {
        clearTimeout(quizTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (screenIndex === 23 && !finalBonusGiven.current) {
      awardXp(100);
      finalBonusGiven.current = true;
      setFinalBurstKey((value) => value + 1);
    }
  }, [screenIndex]);

  function awardXp(amount: number) {
    setXp((value) => value + amount);
    setXpPopup({ visible: true, amount });
    setTimeout(() => {
      setXpPopup((value) => ({ ...value, visible: false }));
    }, 1200);
  }

  function transitionTo(nextIndex: number, amount = 10) {
    if (transitionLock.current || nextIndex < 0 || nextIndex > 23) {
      return;
    }

    transitionLock.current = true;
    awardXp(amount);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -14,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setScreenIndex(nextIndex);
      opacity.setValue(0);
      translateY.setValue(24);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]).start(() => {
        transitionLock.current = false;
      });
    });
  }

  return {
    theme,
    colors,
    screenIndex,
    answers,
    xp,
    xpPopup,
    finalBurstKey,
    stats,
    opacity,
    translateY,
    coffeePulse,
    personalPulse,
    canContinuePersonalInfo: canContinuePersonalInfo(answers),
    setFieldValue: (field, value) => setAnswers((current) => applyFieldValue(current, field, value)),
    handleQuizSelect: (key, option) => {
      if (transitionLock.current) {
        return;
      }

      setAnswers((current) => applyQuizAnswer(current, key, option));

      if (quizTimer.current) {
        clearTimeout(quizTimer.current);
      }

      quizTimer.current = setTimeout(() => {
        transitionTo(screenIndex + 1, 10);
      }, 350);
    },
    toggleSymptom: (symptom) => setAnswers((current) => toggleSymptomValue(current, symptom)),
    goNext: (amount = 10) => transitionTo(screenIndex + 1, amount),
    triggerFinalBurst: () => setFinalBurstKey((value) => value + 1),
  };
}
