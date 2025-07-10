# Offline Home Prepper App – Project Plan

## Goal
Create an offline-first emergency preparedness application that runs wholly on local hardware yet can optionally use online services when available.

## Key Features (v1)
1. **Local LLM (vLLM)** – Fast, on-device Q&A and guidance using an open-weight model.
2. **Mesh Networking** – Peer-to-peer sync of data/models over LAN, Wi-Fi Direct, or Bluetooth via libp2p.
3. **SDR Radio Bridge** – Broadcast/receive text bulletins using inexpensive SDR hardware; integrate with mesh layer.
4. **OpenAI Fallback** – When the internet is present, optionally proxy requests to OpenAI and cache the results.
5. **Encrypted Local Store** – Inventory, notes, and cached responses stored securely.
6. **Cross-Platform UI** – Lightweight desktop UI first (Electron/Tauri), mobile later.

## Architecture Components
| Layer | Technology |
|-------|------------|
| Language | vLLM + lightweight GGUF model; OpenAI wrapper for cloud calls |
| Mesh | libp2p-python (pub/sub, file sync) + CRDT merge |
| SDR | SoapySDR / GNU Radio Python scripts (FSK/LoRa) |
| Storage | SQLite with SQLCipher or encrypted JSON files |
| UI | Tauri + Svelte (small binary size), CLI for PoC |

## User Stories

| ID | User Story |
|----|------------|
| US-1.1 | Offline Q&A via vLLM |
| US-1.2 | Cloud fallback when online |
| US-2.1 | Offline knowledge base |
| US-3.1 | Inventory management |
| US-3.2 | Restock alerts |
| US-4.1 | Mesh networking chat & sync |
| US-4.2 | Peer status & manual sync |
| US-5.1 | SDR radio bridge |
| US-6.1 | Cross-platform GUI |
| US-7.1 | Encrypted data at rest |
| US-7.2 | Emergency wipe |

## Roadmap
- [ ] **Repo Init** – Publish plan & README
- [ ] **CLI PoC** – vLLM local Q&A + OpenAI fallback
- [ ] **Mesh Prototype** – libp2p discovery & sync between two laptops
- [ ] **SDR Bridge** – Transmit/receive text bulletins; feed into mesh
- [ ] **UI Alpha** – Tauri desktop app integrating components
- [ ] **Docs & Packaging** – Installer/portable build, user guide

## Security Notes
- All mesh traffic encrypted with pre-shared key.
- Local data encrypted at rest with user-chosen passphrase.

## Contributors
- Brandon Graves (@brandongraves08)

---
*Last updated: 2025-06-18*
