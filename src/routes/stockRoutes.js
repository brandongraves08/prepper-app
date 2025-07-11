const express = require('express');
const prisma = require('../db/client');
const { fetchNutritionByUPC } = require('../inventory/nutritionService');
const { addStock } = require('../inventory/inventoryService');

const router = express.Router();

// helper to generate minimal HTML
function html(title, body) {
  return `<!DOCTYPE html><html><head><title>${title}</title><style>
  body{font-family:Arial;margin:20px;}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#35424a;color:#fff}a.btn,button{display:inline-block;margin:5px 0;padding:8px 12px;background:#35424a;color:#fff;text-decoration:none;border:none;border-radius:4px}
  </style></head><body><h1>${title}</h1>${body}</body></html>`;
}

// List stock
router.get('/', async (req, res) => {
  const stocks = await prisma.stock.findMany({ include: { food: true } });
  let rows = '';
  stocks.forEach(s => {
    const exp = s.expiryDate ? new Date(s.expiryDate).toLocaleDateString() : 'N/A';
    rows += `<tr><td>${s.id}</td><td>${s.food.name}</td><td>${s.quantity}</td><td>${exp}</td></tr>`;
  });
  const body = `
    <a class="btn" href="/stock/add">Add Stock</a>
    <table><thead><tr><th>ID</th><th>Food</th><th>Qty</th><th>Expiry</th></tr></thead><tbody>${rows}</tbody></table>`;
  res.send(html('Food Stock', body));
});

// Add stock form
router.get('/add', (req,res)=>{
  const body = `<form method="POST" action="/stock/add">
      <label>UPC: <input name="upc" required></label><br>
      <label>Quantity: <input type="number" name="qty" value="1" required></label><br>
      <label>Expiry: <input type="date" name="expiry"></label><br>
      <button type="submit">Add</button>
    </form>`;
  res.send(html('Add Stock', body));
});

// Add stock submit
router.post('/add', async (req,res)=>{
  try{
    const { upc, qty, expiry } = req.body;
    if(!upc) throw new Error('UPC required');
    const nutrition = await fetchNutritionByUPC(upc);
    if(!nutrition) throw new Error('Nutrition not found');
    const food = await prisma.food.findFirst({ where:{ upc }});
    await addStock({ foodId: food.id, quantity: parseInt(qty||'1'), expiryDate: expiry||null });
    res.redirect('/stock');
  }catch(err){
    res.status(500).send(html('Error', `<p>${err.message}</p><a href="/stock">Back</a>`));
  }
});

module.exports = router;
