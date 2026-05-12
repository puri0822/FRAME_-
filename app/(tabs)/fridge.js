import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Line } from "react-native-svg";
import { C } from "../../styles/colors";
import st from "../../styles/tabs/fridge";
import { setIngredients } from "../store";

const CATEGORIES = [
  { id: "채소/과일",   label: "채소/과일",   color: "#16A34A" },
  { id: "육류/수산",   label: "육류/수산",   color: "#E05454" },
  { id: "유제품",      label: "유제품",      color: "#3B9EE0" },
  { id: "가공/편의점", label: "가공/편의점", color: "#FF6B35" },
  { id: "양념",        label: "양념",        color: "#E8A020" },
];

const CAT_OPTIONS = ["채소/과일", "육류/수산", "유제품", "가공/편의점", "양념"];

const INGR_EMOJI = {
  계란:"🥚", 달걀:"🥚", 대파:"🌿", 파:"🌿", 쪽파:"🌿", 양파:"🧅", 마늘:"🧄",
  생강:"🫚", 감자:"🥔", 고구마:"🍠", 당근:"🥕", 배추:"🥬", 양배추:"🥬", 시금치:"🥬",
  깻잎:"🌿", 상추:"🥬", 무:"🥬", 고추:"🌶️", 오이:"🥒", 토마토:"🍅", 버섯:"🍄",
  두부:"🫘", 돼지고기:"🥩", 삼겹살:"🥩", 소고기:"🥩", 닭고기:"🍗", 닭가슴살:"🍗",
  생선:"🐟", 연어:"🐟", 참치:"🐟", 새우:"🦐", 오징어:"🦑", 김치:"🥢",
  쌀:"🍚", 밥:"🍚", 라면:"🍜", 빵:"🍞", 치즈:"🧀", 우유:"🥛", 버터:"🧈",
  된장:"🫙", 간장:"🫙", 고추장:"🫙", 소금:"🧂", 설탕:"🍬", 참기름:"🫙",
  베이컨:"🥓", 소시지:"🌭", 햄:"🥩", 사과:"🍎", 귤:"🍊", 후추:"🧂", 스팸:"🥩",
};
const CAT_EMOJI = { "채소/과일":"🥬", "육류/수산":"🥩", "유제품":"🧀", "가공/편의점":"🥫", "양념":"🫙" };

function getEmoji(name, cat) { return INGR_EMOJI[name] || CAT_EMOJI[cat] || "🥘"; }

function getExpiryInfo(expiryStr) {
  if (!expiryStr) return null;
  const expiry = new Date(expiryStr);
  const today  = new Date();
  expiry.setHours(0,0,0,0); today.setHours(0,0,0,0);
  const diff = Math.round((expiry - today) / 86400000);
  const [,m,d] = expiryStr.split("-");
  const dateStr = `${parseInt(m)}/${parseInt(d)}`;
  if (diff < 0)   return { text: `~ ${dateStr} (만료)`,      status: "expired" };
  if (diff === 0) return { text: `~ ${dateStr} (오늘 만료)`, status: "expired" };
  if (diff <= 3)  return { text: `~ ${dateStr} (D-${diff})`, status: "warning" };
  return { text: `~ ${dateStr}`, status: "ok" };
}

const TABS = ["전체", "임박 🚨", "채소/과일", "육류/수산", "유제품", "가공/편의점", "양념"];

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

