const { contextBridge, ipcRenderer } = require('electron');

// Expose limited, safe API to the renderer process
contextBridge.exposeInMainWorld('prepper', {
  ask: (prompt) => ipcRenderer.invoke('ask', prompt),
  getMeshStatus: () => ipcRenderer.invoke('mesh-status'),
  startMesh: () => ipcRenderer.invoke('mesh-start'),
  stopMesh: () => ipcRenderer.invoke('mesh-stop'),
  syncMesh: () => ipcRenderer.invoke('mesh-sync'),
  listInventory: () => ipcRenderer.invoke('inventory-list'),
  addInventory: (item) => ipcRenderer.invoke('inventory-add', item),
  deleteInventory: (id) => ipcRenderer.invoke('inventory-delete', id),
  getSupplyDuration: () => ipcRenderer.invoke('supply-duration'),
});
