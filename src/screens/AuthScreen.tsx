import React, { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { androidTopInset } from '../layout';
import { colors } from '../theme';

type AuthScreenProps = {
  onSignup: (email: string, password: string, username: string) => Promise<string | null>;
  onLogin: (email: string, password: string) => Promise<string | null>;
  onGoogleSignIn: () => Promise<string | null>;
  onResendVerification: (email: string) => Promise<string | null>;
};

export function AuthScreen({ onSignup, onLogin, onGoogleSignIn, onResendVerification }: AuthScreenProps) {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitScale = useRef(new Animated.Value(1)).current;
  const modeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());
  }

  async function submit() {
    if (isSubmitting) return;

    if (!isValidEmail(email)) {
      setNotice({ kind: 'error', text: 'Enter a valid email address.' });
      return;
    }

    setIsSubmitting(true);
    setNotice(null);

    try {
      const message =
        mode === 'signup'
          ? await onSignup(email, password, username)
          : await onLogin(email, password);

      const signupCreated =
        mode === 'signup' &&
        message &&
        (message.toLowerCase().includes('verification email sent') || message.toLowerCase().includes('account created'));

      if (signupCreated) {
        setNotice({ kind: 'success', text: message });
        setPassword('');
        modeTimeoutRef.current = setTimeout(() => {
          setMode('login');
        }, 1200);
        return;
      }

      setNotice(message ? { kind: 'error', text: message } : null);
    } catch {
      setNotice({ kind: 'error', text: 'Could not complete authentication. Try again.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitResend() {
    if (isSubmitting) return;
    if (!isValidEmail(email)) {
      setNotice({ kind: 'error', text: 'Enter your email address first.' });
      return;
    }
    setIsSubmitting(true);
    setNotice(null);
    try {
      const message = await onResendVerification(email);
      setNotice({ kind: message?.toLowerCase().includes('sent') ? 'success' : 'error', text: message || 'Failed to resend.' });
    } catch {
      setNotice({ kind: 'error', text: 'Could not resend verification. Try again.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitGoogle() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setNotice(null);

    try {
      const message = await onGoogleSignIn();
      setNotice(message ? { kind: 'error', text: message } : null);
    } catch {
      setNotice({ kind: 'error', text: 'Could not complete Google sign-in. Try again.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    return () => {
      if (modeTimeoutRef.current) {
        clearTimeout(modeTimeoutRef.current);
      }
    };
  }, []);

  function animateSubmit(toValue: number) {
    Animated.spring(submitScale, {
      toValue,
      friction: 5,
      tension: 180,
      useNativeDriver: true,
    }).start();
  }

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: androidTopInset }]}>
      <StatusBar style="light" backgroundColor={colors.bg} translucent={false} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 18 : 0}
        style={styles.authWrap}
      >
        <ScrollView
          contentContainerStyle={styles.authScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.authTitle}>Freeman</Text>
          <Text style={styles.authSubtitle}>Track the streak. Beat the urge. Build discipline daily.</Text>

          <View style={styles.authCard}>
            <View style={styles.switchRow}>
              <Pressable style={({ pressed }) => [styles.switchButton, mode === 'signup' && styles.switchButtonActive, pressed && styles.buttonPressed]} onPress={() => setMode('signup')}>
                <Text style={[styles.switchText, mode === 'signup' && styles.switchTextActive]}>Sign up</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.switchButton, mode === 'login' && styles.switchButtonActive, pressed && styles.buttonPressed]} onPress={() => setMode('login')}>
                <Text style={[styles.switchText, mode === 'login' && styles.switchTextActive]}>Log in</Text>
              </Pressable>
            </View>

            <View style={styles.providerStack}>
              <Pressable
                disabled={isSubmitting}
                onPress={submitGoogle}
                style={({ pressed }) => [styles.providerButton, styles.googleButton, pressed && styles.buttonPressed]}
              >
                <Text style={[styles.providerIcon, styles.googleIcon]}>G</Text>
                <Text style={styles.googleText}>{isSubmitting ? 'Please wait...' : 'Continue with Google'}</Text>
              </Pressable>
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with email</Text>
              <View style={styles.dividerLine} />
            </View>

            {mode === 'signup' ? (
              <>
                <TextInput value={username} onChangeText={setUsername} placeholder="Username" placeholderTextColor={colors.dim} style={styles.input} />
              </>
            ) : null}
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              placeholder="Email"
              placeholderTextColor={colors.dim}
              style={styles.input}
            />
            <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" placeholderTextColor={colors.dim} style={styles.input} />
            {notice ? (
              <Text style={[styles.noticeText, notice.kind === 'success' ? styles.noticeSuccess : styles.noticeError]}>
                {notice.text}
              </Text>
            ) : null}
            <Pressable disabled={isSubmitting} onPress={submit} onPressIn={() => animateSubmit(0.96)} onPressOut={() => animateSubmit(1)}>
              <Animated.View style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled, { transform: [{ scale: submitScale }] }]}>
                <Text style={styles.primaryText}>{isSubmitting ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Log In'}</Text>
              </Animated.View>
            </Pressable>

            {mode === 'login' && (
              <Pressable disabled={isSubmitting} onPress={submitResend} style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
                <Text style={styles.secondaryText}>Resend verification email</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  authWrap: { flex: 1 },
  authScroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 24 },
  authTitle: { color: colors.text, fontSize: 44, fontWeight: '900', letterSpacing: 0 },
  authSubtitle: { color: colors.muted, fontSize: 17, lineHeight: 24, marginTop: 8, marginBottom: 24 },
  authCard: { borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 16 },
  switchRow: { flexDirection: 'row', gap: 8, padding: 4, borderRadius: 16, backgroundColor: colors.surface, marginBottom: 14 },
  switchButton: { flex: 1, minHeight: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  switchButtonActive: { backgroundColor: colors.green },
  switchText: { color: colors.muted, fontSize: 15, fontWeight: '800' },
  switchTextActive: { color: colors.bg },
  providerStack: { gap: 10, marginBottom: 14 },
  providerButton: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  googleButton: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' },
  providerIcon: { position: 'absolute', left: 18, fontSize: 17, fontWeight: '900' },
  googleIcon: { color: '#4285F4' },
  googleText: { color: '#111827', fontSize: 15, fontWeight: '900' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  buttonPressed: { transform: [{ scale: 0.98 }], opacity: 0.86 },
  input: { minHeight: 54, borderRadius: 16, backgroundColor: colors.raised, borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: 15, paddingHorizontal: 14, marginBottom: 12 },
  inputLabel: { color: colors.muted, fontSize: 12, fontWeight: '900', marginBottom: 7, marginLeft: 2 },
  noticeText: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  noticeError: { color: colors.red },
  noticeSuccess: { color: colors.green },
  primaryButton: { minHeight: 58, borderRadius: 18, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  primaryButtonDisabled: { opacity: 0.62 },
  primaryText: { color: colors.bg, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  secondaryButton: { marginTop: 14, paddingVertical: 10, alignItems: 'center' },
  secondaryText: { color: colors.green, fontSize: 14, fontWeight: '800', textDecorationLine: 'underline' },
});
