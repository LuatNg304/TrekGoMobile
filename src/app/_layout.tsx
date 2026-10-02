import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '@/context/AppContext';
import { Colors } from '@/constants/theme';

export default function RootLayout() {
  return (
    <AppProvider>
      <View style={styles.container}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.surface },
            animation: Platform.OS === 'ios' ? 'default' : 'fade',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen 
            name="navigation" 
            options={{ 
              headerShown: false, 
              presentation: 'fullScreenModal',
              animation: 'slide_from_bottom',
            }} 
          />
        </Stack>
      </View>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
});
