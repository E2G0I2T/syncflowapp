// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity, // View 제거
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/auth';
import { TOKEN_KEY, USER_KEY } from '../api/client';

const LoginScreen = ({ navigation }: any) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('알림', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      Alert.alert('알림', '이름을 입력해주세요.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('알림', '비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    try {
      const res =
        mode === 'login'
          ? await authApi.login(email.trim(), password)
          : await authApi.signup(email.trim(), password, name.trim());

      await AsyncStorage.setItem(TOKEN_KEY, res.accessToken);
      await AsyncStorage.setItem(
        USER_KEY,
        JSON.stringify({
          email: res.email,
          name: res.name,
        }),
      );

      navigation.replace('BoardList');
    } catch (err: any) {
      console.log('오류 전체:', JSON.stringify(err?.response?.data));
      console.log('상태코드:', err?.response?.status);
      console.log('메시지:', err?.message);
      const msg =
        err.response?.data?.message ??
        (mode === 'login'
          ? '이메일 또는 비밀번호가 올바르지 않습니다.'
          : '회원가입에 실패했습니다.');
      Alert.alert('오류', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.logo}>SyncFlow</Text>
      <Text style={styles.subtitle}>
        {mode === 'login' ? '로그인' : '회원가입'}
      </Text>

      {mode === 'signup' && (
        <TextInput
          style={styles.input}
          placeholder="이름"
          value={name}
          onChangeText={setName}
          placeholderTextColor="#bbb"
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="이메일"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor="#bbb"
      />

      <TextInput
        style={styles.input}
        placeholder="비밀번호 (8자 이상)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor="#bbb"
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {mode === 'login' ? '로그인' : '회원가입'}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}
      >
        <Text style={styles.toggleText}>
          {mode === 'login'
            ? '계정이 없으신가요? 회원가입'
            : '이미 계정이 있으신가요? 로그인'}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  logo: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#4C6EF5',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 14,
    fontSize: 15,
    color: '#333',
  },
  button: {
    backgroundColor: '#4C6EF5',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  toggleButton: { marginTop: 20, alignItems: 'center' },
  toggleText: { color: '#4C6EF5', fontSize: 14 },
});

export default LoginScreen;
