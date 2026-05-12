import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { C } from "../../styles/colors";
import st, { DIFF_COLOR } from "../../styles/tabs/explore";
import { getIngredients } from "../store";

const RECIPES = [
  { id:1,  emoji:"🍙", name:"참치마요 주먹밥",    category:"간편식",       rating:4.2, likes:2418,
    ingredients:["참치캔","마요네즈","밥","김","소금","참기름"], keyIngredients:["참치캔","밥"], time:10, difficulty:"쉬움",
    instructions:["참치캔의 기름을 체에 밭쳐 충분히 빼요.","그릇에 참치, 마요네즈, 소금을 넣고 잘 섞어요.","손에 물을 적당히 묻히고 밥을 손바닥에 펴요.","중앙에 참치마요를 넣고 꼭꼭 쥐어 주먹밥 모양을 만들어요.","김으로 감싸고 참기름을 한 방울 떨어뜨리면 완성!"],
    youtube_title:"참치마요 주먹밥 만들기 | 초간단 10분 레시피" },
  { id:2,  emoji:"🍜", name:"편의점 라면 나베",    category:"편의점 꿀조합", rating:3.9, likes:1092,
    ingredients:["컵라면","두부","계란","대파","어묵"], keyIngredients:["컵라면","두부"], time:15, difficulty:"쉬움",
    instructions:["냄비에 물 500ml를 넣고 센 불로 끓여요.","어묵과 두부를 한 입 크기로 잘라 넣어요.","컵라면 면과 스프를 냄비에 넣고 3분 끓여요.","대파를 어슷 썰어 넣고 계란을 깨뜨려 반숙으로 익혀요.","뚝배기에 담으면 더욱 분위기 있는 나베 완성!"],
    youtube_title:"편의점 라면 나베 | 간단하지만 진짜 맛있는 혼밥 레시피" },
  { id:3,  emoji:"🍳", name:"냉장고 털이 볶음밥",  category:"한식",         rating:4.8, likes:5731,
    ingredients:["찬밥","계란","냉동 채소","간장","참기름","마늘"], keyIngredients:["찬밥","계란"], time:15, difficulty:"쉬움",
    instructions:["팬을 센 불로 달구고 기름을 두른 뒤 다진 마늘을 볶아요.","냉동 채소를 넣고 수분이 날아갈 때까지 2분 볶아요.","찬밥을 넣고 주걱으로 꾹꾹 눌러 가며 덩어리를 풀어요.","팬 가장자리에 간장을 두르고 빠르게 섞어요.","한쪽으로 볶음밥을 밀고 계란을 스크램블해 섞어요.","불을 끄고 참기름을 한 방울 두르면 완성!"],
    youtube_title:"냉장고 털이 볶음밥 | 자투리 재료로 만드는 황금 볶음밥" },
  { id:4,  emoji:"🥚", name:"고추참치 계란말이",   category:"한식",         rating:3.7, likes:847,
    ingredients:["고추참치캔","계란","쪽파","소금","식용유"], keyIngredients:["고추참치캔","계란"], time:15, difficulty:"보통",
    instructions:["계란 3개를 그릇에 깨고 소금 한 꼬집을 넣어 잘 풀어요.","고추참치캔 기름을 빼고 쪽파를 잘게 썰어 계란물에 섞어요.","팬에 기름을 얇게 두르고 약불로 달구어요.","계란물의 절반을 붓고 표면이 반 정도 익으면 앞쪽으로 말아요.","나머지 계란물을 부어 같은 방법으로 말아서 통통한 롤을 만들어요.","한 김 식힌 후 먹기 좋게 썰면 완성!"],
    youtube_title:"고추참치 계란말이 | 초보도 쉬운 밥도둑 반찬" },
  { id:5,  emoji:"🍱", name:"떡볶이 치즈 덮밥",   category:"편의점 꿀조합", rating:4.5, likes:3256,
    ingredients:["냉동 떡볶이","밥","슬라이스 치즈","마요네즈"], keyIngredients:["냉동 떡볶이","밥"], time:10, difficulty:"쉬움",
    instructions:["냉동 떡볶이를 전자레인지 4분 또는 팬에 물 조금 넣어 데워요.","따뜻한 밥을 그릇에 담고 떡볶이를 듬뿍 올려요.","슬라이스 치즈를 올리고 전자레인지에 30초 돌려 치즈를 녹여요.","마요네즈를 지그재그로 뿌리면 완성!"],
    youtube_title:"떡볶이 치즈 덮밥 | 5분 완성 초간편 한 끼" },
  { id:6,  emoji:"🥩", name:"스팸 마늘종 볶음",   category:"한식",         rating:4.1, likes:1604,
    ingredients:["스팸","마늘종","고추장","간장","올리고당","참기름"], keyIngredients:["스팸","마늘종"], time:20, difficulty:"보통",
    instructions:["스팸을 한 입 크기 직육면체로 잘라요.","마늘종을 3~4cm 길이로 잘라요.","팬에 기름을 두르지 않고 스팸을 노릇하게 구워 꺼내요.","같은 팬에 마늘종을 볶다가 스팸을 다시 넣어요.","고추장, 간장, 올리고당(1:1:1)을 섞어 소스를 만들어 넣고 볶아요.","불을 끄고 참기름 한 방울로 마무리하면 완성!"],
    youtube_title:"스팸 마늘종 볶음 | 밥 세 공기 각오하세요" },
  { id:7,  emoji:"🥬", name:"두부 간장 조림",     category:"다이어트",     rating:4.3, likes:2973,
    ingredients:["두부","간장","설탕","참기름","대파","고춧가루"], keyIngredients:["두부","간장"], time:20, difficulty:"쉬움",
    instructions:["두부를 1.5cm 두께로 썰고 키친타월로 물기를 제거해요.","팬에 기름을 두르고 중불에서 두부를 앞뒤로 노릇하게 구워요.","간장 3 : 설탕 1 : 물 3 비율로 양념을 만들어요.","구운 두부에 양념을 붓고 조려요.","국물이 반으로 줄면 대파와 고춧가루를 뿌려요.","참기름 한 방울로 마무리하면 완성!"],
    youtube_title:"두부 간장 조림 | 건강하고 맛있는 기본 반찬" },
  { id:8,  emoji:"🥞", name:"김치 치즈 부침개",   category:"한식",         rating:4.6, likes:4187,
    ingredients:["묵은 김치","슬라이스 치즈","부침가루","계란","식용유"], keyIngredients:["묵은 김치","부침가루"], time:20, difficulty:"보통",
    instructions:["묵은 김치를 잘게 다지고 국물은 꼭 짜요.","계란 1개, 부침가루 4큰술, 물 3큰술을 넣고 반죽해요.","반죽에 다진 김치를 넣어 섞어요.","팬에 기름을 두르고 반죽을 동그랗게 펴서 앞면을 구워요.","뒤집은 후 슬라이스 치즈를 올리고 뚜껑을 덮어 치즈를 녹여요.","노릇하게 익으면 접시에 담아 완성!"],
    youtube_title:"김치 치즈 부침개 | 바삭하고 쫄깃한 황금 레시피" },
  { id:9,  emoji:"🥔", name:"감자 베이컨 볶음",   category:"양식",         rating:3.6, likes:623,
    ingredients:["감자","베이컨","양파","버터","소금","후추"], keyIngredients:["감자","베이컨"], time:25, difficulty:"보통",
    instructions:["감자 껍질을 벗기고 얇게 슬라이스하거나 채 썰어요.","양파는 얇게 채 썰고, 베이컨은 2cm 폭으로 잘라요.","팬에 버터를 녹이고 감자를 중불에서 볶아요.","감자가 반 정도 익으면 베이컨과 양파를 넣어요.","소금, 후추로 간하고 감자가 완전히 익을 때까지 볶아요.","기호에 따라 파슬리를 뿌리면 서양식 감자 볶음 완성!"],
    youtube_title:"감자 베이컨 볶음 | 집에서 만드는 브런치 레시피" },
  { id:10, emoji:"🍵", name:"삼각김밥 된장국",    category:"간편식",       rating:4.0, likes:1341,
    ingredients:["참치 삼각김밥","된장","두부","대파","멸치다시마"], keyIngredients:["참치 삼각김밥","된장"], time:10, difficulty:"쉬움",
    instructions:["냄비에 물 400ml와 멸치다시마를 넣고 5분 끓여 육수를 내요.","다시마와 멸치를 건져내고 두부를 깍둑 썰어 넣어요.","된장 1.5큰술을 체에 풀어 넣고 중불로 끓여요.","대파를 어슷 썰어 넣고 한 번 더 끓이면 된장국 완성.","삼각김밥을 그릇에 담고 된장국과 함께 먹으면 든든한 한 끼!"],
    youtube_title:"삼각김밥 된장국 | 5분 만에 만드는 따뜻한 한 끼" },
];

