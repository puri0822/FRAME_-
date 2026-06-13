-- ============================================================
--  요리조리 (YoriJori) Database Schema
--  MySQL 8.0+
--  테이블 10개 | 생성 순서: 참조 대상 먼저
-- ============================================================

CREATE DATABASE IF NOT EXISTS yorijori
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE yorijori;

-- ------------------------------------------------------------
--  1. USER
-- ------------------------------------------------------------
CREATE TABLE `user` (
  id        VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  nickname  VARCHAR(100) NOT NULL,
  email     VARCHAR(255) UNIQUE,
  provider  VARCHAR(20)  NOT NULL,
  CONSTRAINT chk_user_provider CHECK (provider IN ('google','local')),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
--  2. INGREDIENT_CATEGORY
-- ------------------------------------------------------------
CREATE TABLE ingredient_category (
  id         VARCHAR(50)  NOT NULL,
  image_url  VARCHAR(500) NOT NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
--  3. INGREDIENT_IMAGE
-- ------------------------------------------------------------
CREATE TABLE ingredient_image (
  keyword    VARCHAR(100) NOT NULL,
  image_url  VARCHAR(500) NOT NULL,
  PRIMARY KEY (keyword)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
--  4. INGREDIENT
-- ------------------------------------------------------------
CREATE TABLE ingredient (
  id             INT          NOT NULL AUTO_INCREMENT,
  user_id        VARCHAR(36)  NOT NULL,
  category_id    VARCHAR(50)  NOT NULL,
  name           VARCHAR(100) NOT NULL,
  image_keyword  VARCHAR(100),
  count          INT          NOT NULL DEFAULT 1,
  expiry_date    DATE,
  expiry_status  VARCHAR(10)  NOT NULL DEFAULT 'ok',
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_ingredient_count  CHECK (count >= 0),
  CONSTRAINT chk_expiry_status     CHECK (expiry_status IN ('ok','warning','expired')),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id)       REFERENCES `user`(id)              ON DELETE CASCADE,
  FOREIGN KEY (category_id)   REFERENCES ingredient_category(id),
  FOREIGN KEY (image_keyword) REFERENCES ingredient_image(keyword)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_ingredient_user     ON ingredient(user_id);
CREATE INDEX idx_ingredient_category ON ingredient(category_id);

-- ------------------------------------------------------------
--  5. RECIPE_CATEGORY
-- ------------------------------------------------------------
CREATE TABLE recipe_category (
  id         VARCHAR(50)  NOT NULL,
  image_url  VARCHAR(500) NOT NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
--  6. RECIPE
-- ------------------------------------------------------------
CREATE TABLE recipe (
  id              INT          NOT NULL AUTO_INCREMENT,
  category_id     VARCHAR(50)  NOT NULL,
  name            VARCHAR(200) NOT NULL,
  image_url       VARCHAR(500) NOT NULL,
  cook_time_min   INT          NOT NULL,
  difficulty      VARCHAR(10)  NOT NULL,
  youtube_title   VARCHAR(300),
  youtube_url     VARCHAR(500),
  is_published    BOOLEAN      NOT NULL DEFAULT TRUE,
  CONSTRAINT chk_cook_time  CHECK (cook_time_min > 0),
  CONSTRAINT chk_difficulty CHECK (difficulty IN ('쉬움','보통','어려움')),
  PRIMARY KEY (id),
  FOREIGN KEY (category_id) REFERENCES recipe_category(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_recipe_category  ON recipe(category_id);
CREATE INDEX idx_recipe_published ON recipe(is_published);

-- ------------------------------------------------------------
--  7. RECIPE_INGREDIENT
-- ------------------------------------------------------------
CREATE TABLE recipe_ingredient (
  id               INT          NOT NULL AUTO_INCREMENT,
  recipe_id        INT          NOT NULL,
  ingredient_name  VARCHAR(100) NOT NULL,
  is_key           BOOLEAN      NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id),
  FOREIGN KEY (recipe_id) REFERENCES recipe(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_recipe_ingredient_recipe ON recipe_ingredient(recipe_id);

-- ------------------------------------------------------------
--  8. RECIPE_STEP
-- ------------------------------------------------------------
CREATE TABLE recipe_step (
  id           INT  NOT NULL AUTO_INCREMENT,
  recipe_id    INT  NOT NULL,
  step_order   INT  NOT NULL DEFAULT 1,
  description  TEXT NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (recipe_id) REFERENCES recipe(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_recipe_step_recipe ON recipe_step(recipe_id);

-- ------------------------------------------------------------
--  9. RECIPE_REVIEW
-- ------------------------------------------------------------
CREATE TABLE recipe_review (
  id          INT          NOT NULL AUTO_INCREMENT,
  recipe_id   INT          NOT NULL,
  user_id     VARCHAR(36)  NOT NULL,
  is_liked    BOOLEAN      NOT NULL DEFAULT FALSE,
  rating      DECIMAL(3,1) NOT NULL,
  comment     TEXT,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_rating CHECK (rating BETWEEN 1.0 AND 5.0),
  UNIQUE KEY uq_review (recipe_id, user_id),
  PRIMARY KEY (id),
  FOREIGN KEY (recipe_id) REFERENCES recipe(id)   ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES `user`(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_review_recipe ON recipe_review(recipe_id);
CREATE INDEX idx_review_user   ON recipe_review(user_id);

-- ------------------------------------------------------------
--  10. FAVORITE
-- ------------------------------------------------------------
CREATE TABLE favorite (
  id         INT         NOT NULL AUTO_INCREMENT,
  user_id    VARCHAR(36) NOT NULL,
  recipe_id  INT         NOT NULL,
  UNIQUE KEY uq_favorite (user_id, recipe_id),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id)   REFERENCES `user`(id)  ON DELETE CASCADE,
  FOREIGN KEY (recipe_id) REFERENCES recipe(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_favorite_user   ON favorite(user_id);
CREATE INDEX idx_favorite_recipe ON favorite(recipe_id);
