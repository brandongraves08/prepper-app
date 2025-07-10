/**
 * Mesh Networking Server Integration
 * Connects mesh networking capabilities with Express server
 */
const MeshNetworkAPI = require('./api');
const path = require('path');

/**
 * Create and configure mesh networking routes for Express
 * @param {Object} app - Express application instance
 * @param {Object} options - Configuration options
 * @returns {Object} Mesh network API instance
 */
function setupMeshNetworking(app, options = {}) {
  // Create mesh network API instance
  const meshApi = new MeshNetworkAPI({
    dataDir: path.join(process.cwd(), 'data', 'mesh'),
    ...options
  });
  
  // Start mesh networking when server starts
  let meshStarted = false;
  
  // Add API routes
  
  // Get mesh network status
  app.get('/api/mesh/status', async (req, res) => {
    try {
      // Start mesh if not running
      if (!meshStarted) {
        await meshApi.start();
        meshStarted = true;
      }
      
      const peers = meshApi.getPeers();
      
      res.json({
        running: meshApi.mesh.isRunning,
        peerId: meshApi.mesh.node?.peerId?.toString() || null,
        peerCount: peers.length,
        peers: peers.map(peer => ({
          id: peer.id,
          connectedAt: peer.connectedAt,
          addresses: peer.addresses
        }))
      });
    } catch (error) {
      console.error('Error getting mesh status:', error);
      res.status(500).json({ error: 'Failed to get mesh network status' });
    }
  });
  
  // Request sync with all peers
  app.post('/api/mesh/sync', async (req, res) => {
    try {
      if (!meshStarted) {
        await meshApi.start();
        meshStarted = true;
      }
      
      const peerCount = await meshApi.requestSync();
      
      res.json({
        success: true,
        message: `Sync requested from ${peerCount} peers`,
        peerCount
      });
    } catch (error) {
      console.error('Error requesting sync:', error);
      res.status(500).json({ 
        error: 'Failed to request sync', 
        message: error.message 
      });
    }
  });
  
  // Start mesh networking
  app.post('/api/mesh/start', async (req, res) => {
    try {
      if (!meshStarted) {
        const info = await meshApi.start();
        meshStarted = true;
        
        res.json({
          success: true,
          message: 'Mesh network started',
          peerId: info.peerId,
          addresses: info.addresses
        });
      } else {
        res.json({
          success: true,
          message: 'Mesh network already running',
          peerId: meshApi.mesh.node?.peerId?.toString() || null
        });
      }
    } catch (error) {
      console.error('Error starting mesh network:', error);
      res.status(500).json({ 
        error: 'Failed to start mesh network', 
        message: error.message 
      });
    }
  });
  
  // Stop mesh networking
  app.post('/api/mesh/stop', async (req, res) => {
    try {
      if (meshStarted) {
        await meshApi.stop();
        meshStarted = false;
        
        res.json({
          success: true,
          message: 'Mesh network stopped'
        });
      } else {
        res.json({
          success: true,
          message: 'Mesh network not running'
        });
      }
    } catch (error) {
      console.error('Error stopping mesh network:', error);
      res.status(500).json({ 
        error: 'Failed to stop mesh network', 
        message: error.message 
      });
    }
  });
  
  // Add a web UI page for mesh network status
  app.get('/mesh', (req, res) => {
    const content = `
      <h2>Mesh Network Status</h2>
      <div id="status-container">
        <p>Loading mesh network status...</p>
      </div>
      
      <div class="control-buttons">
        <button id="start-btn" class="btn">Start Mesh Network</button>
        <button id="stop-btn" class="btn">Stop Mesh Network</button>
        <button id="sync-btn" class="btn">Sync with Peers</button>
        <button id="refresh-btn" class="btn">Refresh Status</button>
      </div>
      
      <h3>Connected Peers</h3>
      <div id="peers-container">
        <p>No peers connected</p>
      </div>
      
      <script>
        // Fetch mesh status
        async function fetchMeshStatus() {
          try {
            const response = await fetch('/api/mesh/status');
            const data = await response.json();
            
            const statusContainer = document.getElementById('status-container');
            const peersContainer = document.getElementById('peers-container');
            
            let statusHtml = '';
            if (data.running) {
              statusHtml += '<p><strong>Status:</strong> <span class="status-running">Running</span></p>';
              statusHtml += '<p><strong>Peer ID:</strong> ' + data.peerId + '</p>';
              statusHtml += '<p><strong>Connected Peers:</strong> ' + data.peerCount + '</p>';
            } else {
              statusHtml = '<p><strong>Status:</strong> <span class="status-stopped">Stopped</span></p>';
            }
            
            statusContainer.innerHTML = statusHtml;
            
            // Display peers if any
            if (data.peers && data.peers.length > 0) {
              let peersHtml = '<ul>';
              
              data.peers.forEach(peer => {
                const connectedDate = new Date(peer.connectedAt).toLocaleTimeString();
                peersHtml += '<li><strong>Peer:</strong> ' + peer.id + ' <br>Connected at: ' + connectedDate + '</li>';
              });
              
              peersHtml += '</ul>';
              peersContainer.innerHTML = peersHtml;
            } else {
              peersContainer.innerHTML = '<p>No peers connected</p>';
            }
            
          } catch (error) {
            console.error('Error fetching mesh status:', error);
            document.getElementById('status-container').innerHTML = 
              '<p class="error">Error fetching mesh status. Mesh network may not be running.</p>';
          }
        }
        
        // Start mesh network
        document.getElementById('start-btn').addEventListener('click', async () => {
          try {
            document.getElementById('start-btn').disabled = true;
            document.getElementById('start-btn').textContent = 'Starting...';
            
            const response = await fetch('/api/mesh/start', { method: 'POST' });
            const data = await response.json();
            
            if (data.success) {
              alert('Mesh network started successfully!');
            } else {
              alert('Error: ' + data.message);
            }
            
            fetchMeshStatus();
          } catch (error) {
            console.error('Error starting mesh network:', error);
            alert('Failed to start mesh network');
          } finally {
            document.getElementById('start-btn').disabled = false;
            document.getElementById('start-btn').textContent = 'Start Mesh Network';
          }
        });
        
        // Stop mesh network
        document.getElementById('stop-btn').addEventListener('click', async () => {
          try {
            document.getElementById('stop-btn').disabled = true;
            document.getElementById('stop-btn').textContent = 'Stopping...';
            
            const response = await fetch('/api/mesh/stop', { method: 'POST' });
            const data = await response.json();
            
            if (data.success) {
              alert('Mesh network stopped successfully!');
            } else {
              alert('Error: ' + data.message);
            }
            
            fetchMeshStatus();
          } catch (error) {
            console.error('Error stopping mesh network:', error);
            alert('Failed to stop mesh network');
          } finally {
            document.getElementById('stop-btn').disabled = false;
            document.getElementById('stop-btn').textContent = 'Stop Mesh Network';
          }
        });
        
        // Sync with peers
        document.getElementById('sync-btn').addEventListener('click', async () => {
          try {
            document.getElementById('sync-btn').disabled = true;
            document.getElementById('sync-btn').textContent = 'Syncing...';
            
            const response = await fetch('/api/mesh/sync', { method: 'POST' });
            const data = await response.json();
            
            if (data.success) {
              alert('Sync requested from ' + data.peerCount + ' peers');
            } else {
              alert('Error: ' + data.message);
            }
            
            // Refresh after a delay to allow sync to complete
            setTimeout(fetchMeshStatus, 3000);
          } catch (error) {
            console.error('Error syncing with peers:', error);
            alert('Failed to sync with peers');
          } finally {
            document.getElementById('sync-btn').disabled = false;
            document.getElementById('sync-btn').textContent = 'Sync with Peers';
          }
        });
        
        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', fetchMeshStatus);
        
        // Initial load
        fetchMeshStatus();
        
        // Auto-refresh every 30 seconds
        setInterval(fetchMeshStatus, 30000);
      </script>
      
      <style>
        .status-running {
          color: green;
          font-weight: bold;
        }
        .status-stopped {
          color: red;
          font-weight: bold;
        }
        .control-buttons {
          margin: 20px 0;
        }
        .error {
          color: red;
        }
        #peers-container ul {
          list-style-type: none;
          padding: 0;
        }
        #peers-container li {
          margin-bottom: 10px;
          padding: 5px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
      </style>
    `;
    
    res.send(generateHTML('Mesh Network', content));
  });
  
  /**
   * Generate HTML layout for the page
   * @param {string} title - Page title
   * @param {string} content - Page content
   * @returns {string} Complete HTML
   */
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
            margin-right: 10px;
          }
          .btn:disabled {
            background: #cccccc;
            cursor: not-allowed;
          }
        </style>
      </head>
      <body>
        <header>
          <h1>Prepper App</h1>
        </header>
        <nav>
          <a href="/">Home</a>
          <a href="/inventory">Inventory</a>
          <a href="/mesh">Mesh Network</a>
          <a href="/ask">Ask a Question</a>
        </nav>
        <div class="container">
          ${content}
        </div>
      </body>
      </html>
    `;
  }
  
  // Return the mesh API instance for use elsewhere
  return meshApi;
}

module.exports = setupMeshNetworking;
