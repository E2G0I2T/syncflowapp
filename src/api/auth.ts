// src/api/auth.ts
import client from './client';

export interface AuthResponse {
  accessToken: string;
  email: string;
  name: string;
}

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await client.post('/api/auth/login', { email, password });
    return res.data;
  },

  signup: async (email: string, password: string, name: string): Promise<AuthResponse> => {
    const res = await client.post('/api/auth/signup', { email, password, name });
    return res.data;
  },
};