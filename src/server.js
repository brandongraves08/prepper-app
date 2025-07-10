const express = require('express');
const path = require('path');
const prisma = require('./db/client');
const axios = require('axios');
const setupMeshNetworking = require('./mesh/server');


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper function to generate HTML layout
function generateHTML(title, content) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - Prepper App</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 0;
          color: #333;
          background-color: #f4f4f4;
        }
        .container {
          width: 80%;
          margin: 0 auto;
          padding: 20px;
        }
        header {
          background: #35424a;
          color: white;
          padding: 20px;
          text-align: center;
        }
        nav {
          background: #444;
          color: white;
          padding: 10px;
        }
        nav a {
          color: white;
          margin: 0 10px;
          text-decoration: none;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        table, th, td {
          border: 1px solid #ddd;
        }
        th, td {
          padding: 12px;
          text-align: left;
        }
        th {
          background-color: #35424a;
          color: white;
        }
        tr:nth-child(even) {
          background-color: #f2f2f2;
        }
        .btn {
          display: inline-block;
          background: #35424a;
          color: white;
          padding: 10px 15px;
          border: none;
          cursor: pointer;
          text-decoration: none;
          font-size: 15px;
          border-radius: 5px;
        }
        .btn-danger {
          background: #dc3545;
        }
        form {
          background: white;
          padding: 20px;
          margin-top: 20px;
          border-radius: 5px;
        }
        input[type="text"],
        input[type="number"],
        input[type="date"],
        textarea {
          width: 100%;
          padding: 8px;
          margin-bottom: 10px;
          border-radius: 5px;
          border: 1px solid #ddd;
        }
        .alert {
          background: #f8d7da;
          color: #721c24;
          padding: 10px;
          margin-bottom: 20px;
          border-radius: 5px;
        }
        .success {
          background: #d4edda;
          color: #155724;
        }
      </style>
    </head>
    <body>
      <header>
        <h1>Prepper App</h1>
        <p>Emergency Preparedness Assistant</p>
      </header>
      <nav>
        <a href="/">Home</a>
        <a href="/inventory">Food Inventory</a>
        <a href="/inventory/add">Add Food Item</a>
        <a href="/ask">Ask a Question</a>
      </nav>
      <div class="container">
        ${content}
      </div>
    </body>
    </html>
  `;
}

// Routes

// Home page
app.get('/', (req, res) => {
  const content = `
    <h2>Welcome to Prepper App</h2>
    <p>Your offline-first emergency preparedness assistant</p>
    <div>
      <h3>Features:</h3>
      <ul>
        <li><strong>Food Inventory Management</strong> - Track your emergency food supplies</li>
        <li><strong>Local LLM</strong> - Ask questions using a local language model</li>
        <li><strong>Offline First</strong> - Works without internet connection</li>
      </ul>
    </div>
    <p>
      <a href="/inventory" class="btn">View Inventory</a>
      <a href="/ask" class="btn">Ask a Question</a>
    </p>
  `;
  
  res.send(generateHTML('Home', content));
});

// Food inventory page
app.get('/inventory', async (req, res) => {
  try {
    const foodItems = await prisma.foodItem.findMany({
      orderBy: { expiryDate: 'asc' }
    });
    
    // Calculate total calories
    const totalCalories = foodItems.reduce((sum, item) => {
      return sum + (item.quantity * item.caloriesPerUnit);
    }, 0);
    
    // Format date function
    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };
    
    let tableRows = '';
    if (foodItems.length === 0) {
      tableRows = '<tr><td colspan="6">No food items found in inventory.</td></tr>';
    } else {
      foodItems.forEach(item => {
        tableRows += `
          <tr>
            <td>${item.id}</td>
            <td>${item.name}</td>
            <td>${item.quantity} ${item.unit}</td>
            <td>${item.caloriesPerUnit}/unit</td>
            <td>${formatDate(item.expiryDate)}</td>
            <td>
              <form method="POST" action="/inventory/delete/${item.id}" style="display:inline;">
                <button type="submit" class="btn btn-danger">Delete</button>
              </form>
            </td>
          </tr>
        `;
      });
    }
    
    const content = `
      <h2>Food Inventory</h2>
      <p>Total calories available: ${totalCalories}</p>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Quantity</th>
            <th>Calories</th>
            <th>Expires</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      <a href="/inventory/add" class="btn">Add New Item</a>
    `;
    
    res.send(generateHTML('Food Inventory', content));
  } catch (error) {
    console.error('Error fetching inventory:', error);
    const content = `
      <div class="alert">
        <h2>Error</h2>
        <p>Failed to load inventory: ${error.message}</p>
      </div>
    `;
    res.status(500).send(generateHTML('Error', content));
  }
});

// Add food item page
app.get('/inventory/add', (req, res) => {
  const content = `
    <h2>Add Food Item</h2>
    <form action="/inventory/add" method="POST">
      <div>
        <label for="name">Name:</label>
        <input type="text" id="name" name="name" required>
      </div>
      <div>
        <label for="quantity">Quantity:</label>
        <input type="number" id="quantity" name="quantity" min="1" required>
      </div>
      <div>
        <label for="unit">Unit:</label>
        <input type="text" id="unit" name="unit" placeholder="kg, cans, boxes, etc." required>
      </div>
      <div>
        <label for="calories">Calories per Unit:</label>
        <input type="number" id="calories" name="calories" min="1" required>
      </div>
      <div>
        <label for="expiry">Expiry Date:</label>
        <input type="date" id="expiry" name="expiry" required>
      </div>
      <button type="submit" class="btn">Add Item</button>
    </form>
  `;
  
  res.send(generateHTML('Add Food Item', content));
});

// Add food item - form submission
app.post('/inventory/add', async (req, res) => {
  try {
    const { name, quantity, unit, calories, expiry } = req.body;
    
    await prisma.foodItem.create({
      data: {
        name,
        quantity: parseInt(quantity),
        unit,
        caloriesPerUnit: parseInt(calories),
        expiryDate: new Date(expiry)
      }
    });
    
    res.redirect('/inventory');
  } catch (error) {
    console.error('Error adding item:', error);
    const content = `
      <div class="alert">
        <h2>Error</h2>
        <p>Failed to add item: ${error.message}</p>
      </div>
      <a href="/inventory/add" class="btn">Try Again</a>
    `;
    res.status(500).send(generateHTML('Error', content));
  }
});

// Delete food item
app.post('/inventory/delete/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.foodItem.delete({
      where: { id }
    });
    res.redirect('/inventory');
  } catch (error) {
    console.error('Error deleting item:', error);
    const content = `
      <div class="alert">
        <h2>Error</h2>
        <p>Failed to delete item: ${error.message}</p>
      </div>
      <a href="/inventory" class="btn">Back to Inventory</a>
    `;
    res.status(500).send(generateHTML('Error', content));
  }
});

// Ask question page
app.get('/ask', (req, res) => {
  const content = `
    <h2>Ask a Question</h2>
    <p>Ask any emergency preparedness question to our local LLM:</p>
    <form action="/ask" method="POST">
      <div>
        <label for="question">Your Question:</label>
        <textarea id="question" name="question" rows="4" required></textarea>
      </div>
      <button type="submit" class="btn">Ask</button>
    </form>
  `;
  
  res.send(generateHTML('Ask a Question', content));
});

// Ask question - form submission
app.post('/ask', async (req, res) => {
  try {
    const { question } = req.body;
    const vllmUrl = process.env.VLLM_SERVER_URL || 'http://localhost:8001';
    
    // Call vLLM server API
    const response = await axios.post(`${vllmUrl}/generate`, {
      prompt: question,
      max_tokens: 1024,
      temperature: 0.7,
      top_p: 0.95
    });
    
    const answer = response.data.response;
    
    const content = `
      <h2>Ask a Question</h2>
      <div>
        <h3>Your Question:</h3>
        <p>${question}</p>
      </div>
      <div>
        <h3>Answer:</h3>
        <p>${answer.replace(/\n/g, '<br>')}</p>
      </div>
      <a href="/ask" class="btn">Ask Another Question</a>
    `;
    
    res.send(generateHTML('Ask a Question', content));
  } catch (error) {
    console.error('Error asking question:', error);
    const content = `
      <h2>Ask a Question</h2>
      <div>
        <h3>Your Question:</h3>
        <p>${req.body.question}</p>
      </div>
      <div class="alert">
        <h3>Error:</h3>
        <p>Unable to get a response. The vLLM server might be unavailable.</p>
        <p>Error details: ${error.message}</p>
      </div>
      <a href="/ask" class="btn">Try Again</a>
    `;
    
    res.send(generateHTML('Ask a Question', content));
  }
});

// Initialize mesh networking
const meshApi = setupMeshNetworking(app, {
  dataDir: path.join(__dirname, '..', 'data', 'mesh')
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  
  // Stop mesh networking if running
  if (meshApi && meshApi.mesh.isRunning) {
    console.log('Stopping mesh network...');
    await meshApi.stop().catch(err => console.error('Error stopping mesh network:', err));
  }
  
  // Close server
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});
