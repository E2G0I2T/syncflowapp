// components/DraggableCard.tsx
import React, { useState, useRef } from 'react';
import {
  StyleSheet, Text, View,
  Modal, Pressable, Dimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import {
  GestureDetector,
  Gesture,
  TouchableOpacity,   // RN의 TouchableOpacity 대신 RNGH 것 사용
} from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import { ColumnId, DropPayload } from '../types';
import { COLUMNS, useBoardStore } from '../store/useBoardStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const EDGE_ZONE  = SCREEN_WIDTH * 0.15;
const HOLD_DELAY = 1000;

interface CardProps {
  id: string;
  content: string;
  columnId: ColumnId;
  onDrop: (payload: DropPayload) => void;
  onStatusChange: (taskId: string, fromCol: ColumnId, toCol: ColumnId) => void;
  onEdgeHold: (direction: 'left' | 'right' | null) => void;
  onDragStart: (content: string, x: number, y: number) => void;
  onDragMove: (x: number, y: number) => void;
  scrollDelta: SharedValue<number>;
}

// ─── 드롭다운 ────────────────────────────────────────────────────────────────

interface DropdownMenuProps {
  visible: boolean;
  anchorPosition: { x: number; y: number };
  columnId: ColumnId;
  onStatusChange: (toCol: ColumnId) => void;
  onDelete: () => void;
  onClose: () => void;
}

const DropdownMenu = ({
  visible, anchorPosition, columnId,
  onStatusChange, onDelete, onClose,
}: DropdownMenuProps) => {
  const [showSubMenu, setShowSubMenu] = useState(false);
  const handleClose = () => { setShowSubMenu(false); onClose(); };
  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <View
          style={[styles.menuContainer, { top: anchorPosition.y, left: anchorPosition.x }]}
          onStartShouldSetResponder={() => true}
        >
          <TouchableOpacity style={styles.menuItem} onPress={() => setShowSubMenu((p) => !p)}>
            <Text style={styles.menuItemText}>🔄 상태 변경</Text>
            <Text style={styles.menuItemArrow}>{showSubMenu ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showSubMenu && (
            <View style={styles.subMenu}>
              {COLUMNS.filter((col) => col.id !== columnId).map((col) => (
                <TouchableOpacity
                  key={col.id}
                  style={styles.subMenuItem}
                  onPress={() => { onStatusChange(col.id); handleClose(); }}
                >
                  <View style={[styles.subMenuDot, { backgroundColor: col.color }]} />
                  <Text style={styles.subMenuItemText}>{col.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => { onDelete(); handleClose(); }}
          >
            <Text style={[styles.menuItemText, styles.deleteText]}>🗑️ 카드 삭제</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
};

// ─── DraggableCard ───────────────────────────────────────────────────────────

const DraggableCard = ({
  id, content, columnId,
  onDrop, onStatusChange, onEdgeHold,
  onDragStart, onDragMove,
  scrollDelta,
}: CardProps) => {
  const deleteTask = useBoardStore((s) => s.deleteTask);

  const isPressed              = useSharedValue(false);
  const scrollDeltaAtDragStart = useSharedValue(0);

  // 메뉴 버튼이 눌린 상태인지 추적 (워크렛에서 읽기 위해 SharedValue)
  const menuTouched = useSharedValue(false);

  const [menuVisible, setMenuVisible]   = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const edgeTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentEdge = useRef<'left' | 'right' | null>(null);

  // ── 가장자리 감지 ──────────────────────────────────────────────────────────
  const checkEdge = (absoluteX: number) => {
    if (absoluteX < EDGE_ZONE)                    triggerEdge('left');
    else if (absoluteX > SCREEN_WIDTH - EDGE_ZONE) triggerEdge('right');
    else                                            cancelEdge();
  };

  const triggerEdge = (direction: 'left' | 'right') => {
    if (currentEdge.current === direction) return;
    cancelEdge();
    currentEdge.current = direction;
    edgeTimer.current = setTimeout(() => onEdgeHold(direction), HOLD_DELAY);
  };

  const cancelEdge = () => {
    if (edgeTimer.current) { clearTimeout(edgeTimer.current); edgeTimer.current = null; }
    currentEdge.current = null;
    onEdgeHold(null);
  };

  // ── 드래그 제스처 ──────────────────────────────────────────────────────────
  const panGesture = Gesture.Pan()
    .onBegin((event) => {
      // 메뉴 버튼이 눌린 상태면 드래그 전체 무시
      if (menuTouched.value) return;
      isPressed.value = true;
      scrollDeltaAtDragStart.value = scrollDelta.value;
      runOnJS(onDragStart)(content, event.absoluteX, event.absoluteY);
    })
    .onUpdate((event) => {
      if (!isPressed.value) return;   // onBegin에서 막힌 경우 업데이트도 무시
      runOnJS(checkEdge)(event.absoluteX);
      runOnJS(onDragMove)(event.absoluteX, event.absoluteY);
    })
    .onFinalize((event) => {
      if (!isPressed.value) return;
      isPressed.value = false;
      scrollDeltaAtDragStart.value = 0;
      runOnJS(cancelEdge)();
      runOnJS(onDrop)({ taskId: id, absoluteX: event.absoluteX, fromCol: columnId });
    });

  // ── 메뉴 버튼 탭 제스처 ────────────────────────────────────────────────────
  // Tap 제스처로 메뉴 버튼을 감싸고 Pan보다 우선순위를 높임
  const menuButtonRef = useRef<View>(null);

  const openMenu = () => {
    menuButtonRef.current?.measureInWindow((x, y, _w, height) => {
      const menuWidth = 180;
      const adjustedX = x + menuWidth > SCREEN_WIDTH - 10
        ? SCREEN_WIDTH - menuWidth - 10 : x;
      setMenuPosition({ x: adjustedX, y: y + height + 4 });
      setMenuVisible(true);
    });
  };

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      // 탭 시작 시 Pan이 활성화되지 않도록 플래그 설정
      menuTouched.value = true;
    })
    .onEnd(() => {
      runOnJS(openMenu)();
    })
    .onFinalize(() => {
      // 탭 종료(성공/실패 무관) 후 플래그 해제
      menuTouched.value = false;
    });

  // Pan과 Tap을 Exclusive로 조합 → 탭이 인식되면 Pan은 실행 안 됨
  const exclusiveGesture = Gesture.Exclusive(tapGesture, panGesture);

  // ── 원본 카드 스타일 ────────────────────────────────────────────────────────
  const animatedStyle = useAnimatedStyle(() => ({
    opacity:    isPressed.value ? 0.25 : 1,
    transform:  [{ scale: withSpring(isPressed.value ? 0.97 : 1) }],
    backgroundColor: 'white',
  }));

  return (
    <>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.card, animatedStyle]}>
          <View style={styles.cardContent}>
            <Text style={styles.text}>{content}</Text>

            {/* 메뉴 버튼만 별도 GestureDetector로 감싸서 Tap 처리 */}
            <GestureDetector gesture={exclusiveGesture}>
              <Animated.View
                ref={menuButtonRef as any}
                style={styles.menuButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.menuIcon}>⋮</Text>
              </Animated.View>
            </GestureDetector>
          </View>
        </Animated.View>
      </GestureDetector>

      <DropdownMenu
        visible={menuVisible}
        anchorPosition={menuPosition}
        columnId={columnId}
        onStatusChange={(toCol) => onStatusChange(id, columnId, toCol)}
        onDelete={() => deleteTask(id, columnId)}
        onClose={() => setMenuVisible(false)}
      />
    </>
  );
};

// ─── 스타일 ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  text:       { fontSize: 15, color: '#333', flex: 1 },
  menuButton: { marginLeft: 10, paddingHorizontal: 8, paddingVertical: 4 },
  menuIcon:   { fontSize: 20, color: '#aaa', fontWeight: 'bold' },

  overlay: { flex: 1 },
  menuContainer: {
    position: 'absolute',
    width: 180,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  menuItemText:  { fontSize: 14, color: '#333' },
  menuItemArrow: { fontSize: 10, color: '#aaa' },
  deleteText:    { color: '#e03131' },
  divider:       { height: 1, backgroundColor: '#f0f0f0' },

  subMenu: {
    backgroundColor: '#fafafa',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  subMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 20,
    gap: 10,
  },
  subMenuDot:      { width: 8, height: 8, borderRadius: 4 },
  subMenuItemText: { fontSize: 13, color: '#444' },
});

export default DraggableCard;