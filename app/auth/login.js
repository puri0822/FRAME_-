import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const router = useRouter();
  const { user, loading, loginWithGoogle } = useAuth();

  useEffect(() => {
    if (user) router.replace("/(tabs)/home");
  }, [user]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.logo}>🛒</Text>
        <Text style={styles.title}>냉장고</Text>
        <Text style={styles.subtitle}>스마트한 냉장고 관리</Text>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity style={styles.googleButton} onPress={loginWithGoogle}>
          <Text style={styles.googleIcon}>G</Text>
          <Text style={styles.googleText}>Google로 계속하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", justifyContent: "space-between", paddingVertical: 80 },
  center:    { flex: 1, justifyContent: "center", alignItems: "center" },
  top: { alignItems: "center" },
  logo:     { fontSize: 72, marginBottom: 16 },
  title:    { fontSize: 34, fontWeight: "bold", color: "#111", marginBottom: 8 },
  subtitle: { fontSize: 15, color: "#999" },
  bottom: { paddingHorizontal: 32 },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingVertical: 15,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  googleIcon: { fontSize: 18, fontWeight: "bold", color: "#4285F4" },
  googleText: { fontSize: 16, fontWeight: "600", color: "#333" },
});
