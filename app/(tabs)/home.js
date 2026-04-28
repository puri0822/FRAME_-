import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Line, Path, Rect } from "react-native-svg";

/* ── 색상 상수 ── */
const C = {
  primary: "#FF6B35",
  primaryDark: "#E85A26",
  primaryLt: "#FFF2EE",
  bg: "#F5F6F8",
  surface: "#FFFFFF",
  border: "#E8EAED",
  text: "#111827",
  textSub: "#6B7280",
  textMuted: "#9CA3AF",
};

/* ── AI 응답 규칙 ── */
const AI_RULES = [
  { keywords: ["안녕", "하이", "hi", "hello"], reply: "안녕하세요! 저는 요리조리 AI예요 🍳\n어떤 요리가 궁금하신가요?" },
  { keywords: ["편의점", "컵라면"], reply: "편의점 재료로 뚝딱 만드는 레시피가 있어요! 🏪\n편의점 라면 나베나 참치마요 주먹밥은 어때요?" },
  { keywords: ["빠른", "간단", "쉬운", "10분"], reply: "⚡ 빠른 레시피 추천!\n• 참치마요 주먹밥 (10분)\n• 떡볶이 치즈 덮밥 (10분)\n• 삼각김밥 된장국 (10분)" },
  { keywords: ["계란", "달걀"], reply: "계란이 있으시군요! 🥚\n고추참치 계란말이나 냉장고 털이 볶음밥을 추천해요!" },
  { keywords: ["밥", "볶음밥", "찬밥"], reply: "찬밥 있으면 냉장고 털이 볶음밥이 최고예요 🍳\n15분 만에 완성!" },
  { keywords: ["두부"], reply: "두부가 있다면 두부 간장 조림을 강추해요 🥬\n밥도둑 반찬으로 딱이에요!" },
  { keywords: ["다이어트", "건강"], reply: "건강한 요리를 원하신다면 두부 간장 조림을 추천해요 🥗" },
  { keywords: ["김치"], reply: "김치 치즈 부침개를 만들어 보세요! 🥞\n고소한 치즈와 새콤한 김치의 조합이 환상이에요." },
  { keywords: ["뭐먹", "추천", "메뉴"], reply: "냉장고 탭에서 재료를 등록하면 맞춤 레시피를 추천해 드려요! 😄" },
];

function getFakeResponse(text) {
  const lower = text.toLowerCase();
  for (const rule of AI_RULES) {
    if (rule.keywords.some((k) => lower.includes(k))) return rule.reply;
  }
  return "흠, 잘 모르겠어요 😅\n레시피 탐색 탭에서 검색해 보시거나,\n냉장고 재료를 등록하면 맞춤 추천을 드릴 수 있어요!";
}

/* ── 빠른 칩 데이터 ── */
const QUICK_CHIPS = ["냉장고 재료 관리 🧊", "추천 레시피 🍳", "인기 요리 🔥"];

/* ── 설정 아이콘 SVG ── */
function SettingsIcon() {
  return (
    <Svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke={C.textSub} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  );
}

function SendIcon() {
  return (
    <Svg viewBox="0 0 24 24" width={16} height={16} fill="#fff">
      <Path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </Svg>
  );
}

