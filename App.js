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
                  colors={['#FF4D80', '#FF8FB1']}
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
    flexDirection: 'row',
    height: 68,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#FFE4EC',
    alignItems: 'center',
    paddingHorizontal: 10,
    shadowColor: '#FF4D80',
    shadowOpacity: 0.10,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -3 },
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 22,
    gap: 5,
  },
  pillInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 5,
  },
  pillIcon: { fontSize: 15 },
  pillLabelActive: { fontSize: 13, color: '#FFFFFF', fontWeight: '700' },
  pillLabel: { fontSize: 13, color: '#C0C0D0', fontWeight: '500' },
});
