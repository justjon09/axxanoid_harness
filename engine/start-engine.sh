#!/bin/bash
# ==========================================
# Llama.cpp Engine Startup Configuration
# Models: Llama 3 Groq 8B (Head) + Qwen 2.5 Coder 14B (Hands)
# Engine: Apple Silicon Metal / 8-bit Quantized Cache
# ==========================================

echo "Starting dual-slot llama-server engine on port 8080..."

llama-server \
  --models-preset ./models.ini \
  --port 8080 \
  -np 2 \
  -fa 1 \
  --jinja \
  --cache-type-k q8_0 \
  --cache-type-v q8_0