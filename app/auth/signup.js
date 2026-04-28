import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    CheckBox,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function SignupScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    const { name, email, password, confirmPassword } = formData;

    // 유효성 검사
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert("알림", "모든 필드를 입력해주세요.");
      return;
    }

    if (name.length < 2) {
      Alert.alert("알림", "이름은 2글자 이상이어야 합니다.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("알림", "올바른 이메일 형식을 입력해주세요.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("알림", "비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("알림", "비밀번호가 일치하지 않습니다.");
      return;
    }

    if (!agreeTerms) {
      Alert.alert("알림", "이용약관에 동의해주세요.");
      return;
    }

    setLoading(true);
    try {
      // 여기에 실제 회원가입 로직을 추가하세요
      // 현재는 시뮬레이션
      await new Promise((resolve) => setTimeout(resolve, 1000));
      Alert.alert(
        "성공",
        "회원가입이 완료되었습니다!\n로그인 페이지로 이동합니다.",
        [
          {
            text: "확인",
            onPress: () => router.replace("/auth/login"),
          },
        ],
      );
    } catch (error) {
      Alert.alert("오류", "회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <ScrollView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>회원가입</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.content}>
        {/* 로고 및 타이틀 */}
        <View style={styles.titleSection}>
          <Text style={styles.logo}>🛒</Text>
          <Text style={styles.subtitle}>냉장고 계정 만들기</Text>
        </View>

        {/* 회원가입 폼 */}
        <View style={styles.formSection}>
          {/* 이름 입력 */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>이름</Text>
            <TextInput
              style={styles.input}
              placeholder="이름 입력"
              placeholderTextColor="#999"
              value={formData.name}
              onChangeText={(value) => handleInputChange("name", value)}
              editable={!loading}
            />
          </View>

          {/* 이메일 입력 */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>이메일</Text>
            <TextInput
              style={styles.input}
              placeholder="example@email.com"
              placeholderTextColor="#999"
              keyboardType="email-address"
              value={formData.email}
              onChangeText={(value) => handleInputChange("email", value)}
              editable={!loading}
              autoCapitalize="none"
            />
          </View>

          {/* 비밀번호 입력 */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>비밀번호</Text>
            <TextInput
              style={styles.input}
              placeholder="6자 이상의 비밀번호"
              placeholderTextColor="#999"
              secureTextEntry
              value={formData.password}
              onChangeText={(value) => handleInputChange("password", value)}
              editable={!loading}
            />
            <Text style={styles.hint}>최소 6자 이상 권장</Text>
          </View>

          {/* 비밀번호 확인 입력 */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>비밀번호 확인</Text>
            <TextInput
              style={styles.input}
              placeholder="비밀번호 다시 입력"
              placeholderTextColor="#999"
              secureTextEntry
              value={formData.confirmPassword}
              onChangeText={(value) =>
                handleInputChange("confirmPassword", value)
              }
              editable={!loading}
            />
          </View>

          {/* 이용약관 동의 */}
          <View style={styles.agreeContainer}>
            <CheckBox
              value={agreeTerms}
              onValueChange={setAgreeTerms}
              disabled={loading}
              style={styles.checkbox}
            />
            <Text style={styles.agreeText}>
              <Text style={styles.requiredText}>*</Text> 이용약관 및 개인정보
              처리방침에 동의합니다
            </Text>
          </View>

          {/* 회원가입 버튼 */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "가입 중..." : "회원가입"}
            </Text>
          </TouchableOpacity>

          {/* 로그인 링크 */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>이미 계정이 있으신가요? </Text>
            <TouchableOpacity onPress={() => router.push("/auth/login")}>
              <Text style={styles.loginLink}>로그인</Text>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    fontSize: 16,
    color: "#FF6B9D",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  logo: {
    fontSize: 50,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#999",
  },
  formSection: {
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
  hint: {
    fontSize: 12,
    color: "#999",
    marginTop: 5,
  },
  agreeContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
    marginTop: 10,
  },
  checkbox: {
    marginRight: 10,
  },
  agreeText: {
    fontSize: 13,
    color: "#333",
    flex: 1,
    lineHeight: 20,
  },
  requiredText: {
    color: "#FF6B9D",
    fontWeight: "bold",
  },
  button: {
    backgroundColor: "#FF6B9D",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: "#ddd",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  loginText: {
    fontSize: 14,
    color: "#666",
  },
  loginLink: {
    fontSize: 14,
    color: "#FF6B9D",
    fontWeight: "bold",
  },
});
