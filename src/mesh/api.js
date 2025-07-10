/**
 * Mesh Network API
 * Provides a simplified interface for using mesh networking features
 * in the Prepper App
 */
const MeshNetwork = require('./index');
const path = require('path');
const fs = require('fs').promises;
const prisma = require('../db/client');

class MeshNetworkAPI {
  constructor(options = {}) {
    this.options = {
      dataDir: path.join(process.cwd(), 'mesh-data'),
      ...options
    };
    this.mesh = new MeshNetwork(this.options);
    this.prisma = prisma;
    this.syncing = false;
  }

  /**
   * Start the mesh network
   */
  async start() {
    try {
      // Start the mesh network
      const info = await this.mesh.start();
      
      // Set up sync handlers
      this._setupSyncHandlers();
      
      return info;
    } catch (err) {
      console.error('Failed to start mesh network:', err);
      throw err;
    }
  }

  /**
   * Stop the mesh network
   */
  async stop() {
    await this.mesh.stop();
    await this.prisma.$disconnect();
  }

  /**
   * Get information about connected peers
   */
  getPeers() {
    return this.mesh.getPeers();
  }

  /**
   * Request a sync from all connected peers
   */
  async requestSync() {
    if (this.syncing) {
      console.log('Sync already in progress, skipping request');
      return;
    }
    
    this.syncing = true;
    
    try {
      // Get last sync timestamp
      let lastSync = 0;
      try {
        const syncFile = path.join(this.options.dataDir, 'last-sync.json');
        const data = await fs.readFile(syncFile, 'utf8');
        lastSync = JSON.parse(data).timestamp || 0;
      } catch (err) {
        // No sync file, will use 0 as timestamp
      }
      
      // Broadcast sync request to all peers
      const peerCount = await this.mesh.broadcast('sync-request', {
        peerId: this.mesh.node.peerId.toString(),
        timestamp: lastSync
      });
      
      console.log(`Requested sync from ${peerCount} peers`);
      
      // Update sync timestamp
      await fs.writeFile(
        path.join(this.options.dataDir, 'last-sync.json'),
        JSON.stringify({ timestamp: Date.now() }),
        'utf8'
      );
      
      return peerCount;
    } finally {
      this.syncing = false;
    }
  }
  
  /**
   * Share local inventory data with a specific peer
   * @param {string} peerId - ID of the peer to share with
   */
  async shareInventoryWith(peerId) {
    try {
      // Get food items from database
      const foodItems = await this.prisma.foodItem.findMany();
      
      // Get people data
      const people = await this.prisma.person.findMany();
      
      // Send inventory data to the peer
      await this.mesh.sendToPeer(peerId, 'inventory-data', {
        foodItems,
        people,
        timestamp: Date.now()
      });
      
      console.log(`Shared inventory with peer ${peerId}`);
      return true;
    } catch (err) {
      console.error(`Error sharing inventory with peer ${peerId}:`, err);
      return false;
    }
  }
  
  /**
   * Merge received inventory data with local database
   * @param {Object} data - Inventory data received from a peer
   */
  async mergeInventory(data) {
    if (!data || !data.foodItems) {
      console.error('Invalid inventory data received');
      return;
    }
    
    try {
      console.log(`Processing ${data.foodItems.length} food items from peer`);
      
      // Process food items
      for (const item of data.foodItems) {
        try {
          // Try to find existing item with the same name
          const existingItem = await this.prisma.foodItem.findFirst({
            where: { name: item.name }
          });
          
          if (existingItem) {
            // Update if the received item is newer
            if (new Date(item.updatedAt) > new Date(existingItem.updatedAt)) {
              await this.prisma.foodItem.update({
                where: { id: existingItem.id },
                data: {
                  quantity: item.quantity,
                  unit: item.unit,
                  caloriesPerUnit: item.caloriesPerUnit,
                  expiryDate: new Date(item.expiryDate)
                }
              });
              console.log(`Updated food item: ${item.name}`);
            }
          } else {
            // Create new item
            await this.prisma.foodItem.create({
              data: {
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                caloriesPerUnit: item.caloriesPerUnit,
                expiryDate: new Date(item.expiryDate)
              }
            });
            console.log(`Added new food item: ${item.name}`);
          }
        } catch (err) {
          console.error(`Error processing food item ${item.name}:`, err);
        }
      }
      
      // Process people data if included
      if (data.people && Array.isArray(data.people)) {
        console.log(`Processing ${data.people.length} people records from peer`);
        
        for (const person of data.people) {
          try {
            const existingPerson = await this.prisma.person.findFirst({
              where: { name: person.name }
            });
            
            if (existingPerson) {
              // Update if the received data is newer
              if (new Date(person.updatedAt) > new Date(existingPerson.updatedAt)) {
                await this.prisma.person.update({
                  where: { id: existingPerson.id },
                  data: {
                    dailyConsumption: person.dailyConsumption,
                    notes: person.notes || existingPerson.notes
                  }
                });
                console.log(`Updated person: ${person.name}`);
              }
            } else {
              // Create new person
              await this.prisma.person.create({
                data: {
                  name: person.name,
                  dailyConsumption: person.dailyConsumption,
                  notes: person.notes || ''
                }
              });
              console.log(`Added new person: ${person.name}`);
            }
          } catch (err) {
            console.error(`Error processing person ${person.name}:`, err);
          }
        }
      }
      
      console.log('Inventory sync completed');
      return true;
    } catch (err) {
      console.error('Error merging inventory data:', err);
      return false;
    }
  }
  
  /**
   * Set up handlers for sync messages
   * @private
   */
  _setupSyncHandlers() {
    // Handle sync requests
    this.mesh.on('peer:connect', async (peerId) => {
      console.log(`Connected to peer ${peerId}, initiating sync`);
      // After a short delay to ensure connection is stable
      setTimeout(async () => {
        try {
          await this.shareInventoryWith(peerId);
        } catch (err) {
          console.error(`Error during automatic sync with ${peerId}:`, err);
        }
      }, 2000);
    });
    
    // Set up protocol handler for sync requests
    this.mesh.node.handle('/prepper/sync-request', async ({ stream, connection }) => {
      try {
        // Get the peer ID
        const peerId = connection.remotePeer.toString();
        console.log(`Received sync request from ${peerId}`);
        
        // Share our inventory with the requesting peer
        await this.shareInventoryWith(peerId);
      } catch (err) {
        console.error('Error handling sync request:', err);
      } finally {
        await stream.close();
      }
    });
    
    // Set up protocol handler for inventory data
    this.mesh.node.handle('/prepper/inventory-data', async ({ stream }) => {
      try {
        // Read the data from the stream
        let data = '';
        for await (const chunk of stream.source) {
          data += chunk.toString();
        }
        
        // Parse and process the data
        const inventoryData = JSON.parse(data);
        await this.mergeInventory(inventoryData);
      } catch (err) {
        console.error('Error handling inventory data:', err);
      } finally {
        await stream.close();
      }
    });
  }
}

module.exports = MeshNetworkAPI;
