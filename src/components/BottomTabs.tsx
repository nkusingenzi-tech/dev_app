import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TabKey } from '../screens/screenTypes';
import { colors, isSmall } from '../theme';

export function BottomTabs({ active, onChange }: { active: TabKey; onChange: (tab: TabKey) => void }) {
  const tabs: Array<{ key: TabKey; icon: string }> = [
    { key: 'Dashboard', icon: 'D' },
    { key: 'Check-in', icon: 'C' },
    { key: 'Sword', icon: 'S' },
    { key: 'Lessons', icon: 'L' },
    { key: 'Profile', icon: 'P' },
  ];

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => (
        <Pressable key={tab.key} style={styles.tabButton} onPress={() => onChange(tab.key)}>
          <Text style={[styles.tabIcon, active === tab.key && styles.tabActive]}>{tab.icon}</Text>
          <Text style={[styles.tabLabel, active === tab.key && styles.tabActive]}>{tab.key}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 82, flexDirection: 'row', backgroundColor: '#050512', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, paddingBottom: 12 },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabIcon: { color: colors.dim, fontSize: 18, fontWeight: '900' },
  tabLabel: { color: colors.dim, fontSize: isSmall ? 9 : 10, fontWeight: '800' },
  tabActive: { color: colors.green },
});