const INGR_CATALOG = [
  { name:"계란",       cat:"채소/과일" }, { name:"대파",       cat:"채소/과일" },
  { name:"양파",       cat:"채소/과일" }, { name:"마늘",       cat:"채소/과일" },
  { name:"감자",       cat:"채소/과일" }, { name:"당근",       cat:"채소/과일" },
  { name:"배추",       cat:"채소/과일" }, { name:"고추",       cat:"채소/과일" },
  { name:"오이",       cat:"채소/과일" }, { name:"토마토",     cat:"채소/과일" },
  { name:"버섯",       cat:"채소/과일" }, { name:"시금치",     cat:"채소/과일" },
  { name:"깻잎",       cat:"채소/과일" }, { name:"애호박",     cat:"채소/과일" },
  { name:"브로콜리",   cat:"채소/과일" }, { name:"파프리카",   cat:"채소/과일" },
  { name:"돼지고기",   cat:"육류/수산" }, { name:"소고기",     cat:"육류/수산" },
  { name:"닭고기",     cat:"육류/수산" }, { name:"베이컨",     cat:"육류/수산" },
  { name:"스팸",       cat:"육류/수산" }, { name:"참치캔",     cat:"육류/수산" },
  { name:"고추참치캔", cat:"육류/수산" }, { name:"어묵",       cat:"육류/수산" },
  { name:"새우",       cat:"육류/수산" }, { name:"햄",         cat:"육류/수산" },
  { name:"두부",           cat:"유제품" }, { name:"슬라이스 치즈", cat:"유제품" },
  { name:"우유",           cat:"유제품" }, { name:"버터",          cat:"유제품" },
  { name:"밥",           cat:"가공/편의점" }, { name:"라면",         cat:"가공/편의점" },
  { name:"컵라면",       cat:"가공/편의점" }, { name:"냉동 만두",    cat:"가공/편의점" },
  { name:"냉동 채소",    cat:"가공/편의점" }, { name:"냉동 떡볶이",  cat:"가공/편의점" },
  { name:"부침가루",     cat:"가공/편의점" }, { name:"김",           cat:"가공/편의점" },
  { name:"김치",         cat:"가공/편의점" }, { name:"묵은 김치",    cat:"가공/편의점" },
  { name:"된장",   cat:"양념" }, { name:"고추장", cat:"양념" },
  { name:"간장",   cat:"양념" }, { name:"소금",   cat:"양념" },
  { name:"설탕",   cat:"양념" }, { name:"참기름", cat:"양념" },
  { name:"식용유", cat:"양념" }, { name:"마요네즈",cat:"양념" },
  { name:"올리고당",cat:"양념"}, { name:"후추",   cat:"양념" },
];

const CAT_FILTER_OPTIONS = ["전체", "채소/과일", "육류/수산", "유제품", "가공/편의점", "양념"];
const CAT_COLOR = { "채소/과일":"#16A34A","육류/수산":"#E05454","유제품":"#3B9EE0","가공/편의점":"#FF6B35","양념":"#E8A020" };

