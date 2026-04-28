import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Line, Path } from "react-native-svg";

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

const CATEGORIES = [
  { id: "채소/과일",   label: "채소/과일",   color: "#16A34A" },
  { id: "육류/수산",   label: "육류/수산",   color: "#E05454" },
  { id: "유제품",      label: "유제품",      color: "#3B9EE0" },
  { id: "가공/편의점", label: "가공/편의점", color: "#FF6B35" },
  { id: "양념",        label: "양념",        color: "#E8A020" },
];

const CAT_OPTIONS = ["채소/과일", "육류/수산", "유제품", "가공/편의점", "양념"];

const INGR_EMOJI = {
  계란:"🥚",달걀:"🥚",대파:"🌿",파:"🌿",쪽파:"🌿",양파:"🧅",마늘:"🧄",
  생강:"🫚",감자:"🥔",고구마:"🍠",당근:"🥕",배추:"🥬",양배추:"🥬",시금치:"🥬",
  깻잎:"🌿",상추:"🥬",무:"🥬",고추:"🌶️",오이:"🥒",토마토:"🍅",버섯:"🍄",
  두부:"🫘",돼지고기:"🥩",삼겹살:"🥩",소고기:"🥩",닭고기:"🍗",닭가슴살:"🍗",
  생선:"🐟",연어:"🐟",참치:"🐟",새우:"🦐",오징어:"🦑",김치:"🥢",
  쌀:"🍚",밥:"🍚",라면:"🍜",빵:"🍞",치즈:"🧀",우유:"🥛",버터:"🧈",
  된장:"🫙",간장:"🫙",고추장:"🫙",소금:"🧂",설탕:"🍬",참기름:"🫙",
  베이컨:"🥓",소시지:"🌭",햄:"🥩",사과:"🍎",귤:"🍊",후추:"🧂",스팸:"🥩",
};
const CAT_EMOJI = { "채소/과일":"🥬","육류/수산":"🥩","유제품":"🧀","가공/편의점":"🥫","양념":"🫙" };

function getEmoji(name, cat) { return INGR_EMOJI[name] || CAT_EMOJI[cat] || "🥘"; }

function getExpiryInfo(expiryStr) {
  if (!expiryStr) return null;
  const expiry = new Date(expiryStr);
  const today  = new Date();
  expiry.setHours(0,0,0,0); today.setHours(0,0,0,0);
  const diff = Math.round((expiry - today) / 86400000);
  const [,m,d] = expiryStr.split("-");
  const dateStr = `${parseInt(m)}/${parseInt(d)}`;
  if (diff < 0)   return { text: `~ ${dateStr} (만료)`,          status: "expired" };
  if (diff === 0) return { text: `~ ${dateStr} (오늘 만료)`,     status: "expired" };
  if (diff <= 3)  return { text: `~ ${dateStr} (D-${diff})`,     status: "warning" };
  return { text: `~ ${dateStr}`, status: "ok" };
}

const TABS = ["전체", "임박 🚨", "채소/과일", "육류/수산", "유제품", "가공/편의점", "양념"];

