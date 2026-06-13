import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function MainScreen() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  // 냉장고 품목 데이터
  const [fridgeItems] = useState([
    { id: 1, name: "우유", emoji: "🥛", quantity: "2개" },
    { id: 2, name: "계란", emoji: "🥚", quantity: "12개" },
    { id: 3, name: "딸기", emoji: "🍓", quantity: "1팩" },
    { id: 4, name: "치즈", emoji: "🧀", quantity: "500g" },
    { id: 5, name: "소시지", emoji: "🌭", quantity: "8개" },
    { id: 6, name: "버터", emoji: "🧈", quantity: "1개" },
  ]);

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>냉장고</Text>
        <TouchableOpacity
          style={styles.hamburger}
          onPress={() => setMenuOpen(!menuOpen)}
        >
          <Text style={styles.hamburgerIcon}>☰</Text>
        </TouchableOpacity>
      </View>

      {/* 상단: 냉장고 품목 카드 */}
      <View style={styles.fridgeCardSection}>
        <Text style={styles.sectionTitle}>🛒 냉장고 보관물</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.cardContainer}
        >
          {fridgeItems.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardEmoji}>{item.emoji}</Text>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardQuantity}>{item.quantity}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* 하단: 메인 컨텐츠 */}
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => alert("카메라 준비 중...")}
        >
          <Text style={styles.buttonText}>📸 촬영하기</Text>
        </TouchableOpacity>
      </View>

      {/* 반투명 배경 오버레이 */}
      {menuOpen && (
        <TouchableOpacity
          style={styles.overlay}
          onPress={() => setMenuOpen(false)}
        />
      )}

      {/* 사이드 드로어 메뉴 */}
      <View style={[styles.drawer, menuOpen && styles.drawerOpen]}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setMenuOpen(false)}
        >
          <Text style={styles.menuText}>⚙️ 설정</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            setMenuOpen(false);
            router.back();
          }}
        >
          <Text style={styles.menuText}>🔙 로그아웃</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    backgroundColor: "#FFD700",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  hamburger: {
    padding: 10,
  },
  hamburgerIcon: {
    fontSize: 28,
    color: "#333",
  },
  fridgeCardSection: {
    flex: 0.5,
    backgroundColor: "#f9f9f9",
    paddingHorizontal: 15,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  cardContainer: {
    flexGrow: 0,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginRight: 12,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  cardEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  cardName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
    textAlign: "center",
  },
  cardQuantity: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
  },
  content: {
    flex: 0.5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 30,
  },
  button: {
    backgroundColor: "#FF6B9D",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 15,
  },
  drawer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: "80%",
    backgroundColor: "#fff",
    paddingTop: 20,
    transform: [{ translateX: 1000 }],
    zIndex: 20,
  },
  drawerOpen: {
    transform: [{ translateX: 0 }],
  },
  menuItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
});
