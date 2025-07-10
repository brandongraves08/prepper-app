const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

/* CRUD routes for People */
app.get('/api/people', async (_req, res) => {
  const people = await prisma.person.findMany();
  res.json(people);
});

app.post('/api/people', async (req, res) => {
  try {
    const person = await prisma.person.create({ data: req.body });
    res.status(201).json(person);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* CRUD routes for Food Items */
app.get('/api/food', async (_req, res) => {
  const items = await prisma.foodItem.findMany();
  res.json(items);
});

app.post('/api/food', async (req, res) => {
  try {
    const item = await prisma.foodItem.create({ data: req.body });
    res.status(201).json(item);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* Supply duration endpoint */
app.get('/api/supply-duration', async (_req, res) => {
  // total daily consumption
  const people = await prisma.person.findMany();
  const totalDaily = people.reduce((sum, p) => sum + p.dailyConsumption, 0);
  const foodItems = await prisma.foodItem.findMany();
  const totalCalories = foodItems.reduce((sum, f) => sum + f.quantity * f.caloriesPerUnit, 0);
  const days = totalDaily ? Math.floor(totalCalories / totalDaily) : null;
  res.json({ daysOfFoodLeft: days });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Prepper app listening on port ${PORT}`));
}

module.exports = app;
