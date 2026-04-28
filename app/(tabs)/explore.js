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
import Svg, { Circle, Line, Path } from "react-native-svg";

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

const DIFF_COLOR = { 쉬움: "#16A34A", 보통: "#EA580C", 어려움: "#DC2626" };

const RECIPES = [
  { id:1, emoji:"🍙", name:"참치마요 주먹밥", category:"간편식", ingredients:["참치캔","마요네즈","밥","김","소금","참기름"], keyIngredients:["참치캔","밥"], time:10, difficulty:"쉬움", instructions:["참치캔의 기름을 체에 밭쳐 충분히 빼요.","그릇에 참치, 마요네즈, 소금을 넣고 잘 섞어요.","손에 물을 적당히 묻히고 밥을 손바닥에 펴요.","중앙에 참치마요를 넣고 꼭꼭 쥐어 주먹밥 모양을 만들어요.","김으로 감싸고 참기름을 한 방울 떨어뜨리면 완성!"], youtube_title:"참치마요 주먹밥 만들기 | 초간단 10분 레시피" },
  { id:2, emoji:"🍜", name:"편의점 라면 나베", category:"편의점 꿀조합", ingredients:["컵라면","두부","계란","대파","어묵"], keyIngredients:["컵라면","두부"], time:15, difficulty:"쉬움", instructions:["냄비에 물 500ml를 넣고 센 불로 끓여요.","어묵과 두부를 한 입 크기로 잘라 넣어요.","컵라면 면과 스프를 냄비에 넣고 3분 끓여요.","대파를 어슷 썰어 넣고 계란을 깨뜨려 반숙으로 익혀요.","뚝배기에 담으면 더욱 분위기 있는 나베 완성!"], youtube_title:"편의점 라면 나베 | 간단하지만 진짜 맛있는 혼밥 레시피" },
  { id:3, emoji:"🍳", name:"냉장고 털이 볶음밥", category:"한식", ingredients:["찬밥","계란","냉동 채소","간장","참기름","마늘"], keyIngredients:["찬밥","계란"], time:15, difficulty:"쉬움", instructions:["팬을 센 불로 달구고 기름을 두른 뒤 다진 마늘을 볶아요.","냉동 채소를 넣고 수분이 날아갈 때까지 2분 볶아요.","찬밥을 넣고 주걱으로 꾹꾹 눌러 가며 덩어리를 풀어요.","팬 가장자리에 간장을 두르고 빠르게 섞어요.","한쪽으로 볶음밥을 밀고 계란을 스크램블해 섞어요.","불을 끄고 참기름을 한 방울 두르면 완성!"], youtube_title:"냉장고 털이 볶음밥 | 자투리 재료로 만드는 황금 볶음밥" },
  { id:4, emoji:"🥚", name:"고추참치 계란말이", category:"한식", ingredients:["고추참치캔","계란","쪽파","소금","식용유"], keyIngredients:["고추참치캔","계란"], time:15, difficulty:"보통", instructions:["계란 3개를 그릇에 깨고 소금 한 꼬집을 넣어 잘 풀어요.","고추참치캔 기름을 빼고 쪽파를 잘게 썰어 계란물에 섞어요.","팬에 기름을 얇게 두르고 약불로 달구어요.","계란물의 절반을 붓고 표면이 반 정도 익으면 앞쪽으로 말아요.","나머지 계란물을 부어 같은 방법으로 말아서 통통한 롤을 만들어요.","한 김 식힌 후 먹기 좋게 썰면 완성!"], youtube_title:"고추참치 계란말이 | 초보도 쉬운 밥도둑 반찬" },
  { id:5, emoji:"🍱", name:"떡볶이 치즈 덮밥", category:"편의점 꿀조합", ingredients:["냉동 떡볶이","밥","슬라이스 치즈","마요네즈"], keyIngredients:["냉동 떡볶이","밥"], time:10, difficulty:"쉬움", instructions:["냉동 떡볶이를 전자레인지 4분 또는 팬에 물 조금 넣어 데워요.","따뜻한 밥을 그릇에 담고 떡볶이를 듬뿍 올려요.","슬라이스 치즈를 올리고 전자레인지에 30초 돌려 치즈를 녹여요.","마요네즈를 지그재그로 뿌리면 완성!"], youtube_title:"떡볶이 치즈 덮밥 | 5분 완성 초간편 한 끼" },
  { id:6, emoji:"🥩", name:"스팸 마늘종 볶음", category:"한식", ingredients:["스팸","마늘종","고추장","간장","올리고당","참기름"], keyIngredients:["스팸","마늘종"], time:20, difficulty:"보통", instructions:["스팸을 한 입 크기 직육면체로 잘라요.","마늘종을 3~4cm 길이로 잘라요.","팬에 기름을 두르지 않고 스팸을 노릇하게 구워 꺼내요.","같은 팬에 마늘종을 볶다가 스팸을 다시 넣어요.","고추장, 간장, 올리고당(1:1:1)을 섞어 소스를 만들어 넣고 볶아요.","불을 끄고 참기름 한 방울로 마무리하면 완성!"], youtube_title:"스팸 마늘종 볶음 | 밥 세 공기 각오하세요" },
  { id:7, emoji:"🥬", name:"두부 간장 조림", category:"다이어트", ingredients:["두부","간장","설탕","참기름","대파","고춧가루"], keyIngredients:["두부","간장"], time:20, difficulty:"쉬움", instructions:["두부를 1.5cm 두께로 썰고 키친타월로 물기를 제거해요.","팬에 기름을 두르고 중불에서 두부를 앞뒤로 노릇하게 구워요.","간장 3 : 설탕 1 : 물 3 비율로 양념을 만들어요.","구운 두부에 양념을 붓고 조려요.","국물이 반으로 줄면 대파와 고춧가루를 뿌려요.","참기름 한 방울로 마무리하면 완성!"], youtube_title:"두부 간장 조림 | 건강하고 맛있는 기본 반찬" },
  { id:8, emoji:"🥞", name:"김치 치즈 부침개", category:"한식", ingredients:["묵은 김치","슬라이스 치즈","부침가루","계란","식용유"], keyIngredients:["묵은 김치","부침가루"], time:20, difficulty:"보통", instructions:["묵은 김치를 잘게 다지고 국물은 꼭 짜요.","계란 1개, 부침가루 4큰술, 물 3큰술을 넣고 반죽해요.","반죽에 다진 김치를 넣어 섞어요.","팬에 기름을 두르고 반죽을 동그랗게 펴서 앞면을 구워요.","뒤집은 후 슬라이스 치즈를 올리고 뚜껑을 덮어 치즈를 녹여요.","노릇하게 익으면 접시에 담아 완성!"], youtube_title:"김치 치즈 부침개 | 바삭하고 쫄깃한 황금 레시피" },
  { id:9, emoji:"🥔", name:"감자 베이컨 볶음", category:"양식", ingredients:["감자","베이컨","양파","버터","소금","후추"], keyIngredients:["감자","베이컨"], time:25, difficulty:"보통", instructions:["감자 껍질을 벗기고 얇게 슬라이스하거나 채 썰어요.","양파는 얇게 채 썰고, 베이컨은 2cm 폭으로 잘라요.","팬에 버터를 녹이고 감자를 중불에서 볶아요.","감자가 반 정도 익으면 베이컨과 양파를 넣어요.","소금, 후추로 간하고 감자가 완전히 익을 때까지 볶아요.","기호에 따라 파슬리를 뿌리면 서양식 감자 볶음 완성!"], youtube_title:"감자 베이컨 볶음 | 집에서 만드는 브런치 레시피" },
  { id:10, emoji:"🍵", name:"삼각김밥 된장국", category:"간편식", ingredients:["참치 삼각김밥","된장","두부","대파","멸치다시마"], keyIngredients:["참치 삼각김밥","된장"], time:10, difficulty:"쉬움", instructions:["냄비에 물 400ml와 멸치다시마를 넣고 5분 끓여 육수를 내요.","다시마와 멸치를 건져내고 두부를 깍둑 썰어 넣어요.","된장 1.5큰술을 체에 풀어 넣고 중불로 끓여요.","대파를 어슷 썰어 넣고 한 번 더 끓이면 된장국 완성.","삼각김밥을 그릇에 담고 된장국과 함께 먹으면 든든한 한 끼!"], youtube_title:"삼각김밥 된장국 | 5분 만에 만드는 따뜻한 한 끼" },
];

