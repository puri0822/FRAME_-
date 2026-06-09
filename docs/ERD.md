# ERD (Entity Relationship Diagram)

## 다이어그램

```
┌─────────────────────┐
│        user         │
├─────────────────────┤
│ PK id VARCHAR(36)   │
│    nickname         │
│    email (UNIQUE)   │
│    provider         │◄─────────────────────────────────┐
└──────────┬──────────┘                                  │
           │                                             │
     ┌─────┼──────────────────┐                         │
     │     │                  │                         │
     ▼     ▼                  ▼                         │
┌──────────────┐   ┌──────────────────┐   ┌────────────────────┐
│  ingredient  │   │  recipe_review   │   │      favorite      │
├──────────────┤   ├──────────────────┤   ├────────────────────┤
│ PK id        │   │ PK id            │   │ PK id              │
│ FK user_id   │   │ FK recipe_id     │   │ FK user_id         │
│ FK category_id│  │ FK user_id       │   │ FK recipe_id       │
│    name      │   │    is_liked      │   │ UNIQUE(user_id,    │
│ FK image_kw  │   │    rating(1-5)   │   │        recipe_id)  │
│    count     │   │    comment       │   └────────────────────┘
│    expiry_date│  │    created_at    │
│ expiry_status│   │ UNIQUE(recipe_id,│
│    created_at│   │        user_id)  │
└──────┬───────┘   └────────┬─────────┘
       │                    │
       ▼                    ▼
┌──────────────────┐   ┌──────────────────────┐
│ingredient_category│  │        recipe        │
├──────────────────┤   ├──────────────────────┤
│ PK id            │   │ PK id                │
│    image_url     │   │ FK category_id       │
│    sort_order    │   │    name              │
└──────────────────┘   │    image_url         │
                        │    cook_time_min     │
┌──────────────────┐   │    difficulty        │
│ingredient_image  │   │    youtube_title     │
├──────────────────┤   │    youtube_url       │
│ PK keyword       │   │    is_published      │
│    image_url     │   └──────────┬───────────┘
└──────────────────┘              │
                             ┌────┼────────────────┐
                             │    │                │
                             ▼    ▼                ▼
                  ┌──────────────────┐  ┌──────────────┐  ┌─────────────────┐
                  │recipe_ingredient │  │ recipe_step  │  │ recipe_category │
                  ├──────────────────┤  ├──────────────┤  ├─────────────────┤
                  │ PK id            │  │ PK id        │  │ PK id           │
                  │ FK recipe_id     │  │ FK recipe_id │  │    image_url    │
                  │ ingredient_name  │  │ step_order   │  │    sort_order   │
                  │ is_key           │  │ description  │  └─────────────────┘
                  └──────────────────┘  └──────────────┘
```

## 테이블 상세

### user
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | VARCHAR(36) PK | UUID 자동 생성 |
| nickname | VARCHAR(100) | 사용자 닉네임 |
| email | VARCHAR(255) UNIQUE | 이메일 |
| provider | VARCHAR(20) | `google` \| `local` |

### ingredient
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| user_id | VARCHAR(36) FK | → user.id |
| category_id | VARCHAR(50) FK | → ingredient_category.id |
| name | VARCHAR(100) | 재료명 |
| image_keyword | VARCHAR(100) FK | → ingredient_image.keyword |
| count | INT | 수량 (≥ 0) |
| expiry_date | DATE | 유통기한 |
| expiry_status | VARCHAR(10) | `ok` \| `warning` \| `expired` |
| created_at | DATETIME | 등록일 |

### ingredient_category
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | VARCHAR(50) PK | 카테고리명 (예: 채소/과일) |
| image_url | VARCHAR(500) | 카테고리 이미지 |
| sort_order | INT | 정렬 순서 |

### ingredient_image
| 컬럼 | 타입 | 설명 |
|---|---|---|
| keyword | VARCHAR(100) PK | 재료 키워드 |
| image_url | VARCHAR(500) | 재료 이미지 URL |

### recipe
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| category_id | VARCHAR(50) FK | → recipe_category.id |
| name | VARCHAR(200) | 레시피명 |
| image_url | VARCHAR(500) | 대표 이미지 |
| cook_time_min | INT | 조리 시간 (분, > 0) |
| difficulty | VARCHAR(10) | `쉬움` \| `보통` \| `어려움` |
| youtube_title | VARCHAR(300) | 유튜브 영상 제목 |
| youtube_url | VARCHAR(500) | 유튜브 URL |
| is_published | BOOLEAN | 공개 여부 |

### recipe_category
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | VARCHAR(50) PK | 카테고리명 |
| image_url | VARCHAR(500) | 카테고리 이미지 |
| sort_order | INT | 정렬 순서 |

### recipe_ingredient
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| recipe_id | INT FK | → recipe.id |
| ingredient_name | VARCHAR(100) | 재료명 |
| is_key | BOOLEAN | 핵심 재료 여부 |

### recipe_step
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| recipe_id | INT FK | → recipe.id |
| step_order | INT | 조리 순서 |
| description | TEXT | 단계 설명 |

### recipe_review
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| recipe_id | INT FK | → recipe.id |
| user_id | VARCHAR(36) FK | → user.id |
| is_liked | BOOLEAN | 좋아요 여부 |
| rating | DECIMAL(3,1) | 별점 (1.0 ~ 5.0) |
| comment | TEXT | 리뷰 내용 |
| created_at | DATETIME | 작성일 |

### favorite
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| user_id | VARCHAR(36) FK | → user.id |
| recipe_id | INT FK | → recipe.id |

## 관계 요약

| 관계 | 설명 |
|---|---|
| user : ingredient | 1:N (사용자의 냉장고 재료) |
| user : recipe_review | 1:N (사용자 리뷰) |
| user : favorite | 1:N (즐겨찾기) |
| recipe : recipe_ingredient | 1:N (레시피 재료 목록) |
| recipe : recipe_step | 1:N (조리 순서) |
| recipe : recipe_review | 1:N (레시피 리뷰) |
| recipe : favorite | 1:N (즐겨찾기) |
| recipe_category : recipe | 1:N (카테고리별 레시피) |
| ingredient_category : ingredient | 1:N (카테고리별 재료) |
| ingredient_image : ingredient | 1:N (재료 이미지) |
