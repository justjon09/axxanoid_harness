#!/bin/bash
# ==========================================
# Llama.cpp Engine Multi-Port Startup
# Models: Qwen 2.5 Coder 14B (Chat) + 1.5B Base (FIM) + Nomic (Embed)
# ==========================================

cd "$(dirname "$0")"
# Clean up all background jobs on Ctrl+C or script termination
trap 'echo -e "\n>>> Shutting down all inference engines..."; kill $(jobs -p) 2>/dev/null; exit 0' SIGINT SIGTERM EXIT

echo ">>> Starting Embedding Engine (Nomic) on port 2381..."
llama-server \
  --model ./models/nomic-embed-text-v1.5.Q4_K_M.gguf \
  --port 2381 \
  --embedding \
  -c 2048 \
  > /dev/null 2>&1 &

echo ">>> Starting Primary Inference Engine (Qwen 14B) on port 2380..."
llama-server \
  --model ./models/qwen2.5-coder-14b-instruct-q4_k_m.gguf \
  --port 2380 \
  -fa 1 \
  -c 32768 \
  --jinja \
  --cache-type-k q8_0 \
  --cache-type-v q8_0 &

echo ">>> Starting Inline Autocomplete Engine (Qwen 1.5B) on port 2383..."
llama-server \
  --model ./models/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf \
  --port 2383 \
  -fa 1 \
  -c 4096 \
  --cache-type-k q8_0 \
  --cache-type-v q8_0 &

echo ">>> All engines active. Listening on ports 2380, 2381, and 2383. Press Ctrl+C to stop."
wait