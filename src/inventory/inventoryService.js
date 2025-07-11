const prisma = require('../db/client');

/**
 * Add stock units for a food item (creates Food/Nutrition if needed via UPC lookup beforehand).
 * @param {Object} params { foodId, quantity, locationId, expiryDate, notes }
 */
async function addStock({ foodId, quantity, locationId = null, expiryDate = null, notes = null }) {
  return prisma.stock.create({
    data: {
      foodId,
      quantity,
      locationId,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      servingsRemaining: null,
      notes,
    },
  });
}

/**
 * Record consumption of servings from a given stock.
 * Decrements servingsRemaining or quantity.
 * @param {number} stockId
 * @param {number} servingsEaten Number of servings eaten (can be fractional).
 */
async function eatServings(stockId, servingsEaten) {
  const stock = await prisma.stock.findUnique({
    where: { id: stockId },
    include: {
      food: {
        include: { nutrition: true },
      },
    },
  });
  if (!stock) throw new Error('Stock not found');

  const servingsPerUnit = stock.food.nutrition?.servingsPerUnit || 1;
  const totalServingsLeft = (stock.servingsRemaining ?? stock.quantity * servingsPerUnit) - servingsEaten;
  let quantityLeft = stock.quantity;
  let servingsRemaining = totalServingsLeft;
  if (totalServingsLeft < 0) {
    throw new Error('Not enough servings left');
  }
  // If we track full units only, we adjust quantity when we consume whole units
  if (servingsPerUnit) {
    quantityLeft = Math.ceil(totalServingsLeft / servingsPerUnit);
    servingsRemaining = totalServingsLeft;
  }

  return prisma.stock.update({
    where: { id: stockId },
    data: { quantity: quantityLeft, servingsRemaining },
  });
}

/**
 * Calculate household days until depletion based on calories.
 * @returns {Promise<number>} Days of food remaining (float)
 */
async function calculateDaysLeft() {
  const [persons, stocks] = await Promise.all([
    prisma.person.findMany(),
    prisma.stock.findMany({
      include: {
        food: { include: { nutrition: true } },
      },
    }),
  ]);
  const dailyCalories = persons.reduce((sum, p) => sum + (p.dailyConsumption || 2000), 0);
  if (dailyCalories === 0) return Infinity;

  let totalCalories = 0;
  for (const stock of stocks) {
    const n = stock.food.nutrition;
    if (!n || !n.calories) continue;
    const servingsPerUnit = n.servingsPerUnit || 1;
    const caloriesPerServing = n.calories;
    const totalServings = stock.servingsRemaining ?? stock.quantity * servingsPerUnit;
    totalCalories += totalServings * caloriesPerServing;
  }
  return totalCalories / dailyCalories;
}

module.exports = {
  addStock,
  eatServings,
  calculateDaysLeft,
};
