# Axxanoid Harness: End-to-End Installation Guide

*This document serves as the absolute sequence to take a factory-reset Apple Silicon Mac to a fully operational Axxanoid OS.*

## Phase 1: Environment Preparation
1. Install Homebrew: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
2. Install Node.js: `brew install node`
3. Install Python: `brew install python`
4. Install HuggingFace CLI: `brew install huggingface-cli`

## Phase 2: Engine & Model Acquisition
1. Install Engine: `brew install llama.cpp`
2. Create Model Directory: `mkdir -p ~/.openclaw/models` (or harness specific dir)
3. Download Models:
   - `hf download bartowski/Llama-3-Groq-8B-Tool-Use-GGUF Llama-3-Groq-8B-Tool-Use-Q4_K_M.gguf --local-dir ~/.openclaw/models`
   - `hf download Qwen/Qwen2.5-Coder-14B-Instruct-GGUF qwen2.5-coder-14b-instruct-q4_k_m.gguf --local-dir ~/.openclaw/models`

## Phase 3: Harness Configuration 
*(To be updated as we build the scaffolding commands...)*

## Phase 4: Execution 
*(To be updated as we finalize the boot sequence...)*