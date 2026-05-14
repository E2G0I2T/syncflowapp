// App.tsx
import React, { useEffect, useState } from 'react';
import {
  StyleSheet, ActivityIndicator, View,
  TouchableOpacity, Text,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen     from './src/screens/LoginScreen';
import BoardListScreen from './src/screens/BoardListScreen';
import BoardScreen     from './src/screens/BoardScreen';
import { TOKEN_KEY }   from './src/api/client';

const Stack = createStackNavigator();

const BackButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity
    onPress={onPress}
    style={styles.backButton}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  >
    <Text style={styles.backButtonText}>‹</Text>
  </TouchableOpacity>
);

const App = () => {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY).then((token) => {
      setInitialRoute(token ? 'BoardList' : 'Login');
    });
  }, []);

  if (!initialRoute) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4C6EF5" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.root}>
        <NavigationContainer>
          <Stack.Navigator initialRouteName={initialRoute}>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="BoardList"
              component={BoardListScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Board"
              component={BoardScreen}
              options={({ navigation }) => ({
                // BackButton을 allowAsProps로 허용 — 외부 정의라 불안정하지 않음
                // eslint-disable-next-line react/no-unstable-nested-components
                headerLeft: () => <BackButton onPress={() => navigation.goBack()} />,
                headerStyle:      { backgroundColor: '#fff', elevation: 1 },
                headerTitleStyle: { fontWeight: 'bold', color: '#222', fontSize: 18 },
                headerTitleAlign: 'center',
                headerShadowVisible: true,
              })}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  root:    { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backButton: {
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 28,
    color: '#4C6EF5',
    fontWeight: '300',
    lineHeight: 32,
  },
});

export default App;