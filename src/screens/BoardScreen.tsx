import React, { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import DraggableCard from '../components/DraggableCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = SCREEN_WIDTH * 0.8; // 칼럼 너비를 화면의 80%로 설정해 옆이 살짝 보이게 함

const COLUMNS = [
  { id: 'todo', title: 'Todo 📝', color: '#4C6EF5' },
  { id: 'doing', title: 'In Progress 🚀', color: '#FAB005' },
  { id: 'done', title: 'Done ✅', color: '#40C057' },
  { id: 'archive', title: 'Archive 📦', color: '#868E96' },
];

const BoardScreen = () => {
  const scrollViewRef = useRef<ScrollView>(null);

  // 특정 칼럼으로 부드럽게 이동하는 함수
  const jumpToColumn = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * (COLUMN_WIDTH + 20), // 칼럼 너비 + 마진값
      animated: true,
    });
  };

  return (
    <View style={styles.container}>
      {/* 상단 점프 네비게이션 */}
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

      {/* 메인 보드 스크롤 */}
      <ScrollView 
        ref={scrollViewRef}
        horizontal 
        pagingEnabled={false} // 자유로운 스크롤을 위해 false (혹은 딱딱 끊기게 하려면 true)
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.boardContent}
        snapToInterval={COLUMN_WIDTH + 20} // 스크롤 시 칼럼 단위로 딱딱 멈추게 함
        decelerationRate="fast"
      >
        {COLUMNS.map((col) => (
          <View key={col.id} style={styles.column}>
            <View style={[styles.columnHeader, { backgroundColor: col.color }]}>
              <Text style={styles.columnTitle}>{col.title}</Text>
            </View>
            <ScrollView style={styles.cardList}>
              <DraggableCard content={`${col.title} 작업 1`} />
              <DraggableCard content={`${col.title} 작업 2`} />
              <TouchableOpacity style={styles.addButton}><Text>+ 추가</Text></TouchableOpacity>
            </ScrollView>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  tabBar: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    paddingTop: 10, 
    elevation: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  tabItem: { flex: 1, alignItems: 'center', paddingBottom: 10, borderBottomWidth: 3 },
  tabText: { fontWeight: 'bold', fontSize: 12, color: '#333' },
  boardContent: { paddingHorizontal: 10, paddingVertical: 20 },
  column: { 
    width: COLUMN_WIDTH, 
    backgroundColor: '#ebecf0', 
    borderRadius: 12, 
    marginRight: 20, 
    maxHeight: '100%',
    overflow: 'hidden'
  },
  columnHeader: { padding: 15 },
  columnTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  cardList: { padding: 10 },
  addButton: { padding: 15, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 8 },
});

export default BoardScreen;