const RECIPE_REVIEWS = {
  1: [
    { user:"김민지", rating:5, photo:"🍙", text:"아이들이 너무 좋아해서 자주 만들어요. 참기름 한 방울이 진짜 포인트예요!" },
    { user:"이준호", rating:4, photo:"😋", text:"간단하고 맛있어요. 다음엔 명란 버전으로도 도전해볼게요." },
    { user:"박수아", rating:5, photo:"🌿", text:"도시락으로 싸갔더니 친구들이 레시피 달라고 난리였어요!" },
  ],
  2: [
    { user:"최현우", rating:4, photo:"🍜", text:"혼밥할 때 최고예요. 어묵을 듬뿍 넣으니 더 맛있었어요." },
    { user:"정나연", rating:3, photo:"🥚", text:"생각보다 짤 수 있으니 스프 양 조절이 필요해요." },
    { user:"강지민", rating:5, photo:"🔥", text:"야식으로 이만한 게 없어요! 치즈 추가하면 금상첨화." },
  ],
  3: [
    { user:"윤서현", rating:5, photo:"🍳", text:"볶음밥은 이 레시피가 정석인 것 같아요. 간장 둘러주는 타이밍이 핵심!" },
    { user:"임도현", rating:5, photo:"🌶️", text:"냉장고 정리도 되고 맛도 있고 일석이조예요. 자주 해먹어요." },
    { user:"한소희", rating:4, photo:"🥬", text:"스크램블 단계가 약간 어렵지만 맛은 최고예요!" },
  ],
  4: [
    { user:"오지훈", rating:4, photo:"🥚", text:"고추참치 한 캔이면 충분해요. 촉촉하게 말리는 게 포인트." },
    { user:"신예린", rating:3, photo:"🍱", text:"처음엔 잘 안 말렸는데 두 번째엔 성공! 연습이 필요해요." },
    { user:"백지우", rating:5, photo:"🌿", text:"밥도둑이 따로 없어요. 쪽파를 많이 넣을수록 더 맛있어요!" },
  ],
  5: [
    { user:"류하은", rating:5, photo:"🍱", text:"냉동 떡볶이로 이렇게 맛있는 게 되다니! 치즈 녹이는 순간 감동." },
    { user:"조민재", rating:4, photo:"🧀", text:"간단하고 빠르게 만들 수 있어서 자취생 필수 레시피예요." },
    { user:"서지유", rating:5, photo:"🌶️", text:"마요네즈 위에 청양고추 올리면 매콤달콤 최고 조합!" },
  ],
  6: [
    { user:"문서준", rating:5, photo:"🥩", text:"스팸을 기름 없이 굽는 게 포인트예요. 노릇하게 구워야 제맛!" },
    { user:"권지아", rating:4, photo:"🌿", text:"마늘종이 아삭아삭해서 식감이 너무 좋아요. 밥 두 공기 먹었어요." },
    { user:"남현준", rating:4, photo:"🍚", text:"올리고당 대신 꿀을 넣어봤는데 더 맛있었어요!" },
  ],
  7: [
    { user:"안지현", rating:5, photo:"🥬", text:"다이어트 중에 발견한 최고의 레시피예요. 포만감도 높아요." },
    { user:"황도윤", rating:5, photo:"🌿", text:"두부를 단단하게 굽는 게 핵심이에요. 국물이 반으로 줄면 꺼내면 돼요!" },
    { user:"송유진", rating:4, photo:"🍱", text:"고춧가루 좀 더 넣으니 매콤해서 더 맛있었어요. 밥반찬으로 딱이에요." },
  ],
  8: [
    { user:"전하린", rating:5, photo:"🧀", text:"치즈가 녹으면서 김치의 매운맛이 중화되는 게 신기해요. 완벽해요!" },
    { user:"김태양", rating:5, photo:"🌶️", text:"묵은 김치로 하면 훨씬 맛있어요. 반죽이 얇을수록 바삭해요." },
    { user:"이채원", rating:4, photo:"🍳", text:"겉은 바삭 속은 쫄깃해요. 치즈는 2장 넣는 게 더 맛있는 것 같아요!" },
  ],
  9: [
    { user:"박세진", rating:4, photo:"🥔", text:"버터 향이 정말 좋아요. 감자는 얇게 썰어야 골고루 익어요." },
    { user:"최아름", rating:3, photo:"🥓", text:"맛은 있는데 감자 익히는 시간이 생각보다 길어요. 약불이 포인트예요." },
    { user:"윤민호", rating:4, photo:"🌿", text:"브런치로 딱이에요! 파슬리 뿌리면 카페 느낌 나서 좋았어요." },
  ],
  10: [
    { user:"정소윤", rating:4, photo:"🍵", text:"10분 만에 만들었는데 진짜 된장국 느낌이에요. 간이 딱 맞아요." },
    { user:"홍준서", rating:4, photo:"🌿", text:"편의점 재료로 이런 퀄리티가 나오다니 신기해요. 자취생 강추!" },
    { user:"김다은", rating:5, photo:"🍙", text:"삼각김밥이 국물에 녹아서 밥이 자연스럽게 말려요. 이거 완전 꿀팁!" },
  ],
};

