// store/useBoardStore.ts
import { create } from 'zustand';
import { Task, TaskMap, ColumnId, Column } from '../types';

// 고유 ID 생성 헬퍼 (uuid 라이브러리 없이 사용)
const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ─── 상수 ────────────────────────────────────────────────────────────────────

export const COLUMNS: Column[] = [
  { id: 'todo',    title: '할 일 📝',  color: '#4C6EF5' },
  { id: 'doing',   title: '진행 중 🚀', color: '#FAB005' },
  { id: 'done',    title: '완료 ✅',   color: '#40C057' },
  { id: 'archive', title: '보관함 📦', color: '#868E96' },
];

const initialTasks: TaskMap = {
  todo: [
    { id: '1', content: '방 청소하기',   createdAt: Date.now() },
    { id: '2', content: '리액트 공부',   createdAt: Date.now() },
  ],
  doing: [
    { id: '3', content: '드래그 앤 드롭 구현', createdAt: Date.now() },
  ],
  done: [
    { id: '4', content: '깃허브 연결', createdAt: Date.now() },
  ],
  archive: [],
};

// ─── 스토어 타입 ──────────────────────────────────────────────────────────────

interface BoardState {
  tasks: TaskMap;

  /** 카드를 다른 컬럼으로 이동 */
  moveTask: (taskId: string, fromCol: ColumnId, toCol: ColumnId) => void;

  /** 새 카드 추가 */
  addTask: (colId: ColumnId, content: string) => void;

  /** 카드 삭제 */
  deleteTask: (taskId: string, colId: ColumnId) => void;

  /** 카드 내용 수정 (나중에 모달 연결용) */
  updateTask: (taskId: string, colId: ColumnId, patch: Partial<Pick<Task, 'content' | 'description'>>) => void;
}

// ─── 스토어 생성 ──────────────────────────────────────────────────────────────

export const useBoardStore = create<BoardState>((set) => ({
  tasks: initialTasks,

  moveTask: (taskId, fromCol, toCol) => {
    if (fromCol === toCol) return;
    set((state) => {
      const taskToMove = state.tasks[fromCol].find((t) => t.id === taskId);
      if (!taskToMove) return state;
      return {
        tasks: {
          ...state.tasks,
          [fromCol]: state.tasks[fromCol].filter((t) => t.id !== taskId),
          [toCol]:   [...state.tasks[toCol], taskToMove],
        },
      };
    });
  },

  addTask: (colId, content) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const newTask: Task = {
      id:        generateId(),
      content:   trimmed,
      createdAt: Date.now(),
    };
    set((state) => ({
      tasks: {
        ...state.tasks,
        [colId]: [...state.tasks[colId], newTask],
      },
    }));
  },

  deleteTask: (taskId, colId) => {
    set((state) => ({
      tasks: {
        ...state.tasks,
        [colId]: state.tasks[colId].filter((t) => t.id !== taskId),
      },
    }));
  },

  updateTask: (taskId, colId, patch) => {
    set((state) => ({
      tasks: {
        ...state.tasks,
        [colId]: state.tasks[colId].map((t) =>
          t.id === taskId ? { ...t, ...patch } : t
        ),
      },
    }));
  },
}));