#!/bin/bash
# ==========================================
# Llama.cpp Engine Startup Configuration
# Models: Dolphin3.0-Mistral-24B (Head) + Qwen 2.5 Coder 14B (Hands) + Nomic (Embeddings)
# Engine: Apple Silicon Metal / 8-bit Quantized Cache
# ==========================================

# Navigate to the script's directory so relative paths in models.ini resolve correctly
cd "$(dirname "$0")"

# Nomic runs in the background (indicated by the & symbol), converts text into numerical arrays (vectors) for ChromaDB
echo ">>> Starting Embedding Engine (Nomic) on port 8081..."
llama-server \
  --model ./models/nomic-embed-text-v1.5.Q4_K_M.gguf \
  --port 8081 \
  --embedding \
  -c 2048 \
  > /dev/null 2>&1 &
EMBED_PID=$!

echo ">>> Starting Inference Engine (Qwen 2.5 Coder 14B / Dolphin 3.0 Mistral 24B) on port 8080..."
llama-server \
  --models-preset ./models.ini \
  --port 8080 \
  -fa 1 \
  -c 32768 \
  --jinja \
  --cache-type-k q8_0 \
  --cache-type-v q8_0

# Trap exit to kill the background embedding server when you Ctrl+C
trap "kill $EMBED_PID" EXIT