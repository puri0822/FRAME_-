# 요리조리 ERD (RDS - MySQL)

## 테이블 관계도

```
┌─────────────────────────────┐
│           user              │
├─────────────────────────────┤
│ PK  id          VARCHAR(255)│  ← Google OAuth sub
│     nickname    VARCHAR(100)│
│     email       VARCHAR(255)│
│     provider    VARCHAR(20) │  ('google')
└──────────┬──────────────────┘
           │ 1:N
           ├────────────────────────────────────────┐
           │                                        │
    ┌──────▼──────────────────────┐   ┌─────────────▼─────────────────┐
    │        user_fridge          │   │         chat_history           │
    ├─────────────────────────────┤   ├───────────────────────────────┤
    │ PK  user_id    VARCHAR(255) │   │ PK  id         INT AI          │
    │     ingredients LONGTEXT    │   │ FK  user_id    VARCHAR(255)    │
    │     updated_at  TIMESTAMP   │   │     role       VARCHAR(10)     │
    └─────────────────────────────┘   │     message    TEXT            │
                                      │     created_at TIMESTAMP       │
                                      └───────────────────────────────┘


┌──────────────────────────────┐
│       recipe_category        │
├──────────────────────────────┤
│ PK  id    INT AUTO_INCREMENT │
│     name  VARCHAR(50)        │
└──────────┬───────────────────┘
           │ 1:N
┌──────────▼───────────────────────────┐
│               recipe                 │
├──────────────────────────────────────┤
│ PK  id             INT AI            │
│ FK  category_id    INT               │
│     name           VARCHAR(100)      │
│     image_url      TEXT              │
│     cook_time_min  INT               │
│     difficulty     VARCHAR(10)       │
│     youtube_title  VARCHAR(200)      │
│     youtube_url    TEXT              │
│     is_published   TINYINT(1)        │
└──────┬───────────┬───────────────────┘
       │ 1:N       │ 1:N
       │           │
┌──────▼──────────┐ ┌▼────────────────────────────┐
│recipe_ingredient│ │        recipe_step           │
├─────────────────┤ ├─────────────────────────────┤
│ PK  id     INT  │ │ PK  id           INT AI      │
│ FK  recipe_id   │ │ FK  recipe_id    INT         │
│     ingr_name   │ │     step_order   INT         │
│ VARCHAR(100)    │ │     description  TEXT        │
│     is_key      │ └─────────────────────────────┘
│ TINYINT(1)      │
└────────┬────────┘
         │ N:M (recipe + user)
┌────────▼────────────────────────┐
│          recipe_review          │
├─────────────────────────────────┤
│ PK  id           INT AI         │
│ FK  recipe_id    INT            │
│ FK  user_id      VARCHAR(255)   │
│     rating       DECIMAL(2,1)   │
│     comment      TEXT           │
│     is_liked     TINYINT(1)     │
│     created_at   TIMESTAMP      │
│ UNIQUE (recipe_id, user_id)     │
└─────────────────────────────────┘
```

## 테이블 상세 명세

### user
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | VARCHAR(255) PK | Google OAuth sub ID |
| nickname | VARCHAR(100) | 사용자 닉네임 |
| email | VARCHAR(255) | 이메일 |
| provider | VARCHAR(20) | 로그인 제공자 ('google') |

### recipe_category
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INT PK AI | 카테고리 ID |
| name | VARCHAR(50) | 카테고리명 (한식, 양식 등) |

### recipe
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INT PK AI | 레시피 ID |
| category_id | INT FK | recipe_category.id |
| name | VARCHAR(100) | 레시피명 |
| image_url | TEXT | 대표 이미지 URL |
| cook_time_min | INT | 조리 시간 (분) |
| difficulty | VARCHAR(10) | 난이도 (쉬움/보통/어려움) |
| youtube_title | VARCHAR(200) | 유튜브 영상 제목 |
| youtube_url | TEXT | 유튜브 URL |
| is_published | TINYINT(1) | 공개 여부 |

### recipe_ingredient
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INT PK AI | 재료 ID |
| recipe_id | INT FK | recipe.id |
| ingredient_name | VARCHAR(100) | 재료명 |
| is_key | TINYINT(1) | 핵심 재료 여부 |

### recipe_step
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INT PK AI | 단계 ID |
| recipe_id | INT FK | recipe.id |
| step_order | INT | 순서 |
| description | TEXT | 조리 설명 |

### recipe_review
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INT PK AI | 리뷰 ID |
| recipe_id | INT FK | recipe.id |
| user_id | VARCHAR(255) FK | user.id |
| rating | DECIMAL(2,1) | 별점 (0.5 ~ 5.0) |
| comment | TEXT | 리뷰 내용 |
| is_liked | TINYINT(1) | 좋아요 여부 |
| created_at | TIMESTAMP | 작성일시 |
| UNIQUE | (recipe_id, user_id) | 1인 1리뷰 제한 |

### user_fridge
| 컬럼 | 타입 | 설명 |
|------|------|------|
| user_id | VARCHAR(255) PK FK | user.id |
| ingredients | LONGTEXT | 재료 목록 (JSON 배열) |
| updated_at | TIMESTAMP | 마지막 수정일시 |

### chat_history
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INT PK AI | 메시지 ID |
| user_id | VARCHAR(255) FK | user.id |
| role | VARCHAR(10) | 발화자 ('user' / 'ai') |
| message | TEXT | 메시지 내용 |
| created_at | TIMESTAMP | 작성일시 |
