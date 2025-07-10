# Offline Home Prepper App

An offline-first emergency preparedness assistant powered by a local language model, optional OpenAI fallback, mesh networking, and SDR radio communication.

## Quick Overview
* **Local LLM** via vLLM for on-device Q&A with enhanced error handling and system monitoring.
* **Supply Management** with CLI tools to track food inventory and consumption needs.
* **Mesh networking** with libp2p for peer-to-peer data/model sync.
* **SDR radio bridge** to send/receive text bulletins in austere environments.
* **Encrypted local storage** for personal data and cached responses.

## Quick Start (Local)

```bash
# 1. Python venv & local LLM server
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python vllm_server.py &           # starts http://127.0.0.1:8001

# 2. Node backend / mesh CLI
npm install
npm run mesh start                # runs mesh node

# 3. Ask the local LLM
npm run ask "How much water per person per day?"
```

---

## Containerized Run (Podman)

The included `Containerfile` builds the Node app, Python vLLM server, and UI.

```bash
podman build -t prepper .
podman run -p 3000:3000 -p 8001:8001 prepper
```

---

## Setup (Podman)

1. Ensure Podman machine is running:
   ```bash
   podman machine start
   ```
2. Build & start containers:
   ```bash
   podman compose up --build -d
   ```
3. Apply database migrations inside the app container:
   ```bash
   podman exec prepper-app npx prisma migrate dev --name init
   ```
4. API now available at:
   - Node.js app: `http://localhost:3000`
   - vLLM server: `http://localhost:8001`

## CLI Usage

The app includes a command-line interface for managing your emergency supplies:

```bash
# Get supply information
npx prepper-cli supplies --days --food --people

# Add a new food item
npx prepper-cli food add --name "Rice" --quantity 10 --unit kg --calories 3500 --expiry "2026-01-01"

# Update a food item
npx prepper-cli food update --id 1 --quantity 8 --expiry "2026-06-01"

# Delete a food item
npx prepper-cli food delete --id 1

# Ask a question to the local LLM
npx prepper-cli ask "How long can I store rice?"
```

## vLLM Server API

The enhanced vLLM server provides the following endpoints:

- `POST /generate` - Generate text from a prompt
- `GET /health` - Check server health status
- `GET /system` - Get system information
- `POST /reload-model` - Reload the language model

## Desktop UI

The desktop application is built with Electron + Svelte.

```bash
# Development (hot-reload)
cd src/ui/frontend
npm install
npm run dev    # http://localhost:5173

# Launch Electron shell pointing to dev server
NODE_ENV=development npx electron ../../main.js

# Production build
npm run build  # outputs static assets to ../public
NODE_ENV=production npx electron ../../main.js
```

### Dark mode
Click the 🌓 icon in the navigation bar to toggle light/dark themes. Preference is stored in `localStorage`.

### Encryption
If you set the environment variable `APP_PASSPHRASE`, sensitive fields (`FoodItem.notes`, `Supply.notes`, `Person.dietaryRestrictions`) are encrypted at rest using AES-256-GCM.

## Running Tests
After cloning and installing dependencies (`npm install`):
```bash
npm test   # Jest unit tests
npm run test:e2e   # Playwright end-to-end tests
```

See `plan.md` for the detailed roadmap.
