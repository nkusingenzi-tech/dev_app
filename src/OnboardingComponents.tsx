import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { buildStats, roundNumber } from './onboarding.handlers';
import type { OnboardingController } from './useOnboarding';
import {
  EFFECT_SCREENS,
  FEATURE_STRIP,
  FINAL_FEATURE_ICONS,
  FONT_FAMILY,
  GLYPHS,
  LIFE_AFTER_SCREENS,
  QUIZ_SCREENS,
  SYMPTOMS,
  type IllustrationScreen,
  type Theme,
} from './onboarding.state';

const { width, height } = Dimensions.get('window');

export function OnboardingView({ controller }: { controller: OnboardingController }) {
  const { theme, colors } = controller;

  useEffect(() => {
    if (controller.screenIndex !== 9) {
      return undefined;
    }

    controller.personalPulse.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(controller.personalPulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(controller.personalPulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [controller.personalPulse, controller.screenIndex]);

  useEffect(() => {
    if (controller.screenIndex !== 21) {
      return undefined;
    }

    controller.coffeePulse.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(controller.coffeePulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.back(1.8)),
          useNativeDriver: true,
        }),
        Animated.timing(controller.coffeePulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [controller.coffeePulse, controller.screenIndex]);

  function renderQuizScreen() {
    const quizIndex = controller.screenIndex - 1;
    const item = QUIZ_SCREENS[quizIndex];

    return (
      <View>
        <ProgressBar step={quizIndex + 1} theme={theme} />
        <Text style={[styles.kicker, { color: colors.accent }]}>{`Question ${quizIndex + 1}`}</Text>
        <Text style={[styles.heroTitle, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>{item.subtitle}</Text>
        <Text style={[styles.helperCopy, { color: colors.textMuted }]}>Tap once. We keep the setup fast and private.</Text>
        <View style={styles.optionList}>
          {item.options.map((option) => (
            <CardOption
              key={option}
              label={option}
              active={controller.answers[item.key] === option}
              onPress={() => controller.handleQuizSelect(item.key, option)}
              theme={theme}
            />
          ))}
        </View>
      </View>
    );
  }

  function renderContent() {
    if (controller.screenIndex >= 1 && controller.screenIndex <= 8) {
      return renderQuizScreen();
    }

    if (controller.screenIndex >= 12 && controller.screenIndex <= 15) {
      const item = EFFECT_SCREENS[controller.screenIndex - 12];
      return (
        <View>
          <SectionPill label={item.label} color={item.accent} />
          <Text style={[styles.heroTitle, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
            This is what repeated overstimulation does over time.
          </Text>
          <IllustrationScene scene={item} theme={theme} />
          <View style={styles.bulletStack}>
            {item.bullets.map((bullet, index) => (
              <View key={bullet} style={[styles.numberedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.numberBubble, { backgroundColor: item.accent }]}>
                  <Text style={[styles.numberBubbleText, { color: colors.black }]}>{index + 1}</Text>
                </View>
                <Text style={[styles.numberedCopy, { color: colors.text }]}>{bullet}</Text>
              </View>
            ))}
          </View>
          <PrimaryButton label="Continue ->" onPress={() => controller.goNext(10)} theme={theme} />
        </View>
      );
    }

    if (controller.screenIndex >= 17 && controller.screenIndex <= 20) {
      const item = LIFE_AFTER_SCREENS[controller.screenIndex - 17];
      return (
        <View>
          <SectionPill label={item.label} color={item.accent} />
          <Text style={[styles.heroTitle, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
            This is the version of you waiting on the other side of recovery.
          </Text>
          <IllustrationScene scene={item} theme={theme} />
          <View style={styles.bulletStack}>
            {item.bullets.map((bullet) => (
              <View key={bullet} style={[styles.benefitRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.checkBullet, { backgroundColor: `${item.accent}22`, borderColor: item.accent }]}>
                  <Text style={[styles.checkBulletText, { color: item.accent }]}>OK</Text>
                </View>
                <Text style={[styles.numberedCopy, { color: colors.text }]}>{bullet}</Text>
              </View>
            ))}
          </View>
          <PrimaryButton label="Continue ->" onPress={() => controller.goNext(10)} theme={theme} />
        </View>
      );
    }

    switch (controller.screenIndex) {
      case 0:
        return (
          <View style={styles.centeredHero}>
            <View style={styles.topBadgeRow}>
              <View style={[styles.miniBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.miniBadgeText, { color: colors.text }]}>{`${GLYPHS.fire} Streak Ready`}</Text>
              </View>
              <View style={[styles.miniBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.miniBadgeText, { color: colors.text }]}>Private Setup</Text>
              </View>
            </View>
            <View style={[styles.previewCard, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
              <View style={[styles.previewGlow, { backgroundColor: colors.orbA }]} />
              <Text style={[styles.previewPill, { color: colors.accent, borderColor: colors.accent }]}>{`17 DAY CLEAN STREAK`}</Text>
              <View style={styles.previewRow}>
                <View style={styles.previewCopy}>
                  <Text style={[styles.previewTitle, { color: colors.text }]}>Brain stabilizing.</Text>
                  <Text style={[styles.previewSubtitle, { color: colors.textMuted }]}>
                    Protect tonight and tomorrow gets easier.
                  </Text>
                </View>
                <FloatingLock theme={theme} />
              </View>
              <View style={styles.previewStats}>
                <View style={[styles.previewStat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.previewStatLabel, { color: colors.textMuted }]}>Urges</Text>
                  <Text style={[styles.previewStatValue, { color: colors.text }]}>3</Text>
                </View>
                <View style={[styles.previewStat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.previewStatLabel, { color: colors.textMuted }]}>Sleep</Text>
                  <Text style={[styles.previewStatValue, { color: colors.text }]}>+48m</Text>
                </View>
                <View style={[styles.previewStat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.previewStatLabel, { color: colors.textMuted }]}>Focus</Text>
                  <Text style={[styles.previewStatValue, { color: colors.text }]}>86%</Text>
                </View>
              </View>
            </View>
            <Text style={[styles.brandTitle, { color: colors.text }]}>FREEMAN</Text>
            <Text style={[styles.splashTagline, { color: colors.text }]}>Break the loop. Build the man.</Text>
            <Text style={[styles.socialProof, { color: colors.textMuted }]}>Science-based recovery for men who want their edge back.</Text>
            <PrimaryButton label="Begin Journey" onPress={() => controller.goNext(10)} style={styles.splashButton} theme={theme} />
          </View>
        );

      case 9:
        return (
          <View>
            <Text style={[styles.kicker, { color: colors.accent }]}>Personalize It</Text>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Before we build your recovery path, tell us who you are.</Text>
            <Animated.Text
              style={[
                styles.personalPrompt,
                {
                  color: colors.gold,
                  opacity: controller.personalPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.55, 1],
                  }),
                  transform: [
                    {
                      translateY: controller.personalPulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -4],
                      }),
                    },
                  ],
                },
              ]}
            >
              Let&apos;s make this personal.
            </Animated.Text>
            <View style={styles.inputShell}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>First name</Text>
              <TextInput
                value={controller.answers.firstName}
                onChangeText={(value) => controller.setFieldValue('firstName', value)}
                placeholder="Enter your first name"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              />
            </View>
            <View style={styles.inputShell}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Exact age</Text>
              <TextInput
                value={controller.answers.exactAge}
                onChangeText={(value) => controller.setFieldValue('exactAge', value)}
                placeholder="Enter your age"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              />
            </View>
            <PrimaryButton
              label="Continue ->"
              disabled={!controller.canContinuePersonalInfo}
              onPress={() => controller.goNext(10)}
              theme={theme}
            />
          </View>
        );

      case 10:
        return (
          <View>
            <StatReveal stats={controller.stats} theme={theme} />
            <PrimaryButton label="Continue ->" onPress={() => controller.goNext(10)} theme={theme} />
          </View>
        );

      case 11:
        return (
          <View>
            <Text style={[styles.kicker, { color: colors.accent }]}>Symptoms Scan</Text>
            <Text style={[styles.heroTitle, { color: colors.text }]}>What has this habit been doing to you lately?</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>Select every symptom that feels true right now.</Text>
            <View style={styles.symptomGrid}>
              {SYMPTOMS.map((symptom) => {
                const selected = controller.answers.symptoms.includes(symptom);
                return (
                  <Pressable
                    key={symptom}
                    onPress={() => controller.toggleSymptom(symptom)}
                    style={({ pressed }) => [
                      styles.symptomPill,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      selected && { backgroundColor: colors.accentSoft, borderColor: colors.accent },
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text style={[styles.symptomText, { color: colors.text }]}>{symptom}</Text>
                  </Pressable>
                );
              })}
            </View>
            <PrimaryButton
              label={`Continue (${controller.answers.symptoms.length}) ->`}
              disabled={controller.answers.symptoms.length === 0}
              onPress={() => controller.goNext(10)}
              theme={theme}
            />
          </View>
        );

      case 16:
        return (
          <View>
            <Text style={[styles.kicker, { color: colors.accent }]}>Hope & Rewiring</Text>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Your Brain Can Fully Rewire.</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
              Recovery is not wishful thinking. It is biological repair, repeated day after day.
            </Text>
            <PlantGrowth theme={theme} />
            <PrimaryButton label="Continue ->" onPress={() => controller.goNext(10)} theme={theme} />
          </View>
        );

      case 21:
        return (
          <View>
            <Text style={[styles.kicker, { color: colors.accent }]}>Value Check</Text>
            <Text style={[styles.heroTitle, { color: colors.text }]}>{`Less than your daily coffee ${GLYPHS.coffee}`}</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
              For the price of 2 coffees a month, reclaim your entire life.
            </Text>
            <CoffeeComparison pulse={controller.coffeePulse} theme={theme} />
            <View style={styles.featureList}>
              {FEATURE_STRIP.map((feature) => (
                <View key={feature} style={[styles.featureRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.featureCheck, { color: colors.accent }]}>OK</Text>
                  <Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text>
                </View>
              ))}
            </View>
            <PrimaryButton label="Start Free Trial" onPress={() => controller.goNext(10)} theme={theme} />
          </View>
        );

      case 22:
        return (
          <View>
            <Text style={[styles.kicker, { color: colors.accent }]}>Account</Text>
            <Text style={[styles.heroTitle, { color: colors.text }]}>{`Join the Movement ${GLYPHS.lock}`}</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
              Create your Freeman account and lock in your recovery streak.
            </Text>
            <View style={styles.authStack}>
              <AuthOption
                label={`${GLYPHS.apple} Continue with Apple`}
                style={{ backgroundColor: colors.black, borderColor: '#1F1F1F' }}
                textStyle={{ color: colors.white }}
                onPress={() => controller.goNext(10)}
              />
              <AuthOption
                label={`${GLYPHS.google} Continue with Google`}
                style={{ backgroundColor: colors.white, borderColor: '#E5E7EB' }}
                textStyle={{ color: '#1F2937' }}
                onPress={() => controller.goNext(10)}
              />
              <AuthOption
                label={`${GLYPHS.mail} Continue with Email`}
                style={{ backgroundColor: colors.accent, borderColor: colors.accent }}
                textStyle={{ color: colors.black }}
                onPress={() => controller.goNext(10)}
              />
            </View>
            <Pressable onPress={() => controller.goNext(10)} style={({ pressed }) => [pressed && styles.buttonPressed]}>
              <Text style={[styles.signInLink, { color: colors.text }]}>Already have an account? Sign in</Text>
            </Pressable>
            <Text style={[styles.termsCopy, { color: colors.textMuted }]}>By continuing you agree to our Terms & Privacy Policy</Text>
          </View>
        );

      case 23:
        return (
          <View style={styles.finalScreen}>
            <ConfettiBurst burstKey={controller.finalBurstKey} theme={theme} />
            <Text style={styles.finalLock}>{GLYPHS.lock}</Text>
            <Text style={[styles.finalTitle, { color: colors.text }]}>BECOME A FREEMAN</Text>
            <Text style={[styles.finalSubtitle, { color: colors.textMuted }]}>
              Quit gooning and porn. Reclaim your testosterone, your confidence, and your destiny.
            </Text>
            <LevelBadge theme={theme} />
            <View style={styles.featureStripGrid}>
              {FINAL_FEATURE_ICONS.map((icon) => (
                <View key={icon} style={[styles.featureStripItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={styles.featureStripIcon}>{icon}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.totalXp, { color: colors.gold }]}>{`${controller.xp} XP Earned`}</Text>
            <PrimaryButton label="Start My Recovery Today" onPress={() => controller.triggerFinalBurst()} theme={theme} />
            <Text style={[styles.finalProof, { color: colors.textMuted }]}>2,000,000+ freemen worldwide.</Text>
          </View>
        );

      default:
        return null;
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardWrap}>
        <View style={[styles.backgroundOrbA, { backgroundColor: colors.orbA }]} />
        <View style={[styles.backgroundOrbB, { backgroundColor: colors.orbB }]} />
        <View style={[styles.backgroundGrid, { borderColor: colors.grid }]} />
        <XPPopup visible={controller.xpPopup.visible} amount={controller.xpPopup.amount} theme={theme} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.appHeader}>
            <View>
              <Text style={[styles.appHeaderBrand, { color: colors.text }]}>FREEMAN</Text>
              <Text style={[styles.appHeaderSubtitle, { color: colors.textMuted }]}>Science-based recovery</Text>
            </View>
            <View style={[styles.appHeaderBadge, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
              <Text style={[styles.appHeaderBadgeText, { color: colors.accent }]}>
                {controller.screenIndex === 0 ? 'START' : controller.screenIndex === 23 ? 'READY' : `${controller.screenIndex}/23`}
              </Text>
            </View>
          </View>
          <Animated.View style={[styles.screen, { opacity: controller.opacity, transform: [{ translateY: controller.translateY }] }]}>
            <View
              style={[
                styles.screenCard,
                controller.screenIndex === 0 && styles.screenCardSplash,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {renderContent()}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  style,
  theme,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: object;
  theme: Theme;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: theme.colors.accent },
        disabled && styles.primaryButtonDisabled,
        pressed && !disabled && styles.buttonPressed,
        style,
      ]}
    >
      <Text style={[styles.primaryButtonText, { color: theme.colors.black }]}>{label}</Text>
    </Pressable>
  );
}

function CardOption({
  label,
  active,
  onPress,
  theme,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  theme: Theme;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
        active && {
          backgroundColor: theme.colors.accentSoft,
          borderColor: theme.colors.accent,
        },
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={[styles.optionText, { color: theme.colors.text }]}>{label}</Text>
      <View
        style={[
          styles.optionCheck,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surfaceRaised,
          },
          active && {
            borderColor: theme.colors.accent,
            backgroundColor: theme.colors.accent,
          },
        ]}
      >
        <Text style={[styles.optionCheckText, { color: active ? theme.colors.black : theme.colors.textMuted }]}>
          {active ? 'OK' : ''}
        </Text>
      </View>
    </Pressable>
  );
}

function ProgressBar({ step, theme }: { step: number; theme: Theme }) {
  const progress = useRef(new Animated.Value(step / 8)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: step / 8,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, step]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.progressShell}>
      <View style={styles.progressMeta}>
        <Text style={[styles.progressLabel, { color: theme.colors.textMuted }]}>Recovery Assessment</Text>
        <Text style={[styles.progressValue, { color: theme.colors.text }]}>{step}/8</Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border }]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: theme.colors.accent,
              width: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.progressOrb,
            {
              borderColor: theme.colors.accent,
              left: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, width - 100],
              }),
              transform: [
                {
                  scale: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.12],
                  }),
                },
              ],
            },
          ]}
        />
      </View>
    </View>
  );
}