/* ── 카탈로그 재료 상세 바텀시트 ── */
function CatalogDetailSheet({ item, onClose, onAdd }) {
  const [count, setCount]   = useState(1);
  const [expiry, setExpiry] = useState("");

  useEffect(() => {
    if (item) { setCount(1); setExpiry(""); }
  }, [item]);

  function addDays(n) {
    const base = expiry ? new Date(expiry) : new Date();
    base.setDate(base.getDate() + n);
    setExpiry(formatDate(base));
  }

  if (!item) return null;

  return (
    <Modal visible={!!item} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={st.editOverlay} onPress={onClose}>
        <Pressable style={st.editSheet} onPress={() => {}}>
          <View style={st.editSheetHandle} />
          <View style={st.editSheetHeader}>
            <Text style={st.editSheetEmoji}>{getEmoji(item.name, item.cat)}</Text>
            <View>
              <Text style={st.editSheetName}>{item.name}</Text>
              <Text style={[st.editSheetCat, { color: CAT_COLOR[item.cat] }]}>{item.cat}</Text>
            </View>
          </View>
          <View style={st.editSheetRow}>
            <Text style={st.editSheetLabel}>갯수</Text>
            <View style={st.countRow}>
              <TouchableOpacity style={st.countBtn} onPress={() => setCount(Math.max(1, count - 1))}>
                <Text style={st.countBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={st.countDisplay}>{count}</Text>
              <TouchableOpacity style={st.countBtn} onPress={() => setCount(count + 1)}>
                <Text style={st.countBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={st.expiryGroup}>
            <Text style={st.expiryGroupLabel}>유통기한</Text>
            <TextInput
              style={st.dateInput} value={expiry} onChangeText={setExpiry}
              placeholder="YYYY-MM-DD (선택)" placeholderTextColor={C.textMuted}
              keyboardType="numeric" textAlign="center"
            />
            <View style={st.shortcutsRow}>
              {[1, 3, 7, 30].map((n) => (
                <TouchableOpacity key={n} style={st.shortcutBtn} onPress={() => addDays(n)}>
                  <Text style={st.shortcutBtnText}>+{n}일</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={st.editActions}>
            <TouchableOpacity style={st.cancelBtn} onPress={onClose}>
              <Text style={st.cancelBtnText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.saveBtn} onPress={() => { onAdd({ name: item.name, category: item.cat, expiry, count }); onClose(); }}>
              <Text style={st.saveBtnText}>냉장고에 추가</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ── 재료 추가 모달 ── */
function AddIngredientModal({ visible, onClose, onAdd, defaultCategory }) {
  const [tab, setTab]           = useState("catalog");
  const [catalogCat, setCatalogCat] = useState("전체");
  const [catalogItem, setCatalogItem] = useState(null);
  const [addedNames, setAddedNames]   = useState(new Set());
  const [name, setName]         = useState("");
  const [category, setCat]      = useState(defaultCategory || "채소/과일");
  const [expiry, setExpiry]     = useState("");
  const [count, setCount]       = useState(1);

  useEffect(() => {
    if (visible) {
      setTab("catalog"); setCatalogCat("전체"); setAddedNames(new Set());
      setName(""); setCat(defaultCategory || "채소/과일"); setExpiry(""); setCount(1);
    }
  }, [visible, defaultCategory]);

  function handleManualAdd() {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), category, expiry, count });
    setName(""); setExpiry(""); setCount(1);
  }

  function handleCatalogAdd(item) {
    onAdd(item);
    setAddedNames((prev) => new Set([...prev, item.name]));
  }

  function addDays(n) {
    const base = expiry ? new Date(expiry) : new Date();
    base.setDate(base.getDate() + n);
    setExpiry(formatDate(base));
  }

  const catalogFiltered = catalogCat === "전체"
    ? INGR_CATALOG
    : INGR_CATALOG.filter((i) => i.cat === catalogCat);

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={st.overlay} onPress={onClose}>
          <Pressable style={[st.sheet, { maxHeight: "88%" }]} onPress={() => {}}>
            {/* 헤더 */}
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>재료 추가</Text>
              <TouchableOpacity style={st.closeBtn} onPress={onClose}>
                <Text style={{ fontSize: 16, color: C.textSub }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* 탭 바 */}
            <View style={st.modalTabBar}>
              {[["catalog","카탈로그"],["manual","직접 입력"]].map(([key, label]) => (
                <TouchableOpacity key={key} style={[st.modalTab, tab === key && st.modalTabActive]} onPress={() => setTab(key)}>
                  <Text style={[st.modalTabText, tab === key && st.modalTabTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {tab === "catalog" ? (
              <>
                {/* 카테고리 필터 */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.catalogFilterBar} contentContainerStyle={{ gap: 8, paddingHorizontal: 14, paddingVertical: 8 }}>
                  {CAT_FILTER_OPTIONS.map((cat) => (
                    <TouchableOpacity key={cat} style={[st.catChip, catalogCat === cat && st.catChipActive]} onPress={() => setCatalogCat(cat)}>
                      <Text style={[st.catChipText, catalogCat === cat && st.catChipTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {/* 카탈로그 그리드 */}
                <ScrollView contentContainerStyle={st.catalogGrid}>
                  {catalogFiltered.map((item) => {
                    const added = addedNames.has(item.name);
                    return (
                      <TouchableOpacity
                        key={item.name}
                        style={[st.catalogCard, added && st.catalogCardAdded]}
                        onPress={() => setCatalogItem(item)}
                        activeOpacity={0.7}
                      >
                        {added && (
                          <View style={st.catalogCheck}>
                            <Text style={st.catalogCheckText}>✓</Text>
                          </View>
                        )}
                        <Text style={st.catalogEmoji}>{getEmoji(item.name, item.cat)}</Text>
                        <Text style={st.catalogName} numberOfLines={1}>{item.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            ) : (
              <ScrollView style={st.modalBody} contentContainerStyle={{ gap: 18, paddingBottom: 20 }}>
                <View style={st.field}>
                  <Text style={st.fieldLabel}>재료명</Text>
                  <TextInput
                    style={st.textInput} value={name} onChangeText={setName}
                    placeholder="재료 이름을 입력하세요" placeholderTextColor={C.textMuted} returnKeyType="done"
                  />
                </View>
                <View style={st.field}>
                  <Text style={st.fieldLabel}>카테고리</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {CAT_OPTIONS.map((cat) => (
                      <TouchableOpacity key={cat} style={[st.catChip, category === cat && st.catChipActive]} onPress={() => setCat(cat)}>
                        <Text style={[st.catChipText, category === cat && st.catChipTextActive]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <View style={st.field}>
                  <Text style={st.fieldLabel}>유통기한</Text>
                  <TextInput
                    style={st.textInput} value={expiry} onChangeText={setExpiry}
                    placeholder="YYYY-MM-DD" placeholderTextColor={C.textMuted} keyboardType="numeric"
                  />
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    {[1, 3, 7, 30].map((n) => (
                      <TouchableOpacity key={n} style={st.shortcutBtn} onPress={() => addDays(n)}>
                        <Text style={st.shortcutBtnText}>+{n}일</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={st.field}>
                  <Text style={st.fieldLabel}>갯수</Text>
                  <View style={st.countRow}>
                    <TouchableOpacity style={st.countBtn} onPress={() => setCount(Math.max(1, count - 1))}>
                      <Text style={st.countBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={st.countDisplay}>{count}</Text>
                    <TouchableOpacity style={st.countBtn} onPress={() => setCount(count + 1)}>
                      <Text style={st.countBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity style={st.saveBtn} onPress={handleManualAdd}>
                  <Text style={st.saveBtnText}>등록</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <CatalogDetailSheet
        item={catalogItem}
        onClose={() => setCatalogItem(null)}
        onAdd={(item) => { handleCatalogAdd(item); setCatalogItem(null); }}
      />
    </>
  );
}

/* ── 편집 바텀 시트 ── */
function EditBottomSheet({ item, onClose, onSave, onDelete }) {
  const [count, setCount]   = useState(1);
  const [expiry, setExpiry] = useState("");

  useEffect(() => {
    if (item) { setCount(item.count ?? 1); setExpiry(item.expiry ?? ""); }
  }, [item]);

  function addDays(n) {
    const base = expiry ? new Date(expiry) : new Date();
    base.setDate(base.getDate() + n);
    setExpiry(formatDate(base));
  }

  if (!item) return null;

  return (
    <Modal visible={!!item} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={st.editOverlay} onPress={onClose}>
        <Pressable style={st.editSheet} onPress={() => {}}>
          <View style={st.editSheetHandle} />
          <Text style={st.editSheetTitle}>재료 편집</Text>

          <View style={st.editSheetHeader}>
            <Text style={st.editSheetEmoji}>{getEmoji(item.name, item.category)}</Text>
            <View>
              <Text style={st.editSheetName}>{item.name}</Text>
              <Text style={st.editSheetCat}>{item.category}</Text>
            </View>
          </View>

          <View style={st.editSheetRow}>
            <Text style={st.editSheetLabel}>갯수</Text>
            <View style={st.countRow}>
              <TouchableOpacity style={st.countBtn} onPress={() => setCount(Math.max(1, count - 1))}>
                <Text style={st.countBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={st.countDisplay}>{count}</Text>
              <TouchableOpacity style={st.countBtn} onPress={() => setCount(count + 1)}>
                <Text style={st.countBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={st.expiryGroup}>
            <Text style={st.expiryGroupLabel}>유통기한</Text>
            <TextInput
              style={st.dateInput} value={expiry} onChangeText={setExpiry}
              placeholder="YYYY-MM-DD" placeholderTextColor={C.textMuted}
              keyboardType="numeric" textAlign="center"
            />
            <View style={st.shortcutsRow}>
              {[1, 3, 7, 30].map((n) => (
                <TouchableOpacity key={n} style={st.shortcutBtn} onPress={() => addDays(n)}>
                  <Text style={st.shortcutBtnText}>+{n}일</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={st.editActions}>
            <TouchableOpacity style={st.cancelBtn} onPress={() => onDelete(item.id)}>
              <Text style={[st.cancelBtnText, { color: "#DC2626" }]}>삭제</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.saveBtn} onPress={() => { onSave(item.id, count, expiry); onClose(); }}>
              <Text style={st.saveBtnText}>저장</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ── 재료 아이템 ── */
function IngredientItem({ item, selected, onToggle, onEdit }) {
  const expiryInfo = getExpiryInfo(item.expiry);
  const expiryColor = expiryInfo?.status === "expired" ? "#DC2626" : expiryInfo?.status === "warning" ? "#EA580C" : C.textMuted;

  return (
    <TouchableOpacity
      style={[st.ingredientItem, selected && st.ingredientItemSelected]}
      onPress={() => onToggle(item.id)}
      activeOpacity={0.7}
    >
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
      <TouchableOpacity style={st.editBtn} onPress={() => onEdit(item)}>
        <Text style={{ fontSize: 13, color: C.textSub }}>✎</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

/* ── 메인 컴포넌트 ── */
export default function FridgeScreen() {
  const [items, setItems]             = useState([]);
  const [activeTab, setTab]           = useState("전체");
  const [modalOpen, setModal]         = useState(false);
  const [modalCat, setModalCat]       = useState("채소/과일");
  const [editItem, setEditItem]       = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => { setIngredients(items.map((i) => i.name)); }, [items]);

  function addItem(item) {
    const dup = items.some((i) => i.name === item.name && i.category === item.category);
    if (dup) return;
    setItems((prev) => [...prev, { ...item, id: Date.now() }]);
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }

  function updateItem(id, count, expiry) {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, count, expiry } : i));
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function openAdd(defaultCat = "채소/과일") {
    setModalCat(defaultCat);
    setModal(true);
  }

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
  const selectedNames = items.filter((i) => selectedIds.has(i.id)).map((i) => i.name);

  return (
    <View style={st.container}>
      <View style={st.fridgeCard}>
        {/* 카드 헤더 */}
        <View style={st.cardHeader}>
          <Text style={st.cardIcon}>🧊</Text>
          <Text style={st.cardTitle}>냉장고</Text>
          <View style={st.headerActions}>
            <TouchableOpacity style={st.convenienceBtn} onPress={() => openAdd("가공/편의점")}>
              <Text style={st.convenienceBtnText}>🏪 편의점</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.addIngredientBtn} onPress={() => openAdd()}>
              <Svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke={C.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <Line x1={12} y1={5} x2={12} y2={19} /><Line x1={5} y1={12} x2={19} y2={12} />
              </Svg>
              <Text style={st.addIngredientBtnText}>재료 추가</Text>
            </TouchableOpacity>
          </View>
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
          {selectedIds.size > 0 && (
            <TouchableOpacity style={st.recipeSearchBtn}>
              <Text style={st.recipeSearchBtnText} numberOfLines={1}>
                🍳 {selectedNames.join(", ")} 으로 레시피 찾기
              </Text>
            </TouchableOpacity>
          )}

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
                  {group.items.map((item) => (
                    <IngredientItem key={item.id} item={item} selected={selectedIds.has(item.id)} onToggle={toggleSelect} onEdit={setEditItem} />
                  ))}
                </View>
              </View>
            ))
          ) : (
            <View style={{ gap: 8 }}>
              {visible.map((item) => (
                <IngredientItem key={item.id} item={item} selected={selectedIds.has(item.id)} onToggle={toggleSelect} onEdit={setEditItem} />
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      <AddIngredientModal
        visible={modalOpen}
        onClose={() => setModal(false)}
        onAdd={addItem}
        defaultCategory={modalCat}
      />
      <EditBottomSheet
        item={editItem}
        onClose={() => setEditItem(null)}
        onSave={updateItem}
        onDelete={(id) => { removeItem(id); setEditItem(null); }}
      />
    </View>
  );
}
