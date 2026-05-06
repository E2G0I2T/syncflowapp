// types/index.ts

export interface Label {
  id: string;
  text: string;
  color: string;
}

export interface Task {
  id: string;
  content: string;        // 카드 제목
  description?: string;   // 리치 텍스트 HTML (pell-rich-editor 출력)
  assignee?: string;      // 담당자 (자유 입력)
  startDate?: string;     // 'YYYY-MM-DD'
  dueDate?: string;       // 'YYYY-MM-DD'
  labels?: Label[];       // 카테고리 라벨 배열
  createdAt: number;
}

export type ColumnId = 'todo' | 'doing' | 'done' | 'archive';

export interface Column {
  id: ColumnId;
  title: string;
  color: string;
}

export type TaskMap = Record<ColumnId, Task[]>;

export interface DropPayload {
  taskId: string;
  absoluteX: number;
  fromCol: ColumnId;
}

export interface StatusChangePayload {
  taskId: string;
  fromCol: ColumnId;
  toCol: ColumnId;
}