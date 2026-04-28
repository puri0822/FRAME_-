import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("알림", "이메일과 비밀번호를 입력해주세요.");
      return;
    }

    // 간단한 이메일 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("알림", "올바른 이메일 형식을 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      // 여기에 실제 로그인 로직을 추가하세요
      // 현재는 시뮬레이션
      await new Promise((resolve) => setTimeout(resolve, 1000));
      Alert.alert("성공", "로그인되었습니다!");
      router.replace("/(tabs)/home");
    } catch (error) {
      Alert.alert("오류", "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* 로고 및 타이틀 */}
        <View style={styles.titleSection}>
          <Text style={styles.logo}>🛒</Text>
          <Text style={styles.title}>냉장고</Text>
          <Text style={styles.subtitle}>스마트한 냉장고 관리</Text>
        </View>

        {/* 로그인 폼 */}
        <View style={styles.formSection}>
          <Text style={styles.formTitle}>로그인</Text>

          {/* 이메일 입력 */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>이메일</Text>
            <TextInput
              style={styles.input}
              placeholder="example@email.com"
              placeholderTextColor="#999"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
              autoCapitalize="none"
            />
          </View>

          {/* 비밀번호 입력 */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>비밀번호</Text>
            <TextInput
              style={styles.input}
              placeholder="비밀번호 입력"
              placeholderTextColor="#999"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />
          </View>

          {/* 로그인 버튼 */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "로그인 중..." : "로그인"}
            </Text>
          </TouchableOpacity>

          {/* 회원가입 링크 */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>아직 회원이 아니신가요? </Text>
            <TouchableOpacity onPress={() => router.push("/auth/signup")}>
              <Text style={styles.signupLink}>회원가입</Text>
            </TouchableOpacity>
          </View>

          {/* 비밀번호 찾기 */}
          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>비밀번호 찾기</Text>
          </TouchableOpacity>
        </View>

        {/* 소셜 로그인 */}
        <View style={styles.socialSection}>
          <Text style={styles.divider}>또는</Text>
          <View style={styles.socialButtons}>
            <TouchableOpacity style={styles.socialButton}>
              <Text style={styles.socialButtonText}>👤 Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Text style={styles.socialButtonText}>🍎 Apple</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: 40,
    marginTop: 20,
  },
  logo: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: "#999",
  },
  formSection: {
    marginBottom: 30,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: "#f9f9f9",
    color: "#333",
  },
  button: {
    backgroundColor: "#FF6B9D",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: "#ddd",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  signupText: {
    fontSize: 14,
    color: "#666",
  },
  signupLink: {
    fontSize: 14,
    color: "#FF6B9D",
    fontWeight: "bold",
  },
  forgotPassword: {
    alignItems: "center",
    marginTop: 12,
  },
  forgotPasswordText: {
    fontSize: 12,
    color: "#999",
  },
  socialSection: {
    marginTop: 30,
  },
  divider: {
    textAlign: "center",
    color: "#999",
    marginBottom: 16,
    fontSize: 14,
  },
  socialButtons: {
    flexDirection: "row",
    gap: 10,
  },
  socialButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
});
