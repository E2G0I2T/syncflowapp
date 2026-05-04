// types/index.ts

export interface Task {
  id: string;
  content: string;
  description?: string;   // 나중에 카드 상세 모달용
  createdAt: number;      // 생성 타임스탬프 (정렬, 로그 대비)
}

export type ColumnId = 'todo' | 'doing' | 'done' | 'archive';

export interface Column {
  id: ColumnId;
  title: string;
  color: string;
}

// 보드 전체 상태 타입
export type TaskMap = Record<ColumnId, Task[]>;

// 드래그앤드롭 이벤트 타입
export interface DropPayload {
  taskId: string;
  absoluteX: number;
  fromCol: ColumnId;
}

// 상태 변경 이벤트 타입
export interface StatusChangePayload {
  taskId: string;
  fromCol: ColumnId;
  toCol: ColumnId;
}