const RECIPE_TEXT_REVIEWS = {
  1: [
    { user:"노을빛주방", rating:4, date:"2025.11.02", text:"생각보다 훨씬 간단해요. 밥이 따뜻할 때 바로 만들어야 잘 뭉쳐져요." },
    { user:"혼밥러v",   rating:5, date:"2025.10.28", text:"참기름 넣으니까 고급진 맛이 나요. 김을 가위로 잘라 감싸면 더 편해요." },
    { user:"자취9년차", rating:4, date:"2025.10.15", text:"마요네즈 양 조절이 포인트예요. 적게 넣으면 퍽퍽하고 많으면 느끼해요." },
  ],
  2: [
    { user:"야식킹",     rating:5, date:"2025.11.05", text:"밤에 혼자 먹기 딱 좋아요. 어묵 넉넉히 넣으면 진짜 나베 느낌!" },
    { user:"컵라면탈출", rating:3, date:"2025.10.22", text:"스프 반만 넣는 게 나아요. 두부는 미리 한 번 구우면 식감이 더 좋아요." },
    { user:"자취새내기", rating:4, date:"2025.10.09", text:"재료비가 거의 안 들어서 좋아요. 대파 넣는 타이밍을 마지막에 해야 아삭해요." },
  ],
  3: [
    { user:"냉장고털이왕", rating:5, date:"2025.11.08", text:"이 레시피 알고 나서 찬밥 버린 적이 없어요. 간장 타이밍이 진짜 핵심이에요." },
    { user:"매일볶음밥",   rating:5, date:"2025.10.31", text:"팬 충분히 달구는 게 제일 중요해요. 연기 날 정도로 달궈야 볶음밥 특유의 향이 나요." },
    { user:"요리초보졸업", rating:4, date:"2025.10.19", text:"냉동채소 대신 신선한 야채 썰어 넣으니 훨씬 맛있었어요." },
  ],
  4: [
    { user:"반찬요정",   rating:4, date:"2025.11.01", text:"고추참치 한 캔이면 양이 딱 맞아요. 약불로 천천히 말아야 터지지 않아요." },
    { user:"도시락쌤",   rating:5, date:"2025.10.26", text:"도시락 단골 메뉴가 됐어요. 한 번에 두 줄 만들어서 냉장 보관해요." },
    { user:"밥도둑사냥꾼", rating:5, date:"2025.09.27", text:"이거 먹고 밥 두 공기 뚝딱했어요. 쪽파 넉넉히 넣을수록 향이 좋아요!" },
  ],
  5: [
    { user:"편의점셰프", rating:5, date:"2025.11.06", text:"냉동 떡볶이 브랜드마다 맛이 달라서 달달한 걸로 고르는 게 포인트예요." },
    { user:"자취 3년",   rating:4, date:"2025.10.29", text:"치즈 두 장 넣으면 더 진해요. 마요네즈 격자 무늬로 뿌리면 예쁘게 나와요." },
    { user:"혼밥마스터", rating:5, date:"2025.10.16", text:"10분 안에 완성되는 퀄리티가 아니에요. 진짜 식당 수준이에요!" },
  ],
  6: [
    { user:"스팸러버",     rating:5, date:"2025.11.03", text:"스팸을 기름 없이 굽는 게 처음엔 낯설었는데 훨씬 바삭하게 나와요." },
    { user:"반찬 블로거",  rating:4, date:"2025.10.21", text:"마늘종은 살짝 아삭한 정도가 딱 좋아요. 너무 오래 볶으면 흐물해져요." },
    { user:"밑반찬전문가", rating:4, date:"2025.10.08", text:"소스 비율 1:1:1이 황금 비율 맞아요. 달달하고 짭짤한 게 딱이에요." },
  ],
  7: [
    { user:"다이어터",   rating:5, date:"2025.11.07", text:"칼로리 낮으면서 이렇게 맛있는 반찬은 처음이에요. 단백질도 충분해요." },
    { user:"헬시라이프", rating:5, date:"2025.10.30", text:"두부 물기 제거가 핵심이에요. 꼭 키친타월로 꾹꾹 눌러줘야 해요." },
    { user:"식단관리중", rating:4, date:"2025.10.17", text:"간장 양을 레시피보다 살짝 줄였는데 더 담백해서 좋았어요." },
  ],
  8: [
    { user:"김치요리왕", rating:5, date:"2025.11.04", text:"묵은 김치 버리려다 이 레시피 보고 살렸어요. 진짜 맛있어요!" },
    { user:"부침개장인", rating:5, date:"2025.10.23", text:"반죽 두께를 얇게 할수록 바삭해요. 치즈는 뒤집은 직후 올려야 잘 녹아요." },
    { user:"주말요리어", rating:4, date:"2025.10.11", text:"막걸리랑 먹으면 궁합이 완벽해요. 주말 점심으로 자주 만들어요." },
  ],
  9: [
    { user:"감자요리덕후", rating:4, date:"2025.11.02", text:"감자 두께가 균일해야 골고루 익어요. 채칼 쓰는 게 편해요." },
    { user:"브런치카페",   rating:4, date:"2025.10.25", text:"버터 넉넉히 써야 고소함이 살아나요. 소금은 마지막에 넣어야 해요." },
    { user:"홈카페_cook",  rating:5, date:"2025.10.01", text:"로즈마리 살짝 올리면 레스토랑 느낌 나요. 강력 추천이에요!" },
  ],
  10: [
    { user:"편의점고수", rating:4, date:"2025.11.05", text:"냉동 삼각김밥 말고 일반 삼각김밥도 잘 어울려요. 국물이 진해져서 좋아요." },
    { user:"자취끝판왕", rating:5, date:"2025.10.27", text:"5분 만에 이런 된장국이 나온다니 신기해요. 멸치다시마 우리는 게 진짜 중요해요." },
    { user:"국물요리팬", rating:4, date:"2025.10.14", text:"두부 넉넉히 넣으면 더 든든해요. 대파는 마지막에 넣어야 향이 살아요." },
  ],
};

