// src/screens/BoardScreen.tsx
import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  LayoutChangeEvent,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import DraggableCard from '../components/DraggableCard';
import AddCardInput from '../components/AddCardInput';
import CardDetailModal from '../components/CardDetailModal';
import { useBoardStore, COLUMNS } from '../store/useBoardStore';
import { ColumnId, DropPayload, Task } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = SCREEN_WIDTH * 0.8;
const COLUMN_STRIDE = COLUMN_WIDTH + 20;

// 오버레이 카드 높이 절반 — 손가락 위치가 카드 중앙에 오도록
const OVERLAY_HALF_HEIGHT = 100;

const AUTO_SCROLL_STEP = COLUMN_STRIDE;
const AUTO_SCROLL_REPEAT_DELAY = 1000;

interface DragOverlay {
  content: string;
  x: number;
  y: number;
}

const BoardScreen = ({ route, navigation }: any) => {
  const { boardId, boardTitle } = route.params ?? {};

  const tasks = useBoardStore(s => s.tasks);
  const moveTask = useBoardStore(s => s.moveTask);
  const loadBoard = useBoardStore(s => s.loadBoard);
  const isLoading = useBoardStore(s => s.isLoading);
  const joinBoard = useBoardStore(s => s.joinBoard);
  const leaveBoard = useBoardStore(s => s.leaveBoard);

  useEffect(() => {
    if (boardId) {
      loadBoard(boardId).then(() => {
        joinBoard(boardId);
      });
    }
    return () => {
      leaveBoard();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  useEffect(() => {
    navigation?.setOptions?.({ title: boardTitle ?? 'SyncFlow 보드' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardTitle]);

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useRef(0);
  const columnLayouts = useRef<Record<string, { start: number; end: number }>>(
    {},
  );
  const maxScrollX = (COLUMNS.length - 1) * COLUMN_STRIDE;
  const scrollDelta = useSharedValue(0);

  const columnScrollRefs = useRef<
    Record<ColumnId, React.RefObject<ScrollView>>
  >(
    Object.fromEntries(
      COLUMNS.map(col => [col.id, React.createRef<ScrollView>()]),
    ) as Record<ColumnId, React.RefObject<ScrollView>>,
  );

  // ── 자동 스크롤 ─────────────────────────────────────────────────────────────
  const autoScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoScrollActive = useRef(false);
  const autoScrollDirection = useRef<'left' | 'right' | null>(null);

  const stopAutoScroll = () => {
    autoScrollActive.current = false;
    autoScrollDirection.current = null;
    if (autoScrollTimerRef.current) {
      clearTimeout(autoScrollTimerRef.current);
      autoScrollTimerRef.current = null;
    }
  };

  const scheduleNextScroll = () => {
    if (!autoScrollActive.current) return;
    const dir = autoScrollDirection.current;
    if (!dir) return;
    const step = dir === 'right' ? AUTO_SCROLL_STEP : -AUTO_SCROLL_STEP;
    const next = Math.min(maxScrollX, Math.max(0, scrollX.current + step));
    scrollViewRef.current?.scrollTo({ x: next, animated: false });
    scrollX.current = next;
    scrollDelta.value = next;
    if (next <= 0 || next >= maxScrollX) {
      stopAutoScroll();
      return;
    }
    autoScrollTimerRef.current = setTimeout(
      scheduleNextScroll,
      AUTO_SCROLL_REPEAT_DELAY,
    );
  };

  const handleEdgeHold = (direction: 'left' | 'right' | null) => {
    if (!direction) {
      stopAutoScroll();
      return;
    }
    if (autoScrollActive.current && autoScrollDirection.current === direction)
      return;
    stopAutoScroll();
    autoScrollActive.current = true;
    autoScrollDirection.current = direction;
    scheduleNextScroll();
  };

  const handleScroll = (event: any) => {
    scrollX.current = event.nativeEvent.contentOffset.x;
    scrollDelta.value = event.nativeEvent.contentOffset.x;
  };

  const jumpToColumn = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * COLUMN_STRIDE,
      animated: true,
    });
  };

  const handleLayout = (colId: string, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    columnLayouts.current[colId] = { start: x, end: x + width };
  };

  // ── 드래그 오버레이 ──────────────────────────────────────────────────────────
  const [overlay, setOverlay] = useState<DragOverlay | null>(null);
  const pendingDrop = useRef<{
    taskId: string;
    fromCol: ColumnId;
    toCol: ColumnId;
  } | null>(null);

  // onDragStart: cardTopY 인자를 받지만 사용하지 않음
  // 오버레이는 단순히 손가락 위치 중심으로 표시
  const handleDragStart = useCallback(
    (content: string, fingerX: number, fingerY: number, _cardTopY: number) => {
      setOverlay({ content, x: fingerX, y: fingerY });
    },
    [],
  );

  const handleDragMove = useCallback((x: number, y: number) => {
    setOverlay(prev => (prev ? { ...prev, x, y } : null));
  }, []);

  const onDrop = useCallback(({ taskId, absoluteX, fromCol }: DropPayload) => {
    stopAutoScroll();
    const actualX = absoluteX + scrollX.current;
    let toCol: ColumnId | '' = '';
    Object.entries(columnLayouts.current).forEach(([id, layout]) => {
      if (actualX >= layout.start && actualX <= layout.end)
        toCol = id as ColumnId;
    });
    if (toCol && toCol !== fromCol) {
      pendingDrop.current = { taskId, fromCol, toCol: toCol as ColumnId };
    }
    setOverlay(null);
  }, []);

  if (overlay === null && pendingDrop.current) {
    const { taskId, fromCol, toCol } = pendingDrop.current;
    pendingDrop.current = null;
    Promise.resolve().then(() => moveTask(taskId, fromCol, toCol));
  }

  // ── 카드 상세 모달 ───────────────────────────────────────────────────────────
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<ColumnId | null>(
    null,
  );

  const handleCardPress = useCallback((task: Task, colId: ColumnId) => {
    setSelectedTask(task);
    setSelectedColumnId(colId);
  }, []);

  const handleModalClose = useCallback(() => {
    setSelectedTask(null);
    setSelectedColumnId(null);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4C6EF5" />
        <Text style={styles.loadingText}>보드 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {COLUMNS.map((col, index) => (
          <TouchableOpacity
            key={col.id}
            onPress={() => jumpToColumn(index)}
            style={[styles.tabItem, { borderBottomColor: col.color }]}
          >
            <Text style={styles.tabText}>{col.title.split(' ')[0]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToInterval={COLUMN_STRIDE}
        decelerationRate="fast"
        contentContainerStyle={styles.boardContent}
      >
        {COLUMNS.map(col => (
          <View
            key={col.id}
            onLayout={e => handleLayout(col.id, e)}
            style={styles.column}
          >
            <View style={[styles.header, { backgroundColor: col.color }]}>
              <Text style={styles.headerText}>{col.title}</Text>
              <Text style={styles.headerCount}>{tasks[col.id].length}</Text>
            </View>

            <ScrollView
              ref={columnScrollRefs.current[col.id]}
              style={styles.cardList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {tasks[col.id].map(task => (
                <DraggableCard
                  key={task.id}
                  {...task}
                  columnId={col.id}
                  onDrop={onDrop}
                  onStatusChange={(taskId, fromCol, toCol) =>
                    moveTask(taskId, fromCol, toCol)
                  }
                  onEdgeHold={handleEdgeHold}
                  onDragStart={handleDragStart}
                  onDragMove={handleDragMove}
                  onCardPress={() => handleCardPress(task, col.id)}
                  scrollDelta={scrollDelta}
                />
              ))}
              <AddCardInput
                columnId={col.id}
                columnScrollRef={columnScrollRefs.current[col.id]}
              />
            </ScrollView>
          </View>
        ))}
      </ScrollView>

      {/* 오버레이: 손가락 위치를 카드 중앙으로 맞춤
          OVERLAY_HALF_HEIGHT만큼 위로 올려서 카드 중앙 = 손가락 위치 */}
      {overlay && (
        <View
          pointerEvents="none"
          style={[
            styles.overlayCard,
            {
              top: overlay.y - OVERLAY_HALF_HEIGHT,
              left: overlay.x - COLUMN_WIDTH / 2,
            },
          ]}
        >
          <Text style={styles.overlayText}>{overlay.content}</Text>
        </View>
      )}

      <CardDetailModal
        task={selectedTask}
        columnId={selectedColumnId}
        onClose={handleModalClose}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#888', fontSize: 15 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    elevation: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 3,
  },
  tabText: { fontWeight: 'bold', fontSize: 13, color: '#333' },
  boardContent: { padding: 10 },
  column: {
    width: COLUMN_WIDTH,
    backgroundColor: '#ebecf0',
    borderRadius: 12,
    marginRight: 20,
    height: '90%',
    overflow: 'hidden',
  },
  header: {
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  headerCount: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  cardList: { padding: 10 },
  overlayCard: {
    position: 'absolute',
    width: COLUMN_WIDTH - 20,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 24,
    opacity: 0.95,
  },
  overlayText: { fontSize: 15, color: '#333' },
});

export default BoardScreen;
