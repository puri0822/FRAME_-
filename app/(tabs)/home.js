import { useEffect, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Linking,
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
import { C } from "../../styles/colors";
import st from "../../styles/tabs/home";
import { useAuth } from "../context/AuthContext";
import { getIngredients } from "../store";
import { EC2_ENDPOINTS } from "../config/api";
import st2, { DIFF_COLOR } from "../../styles/tabs/explore";

function RecipeModal({ recipeId, onClose }) {
  const [recipe,  setRecipe]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [youtube, setYoutube] = useState(null);

  useEffect(() => {
    if (!recipeId) return;
    setLoading(true);
    setYoutube(null);
    fetch(`${EC2_ENDPOINTS.recipes}/${recipeId}`)
      .then(r => r.json())
      .then(data => {
        setRecipe(data);
        return fetch(`${EC2_ENDPOINTS.youtube}?q=${encodeURIComponent(data.name)}&recipeId=${recipeId}`);
      })
      .then(r => r.json())
      .then(videos => { if (videos?.length > 0) setYoutube(videos[0]); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [recipeId]);

  const diffColor = recipe ? (DIFF_COLOR[recipe.difficulty] || "#888") : "#888";

  return (
    <Modal visible={!!recipeId} transparent animationType="slide" onRequestClose={onClose}>
      <View style={st2.modalOverlay}>
        <Pressable style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} />
        <View style={st2.modalSheet}>
          <View style={st2.modalTopBar}>
            <View style={st2.modalHandle} />
            <TouchableOpacity style={st2.modalCloseBtn} onPress={onClose}>
              <Text style={{ fontSize: 14, color: C.textSub }}>✕</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <Text style={{ color: C.textMuted }}>불러오는 중...</Text>
            </View>
          ) : recipe ? (
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <View style={st2.recipeHeader}>
                <View style={st2.recipeEmoji}>
                {recipe.imageUrl
                  ? <Image source={{ uri: recipe.imageUrl }} style={{ width: 64, height: 64, borderRadius: 12 }} resizeMode="cover" />
                  : <Text style={{ fontSize: 40 }}>🍽️</Text>}
              </View>
                <View style={{ flex: 1 }}>
                  <View style={st2.modalNameRow}>
                    <Text style={[st2.recipeName, { marginBottom: 0, flex: 1 }]}>{recipe.name}</Text>
                    <View style={st2.modalHeaderRating}>
                      <Text style={{ fontSize: 14 }}>⭐</Text>
                      <Text style={st2.modalHeaderRatingText}>{Number(recipe.rating).toFixed(1)}</Text>
                    </View>
                  </View>
                  <View style={st2.badgeRow}>
                    <View style={st2.badgeTime}><Text style={st2.badgeTimeText}>⏱ {recipe.time}분</Text></View>
                    <View style={[st2.badgeDiff, { backgroundColor: diffColor + "20" }]}>
                      <Text style={[st2.badgeDiffText, { color: diffColor }]}>{recipe.difficulty}</Text>
                    </View>
                  </View>
                  <Text style={st2.recipeIngr} numberOfLines={2}>
                    {Array.isArray(recipe.ingredients) ? recipe.ingredients.join(" · ") : ""}
                  </Text>
                </View>
              </View>

              {Array.isArray(recipe.instructions) && recipe.instructions.length > 0 && (
                <>
                  <View style={st2.divider} />
                  <View style={{ paddingVertical: 18 }}>
                    <Text style={st2.sectionTitle}>조리 과정</Text>
                    {recipe.instructions.map((step, i) => (
                      <View key={i} style={st2.stepItem}>
                        <View style={st2.stepNumber}><Text style={st2.stepNumberText}>{i + 1}</Text></View>
                        <Text style={st2.stepText}>{step}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {youtube && (
                <>
                  <View style={st2.divider} />
                  <View style={{ paddingVertical: 18 }}>
                    <Text style={st2.sectionTitle}>유튜브 참고</Text>
                    <TouchableOpacity onPress={() => Linking.openURL(youtube.url)}>
                      <View style={{ borderRadius: 10, overflow: "hidden" }}>
                        <Image source={{ uri: youtube.thumbnail }} style={{ width: "100%", height: 180, backgroundColor: "#000" }} resizeMode="cover" />
                        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center" }}>
                          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center" }}>
                            <Text style={{ fontSize: 20, color: "#fff" }}>▶</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                    <Text style={st2.ytTitle}>{youtube.title}</Text>
                  </View>
                </>
              )}

              {recipe.reviews?.length > 0 && (
                <>
                  <View style={st2.divider} />
                  <View style={{ paddingTop: 16, paddingBottom: 8 }}>
                    <Text style={st2.sectionTitle}>이용 후기</Text>
                    {recipe.reviews.slice(0, 3).map((rv, i) => (
                      <View key={i} style={st2.textReviewItem}>
                        <View style={st2.textReviewMeta}>
                          <Text style={st2.reviewUser}>{rv.user}</Text>
                          <Text style={st2.textReviewDate}>{rv.date}</Text>
                        </View>
                        <Text style={st2.reviewText}>{rv.text}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const INITIAL_MSG  = { id: 0, role: "ai", text: "안녕하세요! 저는 요리조리 AI예요 🍳\n어떤 요리가 궁금하신가요?" };
const MAX_HISTORY  = 20;

const RECOMMEND_POOL = [
  "오늘 저녁 한식 레시피 추천해줘",
  "간단하게 만들 수 있는 레시피 추천해줘",
  "10분 안에 만드는 레시피 추천해줘",
  "계란으로 만드는 레시피 추천해줘",
  "밥이랑 먹기 좋은 반찬 추천해줘",
  "혼밥하기 좋은 레시피 추천해줘",
  "냉장고 재료로 만들 수 있는 요리 추천해줘",
  "오늘 기분 전환할 수 있는 색다른 레시피 추천해줘",
];
const QUICK_CHIPS = ["냉장고 재료 관리 🧊", "추천 레시피 🍳", "인기 요리 🔥"];
const FALLBACK_INGREDIENTS = ["쌀", "돼지고기", "계란", "시금치"];

function SettingsIcon() {
  return (
    <Svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke={C.textSub} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  );
}

function TrashIcon() {
  return (
    <Svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke={C.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Line x1={3} y1={6} x2={21} y2={6} />
      <Path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
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

function SettingsModal({ visible, onClose }) {
  const { user, loginWithGoogle, logout } = useAuth();

  async function handleLogout() {
    await logout();
    onClose();
  }

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
            {user ? (
              <View style={st.authSection}>
                <Text style={st.authName}>{user.name || user.email}</Text>
                <Text style={st.authEmail}>{user.email}</Text>
                <TouchableOpacity style={st.logoutBtn} onPress={handleLogout}>
                  <Text style={st.logoutBtnText}>로그아웃</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={st.googleBtn} onPress={loginWithGoogle}>
                <Text style={st.googleBtnIcon}>G</Text>
                <Text style={st.googleBtnText}>Google로 로그인</Text>
              </TouchableOpacity>
            )}
            <View style={st.divider} />
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

export default function HomeScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([INITIAL_MSG]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [settingsOpen, setSettingsOpen]     = useState(false);
  const [ingrPickerOpen, setIngrPickerOpen] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const scrollRef          = useRef(null);
  const prevUserId         = useRef(null);
  const historyJustLoaded  = useRef(false);

  // 로그인/로그아웃 시 히스토리 처리
  useEffect(() => {
    if (!user?.userId) {
      prevUserId.current = null;
      setMessages([INITIAL_MSG]);
      return;
    }
    if (user.userId === prevUserId.current) return;
    prevUserId.current = user.userId;
    fetch(`${EC2_ENDPOINTS.chatHistory}/${user.userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(history => {
        if (Array.isArray(history) && history.length > 0) {
          historyJustLoaded.current = true;
          setMessages([INITIAL_MSG, ...history]);
        }
      }).catch(() => {});
  }, [user?.userId]);

  // 메시지 변경 시 서버에 저장
  useEffect(() => {
    if (historyJustLoaded.current) { historyJustLoaded.current = false; return; }
    if (!user?.userId || messages.length <= 1) return;
    const toSave = messages.slice(1).slice(-MAX_HISTORY);
    fetch(`${EC2_ENDPOINTS.chatHistory}/${user.userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: toSave }),
    }).catch(() => {});
  }, [messages]);

  function clearHistory() {
    setMessages([INITIAL_MSG]);
    if (user?.userId) {
      fetch(`${EC2_ENDPOINTS.chatHistory}/${user.userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [] }),
      }).catch(() => {});
    }
  }

  function getDisplayIngredients() {
    const items = getIngredients();
    return items.length ? items : FALLBACK_INGREDIENTS;
  }

  async function sendMessage(text) {
    const trimmed = (text || input).trim();
    if (!trimmed || isTyping) return;
    setIngrPickerOpen(false);
    setMessages((prev) => [...prev, { id: Date.now(), role: "user", text: trimmed }]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch(EC2_ENDPOINTS.chat, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      const reply = data.reply || "응답을 받지 못했어요.";
      const newMsg = { id: Date.now() + 1, role: "ai", text: reply };

      if (data.action?.type === "RECIPE_SEARCH" && data.action.recipes?.length > 0) {
        newMsg.recipes = data.action.recipes;
      } else if (data.action?.type === "FRIDGE_SAVE" && data.action.items?.length > 0) {
        newMsg.text += `\n\n추가할 재료: ${data.action.items.map((i) => i.name).join(", ")}`;
      }

      setMessages((prev) => [...prev, newMsg]);
    } catch {
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: "ai", text: "서버 연결에 실패했어요. 다시 시도해주세요." }]);
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <KeyboardAvoidingView style={st.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={st.header}>
        <View>
          <Text style={st.appTitle}>요리조리 🍳</Text>
          <Text style={st.appSubtitle}>AI에게 요리를 물어보세요</Text>
        </View>
        <TouchableOpacity style={st.headerBtn} onPress={() => setSettingsOpen(true)}>
          <SettingsIcon />
        </TouchableOpacity>
      </View>

      <View style={st.chatWrap}>
        <ScrollView
          ref={scrollRef}
          style={st.chatMessages}
          contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 14, gap: 12 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => (
            <View key={msg.id}>
              <View style={[st.chatMsg, msg.role === "ai" ? st.chatMsgAi : st.chatMsgUser]}>
                {msg.role === "ai" && <View style={st.avatar}><Text>🤖</Text></View>}
                <View style={[st.bubble, msg.role === "ai" ? st.bubbleAi : st.bubbleUser]}>
                  <Text style={[st.bubbleText, msg.role === "user" && { color: "#fff" }]}>{msg.text}</Text>
                </View>
              </View>
              {msg.recipes?.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={rc.row}>
                  {msg.recipes.map((r) => (
                    <TouchableOpacity key={r.id} style={rc.card} onPress={() => setSelectedRecipeId(r.id)}>
                      {r.image_url
                        ? <Image source={{ uri: r.image_url }} style={rc.thumb} resizeMode="cover" />
                        : <Text style={rc.emoji}>🍽️</Text>}
                      <Text style={rc.name} numberOfLines={2}>{r.name}</Text>
                      <Text style={rc.meta}>{r.cook_time_min}분 · {r.difficulty}</Text>
                      {r.key_ingredients?.length > 0 && (
                        <Text style={rc.ingr} numberOfLines={1}>
                          {(Array.isArray(r.key_ingredients) ? r.key_ingredients : JSON.parse(r.key_ingredients || "[]")).slice(0, 3).join(", ")}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
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

        {ingrPickerOpen ? (
          <View style={st.ingrPickerWrap}>
            <Text style={st.ingrPickerLabel}>재료 선택</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 14, paddingVertical: 6 }}>
              {getDisplayIngredients().map((name) => (
                <TouchableOpacity key={name} style={st.ingrChip} onPress={() => sendMessage(`${name}으로 만들 수 있는 요리 추천해줘`)}>
                  <Text style={st.ingrChipText}>{name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={st.quickChipsRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[st.quickChips, { flex: 1 }]} contentContainerStyle={{ gap: 8, paddingHorizontal: 14, paddingVertical: 6 }}>
              {QUICK_CHIPS.map((chip) => (
                <TouchableOpacity
                  key={chip}
                  style={st.quickChip}
                  onPress={() => {
                    if (chip === "추천 레시피 🍳") {
                      const random = RECOMMEND_POOL[Math.floor(Math.random() * RECOMMEND_POOL.length)];
                      sendMessage(random);
                    } else {
                      sendMessage(chip);
                    }
                  }}
                >
                  <Text style={st.quickChipText}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={st.clearHistoryBtn} onPress={clearHistory}>
              <TrashIcon />
            </TouchableOpacity>
          </View>
        )}

        <View style={st.inputBar}>
          <View style={st.inputWrap}>
            <TouchableOpacity style={st.inputIconBtn} onPress={() => setIngrPickerOpen((v) => !v)}>
              <Svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={ingrPickerOpen ? C.primary : C.textMuted} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <Line x1={12} y1={5} x2={12} y2={19} /><Line x1={5} y1={12} x2={19} y2={12} />
              </Svg>
            </TouchableOpacity>
            <TextInput
              style={st.textInput}
              value={input}
              onChangeText={(v) => { setInput(v); if (v.length > 0) setIngrPickerOpen(false); }}
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
      <RecipeModal recipeId={selectedRecipeId} onClose={() => setSelectedRecipeId(null)} />
    </KeyboardAvoidingView>
  );
}

const rc = StyleSheet.create({
  row:   { paddingHorizontal: 46, paddingVertical: 8, gap: 10 },
  card:  { width: 130, backgroundColor: "#fff", borderRadius: 12, overflow: "hidden", elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  thumb: { width: 130, height: 90, backgroundColor: "#f0f0f0" },
  emoji: { fontSize: 28, padding: 12 },
  name:  { fontSize: 13, fontWeight: "700", color: "#111", lineHeight: 18, paddingHorizontal: 10, paddingTop: 8 },
  meta:  { fontSize: 11, color: "#FF6B35", fontWeight: "600", paddingHorizontal: 10 },
  ingr:  { fontSize: 11, color: "#888", paddingHorizontal: 10, paddingBottom: 10 },
});