const TREND_DATA = [
  { recipeId:3, count:"3,241", tags:["#오늘뭐먹지","#간편한식"] },
  { recipeId:1, count:"2,847", tags:["#SNS화제","#냉털볶"] },
  { recipeId:8, count:"1,923", tags:["#집밥","#김치요리"] },
  { recipeId:5, count:"1,520", tags:["#편의점요리","#5분완성"] },
  { recipeId:7, count:"1,108", tags:["#다이어트","#헬시푸드"] },
  { recipeId:2, count:"987",   tags:["#야식","#간식"] },
];

const CATEGORIES_LIST = ["전체", ...new Set(RECIPES.map((r) => r.category))];

/* ── 레시피 상세 모달 ── */
function RecipeModal({ recipe, onClose }) {
  if (!recipe) return null;
  const diffColor = DIFF_COLOR[recipe.difficulty] || "#888";

  return (
    <Modal visible={!!recipe} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={st.modalOverlay} onPress={onClose}>
        <View style={st.modalSheet}>
          {/* 핸들 + 닫기 */}
          <View style={st.modalTopBar}>
            <View style={st.modalHandle} />
            <TouchableOpacity style={st.modalCloseBtn} onPress={onClose}>
              <Text style={{ fontSize: 14, color: C.textSub }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* 헤더 */}
            <View style={st.recipeHeader}>
              <View style={st.recipeEmoji}><Text style={{ fontSize: 40 }}>{recipe.emoji}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={st.recipeName}>{recipe.name}</Text>
                <View style={st.badgeRow}>
                  <View style={st.badgeTime}><Text style={st.badgeTimeText}>⏱ {recipe.time}분</Text></View>
                  <View style={[st.badgeDiff, { backgroundColor: diffColor + "20" }]}>
                    <Text style={[st.badgeDiffText, { color: diffColor }]}>{recipe.difficulty}</Text>
                  </View>
                </View>
                <Text style={st.recipeIngr} numberOfLines={2}>{recipe.ingredients.join(" · ")}</Text>
              </View>
            </View>

            <View style={st.divider} />

            {/* 조리 과정 */}
            <View style={{ paddingVertical: 18 }}>
              <Text style={st.sectionTitle}>조리 과정</Text>
              {recipe.instructions.map((step, i) => (
                <View key={i} style={st.stepItem}>
                  <View style={st.stepNumber}><Text style={st.stepNumberText}>{i + 1}</Text></View>
                  <Text style={st.stepText}>{step}</Text>
                </View>
              ))}
            </View>

            <View style={st.divider} />

            {/* 유튜브 */}
            <View style={{ paddingVertical: 18 }}>
              <Text style={st.sectionTitle}>유튜브 참고</Text>
              <View style={st.ytThumb}>
                <View style={st.ytPlayBtn}><Text style={{ fontSize: 20 }}>▶</Text></View>
                <Text style={st.ytLabel}>YouTube</Text>
              </View>
              <Text style={st.ytTitle}>{recipe.youtube_title}</Text>
            </View>
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

/* ── 메인 컴포넌트 ── */
export default function ExploreScreen() {
  const [query, setQuery]               = useState("");
  const [activeCategory, setCategory]   = useState("전체");
  const [favorites, setFavorites]       = useState(new Set());
  const [showFavOnly, setShowFavOnly]   = useState(false);
  const [searchOpen, setSearchOpen]     = useState(false);
  const [selectedRecipe, setRecipe]     = useState(null);

  function toggleFav(id) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function getFiltered() {
    const q = query.toLowerCase();
    return RECIPES.filter((r) => {
      const matchSearch = !q || r.name.toLowerCase().includes(q) || r.ingredients.some((i) => i.toLowerCase().includes(q));
      const matchFav = !showFavOnly || favorites.has(r.id);
      const matchCat = activeCategory === "전체" || r.category === activeCategory;
      return matchSearch && matchFav && matchCat;
    });
  }

  const filtered = getFiltered();

  return (
    <View style={st.container}>
      {/* 헤더 */}
      <View style={st.header}>
        <View style={st.headerRow}>
          <Text style={st.pageTitle}>레시피 탐색</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={st.resultCount}>{filtered.length}개</Text>
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
              style={st.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="요리명 또는 재료로 검색"
              placeholderTextColor={C.textMuted}
              autoFocus
            />
          </View>
        )}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* 카테고리 칩 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 2 }}>
          {CATEGORIES_LIST.map((cat) => (
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

        {/* 내 재료 기반 추천 */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 0 }}>
          <Text style={st.sectionTitleMain}>내 재료로 바로 만드는 요리🍳</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 10, paddingBottom: 6 }}>
          {RECIPES.slice(0, 5).map((r, i) => (
            <TouchableOpacity key={r.id} style={[st.recoCard, { marginLeft: i === 0 ? 20 : 0, marginRight: i === 4 ? 20 : 0 }]} onPress={() => setRecipe(r)}>
              <View style={st.recoVisual}><Text style={{ fontSize: 36 }}>{r.emoji}</Text></View>
              <View style={st.recoInfo}>
                <Text style={st.recoName} numberOfLines={2}>{r.name}</Text>
                <Text style={st.recoMeta}>⏱️ {r.time}분</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* SNS 트렌딩 */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 0 }}>
          <Text style={st.sectionTitleMain}>지금 SNS에서 유행하는 레시피 🔥</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 10, paddingBottom: 18 }}>
          {TREND_DATA.map((trend, i) => {
            const recipe = RECIPES.find((r) => r.id === trend.recipeId);
            if (!recipe) return null;
            return (
              <TouchableOpacity key={trend.recipeId} style={[st.trendCard, { marginLeft: i === 0 ? 20 : 0, marginRight: i === TREND_DATA.length - 1 ? 20 : 0 }]} onPress={() => setRecipe(recipe)}>
                <View style={st.trendVisual}>
                  <View style={[st.rankBadge, i < 3 && st.rankBadgeTop]}>
                    <Text style={st.rankText}>{i + 1}위</Text>
                  </View>
                  <Text style={{ fontSize: 40 }}>{recipe.emoji}</Text>
                  {i < 3 && <Text style={st.flame}>🔥</Text>}
                </View>
                <View style={st.trendInfo}>
                  <Text style={st.trendName} numberOfLines={2}>{recipe.name}</Text>
                  <View style={st.trendCountBadge}>
                    <Text style={st.trendCountText}>🍳 현재 <Text style={{ fontWeight: "800", color: C.primary }}>{trend.count}명</Text> 요리 중</Text>
                  </View>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 3 }}>
                    {trend.tags.map((tag) => (
                      <View key={tag} style={st.trendTag}><Text style={st.trendTagText}>{tag}</Text></View>
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 레시피 목록 */}
        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          {filtered.length === 0 ? (
            <View style={st.emptyState}>
              <Text style={{ fontSize: 52 }}>{showFavOnly ? "🤍" : "🔍"}</Text>
              <Text style={st.emptyTitle}>{showFavOnly ? "즐겨찾기한 레시피가 없어요" : "검색 결과가 없어요"}</Text>
              <Text style={st.emptyDesc}>{showFavOnly ? "레시피의 ♡ 버튼을 눌러 추가해 보세요!" : "다른 키워드로 검색해 보세요"}</Text>
            </View>
          ) : (
            filtered.map((recipe) => (
              <TouchableOpacity key={recipe.id} style={st.recipeCard} onPress={() => setRecipe(recipe)}>
                <View style={st.cardMain}>
                  <View style={st.cardThumb}><Text style={{ fontSize: 28 }}>{recipe.emoji}</Text></View>
                  <View style={st.cardBody}>
                    <Text style={st.cardName}>{recipe.name}</Text>
                    <Text style={st.cardIngredients} numberOfLines={1}>{recipe.ingredients.join(", ")}</Text>
                    <View style={st.badgeRow}>
                      <View style={st.badgeTime}><Text style={st.badgeTimeText}>⏱ {recipe.time}분</Text></View>
                      <View style={[st.badgeDiff, { backgroundColor: (DIFF_COLOR[recipe.difficulty] || "#888") + "20" }]}>
                        <Text style={[st.badgeDiffText, { color: DIFF_COLOR[recipe.difficulty] || "#888" }]}>{recipe.difficulty}</Text>
                      </View>
                    </View>
                  </View>
                </View>
                <TouchableOpacity style={[st.heartBtn, favorites.has(recipe.id) && st.heartBtnActive]} onPress={() => toggleFav(recipe.id)}>
                  <Text style={{ fontSize: 18 }}>{favorites.has(recipe.id) ? "❤️" : "🤍"}</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <RecipeModal recipe={selectedRecipe} onClose={() => setRecipe(null)} />
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pageTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.3, color: C.text },
  resultCount: { fontSize: 12, color: C.textMuted },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    height: 48, marginTop: 10, paddingHorizontal: 14,
    backgroundColor: C.surface, borderRadius: 12, borderWidth: 1.5, borderColor: C.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text },
  catChip: {
    height: 34, paddingHorizontal: 16, borderRadius: 999,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface,
    justifyContent: "center",
  },
  catChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  catChipFavActive: { backgroundColor: "#FFF0F0", borderColor: "#FFAAAA" },
  catChipText: { fontSize: 13, fontWeight: "600", color: C.textSub },
  catChipTextActive: { color: "#fff" },
  catChipTextFavActive: { color: "#DC2626" },
  sectionTitleMain: { fontSize: 15, fontWeight: "700", color: C.text, letterSpacing: -0.2 },
  /* Reco card */
  recoCard: {
    width: 138, backgroundColor: C.surface, borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(255,107,53,0.35)", overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2,
  },
  recoVisual: {
    height: 88, backgroundColor: "#FFF7ED",
    alignItems: "center", justifyContent: "center",
  },
  recoInfo: { padding: 10, gap: 3 },
  recoName: { fontSize: 12, fontWeight: "700", color: C.text, lineHeight: 16 },
  recoMeta: { fontSize: 10, color: C.textMuted },
  /* Trend card */
  trendCard: {
    width: 148, backgroundColor: C.surface, borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(255,107,53,0.2)", overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2,
  },
  trendVisual: {
    height: 92, backgroundColor: "#FFF0E8",
    alignItems: "center", justifyContent: "center",
    position: "relative",
  },
  rankBadge: {
    position: "absolute", top: 7, left: 8, height: 20, paddingHorizontal: 7,
    borderRadius: 999, backgroundColor: "rgba(0,0,0,0.18)", justifyContent: "center",
  },
  rankBadgeTop: { backgroundColor: "#FF6B35" },
  rankText: { fontSize: 10, fontWeight: "800", color: "#fff" },
  flame: { position: "absolute", top: 5, right: 8, fontSize: 16 },
  trendInfo: { padding: 10, gap: 5 },
  trendName: { fontSize: 13, fontWeight: "700", color: C.text, lineHeight: 17 },
  trendCountBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    backgroundColor: C.primaryLt, borderWidth: 1, borderColor: "rgba(255,107,53,0.25)",
    alignSelf: "flex-start",
  },
  trendCountText: { fontSize: 10, color: C.primaryDark },
  trendTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  trendTagText: { fontSize: 10, fontWeight: "600", color: C.textSub },
  /* Recipe card */
  recipeCard: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10,
    backgroundColor: C.surface, borderRadius: 16, padding: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10,
    elevation: 2, borderWidth: 1, borderColor: "rgba(0,0,0,0.04)",
  },
  cardMain: { flexDirection: "row", gap: 13, flex: 1 },
  cardThumb: {
    width: 56, height: 56, borderRadius: 12, backgroundColor: C.bg,
    alignItems: "center", justifyContent: "center",
  },
  cardBody: { flex: 1, gap: 3 },
  cardName: { fontSize: 15, fontWeight: "700", color: C.text, letterSpacing: -0.2 },
  cardIngredients: { fontSize: 12, color: C.textMuted },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 5, alignItems: "center" },
  badgeTime: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: "#EEF3FF" },
  badgeTimeText: { fontSize: 11, fontWeight: "700", color: "#3B67E0" },
  badgeDiff: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeDiffText: { fontSize: 11, fontWeight: "700" },
  heartBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  heartBtnActive: { backgroundColor: "#FEE2E2" },
  emptyState: { alignItems: "center", paddingVertical: 44, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: C.text },
  emptyDesc: { fontSize: 13, color: C.textMuted, textAlign: "center" },
  /* 레시피 모달 */
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: "92%",
  },
  modalTopBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingTop: 12, paddingBottom: 8, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  modalHandle: { width: 36, height: 4, borderRadius: 999, backgroundColor: C.border },
  modalCloseBtn: {
    position: "absolute", right: 14,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.bg, alignItems: "center", justifyContent: "center",
  },
  recipeHeader: { flexDirection: "row", gap: 16, paddingBottom: 18 },
  recipeEmoji: {
    width: 72, height: 72, borderRadius: 16, backgroundColor: C.bg,
    alignItems: "center", justifyContent: "center",
  },
  recipeName: { fontSize: 18, fontWeight: "800", color: C.text, letterSpacing: -0.4, marginBottom: 6 },
  recipeIngr: { fontSize: 12, color: C.textMuted, lineHeight: 18, marginTop: 4 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 2 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: C.textMuted, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 14 },
  stepItem: { flexDirection: "row", gap: 12, marginBottom: 10 },
  stepNumber: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: C.primary,
    alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
  },
  stepNumberText: { fontSize: 11, fontWeight: "800", color: "#fff" },
  stepText: { flex: 1, fontSize: 14, lineHeight: 22, color: C.text },
  ytThumb: {
    width: "100%", aspectRatio: 16/9,
    backgroundColor: "#1a1a2e", borderRadius: 12,
    alignItems: "center", justifyContent: "center", marginBottom: 10, gap: 8,
  },
  ytPlayBtn: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,0,0,0.9)",
    alignItems: "center", justifyContent: "center",
  },
  ytLabel: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.5)", letterSpacing: 1 },
  ytTitle: { fontSize: 13, fontWeight: "600", color: C.text, lineHeight: 20 },
});
