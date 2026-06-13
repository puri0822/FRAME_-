export const API_BASE_URL = "https://4ur32pd547.execute-api.ap-northeast-2.amazonaws.com";

export const AUTH_ENDPOINTS = {
  google: `${API_BASE_URL}/auth/google`,
  me:     `${API_BASE_URL}/auth/me`,
};

export const EC2_BASE_URL = "http://13.125.213.80:3000";

export const EC2_ENDPOINTS = {
  recipes:    `${EC2_BASE_URL}/api/recipes`,
  trending:   `${EC2_BASE_URL}/api/recipes/trending`,
  categories: `${EC2_BASE_URL}/api/recipe-categories`,
  youtube:    `${EC2_BASE_URL}/api/youtube/search`,
  receipt:    `${EC2_BASE_URL}/api/receipt`,
  chat:       `${EC2_BASE_URL}/api/chat`,
  fridge:       `${EC2_BASE_URL}/api/fridge`,
  chatHistory:  `${EC2_BASE_URL}/api/chat/history`,
  userNickname: `${EC2_BASE_URL}/api/user`,
};
