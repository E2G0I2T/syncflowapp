// store/useBoardStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, TaskMap, ColumnId, Column, Label } from '../types';

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ─── 상수 ────────────────────────────────────────────────────────────────────

export const COLUMNS: Column[] = [
  { id: 'todo',    title: '할 일 📝',   color: '#4C6EF5' },
  { id: 'doing',   title: '진행 중 🚀', color: '#FAB005' },
  { id: 'done',    title: '완료 ✅',    color: '#40C057' },
  { id: 'archive', title: '보관함 📦',  color: '#868E96' },
];

// 기본 라벨 팔레트 (CardDetailModal에서 선택용)
export const LABEL_PRESETS: Omit<Label, 'id'>[] = [
  { text: '기획',   color: '#845EF7' },
  { text: '디자인', color: '#F06595' },
  { text: '개발',   color: '#339AF0' },
  { text: '테스트', color: '#20C997' },
  { text: '긴급',   color: '#F03E3E' },
  { text: '문서',   color: '#F59F00' },
];

const initialTasks: TaskMap = {
  todo: [
    { id: '1', content: '방 청소하기',        createdAt: Date.now() },
    { id: '2', content: '리액트 공부',        createdAt: Date.now() },
  ],
  doing: [
    { id: '3', content: '드래그 앤 드롭 구현', createdAt: Date.now() },
  ],
  done: [
    { id: '4', content: '깃허브 연결',        createdAt: Date.now() },
  ],
  archive: [],
};

// ─── 스토어 타입 ──────────────────────────────────────────────────────────────

// updateTask에서 수정 가능한 필드 전체
type TaskPatch = Partial<Pick<Task,
  'content' | 'description' | 'assignee' | 'startDate' | 'dueDate' | 'labels'
>>;

interface BoardState {
  tasks: TaskMap;
  moveTask:   (taskId: string, fromCol: ColumnId, toCol: ColumnId) => void;
  addTask:    (colId: ColumnId, content: string) => void;
  deleteTask: (taskId: string, colId: ColumnId) => void;
  updateTask: (taskId: string, colId: ColumnId, patch: TaskPatch) => void;
}

// ─── 스토어 생성 ──────────────────────────────────────────────────────────────

export const useBoardStore = create<BoardState>()(
  persist(
    (set) => ({
      tasks: initialTasks,

      moveTask: (taskId, fromCol, toCol) => {
        if (fromCol === toCol) return;
        set((state) => {
          const task = state.tasks[fromCol].find((t) => t.id === taskId);
          if (!task) return state;
          return {
            tasks: {
              ...state.tasks,
              [fromCol]: state.tasks[fromCol].filter((t) => t.id !== taskId),
              [toCol]:   [...state.tasks[toCol], task],
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
    }),
    {
      name:    'syncflow-board',                        // AsyncStorage 키
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);