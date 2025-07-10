#!/usr/bin/env python3
"""Simple CLI for offline Q&A

Sends a prompt to the local vLLM server (`vllm_server.py`) and prints the response.
If the local server is unavailable and an OpenAI API key is present, it falls back
to OpenAI's `/v1/chat/completions` endpoint.

Usage:
    python src/cli/ask.py "How to store water safely?"
    echo "Best way to filter lake water?" | python src/cli/ask.py

Environment variables:
    VLLM_SERVER_URL   URL of the local vLLM server (default http://127.0.0.1:8001)
    OPENAI_API_KEY    API key for cloud fallback (optional)
    OPENAI_MODEL      Chat model name (default gpt-3.5-turbo)
"""
import os
import sys
import json
import logging
from typing import Optional

import requests

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("ask_cli")

VLLM_URL = os.environ.get("VLLM_SERVER_URL", "http://127.0.0.1:8001")
OPENAI_KEY = os.environ.get("OPENAI_API_KEY")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-3.5-turbo")
TIMEOUT = 30  # seconds


def read_prompt() -> str:
    """Read prompt either from command-arg or STDIN."""
    if len(sys.argv) > 1:
        return " ".join(sys.argv[1:]).strip()
    data = sys.stdin.read().strip()
    if not data:
        logger.error("No prompt provided. Pass as argument or via STDIN.")
        sys.exit(1)
    return data


def query_vllm(prompt: str) -> Optional[str]:
    """Send prompt to local vLLM server and return response or None on failure."""
    url = f"{VLLM_URL.rstrip('/')}/generate"
    payload = {"prompt": prompt, "max_tokens": 256}
    try:
        r = requests.post(url, json=payload, timeout=TIMEOUT)
        r.raise_for_status()
        return r.json()["response"].strip()
    except Exception as e:
        logger.warning(f"Local vLLM query failed: {e}")
        return None


def query_openai(prompt: str) -> str:
    """Fallback to OpenAI chat completion API."""
    if not OPENAI_KEY:
        logger.error("OpenAI API key not set. Cannot fallback to cloud.")
        sys.exit(1)

    url = "https://api.openai.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {OPENAI_KEY}", "Content-Type": "application/json"}
    body = {
        "model": OPENAI_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens": 256,
    }
    try:
        r = requests.post(url, headers=headers, json=body, timeout=TIMEOUT)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        logger.error(f"OpenAI request failed: {e}")
        sys.exit(1)


def main():
    prompt = read_prompt()
    logger.info(f"Prompt: {prompt}\n{'-'*len(prompt)}")

    answer = query_vllm(prompt)
    source = "Local vLLM"
    if answer is None:
        answer = query_openai(prompt)
        source = "OpenAI Cloud"

    print(f"\n[{source}]\n{answer}\n")


if __name__ == "__main__":
    main()
