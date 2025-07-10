const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Format a date to a readable string
 * @param {Date} date The date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Get information about the current supplies
 * @param {Object} options Command options
 */
async function getSupplyInfo(options) {
  try {
    // Show days of food left
    if (options.days || (!options.food && !options.people)) {
      const people = await prisma.person.findMany();
      const totalDaily = people.reduce((sum, p) => sum + p.dailyConsumption, 0);
      const foodItems = await prisma.foodItem.findMany();
      const totalCalories = foodItems.reduce((sum, f) => sum + f.quantity * f.caloriesPerUnit, 0);
      const days = totalDaily ? Math.floor(totalCalories / totalDaily) : 'Unknown';
      
      console.log('\n===== Supply Duration =====');
      console.log(`Total calories available: ${totalCalories}`);
      console.log(`Daily consumption: ${totalDaily} calories`);
      console.log(`Estimated days of food left: ${days}`);
      
      // Show warning if less than 14 days
      if (typeof days === 'number' && days < 14) {
        console.log('\n⚠️  WARNING: Less than 2 weeks of food supply remaining!');
      }
    }
    
    // List all food items
    if (options.food) {
      const foodItems = await prisma.foodItem.findMany({
        orderBy: { expiryDate: 'asc' }
      });
      
      console.log('\n===== Food Inventory =====');
      if (foodItems.length === 0) {
        console.log('No food items found in inventory.');
      } else {
        console.log('ID | Name | Quantity | Calories | Expires');
        console.log('---|------|----------|----------|--------');
        
        foodItems.forEach(item => {
          console.log(`${item.id} | ${item.name} | ${item.quantity} ${item.unit} | ${item.caloriesPerUnit}/unit | ${formatDate(item.expiryDate)}`);
        });
        
        // Show expiring soon items
        const soon = new Date();
        soon.setDate(soon.getDate() + 30); // 30 days from now
        
        const expiringSoon = foodItems.filter(item => new Date(item.expiryDate) <= soon);
        if (expiringSoon.length > 0) {
          console.log('\n⚠️  Items expiring within 30 days:');
          expiringSoon.forEach(item => {
            console.log(`- ${item.name} (${formatDate(item.expiryDate)})`);
          });
        }
      }
    }
    
    // List all people
    if (options.people) {
      const people = await prisma.person.findMany();
      
      console.log('\n===== People =====');
      if (people.length === 0) {
        console.log('No people found in database.');
      } else {
        console.log('ID | Name | Age | Daily Calories | Dietary Restrictions');
        console.log('---|------|-----|---------------|--------------------');
        
        people.forEach(person => {
          console.log(`${person.id} | ${person.name} | ${person.age} | ${person.dailyConsumption} | ${person.dietaryRestrictions || 'None'}`);
        });
        
        // Calculate total daily needs
        const totalDaily = people.reduce((sum, p) => sum + p.dailyConsumption, 0);
        console.log(`\nTotal daily caloric needs: ${totalDaily} calories`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Add a new food item to the inventory
 * @param {Object} item The food item to add
 * @param {string} item.name Name of the food item
 * @param {number} item.quantity Quantity of the item
 * @param {string} item.unit Unit of measurement (e.g., 'kg', 'cans')
 * @param {number} item.caloriesPerUnit Calories per unit
 * @param {Date} item.expiryDate Expiry date
 */
async function addFoodItem(item) {
  try {
    const { name, quantity, unit, caloriesPerUnit, expiryDate } = item;
    
    if (!name || !quantity || !unit || !caloriesPerUnit || !expiryDate) {
      console.error('Error: All fields are required (name, quantity, unit, caloriesPerUnit, expiryDate)');
      return;
    }
    
    const newItem = await prisma.foodItem.create({
      data: {
        name,
        quantity,
        unit,
        caloriesPerUnit,
        expiryDate: new Date(expiryDate)
      }
    });
    
    console.log(`Added ${quantity} ${unit} of ${name} to inventory (ID: ${newItem.id})`);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Update an existing food item
 * @param {number} id ID of the food item to update
 * @param {Object} updates Fields to update
 */
async function updateFoodItem(id, updates) {
  try {
    // Check if item exists
    const item = await prisma.foodItem.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!item) {
      console.error(`Error: Food item with ID ${id} not found`);
      return;
    }
    
    // Process date if provided
    if (updates.expiryDate) {
      updates.expiryDate = new Date(updates.expiryDate);
    }
    
    // Update the item
    const updatedItem = await prisma.foodItem.update({
      where: { id: parseInt(id) },
      data: updates
    });
    
    console.log(`Updated food item: ${updatedItem.name}`);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Delete a food item from inventory
 * @param {number} id ID of the food item to delete
 */
async function deleteFoodItem(id) {
  try {
    // Check if item exists
    const item = await prisma.foodItem.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!item) {
      console.error(`Error: Food item with ID ${id} not found`);
      return;
    }
    
    // Delete the item
    await prisma.foodItem.delete({
      where: { id: parseInt(id) }
    });
    
    console.log(`Deleted food item: ${item.name}`);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = {
  getSupplyInfo,
  addFoodItem,
  updateFoodItem,
  deleteFoodItem
};
