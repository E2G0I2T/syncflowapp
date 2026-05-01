import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring 
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

interface CardProps {
  content: string;
}

const DraggableCard = ({ content }: CardProps) => {
  // 위치를 저장하는 값
  const offset = useSharedValue({ x: 0, y: 0 });
  const isPressed = useSharedValue(false);

  // 최신 Gesture API 사용
  const gesture = Gesture.Pan()
    .onBegin(() => {
      isPressed.value = true;
    })
    .onUpdate((event) => {
      offset.value = {
        x: event.translationX,
        y: event.translationY,
      };
    })
    .onFinalize(() => {
      isPressed.value = false;
      // 손을 떼면 부드럽게 제자리로 (나중에 이동 로직 넣을 곳)
      offset.value = withSpring({ x: 0, y: 0 });
    });

  // 애니메이션 스타일
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: offset.value.x },
        { translateY: offset.value.y },
        { scale: withSpring(isPressed.value ? 1.1 : 1) }, // 누르면 살짝 커짐
      ],
      backgroundColor: isPressed.value ? '#f8f9fa' : 'white',
      zIndex: isPressed.value ? 999 : 1,
      elevation: isPressed.value ? 10 : 3, // 안드로이드 그림자 강조
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.card, animatedStyle]}>
        <Text style={styles.text}>{content}</Text>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  text: { fontSize: 16, color: '#333', fontWeight: '500' },
});

export default DraggableCard;