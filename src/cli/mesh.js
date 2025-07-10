/**
 * Mesh networking CLI commands for Prepper App
 * Provides command-line tools for managing peer-to-peer connections
 */
const MeshNetworkAPI = require('../mesh/api');
const path = require('path');

const meshApi = new MeshNetworkAPI({
  dataDir: path.join(process.cwd(), 'data', 'mesh')
});

/**
 * Handle mesh networking commands
 * @param {Object} options Command options
 * @param {string} command The command to execute (start, status, sync, etc.)
 */
async function handleMeshCommand(options, command) {
  switch (command) {
    case 'start':
      await handleStartMesh(options);
      break;
    case 'status':
      await handleMeshStatus(options);
      break;
    case 'sync':
      await handleMeshSync(options);
      break;
    case 'stop':
      await handleStopMesh();
      break;
    default:
      console.error('Unknown command. Use start, status, sync, or stop.');
      printHelp();
  }
}

/**
 * Print help information for mesh commands
 */
function printHelp() {
  console.log(`
Mesh Networking Commands:
  start   - Start the mesh network node
  status  - Show status of mesh network and connected peers
  sync    - Sync inventory data with connected peers
  stop    - Stop the mesh network node

Options:
  --port <port>   - Port to listen on (default: auto-assigned)
`);
}

/**
 * Handle starting the mesh network
 * @param {Object} options Command options
 */
async function handleStartMesh(options) {
  try {
    const port = options.port ? parseInt(options.port) : 0;
    
    console.log('Starting mesh network...');
    const info = await meshApi.start({ port });
    
    console.log(`Mesh network started with ID: ${info.peerId}`);
    console.log('Listening on:');
    info.addresses.forEach(addr => console.log(`  - ${addr}`));
    console.log('\nConnecting to local peers...');
    
    // Keep the process alive for a bit to allow peer discovery
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const peers = meshApi.getPeers();
    if (peers.length > 0) {
      console.log(`\nConnected to ${peers.length} peers:`);
      peers.forEach(peer => {
        console.log(`  - ${peer.id.substring(0, 16)}... (${peer.addresses})`);
      });
    } else {
      console.log('\nNo peers found yet. Run "prepper mesh status" later to check connections.');
    }
    
    console.log('\nMesh network is running in the background.');
    console.log('Use "prepper mesh stop" to shut it down when finished.');
  } catch (err) {
    console.error('Failed to start mesh network:', err.message);
    process.exit(1);
  }
}

/**
 * Handle mesh status command
 */
async function handleMeshStatus() {
  try {
    // We need to start the mesh if it's not running
    if (!meshApi.mesh.isRunning) {
      console.log('Mesh network is not running. Starting...');
      await meshApi.start();
    }
    
    const peers = meshApi.getPeers();
    console.log(`\nMesh Network Status:`);
    console.log(`  Peer ID: ${meshApi.mesh.node.peerId.toString()}`);
    console.log(`  Running: ${meshApi.mesh.isRunning ? 'Yes' : 'No'}`);
    console.log(`  Connected Peers: ${peers.length}`);
    
    if (peers.length > 0) {
      console.log('\nConnected peers:');
      peers.forEach(peer => {
        const connectedFor = Math.round((Date.now() - peer.connectedAt) / 1000);
        console.log(`  - ${peer.id.substring(0, 16)}... (connected for ${connectedFor}s)`);
      });
    } else {
      console.log('\nNo peers connected. Make sure other devices are running on the same network.');
    }
  } catch (err) {
    console.error('Error getting mesh status:', err.message);
    process.exit(1);
  }
}

/**
 * Handle mesh sync command
 */
async function handleMeshSync() {
  try {
    // We need to start the mesh if it's not running
    if (!meshApi.mesh.isRunning) {
      console.log('Mesh network is not running. Starting...');
      await meshApi.start();
      // Wait a moment for peer discovery
      console.log('Waiting for peers to connect...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    const peers = meshApi.getPeers();
    if (peers.length === 0) {
      console.log('No peers connected. Cannot sync data.');
      return;
    }
    
    console.log(`Connected to ${peers.length} peers. Starting sync...`);
    const peerCount = await meshApi.requestSync();
    console.log(`Sync request sent to ${peerCount} peers.`);
    
    // Wait a bit for sync to complete
    console.log('Waiting for sync to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('Sync process finished. Data should now be updated.');
  } catch (err) {
    console.error('Error during sync:', err.message);
    process.exit(1);
  }
}

/**
 * Handle stopping the mesh network
 */
async function handleStopMesh() {
  try {
    console.log('Stopping mesh network...');
    await meshApi.stop();
    console.log('Mesh network stopped.');
  } catch (err) {
    console.error('Error stopping mesh network:', err.message);
    process.exit(1);
  }
}

module.exports = {
  handleMeshCommand,
  printHelp
};
