import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { C } from "../../styles/colors";
import st, { DIFF_COLOR } from "../../styles/tabs/explore";
import { getIngredients, getFridgeItems, saveFridgeToStorage, setIngredients, setFridgeItems } from "../store";
import { EC2_ENDPOINTS } from "../config/api";
import { useAuth } from "../context/AuthContext";

function StarRating({ value, size = 12 }) {
  return (
    <View style={{ flexDirection: "row" }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = value >= n;
        const half = !filled && value >= n - 0.5;
        return (
          <View key={n} style={{ width: size, height: size }}>
            <Text style={{ position: "absolute", fontSize: size, color: "#E5E7EB", lineHeight: size + 2 }}>★</Text>
            {(filled || half) && (
              <View style={{ position: "absolute", width: filled ? size : size / 2, height: size, overflow: "hidden" }}>
                <Text style={{ fontSize: size, color: "#d97706", lineHeight: size + 2 }}>★</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function StarInput({ value, onChange, size = 32 }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = value >= n;
        const half = !filled && value >= n - 0.5;
        return (
          <View key={n} style={{ width: size, height: size }}>
            <Text style={{ position: "absolute", fontSize: size - 4, color: "#E5E7EB", lineHeight: size }}>★</Text>
            {(filled || half) && (
              <View style={{ position: "absolute", width: filled ? size : size / 2, height: size, overflow: "hidden" }}>
                <Text style={{ fontSize: size - 4, color: "#F59E0B", lineHeight: size }}>★</Text>
              </View>
            )}
            <View style={{ position: "absolute", flexDirection: "row", width: size, height: size }}>
              <TouchableOpacity style={{ width: size / 2, height: size }} onPress={() => onChange(n - 0.5)} />
              <TouchableOpacity style={{ width: size / 2, height: size }} onPress={() => onChange(n)} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function RecipeModal({ recipe, onClose }) {
  const { user } = useAuth();
  const [textReviews,    setTextReviews]    = useState([]);
  const [youtube,        setYoutube]        = useState(null);
  const [reviewPage,     setReviewPage]     = useState(0);
  const [reviewRating,   setReviewRating]   = useState(5);
  const [reviewText,     setReviewText]     = useState("");
  const [submitting,     setSubmitting]     = useState(false);
  const [fridgeMatched,  setFridgeMatched]  = useState([]);
  const [selectedUsed,   setSelectedUsed]   = useState(new Set());
  const [removing,       setRemoving]       = useState(false);

  const PAGE_SIZE   = 5;
  const totalPages  = Math.max(1, Math.ceil(textReviews.length / PAGE_SIZE));
  const pageReviews = textReviews.slice(reviewPage * PAGE_SIZE, (reviewPage + 1) * PAGE_SIZE);

  async function loadReviews(id) {
    const data = await fetch(`${EC2_ENDPOINTS.recipes}/${id}`).then(r => r.json());
    if (Array.isArray(data.reviews)) setTextReviews(data.reviews);
  }

  useEffect(() => {
    if (!recipe) return;
    setTextReviews([]);
    setYoutube(null);
    setReviewPage(0);
    setReviewRating(5);
    setReviewText("");
    setSelectedUsed(new Set());
    loadReviews(recipe.id).catch(() => {});
    fetch(`${EC2_ENDPOINTS.youtube}?q=${encodeURIComponent(recipe.name)}&recipeId=${recipe.id}`)
      .then(r => r.json())
      .then(videos => { if (videos?.length > 0) setYoutube(videos[0]); })
      .catch(() => {});
    // 냉장고 메모리(항상 최신) 기준으로 레시피 재료와 겹치는 이름 찾기
    const fridgeNames = getIngredients();
    const recipeIngrs = recipe.ingredients || [];
    const matchedNames = recipeIngrs.filter(ri =>
      fridgeNames.some(fn => {
        const a = ri.toLowerCase(), b = fn.toLowerCase();
        return a.includes(b) || b.includes(a);
      })
    );
    setFridgeMatched(matchedNames);
  }, [recipe?.id]);

  async function removeUsedIngredients() {
    if (!selectedUsed.size || removing) return;
    setRemoving(true);
    try {
      const stored   = getFridgeItems();
      const newItems = stored.filter(i => !selectedUsed.has(i.name));
      setFridgeItems(newItems);
      setIngredients(newItems.map(i => i.name));
      await saveFridgeToStorage(newItems);
      if (user?.userId) {
        fetch(`${EC2_ENDPOINTS.fridge}/${user.userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ingredients: newItems }),
        }).catch(() => {});
      }
      setFridgeMatched(prev => prev.filter(name => !selectedUsed.has(name)));
      setSelectedUsed(new Set());
    } catch {}
    setRemoving(false);
  }

  function toggleUsed(name) {
    setSelectedUsed(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  async function submitReview() {
    if (!user || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${EC2_ENDPOINTS.recipes}/${recipe.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId:   user.userId,
          nickname: user.name || user.nickname || user.email,
          rating:   reviewRating,
          comment:  reviewText.trim(),
        }),
      });
      if (res.ok) {
        setReviewText("");
        setReviewRating(5);
        await loadReviews(recipe.id);
        setReviewPage(0);
      }
    } catch {}
    setSubmitting(false);
  }

  if (!recipe) return null;
  const diffColor = DIFF_COLOR[recipe.difficulty] || "#888";

  return (
    <Modal visible={!!recipe} transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.modalOverlay}>
        <Pressable style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} />
        <View style={st.modalSheet}>
          <View style={st.modalTopBar}>
            <View style={st.modalHandle} />
            <TouchableOpacity style={st.modalCloseBtn} onPress={onClose}>
              <Text style={{ fontSize: 14, color: C.textSub }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* 레시피 헤더 */}
            <View style={st.recipeHeader}>
              <View style={st.recipeEmoji}>
                {recipe.imageUrl
                  ? <Image source={{ uri: recipe.imageUrl }} style={{ width: 64, height: 64, borderRadius: 12 }} resizeMode="cover" />
                  : <Text style={{ fontSize: 40 }}>🍽️</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <View style={st.modalNameRow}>
                  <Text style={[st.recipeName, { marginBottom: 0, flex: 1 }]}>{recipe.name}</Text>
                  <View style={st.modalHeaderRating}>
                    <Svg width={15} height={15} viewBox="0 0 24 24">
                      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#f59e0b" />
                    </Svg>
                    <Text style={st.modalHeaderRatingText}>{Number(recipe.rating).toFixed(1)}</Text>
                  </View>
                </View>
                <View style={st.badgeRow}>
                  <View style={st.badgeTime}><Text style={st.badgeTimeText}>⏱ {recipe.time}분</Text></View>
                  <View style={[st.badgeDiff, { backgroundColor: diffColor + "20" }]}>
                    <Text style={[st.badgeDiffText, { color: diffColor }]}>{recipe.difficulty}</Text>
                  </View>
                </View>
                <Text style={st.recipeIngr} numberOfLines={2}>
                  {Array.isArray(recipe.ingredients) ? recipe.ingredients.join(" · ") : ""}
                </Text>
              </View>
            </View>

            <View style={st.divider} />

            {/* 조리 과정 */}
            {Array.isArray(recipe.instructions) && recipe.instructions.length > 0 && (
              <View style={{ paddingVertical: 18 }}>
                <Text style={st.sectionTitle}>조리 과정</Text>
                {recipe.instructions.map((step, i) => (
                  <View key={i} style={st.stepItem}>
                    <View style={st.stepNumber}><Text style={st.stepNumberText}>{i + 1}</Text></View>
                    <Text style={st.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* 사용한 재료 제거 */}
            <View style={st.divider} />
            <View style={{ paddingVertical: 16 }}>
              <Text style={st.sectionTitle}>사용한 재료 제거</Text>
              {fridgeMatched.length === 0 ? (
                <Text style={{ color: C.textMuted, fontSize: 13, textAlign: "center", paddingVertical: 12 }}>
                  냉장고에 이 레시피 재료가 없어요
                </Text>
              ) : (
                <>
                  <View style={{ gap: 8, marginBottom: 12 }}>
                    {fridgeMatched.map(name => {
                      const selected = selectedUsed.has(name);
                      return (
                        <TouchableOpacity
                          key={name}
                          style={{
                            flexDirection: "row", alignItems: "center", gap: 10,
                            padding: 10, borderRadius: 10, borderWidth: 1.5,
                            borderColor: selected ? C.primary : C.border,
                            backgroundColor: selected ? C.primaryLt : "#fff",
                          }}
                          onPress={() => toggleUsed(name)}
                        >
                          <View style={{
                            width: 20, height: 20, borderRadius: 10, borderWidth: 1.5,
                            borderColor: selected ? C.primary : C.border,
                            backgroundColor: selected ? C.primary : "#fff",
                            alignItems: "center", justifyContent: "center",
                          }}>
                            {selected && <Text style={{ fontSize: 11, color: "#fff", fontWeight: "800" }}>✓</Text>}
                          </View>
                          <Text style={{ flex: 1, fontSize: 14, fontWeight: "500", color: C.text }}>{name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TouchableOpacity
                    style={{
                      height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center",
                      backgroundColor: selectedUsed.size > 0 ? "#DC2626" : C.border,
                    }}
                    onPress={removeUsedIngredients}
                    disabled={!selectedUsed.size || removing}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>
                      {removing ? "삭제 중..." : `선택한 재료 삭제 (${selectedUsed.size}개)`}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* 유튜브 */}
            {youtube && (
              <>
                <View style={st.divider} />
                <View style={{ paddingVertical: 18 }}>
                  <Text style={st.sectionTitle}>유튜브 참고</Text>
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
                  <Text style={st.ytTitle}>{youtube.title}</Text>
                </View>
              </>
            )}

            {/* 이용 후기 */}
            <View style={st.divider} />
            <View style={{ paddingTop: 16, paddingBottom: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <View style={st.reviewTitleRow}>
                  <Text style={st.sectionTitle}>이용 후기</Text>
                  {textReviews.length > 0 && (
                    <View style={st.reviewCountBadge}>
                      <Text style={st.reviewCountText}>{textReviews.length}</Text>
                    </View>
                  )}
                </View>
                {totalPages > 1 && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <TouchableOpacity onPress={() => setReviewPage(p => Math.max(0, p - 1))} disabled={reviewPage === 0}>
                      <Text style={{ fontSize: 22, fontWeight: "600", color: reviewPage === 0 ? "#D1D5DB" : C.primary }}>‹</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 12, color: C.textSub }}>{reviewPage + 1} / {totalPages}</Text>
                    <TouchableOpacity onPress={() => setReviewPage(p => Math.min(totalPages - 1, p + 1))} disabled={reviewPage === totalPages - 1}>
                      <Text style={{ fontSize: 22, fontWeight: "600", color: reviewPage === totalPages - 1 ? "#D1D5DB" : C.primary }}>›</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {textReviews.length === 0 ? (
                <Text style={{ color: C.textMuted, fontSize: 13, textAlign: "center", paddingVertical: 16 }}>아직 리뷰가 없어요</Text>
              ) : (
                pageReviews.map((rv, i) => (
                  <View key={i} style={st.textReviewItem}>
                    <View style={st.textReviewMeta}>
                      <Text style={st.reviewUser}>{rv.user}</Text>
                      <View style={st.textReviewRightMeta}>
                        <StarRating value={rv.rating} size={11} />
                        <Text style={st.textReviewDate}>{rv.date}</Text>
                      </View>
                    </View>
                    <Text style={st.reviewText}>{rv.text}</Text>
                  </View>
                ))
              )}
            </View>

            {/* 리뷰 작성 */}
            <View style={st.divider} />
            <View style={{ paddingTop: 16, paddingBottom: 24 }}>
              <Text style={st.sectionTitle}>리뷰 작성</Text>
              {user ? (
                <View style={{ marginTop: 12, gap: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Text style={{ fontSize: 13, color: C.textSub, minWidth: 28 }}>별점</Text>
                    <StarInput value={reviewRating} onChange={setReviewRating} size={32} />
                    <Text style={{ fontSize: 14, color: "#F59E0B", fontWeight: "700", minWidth: 28 }}>{reviewRating.toFixed(1)}</Text>
                  </View>
                  <TextInput
                    style={{
                      borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10,
                      padding: 12, fontSize: 13, color: C.text,
                      minHeight: 80, textAlignVertical: "top",
                    }}
                    value={reviewText}
                    onChangeText={setReviewText}
                    placeholder="리뷰를 작성해 주세요 (선택)"
                    placeholderTextColor={C.textMuted}
                    multiline
                  />
                  <TouchableOpacity
                    style={{
                      backgroundColor: submitting ? "#D1D5DB" : C.primary,
                      borderRadius: 10, padding: 13, alignItems: "center",
                    }}
                    onPress={submitReview}
                    disabled={submitting}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
                      {submitting ? "제출 중..." : "리뷰 등록"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={{ color: C.textMuted, fontSize: 13, textAlign: "center", paddingVertical: 14 }}>
                  로그인 후 리뷰를 작성할 수 있어요
                </Text>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function ExploreScreen() {
  const { search: searchParam } = useLocalSearchParams();
  const [allRecipes,     setAllRecipes] = useState([]);
  const [trending,       setTrending]   = useState([]);
  const [categories,     setCategories] = useState(["전체"]);
  const [loading,        setLoading]    = useState(true);
  const [searchLoading,  setSearchLoading] = useState(false);
  const [refreshing,     setRefreshing]    = useState(false);
  const [query,          setQuery]          = useState("");
  const [activeCategory, setCategory]       = useState("전체");
  const [favorites,      setFavorites]      = useState(new Set());
  const [showFavOnly,    setShowFavOnly]    = useState(false);
  const [searchOpen,     setSearchOpen]     = useState(false);
  const [selectedRecipe, setRecipe]         = useState(null);
  const [recoRecipes,    setRecoRecipes]    = useState([]);
  const [filtered,       setFiltered]       = useState([]);
  const [searchPool,     setSearchPool]     = useState([]);

  useEffect(() => {
    if (searchParam) {
      setQuery(searchParam);
      setSearchOpen(true);
    }
  }, [searchParam]);

  useEffect(() => {
    Promise.all([
      fetch(EC2_ENDPOINTS.trending).then(r => r.json()),
      fetch(EC2_ENDPOINTS.categories).then(r => r.json()),
    ]).then(([trend, cats]) => {
      const trendArr = Array.isArray(trend) ? trend : [];
      const catsArr  = Array.isArray(cats)  ? cats  : [];
      setTrending(trendArr);
      setFiltered(trendArr);
      setCategories(["전체", ...catsArr.map(c => c.id)]);
      setRecoRecipes(trendArr.slice(0, 5));
    }).catch(() => {}).finally(() => setLoading(false));

    fetch(EC2_ENDPOINTS.recipes)
      .then(r => r.json())
      .then(data => setAllRecipes(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      const fridgeList = getIngredients().map(n => n.toLowerCase());
      if (!fridgeList.length) { setRecoRecipes(trending.slice(0, 5)); return; }
      if (!allRecipes.length) return;

      function matches(ingName) {
        const il = ingName.toLowerCase();
        return fridgeList.some(n => il.includes(n) || n.includes(il));
      }

      const scored = allRecipes
        .map((r) => {
          const total    = (r.ingredients || []).length;
          const owned    = (r.ingredients || []).filter(ing => matches(ing));
          const matchPct = total > 0 ? Math.round((owned.length / total) * 100) : 0;
          const ownedLower = new Set(owned.map(i => i.toLowerCase()));
          const missingKey = (r.keyIngredients || []).filter(ing => !ownedLower.has(ing.toLowerCase()));
          return { ...r, matchCount: owned.length, matchPct, ownedIngredients: owned, missingKey };
        })
        .filter((r) => r.matchCount > 0)
        .sort((a, b) => b.matchPct - a.matchPct)
        .slice(0, 6);
      setRecoRecipes(scored.length ? scored : trending.slice(0, 5));
    }, [allRecipes, trending])
  );

  function pickRandom(pool, n = 20) {
    if (pool.length <= n) return [...pool];
    return [...pool].sort(() => Math.random() - 0.5).slice(0, n);
  }

  useEffect(() => {
    if (!query && activeCategory === "전체" && !showFavOnly) return;
    setSearchLoading(true);
    const params = new URLSearchParams();
    if (activeCategory !== "전체") params.set("category", activeCategory);
    if (query.trim()) params.set("search", query.trim());
    fetch(`${EC2_ENDPOINTS.recipes}?${params}`)
      .then(r => r.json())
      .then(data => {
        const arr    = Array.isArray(data) ? data : [];
        const result = showFavOnly ? arr.filter(r => favorites.has(r.id)) : arr;
        setSearchPool(result);
        setFiltered(pickRandom(result));
      })
      .catch(() => {})
      .finally(() => setSearchLoading(false));
  }, [query, activeCategory, showFavOnly]);

  async function shuffle() {
    // 검색 중이면 같은 결과풀에서 새로운 20개 뽑기
    if (searchPool.length > 0 && (query || activeCategory !== "전체" || showFavOnly)) {
      setFiltered(pickRandom(searchPool));
      return;
    }
    setQuery("");
    setCategory("전체");
    setShowFavOnly(false);
    setSearchLoading(true);
    try {
      const data = await fetch(EC2_ENDPOINTS.recipes).then(r => r.json());
      const pool = Array.isArray(data) && data.length > 0 ? data
                 : allRecipes.length > 0 ? allRecipes
                 : trending;
      if (Array.isArray(data) && data.length > 0) setAllRecipes(data);
      setSearchPool(pool);
      if (pool.length > 0) setFiltered(pickRandom(pool));
    } catch {
      const pool = allRecipes.length > 0 ? allRecipes : trending;
      setSearchPool(pool);
      if (pool.length > 0) setFiltered(pickRandom(pool));
    } finally {
      setSearchLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await shuffle();
    setRefreshing(false);
  }

  function toggleFav(id) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <View style={[st.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <View style={st.container}>
      <View style={st.header}>
        <View style={st.headerRow}>
          <Text style={st.pageTitle}>레시피 탐색</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={st.resultCount}>
              {searchLoading ? "..." : searchPool.length > filtered.length
                ? `${filtered.length} / ${searchPool.length}개`
                : `${filtered.length}개`}
            </Text>
            <TouchableOpacity style={st.headerBtn} onPress={shuffle}>
              <Svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke={C.textSub} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Line x1={1} y1={4} x2={1} y2={10} /><Line x1={1} y1={10} x2={7} y2={10} />
                <Line x1={23} y1={20} x2={23} y2={14} /><Line x1={23} y1={14} x2={17} y2={14} />
                <Line x1={20.49} y1={9} x2={21.99} y2={6} /><Line x1={14} y1={3.5} x2={21.99} y2={6} />
                <Line x1={21.99} y1={6} x2={21.99} y2={14} /><Line x1={3.51} y1={15} x2={2.01} y2={18} />
                <Line x1={10} y1={20.5} x2={2.01} y2={18} /><Line x1={2.01} y1={18} x2={2.01} y2={10} />
              </Svg>
            </TouchableOpacity>
            <TouchableOpacity style={st.headerBtn} onPress={() => setSearchOpen(!searchOpen)}>
              <Svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke={C.textSub} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Circle cx={11} cy={11} r={8} /><Line x1={21} y1={21} x2={16.65} y2={16.65} />
              </Svg>
            </TouchableOpacity>
          </View>
        </View>
        {searchOpen && (
          <View style={st.searchBar}>
            <Svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke={C.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx={11} cy={11} r={8} /><Line x1={21} y1={21} x2={16.65} y2={16.65} />
            </Svg>
            <TextInput
              style={st.searchInput} value={query} onChangeText={setQuery}
              placeholder="요리명 또는 재료로 검색" placeholderTextColor={C.textMuted} autoFocus
            />
          </View>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6B35"]} tintColor="#FF6B35" />}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 2 }}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[st.catChip, activeCategory === cat && !showFavOnly && st.catChipActive]}
              onPress={() => { setCategory(cat); setShowFavOnly(false); }}
            >
              <Text style={[st.catChipText, activeCategory === cat && !showFavOnly && st.catChipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[st.catChip, showFavOnly && st.catChipFavActive]}
            onPress={() => { setShowFavOnly(!showFavOnly); if (!showFavOnly) setCategory("전체"); }}
          >
            <Text style={[st.catChipText, showFavOnly && st.catChipTextFavActive]}>♡ 즐겨찾기</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Text style={st.sectionTitleMain}>내 재료로 바로 만드는 요리🍳</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 10, paddingBottom: 6 }}>
          {recoRecipes.map((r, i) => (
            <TouchableOpacity key={r.id} style={[st.recoCard, { marginLeft: i === 0 ? 20 : 0, marginRight: i === recoRecipes.length - 1 ? 20 : 0 }]} onPress={() => setRecipe(r)}>
              {/* 비주얼 영역 */}
              <View style={st.recoVisual}>
                {r.imageUrl
                  ? <Image source={{ uri: r.imageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                  : <Text style={{ fontSize: 36 }}>🍽️</Text>}

                {/* 북마크 버튼 — 우측 상단 */}
                <TouchableOpacity style={st.recoBookmarkBtn} onPress={() => toggleFav(r.id)}>
                  <Svg width={15} height={15} viewBox="0 0 24 24">
                    <Path
                      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                      fill={favorites.has(r.id) ? "#E53E3E" : "none"}
                      stroke={favorites.has(r.id) ? "#E53E3E" : "#BBBBBB"}
                      strokeWidth={2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </TouchableOpacity>

                {/* 재료 일치 배지 — 좌측 하단 */}
                {r.matchPct > 0 && (
                  <View style={st.recoMatchBadge}>
                    <Text style={st.recoMatchBadgeText} numberOfLines={1}>
                      {r.matchPct}% 보유 🌱
                    </Text>
                  </View>
                )}
              </View>

              {/* 정보 영역 */}
              <View style={st.recoInfo}>
                <Text style={st.recoName} numberOfLines={2}>{r.name}</Text>
                <View style={st.recoMetaRow}>
                  <Text style={st.recoMetaText}>⏱ {r.time}분</Text>
                  <Text style={st.recoMetaSep}>|</Text>
                  <Text style={[st.recoMetaText, { color: DIFF_COLOR[r.difficulty] || "#888" }]}>{r.difficulty}</Text>
                  <Text style={st.recoMetaSep}>|</Text>
                  <Svg width={10} height={10} viewBox="0 0 24 24">
                    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#f59e0b" />
                  </Svg>
                  <Text style={st.recoMetaRating}>{Number(r.rating).toFixed(1)}</Text>
                </View>
                {r.missingKey?.length > 0 && (
                  <Text style={st.recoHint} numberOfLines={1}>
                    {r.missingKey.length === 1
                      ? `${r.missingKey[0]}만 있으면 완성!`
                      : `${r.missingKey.slice(0, 2).join(", ")} 추가하면 완성!`}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Text style={st.sectionTitleMain}>지금 SNS에서 유행하는 레시피 🔥</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 10, paddingBottom: 18 }}>
          {trending.map((recipe, i) => (
            <TouchableOpacity key={recipe.id} style={[st.trendCard, { marginLeft: i === 0 ? 20 : 0, marginRight: i === trending.length - 1 ? 20 : 0 }]} onPress={() => setRecipe(recipe)}>
              <View style={st.trendVisual}>
                <View style={[st.rankBadge, i < 3 && st.rankBadgeTop]}>
                  <Text style={st.rankText}>{i + 1}위</Text>
                </View>
                {recipe.imageUrl
                  ? <Image source={{ uri: recipe.imageUrl }} style={{ width: 70, height: 70, borderRadius: 8 }} resizeMode="cover" />
                  : <Text style={{ fontSize: 40 }}>🍽️</Text>}
                {i < 3 && <Text style={st.flame}>🔥</Text>}
              </View>
              <View style={st.trendInfo}>
                <Text style={st.trendName} numberOfLines={2}>{recipe.name}</Text>
                <View style={st.trendCountBadge}>
                  <Text style={st.trendCountText}>❤️ <Text style={{ fontWeight: "800", color: C.primary }}>{recipe.likes}</Text>명 좋아요</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          {searchLoading ? (
            <ActivityIndicator size="small" color="#FF6B35" style={{ marginTop: 20 }} />
          ) : filtered.length === 0 ? (
            <View style={st.emptyState}>
              <Text style={{ fontSize: 52 }}>{showFavOnly ? "🤍" : "🔍"}</Text>
              <Text style={st.emptyTitle}>{showFavOnly ? "즐겨찾기한 레시피가 없어요" : "검색 결과가 없어요"}</Text>
              <Text style={st.emptyDesc}>{showFavOnly ? "레시피의 ♡ 버튼을 눌러 추가해 보세요!" : "다른 키워드로 검색해 보세요"}</Text>
            </View>
          ) : (
            filtered.map((recipe) => (
              <TouchableOpacity key={recipe.id} style={st.recipeCard} onPress={() => setRecipe(recipe)}>
                <View style={st.cardMain}>
                  <View style={st.cardThumb}>
                    {recipe.imageUrl
                      ? <Image source={{ uri: recipe.imageUrl }} style={{ width: "100%", height: "100%", borderRadius: 10 }} resizeMode="cover" />
                      : <Text style={{ fontSize: 28 }}>🍽️</Text>}
                  </View>
                  <View style={st.cardBody}>
                    <View style={st.cardNameRow}>
                      <Text style={st.cardName}>{recipe.name}</Text>
                      <View style={st.cardRating}>
                        <Svg width={13} height={13} viewBox="0 0 24 24">
                          <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#f59e0b" />
                        </Svg>
                        <Text style={st.cardRatingText}>{Number(recipe.rating).toFixed(1)}</Text>
                      </View>
                    </View>
                    <Text style={st.cardIngredients} numberOfLines={1}>
                      {Array.isArray(recipe.ingredients) ? recipe.ingredients.join(", ") : ""}
                    </Text>
                    <View style={st.badgeRow}>
                      <View style={st.badgeTime}><Text style={st.badgeTimeText}>⏱ {recipe.time}분</Text></View>
                      <View style={[st.badgeDiff, { backgroundColor: (DIFF_COLOR[recipe.difficulty] || "#888") + "20" }]}>
                        <Text style={[st.badgeDiffText, { color: DIFF_COLOR[recipe.difficulty] || "#888" }]}>{recipe.difficulty}</Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={st.heartWrap}>
                  <TouchableOpacity
                    style={[st.heartBtn, favorites.has(recipe.id) && st.heartBtnActive]}
                    onPress={() => toggleFav(recipe.id)}
                  >
                    <Svg width={20} height={20} viewBox="0 0 24 24">
                      <Path
                        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                        fill={favorites.has(recipe.id) ? "#E53E3E" : "none"}
                        stroke={favorites.has(recipe.id) ? "#E53E3E" : "#D0D0D0"}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  </TouchableOpacity>
                  <Text style={st.heartCount}>{recipe.likes || 0}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <RecipeModal recipe={selectedRecipe} onClose={() => setRecipe(null)} />
    </View>
  );
}
