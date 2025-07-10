/**
 * Mesh Networking Module for Prepper App
 * Provides peer-to-peer connectivity for sharing data across devices
 * using libp2p for discovery and communication
 */
const { createLibp2p } = require('libp2p')
const { tcp } = require('@libp2p/tcp')
const { noise } = require('@chainsafe/libp2p-noise')
const { mplex } = require('@libp2p/mplex')
const { mdns } = require('@libp2p/mdns')
const { webSockets } = require('@libp2p/websockets')
const { createFromJSON } = require('@libp2p/peer-id')
const fs = require('fs').promises
const path = require('path')
const EventEmitter = require('events')
const os = require('os')

class MeshNetwork extends EventEmitter {
  constructor(options = {}) {
    super()
    this.options = {
      dataDir: path.join(process.cwd(), 'mesh-data'),
      topics: ['prepper-app-sync'],
      port: 0, // Let the OS assign a port
      ...options
    }
    this.peers = new Map()
    this.node = null
    this.isRunning = false
    this.peerId = null
  }

  /**
   * Initialize and start the mesh network
   */
  async start() {
    if (this.isRunning) return

    try {
      // Create data directory if it doesn't exist
      await fs.mkdir(this.options.dataDir, { recursive: true })
      
      // Try to load existing peer ID or create new one
      try {
        const peerIdJson = await fs.readFile(
          path.join(this.options.dataDir, 'peer-id.json'),
          'utf8'
        )
        this.peerId = await createFromJSON(JSON.parse(peerIdJson))
        console.log('Loaded existing peer ID')
      } catch (err) {
        console.log('No existing peer ID found, will create a new one on first run')
      }

      // Create libp2p node
      this.node = await createLibp2p({
        peerId: this.peerId,
        addresses: {
          listen: [
            `/ip4/0.0.0.0/tcp/${this.options.port}`,
            `/ip4/0.0.0.0/tcp/${this.options.port}/ws`,
          ]
        },
        transports: [
          tcp(),
          webSockets()
        ],
        connectionEncryption: [
          noise()
        ],
        streamMuxers: [
          mplex()
        ],
        peerDiscovery: [
          mdns({
            interval: 20000, // Discover peers every 20 seconds
            enabled: true,
          })
        ]
      })

      // Save the generated peer ID for reuse
      if (!this.peerId) {
        await fs.writeFile(
          path.join(this.options.dataDir, 'peer-id.json'),
          JSON.stringify(this.node.peerId.toJSON()),
          'utf8'
        )
        console.log('Saved new peer ID')
      }

      // Handle peer discovery
      this.node.addEventListener('peer:discovery', (event) => {
        const peerId = event.detail.id.toString()
        console.log(`Discovered peer: ${peerId}`)
        this.emit('peer:discovery', peerId)
      })

      // Handle new connections
      this.node.connectionManager.addEventListener('peer:connect', (event) => {
        const peerId = event.detail.remotePeer.toString()
        console.log(`Connected to peer: ${peerId}`)
        this.peers.set(peerId, {
          id: peerId,
          connectedAt: new Date(),
          addresses: event.detail.remoteAddr.toString()
        })
        this.emit('peer:connect', peerId)
      })

      // Handle disconnections
      this.node.connectionManager.addEventListener('peer:disconnect', (event) => {
        const peerId = event.detail.remotePeer.toString()
        console.log(`Disconnected from peer: ${peerId}`)
        this.peers.delete(peerId)
        this.emit('peer:disconnect', peerId)
      })

      // Start the node
      await this.node.start()
      this.isRunning = true

      // Log connection info
      const addresses = this.node.getMultiaddrs().map(addr => addr.toString())
      console.log(`Mesh network node started with ID: ${this.node.peerId.toString()}`)
      console.log('Listening on addresses:')
      addresses.forEach(addr => console.log(`  - ${addr}`))
      
      // Get and display local network interfaces
      this._logNetworkInterfaces()
      
      this.emit('started', {
        peerId: this.node.peerId.toString(),
        addresses
      })

      return {
        peerId: this.node.peerId.toString(),
        addresses
      }
    } catch (err) {
      console.error('Error starting mesh network:', err)
      throw err
    }
  }

  /**
   * Stop the mesh network
   */
  async stop() {
    if (!this.isRunning) return

    try {
      await this.node.stop()
      this.isRunning = false
      this.peers.clear()
      console.log('Mesh network stopped')
      this.emit('stopped')
    } catch (err) {
      console.error('Error stopping mesh network:', err)
      throw err
    }
  }

  /**
   * Get list of currently connected peers
   */
  getPeers() {
    return Array.from(this.peers.values())
  }

  /**
   * Send data to a specific peer
   * @param {string} peerId - ID of the peer to send data to
   * @param {string} topic - Topic name for the data
   * @param {any} data - Data to send (will be JSON serialized)
   */
  async sendToPeer(peerId, topic, data) {
    if (!this.isRunning) throw new Error('Mesh network not running')

    try {
      const peerIdObj = this.node.peerStore.get(peerId)
      if (!peerIdObj) {
        throw new Error(`Unknown peer: ${peerId}`)
      }

      // Establish a connection if not already connected
      if (!this.node.connectionManager.getConnections(peerIdObj).length) {
        await this.node.dial(peerIdObj)
      }

      // Create a stream to the peer
      const { stream } = await this.node.dialProtocol(peerIdObj, `/prepper/${topic}`)
      
      // Send the data
      const message = JSON.stringify(data)
      await stream.sink(message)
      console.log(`Sent data to peer ${peerId} on topic ${topic}`)
      return true
    } catch (err) {
      console.error(`Error sending data to peer ${peerId}:`, err)
      throw err
    }
  }

  /**
   * Broadcast data to all connected peers
   * @param {string} topic - Topic name for the data
   * @param {any} data - Data to send (will be JSON serialized)
   */
  async broadcast(topic, data) {
    if (!this.isRunning) throw new Error('Mesh network not running')
    
    const promises = []
    for (const peerId of this.peers.keys()) {
      promises.push(this.sendToPeer(peerId, topic, data))
    }
    
    await Promise.allSettled(promises)
    console.log(`Broadcast data to ${promises.length} peers on topic ${topic}`)
    return promises.length
  }

  /**
   * Log available network interfaces (helpful for troubleshooting)
   * @private
   */
  _logNetworkInterfaces() {
    const networkInterfaces = os.networkInterfaces()
    console.log('Available network interfaces:')
    
    Object.keys(networkInterfaces).forEach(ifaceName => {
      networkInterfaces[ifaceName].forEach(iface => {
        if (iface.family === 'IPv4' && !iface.internal) {
          console.log(`  - ${ifaceName}: ${iface.address}`)
        }
      })
    })
  }
}

module.exports = MeshNetwork
