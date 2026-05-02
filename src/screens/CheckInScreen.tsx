import React, { useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AppModel } from './screenTypes';
import { colors, isSmall } from '../theme';

type CheckInScreenProps = {
  app: AppModel;
};

export function CheckInScreen({ app }: CheckInScreenProps) {
  const [relapsed, setRelapsed] = useState(false);
  const [note, setNote] = useState('');
  const [trigger, setTrigger] = useState('');
  const [error, setError] = useState('');
  const saveScale = useRef(new Animated.Value(1)).current;

  function animateSave(toValue: number) {
    Animated.spring(saveScale, {
      toValue,
      friction: 5,
      tension: 180,
      useNativeDriver: true,
    }).start();
  }

  function saveCheckIn() {
    if (!trigger.trim() || !note.trim()) {
      setError('Add both a trigger and notes before saving.');
      return;
    }
    setError('');
    app.completeCheckIn(relapsed, note, trigger);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Did you relapse today?</Text>
        <Text style={styles.subtitle}>One honest check-in is better than a perfect-looking streak.</Text>

        <View style={styles.choiceRow}>
          <Pressable style={[styles.choiceButton, !relapsed && styles.choiceClean]} onPress={() => setRelapsed(false)}>
            <Text style={[styles.choiceText, !relapsed && styles.choiceTextActive]}>No</Text>
          </Pressable>
          <Pressable style={[styles.choiceButton, relapsed && styles.choiceRelapse]} onPress={() => setRelapsed(true)}>
            <Text style={[styles.choiceText, relapsed && styles.choiceTextActive]}>Yes</Text>
          </Pressable>
        </View>

        <Text style={styles.inputLabel}>Trigger</Text>
        <TextInput value={trigger} onChangeText={setTrigger} placeholder="Stress, boredom, night, phone in bed..." placeholderTextColor={colors.dim} style={styles.input} />

        <Text style={styles.inputLabel}>Notes</Text>
        <TextInput value={note} onChangeText={setNote} multiline placeholder="What happened? What will you change tomorrow?" placeholderTextColor={colors.dim} style={styles.notesInput} />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable onPress={saveCheckIn} onPressIn={() => animateSave(0.96)} onPressOut={() => animateSave(1)}>
          <Animated.View style={[styles.primaryButton, { transform: [{ scale: saveScale }] }]}>
            <Text style={styles.primaryText}>{relapsed ? 'Reset Streak' : 'Save Clean Day'}</Text>
          </Animated.View>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 110 },
  title: { color: colors.text, fontSize: isSmall ? 32 : 38, lineHeight: isSmall ? 38 : 44, fontWeight: '900', letterSpacing: -1.2 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: 10, marginBottom: 20 },
  choiceRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  choiceButton: {
    flex: 1,
    minHeight: 92,
    borderRadius: 20,
    backgroundColor: colors.raised,
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.22)',
    borderLeftColor: 'rgba(255,255,255,0.14)',
    borderRightColor: 'rgba(0,0,0,0.35)',
    borderBottomColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  choiceClean: {
    backgroundColor: '#06966C',
    borderTopColor: '#6BFFD8',
    borderLeftColor: '#2FFFC5',
    borderRightColor: '#036B4C',
    borderBottomColor: '#024C36',
  },
  choiceRelapse: {
    backgroundColor: '#C92335',
    borderTopColor: '#FFB0B8',
    borderLeftColor: '#FF6F7D',
    borderRightColor: '#8F1624',
    borderBottomColor: '#65101A',
  },
  choiceText: { color: colors.muted, fontSize: 24, fontWeight: '900', letterSpacing: 0.2 },
  choiceTextActive: { color: colors.text },
  inputLabel: { color: colors.text, fontSize: 14, fontWeight: '900', marginBottom: 8 },
  input: { minHeight: 54, borderRadius: 16, backgroundColor: colors.raised, borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: 15, paddingHorizontal: 14, marginBottom: 12 },
  notesInput: { minHeight: 120, borderRadius: 16, backgroundColor: colors.raised, borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: 15, padding: 14, marginBottom: 12, textAlignVertical: 'top' },
  errorText: { color: colors.red, fontSize: 13, fontWeight: '700', marginBottom: 10 },
  primaryButton: { minHeight: 58, borderRadius: 18, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  primaryText: { color: colors.bg, fontSize: 16, fontWeight: '900', textAlign: 'center' },
});
