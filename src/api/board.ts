// src/api/board.ts
import client from './client';

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface BoardSummary {
  id: number;
  title: string;
  ownerName: string;
  createdAt: string;
  cardCount: number;
}

export interface BoardDetail {
  id: number;
  title: string;
  ownerName: string;
  createdAt: string;
  columns: ColumnInfo[];
}

export interface ColumnInfo {
  id: number;
  columnKey: string;
  title: string;
  position: number;
}

export interface CardResponse {
  id: number;
  title: string;
  description?: string;
  assignee?: string;
  startDate?: string;
  dueDate?: string;
  columnKey: string;
  position: number;
  labels: LabelResponse[];
  createdAt: string;
}

export interface LabelResponse {
  id: number;
  text: string;
  color: string;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const boardApi = {
  // 보드 목록
  getBoards: async (): Promise<BoardSummary[]> => {
    const res = await client.get('/api/boards');
    return res.data;
  },

  // 보드 생성
  createBoard: async (title: string): Promise<BoardDetail> => {
    const res = await client.post('/api/boards', { title });
    return res.data;
  },

  // 보드 상세
  getBoard: async (boardId: number): Promise<BoardDetail> => {
    const res = await client.get(`/api/boards/${boardId}`);
    return res.data;
  },

  // 보드 삭제
  deleteBoard: async (boardId: number): Promise<void> => {
    await client.delete(`/api/boards/${boardId}`);
  },

  // 카드 목록
  getCards: async (boardId: number): Promise<CardResponse[]> => {
    const res = await client.get(`/api/boards/${boardId}/cards`);
    return res.data;
  },

  // 카드 생성
  createCard: async (boardId: number, title: string, columnKey: string): Promise<CardResponse> => {
    const res = await client.post(`/api/boards/${boardId}/cards`, { title, columnKey });
    return res.data;
  },
};

export const cardApi = {
  // 카드 수정
  updateCard: async (cardId: number, data: {
    title: string;
    description?: string;
    assignee?: string;
    startDate?: string;
    dueDate?: string;
    labels?: { text: string; color: string }[];
  }): Promise<CardResponse> => {
    const res = await client.put(`/api/cards/${cardId}`, data);
    return res.data;
  },

  // 카드 이동
  moveCard: async (cardId: number, columnKey: string, position: number): Promise<CardResponse> => {
    const res = await client.patch(`/api/cards/${cardId}/move`, { columnKey, position });
    return res.data;
  },

  // 카드 삭제
  deleteCard: async (cardId: number): Promise<void> => {
    await client.delete(`/api/cards/${cardId}`);
  },
};