import * as FileSystem from 'expo-file-system';

let _ingredients = [];
let _fridgeItems  = [];

const FRIDGE_PATH = () => FileSystem.documentDirectory + 'fridge_items.json';

export function setIngredients(items) {
  _ingredients = [...items];
}

export function getIngredients() {
  return _ingredients;
}

export function setFridgeItems(items) {
  _fridgeItems = [...items];
}

export function getFridgeItems() {
  return _fridgeItems;
}

export async function loadFridgeFromStorage() {
  try {
    const path = FRIDGE_PATH();
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return [];
    const raw  = await FileSystem.readAsStringAsync(path);
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

export async function saveFridgeToStorage(items) {
  try {
    await FileSystem.writeAsStringAsync(FRIDGE_PATH(), JSON.stringify(items));
  } catch {}
}
