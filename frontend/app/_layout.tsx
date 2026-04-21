import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="subscribe" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="itinerary" options={{ presentation: 'card', animation: 'slide_from_right' }} />
          <Stack.Screen name="park/[code]" options={{ presentation: 'card', animation: 'slide_from_right' }} />
          <Stack.Screen name="state/[code]" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