function XPPopup({
  visible,
  amount,
  theme,
}: {
  visible: boolean;
  amount: number;
  theme: Theme;
}) {
  const motion = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    motion.setValue(0);
    Animated.sequence([
      Animated.timing(motion, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.back(2)),
        useNativeDriver: true,
      }),
      Animated.timing(motion, {
        toValue: 0,
        duration: 420,
        delay: 420,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    return undefined;
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
          backgroundColor: theme.colors.accent,
          opacity: motion,
          transform: [
            {
              translateY: motion.interpolate({
                inputRange: [0, 1],
                outputRange: [14, -24],
              }),
            },
            {
              scale: motion.interpolate({
                inputRange: [0, 1],
                outputRange: [0.85, 1.06],
              }),
            },
          ],
        },
      ]}
    >
      <Text style={[styles.xpPopupText, { color: theme.colors.black }]}>{`+${amount} XP`}</Text>
    </Animated.View>
  );
}

function FloatingLock({ theme }: { theme: Theme }) {
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  return (
    <Animated.Text
      style={[
        styles.lockEmoji,
        {
          color: theme.colors.text,
          transform: [
            {
              translateY: bob.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -16],
              }),
            },
            {
              rotate: bob.interpolate({
                inputRange: [0, 1],
                outputRange: ['-5deg', '5deg'],
              }),
            },
          ],
        },
      ]}
    >
      {GLYPHS.lock}
    </Animated.Text>
  );
}

