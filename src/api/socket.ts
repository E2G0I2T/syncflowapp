import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKEN_KEY } from './client';

const REALTIME_URL = 'http://192.168.1.100:3000'; // Express 서버 IP

let socket: Socket | null = null;

export const connectSocket = async (): Promise<Socket> => {
  if (socket?.connected) return socket;

  const token = await AsyncStorage.getItem(TOKEN_KEY);

  socket = io(REALTIME_URL, {
    transports: ['websocket'],
    auth: { token },
  });

  socket.on('connect', () => {
    console.log('소켓 연결 성공:', socket?.id);
  });

  socket.on('disconnect', () => {
    console.log('소켓 연결 해제');
  });

  socket.on('connect_error', (error) => {
    console.error('소켓 연결 실패:', error.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => socket;