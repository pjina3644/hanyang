import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import HomeScreen from './screens/HomeScreen';
import StoryScreen from './screens/StoryScreen';
import SettingsScreen from './screens/SettingsScreen';

const TABS = [
  { id: 'Home',     icon: '🐷', label: '홈' },
  { id: 'Story',    icon: '📖', label: '스토리' },
  { id: 'Settings', icon: '⚙️', label: '설정' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('Home');

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        {activeTab === 'Home'     && <HomeScreen />}
        {activeTab === 'Story'    && <StoryScreen />}
        {activeTab === 'Settings' && <SettingsScreen />}
      </View>

      <View style={styles.tabBar}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.75}
            >
              {active ? (
                <LinearGradient
                  colors={['#6366F1', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.pill}
                >
                  <Text style={styles.pillIcon}>{tab.icon}</Text>
                  <Text style={styles.pillLabelActive}>{tab.label}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.pillInactive}>
                  <Text style={styles.pillIcon}>{tab.icon}</Text>
                  <Text style={styles.pillLabel}>{tab.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFF5F7',
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  content: { flex: 1 },

  tabBar: {
    position: 'absolute',
    bottom: 24,
    left: 18,
    right: 18,
    flexDirection: 'row',
    height: 66,
    backgroundColor: '#FFFFFF',
    borderRadius: 33,
    alignItems: 'center',
    paddingHorizontal: 8,
    shadowColor: '#6366F1',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    borderWidth: 1.5,
    borderColor: '#EEF2F6',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    gap: 6,
  },
  pillInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    gap: 6,
  },
  pillIcon: { fontSize: 16 },
  pillLabelActive: { fontSize: 14, color: '#FFFFFF', fontWeight: '800', letterSpacing: -0.2 },
  pillLabel: { fontSize: 14, color: '#B4B4C4', fontWeight: '600', letterSpacing: -0.2 },
});
