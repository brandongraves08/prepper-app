# Offline Home Prepper App

An offline-first emergency preparedness assistant powered by a local language model, optional OpenAI fallback, mesh networking, and SDR radio communication.

## Quick Overview
* **Local LLM** via vLLM for on-device Q&A.
* **Mesh networking** with libp2p for peer-to-peer data/model sync.
* **SDR radio bridge** to send/receive text bulletins in austere environments.
* **Encrypted local storage** for personal data and cached responses.

### SDR Radio Bridge

The `prepper` CLI includes a simple radio bridge that communicates with a
serial-connected transceiver or TNC. Use it to broadcast or receive short text
bulletins when the internet is unavailable:

```bash
# Send a message over /dev/ttyUSB0 at 9600 baud
prepper radio send --message "Storm approaching, shelter at 6pm" 

# Listen for incoming messages
prepper radio listen
```

See `plan.md` for the detailed roadmap.
