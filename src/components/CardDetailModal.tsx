// components/CardDetailModal.tsx
import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Modal, ScrollView,
  KeyboardAvoidingView, Platform, Alert, StatusBar,
} from 'react-native';
import {
  RichEditor,
  RichToolbar,
  actions,
} from 'react-native-pell-rich-editor';
import { Task, Label, ColumnId } from '../types';
import { useBoardStore, LABEL_PRESETS } from '../store/useBoardStore';

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const isValidDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

// [1번 수정] Android 상태바 높이를 동적으로 가져와 헤더 상단 여백 계산
const STATUS_BAR_HEIGHT = StatusBar.currentHeight ?? 24;
const HEADER_PADDING_TOP = Platform.OS === 'ios' ? 54 : STATUS_BAR_HEIGHT + 12;

interface Props {
  task: Task | null;
  columnId: ColumnId | null;
  onClose: () => void;
}

const CardDetailModal = ({ task, columnId, onClose }: Props) => {
  const updateTask = useBoardStore((s) => s.updateTask);
  const deleteTask = useBoardStore((s) => s.deleteTask);

  const [title,     setTitle]     = useState('');
  const [assignee,  setAssignee]  = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate,   setDueDate]   = useState('');
  const [labels,    setLabels]    = useState<Label[]>([]);

  const richEditor = useRef<RichEditor>(null);

  useEffect(() => {
    if (!task) return;
    setTitle(task.content ?? '');
    setAssignee(task.assignee ?? '');
    setStartDate(task.startDate ?? '');
    setDueDate(task.dueDate ?? '');
    setLabels(task.labels ?? []);
    setTimeout(() => {
      richEditor.current?.setContentHTML(task.description ?? '');
    }, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  if (!task || !columnId) return null;

  const toggleLabel = (preset: Omit<Label, 'id'>) => {
    setLabels((prev) => {
      const exists = prev.find((l) => l.text === preset.text);
      if (exists) return prev.filter((l) => l.text !== preset.text);
      return [...prev, { id: generateId(), ...preset }];
    });
  };

  const isLabelActive = (text: string) => labels.some((l) => l.text === text);

  const handleSave = () => {
    if (!title.trim()) { Alert.alert('알림', '제목을 입력해주세요.'); return; }
    if (startDate && !isValidDate(startDate)) {
      Alert.alert('알림', '시작일 형식을 확인해주세요. (YYYY-MM-DD)'); return;
    }
    if (dueDate && !isValidDate(dueDate)) {
      Alert.alert('알림', '마감일 형식을 확인해주세요. (YYYY-MM-DD)'); return;
    }
    richEditor.current?.getContentHtml().then((html) => {
      updateTask(task.id, columnId, {
        content:     title.trim(),
        description: html,
        assignee:    assignee.trim() || undefined,
        startDate:   startDate || undefined,
        dueDate:     dueDate   || undefined,
        labels:      labels.length ? labels : undefined,
      });
      onClose();
    });
  };

  const handleDelete = () => {
    Alert.alert('카드 삭제', '정말 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive',
        onPress: () => { deleteTask(task.id, columnId); onClose(); } },
    ]);
  };

  const getLabelChipStyle = (active: boolean, color: string) => ([
    styles.labelChip,
    active ? { backgroundColor: color } : styles.labelChipInactive,
  ]);

  const getLabelTextStyle = (active: boolean) => ([
    styles.labelChipText,
    active ? styles.labelChipTextActive : styles.labelChipTextInactive,
  ]);

  return (
    <Modal visible={!!task} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* [1번 수정] 헤더 paddingTop을 STATUS_BAR_HEIGHT 기반으로 */}
        <View style={[styles.header, { paddingTop: HEADER_PADDING_TOP }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.headerBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>카드 상세</Text>
          <TouchableOpacity onPress={handleSave} style={styles.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.headerBtnText, styles.saveText]}>저장</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* 제목 */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>제목</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="카드 제목"
              placeholderTextColor="#bbb"
            />
          </View>

          {/* 담당자 */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>담당자</Text>
            <TextInput
              style={styles.fieldInput}
              value={assignee}
              onChangeText={setAssignee}
              placeholder="이름 입력"
              placeholderTextColor="#bbb"
            />
          </View>

          {/* 일정 */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>일정</Text>
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>시작일</Text>
                <TextInput
                  style={styles.dateInput}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#bbb"
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
              <Text style={styles.dateSep}>→</Text>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>마감일</Text>
                <TextInput
                  style={styles.dateInput}
                  value={dueDate}
                  onChangeText={setDueDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#bbb"
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
            </View>
          </View>

          {/* 라벨 */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>카테고리 라벨</Text>
            <View style={styles.labelRow}>
              {LABEL_PRESETS.map((preset) => {
                const active = isLabelActive(preset.text);
                return (
                  <TouchableOpacity
                    key={preset.text}
                    onPress={() => toggleLabel(preset)}
                    style={getLabelChipStyle(active, preset.color)}
                  >
                    <Text style={getLabelTextStyle(active)}>{preset.text}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 상세 내용 */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>상세 내용</Text>
            <RichToolbar
              editor={richEditor}
              actions={[
                actions.setBold, actions.setItalic, actions.setUnderline,
                actions.setStrikethrough, actions.insertBulletsList,
                actions.insertOrderedList, actions.insertLink,
                actions.insertImage, actions.setTextColor,
                actions.undo, actions.redo,
              ]}
              style={styles.toolbar}
              iconTint="#555"
              selectedIconTint="#4C6EF5"
              selectedButtonStyle={styles.toolbarBtnActive}
            />
            <RichEditor
              ref={richEditor}
              style={styles.editor}
              placeholder="업무 상세 내용을 입력하세요..."
              initialHeight={240}
              useContainer
              pasteAsPlainText={false}
              editorStyle={EDITOR_STYLE}
            />
          </View>

          {/* 삭제 */}
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>🗑️ 카드 삭제</Text>
          </TouchableOpacity>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const EDITOR_STYLE = {
  backgroundColor: '#fff',
  color: '#333',
  placeholderColor: '#bbb',
  contentCSSText: 'font-size: 15px; line-height: 1.6;',
} as const;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8f9fa' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 3,
  },
  headerBtn:     { minWidth: 44, alignItems: 'center', paddingVertical: 8 },
  headerBtnText: { fontSize: 18, color: '#555' },
  headerTitle:   { fontSize: 17, fontWeight: 'bold', color: '#222' },
  saveText:      { color: '#4C6EF5', fontWeight: 'bold', fontSize: 16 },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16 },

  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  titleInput: {
    fontSize: 17,
    fontWeight: '600',
    color: '#222',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  fieldInput: {
    fontSize: 15,
    color: '#333',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  dateRow:   { flexDirection: 'row', alignItems: 'center' },
  dateField: { flex: 1 },
  dateLabel: { fontSize: 11, color: '#aaa', marginBottom: 4 },
  dateInput: {
    fontSize: 14,
    color: '#333',
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 6,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  dateSep: { marginHorizontal: 10, color: '#aaa', fontSize: 16 },

  labelRow:              { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  labelChip:             { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  labelChipInactive:     { backgroundColor: '#f0f0f0' },
  labelChipText:         { fontSize: 13, fontWeight: '500' },
  labelChipTextActive:   { color: 'white' },
  labelChipTextInactive: { color: '#555' },

  toolbar: {
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderBottomWidth: 0,
  },
  toolbarBtnActive: { backgroundColor: '#e8eeff' },
  editor: {
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    minHeight: 240,
  },

  deleteButton: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#fff5f5',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffc9c9',
    marginBottom: 8,
  },
  deleteButtonText: { color: '#e03131', fontWeight: '600', fontSize: 15 },
  bottomSpacer:     { height: 40 },
});

export default CardDetailModal;