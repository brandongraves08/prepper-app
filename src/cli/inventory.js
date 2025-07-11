require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { fetchNutritionByUPC } = require('../inventory/nutritionService');
const { addStock, eatServings, calculateDaysLeft } = require('../inventory/inventoryService');

/**
 * Handle inventory commands: add, eat, list, days-left
 * @param {string} command
 * @param {object} options
 */
async function handleInventoryCommand(command, options) {
  try {
    switch (command) {
      case 'add':
        await cmdAdd(options);
        break;
      case 'eat':
        await cmdEat(options);
        break;
      case 'list':
        await cmdList(options);
        break;
      case 'days-left':
        await cmdDaysLeft();
        break;
      default:
        console.error('Unknown command. Use add, eat, list, or days-left');
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function cmdAdd(opts) {
  const { upc, qty = 1, locationId, expiry, notes } = opts;
  if (!upc) {
    console.error('--upc is required');
    return;
  }
  const quantity = parseInt(qty);
  const nutrition = await fetchNutritionByUPC(upc);
  if (!nutrition) {
    console.error('Nutrition not found for UPC', upc);
    return;
  }
  const food = await prisma.food.findFirst({ where: { upc } });
  const stock = await addStock({ foodId: food.id, quantity, locationId: locationId ? parseInt(locationId) : null, expiryDate: expiry, notes });
  console.log(`Added ${quantity} units of ${food.name} (stock id ${stock.id})`);
}

async function cmdEat(opts) {
  const { stockId, servings } = opts;
  if (!stockId || !servings) {
    console.error('--stock-id and --servings are required');
    return;
  }
  await eatServings(parseInt(stockId), parseFloat(servings));
  console.log('Recorded consumption.');
}

async function cmdList() {
  const stocks = await prisma.stock.findMany({
    include: { food: true }
  });
  if (stocks.length === 0) {
    console.log('No stock entries.');
    return;
  }
  console.log('ID | Food | Qty | Expiry');
  for (const s of stocks) {
    const exp = s.expiryDate ? new Date(s.expiryDate).toLocaleDateString() : 'N/A';
    console.log(`${s.id} | ${s.food.name} | ${s.quantity} | ${exp}`);
  }
}

async function cmdDaysLeft() {
  const days = await calculateDaysLeft();
  console.log(`Estimated days of food left: ${days.toFixed(1)}`);
}

module.exports = { handleInventoryCommand };
