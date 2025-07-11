const axios = require('axios');
const prisma = require('../db/client');

/**
 * Fetch nutrition information from OpenFoodFacts by UPC / EAN barcode.
 * @param {string} upc UPC/EAN barcode number
 * @returns {Promise<object|null>} Nutrition object or null if not found
 */
async function fetchNutritionByUPC(upc) {
  if (!upc) throw new Error('UPC is required');

  // 1. Check if we already have it cached in the DB
  const existingFood = await prisma.food.findFirst({
    where: { upc },
    include: { nutrition: true },
  });
  if (existingFood?.nutrition) {
    return existingFood.nutrition;
  }

  // 2. Fetch from OpenFoodFacts
  const url = `https://world.openfoodfacts.org/api/v0/product/${upc}.json`;
  const { data } = await axios.get(url);
  if (data.status !== 1) {
    // Not found
    return null;
  }
  const product = data.product;

  // Helper to safely pull nutrient value
  const getField = (field) => {
    const val = product.nutriments?.[field];
    return typeof val === 'number' ? val : val ? parseFloat(val) : null;
  };

  const nutrition = {
    calories: getField('energy-kcal_100g'),
    protein: getField('proteins_100g'),
    carbs: getField('carbohydrates_100g'),
    fat: getField('fat_100g'),
    fiber: getField('fiber_100g'),
    sodium: getField('sodium_100g') || getField('salt_100g'),
    servingSize: parseServingSize(product.serving_size),
    servingsPerUnit: null, // we may derive later
  };

  // 3. Store in DB (Food + NutritionFact)
  const food = existingFood
    ? existingFood
    : await prisma.food.create({
        data: {
          name: product.product_name || 'Unknown',
          brand: product.brands || null,
          upc,
        },
      });

  await prisma.nutritionFact.upsert({
    where: { foodId: food.id },
    update: nutrition,
    create: {
      foodId: food.id,
      ...nutrition,
    },
  });

  return nutrition;
}

/**
 * Parse serving size like "30 g" => 30
 * @param {string} str
 * @returns {number|null}
 */
function parseServingSize(str) {
  if (!str) return null;
  const match = /([\d.]+)\s*(g|ml|oz|serving|servings)?/i.exec(str);
  if (!match) return null;
  return parseFloat(match[1]);
}

/**
 * Search foods by text query using OpenFoodFacts search API
 * @param {string} query
 * @param {number} [limit=20]
 * @returns {Promise<Array<{name:string,brand:string|null,upc:string|null}>>}
 */
async function searchFoods(query, limit = 20) {
  if (!query) return [];
  const url = 'https://world.openfoodfacts.org/cgi/search.pl';
  const params = {
    search_terms: query,
    json: 1,
    page_size: limit,
  };
  const { data } = await axios.get(url, { params });
  const products = data.products || [];
  return products.map((p) => ({
    name: p.product_name || p.generic_name || 'Unknown',
    brand: p.brands || null,
    upc: p.code || null,
  }));
}

module.exports = {
  fetchNutritionByUPC,
  searchFoods,
};
