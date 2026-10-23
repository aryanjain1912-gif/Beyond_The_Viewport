const DEFAULT_DISH_IMAGES = [
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=720&q=80&fit=crop",
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=720&q=80&fit=crop",
  "https://images.unsplash.com/photo-1547592180-85f173990554?w=720&q=80&fit=crop",
];

export function isValidDishImageUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && url.hostname === "images.unsplash.com"
      && !url.username
      && !url.password
      && !url.port;
  } catch {
    return false;
  }
}

export function parseDishRows(value) {
  const rows = String(value ?? "").split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
  if (rows.length < 1 || rows.length > 10) {
    return { error: "Add between 1 and 10 dishes." };
  }

  const dishes = [];
  for (const row of rows) {
    const separator = row.indexOf("|");
    const name = (separator < 0 ? row : row.slice(0, separator)).trim();
    const imageUrl = separator < 0 ? "" : row.slice(separator + 1).trim();
    if (name.length < 2 || name.length > 80) {
      return { error: "Each dish name must be between 2 and 80 characters." };
    }
    if (imageUrl && (imageUrl.length > 2048 || !isValidDishImageUrl(imageUrl))) {
      return { error: "Dish photos must use a valid HTTPS images.unsplash.com URL." };
    }
    dishes.push({ name, image_url: imageUrl || null });
  }

  return { dishes };
}

export function getMenuDishes(menu) {
  const savedDishes = Array.isArray(menu?.dishes) ? menu.dishes : [];
  const dishes = savedDishes.length
    ? savedDishes
    : String(menu?.menu_text ?? "").split(/[·,]/).map((name) => ({ name: name.trim() })).filter((dish) => dish.name);

  return dishes.map((dish, index) => ({
    name: String(dish.name ?? ""),
    image_url: isValidDishImageUrl(dish.image_url) ? dish.image_url : DEFAULT_DISH_IMAGES[index % DEFAULT_DISH_IMAGES.length],
  })).filter((dish) => dish.name);
}

export function formatDishRows(dishes, menuText = "") {
  if (Array.isArray(dishes) && dishes.length) {
    return dishes.map((dish) => `${dish.name}${dish.image_url ? ` | ${dish.image_url}` : ""}`).join("\n");
  }
  return String(menuText).split(/[·,]/).map((dish) => dish.trim()).filter(Boolean).join("\n");
}