/* ── 재료 추가 모달 ── */
function AddIngredientModal({ visible, onClose, onAdd }) {
  const [name, setName]     = useState("");
  const [category, setCat]  = useState("채소/과일");
  const [expiry, setExpiry] = useState("");
  const [count, setCount]   = useState(1);

  function handleAdd() {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), category, expiry, count });
    setName(""); setCat("채소/과일"); setExpiry(""); setCount(1);
    onClose();
  }

  function addDays(n) {
    const base = expiry ? new Date(expiry) : new Date();
    base.setDate(base.getDate() + n);
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, "0");
    const d = String(base.getDate()).padStart(2, "0");
    setExpiry(`${y}-${m}-${d}`);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={st.overlay} onPress={onClose}>
        <Pressable style={st.sheet} onPress={() => {}}>
          {/* 헤더 */}
          <View style={st.modalHeader}>
            <Text style={st.modalTitle}>재료 추가</Text>
            <TouchableOpacity style={st.closeBtn} onPress={onClose}>
              <Text style={{ fontSize: 16, color: C.textSub }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={st.modalBody} contentContainerStyle={{ gap: 18, paddingBottom: 20 }}>
            {/* 재료명 */}
            <View style={st.field}>
              <Text style={st.fieldLabel}>재료명</Text>
              <TextInput
                style={st.textInput}
                value={name}
                onChangeText={setName}
                placeholder="재료 이름을 입력하세요"
                placeholderTextColor={C.textMuted}
                returnKeyType="done"
              />
            </View>

            {/* 카테고리 */}
            <View style={st.field}>
              <Text style={st.fieldLabel}>카테고리</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {CAT_OPTIONS.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[st.catChip, category === cat && st.catChipActive]}
                    onPress={() => setCat(cat)}
                  >
                    <Text style={[st.catChipText, category === cat && st.catChipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* 유통기한 */}
            <View style={st.field}>
              <Text style={st.fieldLabel}>유통기한</Text>
              <TextInput
                style={st.textInput}
                value={expiry}
                onChangeText={setExpiry}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={C.textMuted}
                keyboardType="numeric"
              />
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                {[1, 3, 7, 30].map((n) => (
                  <TouchableOpacity key={n} style={st.shortcutBtn} onPress={() => addDays(n)}>
                    <Text style={st.shortcutBtnText}>+{n}일</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 갯수 */}
            <View style={st.field}>
              <Text style={st.fieldLabel}>갯수</Text>
              <View style={st.countRow}>
                <TouchableOpacity style={st.countBtn} onPress={() => setCount(Math.max(1, count - 1))}>
                  <Text style={st.countBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={st.countNum}>{count}</Text>
                <TouchableOpacity style={st.countBtn} onPress={() => setCount(count + 1)}>
                  <Text style={st.countBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* 등록 버튼 */}
          <View style={st.modalFooter}>
            <TouchableOpacity style={st.addBtn} onPress={handleAdd}>
              <Text style={st.addBtnText}>등록</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ── 메인 컴포넌트 ── */
export default function FridgeScreen() {
  const [items, setItems]       = useState([]);
  const [activeTab, setTab]     = useState("전체");
  const [modalOpen, setModal]   = useState(false);

  function addItem(item) {
    const duplicate = items.some((i) => i.name === item.name && i.category === item.category);
    if (duplicate) return;
    setItems((prev) => [...prev, { ...item, id: Date.now() }]);
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  /* 필터링 */
  function getVisible() {
    if (activeTab === "임박 🚨") {
      return items.filter((item) => {
        const info = getExpiryInfo(item.expiry);
        return info && (info.status === "expired" || info.status === "warning");
      });
    }
    if (activeTab === "전체") return items;
    return items.filter((i) => i.category === activeTab);
  }

  /* 카테고리별 그룹 */
  function getGrouped(list) {
    const groups = {};
    CATEGORIES.forEach((c) => {
      const g = list.filter((i) => i.category === c.id);
      if (g.length > 0) groups[c.id] = { ...c, items: g };
    });
    return groups;
  }

  const visible = getVisible();
  const grouped = activeTab === "전체" ? getGrouped(visible) : null;

  return (
    <View style={st.container}>
      {/* 카드 */}
      <View style={st.fridgeCard}>
        {/* 카드 헤더 */}
        <View style={st.cardHeader}>
          <Text style={st.cardIcon}>🧊</Text>
          <Text style={st.cardTitle}>냉장고</Text>
          <TouchableOpacity style={st.addIngredientBtn} onPress={() => setModal(true)}>
            <Svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke={C.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <Line x1={12} y1={5} x2={12} y2={19} /><Line x1={5} y1={12} x2={19} y2={12} />
            </Svg>
            <Text style={st.addIngredientBtnText}>재료 추가</Text>
          </TouchableOpacity>
        </View>

        {/* 탭 바 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.tabBar} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[st.tab, activeTab === tab && (tab === "임박 🚨" ? st.tabUrgentActive : st.tabActive),
                tab === "임박 🚨" && activeTab !== tab && st.tabUrgent]}
              onPress={() => setTab(tab)}
            >
              <Text style={[st.tabText, activeTab === tab && st.tabTextActive,
                tab === "임박 🚨" && activeTab !== tab && st.tabTextUrgent]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 재료 목록 */}
        <ScrollView style={st.content} contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 24 }}>
          {visible.length === 0 ? (
            <View style={st.emptyState}>
              <Text style={st.emptyIcon}>{activeTab === "임박 🚨" ? "✅" : "🧊"}</Text>
              <Text style={st.emptyTitle}>{activeTab === "임박 🚨" ? "임박 재료 없음" : "냉장고가 비어있어요"}</Text>
              <Text style={st.emptyDesc}>{activeTab === "임박 🚨" ? "유통기한이 3일 이내인 재료가 없어요!" : "재료 추가 버튼으로 재료를 등록해 보세요!"}</Text>
            </View>
          ) : grouped ? (
            Object.values(grouped).map((group) => (
              <View key={group.id}>
                <View style={st.groupHeader}>
                  <View style={[st.catBadge, { borderColor: group.color + "50", backgroundColor: group.color + "20" }]}>
                    <Text style={[st.catBadgeText, { color: group.color }]}>{group.label}</Text>
                  </View>
                  <Text style={st.catCount}>{group.items.length}개</Text>
                </View>
                <View style={{ gap: 8 }}>
                  {group.items.map((item) => <IngredientItem key={item.id} item={item} onRemove={removeItem} />)}
                </View>
              </View>
            ))
          ) : (
            <View style={{ gap: 8 }}>
              {visible.map((item) => <IngredientItem key={item.id} item={item} onRemove={removeItem} />)}
            </View>
          )}
        </ScrollView>
      </View>

      <AddIngredientModal visible={modalOpen} onClose={() => setModal(false)} onAdd={addItem} />
    </View>
  );
}

function IngredientItem({ item, onRemove }) {
  const expiryInfo = getExpiryInfo(item.expiry);
  const expiryColor = expiryInfo?.status === "expired" ? "#DC2626" : expiryInfo?.status === "warning" ? "#EA580C" : C.textMuted;

  return (
    <View style={st.ingredientItem}>
      <View style={st.ingrPhoto}>
        <Text style={{ fontSize: 24 }}>{getEmoji(item.name, item.category)}</Text>
      </View>
      <View style={st.ingrBody}>
        <Text style={st.ingrName}>{item.name}</Text>
        <Text style={[st.expiryLabel, { color: expiryColor }]}>
          {expiryInfo ? expiryInfo.text : "유통기한 미설정"}
        </Text>
      </View>
      <View style={st.countBadge}>
        <Text style={st.countBadgeText}>{item.count ?? 1}개</Text>
      </View>
      <TouchableOpacity style={st.removeBtn} onPress={() => onRemove(item.id)}>
        <Text style={st.removeBtnText}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 16, paddingTop: 20 },
  fridgeCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(255,107,53,0.35)",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10,
    elevation: 3, overflow: "hidden", marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 14, backgroundColor: C.bg,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  cardIcon: { fontSize: 20 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: C.text, flex: 1 },
  addIngredientBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1.5, borderColor: C.primary, backgroundColor: C.primaryLt,
  },
  addIngredientBtnText: { fontSize: 12, fontWeight: "700", color: C.primary },
  tabBar: { borderBottomWidth: 1, borderBottomColor: C.border, maxHeight: 56, flexGrow: 0 },
  tab: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1.5, borderColor: C.border,
  },
  tabActive: { backgroundColor: C.primary, borderColor: C.primary },
  tabUrgent: { borderColor: "#FCA5A5" },
  tabUrgentActive: { backgroundColor: "#DC2626", borderColor: "#DC2626" },
  tabText: { fontSize: 13, fontWeight: "600", color: C.textMuted },
  tabTextActive: { color: "#fff" },
  tabTextUrgent: { color: "#DC2626" },
  content: { flex: 1 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 44, gap: 8 },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: C.text },
  emptyDesc: { fontSize: 13, color: C.textMuted, textAlign: "center" },
  groupHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  catBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, borderWidth: 1.5 },
  catBadgeText: { fontSize: 12, fontWeight: "700" },
  catCount: { fontSize: 12, color: C.textMuted },
  ingredientItem: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: C.surface, borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: C.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  ingrPhoto: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: C.bg,
    borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center",
  },
  ingrBody: { flex: 1, gap: 3 },
  ingrName: { fontSize: 14, fontWeight: "500", color: C.text },
  expiryLabel: { fontSize: 11, fontWeight: "500" },
  countBadge: {
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999,
    backgroundColor: C.primaryLt,
  },
  countBadgeText: { fontSize: 12, fontWeight: "700", color: C.primary },
  removeBtn: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  removeBtnText: { fontSize: 18, color: C.textMuted },
  /* 모달 */
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: C.text },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.bg, alignItems: "center", justifyContent: "center",
  },
  modalBody: { padding: 20 },
  field: { gap: 8 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.3 },
  textInput: {
    height: 46, paddingHorizontal: 14, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12, fontSize: 14, color: C.text, backgroundColor: C.surface,
  },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface,
  },
  catChipActive: { borderColor: C.primary, backgroundColor: C.primaryLt },
  catChipText: { fontSize: 13, fontWeight: "600", color: C.textSub },
  catChipTextActive: { color: C.primary },
  shortcutBtn: {
    height: 32, paddingHorizontal: 13, borderRadius: 999,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface,
    alignItems: "center", justifyContent: "center",
  },
  shortcutBtnText: { fontSize: 12, fontWeight: "700", color: C.textSub },
  countRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  countBtn: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg,
    alignItems: "center", justifyContent: "center",
  },
  countBtnText: { fontSize: 22, color: C.text, lineHeight: 26 },
  countNum: { fontSize: 20, fontWeight: "700", minWidth: 36, textAlign: "center", color: C.text },
  modalFooter: { padding: 20, paddingTop: 4 },
  addBtn: {
    height: 46, borderRadius: 12, backgroundColor: C.primary,
    alignItems: "center", justifyContent: "center",
  },
  addBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
