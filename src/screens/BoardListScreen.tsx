// src/screens/BoardListScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
  Platform, StatusBar, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKEN_KEY, USER_KEY } from '../api/client';
import { boardApi, BoardSummary } from '../api/board';
import { useBoardStore } from '../store/useBoardStore';

const BoardListScreen = ({ navigation }: any) => {
  const clearBoard  = useBoardStore((s) => s.clearBoard);
  // 실기기 제스처 바 / 홈 인디케이터 높이를 동적으로 가져옴
  const insets      = useSafeAreaInsets();
  const bottomInset = insets.bottom + 8;

  const [boards,    setBoards]    = useState<BoardSummary[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [newTitle,  setNewTitle]  = useState('');
  const [creating,  setCreating]  = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [userName,  setUserName]  = useState('');

  const fetchBoards = useCallback(async () => {
    try {
      const data = await boardApi.getBoards();
      setBoards(data);
    } catch {
      Alert.alert('오류', '보드 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(USER_KEY).then((raw) => {
      if (raw) {
        const user = JSON.parse(raw);
        setUserName(user.name);
      }
    });
    fetchBoards();
  }, [fetchBoards]);

  const handleCreateBoard = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const board = await boardApi.createBoard(newTitle.trim());
      setBoards((prev) => [{
        id:        board.id,
        title:     board.title,
        ownerName: board.ownerName,
        createdAt: board.createdAt,
        cardCount: 0,
      }, ...prev]);
      setNewTitle('');
      setShowInput(false);
    } catch {
      Alert.alert('오류', '보드 생성에 실패했습니다.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBoard = (boardId: number) => {
    Alert.alert('보드 삭제', '정말 삭제할까요? 모든 카드가 삭제됩니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          try {
            await boardApi.deleteBoard(boardId);
            setBoards((prev) => prev.filter((b) => b.id !== boardId));
          } catch {
            Alert.alert('오류', '보드 삭제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  const handleLogout = async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    clearBoard();
    navigation.replace('Login');
  };

  const handleEnterBoard = (board: BoardSummary) => {
    navigation.navigate('Board', { boardId: board.id, boardTitle: board.title });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4C6EF5" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>내 보드</Text>
          <Text style={styles.headerSub}>{userName}님 안녕하세요 👋</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      {/* 보드 목록 */}
      <FlatList
        data={boards}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={
          showInput ? styles.listContentCompact : styles.listContentFull
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>아직 보드가 없어요</Text>
            <Text style={styles.emptySubText}>아래 버튼으로 첫 보드를 만들어보세요!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.boardCard}
            onPress={() => handleEnterBoard(item)}
            onLongPress={() => handleDeleteBoard(item.id)}
          >
            <View style={styles.boardCardLeft}>
              <View style={styles.boardIcon}>
                <Text style={styles.boardIconText}>
                  {item.title.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.boardTitle}>{item.title}</Text>
                <Text style={styles.boardMeta}>카드 {item.cardCount}개</Text>
              </View>
            </View>
            <Text style={styles.boardArrow}>›</Text>
          </TouchableOpacity>
        )}
      />

      {/* 입력창 or 추가 버튼 */}
      {showInput ? (
        <View style={[styles.inputArea, { paddingBottom: bottomInset }]}>
          <TextInput
            style={styles.input}
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="보드 이름 입력..."
            placeholderTextColor="#bbb"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreateBoard}
          />
          <View style={styles.inputActions}>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleCreateBoard}
              disabled={creating}
            >
              {creating
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.confirmText}>만들기</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => { setShowInput(false); setNewTitle(''); }}
            >
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // bottomInset을 동적으로 적용 — position absolute + bottom
        <View style={[styles.addBtnWrapper, { bottom: bottomInset + 16 }]}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowInput(true)}
          >
            <Text style={styles.addBtnText}>＋ 새 보드 만들기</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight ?? 24) + 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#222' },
  headerSub:   { fontSize: 13, color: '#888', marginTop: 2 },
  logoutBtn:   { padding: 8 },
  logoutText:  { color: '#e03131', fontSize: 14, fontWeight: '500' },

  listContentCompact: { padding: 16, paddingBottom: 16 },
  listContentFull:    { padding: 16, paddingBottom: 120 },

  emptyBox:     { alignItems: 'center', marginTop: 80 },
  emptyText:    { fontSize: 18, fontWeight: 'bold', color: '#aaa', marginBottom: 8 },
  emptySubText: { fontSize: 14, color: '#bbb' },

  boardCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },
  boardCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  boardIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#4C6EF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  boardIconText: { color: 'white', fontWeight: 'bold', fontSize: 20 },
  boardTitle:    { fontSize: 16, fontWeight: '600', color: '#222' },
  boardMeta:     { fontSize: 12, color: '#aaa', marginTop: 2 },
  boardArrow:    { fontSize: 22, color: '#ccc' },

  inputArea: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#333',
    marginBottom: 10,
  },
  inputActions: { flexDirection: 'row', gap: 10 },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#4C6EF5',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  cancelBtn: {
    paddingHorizontal: 20,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  cancelText: { color: '#555', fontSize: 15 },

  addBtnWrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
  addBtn: {
    backgroundColor: '#4C6EF5',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    elevation: 4,
  },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});

export default BoardListScreen;