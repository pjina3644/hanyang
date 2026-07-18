import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import HomeScreen from './screens/HomeScreen';
import StoryScreen from './screens/StoryScreen';
import SettingsScreen from './screens/SettingsScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState('Home');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {activeTab === 'Home' && <HomeScreen />}
        {activeTab === 'Story' && <StoryScreen />}
        {activeTab === 'Settings' && <SettingsScreen />}
      </View>

      {/* 커스텀 하단 탭 바 (추가 라이브러리 설치 오류를 막기 위해 순수 컴포넌트로 구현) */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'Home' && styles.activeTabItem]} 
          onPress={() => setActiveTab('Home')}
        >
          <Text style={[styles.tabText, activeTab === 'Home' && styles.activeTabText]}>🐷 홈</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'Story' && styles.activeTabItem]} 
          onPress={() => setActiveTab('Story')}
        >
          <Text style={[styles.tabText, activeTab === 'Story' && styles.activeTabText]}>📖 스토리</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'Settings' && styles.activeTabItem]} 
          onPress={() => setActiveTab('Settings')}
        >
          <Text style={[styles.tabText, activeTab === 'Settings' && styles.activeTabText]}>⚙️ 설정</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 65,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: -2 },
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabItem: {
    borderTopWidth: 3,
    borderTopColor: '#FF8787',
  },
  tabText: {
    fontSize: 14,
    color: '#868E96',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FF8787',
    fontWeight: 'bold',
  },
});