const TREND_DATA = [
  { recipeId:3, count:"3,241", tags:["#오늘뭐먹지","#간편한식"] },
  { recipeId:1, count:"2,847", tags:["#SNS화제","#냉털볶"] },
  { recipeId:8, count:"1,923", tags:["#집밥","#김치요리"] },
  { recipeId:5, count:"1,520", tags:["#편의점요리","#5분완성"] },
  { recipeId:7, count:"1,108", tags:["#다이어트","#헬시푸드"] },
  { recipeId:2, count:"987",   tags:["#야식","#간식"] },
];

const CATEGORIES_LIST = ["전체", ...new Set(RECIPES.map((r) => r.category))];

function StarRating({ value, size = 12 }) {
  return (
    <Text style={{ fontSize: size, color: "#d97706" }}>
      {"★".repeat(Math.round(value))}{"☆".repeat(5 - Math.round(value))}
    </Text>
  );
}

/* ── 레시피 상세 모달 ── */
function RecipeModal({ recipe, onClose }) {
  const [showAllText, setShowAllText] = useState(false);
  if (!recipe) return null;
  const diffColor = DIFF_COLOR[recipe.difficulty] || "#888";
  const reviews = RECIPE_REVIEWS[recipe.id] || [];
  const textReviews = RECIPE_TEXT_REVIEWS[recipe.id] || [];

  return (
    <Modal visible={!!recipe} transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.modalOverlay}>
        <Pressable style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} />
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
                <View style={st.modalNameRow}>
                  <Text style={[st.recipeName, { marginBottom: 0, flex: 1 }]}>{recipe.name}</Text>
                  <View style={st.modalHeaderRating}>
                    <Text style={{ fontSize: 14 }}>⭐</Text>
                    <Text style={st.modalHeaderRatingText}>{recipe.rating?.toFixed(1)}</Text>
                  </View>
                </View>
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

            {/* 리뷰 포토 */}
            {reviews.length > 0 && (
              <View style={{ paddingVertical: 16 }}>
                <View style={st.reviewTitleRow}>
                  <Text style={st.sectionTitle}>포토 리뷰</Text>
                  <View style={st.reviewCountBadge}>
                    <Text style={st.reviewCountText}>{reviews.length}</Text>
                  </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {reviews.map((rv, i) => (
                    <View key={i} style={st.reviewItem}>
                      <View style={st.reviewPhoto}>
                        <Text style={{ fontSize: 36 }}>{rv.photo}</Text>
                      </View>
                      <View style={st.reviewContent}>
                        <View style={st.reviewHeader}>
                          <Text style={st.reviewUser}>{rv.user}</Text>
                          <View style={st.reviewStars}>
                            <StarRating value={rv.rating} size={11} />
                          </View>
                        </View>
                        <Text style={st.reviewText} numberOfLines={3}>{rv.text}</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

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

            {/* 텍스트 리뷰 */}
            {textReviews.length > 0 && (
              <View style={{ paddingBottom: 8 }}>
                <View style={st.divider} />
                <View style={[st.reviewTitleRow, { paddingTop: 16 }]}>
                  <Text style={st.sectionTitle}>이용 후기</Text>
                  <View style={st.reviewCountBadge}>
                    <Text style={st.reviewCountText}>{textReviews.length}</Text>
                  </View>
                </View>
                {(showAllText ? textReviews : textReviews.slice(0, 2)).map((rv, i) => (
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
                ))}
                {!showAllText && textReviews.length > 2 && (
                  <TouchableOpacity style={st.reviewMoreBtn} onPress={() => setShowAllText(true)}>
                    <Text style={st.reviewMoreBtnText}>리뷰 더 보기 ({textReviews.length - 2}개)</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* ── 메인 컴포넌트 ── */
export default function ExploreScreen() {
  const [query, setQuery]             = useState("");
  const [activeCategory, setCategory] = useState("전체");
  const [favorites, setFavorites]     = useState(new Set());
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [searchOpen, setSearchOpen]   = useState(false);
  const [selectedRecipe, setRecipe]   = useState(null);
  const [recoRecipes, setRecoRecipes] = useState(() => RECIPES.slice(0, 5));

  useFocusEffect(
    useCallback(() => {
      const fridgeSet = new Set(getIngredients().map((n) => n.toLowerCase()));
      if (!fridgeSet.size) { setRecoRecipes(RECIPES.slice(0, 5)); return; }
      const scored = RECIPES
        .map((r) => ({ ...r, matchCount: r.ingredients.filter((ing) => fridgeSet.has(ing.toLowerCase())).length }))
        .filter((r) => r.matchCount > 0)
        .sort((a, b) => b.matchCount - a.matchCount)
        .slice(0, 6);
      setRecoRecipes(scored.length ? scored : RECIPES.slice(0, 5));
    }, [])
  );

  function toggleFav(id) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
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
              style={st.searchInput} value={query} onChangeText={setQuery}
              placeholder="요리명 또는 재료로 검색" placeholderTextColor={C.textMuted} autoFocus
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
          {recoRecipes.map((r, i) => (
            <TouchableOpacity key={r.id} style={[st.recoCard, { marginLeft: i === 0 ? 20 : 0, marginRight: i === recoRecipes.length - 1 ? 20 : 0 }]} onPress={() => setRecipe(r)}>
              <View style={st.recoVisual}><Text style={{ fontSize: 36 }}>{r.emoji}</Text></View>
              <View style={st.recoInfo}>
                <Text style={st.recoName} numberOfLines={2}>{r.name}</Text>
                <Text style={st.recoMeta}>⭐ {r.rating?.toFixed(1)}  ⏱ {r.time}분</Text>
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
                    <View style={st.cardNameRow}>
                      <Text style={st.cardName}>{recipe.name}</Text>
                      <View style={st.cardRating}>
                        <Text style={{ fontSize: 12 }}>⭐</Text>
                        <Text style={st.cardRatingText}>{recipe.rating?.toFixed(1)}</Text>
                      </View>
                    </View>
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
