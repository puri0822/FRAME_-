import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./context/AuthContext";
import { loadFridgeFromStorage, setIngredients } from "./store";

export default function RootLayout() {
  useEffect(() => {
    loadFridgeFromStorage().then(items => {
      if (items.length > 0) {
        setIngredients(items.map(i => (typeof i === 'string' ? i : i.name)).filter(Boolean));
      }
    }).catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Stack>
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