/* ── 설정 모달 ── */
function SettingsModal({ visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={st.modalOverlay} onPress={onClose}>
        <View style={st.settingsSheet}>
          <View style={st.settingsHeader}>
            <Text style={st.settingsTitle}>설정</Text>
            <TouchableOpacity onPress={onClose} style={st.closeBtn}>
              <Text style={{ fontSize: 16, color: C.textSub }}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={st.settingsBody}>
            <Text style={st.settingsSectionTitle}>폰트</Text>
            <Text style={{ fontSize: 13, color: C.textMuted }}>시스템 기본 폰트 사용 중</Text>
            <View style={{ height: 20 }} />
            <Text style={st.settingsSectionTitle}>글자 크기</Text>
            <View style={st.segmentRow}>
              {["작게", "보통", "크게"].map((s, i) => (
                <TouchableOpacity key={s} style={[st.segmentBtn, i === 1 && st.segmentBtnActive]}>
                  <Text style={[st.segmentBtnText, i === 1 && st.segmentBtnTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

/* ── 메인 컴포넌트 ── */
export default function HomeScreen() {
  const [messages, setMessages] = useState([
    { id: 0, role: "ai", text: "안녕하세요! 저는 요리조리 AI예요 🍳\n어떤 요리가 궁금하신가요?" },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const scrollRef = useRef(null);

  function sendMessage(text) {
    const trimmed = (text || input).trim();
    if (!trimmed) return;

    const userMsg = { id: Date.now(), role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    const delay = 800 + Math.random() * 700;
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "ai", text: getFakeResponse(trimmed) },
      ]);
    }, delay);
  }

  return (
    <KeyboardAvoidingView style={st.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* 헤더 */}
      <View style={st.header}>
        <View>
          <Text style={st.appTitle}>요리조리 🍳</Text>
          <Text style={st.appSubtitle}>AI에게 요리를 물어보세요</Text>
        </View>
        <TouchableOpacity style={st.headerBtn} onPress={() => setSettingsOpen(true)}>
          <SettingsIcon />
        </TouchableOpacity>
      </View>

      {/* 채팅 영역 */}
      <View style={st.chatWrap}>
        <ScrollView
          ref={scrollRef}
          style={st.chatMessages}
          contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 14, gap: 12 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => (
            <View key={msg.id} style={[st.chatMsg, msg.role === "ai" ? st.chatMsgAi : st.chatMsgUser]}>
              {msg.role === "ai" && <View style={st.avatar}><Text>🤖</Text></View>}
              <View style={[st.bubble, msg.role === "ai" ? st.bubbleAi : st.bubbleUser]}>
                <Text style={[st.bubbleText, msg.role === "user" && { color: "#fff" }]}>{msg.text}</Text>
              </View>
            </View>
          ))}

          {isTyping && (
            <View style={[st.chatMsg, st.chatMsgAi]}>
              <View style={st.avatar}><Text>🤖</Text></View>
              <View style={[st.bubble, st.bubbleAi]}>
                <Text style={st.bubbleText}>···</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* 빠른 칩 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.quickChips} contentContainerStyle={{ gap: 8, paddingHorizontal: 14, paddingVertical: 6 }}>
          {QUICK_CHIPS.map((chip) => (
            <TouchableOpacity key={chip} style={st.quickChip} onPress={() => sendMessage(chip)}>
              <Text style={st.quickChipText}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 입력 바 */}
        <View style={st.inputBar}>
          <View style={st.inputWrap}>
            <TouchableOpacity style={st.inputIconBtn}>
              <Svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={C.textMuted} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <Line x1={12} y1={5} x2={12} y2={19} /><Line x1={5} y1={12} x2={19} y2={12} />
              </Svg>
            </TouchableOpacity>
            <TextInput
              style={st.textInput}
              value={input}
              onChangeText={setInput}
              placeholder="요리명, 재료를 물어보세요"
              placeholderTextColor={C.textMuted}
              returnKeyType="send"
              onSubmitEditing={() => sendMessage()}
            />
            <TouchableOpacity style={st.inputIconBtn}>
              <Svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={C.textMuted} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <Rect x={9} y={2} width={6} height={11} rx={3} />
                <Path d="M5 10a7 7 0 0 0 14 0" />
                <Line x1={12} y1={17} x2={12} y2={21} />
                <Line x1={9} y1={21} x2={15} y2={21} />
              </Svg>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={st.sendBtn} onPress={() => sendMessage()}>
            <SendIcon />
          </TouchableOpacity>
        </View>
      </View>

      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  appTitle: { fontSize: 22, fontWeight: "800", color: C.primary, letterSpacing: -0.5 },
  appSubtitle: { marginTop: 3, fontSize: 13, color: C.textMuted },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  chatWrap: {
    flex: 1, marginHorizontal: 20, marginTop: 16, marginBottom: 16,
    backgroundColor: C.surface, borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(255,107,53,0.35)",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10,
    elevation: 3, overflow: "hidden",
  },
  chatMessages: { flex: 1 },
  chatMsg: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  chatMsgAi: { justifyContent: "flex-start" },
  chatMsgUser: { justifyContent: "flex-end" },
  avatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.primaryLt, alignItems: "center", justifyContent: "center",
  },
  bubble: { maxWidth: "74%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleAi: { backgroundColor: C.bg, borderBottomLeftRadius: 5 },
  bubbleUser: { backgroundColor: C.primary, borderTopRightRadius: 5 },
  bubbleText: { fontSize: 13, lineHeight: 20, color: C.text },
  quickChips: { maxHeight: 44 },
  quickChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1, borderColor: "rgba(255,107,53,0.22)",
    backgroundColor: "rgba(255,107,53,0.07)",
  },
  quickChipText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  inputBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 10, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.surface,
  },
  inputWrap: {
    flex: 1, flexDirection: "row", alignItems: "center",
    height: 40, borderRadius: 999, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.bg, overflow: "hidden",
  },
  inputIconBtn: { width: 36, alignItems: "center", justifyContent: "center" },
  textInput: { flex: 1, fontSize: 13, color: C.text, paddingHorizontal: 4 },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.primary, alignItems: "center", justifyContent: "center",
  },
  /* 설정 모달 */
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  settingsSheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  settingsHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4,
  },
  settingsTitle: { fontSize: 17, fontWeight: "700", color: C.text },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.bg, alignItems: "center", justifyContent: "center",
  },
  settingsBody: { padding: 20, paddingBottom: 40 },
  settingsSectionTitle: { fontSize: 13, fontWeight: "700", color: C.text, marginBottom: 10 },
  segmentRow: {
    flexDirection: "row", backgroundColor: C.bg, borderRadius: 12,
    padding: 3, borderWidth: 1.5, borderColor: C.border,
  },
  segmentBtn: { flex: 1, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 9 },
  segmentBtnActive: { backgroundColor: C.surface, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  segmentBtnText: { fontSize: 13, fontWeight: "600", color: C.textSub },
  segmentBtnTextActive: { color: C.primary },
});
