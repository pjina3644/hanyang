import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, isFirebaseActive } from '../services/firebase';

export default function LoginScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }
    if (trimmedPassword.length < 6) {
      Alert.alert('입력 오류', '비밀번호는 최소 6자리 이상이어야 합니다.');
      return;
    }

    if (!isFirebaseActive || !auth) {
      // 로컬 Mock 우회 모드 (Firebase 연동 안 된 환경 대비 안전 장치)
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        onLoginSuccess({ uid: 'mock_user_123', email: trimmedEmail });
        Alert.alert('알림', '로컬 Mock 모드로 로그인되었습니다.');
      }, 1000);
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        // 회원가입
        const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
        setIsLoading(false);
        Alert.alert('회원가입 성공', '회원가입이 완료되었습니다! 자동으로 로그인합니다.');
        onLoginSuccess(userCredential.user);
      } else {
        // 로그인
        const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
        setIsLoading(false);
        onLoginSuccess(userCredential.user);
      }
    } catch (error) {
      setIsLoading(false);
      console.warn("Auth error:", error.message || error);
      let errMsg = '인증에 실패했습니다. 입력한 정보를 확인해 주세요.';
      if (error.code === 'auth/email-already-in-use') {
        errMsg = '이미 사용 중인 이메일 주소입니다.';
      } else if (error.code === 'auth/invalid-email') {
        errMsg = '올바르지 않은 이메일 형식입니다.';
      } else if (error.code === 'auth/weak-password') {
        errMsg = '비밀번호가 너무 취약합니다.';
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        errMsg = '이메일 또는 비밀번호가 일치하지 않습니다.';
      }
      Alert.alert('오류', errMsg);
    }
  };

  const handleBypass = () => {
    onLoginSuccess({ uid: 'mock_user_123', email: 'guest@prototype.com' });
    Alert.alert('알림', '게스트(Mock) 계정으로 진입합니다.');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {/* 로고 영역 */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🏃</Text>
            </View>
            <Text style={styles.logoText}>Prototype</Text>
            <Text style={styles.logoSub}>연대책임 운동 & 웹소설 보상 서비스</Text>
          </View>

          {/* 인풋 필드 */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>이메일 주소</Text>
            <TextInput
              style={styles.input}
              placeholder="example@email.com"
              placeholderTextColor="#A0A0B0"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={[styles.inputLabel, { marginTop: 16 }]}>비밀번호</Text>
            <TextInput
              style={styles.input}
              placeholder="6자리 이상 비밀번호 입력"
              placeholderTextColor="#A0A0B0"
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {/* 메인 버튼 */}
          <TouchableOpacity onPress={handleAuth} activeOpacity={0.85} disabled={isLoading} style={styles.mainBtnContainer}>
            <LinearGradient
              colors={['#2563EB', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.mainBtn}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.mainBtnText}>{isSignUp ? '회원가입 하기' : '로그인'}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* 모드 전환 */}
          <TouchableOpacity
            onPress={() => setIsSignUp(!isSignUp)}
            style={styles.toggleBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.toggleText}>
              {isSignUp ? '이미 계정이 있으신가요? 로그인하기' : '처음이신가요? 이메일 회원가입하기'}
            </Text>
          </TouchableOpacity>

          {/* 오프라인 바이패스 */}
          <TouchableOpacity
            onPress={handleBypass}
            style={styles.bypassBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.bypassText}>둘러보기 (게스트 모드)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: { flex: 1, backgroundColor: '#FAFAFC' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    shadowColor: '#2563EB',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
    borderWidth: 1.5,
    borderColor: '#EFF6FF',
  },
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoEmoji: { fontSize: 32 },
  logoText: { fontSize: 24, fontWeight: '900', color: '#1C1C28', letterSpacing: -0.5 },
  logoSub: { fontSize: 12, color: '#8A8A9A', marginTop: 4, fontWeight: '500' },

  inputContainer: { marginBottom: 28 },
  inputLabel: { fontSize: 12, fontWeight: '800', color: '#64748B', marginBottom: 8, marginLeft: 2 },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: '#EFF6FF',
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1C1C28',
    backgroundColor: '#FAFAFC',
  },

  mainBtnContainer: { width: '100%', marginBottom: 16 },
  mainBtn: {
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },

  toggleBtn: { alignItems: 'center', paddingVertical: 8 },
  toggleText: { fontSize: 13, color: '#2563EB', fontWeight: '700' },

  bypassBtn: { alignItems: 'center', paddingVertical: 8, marginTop: 12 },
  bypassText: { fontSize: 12, color: '#A4A4B4', fontWeight: '600', decorationLine: 'underline' },
});
