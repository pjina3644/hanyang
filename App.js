import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, SafeAreaView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import HomeScreen from './screens/HomeScreen';
import StoryScreen from './screens/StoryScreen';
import SettingsScreen from './screens/SettingsScreen';
import LoginScreen from './screens/LoginScreen';
import { auth, isFirebaseActive } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const TABS = [
  { id: 'Home',     icon: '🐷', label: '홈' },
  { id: 'Story',    icon: '📖', label: '스토리' },
  { id: 'Settings', icon: '⚙️', label: '설정' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('Home');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(isFirebaseActive);

  useEffect(() => {
    if (isFirebaseActive && auth) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        setIsAuthLoading(false);
      });
      return unsubscribe;
    } else {
      setIsAuthLoading(false);
    }
  }, []);

  const handleLogout = async () => {
    if (isFirebaseActive && auth) {
      await signOut(auth);
    }
    setCurrentUser(null);
  };

  if (isAuthLoading) {
    return (
      <SafeAreaView style={[styles.root, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFC' }]}>
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  if (!currentUser) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: '#FAFAFC' }]}>
        <LoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />
      </SafeAreaView>
    );
  }

  const userId = currentUser.uid;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        {activeTab === 'Home'     && <HomeScreen userId={userId} />}
        {activeTab === 'Story'    && <StoryScreen userId={userId} />}
        {activeTab === 'Settings' && <SettingsScreen userId={userId} onLogout={handleLogout} />}
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
                  colors={['#2563EB', '#06B6D4']}
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
    shadowColor: '#2563EB',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    borderWidth: 1.5,
    borderColor: '#EFF6FF',
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
