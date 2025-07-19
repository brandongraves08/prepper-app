const { app, BrowserWindow, ipcMain } = require('electron');
const axios = require('axios');
const MeshNetworkAPI = require('../mesh/api');
const pathLib = require('path');

// Create a mesh API instance (reuses existing JS mesh library)
const meshApi = new MeshNetworkAPI({ dataDir: pathLib.join(process.cwd(), 'data', 'mesh') });
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });

  if (isDev) {
    // When developing, load the local dev server if provided
    win.loadURL('http://localhost:5173'); // Vite/Svelte dev server assumed
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, 'public', 'index.html'));
  }
}

// ---------- IPC handlers ----------
ipcMain.handle('ask', async (_event, prompt) => {
  try {
    const url = process.env.VLLM_SERVER_URL || 'http://127.0.0.1:8001';
    const { data } = await axios.post(`${url}/generate`, { prompt, max_tokens: 256 });
    return { ok: true, response: data.response };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('mesh-status', async () => {
  if (!meshApi.mesh.isRunning) await meshApi.start();
  const peers = meshApi.getPeers();
  return { running: meshApi.mesh.isRunning, peerCount: peers.length, peers };
});

ipcMain.handle('mesh-start', async () => {
  const info = await meshApi.start();
  return info;
});

ipcMain.handle('mesh-stop', async () => {
  await meshApi.stop();
  return { stopped: true };
});

ipcMain.handle('mesh-sync', async () => {
  const count = await meshApi.requestSync();
  return { requested: count };
});

ipcMain.handle('inventory-list', async () => {
  try {
    const items = await meshApi.prisma.foodItem.findMany();
    return { ok: true, items };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Add food item
ipcMain.handle('inventory-add', async (_e, item) => {
  try {
    const created = await meshApi.prisma.foodItem.create({ data: item });
    return { ok: true, item: created };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('inventory-delete', async (_e, id) => {
  try {
    await meshApi.prisma.foodItem.delete({ where: { id } });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('supply-duration', async () => {
  try {
    const people = await meshApi.prisma.person.findMany();
    const totalDaily = people.reduce((s, p) => s + p.dailyConsumption, 0);
    const items = await meshApi.prisma.foodItem.findMany();
    const calories = items.reduce((s, f) => s + f.quantity * f.caloriesPerUnit, 0);
    const days = totalDaily ? Math.floor(calories / totalDaily) : 0;
    return { days };
  } catch (err) {
    return { days: 0 };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
