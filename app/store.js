let _ingredients = [];

export function setIngredients(items) {
  _ingredients = [...items];
}

export function getIngredients() {
  return _ingredients;
}
