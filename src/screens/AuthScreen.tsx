import React, { useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../theme';

type AuthScreenProps = {
  onSignup: (email: string, password: string, username: string) => string | null;
  onLogin: (email: string, password: string) => string | null;
};

export function AuthScreen({ onSignup, onLogin }: AuthScreenProps) {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const submitScale = useRef(new Animated.Value(1)).current;

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());
  }

  function submit() {
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }

    const message = mode === 'signup' ? onSignup(email, password, username) : onLogin(email, password);
    setError(message ?? '');
  }

  function animateSubmit(toValue: number) {
    Animated.spring(submitScale, {
      toValue,
      friction: 5,
      tension: 180,
      useNativeDriver: true,
    }).start();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
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
              <Pressable style={[styles.switchButton, mode === 'signup' && styles.switchButtonActive]} onPress={() => setMode('signup')}>
                <Text style={[styles.switchText, mode === 'signup' && styles.switchTextActive]}>Sign up</Text>
              </Pressable>
              <Pressable style={[styles.switchButton, mode === 'login' && styles.switchButtonActive]} onPress={() => setMode('login')}>
                <Text style={[styles.switchText, mode === 'login' && styles.switchTextActive]}>Log in</Text>
              </Pressable>
            </View>

            {mode === 'signup' ? (
              <TextInput value={username} onChangeText={setUsername} placeholder="Username" placeholderTextColor={colors.dim} style={styles.input} />
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
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable onPress={submit} onPressIn={() => animateSubmit(0.96)} onPressOut={() => animateSubmit(1)}>
              <Animated.View style={[styles.primaryButton, { transform: [{ scale: submitScale }] }]}>
                <Text style={styles.primaryText}>{mode === 'signup' ? 'Create Account' : 'Log In'}</Text>
              </Animated.View>
            </Pressable>
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
  authTitle: { color: colors.text, fontSize: 44, fontWeight: '900', letterSpacing: -1.5 },
  authSubtitle: { color: colors.muted, fontSize: 17, lineHeight: 24, marginTop: 8, marginBottom: 24 },
  authCard: { borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 16 },
  switchRow: { flexDirection: 'row', gap: 8, padding: 4, borderRadius: 16, backgroundColor: colors.bg, marginBottom: 14 },
  switchButton: { flex: 1, minHeight: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  switchButtonActive: { backgroundColor: colors.green },
  switchText: { color: colors.muted, fontSize: 15, fontWeight: '800' },
  switchTextActive: { color: colors.bg },
  input: { minHeight: 54, borderRadius: 16, backgroundColor: colors.raised, borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: 15, paddingHorizontal: 14, marginBottom: 12 },
  errorText: { color: colors.red, fontSize: 13, fontWeight: '700', marginBottom: 10 },
  primaryButton: { minHeight: 58, borderRadius: 18, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  primaryText: { color: colors.bg, fontSize: 16, fontWeight: '900', textAlign: 'center' },
});
