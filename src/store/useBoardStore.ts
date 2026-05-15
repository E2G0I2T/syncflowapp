// src/store/useBoardStore.ts
import { create } from 'zustand';
import { Task, TaskMap, ColumnId, Column, Label } from '../types';
import { boardApi, cardApi, CardResponse } from '../api/board';
import { connectSocket, disconnectSocket, getSocket } from '../api/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKEN_KEY } from '../api/client';

// ─── 상수 ────────────────────────────────────────────────────────────────────

export const COLUMNS: Column[] = [
  { id: 'todo', title: '할 일 📝', color: '#4C6EF5' },
  { id: 'doing', title: '진행 중 🚀', color: '#FAB005' },
  { id: 'done', title: '완료 ✅', color: '#40C057' },
  { id: 'archive', title: '보관함 📦', color: '#868E96' },
];

export const LABEL_PRESETS: Omit<Label, 'id'>[] = [
  { text: '기획', color: '#845EF7' },
  { text: '디자인', color: '#F06595' },
  { text: '개발', color: '#339AF0' },
  { text: '테스트', color: '#20C997' },
  { text: '긴급', color: '#F03E3E' },
  { text: '문서', color: '#F59F00' },
];

const emptyTasks = (): TaskMap => ({
  todo: [],
  doing: [],
  done: [],
  archive: [],
});

// API 카드 → 로컬 Task 변환
const toTask = (card: CardResponse): Task => ({
  id: String(card.id),
  content: card.title,
  description: card.description,
  assignee: card.assignee,
  startDate: card.startDate,
  dueDate: card.dueDate,
  labels: card.labels?.map(l => ({
    id: String(l.id),
    text: l.text,
    color: l.color,
  })),
  createdAt: card.createdAt ? new Date(card.createdAt).getTime() : Date.now(),
});

// ─── 스토어 타입 ──────────────────────────────────────────────────────────────

type TaskPatch = Partial<
  Pick<
    Task,
    'content' | 'description' | 'assignee' | 'startDate' | 'dueDate' | 'labels'
  >
>;

interface BoardState {
  tasks: TaskMap;
  isLoading: boolean;
  currentBoardId: number | null;

  loadBoard: (boardId: number) => Promise<void>;
  moveTask: (taskId: string, fromCol: ColumnId, toCol: ColumnId) => void;
  addTask: (colId: ColumnId, content: string) => Promise<void>;
  deleteTask: (taskId: string, colId: ColumnId) => Promise<void>;
  updateTask: (
    taskId: string,
    colId: ColumnId,
    patch: TaskPatch,
  ) => Promise<void>;
  clearBoard: () => void;
  joinBoard: (boardId: number) => Promise<void>;
  leaveBoard: () => void;
}

// ─── 스토어 ──────────────────────────────────────────────────────────────────

export const useBoardStore = create<BoardState>((set, get) => ({
  tasks: emptyTasks(),
  isLoading: false,
  currentBoardId: null,

  loadBoard: async boardId => {
    set({ isLoading: true, currentBoardId: boardId });
    try {
      const cards = await boardApi.getCards(boardId);
      const tasks = emptyTasks();
      cards.forEach(card => {
        const col = card.columnKey as ColumnId;
        if (tasks[col]) tasks[col].push(toTask(card));
      });
      set({ tasks, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  joinBoard: async boardId => {
    const socket = await connectSocket();

    socket.emit('join_board', { boardId });

    // 다른 클라이언트의 카드 이동 수신
    socket.off('card_moved'); // 중복 리스너 방지
    socket.on('card_moved', ({ cardId, fromCol, toCol }) => {
      get().moveTask(String(cardId), fromCol as ColumnId, toCol as ColumnId);
    });
  },

  leaveBoard: () => {
    const boardId = get().currentBoardId;
    const socket = getSocket();
    if (socket && boardId) {
      socket.emit('leave_board', { boardId });
    }
    disconnectSocket();
  },

  moveTask: (taskId, fromCol, toCol) => {
    if (fromCol === toCol) return;

    // 낙관적 업데이트
    set(state => {
      const task = state.tasks[fromCol].find(t => t.id === taskId);
      if (!task) return state;
      return {
        tasks: {
          ...state.tasks,
          [fromCol]: state.tasks[fromCol].filter(t => t.id !== taskId),
          [toCol]: [...state.tasks[toCol], task],
        },
      };
    });

    // 소켓 확인용 로그 추가
    const socket = getSocket();
    const boardId = get().currentBoardId;

    const numericId = Number(taskId);
    if (socket && boardId && !isNaN(numericId)) {
      const newPosition = get().tasks[toCol].length - 1;
      AsyncStorage.getItem(TOKEN_KEY).then(token => {
        socket.emit('move_card', {
          boardId,
          cardId: numericId,
          fromCol,
          toCol,
          position: newPosition,
          token,
        });
      });
    }
  },

  addTask: async (colId, content) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const boardId = get().currentBoardId;
    if (!boardId) return;

    try {
      const card = await boardApi.createCard(boardId, trimmed, colId);
      set(state => ({
        tasks: {
          ...state.tasks,
          [colId]: [...state.tasks[colId], toTask(card)],
        },
      }));
    } catch {
      console.warn('카드 추가 실패');
    }
  },

  deleteTask: async (taskId, colId) => {
    // 낙관적 업데이트
    set(state => ({
      tasks: {
        ...state.tasks,
        [colId]: state.tasks[colId].filter(t => t.id !== taskId),
      },
    }));

    const numericId = Number(taskId);
    if (!isNaN(numericId)) {
      cardApi
        .deleteCard(numericId)
        .catch(() => console.warn('카드 삭제 API 실패'));
    }
  },

  updateTask: async (taskId, colId, patch) => {
    // get()으로 먼저 읽어서 updatedTask 확정
    const task = get().tasks[colId].find(t => t.id === taskId);
    if (!task) return;
    const updatedTask = { ...task, ...patch };

    // 낙관적 업데이트
    set(state => ({
      tasks: {
        ...state.tasks,
        [colId]: state.tasks[colId].map(t =>
          t.id === taskId ? updatedTask : t,
        ),
      },
    }));

    // API 호출
    const numericId = Number(taskId);
    if (!isNaN(numericId)) {
      cardApi
        .updateCard(numericId, {
          title: updatedTask.content,
          description: updatedTask.description,
          assignee: updatedTask.assignee,
          startDate: updatedTask.startDate
            ? (new Date(updatedTask.startDate) as any)
            : undefined,
          dueDate: updatedTask.dueDate
            ? (new Date(updatedTask.dueDate) as any)
            : undefined,
          labels: updatedTask.labels?.map(l => ({
            text: l.text,
            color: l.color,
          })),
        })
        .catch(() => console.warn('카드 수정 API 실패'));
    }
  },

  clearBoard: () => set({ tasks: emptyTasks(), currentBoardId: null }),
}));