function PlantGrowth({ theme }: { theme: Theme }) {
  const growth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    growth.setValue(0);
    Animated.timing(growth, {
      toValue: 1,
      duration: 1800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [growth]);

  return (
    <View style={[styles.plantCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={[styles.plantTitle, { color: theme.colors.text }]}>Recovery Timeline</Text>
      <View style={styles.plantStage}>
        <View style={styles.plantSoil} />
        <Animated.View
          style={[
            styles.plantStem,
            {
              backgroundColor: theme.colors.accent,
              transform: [
                {
                  scaleY: growth.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.12, 1],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.Text
          style={[
            styles.seedEmoji,
            {
              opacity: growth.interpolate({
                inputRange: [0, 0.3],
                outputRange: [1, 0],
                extrapolate: 'clamp',
              }),
            },
          ]}
        >
          {GLYPHS.seed}
        </Animated.Text>
        <Animated.Text
          style={[
            styles.treeEmoji,
            {
              opacity: growth.interpolate({
                inputRange: [0.28, 1],
                outputRange: [0, 1],
                extrapolate: 'clamp',
              }),
              transform: [
                {
                  scale: growth.interpolate({
                    inputRange: [0.3, 1],
                    outputRange: [0.4, 1],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}
        >
          {GLYPHS.tree}
        </Animated.Text>
      </View>
      <View style={styles.timelineRow}>
        {[
          ['7 days', 'CALM', 'Urges settle'],
          ['30 days', 'ENERGY', 'Drive rebounds'],
          ['90 days', 'REWIRE', 'Identity changes'],
        ].map(([title, icon, copy]) => (
          <View key={title} style={[styles.timelineItem, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border }]}>
            <Text style={[styles.timelineIcon, { color: theme.colors.accent }]}>{icon}</Text>
            <Text style={[styles.timelineLabel, { color: theme.colors.text }]}>{title}</Text>
            <Text style={[styles.timelineCopy, { color: theme.colors.textMuted }]}>{copy}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function StatReveal({
  stats,
  theme,
}: {
  stats: ReturnType<typeof buildStats>;
  theme: Theme;
}) {
  const counter = useRef(new Animated.Value(0)).current;
  const entrance = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const bounce = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = React.useState({
    days: 0,
    hours: 0,
    testosterone: 0,
    calories: 0,
  });

  useEffect(() => {
    const id = counter.addListener(({ value }) => {
      setDisplay({
        days: Math.round(stats.timeLostDays * value),
        hours: Math.round(stats.timeLostHours * value),
        testosterone: Math.round(stats.testosteroneDrop * value),
        calories: Math.round(stats.calories * value),
      });
    });

    counter.setValue(0);
    entrance.forEach((item) => item.setValue(0));
    bounce.setValue(0);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 650,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();

    Animated.parallel([
      Animated.timing(counter, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.stagger(
        140,
        entrance.map((item) =>
          Animated.spring(item, {
            toValue: 1,
            friction: 8,
            tension: 70,
            useNativeDriver: true,
          }),
        ),
      ),
    ]).start();

    return () => {
      loop.stop();
      counter.removeListener(id);
    };
  }, [bounce, counter, entrance, stats]);

  const cards = [
    {
      title: 'Total time lost',
      value: `${roundNumber(display.days)} days ${display.hours} hrs`,
      accent: theme.colors.red,
      copy: 'Time redirected into compulsive gooning instead of mission, health, and relationships.',
    },
    {
      title: 'Testosterone drop',
      value: `${display.testosterone}%`,
      accent: theme.colors.gold,
      copy: 'Estimated drive suppression tied to repeated overstimulation and dopamine burnout.',
    },
    {
      title: 'Calories burned',
      value: roundNumber(display.calories),
      accent: theme.colors.accent,
      copy: 'Energy spent with no strength built, no peace earned, and no future created.',
    },
  ];

  return (
    <View>
      <Animated.Text
        style={[
          styles.statsEmoji,
          {
            transform: [
              {
                translateY: bounce.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -10],
                }),
              },
            ],
          },
        ]}
      >
        {GLYPHS.sad}
      </Animated.Text>
      <Text style={[styles.heroTitle, { color: theme.colors.text }]}>{`${stats.name}, this is what the loop has cost.`}</Text>
      <Text style={[styles.heroSubtitle, { color: theme.colors.textMuted }]}>
        The good news is your recovery can start compounding immediately.
      </Text>
      {cards.map((card, index) => (
        <Animated.View
          key={card.title}
          style={[
            styles.statCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: card.accent,
              opacity: entrance[index],
              transform: [
                {
                  translateY: entrance[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [24, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={[styles.statLabel, { color: card.accent }]}>{card.title}</Text>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>{card.value}</Text>
          <Text style={[styles.statCopy, { color: theme.colors.textMuted }]}>{card.copy}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

function CoffeeComparison({
  pulse,
  theme,
}: {
  pulse: Animated.Value;
  theme: Theme;
}) {
  return (
    <View style={styles.coffeeGrid}>
      <View style={[styles.compareCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.compareEmoji, { color: theme.colors.text }]}>{GLYPHS.coffee}</Text>
        <Text style={[styles.compareTitle, { color: theme.colors.text }]}>Daily Coffee</Text>
        <Text style={[styles.comparePrice, { color: theme.colors.text }]}>$4/day</Text>
        <Text style={[styles.compareSub, { color: theme.colors.textMuted }]}>$120/month</Text>
      </View>
      <Animated.View
        style={[
          styles.compareCard,
          {
            backgroundColor: theme.colors.accentSoft,
            borderColor: theme.colors.accent,
            transform: [
              {
                scale: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.06],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={[styles.compareEmoji, { color: theme.colors.text }]}>{GLYPHS.lock}</Text>
        <Text style={[styles.compareTitle, { color: theme.colors.text }]}>Freeman</Text>
        <Text style={[styles.comparePrice, { color: theme.colors.accent }]}>$8/month</Text>
        <Text style={[styles.compareSub, { color: theme.colors.text }]}>$0.27/day</Text>
      </Animated.View>
    </View>
  );
}

function AuthOption({
  label,
  style,
  textStyle,
  onPress,
}: {
  label: string;
  style: object;
  textStyle?: object;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.authOption, style, pressed && styles.buttonPressed]}>
      <Text style={[styles.authOptionText, textStyle]}>{label}</Text>
    </Pressable>
  );
}

function ConfettiBurst({
  burstKey,
  theme,
}: {
  burstKey: number;
  theme: Theme;
}) {
  const pieces = useRef(Array.from({ length: 18 }, () => new Animated.Value(0))).current;

  useEffect(() => {
    pieces.forEach((item) => item.setValue(0));
    Animated.stagger(
      18,
      pieces.map((item) =>
        Animated.timing(item, {
          toValue: 1,
          duration: 1100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [burstKey, pieces]);

  return (
    <View pointerEvents="none" style={styles.confettiWrap}>
      {pieces.map((item, index) => {
        const angle = (Math.PI * 2 * index) / pieces.length;
        const distance = 60 + (index % 5) * 14;
        return (
          <Animated.View
            key={`confetti-${index}`}
            style={[
              styles.confettiPiece,
              {
                backgroundColor:
                  index % 3 === 0
                    ? theme.colors.accent
                    : index % 3 === 1
                      ? theme.colors.gold
                      : theme.colors.red,
                opacity: item.interpolate({
                  inputRange: [0, 0.8, 1],
                  outputRange: [0, 1, 0],
                }),
                transform: [
                  {
                    translateX: item.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, Math.cos(angle) * distance],
                    }),
                  },
                  {
                    translateY: item.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, Math.sin(angle) * distance - 16],
                    }),
                  },
                  {
                    scale: item.interpolate({
                      inputRange: [0, 0.15, 1],
                      outputRange: [0, 1, 0.8],
                    }),
                  },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

function LevelBadge({ theme }: { theme: Theme }) {
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);

  return (
    <Animated.View
      style={[
        styles.levelBadge,
        {
          backgroundColor: theme.colors.accentSoft,
          borderColor: theme.colors.accent,
          transform: [
            {
              scale: glow.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.04],
              }),
            },
          ],
        },
      ]}
    >
      <Text style={[styles.levelBadgeText, { color: theme.colors.accent }]}>Lv 1 Freeman</Text>
    </Animated.View>
  );
}

function SectionPill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.sectionPill, { backgroundColor: `${color}22`, borderColor: color }]}>
      <Text style={[styles.sectionPillText, { color }]}>{label}</Text>
    </View>
  );
}

function IllustrationScene({
  scene,
  theme,
}: {
  scene: IllustrationScreen;
  theme: Theme;
}) {
  const bounce = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const floaters = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    const bounceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: 1,
          duration: 680,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 680,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    const swayLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, {
          toValue: 1,
          duration: 1900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(sway, {
          toValue: 0,
          duration: 1900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    bounceLoop.start();
    swayLoop.start();

    floaters.forEach((item, index) => {
      item.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 120),
          Animated.timing(item, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(item, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    });

    return () => {
      bounceLoop.stop();
      swayLoop.stop();
      floaters.forEach((item) => item.stopAnimation());
    };
  }, [bounce, floaters, sway]);

  const pose = useMemo(() => {
    switch (scene.mood) {
      case 'brainFog':
        return {
          skinColor: '#F6D2B4',
          shirtColor: '#6E7BA6',
          faceMood: 'down',
          torsoRotate: '-5deg',
          headTilt: '-10deg',
          armLeftRotate: '35deg',
          armRightRotate: '-35deg',
          legLeftRotate: '6deg',
          legRightRotate: '-10deg',
          stanceScale: 0.98,
        };
      case 'lowDrive':
        return {
          skinColor: '#F6D2B4',
          shirtColor: '#A37F1D',
          faceMood: 'down',
          torsoRotate: '-8deg',
          headTilt: '-8deg',
          armLeftRotate: '48deg',
          armRightRotate: '-20deg',
          legLeftRotate: '10deg',
          legRightRotate: '-6deg',
          stanceScale: 0.94,
        };
      case 'socialShutdown':
        return {
          skinColor: '#E9C8A4',
          shirtColor: '#6657C7',
          faceMood: 'flat',
          torsoRotate: '2deg',
          headTilt: '6deg',
          armLeftRotate: '78deg',
          armRightRotate: '-78deg',
          legLeftRotate: '0deg',
          legRightRotate: '0deg',
          stanceScale: 0.93,
        };
      case 'intimacyFailure':
        return {
          skinColor: '#F6D2B4',
          shirtColor: '#C4577B',
          faceMood: 'down',
          torsoRotate: '0deg',
          headTilt: '0deg',
          armLeftRotate: '60deg',
          armRightRotate: '-60deg',
          legLeftRotate: '2deg',
          legRightRotate: '-2deg',
          stanceScale: 0.96,
        };
      case 'relationshipAlive':
        return {
          skinColor: '#F6D2B4',
          shirtColor: '#FF6A93',
          faceMood: 'up',
          torsoRotate: '-2deg',
          headTilt: '-4deg',
          armLeftRotate: '-30deg',
          armRightRotate: '30deg',
          legLeftRotate: '-6deg',
          legRightRotate: '6deg',
          stanceScale: 1.02,
        };
      case 'energyUnlocked':
        return {
          skinColor: '#F6D2B4',
          shirtColor: '#E8A215',
          faceMood: 'up',
          torsoRotate: '-8deg',
          headTilt: '-8deg',
          armLeftRotate: '-48deg',
          armRightRotate: '58deg',
          legLeftRotate: '-18deg',
          legRightRotate: '20deg',
          stanceScale: 1.06,
        };
      case 'confidenceUp':
        return {
          skinColor: '#F6D2B4',
          shirtColor: '#0EA97B',
          faceMood: 'up',
          torsoRotate: '-3deg',
          headTilt: '0deg',
          armLeftRotate: '-14deg',
          armRightRotate: '14deg',
          legLeftRotate: '-8deg',
          legRightRotate: '8deg',
          stanceScale: 1.04,
        };
      case 'purposeLocked':
      default:
        return {
          skinColor: '#F6D2B4',
          shirtColor: '#3E9FD3',
          faceMood: 'up',
          torsoRotate: '-2deg',
          headTilt: '-2deg',
          armLeftRotate: '-18deg',
          armRightRotate: '12deg',
          legLeftRotate: '-12deg',
          legRightRotate: '10deg',
          stanceScale: 1.03,
        };
    }
  }, [scene.mood]);

  return (
    <View style={[styles.sceneCard, { backgroundColor: theme.colors.sceneBase, borderColor: theme.colors.border }]}>
      <View style={[styles.sceneAura, { backgroundColor: scene.accent }]} />
      <View style={[styles.sceneGround, { backgroundColor: `${scene.accent}22` }]} />
      {scene.floaters.map((floater, index) => {
        const placement =
          index === 0
            ? styles.floaterLeft
            : index === 1
              ? styles.floaterTop
              : styles.floaterRight;

        return (
          <Animated.View
            key={`${scene.label}-${floater}-${index}`}
            style={[
              styles.floater,
              placement,
              {
                backgroundColor: theme.mode === 'light' ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.08)',
                borderColor: theme.mode === 'light' ? 'rgba(16,19,26,0.06)' : 'rgba(255,255,255,0.06)',
                transform: [
                  {
                    translateY: floaters[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [8, -12],
                    }),
                  },
                  {
                    rotate: floaters[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: ['-4deg', '4deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.floaterText}>{floater}</Text>
          </Animated.View>
        );
      })}

      <Animated.View
        style={[
          styles.figureWrap,
          {
            transform: [
              { scale: pose.stanceScale },
              {
                translateY: bounce.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -12],
                }),
              },
              {
                rotate: sway.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['-3deg', '3deg'],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.figureShadow} />
        <Animated.View
          style={[
            styles.head,
            {
              backgroundColor: pose.skinColor,
              transform: [{ rotate: pose.headTilt }],
            },
          ]}
        >
          <View style={styles.faceRow}>
            <View style={styles.eye} />
            <View style={styles.eye} />
          </View>
          <View
            style={[
              styles.mouth,
              pose.faceMood === 'up'
                ? styles.mouthUp
                : pose.faceMood === 'down'
                  ? styles.mouthDown
                  : styles.mouthFlat,
            ]}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.arm,
            styles.armLeft,
            { backgroundColor: pose.skinColor, transform: [{ rotate: pose.armLeftRotate }] },
          ]}
        />
        <Animated.View
          style={[
            styles.arm,
            styles.armRight,
            { backgroundColor: pose.skinColor, transform: [{ rotate: pose.armRightRotate }] },
          ]}
        />

        <Animated.View
          style={[
            styles.torso,
            { backgroundColor: pose.shirtColor, transform: [{ rotate: pose.torsoRotate }] },
          ]}
        />

        <View style={styles.waist} />

        <Animated.View style={[styles.leg, styles.legLeft, { transform: [{ rotate: pose.legLeftRotate }] }]} />
        <Animated.View style={[styles.leg, styles.legRight, { transform: [{ rotate: pose.legRightRotate }] }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardWrap: {
    flex: 1,
  },
  backgroundOrbA: {
    position: 'absolute',
    top: -90,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  backgroundOrbB: {
    position: 'absolute',
    bottom: 110,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  backgroundGrid: {
    position: 'absolute',
    top: 18,
    right: 18,
    bottom: 18,
    left: 18,
    borderWidth: 1,
    borderRadius: 28,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    minHeight: height - 32,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  appHeaderBrand: {
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 4,
  },
  appHeaderSubtitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    marginTop: 5,
  },
  appHeaderBadge: {
    minWidth: 70,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  appHeaderBadgeText: {
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1.2,
  },
  screen: {
    flexGrow: 1,
  },
  screenCard: {
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 20,
    overflow: 'hidden',
  },
  screenCardSplash: {
    minHeight: height * 0.8,
  },
  centeredHero: {
    minHeight: height * 0.72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBadgeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  miniBadge: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  miniBadgeText: {
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.8,
  },
  previewCard: {
    width: '100%',
    borderRadius: 28,
    borderWidth: 1,
    padding: 18,
    marginBottom: 26,
  },
  previewGlow: {
    position: 'absolute',
    top: -50,
    right: -35,
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  previewPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1.2,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    gap: 14,
  },
  previewCopy: {
    flex: 1,
  },
  previewTitle: {
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    fontSize: 24,
    lineHeight: 28,
  },
  previewSubtitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  previewStats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  previewStat: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  previewStatLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
  previewStatValue: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 5,
  },
  lockEmoji: {
    fontSize: 72,
    marginBottom: 0,
  },
  brandTitle: {
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    fontSize: width < 360 ? 38 : 46,
    letterSpacing: 5.5,
    textAlign: 'center',
  },
  splashTagline: {
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    fontSize: 24,
    lineHeight: 32,
    textAlign: 'center',
    marginTop: 18,
    maxWidth: 320,
  },
  socialProof: {
    fontFamily: FONT_FAMILY,
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 14,
    marginBottom: 26,
    textAlign: 'center',
    maxWidth: 300,
  },
  splashButton: {
    width: '100%',
    marginTop: 2,
  },
  primaryButton: {
    minHeight: 60,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    fontSize: 18,
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  xpPopup: {
    position: 'absolute',
    top: 18,
    right: 22,
    zIndex: 20,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  xpPopupText: {
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    fontSize: 15,
  },
  progressShell: {
    marginBottom: 28,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressLabel: {
    fontFamily: FONT_FAMILY,
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  progressValue: {
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    fontSize: 13,
  },
  progressTrack: {
    height: 16,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressOrb: {
    position: 'absolute',
    top: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 2,
  },
  kicker: {
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  heroTitle: {
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    fontSize: width < 360 ? 30 : 34,
    lineHeight: width < 360 ? 38 : 42,
  },
  heroSubtitle: {
    fontFamily: FONT_FAMILY,
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
    marginBottom: 22,
  },
  helperCopy: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    marginBottom: 18,
  },
  optionList: {
    gap: 14,
  },
  optionCard: {
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionText: {
    fontFamily: FONT_FAMILY,
    fontWeight: '700',
    fontSize: 16,
    flex: 1,
    paddingRight: 12,
  },
  optionCheck: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCheckText: {
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    fontSize: 11,
  },
  personalPrompt: {
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 22,
  },
  inputShell: {
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: FONT_FAMILY,
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    fontFamily: FONT_FAMILY,
    fontWeight: '600',
    fontSize: 17,
    minHeight: 60,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 18,
  },
  statsEmoji: {
    fontSize: 44,
    marginBottom: 12,
  },
  statCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  statLabel: {
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    fontSize: width < 360 ? 25 : 29,
    marginTop: 10,
  },
  statCopy: {
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  symptomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  symptomPill: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 1,
  },
  symptomText: {
    fontFamily: FONT_FAMILY,
    fontWeight: '700',
    fontSize: 14,
  },
  sectionPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionPillText: {
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bulletStack: {
    gap: 12,
  },
  numberedCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  numberBubbleText: {
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    fontSize: 15,
  },
  numberedCopy: {
    fontFamily: FONT_FAMILY,
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  benefitRow: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkBullet: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkBulletText: {
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    fontSize: 11,
  },
  plantCard: {
    borderRadius: 30,
    borderWidth: 1,
    padding: 22,
    marginBottom: 10,
  },
  plantTitle: {
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    fontSize: 20,
    marginBottom: 12,
  },
  plantStage: {
    height: 170,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 18,
  },
  plantSoil: {
    position: 'absolute',
    bottom: 18,
    width: 120,
    height: 22,
    borderRadius: 999,
    backgroundColor: '#34291D',
  },
  plantStem: {
    position: 'absolute',
    bottom: 34,
    width: 10,
    height: 78,
    borderRadius: 999,
  },
  seedEmoji: {
    position: 'absolute',
    bottom: 52,
    fontSize: 34,
  },
  treeEmoji: {
    position: 'absolute',
    bottom: 46,
    fontSize: 64,
  },
  timelineRow: {
    flexDirection: width < 390 ? 'column' : 'row',
    gap: 12,
  },
  timelineItem: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  timelineIcon: {
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    fontSize: 12,
    marginBottom: 8,
  },
  timelineLabel: {
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    fontSize: 14,
  },
  timelineCopy: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    marginTop: 6,
  },
  coffeeGrid: {
    flexDirection: width < 390 ? 'column' : 'row',
    gap: 14,
    marginBottom: 22,
  },
  compareCard: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
  },
  compareEmoji: {
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    fontSize: 28,
    marginBottom: 10,
  },
  compareTitle: {
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    fontSize: 19,
  },
  comparePrice: {
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    fontSize: 28,
    marginTop: 12,
  },
  compareSub: {
    fontFamily: FONT_FAMILY,
    fontWeight: '700',
    fontSize: 16,
    marginTop: 8,
  },
  featureList: {
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  featureCheck: {
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    fontSize: 11,
    marginRight: 10,
  },
  featureText: {
    fontFamily: FONT_FAMILY,
    fontWeight: '700',
    fontSize: 15,
  },
  authStack: {
    gap: 12,
  },
  authOption: {
    minHeight: 62,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  authOptionText: {
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    fontSize: 17,
  },
  signInLink: {
    fontFamily: FONT_FAMILY,
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 22,
    textDecorationLine: 'underline',
  },
  termsCopy: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 18,
  },
  finalScreen: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: height * 0.78,
    paddingVertical: 16,
  },
  confettiWrap: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    width: 10,
    height: 10,
  },
  confettiPiece: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  finalLock: {
    fontSize: 84,
    marginBottom: 12,
  },
  finalTitle: {
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    fontSize: width < 360 ? 34 : 40,
    textAlign: 'center',
    letterSpacing: 2,
  },
  finalSubtitle: {
    fontFamily: FONT_FAMILY,
    fontWeight: '600',
    fontSize: 17,
    lineHeight: 25,
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 20,
    maxWidth: 330,
  },
  levelBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginBottom: 20,
  },
  levelBadgeText: {
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    fontSize: 15,
  },
  featureStripGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  featureStripItem: {
    width: 54,
    height: 54,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureStripIcon: {
    fontSize: 24,
  },
  totalXp: {
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    fontSize: 18,
    marginBottom: 8,
  },
  finalProof: {
    fontFamily: FONT_FAMILY,
    fontWeight: '600',
    fontSize: 15,
    marginTop: 18,
  },
  sceneCard: {
    height: 250,
    borderRadius: 32,
    borderWidth: 1,
    marginBottom: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sceneAura: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.14,
  },
  sceneGround: {
    position: 'absolute',
    bottom: 24,
    width: 140,
    height: 26,
    borderRadius: 999,
  },
  floater: {
    position: 'absolute',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  floaterLeft: {
    left: 20,
    bottom: 54,
  },
  floaterTop: {
    top: 24,
    right: 44,
  },
  floaterRight: {
    right: 20,
    bottom: 60,
  },
  floaterText: {
    fontSize: 22,
  },
  figureWrap: {
    width: 170,
    height: 180,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  figureShadow: {
    position: 'absolute',
    bottom: 8,
    width: 92,
    height: 20,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  head: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(0,0,0,0.08)',
    zIndex: 4,
    marginBottom: -8,
  },
  faceRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 7,
  },
  eye: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#111111',
  },
  mouth: {
    borderColor: '#111111',
    alignSelf: 'center',
  },
  mouthUp: {
    width: 18,
    height: 10,
    borderBottomWidth: 2,
    borderRadius: 10,
  },
  mouthDown: {
    width: 18,
    height: 10,
    borderTopWidth: 2,
    borderRadius: 10,
  },
  mouthFlat: {
    width: 16,
    height: 2,
    backgroundColor: '#111111',
    borderRadius: 1,
  },
  arm: {
    position: 'absolute',
    top: 66,
    width: 18,
    height: 74,
    borderRadius: 999,
    zIndex: 2,
  },
  armLeft: {
    left: 32,
  },
  armRight: {
    right: 32,
  },
  torso: {
    width: 82,
    height: 78,
    borderRadius: 26,
    zIndex: 3,
  },
  waist: {
    width: 32,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1A1D24',
    marginTop: -8,
    zIndex: 2,
  },
  leg: {
    position: 'absolute',
    bottom: 0,
    width: 20,
    height: 84,
    borderRadius: 999,
    backgroundColor: '#151922',
  },
  legLeft: {
    left: 58,
  },
  legRight: {
    right: 58,
  },
});
