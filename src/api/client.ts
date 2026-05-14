// src/api/client.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 실제 기기에서 테스트 시 PC의 IP 주소로 변경 필요
// 에뮬레이터: 10.0.2.2 / 실기기: PC의 실제 IP (예: 192.168.0.x)
export const BASE_URL = 'http://192.168.1.100:8080';

export const TOKEN_KEY = 'syncflow_token';
export const USER_KEY  = 'syncflow_user';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// 요청 인터셉터: 모든 요청에 토큰 자동 첨부
client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터: 401이면 토큰 제거
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    }
    return Promise.reject(error);
  },
);

export default client;