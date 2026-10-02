import { Colors } from '@/constants/theme';
import { AppProvider } from '@/context/AppContext';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <AppProvider>
      <SafeAreaProvider>
        <View style={styles.container}>
          <StatusBar style="dark" />
          <Stack
            initialRouteName="index"
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
      </SafeAreaProvider>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
});
