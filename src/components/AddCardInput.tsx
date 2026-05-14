// components/AddCardInput.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Keyboard, ScrollView, KeyboardEvent,
} from 'react-native';
import { ColumnId } from '../types';
import { useBoardStore } from '../store/useBoardStore';

interface Props {
  columnId: ColumnId;
  columnScrollRef: React.RefObject<ScrollView>;
}

const AddCardInput = ({ columnId, columnScrollRef }: Props) => {
  const addTask = useBoardStore((s) => s.addTask);

  const [open, setOpen]               = useState(false);
  const [text, setText]               = useState('');
  const [spacerHeight, setSpacerHeight] = useState(0);

  const inputRef          = useRef<TextInput>(null);
  const containerRef      = useRef<View>(null);
  const keyboardHeightRef = useRef(0);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e: KeyboardEvent) => {
      keyboardHeightRef.current = e.endCoordinates.height;
      if (open) {
        setSpacerHeight(e.endCoordinates.height);
        setTimeout(() => scrollToInput(), 50);
      }
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      keyboardHeightRef.current = 0;
      setSpacerHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const scrollToInput = () => {
    if (!containerRef.current || !columnScrollRef.current) return;
    containerRef.current.measureLayout(
      columnScrollRef.current as unknown as React.ElementRef<typeof View>,
      (_x, y, _w, h) => {
        columnScrollRef.current?.scrollTo({ y: y + h + 16, animated: true });
      },
      () => {
        columnScrollRef.current?.scrollToEnd({ animated: true });
      },
    );
  };

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleConfirm = () => {
    if (text.trim()) addTask(columnId, text.trim());
    setText('');
    setOpen(false);
    setSpacerHeight(0);
    Keyboard.dismiss();
  };

  const handleCancel = () => {
    setText('');
    setOpen(false);
    setSpacerHeight(0);
    Keyboard.dismiss();
  };

  if (!open) {
    return (
      <TouchableOpacity style={styles.addButton} onPress={handleOpen}>
        <Text style={styles.addButtonText}>＋ 카드 추가</Text>
      </TouchableOpacity>
    );
  }

  return (
    <>
      <View ref={containerRef} style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="카드 제목 입력..."
          placeholderTextColor="#aaa"
          returnKeyType="done"
          onSubmitEditing={handleConfirm}
          onFocus={scrollToInput}
        />
        <View style={styles.actions}>
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmText}>추가</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
      {spacerHeight > 0 && <View style={{ height: spacerHeight }} />}
    </>
  );
};

const styles = StyleSheet.create({
  addButton: {
    margin: 10,
    marginTop: 4,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
  },
  addButtonText: { color: '#555', fontSize: 14 },

  inputContainer: {
    margin: 10,
    marginTop: 4,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  input: {
    padding: 12,
    fontSize: 15,
    color: '#333',
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  confirmButton: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#4C6EF5',
  },
  confirmText:  { color: 'white', fontWeight: 'bold', fontSize: 14 },
  cancelButton: {
    width: 44,
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  cancelText: { color: '#888', fontSize: 16 },
});

export default AddCardInput;