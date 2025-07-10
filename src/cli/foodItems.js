const { addFoodItem, updateFoodItem, deleteFoodItem } = require('./supplies');

/**
 * Handle food item management commands
 * @param {Object} options Command options
 * @param {string} command The command to execute (add, update, delete)
 */
async function handleFoodItemCommand(options, command) {
  switch (command) {
    case 'add':
      await handleAddFoodItem(options);
      break;
    case 'update':
      await handleUpdateFoodItem(options);
      break;
    case 'delete':
      await handleDeleteFoodItem(options);
      break;
    default:
      console.error('Unknown command. Use add, update, or delete.');
  }
}

/**
 * Handle adding a new food item
 * @param {Object} options Command options
 */
async function handleAddFoodItem(options) {
  const { name, quantity, unit, calories, expiry } = options;
  
  if (!name || !quantity || !unit || !calories || !expiry) {
    console.error('Error: Missing required fields');
    console.log('Usage: prepper-app food add --name "Item name" --quantity 10 --unit cans --calories 250 --expiry "2023-12-31"');
    return;
  }
  
  await addFoodItem({
    name,
    quantity: Number(quantity),
    unit,
    caloriesPerUnit: Number(calories),
    expiryDate: expiry
  });
}

/**
 * Handle updating a food item
 * @param {Object} options Command options
 */
async function handleUpdateFoodItem(options) {
  const { id, name, quantity, unit, calories, expiry } = options;
  
  if (!id) {
    console.error('Error: Item ID is required');
    console.log('Usage: prepper-app food update --id 1 [--name "New name"] [--quantity 15] [--unit boxes] [--calories 300] [--expiry "2024-01-31"]');
    return;
  }
  
  const updates = {};
  if (name) updates.name = name;
  if (quantity) updates.quantity = Number(quantity);
  if (unit) updates.unit = unit;
  if (calories) updates.caloriesPerUnit = Number(calories);
  if (expiry) updates.expiryDate = expiry;
  
  await updateFoodItem(id, updates);
}

/**
 * Handle deleting a food item
 * @param {Object} options Command options
 */
async function handleDeleteFoodItem(options) {
  const { id } = options;
  
  if (!id) {
    console.error('Error: Item ID is required');
    console.log('Usage: prepper-app food delete --id 1');
    return;
  }
  
  await deleteFoodItem(id);
}

module.exports = {
  handleFoodItemCommand
};
