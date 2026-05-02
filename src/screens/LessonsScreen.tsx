import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, isSmall } from '../theme';

type Lesson = {
  title: string;
  time: string;
  body: string;
};

export function LessonsScreen({ lessons }: { lessons: Lesson[] }) {
  const [open, setOpen] = useState(lessons[0].title);

  return (
    <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Lessons</Text>
      <Text style={styles.subtitle}>Short, practical lessons. No CMS needed for MVP.</Text>

      {lessons.map((lesson) => {
        const active = open === lesson.title;
        return (
          <Pressable key={lesson.title} style={styles.lessonCard} onPress={() => setOpen(active ? '' : lesson.title)}>
            <View style={styles.lessonTop}>
              <Text style={styles.lessonTitle}>{lesson.title}</Text>
              <Text style={styles.lessonTime}>{lesson.time}</Text>
            </View>
            {active ? <Text style={styles.bodyText}>{lesson.body}</Text> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 110 },
  title: { color: colors.text, fontSize: isSmall ? 32 : 38, lineHeight: isSmall ? 38 : 44, fontWeight: '900', letterSpacing: -1.2 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: 10, marginBottom: 20 },
  lessonCard: { borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 },
  lessonTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 },
  lessonTitle: { flex: 1, color: colors.text, fontSize: 18, fontWeight: '900' },
  lessonTime: { color: colors.green, fontSize: 12, fontWeight: '900' },
  bodyText: { color: colors.muted, fontSize: 15, lineHeight: 23 },
});
