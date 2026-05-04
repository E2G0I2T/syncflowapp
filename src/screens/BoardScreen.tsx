// screens/BoardScreen.tsx
import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Dimensions, LayoutChangeEvent, TouchableOpacity,
} from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import DraggableCard from '../components/DraggableCard';
import { useBoardStore, COLUMNS } from '../store/useBoardStore';
import { ColumnId, DropPayload } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH  = SCREEN_WIDTH * 0.8;
const COLUMN_STRIDE = COLUMN_WIDTH + 20;

const AUTO_SCROLL_STEP         = COLUMN_STRIDE;
const AUTO_SCROLL_REPEAT_DELAY = 1000;

// 드래그 중인 카드 오버레이 정보
interface DragOverlay {
  content: string;
  x: number;   // 화면 절대 좌표
  y: number;
}

const BoardScreen = () => {
  const tasks    = useBoardStore((s) => s.tasks);
  const moveTask = useBoardStore((s) => s.moveTask);

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX       = useRef(0);
  const columnLayouts = useRef<Record<string, { start: number; end: number }>>({});
  const maxScrollX    = (COLUMNS.length - 1) * COLUMN_STRIDE;

  const scrollDelta = useSharedValue(0);

  // 자동 스크롤
  const autoScrollTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoScrollActive    = useRef(false);
  const autoScrollDirection = useRef<'left' | 'right' | null>(null);

  const stopAutoScroll = () => {
    autoScrollActive.current    = false;
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
    scrollX.current   = next;
    scrollDelta.value = next;
    if (next <= 0 || next >= maxScrollX) { stopAutoScroll(); return; }
    autoScrollTimerRef.current = setTimeout(scheduleNextScroll, AUTO_SCROLL_REPEAT_DELAY);
  };

  const handleEdgeHold = (direction: 'left' | 'right' | null) => {
    if (!direction) { stopAutoScroll(); return; }
    if (autoScrollActive.current && autoScrollDirection.current === direction) return;
    stopAutoScroll();
    autoScrollActive.current    = true;
    autoScrollDirection.current = direction;
    scheduleNextScroll();
  };

  const handleScroll = (event: any) => {
    scrollX.current   = event.nativeEvent.contentOffset.x;
    scrollDelta.value = event.nativeEvent.contentOffset.x;
  };

  const jumpToColumn = (index: number) => {
    scrollViewRef.current?.scrollTo({ x: index * COLUMN_STRIDE, animated: true });
  };

  const handleLayout = (colId: string, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    columnLayouts.current[colId] = { start: x, end: x + width };
  };

  // ── 오버레이 상태 ─────────────────────────────────────────────────────────
  // overlay: 화면에 떠 있는 카드 ghost
  // pendingDrop: 오버레이가 사라진 후 실행할 moveTask 인자
  const [overlay, setOverlay] = useState<DragOverlay | null>(null);
  const pendingDrop = useRef<{ taskId: string; fromCol: ColumnId; toCol: ColumnId } | null>(null);

  const handleDragStart = useCallback((content: string, x: number, y: number) => {
    setOverlay({ content, x, y });
  }, []);

  const handleDragMove = useCallback((x: number, y: number) => {
    setOverlay((prev) => prev ? { ...prev, x, y } : null);
  }, []);

  // 드롭: 오버레이를 먼저 제거 → 그 다음 프레임에 moveTask 실행
  // 이렇게 하면 원본 카드가 리렌더되기 전에 오버레이가 사라져서
  // "카드가 두 곳에 동시에 보이거나 사라지는" 현상이 없어짐
  const onDrop = useCallback(({ taskId, absoluteX, fromCol }: DropPayload) => {
    stopAutoScroll();

    const actualX = absoluteX + scrollX.current;
    let toCol: ColumnId | '' = '';
    Object.entries(columnLayouts.current).forEach(([id, layout]) => {
      if (actualX >= layout.start && actualX <= layout.end) toCol = id as ColumnId;
    });

    if (toCol && toCol !== fromCol) {
      // 이동이 필요한 경우: pendingDrop에 저장해두고 오버레이 제거
      pendingDrop.current = { taskId, fromCol, toCol: toCol as ColumnId };
    }

    // 오버레이 제거 (setState → 다음 렌더 사이클)
    setOverlay(null);
  }, []);

  // overlay가 null이 되는 렌더 직후 pendingDrop 실행
  // useEffect 대신 렌더 중 처리하면 flicker가 없음
  if (overlay === null && pendingDrop.current) {
    const { taskId, fromCol, toCol } = pendingDrop.current;
    pendingDrop.current = null;
    // 동기 실행하면 렌더 중 setState가 되므로 microtask로 밀어냄
    Promise.resolve().then(() => moveTask(taskId, fromCol, toCol));
  }

  return (
    <View style={styles.container}>
      {/* 상단 점프 탭 */}
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

      {/* 메인 보드 */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToInterval={COLUMN_STRIDE}
        decelerationRate="fast"
        contentContainerStyle={styles.boardContent}
      >
        {COLUMNS.map((col) => (
          <View
            key={col.id}
            onLayout={(e) => handleLayout(col.id, e)}
            style={styles.column}
          >
            <View style={[styles.header, { backgroundColor: col.color }]}>
              <Text style={styles.headerText}>{col.title}</Text>
              <Text style={styles.headerCount}>{tasks[col.id].length}</Text>
            </View>
            <ScrollView style={styles.cardList} showsVerticalScrollIndicator={false}>
              {tasks[col.id].map((task) => (
                <DraggableCard
                  key={task.id}
                  {...task}
                  columnId={col.id}
                  onDrop={onDrop}
                  onStatusChange={(taskId, fromCol, toCol) => moveTask(taskId, fromCol, toCol)}
                  onEdgeHold={handleEdgeHold}
                  onDragStart={handleDragStart}
                  onDragMove={handleDragMove}
                  scrollDelta={scrollDelta}
                />
              ))}
            </ScrollView>
          </View>
        ))}
      </ScrollView>

      {/* 드래그 오버레이: ScrollView 바깥, 최상단에 렌더 */}
      {overlay && (
        <View
          pointerEvents="none"
          style={[
            styles.overlay,
            {
              // 손가락 위치 기준으로 카드 중앙이 오도록 보정
              top:  overlay.y - 28,
              left: overlay.x - (COLUMN_WIDTH / 2),
            },
          ]}
        >
          <Text style={styles.overlayText}>{overlay.content}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f8f9fa' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingTop: 40,
    elevation: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabItem:      { flex: 1, alignItems: 'center', paddingBottom: 12, borderBottomWidth: 3 },
  tabText:      { fontWeight: 'bold', fontSize: 13, color: '#333' },
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
  headerText:  { color: 'white', fontWeight: 'bold', fontSize: 16 },
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

  // 오버레이 카드 스타일
  overlay: {
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
    opacity: 0.96,
  },
  overlayText: { fontSize: 15, color: '#333' },
});

export default BoardScreen;