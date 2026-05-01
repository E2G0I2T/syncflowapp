// App.tsx
// @ts-nocheck
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, Text } from 'react-native';

// 임시 화면 컴포넌트
import LoginScreen from './src/screens/LoginScreen';
import BoardScreen from './src/screens/BoardScreen';


const Stack = createStackNavigator();

const App = () => {
  return (
    <GestureHandlerRootView style={styles.root}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Board" component={BoardScreen} options={{ title: 'SyncFlow 보드' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root : {
    flex : 1,
  }
})

export default App;